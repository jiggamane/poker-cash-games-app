import { randomUUID } from 'expo-crypto';
import { enqueueEntry, type FlushResult, type LedgerEntry } from '@poker-club/core';
import { supabase } from './supabase';
import { drain, outbox } from './sync';

/**
 * Reading and writing one night's ledger.
 *
 * The write path never waits on the network: an entry goes into the durable
 * outbox and the caller gets the finished row back immediately, so the host can
 * keep recording money with no connection at all. Draining happens separately
 * and can fail without anyone noticing.
 */



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

/**
 * Record an entry.
 *
 * `occurredAt` is passed in rather than read from the clock here, because the
 * host can back-date an entry for a hand that already happened.
 *
 * It travels INSIDE the queued payload, along with an expense's note. An entry
 * recorded with no signal may not reach the server for days, from a different
 * launch of the app; held anywhere but in the queue, its timestamp would
 * quietly become "whenever it finally sent".
 */
export async function recordEntry(
  sessionId: string,
  draft: Omit<LedgerEntry, 'id' | 'seq'>,
  occurredAt: Date = new Date(),
  note?: string,
): Promise<LedgerEntry> {
  // The id is generated on the device and is what makes a retry safe: the
  // server treats it as an idempotency key, so a half-sent entry collapses to
  // one row rather than becoming a second buy-in.
  const entry = await enqueueEntry(outbox, sessionId, randomUUID(), draft, {
    occurredAt: occurredAt.toISOString(),
    ...(note === undefined ? {} : { note }),
  });

  // Fire and forget: a failure here is normal and simply leaves it queued.
  void drain().catch(() => {});
  return entry;
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

/**
 * Drain the queue. Kept as `sync` because that is what the screens call it.
 *
 * Everything it sends now lives in `sync.ts` — the whole night, not just its
 * money, and no longer only when somebody taps Share.
 */
export { drain as sync, outbox } from './sync';

export type { FlushResult };
