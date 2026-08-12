/**
 * Money — whole currency units, always an integer.
 *
 * The design is explicit: whole units, no cents, no rounding settings. This
 * module is the only place allowed to make a number into Money, which means
 * there is exactly one gate a fractional value would have to get through, and
 * it throws.
 *
 * Everything here is pure. This file is imported by BOTH the app and the
 * server edge function, so the settlement math has one implementation rather
 * than two that must be kept identical by hand.
 */

/** A whole number of currency units. Never fractional. */
export type Money = number & { readonly __brand: unique symbol };

/** Thrown when a value that must be money is not a whole number. */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

/**
 * The only way to create Money. Rejects anything that is not a safe integer —
 * floats, NaN, Infinity, and values beyond 2^53 where integer arithmetic stops
 * being exact.
 */
export function money(value: number): Money {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new MoneyError(`Money must be a finite number, got ${String(value)}`);
  }
  if (!Number.isInteger(value)) {
    throw new MoneyError(
      `Money must be a whole number of units, got ${value}. ` +
        `This app has no cents — if you are here because of a percentage, use percentOf() or allocate().`,
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`Money ${value} is too large to be exact`);
  }
  return value as Money;
}

/** Money that must not be negative (an amount, as opposed to a result). */
export function positiveMoney(value: number): Money {
  const m = money(value);
  if (m <= 0) throw new MoneyError(`Expected a positive amount, got ${m}`);
  return m;
}

export const ZERO = money(0);

export function add(...values: readonly Money[]): Money {
  return money(values.reduce<number>((a, b) => a + b, 0));
}

export function subtract(a: Money, b: Money): Money {
  return money(a - b);
}

export function negate(a: Money): Money {
  return money(-a);
}

export function sum(values: readonly Money[]): Money {
  return add(...values);
}

/**
 * A whole percentage of an amount, rounded HALF UP.
 *
 * Half up, not down: the handoff's worked night is explicit that 5% of $430 is
 * 21.5 and must charge $22. It is computed per person from their own figure,
 * never from a pooled total, so the parts of a percentage rule are simply
 * summed rather than allocated.
 *
 * Where a fixed total has to be divided between people instead, use allocate()
 * — that is what guarantees the pieces add back up to the whole.
 */
export function percentOf(amount: Money, wholePercent: number): Money {
  if (!Number.isInteger(wholePercent) || wholePercent < 0 || wholePercent > 100) {
    throw new MoneyError(`Percentage must be a whole number 0–100, got ${wholePercent}`);
  }
  if (amount < 0) throw new MoneyError(`Cannot take a percentage of a negative amount (${amount})`);
  // Integer arithmetic throughout — adding half the divisor before flooring is
  // half-up without ever creating a fractional value.
  return money(Math.floor((amount * wholePercent + 50) / 100));
}

/**
 * Split `total` across `weights` so that the parts sum EXACTLY to `total`.
 *
 * This is the app's one rounding rule, and it is the largest-remainder method:
 * give everyone their floor, then hand the leftover units out to whoever was
 * cut by the most. No unit is ever created or lost, which is the property that
 * makes settlement reconcile to zero.
 *
 * Ties are broken by position, never by object key order — determinism here is
 * what makes the whole settlement reproducible.
 *
 * Weights must be non-negative integers (typically money amounts, or 1s for an
 * equal split). If every weight is zero the total is split as evenly as
 * possible, so an "equal split among winners" still works when nobody won.
 */
export function allocate(
  total: Money,
  weights: readonly number[],
  granularity = 1,
): Money[] {
  if (total < 0) throw new MoneyError(`Cannot allocate a negative total (${total})`);
  if (!Number.isInteger(granularity) || granularity < 1) {
    throw new MoneyError(`Granularity must be a whole number of at least 1, got ${granularity}`);
  }
  if (weights.length === 0) {
    if (total !== 0) throw new MoneyError(`Cannot allocate ${total} across nobody`);
    return [];
  }
  for (const w of weights) {
    if (!Number.isInteger(w) || w < 0) {
      throw new MoneyError(`Weights must be non-negative whole numbers, got ${w}`);
    }
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  // Nobody has a share — fall back to an equal split.
  const effective = totalWeight === 0 ? weights.map(() => 1) : weights;
  const denominator = totalWeight === 0 ? weights.length : totalWeight;

  // Everyone's floor, in whole units of the granularity. Working from the exact
  // numerator keeps this integer arithmetic end to end.
  const base = effective.map(
    (w) => Math.floor((total * w) / (denominator * granularity)) * granularity,
  );

  /** How far short of their exact share someone is, scaled by the denominator. */
  const shortfall = (i: number) => total * effective[i] - base[i] * denominator;

  let remaining = total - base.reduce((a, b) => a + b, 0);

  // Hand out whole units, largest shortfall first. Ties go to the earlier
  // position, which is why callers sort payers by size of win before calling.
  const wholeUnits = Math.floor(remaining / granularity);
  const rank = base.map((_, i) => i).sort((a, b) => shortfall(b) - shortfall(a) || a - b);

  for (let i = 0; i < wholeUnits; i++) {
    base[rank[i % rank.length]] += granularity;
    remaining -= granularity;
  }

  // What is left is smaller than a single unit, so it cannot be divided further
  // at this granularity. It goes to whoever is still furthest from their exact
  // share — the mathematically fairest single recipient — which keeps the parts
  // summing to the total even though that one share is no longer a round unit.
  if (remaining > 0) {
    let best = 0;
    for (let i = 1; i < base.length; i++) {
      if (shortfall(i) > shortfall(best)) best = i;
    }
    base[best] += remaining;
  }

  return base.map(money);
}

/** Format for display: whole units, no cents, thousands separated. */
export function formatMoney(amount: Money, currencySymbol = '$'): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencySymbol}${Math.abs(amount).toLocaleString('en-US')}`;
}

/** Format a result, where the sign is the point: +$1,482 / -$1,230 / $0. */
export function formatSigned(amount: Money, currencySymbol = '$'): string {
  if (amount === 0) return `${currencySymbol}0`;
  const sign = amount > 0 ? '+' : '-';
  return `${sign}${currencySymbol}${Math.abs(amount).toLocaleString('en-US')}`;
}
