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
import { money, sum, type Money } from './money';
import { ruleLabel, splitSentence } from './ruleText';
import { settle } from './settlement';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';
import { workingRows } from './working';

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
