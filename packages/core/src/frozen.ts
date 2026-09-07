import { money, type Money } from './money';
import type { SettlementResult } from './settlement';
import type { RoundedPosition } from './stacks';
import type { PlayerId } from './types';

/**
 * A settled night's figures, in a shape that survives being written down.
 *
 * WHY THIS EXISTS AT ALL. `settle()` is a pure function of a night's rows, so
 * for a long time nothing stored its answer: the app re-derived a settled night
 * every time a screen drew it, and that was correct as long as the function
 * never changed. It changed on 3 September — `9321fbd`, the fix for B36 — and
 * the rounding step went from snapping stacks to landing positions. Any night
 * settled at tens before that date and reopened after it would draw figures
 * nobody at the table had ever agreed to, with nothing on the screen saying so.
 *
 * THE RULE THIS ENFORCES, which is the group's own: **a club's settings are the
 * defaults new games are opened with, and nothing more.** Changing the rounding
 * step, a rule's percentage, or who holds the piggy bank sets what the NEXT
 * night starts from. It has never been allowed to reach back into a night that
 * has been settled and paid. `NightSnapshot` already keeps the rules and the
 * step a night ran under; this keeps the answer they produced, so a past game
 * is protected from a newer ENGINE as well as from newer settings.
 *
 * WHY NOT JUST `JSON.stringify(result)`. `rounding.positions` is a Map, and a
 * Map stringifies to `{}` — silently, with no error anywhere. A night frozen
 * that way comes back with every position's `by` term gone, which is precisely
 * the figure the rounding row on E4 and the receipt on E6 are drawn from. That
 * is the whole reason this is a pair of named functions with a round-trip test
 * rather than two calls to the JSON built-ins at a call site.
 *
 * `freeze` and `thaw` MUST BE INVERSES, exactly as `snapshotOf` and
 * `inputFromSnapshot` are, and for the same reason: `frozen.test.ts` settles a
 * night, round-trips it, and asserts the result is identical to the dollar.
 */
export interface FrozenSettlement extends Omit<SettlementResult, 'rounding'> {
  rounding: Omit<SettlementResult['rounding'], 'positions'> & {
    /** The Map as pairs. A Map does not survive JSON; this does. */
    positions: Array<[PlayerId, RoundedPosition]>;
  };
}

/** The result, ready to be written down. */
export function freeze(result: SettlementResult): FrozenSettlement {
  return {
    ...result,
    rounding: { ...result.rounding, positions: [...result.rounding.positions.entries()] },
  };
}

/**
 * The result again, from what was stored.
 *
 * Returns null rather than throwing on anything it cannot read — a payload
 * written by an older build, a row edited by hand, a truncated string. The
 * caller's fallback is to re-derive from the ledger, which is what the app did
 * before this existed and is never worse than drawing a broken screen.
 *
 * IT VALIDATES THE MONEY, and that is not ceremony. Everything here came off a
 * disk or a wire as `unknown`, and a fractional or non-finite amount reaching
 * a screen as a settled figure is the one failure this file could introduce
 * that the engine's own gates would never see — the engine ran months ago.
 * `money()` is that gate, so a corrupted payload is rejected whole and the
 * night re-derives instead.
 */
export function thaw(payload: unknown): SettlementResult | null {
  if (payload === null || typeof payload !== 'object') return null;

  const f = payload as Partial<FrozenSettlement>;
  if (
    typeof f.algorithmVersion !== 'string' ||
    !Array.isArray(f.players) ||
    !Array.isArray(f.deductions) ||
    !Array.isArray(f.transfers) ||
    f.reconciliation === null ||
    typeof f.reconciliation !== 'object' ||
    f.rounding === null ||
    typeof f.rounding !== 'object'
  ) {
    return null;
  }

  const pairs = Array.isArray(f.rounding.positions) ? f.rounding.positions : [];

  try {
    const positions = new Map<PlayerId, RoundedPosition>(
      pairs.map(([id, p]) => [
        id,
        { exact: money(p.exact), rounded: money(p.rounded), by: money(p.by) },
      ]),
    );

    // Every figure any screen prints, through the one gate that refuses a
    // number money cannot be.
    for (const p of f.players) {
      money(p.boughtIn);
      money(p.endedWith);
      money(p.grossResult);
      money(p.roundedBy);
      money(p.charged);
      money(p.credited);
      money(p.finalPosition);
    }
    for (const t of f.transfers) money(t.amount);
    for (const d of f.deductions) money(d.total);
    money(f.totalOffTable as Money);

    return {
      algorithmVersion: f.algorithmVersion,
      reconciliation: f.reconciliation,
      players: f.players,
      deductions: f.deductions,
      totalOffTable: f.totalOffTable as Money,
      rounding: { ...f.rounding, positions },
      transfers: f.transfers,
      ...(f.acknowledgedDiscrepancy === undefined
        ? {}
        : { acknowledgedDiscrepancy: f.acknowledgedDiscrepancy }),
    };
  } catch {
    // A MoneyError, or a pair that was not a pair. Either way this payload is
    // not a settlement and the caller must re-derive.
    return null;
  }
}
