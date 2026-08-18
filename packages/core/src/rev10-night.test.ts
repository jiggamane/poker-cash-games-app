/**
 * The night the SCREENS are drawn from — rev 10 § "The arithmetic a developer
 * must reproduce".
 *
 * This is not the same night as `canonical-night.test.ts`. That one is the
 * worked example in `04-money-math.md` ($5,000 through the table); this is the
 * sample night the design boards show, reconciled across 1C, 1D, 1A and 1B and
 * stated as a table rev 10 asks a developer to reproduce. Both are regression
 * tests, and they are worth having separately: the first proves the arithmetic
 * the money doc specifies, this one proves that what a player will actually
 * READ on the results screen is what the engine computes.
 *
 * The table, verbatim:
 *
 *   Player | in    | out   | bill | kitty | reimbursed | net
 *   Marek  | 1,000 | 1,300 |  61  |  15   |   +170     | +394
 *   Dana   |   500 |   930 |  88  |  22   |    —       | +320
 *   Lena   | 1,000 | 1,100 |  21  |   5   |    —       |  +74
 *   Tomáš  |   880 |   680 |  —   |  —    |    —       | −200
 *   Petr   | 1,500 | 1,250 |  —   |  —    |    —       | −250
 *   Ivo    | 1,000 |   620 |  —   |  —    |    —       | −380
 *
 * The two claims in it that are easy to get wrong, and are asserted below:
 *
 *   1. **Nets sum to −42, not zero.** Only the piggy bank actually leaves the room —
 *      the bill goes back to the person who paid it. Rev 10 states the general
 *      form: Σ nets = −(kitty + any rule not paid back to a person).
 *   2. **Marek nets more than Dana despite winning less at the table.** +394
 *      against +320, because his $170 comes back. That is why the results list
 *      sorts on the final net rather than on the table result (S44).
 */

import { describe, expect, it } from 'vitest';
import { money, sum, type Money } from './money';
import { settle } from './settlement';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';

const MAREK = 'marek';
const DANA = 'dana';
const LENA = 'lena';
const TOMAS = 'tomas';
const PETR = 'petr';
const IVO = 'ivo';
const KITTY = 'the-kitty';

const players: Player[] = [
  { id: MAREK, name: 'Marek', atTable: true },
  { id: DANA, name: 'Dana', atTable: true },
  { id: LENA, name: 'Lena', atTable: true },
  { id: TOMAS, name: 'Tomáš', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  { id: IVO, name: 'Ivo', atTable: true },
  { id: KITTY, name: 'The piggy bank', atTable: false },
];

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

/**
 * Rev 10 gives totals, not the individual entries behind them, and the totals
 * are all the deductions depend on. Everyone cashes out, so the table ends
 * empty and there are no chips left to count.
 */
const IN: Array<[PlayerId, number]> = [
  [MAREK, 1000],
  [DANA, 500],
  [LENA, 1000],
  [TOMAS, 880],
  [PETR, 1500],
  [IVO, 1000],
];

const OUT: Array<[PlayerId, number]> = [
  [MAREK, 1300],
  [DANA, 930],
  [LENA, 1100],
  [TOMAS, 680],
  [PETR, 1250],
  [IVO, 620],
];

const entries: LedgerEntry[] = [
  ...IN.map(([id, amount]) => e({ type: 'buyin', playerId: id, amount: money(amount) })),
  // The whole bill, on Marek's card. He is the one reimbursed in the table.
  e({ type: 'expense', payerId: MAREK, amount: money(170) }),
  ...OUT.map(([id, amount]) => e({ type: 'cashout', playerId: id, amount: money(amount) })),
];

const rules: MoneyRule[] = [
  {
    id: 'kitty',
    name: 'Group piggy bank',
    active: true,
    amountKind: 'percent',
    amount: money(5),
    basis: 'gross',
    charge: 'winners_only',
    destination: 'kitty',
    split: 'evenly',
    collectorPlayerId: KITTY,
    sortOrder: 1,
  },
  {
    id: 'bill',
    name: 'Kitchen & drinks',
    active: true,
    // The expenses are the amount; the rule only says how it is shared. Rev 10
    // draws 88 / 61 / 21, which is by the size of each win, not evenly.
    amountKind: 'fixed',
    amount: money(170),
    basis: 'gross',
    charge: 'winners_only',
    destination: 'bill',
    split: 'by_percent',
    collectorPlayerId: MAREK,
    sortOrder: 2,
  },
];

const result = settle({ players, entries, finalCounts: new Map<PlayerId, Money>(), rules });
const player = (id: PlayerId) => result.players.find((p) => p.playerId === id)!;
const charge = (ruleId: string, id: PlayerId) =>
  result.deductions.find((d) => d.ruleId === ruleId)!.charges.find((c) => c.playerId === id)
    ?.amount ?? 0;

describe("rev 10's night — the summary", () => {
  it('has 5,880 in and 5,880 out: "Money in play"', () => {
    expect(sum(result.players.map((p) => p.boughtIn))).toBe(5880);
    expect(sum(OUT.map(([, amount]) => money(amount)))).toBe(5880);
  });

  it('balances, with nothing left on the table', () => {
    expect(result.reconciliation.chipsOnTable).toBe(0);
    expect(result.reconciliation.difference).toBe(0);
  });

  it('takes a 170 bill and a 42 kitty off it', () => {
    expect(result.deductions.find((d) => d.ruleId === 'bill')!.total).toBe(170);
    expect(result.deductions.find((d) => d.ruleId === 'kitty')!.total).toBe(42);
    expect(result.totalOffTable).toBe(212);
  });
});

describe("rev 10's night — each player's row", () => {
  it('splits the bill by the size of each win: 88 / 61 / 21', () => {
    expect(charge('bill', DANA)).toBe(88);
    expect(charge('bill', MAREK)).toBe(61);
    expect(charge('bill', LENA)).toBe(21);
  });

  it('charges the piggy bank 5% of each win: 22 / 15 / 5', () => {
    expect(charge('kitty', DANA)).toBe(22); // 430 * 5% = 21.50 -> 22
    expect(charge('kitty', MAREK)).toBe(15);
    expect(charge('kitty', LENA)).toBe(5);
  });

  it('leaves the three losers untouched — both rules charge winners only', () => {
    for (const id of [TOMAS, PETR, IVO]) {
      expect(charge('bill', id)).toBe(0);
      expect(charge('kitty', id)).toBe(0);
    }
  });

  it('produces the stated net for every player', () => {
    expect(player(MAREK).finalPosition).toBe(394);
    expect(player(DANA).finalPosition).toBe(320);
    expect(player(LENA).finalPosition).toBe(74);
    expect(player(TOMAS).finalPosition).toBe(-200);
    expect(player(PETR).finalPosition).toBe(-250);
    expect(player(IVO).finalPosition).toBe(-380);
  });
});

describe("rev 10's night — the two claims that are easy to get wrong", () => {
  it('sums the six drawn rows to −42, the piggy bank being the only money that left', () => {
    const atTheTable = result.players.filter((p) => p.playerId !== KITTY);
    expect(sum(atTheTable.map((p) => p.finalPosition))).toBe(-42);

    // The general form rev 10 asks a developer to assert, rather than the one
    // number: everything taken off the table, less anything handed straight
    // back to the person who fronted it.
    const kitty = result.deductions.find((d) => d.ruleId === 'kitty')!.total;
    expect(sum(atTheTable.map((p) => p.finalPosition))).toBe(-kitty);
  });

  /**
   * The same fact, stated so that it cannot be misread.
   *
   * "Nets sum to −42" is true of the SIX ROWS THE SCREEN DRAWS, and only
   * because the seventh party is not drawn. The kitty is a collector — someone
   * who holds money and never sits down — and their +42 is exactly the missing
   * 42. Money does not leave the world; it leaves the table.
   *
   * Worth asserting explicitly, because a developer reading rev 10 alone could
   * reasonably conclude the engine is meant to lose 42 somewhere, and build a
   * screen that balances by discarding it.
   */
  it('sums to zero once the collector holding the piggy bank is counted', () => {
    expect(sum(result.players.map((p) => p.finalPosition))).toBe(0);
    expect(player(KITTY).finalPosition).toBe(42);
  });

  it('puts Marek above Dana, though he won less at the table', () => {
    expect(player(MAREK).grossResult).toBeLessThan(player(DANA).grossResult);
    expect(player(MAREK).finalPosition).toBeGreaterThan(player(DANA).finalPosition);

    // S44: the results list is sorted on this, best first.
    const order = [...result.players]
      .filter((p) => p.playerId !== KITTY)
      .sort((a, b) => b.finalPosition - a.finalPosition)
      .map((p) => p.playerId);
    expect(order).toEqual([MAREK, DANA, LENA, TOMAS, PETR, IVO]);
  });
});
