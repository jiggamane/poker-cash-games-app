/**
 * Reading the append-only ledger.
 *
 * The ledger is a list of things that happened, including mistakes and the
 * corrections that followed them. Nothing here mutates or discards history —
 * it reduces the log to "what is true now" while the log itself keeps
 * everything.
 */

import { money, subtract, sum, type Money, ZERO } from './money';
import type { EntryId, LedgerEntry, PlayerId, Reconciliation } from './types';

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

/** A money event after any corrections have been applied to it. */
export interface EffectiveEntry {
  id: EntryId;
  seq: number;
  type: 'buyin' | 'rebuy' | 'cashout' | 'expense';
  playerId?: PlayerId | null;
  payerId?: PlayerId | null;
  /** The amount as it stands now — the original, or the last correction of it. */
  amount: Money;
  /** True if a void cancelled it. Kept in the list so the feed can show it. */
  voided: boolean;
  /** True if a correction changed the amount. */
  corrected: boolean;
  originalAmount: Money;
}

export interface ResolvedLedger {
  entries: EffectiveEntry[];
  boughtInByPlayer: Map<PlayerId, Money>;
  cashedOutByPlayer: Map<PlayerId, Money>;
  expensesByPayer: Map<PlayerId, Money>;
  totalBoughtIn: Money;
  totalCashedOut: Money;
  totalExpenses: Money;
}

const BASE_TYPES = new Set(['buyin', 'rebuy', 'cashout', 'expense']);

/**
 * Apply corrections and voids to the entries they point at.
 *
 * Corrections are applied in seq order, so the last correction of an entry
 * wins. A correction may itself be corrected; the chain is followed back to the
 * original money event.
 */
export function resolveLedger(entries: readonly LedgerEntry[]): ResolvedLedger {
  // Order by seq, never by array order or arrival time.
  const ordered = [...entries].sort((a, b) => a.seq - b.seq || (a.id < b.id ? -1 : 1));

  const effective = new Map<EntryId, EffectiveEntry>();
  const correctionTarget = new Map<EntryId, EntryId>();

  for (const e of ordered) {
    if (BASE_TYPES.has(e.type)) {
      validateBaseEntry(e);
      effective.set(e.id, {
        id: e.id,
        seq: e.seq,
        type: e.type as EffectiveEntry['type'],
        playerId: e.playerId ?? null,
        payerId: e.payerId ?? null,
        amount: money(e.amount),
        originalAmount: money(e.amount),
        voided: false,
        corrected: false,
      });
    } else if (e.correctsEntryId) {
      correctionTarget.set(e.id, e.correctsEntryId);
    } else {
      throw new LedgerError(`Entry ${e.id} of type '${e.type}' must reference the entry it corrects`);
    }
  }

  for (const e of ordered) {
    if (e.type !== 'correction' && e.type !== 'void') continue;

    const rootId = resolveRoot(e.id, correctionTarget, effective);
    if (!rootId) {
      throw new LedgerError(
        `Entry ${e.id} corrects ${String(e.correctsEntryId)}, which is not a money event in this session`,
      );
    }
    const target = effective.get(rootId)!;

    if (e.type === 'void') {
      target.voided = true;
      target.amount = ZERO;
    } else {
      target.amount = money(e.amount);
      target.corrected = true;
      // A correction after a void brings the entry back with a new amount.
      target.voided = false;
    }
  }

  const list = [...effective.values()].sort((a, b) => a.seq - b.seq);

  const boughtInByPlayer = new Map<PlayerId, Money>();
  const cashedOutByPlayer = new Map<PlayerId, Money>();
  const expensesByPayer = new Map<PlayerId, Money>();

  for (const e of list) {
    if (e.voided) continue;
    switch (e.type) {
      case 'buyin':
      case 'rebuy':
        addTo(boughtInByPlayer, e.playerId!, e.amount);
        break;
      case 'cashout':
        addTo(cashedOutByPlayer, e.playerId!, e.amount);
        break;
      case 'expense':
        addTo(expensesByPayer, e.payerId!, e.amount);
        break;
    }
  }

  return {
    entries: list,
    boughtInByPlayer,
    cashedOutByPlayer,
    expensesByPayer,
    totalBoughtIn: totalOf(boughtInByPlayer),
    totalCashedOut: totalOf(cashedOutByPlayer),
    totalExpenses: totalOf(expensesByPayer),
  };
}

/**
 * Does the host's count match the money that should still be on the table?
 *
 * Chips on the table are everything bought in, less everything cashed out.
 * Expenses are cash paid outside the chips, so they do not appear here.
 *
 * The design blocks the close flow until difference is exactly zero, and it is
 * an exact integer comparison — chip counts have no rounding to argue about.
 */
export function reconcile(
  ledger: ResolvedLedger,
  finalCounts: ReadonlyMap<PlayerId, Money>,
): Reconciliation {
  const chipsOnTable = subtract(ledger.totalBoughtIn, ledger.totalCashedOut);
  const counted = totalOf(finalCounts);
  const difference = subtract(counted, chipsOnTable);
  return {
    chipsOnTable,
    counted,
    difference,
    reconciled: difference === 0,
  };
}

/**
 * What each player ended the night holding: chips they cashed out earlier plus
 * whatever is still in front of them.
 */
export function endedWith(
  ledger: ResolvedLedger,
  playerId: PlayerId,
  finalCounts: ReadonlyMap<PlayerId, Money>,
): Money {
  return sum([
    ledger.cashedOutByPlayer.get(playerId) ?? ZERO,
    finalCounts.get(playerId) ?? ZERO,
  ]);
}

// --- internals ---------------------------------------------------------------

function validateBaseEntry(e: LedgerEntry): void {
  money(e.amount); // throws on anything fractional
  if (e.type === 'expense') {
    if (!e.payerId) throw new LedgerError(`Expense ${e.id} has no payer`);
    if (e.playerId) throw new LedgerError(`Expense ${e.id} must have a payer, not a player`);
  } else {
    if (!e.playerId) throw new LedgerError(`Entry ${e.id} of type '${e.type}' has no player`);
    if (e.payerId) throw new LedgerError(`Entry ${e.id} of type '${e.type}' must not have a payer`);
  }
  if (e.amount < 0) throw new LedgerError(`Entry ${e.id} has a negative amount (${e.amount})`);
}

/** Follow a correction chain back to the money event it ultimately restates. */
function resolveRoot(
  correctionId: EntryId,
  correctionTarget: ReadonlyMap<EntryId, EntryId>,
  base: ReadonlyMap<EntryId, EffectiveEntry>,
): EntryId | undefined {
  let current = correctionTarget.get(correctionId);
  const seen = new Set<EntryId>([correctionId]);
  while (current !== undefined) {
    if (base.has(current)) return current;
    if (seen.has(current)) return undefined; // a cycle; refuse rather than loop
    seen.add(current);
    current = correctionTarget.get(current);
  }
  return undefined;
}

function addTo(map: Map<PlayerId, Money>, key: PlayerId, amount: Money): void {
  map.set(key, sum([map.get(key) ?? ZERO, amount]));
}

function totalOf(map: ReadonlyMap<PlayerId, Money>): Money {
  return sum([...map.values()]);
}

/**
 * What the Rebuy button should offer this player — rev 7's M16.
 *
 * Tables drift. Once somebody has rebought $500 at a $200 table, their next
 * rebuy is almost always $500 again, and asking them to retype it every time is
 * the sort of small friction that gets an app put down at a kitchen table.
 *
 * Resolution order, PER PLAYER and per session:
 *
 *   1. their last rebuy tonight
 *   2. the amount the session was opened with
 *   3. the group default
 *
 * Two edge cases decide the rest. A **voided** rebuy stops counting — it is a
 * rebuy that did not happen, so the default falls back to the one before it. A
 * **corrected** rebuy counts at its corrected amount, which is free here
 * because `EffectiveEntry.amount` is already the corrected figure.
 *
 * Per player, never table-wide: Petr rebuying $500 must not change what Ivo is
 * offered. And note that first buy-ins are unaffected — this is only ever asked
 * about a rebuy.
 *
 * M17: the ANSWER is used, the reasoning is not shown. No "same as last time"
 * line appears under the button; a host who wants a different number taps
 * Other amount. Keep the derivation here, in code, where it can be tested.
 */
export function lastRebuyAmount(
  ledger: ResolvedLedger,
  playerId: PlayerId,
  sessionBuyIn: Money,
): Money {
  const rebuys = ledger.entries.filter(
    (e) => e.type === 'rebuy' && e.playerId === playerId && !e.voided,
  );
  if (rebuys.length === 0) return sessionBuyIn;

  // Newest by seq, not by position: entries arrive in seq order today, and a
  // rule about "the last one" should not quietly depend on that staying true.
  const newest = rebuys.reduce((latest, e) => (e.seq > latest.seq ? e : latest));
  return newest.amount;
}
