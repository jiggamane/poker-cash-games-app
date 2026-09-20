import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import { whoIs, type Who } from './who';

export interface AuthState {
  session: Session | null;
  /** True until the stored session has been read back from disk. */
  loading: boolean;
  configured: boolean;
  /**
   * WHO, not whether — B91. Read this rather than testing `session` against
   * null: a watcher's link and a claimed seat both leave a real session behind
   * with no account in it, and `session !== null` calls that signed in. `who`
   * is kept here beside the session so the two cannot be read apart.
   */
  who: Who;
}

/**
 * Who is signed in, if anyone.
 *
 * `loading` starts true and stays true until the stored session has been read
 * back. Rendering a sign-in screen during that window would flash it at a host
 * who signed in weeks ago, every single time they open the app.
 */
export function useSession(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) setSession(next);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, configured: isSupabaseConfigured, who: whoIs(session) };
}
