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
import { leavesThePhone } from './queueable';
import {
  bookPatch,
  countRow,
  entryRow,
  paymentDelete,
  paymentRow,
  playerRow,
  playerTermsPatch,
  ruleDelete,
  ruleRow,
  seatRow,
  sessionClosedPatch,
  sessionPatch,
  sessionRow,
  settlementRow,
  type BookPayload,
  type ClosePayload,
  type CountPayload,
  type EntryPayload,
  type PaymentPayload,
  type PlayerPayload,
  type PlayerTermsPayload,
  type RowDelete,
  type RowPatch,
  type RowWrite,
  type RuleDeletePayload,
  type RulePayload,
  type SeatPayload,
  type SessionOpenPayload,
  type SessionPatchPayload,
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
 * Nights from before that was true, and the sample night the app seeds itself
 * with, are kept OUT of the queue entirely rather than allowed to fail in it.
 * The queue halts at its first failure — which is exactly right for an entry
 * that arrived before its session, and exactly wrong for a night the server
 * will never accept, which would sit at the head of the line failing forever
 * and block every real night behind it.
 *
 * Such a night stays on the phone and works completely. It simply never leaves.
 *
 * The predicate is `leavesThePhone` in `queueable.ts` — one pure function with
 * a test, rather than this regex written out at each of the seven gates below.
 * See B56 for what it costs when a night slips past it.
 */
const isUuid = leavesThePhone;

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
  /** What this table is called, where a group is running two. */
  tableName?: string | null;
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
        tableName: args.tableName ?? null,
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

/**
 * What the group is set up as: its name, its money, its blinds, its rounding.
 *
 * THE RENAME IS WHY THIS CARRIES TWO NAMES. A payload names its book by the
 * group's name, because the phone never learns the book's id — so renaming a
 * club would look to `ensureBook` like a group it has never heard of, and it
 * would mint a SECOND book and split the group across the two. `previousName`
 * is what the club was called when the queue last spoke, and the drain asks for
 * either. The patch then writes the new name, so the next operation resolves on
 * it and the old name is never needed again.
 *
 * The club's id is the scope, exactly as it is for a roster row: nothing in the
 * drain reads it for this kind, and the queue wants the scope the operation
 * actually has.
 */
export async function queueBook(args: {
  clubId: string;
  groupName: string;
  previousName?: string;
  book: BookPayload['book'];
}): Promise<void> {
  if (!isUuid(args.clubId)) return;

  await enqueueOp<BookPayload>(outbox, {
    // One per club: settings are a state, not a series of events, and the last
    // answer is the only one worth sending.
    id: `book:${args.clubId}`,
    sessionId: args.clubId,
    kind: 'book.upsert',
    payload: {
      groupName: args.groupName,
      ...(args.previousName === undefined || args.previousName === args.groupName
        ? {}
        : { previousName: args.previousName }),
      book: args.book,
    },
  });
}

/**
 * A night changed after it opened — how far through it is, what the table is
 * called, how coarsely it settles.
 *
 * ONE OP PER NIGHT, REPLACED IN PLACE, because these are three columns of one
 * row and the last answer for each is the only one worth sending. Which is why
 * a caller passes the night's WHOLE current state rather than the field it just
 * changed: the second op takes the first one's place in the line, so a partial
 * payload would drop the rename that the status change replaced.
 *
 * `settled` is not one of the statuses here — closing writes the settlement
 * first and moves the status after it, in one operation, so that a night can
 * never be marked finished with no result behind it.
 */
export async function queueSessionPatch(patch: SessionPatchPayload): Promise<void> {
  if (!isUuid(patch.sessionId)) return;

  await enqueueOp<SessionPatchPayload>(outbox, {
    id: `session-patch:${patch.sessionId}`,
    sessionId: patch.sessionId,
    kind: 'session.patch',
    payload: patch,
  });
}

/** Whether somebody pays the kitty, and whether they are still offered a seat. */
export async function queuePlayerTerms(
  clubId: string,
  terms: PlayerTermsPayload,
): Promise<void> {
  if (!isUuid(clubId) || !isUuid(terms.playerId)) return;

  await enqueueOp<PlayerTermsPayload>(outbox, {
    id: `player-terms:${terms.playerId}`,
    sessionId: clubId,
    kind: 'player.terms',
    payload: terms,
  });
}

/**
 * A rule the group no longer has.
 *
 * The SAME id as the upsert it replaces, which is what makes a rule added and
 * deleted before the next drain leave nothing behind: the delete takes the
 * upsert's place in the line rather than following it, and the server is never
 * told about a rule that did not outlive one evening.
 */
export async function queueRuleDelete(
  scopeId: string,
  groupName: string,
  ruleId: string,
): Promise<void> {
  if (!isUuid(scopeId) || !isUuid(ruleId)) return;

  await enqueueOp<RuleDeletePayload & { groupName: string }>(outbox, {
    id: `rule:${ruleId}`,
    sessionId: scopeId,
    kind: 'rule.delete',
    payload: { groupName, ruleId },
  });
}

/** A transfer paid, or a tick taken back. See `paymentRow` for why one kind. */
export async function queuePayment(payload: PaymentPayload): Promise<void> {
  if (
    !isUuid(payload.sessionId) ||
    !isUuid(payload.fromPlayerId) ||
    !isUuid(payload.toPlayerId)
  ) {
    return;
  }

  await enqueueOp<PaymentPayload>(outbox, {
    id: `payment:${payload.sessionId}:${payload.fromPlayerId}:${payload.toPlayerId}`,
    sessionId: payload.sessionId,
    kind: 'payment.set',
    payload,
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
 * The host's book ids, resolved once per drain, KEYED BY THE GROUP'S NAME.
 *
 * The phone never learns a book's id — a book is the server's own row — so every
 * payload carries the group's name instead and the first operation that needs an
 * id looks it up or creates it.
 *
 * IT USED TO BE ONE ID FOR THE WHOLE ACCOUNT: `select id from book limit 1`,
 * whatever group the payload named. A host with two groups therefore wrote both
 * of them into whichever book came back first — and `player` is unique on
 * (book_id, lower(display_name)), so the second group's Petr was refused by the
 * database. The queue halts at its first failure, on purpose, so that refusal
 * stopped every night behind it from ever leaving the phone, permanently, with
 * nothing on any screen but a rising number of things waiting.
 */
const books = new Map<string, string>();

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

  books.clear(); // re-resolved per drain, in case the account changed

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
    case 'book.upsert': {
      const p = item.payload as BookPayload;
      return patch(bookPatch(p, await ensureBook(p.groupName, p.previousName)));
    }
    case 'session.patch':
      return patch(sessionPatch(item.payload as SessionPatchPayload));
    case 'player.terms':
      return patch(playerTermsPatch(item.payload as PlayerTermsPayload));
    case 'rule.delete': {
      const p = item.payload as RuleDeletePayload & { groupName: string };
      return remove(ruleDelete(p, await ensureBook(p.groupName)));
    }
    case 'payment.set': {
      const p = item.payload as PaymentPayload;
      return p.paidAt === null ? remove(paymentDelete(p)) : write(paymentRow(p));
    }
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

/**
 * The book this group's rows belong in — found by name, and made if there is
 * none.
 *
 * TWO THINGS HERE ARE LOAD-BEARING.
 *
 * It asks for books this account HOSTS. Since `0007_player_identity.sql` an
 * account can also read the books it is merely a member of, so an unfiltered
 * select can return somebody else's book — and every write that followed would
 * be refused by the host policy, for ever, at the head of the queue.
 *
 * It matches on the group's NAME, so two groups are two books. `previousName`
 * is how a rename survives that: the club is looked up under what it used to be
 * called, and the patch riding on the same operation writes the new name, after
 * which the old one is never asked for again.
 */
/**
 * Some columns of a row that already exists.
 *
 * NOT AN UPSERT, and the difference matters: an update against a row that is
 * not there is a no-op, where an upsert would be an insert missing every NOT
 * NULL column the patch does not carry. The server refuses that, and the queue
 * halts at its first failure — so the cost of a setting arriving before the row
 * it describes is one lost setting rather than a night that never leaves.
 */
async function patch(p: RowPatch): Promise<void> {
  const { error } = await supabase.from(p.table).update(p.patch).eq('id', p.matchId);
  if (error) throw new Error(`${p.table}: ${error.message}`);
}

/** A row taken back out. Only ever a rule the group deleted or a tick untapped. */
async function remove(d: RowDelete): Promise<void> {
  const { error } = await supabase.from(d.table).delete().match(d.match);
  if (error) throw new Error(`${d.table}: ${error.message}`);
}

async function ensureBook(groupName: string, previousName?: string): Promise<string> {
  const known = books.get(groupName);
  if (known !== undefined) return known;

  const { data: auth } = await supabase.auth.getSession();
  const hostId = auth.session?.user.id;
  if (hostId === undefined) throw new Error('Not signed in');

  const names = previousName === undefined ? [groupName] : [groupName, previousName];
  const { data: existing, error } = await supabase
    .from('book')
    .select('id, group_name')
    .eq('host_user_id', hostId)
    .in('group_name', names);
  if (error) throw new Error(error.message);

  const found =
    existing?.find((b) => b.group_name === groupName) ??
    existing?.find((b) => b.group_name === previousName);
  if (found !== undefined) {
    const id = found.id as string;
    books.set(groupName, id);
    return id;
  }

  const { data: created, error: createError } = await supabase
    .from('book')
    .insert({ host_user_id: hostId, group_name: groupName })
    .select('id')
    .single();
  if (createError) throw new Error(createError.message);

  const id = created.id as string;
  books.set(groupName, id);
  return id;
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
  await patch(sessionClosedPatch(p));
}

// ---------------------------------------------------------------------------
// What the host is told
// ---------------------------------------------------------------------------

export interface SyncStatus {
  waiting: number;
  lastError: string | null;
}

export const syncStatus = (): Promise<SyncStatus> => outbox.status();
