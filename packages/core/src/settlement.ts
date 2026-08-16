/**
 * Settlement — the night's arithmetic.
 *
 * This is a pure function of (ledger, counts, rules). Given the same inputs it
 * must always produce the same output, byte for byte, which is what makes the
 * frozen record on the server auditable and what lets the app show the same
 * numbers live. Two things are required for that and both are deliberate here:
 *
 *   ORDERING  — rules apply in sortOrder; players are iterated in a sorted
 *               order, never in map/object insertion order; a leftover unit
 *               goes to the biggest winner, then by name; and ties in the
 *               transfer matching break on name.
 *   ROUNDING  — a percentage rounds half up, per the handoff's worked night,
 *               and dividing a total between people goes through allocate(),
 *               which guarantees the parts sum back to the whole exactly.
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
import {
  UNACCOUNTED_ID,
  UNACCOUNTED_NAME,
  type Deduction,
  type DiscrepancyAcknowledgement,
  type LedgerEntry,
  type MoneyRule,
  type Player,
  type PlayerId,
  type PlayerSettlement,
  type Reconciliation,
  type Transfer,
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
  /**
   * Set only when the count does not balance and the host has confirmed the
   * missing amount. Without it, a night that does not add up cannot be closed.
   */
  acknowledgedDiscrepancy?: DiscrepancyAcknowledgement;
}

export interface SettlementResult {
  algorithmVersion: string;
  reconciliation: Reconciliation;
  players: PlayerSettlement[];
  deductions: Deduction[];
  /** What leaves the table in total — "$296 leaves the table". */
  totalOffTable: Money;
  transfers: Transfer[];
  /** Present only when the night was closed over a confirmed discrepancy. */
  acknowledgedDiscrepancy?: DiscrepancyAcknowledgement;
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
  const ack = input.acknowledgedDiscrepancy;

  // THE CLOSE GATE. A night closes only if the money balances, or if the host
  // has looked at the exact shortfall and confirmed it.
  if (!reconciliation.reconciled) {
    if (!ack) throw new ReconciliationError(reconciliation);
    if (ack.amount !== reconciliation.difference) {
      // The count changed after the host confirmed it. Making them look again
      // is the whole point — a stale confirmation would rubber-stamp a
      // different number from the one they actually saw.
      throw new SettlementError(
        `The confirmed discrepancy (${ack.amount}) no longer matches the count, which is now off by ` +
          `${reconciliation.difference}. The host must confirm the current figure.`,
      );
    }
  }
  // Confirming a discrepancy that does not exist would put a phantom line in an
  // otherwise clean night.
  if (reconciliation.reconciled && ack && ack.amount !== 0) {
    throw new SettlementError(
      `A discrepancy of ${ack.amount} was confirmed, but the night balances exactly.`,
    );
  }

  // Sorted once, used everywhere: no result may depend on input ordering.
  const players = [...input.players].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const atTable = players.filter((p) => p.atTable);
  const known = new Set(players.map((p) => p.id));

  // ONLY THE RULES THAT WILL RUN. A rule the host switched off for tonight
  // takes nothing and pays nobody, so its shape cannot make a night wrong —
  // but validating it anyway made switching a rule off useless as a way out of
  // a rule that would not settle, which is the one remedy the interface offers.
  for (const rule of input.rules.filter((r) => r.active)) {
    if (!known.has(rule.collectorPlayerId)) {
      throw new SettlementError(
        `Rule "${rule.name}" names a collector (${rule.collectorPlayerId}) who is not in the player list`,
      );
    }
    // A percentage of a loss is not a thing, so a percentage rule can only ever
    // charge winners. The UI prevents the pair; this rejects it if it slips past.
    if (rule.amountKind === 'percent' && rule.charge !== 'winners_only') {
      throw new SettlementError(
        `Rule "${rule.name}" is a percentage charged to everyone. A percentage can only be charged to winners.`,
      );
    }
    if (rule.split === 'custom' && !rule.customShares) {
      throw new SettlementError(`Rule "${rule.name}" is a custom split but names no amounts.`);
    }
    for (const share of rule.customShares ?? []) {
      if (!known.has(share.playerId)) {
        throw new SettlementError(
          `Rule "${rule.name}" gives a custom share to ${share.playerId}, who is not in the player list`,
        );
      }
    }
  }

  /** Lookup used by custom splits, which name their own payers. */
  const byId = new Map(input.players.map((p) => [p.id, p]));

  // --- 1. What each player did on their own ---------------------------------
  const gross = new Map<PlayerId, Money>();
  for (const p of players) {
    const boughtIn = ledger.boughtInByPlayer.get(p.id) ?? ZERO;
    gross.set(p.id, subtract(endedWith(ledger, p.id, input.finalCounts), boughtIn));
  }

  // Gross results always sum to the count difference — exactly zero on a night
  // that balances. Anything else means the arithmetic itself is wrong, which is
  // a different thing from money being missing, and is never recoverable.
  const grossTotal = sum([...players.map((p) => gross.get(p.id)!)]);
  if (grossTotal !== reconciliation.difference) {
    throw new SettlementError(
      `Gross results sum to ${grossTotal} but the count is off by ${reconciliation.difference}. ` +
        `The two must agree — refusing to settle.`,
    );
  }

  // A confirmed shortfall is carried by a named party rather than quietly
  // spread across the players. The books close, and the hole stays visible.
  //
  // Either somebody absorbs it now — a player, or whoever holds the kitty — or
  // it is left against 'Unaccounted', which records the gap without deciding
  // who eats it. Both close the night; the second leaves the payouts to be
  // adjusted by hand later.
  const participants: Player[] = [...players];
  if (reconciliation.difference !== 0) {
    const absorber = ack?.absorbedByPlayerId;
    if (absorber !== undefined) {
      if (!known.has(absorber)) {
        throw new SettlementError(
          `The shortfall is assigned to ${absorber}, who is not in the player list`,
        );
      }
      gross.set(absorber, money(gross.get(absorber)! - reconciliation.difference));
    } else {
      participants.push({ id: UNACCOUNTED_ID, name: UNACCOUNTED_NAME, atTable: false });
      gross.set(UNACCOUNTED_ID, money(-reconciliation.difference));
    }
  }

  // --- 2. Apply the rules, in order -----------------------------------------
  const charged = new Map<PlayerId, Money>(participants.map((p) => [p.id, ZERO]));
  const credited = new Map<PlayerId, Money>(participants.map((p) => [p.id, ZERO]));
  const deductions: Deduction[] = [];

  for (const spec of deductionOrder(input.rules, ledger)) {
    const deduction = applyDeduction(spec, { ledger, atTable, byId, gross, charged });
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
  const settlements: PlayerSettlement[] = participants.map((p) => {
    const g = gross.get(p.id)!;
    const ch = charged.get(p.id)!;
    const cr = credited.get(p.id)!;
    return {
      playerId: p.id,
      name: p.name,
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
    ...(ack ? { acknowledgedDiscrepancy: ack } : {}),
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
  // Biggest first, ties broken by name ascending, so the same night always
  // produces the same list of payments no matter what order the data arrived in.
  const bySize = (a: { remaining: number; name: string }, b: { remaining: number; name: string }) =>
    b.remaining - a.remaining || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

  const debtors = settlements
    .filter((s) => s.finalPosition < 0)
    .map((s) => ({ id: s.playerId, name: s.name, remaining: -s.finalPosition }))
    .sort(bySize);

  const creditors = settlements
    .filter((s) => s.finalPosition > 0)
    .map((s) => ({ id: s.playerId, name: s.name, remaining: s.finalPosition as number }))
    .sort(bySize);

  const transfers: Transfer[] = [];

  // One debtor at a time, biggest first, and each is finished before the next
  // starts. That keeps a person's payments together in the list — "Ivo pays
  // Marek, then Lena, done" — which is how the room actually settles up.
  // Within a debtor, the largest outstanding creditor is chosen fresh each
  // time, because paying someone partially changes who the largest is.
  for (const debtor of debtors) {
    while (debtor.remaining > 0) {
      let best: (typeof creditors)[number] | undefined;
      for (const creditor of creditors) {
        if (creditor.remaining <= 0) continue;
        if (
          !best ||
          creditor.remaining > best.remaining ||
          (creditor.remaining === best.remaining && creditor.name < best.name)
        ) {
          best = creditor;
        }
      }
      if (!best) break; // nobody left to pay — only possible if the books are unbalanced

      const amount = Math.min(debtor.remaining, best.remaining);
      transfers.push({ fromPlayerId: debtor.id, toPlayerId: best.id, amount: money(amount) });
      debtor.remaining -= amount;
      best.remaining -= amount;
    }
  }

  return transfers;
}

// =============================================================================
// Deductions
// =============================================================================

interface DeductionSpec {
  rule: MoneyRule;
  /** Reimburse the people who actually paid for things, rather than a collector. */
  reimbursesExpenses: boolean;
}

/**
 * Decide which deductions run and in what order.
 *
 * A night at a bar produces a tab: sometimes one bill, sometimes several
 * (food, then drinks), sometimes settled midway and again at the end, and not
 * always by the same person. Each of those is an expense entry naming whoever
 * actually paid.
 *
 * Whether that tab touches the settlement at all is the group's choice:
 *
 *   NO BILL RULE  — the tab is recorded and nothing more. Whoever paid, paid.
 *   A BILL RULE   — the tab is shared out at settle-up. The rule says who
 *                   covers it and in what proportion; the total is the real
 *                   sum of the expenses, and everyone who fronted money gets
 *                   back exactly what they put in.
 *
 * Someone who both paid the bill and owes a share of it is charged their share
 * and credited what they paid, so they end up out of pocket by only the
 * difference.
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

  // No bill rule means the group chose not to put the bar tab through the
  // settlement at all. The expenses stay in the ledger as a record of what was
  // spent, and nobody is charged for them.
  return active.map((rule) => ({
    rule,
    reimbursesExpenses: hasExpenses && rule === firstBill,
  }));
}

interface DeductionContext {
  ledger: ResolvedLedger;
  atTable: readonly Player[];
  byId: ReadonlyMap<PlayerId, Player>;
  gross: ReadonlyMap<PlayerId, Money>;
  charged: ReadonlyMap<PlayerId, Money>;
}

function applyDeduction(spec: DeductionSpec, ctx: DeductionContext): Deduction {
  const { rule, reimbursesExpenses } = spec;
  const { ledger, atTable, byId, gross, charged } = ctx;

  const { name, destination, id: ruleId } = rule;

  // What each person's share is measured against.
  const basisFor = (id: PlayerId): Money =>
    rule.basis === 'gross'
      ? gross.get(id)!
      : subtract(gross.get(id)!, charged.get(id) ?? ZERO);

  // --- who pays --------------------------------------------------------------
  const everyone = atTable;

  // A custom split names its own payers and is the one split that may charge
  // somebody who is not in profit — it is how a single person covers a bill.
  const custom = rule.split === 'custom' ? (rule.customShares ?? []) : null;
  const winnersOnly = rule.charge === 'winners_only' && custom === null;

  let payers = custom
    ? custom.filter((c) => c.amount !== 0).map((c) => byId.get(c.playerId)!).filter(Boolean)
    : winnersOnly
      ? everyone.filter((p) => basisFor(p.id) > 0)
      : everyone;

  // Sitting out of the kitty for one night takes somebody out of the charge
  // and does nothing else: they are still at the table, still counted, still
  // settled. A custom split is exempt from the exemption — an amount typed
  // against a name is already an explicit answer.
  const exempt = new Set(rule.exemptPlayerIds ?? []);
  if (custom === null && exempt.size > 0) payers = payers.filter((p) => !exempt.has(p.id));

  // Somebody really spent this money, so it has to be shared by someone.
  if (payers.length === 0 && reimbursesExpenses) payers = everyone.filter((p) => !exempt.has(p.id));

  // Order decides who absorbs a leftover unit when a total does not divide
  // evenly: biggest win first, then by name. allocate() hands remainders to the
  // earliest position, so sorting here IS the tie-break rule.
  payers = [...payers].sort(
    (a, b) => basisFor(b.id) - basisFor(a.id) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );

  // --- how much in total -----------------------------------------------------
  // When a bill covers real expenses, the expenses ARE the amount: someone
  // spent a specific sum and needs exactly that back. A percentage of a
  // specific bill is meaningless, so a reimbursing rule only gets to say how
  // the cost is shared, not how much it is.
  //
  // What the kitty paid for is NOT in that sum. The kitty's money was
  // collected off the table by its own rule and has already left it, so
  // charging the winners for a round the kitty bought would charge them for it
  // twice. An unpaid spend is in the sum — the round was had and somebody
  // still has to settle it (`11-bill-and-kitty.md` § Covered by).
  const usePercent = rule.amountKind === 'percent' && !reimbursesExpenses;
  const fixedTotal = reimbursesExpenses ? ledger.billableExpenses : rule.amount;

  const nothingToDo = payers.length === 0 || (!usePercent && fixedTotal === 0);
  if (nothingToDo) {
    return { ruleId, name, destination, total: ZERO, charges: [], credits: [] };
  }

  let charges: Array<{ playerId: PlayerId; amount: Money }>;

  if (custom) {
    // The host typed these, so they must add up to the amount being covered
    // exactly — the design makes that field blocking rather than a warning.
    const typed = sum(custom.map((c) => c.amount));
    if (typed !== fixedTotal) {
      throw new SettlementError(
        `Rule "${name}" has custom amounts totalling ${typed}, but ${fixedTotal} needs covering.`,
      );
    }
    charges = custom.filter((c) => c.amount > 0).map((c) => ({ playerId: c.playerId, amount: c.amount }));
  } else if (usePercent) {
    // Each payer is charged a percentage of their own share. Losers have
    // nothing to take a percentage of, so they pay nothing.
    charges = payers
      .map((p) => ({
        playerId: p.id,
        amount: percentOf(money(Math.max(basisFor(p.id), 0)), rule.amount),
      }))
      .filter((c) => c.amount > 0);
  } else {
    // A fixed sum, divided between the payers. allocate() is what guarantees
    // the parts add back up to the whole.
    const weights =
      rule.split === 'by_percent'
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
  // Several people may have paid across the night — one covered the food, one
  // the drinks — so each is credited exactly their own outlay.
  //
  // What was charged for an UNPAID spend has no fronter to go back to, but it
  // cannot simply evaporate or the night stops summing to zero. It goes to the
  // rule's collector, who is the person holding the money to pay the bar with
  // — the same place every non-reimbursing rule's money goes.
  let credits: Array<{ playerId: PlayerId; amount: Money }>;
  if (total === 0) {
    credits = [];
  } else if (reimbursesExpenses) {
    // One row per person, even when the collector also fronted something —
    // two rows against one name would read as two refunds on the deductions
    // screen, and they are one.
    const owed = new Map(ledger.expensesByPayer);
    if (ledger.expensesUnpaid > 0) {
      addOwed(owed, rule.collectorPlayerId, ledger.expensesUnpaid);
    }
    credits = [...owed.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([playerId, amount]) => ({ playerId, amount }));
  } else {
    credits = [{ playerId: rule.collectorPlayerId, amount: total }];
  }

  const creditTotal = sum(credits.map((c) => c.amount));
  if (creditTotal !== total) {
    throw new SettlementError(
      `Deduction "${name}" collected ${total} but paid out ${creditTotal}. Refusing to settle.`,
    );
  }

  return { ruleId, name, destination, total, charges, credits };
}

/** Add to a player's entry in a running total, creating it if absent. */
function addOwed(into: Map<PlayerId, Money>, playerId: PlayerId, amount: Money): void {
  into.set(playerId, sum([into.get(playerId) ?? ZERO, amount]));
}
