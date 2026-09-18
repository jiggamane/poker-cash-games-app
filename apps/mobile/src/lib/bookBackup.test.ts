import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expoSqlite, reset } from './testSqlite';
import { settlementReads } from './bookBackup';

/**
 * THE THIRD COPY, OUT AND BACK IN.
 *
 * A backup that cannot be restored is a file somebody feels better for having,
 * so nothing here asserts that the shape looks right. It takes a real night
 * through the real store, throws the database away — which is what losing the
 * phone is — and puts the backup into a fresh one, then checks the figures are
 * the same to the dollar.
 *
 * THE MAP IS WHY `freeze()` IS IN THIS PATH. `rounding.positions` is a Map,
 * `JSON.stringify` turns a Map into `{}` with no error anywhere, and that is
 * B52: the settlement row was written that way from the day it existed and the
 * loss was invisible because nothing read it back. A backup is the one artefact
 * where nothing reads it back for months.
 */

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-sqlite', () => expoSqlite);
let nextId = 0;
vi.mock('expo-crypto', () => ({
  randomUUID: () => `cccccccc-dddd-4eee-8fff-${String(nextId++).padStart(12, '0')}`,
}));
vi.mock('expo-linking', () => ({ createURL: (u: string) => `pokerclub://${u}`, parse: () => ({}) }));
vi.mock('./supabase', () => ({
  isSupabaseConfigured: false,
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

const uuid = (n: number): string =>
  `0000${n.toString(16).padStart(4, '0')}-0000-4000-8000-000000000000`.slice(0, 36);

const DANA = uuid(2);
const IVO = uuid(3);
const CLUB = 'The Poker Club';

const store = () => import('./nightStore');

/** A night played to the end: $200 on the table, $200 off it, Dana $30 up. */
async function playANight(night: Awaited<ReturnType<typeof store>>): Promise<void> {
  await night.startNight({
    clubId: uuid(60),
    groupName: CLUB,
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
}

beforeEach(() => {
  reset();
  vi.resetModules();
  nextId = 0;
});

describe('a backup of a night that was played', () => {
  it('goes out and comes back to the same figures', async () => {
    const before = await store();
    await before.openNight();
    await playANight(before);

    const mine = await before.readMyNights();
    expect(mine).toHaveLength(1);
    const wasWorth = mine[0]!.result;
    const backup = await before.readBackup();

    // The whole of what a person would keep: one string, in a clipboard.
    const text = JSON.stringify(backup);
    expect(text.length).toBeGreaterThan(0);

    // ---- and the phone goes in a river.
    reset();
    vi.resetModules();
    const after = await store();
    await after.openNight();
    expect(await after.readMyNights(), 'the new phone is not empty to start with').toEqual([]);

    const added = await after.restoreBackup(text);
    expect(added).toBe(1);

    const back = await after.readMyNights();
    expect(back).toHaveLength(1);
    expect(back[0]!.result, 'the night came back worth a different amount').toBe(wasWorth);
    expect(back[0]!.sessionId).toBe(mine[0]!.sessionId);
    expect(back[0]!.players).toBe(mine[0]!.players);
    expect(back[0]!.groupName).toBe(CLUB);
  });

  it('carries the rounding positions, which a Map loses silently — B52', async () => {
    const night = await store();
    await night.openNight();
    await playANight(night);

    const backup = await night.readBackup();
    const one = backup.nights[0]!;

    // Through the same round trip a clipboard puts it through.
    const read = JSON.parse(JSON.stringify(one)) as typeof one;
    expect(settlementReads(read), 'the frozen settlement will not thaw').toBe(true);

    // The positions are a LIST in the file. As a Map they would be `{}`.
    const positions = (read.settlement as { rounding: { positions: unknown } }).rounding.positions;
    expect(Array.isArray(positions)).toBe(true);
  });

  it('holds every entry of the night, not just its result', async () => {
    const night = await store();
    await night.openNight();
    await playANight(night);

    const one = (await night.readBackup()).nights[0]!;
    // Two buy-ins, and both counts.
    expect(one.entries).toHaveLength(2);
    expect(one.counts.map((c) => c.amount).sort((a, b) => a - b)).toEqual([7_000, 13_000]);
    expect(one.players.map((p) => p.name).sort()).toEqual(['Dana', 'Ivo']);
    // Every entry keeps when it happened. A restore that lost this would put
    // the night back with every row stamped "whenever it was restored".
    for (const e of one.entries) expect(e.occurredAt).toBeTruthy();
  });

  it('leaves the sample night out — a backup is of what was played', async () => {
    const night = await store();
    await night.openNight();
    await playANight(night);

    const backup = await night.readBackup();
    expect(backup.nights).toHaveLength(1);
    expect(backup.nights[0]!.sessionId).not.toMatch(/seed/);
  });

  it('takes a night still being played, which is when you would want it most', async () => {
    const night = await store();
    await night.openNight();
    await night.startNight({
      clubId: uuid(61),
      groupName: CLUB,
      rules: [],
      seats: [{ playerId: DANA, name: 'Dana', buyIn: 10_000 as never }],
      meId: DANA,
    });

    const backup = await night.readBackup();
    expect(backup.nights).toHaveLength(1);
    expect(backup.nights[0]!.status).toBe('open');
  });
});

describe('a backup that is not one', () => {
  it('refuses anything that is not JSON at all', async () => {
    const night = await store();
    await night.openNight();
    expect(await night.restoreBackup('not a backup')).toBeNull();
    expect(await night.restoreBackup('')).toBeNull();
  });

  it('refuses JSON that is not this format', async () => {
    const night = await store();
    await night.openNight();
    expect(await night.restoreBackup('{"nights":[]}')).toBeNull();
    expect(await night.restoreBackup('[1,2,3]')).toBeNull();
    expect(await night.restoreBackup('null')).toBeNull();
  });

  /*
   * A FILE FROM A LATER BUILD IS REFUSED, NOT GUESSED AT. The whole reason a
   * version is in the envelope from the first one is that a backup is opened by
   * whatever the app is on the day it is needed, which is not the day it was
   * written.
   */
  it('refuses a version it does not know', async () => {
    const night = await store();
    await night.openNight();
    const future = JSON.stringify({
      format: 'poker-club.backup',
      version: 99,
      exportedAt: new Date().toISOString(),
      nights: [],
    });
    expect(await night.restoreBackup(future)).toBeNull();
  });

  it('accepts an empty backup as an empty backup', async () => {
    const night = await store();
    await night.openNight();
    const empty = JSON.stringify({
      format: 'poker-club.backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      nights: [],
    });
    expect(await night.restoreBackup(empty)).toBe(0);
  });
});
