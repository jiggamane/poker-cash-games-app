import type { SettlementInput } from './settlement';
import type { Money, RoundingMode } from './money';
import type {
  DiscrepancyAcknowledgement,
  LedgerEntry,
  MoneyRule,
  Player,
  PlayerId,
} from './types';

/**
 * A settled night, reduced to everything it can be re-derived from.
 *
 * WHY IT EXISTS. A settlement is frozen the moment a night ends, and the rules
 * a group plays by change. Without a snapshot, re-checking last March's night
 * would apply this month's kitty percentage to it and "find" a discrepancy that
 * is really just the passage of time. The snapshot is what makes a settled
 * night auditable years later, by anybody, on any machine.
 *
 * THE TWO FUNCTIONS BELOW MUST BE INVERSES. `snapshotOf` is what the phone
 * writes at close; `inputFromSnapshot` is what `npm run audit` reads back. They
 * are written together, in one file, because they are one contract — and
 * `snapshot.test.ts` settles a night, round-trips it, and asserts the result is
 * identical. If they ever drift apart the audit reports failures that are not
 * real, which is the fastest way to make a verification system worthless.
 */
export interface NightSnapshot {
  players: Player[];
  entries: LedgerEntry[];
  /** A Map does not survive JSON, so it travels as pairs and comes back a Map. */
  finalCounts: Array<[PlayerId, number]>;
  /**
   * How coarsely the group settled that night.
   *
   * A GROUP RULE THE NIGHT WAS SETTLED UNDER, so it belongs here beside the
   * ledger and not with the club: a group that moves to hundreds in November
   * must not make last March's night re-derive to different figures. Absent —
   * every night written before the setting existed — means whole dollars,
   * which is exactly what those nights ran at.
   */
  roundingMode?: RoundingMode | null;
  /** When each entry happened. Not used by the engine; kept for reading back. */
  occurredAt?: Record<string, string>;
}

/** What gets stored with the settlement, at close. */
export function snapshotOf(
  input: SettlementInput,
  occurredAt?: Record<string, string>,
): NightSnapshot {
  return {
    players: [...input.players],
    entries: [...input.entries],
    finalCounts: [...input.finalCounts.entries()],
    ...(input.roundingMode == null ? {} : { roundingMode: input.roundingMode }),
    ...(occurredAt === undefined ? {} : { occurredAt }),
  };
}

/**
 * The night again, from what was stored.
 *
 * Returns null rather than throwing on a snapshot that is not usable — a night
 * written by an old build, or a row somebody edited by hand. The audit counts
 * those separately and never as passes: a night that cannot be checked is not a
 * night that was checked, and folding one into the other is how a failure rate
 * reaches zero without the software getting any better.
 */
export function inputFromSnapshot(
  snapshot: unknown,
  rules: unknown,
  acknowledgedDiscrepancy?: DiscrepancyAcknowledgement,
): SettlementInput | null {
  if (snapshot === null || typeof snapshot !== 'object') return null;

  const s = snapshot as Partial<NightSnapshot>;
  if (!Array.isArray(s.players) || !Array.isArray(s.entries)) return null;

  return {
    players: s.players,
    entries: s.entries,
    finalCounts: new Map(
      (Array.isArray(s.finalCounts) ? s.finalCounts : []).map(([id, n]) => [id, n as Money]),
    ),
    rules: Array.isArray(rules) ? (rules as MoneyRule[]) : [],
    ...(s.roundingMode == null ? {} : { roundingMode: s.roundingMode }),
    ...(acknowledgedDiscrepancy === undefined ? {} : { acknowledgedDiscrepancy }),
  };
}
