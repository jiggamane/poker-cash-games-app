import type * as SQLite from 'expo-sqlite';
import { database } from './db';

/**
 * Where a night is being written — this phone, or another one.
 *
 * ONE WRITER PER NIGHT, and since `0016_pass_the_book.sql` which one can move.
 * Since `0020_pass_to_a_person.sql` it moves by name: the admin picks a person
 * from the group on Tonight, and the game is theirs on the server from that
 * moment — no code, nothing for the receiver to do. See
 * `docs/storage-and-sync.md` § Passing the game.
 *
 * A row here exists only for a night that has been part of a hand-off. Every
 * night without one is what every night always was — this phone recorded it and
 * this phone writes it — so nothing about a phone that never passes a game
 * changes by a single query.
 *
 *   away      another phone writes it. This one reads it off the server and
 *             refuses every write, locally and in the queue.
 *   here      this phone was passed it, or had it back. It writes, and
 *             `book_id` is the server's book the night belongs to — a phone that
 *             was passed a night does not host that book, and resolving the
 *             book by the group's name, as the queue otherwise does, would find
 *             none and create a second one.
 *
 * (`passing` — a code out, 0016 — is retired with the code. A row that still
 * says it, from a build before this one, reads as `here`: the phone was still
 * recording while its code was out.)
 *
 * ITS OWN TABLE, not columns on `night`, so that `sync.ts` can ask without
 * importing the night store (which imports it).
 */

export type Hold = 'away' | 'here';

/** A row from the code-era build, read as what it meant. */
const asHold = (h: string): Hold => (h === 'away' ? 'away' : 'here');

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
    /*
     * EVERY HAND-OFF THIS PHONE HAS HEARD ABOUT — 0020's `night_pass`, by id.
     * `kind` is what the phone made of it: `received` and `taken_back` are the
     * two announcements the handoff draws (states 9–11), `seen` is a row that
     * named this phone but announces nothing (its own pass, its own take-back).
     * `dismissed` is the card's own state, per phone, per event.
     */
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pass_notice (
        id          TEXT PRIMARY KEY NOT NULL,
        session_id  TEXT NOT NULL,
        kind        TEXT NOT NULL,
        from_name   TEXT,
        at          TEXT NOT NULL,
        spent       INTEGER NOT NULL DEFAULT 0,
        dismissed   INTEGER NOT NULL DEFAULT 0
      );
    `);
  });

export async function holdOf(sessionId: string): Promise<HoldRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ hold: string; book_id: string | null; handed_in: number }>(
    `SELECT hold, book_id, handed_in FROM night_hold WHERE session_id = ?`,
    sessionId,
  );
  return row === null
    ? null
    : { hold: asHold(row.hold), bookId: row.book_id, handedIn: row.handed_in };
}

/** Every night that has been part of a handover, for the phone's periodic look. */
export async function holds(): Promise<Array<HoldRow & { sessionId: string }>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    session_id: string;
    hold: string;
    book_id: string | null;
    handed_in: number;
  }>(`SELECT session_id, hold, book_id, handed_in FROM night_hold`);
  return rows.map((r) => ({
    sessionId: r.session_id,
    hold: asHold(r.hold),
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

// ---------------------------------------------------------------------------
// Hand-offs heard, and the announcements they became — 0020
// ---------------------------------------------------------------------------

export type NoticeKind = 'received' | 'taken_back' | 'seen';

export interface Notice {
  /** The `night_pass` row's id. */
  id: string;
  sessionId: string;
  kind: NoticeKind;
  /** Who did it: the person who passed the game, or who took it back. */
  fromName: string | null;
  /** When, as the server stamped it. */
  at: string;
  /** Whether arriving spent the reader's Regular host night (state 10). */
  spentHostNight: boolean;
  dismissed: boolean;
}

/** Which hand-offs this phone has already dealt with, by id. */
export async function noticedIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string }>(`SELECT id FROM pass_notice`);
  return new Set(rows.map((r) => r.id));
}

/** Record a hand-off as heard — announced or not. Idempotent by id. */
export async function noteNotice(n: Omit<Notice, 'dismissed'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO pass_notice (id, session_id, kind, from_name, at, spent, dismissed)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    n.id,
    n.sessionId,
    n.kind,
    n.fromName,
    n.at,
    n.spentHostNight ? 1 : 0,
  );
}

/** The announcements still up, newest first. Never the `seen` rows. */
export async function openNotices(): Promise<Notice[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    session_id: string;
    kind: NoticeKind;
    from_name: string | null;
    at: string;
    spent: number;
  }>(
    `SELECT id, session_id, kind, from_name, at, spent FROM pass_notice
      WHERE dismissed = 0 AND kind <> 'seen'
      ORDER BY at DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    kind: r.kind,
    fromName: r.from_name,
    at: r.at,
    spentHostNight: r.spent === 1,
    dismissed: false,
  }));
}

export async function dismissNoticeRow(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE pass_notice SET dismissed = 1 WHERE id = ?`, id);
}
