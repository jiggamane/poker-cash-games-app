/**
 * Rounding, as it applies to the stacks themselves.
 *
 * `design/handoff-E2/docs/E2-rounding.md`, cut 31 August. A group that plays
 * for thousands does not want to count $2,613 into a phone and then be handed
 * a settle-up in ones — so the step is set where the stacks are entered, and
 * every figure after it follows from the rounded stacks.
 *
 * TWO KINDS OF ROUNDING NOW LIVE IN THIS PACKAGE and they are not the same
 * thing. `granularityOf` in `money.ts` is how coarsely a RULE DIVIDES — what
 * the bill takes off each winner — and it has been here since rev 18. This is
 * how coarsely a STACK IS COUNTED, which the addendum adds. They share one
 * setting on purpose: a table settling in fifties wants both, and two controls
 * both called Rounding meaning different things is how an interface starts
 * disagreeing with itself. One step, `RoundingMode`, read two ways.
 *
 * NOTHING HERE ROUNDS A NET. The addendum is explicit — "every stack is
 * rounded, then nets are computed from rounded stacks; never round a net
 * directly" — and the reason is that a rounded net does not add up: six nets
 * rounded independently sum to something the table does not have. Rounding the
 * stacks moves the discrepancy to one place, once, where it can be named.
 *
 * WHERE THE DIFFERENCE GOES is the piggy bank, which is the only place it may
 * go: `remainder = Σ rounded − Σ raw`, and the piggy bank funds it or keeps it.
 * That is a decision about somebody's money, so `settle()` makes it and this
 * file does not — here there is only the arithmetic and the count of what it
 * would cost.
 */

import { money, sum, ZERO, type Money } from './money';
import type { PlayerId } from './types';

/**
 * Half away from zero, at a step of whole units.
 *
 * `$965` at $10 is `$970` and not `$960`: banker's rounding is right for a
 * long column of figures and wrong for a room of people, where "it went down
 * and yours went up" is a conversation nobody wants at 1am. The addendum names
 * the rule and the example.
 *
 * A step of 1 is the identity, which is what makes "off" a step rather than a
 * special case everything downstream has to test for.
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

/** One player's stack, before and after the step. */
export interface CountedStack {
  /** What the host actually counted. Never rewritten. */
  raw: Money;
  /** What the night settles from. */
  rounded: Money;
  /** `rounded − raw`, signed. The term on their receipt. */
  by: Money;
}

export interface StackRounding {
  /** Whole units. 1 is off. */
  step: number;
  /** Whether the step does anything at all — false at a step of 1. */
  on: boolean;
  counted: ReadonlyMap<PlayerId, CountedStack>;
  /** `Σ rounded − Σ raw`. Positive means the step invented money. */
  remainder: Money;
  /**
   * The biggest single distortion, NOT the average.
   *
   * It is the figure an admin gets asked about at the table — "my stack moved
   * by how much" — and an average answers a question nobody asks. Zero when
   * nothing has been counted yet, which the sheet says in words instead.
   */
  worst: Money;
  /** How many stacks the figures above were computed from. */
  stacks: number;
}

/**
 * What a step would do to tonight's counted stacks.
 *
 * PURE, AND DELIBERATELY IGNORANT OF THE RULES. E2 needs this while the count
 * is still going — before the books balance and long before `settle()` will
 * run — so it takes the counts and a step and nothing else. The sheet's four
 * sub-lines are four calls to it.
 */
export function stackRounding(
  finalCounts: ReadonlyMap<PlayerId, Money>,
  step: number,
): StackRounding {
  const counted = new Map<PlayerId, CountedStack>();
  let worst = ZERO;

  for (const [playerId, raw] of finalCounts) {
    const rounded = roundToStep(raw, step);
    const by = money(rounded - raw);
    counted.set(playerId, { raw, rounded, by });
    if (Math.abs(by) > Math.abs(worst)) worst = money(Math.abs(by));
  }

  return {
    step,
    on: step > 1,
    counted,
    remainder: sum([...counted.values()].map((c) => c.by)),
    worst,
    stacks: counted.size,
  };
}

/** The rounded stacks alone, in the shape `settle()` and `endedWith` take. */
export function roundedCounts(rounding: StackRounding): ReadonlyMap<PlayerId, Money> {
  return new Map([...rounding.counted].map(([id, c]) => [id, c.rounded]));
}
