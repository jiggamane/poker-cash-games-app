import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Money } from '@poker-club/core';
import { expoSqlite, reset } from './testSqlite';

/**
 * B93 — WHAT A SPEND WAS FOR REACHES THE SERVER.
 *
 * The phone kept "Pizza" in its own row and the queue carried none of it, so
 * the server's `note` column was null for every entry ever sent, and every
 * phone that read a night back saw spends with no names. The queue is where
 * the note has to be — `recordEntry` says so — and this holds it there.
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

beforeEach(() => {
  reset();
  vi.resetModules();
  nextId = 0;
});

describe('a spend’s note (B93)', () => {
  it('travels in the queued entry, so the server gets it', async () => {
    const night = await import('./nightStore');
    await night.openNight();
    await night.startNight({
      clubId: uuid(60),
      groupName: 'The Poker Club',
      rules: [],
      seats: [{ playerId: uuid(2), name: 'Dana', buyIn: 10_000 as Money }],
      meId: uuid(2),
    });
    const { sessionId } = (await night.openNight())!;

    await night.addSpend(2_400 as Money, 'Pizza', { kind: 'kitty' });

    const { outbox } = await import('./sync');
    const queued = (await outbox.pending(100)).filter(
      (i) => i.sessionId === sessionId && i.kind === 'entry.append',
    );
    const spend = queued.find((i) => (i.payload as { type: string }).type === 'expense');
    expect(spend).toBeDefined();
    expect((spend!.payload as { note?: string }).note).toBe('Pizza');
  });
});
