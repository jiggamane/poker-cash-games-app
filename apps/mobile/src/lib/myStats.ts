import type { Money, SettledTerm } from '@poker-club/core';

/**
 * My results, across every group I play in.
 *
 * Pure, and takes `now` as an argument rather than reading the clock, so
 * "this month" is testable and so two figures on the same screen can never be
 * computed against two different midnights.
 *
 * Every net here is AFTER the bill and the piggy bank — the same figure the night's
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
  /**
   * How many sat down that night — the row's own annotation, beside the
   * duration. Absent on a night whose record does not say.
   */
  players?: number;
  /**
   * WHAT THE NIGHT WAS MADE OF — chips in, chips out, and what each rule took,
   * as the same `SettledTerm[]` a results row is drawn from.
   *
   * The list draws them with `ScoreBreakdown`, which is the app's one drawing
   * of a finished night, so a night on My stats reads exactly the way the same
   * night reads on `/settled`. Empty where a night has no breakdown to show —
   * an older record, or one that will not settle — and the row is then just the
   * date and the figure, which is what this screen has always been.
   */
  terms: SettledTerm[];
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

/**
 * A night as the night store hands one over.
 *
 * Declared structurally rather than imported, so this file goes on importing no
 * store and staying pure — `MyNight` satisfies it, and the compiler checks that
 * at the call site.
 */
export interface RecordedNight {
  sessionId: string;
  groupName: string;
  startedAt: string;
  result: Money;
  minutes: number;
  players: number;
  terms: SettledTerm[];
  /** False for a night of this club you sat out. */
  played: boolean;
}

/**
 * THE BOOK — every night this reader has played, in one list.
 *
 * ⚠ IT EXISTS BECAUSE SESSIONS AND MY STATS DISAGREED. My stats read the
 * phone's own night AND a seeded history; Sessions read only the phone's, so
 * `See all` led from a list of eight nights to a list of none. Two screens
 * assembling the same book two ways is the drift, and one function is the fix:
 * the destination cannot hold less than the sample that links to it.
 *
 * ⚠ AND THE SEEDED HALF IS GONE — B79. It took a second list and concatenated
 * it, and what both screens passed was `SAMPLE_HISTORY`: eight invented nights
 * in two invented groups, drawn from board G4 so that My stats had something to
 * open with while the phone could only hold one real night. The phone can hold
 * every night this reader has played and has been able to since the pull was
 * built, so the sample is deleted and this takes one argument. A figure on My
 * stats is now a figure about games that were actually played.
 */
export function readBook(nights: readonly RecordedNight[]): PlayedNight[] {
  return nights
    .filter((n) => n.played)
    .map((n) => ({
      id: n.sessionId,
      startedAt: n.startedAt,
      group: n.groupName,
      net: n.result,
      minutes: n.minutes,
      players: n.players,
      terms: n.terms,
    }));
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

/**
 * The screen's own title: "August", "2026", "All time".
 *
 * The stretch being shown IS the title, rather than a fixed "My stats" with the
 * period repeated underneath it. A month is named and a year is a number, and
 * neither needs a word in front of it to be understood at the top of a screen
 * whose every figure is about that stretch.
 */
export function periodTitle(period: Period, now: Date): string {
  if (period === 'all') return 'All time';
  if (period === 'year') return String(now.getFullYear());
  return now.toLocaleDateString('en-GB', { month: 'long' });
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

/**
 * `Since Aug 2026` — where the book itself starts.
 *
 * WHAT `All time` SAYS NOW. The other two tabs name the stretch they cover —
 * `August`, `2026` — and `All time` named nothing: the same two words over a
 * figure that is six nights on a new phone and four years of poker on an old
 * one, with no way to tell which from the screen. The month the first night was
 * played is the one fact that separates them.
 *
 * IT READS THE SCOPED BOOK, so a reader who has narrowed to one club is told
 * when THAT club's first night was rather than when they started playing. The
 * figure beside it is scoped the same way.
 *
 * Falls back to `All time` on an empty book, which is the only honest thing it
 * can say: there is no first night to name, and `Since` with nothing after it
 * is worse than the words it replaced.
 *
 * ⚠ THE MONTH IS SHORT — `Since Sept 2026`, and not `Since September 2026`.
 * The eyebrow shares its line with the three period tabs, which leaves it 143
 * points on a 360 phone. `Since August 2026` takes 133 and fits;
 * `Since September 2026` does not, and on the long months the line wrapped and
 * the card grew eight points. Measured in the built app at 360 and 393, not
 * guessed at. A short month clears it by a wide margin and the card is one
 * height all year — and it is the spelling `formatNightDate` already puts on
 * the rows four lines below, so the same option object writes both.
 */
export function sinceTitle(nights: readonly PlayedNight[]): string {
  let earliest = Number.POSITIVE_INFINITY;
  for (const n of nights) {
    const at = Date.parse(n.startedAt);
    if (Number.isFinite(at) && at < earliest) earliest = at;
  }
  if (!Number.isFinite(earliest)) return 'All time';
  return `Since ${new Date(earliest).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  })}`;
}
