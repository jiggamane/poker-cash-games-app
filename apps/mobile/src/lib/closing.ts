import {
  freeze,
  settle,
  snapshotOf,
  toStored,
  verifyNight,
  type FrozenSettlement,
  type SettlementInput,
  type SettlementResult,
  type StoredVerification,
} from '@poker-club/core';
import type { ClosePayload } from './syncRows';

/**
 * Closing a night: everything that happens at the moment, and none of the I/O.
 *
 * IT IS OUT HERE SO IT CAN BE HELD TO. `nightStore.ts` is 1,900 lines that
 * need a real `expo-sqlite` and has no tests at all, and B5 — a night that
 * forgot the group's rounding the moment it was reloaded — lived in exactly
 * that gap, with its own entry in `docs/bugs.md` reading *Locked by nothing
 * yet*. The close is the highest-stakes function in the app: it is the one
 * moment the record of who owes whom is fixed. So the decisions live here, as
 * one pure function of a night, and the store's job is reduced to writing down
 * what this returns.
 *
 * THREE THINGS HAPPEN AT A CLOSE, and until now none of them did.
 *
 * 1. **The night checks its own arithmetic.** `verifyNight()` re-derives every
 *    identity from the raw ledger — never by asking the engine whether the
 *    engine was right — and `docs/verification.md` calls it the only layer that
 *    can catch a case nobody imagined. It has existed, tested, since the money
 *    core landed, and ran on no real night: nothing in the app called it.
 *
 * 2. **The result is frozen.** See `freeze` in core. A settled night used to be
 *    recomputed from its rows every time a screen drew it, which is correct
 *    only while `settle()` never changes — and it changed on 3 September.
 *
 * 3. **It goes to the server.** `queueClose` and `queueCount` have been written
 *    and unreachable since the server half landed, so the count and the
 *    settlement — the two things a host most needs back if the phone is lost —
 *    lived on that phone and nowhere else. `npm run audit` re-derives every
 *    stored night on a machine that was nowhere near the table; with nothing
 *    stored it was auditing nothing and reporting no failures.
 *
 * THE GROUP'S SETTINGS ARE DEFAULTS FOR THE NEXT GAME, NEVER A REVISION OF THE
 * LAST ONE. A night already carries the rules and the step it opened with
 * (`Night.rules`, `Night.roundingMode`), so changing the club's settings has
 * never moved a night in progress. Freezing closes the other half of the same
 * rule: a settled night is not re-derived by a newer ENGINE either. What the
 * room agreed and paid is what the app says for ever.
 */

/** Everything a close produces. The store writes it down; nothing else. */
export interface ClosedNight {
  /** The settlement, as computed at the table. */
  result: SettlementResult;
  /** The same, in the shape that survives JSON. What gets stored. */
  frozen: FrozenSettlement;
  /** What the night made of its own arithmetic. */
  verification: StoredVerification;
  /** The whole record, ready for the outbox. */
  payload: ClosePayload;
}

/** The night as the store holds it — only the parts a close reads. */
export interface ClosableNight {
  sessionId: string;
  endedAt?: string;
  occurredAt: Record<string, string>;
}

/**
 * Settle, check, and assemble the record.
 *
 * `at` is passed in rather than read from the clock, because this file is pure
 * and because the stamp on the verdict and the stamp on the session going
 * settled have to be the same moment.
 *
 * THROWS WHAT `settle()` THROWS, deliberately and without catching it. A count
 * that does not balance is refused by the engine unless the host has confirmed
 * the gap, and that refusal IS the close gate — the screen shows *Out of
 * balance* off the back of it. Swallowing it here would be routing around the
 * one guard that stops a night closing over money nobody can account for.
 *
 * A FAILED VERDICT DOES NOT THROW. That is the harder call and it is the right
 * one: a night whose arithmetic does not hold is exactly the night that must be
 * written down and sent, or the failure exists only as something odd somebody
 * saw at 1am. The record travels WITH the verdict attached, so it cannot reach
 * the server looking clean, and the caller decides what to say about it.
 */
export function closeOf(
  night: ClosableNight,
  input: SettlementInput,
  at: string,
): ClosedNight {
  const result = settle(input);
  const verification = toStored(verifyNight(input, result), at);
  const ack = input.acknowledgedDiscrepancy;

  return {
    result,
    frozen: freeze(result),
    verification,
    payload: {
      sessionId: night.sessionId,
      // The night ENDED when counting started, not when the host finally
      // tapped through the settlement — `setStatus` stamps that and it is the
      // honest answer. Falling back to now only covers a night that somehow
      // reached a close without one.
      endedAt: night.endedAt ?? at,
      settlement: {
        algorithmVersion: result.algorithmVersion,
        rulesSnapshot: input.rules,
        inputsSnapshot: snapshotOf(input, night.occurredAt),
        computedTransfers: result.transfers,
        totalOffTable: result.totalOffTable,
        discrepancyAmount: result.reconciliation.difference,
        ...(ack?.note === undefined ? {} : { discrepancyNote: ack.note }),
        ...(ack?.absorbedByPlayerId === undefined
          ? {}
          : { discrepancyAbsorbedBy: ack.absorbedByPlayerId }),
        verification,
      },
    },
  };
}
