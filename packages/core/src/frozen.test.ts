/**
 * A settled night, written down and read back.
 *
 * THE BUG THIS FILE EXISTS FOR is B52: `rounding.positions` is a Map, a Map
 * stringifies to `{}`, and the app's one caller froze a settlement with
 * `JSON.stringify` and never read it back. The day it did, every position's
 * `by` term — the figure E4's rounding row and E6's receipt are drawn from —
 * would have been gone, with no error anywhere.
 *
 * So this settles the canonical night at every step the interface offers,
 * round-trips each one through actual JSON, and asserts the result is identical
 * to the dollar. A step of tens or coarser is the case that matters: at whole
 * dollars the Map is all zeroes and a broken freeze looks perfect.
 */

import { describe, expect, it } from 'vitest';
import { freeze, thaw } from './frozen';
import { money, type Money, type RoundingMode } from './money';
import { settle, type SettlementResult } from './settlement';
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

const at = (roundingMode: RoundingMode | null): SettlementResult =>
  settle({
    players,
    entries,
    finalCounts,
    rules,
    ...(roundingMode === null ? {} : { roundingMode }),
  });

/** Through real JSON, which is what the disk and the wire actually do. */
const roundTrip = (r: SettlementResult): SettlementResult | null =>
  thaw(JSON.parse(JSON.stringify(freeze(r))));

const MODES: Array<RoundingMode | null> = [null, 'dollars', 'tens', 'fifties', 'hundreds'];

describe('a settled night survives being written down', () => {
  for (const mode of MODES) {
    it(`round-trips at ${mode ?? 'no step set'}`, () => {
      const original = at(mode);
      const back = roundTrip(original);

      expect(back).not.toBeNull();
      // Maps do not compare with toEqual against arrays, so the whole object is
      // asserted with the positions normalised to pairs on both sides.
      expect(back!.rounding.positions).toBeInstanceOf(Map);
      expect([...back!.rounding.positions.entries()]).toEqual([
        ...original.rounding.positions.entries(),
      ]);
      expect({ ...back, rounding: { ...back!.rounding, positions: null } }).toEqual({
        ...original,
        rounding: { ...original.rounding, positions: null },
      });
    });
  }

  /*
   * THE ONE THAT WOULD HAVE CAUGHT B52. `JSON.stringify` on a Map gives `{}`,
   * so a night frozen the naive way comes back with no `by` terms at all — and
   * at a step of tens those terms are the difference between what the engine
   * computed and what the room was asked to pay.
   */
  it('keeps the term the step moved, which a bare stringify loses', () => {
    const original = at('hundreds');
    const moved = [...original.rounding.positions.values()].filter((p) => p.by !== 0);
    expect(moved.length, 'the fixture must actually move somebody').toBeGreaterThan(0);

    const naive = JSON.parse(JSON.stringify(original)) as SettlementResult;
    expect(Object.keys(naive.rounding.positions)).toHaveLength(0);

    const back = roundTrip(original)!;
    for (const [id, p] of original.rounding.positions) {
      expect(back.rounding.positions.get(id)).toEqual(p);
    }
  });

  it('every figure a screen prints comes back the same', () => {
    const original = at('tens');
    const back = roundTrip(original)!;

    for (const p of original.players) {
      const got = back.players.find((x) => x.playerId === p.playerId)!;
      expect(got.finalPosition).toBe(p.finalPosition);
      expect(got.endedWith).toBe(p.endedWith);
      expect(got.boughtIn).toBe(p.boughtIn);
      expect(got.charged).toBe(p.charged);
      expect(got.credited).toBe(p.credited);
      expect(got.roundedBy).toBe(p.roundedBy);
    }
    expect(back.transfers).toEqual(original.transfers);
    expect(back.totalOffTable).toBe(original.totalOffTable);
    expect(back.algorithmVersion).toBe(original.algorithmVersion);
  });

  it('carries a confirmed discrepancy, which is the one term nobody may lose', () => {
    const short = settle({
      players,
      entries,
      // $100 that nobody can account for.
      finalCounts: new Map(finalCounts).set(PETR, money(170)),
      rules,
      acknowledgedDiscrepancy: {
        amount: money(-100),
        confirmedByUserId: 'host',
        confirmedAt: '2026-09-07T01:20:00.000Z',
        note: 'a chip went under the sofa',
      },
    });

    const back = roundTrip(short)!;
    expect(back.acknowledgedDiscrepancy).toEqual({
      amount: -100,
      confirmedByUserId: 'host',
      confirmedAt: '2026-09-07T01:20:00.000Z',
      note: 'a chip went under the sofa',
    });
    expect(back.reconciliation).toEqual(short.reconciliation);
  });
});

describe('what thaw refuses', () => {
  /*
   * A payload it cannot read must come back null, never half a settlement: the
   * caller's fallback is to re-derive from the ledger, and a screen drawing
   * three of six players is worse than one drawing all six a version late.
   */
  it.each([
    ['null', null],
    ['a string', 'settled'],
    ['an empty object', {}],
    ['a naive stringify, which has lost its Map', JSON.parse(JSON.stringify(at('tens')))],
  ])('refuses %s', (_what, payload) => {
    const back = thaw(payload);
    // The naive stringify is readable except for its positions, which is
    // exactly the case that must NOT be treated as a settlement.
    if (back !== null) expect([...back.rounding.positions]).toHaveLength(0);
  });

  it('refuses a payload whose money has been corrupted', () => {
    const f = freeze(at('tens')) as unknown as {
      players: Array<{ finalPosition: number }>;
    };
    f.players[0].finalPosition = 12.5;
    expect(thaw(f)).toBeNull();
  });

  it('refuses a position whose step term is not money', () => {
    const f = freeze(at('tens'));
    f.rounding.positions[0][1] = { exact: 10 as Money, rounded: 10 as Money, by: NaN as Money };
    expect(thaw(f)).toBeNull();
  });
});
