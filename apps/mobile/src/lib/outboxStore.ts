import * as SQLite from 'expo-sqlite';
import type { EntryId, OutboxItem, OutboxStore } from '@poker-club/core';

/**
 * The outbox, on the device.
 *
 * SQLite rather than in-memory state because the host's phone will be locked,
 * backgrounded and occasionally force-quit during a five-hour session. An entry
 * that only existed in React state would be gone, and it would be gone silently.
 *
 * `seq_high_water` is kept in its own table on purpose: it must survive entries
 * being sent and deleted, otherwise numbering would restart at 1 after a
 * successful sync and collide with what the server already holds.
 */

const DB_NAME = 'poker-club.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS outbox (
          id          TEXT PRIMARY KEY NOT NULL,
          session_id  TEXT NOT NULL,
          seq         INTEGER NOT NULL,
          entry_json  TEXT NOT NULL,
          attempts    INTEGER NOT NULL DEFAULT 0,
          last_error  TEXT
        );
        CREATE INDEX IF NOT EXISTS outbox_seq_idx ON outbox (seq);

        CREATE TABLE IF NOT EXISTS seq_high_water (
          session_id  TEXT PRIMARY KEY NOT NULL,
          seq         INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

interface Row {
  id: string;
  session_id: string;
  seq: number;
  entry_json: string;
  attempts: number;
  last_error: string | null;
}

const toItem = (r: Row): OutboxItem => ({
  id: r.id,
  sessionId: r.session_id,
  seq: r.seq,
  entry: JSON.parse(r.entry_json),
  attempts: r.attempts,
  ...(r.last_error ? { lastError: r.last_error } : {}),
});

export class SqliteOutboxStore implements OutboxStore {
  async add(item: OutboxItem): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO outbox (id, session_id, seq, entry_json, attempts, last_error)
         VALUES (?, ?, ?, ?, ?, ?)`,
        item.id,
        item.sessionId,
        item.seq,
        JSON.stringify(item.entry),
        item.attempts,
        item.lastError ?? null,
      );
      // Only ever moves forward, so a replayed insert cannot lower it.
      await db.runAsync(
        `INSERT INTO seq_high_water (session_id, seq) VALUES (?, ?)
         ON CONFLICT (session_id) DO UPDATE SET seq = MAX(seq, excluded.seq)`,
        item.sessionId,
        item.seq,
      );
    });
  }

  async pending(limit: number): Promise<OutboxItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>(
      `SELECT * FROM outbox ORDER BY seq ASC, id ASC LIMIT ?`,
      limit,
    );
    return rows.map(toItem);
  }

  async remove(ids: readonly EntryId[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM outbox WHERE id IN (${placeholders})`, ...ids);
  }

  async markAttempt(id: EntryId, error: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
      error,
      id,
    );
  }

  async highestSeq(sessionId: string): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ seq: number }>(
      `SELECT seq FROM seq_high_water WHERE session_id = ?`,
      sessionId,
    );
    return row?.seq ?? 0;
  }

  async count(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM outbox`);
    return row?.n ?? 0;
  }

  /**
   * Called after loading a session from the server, so numbering continues from
   * what the server already holds rather than from what this device happens to
   * remember.
   */
  async syncHighWater(sessionId: string, serverHighestSeq: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO seq_high_water (session_id, seq) VALUES (?, ?)
       ON CONFLICT (session_id) DO UPDATE SET seq = MAX(seq, excluded.seq)`,
      sessionId,
      serverHighestSeq,
    );
  }
}
