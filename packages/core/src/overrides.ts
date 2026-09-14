/**
 * Hand-typed shares, read from the outside.
 *
 * `settle()` is what APPLIES a share the host typed against a name — see
 * `MoneyRule.manualCharges` and the fixed-total branch of `applyDeduction`.
 * What a SCREEN needs is the two questions it has to answer before the host
 * types anything: what is this person on now, and how much is there left to
 * give them.
 *
 * It lives here rather than on the screen for the reason `CLAUDE.md` gives: the
 * ceiling below is the same figure the engine will check the typed amount
 * against, and a screen computing its own version of it would be a second
 * implementation of the rule that decides whether a night can be closed at all.
 * Get it wrong in the screen's favour and the host types a figure the sheet
 * accepts, walks back to the deductions, and finds the night refusing to
 * settle with no way of knowing which figure did it.
 */

import { money, type Money } from './money';
import { isPerPersonKind, roomTotal } from './fees';
import type { ResolvedLedger } from './ledger';
import type { MoneyRule, PlayerId } from './types';

/** What the host has typed against this name, if anything. */
export function manualChargeOf(rule: MoneyRule, playerId: PlayerId): Money | undefined {
  return rule.manualCharges?.find((m) => m.playerId === playerId)?.amount;
}

/** Has anybody on this rule been set by hand? */
export const hasManualCharges = (rule: MoneyRule): boolean =>
  (rule.manualCharges ?? []).length > 0;

/**
 * The total this rule has to cover tonight, or null if it has none.
 *
 * A BILL IS ITS EXPENSES — the amount stored on the rule is a placeholder the
 * tab overwrites — and a fixed sum is the sum it states. A RULE THAT STATES
 * WHAT ONE PERSON PAYS has no total at all: what it charges is what the
 * collector receives, so there is nothing for one person's share to be taken
 * out of. That was always true of a percentage and it is equally true of "ten
 * a head" — which is why this asks the family rather than the kind.
 *
 * `tableMinutes` is only read by a room charged by the hour, whose total is
 * its rate times the periods the table ran. Left out, such a rule reports no
 * total: no ceiling is offered rather than a wrong one.
 */
export function ruleTotal(
  rule: MoneyRule,
  ledger: ResolvedLedger,
  tableMinutes?: number,
): Money | null {
  if (rule.destination === 'bill') return ledger.billableExpenses;
  if (isPerPersonKind(rule.amountKind)) return null;
  if (rule.amountKind === 'per_time') {
    return tableMinutes === undefined ? null : roomTotal(rule, tableMinutes, 1);
  }
  return rule.amount;
}

/**
 * The most this one person may be set to, given what everybody else was set to.
 *
 * Null means no ceiling: on a rule that states what one person pays, the
 * collector simply receives whatever is charged, so any figure settles.
 *
 * On a rule with a total to cover, a share is taken out of that total and the
 * REST is re-divided between the people who have not been named. Type more
 * than there is and the arithmetic has nowhere to go — which is exactly what
 * `settle()` refuses, so this is the same bound, stated before the fact.
 */
export function chargeCeiling(
  rule: MoneyRule,
  ledger: ResolvedLedger,
  playerId: PlayerId,
  tableMinutes?: number,
): Money | null {
  const total = ruleTotal(rule, ledger, tableMinutes);
  if (total === null) return null;

  const others = (rule.manualCharges ?? [])
    .filter((m) => m.playerId !== playerId)
    .reduce((a, m) => a + m.amount, 0);

  return money(Math.max(total - others, 0));
}
