import { describe, expect, it } from 'vitest';
import { money, type Money } from './money';
import { settle, type SettlementInput } from './settlement';
import { inputFromSnapshot, snapshotOf } from './snapshot';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';
import { verifyNight } from './verify';

/**
 * The round trip a night makes between being played and being audited.
 *
 * A night is settled on a phone, its inputs are snapshotted into a JSON column,
 * and weeks later `npm run audit` rebuilds it on another machine and re-derives
 * every figure. Every step of that is lossless or the audit reports failures
 * that are not real — and a verification system that cries wolf is worse than
 * none, because the first thing anybody does is stop reading it.
 *
 * JSON is where this breaks in practice. `finalCounts` is a Map, which
 * serialises to `{}` if anybody forgets, and a night whose counts all became
 * zero settles to a completely different answer without erroring anywhere.
 */

const A = 'pa';
const B = 'pb';
const KITTY = 'kitty';

const players: Player[] = [
  { id: A, name: 'Ada', atTable: true },
  { id: B, name: 'Ben', atTable: true },
  { id: KITTY, name: 'The kitty', atTable: false },
];

const rules: MoneyRule[] = [
  {
    id: 'r1',
    name: 'Group kitty',
    active: true,
    amountKind: 'percent',
    amount: money(10),
    basis: 'gross',
    charge: 'winners_only',
    destination: 'kitty',
    split: 'evenly',
    collectorPlayerId: KITTY,
    sortOrder: 1,
  },
];

const entries: LedgerEntry[] = [
  { id: 'e1', seq: 1, type: 'buyin', playerId: A, amount: money(1000) },
  { id: 'e2', seq: 2, type: 'buyin', playerId: B, amount: money(1000) },
  { id: 'e3', seq: 3, type: 'rebuy', playerId: B, amount: money(500) },
  { id: 'e4', seq: 4, type: 'expense', payerId: A, amount: money(150) },
];

const input: SettlementInput = {
  players,
  entries,
  finalCounts: new Map<PlayerId, Money>([
    [A, money(2000)],
    [B, money(500)],
  ]),
  rules,
};

/** Exactly what the column does to it: through JSON and back. */
const throughJson = <T>(value: T): unknown => JSON.parse(JSON.stringify(value));

describe('a night stored and rebuilt', () => {
  it('settles to the identical result on the other side', () => {
    const before = settle(input);

    const rebuilt = inputFromSnapshot(
      throughJson(snapshotOf(input)),
      throughJson(rules),
    );
    expect(rebuilt).not.toBeNull();

    expect(settle(rebuilt!)).toEqual(before);
  });

  it('keeps the counts, which is the part JSON quietly loses', () => {
    // A Map serialises to {} if it is not converted to pairs. The night would
    // still settle — to a night where everybody counted zero.
    const rebuilt = inputFromSnapshot(throughJson(snapshotOf(input)), throughJson(rules))!;

    expect(rebuilt.finalCounts.get(A)).toBe(2000);
    expect(rebuilt.finalCounts.get(B)).toBe(500);
    expect(rebuilt.finalCounts.size).toBe(2);
  });

  it('passes verification after the round trip', () => {
    const rebuilt = inputFromSnapshot(throughJson(snapshotOf(input)), throughJson(rules))!;
    expect(verifyNight(rebuilt, settle(rebuilt)).ok).toBe(true);
  });

  it('carries the rules the night was settled under, not today’s', () => {
    // The whole point of a snapshot: the group doubles its kitty next month and
    // last month's record must not move.
    const rebuilt = inputFromSnapshot(throughJson(snapshotOf(input)), throughJson(rules))!;
    const today: MoneyRule[] = [{ ...rules[0], amount: money(50) }];

    expect(settle(rebuilt).totalOffTable).not.toBe(
      settle({ ...rebuilt, rules: today }).totalOffTable,
    );
  });

  it('round-trips a night closed over a confirmed shortfall', () => {
    const short: SettlementInput = {
      ...input,
      finalCounts: new Map<PlayerId, Money>([
        [A, money(2000)],
        [B, money(400)],
      ]),
      acknowledgedDiscrepancy: {
        amount: money(-100),
        confirmedByUserId: 'host',
        confirmedAt: '2026-08-13T23:00:00.000Z',
        note: 'A hundred short.',
      },
    };

    const rebuilt = inputFromSnapshot(
      throughJson(snapshotOf(short)),
      throughJson(rules),
      short.acknowledgedDiscrepancy,
    )!;

    expect(settle(rebuilt)).toEqual(settle(short));
    expect(verifyNight(rebuilt, settle(rebuilt)).ok).toBe(true);
  });
});

describe('a snapshot that cannot be used', () => {
  it('refuses rather than inventing an empty night', () => {
    // Each of these would otherwise "audit" as a perfectly balanced night in
    // which nothing happened, and be counted as a pass.
    expect(inputFromSnapshot(null, rules)).toBeNull();
    expect(inputFromSnapshot({}, rules)).toBeNull();
    expect(inputFromSnapshot({ players: [] }, rules)).toBeNull();
    expect(inputFromSnapshot('not an object', rules)).toBeNull();
  });

  it('survives a night stored with no rules at all', () => {
    const rebuilt = inputFromSnapshot(throughJson(snapshotOf(input)), null);
    expect(rebuilt?.rules).toEqual([]);
  });
});
