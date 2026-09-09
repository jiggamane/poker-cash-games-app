/**
 * The geometry behind "result per night" — the one chart in the app.
 *
 * Pure arithmetic, kept out of the component on purpose: a bar whose height is
 * computed inline is a bar nobody can test, and this chart is the only place in
 * the app where a figure is drawn as a SIZE rather than written down. If the
 * size and the money ever stop agreeing, the chart lies quietly, which is worse
 * than a wrong number on screen because nobody proof-reads a rectangle.
 *
 * Two rules hold everything together:
 *
 *   THE LINE IS ZERO. A night you won goes up from it, a night you lost goes
 *   down. Sign is carried by direction first and colour second — direction reads
 *   at arm's length and survives being colour-blind, printed, or squinted at.
 *
 *   ONE SCALE, BOTH WAYS. The same pixels-per-dollar applies above and below,
 *   so a −$300 night is drawn exactly as far from the line as a +$300 one, and
 *   two bars can be compared by eye across the line as well as along it.
 */

/**
 * THE BAR RULE — `design/handoff-sessions-stats/`, *"Bar height — the rule"*,
 * cut 9 September, which replaces the round-number ladder this file used to
 * carry.
 *
 *     peak   = max(|result|) among the nights on screen
 *     k      = 38px ÷ peak
 *     height = clamp(round(|result| × k), 3, 38)
 *
 * WHAT CHANGED AND WHY. The old scale rounded UP to a number a person could
 * read off an axis — $600 for a $541 night — because the chart was labelled
 * with it. This one is not labelled: the figure a reader wants is the one for
 * the night they tapped, and it appears beside the caption instead. With no
 * axis to print, rounding the scale only ever shortens every bar, so the peak
 * itself is the scale and the tallest night fills the band exactly.
 *
 * THE FLOOR IS 3 AND NOT 2. A $6 night is 0.4px unclamped, and a bar of
 * nothing reads as "did not play" rather than "barely lost". Three points is
 * what survives a phone's own rounding onto its pixel grid.
 *
 * ONE SCALE, BOTH WAYS, which is the rule that outlived the ladder: wins and
 * losses share `k`, so a −$300 night is drawn exactly as far from the line as
 * a +$300 one and two bars can be compared across the line as well as along it.
 *
 * ONE HUGE NIGHT FLATTENS THE REST, by design. The handoff says so and says
 * what covers it: the tapped-night figure is the detail the flattening hides.
 */

/** The biggest single result in a set of nights, in either direction. */
export function largestResult(nets: readonly number[]): number {
  return nets.reduce<number>((biggest, net) => Math.max(biggest, Math.abs(net)), 0);
}

export interface Bar {
  /** Distance from the zero line, in points. Never negative. */
  height: number;
  /**
   * Which way it goes.
   *
   * `even` is a night that came out EXACTLY square, and it is not "no bar": it
   * has no height to derive, so it is drawn as a mark of `height` on both sides
   * of the line in its own colour. See the note in `tokens.ts` on `breakEven`.
   */
  side: 'above' | 'below' | 'even';
}

/**
 * One night, as a rectangle.
 *
 * `band` is the drawable height on ONE side of the line, so the peak night
 * exactly fills it. `floor` is what a night too small to see is raised to, and
 * `evenMark` is what a night of exactly nothing gets on each side.
 *
 * A window with no money in it at all — every night square, or no nights —
 * gives every bar the even mark, which is true: nothing went either way.
 */
export function plotBar(
  net: number,
  peak: number,
  band: number,
  floor = 3,
  evenMark = 2,
): Bar {
  if (net === 0 || peak <= 0 || band <= 0) return { height: evenMark, side: 'even' };

  const exact = (Math.abs(net) / peak) * band;
  return {
    height: Math.min(band, Math.max(floor, Math.round(exact))),
    side: net > 0 ? 'above' : 'below',
  };
}
