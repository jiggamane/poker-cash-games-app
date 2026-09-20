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
  /** Expenses only: the piggy bank paid, or nobody has yet. */
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
   * Spends the piggy bank covered or nobody has covered yet. They are on the bill
   * — the money was spent — but no person is owed them back.
   *
   * The two halves settle differently, which is why they are also kept apart
   * below. Prefer the specific figure; this is their sum.
   */
  expensesUnattributed: Money;
  /**
   * The kitty paid directly. Nobody is reimbursed and nobody is charged: this
   * money was collected off the table by the piggy bank rule and has already left
   * it. Charging the winners again would be charging them twice for one round.
   * `11-bill-and-piggy-bank.md` § *Covered by*.
   */
  expensesFromKitty: Money;
  /**
   * Nobody has paid this yet. It **counts towards the bill** — the round was
   * had and somebody will settle it — but no player is out of pocket, so the
   * money collected for it goes to the bill rule's collector rather than back
   * to a fronter. `11-bill-and-piggy-bank.md` § *Covered by*.
   */
  expensesUnpaid: Money;
  totalBoughtIn: Money;
  totalCashedOut: Money;
  /** Everything spent tonight, whoever fronted it and whether anyone did. */
  totalExpenses: Money;
  /**
   * What a bill rule actually shares out: everything except what the piggy bank
   * already paid for.
   */
  billableExpenses: Money;
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
  let fromPiggyBank = ZERO;
  let unpaid = ZERO;

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
        // No payer means the piggy bank paid it or nobody has. Both are owed to
        // nobody, and they are NOT interchangeable at settle-up: the piggy bank's
        // has already been paid for, the unpaid one still has to be.
        if (e.payerId) addTo(expensesByPayer, e.payerId, e.amount);
        else if (e.coveredBy === 'kitty') fromPiggyBank = sum([fromPiggyBank, e.amount]);
        else unpaid = sum([unpaid, e.amount]);
        break;
    }
  }

  return {
    entries: list,
    boughtInByPlayer,
    cashedOutByPlayer,
    expensesByPayer,
    expensesUnattributed: sum([fromPiggyBank, unpaid]),
    expensesFromKitty: fromPiggyBank,
    expensesUnpaid: unpaid,
    totalBoughtIn: totalOf(boughtInByPlayer),
    totalCashedOut: totalOf(cashedOutByPlayer),
    totalExpenses: sum([totalOf(expensesByPayer), fromPiggyBank, unpaid]),
    billableExpenses: sum([totalOf(expensesByPayer), unpaid]),
  };
}

/**
 * WHO STILL HAS CHIPS IN FRONT OF THEM, off the entries and nothing else.
 *
 * Their last buy-in came after their last cash-out, by the ledger's own `seq`
 * rather than by a clock: somebody who cashed out and bought back in is seated,
 * and somebody who bought in and then cashed out is not.
 *
 * ⚠ THIS IS THE ONE DEFINITION NOW, AND IT USED TO BE THREE. The app's
 * `standingsOf` had it for the row it draws, `balanceCheck` took the answer as
 * an argument, and `reconcile` and `endedWith` did not ask at all — which is
 * how a stack could be counted twice. See the note on `reconcile`.
 *
 * ⚠ A VOIDED ENTRY IS STILL IN `ledger.entries` — it is flagged, not dropped,
 * so that a screen can draw the struck-through row. Skipping it here is what
 * makes a voided cash-out seat somebody again, which is what voiding one means:
 * the host said that cash-out never happened, so the player never left and the
 * stack in front of them is the table's again. The first cut of this function
 * read past the flag and dropped that player's count instead — found by walking
 * the flow rather than by any test, which is why the walk is now `seating.test.ts`.
 */
export function seatedIn(ledger: ResolvedLedger): Set<PlayerId> {
  const lastBuy = new Map<PlayerId, number>();
  const lastOut = new Map<PlayerId, number>();

  for (const e of ledger.entries) {
    if (e.voided) continue;
    if (e.playerId === undefined || e.playerId === null) continue;
    if (e.type === 'buyin' || e.type === 'rebuy') lastBuy.set(e.playerId, e.seq);
    else if (e.type === 'cashout') lastOut.set(e.playerId, e.seq);
  }

  const seated = new Set<PlayerId>();
  for (const [id, buy] of lastBuy) {
    if (buy > (lastOut.get(id) ?? -1)) seated.add(id);
  }
  return seated;
}

/**
 * The counts that are money ON THE TABLE — a count for somebody who has since
 * cashed out is not one, and adding it counts their stack twice.
 *
 * ⚠ B85, AND IT ENDED A REAL NIGHT. The host counted Andro's ₾4,100 while he
 * was still seated, he cashed out for that same ₾4,100 eight minutes later, and
 * the count stayed behind him in the map. `balanceCheck` knew to drop it — its
 * own comment says why, word for word — and this did not, so Count up read
 * `Balanced ₾31,000 in play` while `settle()` refused the night for being
 * ₾4,100 over. `/deductions` caught the refusal and drew *Not yet*, whose copy
 * says to go back and count every stack, on a night where every stack was
 * counted. Back, forward, back: the loop `deductions.tsx` was already written
 * to avoid, arrived at from the other side.
 *
 * The stale count is NEVER rewritten — `finalCounts` is what the host typed and
 * the ledger is append-only. It is read past, here, by everything that adds
 * counts up.
 */
function chipsCounted(
  ledger: ResolvedLedger,
  finalCounts: ReadonlyMap<PlayerId, Money>,
): Money {
  const seated = seatedIn(ledger);
  return sum([...finalCounts].filter(([id]) => seated.has(id)).map(([, amount]) => amount));
}

/**
 * Does the host's count match the money that should still be on the table?
 *
 * Chips on the table are everything bought in, less everything cashed out.
 * Expenses are cash paid outside the chips, so they do not appear here.
 *
 * The design blocks the close flow until difference is exactly zero, and it is
 * an exact integer comparison — chip counts have no rounding to argue about.
 *
 * ONLY A SEATED PLAYER'S COUNT IS CHIPS ON THE TABLE — see `chipsCounted`. This
 * is the same rule `balanceCheck` applies to the same map, which is what makes
 * `balanceCheck().left === −reconcile().difference` true of every night rather
 * than of most of them. `balance.ts` has claimed that identity in prose since it
 * was written; until B85 it was not true where it mattered.
 */
export function reconcile(
  ledger: ResolvedLedger,
  finalCounts: ReadonlyMap<PlayerId, Money>,
): Reconciliation {
  const chipsOnTable = subtract(ledger.totalBoughtIn, ledger.totalCashedOut);
  const counted = chipsCounted(ledger, finalCounts);
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
 *
 * THE COUNT ONLY COUNTS IF THEY ARE STILL SEATED — B85, the same rule
 * `reconcile` applies and for the same reason. A player who was counted and
 * then cashed out has one stack, not two: the cash-out is where it went, and
 * the count is a note about the stack it went from. Adding both gave Andro
 * ₾8,200 off a ₾4,100 stack and the gross results stopped summing to zero.
 */
export function endedWith(
  ledger: ResolvedLedger,
  playerId: PlayerId,
  finalCounts: ReadonlyMap<PlayerId, Money>,
): Money {
  const stillThere = seatedIn(ledger).has(playerId);
  return sum([
    ledger.cashedOutByPlayer.get(playerId) ?? ZERO,
    stillThere ? (finalCounts.get(playerId) ?? ZERO) : ZERO,
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
  return rebuyPrefill(ledger, playerId).amount;
}

/**
 * The same answer, and which layer of M16 gave it.
 *
 * M17 says the interface must not explain where the figure came from — there
 * is no "same as Petr's last rebuy" line under the button, the amount stands
 * on its own. It also says the derivation is kept in code, and that the amount
 * screen's preset row marks the resolved figure **LAST** rather than STANDARD
 * once you are inside it. That one word is the only thing the provenance is
 * allowed to change, so it is returned here rather than re-derived by a screen
 * asking the ledger a second question of its own.
 */
export function rebuyPrefill(
  ledger: ResolvedLedger,
  playerId: PlayerId,
): { amount: Money; from: 'last rebuy' | 'standard buy-in' } {
  const mine = ledger.entries.filter(
    (e) => !e.voided && e.type === 'rebuy' && e.playerId === playerId,
  );
  const newest = mine[mine.length - 1];
  return newest === undefined
    ? { amount: standardBuyIn(ledger), from: 'standard buy-in' }
    : { amount: newest.amount, from: 'last rebuy' };
}

// --- internals ---------------------------------------------------------------

function validateBaseEntry(e: LedgerEntry): void {
  money(e.amount); // throws on anything fractional
  if (e.type === 'expense') {
    if (e.playerId) throw new LedgerError(`Expense ${e.id} must have a payer, not a player`);
    // A spend is covered by a person, by the piggy bank, or by nobody yet. Exactly
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
