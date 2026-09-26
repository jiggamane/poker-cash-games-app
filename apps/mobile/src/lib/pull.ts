import type {
  DiscrepancyAcknowledgement,
  LedgerEntry,
  Money,
  MoneyRule,
  RoundingMode,
  RulePeriod,
} from '@poker-club/core';
import { isSupabaseConfigured, supabase } from './supabase';
import { importNights, type ImportedNight } from './nightStore';
import { importRoster } from './clubStore';
import { claimedSeat } from './identity';
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
 * `0007_player_identity.sql` return the books this account belongs to and
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
  /** People this phone did not have before. */
  players: number;
}

export async function pullBooks(): Promise<PullResult> {
  const nothing = { added: 0, books: 0, players: 0 };
  if (!isSupabaseConfigured) return nothing;

  const { data: auth } = await supabase.auth.getSession();
  if (auth.session === null) return nothing;

  const books = await rows<BookRow>('book', (q) => q.select(READS.book));
  if (books.length === 0) return nothing;

  /*
   * WHICH OF THE NAMES COMING BACK IS THE READER'S OWN.
   *
   * Read from the phone, not asked of the server: a member's view of `player`
   * is `id, display_name` and deliberately not `claimed_by_user_id`, so there
   * is nothing here to ask. `identity.ts` wrote it down at the one moment it
   * was known for certain — the claim itself — and this is the other place that
   * answer is worth something. Null for a host who never claimed an invite;
   * their own nights already carry the id they were recorded with.
   */
  const meId = await claimedSeat().catch(() => null);

  let added = 0;
  let players = 0;
  for (const book of books) {
    const result = await pullBook(book, meId);
    added += result.nights;
    players += result.players;
  }
  return { added, books: books.length, players };
}

async function pullBook(
  book: BookRow,
  meId: string | null,
): Promise<{ nights: number; players: number }> {
  const bookId = book.id;
  const groupName = book.group_name;
  // THE ROSTER FIRST, and before the check for nights below. A book with people
  // in it and no night yet is an ordinary thing — a host who set the group up
  // on Tuesday for a game on Friday — and returning early on the night count
  // sent that phone away with the roster it came for still on the server.
  const people = await rows<PlayerRow>('player', (q) =>
    q.select(READS.player).eq('book_id', bookId),
  );
  const roster = await importRoster({
    id: bookId,
    groupName,
    // What the group is set up as, for a club this pull has to MAKE. A club
    // this phone already has keeps its own answers: settings travel up, exactly
    // as names do, and a pull that wrote them back would make the two ends
    // argue with the winner decided by whichever ran last.
    settings: {
      currency: book.currency_code,
      defaultBuyIn: book.default_buyin,
      stakesJson: book.stakes,
      roundingMode: book.rounding_mode,
    },
    players: people.map((p) => ({
      id: p.id,
      name: p.display_name,
      paysKitty: p.pays_kitty,
      removedAt: p.removed_at,
    })),
  });

  const sessions = await rows<SessionRow>('session', (q) =>
    q
      .select(READS.session)
      .eq('book_id', bookId)
      .order('started_at', { ascending: true }),
  );
  if (sessions.length === 0) return { nights: 0, players: roster.added };

  const ids = sessions.map((s) => s.id);

  // Five more reads for a whole book, rather than five per night. A home game
  // is a handful of nights and a few hundred rows; anything cleverer would be
  // pagination nobody needs yet.
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
  // Who has handed over the money. It changes no figure — nothing in
  // `packages/core` reads it — and it is the whole content of E7, which until
  // `transfer_payment` existed was the one screen a claimed member could never
  // be shown anything on.
  const payments = await rows<PaymentRow>('transfer_payment', (q) =>
    q.select(READS.transfer_payment).in('session_id', ids),
  );

  const nights = sessions.map((s) =>
    toImported(s, {
      groupName,
      people,
      seats,
      entries,
      counts,
      settlements,
      payments,
      currentRules,
      meId,
    }),
  );

  return { nights: await importNights(nights), players: roster.added };
}

/** Everything read for a book, which one night is cut out of. */
interface BookRows {
  groupName: string;
  people: PlayerRow[];
  seats: Array<{ session_id: string; player_id: string }>;
  entries: EntryRow[];
  counts: Array<{ session_id: string; player_id: string; counted_chips: number }>;
  settlements: SettlementRow[];
  payments: PaymentRow[];
  currentRules: RuleRow[];
  meId: string | null;
}

/**
 * One night, as the phone stores it, out of the rows read for its book.
 *
 * SHARED by the whole-book pull and by `pullNight`, the read a phone makes when
 * a night is passed to it. They must not be two mappings: the phone taking over
 * a night continues its ledger, and a column one of them dropped would be a
 * figure that changed hands at the table.
 */
function toImported(s: SessionRow, r: BookRows): ImportedNight {
  const settlement = r.settlements.find((x) => x.session_id === s.id);
  const seated = new Set(r.seats.filter((x) => x.session_id === s.id).map((x) => x.player_id));
  const acknowledgement = acknowledgementOf(settlement);

  // The night's OWN rules where they exist. A settled night carries the
  // snapshot it was settled with, and using today's rules instead would
  // restate a night the group has already been paid out on.
  const snapshot = settlement?.rules_snapshot;
  const rules = Array.isArray(snapshot) ? (snapshot as MoneyRule[]) : r.currentRules.map(toRule);

  return {
    sessionId: s.id,
    groupName: r.groupName,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    status: statusOf(s.status),
    stakes: s.stakes,
    defaultBuyIn: s.default_buyin,
    rules,
    /*
     * The settlement's own inputs are the authority on a settled night: the
     * session row is written once, when the night opens, and a host who
     * changed the rounding before closing would leave the two disagreeing.
     * The snapshot is what the figures were actually produced from.
     */
    roundingMode: roundingOf(settlement) ?? s.rounding_mode ?? null,
    // Everybody the book knows, seated according to this night. A roster is
    // group-wide; who was at the table is not.
    players: r.people.map((p) => ({
      id: p.id,
      name: p.display_name,
      atTable: seated.has(p.id),
    })),
    entries: r.entries.filter((e) => e.session_id === s.id).map(toEntry),
    counts: r.counts
      .filter((c) => c.session_id === s.id)
      .map((c) => ({ playerId: c.player_id, amount: c.counted_chips })),
    payments: r.payments
      .filter((x) => x.session_id === s.id)
      .map((x) => ({ from: x.from_player_id, to: x.to_player_id, paidAt: x.paid_at })),
    tableName: s.table_name,
    /* Stamped onto the night so the reader can be found in their own history
       — `importNights` drops it for any night they were not at. */
    meId: r.meId,
    ...(acknowledgement === undefined ? {} : { acknowledgement }),
  };
}

/**
 * The server's four statuses, as the phone's three.
 *
 * `counting` used to arrive as `open`, which was harmless while only settled
 * nights were ever read back. A night passed to another phone mid-count is not
 * settled, and landing it as open would put the phone taking it over back at
 * the table with the chips already being counted.
 */
function statusOf(status: string): ImportedNight['status'] {
  if (status === 'settled') return 'settled';
  if (status === 'counting') return 'counting';
  return 'open';
}

/**
 * ONE NIGHT, read whole, for the phone it has just been passed to.
 *
 * The same reads as `pullBook`, narrowed to one session, plus the roster —
 * imported through `importRoster` exactly as a claim does, so a phone that has
 * never seen this group before has one to show. The caller replaces whatever
 * copy of the night the phone held (`replaceNight`); this only reads.
 *
 * Returns null when the account cannot see the night, which after a redeemed
 * code means the server has not caught up — never a reason to guess.
 */
export async function pullNight(
  sessionId: string,
): Promise<{ night: ImportedNight; bookId: string; clubId: string } | null> {
  if (!isSupabaseConfigured) return null;

  const sessions = await rows<SessionRow & { book_id: string }>('session', (q) =>
    q.select(`${READS.session}, book_id`).eq('id', sessionId),
  );
  const s = sessions[0];
  if (s === undefined) return null;
  const bookId = s.book_id;

  const books = await rows<BookRow>('book', (q) => q.select(READS.book).eq('id', bookId));
  const book = books[0];
  if (book === undefined) return null;

  const people = await rows<PlayerRow>('player', (q) =>
    q.select(READS.player).eq('book_id', bookId),
  );
  const { clubId } = await importRoster({
    id: bookId,
    groupName: book.group_name,
    settings: {
      currency: book.currency_code,
      defaultBuyIn: book.default_buyin,
      stakesJson: book.stakes,
      roundingMode: book.rounding_mode,
    },
    players: people.map((p) => ({
      id: p.id,
      name: p.display_name,
      paysKitty: p.pays_kitty,
      removedAt: p.removed_at,
    })),
  });

  const ids = [sessionId];
  const [currentRules, seats, entries, counts, settlements, payments] = await Promise.all([
    rows<RuleRow>('money_rule', (q) =>
      q.select(READS.money_rule).eq('book_id', bookId).order('sort_order', { ascending: true }),
    ),
    rows<{ session_id: string; player_id: string }>('session_seat', (q) =>
      q.select(READS.session_seat).in('session_id', ids),
    ),
    rows<EntryRow>('ledger_entry', (q) =>
      q.select(READS.ledger_entry).in('session_id', ids).order('seq', { ascending: true }),
    ),
    rows<{ session_id: string; player_id: string; counted_chips: number }>('final_count', (q) =>
      q.select(READS.final_count).in('session_id', ids),
    ),
    rows<SettlementRow>('settlement', (q) => q.select(READS.settlement).in('session_id', ids)),
    rows<PaymentRow>('transfer_payment', (q) =>
      q.select(READS.transfer_payment).in('session_id', ids),
    ),
  ]);

  const meId = await claimedSeat().catch(() => null);

  return {
    bookId,
    clubId,
    night: toImported(s, {
      groupName: book.group_name,
      people,
      seats,
      entries,
      counts,
      settlements,
      payments,
      currentRules,
      meId,
    }),
  };
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

/**
 * The rounding rule a settled night was actually settled under.
 *
 * Read off `inputs_snapshot` — the very object `settle()` was handed — rather
 * than off the session row, which was written when the night opened and cannot
 * know about a change made before it closed. Absent, on every night settled
 * before the setting existed, is whole dollars.
 */
function roundingOf(s: SettlementRow | undefined): RoundingMode | null {
  const inputs = s?.inputs_snapshot;
  if (inputs === null || typeof inputs !== 'object') return null;
  const mode = (inputs as { roundingMode?: unknown }).roundingMode;
  return typeof mode === 'string' ? (mode as RoundingMode) : null;
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
  /*
   * WHO COVERED A SPEND. Read with `*` and dropped here until 23 September —
   * B92. A pizza the piggy bank paid for arrived as a spend with no payer and
   * no cover, which the engine reads differently, so a pulled night could
   * freeze at figures nobody at the table was paid on.
   */
  coveredBy: e.covered_by ?? null,
  spendGroup: e.spend_group ?? null,
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
  ...(r.period_minutes === null || r.period_rounding === null
    ? {}
    : { period: { minutes: r.period_minutes, rounding: r.period_rounding } }),
  ...(r.max_per_player == null ? {} : { maxPerPlayer: r.max_per_player as Money }),
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

interface BookRow {
  id: string;
  group_name: string;
  currency_code: string | null;
  default_buyin: number | null;
  stakes: string | null;
  rounding_mode: RoundingMode | null;
}

interface PlayerRow {
  id: string;
  display_name: string;
  pays_kitty: boolean;
  removed_at: string | null;
}

interface PaymentRow {
  session_id: string;
  from_player_id: string;
  to_player_id: string;
  paid_at: string;
}

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  stakes: string | null;
  default_buyin: number;
  rounding_mode: RoundingMode | null;
  table_name: string | null;
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
  covered_by: 'kitty' | 'unpaid' | null;
  spend_group: string | null;
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
  /** Both null unless the rule is charged by time — migration 0015. */
  period_minutes: number | null;
  period_rounding: RulePeriod['rounding'] | null;
  /** The ceiling on what one person pays, where the rule has one. */
  max_per_player: number | null;
  collector_player_id: string;
  sort_order: number;
}

interface SettlementRow {
  session_id: string;
  rules_snapshot: unknown;
  /** The `NightSnapshot` the figures came from — it carries the rounding rule. */
  inputs_snapshot: unknown;
  discrepancy_amount: number;
  discrepancy_confirmed_by: string | null;
  discrepancy_confirmed_at: string | null;
  discrepancy_note: string | null;
  discrepancy_absorbed_by: string | null;
}
