/**
 * The host's outbox.
 *
 * A session runs for hours in someone's kitchen on poor wifi. The host must
 * never be made to wait for the network to record money, so every entry is
 * written to a durable local queue FIRST, the screen updates from local state,
 * and the queue drains to the server whenever there is a connection.
 *
 * The reason this is a queue and not a merge algorithm: there is exactly ONE
 * writer per session. With a single writer an ordered append-only log is
 * sufficient, and the hard part of offline sync — reconciling concurrent edits
 * — simply does not arise. No CRDT, no conflict resolution.
 *
 * Two properties make replay safe:
 *   - every entry carries a CLIENT-generated id, which the server treats as an
 *     idempotency key, so re-sending an entry it already has is a no-op;
 *   - entries are pushed in `seq` order and a failure stops the drain, so the
 *     server never sees a gap.
 *
 * Storage is behind an interface: the app backs it with expo-sqlite, the tests
 * back it with a map. Nothing in this file touches a device, a network or a
 * clock.
 */

import type { EntryId, LedgerEntry } from './types';

/**
 * What one queued operation does when it reaches the server.
 *
 * The queue carries the whole night, not just its money: a session has to exist
 * before an entry can point at it, and a player before a seat can. Naming the
 * kinds here — rather than letting the app queue anonymous blobs — is what lets
 * the drain dispatch them and what makes an unsent queue readable in the
 * database when something has gone wrong.
 */
export type OpKind =
  /** The book, the session, its players, its seats and its rules. */
  | 'session.open'
  | 'player.upsert'
  | 'seat.upsert'
  | 'entry.append'
  | 'rule.upsert'
  | 'count.upsert'
  /** The frozen settlement, and the session going to settled. */
  | 'session.close';

export class OutboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutboxError';
  }
}

export interface OutboxItem<P = unknown> {
  /**
   * Client-generated, and the server's idempotency key. Every operation is an
   * upsert on this, so re-sending one the server already has is a no-op — which
   * is what makes "retry until it works" a correct strategy rather than a
   * dangerous one.
   */
  id: EntryId;
  sessionId: string;
  kind: OpKind;
  payload: P;
  /** How many times we have tried to send this. */
  attempts: number;
  lastError?: string;
}

/** Durable local storage for entries that have not reached the server yet. */
export interface OutboxStore {
  /**
   * Queue one operation. The STORE decides the order, not the caller: ordering
   * is the whole point of the queue, and a caller that could choose its own
   * place in the line would eventually put an entry before its session.
   */
  add(item: OutboxItem): Promise<void>;
  /** Oldest first, in the order they were queued. */
  pending(limit: number): Promise<OutboxItem[]>;
  remove(ids: readonly EntryId[]): Promise<void>;
  markAttempt(id: EntryId, error: string): Promise<void>;
  /** Highest seq known for a session, queued or already sent. 0 if none. */
  highestSeq(sessionId: string): Promise<number>;
  count(): Promise<number>;
}

/** Sends a batch to the server. Must be all-or-nothing. */
export type PushEntries = (items: readonly OutboxItem[]) => Promise<void>;

export interface FlushResult {
  /** How many entries reached the server. */
  pushed: number;
  /** How many are still queued. */
  remaining: number;
  /** Present when the drain stopped early — almost always no connection. */
  stoppedBecause?: string;
}

/**
 * Record an entry locally and hand back the complete row.
 *
 * `seq` is allocated here, from the highest the device has seen for this
 * session, so ordering survives an app restart. The id is supplied by the
 * caller rather than generated here, because this package must stay pure and
 * deterministic — a random value in the middle of the money code would make
 * settlement irreproducible.
 */
export async function enqueueEntry(
  store: OutboxStore,
  sessionId: string,
  id: EntryId,
  draft: Omit<LedgerEntry, 'id' | 'seq'>,
  /**
   * Anything the server row needs that the entry itself does not carry — when
   * it happened, and what an expense was for.
   *
   * It goes in the QUEUED payload rather than in memory beside it, because an
   * entry recorded on Saturday with no signal may not be sent until Tuesday,
   * from a different launch of the app. Held anywhere else, the timestamp would
   * quietly become "whenever it finally sent".
   */
  meta: Record<string, unknown> = {},
): Promise<LedgerEntry> {
  if (!id) throw new OutboxError('An entry needs a client-generated id to be safe to retry');

  const seq = (await store.highestSeq(sessionId)) + 1;
  const entry: LedgerEntry = { ...draft, id, seq };

  await store.add({
    id,
    sessionId,
    kind: 'entry.append',
    payload: { ...entry, ...meta },
    attempts: 0,
  });
  return entry;
}

/**
 * Queue anything that is not a ledger entry.
 *
 * Same queue, same order, same idempotency — a session, a seat, a rule and a
 * chip count all have to arrive behind the things they depend on, so there is
 * exactly one line and everything stands in it.
 */
export async function enqueueOp<P>(
  store: OutboxStore,
  op: { id: string; sessionId: string; kind: OpKind; payload: P },
): Promise<void> {
  if (!op.id) throw new OutboxError('An operation needs a client-generated id to be safe to retry');
  await store.add({ ...op, attempts: 0 });
}

/**
 * Drain the queue to the server, oldest first.
 *
 * Stops at the first failure rather than skipping ahead: the log must reach the
 * server in order, and whatever failed is almost certainly going to keep
 * failing until the network returns. Nothing is discarded on failure — the
 * entry stays queued with the error recorded against it.
 */
export async function flushOutbox(
  store: OutboxStore,
  push: PushEntries,
  options: { batchSize?: number } = {},
): Promise<FlushResult> {
  const batchSize = options.batchSize ?? 25;
  if (batchSize < 1) throw new OutboxError('batchSize must be at least 1');

  let pushed = 0;

  for (;;) {
    const batch = await store.pending(batchSize);
    if (batch.length === 0) break;

    try {
      await push(batch);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const item of batch) await store.markAttempt(item.id, message);
      return { pushed, remaining: await store.count(), stoppedBecause: message };
    }

    await store.remove(batch.map((i) => i.id));
    pushed += batch.length;
  }

  return { pushed, remaining: await store.count() };
}

/**
 * An in-memory store. Used by the tests, and usable as a fallback if the device
 * database ever fails to open — better to keep taking entries in memory than to
 * stop the host recording money mid-game.
 */
export class MemoryOutboxStore implements OutboxStore {
  private items = new Map<EntryId, { item: OutboxItem; order: number }>();
  private seqHighWater = new Map<string, number>();
  private nextOrder = 0;

  async add(item: OutboxItem): Promise<void> {
    const existing = this.items.get(item.id);
    // Re-queueing keeps its place in the line rather than jumping to the back.
    const order = existing?.order ?? this.nextOrder++;
    this.items.set(item.id, { item: { ...item }, order });

    if (item.kind === 'entry.append') {
      const seq = (item.payload as LedgerEntry).seq;
      const seen = this.seqHighWater.get(item.sessionId) ?? 0;
      if (seq > seen) this.seqHighWater.set(item.sessionId, seq);
    }
  }

  async pending(limit: number): Promise<OutboxItem[]> {
    return [...this.items.values()]
      .sort((a, b) => a.order - b.order)
      .slice(0, limit)
      .map((i) => ({ ...i.item }));
  }

  async remove(ids: readonly EntryId[]): Promise<void> {
    for (const id of ids) this.items.delete(id);
  }

  async markAttempt(id: EntryId, error: string): Promise<void> {
    const found = this.items.get(id);
    if (found) {
      this.items.set(id, {
        ...found,
        item: { ...found.item, attempts: found.item.attempts + 1, lastError: error },
      });
    }
  }

  async highestSeq(sessionId: string): Promise<number> {
    return this.seqHighWater.get(sessionId) ?? 0;
  }

  async count(): Promise<number> {
    return this.items.size;
  }

  /** Test helper: the high-water mark survives entries leaving the queue. */
  async seedHighWater(sessionId: string, seq: number): Promise<void> {
    this.seqHighWater.set(sessionId, seq);
  }
}
