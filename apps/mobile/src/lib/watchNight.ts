import { useEffect, useState } from 'react';
import type { LedgerEntry, Money, MoneyRule, Player, PlayerId } from '@poker-club/core';
import { isSupabaseConfigured, supabase } from './supabase';
import { READS } from './pullReads';

/**
 * One night, read as a watcher.
 *
 * X1 is `N1/N2 with canWrite: false` — the same data, a different projection —
 * so this file's only job is to fetch that data and keep it fresh. It decides
 * nothing about what may be read: the policies in `0001_init.sql` answer for
 * every table below by asking the `share_session_id` claim in the caller's
 * token, and a wrong grant produces an empty night rather than a client-side
 * rule quietly filling the gap. Same principle as `pull.ts`.
 *
 * WHY THE CLAIM IS IN THE TOKEN and not in a header is the load-bearing part of
 * the design: a claim inside the JWT governs the realtime websocket as well as
 * the REST reads, so `subscribe` below is authorised by exactly the same thing
 * the fetch was. A watcher who cannot subscribe is a watcher who cannot watch.
 */

export interface WatchedNight {
  sessionId: string;
  /** From `night_header`, which is the only thing that can tell a watcher. */
  groupName: string | null;
  hostName: string | null;
  playerCount: number;
  startedAt: string;
  endedAt: string | null;
  status: string;
  players: Player[];
  entries: Array<LedgerEntry & { occurredAt: string; note: string | null }>;
  rules: MoneyRule[];
  finalCounts: Map<PlayerId, Money>;
}

/** True once the night has been counted and closed — X1c rather than X1a. */
export const hasEnded = (night: WatchedNight): boolean =>
  night.status === 'settled' || night.status === 'closed' || night.endedAt !== null;

export async function loadWatchedNight(sessionId: string): Promise<WatchedNight | null> {
  if (!isSupabaseConfigured) return null;

  const header = await headerFor(sessionId);
  if (header === null) return null;

  /*
   * Five reads rather than one join. PostgREST would embed these, but an
   * embedded read is authorised as a whole — one table refusing takes the lot
   * with it, and the failure arrives as an empty page with nothing to say. Read
   * separately, a refused table is a visibly missing part of the night.
   */
  const [seats, players, entries, rules, counts] = await Promise.all([
    rows<{ player_id: string }>('session_seat', (q) =>
      q.select(READS.session_seat).eq('session_id', sessionId),
    ),
    rows<{ id: string; display_name: string }>('player', (q) => q.select(READS.player)),
    rows<EntryRow>('ledger_entry', (q) =>
      q.select(READS.ledger_entry).eq('session_id', sessionId).order('seq', { ascending: true }),
    ),
    rows<RuleRow>('money_rule', (q) => q.select(READS.money_rule)),
    rows<{ player_id: string; counted_chips: number }>('final_count', (q) =>
      q.select(READS.final_count).eq('session_id', sessionId),
    ),
  ]);

  const seated = new Set(seats.map((s) => s.player_id));

  return {
    sessionId,
    groupName: header.group_name,
    hostName: header.host_name,
    playerCount: header.player_count,
    startedAt: header.started_at,
    endedAt: header.ended_at,
    status: header.status,
    /*
     * `atTable` is seat membership, not "did they play". A collector who holds
     * the kitty without sitting down is a player row that must not be charged,
     * and the settlement engine reads exactly this flag to decide.
     */
    players: players.map((p) => ({
      id: p.id,
      name: p.display_name,
      atTable: seated.has(p.id),
    })),
    entries: entries.map(toEntry),
    rules: rules.map(toRule).sort((a, b) => a.sortOrder - b.sortOrder),
    finalCounts: new Map(counts.map((c) => [c.player_id, c.counted_chips as Money])),
  };
}

/**
 * The night, kept live.
 *
 * `loading` starts true and stays true until the first read lands, so the
 * screen can hold X2a's "checking" shape rather than flashing an empty table at
 * somebody who has just opened a link.
 *
 * Realtime is a nice-to-have and its failure must not be: if the socket never
 * connects, the night is still whatever the first fetch returned. A watcher
 * with a stale feed is worse than one with a live feed and better than one
 * looking at an error.
 */
export function useWatchedNight(sessionId: string | null): {
  night: WatchedNight | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [night, setNight] = useState<WatchedNight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (sessionId === null) {
      setLoading(false);
      return;
    }

    let alive = true;

    const read = () => {
      loadWatchedNight(sessionId)
        .then((n) => {
          if (!alive) return;
          setNight(n);
          setError(null);
        })
        .catch((e: unknown) => {
          if (alive) setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    };

    read();

    // Every table the feed is built from. A buy-in is a ledger_entry, a count
    // is a final_count, and closing the night moves session.status — a watcher
    // who only heard about entries would sit on a live screen after the night
    // had ended.
    const channel = supabase
      .channel(`watch:${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ledger_entry', filter: `session_id=eq.${sessionId}` },
        read)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'final_count', filter: `session_id=eq.${sessionId}` },
        read)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session', filter: `id=eq.${sessionId}` },
        read)
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [sessionId, nonce]);

  return { night, loading, error, reload: () => setNonce((n) => n + 1) };
}

interface HeaderRow {
  group_name: string | null;
  host_name: string | null;
  player_count: number;
  started_at: string;
  ended_at: string | null;
  status: string;
}

/**
 * Zero rows means "you may not read this night", and that is the whole of X1b.
 *
 * Deliberately not an error: `night_header` answers the same nothing for a
 * night that does not exist as for one this device has no grant on, which is
 * what stops the screen becoming an oracle for session ids. See
 * `0010_night_header.sql`.
 */
async function headerFor(sessionId: string): Promise<HeaderRow | null> {
  const { data, error } = await supabase
    .rpc('night_header', { target_session_id: sessionId })
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as HeaderRow | null) ?? null;
}

async function rows<T>(
  table: string,
  build: (q: ReturnType<typeof supabase.from>) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  const { data, error } = await build(supabase.from(table));
  if (error) throw new Error(`${table}: ${(error as { message: string }).message}`);
  return (data ?? []) as T[];
}

interface EntryRow {
  id: string;
  seq: number;
  type: LedgerEntry['type'];
  player_id: string | null;
  payer_id: string | null;
  amount: number;
  corrects_entry_id: string | null;
  occurred_at: string;
  note: string | null;
}

const toEntry = (e: EntryRow): LedgerEntry & { occurredAt: string; note: string | null } => ({
  id: e.id,
  seq: e.seq,
  type: e.type,
  playerId: e.player_id,
  payerId: e.payer_id,
  amount: e.amount as Money,
  correctsEntryId: e.corrects_entry_id,
  occurredAt: e.occurred_at,
  note: e.note,
});

interface RuleRow {
  id: string;
  name: string;
  active: boolean;
  amount_kind: MoneyRule['amountKind'];
  amount: number;
  basis: MoneyRule['basis'];
  charge: MoneyRule['charge'];
  destination: MoneyRule['destination'];
  split: MoneyRule['split'];
  custom_shares: MoneyRule['customShares'] | null;
  collector_player_id: string;
  sort_order: number;
}

const toRule = (r: RuleRow): MoneyRule => ({
  id: r.id,
  name: r.name,
  active: r.active,
  amountKind: r.amount_kind,
  amount: r.amount as Money,
  basis: r.basis,
  charge: r.charge,
  destination: r.destination,
  split: r.split,
  ...(r.custom_shares === null ? {} : { customShares: r.custom_shares }),
  collectorPlayerId: r.collector_player_id,
  sortOrder: r.sort_order,
});
