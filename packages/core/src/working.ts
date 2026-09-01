/**
 * One person's night, shown as the working.
 *
 * X1c draws a settled night as a net at the top and then the arithmetic that
 * produced it — in, out, result, bill, back, kitty — because a watcher opening
 * a night three weeks later cannot ask the host how the figure was reached.
 * That list is the answer to "why is my number this", and it is the reason the
 * screen exists at all.
 *
 * It lives in core rather than on the screen for the reason `CLAUDE.md` gives:
 * a screen that assembles its own rows is a second, untested implementation of
 * the same sum. Every figure below is read off `settle()`; nothing here adds
 * anything up. What this file decides is which rows there are, in what order,
 * and what each one is called — and the labels come off the night's own rule
 * snapshot, so a night settled under an older rule still describes itself
 * correctly. See `ruleText.ts`.
 */

import { money, type Money } from './money';
import { destinationTerm, ruleLabel } from './ruleText';
import type { SettlementResult } from './settlement';
import {
  UNACCOUNTED_ID,
  type MoneyRule,
  type PlayerId,
  type PlayerSettlement,
  type RuleDestination,
} from './types';

export type WorkingRowKind =
  | 'in'
  | 'out'
  | 'result'
  | 'charge'
  | 'credit'
  | 'holding'
  | 'rounding';

export interface WorkingRow {
  /** Stable across renders — the rule id where there is one. */
  key: string;
  /** "In", "Result", "Bill · by size of win", "Back to you · fronted the bill". */
  label: string;
  /**
   * What to show. Charges are NEGATIVE here: X1c draws them as −$29, and a row
   * that carried the magnitude and left the sign to the screen would be one
   * more place for a minus to go missing.
   */
  amount: Money;
  /**
   * `credit` came back to them; `holding` is the table's money in their hands.
   * A screen may total the first and must not total the second — see below.
   */
  kind: WorkingRowKind;
  /** Show the sign. In and Out are quantities; the rest are movements. */
  signed: boolean;
  /** Money that left the table — drawn in bone, per the tokens. */
  offTable: boolean;
}

/**
 * Whether this row's figure is a win/loss to be coloured.
 *
 * Only the result is. In and Out are quantities, a charge is bone, and a
 * reimbursement is neither a win nor money leaving — it is the reader getting
 * back what they already spent.
 */
export const tinted = (row: WorkingRow): boolean => row.kind === 'result';

/**
 * The working, in the order X1c draws it.
 *
 * Deductions follow the order the night applied them, and each rule's
 * reimbursement sits immediately under its own charge — that pairing is what
 * makes "-29 then +50" legible as one bill seen from both sides rather than as
 * two unrelated movements.
 *
 * A rule that did not touch this person contributes no row. A night where
 * somebody was charged nothing and paid nothing back is a night where the
 * result IS the net, and three empty rows saying so would be noise.
 */
export function workingRows(
  result: SettlementResult,
  rules: readonly MoneyRule[],
  playerId: PlayerId,
  currencySymbol = '$',
): WorkingRow[] {
  const person = result.players.find((p) => p.playerId === playerId);
  if (person === undefined) return [];

  const byId = new Map(rules.map((r) => [r.id, r]));

  const rows: WorkingRow[] = [
    { key: 'in', label: 'In', amount: person.boughtIn, kind: 'in', signed: false, offTable: false },
    { key: 'out', label: 'Out', amount: person.endedWith, kind: 'out', signed: false, offTable: false },
    {
      key: 'result',
      /*
       * OUT LESS IN, AND NOT `grossResult` — which since the rounding addendum
       * carries the step inside it. Three rows reading 1,000 / 965 / +35 would
       * be the one place in the app where the arithmetic on screen is wrong,
       * so the step gets a row of its own below and this one stays the
       * subtraction of the two above it.
       */
      label: 'Result',
      amount: money(person.endedWith - person.boughtIn),
      kind: 'result',
      signed: true,
      offTable: false,
    },
  ];

  for (const d of result.deductions) {
    const charged = d.charges.find((c) => c.playerId === playerId)?.amount ?? 0;
    const back = d.credits.find((c) => c.playerId === playerId)?.amount ?? 0;
    const rule = byId.get(d.ruleId);

    if (charged > 0) {
      rows.push({
        key: `${d.ruleId}:charge`,
        // The terms come off the snapshot: "Bill · by size of win". Without the
        // rule we can still name the money, which is better than a bare figure.
        label: rule === undefined ? d.name : ruleLabel(rule),
        amount: (0 - charged) as Money,
        kind: 'charge',
        signed: true,
        offTable: true,
      });
    }

    if (back > 0) {
      /*
       * A REIMBURSEMENT AND A COLLECTION ARE NOT THE SAME MOVEMENT, and this
       * is the one place in the working that says which is which. Money back
       * off a bill is theirs — they spent it at the shop and the table is
       * paying them for it. Money off the piggy bank is not: they are the
       * envelope, and the room's $126 sitting in their pocket is no more a
       * win than the chips were before the night started.
       *
       * `holding` is what lets a screen draw the second below its total
       * instead of inside it. Both are still in `finalPosition`, because the
       * transfers really do have to move the money to whoever is holding it.
       */
      rows.push({
        key: `${d.ruleId}:credit`,
        label: creditLabel(d.destination),
        amount: back as Money,
        kind: d.destination === 'bill' ? 'credit' : 'holding',
        signed: true,
        offTable: false,
      });
    }
  }

  /* The step, last and above whatever total the screen draws — the same place
     E6's receipt puts it, and for the same reason: it is theirs, it is part of
     their night, and it is not a rule taking anything off them. */
  if (person.roundedBy !== 0) {
    rows.push({
      key: 'rounding',
      label: `Rounded to ${stepLabel(result.rounding.step, currencySymbol)}`,
      amount: person.roundedBy,
      kind: 'rounding',
      signed: true,
      offTable: false,
    });
  }

  return rows;
}

/**
 * What a reimbursement row is called.
 *
 * "Back to you · fronted the bill" is decided copy (§ 3, use verbatim). The
 * other destinations reimburse a COLLECTOR rather than somebody who fronted an
 * expense, and no frame draws that row — the canonical night's kitty is held by
 * somebody who is not at the table, so it never appears.
 *
 * FLAGGED, not invented: the second string below is a placeholder for a state
 * the drawings do not cover, per the handoff's rule that a missing string gets
 * raised rather than written. It is reachable only when the reader is at the
 * table AND collects a non-bill rule.
 */
function creditLabel(destination: 'bill' | 'kitty' | 'host_fee' | 'next_pot'): string {
  return destination === 'bill'
    ? 'Back to you · fronted the bill'
    : 'Back to you · you collect it';
}

/**
 * What the rules took off ONE person, and gave back, gathered by kind.
 *
 * `workingRows` above is the same money spelled out a rule at a time, which is
 * what a screen with room for it shows. This is the compressed form, for the
 * one line under a name on E6: `$500 in, $620 out, bill: −$29 +$120`. Two bill
 * rules on one night are one `bill` here, because the reader is being told
 * where their money went and not how many rules were involved in sending it.
 *
 * IT IS IN CORE FOR THE REASON EVERY SUM IS. A screen that filtered the
 * deductions and added up the charges against a name would be a second
 * implementation of what `settle()` already worked out — `deductions.tsx` had
 * exactly that, and this replaces it.
 *
 * Order is the night's own: rules apply in `sortOrder` and the deductions come
 * back in that order, so the bill precedes the piggy bank on the screen if it
 * preceded it in the settlement.
 */
export interface PlayerDeduction {
  destination: RuleDestination;
  /** What came off them. Never negative — the sign is the reader's screen's. */
  charged: Money;
  /** What came back and is THEIRS: they fronted the bill and got paid for it. */
  credited: Money;
  /**
   * What came back and is NOT theirs: they collect this kind, so the rule's
   * whole take is now in their pocket on the room's behalf.
   *
   * Split off `credited` rather than added to it because the two answer
   * different questions. A screen printing "how did your night go" wants the
   * first and not the second; a screen printing "where did the money end up"
   * wants both. Before the split there was one field, every screen totalled
   * it, and the person holding the piggy bank read a $126 win they had not won.
   */
  held: Money;
}

export function playerDeductions(
  result: SettlementResult,
  playerId: PlayerId,
): PlayerDeduction[] {
  const byKind = new Map<RuleDestination, PlayerDeduction>();

  for (const d of result.deductions) {
    const charged = d.charges.find((c) => c.playerId === playerId)?.amount ?? 0;
    const back = d.credits.find((c) => c.playerId === playerId)?.amount ?? 0;
    if (charged === 0 && back === 0) continue;

    /* The same line `workingRows` draws above, and drawn from the same place:
       a bill pays back an outlay, every other kind hands over a float. */
    const mine = d.destination === 'bill';

    const running = byKind.get(d.destination);
    byKind.set(d.destination, {
      destination: d.destination,
      charged: ((running?.charged ?? 0) + charged) as Money,
      credited: ((running?.credited ?? 0) + (mine ? back : 0)) as Money,
      held: ((running?.held ?? 0) + (mine ? 0 : back)) as Money,
    });
  }

  return [...byKind.values()];
}

/**
 * One person's night split in two: what they won or lost, and what they are
 * merely carrying home for everybody else.
 *
 * `score + held === finalPosition`, always — this divides the engine's figure
 * and does not restate it. The engine is right to keep the two together, since
 * the transfers have to actually move the piggy bank to whoever holds it; what
 * the engine cannot do is decide which of the two a given screen is asking
 * about, and E6's player row is asking about the first.
 *
 * WHY IT IS IN CORE AT ALL, for a subtraction a screen could do in a line: the
 * screen would have to decide for itself which credits are a float, and that
 * decision — bill against every other destination — is already made twice in
 * this file. A third copy on a screen is the copy that goes stale when a
 * destination is added.
 */
export interface NightScore {
  /** Theirs: the table's result, after every rule, without the float. */
  score: Money;
  /** The room's, in their hands. Never negative. */
  held: Money;
}

export function nightScore(result: SettlementResult, playerId: PlayerId): NightScore {
  const person = result.players.find((p) => p.playerId === playerId);
  if (person === undefined) return { score: 0 as Money, held: 0 as Money };

  /*
   * TWO THINGS ARE HELD RATHER THAN WON, and the second arrived with the
   * rounding step. The float is the piggy bank's own money sitting in the
   * collector's pocket; `roundingAbsorbed` is what the same pocket paid out to
   * make everybody's stack a round number. A collector who is $16 lighter
   * because the table settles in tens is not $16 worse at poker.
   *
   * Their own stack rounding is NOT here. `roundedBy` is already inside
   * `grossResult`, it is theirs, and it stays in their score — which is what
   * makes it a term on their receipt above the `Net` rather than below it.
   */
  const float = playerDeductions(result, playerId).reduce(
    (running, d) => (running + d.held) as Money,
    0 as Money,
  );
  const held = (float - person.roundingAbsorbed) as Money;

  return { score: (person.finalPosition - held) as Money, held };
}

/**
 * Who ends the night holding one rule's money, where that is one person.
 *
 * The answer for every kind but a bill: the rule names a collector and the
 * whole take goes to them in a single credit. A bill has no answer — it is
 * paid back to whoever fronted the food, which is a list and not a collector,
 * and a line naming one of them would be naming the wrong person.
 *
 * It exists because taking the float off the collector's own row leaves the
 * money with nowhere to be named. E6 puts it under the deduction it belongs
 * to, so the block that says $126 went to the piggy bank also says who has it.
 */
export interface RuleCollector {
  playerId: PlayerId;
  name: string;
  amount: Money;
}

export function ruleCollector(result: SettlementResult, ruleId: string): RuleCollector | null {
  const deduction = result.deductions.find((d) => d.ruleId === ruleId);
  if (deduction === undefined || deduction.destination === 'bill') return null;
  if (deduction.credits.length !== 1) return null;

  const [credit] = deduction.credits;
  if (credit.amount === 0) return null;

  /* A collector who never sat down is still in the settlement — that is how
     they got the credit — so the name is always there to be found. */
  const person = result.players.find((p) => p.playerId === credit.playerId);
  if (person === undefined) return null;

  return { playerId: credit.playerId, name: person.name, amount: credit.amount };
}

/**
 * ONE PLAYER'S RECEIPT — every term behind the figure on their E6 row, in the
 * order the money moved. `design/handoff-E6/docs/E6-row-formula.md`, cut 31
 * August.
 *
 * IT REPLACES A SUB-LINE THAT COULD NOT BE MADE TO FIT. E6 as cut drew
 * `in $100 · out $250` under the name; a settled row actually has four to six
 * terms behind it — the bill can charge a share AND credit back what somebody
 * paid at the counter, and the piggy bank takes its cut — and two of them on a
 * line invites the reader to do arithmetic that does not reconcile. The row
 * now states the result; tapping it states the reason.
 *
 * WHAT THE ADDENDUM FIXES, and this function with it:
 *
 *   · NOTHING IS NETTED. The two bill terms stay separate, because somebody
 *     who paid the bill at the counter needs to see the credit rather than a
 *     merged `+$188`.
 *   · THE ORDER IS FIXED — cash out, buy-in, then the deductions in the order
 *     the group's rules define them, which is the order `settle()` applied
 *     them in.
 *   · `Bought in` IS NEGATIVE and `Cashed out` positive, so the block reads as
 *     a balance rather than as two totals. Signs are explicit everywhere but
 *     the first line.
 *   · A TERM OF $0 IS NOT RENDERED.
 *
 * THE FLOAT IS NOT A TERM (B27). A collector's piggy bank is not money the
 * night did to them, so it is not in this list and not in the `Net` it closes
 * on — that is `nightScore`'s score, and the two agree to the dollar because
 * these rows ARE the terms of it. Where the float went is named under the
 * deduction it came from.
 *
 * THE COPY IS GENDERLESS, which the board is not: it draws `Bill · his share`
 * and `Bill · he paid it` because the sample player is Petr, and the addendum
 * says in as many words that the code uses `· share` and `· paid it`.
 */
export interface ReceiptRow {
  /** Stable across renders. */
  key: string;
  /** "Cashed out", "Bought in", "Bill · share", "Bill · paid it", "Piggy bank". */
  label: string;
  /** Signed as drawn: what comes off is negative here. */
  amount: Money;
  /** Show a `+` on a positive. False for `Cashed out` alone. */
  signed: boolean;
}

export function receiptRows(
  result: SettlementResult,
  playerId: PlayerId,
  currencySymbol = '$',
): ReceiptRow[] {
  const person = result.players.find((p) => p.playerId === playerId);
  if (person === undefined) return [];

  const rows: ReceiptRow[] = [];

  if (person.endedWith !== 0) {
    rows.push({ key: 'out', label: 'Cashed out', amount: person.endedWith, signed: false });
  }
  if (person.boughtIn !== 0) {
    rows.push({
      key: 'in',
      label: 'Bought in',
      amount: (0 - person.boughtIn) as Money,
      signed: true,
    });
  }

  for (const d of playerDeductions(result, playerId)) {
    const term = destinationTerm(d.destination);

    if (d.charged > 0) {
      /* The qualifier only where there are two terms to tell apart. A piggy
         bank takes one bite and "Piggy bank · share" would be explaining a
         distinction the row does not have. */
      rows.push({
        key: `${d.destination}:charge`,
        label: d.credited > 0 ? `${term} · share` : term,
        amount: (0 - d.charged) as Money,
        signed: true,
      });
    }

    if (d.credited > 0) {
      rows.push({
        key: `${d.destination}:credit`,
        label: `${term} · paid it`,
        amount: d.credited,
        signed: true,
      });
    }
  }

  /*
   * THE STEP, LAST AND ABOVE THE NET — `E2-rounding.md`, "player receipts gain
   * one term, `Rounded to $10 +$5`, between the piggy bank line and Net".
   *
   * It is a term rather than a correction to `Cashed out` because the count is
   * kept: the first line is what was really in front of them, and this is what
   * the table agreed to call it. A receipt that quietly printed $970 for a
   * stack of $965 would be the one line on the screen nobody could check
   * against the tin.
   */
  if (person.roundedBy !== 0) {
    rows.push({
      key: 'rounding',
      label: `Rounded to ${stepLabel(result.rounding.step, currencySymbol)}`,
      amount: person.roundedBy,
      signed: true,
    });
  }

  return rows;
}

/** "$10", "€50". The step as money, in the group's own. */
function stepLabel(step: number, currencySymbol: string): string {
  return `${currencySymbol}${step.toLocaleString('en-US')}`;
}

/**
 * Who gets a row on the results list, in the order the list draws them.
 *
 * THE LIST IS "WHAT HAPPENED TO WHOM", not "who is owed what", and those are
 * different lists of names. `settle()` returns everyone it had to settle,
 * which includes two parties who are not people at a table:
 *
 *   · THE HOLE. `Unaccounted` bought in nothing, ended with nothing and was
 *     charged nothing, so every plausible "did this person play" test drops
 *     it — and the screen did drop it, silently, on exactly the nights it
 *     mattered most (B28). It is named here so it cannot be dropped again.
 *   · THE COLLECTOR WHO NEVER SAT DOWN. Their whole appearance in the
 *     settlement is the room's float, and a float is not a night (B27). They
 *     go, and the money is named against the deduction it came from instead.
 *
 * Somebody who only fronted the food stays: that money is theirs, and being
 * out of pocket for the pizza is something that happened to them.
 *
 * IT IS IN CORE because it is two arithmetic decisions wearing a filter's
 * clothes — which credits are a float, and which figure the list sorts by —
 * and both are already made in this file. A screen re-deciding them is the
 * screen that quietly disagrees with the engine about who was at the table.
 */
export interface ResultRow {
  player: PlayerSettlement;
  /** What the night did to them. The figure the row prints. */
  score: Money;
  /** The room's money in their hands, and not in the figure above. */
  held: Money;
}

/**
 * THE COLUMNS LAYOUT — `design/handoff-E6/docs/E6-results-columns.md`, cut 31
 * August, frames `6a` and `6b`.
 *
 *     name            game     food    piggy      net
 *
 * The alternative to the receipt rows, and the one that ships: every deduction
 * is on the row rather than behind a tap, so a table settling up can read the
 * whole thing at once instead of opening seven receipts one at a time. The doc
 * is explicit that the two are alternatives and not layers.
 *
 * WHAT EACH COLUMN IS:
 *
 *   · `game` — what happened at the table, with no deductions in it. It is
 *     `grossResult`, which is cashed out less bought in AT THE STEP THE NIGHT
 *     SETTLED AT: a stack that snapped to $970 settles at $970, so the column
 *     is what the night actually paid out on. The raw count is kept on E2 and
 *     in the ledger.
 *   · `food` — their share of the bill NETTED with anything they paid at the
 *     counter. One figure per person, and the one place this layout nets
 *     anything: whoever covered the bill shows a credit. It is the trade the
 *     doc makes for putting the whole formula on the row.
 *   · `piggy` — their contribution, its own column, never merged into food.
 *   · `net` — `game + food + piggy`, and the same figure the receipt rows print.
 *
 * THE IDENTITY IS EXACT, and it is what makes the layout honest: the four
 * columns are not four independently computed figures that ought to agree, they
 * are a decomposition of one. `net` is `nightScore`'s score, and the three
 * before it sum to it — asserted in `rev15-night.test.ts` for every player of
 * every night the suite settles.
 *
 * WHAT IS NOT HERE, AND WHY THE RECEIPT ROWS SURVIVE. Four numeric columns is
 * the ceiling at 393 points, so a group whose rules reach past food and piggy —
 * a host's fee, a next-pot rule — cannot be drawn this way. `columnsFit()`
 * below is that test, and a night that fails it gets the receipt rows instead.
 * Neither layout is the fallback for the other in any other sense: this is the
 * one that ships, and that one is what a night too complicated for it uses.
 */
export interface ResultColumns {
  player: PlayerSettlement;
  /** Cashed out less bought in, at the step the night settled at. */
  game: Money;
  /** Their share of the bill, netted with what they paid at the counter. */
  food: Money;
  /** What the piggy bank took off them. Never merged into `food`. */
  piggy: Money;
  /** `game + food + piggy`, and the figure the row is sorted on. */
  net: Money;
}

/**
 * Whether this night can be drawn in columns at all.
 *
 * False the moment a rule sends money anywhere but the bill or the piggy bank.
 * There is no fifth column to put it in and no honest place to hide it — folding
 * a host's fee into `piggy` would put one group's money under another group's
 * name — so the night gets the receipt rows, where every kind has a line.
 */
export function columnsFit(result: SettlementResult): boolean {
  return result.deductions.every(
    (d) => d.total === 0 || d.destination === 'bill' || d.destination === 'kitty',
  );
}

export function resultColumns(result: SettlementResult): ResultColumns[] {
  return resultRows(result).map(({ player, score }) => {
    const took = playerDeductions(result, player.playerId);
    const of = (destination: RuleDestination): Money => {
      const d = took.find((x) => x.destination === destination);
      /* Charged is money off them and credited is money back to them, so the
         column is the second less the first — one signed figure, which is what
         a person who both owes the bill and paid it actually experienced. */
      return d === undefined ? (0 as Money) : ((d.credited - d.charged) as Money);
    };

    return {
      player,
      game: player.grossResult,
      food: of('bill'),
      piggy: of('kitty'),
      net: score,
    };
  });
}

export function resultRows(result: SettlementResult): ResultRow[] {
  /*
   * WHAT CAME BACK THAT IS ACTUALLY THEIRS — a bill they fronted, and nothing
   * else. Asked directly, off `playerDeductions`, rather than as
   * `credited − held`: that subtraction was the same figure until the rounding
   * step, which put a second thing in `held` and made it read `credited − float
   * − absorbed`. On the seeded night that came to $20 and the collector
   * reappeared in the list with a score of $0 — B27 undone by arithmetic that
   * happened to agree.
   */
  const ownMoneyBack = (playerId: PlayerId): Money =>
    playerDeductions(result, playerId).reduce(
      (running, d) => (running + d.credited) as Money,
      0 as Money,
    );

  return result.players
    .map((player) => ({ player, ...nightScore(result, player.playerId) }))
    .filter(
      ({ player }) =>
        player.playerId === UNACCOUNTED_ID ||
        player.boughtIn > 0 ||
        player.endedWith > 0 ||
        player.charged > 0 ||
        ownMoneyBack(player.playerId) > 0,
    )
    /*
     * Biggest win first, on the figure the row prints: a column sorted by
     * something it does not show reads as a column that is not sorted.
     *
     * TIES BREAK ON NAME, A→Z — `01-the-flow.md` § Sorting, cut 1 September.
     * Without it two people who both ended $23 down came back in whatever
     * order `result.players` happened to hold them, which is entry order, so
     * the same settled night drew its list differently on two phones. The doc
     * also says the order does not change while the screen is open, and a
     * total order is what makes that true rather than incidental.
     */
    .sort((a, b) => b.score - a.score || (a.player.name < b.player.name ? -1 : 1));
}

/**
 * The three terms as one line — `game +$150 · food +$188 · piggy −$23`.
 *
 * The sub-line of format `7a`, which is the row E6 ships as of
 * `design/handoff-count-up-to-settled/docs/02-E6-results-row.md`, cut 1
 * September. It is here rather than on the screen for the reason every string
 * that names a figure is: the three terms and the order they come in are the
 * whole argument of the row, and a screen assembling them itself is a second
 * place that can disagree with `resultColumns` about what a night did.
 *
 * EVERY TERM ALWAYS PRINTS, INCLUDING A ZERO ONE — `$0`, with no sign, which
 * is what `formatSigned` already returns for it. The doc is explicit: "Never
 * omit a term to save width; the row's whole argument is that the same three
 * terms appear in the same order for everybody." That is a stronger rule than
 * the columns layout's, which drops a column nobody has a figure in, and the
 * difference is deliberate — a column head is a label and a term on a row is
 * part of a sum the reader is checking.
 *
 * ⚠ A NIGHT WITH NEITHER A BILL NOR A PIGGY BANK still draws `food $0 · piggy
 * $0` on every row under this rule. No board draws that night, so the rule is
 * followed rather than second-guessed; `docs/screens.md` carries it as the one
 * thing on this row to put back to the designer.
 *
 * The separator is a middot with a space either side, and the caller supplies
 * the formatter so the group's own currency — and the app's `…ToFit`
 * compaction — reach the terms without this file knowing about either.
 */
export function formula(
  row: Pick<ResultColumns, 'game' | 'food' | 'piggy'>,
  formatSigned: (amount: Money) => string,
): string {
  return [
    `game ${formatSigned(row.game)}`,
    `food ${formatSigned(row.food)}`,
    `piggy ${formatSigned(row.piggy)}`,
  ].join(' · ');
}
