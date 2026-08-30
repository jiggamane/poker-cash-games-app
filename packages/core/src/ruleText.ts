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

import { formatMoney, type Money, type RoundingMode } from './money';
import type { MoneyRule, RuleCharge, RuleDestination, RuleSplit } from './types';

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

/**
 * How coarsely the group settles, offered as a row of chips.
 *
 * The four the interface offers, and the labels are the decided copy: rev 18's
 * S14 draws the rounding control as an open chip row reading
 * "Cent · Dollar · 10s · 50s · 100s · 1k". `RoundingMode` still carries all
 * six values because they are written into `book.rounding_mode` on the server
 * — a stored night set to fifties keeps settling in fifties and reads back
 * correctly below. What is OFFERED is these four: cents needs amounts held in
 * minor units, which is not built, and fifties has never been asked for.
 */
export const ROUNDING_CHOICES: ReadonlyArray<{ mode: RoundingMode; chip: string }> = [
  { mode: 'dollars', chip: 'Dollar' },
  { mode: 'tens', chip: '10s' },
  { mode: 'hundreds', chip: '100s' },
  { mode: 'thousands', chip: '1k' },
];

/**
 * The rounding rule as a row's value — "Whole dollars".
 *
 * ⚠ ONE STRING IS DRAWN AND FIVE ARE NOT. L5 draws the rounding row reading
 * "Whole dollars" and no frame shows the row in any other state, so the rest
 * are written to the same grammar and FLAGGED rather than passed off as
 * decided copy (`11-bill-and-piggy-bank.md`, and the handoff's rule that a
 * missing string is raised, not invented).
 */
export function roundingLabel(mode: RoundingMode | null | undefined): string {
  switch (mode ?? 'dollars') {
    case 'cents':
      return 'Cents';
    case 'dollars':
      return 'Whole dollars';
    case 'tens':
      return 'Nearest 10';
    case 'fifties':
      return 'Nearest 50';
    case 'hundreds':
      return 'Nearest 100';
    case 'thousands':
      return 'Nearest 1,000';
  }
}

/**
 * What the rule does, for the line under its name.
 *
 * Says nothing at all at whole dollars: that is what every night has always
 * done, and a row explaining the absence of a setting is noise on a screen
 * whose whole job is to make the settings that ARE unusual visible.
 */
export function roundingSentence(mode: RoundingMode | null | undefined): string {
  return (mode ?? 'dollars') === 'dollars'
    ? 'What each rule takes is worked out to the dollar'
    : `What each rule takes is rounded to the ${roundingLabel(mode).replace('Nearest ', '')}`;
}

/**
 * Where a rule's money went, in one or two words — "bill", "piggy bank".
 *
 * The long form of this sentence is on O2 and reads "…· the piggy bank", and
 * these are those same words with the article off, so a line that has to name
 * a destination in a row of figures says what every other screen says. The
 * stored value is `kitty` and no reader ever sees that word: see
 * `RuleDestination`.
 *
 * It is here rather than on a screen because three screens now name a
 * destination — the club's rules, settle-up, and the second line of a player's
 * row on E6 — and a fourth spelling of "piggy bank" is how an interface starts
 * disagreeing with itself about what it calls the money.
 */
export function destinationWord(destination: RuleDestination): string {
  switch (destination) {
    case 'bill':
      return 'bill';
    case 'kitty':
      return 'piggy bank';
    case 'host_fee':
      return 'host';
    case 'next_pot':
      return 'next pot';
  }
}
