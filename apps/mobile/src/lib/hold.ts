import type * as SQLite from 'expo-sqlite';
import { database } from './db';

/**
 * Where a night is being written — this phone, or another one.
 *
 * ONE WRITER PER NIGHT, and since `0016_pass_the_book.sql` which one can move:
 * the phone holding a night issues a ten-character code, another signed-in
 * phone redeems it, and from then on that phone records the night and this one
 * reads it. See `docs/storage-and-sync.md` § Passing the book.
 *
 * A row here exists only for a night that has been part of a handover. Every
 * night without one is what every night always was — this phone recorded it and
 * this phone writes it — so nothing about a phone that never passes a book
 * changes by a single query.
 *
 *   passing   a code is out. This phone still writes; the code works only
 *             while the sheet showing it is open, so nothing is recorded here
 *             between issuing it and it being taken.
 *   away      another phone writes it. This one reads it off the server and
 *             refuses every write, locally and in the queue.
 *   here      this phone was passed it, or had it back. It writes, and
 *             `book_id` is the server's book the night belongs to — a phone that
 *             was passed a night does not host that book, and resolving the
 *             book by the group's name, as the queue otherwise does, would find
 *             none and create a second one.
 *
 * ITS OWN TABLE, not columns on `night`, so that `sync.ts` can ask without
 * importing the night store (which imports it).
 */

export type Hold = 'passing' | 'away' | 'here';

export interface HoldRow {
  hold: Hold;
  /** The server's book, where this phone has been told it. */
  bookId: string | null;
  /**
   * Changes made on this phone that could not join the ledger because the night
   * had moved — the host took it back while they were waiting to send — and
   * were HANDED IN to the server instead (`0017_nothing_lost.sql`), where the
   * phone recording the night adds them. Counted so this phone can say so.
   */
  handedIn: number;
}

const getDb = (): Promise<SQLite.SQLiteDatabase> =>
  database('hold', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS night_hold (
        session_id  TEXT PRIMARY KEY NOT NULL,
        hold        TEXT NOT NULL,
        book_id     TEXT,
        group_name  TEXT,
        dropped     INTEGER NOT NULL DEFAULT 0
      );
    `);
    /*
     * `dropped` was 0016's count of changes thrown away. Since 0017 nothing is
     * thrown away, and the column that counts what was handed in instead is its
     * own — a phone that counted drops under the old build must not have them
     * read back as handed in.
     */
    try {
      await db.execAsync(`ALTER TABLE night_hold ADD COLUMN handed_in INTEGER NOT NULL DEFAULT 0;`);
    } catch {
      // Already there.
    }
  });

export async function holdOf(sessionId: string): Promise<HoldRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ hold: Hold; book_id: string | null; handed_in: number }>(
    `SELECT hold, book_id, handed_in FROM night_hold WHERE session_id = ?`,
    sessionId,
  );
  return row === null ? null : { hold: row.hold, bookId: row.book_id, handedIn: row.handed_in };
}

/** Every night that has been part of a handover, for the phone's periodic look. */
export async function holds(): Promise<Array<HoldRow & { sessionId: string }>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    session_id: string;
    hold: Hold;
    book_id: string | null;
    handed_in: number;
  }>(`SELECT session_id, hold, book_id, handed_in FROM night_hold`);
  return rows.map((r) => ({
    sessionId: r.session_id,
    hold: r.hold,
    bookId: r.book_id,
    handedIn: r.handed_in,
  }));
}

/**
 * Record where a night is. A book id already known is kept when none is given:
 * the book a night belongs to never changes, and forgetting it would send the
 * next roster write looking for the book by name.
 */
export async function setHold(
  sessionId: string,
  hold: Hold,
  book?: { id: string; groupName: string },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO night_hold (session_id, hold, book_id, group_name) VALUES (?, ?, ?, ?)
     ON CONFLICT (session_id) DO UPDATE SET
       hold = excluded.hold,
       book_id = COALESCE(excluded.book_id, night_hold.book_id),
       group_name = COALESCE(excluded.group_name, night_hold.group_name)`,
    sessionId,
    hold,
    book?.id ?? null,
    book?.groupName ?? null,
  );
}

/**
 * The book of a group this phone is recording a passed night of, by the
 * group's name — or null.
 *
 * FOR THE WRITES THAT ARE NOT SCOPED TO THE NIGHT. A guest seated on the phone
 * that was passed the night also joins the group's roster, and a roster write
 * carries the club, not the session — so the night's hold cannot be found from
 * it. Without this, the queue would look the book up among the ones this
 * account HOSTS, find none, and create a second group of the same name on the
 * server with one guest in it.
 *
 * Only while the phone holds a night of that group. Once it has passed the
 * night back, it is a member of the group like any other, and writes nothing.
 */
export async function heldBookFor(groupName: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ book_id: string }>(
    `SELECT book_id FROM night_hold
      WHERE hold = 'here' AND group_name = ? AND book_id IS NOT NULL
      LIMIT 1`,
    groupName,
  );
  return row?.book_id ?? null;
}

/** Every night this phone writes that it was handed — what a phone with no account may send. */
export async function heldHere(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ session_id: string }>(
    `SELECT session_id FROM night_hold WHERE hold = 'here'`,
  );
  return rows.map((r) => r.session_id);
}

/** Count changes handed in rather than sent, so the phone can say how many. */
export async function noteHandedIn(sessionId: string, n: number): Promise<void> {
  if (n <= 0) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE night_hold SET handed_in = handed_in + ? WHERE session_id = ?`,
    n,
    sessionId,
  );
}
