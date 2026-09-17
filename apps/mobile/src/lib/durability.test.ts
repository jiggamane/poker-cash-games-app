import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expoSqlite, reset } from './testSqlite';

/**
 * EVERY NIGHT REACHES THE SERVER, AND NOTHING IS EVER LOST GETTING THERE.
 *
 * The one promise this app makes that a person cannot check for themselves. A
 * wrong figure is visible at the table; a night that stayed on one phone is
 * discovered months later, by somebody reinstalling, with a group's real money
 * in it. `docs/storage-and-sync.md` states the promise in four principles and
 * `storageCoverage.test.ts` holds one half of it — that no operation reaches
 * the phone without a queued counterpart. This is the other half: that what is
 * queued actually arrives, in an order the server will accept, however badly
 * the evening goes.
 *
 * IT RUNS THE CODE THAT SHIPS. The real `SqliteOutboxStore` on a real SQLite
 * (`testSqlite.ts` says why), the real `sync.ts` dispatch, the real row shapes
 * out of `syncRows.ts`. Only two things are pretend: the database file, and the
 * server at the other end — and the server is pretend in the way a bad evening
 * is, refusing writes on command and remembering what it accepted.
 *
 * The failures it is written for, each of which has happened to this app:
 *   - a night recorded with no signal and never sent (the queue is durable);
 *   - an entry sent twice as two buy-ins (ids are idempotency keys);
 *   - an entry arriving before its session (the drain halts, never skips);
 *   - numbering restarting at 1 after a successful sync (the high-water mark
 *     outlives the rows it came from);
 *   - a demo night jammed at the head of the line, blocking every real one
 *     behind it (B56).
 */

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-sqlite', () => expoSqlite);
// Native modules, and neither of them is what is under test: `queueable.ts`
// only ever asks `expo-crypto` for the SHAPE of an id.
let nextId = 0;
vi.mock('expo-crypto', () => ({
  // A REAL NIGHT NEEDS REAL IDS. A constant would make every ledger entry
  // collide on its primary key, and the id is the queue's idempotency key.
  randomUUID: () => `bbbbbbbb-cccc-4ddd-8eee-${String(nextId++).padStart(12, '0')}`,
}));
// Reached through `nightStore` → `money` → `clubStore` → `invites`.
vi.mock('expo-linking', () => ({ createURL: (u: string) => `pokerclub://${u}`, parse: () => ({}) }));

// ---------------------------------------------------------------------------
// The server at the other end
// ---------------------------------------------------------------------------

const HOST = '00000000-0000-4000-8000-00000000host'.slice(0, 36);

interface Write {
  table: string;
  key: string;
  row: Record<string, unknown>;
}

/**
 * Postgres, as much of it as the queue can tell apart.
 *
 * It keeps rows by their conflict key, so a replayed upsert overwrites rather
 * than duplicating — which is the server-side half of idempotency and the
 * property that makes "retry until it works" safe. It refuses writes when it is
 * `offline`, or when the table is in `refusing`, which is how an evening on bad
 * wifi and a foreign-key violation are both written down here.
 *
 * `accepted` is every write in the order it arrived, so a test can ask what the
 * server saw and in what order — the question the ordering rule is about.
 */
class FakeServer {
  rows = new Map<string, Map<string, Record<string, unknown>>>();
  accepted: Write[] = [];
  offline = false;
  refusing = new Set<string>();
  books = new Map<string, string>();

  table(name: string): Map<string, Record<string, unknown>> {
    let t = this.rows.get(name);
    if (t === undefined) {
      t = new Map();
      this.rows.set(name, t);
    }
    return t;
  }

  private check(table: string): void {
    if (this.offline) throw new Error('Network request failed');
    if (this.refusing.has(table)) throw new Error(`${table}: refused`);
  }

  upsert(table: string, row: Record<string, unknown>, onConflict: string): void {
    this.check(table);
    const key = onConflict
      .split(',')
      .map((c) => String(row[c.trim()]))
      .join('|');
    this.table(table).set(key, { ...this.table(table).get(key), ...row });
    this.accepted.push({ table, key, row });
  }

  update(table: string, patch: Record<string, unknown>, id: string): void {
    this.check(table);
    const held = this.table(table).get(id);
    // An update against a row that is not there is a no-op, as in Postgres.
    if (held === undefined) return;
    this.table(table).set(id, { ...held, ...patch });
    this.accepted.push({ table, key: id, row: patch });
  }

  remove(table: string, match: Record<string, unknown>): void {
    this.check(table);
    const key = Object.values(match).map(String).join('|');
    this.table(table).delete(key);
    this.accepted.push({ table, key, row: match });
  }
}

let server: FakeServer;

/**
 * A `supabase-js` query builder, to the depth `sync.ts` uses one.
 *
 * Every chain ends in an await, so the object is a thenable that runs what it
 * was asked for at that moment and answers `{ data, error }` — never throwing,
 * because the real client does not: it reports, and `sync.ts` turning a
 * reported error into a thrown one is part of what is under test here.
 */
function builder(table: string) {
  const state: {
    op: 'select' | 'upsert' | 'update' | 'delete' | 'insert' | null;
    row?: Record<string, unknown>;
    rows?: Record<string, unknown>[];
    onConflict?: string;
    match?: Record<string, unknown>;
    names?: string[];
  } = { op: null };

  const run = (): { data: unknown; error: { message: string } | null } => {
    try {
      switch (state.op) {
        case 'upsert':
          for (const r of state.rows ?? []) server.upsert(table, r, state.onConflict ?? 'id');
          return { data: null, error: null };
        case 'update':
          server.update(table, state.row ?? {}, String(state.match?.id));
          return { data: null, error: null };
        case 'delete':
          server.remove(table, state.match ?? {});
          return { data: null, error: null };
        case 'insert': {
          // Only ever `book`, which is the one row the queue creates blind.
          if (server.offline) throw new Error('Network request failed');
          const id = `book-${server.books.size + 1}`;
          server.books.set(String(state.row?.group_name), id);
          server.table('book').set(id, { id, ...state.row });
          return { data: { id }, error: null };
        }
        default: {
          if (server.offline) throw new Error('Network request failed');
          const wanted = new Set(state.names ?? []);
          const found = [...server.books.entries()]
            .filter(([name]) => wanted.has(name))
            .map(([group_name, id]) => ({ id, group_name }));
          return { data: found, error: null };
        }
      }
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  };

  const self: Record<string, unknown> = {
    select: () => self,
    eq: (col: string, value: unknown) => {
      state.match = { ...state.match, [col]: value };
      return self;
    },
    match: (m: Record<string, unknown>) => {
      state.match = m;
      return self;
    },
    in: (_col: string, values: string[]) => {
      state.names = values;
      return self;
    },
    single: () => self,
    upsert: (rows: Record<string, unknown>[], opts?: { onConflict?: string }) => {
      state.op = 'upsert';
      state.rows = rows;
      state.onConflict = opts?.onConflict;
      return self;
    },
    update: (row: Record<string, unknown>) => {
      state.op = 'update';
      state.row = row;
      return self;
    },
    insert: (row: Record<string, unknown>) => {
      state.op = 'insert';
      state.row = row;
      return self;
    },
    delete: () => {
      state.op = 'delete';
      return self;
    },
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(run()).then(resolve),
  };
  return self;
}

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => builder(table),
    auth: { getSession: async () => ({ data: { session: { user: { id: HOST } } } }) },
  },
}));

// ---------------------------------------------------------------------------
// A night, played
// ---------------------------------------------------------------------------

/** Ids have to be uuids or the queue refuses to send them — see `queueable.ts`. */
const uuid = (n: number): string =>
  `0000${n.toString(16).padStart(4, '0')}-0000-4000-8000-000000000000`.slice(0, 36);

const SESSION = uuid(1);
const DANA = uuid(2);
const IVO = uuid(3);
const GROUP = 'The Poker Club';

/**
 * The store modules, freshly imported.
 *
 * Re-importing is how a test says THE HOST FORCE-QUIT THE APP: `db.ts` memoises
 * its connection and `sync.ts` holds the outbox in a module-level constant, so
 * a reset of the module registry is a relaunch. The SQLite behind it is not
 * reset, exactly as a phone's file is not — which is the whole thing being
 * asserted.
 */
async function relaunch() {
  vi.resetModules();
  return {
    sync: await import('./sync'),
    core: await import('@poker-club/core'),
  };
}

/** Everything a night queues between being opened and the first buy-in. */
async function openTheNight(sync: Awaited<ReturnType<typeof relaunch>>['sync']): Promise<void> {
  await sync.queueSessionOpen({
    sessionId: SESSION,
    groupName: GROUP,
    startedAt: '2026-09-12T18:05:00.000Z',
    defaultBuyIn: 10_000,
    players: [
      { id: DANA, name: 'Dana', atTable: true },
      { id: IVO, name: 'Ivo', atTable: true },
    ],
    rules: [],
  });
}

/** One buy-in, through the same path `recordEntry` uses. */
async function buyIn(
  sync: Awaited<ReturnType<typeof relaunch>>['sync'],
  core: Awaited<ReturnType<typeof relaunch>>['core'],
  id: string,
  playerId: string,
  amount: number,
): Promise<number> {
  const entry = await core.enqueueEntry(
    sync.outbox,
    SESSION,
    id,
    { type: 'buyin', playerId, payerId: null, amount: amount as never, correctsEntryId: null },
    { occurredAt: '2026-09-12T18:10:00.000Z' },
  );
  return entry.seq;
}

beforeEach(() => {
  reset();
  vi.resetModules();
  server = new FakeServer();
});

// ---------------------------------------------------------------------------

describe('a night with no signal all evening', () => {
  it('records everything, sends nothing, and loses none of it', async () => {
    server.offline = true;
    const { sync, core } = await relaunch();

    await openTheNight(sync);
    await buyIn(sync, core, uuid(10), DANA, 10_000);
    await buyIn(sync, core, uuid(11), IVO, 10_000);
    await buyIn(sync, core, uuid(12), DANA, 5_000);

    const failed = await sync.drain();
    expect(failed.pushed).toBe(0);
    expect(failed.stoppedBecause).toBeDefined();
    expect(server.accepted).toHaveLength(0);

    // NOTHING WAS DISCARDED. A drain that gave up and dropped its batch is the
    // one failure mode that loses money silently, and it is the reason the
    // queue marks an attempt rather than removing the row.
    const waiting = await sync.outbox.count();
    expect(waiting).toBeGreaterThan(0);
    const { lastError } = await sync.syncStatus();
    expect(lastError).toMatch(/Network request failed/);

    // And the kitchen wifi comes back.
    server.offline = false;
    const sent = await sync.drain();
    expect(sent.pushed).toBe(waiting);
    expect(sent.remaining).toBe(0);
    expect(await sync.outbox.count()).toBe(0);

    // Every buy-in is on the server, with the amounts the host typed.
    const ledger = [...server.table('ledger_entry').values()];
    expect(ledger.map((r) => r.amount).sort((a, b) => Number(a) - Number(b))).toEqual([
      5_000, 10_000, 10_000,
    ]);
    expect(server.table('session').size).toBe(1);
    expect(server.table('session_seat').size).toBe(2);
  });

  it('survives the app being force-quit with the queue still full', async () => {
    server.offline = true;
    {
      const { sync, core } = await relaunch();
      await openTheNight(sync);
      await buyIn(sync, core, uuid(10), DANA, 10_000);
      await buyIn(sync, core, uuid(11), IVO, 10_000);
      await sync.drain();
    }

    // The host's battery dies. Tuesday, on wifi, they open the app again.
    server.offline = false;
    const { sync } = await relaunch();

    expect(await sync.outbox.count()).toBeGreaterThan(0);
    const sent = await sync.drain();
    expect(sent.remaining).toBe(0);
    expect(server.table('ledger_entry').size).toBe(2);
    expect(server.table('session').size).toBe(1);
  });
});

describe('the order the server sees', () => {
  it('never shows an entry before the session it belongs to', async () => {
    const { sync, core } = await relaunch();
    await openTheNight(sync);
    await buyIn(sync, core, uuid(10), DANA, 10_000);
    await sync.drain();

    const order = server.accepted.map((w) => w.table);
    expect(order.indexOf('session')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('ledger_entry')).toBeGreaterThan(order.indexOf('session'));
    expect(order.indexOf('player')).toBeLessThan(order.indexOf('session_seat'));
  });

  it('halts at the first refusal rather than skipping ahead', async () => {
    const { sync, core } = await relaunch();
    await openTheNight(sync);
    await buyIn(sync, core, uuid(10), DANA, 10_000);

    // The session row is refused — a policy, a column, anything. The entries
    // behind it MUST NOT go up without it: a server holding entries for a
    // session it has never heard of is the inconsistent state the whole
    // halt-on-failure rule exists to prevent.
    server.refusing.add('session');
    const stopped = await sync.drain();
    expect(stopped.stoppedBecause).toMatch(/session/);
    expect(server.table('ledger_entry').size).toBe(0);

    server.refusing.clear();
    await sync.drain();
    expect(server.table('session').size).toBe(1);
    expect(server.table('ledger_entry').size).toBe(1);
  });
});

describe('sending the same thing twice', () => {
  it('is a no-op, not a second buy-in', async () => {
    const { sync, core } = await relaunch();
    await openTheNight(sync);
    await buyIn(sync, core, uuid(10), DANA, 10_000);

    // A drain that got the row up and lost the answer on the way back. The
    // queue, hearing a failure, keeps the row and sends it again.
    await sync.drain();
    const first = server.table('ledger_entry').size;

    await core.enqueueEntry(
      sync.outbox,
      SESSION,
      uuid(10),
      { type: 'buyin', playerId: DANA, payerId: null, amount: 10_000 as never, correctsEntryId: null },
      { occurredAt: '2026-09-12T18:10:00.000Z' },
    );
    await sync.drain();

    expect(server.table('ledger_entry').size).toBe(first);
    expect([...server.table('ledger_entry').values()][0]!.amount).toBe(10_000);
  });

  it('keeps a re-queued operation in its place in the line', async () => {
    const { sync, core } = await relaunch();
    server.offline = true;
    await openTheNight(sync);
    await buyIn(sync, core, uuid(10), DANA, 10_000);

    // The night is re-opened — a rule edited, a table renamed — after money has
    // already been queued behind it. Jumping to the back of the line would put
    // the session row after the entries that depend on it.
    await openTheNight(sync);

    const queued = await sync.outbox.pending(100);
    const session = queued.findIndex((i) => i.kind === 'session.open');
    const entry = queued.findIndex((i) => i.kind === 'entry.append');
    expect(session).toBeLessThan(entry);
  });
});

describe('the numbering of a ledger', () => {
  it('never restarts, however many times the queue empties', async () => {
    const { sync, core } = await relaunch();
    await openTheNight(sync);

    const first = await buyIn(sync, core, uuid(10), DANA, 10_000);
    const second = await buyIn(sync, core, uuid(11), IVO, 10_000);
    expect([first, second]).toEqual([1, 2]);

    // Drained clean: every queued row is gone from the phone.
    await sync.drain();
    expect(await sync.outbox.count()).toBe(0);

    // THE HIGH-WATER MARK OUTLIVES THE ROWS. `ledger_entry` is unique on
    // (session_id, seq), so a third buy-in numbered 1 is a row the server
    // refuses — and the queue would then halt in front of every night behind it.
    const third = await buyIn(sync, core, uuid(12), DANA, 5_000);
    expect(third).toBe(3);
  });

  it('carries on from the server after a reinstall', async () => {
    const { sync, core } = await relaunch();
    await openTheNight(sync);
    await buyIn(sync, core, uuid(10), DANA, 10_000);
    await buyIn(sync, core, uuid(11), IVO, 10_000);
    await sync.drain();

    // A new phone, an empty database, and a night the server already holds two
    // entries for. `loadEntries` calls this with what it read back.
    reset();
    const fresh = await relaunch();
    await fresh.sync.outbox.syncHighWater(SESSION, 2);

    const next = await buyIn(fresh.sync, fresh.core, uuid(12), DANA, 5_000);
    expect(next).toBe(3);
  });
});

describe('a night that can never be sent', () => {
  it('is dropped from the queue rather than left blocking the real ones', async () => {
    const { sync, core } = await relaunch();

    // The sample night's id is deliberately not a uuid, so nothing about it is
    // queued — and an entry that slipped through from an older build is dropped
    // at the gate in `send` rather than refused by the server for ever. B56.
    await core.enqueueEntry(
      sync.outbox,
      'seed-night',
      'seed-entry',
      { type: 'buyin', playerId: 'seed-dana', payerId: null, amount: 10_000 as never, correctsEntryId: null },
      { occurredAt: '2026-09-12T18:10:00.000Z' },
    );
    await openTheNight(sync);
    await buyIn(sync, core, uuid(10), DANA, 10_000);

    const sent = await sync.drain();
    expect(sent.remaining).toBe(0);
    expect(sent.stoppedBecause).toBeUndefined();

    // The real night got through, and nothing about the seed reached anybody.
    expect(server.table('ledger_entry').size).toBe(1);
    expect(server.accepted.some((w) => String(w.key).includes('seed'))).toBe(false);
  });

  it('takes its queued operations with it when the night is forgotten', async () => {
    const { sync, core } = await relaunch();
    server.offline = true;
    await openTheNight(sync);
    await buyIn(sync, core, uuid(10), DANA, 10_000);

    const other = uuid(90);
    await core.enqueueOp(sync.outbox, {
      id: `session-open:${other}`,
      sessionId: other,
      kind: 'session.open',
      payload: {},
    });

    await sync.outbox.forgetSession(SESSION);

    const left = await sync.outbox.pending(100);
    expect(left.map((i) => i.sessionId)).toEqual([other]);
    // And the forgotten night's numbering goes with it.
    expect(await sync.outbox.highestSeq(SESSION)).toBe(0);
  });
});

describe('the whole night, end to end', () => {
  it('puts the ledger, the count and the frozen settlement on the server', async () => {
    const { sync, core } = await relaunch();
    await openTheNight(sync);
    await buyIn(sync, core, uuid(10), DANA, 10_000);
    await buyIn(sync, core, uuid(11), IVO, 10_000);

    await sync.queueCount(SESSION, DANA, 13_000 as never);
    await sync.queueCount(SESSION, IVO, 7_000 as never);
    await sync.queueSessionPatch({ sessionId: SESSION, status: 'counting' });
    await sync.queueClose({
      sessionId: SESSION,
      endedAt: '2026-09-12T23:40:00.000Z',
      settlement: {
        algorithmVersion: '1',
        rulesSnapshot: [],
        inputsSnapshot: {},
        computedTransfers: [{ from: IVO, to: DANA, amount: 3_000 }],
        totalOffTable: 20_000,
        discrepancyAmount: 0,
      },
    });

    const sent = await sync.drain();
    expect(sent.remaining).toBe(0);

    expect(server.table('ledger_entry').size).toBe(2);
    expect(server.table('final_count').size).toBe(2);
    expect(server.table('settlement').size).toBe(1);

    // THE SETTLEMENT BEFORE THE STATUS, always. A session marked settled with
    // no result behind it is a lie; a settled night reading as live for a
    // minute is cosmetic.
    const settlement = server.accepted.findIndex((w) => w.table === 'settlement');
    const closed = server.accepted.findIndex((w) => w.table === 'session' && w.row.ended_at);
    expect(settlement).toBeGreaterThanOrEqual(0);
    expect(closed).toBeGreaterThan(settlement);

    const session = [...server.table('session').values()][0]!;
    expect(session.status).toBe('settled');
    expect(session.ended_at).toBe('2026-09-12T23:40:00.000Z');
  });
});

// ---------------------------------------------------------------------------

/**
 * THE END OF THE NIGHT PUSHES WITHOUT BEING ASKED — B83.
 *
 * Every test above drives the queue directly and calls `drain()` itself, which
 * is what made B83 invisible for eleven days: they proved the queue carries a
 * night correctly and never asked whether anything runs it. This one drives the
 * REAL STORE — `startNight`, `setFinalCount`, `setStatus`, `closeNight` — and
 * calls `drain()` nowhere at all. If the pushes are removed it goes red, which
 * is the whole point of it.
 *
 * `push()` is deliberately fire-and-forget: awaiting the network inside
 * `closeNight` would put it on the screen's critical path, which this app does
 * not do anywhere. So the assertion polls rather than awaiting — that is the
 * behaviour under test, not a workaround for it.
 */
describe('the end of the night, with nobody calling drain', () => {
  /** Wait for the fire-and-forget push to land, or give up and let the assert fail. */
  const settles = async (want: () => boolean): Promise<void> => {
    for (let i = 0; i < 50 && !want(); i++) await new Promise((r) => setTimeout(r, 10));
  };

  it('sends the counts, the status and the frozen settlement on its own', async () => {
    vi.resetModules();
    const night = await import('./nightStore');

    await night.startNight({
      clubId: uuid(50),
      groupName: GROUP,
      rules: [],
      seats: [
        { playerId: DANA, name: 'Dana', buyIn: 10_000 as never },
        { playerId: IVO, name: 'Ivo', buyIn: 10_000 as never },
      ],
      meId: DANA,
    });
    await settles(() => server.table('session').size > 0);
    expect(server.table('session').size, 'the night never reached the server at all').toBe(1);

    // ---- counting up. No ledger entry is written here, so nothing but the
    // counts themselves can push them.
    //
    // THE NIGHT GOES TO COUNTING FIRST, AND THAT PUSH IS LET FINISH before a
    // stack is counted. Without the wait the counts ride the drain `setStatus`
    // already started — which is true of the real app too, and would leave this
    // passing with `setFinalCount`'s own push removed.
    await night.setStatus('counting');
    await settles(() => [...server.table('session').values()][0]?.status === 'counting');
    expect([...server.table('session').values()][0]?.status).toBe('counting');

    await night.setFinalCount(DANA, 13_000 as never);
    await night.setFinalCount(IVO, 7_000 as never);
    await settles(() => server.table('final_count').size === 2);
    expect(server.table('final_count').size, 'the counts stayed on the phone').toBe(2);

    // ---- and the close, which is the artefact that cannot be rebuilt.
    await night.closeNight();
    await settles(() => server.table('settlement').size > 0);

    expect(
      server.table('settlement').size,
      'the frozen settlement never left the phone — B83',
    ).toBe(1);

    const session = [...server.table('session').values()][0]!;
    expect(session.status).toBe('settled');
    expect(session.ended_at).toBeTruthy();

    // Nothing was left behind: the whole night is up.
    expect(await night.readMyNights()).toHaveLength(1);
  });

  it('sends a tick on who has paid, days after the last entry', async () => {
    vi.resetModules();
    const night = await import('./nightStore');

    await night.startNight({
      clubId: uuid(51),
      groupName: GROUP,
      rules: [],
      seats: [
        { playerId: DANA, name: 'Dana', buyIn: 10_000 as never },
        { playerId: IVO, name: 'Ivo', buyIn: 10_000 as never },
      ],
      meId: DANA,
    });
    await night.setStatus('counting');
    await night.setFinalCount(DANA, 13_000 as never);
    await night.setFinalCount(IVO, 7_000 as never);
    await night.closeNight();
    await settles(() => server.table('settlement').size > 0);

    // E7, the week afterwards. The last write a night ever gets, and there is
    // no entry behind it to carry it up.
    await night.setPaid(IVO, DANA, true);
    await settles(() => server.table('transfer_payment').size > 0);
    expect(
      server.table('transfer_payment').size,
      'the tick stayed on the phone',
    ).toBe(1);
  });
});
