/**
 * Bill splits, as re-specified by the 12 August handoff (§2.1–2.3).
 *
 * A bill is charged to players in profit, either in proportion to the size of
 * their win or evenly between them — unless the host chooses `custom` and types
 * an amount each, which is also how one person covers a whole bill.
 *
 * The worked examples below are the handoff's own.
 */

import { describe, expect, it } from 'vitest';
import { granularityOf, money, MoneyError, sum, type Money } from './money';
import { settle, SettlementError, type SettlementInput } from './settlement';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';

const DANA = 'dana';
const MAREK = 'marek';
const LENA = 'lena';
const PETR = 'petr'; // the loser who balances the night
const KITTY = 'kitty-holder';

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

/**
 * The handoff's canonical split night: Dana +$430, Marek +$300, Lena +$100,
 * and a $170 bill.
 */
function night(rule: MoneyRule): SettlementInput {
  seq = 0;
  return {
    players: [
      { id: DANA, name: 'Dana', atTable: true },
      { id: MAREK, name: 'Marek', atTable: true },
      { id: LENA, name: 'Lena', atTable: true },
      { id: PETR, name: 'Petr', atTable: true },
      { id: KITTY, name: 'The kitty', atTable: false },
    ],
    entries: [
      e({ type: 'buyin', playerId: DANA, amount: money(1000) }),
      e({ type: 'buyin', playerId: MAREK, amount: money(1000) }),
      e({ type: 'buyin', playerId: LENA, amount: money(1000) }),
      e({ type: 'buyin', playerId: PETR, amount: money(1000) }),
    ],
    // +430 / +300 / +100 / -830
    finalCounts: new Map<PlayerId, Money>([
      [DANA, money(1430)],
      [MAREK, money(1300)],
      [LENA, money(1100)],
      [PETR, money(170)],
    ]),
    rules: [rule],
  };
}

const bill = (over: Partial<MoneyRule>): MoneyRule => ({
  id: 'bill', name: 'Kitchen & drinks', active: true,
  amountKind: 'fixed', amount: money(170), basis: 'gross',
  charge: 'winners_only', destination: 'kitty', split: 'evenly',
  collectorPlayerId: KITTY, sortOrder: 1,
  ...over,
});

const charged = (r: ReturnType<typeof settle>, id: PlayerId) =>
  r.players.find((p) => p.playerId === id)!.charged;

describe('winners evenly', () => {
  it('splits $170 three ways, the biggest winners taking the extra units', () => {
    const r = settle(night(bill({ split: 'evenly' })));
    // 170 / 3 = 56.67
    expect(charged(r, DANA)).toBe(57);
    expect(charged(r, MAREK)).toBe(57);
    expect(charged(r, LENA)).toBe(56);
    expect(r.totalOffTable).toBe(170);
  });

  it('leaves the loser alone', () => {
    const r = settle(night(bill({ split: 'evenly' })));
    expect(charged(r, PETR)).toBe(0);
  });
});

describe('winners by percentage of the win', () => {
  it('reproduces the handoff’s awkward case exactly', () => {
    const r = settle(night(bill({ split: 'by_percent' })));
    // Dana 170 x 430/830 = 88.07 -> 88
    // Marek 170 x 300/830 = 61.44 -> 61
    // Lena  170 x 100/830 = 20.48 -> 20
    // Sum 169, one unit short; it goes to the largest fractional remainder,
    // which is Lena at .48 — NOT to the biggest winner.
    expect(charged(r, DANA)).toBe(88);
    expect(charged(r, MAREK)).toBe(61);
    expect(charged(r, LENA)).toBe(21);
    expect(r.totalOffTable).toBe(170);
  });

  it('still sums to the bill exactly', () => {
    const r = settle(night(bill({ split: 'by_percent' })));
    expect(sum(r.deductions[0].charges.map((c) => c.amount))).toBe(170);
  });
});

describe('custom', () => {
  it('lets one person cover the whole bill', () => {
    const r = settle(
      night(
        bill({
          split: 'custom',
          customShares: [
            { playerId: DANA, amount: money(170) },
            { playerId: MAREK, amount: money(0) },
            { playerId: LENA, amount: money(0) },
          ],
        }),
      ),
    );
    expect(charged(r, DANA)).toBe(170);
    expect(charged(r, MAREK)).toBe(0);
    expect(charged(r, LENA)).toBe(0);
  });

  it('may charge someone who is not in profit — the one split that can', () => {
    const r = settle(
      night(bill({ split: 'custom', customShares: [{ playerId: PETR, amount: money(170) }] })),
    );
    expect(charged(r, PETR)).toBe(170);
  });

  it('refuses amounts that do not add up to the bill', () => {
    expect(() =>
      settle(
        night(
          bill({
            split: 'custom',
            customShares: [
              { playerId: DANA, amount: money(100) },
              { playerId: MAREK, amount: money(50) },
            ],
          }),
        ),
      ),
    ).toThrow(/needs covering/);
  });

  it('refuses a custom split with no amounts at all', () => {
    expect(() => settle(night(bill({ split: 'custom' })))).toThrow(SettlementError);
  });

  it('refuses a share for somebody who is not in the night', () => {
    expect(() =>
      settle(
        night(bill({ split: 'custom', customShares: [{ playerId: 'ghost', amount: money(170) }] })),
      ),
    ).toThrow(SettlementError);
  });
});

describe('a percentage can only be charged to winners', () => {
  it('rejects a percentage charged to everyone at the table', () => {
    expect(() =>
      settle(night(bill({ amountKind: 'percent', amount: money(5), charge: 'everyone_flat' }))),
    ).toThrow(/can only be charged to winners/);
  });

  it('accepts the same percentage charged to winners', () => {
    const r = settle(night(bill({ amountKind: 'percent', amount: money(5) })));
    // 5% of each win, half up: 21.5 -> 22, 15 -> 15, 5 -> 5
    expect(charged(r, DANA)).toBe(22);
    expect(charged(r, MAREK)).toBe(15);
    expect(charged(r, LENA)).toBe(5);
  });
});

describe('rounding granularity', () => {
  it('maps each mode to a whole number of units', () => {
    expect(granularityOf('dollars')).toBe(1);
    expect(granularityOf('tens')).toBe(10);
    expect(granularityOf('fifties')).toBe(50);
    expect(granularityOf('hundreds')).toBe(100);
    expect(granularityOf('thousands')).toBe(1000);
  });

  it('treats unset as dollars, which is what every night has used so far', () => {
    expect(granularityOf(null)).toBe(1);
    expect(granularityOf(undefined)).toBe(1);
  });

  it('refuses cents rather than silently rounding to dollars', () => {
    // Honouring cents means storing minor units throughout. Falling back to
    // dollars would quietly take the wrong money.
    expect(() => granularityOf('cents')).toThrow(MoneyError);
  });
});
