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
    /**
     * What this table is called, where the group is running two. Null reads as
     * "Tonight", which is what one table on its own is called.
     */
    tableName?: string | null;
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
    table_name: p.session.tableName ?? null,
    status: 'live',
  },
});

/**
 * A person on the roster.
 *
 * NOT `ignoreDuplicates`, for the same reason a money rule is not: a name is
 * the other thing a host edits, and GR5's rename wrote it to the phone and
 * nowhere else. Every night that player had already been in kept the old name
 * on the server for ever, and the one place it showed was the phone of the
 * member who pulled the book — the person least able to explain it.
 *
 * Only these three columns are named, so `claimed_by_user_id` is untouched by
 * a rename: renaming somebody does not un-claim them.
 */
export const playerRow = (p: PlayerPayload, bookId: string): RowWrite => ({
  table: 'player',
  onConflict: 'id',
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
    // A spend has four shapes since 0004, and three of them have no payer: one
    // the piggy bank covered, and one nobody has been named for yet. Both are
    // `payer_id` null, and the shape constraint wants EXACTLY ONE of the two
    // columns, so leaving these off does not send a spend without its cover —
    // it sends a row the server refuses. The queue drains in order and halts at
    // its first failure, so one piggy-bank pizza stops the whole night, and
    // every night queued behind it, from ever reaching the server.
    covered_by: e.coveredBy ?? null,
    spend_group: e.spendGroup ?? null,
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

// ---------------------------------------------------------------------------
// What the group and the night are SET UP as
// ---------------------------------------------------------------------------
// Everything above this line is what HAPPENED — money, seats, counts, the
// frozen result. Everything below is what it happened UNDER, and until it was
// written it was the half of the app that never left the phone: the group's
// name, its currency, its buy-in, its blinds, its rounding, the name of one
// table among two, how far through the evening a night is, a rule the host
// deleted, and who has since paid.
//
// THEY ARE PATCHES, NOT UPSERTS, AND THAT IS THE POINT. A patch against a row
// that is not there yet is a no-op; an upsert against it is an insert missing
// every NOT NULL column the payload does not carry, which the server refuses —
// and the queue halts at its first failure, in front of every real night behind
// it. A setting that quietly does not land is a bad day. A jammed queue is the
// week `queueable.ts` was written about.

/** A row to remove. `match` is the whole key, because not every table has an id. */
export interface RowDelete {
  table: string;
  match: Record<string, unknown>;
}

export interface BookPayload {
  groupName: string;
  /**
   * What the group was called when the queue last spoke, on a rename. The drain
   * looks the book up under either name; the patch then writes the new one.
   */
  previousName?: string;
  book: {
    /** ISO 4217, three letters. The club's own column. */
    currencyCode?: string;
    defaultBuyIn?: number | null;
    /** The blinds, serialised as the phone stores them. */
    stakes?: string | null;
    roundingMode?: RoundingMode | null;
  };
}

/**
 * The group's settings.
 *
 * `group_name` comes off the payload's own `groupName`, which is how a rename
 * reaches the server at all: `ensureBook` resolves the book by that name, so a
 * renamed club would otherwise mint a SECOND book and split the group in two.
 * See `sync.ts` for the other half of that — a rename queues under the old name
 * and the drain is told about both.
 */
export const bookPatch = (p: BookPayload, bookId: string): RowPatch => {
  const b = p.book;
  return {
    table: 'book',
    matchId: bookId,
    patch: {
      group_name: p.groupName,
      ...(b.currencyCode === undefined ? {} : { currency_code: b.currencyCode }),
      ...(b.defaultBuyIn === undefined ? {} : { default_buyin: b.defaultBuyIn }),
      ...(b.stakes === undefined ? {} : { stakes: b.stakes }),
      ...(b.roundingMode === undefined ? {} : { rounding_mode: b.roundingMode }),
    },
  };
};

export interface SessionPatchPayload {
  sessionId: string;
  /** The app's own vocabulary. `open` is the server's `live`. */
  status?: 'open' | 'counting';
  tableName?: string | null;
  roundingMode?: RoundingMode | null;
}

/**
 * A night, changed after it opened.
 *
 * `ended_at` IS DELIBERATELY NOT HERE, and it is the one column somebody will
 * try to add. The server checks `(status = 'settled') = (ended_at is not null)`,
 * so stamping the moment the cards stopped onto a night that is still counting
 * is a constraint violation — which halts the queue. The time a night ended
 * reaches the server with the close, in `sessionClosedPatch`, where the status
 * moves with it and the check holds.
 *
 * `settled` is not a status this can send for the same reason: closing is one
 * operation that writes the settlement first and the status after it, because a
 * night marked finished with no result behind it is a lie.
 */
export const sessionPatch = (p: SessionPatchPayload): RowPatch => ({
  table: 'session',
  matchId: p.sessionId,
  patch: {
    ...(p.status === undefined ? {} : { status: p.status === 'open' ? 'live' : 'counting' }),
    ...(p.tableName === undefined ? {} : { table_name: p.tableName }),
    ...(p.roundingMode === undefined ? {} : { rounding_mode: p.roundingMode }),
  },
});

/**
 * The standing answers about one person: whether they pay the kitty, and
 * whether they are still offered a seat.
 *
 * REMOVING IS NOT DELETING. The row stays, with every night that points at it,
 * and `removed_at` is what stops them being seated again — which is why this is
 * a patch and there is no `player.delete` anywhere in this file.
 */
export interface PlayerTermsPayload {
  playerId: string;
  paysKitty: boolean;
  /** When they came off the roster, or null while they are on it. */
  removedAt: string | null;
}

export const playerTermsPatch = (p: PlayerTermsPayload): RowPatch => ({
  table: 'player',
  matchId: p.playerId,
  patch: { pays_kitty: p.paysKitty, removed_at: p.removedAt },
});

/**
 * A money rule the group no longer has.
 *
 * A DELETE rather than `active = false`, because those are different facts and
 * the app has both: a rule switched off is still the group's rule and comes
 * back next week, and a rule deleted is gone. Nothing points at the row — a
 * settled night carries its own copy of every rule in `rules_snapshot`, which
 * is exactly why deleting one cannot restate a night already paid out on.
 */
export interface RuleDeletePayload {
  ruleId: string;
}

export const ruleDelete = (p: RuleDeletePayload, bookId: string): RowDelete => ({
  table: 'money_rule',
  match: { id: p.ruleId, book_id: bookId },
});

/**
 * A transfer somebody has actually paid, or has stopped having paid.
 *
 * ONE KIND FOR BOTH DIRECTIONS. The tick goes both ways — B21 — and a queued
 * tick that is untapped before the next drain must not reach the server as a
 * payment; queueing under the same id replaces it in place, which is only
 * correct while one id means one transfer's current state rather than one
 * event.
 */
export interface PaymentPayload {
  sessionId: string;
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  /** When the cash arrived, or null to say it has not. */
  paidAt: string | null;
}

export const paymentRow = (p: PaymentPayload): RowWrite => ({
  table: 'transfer_payment',
  onConflict: 'session_id,from_player_id,to_player_id',
  row: {
    session_id: p.sessionId,
    from_player_id: p.fromPlayerId,
    to_player_id: p.toPlayerId,
    paid_at: p.paidAt,
  },
});

export const paymentDelete = (p: PaymentPayload): RowDelete => ({
  table: 'transfer_payment',
  match: {
    session_id: p.sessionId,
    from_player_id: p.fromPlayerId,
    to_player_id: p.toPlayerId,
  },
});
