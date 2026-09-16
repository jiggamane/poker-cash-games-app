import { useEffect, useState } from 'react';

/**
 * How long the table has been running.
 *
 * S51 made the running time THE live tag: the word "LIVE" was removed and a
 * green dot beside an elapsed figure took its place. So this figure is the
 * only thing on the night screen claiming the night is happening — and it did
 * not move. Both screens computed it once per render, nothing re-rendered them
 * on a clock, and the result over a four-hour game was a number that jumped
 * twenty minutes whenever the host happened to record a rebuy and sat frozen
 * in between. A stopped clock beside a green dot is worse than no clock.
 *
 * Two screens show it — Tonight and the home card — and they each had their
 * own copy of the arithmetic. One implementation now, so they cannot drift.
 */

const MINUTE = 60_000;

/**
 * "3h 17m", the way both screens have always drawn it.
 *
 * Rounded rather than floored, which is what shipped: at 90 seconds this reads
 * 2m. Kept deliberately — changing it would move every figure by up to half a
 * minute for no reason anybody asked for — and `msUntilNextLabelChange` is
 * derived from the same rounding so the two cannot disagree.
 */
export function elapsedLabel(startedAt: string, now: number): string {
  const since = now - new Date(startedAt).getTime();

  /*
   * UNDER A MINUTE THE FIGURE IS A WORD. "0h 00m" beside a green dot is a
   * clock that has not started, which is the one thing the tag must never
   * imply; a night that has just been opened says so. Tested against the raw
   * elapsed rather than the rounded minutes, so the word holds for the whole
   * first minute instead of half of it.
   */
  if (since < MINUTE) return 'just opened';

  const minutes = Math.max(0, Math.round(since / MINUTE));

  /*
   * PAST 99 HOURS IT SWITCHES TO DAYS. A four-figure hour count is not a
   * duration anybody reads — and a night left open over a holiday reaches it.
   * The hours stay padded so the figure keeps its width as it counts.
   */
  const hours = Math.floor(minutes / 60);
  if (hours > 99) {
    return `${Math.floor(hours / 24)}d ${String(hours % 24).padStart(2, '0')}h`;
  }

  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/**
 * When the label will next say something different.
 *
 * Ticking on a fixed interval either wastes renders or shows a stale figure
 * for up to that interval. Because the label rounds, it changes as `now`
 * crosses each half-minute past the start, so the wait is to that boundary
 * exactly: one timer at a time, no drift, and the figure is never wrong.
 */
export function msUntilNextLabelChange(startedAt: string, now: number): number {
  const since = now - new Date(startedAt).getTime();

  // "just opened" holds for the whole first minute, so the next change is when
  // that minute is up — not at the half-minute where the rounding turns over.
  // A start time in the future is a wrong clock somewhere: the label stays the
  // word until the phone catches up, so look again in a minute.
  if (since < MINUTE) return since < 0 ? MINUTE : MINUTE - since;

  const untilBoundary = MINUTE - (((since + MINUTE / 2) % MINUTE) + MINUTE) % MINUTE;
  // A boundary landing exactly on `now` is a full minute away, not zero: a
  // zero-delay timer would spin.
  return untilBoundary === 0 ? MINUTE : untilBoundary;
}

/**
 * The elapsed label, kept current.
 *
 * Re-renders only when the figure actually changes — once a minute — and
 * stops when the screen goes away. A backgrounded app has its timers throttled
 * by the OS; the label is computed from the clock at render rather than
 * counted up, so a late tick shows the right time rather than a drifted one.
 */
export function useElapsed(startedAt: string): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), msUntilNextLabelChange(startedAt, now));
    return () => clearTimeout(id);
  }, [startedAt, now]);

  return elapsedLabel(startedAt, now);
}

/**
 * "20:05" — a wall clock, 24 hour, as every board draws it.
 *
 * One function rather than three copies of the same options object: the night
 * screen, the setup sheet and the start-time editor all print this figure, and
 * a locale that turned one of them into "8:05 PM" while the others stayed at
 * 24 hour would read as two different clocks on two screens of one flow.
 */
export const clockLabel = (at: string | Date): string =>
  (typeof at === 'string' ? new Date(at) : at).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * "20:05 → 06:38" — when the night started and when it ended.
 *
 * THE WHOLE OF THE PAST SESSION'S META LINE, and it is the two times because
 * they are the only terms on it that cannot grow. A wall clock is four digits
 * at every night this app can record; an elapsed figure gains a digit at a
 * hundred hours, a player count at ten seats, and a line that shares its row
 * with the 34-point view control has about 200 points to spend. B81 is the
 * second time that line was cut to fit and the first time it was cut to
 * something with a fixed width.
 *
 * ⚠ NO END, NO ARROW. A night with nothing in it has no last stamp to fall
 * back on, and "20:05 →" pointing at a blank is a line that looks broken
 * rather than one that is waiting. The start alone is the honest reading, and
 * it is the same clock either way. On `/settled` it cannot happen — a night
 * with no result never reaches this line, it gets the *Not settled* screen —
 * so nothing drawn anywhere depends on it; it is here so the function has an
 * answer rather than a crash.
 */
export function nightSpan(startedAt: string, endedAt: string | null): string {
  const started = clockLabel(startedAt);
  return endedAt === null ? started : `${started} → ${clockLabel(endedAt)}`;
}

/**
 * How long until the wall clock reads a different minute.
 *
 * The same shape as `msUntilNextLabelChange` and for the same reason: a
 * fixed interval either burns renders or shows a stale figure for up to its
 * own length. "20:05" changes exactly on the minute, so that is when to look
 * again — and a clock sitting exactly on one waits a whole minute rather than
 * no time at all, because a zero-delay timer would spin.
 */
export function msUntilNextMinute(now: number): number {
  return MINUTE - (((now % MINUTE) + MINUTE) % MINUTE);
}

/**
 * The wall clock, kept current.
 *
 * O1's primary reads "Open the table · 20:05", and since the start time
 * stopped being a setting that figure is the phone's own clock: the stamp the
 * night will carry the moment the button is pressed. A sheet can sit open for
 * half an hour while a host seats people, so a figure computed once at mount
 * would promise a time the night is not going to get.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), msUntilNextMinute(now));
    return () => clearTimeout(id);
  }, [now]);

  return new Date(now);
}
