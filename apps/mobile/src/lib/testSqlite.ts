import { DatabaseSync } from 'node:sqlite';

/**
 * A REAL SQLITE BEHIND `expo-sqlite`, FOR THE TESTS. Not shipped, not imported
 * by anything in the app — only by `*.test.ts`.
 *
 * `hostSeat.test.ts` and `whichNight.test.ts` already run their statements
 * against `node:sqlite` rather than reading them as strings, for the reason
 * those files give: the bugs they exist to prevent are invisible in the SQL. The
 * queue is the same argument one level up. Its promise — *nothing the host
 * records is ever lost, whatever the network or the battery does* — is made by
 * `SqliteOutboxStore`, and a test that reimplemented that class against a Map
 * would be a test of the Map. `ORDER BY op_order`, `ON CONFLICT DO UPDATE SET
 * seq = MAX(seq, excluded.seq)` and `INSERT OR REPLACE` are where the promise
 * actually lives, and they only mean anything when a database runs them.
 *
 * So this adapts the handful of `expo-sqlite` calls the stores make onto
 * `node:sqlite`, and the tests mock the module with it. The code under test is
 * then the code that ships, line for line.
 *
 * **The file outlives the connection, exactly as it does on a phone.** The
 * databases are held here, keyed by name, so re-importing the store modules —
 * which is how a test says *the host force-quit the app* — opens the same data
 * again rather than a fresh empty one. `reset()` is the other thing a phone
 * can do: a reinstall.
 */

type Params = readonly unknown[];

/** One `?` per value, with arrays and varargs both accepted, as expo does. */
const flat = (params: Params): unknown[] =>
  params.length === 1 && Array.isArray(params[0]) ? [...(params[0] as unknown[])] : [...params];

/** node:sqlite refuses a boolean, and `INSERT OR IGNORE … VALUES (?)` passes them. */
const bind = (params: Params): unknown[] =>
  flat(params).map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v));

export interface FakeDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: Params): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, ...params: Params): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: Params): Promise<T[]>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

const files = new Map<string, DatabaseSync>();

/** Forget every database — a reinstall, not a restart. */
export function reset(): void {
  for (const db of files.values()) db.close();
  files.clear();
}

function wrap(db: DatabaseSync): FakeDatabase {
  /*
   * Nesting is flattened rather than refused. SQLite has no nested BEGIN, and a
   * store that opened one inside another would throw here and pass on a phone —
   * a difference between the test and the app is the one thing this file must
   * not introduce.
   */
  let depth = 0;

  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, ...params) {
      const { changes } = db.prepare(sql).run(...(bind(params) as never[]));
      return { changes: Number(changes) };
    },
    async getFirstAsync<T>(sql: string, ...params: Params) {
      // expo answers null for no row; node answers undefined.
      return (db.prepare(sql).get(...(bind(params) as never[])) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: Params) {
      return db.prepare(sql).all(...(bind(params) as never[])) as T[];
    },
    async withTransactionAsync(fn) {
      if (depth > 0) return fn();
      depth += 1;
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      } finally {
        depth -= 1;
      }
    },
  };
}

/** The `expo-sqlite` module, as the stores use it. */
export const expoSqlite = {
  async openDatabaseAsync(name: string): Promise<FakeDatabase> {
    let file = files.get(name);
    if (file === undefined) {
      file = new DatabaseSync(':memory:');
      files.set(name, file);
    }
    return wrap(file);
  },
};
