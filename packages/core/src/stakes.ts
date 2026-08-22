/**
 * The stakes a game is played at — M8, and the first row of *The game* on O1.
 *
 * THIS IS NOT ARITHMETIC AND NEVER BECOMES IT. Nothing in this app deals a
 * hand: there is no clock, no blind schedule, no eliminations, and no figure
 * anywhere in the settlement is derived from a blind. The stakes are a fact
 * the room agreed on, recorded so the night can state what it was played at
 * and so the next night can offer the same. They are here rather than in a
 * screen only because two screens say them and one sentence should say them
 * once.
 *
 * `03-data-model.md` carries `{ small, big }` on the Group as `defaultStakes`
 * and on the Session as `stakes`; rev 18 § 5.2 adds the straddle beside them.
 * They travel together everywhere they are read or written, so they are one
 * value object here rather than three fields to forget one of.
 */

import { formatMoney, type Money } from './money';

/**
 * Whether a straddle is played, and whether it has to be — M8's three-state
 * pick. `'none'` is the only state in which the amount means nothing.
 */
export type StraddleMode = 'none' | 'optional' | 'mandatory';

export interface Stakes {
  /** Small blind, in the same minor units as every other figure. */
  small: Money;
  /** Big blind. */
  big: Money;
  straddle: StraddleMode;
  /**
   * What the straddle is, when there is one. Null whenever `straddle` is
   * `'none'` — an amount left behind by a mode that has since been turned off
   * is a figure the screen would have to explain, so it is cleared instead.
   */
  straddleAmount: Money | null;
}

/** The board's string, and the only form the stakes are ever shown in: `$5 / $5`. */
export function stakesLabel(stakes: Stakes, currencySymbol = '$'): string {
  const small = formatMoney(stakes.small, currencySymbol);
  return `${small} / ${formatMoney(stakes.big, currencySymbol)}`;
}

/**
 * The straddle in words, or null when there is none to say.
 *
 * ⚠ COPY NOT DRAWN. M8 fixes the control — No / Optional / Mandatory — but no
 * board states a straddle back to anyone in a sentence, because no board draws
 * a game that has one. These read as the pick does and are flagged rather than
 * invented quietly.
 */
export function straddleLabel(stakes: Stakes, currencySymbol = '$'): string | null {
  if (stakes.straddle === 'none' || stakes.straddleAmount === null) return null;
  const amount = formatMoney(stakes.straddleAmount, currencySymbol);
  return stakes.straddle === 'mandatory'
    ? `${amount} straddle · mandatory`
    : `${amount} straddle · optional`;
}

/**
 * The whole game in one line, for the one place that stores it as a line: the
 * night's own `stakes`, which is text on the phone and text on the server.
 */
export function stakesSummary(stakes: Stakes, currencySymbol = '$'): string {
  const straddle = straddleLabel(stakes, currencySymbol);
  const blinds = stakesLabel(stakes, currencySymbol);
  return straddle === null ? blinds : `${blinds} · ${straddle}`;
}

/**
 * Set the mode and keep the amount honest in the same move.
 *
 * Turning the straddle off drops its figure; turning it on with nothing set
 * seeds it at twice the big blind, which is what a straddle is. Doing both
 * here rather than at the two call sites is the difference between a rule and
 * a convention.
 */
export function withStraddle(stakes: Stakes, mode: StraddleMode): Stakes {
  if (mode === 'none') return { ...stakes, straddle: 'none', straddleAmount: null };
  return {
    ...stakes,
    straddle: mode,
    straddleAmount: stakes.straddleAmount ?? ((stakes.big * 2) as Money),
  };
}

/** Whether two stakes say the same thing, field for field. */
export function sameStakes(a: Stakes, b: Stakes): boolean {
  return (
    a.small === b.small &&
    a.big === b.big &&
    a.straddle === b.straddle &&
    a.straddleAmount === b.straddleAmount
  );
}
