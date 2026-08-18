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
