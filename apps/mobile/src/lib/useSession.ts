import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';

export interface AuthState {
  session: Session | null;
  /** True until the stored session has been read back from disk. */
  loading: boolean;
  configured: boolean;
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

  return { session, loading, configured: isSupabaseConfigured };
}
