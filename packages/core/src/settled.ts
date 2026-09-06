/**
 * The settled night's list — one ranked row per player, in either of the two
 * modes the toggle offers.
 *
 * `design/handoff-game-end/`, cut 6 September. It replaces the long scroll of
 * `AT THE TABLE → DEDUCTIONS → FINAL` with ONE list and a segmented toggle, and
 * it replaces the four-column table — `/ledger`, format `7e` — with a line of
 * terms under each name. Both of those are layout decisions; what makes them
 * possible is that the two figures a person can be ranked by are both already
 * in the settlement, so the toggle is a re-sort and not a re-computation.
 *
 * WHY THE TERMS ARE A LIST AND NOT FOUR FIELDS. The cut prints `in` and `out`
 * always, and `bill` and `piggy bank` only where the night charged them, with a
 * `+N back` appended INSIDE the bill term for whoever fronted the food. A row
 * for a night with no bill draws two terms; a row for the person who paid for
 * the food draws five. Fields would make the screen test each one for zero and
 * decide the separators itself, which is the screen doing the work of deciding
 * what a night charged.
 *
 * THE BILL IS NEVER NETTED HERE, and that is the cut's rule 2 — *"whoever paid
 * a bill gets it back in full, as a separate positive term... both terms show
 * on the row"*. `resultColumns` nets them into one signed `food` figure on
 * purpose, because a four-column table has one column for the bill and cannot
 * hold two. A line of terms can, so it does: `bill 50 +100 back` says what
 * happened, where `food +50` says only how it came out.
 *
 * THE STEP IS A TERM TOO, and it has to be. `final` is the engine's own figure
 * and the step is inside it, so a row printing `in out bill piggy` beside a
 * rounded net would be a row that does not add up. It was the fifth column of
 * `/ledger` and `/ledger` is dropped, so it comes here — drawn only on a night
 * that rounded, which is the only night it is not zero on.
 */

import type { Money } from './money';
import type { PlayerId, PlayerSettlement } from './types';
import type { SettlementResult } from './settlement';
import { nightScore, playerDeductions } from './working';

/** Which figure the list is ranked by, and how many terms a row prints. */
export type SettledMode = 'table' | 'final';

/**
 * `bill` and `back` are two terms and not one — see the note above. `back` is
 * only ever a bill's, because a bill is the one deduction that pays an outlay
 * back to the person who made it; every other kind hands a float to a collector,
 * which is the room's money and not theirs.
 */
export type SettledTermKind = 'in' | 'out' | 'bill' | 'back' | 'piggy' | 'rounded';

export interface SettledTerm {
  kind: SettledTermKind;
  /**
   * The magnitude, always positive except `rounded`, which is signed because it
   * is the only term whose direction is not fixed by its name.
   */
  amount: Money;
}

export interface SettledRow {
  player: PlayerSettlement;
  /** `out − in`. What the table did, before any rule. */
  atTheTable: Money;
  /**
   * Where they actually end up: the table's result after every rule and after
   * the step, WITHOUT the piggy bank's float if they are the one holding it.
   *
   * Read off `nightScore`, not re-derived. A collector's position has the
   * room's money in it and a row printing that as their night would show them a
   * win they did not win — the split is made once, in `working.ts`, and this
   * is the side of it a results list is asking about.
   */
  final: Money;
  /** The figure this row prints and is sorted on, in the current mode. */
  net: Money;
  /** The line under the name, in the cut's order. */
  terms: SettledTerm[];
  /** The room's money in their hands, and not in `final`. Never negative. */
  held: Money;
}

const at = (
  result: SettlementResult,
  playerId: PlayerId,
  destination: 'bill' | 'kitty',
): { charged: Money; credited: Money } => {
  const d = playerDeductions(result, playerId).find((x) => x.destination === destination);
  return { charged: (d?.charged ?? 0) as Money, credited: (d?.credited ?? 0) as Money };
};

/**
 * Every player of a settled night, ranked by the mode's own figure, descending.
 *
 * THE SORT IS PART OF THE SPEC and not a screen's convenience: *"rows re-sort by
 * the displayed figure on every mode change"*. A player who won at the table and
 * paid for the food can be second in one mode and fourth in the other, and a
 * list that kept one order would be printing one mode's ranking under the other
 * mode's numbers.
 *
 * Ties keep the settlement's own order, which is the night's, so a night always
 * ranks one way.
 */
export function settledRows(result: SettlementResult, mode: SettledMode): SettledRow[] {
  const rows = result.players.map((player): SettledRow => {
    const { score, held } = nightScore(result, player.playerId);
    const bill = at(result, player.playerId, 'bill');
    const piggy = at(result, player.playerId, 'kitty');

    const terms: SettledTerm[] = [
      { kind: 'in', amount: player.boughtIn },
      { kind: 'out', amount: player.endedWith },
    ];

    /*
     * BILL AND PIGGY ON FINAL ONLY. At the table is `out − in` and nothing else
     * has happened yet; printing what a rule will later take under a figure
     * that does not have it taken out is the row disagreeing with itself.
     */
    if (mode === 'final') {
      if (bill.charged !== 0 || bill.credited !== 0) {
        terms.push({ kind: 'bill', amount: bill.charged });
        if (bill.credited !== 0) terms.push({ kind: 'back', amount: bill.credited });
      }
      if (piggy.charged !== 0) terms.push({ kind: 'piggy', amount: piggy.charged });
      if (player.roundedBy !== 0) terms.push({ kind: 'rounded', amount: player.roundedBy });
    }

    return {
      player,
      atTheTable: player.grossResult,
      final: score,
      net: mode === 'final' ? score : player.grossResult,
      terms,
      held,
    };
  });

  return rows.sort((a, b) => b.net - a.net);
}

/**
 * What the night took off the table and did not give back to a player.
 *
 * The cut's rule 3: *"the finals do not sum to zero. They sum to minus the piggy
 * bank"* — the assertion being `Σ final + piggyTotal === 0`. Here that identity
 * is not an assertion about a formula, it is the engine's own zero-sum with the
 * float taken out of every score and counted once here instead, which is why
 * `settled.test.ts` can hold every night in the suite to it.
 *
 * A bill is NOT in this figure. Money that goes out for food and comes back to
 * whoever fronted it never leaves the players — it moves between them.
 */
export function offTheTable(result: SettlementResult): Money {
  return result.players.reduce(
    (running, p) => (running + nightScore(result, p.playerId).held) as Money,
    0 as Money,
  );
}
