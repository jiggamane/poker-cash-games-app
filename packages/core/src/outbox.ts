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

export class OutboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutboxError';
  }
}

export interface OutboxItem {
  /** The ledger entry id. Also the server's idempotency key. */
  id: EntryId;
  sessionId: string;
  seq: number;
  entry: LedgerEntry;
  /** How many times we have tried to send this. */
  attempts: number;
  lastError?: string;
}

/** Durable local storage for entries that have not reached the server yet. */
export interface OutboxStore {
  add(item: OutboxItem): Promise<void>;
  /** Oldest first, by seq. */
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
): Promise<LedgerEntry> {
  if (!id) throw new OutboxError('An entry needs a client-generated id to be safe to retry');

  const seq = (await store.highestSeq(sessionId)) + 1;
  const entry: LedgerEntry = { ...draft, id, seq };

  await store.add({ id, sessionId, seq, entry, attempts: 0 });
  return entry;
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
  private items = new Map<EntryId, OutboxItem>();
  private seqHighWater = new Map<string, number>();

  async add(item: OutboxItem): Promise<void> {
    this.items.set(item.id, { ...item });
    const seen = this.seqHighWater.get(item.sessionId) ?? 0;
    if (item.seq > seen) this.seqHighWater.set(item.sessionId, item.seq);
  }

  async pending(limit: number): Promise<OutboxItem[]> {
    return [...this.items.values()]
      .sort((a, b) => a.seq - b.seq || (a.id < b.id ? -1 : 1))
      .slice(0, limit)
      .map((i) => ({ ...i }));
  }

  async remove(ids: readonly EntryId[]): Promise<void> {
    for (const id of ids) this.items.delete(id);
  }

  async markAttempt(id: EntryId, error: string): Promise<void> {
    const item = this.items.get(id);
    if (item) this.items.set(id, { ...item, attempts: item.attempts + 1, lastError: error });
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
