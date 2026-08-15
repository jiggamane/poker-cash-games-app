import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_NIGHT } from './nightQueries';

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
