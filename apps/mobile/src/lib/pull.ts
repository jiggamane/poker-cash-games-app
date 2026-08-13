import type { DiscrepancyAcknowledgement, LedgerEntry, Money, MoneyRule } from '@poker-club/core';
import { isSupabaseConfigured, supabase } from './supabase';
import { importNights, type ImportedNight } from './nightStore';
import { READS } from './pullReads';

/**
 * Reading a book back off the server.
 *
 * The opposite of `sync.ts`, and the half that makes claiming a place mean
 * anything: somebody who has just taken their seat has an empty phone, and
 * every night they have ever played is sitting on the server with their name
 * already on it.
 *
 * WHAT COMES BACK IS DECIDED ENTIRELY BY THE DATABASE. There is not one check
 * in this file about which books may be read — the policies added by
 * `0006_player_identity.sql` return the books this account belongs to and
 * nothing else. If those policies are wrong the correct outcome is an empty
 * result, never a client-side rule quietly filling the gap.
 *
 * It never overwrites. `importNights` skips any night this phone already has,
 * because the device that recorded a night is the authority on it — see the
 * single-writer rule in `docs/storage-and-sync.md`.
 */

export interface PullResult {
  /** Nights this phone did not have before. */
  added: number;
  /** Books the account can see at all. Zero means "you belong to nothing yet". */
  books: number;
}

export async function pullBooks(): Promise<PullResult> {
  if (!isSupabaseConfigured) return { added: 0, books: 0 };

  const { data: auth } = await supabase.auth.getSession();
  if (auth.session === null) return { added: 0, books: 0 };

  const books = await rows<{ id: string; group_name: string }>('book', (q) =>
    q.select(READS.book),
  );
  if (books.length === 0) return { added: 0, books: 0 };

  let added = 0;
  for (const book of books) added += await pullBook(book.id, book.group_name);
  return { added, books: books.length };
}

async function pullBook(bookId: string, groupName: string): Promise<number> {
  const sessions = await rows<SessionRow>('session', (q) =>
    q
      .select(READS.session)
      .eq('book_id', bookId)
      .order('started_at', { ascending: true }),
  );
  if (sessions.length === 0) return 0;

  const ids = sessions.map((s) => s.id);

  // Six reads for a whole book, rather than six per night. A home game is a
  // handful of nights and a few hundred rows; anything cleverer would be
  // pagination nobody needs yet.
  const people = await rows<{ id: string; display_name: string }>('player', (q) =>
    q.select(READS.player).eq('book_id', bookId),
  );
  const currentRules = await rows<RuleRow>('money_rule', (q) =>
    q.select(READS.money_rule).eq('book_id', bookId).order('sort_order', { ascending: true }),
  );
  const seats = await rows<{ session_id: string; player_id: string }>('session_seat', (q) =>
    q.select(READS.session_seat).in('session_id', ids),
  );
  const entries = await rows<EntryRow>('ledger_entry', (q) =>
    q.select(READS.ledger_entry).in('session_id', ids).order('seq', { ascending: true }),
  );
  const counts = await rows<{ session_id: string; player_id: string; counted_chips: number }>(
    'final_count',
    (q) => q.select(READS.final_count).in('session_id', ids),
  );
  const settlements = await rows<SettlementRow>('settlement', (q) =>
    q.select(READS.settlement).in('session_id', ids),
  );

  const settlementOf = new Map(settlements.map((s) => [s.session_id, s]));

  const nights: ImportedNight[] = sessions.map((s) => {
    const settlement = settlementOf.get(s.id);
    const seated = new Set(seats.filter((x) => x.session_id === s.id).map((x) => x.player_id));
    const acknowledgement = acknowledgementOf(settlement);

    // The night's OWN rules where they exist. A settled night carries the
    // snapshot it was settled with, and using today's rules instead would
    // restate a night the group has already been paid out on.
    const snapshot = settlement?.rules_snapshot;
    const rules = Array.isArray(snapshot)
      ? (snapshot as MoneyRule[])
      : currentRules.map(toRule);

    return {
      sessionId: s.id,
      groupName,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      status: s.status === 'settled' ? 'settled' : 'open',
      stakes: s.stakes,
      defaultBuyIn: s.default_buyin,
      rules,
      // Everybody the book knows, seated according to this night. A roster is
      // group-wide; who was at the table is not.
      players: people.map((p) => ({
        id: p.id,
        name: p.display_name,
        atTable: seated.has(p.id),
      })),
      entries: entries.filter((e) => e.session_id === s.id).map(toEntry),
      counts: counts
        .filter((c) => c.session_id === s.id)
        .map((c) => ({ playerId: c.player_id, amount: c.counted_chips })),
      ...(acknowledgement === undefined ? {} : { acknowledgement }),
    };
  });

  return importNights(nights);
}

/**
 * The host's confirmation of money that could not be accounted for.
 *
 * Rebuilt from the four columns that recorded it, because `settle()` refuses to
 * run on a night that does not add up without one — so a night closed over a
 * shortfall would be unimportable if this were dropped.
 */
function acknowledgementOf(s: SettlementRow | undefined): DiscrepancyAcknowledgement | undefined {
  if (s === undefined || s.discrepancy_amount === 0) return undefined;
  if (s.discrepancy_confirmed_by === null || s.discrepancy_confirmed_at === null) return undefined;

  return {
    amount: s.discrepancy_amount as Money,
    confirmedByUserId: s.discrepancy_confirmed_by,
    confirmedAt: s.discrepancy_confirmed_at,
    ...(s.discrepancy_note === null ? {} : { note: s.discrepancy_note }),
    ...(s.discrepancy_absorbed_by === null
      ? {}
      : { absorbedByPlayerId: s.discrepancy_absorbed_by }),
  };
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

/** One table, one query, errors raised rather than swallowed. */
async function rows<T>(
  table: string,
  build: (q: ReturnType<typeof supabase.from>) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  const { data, error } = await build(supabase.from(table));
  if (error) throw new Error(`${table}: ${(error as { message: string }).message}`);
  return (data ?? []) as T[];
}

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  stakes: string | null;
  default_buyin: number;
}

interface EntryRow {
  id: string;
  session_id: string;
  seq: number;
  type: LedgerEntry['type'];
  player_id: string | null;
  payer_id: string | null;
  amount: number;
  corrects_entry_id: string | null;
  occurred_at: string;
  note: string | null;
}

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

interface SettlementRow {
  session_id: string;
  rules_snapshot: unknown;
  discrepancy_amount: number;
  discrepancy_confirmed_by: string | null;
  discrepancy_confirmed_at: string | null;
  discrepancy_note: string | null;
  discrepancy_absorbed_by: string | null;
}
