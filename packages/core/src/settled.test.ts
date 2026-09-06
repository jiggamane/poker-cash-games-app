/**
 * The 6 September cut's own worked night, to the lari.
 *
 * `design/handoff-game-end/README.md` works four players through both modes and
 * prints the table it expects — `Σ atTheTable = 0`, `Σ final = −100`, piggy bank
 * `+100`, and three transfers that clear it. This file is that table, asserted,
 * the way `canonical-night.test.ts` asserts rev 18's.
 *
 * It is worth having as its own night rather than a mode toggled over an
 * existing one because of the ONE case none of the other nights cover: a person
 * who both owes a share of the bill and paid for it at the counter. Goga's row
 * is the cut's rule 2 — the share and the repayment as two terms, never netted —
 * and it is the row that would silently come out right for the wrong reason if
 * the two were added together first.
 */

import { describe, expect, it } from 'vitest';
import { money, type Money } from './money';
import { settle } from './settlement';
import { offTheTable, settledRows } from './settled';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';

const GOGA = 'goga';
const OTO = 'oto';
const ANDRO = 'andro';
const LEVANI = 'levani';
/* Held by the group, and not at the table — the cut's "held by the group". */
const PIGGY = 'the-piggy-bank';

const players: Player[] = [
  { id: GOGA, name: 'Goga', atTable: true },
  { id: OTO, name: 'Oto', atTable: true },
  { id: ANDRO, name: 'Andro', atTable: true },
  { id: LEVANI, name: 'Levani', atTable: true },
  { id: PIGGY, name: 'Piggy bank', atTable: false },
];

const buyIn = (playerId: PlayerId, seq: number): LedgerEntry => ({
  id: `in-${playerId}`,
  seq,
  type: 'buyin',
  playerId,
  amount: money(1500),
});

const entries: LedgerEntry[] = [
  buyIn(GOGA, 1),
  buyIn(OTO, 2),
  buyIn(ANDRO, 3),
  buyIn(LEVANI, 4),
  /* The kitchen, ₾100, and Goga is the one who put his card down. */
  { id: 'kitchen', seq: 5, type: 'expense', payerId: GOGA, amount: money(100) },
];

const rules: MoneyRule[] = [
  {
    id: 'bill',
    name: 'Kitchen',
    active: true,
    amountKind: 'fixed',
    /* A bill IS its expenses — the ₾100 above overrides this placeholder. */
    amount: money(0),
    basis: 'gross',
    charge: 'winners_only',
    destination: 'bill',
    split: 'evenly',
    collectorPlayerId: GOGA,
    sortOrder: 1,
  },
  {
    id: 'piggy',
    name: 'Piggy bank',
    active: true,
    amountKind: 'fixed',
    amount: money(100),
    basis: 'gross',
    charge: 'winners_only',
    destination: 'kitty',
    split: 'evenly',
    collectorPlayerId: PIGGY,
    sortOrder: 2,
  },
];

const finalCounts = new Map<PlayerId, Money>([
  [GOGA, money(2000)],
  [OTO, money(2000)],
  [ANDRO, money(1500)],
  [LEVANI, money(500)],
]);

const result = settle({ players, entries, finalCounts, rules, roundingMode: 'dollars' });

const nameOf = (id: PlayerId): string => players.find((p) => p.id === id)?.name ?? id;

describe("the cut's worked night", () => {
  it('counts ₾6,000 in play and balances', () => {
    expect(result.reconciliation.difference).toBe(0);
  });

  it('splits ₾200 of deductions equally between the two winners', () => {
    const bill = result.deductions.find((d) => d.destination === 'bill');
    const piggy = result.deductions.find((d) => d.destination === 'kitty');
    expect(bill?.total).toBe(100);
    expect(piggy?.total).toBe(100);
    /* A player at zero or below is charged nothing — Andro and Levani. */
    expect(bill?.charges.map((c) => [nameOf(c.playerId), c.amount])).toEqual([
      ['Goga', 50],
      ['Oto', 50],
    ]);
    expect(piggy?.charges.map((c) => [nameOf(c.playerId), c.amount])).toEqual([
      ['Goga', 50],
      ['Oto', 50],
    ]);
  });

  it('ranks At the table by what the table did, and prints in and out only', () => {
    const rows = settledRows(result, 'table').filter((r) => r.player.playerId !== PIGGY);

    expect(rows.map((r) => [r.player.name, r.net])).toEqual([
      ['Goga', 500],
      ['Oto', 500],
      ['Andro', 0],
      ['Levani', -1000],
    ]);
    expect(rows.map((r) => r.terms.map((t) => t.kind))).toEqual([
      ['in', 'out'],
      ['in', 'out'],
      ['in', 'out'],
      ['in', 'out'],
    ]);
    /* Σ atTheTable = 0 — the cut's first check. */
    expect(rows.reduce((t, r) => t + r.atTheTable, 0)).toBe(0);
  });

  it("prints the cut's Final table, row for row", () => {
    const rows = settledRows(result, 'final').filter((r) => r.player.playerId !== PIGGY);

    expect(
      rows.map((r) => [r.player.name, ...r.terms.map((t) => `${t.kind} ${t.amount}`), r.net]),
    ).toEqual([
      ['Goga', 'in 1500', 'out 2000', 'bill 50', 'back 100', 'piggy 50', 500],
      ['Oto', 'in 1500', 'out 2000', 'bill 50', 'piggy 50', 400],
      ['Andro', 'in 1500', 'out 1500', 0],
      ['Levani', 'in 1500', 'out 500', -1000],
    ]);
  });

  it('never nets the bill Goga fronted into the share he owes', () => {
    const goga = settledRows(result, 'final').find((r) => r.player.playerId === GOGA);
    const bill = goga?.terms.find((t) => t.kind === 'bill');
    const back = goga?.terms.find((t) => t.kind === 'back');
    /* `food +50` would be the same net and a different statement. */
    expect(bill?.amount).toBe(50);
    expect(back?.amount).toBe(100);
  });

  it('sums the finals to minus the piggy bank', () => {
    const rows = settledRows(result, 'final');
    expect(rows.reduce((t, r) => t + r.final, 0)).toBe(-100);
    expect(offTheTable(result)).toBe(100);
    /* Rule 3, as the cut writes it. */
    expect(rows.reduce((t, r) => t + r.final, 0) + offTheTable(result)).toBe(0);
  });

  it('clears the night in three transfers', () => {
    expect(
      result.transfers.map((t) => `${nameOf(t.fromPlayerId)} → ${nameOf(t.toPlayerId)} ₾${t.amount}`),
    ).toEqual([
      'Levani → Goga ₾500',
      'Levani → Oto ₾400',
      'Levani → Piggy bank ₾100',
    ]);
  });

  it('re-sorts when the mode changes', () => {
    /*
     * NOT ON THE CUT'S OWN NIGHT, where the two winners are level at the table
     * and the one who fronted the food is the one already listed first — the
     * order comes out the same in both modes there, which proves nothing.
     *
     * Hand the kitchen to Oto instead and the two swap: level at the table,
     * and ₾100 apart once the counter is repaid.
     */
    const otoPaid = settle({
      players,
      entries: entries.map((e) => (e.id === 'kitchen' ? { ...e, payerId: OTO } : e)),
      finalCounts,
      rules,
      roundingMode: 'dollars',
    });

    const at = settledRows(otoPaid, 'table').map((r) => r.player.name);
    const after = settledRows(otoPaid, 'final').map((r) => r.player.name);

    expect(at.slice(0, 2)).toEqual(['Goga', 'Oto']);
    expect(after.slice(0, 2)).toEqual(['Oto', 'Goga']);
  });

  it('carries the step as a term of its own, and only where there is one', () => {
    /*
     * `final` is the engine's figure and the step is inside it, so a row
     * printing four terms beside a rounded net would be a row that does not add
     * up. It was `/ledger`'s fifth column, and `/ledger` is dropped.
     */
    const odd = new Map<PlayerId, Money>([
      [GOGA, money(2013)],
      [OTO, money(1987)],
      [ANDRO, money(1500)],
      [LEVANI, money(500)],
    ]);
    const rounded = settle({ players, entries, finalCounts: odd, rules, roundingMode: 'tens' });
    const kinds = settledRows(rounded, 'final')
      .filter((r) => r.player.roundedBy !== 0)
      .map((r) => r.terms.map((t) => t.kind));

    expect(kinds.length).toBeGreaterThan(0);
    for (const row of kinds) expect(row).toContain('rounded');

    /* And nothing at all on a night that settled to the lari. */
    for (const row of settledRows(result, 'final')) {
      expect(row.terms.map((t) => t.kind)).not.toContain('rounded');
    }
  });
});
