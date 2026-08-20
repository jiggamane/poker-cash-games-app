/**
 * What a money rule's terms are, said in words.
 *
 * X1c draws the bill row as **"Bill · by size of win"** and the piggy bank row as
 * **"Piggy bank · 5%"**, and `14-invite-and-watcher.md` § 5 is explicit about why
 * that second half exists at all: *"a watcher cannot ask the host what the
 * split was at 00:52."* A settled night has to carry its own terms on its face.
 *
 * It is also explicit that **neither sentence may be hard-coded** — the words
 * come from the session's rule snapshot, which is what the night was actually
 * closed with. A screen that wrote "by size of win" into its own markup would
 * keep saying it after the group changed the rule, and would say it about
 * nights settled under the old one. So the mapping lives here, next to the
 * type it reads, and every screen asks rather than tells.
 *
 * The stored `split` values keep their original names — `by_percent` is what is
 * written into every settled night on the server, and renaming a value to match
 * a label is how a ledger stops reading back. The label is a function of the
 * value, not the value itself.
 */

import { formatMoney, type Money } from './money';
import type { MoneyRule, RuleCharge, RuleSplit } from './types';

/**
 * How a fixed total was divided, in the design's own words.
 *
 * `by_percent` is "by size of win" — S62 made it the default for a bill, and
 * the older even split is still selectable and still drawn by the E-series.
 * Who pays changes the sentence for an even split, because "evenly" between
 * three winners and "evenly" across a table of six are different bills.
 */
export function splitSentence(split: RuleSplit, charge: RuleCharge = 'winners_only'): string {
  switch (split) {
    case 'by_percent':
      return 'by size of win';
    case 'evenly':
      return charge === 'everyone_flat' ? 'evenly across the table' : 'evenly between the winners';
    case 'custom':
      return 'set by the host';
  }
}

/**
 * The half of a row that follows the rule's name.
 *
 * A percentage rule states its percentage — that IS its terms, and how the
 * remainder is shared is an implementation detail nobody at a table argues
 * about. A fixed sum states how it was split, which is exactly what gets
 * argued about.
 */
export function ruleTerms(rule: Pick<MoneyRule, 'amountKind' | 'amount' | 'split' | 'charge'>): string {
  return rule.amountKind === 'percent'
    ? `${rule.amount}%`
    : splitSentence(rule.split, rule.charge);
}

/** "Bill · by size of win". The whole row label, name included. */
export function ruleLabel(rule: Pick<MoneyRule, 'name' | 'amountKind' | 'amount' | 'split' | 'charge'>): string {
  return `${rule.name} · ${ruleTerms(rule)}`;
}

/**
 * The line under a rule's name on the O4 list — "how much · who pays · who
 * holds it", in that order, because "10% off my win" and "10% of the pot" are
 * different evenings.
 *
 * It lives here rather than on a screen because the same sentence is now read
 * at four moments — the club's defaults, the game being set up, tonight's
 * rules, and the deductions being checked — and a sentence written four times
 * is four sentences. A bill states what has been spent instead of an amount,
 * because a bill's amount IS the spending.
 *
 * `taken` is what the rule has actually taken so far tonight, appended only
 * where the engine has a figure to give. Nothing here computes anything: every
 * number is passed in, already worked out.
 */
export function ruleDetail(
  rule: Pick<
    MoneyRule,
    'amountKind' | 'amount' | 'split' | 'charge' | 'destination' | 'collectorPlayerId'
  >,
  context: {
    /** What the bill has cost so far. Only read for a bill-destination rule. */
    spent?: Money;
    /** What this rule has taken tonight, if the night can say yet. */
    taken?: Money;
    /** The collector's name, resolved by whoever holds the roster. */
    collectorName?: string;
  } = {},
): string {
  const how =
    rule.destination === 'bill'
      ? `${formatMoney(context.spent ?? (0 as Money))} spent so far`
      : rule.amountKind === 'percent'
        ? `${rule.amount}% of win`
        : `${formatMoney(rule.amount)} fixed`;

  const who =
    rule.split === 'custom'
      ? 'split by hand'
      : rule.charge === 'everyone_flat'
        ? 'everyone at the table'
        : rule.split === 'by_percent'
          ? 'winners, by size of win'
          : 'split by winners';

  const holder =
    rule.destination === 'bill'
      ? 'paid back to whoever bought it'
      : rule.collectorPlayerId === '' || context.collectorName === undefined
        ? 'held by the group'
        : `${context.collectorName} collects`;

  const tail = context.taken === undefined ? '' : ` · ${formatMoney(context.taken)} tonight`;
  return `${how} · ${who} · ${holder}${tail}`;
}
