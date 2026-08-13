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
  /** Expenses only: the kitty paid, or nobody has yet. */
  coveredBy?: 'kitty' | 'unpaid' | null;
  /** Expenses only: which spend this fronting belongs to. */
  spendGroup?: string | null;
}

export interface ResolvedLedger {
  entries: EffectiveEntry[];
  boughtInByPlayer: Map<PlayerId, Money>;
  cashedOutByPlayer: Map<PlayerId, Money>;
  expensesByPayer: Map<PlayerId, Money>;
  /**
   * Spends the kitty covered or nobody has covered yet. They are on the bill
   * — the money was spent — but no person is owed them back.
   */
  expensesUnattributed: Money;
  totalBoughtIn: Money;
  totalCashedOut: Money;
  /** Everything on the bill, whoever fronted it and whether anyone did. */
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
        coveredBy: e.coveredBy ?? null,
        spendGroup: e.spendGroup ?? null,
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
  let unattributed = ZERO;

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
        // No payer means the kitty paid it or nobody has: on the bill, owed
        // to nobody.
        if (e.payerId) addTo(expensesByPayer, e.payerId, e.amount);
        else unattributed = sum([unattributed, e.amount]);
        break;
    }
  }

  return {
    entries: list,
    boughtInByPlayer,
    cashedOutByPlayer,
    expensesByPayer,
    expensesUnattributed: unattributed,
    totalBoughtIn: totalOf(boughtInByPlayer),
    totalCashedOut: totalOf(cashedOutByPlayer),
    totalExpenses: sum([totalOf(expensesByPayer), unattributed]),
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

/**
 * What the table has been buying in for.
 *
 * The most common first buy-in, not the average: a mean would invent an amount
 * nobody has ever bought in for. With nothing to go on, $500.
 */
export function standardBuyIn(ledger: ResolvedLedger): Money {
  const firsts = ledger.entries.filter((e) => !e.voided && e.type === 'buyin');
  if (firsts.length === 0) return money(500);

  const tally = new Map<number, number>();
  for (const e of firsts) tally.set(e.amount, (tally.get(e.amount) ?? 0) + 1);
  const [best] = [...tally.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  return money(best![0]);
}

/**
 * What a rebuy should be pre-filled with, for one person. M16.
 *
 * Resolution order, per player and never table-wide: their last rebuy tonight
 * → tonight's standard buy-in → the group default. A VOIDED rebuy stops
 * counting, so the answer falls back to the one before it; a CORRECTED rebuy
 * counts at its corrected amount, which is what `resolveLedger` has already
 * applied by the time this reads it.
 *
 * This is an input convenience, not a money rule — it decides what a keypad
 * opens with and nothing else. It lives here because the resolution order is
 * exact, and because the screen showing it deliberately never explains where
 * the figure came from (M17), which leaves this function as the only place the
 * answer is written down.
 */
export function lastRebuyAmount(ledger: ResolvedLedger, playerId: PlayerId): Money {
  const mine = ledger.entries.filter(
    (e) => !e.voided && e.type === 'rebuy' && e.playerId === playerId,
  );
  const newest = mine[mine.length - 1];
  return newest === undefined ? standardBuyIn(ledger) : newest.amount;
}

// --- internals ---------------------------------------------------------------

function validateBaseEntry(e: LedgerEntry): void {
  money(e.amount); // throws on anything fractional
  if (e.type === 'expense') {
    if (e.playerId) throw new LedgerError(`Expense ${e.id} must have a payer, not a player`);
    // A spend is covered by a person, by the kitty, or by nobody yet. Exactly
    // one of the two fields says which, and neither may be guessed.
    if (!e.payerId && !e.coveredBy) {
      throw new LedgerError(`Expense ${e.id} names neither a payer nor what covered it`);
    }
    if (e.payerId && e.coveredBy) {
      throw new LedgerError(`Expense ${e.id} has both a payer and a cover`);
    }
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
