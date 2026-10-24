/**
 * Pot odds — what a call has to win to break even, against what the hand has.
 *
 * `design/handoff-odds-calculator`, "Pot odds, decided 24 October": an
 * experiment off the main screen, for Player 1 ("you"), shown only while an
 * exact result is on screen. It is arithmetic on the engine's own figure and it
 * adds nothing to it:
 *
 *   needs  = call ÷ (pot + call)        the share of the pot the call must win
 *   has    = Player 1's equity           wins plus a share of every tie
 *   money  = has × (pot + call) − call   what the call returns over many runs
 *
 * It states those and never says what to do about them: there is no "call" or
 * "fold" in this module or on its screen.
 *
 * ALL OF IT IS INTEGER. Equity is counted by the engine in whole units of
 * 1/EQUITY_UNIT of a board — a win is 2520, a three-way tie 840 — so a seat's
 * equity over `boards` boards is `units / (EQUITY_UNIT × boards)` exactly. The
 * `equity` the engine hands out is that quotient as a float; multiplying it
 * back by `EQUITY_UNIT × boards` lands within a rounding error of a whole
 * number, and this rounds to it and REFUSES if it is not close — a figure that
 * is not a whole number of units is not an equity this engine made. From there
 * everything is integers, and the one product that can pass 2^53 (units × the
 * pot) is taken in BigInt.
 *
 * Money is whole units here as everywhere (`money.ts`: no cents), so the money
 * line is ROUNDED to a whole unit, half away from zero — the same rule for a
 * gain and a loss of the same size, which half-up on a negative would not be.
 * The exact quotient is never shown; it is what the percentages are for.
 */

import { money, MoneyError, type Money } from '../money';
import { EQUITY_UNIT, type SeatOdds } from './odds';

/**
 * The largest pot or call. Nine digits is what the app's keypad can type
 * (`typedAmount.ts`); beyond it nothing here is a real table.
 */
export const MAX_POT_AMOUNT = 999_999_999;

export interface PotOdds {
  /**
   * Why there is nothing to compare yet, or `null`. A call of nothing needs
   * nothing; a screen shows `has` on its own until the call is typed.
   */
  problem: string | null;
  /** The share of the pot the call must win, in hundredths of a percent: 2500 is 25.00%. */
  needsHundredths: number;
  /** Player 1's equity in the same unit: 4091 is 40.91%. */
  hasHundredths: number;
  /** `has × (pot + call) − call`, rounded to a whole unit, half away from zero. */
  returns: Money;
}

/** Hundredths of a percent as the screen writes them: `2500` → `25.00%`. */
export function formatHundredths(h: number): string {
  if (!Number.isInteger(h) || h < 0 || h > 10_000) {
    throw new MoneyError(`Not a share of a whole: ${h} hundredths of a percent`);
  }
  return `${Math.floor(h / 100)}.${String(h % 100).padStart(2, '0')}%`;
}

const amount = (name: string, v: number): number => {
  if (!Number.isSafeInteger(v) || v < 0) throw new MoneyError(`${name} must be a whole amount, 0 or more; got ${v}`);
  if (v > MAX_POT_AMOUNT) throw new MoneyError(`${name} is more than ${MAX_POT_AMOUNT}; got ${v}`);
  return v;
};

/** `a ÷ b` in hundredths of a percent, rounded half up. Both whole, `b` > 0. */
const hundredths = (a: bigint, b: bigint): number => Number((a * 20_000n + b) / (2n * b));

/** `a ÷ b` rounded half away from zero. `b` > 0. */
const roundAway = (a: bigint, b: bigint): bigint => {
  const neg = a < 0n;
  const q = ((neg ? -a : a) * 2n + b) / (2n * b);
  return neg ? -q : q;
};

/**
 * @param pot    the pot before the call, whole units, 0 or more
 * @param call   what Player 1 must put in to call, whole units
 * @param seat   Player 1's line of the odds result
 * @param boards how many ways the board was finished — `Odds.boards`
 */
export function potOdds(pot: number, call: number, seat: Pick<SeatOdds, 'equity'>, boards: number): PotOdds {
  amount('The pot', pot);
  amount('The call', call);
  if (!Number.isSafeInteger(boards) || boards < 1) throw new MoneyError(`Boards must be a whole number, 1 or more; got ${boards}`);
  const whole = EQUITY_UNIT * boards;
  const exact = seat.equity * whole;
  const units = Math.round(exact);
  if (!Number.isFinite(exact) || Math.abs(exact - units) > 1e-3 || units < 0 || units > whole) {
    throw new MoneyError(`An equity of ${seat.equity} is not a whole number of units over ${boards} boards`);
  }

  const U = BigInt(whole);
  const u = BigInt(units);
  const hasHundredths = hundredths(u, U);
  if (call === 0) {
    return { problem: 'There is no call to weigh.', needsHundredths: 0, hasHundredths, returns: money(0) };
  }
  const P = BigInt(pot) + BigInt(call);
  const needsHundredths = hundredths(BigInt(call), P);
  const returns = Number(roundAway(u * P - BigInt(call) * U, U));
  return { problem: null, needsHundredths, hasHundredths, returns: money(returns) };
}
