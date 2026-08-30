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
import type { MoneyRule, PlayerId, RuleDestination } from './types';

export type WorkingRowKind = 'in' | 'out' | 'result' | 'charge' | 'credit';

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
      rows.push({
        key: `${d.ruleId}:credit`,
        label: creditLabel(d.destination),
        amount: back as Money,
        kind: 'credit',
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
 * one line under a name on E6: `bill −$29 · back +$120 · piggy −$50`. Two bill
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
  /** What came back: they fronted the bill, or they hold what the rule takes. */
  credited: Money;
}

export function playerDeductions(
  result: SettlementResult,
  playerId: PlayerId,
): PlayerDeduction[] {
  const byKind = new Map<RuleDestination, PlayerDeduction>();

  for (const d of result.deductions) {
    const charged = d.charges.find((c) => c.playerId === playerId)?.amount ?? 0;
    const credited = d.credits.find((c) => c.playerId === playerId)?.amount ?? 0;
    if (charged === 0 && credited === 0) continue;

    const running = byKind.get(d.destination);
    byKind.set(d.destination, {
      destination: d.destination,
      charged: ((running?.charged ?? 0) + charged) as Money,
      credited: ((running?.credited ?? 0) + credited) as Money,
    });
  }

  return [...byKind.values()];
}
