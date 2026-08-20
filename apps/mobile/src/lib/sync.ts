import {
  enqueueOp,
  flushOutbox,
  type FlushResult,
  type LedgerEntry,
  type MoneyRule,
  type Money,
  type OutboxItem,
  type PlayerId,
  type RoundingMode,
} from '@poker-club/core';
import { isSupabaseConfigured, supabase } from './supabase';
import { SqliteOutboxStore } from './outboxStore';
import {
  countRow,
  entryRow,
  playerRow,
  ruleRow,
  seatRow,
  sessionClosedPatch,
  sessionRow,
  settlementRow,
  type ClosePayload,
  type CountPayload,
  type EntryPayload,
  type PlayerPayload,
  type RowWrite,
  type RulePayload,
  type SeatPayload,
  type SessionOpenPayload,
} from './syncRows';

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

/**
 * The shape every id in this app has, because every server column is uuid.
 *
 * Nights from before that was true are kept OUT of the queue entirely rather
 * than allowed to fail in it. The queue halts at its first failure — which is
 * exactly right for an entry that arrived before its session, and exactly wrong
 * for a sample night from an old build, which would sit at the head of the line
 * failing forever and block every real night behind it.
 *
 * Such a night stays on the phone and works completely. It simply never leaves.
 */
const isUuid = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

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
  /** How coarsely the night settles. Null, or absent, is whole dollars. */
  roundingMode?: RoundingMode | null;
}): Promise<void> {
  const { sessionId, groupName } = args;
  if (!isUuid(sessionId)) return;

  await enqueueOp<SessionOpenPayload>(outbox, {
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
        roundingMode: args.roundingMode ?? null,
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
  if (!isUuid(sessionId) || !isUuid(player.id)) return;

  await enqueueOp<PlayerPayload>(outbox, {
    id: `player:${player.id}`,
    sessionId,
    kind: 'player.upsert',
    payload: { groupName, player: { id: player.id, name: player.name } },
  });

  if (player.atTable) {
    await enqueueOp<SeatPayload>(outbox, {
      id: `seat:${sessionId}:${player.id}`,
      sessionId,
      kind: 'seat.upsert',
      payload: { sessionId, playerId: player.id },
    });
  }
}

/**
 * A roster row, with no night behind it.
 *
 * A person belongs to the BOOK, not to a session — `player` has a `book_id` and
 * no session at all — so adding somebody on GR4 with no game running is a
 * complete operation in itself. Until this existed, the only thing that ever
 * queued a player was a night opening, so somebody added between games reached
 * the server if and only if a later night happened to seat them, and a rename
 * never reached it at all.
 *
 * `sessionId` on the queued item is the CLUB's id here. Nothing in the drain
 * reads it for a `player.upsert` — the payload carries the group's name and the
 * book is resolved from that — and the queue needs a non-empty scope for the
 * row, so it carries the scope this operation actually has. It passes the uuid
 * gate for the same reason a session does: a club id is a uuid the phone minted.
 */
export async function queueRosterPlayer(
  clubId: string,
  groupName: string,
  player: { id: string; name: string },
): Promise<void> {
  if (!isUuid(clubId) || !isUuid(player.id)) return;

  await enqueueOp<PlayerPayload>(outbox, {
    id: `player:${player.id}`,
    sessionId: clubId,
    kind: 'player.upsert',
    payload: { groupName, player: { id: player.id, name: player.name } },
  });
}

export async function queueRule(
  sessionId: string,
  groupName: string,
  rule: MoneyRule,
): Promise<void> {
  if (!isUuid(sessionId) || !isUuid(rule.id) || !isUuid(rule.collectorPlayerId)) return;

  await enqueueOp<RulePayload>(outbox, {
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
  if (!isUuid(sessionId) || !isUuid(playerId)) return;

  await enqueueOp<CountPayload>(outbox, {
    // One per player per night: counting somebody twice replaces the first.
    id: `count:${sessionId}:${playerId}`,
    sessionId,
    kind: 'count.upsert',
    payload: { sessionId, playerId, amount },
  });
}

export async function queueClose(payload: ClosePayload): Promise<void> {
  if (!isUuid(payload.sessionId)) return;

  await enqueueOp<ClosePayload>(outbox, {
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
  // A night from before ids were uuids can still queue entries — the queue is
  // where their seq numbers come from — so this is the last gate before one
  // reaches a server that would refuse it forever. Returning marks it done and
  // drops it, which keeps a sample night from blocking every real one behind
  // it. The night itself is untouched and still works on the phone.
  if (!isUuid(item.sessionId)) return;

  switch (item.kind) {
    case 'session.open': {
      const p = item.payload as SessionOpenPayload;
      return write(sessionRow(p, await ensureBook(p.groupName)));
    }
    case 'player.upsert': {
      const p = item.payload as PlayerPayload;
      return write(playerRow(p, await ensureBook(p.groupName)));
    }
    case 'seat.upsert':
      return write(seatRow(item.payload as SeatPayload));
    case 'entry.append':
      return write(entryRow(item.sessionId, item.payload as EntryPayload));
    case 'rule.upsert': {
      const p = item.payload as RulePayload;
      return write(ruleRow(p, await ensureBook(p.groupName)));
    }
    case 'count.upsert':
      return write(countRow(item.payload as CountPayload));
    case 'session.close':
      return sendClose(item.payload as ClosePayload);
  }
}

/** One row, upserted exactly as `syncRows` describes it. */
async function write(w: RowWrite): Promise<void> {
  const { error } = await supabase
    .from(w.table)
    .upsert([w.row], {
      onConflict: w.onConflict,
      ...(w.ignoreDuplicates === true ? { ignoreDuplicates: true } : {}),
    });
  if (error) throw new Error(`${w.table}: ${error.message}`);
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

/**
 * The night's record: the frozen settlement, then the session going settled.
 *
 * In that order. The settlement is the thing worth keeping — if the status
 * update fails, a settled night reads as live for a while, which is a cosmetic
 * problem. The reverse would be a night marked finished with no result behind
 * it, which is a lie.
 */
async function sendClose(p: ClosePayload): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const hostId = auth.session?.user.id;
  if (hostId === undefined) throw new Error('Not signed in');

  await write(settlementRow(p, hostId));

  const patch = sessionClosedPatch(p);
  const { error } = await supabase.from(patch.table).update(patch.patch).eq('id', patch.matchId);
  if (error) throw new Error(`${patch.table}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// What the host is told
// ---------------------------------------------------------------------------

export interface SyncStatus {
  waiting: number;
  lastError: string | null;
}

export const syncStatus = (): Promise<SyncStatus> => outbox.status();
