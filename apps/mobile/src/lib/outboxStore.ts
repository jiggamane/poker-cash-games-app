import type * as SQLite from 'expo-sqlite';
import { database } from './db';
import type { EntryId, LedgerEntry, OutboxItem, OutboxStore } from '@poker-club/core';

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
 *
 * `op_order` is the queue's own ordering and is NOT the ledger's seq. A night
 * queues a session, then players, then seats, then money, and the server's
 * foreign keys mean that order is the correctness — an entry arriving before
 * the session it belongs to is simply rejected. Ordering by the ledger seq
 * would put a chip count in the middle of the buy-ins and a session row
 * nowhere at all.
 */

/** The queue's tables, on the app's one connection. See `db.ts`. */
const getDb = (): Promise<SQLite.SQLiteDatabase> =>
  database('outbox', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS outbox_op (
        id          TEXT PRIMARY KEY NOT NULL,
        session_id  TEXT NOT NULL,
        op_order    INTEGER NOT NULL,
        kind        TEXT NOT NULL,
        payload     TEXT NOT NULL,
        attempts    INTEGER NOT NULL DEFAULT 0,
        last_error  TEXT
      );
      CREATE INDEX IF NOT EXISTS outbox_op_order_idx ON outbox_op (op_order);

      CREATE TABLE IF NOT EXISTS seq_high_water (
        session_id  TEXT PRIMARY KEY NOT NULL,
        seq         INTEGER NOT NULL
      );

      -- One row, counting up forever. A queue that reset its numbering after
      -- being emptied would put tomorrow's operations before yesterday's
      -- unsent ones.
      CREATE TABLE IF NOT EXISTS outbox_counter (
        id     INTEGER PRIMARY KEY CHECK (id = 1),
        value  INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO outbox_counter (id, value) VALUES (1, 0);
    `);

    // Entries queued by an older build, carried over rather than dropped:
    // they are money the server has not seen yet.
    await migrateLegacyOutbox(db);
  });

/**
 * Move anything left in the pre-operation-log `outbox` table across.
 *
 * It only ever held ledger entries, so every one becomes an 'entry.append'.
 * Dropping them instead would silently lose money the host recorded and the
 * server never received — which is exactly the failure this whole queue exists
 * to prevent.
 */
async function migrateLegacyOutbox(db: SQLite.SQLiteDatabase): Promise<void> {
  const legacy = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'outbox'`,
  );
  if (legacy.length === 0) return;

  const rows = await db.getAllAsync<{
    id: string;
    session_id: string;
    seq: number;
    entry_json: string;
    attempts: number;
    last_error: string | null;
  }>(`SELECT * FROM outbox ORDER BY seq ASC`);

  for (const r of rows) {
    const next = await nextOrder(db);
    await db.runAsync(
      `INSERT OR IGNORE INTO outbox_op (id, session_id, op_order, kind, payload, attempts, last_error)
       VALUES (?, ?, ?, 'entry.append', ?, ?, ?)`,
      r.id,
      r.session_id,
      next,
      r.entry_json,
      r.attempts,
      r.last_error,
    );
  }

  await db.execAsync(`DROP TABLE outbox`);
}

/** The next place in the line. Monotonic for the life of the database. */
async function nextOrder(db: SQLite.SQLiteDatabase): Promise<number> {
  await db.runAsync(`UPDATE outbox_counter SET value = value + 1 WHERE id = 1`);
  const row = await db.getFirstAsync<{ value: number }>(
    `SELECT value FROM outbox_counter WHERE id = 1`,
  );
  return row?.value ?? 1;
}

interface Row {
  id: string;
  session_id: string;
  op_order: number;
  kind: OutboxItem['kind'];
  payload: string;
  attempts: number;
  last_error: string | null;
}

const toItem = (r: Row): OutboxItem => ({
  id: r.id,
  sessionId: r.session_id,
  kind: r.kind,
  payload: JSON.parse(r.payload),
  attempts: r.attempts,
  ...(r.last_error ? { lastError: r.last_error } : {}),
});

export class SqliteOutboxStore implements OutboxStore {
  async add(item: OutboxItem): Promise<void> {
    const db = await getDb();

    // Re-queueing keeps its place in the line. Jumping to the back would let a
    // corrected session row overtake the entries that depend on it.
    const existing = await db.getFirstAsync<{ op_order: number }>(
      `SELECT op_order FROM outbox_op WHERE id = ?`,
      item.id,
    );
    const order = existing?.op_order ?? (await nextOrder(db));

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO outbox_op
           (id, session_id, op_order, kind, payload, attempts, last_error)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.sessionId,
        order,
        item.kind,
        JSON.stringify(item.payload),
        item.attempts,
        item.lastError ?? null,
      );

      if (item.kind === 'entry.append') {
        // Only ever moves forward, so a replayed insert cannot lower it.
        await db.runAsync(
          `INSERT INTO seq_high_water (session_id, seq) VALUES (?, ?)
           ON CONFLICT (session_id) DO UPDATE SET seq = MAX(seq, excluded.seq)`,
          item.sessionId,
          (item.payload as LedgerEntry).seq,
        );
      }
    });
  }

  /**
   * Record that a session already has entries up to `seq`, without queuing one.
   *
   * The high-water mark is normally raised by `add`, because normally every
   * entry a device knows about passed through the queue on its way in. The
   * sample night does not: it is written straight into the ledger tables, and
   * without this the first entry a host makes on it would be allocated seq 1 —
   * the number the seed's first buy-in already has. Two entries with one seq
   * is a ledger that cannot be put in order.
   */
  async noteSeq(sessionId: string, seq: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO seq_high_water (session_id, seq) VALUES (?, ?)
       ON CONFLICT (session_id) DO UPDATE SET seq = MAX(seq, excluded.seq)`,
      sessionId,
      seq,
    );
  }

  async pending(limit: number): Promise<OutboxItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>(
      `SELECT * FROM outbox_op ORDER BY op_order ASC LIMIT ?`,
      limit,
    );
    return rows.map(toItem);
  }

  async remove(ids: readonly EntryId[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM outbox_op WHERE id IN (${placeholders})`, ...ids);
  }

  async markAttempt(id: EntryId, error: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE outbox_op SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
      error,
      id,
    );
  }

  /** What is waiting, and why it is waiting — for the line the host reads. */
  async status(): Promise<{ waiting: number; lastError: string | null }> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number; last_error: string | null }>(
      `SELECT COUNT(*) AS n,
              (SELECT last_error FROM outbox_op
                WHERE last_error IS NOT NULL ORDER BY op_order ASC LIMIT 1) AS last_error
         FROM outbox_op`,
    );
    return { waiting: row?.n ?? 0, lastError: row?.last_error ?? null };
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
    const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM outbox_op`);
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
