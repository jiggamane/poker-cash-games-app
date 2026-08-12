/**
 * Settlement — the night's arithmetic.
 *
 * This is a pure function of (ledger, counts, rules). Given the same inputs it
 * must always produce the same output, byte for byte, which is what makes the
 * frozen record on the server auditable and what lets the app show the same
 * numbers live. Two things are required for that and both are deliberate here:
 *
 *   ORDERING  — rules apply in sortOrder; players are iterated in a sorted
 *               order, never in map/object insertion order; ties in the
 *               transfer matching break on player id.
 *   ROUNDING  — a percentage floors (a rule never takes more than it says), and
 *               dividing a total between people goes through allocate(), which
 *               guarantees the parts sum back to the whole exactly.
 *
 * Bump ALGORITHM_VERSION if any of that changes. Old settlements stay
 * reproducible because they store the version they were computed with.
 */

import {
  allocate,
  money,
  percentOf,
  subtract,
  sum,
  type Money,
  ZERO,
} from './money';
import { endedWith, reconcile, resolveLedger, type ResolvedLedger } from './ledger';
import type {
  Deduction,
  LedgerEntry,
  MoneyRule,
  Player,
  PlayerId,
  PlayerSettlement,
  Reconciliation,
  Transfer,
} from './types';

export const ALGORITHM_VERSION = 'settlement-v1';

export class SettlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettlementError';
  }
}

/** Raised when the chip count does not match the money left on the table. */
export class ReconciliationError extends SettlementError {
  constructor(public readonly reconciliation: Reconciliation) {
    super(
      `Counted chips do not match the table: off by ${reconciliation.difference}. ` +
        `Settlement cannot run until the difference is zero.`,
    );
    this.name = 'ReconciliationError';
  }
}

export interface SettlementInput {
  /** Everyone involved: those at the table, plus any collector who is not. */
  players: readonly Player[];
  entries: readonly LedgerEntry[];
  /** The host's end-of-night count, for players still seated. */
  finalCounts: ReadonlyMap<PlayerId, Money>;
  rules: readonly MoneyRule[];
}

export interface SettlementResult {
  algorithmVersion: string;
  reconciliation: Reconciliation;
  players: PlayerSettlement[];
  deductions: Deduction[];
  /** What leaves the table in total — "$296 leaves the table". */
  totalOffTable: Money;
  transfers: Transfer[];
}

/**
 * Check the count without computing anything else.
 *
 * The close flow calls this while the host is still counting, so the mismatch
 * can be shown live and driven to zero.
 */
export function checkReconciliation(input: SettlementInput): Reconciliation {
  return reconcile(resolveLedger(input.entries), input.finalCounts);
}

/**
 * Compute the whole settlement.
 *
 * Throws ReconciliationError if the count is off — the design does not let the
 * flow continue past a mismatch, and neither does this.
 */
export function settle(input: SettlementInput): SettlementResult {
  const ledger = resolveLedger(input.entries);
  const reconciliation = reconcile(ledger, input.finalCounts);
  if (!reconciliation.reconciled) throw new ReconciliationError(reconciliation);

  // Sorted once, used everywhere: no result may depend on input ordering.
  const players = [...input.players].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const atTable = players.filter((p) => p.atTable);
  const known = new Set(players.map((p) => p.id));

  for (const rule of input.rules) {
    if (!known.has(rule.collectorPlayerId)) {
      throw new SettlementError(
        `Rule "${rule.name}" names a collector (${rule.collectorPlayerId}) who is not in the player list`,
      );
    }
  }

  // --- 1. What each player did on their own ---------------------------------
  const gross = new Map<PlayerId, Money>();
  for (const p of players) {
    const boughtIn = ledger.boughtInByPlayer.get(p.id) ?? ZERO;
    gross.set(p.id, subtract(endedWith(ledger, p.id, input.finalCounts), boughtIn));
  }

  // A reconciled count means these cancel out exactly. If they ever don't, the
  // arithmetic is wrong and we must not produce a settlement.
  const grossTotal = sum([...players.map((p) => gross.get(p.id)!)]);
  if (grossTotal !== 0) {
    throw new SettlementError(
      `Gross results do not sum to zero (${grossTotal}). ` +
        `Some money is unaccounted for — refusing to settle.`,
    );
  }

  // --- 2. Apply the rules, in order -----------------------------------------
  const charged = new Map<PlayerId, Money>(players.map((p) => [p.id, ZERO]));
  const credited = new Map<PlayerId, Money>(players.map((p) => [p.id, ZERO]));
  const deductions: Deduction[] = [];

  for (const spec of deductionOrder(input.rules, ledger)) {
    const deduction = applyDeduction(spec, { ledger, atTable, gross, charged });
    if (deduction.total === 0 && deduction.charges.length === 0) continue;

    for (const c of deduction.charges) {
      charged.set(c.playerId, sum([charged.get(c.playerId) ?? ZERO, c.amount]));
    }
    for (const c of deduction.credits) {
      credited.set(c.playerId, sum([credited.get(c.playerId) ?? ZERO, c.amount]));
    }
    deductions.push(deduction);
  }

  // --- 3. Where everyone stands ---------------------------------------------
  const settlements: PlayerSettlement[] = players.map((p) => {
    const g = gross.get(p.id)!;
    const ch = charged.get(p.id)!;
    const cr = credited.get(p.id)!;
    return {
      playerId: p.id,
      boughtIn: ledger.boughtInByPlayer.get(p.id) ?? ZERO,
      endedWith: endedWith(ledger, p.id, input.finalCounts),
      grossResult: g,
      charged: ch,
      credited: cr,
      finalPosition: money(g - ch + cr),
    };
  });

  const positionTotal = sum(settlements.map((s) => s.finalPosition));
  if (positionTotal !== 0) {
    throw new SettlementError(
      `Final positions do not sum to zero (${positionTotal}). Refusing to settle.`,
    );
  }

  return {
    algorithmVersion: ALGORITHM_VERSION,
    reconciliation,
    players: settlements,
    deductions,
    totalOffTable: sum(deductions.map((d) => d.total)),
    transfers: matchTransfers(settlements),
  };
}

/**
 * Match debtors to creditors, largest first, so the room makes as few payments
 * as possible.
 *
 * Largest-first is not guaranteed to be the theoretical minimum number of
 * transfers (that problem is NP-hard), but it is close, it is fast, and — more
 * important for a settlement everyone is watching — it is obvious and it is
 * reproducible.
 */
export function matchTransfers(settlements: readonly PlayerSettlement[]): Transfer[] {
  const debtors = settlements
    .filter((s) => s.finalPosition < 0)
    .map((s) => ({ id: s.playerId, remaining: -s.finalPosition }))
    // biggest debt first; ties by id so the result never depends on input order
    .sort((a, b) => b.remaining - a.remaining || (a.id < b.id ? -1 : 1));

  const creditors = settlements
    .filter((s) => s.finalPosition > 0)
    .map((s) => ({ id: s.playerId, remaining: s.finalPosition as number }))
    .sort((a, b) => b.remaining - a.remaining || (a.id < b.id ? -1 : 1));

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      transfers.push({
        fromPlayerId: debtor.id,
        toPlayerId: creditor.id,
        amount: money(amount),
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;
    if (debtor.remaining === 0) d++;
    if (creditor.remaining === 0) c++;
  }

  return transfers;
}

// =============================================================================
// Deductions
// =============================================================================

/**
 * A deduction to apply. Either a configured rule, or the implicit
 * reimbursement of expenses when the group never wrote a bill rule.
 */
interface DeductionSpec {
  rule: MoneyRule | null;
  /** Reimburse the people who actually paid for things, rather than a collector. */
  reimbursesExpenses: boolean;
}

/**
 * Decide which deductions run and in what order.
 *
 * Expenses are money someone spent out of their own pocket, so it has to come
 * back to them. If the group has a rule with destination 'bill', that rule says
 * how the cost is shared, and the expense total is the amount — the rule's own
 * amount is only used when nothing was recorded as an expense. If there is no
 * bill rule at all, the expenses are still owed, so they are shared equally
 * across the table before anything else.
 */
function deductionOrder(
  rules: readonly MoneyRule[],
  ledger: ResolvedLedger,
): DeductionSpec[] {
  const active = [...rules]
    .filter((r) => r.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1));

  const firstBill = active.find((r) => r.destination === 'bill');
  const hasExpenses = ledger.totalExpenses > 0;

  const specs: DeductionSpec[] = [];

  if (hasExpenses && !firstBill) {
    specs.push({ rule: null, reimbursesExpenses: true });
  }

  for (const rule of active) {
    specs.push({
      rule,
      reimbursesExpenses: hasExpenses && rule === firstBill,
    });
  }

  return specs;
}

interface DeductionContext {
  ledger: ResolvedLedger;
  atTable: readonly Player[];
  gross: ReadonlyMap<PlayerId, Money>;
  charged: ReadonlyMap<PlayerId, Money>;
}

function applyDeduction(spec: DeductionSpec, ctx: DeductionContext): Deduction {
  const { rule, reimbursesExpenses } = spec;
  const { ledger, atTable, gross, charged } = ctx;

  const name = rule?.name ?? 'Expenses';
  const destination = rule?.destination ?? 'bill';
  const basisKind = rule?.basis ?? 'gross';

  // What each person's share is measured against.
  const basisFor = (id: PlayerId): Money =>
    basisKind === 'gross'
      ? gross.get(id)!
      : subtract(gross.get(id)!, charged.get(id) ?? ZERO);

  // --- who pays --------------------------------------------------------------
  const everyone = atTable;
  const winnersOnly =
    rule !== null && rule.charge === 'winners_only' && rule.split !== 'across_everyone';

  let payers = winnersOnly ? everyone.filter((p) => basisFor(p.id) > 0) : everyone;

  // Somebody really spent this money, so it has to be shared by someone.
  if (payers.length === 0 && reimbursesExpenses) payers = everyone;

  // --- how much in total -----------------------------------------------------
  // When a bill covers real expenses, the expenses ARE the amount: someone
  // spent a specific sum and needs exactly that back. A percentage of a
  // specific bill is meaningless, so a reimbursing rule only gets to say how
  // the cost is shared, not how much it is.
  const usePercent = rule?.amountKind === 'percent' && !reimbursesExpenses;
  const fixedTotal = reimbursesExpenses ? ledger.totalExpenses : (rule?.amount ?? ZERO);

  const nothingToDo = payers.length === 0 || (!usePercent && fixedTotal === 0);
  if (nothingToDo) {
    return { ruleId: rule?.id ?? null, name, destination, total: ZERO, charges: [], credits: [] };
  }

  let charges: Array<{ playerId: PlayerId; amount: Money }>;

  if (usePercent) {
    // Each payer is charged a percentage of their own share. Losers have
    // nothing to take a percentage of, so they pay nothing.
    charges = payers
      .map((p) => ({
        playerId: p.id,
        amount: percentOf(money(Math.max(basisFor(p.id), 0)), rule!.amount),
      }))
      .filter((c) => c.amount > 0);
  } else {
    // A fixed sum, divided between the payers. allocate() is what guarantees
    // the parts add back up to the whole.
    const weights =
      rule?.split === 'by_win_size'
        ? payers.map((p) => Math.max(basisFor(p.id), 0))
        : payers.map(() => 1);

    const parts = allocate(fixedTotal, weights);
    charges = payers
      .map((p, i) => ({ playerId: p.id, amount: parts[i] }))
      .filter((c) => c.amount > 0);
  }

  const total = sum(charges.map((c) => c.amount));

  // --- who ends up holding it ------------------------------------------------
  // Expense payers get back exactly what they put in; otherwise the rule's one
  // collector holds the lot.
  const credits: Array<{ playerId: PlayerId; amount: Money }> =
    reimbursesExpenses && total > 0
      ? [...ledger.expensesByPayer.entries()]
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([playerId, amount]) => ({ playerId, amount }))
      : total > 0 && rule
        ? [{ playerId: rule.collectorPlayerId, amount: total }]
        : [];

  const creditTotal = sum(credits.map((c) => c.amount));
  if (creditTotal !== total) {
    throw new SettlementError(
      `Deduction "${name}" collected ${total} but paid out ${creditTotal}. Refusing to settle.`,
    );
  }

  return { ruleId: rule?.id ?? null, name, destination, total, charges, credits };
}
