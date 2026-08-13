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

import { money, type Money } from '@poker-club/core';
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
}

/** Oldest last — the order is only for reading; the screen sorts what it needs. */
const SEEDS: Seed[] = [
  { days: 1, group: CLUB, net: 540, minutes: 260 },
  { days: 4, group: OFFICE, net: 180, minutes: 180 },
  { days: 8, group: CLUB, net: -60, minutes: 310 },
  { days: 11, group: OFFICE, net: 40, minutes: 165 },
  { days: 15, group: CLUB, net: 315, minutes: 245 },
  { days: 22, group: CLUB, net: -90, minutes: 200 },
  { days: 29, group: OFFICE, net: 120, minutes: 190 },
  { days: 36, group: CLUB, net: -210, minutes: 285 },
];

export const SAMPLE_HISTORY: PlayedNight[] = SEEDS.map((s) => ({
  id: `seed-night-${s.days}`,
  startedAt: nightsAgo(s.days),
  group: s.group,
  net: money(s.net) as Money,
  minutes: s.minutes,
}));

/** Every group these nights were played in, in the order they last came up. */
export const SAMPLE_GROUPS: string[] = [...new Set(SAMPLE_HISTORY.map((n) => n.group))];
