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

import { formatMoney, granularityOf, type Money, type RoundingMode } from './money';
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
  { mode: 'dollars', chip: 'Off' },
  { mode: 'tens', chip: 'Nearest $10' },
  { mode: 'fifties', chip: 'Nearest $50' },
  { mode: 'hundreds', chip: 'Nearest $100' },
];

/*
 * THE FOUR ROWS THE SHEET DRAWS, and they changed on 31 August.
 *
 * They used to be Dollar · 10s · 100s · 1k, four chips in a row, because the
 * setting only reached what a RULE DIVIDES at and "settle to the nearest
 * hundred" is a thing you say about a division. `E2-rounding.md` moves the
 * setting to the count, where it snaps the stacks themselves, and names its own
 * four: Off, $10, $50, $100. `Off` is a listed option and not the absence of a
 * choice — the doc says so in as many words.
 *
 * `thousands` and `cents` are still in `RoundingMode` and still resolve: an old
 * night settled at either re-derives to the figures it closed with, which is
 * the whole reason the mode is snapshotted. They are simply no longer offered.
 */

/**
 * The control row, as it reads on E2, E4 and E6 — `Rounding · nearest $10`.
 *
 * ONE STRING FOR THREE SCREENS. Only E2 owns the setting; the other two draw
 * the same row and open the same sheet, and a second spelling of it on either
 * would be the app disagreeing with itself about what the night is set to.
 */
export function roundingRowLabel(mode: RoundingMode | null | undefined): string {
  const step = granularityOf(mode);
  return step === 1 ? 'Rounding · off' : `Rounding · nearest $${step.toLocaleString('en-US')}`;
}

/**
 * What that row says on its right — `stacks snap to $10`, or where a remainder
 * exists, where it went: `+$16 → piggy`.
 *
 * The second form is E4's, drawn on frames `4a`–`4d`, and it is the more useful
 * one wherever there is a settled figure to name: the question a row about
 * rounding actually gets asked is not what the step is but who paid for it.
 */
export function roundingRowValue(
  mode: RoundingMode | null | undefined,
  remainder?: Money | null,
): string {
  const step = granularityOf(mode);
  if (step === 1) return 'stacks as counted';
  if (remainder === null || remainder === undefined || remainder === 0) {
    return `stacks snap to $${step.toLocaleString('en-US')}`;
  }
  /* Signed, and pointing at where it landed. The piggy bank funds a positive
     remainder and keeps a negative one; the arrow says which way it went. */
  const sign = remainder > 0 ? '−' : '+';
  return `${sign}$${Math.abs(remainder).toLocaleString('en-US')} → piggy`;
}

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
 * What the setting does, for the line under its name on the money rules.
 *
 * REWRITTEN 31 AUGUST, because the setting grew a second effect and this
 * sentence described only the first. It said "what each rule takes is rounded
 * to the 10", which is still true and is no longer the half a host cares
 * about: since `E2-rounding.md` the stacks themselves snap to the step as they
 * are counted, and that is the change a person sees.
 *
 * Says nothing at all at whole dollars: that is what every night has always
 * done, and a row explaining the absence of a setting is noise on a screen
 * whose whole job is to make the settings that ARE unusual visible.
 */
export function roundingSentence(mode: RoundingMode | null | undefined): string {
  const step = granularityOf(mode);
  return step === 1
    ? 'Stacks are counted as they are, and each rule works out to the dollar'
    : `Stacks snap to $${step.toLocaleString('en-US')}, and so does what each rule takes`;
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

/**
 * The same destination as a term at the head of a line — "Bill", "Piggy bank".
 *
 * `destinationWord` above is the phrase inside a sentence and stays lower case
 * there; this is the same phrase where it opens a row of its own, which is the
 * only place in the app a destination is capitalised. E6's receipt draws
 * `Bill · share` and `Piggy bank`, and a screen doing its own `.toUpperCase()`
 * on the first letter is a screen that will get "Next Pot" wrong the day a
 * destination is two words with a small one second.
 */
export function destinationTerm(destination: RuleDestination): string {
  const word = destinationWord(destination);
  return word.charAt(0).toUpperCase() + word.slice(1);
}
