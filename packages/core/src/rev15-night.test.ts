/**
 * The canonical night, re-derived on the split S62 actually chose.
 *
 * `04-money-math.md` and `canonical-night.test.ts` work the night with the bill
 * split EVENLY between the winners — 57 / 57 / 56 — and that is what every
 * E-series frame draws. S62 changed the default to **by size of win** and left
 * every figure derived from the old one stale; S75 asked for the re-derivation
 * and rev 15 § 5 carries it. The handoff README is explicit about which wins:
 * *"Take the figures in `14` and treat the E-series numbers as stale."*
 *
 * So this file is the same eleven entries and the same counts as
 * `canonical-night.test.ts`, with one field changed on one rule, asserting rev
 * 15 § 5's table to the dollar. The other file stays exactly as it is: the even
 * split is still a rule a group can choose, `04-money-math.md` still documents
 * it, and a regression suite that only covers the default is a suite that finds
 * out the hard way when somebody picks the other one.
 *
 * The seeded night in `apps/mobile/src/data/sampleNight.ts` is THIS night, so a
 * screen can be held against the frames it was drawn from.
 */

import { describe, expect, it } from 'vitest';
import { money, sum, ZERO, type Money } from './money';
import {
  destinationTerm,
  destinationWord,
  ruleLabel,
  splitSentence,
  transfersInWords,
} from './ruleText';
import { settle } from './settlement';
import { UNACCOUNTED_ID, type LedgerEntry, type MoneyRule, type Player, type PlayerId } from './types';
import {
  columnsFit,
  nightScore,
  playerDeductions,
  receiptRows,
  resultColumns,
  resultFormula,
  resultRows,
  ruleCollector,
  ruleOutcomes,
  workingRows,
} from './working';

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
  e({ type: 'expense', payerId: MAREK, amount: money(120) }), // pizza
  e({ type: 'rebuy', playerId: PETR, amount: money(500) }),
  e({ type: 'expense', payerId: LENA, amount: money(50) }), // drinks
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

/** One field apart from the canonical file: the bill's split. */
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
    charge: 'winners_only', destination: 'bill', split: 'by_percent',
    collectorPlayerId: MAREK, sortOrder: 2,
  },
];

const result = settle({ players, entries, finalCounts, rules });
const player = (id: PlayerId) => result.players.find((p) => p.playerId === id)!;

describe('rev 15 § 5 — the bill, split by size of win', () => {
  /*
   * The wins are 1,620 / 460 / 430, totalling 2,510. Exact shares of $170 are
   * 109.72 / 31.15 / 29.12, so the floors are 109 / 31 / 29 and one dollar is
   * left over. Largest remainder takes it, and that is Dana at .72 — which is
   * also the biggest win, so the two tie-break rules agree here and the frame
   * reads 110.
   */
  const bill = result.deductions.find((d) => d.ruleId === 'bill')!;
  const charge = (id: PlayerId) => bill.charges.find((c) => c.playerId === id)?.amount ?? 0;

  it('charges 110 / 31 / 29', () => {
    expect(charge(DANA)).toBe(110);
    expect(charge(MAREK)).toBe(31);
    expect(charge(LENA)).toBe(29);
  });

  it('still adds back up to the whole $170', () => {
    expect(bill.total).toBe(170);
    expect(charge(DANA) + charge(MAREK) + charge(LENA)).toBe(170);
  });

  it('leaves the losers untouched — the rule charges winners only', () => {
    expect(charge(TOMAS)).toBe(0);
    expect(charge(IVO)).toBe(0);
    expect(charge(PETR)).toBe(0);
  });

  it('is a bigger share for a bigger win, which is the whole point of S62', () => {
    // Under the old even split Dana and Marek paid the same 57 on wins of
    // 1,620 and 460. That is the thing S62 changed.
    expect(charge(DANA)).toBeGreaterThan(charge(MAREK));
    expect(charge(MAREK)).toBeGreaterThan(charge(LENA));
  });

  it('leaves the piggy bank alone — it is a percentage and S62 did not touch it', () => {
    const kitty = result.deductions.find((d) => d.ruleId === 'kitty')!;
    const k = (id: PlayerId) => kitty.charges.find((c) => c.playerId === id)?.amount ?? 0;
    expect(k(DANA)).toBe(81);
    expect(k(MAREK)).toBe(23);
    expect(k(LENA)).toBe(22);
    expect(kitty.total).toBe(126);
  });
});

describe('rev 15 § 5 — the nets', () => {
  /* The table in § 5, row for row. */
  it('produces the six stated nets', () => {
    expect(player(DANA).finalPosition).toBe(1429); // 1620 - 110 - 81
    expect(player(MAREK).finalPosition).toBe(526); // 460 - 31 - 23 + 120
    expect(player(LENA).finalPosition).toBe(429); // 430 - 29 - 22 + 50
    expect(player(TOMAS).finalPosition).toBe(-500);
    expect(player(IVO).finalPosition).toBe(-780);
    expect(player(PETR).finalPosition).toBe(-1230);
  });

  it('sums the players’ nets to −126 — the piggy bank is the only money that leaves', () => {
    const atTable = result.players.filter((p) => p.playerId !== KITTY);
    expect(sum(atTable.map((p) => p.finalPosition))).toBe(-126);
    expect(player(KITTY).finalPosition).toBe(126);
  });

  it('still balances once the piggy bank is counted', () => {
    expect(sum(result.players.map((p) => p.finalPosition))).toBe(0);
  });

  it('takes $296 off the table, exactly as the even split did', () => {
    // The split decides who pays, never how much is owed. This is the check
    // that a change to one cannot quietly become a change to the other.
    expect(result.totalOffTable).toBe(296);
  });

  it('pays each person back exactly what they fronted', () => {
    expect(player(MAREK).credited).toBe(120);
    expect(player(LENA).credited).toBe(50);
    expect(player(DANA).credited).toBe(0);
  });
});

describe('rev 15 § 5 — who pays whom', () => {
  /**
   * Re-derived, because the nets moved: Dana is owed 53 less than under the
   * even split and Lena 27 more, so the tail of the list changes.
   *
   * Largest remaining debtor against largest remaining creditor, which is the
   * same algorithm the canonical file documents.
   */
  const EXPECTED = [
    { fromPlayerId: PETR, toPlayerId: DANA, amount: 1230 },
    { fromPlayerId: IVO, toPlayerId: MAREK, amount: 526 },
    { fromPlayerId: IVO, toPlayerId: LENA, amount: 254 },
    { fromPlayerId: TOMAS, toPlayerId: DANA, amount: 199 },
    { fromPlayerId: TOMAS, toPlayerId: LENA, amount: 175 },
    { fromPlayerId: TOMAS, toPlayerId: KITTY, amount: 126 },
  ];

  const key = (t: { fromPlayerId: string; toPlayerId: string; amount: number }) =>
    `${t.fromPlayerId}->${t.toPlayerId}:${t.amount}`;

  it('settles in six payments', () => {
    expect(result.transfers).toHaveLength(6);
    expect(new Set(result.transfers.map(key))).toEqual(new Set(EXPECTED.map(key)));
  });

  it('has every debtor pay their debt in full and every creditor receive theirs', () => {
    for (const p of result.players) {
      const paid = sum(result.transfers.filter((t) => t.fromPlayerId === p.playerId).map((t) => t.amount));
      const received = sum(result.transfers.filter((t) => t.toPlayerId === p.playerId).map((t) => t.amount));
      expect(received - paid).toBe(p.finalPosition);
    }
  });

  it('needs at most one fewer transfer than there are non-zero balances', () => {
    expect(result.players.filter((p) => p.finalPosition !== 0)).toHaveLength(7);
    expect(result.transfers).toHaveLength(6);
  });
});

describe('the words a settled night carries on its face', () => {
  /*
   * X1c draws "Bill · by size of win" and "Piggy bank · 5%". A watcher opening a
   * night three weeks later cannot ask what the split was, so the row says it —
   * and it says it from the snapshot, never from the screen.
   */
  it('names the bill’s split the way the design names it', () => {
    expect(ruleLabel(rules[1])).toBe('Kitchen & drinks · by size of win');
  });

  it('states a percentage rule as its percentage', () => {
    expect(ruleLabel(rules[0])).toBe('Group piggy bank · 5%');
  });

  it('still has words for the split this night did not use', () => {
    expect(splitSentence('evenly')).toBe('evenly between the winners');
    expect(splitSentence('evenly', 'everyone_flat')).toBe('evenly across the table');
    expect(splitSentence('custom')).toBe('set by the host');
  });

  it('reads the terms off the rule, so a changed rule changes the words', () => {
    // The failure this guards: a screen that hard-codes "by size of win" keeps
    // saying it about nights settled under the old rule.
    expect(ruleLabel({ ...rules[1], split: 'evenly' })).toBe(
      'Kitchen & drinks · evenly between the winners',
    );
  });
});

describe('X1c — the working, as it is drawn', () => {
  /*
   * The frame shows Lena's own card: a net of +$429 over six rows that account
   * for it. These are those six rows, verbatim off the drawing, with the bill
   * applied before the piggy bank as `sampleNight` orders them.
   */
  const billFirst: MoneyRule[] = [
    { ...rules[1], sortOrder: 1 },
    { ...rules[0], sortOrder: 2 },
  ];
  const drawn = settle({ players, entries, finalCounts, rules: billFirst });
  const rows = workingRows(drawn, billFirst, LENA);

  it('is in, out, result, bill, back, kitty — in that order', () => {
    expect(rows.map((r) => r.label)).toEqual([
      'In',
      'Out',
      'Result',
      'Kitchen & drinks · by size of win',
      'Back to you · fronted the bill',
      'Group piggy bank · 5%',
    ]);
  });

  it('carries the figures the frame carries', () => {
    expect(rows.map((r) => r.amount)).toEqual([1000, 1430, 430, -29, 50, -22]);
  });

  it('accounts for the net exactly — result, less what was taken, plus what came back', () => {
    // The whole reason the working is on the screen: it has to add up to the
    // figure above it, or it is six numbers and an argument.
    const afterResult = rows.filter((r) => r.kind === 'charge' || r.kind === 'credit');
    const net = rows.find((r) => r.kind === 'result')!.amount + sum(afterResult.map((r) => r.amount));
    expect(net).toBe(429);
    expect(net).toBe(drawn.players.find((p) => p.playerId === LENA)!.finalPosition);
  });

  it('draws the two charges in bone and nothing else', () => {
    expect(rows.filter((r) => r.offTable).map((r) => r.key)).toEqual(['bill:charge', 'kitty:charge']);
  });

  it('keeps a reimbursement under its own charge', () => {
    const labels = rows.map((r) => r.label);
    expect(labels.indexOf('Back to you · fronted the bill')).toBe(
      labels.indexOf('Kitchen & drinks · by size of win') + 1,
    );
  });

  it('leaves out rules that did not touch this person', () => {
    // Tomáš lost, so neither rule charged him: three rows, no deductions.
    expect(workingRows(drawn, billFirst, TOMAS).map((r) => r.label)).toEqual(['In', 'Out', 'Result']);
  });

  it('says nothing at all about somebody who was not at this night', () => {
    expect(workingRows(drawn, billFirst, 'nobody')).toEqual([]);
  });
});

describe('E6 — what came off one person, gathered by kind', () => {
  /*
   * The second line of a player's row on the results screen. The figures are
   * the ones the rules took above, seen one person at a time: the screen prints
   * this and adds nothing to it, which is the only reason the row can be
   * trusted to reconcile with the net beside it.
   */
  it('gives Lena her piggy bank, her bill, and the food she fronted', () => {
    expect(playerDeductions(result, LENA)).toEqual([
      { destination: 'kitty', charged: 22, credited: 0, held: 0 },
      { destination: 'bill', charged: 29, credited: 50, held: 0 },
    ]);
  });

  it('is in the order the night applied the rules', () => {
    // The night above runs the piggy bank first. `sampleNight` runs the bill
    // first, and X1c draws it that way — the order is the night's, not this
    // function's.
    const billFirst = [
      { ...rules[1], sortOrder: 1 },
      { ...rules[0], sortOrder: 2 },
    ];
    const drawn = settle({ players, entries, finalCounts, rules: billFirst });
    expect(playerDeductions(drawn, LENA).map((d) => d.destination)).toEqual(['bill', 'kitty']);
  });

  it('charges the biggest winner the most and credits her nothing', () => {
    expect(playerDeductions(result, DANA)).toEqual([
      { destination: 'kitty', charged: 81, credited: 0, held: 0 },
      { destination: 'bill', charged: 110, credited: 0, held: 0 },
    ]);
  });

  it('says nothing at all about a loser, who was charged nothing', () => {
    expect(playerDeductions(result, TOMAS)).toEqual([]);
    expect(playerDeductions(result, 'nobody')).toEqual([]);
  });

  it('gives the collector the float as HELD, not as money credited to them', () => {
    // B27. The whole of that bug in one assertion: the $126 is in `held`, so a
    // screen totalling `credited` cannot pick it up and call it a win.
    expect(playerDeductions(result, KITTY)).toEqual([
      { destination: 'kitty', charged: 0, credited: 0, held: 126 },
    ]);
  });

  it('keeps a fronted bill as the fronter’s own money, not as a float', () => {
    // The other side of the same split: Marek is out of pocket $120 until the
    // table pays him, and that is his — it belongs in his score.
    expect(playerDeductions(result, MAREK)).toEqual([
      { destination: 'kitty', charged: 23, credited: 0, held: 0 },
      { destination: 'bill', charged: 31, credited: 120, held: 0 },
    ]);
  });

  it('adds up with the gross to the net the row prints beside it', () => {
    // out − in − charges + back = the score, and the float sits outside it. If
    // this ever stops holding, the second line on E6 is describing a different
    // night from the figure next to it.
    for (const p of result.players) {
      const took = playerDeductions(result, p.playerId);
      const charged = sum(took.map((d) => d.charged));
      const credited = sum(took.map((d) => d.credited));
      const { score, held } = nightScore(result, p.playerId);

      expect(p.endedWith - p.boughtIn - charged + credited).toBe(score);
      expect(score + held).toBe(p.finalPosition);
    }
  });

  it('gathers two rules of one kind into one line', () => {
    // Two bills is not two answers to "what did the food cost me".
    const twoBills = [
      { ...rules[1], id: 'bill-a', amount: money(100), sortOrder: 1 },
      { ...rules[1], id: 'bill-b', amount: money(70), sortOrder: 2 },
    ];
    const night = settle({ players, entries, finalCounts, rules: twoBills });
    const lena = playerDeductions(night, LENA);
    expect(lena).toHaveLength(1);
    expect(lena[0]!.destination).toBe('bill');
    expect(lena[0]!.charged).toBe(
      sum(night.deductions.map((d) => d.charges.find((c) => c.playerId === LENA)?.amount ?? ZERO)),
    );
  });

  it('names each kind as a term where one opens a line', () => {
    // The receipt draws "Bill · share" and "Piggy bank" — the same words as
    // every sentence in the app, capitalised in the one place they lead.
    expect(destinationTerm('kitty')).toBe('Piggy bank');
    expect(destinationTerm('bill')).toBe('Bill');
    expect(destinationTerm('host_fee')).toBe('Host');
    expect(destinationTerm('next_pot')).toBe('Next pot');
  });

  it('names each kind the way the rest of the app names it', () => {
    // Never the stored word: `kitty` is what the ledger holds and "piggy bank"
    // is what every screen says.
    expect(destinationWord('bill')).toBe('bill');
    expect(destinationWord('kitty')).toBe('piggy bank');
    expect(destinationWord('host_fee')).toBe('host');
    expect(destinationWord('next_pot')).toBe('next pot');
  });
});

describe('B27 — the float is not a win', () => {
  /*
   * The piggy bank's $126 was drawn on E6 as the collector's own result: a row
   * reading `The piggy bank  +$126`, sorted into the column of wins above
   * people who had played all night for less. Nothing was wrong with the
   * arithmetic — the transfers really do have to hand that money over — and
   * that is exactly why it survived so long. What was wrong was the column it
   * was printed in.
   *
   * `nightScore` splits the engine's one figure into the two questions a
   * screen can ask of it, and `ruleCollector` is where the float goes instead:
   * named once, under the deduction it came from.
   */
  it('leaves the collector with a score of nothing, holding the whole $126', () => {
    expect(nightScore(result, KITTY)).toEqual({ score: 0, held: 126 });
  });

  it('takes nothing off a player who collects nothing', () => {
    expect(nightScore(result, DANA)).toEqual({ score: 1429, held: 0 });
    expect(nightScore(result, TOMAS)).toEqual({ score: -500, held: 0 });
  });

  it('leaves a fronted bill inside the score, because it is their own money', () => {
    // Marek is owed $120 for the pizza. That is not a float — he spent it.
    expect(nightScore(result, MAREK)).toEqual({ score: 526, held: 0 });
  });

  it('splits a player who collects AND plays, without losing a dollar of either', () => {
    // The host holds the piggy bank and sits at the table: two things at once,
    // and the row has to say only the first.
    const hostHolds = [{ ...rules[0], collectorPlayerId: DANA }, rules[1]!];
    const night = settle({ players, entries, finalCounts, rules: hostHolds });

    const dana = night.players.find((p) => p.playerId === DANA)!;
    expect(dana.finalPosition).toBe(1555); // 1429 + the 126 she is holding
    expect(nightScore(night, DANA)).toEqual({ score: 1429, held: 126 });
  });

  it('always divides the engine’s figure rather than restating it', () => {
    for (const p of result.players) {
      const { score, held } = nightScore(result, p.playerId);
      expect(score + held).toBe(p.finalPosition);
      expect(held).toBeGreaterThanOrEqual(0);
    }
  });

  it('says nothing about somebody who was not at this night', () => {
    expect(nightScore(result, 'nobody')).toEqual({ score: 0, held: 0 });
  });

  it('names who is holding the piggy bank, and how much', () => {
    expect(ruleCollector(result, 'kitty')).toEqual({
      playerId: KITTY,
      name: 'The piggy bank',
      amount: 126,
    });
  });

  it('names nobody for a bill — it goes back to whoever fronted the food', () => {
    // Two people fronted, so there is no collector to name, and naming either
    // one of them would be naming the wrong person.
    expect(ruleCollector(result, 'bill')).toBeNull();
  });

  it('names nobody for a rule that did not run', () => {
    expect(ruleCollector(result, 'no-such-rule')).toBeNull();
  });

  it('hands the collector exactly what the deduction block prints', () => {
    // The line sits under the total, so the two may never disagree.
    const kitty = result.deductions.find((d) => d.ruleId === 'kitty')!;
    expect(ruleCollector(result, 'kitty')!.amount).toBe(kitty.total);
  });
});

describe('E6 — who gets a row on the results list', () => {
  /*
   * The list is what happened to whom. `settle()` answers a wider question,
   * and the two names it adds are the two this has to decide about.
   */
  it('draws the six who played, biggest win first', () => {
    expect(resultRows(result).map((r) => r.player.playerId)).toEqual([
      DANA,
      MAREK,
      LENA,
      TOMAS,
      IVO,
      PETR,
    ]);
  });

  it('prints the score, not the balance — B27', () => {
    expect(resultRows(result).map((r) => r.score)).toEqual([1429, 526, 429, -500, -780, -1230]);
  });

  it('leaves out the collector who never sat down — B27', () => {
    // Their whole appearance in the settlement was the room's $126, drawn as a
    // win above people who had played all night for less.
    expect(resultRows(result).map((r) => r.player.playerId)).not.toContain(KITTY);
  });

  it('keeps a collector who also played, on their own score alone — B27', () => {
    const hostHolds = [{ ...rules[0], collectorPlayerId: DANA }, rules[1]!];
    const night = settle({ players, entries, finalCounts, rules: hostHolds });
    const dana = resultRows(night).find((r) => r.player.playerId === DANA)!;

    expect(dana.score).toBe(1429);
    expect(dana.held).toBe(126);
  });

  it('keeps somebody who only fronted the food, because that money is theirs', () => {
    // Radka pays for the pizza, never sits down, and is out of pocket until
    // the table pays her back. That is a night, and it gets a row.
    const RADKA = 'radka';
    const withRadka = [...players, { id: RADKA, name: 'Radka', atTable: false }];
    const paid: LedgerEntry[] = [
      ...entries,
      { id: 'x1', seq: 99, type: 'expense', payerId: RADKA, amount: money(60) },
    ];
    const night = settle({ players: withRadka, entries: paid, finalCounts, rules });

    expect(resultRows(night).map((r) => r.player.playerId)).toContain(RADKA);
    expect(resultRows(night).find((r) => r.player.playerId === RADKA)!.score).toBe(60);
  });

  it('never drops the hole — B28', () => {
    /*
     * B28 in one assertion. `Unaccounted` bought in nothing, ended with
     * nothing, was charged nothing and was credited nothing, so every test of
     * "did this person play" says no — and the row that IS the missing money
     * was the row the screen quietly stopped drawing.
     */
    const short = new Map(finalCounts);
    short.set(PETR, money(70)); // $200 of chips nobody can account for
    const night = settle({
      players,
      entries,
      finalCounts: short,
      rules,
      acknowledgedDiscrepancy: {
        amount: money(-200),
        confirmedByUserId: DANA,
        confirmedAt: '2026-08-29T06:38:00.000Z',
      },
    });

    const hole = resultRows(night).find((r) => r.player.playerId === UNACCOUNTED_ID);
    expect(hole).toBeDefined();
    expect(hole!.score).toBe(200);
  });
});

describe('E6 — the receipt behind a row', () => {
  /*
   * `design/handoff-E6/docs/E6-row-formula.md`, cut 31 August. The row states
   * the result; this is the reason, and the doc draws it line for line.
   */
  it('draws Lena’s night in the order the money moved', () => {
    // The night runs the piggy bank first, so it precedes the bill here — the
    // order is the group's rules', not this function's.
    expect(receiptRows(result, LENA)).toEqual([
      { key: 'out', label: 'Cashed out', amount: 1430, signed: false },
      { key: 'in', label: 'Bought in', amount: -1000, signed: true },
      { key: 'kitty:charge', label: 'Piggy bank', amount: -22, signed: true },
      { key: 'bill:charge', label: 'Bill · share', amount: -29, signed: true },
      { key: 'bill:credit', label: 'Bill · paid it', amount: 50, signed: true },
    ]);
  });

  it('keeps the two bill terms apart, and nets nothing', () => {
    // The whole of the addendum's first rule: somebody who paid at the counter
    // needs to see the credit, not a merged figure.
    const marek = receiptRows(result, MAREK).filter((r) => r.key.startsWith('bill'));
    expect(marek.map((r) => [r.label, r.amount])).toEqual([
      ['Bill · share', -31],
      ['Bill · paid it', 120],
    ]);
  });

  it('drops the qualifier where there is only one term to name', () => {
    // Dana pays the bill and fronted nothing, so there is no share to tell
    // apart from anything.
    expect(receiptRows(result, DANA).map((r) => r.label)).toEqual([
      'Cashed out',
      'Bought in',
      'Piggy bank',
      'Bill',
    ]);
  });

  it('renders no term of $0 — a loser who cashed out nothing', () => {
    expect(receiptRows(result, TOMAS)).toEqual([
      { key: 'in', label: 'Bought in', amount: -500, signed: true },
    ]);
  });

  it('signs everything but the cash out', () => {
    const rows = receiptRows(result, LENA);
    expect(rows.filter((r) => !r.signed).map((r) => r.label)).toEqual(['Cashed out']);
  });

  it('adds up to the Net the row prints above it — every player, every time', () => {
    /*
     * The one assertion that makes the block worth drawing. A receipt whose
     * last line is not the sum of the lines above it is six numbers and an
     * argument, and the screen prints the engine's `Net` rather than a total
     * of its own — so this is what holds the two together.
     */
    for (const p of result.players) {
      const rows = receiptRows(result, p.playerId);
      expect(sum(rows.map((r) => r.amount))).toBe(nightScore(result, p.playerId).score);
    }
  });

  it('leaves the float out of the receipt and out of its Net — B27', () => {
    // The collector's row is gone from the list entirely, and asking for their
    // receipt gives the terms of a night they did not play: none.
    expect(receiptRows(result, KITTY)).toEqual([]);
  });

  it('says nothing at all about somebody who was not at this night', () => {
    expect(receiptRows(result, 'nobody')).toEqual([]);
  });
});

describe('E6 — the columns layout', () => {
  /*
   * `design/handoff-E6/docs/E6-results-columns.md`, frames 6a/6b. The whole
   * formula on the row instead of behind a tap, which is only safe if the four
   * figures really are a decomposition of one — so that is what is asserted,
   * for every player, rather than four numbers checked one at a time.
   */
  it('draws the night the board draws', () => {
    const cols = resultColumns(result).map((c) => [c.player.name, c.game, c.food, c.piggy, c.net]);
    expect(cols).toEqual([
      // Dana wins 1,620, owes 110 of the bill and 81 of the piggy bank.
      ['Dana', 1620, -110, -81, 1429],
      // Marek fronted the pizza: 120 back against a share of 31 is +89.
      ['Marek', 460, 89, -23, 526],
      // Lena fronted the drinks: 50 back against 29 is +21.
      ['Lena', 430, 21, -22, 429],
      ['Tomáš', -500, 0, 0, -500],
      ['Ivo', -780, 0, 0, -780],
      ['Petr', -1230, 0, 0, -1230],
    ]);
  });

  it('nets the two halves of the bill into one figure, which is the trade', () => {
    // The receipt rows keep them apart on purpose; this layout cannot, and the
    // doc says so. What it may never do is lose one of them.
    const marek = resultColumns(result).find((c) => c.player.playerId === MAREK)!;
    const receipt = receiptRows(result, MAREK).filter((r) => r.key.startsWith('bill'));
    expect(marek.food).toBe(sum(receipt.map((r) => r.amount)));
  });

  it('never merges the piggy bank into the food', () => {
    const dana = resultColumns(result).find((c) => c.player.playerId === DANA)!;
    expect(dana.piggy).toBe(-81);
    expect(dana.food).toBe(-110);
  });

  it('adds the three columns up to the fourth, for everybody', () => {
    /*
     * THE ASSERTION THE LAYOUT STANDS ON. Four figures on a row invite exactly
     * one piece of arithmetic, and a reader who does it has to arrive at the
     * figure printed beside them.
     */
    for (const c of resultColumns(result)) {
      expect(c.game + c.food + c.piggy).toBe(c.net);
      expect(c.net).toBe(nightScore(result, c.player.playerId).score);
    }
  });

  it('is the same list, in the same order, as the rows it replaces', () => {
    expect(resultColumns(result).map((c) => c.player.playerId)).toEqual(
      resultRows(result).map((r) => r.player.playerId),
    );
  });

  it('fits this night, and not one with a third kind of deduction', () => {
    expect(columnsFit(result)).toBe(true);

    // A host's fee has no column and no honest place to hide: folding it into
    // `piggy` would put one group's money under another group's name.
    const withFee = [
      ...rules,
      {
        ...rules[0]!, id: 'fee', name: 'Host fee', destination: 'host_fee' as const,
        amountKind: 'fixed' as const, amount: money(20), split: 'evenly' as const,
        collectorPlayerId: DANA, sortOrder: 3,
      },
    ];
    const night = settle({ players, entries, finalCounts, rules: withFee });
    expect(columnsFit(night)).toBe(false);
  });
});

describe('E6 — the formula line under a name', () => {
  /*
   * The results row as the board draws it: the name and the net, and under them
   * the whole night in one sentence. Same figures as the columns above — this is
   * that decomposition said as words, so a night with a third kind of deduction
   * has somewhere to put it.
   */
  const line = (id: PlayerId) =>
    resultFormula(result)
      .find((f) => f.player.playerId === id)!
      .terms.map((t) => [t.label, t.amount]);

  it('says the whole night in the terms the board names', () => {
    // The piggy bank rule is `sortOrder: 1` on this night and the bill is 2, so
    // piggy precedes food — the order is the night's own, not this file's.
    expect(line(DANA)).toEqual([
      ['game', 1620],
      ['piggy', -81],
      ['food', -110],
    ]);
  });

  it('nets a bill somebody fronted into one signed term', () => {
    // Marek is charged 31 and credited 120: one term, +89, exactly as the
    // column does it.
    expect(line(MAREK)).toEqual([
      ['game', 460],
      ['piggy', -23],
      ['food', 89],
    ]);
  });

  it('leaves a loser who was charged nothing with the game alone', () => {
    /*
     * One term is the net stated twice, and the screen draws no line at all
     * under a row like this one. What it may not do is print `food $0`.
     */
    expect(line(TOMAS)).toEqual([['game', -500]]);
  });

  it('adds every term up to the figure the row prints, for everybody', () => {
    /*
     * THE ASSERTION THE LINE STANDS ON. It sits under a figure it appears to
     * explain, so a reader who adds it up has to arrive at that figure.
     */
    for (const f of resultFormula(result)) {
      expect(sum(f.terms.map((t) => t.amount))).toBe(f.net);
      expect(f.net).toBe(nightScore(result, f.player.playerId).score);
    }
  });

  it('is the same list, in the same order, as the rows and the columns', () => {
    expect(resultFormula(result).map((f) => f.player.playerId)).toEqual(
      resultRows(result).map((r) => r.player.playerId),
    );
    expect(resultFormula(result).map((f) => f.net)).toEqual(
      resultColumns(result).map((c) => c.net),
    );
  });

  it('keeps the float out of the line and out of its total', () => {
    // B27, once more and on a third layout: the collector is not a row here,
    // and nobody's line carries somebody else's money.
    expect(resultFormula(result).map((f) => f.player.playerId)).not.toContain(KITTY);
    for (const f of resultFormula(result)) expect(f.held).toBe(0);
  });

  it('holds a night the columns cannot draw', () => {
    /*
     * The reason this exists beside `resultColumns` rather than instead of it:
     * a fourth kind of deduction has no column and no fifth cell to go in, and
     * on a line it is simply a fourth term.
     */
    const withFee: MoneyRule[] = [
      ...rules,
      {
        ...rules[0]!, id: 'fee', name: 'Host fee', destination: 'host_fee' as const,
        amountKind: 'fixed' as const, amount: money(20), split: 'evenly' as const,
        collectorPlayerId: DANA, sortOrder: 3,
      },
    ];
    const night = settle({ players, entries, finalCounts, rules: withFee });
    expect(columnsFit(night)).toBe(false);

    const dana = resultFormula(night).find((f) => f.player.playerId === DANA)!;
    expect(dana.terms.map((t) => t.label)).toEqual(['game', 'piggy', 'food', 'host']);
    expect(sum(dana.terms.map((t) => t.amount))).toBe(dana.net);
  });
});

describe('E6 — where each rule’s money ended up', () => {
  /*
   * The block at the foot of the settled night: one line per rule, its total,
   * and who has it. `13-after-the-night.md` carries these rows over from E6 by
   * name — `Kitchen & drinks → Marek, Lena` and the piggy bank's holder.
   */
  it('names the people a bill was paid back to, in the settlement’s order', () => {
    const bill = ruleOutcomes(result).find((o) => o.ruleId === 'bill')!;
    expect(bill.name).toBe('Kitchen & drinks');
    expect(bill.total).toBe(170);
    expect(bill.float).toBe(false);
    /* Lena before Marek: the order is the settlement's, which is the order the
       two spends were recorded in — not this file's idea of who matters. */
    expect(bill.paidTo.map((c) => [c.name, c.amount])).toEqual([
      ['Lena', 50],
      ['Marek', 120],
    ]);
  });

  it('names the one person holding a float, and says that is what it is', () => {
    const piggy = ruleOutcomes(result).find((o) => o.ruleId === 'kitty')!;
    expect(piggy.total).toBe(126);
    expect(piggy.float).toBe(true);
    expect(piggy.paidTo.map((c) => c.name)).toEqual(['The piggy bank']);
  });

  it('adds up to what the summary calls DEDUCTIONS', () => {
    // The screen prints both figures and computes neither.
    expect(sum(ruleOutcomes(result).map((o) => o.total))).toBe(result.totalOffTable);
  });

  it('drops a rule that took nothing', () => {
    const idle: MoneyRule[] = [
      ...rules,
      {
        ...rules[0]!, id: 'idle', name: 'Next pot', destination: 'next_pot' as const,
        amountKind: 'fixed' as const, amount: ZERO, split: 'evenly' as const,
        collectorPlayerId: DANA, sortOrder: 4,
      },
    ];
    const night = settle({ players, entries, finalCounts, rules: idle });
    expect(ruleOutcomes(night).map((o) => o.ruleId)).toEqual(['kitty', 'bill']);
  });
});

describe('E4 — the rounding sheet states what a step would cost', () => {
  /*
   * `design/handoff-E2/boards/Result Formula Options.dc.html`, frame `4b`: each
   * step also states how many transfers it leaves. The sheet asks the engine
   * once per step — four whole settles — because the remainder and the number of
   * payments are both downstream of every rounded stack, every rule and the
   * matching that pairs debtors with creditors. This is that question asked of
   * this night, so the sheet cannot be the only thing that knows the answer.
   */
  const at = (roundingMode: 'dollars' | 'tens' | 'fifties' | 'hundreds') =>
    settle({ players, entries, finalCounts, rules, roundingMode });

  it('leaves fewer transfers at a coarser step, and says so', () => {
    const off = at('dollars');
    const tens = at('tens');
    expect(off.rounding.on).toBe(false);
    expect(tens.rounding.on).toBe(true);
    expect(tens.transfers.length).toBeLessThanOrEqual(off.transfers.length);
  });

  it('names the remainder the piggy bank carries at every step', () => {
    for (const mode of ['tens', 'fifties', 'hundreds'] as const) {
      const night = at(mode);
      /* `remainder` is the movement across the stacks and the tin funds it, so
         what the sheet prints is its negative — the same flip
         `roundingRowValue` makes for the row the sheet opens from. */
      const carried = sum(night.players.map((p) => p.roundingAbsorbed));
      expect(carried).toBe(sum(night.players.map((p) => p.roundedBy)));
      expect(night.rounding.remainder).toBe(carried);
    }
  });

  it('has a piggy bank total to state where the step is off', () => {
    // `Off` states the tin's whole total instead of a remainder, because there
    // is no remainder and "$0 to the piggy bank" would read as no piggy bank.
    const piggy = at('dollars').deductions.find((d) => d.destination === 'kitty');
    expect(piggy?.total).toBe(126);
  });

  it('counts the transfers in words, the way E4 states them above the list', () => {
    expect(transfersInWords(at('dollars').transfers.length)).toBe('six transfers');
    expect(transfersInWords(1)).toBe('one transfer');
    expect(transfersInWords(0)).toBe('no transfers');
    // Past ten the word is harder to read than the figure.
    expect(transfersInWords(11)).toBe('11 transfers');
  });
});
