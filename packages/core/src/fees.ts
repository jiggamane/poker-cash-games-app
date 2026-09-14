/**
 * Fees that are not a share of a win.
 *
 * A percentage rake and a shared bill were the whole of the money model until
 * now, and between them they cannot say the two things private games charge
 * most often:
 *
 *   TIME     — "five dollars an hour each", or "twenty an hour for the room".
 *              The oldest house charge there is, and the only one that depends
 *              on something the ledger has never been asked for: how long
 *              people sat.
 *   PER HEAD — "ten off everybody for the cards and the chips", "five out of
 *              every buy-in". A stated amount per person, not a pot divided
 *              between them.
 *
 * The difference between those two families is the whole of this file, and it
 * is the distinction `RuleAmountKind` now carries:
 *
 *   A PER-PERSON KIND states what ONE person pays. The rule's total is
 *   whatever the people at the table add up to, and it is not known until they
 *   are counted. `split` says nothing — there is nothing to divide.
 *
 *   A ROOM-TOTAL KIND states what the TABLE pays. The total is fixed before
 *   anybody is charged, and `split` decides who carries how much of it.
 *
 * `percent` is a per-person kind and `fixed` is a room-total one, so the two
 * that existed before this file did are the two ends of a rule that now has
 * six values rather than two. Nothing about either changed.
 *
 * THE CLOCK IS NEVER READ HERE. A settlement is a pure function of what it is
 * handed — that is what makes a frozen night re-derive years later — so a time
 * fee is charged against MINUTES THAT WERE PASSED IN, counted by whoever holds
 * the clock. `SettlementInput.timing` is that figure, and it is snapshotted
 * with the night like every other input.
 */

import { money, type Money } from './money';
import type { MoneyRule, PlayerId, RuleAmountKind, RulePeriod } from './types';

/**
 * Kinds whose `amount` is what one person pays, or the rate one person pays at.
 *
 * A rule of one of these kinds has no total to divide, which is why `split` is
 * not read for it and a split by hand is refused outright: an amount typed
 * against a name and an amount charged per head are two answers to one
 * question. `manualCharges` is still the way to overrule one person, exactly
 * as it is for a percentage.
 */
const PER_PERSON: ReadonlySet<RuleAmountKind> = new Set<RuleAmountKind>([
  'percent',
  'per_player',
  'per_player_time',
  'per_buyin',
]);

/** Kinds that need a period and a running clock to mean anything. */
const BY_TIME: ReadonlySet<RuleAmountKind> = new Set<RuleAmountKind>([
  'per_player_time',
  'per_time',
]);

export const isPerPersonKind = (kind: RuleAmountKind): boolean => PER_PERSON.has(kind);
export const isTimeKind = (kind: RuleAmountKind): boolean => BY_TIME.has(kind);

/** The rate half of a time rule's label: "an hour", "a half hour", "30 min". */
export function periodName(period: RulePeriod): string {
  if (period.minutes === 60) return 'an hour';
  if (period.minutes === 30) return 'a half hour';
  if (period.minutes === 1) return 'a minute';
  if (period.minutes % 60 === 0) return `${period.minutes / 60} hours`;
  return `${period.minutes} min`;
}

/**
 * How many periods a stretch of minutes is charged as.
 *
 * The four answers are all in use somewhere, and a group that has argued about
 * one of them has argued about exactly this:
 *
 *   up       — every period begun is a period paid for. What "time" means in
 *              every card room: you sit down, you owe the half hour.
 *   nearest  — the friendlier reading of the same thing, and the one a host
 *              who is not running a business usually means.
 *   down     — only whole periods are charged. Fifty minutes is an hour's
 *              worth of poker and nothing is owed for it.
 *   prorate  — the exact fraction, to the group's step. Nobody's arrival time
 *              is an argument, which is the point of it.
 *
 * Returns a whole count for the first three and a fraction for `prorate`,
 * which is why `feeFor` below takes minutes rather than this figure.
 */
export function periodsOf(minutes: number, period: RulePeriod): number {
  const whole = Math.max(0, minutes) / period.minutes;
  switch (period.rounding) {
    case 'up':
      return Math.ceil(whole);
    case 'down':
      return Math.floor(whole);
    case 'nearest':
      return Math.round(whole);
    case 'prorate':
      return whole;
  }
}

/** What one person's time costs, in whole units of the group's step. */
function proratedFee(rate: Money, minutes: number, period: RulePeriod, granularity: number): Money {
  // Integer arithmetic throughout — half up to the group's step, exactly as
  // `percentOf` does it, and without ever holding a fractional amount.
  const divisor = period.minutes * granularity;
  return money(
    Math.floor((rate * Math.max(0, minutes) * 2 + divisor) / (2 * divisor)) * granularity,
  );
}

/** Everything a per-person fee is measured against, for one person. */
export interface FeeContext {
  /** How long this person sat, in whole minutes. */
  minutes: number;
  /** How many times they put money on the table — buy-ins and rebuys alike. */
  buyIns: number;
  /** The group's step, in whole units. Only a prorated fee is landed on it. */
  granularity: number;
}

/**
 * What one person owes a per-person rule, before any cap and before the host
 * overrules it by hand.
 *
 * A PERCENTAGE IS NOT HERE. It is per-person too, but it is a share of a win
 * rather than a multiple of an amount, and `settle()` has always taken it
 * through `percentOf`. Splitting that out would be a second implementation of
 * the one thing in this app nobody may implement twice.
 *
 * NOTHING BUT A PRORATED FEE IS ROUNDED. "Ten a head" charges ten, and a group
 * settling in fifties is not asking for it to become fifty — a stated amount
 * is as explicit as a share typed by hand, and the step lands the positions at
 * the end anyway. Only `prorate` produces a figure nobody stated, and that one
 * is landed on the step.
 */
export function feeFor(rule: MoneyRule, ctx: FeeContext): Money {
  switch (rule.amountKind) {
    case 'per_player':
      return rule.amount;
    case 'per_buyin':
      return money(rule.amount * Math.max(0, ctx.buyIns));
    case 'per_player_time': {
      const period = requirePeriod(rule);
      return period.rounding === 'prorate'
        ? proratedFee(rule.amount, ctx.minutes, period, ctx.granularity)
        : money(rule.amount * periodsOf(ctx.minutes, period));
    }
    default:
      // percent, fixed, per_time — none of them is a per-person multiple.
      return money(0);
  }
}

/**
 * What a room-total rule collects in total, before it is split between people.
 *
 * `fixed` is its own amount, which is what it has always been. `per_time` is
 * that amount for every period the table ran — the rent, the dealer's shift,
 * the hire of the chips.
 */
export function roomTotal(rule: MoneyRule, tableMinutes: number, granularity: number): Money {
  if (rule.amountKind !== 'per_time') return rule.amount;
  const period = requirePeriod(rule);
  return period.rounding === 'prorate'
    ? proratedFee(rule.amount, tableMinutes, period, granularity)
    : money(rule.amount * periodsOf(tableMinutes, period));
}

/** Never more than the rule's ceiling, where it has one. */
export function capped(amount: Money, rule: MoneyRule): Money {
  return rule.maxPerPlayer === undefined ? amount : money(Math.min(amount, rule.maxPerPlayer));
}

function requirePeriod(rule: MoneyRule): RulePeriod {
  if (rule.period === undefined) {
    throw new FeeError(`Rule "${rule.name}" is charged by time but names no period.`);
  }
  return rule.period;
}

export class FeeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeeError';
  }
}

/**
 * How long each person sat, from how long the table ran and who is on the
 * clock.
 *
 * Somebody the caller could not time is charged for the whole night. That is
 * the safe answer rather than the kind one: a fee that quietly charged nothing
 * for a person the app failed to time would take money off the other players
 * (a room total is divided between whoever is left) or hand the collector less
 * than the rule says, and neither is visible on any screen.
 */
export function minutesFor(
  playerId: PlayerId,
  timing: { tableMinutes: number; minutesByPlayer?: ReadonlyMap<PlayerId, number> } | undefined,
): number {
  if (timing === undefined) return 0;
  return Math.max(0, timing.minutesByPlayer?.get(playerId) ?? timing.tableMinutes);
}
