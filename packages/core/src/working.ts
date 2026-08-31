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

import type { Money } from './money';
import { ruleLabel } from './ruleText';
import type { SettlementResult } from './settlement';
import {
  UNACCOUNTED_ID,
  type MoneyRule,
  type PlayerId,
  type PlayerSettlement,
  type RuleDestination,
} from './types';

export type WorkingRowKind = 'in' | 'out' | 'result' | 'charge' | 'credit' | 'holding';

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
): WorkingRow[] {
  const person = result.players.find((p) => p.playerId === playerId);
  if (person === undefined) return [];

  const byId = new Map(rules.map((r) => [r.id, r]));

  const rows: WorkingRow[] = [
    { key: 'in', label: 'In', amount: person.boughtIn, kind: 'in', signed: false, offTable: false },
    { key: 'out', label: 'Out', amount: person.endedWith, kind: 'out', signed: false, offTable: false },
    {
      key: 'result',
      label: 'Result',
      amount: person.grossResult,
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

  const held = playerDeductions(result, playerId).reduce(
    (running, d) => (running + d.held) as Money,
    0 as Money,
  );

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

export function resultRows(result: SettlementResult): ResultRow[] {
  return result.players
    .map((player) => ({ player, ...nightScore(result, player.playerId) }))
    .filter(
      ({ player, held }) =>
        player.playerId === UNACCOUNTED_ID ||
        player.boughtIn > 0 ||
        player.endedWith > 0 ||
        player.charged > 0 ||
        /* What came back that is actually theirs — the float has already been
           taken out of it, so a pure collector fails here and leaves. */
        player.credited - held > 0,
    )
    /* Biggest win first, on the figure the row prints: a column sorted by
       something it does not show reads as a column that is not sorted. */
    .sort((a, b) => b.score - a.score);
}
