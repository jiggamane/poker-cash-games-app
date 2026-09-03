/**
 * Rounding, as it applies to where everyone ends up.
 *
 * `design/handoff-E2/docs/E2-rounding.md` set the step and put it on E2, and
 * that part stands: a group that plays for thousands does not want a settle-up
 * in ones, and the step is decided where the stacks are entered. What changed
 * on 2 September is WHAT GETS ROUNDED, and it changed because the old answer
 * left a gap.
 *
 * THE OLD RULE ROUNDED THE STACKS. Rule 3 of the addendum: every stack snaps to
 * the step, the nets follow from the rounded stacks, and rule 5 sent the
 * difference — `Σ rounded − Σ raw` — to the piggy bank, "the only place it may
 * go". That works, and it produces a night where two screens disagree about one
 * figure: the piggy-bank rule says it takes $184, the settlement hands it $200,
 * and nothing on the record explains the $16. Worse, the count itself was being
 * rewritten to make the arithmetic land, so the balance check on E2 was
 * comparing money that went in against chips nobody counted.
 *
 * THE NEW RULE ROUNDS THE POSITIONS, and it rounds them so that they still sum
 * to zero. Nothing is invented, nothing is destroyed, and there is no remainder
 * for anybody to absorb:
 *
 *   · Stacks are never touched. `endedWith` is what was counted, the balance
 *     check is exact, and a night that does not add up says so for real reasons.
 *   · Every rule takes exactly what the rule says it takes. The piggy bank's
 *     figure on the record IS the figure that moves at settlement.
 *   · Every party's position lands on the step, so every transfer is a multiple
 *     of it — for free, and without rounding a transfer a second time.
 *   · Nobody moves by a whole step. A couple of dollars go somebody's way; that
 *     is the price, it is bounded, and it is stated.
 *
 * WHY THE COLLECTOR IS ROUNDED TOO, and why it has to be. Positions sum to zero
 * only when the piggy bank is counted as a party — that is the invariant
 * `settle()` already asserts. If every party's position must be a multiple of
 * the step and they must sum to zero, then the piggy bank has to be one of the
 * parties that moves: leave it out and the players alone would have to sum to
 * −$184, which is not a multiple of $10, and no set of rounded figures can do
 * it. So the tin lands on $190 rather than $184. That is the one number the
 * room sees, everywhere, and it is what it actually receives.
 *
 * LARGEST REMAINDER, WHICH IS ALREADY THE HOUSE METHOD. `allocate()` in
 * `money.ts` divides a rule this way — floors first, then the odd units to
 * whoever came closest to earning one — and the bill's 110 / 31 / 29 comes out
 * of it. The same rule is applied here to the positions. It is the allocation
 * that minimises the total distance moved, and the tie-break is fixed so that
 * one night always settles one way.
 */

import { money, ZERO, type Money } from './money';
import type { PlayerId } from './types';

/**
 * Half away from zero, at a step of whole units.
 *
 * `$965` at $10 is `$970` and not `$960`: banker's rounding is right for a long
 * column of figures and wrong for a room of people, where "it went down and
 * yours went up" is a conversation nobody wants at 1am.
 *
 * A step of 1 is the identity, which is what makes "off" a step rather than a
 * special case everything downstream has to test for.
 *
 * NOT WHAT THE SETTLEMENT USES. Rounding each figure independently is exactly
 * what does not add up — see `roundPositions` below. This is for previewing one
 * amount on its own, and for `verify.ts`, which re-checks a night settled under
 * the old stack rule.
 */
export function roundToStep(amount: Money, step: number): Money {
  if (!Number.isInteger(step) || step < 1) {
    throw new RangeError(`A rounding step must be a whole number of units, got ${step}`);
  }
  if (step === 1) return amount;

  const sign = amount < 0 ? -1 : 1;
  const size = Math.abs(amount);
  return money(sign * Math.round(size / step) * step);
}

/** One party's position, before and after the step. */
export interface RoundedPosition {
  /** Where the rules actually left them. Never rewritten. */
  exact: Money;
  /** What the night settles at. A multiple of the step. */
  rounded: Money;
  /** `rounded − exact`, signed. The term on their receipt. */
  by: Money;
}

export interface PositionRounding {
  /** Whole units. 1 is off. */
  step: number;
  /** Whether the step does anything at all — false at a step of 1. */
  on: boolean;
  positions: ReadonlyMap<PlayerId, RoundedPosition>;
  /**
   * The biggest single move, NOT the average.
   *
   * It is the figure an admin gets asked about at the table — "my net moved by
   * how much" — and an average answers a question nobody asks. Always less than
   * one step, which is the guarantee the sheet can state before anything has
   * been counted.
   */
  worst: Money;
  /** How many parties were apportioned. */
  parties: number;
}

/**
 * Put every position on the step without changing what they add up to.
 *
 * The input must sum to zero — that is what a settled night is, and it is what
 * makes a remainder-free answer possible at all. `settle()` asserts it before
 * and after; this refuses rather than quietly inventing money.
 *
 * FLOORS FIRST, THEN THE ODD STEPS TO WHOEVER CAME CLOSEST. Floor is taken
 * towards negative infinity for everybody, winners and losers alike, so each
 * party's shortfall is a number in `[0, step)` and the k parties with the
 * largest shortfall are handed one step each. k is `Σ shortfall / step` and is
 * always a whole number, because the exact positions sum to zero and every
 * floor is a multiple of the step.
 *
 * TIES ARE BROKEN BY THE POSITION ITSELF, then by id — never by map order.
 * Determinism here is what makes a settlement reproducible: the same night
 * re-opened next week produces the same figures, and the same night settled on
 * two phones agrees.
 */
export function roundPositions(
  exact: ReadonlyMap<PlayerId, Money>,
  step: number,
): PositionRounding {
  if (!Number.isInteger(step) || step < 1) {
    throw new RangeError(`A rounding step must be a whole number of units, got ${step}`);
  }

  const ids = [...exact.keys()];
  const positions = new Map<PlayerId, RoundedPosition>();

  if (step === 1 || ids.length === 0) {
    for (const id of ids) {
      const v = exact.get(id)!;
      positions.set(id, { exact: v, rounded: v, by: ZERO });
    }
    return { step, on: step > 1, positions, worst: ZERO, parties: ids.length };
  }

  const total = ids.reduce((running, id) => running + exact.get(id)!, 0);
  if (total !== 0) {
    throw new RangeError(
      `Positions must sum to zero before they can be rounded, got ${total}. ` +
        'Rounding cannot invent the difference.',
    );
  }

  /* Towards negative infinity for everyone. −417 at a step of 10 floors to
     −420 and is short by 3, exactly as 903 floors to 900 and is short by 3 —
     one rule for winners and losers, which is the whole point of it. */
  const floor = ids.map((id) => Math.floor(exact.get(id)! / step) * step);
  const short = ids.map((id, i) => exact.get(id)! - floor[i]!);

  /* Whole and non-negative: Σ exact is zero and every floor is a multiple of
     the step, so Σ short is too. Rounded to shake off float dust from the
     division above — the arithmetic is integral, the intermediate is not. */
  const spare = Math.round(short.reduce((a, b) => a + b, 0) / step);

  const rank = ids
    .map((_, i) => i)
    .sort(
      (a, b) =>
        short[b]! - short[a]! ||
        exact.get(ids[b]!)! - exact.get(ids[a]!)! ||
        (ids[a]! < ids[b]! ? -1 : 1),
    );

  for (let i = 0; i < spare; i++) floor[rank[i]!] += step;

  let worst = ZERO;
  for (const [i, id] of ids.entries()) {
    const v = exact.get(id)!;
    const by = money(floor[i]! - v);
    positions.set(id, { exact: v, rounded: money(floor[i]!), by });
    if (Math.abs(by) > Math.abs(worst)) worst = money(Math.abs(by));
  }

  return { step, on: true, positions, worst, parties: ids.length };
}
