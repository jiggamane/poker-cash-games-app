/**
 * Where each hand stands — ahead, close, or behind — and how far.
 *
 * The odds screen colours a hand's figure by its lead over the best of the
 * OTHER hands (decided 24 October, `design/handoff-odds-calculator`, the
 * canvas's "ODDS COLOUR" note):
 *
 *   ahead by 8 points or more      ahead   (Favourite, green)
 *   behind by 8 points or more     behind  (Underdog, red)
 *   anywhere inside 8 either way   close   (Too close, amber) — every hand in the band
 *
 * and the colour deepens with the gap: pale at 8 points, full strength at 70 and
 * beyond. "Points" are percentage points of EQUITY — wins plus a share of every
 * tie — not of the win figure, so a hand that mostly splits is not called an
 * underdog for it. With three or more hands each is measured against the best
 * other: 42.9 / 47.6 / 9.5 on a turn is close, close, behind.
 *
 * It is here, not on the screen, so the screen's words can be held to it by
 * `ui-odds.mjs`, and so the outs control — shown only for a hand that is not
 * ahead — asks the same question the colour does.
 */

import type { SeatOdds } from './odds';

/** The band around level, in equity: 8 percentage points. */
export const CLOSE_BAND = 0.08;
/** The lead at which the colour is at full strength: 70 percentage points. */
export const FULL_LEAD = 0.7;

export type StandingKind = 'ahead' | 'close' | 'behind';

export interface Standing {
  kind: StandingKind;
  /** 0 at the edge of the band, 1 at a lead of 70 points or more; 0 when close. */
  depth: number;
}

/** One standing per seat, in the order given. Fewer than two seats: all close. */
export function standings(seats: readonly Pick<SeatOdds, 'equity'>[]): Standing[] {
  return seats.map((s, i) => {
    let other = -Infinity;
    seats.forEach((o, j) => {
      if (j !== i && o.equity > other) other = o.equity;
    });
    if (other === -Infinity) return { kind: 'close', depth: 0 };
    /* To a billionth: 0.08 is not exactly representable, and a lead of exactly
       8 points is ahead. */
    const lead = Math.round((s.equity - other) * 1e9) / 1e9;
    if (Math.abs(lead) < CLOSE_BAND) return { kind: 'close', depth: 0 };
    return {
      kind: lead > 0 ? 'ahead' : 'behind',
      depth: Math.min(1, (Math.abs(lead) - CLOSE_BAND) / (FULL_LEAD - CLOSE_BAND)),
    };
  });
}
