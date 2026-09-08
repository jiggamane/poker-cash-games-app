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
import type { PlayerSettlement, RuleDestination } from './types';
import type { SettlementResult } from './settlement';
import { nightScore, playerDeductions, resultRows } from './working';

/** Which figure the list is ranked by, and how many terms a row prints. */
export type SettledMode = 'table' | 'final';

/**
 * `spend` and `back` are two terms and not one — see the note above. `back` is
 * only ever a bill's, because a bill is the one deduction that pays an outlay
 * back to the person who made it; every other kind hands a float to a collector,
 * which is the room's money and not theirs.
 *
 * ⚠ `spend` REPLACED `bill` AND `piggy`, AND THAT FIXED A HOLE (B62). Those two
 * kinds were two of the four destinations a rule can have, read by name; a
 * night with a host's fee on it charged everybody and printed no term for it,
 * so the line under the name did not come to the figure beside it — on the one
 * screen whose whole claim is that it does. One kind carrying the destination
 * is the same information without the list of which two are drawn, and a fifth
 * destination is a glyph to choose rather than a term to remember to add.
 */
export type SettledTermKind = 'in' | 'out' | 'spend' | 'back' | 'rounded';

export interface SettledTerm {
  kind: SettledTermKind;
  /**
   * Which rule kind took it — on `spend` and `back`, and null on the three
   * terms that are not a rule's. It is the destination and not the rule's name
   * because a night can run two bill rules and the row has one glyph for a
   * bill: `playerDeductions` groups them the same way, and the rules' own names
   * are stated in full in the deductions block on the same screen.
   */
  destination: RuleDestination | null;
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
  /*
   * THE SAME MEMBERSHIP AS EVERY OTHER RESULTS LIST, and it is `resultRows`'s
   * rather than a second copy of it — B27. The piggy bank's own envelope is a
   * party to the settlement and is not a person who had a night: it bought in
   * for nothing, ended with nothing, and is charged nothing, so a list built
   * off `result.players` draws it as a row reading ₾0 and the night gains a
   * player who was never there. `resultRows` also carries the score/float
   * split and the total order the flow doc asks for.
   */
  const rows = resultRows(result).map(({ player, score, held }): SettledRow => {
    const terms: SettledTerm[] = [
      { kind: 'in', destination: null, amount: player.boughtIn },
      { kind: 'out', destination: null, amount: player.endedWith },
    ];

    /*
     * THE SPENDS ON FINAL ONLY. At the table is `out − in` and nothing else has
     * happened yet; printing what a rule will later take under a figure that
     * does not have it taken out is the row disagreeing with itself.
     *
     * EVERY RULE THAT TOUCHED THEM, IN THE NIGHT'S OWN ORDER — that is
     * `playerDeductions`'s order, which is `sortOrder`, so the bill precedes
     * the piggy bank on the row if it preceded it in the settlement. A rule
     * that took nothing off them is not a term (the handoff's rule: absent
     * pairs are dropped, never zeroed), which is what makes the row variable
     * width by design.
     */
    if (mode === 'final') {
      for (const d of playerDeductions(result, player.playerId)) {
        if (d.charged !== 0) {
          terms.push({ kind: 'spend', destination: d.destination, amount: d.charged });
        }
        /* Only ever a bill's — `playerDeductions` credits nothing else to the
           person themselves, because every other kind hands the collector a
           float that is the room's and not theirs. */
        if (d.credited !== 0) {
          terms.push({ kind: 'back', destination: d.destination, amount: d.credited });
        }
      }
      if (player.roundedBy !== 0) {
        terms.push({ kind: 'rounded', destination: null, amount: player.roundedBy });
      }
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

  /*
   * AND THE SAME TOTAL ORDER, on whichever figure the mode prints — biggest
   * first, ties broken on name A→Z (`01-the-flow.md` § Sorting). A total order
   * is what makes "the order does not change while the screen is open" true
   * rather than incidental: two people who both ended ₾23 down came back in
   * entry order otherwise, so the same settled night drew differently on two
   * phones.
   */
  return rows.sort((a, b) => b.net - a.net || (a.player.name < b.player.name ? -1 : 1));
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
