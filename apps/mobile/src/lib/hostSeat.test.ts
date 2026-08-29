import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CLAIM_LIVE_NIGHTS,
  HOST_ID,
  HOST_NAME,
  NAME_THE_HOST,
  RETIRED_HOST_NAMES,
} from './hostSeat';

/**
 * Which seat is the host's, and what it is called.
 *
 * Both statements below are run against a real SQLite rather than read as
 * strings, for the reason `whichNight.test.ts` gives: the bugs they exist to
 * prevent are invisible in the SQL. `UPDATE club_member SET name = …` looks
 * correct however wide its WHERE clause is, and the difference between one that
 * repairs an old seed once and one that overwrites the host's own answer on
 * every launch is a single line of it. Likewise `me_id`: the whole point of the
 * statement is which rows it does NOT reach.
 *
 * The two schemas are the relevant columns of `club_member` and `night`, copied
 * from `clubStore.ts` and `nightStore.ts`. A column that drifts from the one
 * there fails here loudly rather than quietly matching nothing.
 */

let db: DatabaseSync;

const SCHEMA = `
  CREATE TABLE club_member (
    club_id  TEXT NOT NULL,
    id       TEXT NOT NULL,
    name     TEXT NOT NULL,
    standing TEXT NOT NULL DEFAULT 'name_only',
    PRIMARY KEY (club_id, id)
  );

  CREATE TABLE night (
    session_id TEXT PRIMARY KEY NOT NULL,
    status     TEXT NOT NULL DEFAULT 'open',
    me_id      TEXT
  );
`;

const member = (id: string, name: string): void => {
  db.prepare(`INSERT INTO club_member (club_id, id, name) VALUES ('c1', ?, ?)`).run(id, name);
};

const nameOf = (id: string): string | undefined =>
  (db.prepare(`SELECT name FROM club_member WHERE id = ?`).get(id) as { name?: string })?.name;

const repair = (): void => {
  db.prepare(NAME_THE_HOST).run(HOST_ID, ...RETIRED_HOST_NAMES);
};

const night = (sessionId: string, status: string, meId: string | null): void => {
  db.prepare(`INSERT INTO night (session_id, status, me_id) VALUES (?, ?, ?)`).run(
    sessionId,
    status,
    meId,
  );
};

const meOf = (sessionId: string): string | null =>
  (db.prepare(`SELECT me_id FROM night WHERE session_id = ?`).get(sessionId) as { me_id: string | null })
    .me_id;

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
});

describe("naming the host's own roster row", () => {
  it('gives the host their name on a phone seeded before they had one', () => {
    member(HOST_ID, 'Marek');
    repair();
    expect(nameOf(HOST_ID)).toBe(HOST_NAME);
  });

  it('leaves everybody else at the table alone', () => {
    member(HOST_ID, 'Marek');
    member('seed-lena', 'Lena');
    member('seed-petr', 'Petr');
    repair();
    expect(nameOf('seed-lena')).toBe('Lena');
    expect(nameOf('seed-petr')).toBe('Petr');
  });

  /*
   * The one that matters. This runs on every launch, so a second pass must
   * find nothing — otherwise a host who renamed themselves would watch it come
   * back the next morning, which is the bug the WHERE clause is entirely for.
   */
  it('never overwrites a name the host chose', () => {
    member(HOST_ID, 'Marek');
    repair();
    db.prepare(`UPDATE club_member SET name = 'A. G.' WHERE id = ?`).run(HOST_ID);
    repair();
    expect(nameOf(HOST_ID)).toBe('A. G.');
  });

  it('is a no-op on a club the host built themselves', () => {
    member('9f0c-real', 'Marek');
    repair();
    expect(nameOf('9f0c-real')).toBe('Marek');
  });
});

describe('saying which seat is yours', () => {
  it('moves every table still running', () => {
    night('open-one', 'open', 'seed-marek');
    night('open-two', 'open', null);
    night('counting', 'counting', 'seed-lena');

    db.prepare(CLAIM_LIVE_NIGHTS).run('seed-andro');

    expect(meOf('open-one')).toBe('seed-andro');
    expect(meOf('open-two')).toBe('seed-andro');
    expect(meOf('counting')).toBe('seed-andro');
  });

  /*
   * A settled night is the book. What it said at the time is what it goes on
   * saying, and a result already filed under a seat stays filed there — the
   * same line `renamePlayerInPlay` draws.
   */
  it('never rewrites a night that is settled', () => {
    night('last-thursday', 'settled', 'seed-lena');
    db.prepare(CLAIM_LIVE_NIGHTS).run('seed-andro');
    expect(meOf('last-thursday')).toBe('seed-lena');
  });
});
