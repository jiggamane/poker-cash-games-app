import { supabase } from './supabase';

/**
 * Sharing a night — and ONLY sharing it.
 *
 * There used to be a `publishNight` here that put the night on the server, and
 * it ran when the host tapped Share. That was the wrong shape: storage is not a
 * feature of sharing. A night now publishes itself the moment it opens, through
 * the queue in `sync.ts`, whether or not anybody is ever shown it.
 *
 * What is left is the link: reading the token, revoking it, and counting who
 * holds one.
 */

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

