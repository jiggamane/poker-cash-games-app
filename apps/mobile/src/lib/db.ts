import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

/**
 * The device's database. ONE connection, for the whole app.
 *
 * Three modules keep tables in here — the night, the club, the outbox — and
 * each of them used to open the file itself. On a phone that is three handles
 * on one SQLite file, which works until two of them write at once. In the
 * browser it does not work at all: expo-sqlite's web build takes an exclusive
 * sync access handle on the OPFS file, so the second module to ask gets
 * `NoModificationAllowedError` and its whole store comes back empty. That was
 * invisible for as long as it was caught and ignored, and it is exactly the
 * failure a silent catch is good at hiding.
 *
 * So the connection is opened here, once, and a store registers its schema
 * against it. The schemas run in the order they are asked for and each runs
 * once, because CREATE TABLE IF NOT EXISTS is only idempotent when it is not
 * racing another one on the same connection.
 *
 * WEB PREVIEW ONLY. A sandboxed page cannot open OPFS at all, so on web the
 * same SQLite runs in memory. A browser preview starts from the seed every
 * time it is loaded and remembers nothing, which is what you want from a
 * preview and would be a bug anywhere else. Phones get the real file.
 */
const DB_NAME = Platform.OS === 'web' ? ':memory:' : 'poker-club.db';

let opened: Promise<SQLite.SQLiteDatabase> | null = null;

/** The tail of the schema queue: every store's migration, in order, once each. */
let queue: Promise<SQLite.SQLiteDatabase> | null = null;

const registered = new Map<string, Promise<SQLite.SQLiteDatabase>>();

/**
 * The shared connection, with `name`'s tables on it.
 *
 * Call it with the same name and the same schema every time — it is memoised
 * on the name, and the schema runs on the first call only.
 */
export function database(
  name: string,
  schema: (db: SQLite.SQLiteDatabase) => Promise<void>,
): Promise<SQLite.SQLiteDatabase> {
  if (opened === null) {
    opened = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      // WAL is a file mode; an in-memory database has no journal to move.
      if (Platform.OS !== 'web') await db.execAsync('PRAGMA journal_mode = WAL;');
      return db;
    });
    queue = opened;
  }

  const already = registered.get(name);
  if (already !== undefined) return already;

  const mine = queue!.then(async (db) => {
    await schema(db);
    return db;
  });
  // A failed migration must not take the next store's with it, but it must
  // still be the failure this store reports.
  queue = mine.catch(() => opened!);
  registered.set(name, mine);
  return mine;
}
