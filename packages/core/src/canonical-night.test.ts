/**
 * The canonical night from the design handoff (`04-money-math.md`).
 *
 * The handoff says of its transfer list: "This exact list is your regression
 * test." So this file reproduces that night end to end, from the eleven ledger
 * entries to the six payments, and asserts every intermediate figure the
 * handoff states. If the money model is right, all of this passes; if any of it
 * fails, the model has drifted from the specification.
 *
 * **This night is worked on the EVEN split — 57 / 57 / 56.** S62 has since made
 * *by size of win* the default and rev 15 § 5 re-derived the same night on it;
 * that version is `rev15-night.test.ts`, and it is the one the app is seeded
 * with and the current frames are drawn from. Nothing here is stale as a test:
 * `evenly` is still a rule a group can choose, and it is still what
 * `04-money-math.md` and the E-series frames document. Two splits, two files,
 * one night — so a change to the default cannot silently break the other rule.
 */

import { describe, expect, it } from 'vitest';
import { money, sum, type Money } from './money';
import { settle } from './settlement';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';

const DANA = 'dana';
const MAREK = 'marek';
const LENA = 'lena';
const TOMAS = 'tomas';
const IVO = 'ivo';
const PETR = 'petr';
const KITTY = 'the-kitty'; // holds money, never sits down

const players: Player[] = [
  { id: DANA, name: 'Dana', atTable: true },
  { id: MAREK, name: 'Marek', atTable: true },
  { id: LENA, name: 'Lena', atTable: true },
  { id: TOMAS, name: 'Tomáš', atTable: true },
  { id: IVO, name: 'Ivo', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  { id: KITTY, name: 'The kitty', atTable: false },
];

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

/** The eleven money entries, in the order the handoff lists them. */
const entries: LedgerEntry[] = [
  e({ type: 'buyin', playerId: LENA, amount: money(1000) }), // double
  e({ type: 'buyin', playerId: PETR, amount: money(500) }),
  e({ type: 'buyin', playerId: MAREK, amount: money(500) }),
  e({ type: 'buyin', playerId: IVO, amount: money(500) }),
  e({ type: 'buyin', playerId: DANA, amount: money(500) }), // late
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
  e({ type: 'rebuy', playerId: IVO, amount: money(500) }),
  e({ type: 'expense', payerId: MAREK, amount: money(120) }), // pizza
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
  e({ type: 'expense', payerId: LENA, amount: money(50) }), // drinks
  e({ type: 'buyin', playerId: TOMAS, amount: money(500) }),
  e({ type: 'cashout', playerId: DANA, amount: money(2120) }),
];

/** Chips in front of the five players still seated. */
const finalCounts = new Map<PlayerId, Money>([
  [MAREK, money(960)],
  [LENA, money(1430)],
  [TOMAS, money(0)],
  [IVO, money(220)],
  [PETR, money(270)],
]);

const rules: MoneyRule[] = [
  {
    id: 'kitty', name: 'Group kitty', active: true,
    amountKind: 'percent', amount: money(5), basis: 'gross',
    charge: 'winners_only', destination: 'kitty', split: 'evenly',
    collectorPlayerId: KITTY, sortOrder: 1,
  },
  {
    id: 'bill', name: 'Kitchen & drinks', active: true,
    // The expenses are the amount; the rule only says how it is shared.
    amountKind: 'fixed', amount: money(170), basis: 'gross',
    charge: 'winners_only', destination: 'bill', split: 'evenly',
    collectorPlayerId: MAREK, sortOrder: 2,
  },
];

const result = settle({ players, entries, finalCounts, rules });

const player = (id: PlayerId) => result.players.find((p) => p.playerId === id)!;

describe('the canonical night — money in', () => {
  it('records what each player put on the table', () => {
    expect(player(PETR).boughtIn).toBe(1500);
    expect(player(LENA).boughtIn).toBe(1000);
    expect(player(IVO).boughtIn).toBe(1000);
    expect(player(MAREK).boughtIn).toBe(500);
    expect(player(TOMAS).boughtIn).toBe(500);
    expect(player(DANA).boughtIn).toBe(500);
  });

  it('totals $5,000 in and $2,880 left on the table', () => {
    expect(sum(result.players.map((p) => p.boughtIn))).toBe(5000);
    // 5,000 in, less Dana's 2,120 cash-out
    expect(result.reconciliation.chipsOnTable).toBe(2880);
  });
});

describe('the canonical night — step 1, counting the table', () => {
  it('balances: the counted chips equal the money on the table', () => {
    expect(result.reconciliation.counted).toBe(2880);
    expect(result.reconciliation.difference).toBe(0);
    expect(result.reconciliation.reconciled).toBe(true);
  });

  it('produces the stated gross results', () => {
    expect(player(DANA).grossResult).toBe(1620);
    expect(player(MAREK).grossResult).toBe(460);
    expect(player(LENA).grossResult).toBe(430);
    expect(player(TOMAS).grossResult).toBe(-500);
    expect(player(IVO).grossResult).toBe(-780);
    expect(player(PETR).grossResult).toBe(-1230);
  });

  it('sums gross results to exactly zero — they always must', () => {
    expect(sum(result.players.map((p) => p.grossResult))).toBe(0);
  });
});

describe('the canonical night — step 2, the money rules', () => {
  it('charges the kitty 5% of each win, rounding half up', () => {
    const kitty = result.deductions.find((d) => d.ruleId === 'kitty')!;
    const charge = (id: PlayerId) => kitty.charges.find((c) => c.playerId === id)?.amount ?? 0;

    expect(charge(DANA)).toBe(81); // 1620 * 5% = 81.00
    expect(charge(MAREK)).toBe(23); // 460 * 5% = 23.00
    expect(charge(LENA)).toBe(22); // 430 * 5% = 21.50 -> 22, the rounding case
    expect(kitty.total).toBe(126);
  });

  it('splits the $170 bill EVENLY between the winners, biggest win absorbing the extra unit', () => {
    const bill = result.deductions.find((d) => d.ruleId === 'bill')!;
    const charge = (id: PlayerId) => bill.charges.find((c) => c.playerId === id)?.amount ?? 0;

    // 170 / 3 = 56.67; two units left over go to the two biggest winners
    expect(charge(DANA)).toBe(57);
    expect(charge(MAREK)).toBe(57);
    expect(charge(LENA)).toBe(56);
    expect(bill.total).toBe(170);
  });

  it('leaves the losers untouched — both rules charge winners only', () => {
    expect(player(TOMAS).charged).toBe(0);
    expect(player(IVO).charged).toBe(0);
    expect(player(PETR).charged).toBe(0);
  });

  it('takes $296 off the table', () => {
    expect(result.totalOffTable).toBe(296); // 170 bill + 126 kitty
  });
});

describe('the canonical night — step 3, settling up', () => {
  it('pays each person back exactly what they fronted', () => {
    // Marek put up 120 for the pizza and Lena 50 for the drinks
    expect(player(MAREK).credited).toBe(120);
    expect(player(LENA).credited).toBe(50);
    expect(player(DANA).credited).toBe(0);
  });

  it('produces the stated net positions', () => {
    expect(player(DANA).finalPosition).toBe(1482); // 1620 - 81 - 57
    expect(player(MAREK).finalPosition).toBe(500); // 460 - 23 - 57 + 120
    expect(player(LENA).finalPosition).toBe(402); // 430 - 22 - 56 + 50
    expect(player(KITTY).finalPosition).toBe(126);
    expect(player(TOMAS).finalPosition).toBe(-500);
    expect(player(IVO).finalPosition).toBe(-780);
    expect(player(PETR).finalPosition).toBe(-1230);
  });

  it('balances: credits 2,510 against debits 2,510', () => {
    const credits = sum(result.players.filter((p) => p.finalPosition > 0).map((p) => p.finalPosition));
    const debits = sum(result.players.filter((p) => p.finalPosition < 0).map((p) => p.finalPosition));
    expect(credits).toBe(2510);
    expect(debits).toBe(-2510);
  });

  it('nets the bill to zero across the table once fronting is counted', () => {
    // The handoff's own check: share minus what you fronted, summed, is zero.
    const bill = result.deductions.find((d) => d.ruleId === 'bill')!;
    const net = sum([
      ...bill.charges.map((c) => money(-c.amount)),
      ...bill.credits.map((c) => c.amount),
    ]);
    expect(net).toBe(0);
  });

  /**
   * The handoff's six transfers, verbatim.
   *
   * RESOLVED: the product owner confirmed the handoff's figures are layout
   * mock-ups and can be wrong, so where a drawn number and a stated rule
   * disagree, the rule wins.
   *
   * That settles rows 5 and 6. The handoff lists Lena ($122) before the kitty
   * ($126), but its own algorithm — "take the largest remaining debtor and the
   * largest remaining creditor" — must pick the kitty first, because 126 > 122.
   * The engine follows the algorithm. Every payment, every amount and every
   * person's total is identical; only those two adjacent rows are ordered
   * differently, and the layout is the thing that was wrong.
   *
   * Everything else in this file reproduced exactly on the first run, which is
   * what makes it worth keeping as a regression test.
   */
  const HANDOFF_TRANSFERS = [
    { fromPlayerId: PETR, toPlayerId: DANA, amount: 1230 },
    { fromPlayerId: IVO, toPlayerId: MAREK, amount: 500 },
    { fromPlayerId: IVO, toPlayerId: LENA, amount: 280 },
    { fromPlayerId: TOMAS, toPlayerId: DANA, amount: 252 },
    { fromPlayerId: TOMAS, toPlayerId: LENA, amount: 122 },
    { fromPlayerId: TOMAS, toPlayerId: KITTY, amount: 126 },
  ];

  const key = (t: { fromPlayerId: string; toPlayerId: string; amount: number }) =>
    `${t.fromPlayerId}->${t.toPlayerId}:${t.amount}`;

  it('REGRESSION: produces exactly the six stated transfers', () => {
    expect(result.transfers).toHaveLength(6);
    expect(new Set(result.transfers.map(key))).toEqual(new Set(HANDOFF_TRANSFERS.map(key)));
  });

  it('REGRESSION: matches the handoff row for row, up to the two it contradicts itself on', () => {
    // The first four rows are identical and in the same order.
    expect(result.transfers.slice(0, 4)).toEqual(HANDOFF_TRANSFERS.slice(0, 4));
    // The last two are the same pair of payments, largest first per the algorithm.
    expect(result.transfers.slice(4)).toEqual([
      { fromPlayerId: TOMAS, toPlayerId: KITTY, amount: 126 },
      { fromPlayerId: TOMAS, toPlayerId: LENA, amount: 122 },
    ]);
  });

  it('has every debtor pay their debt in full and every creditor receive theirs', () => {
    for (const p of result.players) {
      const paid = sum(
        result.transfers.filter((t) => t.fromPlayerId === p.playerId).map((t) => t.amount),
      );
      const received = sum(
        result.transfers.filter((t) => t.toPlayerId === p.playerId).map((t) => t.amount),
      );
      expect(received - paid).toBe(p.finalPosition);
    }
  });

  it('keeps each debtor’s payments together in the list', () => {
    const order = result.transfers.map((t) => t.fromPlayerId);
    expect(order).toEqual([...new Set(order)].flatMap((id) => order.filter((o) => o === id)));
  });

  it('needs at most one fewer transfer than there are non-zero balances', () => {
    const nonZero = result.players.filter((p) => p.finalPosition !== 0).length;
    expect(nonZero).toBe(7);
    expect(result.transfers).toHaveLength(6);
  });
});
