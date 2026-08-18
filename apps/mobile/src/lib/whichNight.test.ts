import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CURRENT_NIGHT,
  FIRST_TABLE,
  MAIN_TABLE,
  isTonight,
  renamedForSecondTable,
  tableNameProblem,
  uniqueTableName,
} from './whichNight';

/**
 * Which night the app opens on.
 *
 * This is asserted against a real SQLite rather than by reading the string,
 * because the bug it exists to prevent was invisible in the SQL and obvious in
 * the engine: `SELECT * FROM night LIMIT 1` looks like "the night" and means
 * "whichever row was inserted first", which on every phone was the demo seed.
 * The host's own game sat in the same table, three rows down, reachable from
 * nowhere in the app.
 *
 * The schema below is the `night` table's ordering-relevant columns, copied
 * from `nightStore.ts`. If a column here drifts from the one there, the query
 * will fail loudly rather than silently pick the wrong night.
 */

let db: DatabaseSync;

const SCHEMA = `
  CREATE TABLE night (
    session_id   TEXT PRIMARY KEY NOT NULL,
    group_name   TEXT NOT NULL,
    started_at   TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'open',
    rules_json   TEXT NOT NULL,
    me_id        TEXT,
    ack_json     TEXT,
    seed_version INTEGER
  );
`;

/** Insert in the order given, so rowid order is the order of the calls. */
function add(sessionId: string, startedAt: string, seedVersion: number | null): void {
  db.prepare(
    `INSERT INTO night (session_id, group_name, started_at, rules_json, seed_version)
     VALUES (?, ?, ?, '[]', ?)`,
  ).run(sessionId, 'The poker club', startedAt, seedVersion);
}

const opens = (): string | undefined =>
  (db.prepare(CURRENT_NIGHT).get() as { session_id?: string } | undefined)?.session_id;

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
});

describe('which night the app opens on', () => {
  it('opens the seed when the seed is all there is', () => {
    add('sample', '2026-08-13T20:05:00Z', 2);
    expect(opens()).toBe('sample');
  });

  it("opens the host's own night over a seed inserted before it", () => {
    // Exactly the shape that shipped: the seed is row one, and the real night
    // the host started is row two.
    add('sample', '2026-08-13T20:05:00Z', 2);
    add('real', '2026-08-16T20:30:00Z', null);

    expect(opens()).toBe('real');
  });

  it("opens the host's own night even when the seed is more recent", () => {
    // The seed's timestamp is generated at launch, so it can easily be newer
    // than the game actually played. Being real has to beat being recent.
    add('real', '2026-08-16T20:30:00Z', null);
    add('sample', '2026-08-20T20:05:00Z', 2);

    expect(opens()).toBe('real');
  });

  it('opens the most recent of several real nights', () => {
    // What `importNights` produces: history pulled back from the server, in
    // no particular order, alongside the night being recorded.
    add('july', '2026-07-04T20:00:00Z', null);
    add('tonight', '2026-08-16T20:30:00Z', null);
    add('august', '2026-08-09T20:00:00Z', null);

    expect(opens()).toBe('tonight');
  });

  it('ignores insertion order entirely', () => {
    // The old query returned whatever was inserted first. If this ever passes
    // by accident again, the two orderings have to disagree for it to be
    // caught — so they do.
    add('oldest', '2026-01-01T20:00:00Z', null);
    add('newest', '2026-12-31T20:00:00Z', null);

    expect(opens()).toBe('newest');
    expect(opens()).not.toBe('oldest');
  });

  it('returns nothing at all on an empty phone', () => {
    expect(opens()).toBeUndefined();
  });

  it('reads the columns the store expects to find on the row', () => {
    add('real', '2026-08-16T20:30:00Z', null);
    const row = db.prepare(CURRENT_NIGHT).get() as Record<string, unknown>;

    // SELECT * has to carry everything openNight() reads off it, including
    // the one that decides whether the home screen calls this tonight.
    for (const column of ['session_id', 'group_name', 'started_at', 'status',
                          'rules_json', 'me_id', 'ack_json', 'seed_version']) {
      expect(row).toHaveProperty(column);
    }
  });
});

/**
 * Whether the night on the phone is a game the host is playing.
 *
 * The home card and "Set up the game" both ask this. When they asked it
 * separately they gave different answers and between them left the host with
 * nowhere to go: the card offered to start a night, and the sheet it opened
 * said one was already running. Both were describing the seeded sample night.
 */
describe('whether it is tonight', () => {
  const night = (over: Partial<{ seeded: boolean; status: 'open' | 'counting' | 'settled' }> = {}) =>
    ({ seeded: false, status: 'open' as const, ...over });

  it('is tonight when the host has a real night open', () => {
    expect(isTonight(night())).toBe(true);
  });

  it('is still tonight halfway through counting up', () => {
    // A half-counted night is being played. The host who walks back to the
    // root has to be able to walk into it again, or the count is stranded.
    expect(isTonight(night({ status: 'counting' }))).toBe(true);
  });

  it('is not tonight once the night is settled', () => {
    expect(isTonight(night({ status: 'settled' }))).toBe(false);
  });

  it('is not tonight when it is the seeded sample', () => {
    // The shape that walled the host in: seeded, open, six people at a table.
    expect(isTonight(night({ seeded: true }))).toBe(false);
  });

  it('is not tonight on a phone holding nothing', () => {
    expect(isTonight(null)).toBe(false);
  });

  it('agrees with itself across every combination', () => {
    // The two screens read one function, so the only way they can disagree now
    // is if it is non-deterministic. Enumerated rather than asserted in prose.
    const table: Array<[boolean, 'open' | 'counting' | 'settled', boolean]> = [
      [false, 'open', true],
      [false, 'counting', true],
      [false, 'settled', false],
      [true, 'open', false],
      [true, 'counting', false],
      [true, 'settled', false],
    ];
    for (const [seeded, status, expected] of table) {
      expect(isTonight({ seeded, status })).toBe(expected);
    }
  });
});

/**
 * What the tables are called.
 *
 * A club can run two games at once, and two cards on the home screen are told
 * apart by nothing but their names. The rules are small and they are the only
 * thing standing between a host and two identical cards with money on both, so
 * they live here as values rather than inside a screen.
 */
describe('naming a table', () => {
  it('renames the first table only while it is still called Tonight', () => {
    expect(renamedForSecondTable(FIRST_TABLE)).toBe(MAIN_TABLE);
    // A table the host has already named keeps the name they gave it.
    expect(renamedForSecondTable('Kitchen table')).toBeNull();
    expect(renamedForSecondTable(MAIN_TABLE)).toBeNull();
  });

  it('refuses a name that would leave two cards saying the same thing', () => {
    expect(tableNameProblem('Kitchen table', ['Main table'])).toBeNull();
    expect(tableNameProblem('   ', ['Main table'])).toBe('empty');
    // "Tonight" cannot mean this table when the other one is also tonight.
    expect(tableNameProblem('Tonight', ['Main table'])).toBe('reserved');
    expect(tableNameProblem('main TABLE', ['Main table'])).toBe('taken');
    expect(tableNameProblem(' Kitchen table ', ['Kitchen table'])).toBe('taken');
  });
});

describe('keeping table names apart', () => {
  it('leaves a free name alone', () => {
    expect(uniqueTableName(MAIN_TABLE, ['Kitchen table'])).toBe(MAIN_TABLE);
  });

  it('numbers the ones that would collide', () => {
    // A phone that has been opening nights since before tables had names has
    // a row of them, and they all want to be called the same thing.
    expect(uniqueTableName(MAIN_TABLE, ['Main table'])).toBe('Main table 2');
    expect(uniqueTableName(MAIN_TABLE, ['Main table', 'Main table 2'])).toBe('Main table 3');
    expect(uniqueTableName(MAIN_TABLE, ['MAIN TABLE'])).toBe('Main table 2');
  });
});
