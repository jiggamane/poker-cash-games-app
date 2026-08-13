import {
  enqueueOp,
  flushOutbox,
  type FlushResult,
  type LedgerEntry,
  type MoneyRule,
  type Money,
  type OutboxItem,
  type PlayerId,
} from '@poker-club/core';
import { isSupabaseConfigured, supabase } from './supabase';
import { SqliteOutboxStore } from './outboxStore';

/**
 * The queue, and the one place anything reaches the server from.
 *
 * See `docs/storage-and-sync.md`. The shape in one paragraph: every change is
 * written to the phone first and queued here; the queue drains in order and
 * stops at the first failure; every operation is an idempotent upsert on an id
 * the phone generated, so replaying one the server already has is a no-op. That
 * is what makes "retry until it works" correct rather than dangerous, and it is
 * why there is no merge algorithm anywhere in this app.
 *
 * NOTHING HERE IS ON THE SCREEN'S CRITICAL PATH. A host records money into
 * local SQLite and the screen updates from local state; this drains afterwards
 * and is allowed to fail all evening without anybody noticing. Sharing a night
 * has nothing to do with it — that is about letting somebody watch.
 */

export const outbox = new SqliteOutboxStore();

// ---------------------------------------------------------------------------
// What each operation carries.
//
// Payloads are self-contained: whatever the handler needs to write the row must
// be inside, because it may be sent days later from a different app launch by
// which time the night it belongs to is not the one on screen.
// ---------------------------------------------------------------------------

interface SessionOpen {
  groupName: string;
  session: {
    id: string;
    startedAt: string;
    defaultBuyIn: number;
    stakes?: string;
    seatCount: number;
  };
}

interface PlayerUpsert {
  groupName: string;
  player: { id: string; name: string };
}

interface SeatUpsert {
  sessionId: string;
  playerId: string;
}

/** The entry, plus when it happened — which is not derivable from its seq. */
type EntryAppend = LedgerEntry & { occurredAt: string; note?: string };

interface RuleUpsert {
  groupName: string;
  rule: MoneyRule;
}

interface CountUpsert {
  sessionId: string;
  playerId: PlayerId;
  amount: number;
}

interface SessionClose {
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
  };
}

// ---------------------------------------------------------------------------
// Queueing
// ---------------------------------------------------------------------------

/**
 * Queue a night's existence: the book, the session, its players, its seats and
 * the rules it was opened with.
 *
 * Called when a night OPENS, not when it is shared. By the first buy-in the
 * server already has everywhere for that buy-in to land.
 */
export async function queueSessionOpen(args: {
  sessionId: string;
  groupName: string;
  startedAt: string;
  defaultBuyIn: number;
  stakes?: string;
  players: ReadonlyArray<{ id: string; name: string; atTable: boolean }>;
  rules: readonly MoneyRule[];
}): Promise<void> {
  const { sessionId, groupName } = args;

  await enqueueOp<SessionOpen>(outbox, {
    id: `session-open:${sessionId}`,
    sessionId,
    kind: 'session.open',
    payload: {
      groupName,
      session: {
        id: sessionId,
        startedAt: args.startedAt,
        defaultBuyIn: args.defaultBuyIn,
        ...(args.stakes === undefined ? {} : { stakes: args.stakes }),
        seatCount: Math.min(Math.max(args.players.length, 1), 30),
      },
    },
  });

  for (const p of args.players) await queuePlayer(sessionId, groupName, p);
  for (const rule of args.rules) await queueRule(sessionId, groupName, rule);
}

/** A player, and their seat if they are at the table. */
export async function queuePlayer(
  sessionId: string,
  groupName: string,
  player: { id: string; name: string; atTable: boolean },
): Promise<void> {
  await enqueueOp<PlayerUpsert>(outbox, {
    id: `player:${player.id}`,
    sessionId,
    kind: 'player.upsert',
    payload: { groupName, player: { id: player.id, name: player.name } },
  });

  if (player.atTable) {
    await enqueueOp<SeatUpsert>(outbox, {
      id: `seat:${sessionId}:${player.id}`,
      sessionId,
      kind: 'seat.upsert',
      payload: { sessionId, playerId: player.id },
    });
  }
}

export async function queueRule(
  sessionId: string,
  groupName: string,
  rule: MoneyRule,
): Promise<void> {
  await enqueueOp<RuleUpsert>(outbox, {
    id: `rule:${rule.id}`,
    sessionId,
    kind: 'rule.upsert',
    payload: { groupName, rule },
  });
}

export async function queueCount(
  sessionId: string,
  playerId: PlayerId,
  amount: Money,
): Promise<void> {
  await enqueueOp<CountUpsert>(outbox, {
    // One per player per night: counting somebody twice replaces the first.
    id: `count:${sessionId}:${playerId}`,
    sessionId,
    kind: 'count.upsert',
    payload: { sessionId, playerId, amount },
  });
}

export async function queueClose(payload: SessionClose): Promise<void> {
  await enqueueOp<SessionClose>(outbox, {
    id: `close:${payload.sessionId}`,
    sessionId: payload.sessionId,
    kind: 'session.close',
    payload,
  });
}

// ---------------------------------------------------------------------------
// Draining
// ---------------------------------------------------------------------------

/**
 * The host's book id, resolved once per drain.
 *
 * The phone never learns it — a book is the server's own row — so every payload
 * carries the group's name instead and the first operation that needs an id
 * looks it up or creates it.
 */
let bookId: string | null = null;

/**
 * Send what is queued, oldest first.
 *
 * Safe to call as often as you like: it is a no-op with nothing queued, with no
 * project configured, or with nobody signed in. The signed-out check is not an
 * optimisation — signing in is optional in this app, so most writes happen with
 * no account at all, and without it every buy-in would fire a request certain
 * to be refused.
 *
 * Signed out, the queue simply keeps filling. Sign in on Tuesday and the whole
 * of Saturday's night goes up.
 */
export async function drain(): Promise<FlushResult> {
  if (!isSupabaseConfigured) return { pushed: 0, remaining: await outbox.count() };

  const { data } = await supabase.auth.getSession();
  if (data.session === null) return { pushed: 0, remaining: await outbox.count() };

  bookId = null; // re-resolved per drain, in case the account changed

  return flushOutbox(outbox, async (items) => {
    // Sequentially, in order, inside the batch. A batch may hold a session and
    // the entries that depend on it, and the server would refuse the second
    // before the first. Anything already sent is an idempotent upsert, so a
    // failure halfway is retried from the top of the batch without harm.
    for (const item of items) await send(item);
  });
}

async function send(item: OutboxItem): Promise<void> {
  switch (item.kind) {
    case 'session.open':
      return sendSessionOpen(item.payload as SessionOpen);
    case 'player.upsert':
      return sendPlayer(item.payload as PlayerUpsert);
    case 'seat.upsert':
      return sendSeat(item.payload as SeatUpsert);
    case 'entry.append':
      return sendEntry(item.sessionId, item.payload as EntryAppend);
    case 'rule.upsert':
      return sendRule(item.payload as RuleUpsert);
    case 'count.upsert':
      return sendCount(item.payload as CountUpsert);
    case 'session.close':
      return sendClose(item.payload as SessionClose);
  }
}

async function ensureBook(groupName: string): Promise<string> {
  if (bookId !== null) return bookId;

  const { data: existing, error } = await supabase.from('book').select('id').limit(1);
  if (error) throw new Error(error.message);
  if (existing !== null && existing.length > 0) {
    bookId = existing[0].id as string;
    return bookId;
  }

  const { data: auth } = await supabase.auth.getSession();
  const hostId = auth.session?.user.id;
  if (hostId === undefined) throw new Error('Not signed in');

  const { data: created, error: createError } = await supabase
    .from('book')
    .insert({ host_user_id: hostId, group_name: groupName })
    .select('id')
    .single();
  if (createError) throw new Error(createError.message);

  bookId = created.id as string;
  return bookId;
}

async function sendSessionOpen(p: SessionOpen): Promise<void> {
  const book = await ensureBook(p.groupName);
  const { error } = await supabase.from('session').upsert(
    [
      {
        id: p.session.id,
        book_id: book,
        default_buyin: p.session.defaultBuyIn,
        seat_count: p.session.seatCount,
        started_at: p.session.startedAt,
        stakes: p.session.stakes ?? null,
        status: 'live',
      },
    ],
    // Never overwrite: the row carries the share_token, and rewriting it would
    // silently invalidate every link already sent to the room.
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

async function sendPlayer(p: PlayerUpsert): Promise<void> {
  const book = await ensureBook(p.groupName);
  const { error } = await supabase
    .from('player')
    .upsert([{ id: p.player.id, book_id: book, display_name: p.player.name }], {
      onConflict: 'id',
      ignoreDuplicates: true,
    });
  if (error) throw new Error(error.message);
}

async function sendSeat(p: SeatUpsert): Promise<void> {
  const { error } = await supabase
    .from('session_seat')
    .upsert([{ session_id: p.sessionId, player_id: p.playerId }], {
      onConflict: 'session_id,player_id',
      ignoreDuplicates: true,
    });
  if (error) throw new Error(error.message);
}

async function sendEntry(sessionId: string, e: EntryAppend): Promise<void> {
  const { error } = await supabase.from('ledger_entry').upsert(
    [
      {
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
    ],
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

async function sendRule(p: RuleUpsert): Promise<void> {
  const book = await ensureBook(p.groupName);
  const r = p.rule;
  const { error } = await supabase.from('money_rule').upsert(
    [
      {
        id: r.id,
        book_id: book,
        name: r.name,
        active: r.active,
        amount_kind: r.amountKind,
        amount: r.amount,
        basis: r.basis,
        charge: r.charge,
        destination: r.destination,
        split: r.split,
        custom_shares: r.customShares ?? null,
        collector_player_id: r.collectorPlayerId,
        sort_order: r.sortOrder,
      },
    ],
    { onConflict: 'id' },
  );
  if (error) throw new Error(error.message);
}

async function sendCount(p: CountUpsert): Promise<void> {
  const { error } = await supabase
    .from('final_count')
    .upsert([{ session_id: p.sessionId, player_id: p.playerId, counted_chips: p.amount }], {
      onConflict: 'session_id,player_id',
    });
  if (error) throw new Error(error.message);
}

/**
 * The night's record: the frozen settlement, then the session going settled.
 *
 * In that order. The settlement is the thing worth keeping — if the status
 * update fails, a settled night reads as live for a while, which is a cosmetic
 * problem. The reverse would be a night marked finished with no result behind
 * it, which is a lie.
 */
async function sendClose(p: SessionClose): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const hostId = auth.session?.user.id;
  if (hostId === undefined) throw new Error('Not signed in');

  const s = p.settlement;
  const shortfall = s.discrepancyAmount !== 0;

  const { error } = await supabase.from('settlement').upsert(
    [
      {
        session_id: p.sessionId,
        algorithm_version: s.algorithmVersion,
        rules_snapshot: s.rulesSnapshot,
        inputs_snapshot: s.inputsSnapshot,
        computed_transfers: s.computedTransfers,
        total_off_table: s.totalOffTable,
        discrepancy_amount: s.discrepancyAmount,
        // The schema insists a shortfall carries somebody's name and the moment
        // they put it there. That is the point of it — missing money is never
        // recorded quietly.
        discrepancy_confirmed_by: shortfall ? hostId : null,
        discrepancy_confirmed_at: shortfall ? p.endedAt : null,
        discrepancy_note: s.discrepancyNote ?? null,
        discrepancy_absorbed_by: s.discrepancyAbsorbedBy ?? null,
        frozen: true,
      },
    ],
    { onConflict: 'session_id', ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);

  const { error: sessionError } = await supabase
    .from('session')
    .update({ status: 'settled', ended_at: p.endedAt })
    .eq('id', p.sessionId);
  if (sessionError) throw new Error(sessionError.message);
}

// ---------------------------------------------------------------------------
// What the host is told
// ---------------------------------------------------------------------------

export interface SyncStatus {
  waiting: number;
  lastError: string | null;
}

export const syncStatus = (): Promise<SyncStatus> => outbox.status();
