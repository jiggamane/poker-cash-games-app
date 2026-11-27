import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CLUB_NAME,
  isRetiredClubName,
  RENAME_GROUP_HOLDS,
  RENAME_GROUP_NIGHTS,
  RETIRED_CLUB_NAMES,
} from './clubName';
import { SEED } from '../data/sampleNight';

/**
 * The club's name, moved off the seed's — run against a real SQLite for the
 * reason `hostSeat.test.ts` gives: the difference between a repair that runs
 * once and one that overwrites a name the host typed on every launch is one
 * line of the WHERE clause, and it is invisible in the string.
 */

let db: DatabaseSync;

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE night (session_id TEXT PRIMARY KEY, group_name TEXT NOT NULL, status TEXT NOT NULL);
    CREATE TABLE night_hold (session_id TEXT PRIMARY KEY, group_name TEXT);
  `);
});

const night = (id: string, group: string, status = 'open'): void => {
  db.prepare(`INSERT INTO night VALUES (?, ?, ?)`).run(id, group, status);
};
const groupOf = (id: string): string =>
  (db.prepare(`SELECT group_name FROM night WHERE session_id = ?`).get(id) as { group_name: string })
    .group_name;
const repair = (): void => {
  db.prepare(RENAME_GROUP_NIGHTS).run(...RETIRED_CLUB_NAMES);
  db.prepare(RENAME_GROUP_HOLDS).run(...RETIRED_CLUB_NAMES);
};

describe("the club's name", () => {
  it('is Kaklebi, and the seed lays a fresh install down under it', () => {
    expect(CLUB_NAME).toBe('Kaklebi');
    expect(SEED.groupName).toBe(CLUB_NAME);
  });

  it("moves every night of the old seed's club, settled ones too", () => {
    night('live', 'The Thursday game');
    night('last-week', 'The Thursday game', 'settled');
    repair();
    expect(groupOf('live')).toBe('Kaklebi');
    expect(groupOf('last-week')).toBe('Kaklebi');
  });

  it("moves a passed night's hold with it", () => {
    db.prepare(`INSERT INTO night_hold VALUES ('h', 'The Thursday game')`).run();
    repair();
    expect(
      (db.prepare(`SELECT group_name FROM night_hold`).get() as { group_name: string }).group_name,
    ).toBe('Kaklebi');
  });

  it('never touches a club the host named themselves', () => {
    night('friday', 'Friday game');
    repair();
    expect(groupOf('friday')).toBe('Friday game');
    expect(isRetiredClubName('Friday game')).toBe(false);
    expect(isRetiredClubName(CLUB_NAME)).toBe(false);
  });
});
