/**
 * THE WORKED EXAMPLE FROM THE RESULTS HANDOFF, asserted to the dollar.
 *
 * `design_handoff_rebuy_and_results/README.md`, Part 2 § "The worked example
 * (use it as the test case)" — eight players, a $432 bill two of them fronted,
 * a $184 piggy bank, and eight finals that sum to −184 rather than to zero.
 *
 * IT IS THE SPEC'S NIGHT AND NOT THE APP'S. The app is seeded with the
 * canonical night (`rev15-night.test.ts`, `apps/mobile/src/data/sampleNight.ts`)
 * and stays seeded with it, so a screen can still be held against the frames it
 * was drawn from. This file is the other half: the handoff states a table of
 * sixteen figures, and a handoff's own arithmetic is the one thing a build can
 * be wrong about without any screen looking wrong.
 *
 * WHAT IT IS REALLY HOLDING is the reversal. `design/handoff-four-screens/`,
 * cut 2 September, said **deductions are not folded into any player's balance**
 * and E6 drew the game results alone. This handoff folds them back in and prints
 * the working underneath — `1,620 − 54 − 23`, with `+ 242 paid` for whoever
 * covered a bill — so the caption terms and the figure they explain are now the
 * whole of what a settled night says about one person. If they ever disagree,
 * the screen is arguing with itself in public.
 */

import { describe, expect, it } from 'vitest';
import { money, type Money } from './money';
import { destinationWord } from './ruleText';
import { settle } from './settlement';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';
import {
  gameResults,
  paymentProgress,
  resultFormula,
  resultTotals,
  ruleOutcomes,
} from './working';

const DANA = 'dana';
const LENA = 'lena';
const PETR = 'petr';
const MAREK = 'marek';
const EVA = 'eva';
const JAKUB = 'jakub';
const TOMAS = 'tomas';
const IVAN = 'ivan';
/**
 * The piggy bank as a party, the way `rev15-night.test.ts` has it.
 *
 * The handoff's own words: *"The piggy bank is a recipient like any person."*
 * In this engine that is literally true — it is a collector who never sits
 * down, so the $184 has somewhere to be and something to be transferred to,
 * and B27 keeps it off anybody's result.
 */
const PIGGY = 'the-piggy-bank';

const players: Player[] = [
  { id: DANA, name: 'Dana', atTable: true },
  { id: LENA, name: 'Lena', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  { id: MAREK, name: 'Marek', atTable: true },
  { id: EVA, name: 'Eva', atTable: true },
  { id: JAKUB, name: 'Jakub', atTable: true },
  { id: TOMAS, name: 'Tomáš', atTable: true },
  { id: IVAN, name: 'Ivan', atTable: true },
  { id: PIGGY, name: 'Piggy bank', atTable: false },
];

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

/**
 * The buy-ins are OURS, not the handoff's — it states the game results and the
 * finals and says nothing about how anybody got there. What matters is that the
 * eight game figures come out as drawn and that the table nets to zero, which
 * is the closing row of block 1.
 */
const entries: LedgerEntry[] = [
  e({ type: 'buyin', playerId: DANA, amount: money(500) }),
  e({ type: 'buyin', playerId: LENA, amount: money(1000) }),
  e({ type: 'buyin', playerId: PETR, amount: money(1500) }),
  e({ type: 'buyin', playerId: MAREK, amount: money(500) }),
  e({ type: 'buyin', playerId: EVA, amount: money(500) }),
  e({ type: 'buyin', playerId: JAKUB, amount: money(500) }),
  e({ type: 'buyin', playerId: TOMAS, amount: money(500) }),
  e({ type: 'buyin', playerId: IVAN, amount: money(1500) }),
  /* The two bills on the face of the deduction slab: "Petr paid the delivery
     $242", "Marek paid the shop run $190". The engine knows who paid and how
     much; what it has nowhere to keep is which errand it was. */
  e({ type: 'expense', payerId: PETR, amount: money(242) }),
  e({ type: 'expense', payerId: MAREK, amount: money(190) }),
];

const finalCounts = new Map<PlayerId, Money>([
  [DANA, money(2120)],
  [LENA, money(1430)],
  [PETR, money(1650)],
  [MAREK, money(290)],
  [EVA, money(320)],
  [JAKUB, money(200)],
  [TOMAS, money(120)],
  [IVAN, money(370)],
]);

/**
 * Both rules charge EVERYONE FLAT, which is what makes the handoff's arithmetic
 * work: `$432 / 8 = $54` and `$184 / 8 = $23`, off six losers as well as two
 * winners. That is the split the handoff's own note is defending — *"whoever
 * paid a bill gets it back in full below"* — and it is the split
 * `design/handoff-four-screens/` used as the argument for keeping deductions
 * OUT of a poker result. This handoff answers that argument by printing the
 * working rather than by hiding the subtraction.
 */
const rules: MoneyRule[] = [
  {
    id: 'bill', name: 'Kitchen & drinks', active: true,
    amountKind: 'fixed', amount: money(432), basis: 'gross',
    charge: 'everyone_flat', destination: 'bill', split: 'evenly',
    collectorPlayerId: PETR, sortOrder: 1,
  },
  {
    id: 'piggy', name: 'Piggy bank', active: true,
    amountKind: 'fixed', amount: money(184), basis: 'gross',
    charge: 'everyone_flat', destination: 'kitty', split: 'evenly',
    collectorPlayerId: PIGGY, sortOrder: 2,
  },
];

const result = settle({ players, entries, finalCounts, rules });

const game = (id: PlayerId): Money =>
  gameResults(result).find((g) => g.player.playerId === id)!.game;
const row = (id: PlayerId) => resultFormula(result).find((f) => f.player.playerId === id)!;
/** The caption as R1 prints it, bar the currency: `150 − 54 − 23 + 242 paid`. */
const caption = (id: PlayerId): string =>
  row(id)
    .caption.map((term, i) => {
      const figure = Math.abs(term.amount).toLocaleString('en-US');
      const word = term.word === null ? '' : ` ${term.word}`;
      if (i === 0) return `${term.amount < 0 ? '−' : ''}${figure}${word}`;
      return `${term.amount < 0 ? '−' : '+'} ${figure}${word}`;
    })
    .join(' ');

describe('R1 · Results — the handoff’s worked example', () => {
  it('draws the eight game figures the board draws', () => {
    expect([
      game(DANA), game(LENA), game(PETR), game(MAREK),
      game(EVA), game(JAKUB), game(TOMAS), game(IVAN),
    ]).toEqual([1620, 430, 150, -210, -180, -300, -380, -1130]);
  });

  it('and they sum to zero, which is the closing row of the table block', () => {
    expect(resultTotals(result).game).toBe(0);
  });

  it('takes $54 and $23 off every one of the eight', () => {
    const bill = result.deductions.find((d) => d.ruleId === 'bill')!;
    const piggy = result.deductions.find((d) => d.ruleId === 'piggy')!;
    expect(bill.total).toBe(432);
    expect(piggy.total).toBe(184);
    expect(new Set(bill.charges.map((c) => c.amount))).toEqual(new Set([54]));
    expect(new Set(piggy.charges.map((c) => c.amount))).toEqual(new Set([23]));
    expect(bill.charges).toHaveLength(8);
    expect(piggy.charges).toHaveLength(8);
  });

  /** The handoff's table, right-hand column, in the order it prints it. */
  it('lands the eight finals the handoff states', () => {
    const final = (id: PlayerId) => row(id).net;
    expect([
      final(DANA), final(LENA), final(PETR), final(MAREK),
      final(EVA), final(JAKUB), final(TOMAS), final(IVAN),
    ]).toEqual([1543, 353, 315, -97, -257, -377, -457, -1207]);
  });

  /*
   * `final = game − 54 − 23 + (bills that person paid)` — the handoff's own
   * formula, and the caption is that formula made readable. The compensation is
   * a term of its own and comes LAST, which is what `+ 242 paid` is: the rule
   * happened to everybody and the repayment happened to Petr.
   */
  it('writes the caption the board writes, compensation and all', () => {
    expect(caption(DANA)).toBe('1,620 − 54 − 23');
    expect(caption(LENA)).toBe('430 − 54 − 23');
    expect(caption(PETR)).toBe('150 − 54 − 23 + 242 paid');
    expect(caption(MAREK)).toBe('−210 − 54 − 23 + 190 paid');
    expect(caption(EVA)).toBe('−180 − 54 − 23');
    expect(caption(JAKUB)).toBe('−300 − 54 − 23');
    expect(caption(TOMAS)).toBe('−380 − 54 − 23');
    expect(caption(IVAN)).toBe('−1,130 − 54 − 23');
  });

  /*
   * AND IT ADDS UP, which is the whole claim the caption makes. A line sitting
   * under a figure it appears to explain is worse than no line at all if the two
   * disagree — the reader checks it once, finds it wrong, and stops believing
   * every other figure on the screen.
   */
  it('adds every caption up to the figure printed beside it', () => {
    for (const f of resultFormula(result)) {
      expect(f.caption.reduce((a, term) => a + term.amount, 0)).toBe(f.net);
      /* And to the same total as the netted terms `/ledger` and E3 draw: two
         drawings of one decomposition, not two answers about one night. */
      expect(f.caption.reduce((a, term) => a + term.amount, 0)).toBe(
        f.terms.reduce((a, term) => a + term.amount, 0),
      );
    }
  });

  it('never nets a bill in the caption, which is the point of having one', () => {
    /* Petr's netted term is `food +$188`, which is arithmetic nobody at that
       table did. The caption keeps the $54 the rule took and the $242 he is
       owed as two separate things that happened to him. */
    expect(row(PETR).terms.find((t) => t.key === 'bill')!.amount).toBe(188);
    expect(row(PETR).caption.map((t) => t.amount)).toEqual([150, -54, -23, 242]);
    expect(row(PETR).caption.map((t) => t.kind)).toEqual([
      'game', 'charge', 'charge', 'compensation',
    ]);
  });

  it('draws no caption term for a rule that did not touch somebody', () => {
    /* Eva paid both and fronted neither, so her line is three terms and no
       fourth reading `+ 0 paid`. */
    expect(row(EVA).caption).toHaveLength(3);
    expect(row(EVA).caption.every((t) => t.amount !== 0)).toBe(true);
  });
});

describe('R1 · the two closing rows', () => {
  const totals = resultTotals(result);

  it('states both sides of the table, and that they are equal', () => {
    expect(totals.boughtIn).toBe(6500);
    expect(totals.cashedOut).toBe(6500);
    expect(totals.game).toBe(0);
  });

  /*
   * THE ONE FIGURE ON R1 THAT LOOKS LIKE AN ERROR AND IS NOT. Eight finals that
   * sum to −184 is the handoff's own worked example and its own sentence: *"That
   * is not an error — it is money leaving the table — and the screen states it
   * on the closing row."*
   */
  it('leaves the players $184 short, and names where it went', () => {
    expect(totals.players).toBe(-184);
    expect(totals.destinations).toEqual(['kitty']);
    expect(totals.destinations.map(destinationWord)).toEqual(['piggy bank']);
  });

  it('sums the same list the rows above it draw', () => {
    expect(totals.players).toBe(
      resultFormula(result).reduce((a, f) => a + f.net, 0),
    );
    expect(totals.game).toBe(gameResults(result).reduce((a, g) => a + g.game, 0));
  });

  it('calls a bill no destination — nothing leaves the players by one', () => {
    const billOnly = settle({ players, entries, finalCounts, rules: [rules[0]!] });
    expect(resultTotals(billOnly).players).toBe(0);
    expect(resultTotals(billOnly).destinations).toEqual([]);
  });
});

describe('R1 · the deduction slabs', () => {
  it('opens every deduction, with who fronted it and for how much', () => {
    const bill = ruleOutcomes(result).find((o) => o.ruleId === 'bill')!;
    expect(bill.name).toBe('Kitchen & drinks');
    expect(bill.total).toBe(432);
    expect(bill.float).toBe(false);
    /* ⚠ THE ORDER IS THE ENGINE'S, not the board's. The slab draws "Petr paid
       $242" over "Marek paid $190" and the settlement returns its credits the
       other way round; who fronted what is the fact, and the sequence of two
       itemised lines inside one slab is not something the handoff argues for.
       Asserted as a set so the day somebody DOES order them is a deliberate
       change to this line rather than a silent one. */
    expect(new Set(bill.paidTo.map((c) => `${c.name} ${c.amount}`))).toEqual(
      new Set(['Petr 242', 'Marek 190']),
    );
  });

  it('and the float, which is nobody getting anything back', () => {
    const piggy = ruleOutcomes(result).find((o) => o.ruleId === 'piggy')!;
    expect(piggy.total).toBe(184);
    expect(piggy.float).toBe(true);
    expect(piggy.paidTo.map((c) => c.name)).toEqual(['Piggy bank']);
  });

  it('totals the slabs to the figure the section label prints', () => {
    expect(ruleOutcomes(result).reduce((a, o) => a + o.total, 0)).toBe(result.totalOffTable);
    expect(result.totalOffTable).toBe(616);
  });
});

describe('R2 · Who pays whom', () => {
  const nothingPaid = paymentProgress(result, () => false);

  it('clears the eight finals in fewer payments than there are pairs', () => {
    expect(nothingPaid.lines.length).toBeGreaterThan(0);
    expect(nothingPaid.lines.length).toBeLessThan(15);
    /* Every payment lands somewhere the settlement says it should, and the
       whole of what is owed is on the list. */
    expect(nothingPaid.value.total).toBe(nothingPaid.value.owed);
    expect(nothingPaid.value.settled).toBe(0);
    expect(nothingPaid.fraction).toBe(0);
  });

  it('names the piggy bank as a recipient, and marks it off-table', () => {
    const toPiggy = nothingPaid.lines.filter((l) => l.toPlayerId === PIGGY);
    expect(toPiggy.length).toBeGreaterThan(0);
    expect(toPiggy.every((l) => l.toOffTable)).toBe(true);
    expect(toPiggy.every((l) => l.to === 'Piggy bank')).toBe(true);
    expect(toPiggy.reduce((a, l) => a + l.amount, 0)).toBe(184);
    /* And every other recipient is a person who had a night. */
    expect(
      nothingPaid.lines.filter((l) => l.toPlayerId !== PIGGY).every((l) => !l.toOffTable),
    ).toBe(true);
  });

  it('moves the bar by VALUE, not by count', () => {
    const [first] = nothingPaid.lines;
    const one = paymentProgress(result, (from, to) =>
      from === first!.fromPlayerId && to === first!.toPlayerId,
    );
    expect(one.count).toEqual({ settled: 1, total: nothingPaid.lines.length });
    expect(one.value.settled).toBe(first!.amount);
    expect(one.value.owed).toBe(nothingPaid.value.total - first!.amount);
    expect(one.fraction).toBeCloseTo(first!.amount / nothingPaid.value.total, 10);
    /* The two sections partition the list — a row is waiting or settled and
       never both, and never neither. */
    expect(one.waiting.length + one.settled.length).toBe(one.lines.length);
    expect(one.value.settled + one.value.owed).toBe(one.value.total);
  });

  it('fills the bar when everything has moved', () => {
    const all = paymentProgress(result, () => true);
    expect(all.fraction).toBe(1);
    expect(all.value.owed).toBe(0);
    expect(all.waiting).toEqual([]);
  });

  it('divides nothing by nothing on a night with nothing to move', () => {
    const level = settle({
      players: [{ id: DANA, name: 'Dana', atTable: true }],
      entries: [e({ type: 'buyin', playerId: DANA, amount: money(500) })],
      finalCounts: new Map([[DANA, money(500)]]),
      rules: [],
    });
    expect(paymentProgress(level, () => false)).toMatchObject({
      lines: [],
      count: { settled: 0, total: 0 },
      fraction: 0,
    });
  });
});
