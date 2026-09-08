/**
 * The nights behind me, to open My stats with.
 *
 * TEMPORARY, and the exact twin of `sampleNight`. This phone holds ONE night —
 * there is no sessions table yet, and no notion of which player at a table is
 * me — so there is nowhere for a settled result to be filed and nothing to add
 * up across groups. Rather than draw an empty screen, My stats reads these
 * until sessions are real, at which point this file is deleted and the screen
 * reads the book instead.
 *
 * The figures are the design's own (board G4 · My stats, "Last games"). The
 * summary above the chart is NOT taken from the board: it is computed from
 * these nights, so every figure on the screen agrees with every other one. The
 * board's decorative "+$610" does not match its own list, and one of the two
 * had to give.
 *
 * Dates are relative to today, like the seeded night's times, so "This month"
 * means something whenever the app is opened rather than only in August 2026.
 */

import { money, type Money, type SettledTerm } from '@poker-club/core';
import type { PlayedNight } from '../lib/myStats';

const CLUB = 'The Poker Club';
const OFFICE = 'Office game';

/** N days ago, at 20:00 — nights start in the evening. */
const nightsAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(20, 0, 0, 0);
  return d.toISOString();
};

interface Seed {
  days: number;
  group: string;
  net: number;
  minutes: number;
  /** What I put on the table that night. */
  in: number;
  /** My share of the bill, where the group charged one that night. */
  bill?: number;
  /** What I paid at the counter and am owed back, where I fronted it. */
  back?: number;
  /** What the piggy bank took off me. */
  piggy?: number;
}

/**
 * Oldest last — the order is only for reading; the screen sorts what it needs.
 *
 * WHAT WAS BOUGHT IN AND WHAT THE RULES TOOK, so a night on My stats opens into
 * the same row `/settled` draws. `net` and the spends are the givens and what
 * was CASHED OUT is derived from them below, which is what makes the row's own
 * arithmetic true by construction rather than by proofreading: the handoff's
 * whole claim about this row is that it visibly sums to the figure beside it,
 * and a seed that missed by $10 would be the one place in the app where it did
 * not. Two nights carry no deductions at all — an evening nobody ordered
 * anything on — because absent pairs are dropped, never zeroed, and a list
 * where every row has all five glyphs never shows that.
 */
const SEEDS: Seed[] = [
  { days: 1, group: CLUB, net: 540, minutes: 260, in: 500, bill: 42, piggy: 20 },
  { days: 4, group: OFFICE, net: 180, minutes: 180, in: 300 },
  { days: 8, group: CLUB, net: -60, minutes: 310, in: 700, bill: 36, piggy: 20 },
  { days: 11, group: OFFICE, net: 40, minutes: 165, in: 300, bill: 24 },
  /* The night I bought the food: charged my share and paid back in full. */
  { days: 15, group: CLUB, net: 315, minutes: 245, in: 500, bill: 48, back: 190, piggy: 20 },
  { days: 22, group: CLUB, net: -90, minutes: 200, in: 500, bill: 30, piggy: 20 },
  { days: 29, group: OFFICE, net: 120, minutes: 190, in: 300 },
  { days: 36, group: CLUB, net: -210, minutes: 285, in: 800, bill: 54, piggy: 20 },
];

/**
 * One seed as the row reads it — `in`, `out`, then every rule that took
 * something, in the order the app's own nights apply them (the bill, then the
 * piggy bank).
 *
 * `out` IS DERIVED AND EVERYTHING ELSE IS GIVEN: `net = out − in − bill + back
 * − piggy`, so what was cashed out is whatever makes that true. The engine
 * does this for a real night; here there is no engine, and the arithmetic has
 * to hold anyway.
 */
function terms(s: Seed): SettledTerm[] {
  const bill = s.bill ?? 0;
  const back = s.back ?? 0;
  const piggy = s.piggy ?? 0;
  const out = s.net + s.in + bill - back + piggy;

  const rows: SettledTerm[] = [
    { kind: 'in', destination: null, amount: money(s.in) },
    { kind: 'out', destination: null, amount: money(out) },
  ];
  if (bill !== 0) rows.push({ kind: 'spend', destination: 'bill', amount: money(bill) });
  if (back !== 0) rows.push({ kind: 'back', destination: 'bill', amount: money(back) });
  if (piggy !== 0) rows.push({ kind: 'spend', destination: 'kitty', amount: money(piggy) });
  return rows;
}

export const SAMPLE_HISTORY: PlayedNight[] = SEEDS.map((s) => ({
  id: `seed-night-${s.days}`,
  startedAt: nightsAgo(s.days),
  group: s.group,
  net: money(s.net) as Money,
  minutes: s.minutes,
  terms: terms(s),
}));

/** Every group these nights were played in, in the order they last came up. */
export const SAMPLE_GROUPS: string[] = [...new Set(SAMPLE_HISTORY.map((n) => n.group))];
