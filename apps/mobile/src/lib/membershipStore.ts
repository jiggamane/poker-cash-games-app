import { useEffect, useState } from 'react';
import { currentClub, onClubChange } from './clubStore';
import { claimedSeat } from './identity';
import {
  forgetMemberships,
  fromRow,
  setMemberships,
  type Membership,
  type MembershipRow,
} from './membership';
import { leavesThePhone } from './queueable';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * The seam's client — `membership.ts` is pure and this is the file that asks
 * the server and hands it the answers.
 *
 * Two calls, `0021_membership.sql`:
 *
 *   my_membership(night)        this account's tier, whether its host night is
 *                               spent, and when it comes back
 *   roster_membership(ids, night)
 *                               the same for every claimed seat the caller may
 *                               read — the host's phone and the phone recording
 *                               the night; a member asking gets nothing back,
 *                               and the seam keeps its placeholder for them
 *
 * IT NEVER CLEARS AN ANSWER IT DID NOT HEAR — the rule `reconcileSeats` set
 * for the roster's badges. A train tunnel, a signed-out build and a project
 * that refuses the key all leave the last answers standing, and a phone that
 * has never heard one draws the placeholder. The server is the floor under
 * every list drawn from this: a stale answer costs a refused pass, never a
 * wrong one.
 *
 * WHOSE ROW IS "MINE". The seat this phone claimed, or — the host's phone,
 * which claimed nothing — the club's admin row. The host's own seat may have
 * nobody on it on the server (B48), so it is not in `roster_membership`'s
 * answer and `my_membership` is what answers for that row.
 */

let version = 0;
const listeners = new Set<() => void>();
const bump = (): void => {
  version += 1;
  for (const l of listeners) l();
};

/**
 * Ask the server about this phone, and about the roster where it may. Safe to
 * call as often as you like; a no-op with no project configured.
 */
export async function refreshMemberships(sessionId: string | null): Promise<void> {
  if (!isSupabaseConfigured) return;
  const club = currentClub();
  if (club === null) return;

  const night = sessionId !== null && leavesThePhone(sessionId) ? sessionId : null;
  const args = night === null ? {} : { target_session: night };

  let mineRow: MembershipRow | undefined;
  let rosterRows: Array<MembershipRow & { player_id: string }> = [];
  try {
    const [mine, roster] = await Promise.all([
      supabase.rpc('my_membership', args),
      supabase.rpc('roster_membership', {
        player_ids: club.members.map((m) => m.id).filter(leavesThePhone),
        ...args,
      }),
    ]);
    if (mine.error) throw mine.error;
    if (roster.error) throw roster.error;
    mineRow = (Array.isArray(mine.data) ? mine.data[0] : mine.data) as MembershipRow | undefined;
    rosterRows = (roster.data ?? []) as Array<MembershipRow & { player_id: string }>;
  } catch {
    return;
  }

  const myPlayerId =
    (await claimedSeat()) ?? club.members.find((m) => m.standing === 'admin')?.id ?? null;

  const byPlayer = new Map<string, Membership>();
  const spentBy = new Set<string>();
  for (const r of rosterRows) {
    byPlayer.set(r.player_id, fromRow(r));
    if (r.spent_on_this) spentBy.add(r.player_id);
  }
  const mine =
    mineRow === undefined || myPlayerId === null
      ? null
      : { playerId: myPlayerId, membership: fromRow(mineRow) };
  if (mine !== null && mineRow?.spent_on_this) spentBy.add(mine.playerId);

  setMemberships({ byPlayer, mine, sessionId: night, spentBy });
  bump();
}

/** On sign-out: back to the placeholder, so nobody's tier outlives their account on this phone. */
export function clearMemberships(): void {
  forgetMemberships();
  bump();
}

/**
 * Refresh when the screen mounts and whenever the club changes, and re-render
 * when an answer lands. Returns a counter the screen can ignore — reading it
 * is what makes the component re-render — and passing the night makes the
 * answers say who THIS game already landed on.
 */
export function useMemberships(sessionId: string | null): number {
  const [v, setV] = useState(version);
  useEffect(() => {
    const l = (): void => setV(version);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  useEffect(() => {
    void refreshMemberships(sessionId);
    return onClubChange(() => void refreshMemberships(sessionId));
  }, [sessionId]);
  return v;
}
