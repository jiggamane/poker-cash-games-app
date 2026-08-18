import { useEffect, useState } from 'react';
import { config } from './supabaseConfig';

/**
 * Whether the phone can reach the server, and when it last could.
 *
 * The home handoff § H9 asks for a state this app did not have an answer for.
 * Everything on the club home screen is read from SQLite on the device, so the
 * screen works with no connection at all — but three things on it are not
 * local, and each of them lies if the network is gone: an invite has to reach
 * the server, a figure pulled from another phone goes stale, and a banner that
 * never appears leaves a host wondering why nothing has changed since 23:22.
 *
 * WHAT THIS DOES NOT DO is stop the timer. H9 freezes the elapsed figure
 * because it describes a table the reader is watching from elsewhere: with no
 * connection that number is a guess, and a guess presented as current is the
 * failure the rule is written against. A host's own night is not a guess — it
 * is a timestamp in the database on the phone in their hand — so freezing it
 * would print a figure the app knows to be wrong. The rule is honoured by
 * being able to say when the data was last confirmed, which is what `savedAt`
 * is for; the freezing belongs to the watcher screen, where the data really
 * does come from somewhere else.
 *
 * A build with no server configured is not offline. It is a local app, it has
 * nothing to be out of touch with, and it must never claim otherwise.
 */

export interface Online {
  /** False only when there is a server to reach and it could not be reached. */
  ok: boolean;
  /** When the app last got an answer. Null before the first one. */
  savedAt: Date | null;
}

const LOCAL_ONLY: Online = { ok: true, savedAt: null };

/** Ninety seconds: often enough to notice, rare enough to ignore on a battery. */
const EVERY = 90_000;

/**
 * `auth/v1/settings` is public and small, and it is the same endpoint
 * `connection.ts` probes for Settings — one question, asked in one way.
 */
async function reachable(url: string, key: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    // Any answer at all means the network is there. A refused key is a
    // different problem, it has its own screen, and it is not this banner.
    return res.status > 0;
  } catch {
    return false;
  }
}

export function useOnline(): Online {
  const [state, setState] = useState<Online>(LOCAL_ONLY);

  useEffect(() => {
    const url = config.url;
    const key = config.key;
    if (url === null || key === null) return;

    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ask = async (): Promise<void> => {
      const ok = await reachable(url, key);
      if (!live) return;
      setState((was) => ({ ok, savedAt: ok ? new Date() : was.savedAt }));
      timer = setTimeout(() => void ask(), EVERY);
    };

    void ask();
    return () => {
      live = false;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

  return state;
}
