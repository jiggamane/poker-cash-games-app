import * as Linking from 'expo-linking';
import { supabase } from './supabase';

/**
 * Invites — the host's side and the player's side of claiming a seat.
 *
 * See `docs/player-identity.md`. The shape: the host issues a ten-character
 * code bound to one member row, and whoever redeems it becomes the person that
 * row already described. Nothing is created; a name that has been in the book
 * for a year simply acquires somebody behind it.
 *
 * THE CODE IS THE PRIMITIVE. Everything here takes and returns a code; the link
 * is a wrapper for the times a link happens to work. That is not tidiness — a
 * link is undeliverable during development (it points at a laptop on somebody's
 * wifi) and unreliable afterwards, whereas ten characters can be read down a
 * phone or written on the back of a receipt.
 *
 * Every check that matters is in the database, not here: who may invite, one
 * use, one live code per seat, the expiry, and one seat per person per book.
 * This file is a thin way of asking.
 */

/** The code, wrapped in a link — for when a link is the convenient channel. */
export function inviteLinkFor(code: string): string {
  return Linking.createURL('/claim', { queryParams: { c: code } });
}

/** Pull a code out of an incoming link, or null if this is some other URL. */
export function parseInviteLink(url: string): string | null {
  const parsed = Linking.parse(url);
  const path = parsed.path?.replace(/^\/+/, '') ?? '';
  if (path !== 'claim') return null;

  const code = parsed.queryParams?.c;
  return typeof code === 'string' && code.length > 0 ? code : null;
}

/**
 * Issue a code for one member row.
 *
 * Re-issuing retires whatever was outstanding, so a seat never has two live
 * codes loose in a group chat at once.
 */
export async function createInvite(playerId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_player_invite', {
    target_player_id: playerId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function revokeInvite(playerId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_player_invite', {
    target_player_id: playerId,
  });
  if (error) throw new Error(error.message);
}

export interface InvitePreview {
  playerName: string;
  groupName: string;
}

/**
 * What a code says before it is spent: a name and a group.
 *
 * Deliberately narrow. X2 greets somebody with "Ivo added you as Petr" before
 * they commit to anything, which means reading two strings out of a book they
 * cannot otherwise see — and nothing about the money, which they have not yet
 * been given any right to.
 *
 * Returns null for a code that is unknown, spent, revoked or expired. One
 * answer for all four, so somebody holding a guess learns nothing from which
 * way it fails.
 */
export async function previewInvite(code: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase
    .rpc('preview_player_invite', { code })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data === null) return null;

  const row = data as { player_name: string; group_name: string };
  return { playerName: row.player_name, groupName: row.group_name };
}

/**
 * Take the seat.
 *
 * Signs in anonymously first if there is nobody here yet — the same mechanism
 * watchers use. A claim has to belong to somebody, and "somebody" starts as a
 * key on this handset rather than as an account with a password. A real
 * credential can be attached to the very same user later, which is what makes
 * the history portable without asking for anything up front.
 *
 * Returns the player id now behind the reader.
 */
export async function redeemInvite(code: string): Promise<string> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session === null) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }

  const { data, error } = await supabase.rpc('redeem_player_invite', { code });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Whether a seat already has somebody behind it, and any live code for it. */
export interface SeatStatus {
  playerId: string;
  claimed: boolean;
  liveCode: string | null;
}

/**
 * The roster, from the server's point of view.
 *
 * The host's screen needs three states per name — nobody invited, invited and
 * waiting, already claimed — and only the server knows the last two.
 */
export async function seatStatuses(playerIds: readonly string[]): Promise<SeatStatus[]> {
  if (playerIds.length === 0) return [];

  const { data: players, error } = await supabase
    .from('player')
    .select('id, claimed_by_user_id')
    .in('id', [...playerIds]);
  if (error) throw new Error(error.message);

  const { data: invites, error: inviteError } = await supabase
    .from('player_invite')
    .select('player_id, code')
    .in('player_id', [...playerIds])
    .is('claimed_at', null)
    .is('revoked_at', null);
  if (inviteError) throw new Error(inviteError.message);

  const live = new Map(
    (invites ?? []).map((i) => [i.player_id as string, i.code as string]),
  );

  return (players ?? []).map((p) => ({
    playerId: p.id as string,
    claimed: p.claimed_by_user_id !== null,
    liveCode: live.get(p.id as string) ?? null,
  }));
}
