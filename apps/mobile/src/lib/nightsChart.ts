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
 * The round numbers a scale is allowed to land on, per power of ten.
 *
 * The top of the chart is LABELLED with this number, so it has to be one a
 * person can hold in their head — $600, not $541. Anything finer buys accuracy
 * nobody reads and costs the label its legibility.
 */
const LADDER = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] as const;

/**
 * The smallest round number that still contains the biggest night.
 *
 * Returns 0 when there is nothing to plot — every night was square, or there
 * are no nights — which the caller draws as a bare line rather than inventing
 * an axis for money that does not exist.
 */
export function niceScale(largest: number): number {
  const max = Math.abs(largest);
  if (!Number.isFinite(max) || max <= 0) return 0;

  const power = 10 ** Math.floor(Math.log10(max));
  for (const step of LADDER) {
    const candidate = Math.round(step * power);
    if (candidate >= max) return candidate;
  }
  return Math.round(10 * power);
}

/** The biggest single result in a set of nights, in either direction. */
export function largestResult(nets: readonly number[]): number {
  return nets.reduce<number>((biggest, net) => Math.max(biggest, Math.abs(net)), 0);
}

export interface Bar {
  /** Distance from the zero line, in pixels. Never negative. */
  height: number;
  /** Which way it goes. `none` is a night that came out exactly square. */
  side: 'above' | 'below' | 'none';
}

/**
 * One night, as a rectangle.
 *
 * `half` is the drawable height on ONE side of the line, so a night equal to
 * the scale exactly fills it. The clamp is belt and braces: `scale` always
 * comes from `niceScale`, which cannot be smaller than the largest night.
 *
 * `minimum` keeps a small night visible. A $10 loss on a $600 scale rounds to
 * nothing, and a bar of nothing reads as "did not play" rather than "barely
 * lost" — so it is floored at something you can see. It is deliberately 2px and
 * not more: the exaggeration has to be smaller than the smallest difference
 * anybody would try to read off the chart.
 */
export function plotBar(net: number, scale: number, half: number, minimum = 2): Bar {
  if (net === 0 || scale <= 0 || half <= 0) return { height: 0, side: 'none' };

  const exact = (Math.abs(net) / scale) * half;
  return {
    height: Math.min(half, Math.max(minimum, Math.round(exact))),
    side: net > 0 ? 'above' : 'below',
  };
}
