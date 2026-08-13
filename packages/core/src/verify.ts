import { resolveLedger } from './ledger';
import { ALGORITHM_VERSION, settle, type SettlementInput, type SettlementResult } from './settlement';
import { UNACCOUNTED_ID, type PlayerId } from './types';

/**
 * Checking the night's arithmetic against something other than itself.
 *
 * WHY THIS IS NOT JUST MORE TESTS. `settlement.test.ts` proves the engine
 * behaves as designed on nights we thought of. This runs on nights nobody
 * thought of — every real one, as it is played — and asks a different question:
 * not "does the code do what we meant" but "does this stored record add up".
 * A bug we have not imagined is exactly the one the unit tests cannot see, and
 * it reaches a person's wallet.
 *
 * INDEPENDENCE IS THE WHOLE VALUE. Every check below re-derives its expectation
 * from the raw ledger and from the definitions written in `types.ts` — never by
 * calling the helper that produced the number. A verifier that asked the engine
 * whether the engine was right would pass on every night and catch nothing.
 * The one place `settle()` is called is the determinism check, where running it
 * again is the point.
 *
 * WHAT A FAILURE MEANS. Not "the figures look odd" — every check here is an
 * identity that cannot be false about a correct night. One failing means either
 * the engine computed something wrong, or the record was corrupted between the
 * table and here. Both are the same emergency: somebody has been asked to pay
 * the wrong amount.
 */

/** One broken identity, in the language of the thing that broke. */
export interface Finding {
  /** Stable, greppable, and safe to count by. */
  code: string;
  /** What is wrong, with the figures in it. */
  detail: string;
  /** Whose row it is about, where that is meaningful. */
  playerId?: PlayerId;
}

export interface Verdict {
  ok: boolean;
  /** Empty when ok. Never partial: everything is checked, always. */
  findings: Finding[];
  /** What was checked, so a report can say "18 identities over 6 players". */
  checked: number;
  algorithmVersion: string;
}

/**
 * Check one night, end to end.
 *
 * Takes the INPUT as well as the result on purpose. A result alone can only be
 * checked for internal consistency — that its own columns add up — which a
 * confidently wrong engine would pass. Given the ledger it came from, the buy-
 * ins and the cash-outs can be re-derived from the money events themselves.
 */
export function verifyNight(input: SettlementInput, result: SettlementResult): Verdict {
  const findings: Finding[] = [];
  let checked = 0;

  const fail = (code: string, detail: string, playerId?: PlayerId) => {
    findings.push(playerId === undefined ? { code, detail } : { code, detail, playerId });
  };
  const check = (ok: boolean, code: string, detail: string, playerId?: PlayerId) => {
    checked += 1;
    if (!ok) fail(code, detail, playerId);
  };

  checkLedger(input, check);
  const ledger = safeLedger(input);
  if (ledger === null) {
    // The ledger will not even resolve, so nothing derived from it can be
    // checked. That is one finding, not thirty repetitions of it.
    fail('ledger.unresolvable', 'The ledger could not be resolved at all.');
    return { ok: false, findings, checked: checked + 1, algorithmVersion: result.algorithmVersion };
  }

  checkReconciliation(input, result, ledger, check);
  checkPlayers(input, result, ledger, check);
  checkDeductions(result, check);
  checkTransfers(result, check);
  checkDeterminism(input, result, check);

  return {
    ok: findings.length === 0,
    findings,
    checked,
    algorithmVersion: result.algorithmVersion,
  };
}

type Check = (ok: boolean, code: string, detail: string, playerId?: PlayerId) => void;

function safeLedger(input: SettlementInput): ReturnType<typeof resolveLedger> | null {
  try {
    return resolveLedger(input.entries);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The ledger the night was built from
// ---------------------------------------------------------------------------
// Before any arithmetic, the raw material. A settlement computed from a ledger
// with a duplicated seq or a correction pointing at nothing may be perfectly
// self-consistent and still describe a night that did not happen.

function checkLedger(input: SettlementInput, check: Check): void {
  const ids = new Set(input.players.map((p) => p.id));
  const seen = new Set<number>();
  const entryIds = new Set(input.entries.map((e) => e.id));

  for (const e of input.entries) {
    check(
      Number.isInteger(e.amount) && e.amount >= 0,
      'entry.amount',
      `Entry ${e.id} has amount ${e.amount}, which is not a whole non-negative number.`,
    );

    check(!seen.has(e.seq), 'entry.seq.duplicate', `Two entries share seq ${e.seq}.`);
    seen.add(e.seq);

    if (e.type === 'buyin' || e.type === 'rebuy' || e.type === 'cashout') {
      check(
        e.playerId !== null && e.playerId !== undefined,
        'entry.player.missing',
        `A ${e.type} (${e.id}) names nobody.`,
      );
      check(
        e.playerId === null || e.playerId === undefined || ids.has(e.playerId),
        'entry.player.unknown',
        `Entry ${e.id} names player ${e.playerId}, who is not in this night.`,
      );
    }

    if (e.type === 'expense') {
      check(
        e.payerId !== null && e.payerId !== undefined,
        'entry.payer.missing',
        `An expense (${e.id}) has no payer.`,
      );
    }

    if (e.type === 'correction' || e.type === 'void') {
      check(
        e.correctsEntryId !== null &&
          e.correctsEntryId !== undefined &&
          entryIds.has(e.correctsEntryId),
        'entry.correction.dangling',
        `A ${e.type} (${e.id}) points at ${e.correctsEntryId}, which is not in this night.`,
      );
    }
  }

  for (const [playerId, amount] of input.finalCounts) {
    check(
      ids.has(playerId),
      'count.player.unknown',
      `A final count is recorded for ${playerId}, who is not in this night.`,
      playerId,
    );
    check(
      Number.isInteger(amount) && amount >= 0,
      'count.amount',
      `The count for ${playerId} is ${amount}, which is not a whole non-negative number.`,
      playerId,
    );
  }
}

// ---------------------------------------------------------------------------
// The count against the table
// ---------------------------------------------------------------------------

function checkReconciliation(
  input: SettlementInput,
  result: SettlementResult,
  ledger: ReturnType<typeof resolveLedger>,
  check: Check,
): void {
  const r = result.reconciliation;

  const onTable = ledger.totalBoughtIn - ledger.totalCashedOut;
  check(
    r.chipsOnTable === onTable,
    'recon.onTable',
    `Chips on the table reads ${r.chipsOnTable}; buy-ins less cash-outs is ${onTable}.`,
  );

  let counted = 0;
  for (const amount of input.finalCounts.values()) counted += amount;
  check(
    r.counted === counted,
    'recon.counted',
    `The count reads ${r.counted}; the counts add up to ${counted}.`,
  );

  check(
    r.difference === r.counted - r.chipsOnTable,
    'recon.difference',
    `The difference reads ${r.difference}; counted less on-table is ${r.counted - r.chipsOnTable}.`,
  );

  check(
    r.reconciled === (r.difference === 0),
    'recon.flag',
    `Reconciled says ${r.reconciled} with a difference of ${r.difference}.`,
  );

  // A night that did not balance may only be settled over a confirmation, and
  // the confirmation must be for THIS shortfall — that is what stops a stale
  // acknowledgement being reused on a later night with a different gap.
  if (r.difference !== 0) {
    const ack = result.acknowledgedDiscrepancy;
    check(
      ack !== undefined,
      'recon.unconfirmed',
      `The night is off by ${r.difference} with nothing confirming it.`,
    );
    check(
      ack === undefined || ack.amount === r.difference,
      'recon.ack.amount',
      `The confirmation is for ${ack?.amount}, but the night is off by ${r.difference}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Each player's row, re-derived from the money events
// ---------------------------------------------------------------------------

function checkPlayers(
  input: SettlementInput,
  result: SettlementResult,
  ledger: ReturnType<typeof resolveLedger>,
  check: Check,
): void {
  // What each deduction says it took and gave, summed per person. The player
  // row's own `charged` and `credited` must agree with the deductions that
  // produced them — two statements of one fact, which is exactly the kind that
  // silently drifts apart.
  const chargedByPlayer = new Map<PlayerId, number>();
  const creditedByPlayer = new Map<PlayerId, number>();
  for (const d of result.deductions) {
    for (const c of d.charges) {
      chargedByPlayer.set(c.playerId, (chargedByPlayer.get(c.playerId) ?? 0) + c.amount);
    }
    for (const c of d.credits) {
      creditedByPlayer.set(c.playerId, (creditedByPlayer.get(c.playerId) ?? 0) + c.amount);
    }
  }

  for (const p of result.players) {
    const isHole = p.playerId === UNACCOUNTED_ID;

    check(
      Number.isInteger(p.finalPosition),
      'player.integer',
      `${p.name}'s position is ${p.finalPosition}, which is not a whole number.`,
      p.playerId,
    );

    // The hole is a synthetic party with no ledger behind it, so buy-ins and
    // cash-outs are not defined for it. Everything downstream of the gross —
    // the deductions, the position, the transfers — still is, and is checked.
    if (!isHole) {
      const boughtIn = ledger.boughtInByPlayer.get(p.playerId) ?? 0;
      check(
        p.boughtIn === boughtIn,
        'player.boughtIn',
        `${p.name} is down as buying in ${p.boughtIn}; the ledger says ${boughtIn}.`,
        p.playerId,
      );

      const endedWith =
        (ledger.cashedOutByPlayer.get(p.playerId) ?? 0) + (input.finalCounts.get(p.playerId) ?? 0);
      check(
        p.endedWith === endedWith,
        'player.endedWith',
        `${p.name} is down as ending with ${p.endedWith}; cash-outs plus their count is ${endedWith}.`,
        p.playerId,
      );

      check(
        p.grossResult === p.endedWith - p.boughtIn,
        'player.gross',
        `${p.name}'s gross reads ${p.grossResult}; ended with less bought in is ${p.endedWith - p.boughtIn}.`,
        p.playerId,
      );
    }

    check(
      p.charged === (chargedByPlayer.get(p.playerId) ?? 0),
      'player.charged',
      `${p.name} is charged ${p.charged}, but the deductions take ${chargedByPlayer.get(p.playerId) ?? 0} off them.`,
      p.playerId,
    );

    check(
      p.credited === (creditedByPlayer.get(p.playerId) ?? 0),
      'player.credited',
      `${p.name} is credited ${p.credited}, but the deductions pay them ${creditedByPlayer.get(p.playerId) ?? 0}.`,
      p.playerId,
    );

    check(
      p.finalPosition === p.grossResult - p.charged + p.credited,
      'player.position',
      `${p.name}'s position reads ${p.finalPosition}; gross less charged plus credited is ${p.grossResult - p.charged + p.credited}.`,
      p.playerId,
    );
  }

  // THE ONE THAT MATTERS MOST. Money is neither made nor destroyed at a poker
  // table: what one person is up, the rest are down. If this fails, somebody is
  // being asked to pay money that nobody is owed, or to collect money nobody
  // paid — and every other figure on the screen is meaningless.
  const total = result.players.reduce((t, p) => t + p.finalPosition, 0);
  check(total === 0, 'night.zeroSum', `The positions sum to ${total} instead of zero.`);

  // Everybody in the night appears in the result exactly once.
  const seen = new Set<PlayerId>();
  for (const p of result.players) {
    check(!seen.has(p.playerId), 'player.duplicate', `${p.name} appears twice in the result.`, p.playerId);
    seen.add(p.playerId);
  }
  for (const p of input.players) {
    const played =
      (ledger.boughtInByPlayer.get(p.id) ?? 0) > 0 || input.finalCounts.has(p.id);
    check(
      !played || seen.has(p.id),
      'player.missing',
      `${p.name} has money in this night but no row in the result.`,
      p.id,
    );
  }
}

// ---------------------------------------------------------------------------
// What the rules took off the table
// ---------------------------------------------------------------------------

function checkDeductions(result: SettlementResult, check: Check): void {
  let total = 0;

  for (const d of result.deductions) {
    const charged = d.charges.reduce((t, c) => t + c.amount, 0);
    const credited = d.credits.reduce((t, c) => t + c.amount, 0);
    total += d.total;

    check(
      d.total === charged,
      'deduction.charges',
      `"${d.name}" says it took ${d.total} but its charges add up to ${charged}.`,
    );

    // Every deduction is a MOVEMENT, not a disappearance: whatever the kitty
    // takes, the collector receives; whatever the bill charges, whoever paid
    // for the pizza is given back. A deduction that took more than it paid out
    // would be money vanishing off the table with nobody's name on it.
    check(
      d.total === credited,
      'deduction.credits',
      `"${d.name}" took ${d.total} but paid out ${credited}. The difference is unaccounted for.`,
    );

    for (const c of [...d.charges, ...d.credits]) {
      check(
        Number.isInteger(c.amount) && c.amount >= 0,
        'deduction.amount',
        `"${d.name}" has a line of ${c.amount}, which is not a whole non-negative number.`,
        c.playerId,
      );
    }
  }

  check(
    result.totalOffTable === total,
    'night.offTable',
    `Total off the table reads ${result.totalOffTable}; the deductions add up to ${total}.`,
  );
}

// ---------------------------------------------------------------------------
// Who pays whom
// ---------------------------------------------------------------------------
// The transfers are the only part of a night anybody acts on. Everything above
// can be right and this still wrong, and then the correct figures are on the
// screen while the wrong money moves.

function checkTransfers(result: SettlementResult, check: Check): void {
  const owed = new Map<PlayerId, number>(result.players.map((p) => [p.playerId, p.finalPosition]));
  const moved = new Map<PlayerId, number>(result.players.map((p) => [p.playerId, 0]));

  let out = 0;
  let into = 0;

  for (const t of result.transfers) {
    check(
      Number.isInteger(t.amount) && t.amount > 0,
      'transfer.amount',
      `A transfer of ${t.amount} is not a whole positive number.`,
    );
    check(
      t.fromPlayerId !== t.toPlayerId,
      'transfer.self',
      `A transfer goes from ${t.fromPlayerId} to themselves.`,
      t.fromPlayerId,
    );
    check(
      owed.has(t.fromPlayerId) && owed.has(t.toPlayerId),
      'transfer.stranger',
      `A transfer involves somebody with no row in this night.`,
    );

    moved.set(t.fromPlayerId, (moved.get(t.fromPlayerId) ?? 0) - t.amount);
    moved.set(t.toPlayerId, (moved.get(t.toPlayerId) ?? 0) + t.amount);
    out += t.amount;
    into += t.amount;
  }

  check(out === into, 'transfer.balance', `Transfers pay out ${out} and pay in ${into}.`);

  // EVERY POSITION IS CLEARED, EXACTLY. Not approximately, not on aggregate:
  // each person's transfers must come to precisely what they are up or down,
  // because that is the only sense in which "settled" means anything.
  for (const p of result.players) {
    const m = moved.get(p.playerId) ?? 0;
    check(
      m === p.finalPosition,
      'transfer.unsettled',
      `${p.name} is ${p.finalPosition} but the payments move ${m} to them.`,
      p.playerId,
    );
  }

  // As few payments as the room can get away with. Largest-first is not proven
  // optimal — that problem is NP-hard — but it can never need more than one
  // fewer payment than there are people with something to settle, and a list
  // longer than that means the matching went wrong rather than merely
  // inelegant.
  const active = result.players.filter((p) => p.finalPosition !== 0).length;
  check(
    result.transfers.length <= Math.max(0, active - 1),
    'transfer.count',
    `${result.transfers.length} payments for ${active} people with something to settle.`,
  );
}

// ---------------------------------------------------------------------------
// The same night, twice
// ---------------------------------------------------------------------------

function checkDeterminism(
  input: SettlementInput,
  result: SettlementResult,
  check: Check,
): void {
  check(
    result.algorithmVersion === ALGORITHM_VERSION,
    'night.version',
    `Settled by ${result.algorithmVersion}; this build is ${ALGORITHM_VERSION}.`,
  );

  // Only worth asking of a night this build could still settle. A record from
  // an older algorithm SHOULD differ — that is what versioning it is for — and
  // reporting that as a broken calculation would drown the real ones.
  if (result.algorithmVersion !== ALGORITHM_VERSION) return;

  let again: SettlementResult;
  try {
    again = settle(input);
  } catch (e) {
    check(
      false,
      'night.unreproducible',
      `Re-settling the stored night throws: ${e instanceof Error ? e.message : String(e)}`,
    );
    return;
  }

  // Deep equality by serialisation. Both sides come from the same code path, so
  // key order is stable, and a mismatch anywhere is worth the whole object in
  // the message — this is the check that fires when a record was altered after
  // it was frozen, and the diff is the evidence.
  const before = JSON.stringify(stable(result));
  const after = JSON.stringify(stable(again));
  check(
    before === after,
    'night.drift',
    `Re-settling the same ledger gives a different answer.\n  stored: ${before}\n  now:    ${after}`,
  );
}

/** The parts that must reproduce exactly, in a fixed order. */
const stable = (r: SettlementResult) => ({
  players: [...r.players]
    .sort((a, b) => (a.playerId < b.playerId ? -1 : 1))
    .map((p) => [p.playerId, p.boughtIn, p.endedWith, p.grossResult, p.charged, p.credited, p.finalPosition]),
  deductions: r.deductions.map((d) => [d.ruleId, d.total]),
  transfers: r.transfers.map((t) => [t.fromPlayerId, t.toPlayerId, t.amount]),
  totalOffTable: r.totalOffTable,
});

/**
 * A one-line summary, for a log or a report row.
 *
 * Deliberately states the number of checks even when it passed. "OK" alone
 * cannot be told apart from a verifier that ran nothing, and a verification
 * system that silently stops verifying is worse than none at all.
 */
export function summarise(v: Verdict): string {
  return v.ok
    ? `OK · ${v.checked} checks`
    : `FAILED · ${v.findings.length} of ${v.checked} · ${v.findings.map((f) => f.code).join(', ')}`;
}

/** The shape stored beside a night, so a failure survives the screen it appeared on. */
export interface StoredVerification {
  ok: boolean;
  checked: number;
  algorithmVersion: string;
  codes: string[];
  detail: string[];
  at: string;
}

export function toStored(v: Verdict, at: string): StoredVerification {
  return {
    ok: v.ok,
    checked: v.checked,
    algorithmVersion: v.algorithmVersion,
    codes: v.findings.map((f) => f.code),
    detail: v.findings.map((f) => f.detail),
    at,
  };
}
