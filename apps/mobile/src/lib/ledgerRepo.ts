import { randomUUID } from 'expo-crypto';
import {
  enqueueEntry,
  flushOutbox,
  type FlushResult,
  type LedgerEntry,
  type OutboxItem,
} from '@poker-club/core';
import { supabase } from './supabase';
import { SqliteOutboxStore } from './outboxStore';

/**
 * Reading and writing one night's ledger.
 *
 * The write path never waits on the network: an entry goes into the durable
 * outbox and the caller gets the finished row back immediately, so the host can
 * keep recording money with no connection at all. Draining happens separately
 * and can fail without anyone noticing.
 */

export const outbox = new SqliteOutboxStore();

/** Shape of a ledger_entry row as it goes over the wire. */
interface EntryRow {
  id: string;
  session_id: string;
  seq: number;
  type: LedgerEntry['type'];
  player_id: string | null;
  payer_id: string | null;
  amount: number;
  note: string | null;
  occurred_at: string;
  corrects_entry_id: string | null;
}

const rowToEntry = (r: EntryRow): LedgerEntry => ({
  id: r.id,
  seq: r.seq,
  type: r.type,
  playerId: r.player_id,
  payerId: r.payer_id,
  amount: r.amount as LedgerEntry['amount'],
  correctsEntryId: r.corrects_entry_id,
});

const itemToRow = (item: OutboxItem, occurredAt: string): Record<string, unknown> => ({
  id: item.entry.id,
  session_id: item.sessionId,
  seq: item.entry.seq,
  type: item.entry.type,
  player_id: item.entry.playerId ?? null,
  payer_id: item.entry.payerId ?? null,
  amount: item.entry.amount,
  corrects_entry_id: item.entry.correctsEntryId ?? null,
  occurred_at: occurredAt,
});

/**
 * Record an entry.
 *
 * `occurredAt` is passed in rather than read from the clock here, because the
 * host can back-date an entry for a hand that already happened.
 */
export async function recordEntry(
  sessionId: string,
  draft: Omit<LedgerEntry, 'id' | 'seq'>,
  occurredAt: Date = new Date(),
): Promise<LedgerEntry> {
  // The id is generated on the device and is what makes a retry safe: the
  // server treats it as an idempotency key, so a half-sent entry collapses to
  // one row rather than becoming a second buy-in.
  const entry = await enqueueEntry(outbox, sessionId, randomUUID(), draft);
  occurredAtById.set(entry.id, occurredAt.toISOString());

  // Fire and forget: a failure here is normal and simply leaves it queued.
  void sync().catch(() => {});
  return entry;
}

/**
 * Back-dating means an entry's occurred_at is not derivable from its seq, so it
 * is held alongside the queue until the row is sent.
 */
const occurredAtById = new Map<string, string>();

/** Drain the outbox. Safe to call often; does nothing when there is nothing to send. */
export async function sync(): Promise<FlushResult> {
  return flushOutbox(outbox, async (items) => {
    const rows = items.map((i) => itemToRow(i, occurredAtById.get(i.entry.id) ?? new Date().toISOString()));

    // The server's primary key on id makes this idempotent, so re-sending an
    // entry it already has is a no-op rather than a duplicate.
    const { error } = await supabase
      .from('ledger_entry')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

    if (error) throw new Error(error.message);
    for (const i of items) occurredAtById.delete(i.entry.id);
  });
}

/** Everything the server holds for a session, oldest first. */
export async function loadEntries(sessionId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from('ledger_entry')
    .select('*')
    .eq('session_id', sessionId)
    .order('seq', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EntryRow[];
  // Continue numbering from what the server holds, not from what this device
  // happens to remember — the two can differ after a reinstall.
  const highest = rows.reduce((max, r) => Math.max(max, r.seq), 0);
  await outbox.syncHighWater(sessionId, highest);

  return rows.map(rowToEntry);
}

/**
 * Watch a session live.
 *
 * Watchers are online by definition — they are looking at a live game — so
 * there is no offline story here. If the socket drops, call loadEntries again;
 * a night's ledger is a few hundred small rows and is cheap to refetch whole.
 */
export function watchEntries(
  sessionId: string,
  onEntry: (entry: LedgerEntry) => void,
): () => void {
  const channel = supabase
    .channel(`session:${sessionId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ledger_entry', filter: `session_id=eq.${sessionId}` },
      (payload) => onEntry(rowToEntry(payload.new as EntryRow)),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
