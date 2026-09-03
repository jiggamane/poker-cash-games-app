/**
 * Rounding, as it applies to where everyone ends up. Rewritten 2 September,
 * when the step stopped snapping stacks and started apportioning positions.
 *
 * WHAT THE OLD RULE COST, and why this file changed shape. Stacks snapped to
 * the step, the difference was `Σ rounded − Σ raw`, and the piggy bank absorbed
 * it — so a night could print $184 as the piggy-bank rule's total and hand it
 * $200 at settlement, with nothing on the record joining the two. The count was
 * being rewritten to make the arithmetic land, which also put the balance check
 * on E2 on chips nobody had counted.
 *
 * WHAT REPLACES IT. Positions are apportioned onto the step, largest remainder,
 * across every party at once — the piggy bank included, because that is what
 * makes a remainder-free answer arithmetically possible at all. Nothing is
 * invented, nothing absorbed, and no figure disagrees with another.
 *
 * A NIGHT BUILT FOR THIS AND NOTHING ELSE. The canonical night's counts are all
 * multiples of ten already, so it cannot see a step at all: every assertion
 * below would pass against an engine that ignored the setting completely.
 * Three players, one piggy bank, and counts chosen so that the apportionment
 * has to hand a step to somebody.
 *
 * THE INVARIANTS THAT MATTER are not any single figure: the positions sum to
 * zero, every one of them lands on the step, nobody moves by a whole one, the
 * moves cancel — and `verifyNight`, which re-derives every identity from the
 * raw ledger, has nothing to say.
 */

import { describe, expect, it } from 'vitest';
import { money, sum, type Money } from './money';
import { settle } from './settlement';
import { roundPositions, roundToStep } from './stacks';
import { verifyNight } from './verify';
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';
import { columnsFit, nightScore, receiptRows, resultColumns, resultRows } from './working';

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
  });

  it('is the identity at a step of one, which is what makes “off” a step', () => {
    expect(roundToStep(money(963), 1)).toBe(963);
  });

  it('goes away from zero on both sides of it', () => {
    expect(roundToStep(money(-965), 10)).toBe(-970);
    expect(roundToStep(money(-964), 10)).toBe(-960);
  });

  it('refuses a step that is not a whole number of units', () => {
    expect(() => roundToStep(money(100), 0)).toThrow(RangeError);
    expect(() => roundToStep(money(100), 2.5)).toThrow(RangeError);
  });
});

describe('roundPositions — the step, without a remainder', () => {
  /* Three parties whose exact positions sum to zero, with fractions of a step
     chosen so that exactly one of them has to be handed the odd $10. */
  const exact = new Map<PlayerId, Money>([
    ['a', money(442)],
    ['b', money(-230)],
    ['c', money(-235)],
    ['d', money(23)],
  ]);

  it('lands every party on the step', () => {
    for (const p of roundPositions(exact, 10).positions.values()) {
      /* `Math.abs`, because -0 is not 0 to `toBe`. */
      expect(Math.abs(p.rounded % 10)).toBe(0);
    }
  });

  it('keeps the sum at zero, which is the whole point of it', () => {
    for (const step of [10, 50, 100]) {
      const r = roundPositions(exact, step);
      expect(sum([...r.positions.values()].map((p) => p.rounded))).toBe(0);
    }
  });

  it('redistributes rather than invents — the moves cancel out', () => {
    for (const step of [10, 50, 100]) {
      const r = roundPositions(exact, step);
      expect(sum([...r.positions.values()].map((p) => p.by))).toBe(0);
    }
  });

  it('never moves anybody by a whole step', () => {
    for (const step of [10, 50, 100]) {
      for (const p of roundPositions(exact, step).positions.values()) {
        expect(Math.abs(p.by)).toBeLessThan(step);
      }
    }
  });

  it('hands the odd step to whoever came closest to earning it', () => {
    /* Floors are 440 / −230 / −240 / 20 and the shortfalls 2 / 0 / 5 / 3, so
       one $10 goes to c and nobody else. */
    const r = roundPositions(exact, 10);
    expect(r.positions.get('c')!.rounded).toBe(-230);
    expect(r.positions.get('a')!.rounded).toBe(440);
    expect(r.positions.get('b')!.rounded).toBe(-230);
    expect(r.positions.get('d')!.rounded).toBe(20);
  });

  it('reports the worst single move, not the average', () => {
    expect(roundPositions(exact, 10).worst).toBe(5);
  });

  it('does nothing at all at a step of one', () => {
    const r = roundPositions(exact, 1);
    expect(r.on).toBe(false);
    expect([...r.positions.values()].every((p) => p.by === 0)).toBe(true);
  });

  it('refuses to round positions that do not already sum to zero', () => {
    const broken = new Map<PlayerId, Money>([['a', money(100)], ['b', money(-90)]]);
    expect(() => roundPositions(broken, 10)).toThrow(RangeError);
  });

  it('gives the same answer however many times it runs', () => {
    const once = [...roundPositions(exact, 50).positions].map(([id, p]) => [id, p.rounded]);
    const twice = [...roundPositions(exact, 50).positions].map(([id, p]) => [id, p.rounded]);
    expect(once).toEqual(twice);
  });
});

describe('settle() at a step — nothing is invented and nothing is absorbed', () => {
  it('leaves every count exactly as it was counted', () => {
    /* The whole objection the first rule overruled. A stack is a stack. */
    expect(player(at('tens'), ANNA).endedWith).toBe(965);
    expect(player(at('hundreds'), CILKA).endedWith).toBe(265);
  });

  it('leaves the gross on the real chips, at every step', () => {
    for (const mode of ['dollars', 'tens', 'fifties', 'hundreds'] as const) {
      expect(player(at(mode), ANNA).grossResult).toBe(465);
    }
  });

  it('lands every position on the step', () => {
    for (const p of at('tens').players) expect(Math.abs(p.finalPosition % 10)).toBe(0);
    for (const p of at('fifties').players) expect(Math.abs(p.finalPosition % 50)).toBe(0);
  });

  it('still sums to zero, which is the only thing that may never give', () => {
    for (const mode of ['dollars', 'tens', 'fifties', 'hundreds'] as const) {
      expect(sum(at(mode).players.map((p) => p.finalPosition))).toBe(0);
    }
  });

  it('has no remainder for anybody to carry', () => {
    /* The old rule put `Σ rounded − Σ raw` on the piggy bank's collector. There
       is no such figure now: the moves cancel among the parties themselves. */
    for (const mode of ['tens', 'fifties', 'hundreds'] as const) {
      expect(sum(at(mode).players.map((p) => p.roundedBy))).toBe(0);
    }
  });

  it('gives the piggy bank one figure, and it is the one that moves', () => {
    /* $23 exact, $20 at the nearest ten. The deduction still reads 23 — that is
       what the rule took off Anna — and the tin's POSITION is what rounds, so
       the transfer and the position are the same number. */
    const r = at('tens');
    expect(player(r, PIG).finalPosition).toBe(20);
    const toPiggy = r.transfers
      .filter((t) => t.toPlayerId === PIG)
      .reduce((n, t) => n + t.amount, 0);
    expect(toPiggy).toBe(20);
  });

  it('never prints a figure another screen disagrees with — the whole point', () => {
    /*
     * THE GAP THIS CHANGE EXISTS TO CLOSE. Under the old rule the piggy-bank
     * rule's total and the money the piggy bank actually received were two
     * different numbers, because the rounding remainder was added to the second
     * and not the first: the record said $184 and the settlement moved $200.
     * Three statements of one fact, and they now agree at every step.
     */
    for (const mode of ['dollars', 'tens', 'fifties', 'hundreds'] as const) {
      const r = at(mode);
      const rule = r.deductions.find((d) => d.destination === 'kitty');
      const stated = rule?.total ?? 0;
      const position = player(r, PIG).finalPosition;
      const moved = r.transfers
        .filter((t) => t.toPlayerId === PIG)
        .reduce((n, t) => n + t.amount, 0);
      expect({ mode, stated, position, moved }).toEqual({
        mode,
        stated,
        position: stated,
        moved: stated,
      });
    }
  });

  it('makes every transfer a multiple of the step, without rounding one twice', () => {
    for (const t of at('fifties').transfers) expect(Math.abs(t.amount % 50)).toBe(0);
  });

  it('rounds a night with no piggy bank at all', () => {
    /* The old rule switched the step off when there was no tin to carry the
       remainder. There is no remainder, so there is nothing to carry. */
    const r = settle({ players, entries, finalCounts, rules: [], roundingMode: 'tens' });
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
    for (const p of r.players) expect(Math.abs(p.finalPosition % 10)).toBe(0);
    expect(r.players.some((p) => p.roundedBy !== 0)).toBe(true);
  });

  it('holds against a verifier that re-derives the step from the input', () => {
    for (const mode of ['dollars', 'tens', 'fifties', 'hundreds'] as const) {
      const report = verifyNight(
        { players, entries, finalCounts, rules: [piggyRule], roundingMode: mode },
        at(mode),
      );
      expect(report.findings).toEqual([]);
      expect(report.ok).toBe(true);
    }
  });

  it('leaves the reconciliation on the real chips', () => {
    /* The count balanced, and no step may make it look otherwise. */
    for (const mode of ['dollars', 'tens', 'fifties', 'hundreds'] as const) {
      expect(at(mode).reconciliation.difference).toBe(0);
      expect(at(mode).reconciliation.counted).toBe(1500);
    }
  });

  it('never rounds twice — a bigger step recomputes from the exact position', () => {
    /* Boris is the one who proves it. His exact position is −230 at every step,
       because no rule touches him. At the nearest $10 that is already round and
       he does not move; at $50 the apportionment hands him a step UP, to −200.
       Rounding the $10 answer a second time would have taken him DOWN to −250,
       which is the wrong direction and $50 out. */
    expect(player(at('tens'), BORIS).finalPosition).toBe(-230);
    expect(player(at('fifties'), BORIS).finalPosition).toBe(-200);
    expect(player(at('fifties'), BORIS).roundedBy).toBe(30);
  });

  it('gives the same answer however many times it runs', () => {
    const a = at('fifties').players.map((p) => [p.playerId, p.finalPosition]);
    const b = at('fifties').players.map((p) => [p.playerId, p.finalPosition]);
    expect(a).toEqual(b);
  });
});

describe('the columns carry the step, so the row still adds up', () => {
  it('gives a rounded night a column of its own for it', () => {
    /* Without it `game + food + piggy` is short of the net by whatever the step
       moved, and a reader adding the row up lands somewhere else. */
    expect(resultColumns(at('dollars')).every((r) => r.rounded === 0)).toBe(true);
    expect(resultColumns(at('tens')).some((r) => r.rounded !== 0)).toBe(true);
  });

  it('and every row adds up to the net beside it, at every step', () => {
    for (const mode of ['dollars', 'tens', 'fifties', 'hundreds'] as const) {
      for (const r of resultColumns(at(mode))) {
        expect(r.game + r.food + r.piggy + r.rounded).toBe(r.net);
      }
    }
  });

  it('still lets a rounded night use the columns layout at all', () => {
    /* `columnsFit` is about the RULES reaching past the bill and the piggy
       bank. The step is not a rule and does not take the layout away. */
    expect(columnsFit(at('tens'))).toBe(true);
  });
});

describe('the receipt names the step', () => {
  it('adds one term for what the step did to their position', () => {
    const r = at('tens');
    const rows = receiptRows(r, CILKA);
    expect(rows.some((row) => row.label.includes('Rounded'))).toBe(true);
  });

  it('leaves it off a position that did not move', () => {
    const r = at('tens');
    expect(player(r, BORIS).roundedBy).toBe(0);
    expect(receiptRows(r, BORIS).some((row) => row.label.includes('Rounded'))).toBe(false);
  });
});

describe('the float is not the collector’s night — B27, at a step', () => {
  it('leaves their score at nothing and their hands full', () => {
    const r = at('tens');
    expect(nightScore(r, PIG).score).toBe(0);
    expect(nightScore(r, PIG).held).toBe(20);
  });

  it('keeps a player’s own rounding inside their score, where it belongs', () => {
    const r = at('tens');
    expect(nightScore(r, ANNA).score).toBe(player(r, ANNA).finalPosition);
  });

  it('leaves the collector out of the result rows', () => {
    expect(resultRows(at('tens')).some(({ player: p }) => p.playerId === PIG)).toBe(false);
  });
});
