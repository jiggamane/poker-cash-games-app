import { supabase } from './supabase';
import { sync } from './ledgerRepo';
import type { Night } from './nightStore';

/**
 * Put tonight on the server, so there is something for a link to point at.
 *
 * The night lives on the host's phone and works there with no account at all.
 * Sharing is the one thing that cannot: a watcher reads rows, so the rows have
 * to exist, and the row-level policies that make the sharing safe have nothing
 * to act on until they do. This is the smallest set of rows that makes a share
 * link mean something — the book, the players named in the ledger, the night
 * itself, who sat down, and then the ledger through the ordinary outbox.
 *
 * Everything here is idempotent on the id the phone generated, so publishing
 * twice publishes once. In particular the session is never overwritten, because
 * its row carries the share_token and rewriting it would silently invalidate
 * every link already sent to the room.
 */
export async function publishNight(night: Night): Promise<string> {
  const { data: auth } = await supabase.auth.getSession();
  const hostId = auth.session?.user.id;
  if (hostId === undefined) throw new Error('Sign in first — a night can only be shared from an account.');

  // Every id in this app is a UUID because the server's columns are uuid.
  // Saying so here turns an unreadable Postgres error on the first player into
  // a sentence that names the actual problem: this night predates that.
  const badId = [night.sessionId, ...night.players.map((p) => p.id)].find((id) => !isUuid(id));
  if (badId !== undefined) {
    throw new Error(
      'This night was created before the app used proper ids, so it cannot be shared. Start a new session and that one will share fine.',
    );
  }

  const bookId = await ensureBook(hostId, night.groupName);

  // Players before the session, and the session before the ledger: a ledger
  // entry names both, and the database will not accept a row that points at
  // something absent. That ordering is the schema's foreign keys, not a habit.
  if (night.players.length > 0) {
    const { error } = await supabase.from('player').upsert(
      night.players.map((p) => ({ id: p.id, book_id: bookId, display_name: p.name })),
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
  }

  const { error: sessionError } = await supabase.from('session').upsert(
    [
      {
        id: night.sessionId,
        book_id: bookId,
        default_buyin: firstBuyIn(night),
        seat_count: Math.min(Math.max(night.players.length, 1), 30),
        started_at: night.startedAt,
        // Always 'live'. The server's status moves with the settle-up flow, and
        // that flow does not write to the server yet; claiming 'settled' here
        // would also need an ended_at, and the schema is right to insist on it.
        status: 'live',
      },
    ],
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (sessionError) throw new Error(sessionError.message);

  const seated = night.players.filter((p) => p.atTable);
  if (seated.length > 0) {
    const { error } = await supabase.from('session_seat').upsert(
      seated.map((p) => ({ session_id: night.sessionId, player_id: p.id })),
      { onConflict: 'session_id,player_id', ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
  }

  await sync();

  return shareTokenFor(night.sessionId);
}

/**
 * The host's book, made if this is the first time.
 *
 * One book per host in v1 — the schema allows several and the app assumes one,
 * so the first row found is the right one.
 */
async function ensureBook(hostId: string, groupName: string): Promise<string> {
  const { data: existing, error } = await supabase.from('book').select('id').limit(1);
  if (error) throw new Error(error.message);
  if (existing !== null && existing.length > 0) return existing[0].id as string;

  const { data: created, error: createError } = await supabase
    .from('book')
    .insert({ host_user_id: hostId, group_name: groupName })
    .select('id')
    .single();
  if (createError) throw new Error(createError.message);
  return created.id as string;
}

/** The current link for a night, whether it was just published or not. */
export async function shareTokenFor(sessionId: string): Promise<string> {
  const { data, error } = await supabase
    .from('session')
    .select('share_token')
    .eq('id', sessionId)
    .single();
  if (error) throw new Error(error.message);
  return data.share_token as string;
}

/**
 * Cut off everyone watching, and rotate the link so the one already passed
 * around the room stops working. The database does both in one call, because
 * doing only the first is the mistake that looks like it worked.
 */
export async function stopSharing(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_share_access', { target_session_id: sessionId });
  if (error) throw new Error(error.message);
}

/** How many devices are currently allowed to watch this night. */
export async function watcherCount(sessionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('share_grant')
    .select('user_id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .is('revoked_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * The buy-in the night was set up with. `default_buyin` is required and must be
 * positive, and the first buy-in recorded is the truest answer the phone holds.
 */
function firstBuyIn(night: Night): number {
  const first = night.entries.find((e) => e.type === 'buyin');
  return first === undefined || first.amount <= 0 ? 500 : first.amount;
}

/** The shape every id in this app has, because every server column is uuid. */
const isUuid = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
