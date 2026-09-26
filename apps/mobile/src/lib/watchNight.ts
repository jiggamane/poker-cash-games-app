import { useEffect, useState } from 'react';
import type {
  LedgerEntry,
  Money,
  MoneyRule,
  Player,
  PlayerId,
  RoundingMode,
  RulePeriod,
} from '@poker-club/core';
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
  /**
   * How coarsely the host settles this night — through `night_header`, because
   * a watcher cannot read `session` at all.
   *
   * X1 IS THE SAME NIGHT, and the watcher's copy of the settlement is computed
   * on their own device. Without this they would settle in whole dollars while
   * the host settles in hundreds, and two people looking at the same night
   * would see two different sets of figures with nothing on either screen to
   * explain the difference.
   */
  roundingMode: RoundingMode | null;
  finalCounts: Map<PlayerId, Money>;
}

/**
 * The live feed a watcher's screen listens to — B95.
 *
 * One row per table the night is read from, and how a change to it is matched
 * to this night: by `session_id`, by the session's own `id`, or not at all
 * (book-level rows, which row-level security already limits to the watcher's
 * book). `deletes` marks tables where a delete changes the figures — a count
 * cleared by a cash-out — and has to be heard unfiltered.
 *
 * EVERY TABLE HERE MUST BE PUBLISHED by a migration
 * (`alter publication supabase_realtime add table …`), or its changes are
 * never sent at all. `watchFeed.test.ts` checks that against the files, and
 * `supabase/test/12_live_feed.sql` against a migrated database.
 */
export const WATCH_FEED: ReadonlyArray<{
  table: string;
  scope: 'session' | 'self' | 'book';
  deletes: boolean;
}> = [
  { table: 'ledger_entry', scope: 'session', deletes: false }, // append-only
  { table: 'session', scope: 'self', deletes: false },
  { table: 'session_seat', scope: 'session', deletes: true },
  { table: 'final_count', scope: 'session', deletes: true },
  { table: 'player', scope: 'book', deletes: false },
  { table: 'money_rule', scope: 'book', deletes: true },
];

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
     * the piggy bank without sitting down is a player row that must not be charged,
     * and the settlement engine reads exactly this flag to decide.
     */
    players: players.map((p) => ({
      id: p.id,
      name: p.display_name,
      atTable: seated.has(p.id),
    })),
    entries: entries.map(toEntry),
    rules: rules.map(toRule).sort((a, b) => a.sortOrder - b.sortOrder),
    roundingMode: header.rounding_mode ?? null,
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

    /*
     * ONE READ AT A TIME, AND ONE MORE IF ANYTHING ARRIVED MEANWHILE. A rebuy
     * is a seat and an entry, a guest is a player, a seat and an entry, and
     * each is its own event — re-reading the whole night once per event would
     * be three reads for one tap. Events that land while a read is in flight
     * collapse into a single read after it.
     */
    let reading = false;
    let again = false;
    const soon = () => {
      if (reading) {
        again = true;
        return;
      }
      read();
    };

    const read = () => {
      reading = true;
      again = false;
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
          reading = false;
          if (alive) setLoading(false);
          if (alive && again) read();
        });
    };

    read();

    /*
     * EVERY TABLE THE NIGHT IS READ FROM — B95. A change to any of them re-reads
     * the night; `WATCH_FEED` is the list, and `watchFeed.test.ts` holds it to
     * the tables `loadWatchedNight` reads and to the ones a migration publishes.
     *
     * Inserts and updates are filtered to this night where the table has a
     * session_id; `player` and `money_rule` belong to the book, and row-level
     * security already limits them to this watcher's one book. DELETES cannot
     * be filtered — the row is gone — so they are heard unfiltered and cost one
     * re-read of a night nothing on it changed in.
     */
    const channel = supabase.channel(`watch:${sessionId}`);
    for (const feed of WATCH_FEED) {
      const filter =
        feed.scope === 'session'
          ? { filter: `session_id=eq.${sessionId}` }
          : feed.scope === 'self'
            ? { filter: `id=eq.${sessionId}` }
            : {};
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: feed.table, ...filter }, soon);
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: feed.table, ...filter }, soon);
      if (feed.deletes) {
        channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: feed.table }, soon);
      }
    }
    channel.subscribe();

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
  /** Added by 0013. Null on every night opened before rounding was a setting. */
  rounding_mode: RoundingMode | null;
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
  covered_by: 'kitty' | 'unpaid' | null;
  spend_group: string | null;
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
  /* Who covered a spend. Dropped here until B95, so a watcher settled a
     piggy-bank pizza differently from the host's phone. */
  coveredBy: e.covered_by ?? null,
  spendGroup: e.spend_group ?? null,
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
  /** Both null unless the rule is charged by time — migration 0015. */
  period_minutes: number | null;
  period_rounding: RulePeriod['rounding'] | null;
  /** The ceiling on what one person pays, where the rule has one. */
  max_per_player: number | null;
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
  ...(r.period_minutes === null || r.period_rounding === null
    ? {}
    : { period: { minutes: r.period_minutes, rounding: r.period_rounding } }),
  ...(r.max_per_player == null ? {} : { maxPerPlayer: r.max_per_player as Money }),
  collectorPlayerId: r.collector_player_id,
  sortOrder: r.sort_order,
});
