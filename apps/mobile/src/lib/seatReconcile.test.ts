import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { PROMOTE_CLAIMED, SET_INVITED } from './seatReconcile';

/**
 * B47 · what the server knows, written onto a roster row.
 *
 * Run against a real SQLite rather than read as strings, for the reason
 * `hostSeat.test.ts` gives: the bug is invisible in the SQL. Both statements
 * look correct however wide their WHERE clause is, and the whole of B47's fix
 * is which rows they do NOT reach — an `UPDATE club_member SET standing =
 * 'member'` without its guard takes the admin off the person holding the phone,
 * which is a worse bug than the one being fixed.
 *
 * The schema is the relevant columns of `club_member`, copied from
 * `clubStore.ts`. A column that drifts from the one there fails here loudly
 * rather than quietly matching nothing.
 */

let db: DatabaseSync;

const SCHEMA = `
  CREATE TABLE club_member (
    club_id  TEXT NOT NULL,
    id       TEXT NOT NULL,
    name     TEXT NOT NULL,
    standing TEXT NOT NULL DEFAULT 'name_only',
    invited  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (club_id, id)
  );
`;

const member = (id: string, standing = 'name_only', invited = 0): void => {
  db.prepare(
    `INSERT INTO club_member (club_id, id, name, standing, invited) VALUES ('c1', ?, ?, ?, ?)`,
  ).run(id, id, standing, invited);
};

const row = (id: string): { standing: string; invited: number } =>
  db.prepare(`SELECT standing, invited FROM club_member WHERE id = ?`).get(id) as {
    standing: string;
    invited: number;
  };

const setInvited = (id: string, on: boolean): void => {
  db.prepare(SET_INVITED).run(on ? 1 : 0, id);
};

const promote = (id: string): void => {
  db.prepare(PROMOTE_CLAIMED).run(id);
};

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
});

describe('the invite badge', () => {
  it('goes on when a live code is out — the flag nothing used to write', () => {
    member('levani');
    setInvited('levani', true);
    expect(row('levani').invited).toBe(1);
  });

  /*
   * The half that makes the count on the roster head mean something. Without
   * it `· 2 invited` would be a tally of invitations ever sent rather than of
   * people who are actually waiting, and it would only ever go up.
   */
  it('comes off again when the server has no live code for the seat', () => {
    member('levani', 'name_only', 1);
    setInvited('levani', false);
    expect(row('levani').invited).toBe(0);
  });

  it('reaches one seat and not the roster beside it', () => {
    member('levani');
    member('rati');
    setInvited('levani', true);
    expect(row('rati').invited).toBe(0);
  });
});

describe('a claimed seat stops being a name', () => {
  it('promotes name_only to member, which is what the App row reads', () => {
    member('levani');
    promote('levani');
    expect(row('levani').standing).toBe('member');
  });

  /*
   * THE GUARD IS THE POINT. A host who has claimed their own seat is still the
   * admin, and `makeAdmin` is the only thing allowed to move that row — a
   * promotion that overwrote it would take the write controls off the person
   * holding the phone, on every reconcile, silently.
   */
  it('never touches an admin', () => {
    member('andro', 'admin');
    promote('andro');
    expect(row('andro').standing).toBe('admin');
  });

  it('is idempotent — a member stays a member', () => {
    member('petr', 'member');
    promote('petr');
    expect(row('petr').standing).toBe('member');
  });

  it('leaves every other seat alone', () => {
    member('levani');
    member('rati');
    promote('levani');
    expect(row('rati').standing).toBe('name_only');
  });
});
