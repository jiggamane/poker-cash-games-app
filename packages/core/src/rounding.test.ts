/**
 * The group's rounding rule, applied to the canonical night.
 *
 * A group that plays for hundreds does not want to be handed a bill share of
 * $56 or a piggy-bank charge of $81, and until now the engine had no way to be
 * told so: `RoundingMode` existed, `allocate()` took a granularity, and nothing
 * ever passed one. This is the night from `04-money-math.md` — the same eleven
 * entries, the same two rules — settled at each of the four granularities the
 * interface offers, so the figures a group would actually be asked to pay are
 * written down rather than reasoned about.
 *
 * THE TWO INVARIANTS ARE THE POINT. Rounding a share is only safe if the parts
 * still add up to the whole and the night still sums to zero, so every case
 * below asserts both, and hands the night to `verifyNight()` — which re-derives
 * its expectations from the ledger rather than from the engine.
 */

import { describe, expect, it } from 'vitest';
import { granularityOf, money, percentOf, sum, type Money, type RoundingMode } from './money';
import { settle, type SettlementResult } from './settlement';
import { inputFromSnapshot, snapshotOf } from './snapshot';
import { verifyNight } from './verify';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';

const DANA = 'dana';
const MAREK = 'marek';
const LENA = 'lena';
const TOMAS = 'tomas';
const IVO = 'ivo';
const PETR = 'petr';
const KITTY = 'the-kitty';

const players: Player[] = [
  { id: DANA, name: 'Dana', atTable: true },
  { id: MAREK, name: 'Marek', atTable: true },
  { id: LENA, name: 'Lena', atTable: true },
  { id: TOMAS, name: 'Tomáš', atTable: true },
  { id: IVO, name: 'Ivo', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  { id: KITTY, name: 'The piggy bank', atTable: false },
];

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

const entries: LedgerEntry[] = [
  e({ type: 'buyin', playerId: LENA, amount: money(1000) }),
  e({ type: 'buyin', playerId: PETR, amount: money(500) }),
  e({ type: 'buyin', playerId: MAREK, amount: money(500) }),
  e({ type: 'buyin', playerId: IVO, amount: money(500) }),
  e({ type: 'buyin', playerId: DANA, amount: money(500) }),
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
  e({ type: 'rebuy', playerId: IVO, amount: money(500) }),
  e({ type: 'expense', payerId: MAREK, amount: money(120) }),
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
  e({ type: 'expense', payerId: LENA, amount: money(50) }),
  e({ type: 'buyin', playerId: TOMAS, amount: money(500) }),
  e({ type: 'cashout', playerId: DANA, amount: money(2120) }),
];

const finalCounts = new Map<PlayerId, Money>([
  [MAREK, money(960)],
  [LENA, money(1430)],
  [TOMAS, money(0)],
  [IVO, money(220)],
  [PETR, money(270)],
]);

const rules: MoneyRule[] = [
  {
    id: 'kitty', name: 'Group piggy bank', active: true,
    amountKind: 'percent', amount: money(5), basis: 'gross',
    charge: 'winners_only', destination: 'kitty', split: 'evenly',
    collectorPlayerId: KITTY, sortOrder: 1,
  },
  {
    id: 'bill', name: 'Kitchen & drinks', active: true,
    amountKind: 'fixed', amount: money(170), basis: 'gross',
    charge: 'winners_only', destination: 'bill', split: 'evenly',
    collectorPlayerId: MAREK, sortOrder: 2,
  },
];

const at = (roundingMode: RoundingMode | null) =>
  settle({ players, entries, finalCounts, rules, ...(roundingMode === null ? {} : { roundingMode }) });

const charge = (r: SettlementResult, ruleId: string, id: PlayerId): Money =>
  (r.deductions.find((d) => d.ruleId === ruleId)?.charges.find((c) => c.playerId === id)?.amount ??
    0) as Money;
const took = (r: SettlementResult, ruleId: string): Money =>
  (r.deductions.find((d) => d.ruleId === ruleId)?.total ?? 0) as Money;

/**
 * The things that must be true of any night, at any granularity.
 *
 * `verifyNight` is the load-bearing line: it re-derives every identity from the
 * raw ledger rather than from the engine, so it is the check that would notice
 * a rounding rule quietly taking money the collector never receives.
 */
function holdsTogether(mode: RoundingMode | null, r: SettlementResult): void {
  expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
  for (const d of r.deductions) {
    expect(sum(d.charges.map((c) => c.amount))).toBe(d.total);
    expect(sum(d.credits.map((c) => c.amount))).toBe(d.total);
  }
  const verdict = verifyNight(
    { players, entries, finalCounts, rules, ...(mode === null ? {} : { roundingMode: mode }) },
    r,
  );
  expect(verdict.findings).toEqual([]);
  expect(verdict.ok).toBe(true);
}

// =============================================================================

describe('percentOf() at a granularity', () => {
  it('is unchanged at whole dollars — half up, to the unit', () => {
    expect(percentOf(money(430), 5)).toBe(22); // 21.5 -> 22, the handoff's case
    expect(percentOf(money(430), 5, 1)).toBe(22);
    expect(percentOf(money(1620), 5, 1)).toBe(81);
  });

  it('rounds half up to the nearest ten, hundred and thousand', () => {
    expect(percentOf(money(1620), 5, 10)).toBe(80); // 81 -> 80
    expect(percentOf(money(1620), 5, 100)).toBe(100); // 81 -> 100
    expect(percentOf(money(1620), 5, 1000)).toBe(0); // 81 -> nothing
    expect(percentOf(money(1620), 50, 1000)).toBe(1000); // 810 -> 1,000
  });

  it('lands a value exactly on the half upwards, not down', () => {
    // 5% of 300 is 15, which is half of a ten.
    expect(percentOf(money(300), 5, 10)).toBe(20);
    // 10% of 500 is 50, half of a hundred.
    expect(percentOf(money(500), 10, 100)).toBe(100);
  });

  it('refuses a granularity that is not a whole number of at least one', () => {
    expect(() => percentOf(money(100), 5, 0)).toThrow();
    expect(() => percentOf(money(100), 5, 2.5)).toThrow();
  });
});

describe('the canonical night at whole dollars', () => {
  it('is exactly the night the handoff worked, unset or set', () => {
    const unset = at(null);
    const dollars = at('dollars');
    expect(JSON.stringify(unset)).toBe(JSON.stringify(dollars));

    expect(charge(unset, 'kitty', DANA)).toBe(81);
    expect(charge(unset, 'kitty', MAREK)).toBe(23);
    expect(charge(unset, 'kitty', LENA)).toBe(22);
    expect(took(unset, 'kitty')).toBe(126);

    expect(charge(unset, 'bill', DANA)).toBe(57);
    expect(charge(unset, 'bill', MAREK)).toBe(57);
    expect(charge(unset, 'bill', LENA)).toBe(56);
    expect(took(unset, 'bill')).toBe(170);

    holdsTogether(null, unset);
  });
});

describe('the canonical night rounded to tens', () => {
  const r = at('tens');

  it('takes the piggy bank to the nearest ten of each win', () => {
    expect(charge(r, 'kitty', DANA)).toBe(80); // 81 -> 80
    expect(charge(r, 'kitty', MAREK)).toBe(20); // 23 -> 20
    expect(charge(r, 'kitty', LENA)).toBe(20); // 22 -> 20
    expect(took(r, 'kitty')).toBe(120);
  });

  it('splits the bill in tens and still adds up to the real $170', () => {
    expect(charge(r, 'bill', DANA)).toBe(60);
    expect(charge(r, 'bill', MAREK)).toBe(60);
    expect(charge(r, 'bill', LENA)).toBe(50);
    expect(took(r, 'bill')).toBe(170);
  });

  it('still balances to zero and still reimburses exactly what was spent', () => {
    holdsTogether('tens', r);
    const bill = r.deductions.find((d) => d.ruleId === 'bill')!;
    expect(bill.credits.find((c) => c.playerId === MAREK)!.amount).toBe(120);
    expect(bill.credits.find((c) => c.playerId === LENA)!.amount).toBe(50);
  });
});

describe('the canonical night rounded to hundreds', () => {
  const r = at('hundreds');

  it('charges the piggy bank only where a win is worth a hundred', () => {
    expect(charge(r, 'kitty', DANA)).toBe(100); // 81 -> 100
    expect(charge(r, 'kitty', MAREK)).toBe(0); // 23 -> nothing
    expect(charge(r, 'kitty', LENA)).toBe(0); // 22 -> nothing
    expect(took(r, 'kitty')).toBe(100);
  });

  /*
   * THE HONEST PART OF COARSE ROUNDING. $170 is not divisible into hundreds,
   * so somebody carries a share that is not round: allocate() hands the odd
   * $70 to whoever is furthest from their exact share, and the bar is still
   * owed exactly $170. A rule that rounded every share to a hundred would
   * either overcharge the table or leave the bar short.
   */
  it('cannot make every share round, and never invents or loses a dollar', () => {
    expect(took(r, 'bill')).toBe(170);
    expect(sum(r.deductions.find((d) => d.ruleId === 'bill')!.charges.map((c) => c.amount))).toBe(170);
    holdsTogether('hundreds', r);
  });
});

describe('the canonical night rounded to thousands', () => {
  const r = at('thousands');

  it('takes nothing for the piggy bank — no win is worth a thousand', () => {
    expect(took(r, 'kitty')).toBe(0);
    expect(r.deductions.some((d) => d.ruleId === 'kitty')).toBe(false);
  });

  it('still puts the whole real bill on the table', () => {
    expect(took(r, 'bill')).toBe(170);
    holdsTogether('thousands', r);
  });

  it('leaves the table $170 lighter and nothing else', () => {
    expect(r.totalOffTable).toBe(170);
  });
});

describe('granularityOf', () => {
  it('reads the four the interface offers', () => {
    expect(granularityOf('dollars')).toBe(1);
    expect(granularityOf('tens')).toBe(10);
    expect(granularityOf('hundreds')).toBe(100);
    expect(granularityOf('thousands')).toBe(1000);
  });

  it('refuses cents at the gate rather than settling in dollars behind the group', () => {
    expect(() => settle({ players, entries, finalCounts, rules, roundingMode: 'cents' })).toThrow();
  });
});

describe('a settled night carries its rounding rule', () => {
  it('re-derives to the same figures years later, whatever the group does next', () => {
    const input = { players, entries, finalCounts, rules, roundingMode: 'tens' as const };
    const first = settle(input);

    const stored = JSON.parse(JSON.stringify(snapshotOf(input)));
    const again = inputFromSnapshot(stored, JSON.parse(JSON.stringify(rules)));

    expect(again).not.toBeNull();
    expect(again!.roundingMode).toBe('tens');
    expect(JSON.stringify(settle(again!))).toBe(JSON.stringify(first));
  });

  it('a snapshot with no rounding rule reads back as whole dollars', () => {
    const stored = JSON.parse(JSON.stringify(snapshotOf({ players, entries, finalCounts, rules })));
    expect('roundingMode' in stored).toBe(false);
    const again = inputFromSnapshot(stored, rules)!;
    expect(JSON.stringify(settle(again))).toBe(JSON.stringify(at(null)));
  });
});
