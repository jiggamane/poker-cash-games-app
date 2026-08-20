import type { LedgerEntry, MoneyRule, PlayerId, RoundingMode } from '@poker-club/core';

/**
 * Every row the app ever writes to the server, as data rather than as calls.
 *
 * Pulled out of `sync.ts` for one reason: until this file existed, the exact
 * shape of every insert was buried inside a Supabase call that has never
 * executed — no test could reach it, and the column names were an assertion
 * made by reading the schema rather than a fact. Here they are pure values, so
 * `syncRows.test.ts` can check them and `supabase/test/03_sync_contract.sql`
 * can replay them against a real Postgres.
 *
 * NOTHING IN HERE TOUCHES THE NETWORK. It builds rows; sync.ts sends them.
 *
 * If a column set changes, the test in `syncRows.test.ts` fails on purpose and
 * names the SQL file that has to change with it. That tripwire is the whole
 * point: two descriptions of the same table drift silently otherwise.
 */

export interface RowWrite {
  table: string;
  row: Record<string, unknown>;
  /** The unique column(s) an upsert resolves against. */
  onConflict: string;
  /** True when an existing row must be left exactly as it is. */
  ignoreDuplicates?: boolean;
}

export interface RowPatch {
  table: string;
  patch: Record<string, unknown>;
  matchId: string;
}

export interface SessionOpenPayload {
  groupName: string;
  session: {
    id: string;
    startedAt: string;
    defaultBuyIn: number;
    stakes?: string;
    seatCount: number;
    /**
     * How coarsely this night settles, copied off the club at birth. Null is
     * whole dollars. Written once, with the row: the authoritative record of
     * what a night was actually settled under is the settlement's own
     * `inputs_snapshot`, which is written at close.
     */
    roundingMode?: RoundingMode | null;
  };
}

export interface PlayerPayload {
  groupName: string;
  player: { id: string; name: string };
}

export interface SeatPayload {
  sessionId: string;
  playerId: string;
}

/** The entry, plus when it happened — which is not derivable from its seq. */
export type EntryPayload = LedgerEntry & { occurredAt: string; note?: string };

export interface RulePayload {
  groupName: string;
  rule: MoneyRule;
}

export interface CountPayload {
  sessionId: string;
  playerId: PlayerId;
  amount: number;
}

export interface ClosePayload {
  sessionId: string;
  endedAt: string;
  settlement: {
    algorithmVersion: string;
    rulesSnapshot: unknown;
    inputsSnapshot: unknown;
    computedTransfers: unknown;
    totalOffTable: number;
    discrepancyAmount: number;
    discrepancyNote?: string;
    discrepancyAbsorbedBy?: PlayerId;
    /**
     * What `verifyNight()` made of the result, on the device, at close.
     *
     * Travels with the settlement rather than after it, so a night that failed
     * its own arithmetic cannot reach the server looking clean. See
     * `0008_verification.sql` for why the phone's own verdict is worth storing
     * even though the phone is the thing being checked.
     */
    verification?: unknown;
  };
}

/**
 * The night itself.
 *
 * `ignoreDuplicates` is not an optimisation: the row carries the share_token,
 * and overwriting it would silently invalidate every link already sent to the
 * room.
 */
export const sessionRow = (p: SessionOpenPayload, bookId: string): RowWrite => ({
  table: 'session',
  onConflict: 'id',
  ignoreDuplicates: true,
  row: {
    id: p.session.id,
    book_id: bookId,
    default_buyin: p.session.defaultBuyIn,
    seat_count: p.session.seatCount,
    started_at: p.session.startedAt,
    stakes: p.session.stakes ?? null,
    rounding_mode: p.session.roundingMode ?? null,
    status: 'live',
  },
});

export const playerRow = (p: PlayerPayload, bookId: string): RowWrite => ({
  table: 'player',
  onConflict: 'id',
  ignoreDuplicates: true,
  row: { id: p.player.id, book_id: bookId, display_name: p.player.name },
});

export const seatRow = (p: SeatPayload): RowWrite => ({
  table: 'session_seat',
  onConflict: 'session_id,player_id',
  ignoreDuplicates: true,
  row: { session_id: p.sessionId, player_id: p.playerId },
});

export const entryRow = (sessionId: string, e: EntryPayload): RowWrite => ({
  table: 'ledger_entry',
  onConflict: 'id',
  ignoreDuplicates: true,
  row: {
    id: e.id,
    session_id: sessionId,
    seq: e.seq,
    type: e.type,
    player_id: e.playerId ?? null,
    payer_id: e.payerId ?? null,
    amount: e.amount,
    note: e.note ?? null,
    corrects_entry_id: e.correctsEntryId ?? null,
    occurred_at: e.occurredAt,
  },
});

/**
 * A money rule.
 *
 * NOT `ignoreDuplicates`: a rule is the one thing here a host edits, and an
 * edit that never reached the server would leave the group's rules describing
 * last month.
 *
 * `sort_order` is unique per book, so a rule keeps its id across nights and is
 * updated in place. Giving a carried-forward rule a new id would collide with
 * the row still holding its position.
 */
export const ruleRow = (p: RulePayload, bookId: string): RowWrite => ({
  table: 'money_rule',
  onConflict: 'id',
  row: {
    id: p.rule.id,
    book_id: bookId,
    name: p.rule.name,
    active: p.rule.active,
    amount_kind: p.rule.amountKind,
    amount: p.rule.amount,
    basis: p.rule.basis,
    charge: p.rule.charge,
    destination: p.rule.destination,
    split: p.rule.split,
    custom_shares: p.rule.customShares ?? null,
    collector_player_id: p.rule.collectorPlayerId,
    sort_order: p.rule.sortOrder,
  },
});

export const countRow = (p: CountPayload): RowWrite => ({
  table: 'final_count',
  onConflict: 'session_id,player_id',
  row: { session_id: p.sessionId, player_id: p.playerId, counted_chips: p.amount },
});

/**
 * The frozen result.
 *
 * A shortfall must carry somebody's name and the moment they put it there —
 * the schema refuses the row otherwise, which is the point: missing money is
 * never recorded quietly.
 */
export const settlementRow = (p: ClosePayload, hostUserId: string): RowWrite => {
  const s = p.settlement;
  const shortfall = s.discrepancyAmount !== 0;

  return {
    table: 'settlement',
    onConflict: 'session_id',
    ignoreDuplicates: true,
    row: {
      session_id: p.sessionId,
      algorithm_version: s.algorithmVersion,
      rules_snapshot: s.rulesSnapshot,
      inputs_snapshot: s.inputsSnapshot,
      computed_transfers: s.computedTransfers,
      total_off_table: s.totalOffTable,
      discrepancy_amount: s.discrepancyAmount,
      discrepancy_confirmed_by: shortfall ? hostUserId : null,
      discrepancy_confirmed_at: shortfall ? p.endedAt : null,
      discrepancy_note: s.discrepancyNote ?? null,
      discrepancy_absorbed_by: s.discrepancyAbsorbedBy ?? null,
      verification: s.verification ?? null,
      frozen: true,
    },
  };
};

/** The session going settled, after its settlement exists. */
export const sessionClosedPatch = (p: ClosePayload): RowPatch => ({
  table: 'session',
  matchId: p.sessionId,
  patch: { status: 'settled', ended_at: p.endedAt },
});
