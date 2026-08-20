/**
 * Money — whole currency units, always an integer.
 *
 * The design is explicit: whole units, no cents. This module is the only place
 * allowed to make a number into Money, which means there is exactly one gate a
 * fractional value would have to get through, and it throws.
 *
 * How COARSELY a group settles is a separate question and it is a group rule —
 * see `RoundingMode` at the foot of this file. It never makes an amount
 * fractional; it makes it a rounder whole number, and it is carried into the
 * settlement rather than applied to a figure on its way to a screen.
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
 * `granularity` is the group's rounding rule — see `granularityOf()`. At 1,
 * which is what every night has run at so far, this is exactly what it always
 * was: half up to the nearest whole unit. At 100 it is half up to the nearest
 * hundred, so 5% of a $1,620 win charges $100 rather than $81. That is not an
 * approximation of the percentage; it is what the group asked for, and a table
 * that settles in hundreds does not want to be handed a figure ending in 1.
 *
 * Where a fixed total has to be divided between people instead, use allocate()
 * — that is what guarantees the pieces add back up to the whole.
 */
export function percentOf(amount: Money, wholePercent: number, granularity = 1): Money {
  if (!Number.isInteger(wholePercent) || wholePercent < 0 || wholePercent > 100) {
    throw new MoneyError(`Percentage must be a whole number 0–100, got ${wholePercent}`);
  }
  if (amount < 0) throw new MoneyError(`Cannot take a percentage of a negative amount (${amount})`);
  if (!Number.isInteger(granularity) || granularity < 1) {
    throw new MoneyError(`Granularity must be a whole number of at least 1, got ${granularity}`);
  }
  // Integer arithmetic throughout — adding half the divisor before flooring is
  // half-up without ever creating a fractional value. The divisor is
  // 100 × granularity, so half of it is 50 × granularity and is still whole.
  return money(
    Math.floor((amount * wholePercent + 50 * granularity) / (100 * granularity)) * granularity,
  );
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
  // U+2212, not a hyphen: the boards set it that way because a minus is the
  // width of a digit and a hyphen is not, so a column of figures stays square.
  const sign = amount > 0 ? '+' : '−';
  return `${sign}${currencySymbol}${Math.abs(amount).toLocaleString('en-US')}`;
}

/**
 * A figure short enough for a column: 7k, 18.5k, 1.24M.
 *
 * ONLY WHERE THE ROOM IS FIXED AND THE EXACT FIGURE IS ELSEWHERE. This rounds,
 * and rounding money is a thing to do deliberately and rarely — the deductions
 * preview and the summary figures on a player card, where a wider number would
 * be cut in half by its own cell and "−4,5…" reads as an amount nobody owes.
 * Every one of those screens states the exact figure somewhere a tap away.
 *
 * Under a thousand nothing is abbreviated: "625" is already short and "0.6k"
 * would be both longer to read and wrong. From a thousand it is `k`, from a
 * million `M`.
 *
 * THREE SIGNIFICANT DIGITS AND NO MORE, which is what actually bounds the
 * width: a decimal while the scaled figure is under a hundred — 7k, 18.5k —
 * and none above it, 526k rather than 525.6k. That last one is not a nicety.
 * At one decimal throughout, "−525.6k" is seven glyphs and went straight
 * through the side of a 56-point column; "−526k" is five and does not.
 * A round result drops its decimal too: 7k, never 7.0k.
 *
 * The sign is the same U+2212 the boards set, for the same reason: a minus is
 * the width of a digit and a hyphen is not.
 */
export function formatCompact(amount: Money, currencySymbol = '$'): string {
  const sign = amount < 0 ? '\u2212' : '';
  const n = Math.abs(amount);
  if (n < 1_000) return `${sign}${currencySymbol}${n.toLocaleString('en-US')}`;

  /*
   * The unit is chosen AFTER rounding, not before. 999,999 divided by a
   * thousand is 999.999, which rounds to 1000.0 and prints "1000k" — a figure
   * nobody writes, and wider than the "1M" it means.
   */
  for (const [unit, suffix] of [
    [1_000, 'k'],
    [1_000_000, 'M'],
  ] as const) {
    const scaled = n / unit;
    const shown = scaled.toFixed(scaled < 100 ? 1 : 0).replace(/\.0$/, '');
    if (Number(shown) < 1_000) return `${sign}${currencySymbol}${shown}${suffix}`;
  }
  // Past a billion the app has bigger problems than a column width.
  return `${sign}${currencySymbol}${(n / 1_000_000).toFixed(0)}M`;
}

/**
 * The same, with the sign always shown — a compact `formatSigned`.
 *
 * `$0` has no sign, because zero is not a win or a loss and drawing it as one
 * is the single most confusing thing a results column can do.
 */
export function formatSignedCompact(amount: Money, currencySymbol = '$'): string {
  if (amount === 0) return `${currencySymbol}0`;
  return amount > 0
    ? `+${formatCompact(amount, currencySymbol)}`
    : formatCompact(amount, currencySymbol);
}

/**
 * Exact while it fits, compact past that — for a big figure in a fixed box.
 *
 * The rounding in `formatCompact` buys width, and width is only worth buying
 * when there is none left: turning $2,880 into $2.9k on a card with room for
 * both loses three dollars and gains nothing. So the caller names the point at
 * which its own box runs out, and everything under that is printed in full.
 *
 * `exactBelow` is a property of the LAYOUT, not of the money — how many digits
 * that column holds at that size — so it belongs at the call site, where
 * somebody can measure it, and not in a constant here.
 */
export function formatToFit(
  amount: Money,
  exactBelow: number,
  currencySymbol = '$',
): string {
  return Math.abs(amount) < exactBelow
    ? formatMoney(amount, currencySymbol)
    : formatCompact(amount, currencySymbol);
}

/** The same, signed: a result that stays a result however wide it gets. */
export function formatSignedToFit(
  amount: Money,
  exactBelow: number,
  currencySymbol = '$',
): string {
  return Math.abs(amount) < exactBelow
    ? formatSigned(amount, currencySymbol)
    : formatSignedCompact(amount, currencySymbol);
}

/**
 * How coarsely a group wants divided amounts rounded.
 *
 * This is a money rule, not a display setting: it changes what people actually
 * pay, so it is part of the rules snapshot a night is settled with.
 */
export type RoundingMode =
  | 'cents'
  | 'dollars'
  | 'tens'
  | 'fifties'
  | 'hundreds'
  | 'thousands';

/**
 * The granularity to hand to allocate(), in whole currency units.
 *
 * Unset means dollars, which is the behaviour every night has had so far.
 */
export function granularityOf(mode: RoundingMode | null | undefined): number {
  switch (mode ?? 'dollars') {
    case 'cents':
      // Amounts are whole units today. Honouring cents means storing minor
      // units throughout — a data migration, not a setting — so refuse rather
      // than silently rounding to dollars and taking the wrong money.
      throw new MoneyError(
        'Rounding to cents needs amounts stored in minor units, which is not built yet.',
      );
    case 'dollars':
      return 1;
    case 'tens':
      return 10;
    case 'fifties':
      return 50;
    case 'hundreds':
      return 100;
    case 'thousands':
      return 1000;
  }
}
