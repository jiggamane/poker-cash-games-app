import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LedgerEntry, Money } from '@poker-club/core';
import { expoSqlite, reset } from './testSqlite';
import type { ImportedNight } from './nightStore';

/**
 * PASSING THE BOOK, ON THE PHONE — the half `supabase/test/09_pass_the_book.sql`
 * cannot see.
 *
 * The server decides who writes a night. What it cannot decide is what a phone
 * does with the answer, and there are three ways for a phone to get that wrong
 * that no server check would notice:
 *
 *   1. The phone that passed a night goes on recording on it. The server
 *      refuses the rows, the queue halts on the first refusal, and every later
 *      night on the phone goes nowhere — with nothing on any screen.
 *   2. The phone that took a night numbers its first entry from its own memory
 *      rather than from the server's ledger, and collides with an entry the
 *      other phone already wrote.
 *   3. The phone that took a night sends a guest's roster row looking for the
 *      book among the ones its account hosts, finds none, and makes a second
 *      group of the same name on the server.
 *
 * All three run here against the real store and a real SQLite (`testSqlite.ts`).
 */

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-sqlite', () => expoSqlite);
let nextId = 0;
vi.mock('expo-crypto', () => ({
  randomUUID: () => `cccccccc-dddd-4eee-8fff-${String(nextId++).padStart(12, '0')}`,
}));
vi.mock('expo-linking', () => ({ createURL: (u: string) => `pokerclub://${u}`, parse: () => ({}) }));
/* The server, as far as handing in goes: it takes the list and says how many.
   Every call is kept so a test can say exactly what reached it. */
const handedIn: Array<{ fn: string; args: Record<string, unknown> }> = [];
vi.mock('./supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    auth: { getSession: async () => ({ data: { session: null } }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      handedIn.push({ fn, args });
      return { data: (args.changes as unknown[] | undefined)?.length ?? null, error: null };
    },
  },
}));

const uuid = (n: number): string =>
  `0000${n.toString(16).padStart(4, '0')}-0000-4000-8000-000000000000`.slice(0, 36);

const DANA = uuid(2);
const IVO = uuid(3);
const BOOK = uuid(90);
const CLUB = 'The Poker Club';

const store = () => import('./nightStore');
const hold = () => import('./hold');
const queue = async () => (await import('./sync')).outbox;

const sync = () => import('./sync');

beforeEach(() => {
  reset();
  vi.resetModules();
  nextId = 0;
  handedIn.length = 0;
});

/** A night opened on this phone, two buy-ins in. */
async function openHere(night: Awaited<ReturnType<typeof store>>): Promise<string> {
  await night.openNight();
  await night.startNight({
    clubId: uuid(60),
    groupName: CLUB,
    rules: [],
    seats: [
      { playerId: DANA, name: 'Dana', buyIn: 10_000 as Money },
      { playerId: IVO, name: 'Ivo', buyIn: 10_000 as Money },
    ],
    meId: DANA,
  });
  const n = (await night.openNight())!;
  return n.sessionId;
}

/** The night as the server holds it after the other phone recorded on it. */
function serverCopy(
  sessionId: string,
  entries: ReadonlyArray<Pick<LedgerEntry, 'type' | 'playerId' | 'amount'> & { seq: number }>,
  status: ImportedNight['status'] = 'open',
): ImportedNight {
  return {
    sessionId,
    groupName: CLUB,
    startedAt: '2026-09-23T19:00:00.000Z',
    endedAt: null,
    status,
    stakes: null,
    defaultBuyIn: 10_000,
    rules: [],
    roundingMode: null,
    tableName: null,
    players: [
      { id: DANA, name: 'Dana', atTable: true },
      { id: IVO, name: 'Ivo', atTable: true },
    ],
    entries: entries.map((e) => ({
      id: uuid(200 + e.seq),
      seq: e.seq,
      type: e.type,
      playerId: e.playerId,
      payerId: null,
      amount: e.amount,
      correctsEntryId: null,
      occurredAt: '2026-09-23T20:00:00.000Z',
      note: null,
    })),
    counts: [],
    meId: null,
  };
}

describe('nothing a phone recorded is thrown away (0017)', () => {
  it('will not replace a night over changes still queued for it', async () => {
    const night = await store();
    const sessionId = await openHere(night);
    // Opening the night queued it, its people and two buy-ins.
    expect(await (await queue()).countFor(sessionId)).toBeGreaterThan(0);

    await expect(
      night.replaceNight(serverCopy(sessionId, []), 'away', BOOK),
    ).rejects.toThrow(/have not reached the server/);
    // And the night is still exactly what it was.
    expect((await night.openNightById(sessionId))!.entries).toHaveLength(2);
  });

  it('hands them in — every one, as queued — and only then lets them go', async () => {
    const night = await store();
    const sessionId = await openHere(night);
    const q = await queue();
    const before = await q.forSession(sessionId);

    expect(await (await sync()).handIn(sessionId)).toBe(before.length);

    const call = handedIn.find((c) => c.fn === 'hand_in_late_changes')!;
    expect(call.args.target_session_id).toBe(sessionId);
    const sent = call.args.changes as Array<{ op_id: string; kind: string }>;
    expect(sent.map((c) => c.op_id)).toEqual(before.map((i) => i.id));
    expect(sent.filter((c) => c.kind === 'entry.append')).toHaveLength(2);
    expect(await q.countFor(sessionId)).toBe(0);
  });

  it('adds a handed-in rebuy under its own id, in this phone’s numbering', async () => {
    const night = await store();
    const sessionId = await openHere(night);
    await (await sync()).handIn(sessionId);

    const late = uuid(777);
    const added = await night.applyLateChange('entry.append', {
      id: late,
      seq: 2, // the other phone's number — which this phone already has
      type: 'rebuy',
      playerId: IVO,
      payerId: null,
      amount: 10_000,
      occurredAt: '2026-09-23T23:41:00.000Z',
      note: 'at the bar',
    });
    expect(added).toBe(true);

    // B93: the note travels in the queued payload, so it reaches the server.
    const queued = (await (await queue()).forSession(sessionId)).find((i) => i.id === late)!;
    expect((queued.payload as { note?: string }).note).toBe('at the bar');

    const now = (await night.openNightById(sessionId))!;
    const it = now.entries.find((e) => e.id === late)!;
    expect(it.seq).toBe(3);
    expect(now.occurredAt[late]).toBe('2026-09-23T23:41:00.000Z');

    // Twice is once.
    await night.applyLateChange('entry.append', { id: late, type: 'rebuy', playerId: IVO, amount: 10_000 });
    expect((await night.openNightById(sessionId))!.entries).toHaveLength(3);
  });

  it('does not add a count to a night still being played', async () => {
    const night = await store();
    await openHere(night);
    expect(await night.applyLateChange('count.upsert', { playerId: DANA, amount: 5_000 })).toBe(false);
    expect(await night.applyLateChange('rule.upsert', {})).toBe(false);
  });
});

describe('the phone that passed the night', () => {
  it('reads the server copy and refuses to record on it', async () => {
    const night = await store();
    const sessionId = await openHere(night);
    await (await sync()).handIn(sessionId);

    await night.replaceNight(
      serverCopy(sessionId, [
        { seq: 1, type: 'buyin', playerId: DANA, amount: 10_000 as Money },
        { seq: 2, type: 'buyin', playerId: IVO, amount: 10_000 as Money },
        { seq: 3, type: 'rebuy', playerId: IVO, amount: 10_000 as Money },
      ]),
      'away',
      BOOK,
    );

    const now = (await night.openNightById(sessionId))!;
    expect(now.hold).toBe('away');
    // The rebuy the other phone recorded is here, read off the server.
    expect(now.entries).toHaveLength(3);
    // And who this phone is at the table survived the replace.
    expect(now.meId).toBe(DANA);

    await expect(night.rebuy(DANA, 10_000 as Money)).rejects.toBeInstanceOf(
      night.NightIsAwayError,
    );
    await expect(night.setStatus('counting')).rejects.toBeInstanceOf(night.NightIsAwayError);
    // Nothing it tried went into the queue to halt it.
    expect(await (await queue()).countFor(sessionId)).toBe(0);
    // And what it had queued before the night moved went to the server.
    expect(handedIn.some((c) => c.fn === 'hand_in_late_changes')).toBe(true);
  });
});

describe('the phone that took the night', () => {
  it('numbers its next entry after the highest one on the server', async () => {
    const night = await store();
    const sessionId = await openHere(night);
    await (await sync()).handIn(sessionId);

    // Seven entries on the server; this phone had only two of them.
    await night.replaceNight(
      serverCopy(
        sessionId,
        Array.from({ length: 7 }, (_, i) => ({
          seq: i + 1,
          type: 'buyin' as const,
          playerId: i % 2 === 0 ? DANA : IVO,
          amount: 10_000 as Money,
        })),
      ),
      'here',
      BOOK,
      { show: true },
    );

    await night.rebuy(DANA, 5_000 as Money);
    const now = (await night.openNightById(sessionId))!;
    const seqs = now.entries.map((e) => e.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(Math.max(...seqs)).toBe(8);
  });

  it('comes in counting when the night was passed mid-count', async () => {
    const night = await store();
    const sessionId = await openHere(night);
    await (await sync()).handIn(sessionId);

    await night.replaceNight(
      serverCopy(sessionId, [{ seq: 1, type: 'buyin', playerId: DANA, amount: 10_000 as Money }], 'counting'),
      'here',
      BOOK,
    );
    expect((await night.openNightById(sessionId))!.status).toBe('counting');
  });

  it('sends the group’s roster writes to the host’s book, not a new one', async () => {
    const night = await store();
    const sessionId = await openHere(night);
    await (await sync()).handIn(sessionId);
    const h = await hold();

    expect(await h.heldBookFor(CLUB)).toBeNull();

    await night.replaceNight(serverCopy(sessionId, []), 'here', BOOK);
    expect(await h.heldBookFor(CLUB)).toBe(BOOK);

    // Passed on again: it is a member of the group like any other, and names
    // no book for anything.
    await night.replaceNight(serverCopy(sessionId, []), 'away', BOOK);
    expect(await h.heldBookFor(CLUB)).toBeNull();
  });
});

describe('a phone that has never passed a night', () => {
  it('has no hold on it, and records as it always did', async () => {
    const night = await store();
    const sessionId = await openHere(night);
    const h = await hold();

    expect(await h.holdOf(sessionId)).toBeNull();
    expect((await night.openNightById(sessionId))!.hold).toBeUndefined();
    await night.rebuy(IVO, 10_000 as Money);
    expect((await night.openNightById(sessionId))!.entries).toHaveLength(3);
  });
});
