import type { Money } from '@poker-club/core';

/**
 * My results, across every group I play in.
 *
 * Pure, and takes `now` as an argument rather than reading the clock, so
 * "this month" is testable and so two figures on the same screen can never be
 * computed against two different midnights.
 *
 * Every net here is AFTER the bill and the kitty — the same figure the night's
 * settle-up handed the player, never the raw win at the table. There is only
 * one number a person remembers about a night, and this is it.
 */

export interface PlayedNight {
  id: string;
  /** When the night started, ISO. */
  startedAt: string;
  /** Which group it was. */
  group: string;
  /** My result, after deductions. Negative is a losing night. */
  net: Money;
  /** How long I was at the table. */
  minutes: number;
}

/** How far back the screen is looking. */
export type Period = 'month' | 'year' | 'all';

export interface Summary {
  net: number;
  games: number;
  minutes: number;
  won: number;
  lost: number;
  /**
   * Net divided by nights, rounded. A display figure and nothing else — it is
   * not money anybody was ever handed, so it is deliberately not `Money`.
   */
  average: number;
}

/** Most recent first, which is the order every list on the screen wants. */
export function mostRecentFirst(nights: readonly PlayedNight[]): PlayedNight[] {
  return [...nights].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function inGroup(nights: readonly PlayedNight[], group: string | null): PlayedNight[] {
  return group === null ? [...nights] : nights.filter((n) => n.group === group);
}

/**
 * The nights inside a period, counted by CALENDAR month and year rather than by
 * a rolling window. "This month" on the 2nd of the month is two days of poker,
 * not the last thirty — which is what a person means, and what makes the figure
 * agree with the one they would get adding up their own nights.
 */
export function inPeriod(
  nights: readonly PlayedNight[],
  period: Period,
  now: Date,
): PlayedNight[] {
  if (period === 'all') return [...nights];
  return nights.filter((n) => {
    const d = new Date(n.startedAt);
    if (d.getFullYear() !== now.getFullYear()) return false;
    return period === 'year' || d.getMonth() === now.getMonth();
  });
}

export function summarise(nights: readonly PlayedNight[]): Summary {
  const net = nights.reduce((total, n) => total + n.net, 0);
  return {
    net,
    games: nights.length,
    minutes: nights.reduce((total, n) => total + n.minutes, 0),
    // A night that came out exactly square counts as neither, which is why
    // these are two counts and not one count and a subtraction.
    won: nights.filter((n) => n.net > 0).length,
    lost: nights.filter((n) => n.net < 0).length,
    average: nights.length === 0 ? 0 : Math.round(net / nights.length),
  };
}

/** "This month · August", "This year · 2026", "All time". */
export function periodLabel(period: Period, now: Date): string {
  if (period === 'all') return 'All time';
  if (period === 'year') return `This year · ${now.getFullYear()}`;
  return `This month · ${now.toLocaleDateString('en-GB', { month: 'long' })}`;
}

/** "25 h" — a total, where the minutes are noise. */
export function formatHours(minutes: number): string {
  return `${Math.round(minutes / 60)} h`;
}

/** "4 h 20" — one night, where they are not. */
export function formatSitting(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** "Sat 15 Aug" in a list, "15 Aug" under a chart column. */
export function formatNightDate(startedAt: string, withWeekday = false): string {
  return new Date(startedAt).toLocaleDateString('en-GB', {
    ...(withWeekday ? { weekday: 'short' } : {}),
    day: 'numeric',
    month: 'short',
  });
}
