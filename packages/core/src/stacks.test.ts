/**
 * Rounding, as it applies to the stacks — `design/handoff-E2/docs/E2-rounding.md`.
 *
 * A NIGHT BUILT FOR THIS AND NOTHING ELSE. The canonical night's counts are all
 * multiples of ten already, so it cannot see a rounding step at all: every
 * assertion below would pass against an engine that ignored the setting
 * completely. Three players, one piggy bank, and three counts chosen so that
 * one rounds up on the half, one does not move, and one rounds up by four —
 * which is also the only way to write down what the remainder is for.
 *
 * THE INVARIANT THAT MATTERS is not any single figure: it is that the positions
 * still sum to zero, and that `verifyNight` — which re-derives every identity
 * from the raw ledger and the step, never from the engine — has nothing to say.
 */

import { describe, expect, it } from 'vitest';
import { money, sum, type Money } from './money';
import { settle } from './settlement';
import { roundedCounts, roundToStep, stackRounding } from './stacks';
import { verifyNight } from './verify';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';
import { nightScore, receiptRows, resultRows, workingRows } from './working';

const ANNA = 'anna';
const BORIS = 'boris';
const CILKA = 'cilka';
const PIG = 'the-piggy-bank';

const players: Player[] = [
  { id: ANNA, name: 'Anna', atTable: true },
  { id: BORIS, name: 'Boris', atTable: true },
  { id: CILKA, name: 'Cilka', atTable: true },
  { id: PIG, name: 'The piggy bank', atTable: false },
];

let seq = 0;
const e = (x: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++seq}`, seq, ...x });

const entries: LedgerEntry[] = [
  e({ type: 'buyin', playerId: ANNA, amount: money(500) }),
  e({ type: 'buyin', playerId: BORIS, amount: money(500) }),
  e({ type: 'buyin', playerId: CILKA, amount: money(500) }),
];

/* $1,500 on the table and $1,500 counted, so the night balances exactly and
   anything that fails below is the step's doing and nothing else. */
const finalCounts = new Map<PlayerId, Money>([
  [ANNA, money(965)], // the half, which must go up
  [BORIS, money(270)], // already round: does not move
  [CILKA, money(265)], // the other half, up by 5
]);

const piggyRule: MoneyRule = {
  id: 'kitty', name: 'Group piggy bank', active: true,
  amountKind: 'percent', amount: money(5), basis: 'gross',
  charge: 'winners_only', destination: 'kitty', split: 'evenly',
  collectorPlayerId: PIG, sortOrder: 1,
};

const at = (mode: 'dollars' | 'tens' | 'fifties' | 'hundreds', rules: MoneyRule[] = [piggyRule]) =>
  settle({ players, entries, finalCounts, rules, roundingMode: mode });

const player = (r: ReturnType<typeof settle>, id: PlayerId) =>
  r.players.find((p) => p.playerId === id)!;

describe('roundToStep — half away from zero', () => {
  it('takes the half up, which is the addendum’s own example', () => {
    expect(roundToStep(money(965), 10)).toBe(970);
    expect(roundToStep(money(964), 10)).toBe(960);
    expect(roundToStep(money(975), 50)).toBe(1000);
    expect(roundToStep(money(1049), 100)).toBe(1000);
  });

  it('is the identity at a step of one, which is what makes “off” a step', () => {
    for (const n of [0, 1, 7, 963, 1_000_000]) expect(roundToStep(money(n), 1)).toBe(n);
  });

  it('goes away from zero on both sides of it', () => {
    // Counts are never negative, but the helper is money arithmetic and a rule
    // that grows one is a change nobody should have to remember to check.
    expect(roundToStep(money(-965), 10)).toBe(-970);
    expect(roundToStep(money(-964), 10)).toBe(-960);
  });

  it('refuses a step that is not a whole number of units', () => {
    expect(() => roundToStep(money(100), 0)).toThrow();
    expect(() => roundToStep(money(100), 2.5)).toThrow();
  });
});

describe('stackRounding — what a step would cost, before anything is settled', () => {
  const ten = stackRounding(finalCounts, 10);

  it('keeps the raw count beside the rounded one, for every stack', () => {
    expect(ten.counted.get(ANNA)).toEqual({ raw: 965, rounded: 970, by: 5 });
    expect(ten.counted.get(BORIS)).toEqual({ raw: 270, rounded: 270, by: 0 });
    expect(ten.counted.get(CILKA)).toEqual({ raw: 265, rounded: 270, by: 5 });
  });

  it('adds the movement up into one remainder', () => {
    expect(ten.remainder).toBe(10);
    expect(ten.remainder).toBe(sum([...ten.counted.values()].map((c) => c.by)));
  });

  it('reports the worst single stack, not the average', () => {
    // The figure an admin is asked about at the table. The average here is
    // 3.33, which answers a question nobody asks.
    expect(ten.worst).toBe(5);
    expect(stackRounding(finalCounts, 100).worst).toBe(35); // Cilka, 265 → 300
  });

  it('does nothing at all at a step of one', () => {
    const off = stackRounding(finalCounts, 1);
    expect(off.on).toBe(false);
    expect(off.remainder).toBe(0);
    expect(off.worst).toBe(0);
    expect([...roundedCounts(off)]).toEqual([...finalCounts]);
  });

  it('says how many stacks it looked at, so a sheet can say “none yet”', () => {
    expect(ten.stacks).toBe(3);
    expect(stackRounding(new Map(), 10).stacks).toBe(0);
  });
});

describe('settle() at a step — the stacks snap, the piggy bank pays for it', () => {
  const r = at('tens');

  it('settles from the rounded stack, not the counted one', () => {
    // Anna counted 965 and settles from 970: gross 470, not 465.
    expect(player(r, ANNA).grossResult).toBe(470);
    expect(player(r, CILKA).grossResult).toBe(-230);
    expect(player(r, BORIS).grossResult).toBe(-230);
  });

  it('keeps what was counted, exactly as it was counted', () => {
    // Rule 6: a stack is never silently rewritten.
    expect(player(r, ANNA).endedWith).toBe(965);
    expect(player(r, CILKA).endedWith).toBe(265);
  });

  it('names each stack’s own movement', () => {
    expect(player(r, ANNA).roundedBy).toBe(5);
    expect(player(r, BORIS).roundedBy).toBe(0);
    expect(player(r, CILKA).roundedBy).toBe(5);
  });

  it('puts the whole remainder on the piggy bank and nobody else', () => {
    expect(player(r, PIG).roundingAbsorbed).toBe(10);
    for (const id of [ANNA, BORIS, CILKA]) expect(player(r, id).roundingAbsorbed).toBe(0);
    expect(r.roundingCollector).toBe(PIG);
  });

  it('still sums to zero, which is the only thing that may never give', () => {
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
  });

  it('holds against a verifier that re-derives the step from the input', () => {
    const verdict = verifyNight(
      { players, entries, finalCounts, rules: [piggyRule], roundingMode: 'tens' },
      r,
    );
    expect(verdict.findings).toEqual([]);
    expect(verdict.ok).toBe(true);
  });

  it('leaves the reconciliation on the real chips', () => {
    // The table held $1,500 and $1,500 was counted. Rounding is a decision
    // about how to divide it, not a claim about what was there.
    expect(r.reconciliation.counted).toBe(1500);
    expect(r.reconciliation.difference).toBe(0);
    expect(r.reconciliation.reconciled).toBe(true);
  });
});

describe('the remainder is not the collector’s night — B27, at a step', () => {
  const r = at('tens');

  it('leaves their score at nothing and their hands full', () => {
    // They hold the piggy bank's $20 less the $10 the rounding cost it.
    expect(nightScore(r, PIG)).toEqual({ score: 0, held: 10 });
    expect(player(r, PIG).finalPosition).toBe(10);
  });

  it('keeps a player’s own rounding inside their score, where it belongs', () => {
    // Cilka's stack really did settle at $270. That is hers.
    expect(nightScore(r, CILKA)).toEqual({ score: -230, held: 0 });
  });

  it('divides the engine’s figure and never restates it', () => {
    for (const p of r.players) {
      const { score, held } = nightScore(r, p.playerId);
      expect(score + held).toBe(p.finalPosition);
    }
  });
});

describe('the receipt names the step', () => {
  const r = at('tens');

  it('adds one term, between the piggy bank and the Net', () => {
    expect(receiptRows(r, ANNA).map((row) => [row.label, row.amount])).toEqual([
      ['Cashed out', 965],
      ['Bought in', -500],
      ['Piggy bank', -20],
      ['Rounded to $10', 5],
    ]);
  });

  it('leaves it off a stack that did not move', () => {
    expect(receiptRows(r, BORIS).map((row) => row.label)).toEqual(['Cashed out', 'Bought in']);
  });

  it('still adds up to the Net printed above it', () => {
    for (const p of r.players) {
      expect(sum(receiptRows(r, p.playerId).map((row) => row.amount))).toBe(
        nightScore(r, p.playerId).score,
      );
    }
  });
});

describe('the rules that keep it safe', () => {
  it('never rounds twice — a bigger step recomputes from the raw count', () => {
    // 265 at $10 is $270; at $100 it is $300, not the $270 rounded again.
    expect(player(at('hundreds'), CILKA).roundedBy).toBe(35);
    expect(player(at('hundreds'), ANNA).roundedBy).toBe(35); // 965 → 1000
  });

  it('gives the same answer however many times it runs', () => {
    expect(at('tens')).toEqual(at('tens'));
  });

  it('does not snap the stacks at all with no piggy bank to carry the cost', () => {
    /*
     * The remainder has exactly one destination, and a group without a piggy
     * bank has not got it. Settling anyway would hand the table $10 nobody put
     * in — so the stacks stay as counted, and the step goes on doing what it
     * always did to the rules.
     */
    const billOnly: MoneyRule = { ...piggyRule, id: 'bill', destination: 'bill', collectorPlayerId: ANNA };
    const r = at('tens', [billOnly]);

    expect(r.rounding.on).toBe(false);
    expect(r.rounding.remainder).toBe(0);
    expect(r.roundingCollector).toBeUndefined();
    expect(player(r, ANNA).roundedBy).toBe(0);
    expect(player(r, ANNA).endedWith).toBe(965);
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
  });

  it('does nothing when the step is off, which is every night before this one', () => {
    const r = at('dollars');
    expect(r.rounding.on).toBe(false);
    expect(r.players.every((p) => p.roundedBy === 0 && p.roundingAbsorbed === 0)).toBe(true);
    expect(player(r, ANNA).grossResult).toBe(465);
  });

  it('holds together at every step the sheet offers', () => {
    for (const mode of ['dollars', 'tens', 'fifties', 'hundreds'] as const) {
      const r = at(mode);
      expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
      const verdict = verifyNight(
        { players, entries, finalCounts, rules: [piggyRule], roundingMode: mode },
        r,
      );
      expect(verdict.findings).toEqual([]);
    }
  });
});

describe('the working carries the step too — the player card', () => {
  const r = at('tens');

  it('keeps Result as the subtraction of the two rows above it', () => {
    // Out less in, on the raw count. Three rows reading 500 / 965 / +470 would
    // be the one place in the app where the arithmetic on screen is wrong.
    const rows = workingRows(r, [piggyRule], ANNA);
    expect(rows.filter((row) => ['in', 'out', 'result'].includes(row.kind)).map((row) => row.amount))
      .toEqual([500, 965, 465]);
  });

  it('gives the step its own row, above whatever total the screen draws', () => {
    const rows = workingRows(r, [piggyRule], ANNA);
    const last = rows[rows.length - 1]!;
    expect(last.kind).toBe('rounding');
    expect(last.label).toBe('Rounded to $10');
    expect(last.amount).toBe(5);
  });

  it('still accounts for the score exactly, line by line', () => {
    for (const id of [ANNA, BORIS, CILKA]) {
      const rows = workingRows(r, [piggyRule], id);
      const result = rows.find((row) => row.kind === 'result')!.amount;
      const after = rows.filter((row) => ['charge', 'credit', 'rounding'].includes(row.kind));
      expect(result + sum(after.map((row) => row.amount))).toBe(nightScore(r, id).score);
    }
  });

  it('says nothing about a step that moved nothing', () => {
    expect(workingRows(r, [piggyRule], BORIS).some((row) => row.kind === 'rounding')).toBe(false);
  });
});

describe('the rounding step does not put the collector back in the list', () => {
  /*
   * B27 undone by arithmetic that happened to agree. The list filtered on
   * `credited − held`, which was the bill money and nothing else — until the
   * rounding remainder went into `held` too. The collector then read as being
   * owed the remainder, came back into the table with a score of $0, and sat
   * between two people who had played.
   */
  it('leaves a pure collector out, remainder or no remainder', () => {
    for (const mode of ['dollars', 'tens', 'fifties', 'hundreds'] as const) {
      expect(resultRows(at(mode)).map((r) => r.player.playerId)).toEqual([ANNA, BORIS, CILKA]);
    }
  });

  it('and the remainder really is on them, so this is not a coincidence', () => {
    expect(player(at('tens'), PIG).roundingAbsorbed).toBe(10);
    expect(nightScore(at('tens'), PIG)).toEqual({ score: 0, held: 10 });
  });
});
