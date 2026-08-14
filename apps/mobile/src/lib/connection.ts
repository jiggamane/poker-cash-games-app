import { config } from './supabaseConfig';

/**
 * Ask the server one question and turn the answer into a sentence.
 *
 * Everything else in this app that touches Supabase reports a failure by
 * showing whatever string came back, which is how a host ends up reading
 * "Invalid API key" on a sheet about inviting Dana. That message is the
 * gateway's, it is about the build rather than about Dana, and there is nothing
 * on that screen — or any screen — that a host could do with it.
 *
 * So there is one place that asks, and it asks the two questions separately,
 * because they fail separately and the fixes are unrelated:
 *
 *   1. Does the server accept THIS BUILD'S KEY?  → apikey alone, no session.
 *   2. Does it accept THIS PHONE'S SIGN-IN?      → the same call, with the token.
 *
 * A stored sign-in that the server no longer accepts is the failure worth
 * separating out. It survives a restart, `autoRefreshToken` cannot mend it, and
 * every request made while holding it fails — so without this check the only
 * cure is deleting the app, and the symptom looks exactly like a bad key.
 */

export interface ConnectionReport {
  ok: boolean;
  /** One line, for a row in Settings. */
  headline: string;
  /** What to do about it. Empty when there is nothing to do. */
  detail: string;
  /** The sign-in on this phone is the thing being refused — offer to clear it. */
  staleSignIn: boolean;
  /** Whether the project allows anonymous sign-ins, which watchers and claims need. */
  anonymousSignIns: boolean | null;
}

/** `auth/v1/settings` is public, small, and refused by the same gate as everything else. */
const SETTINGS_PATH = '/auth/v1/settings';
const USER_PATH = '/auth/v1/user';

/**
 * What an answer to the key probe means.
 *
 * Written as a pure function of the status code so it can be asserted without a
 * network, and so the mapping is somewhere a person can read it. 401 is the
 * only one that means what it says; the rest are the ways a URL can be wrong or
 * a free project can be asleep.
 */
export function readKeyProbe(status: number): Omit<ConnectionReport, 'anonymousSignIns'> {
  const ref = config.ref ?? 'this project';

  if (status === 200) {
    return { ok: true, headline: 'Connected', detail: '', staleSignIn: false };
  }

  if (status === 401 || status === 403) {
    return {
      ok: false,
      headline: 'The key was refused',
      detail: `${ref} does not accept the key in apps/mobile/.env — that is what “Invalid API key” means. Copy the current key from Project Settings → API Keys and restart the dev server; a key that was rotated, or that came from another project, fails exactly like this.`,
      staleSignIn: false,
    };
  }

  if (status === 404) {
    return {
      ok: false,
      headline: 'No project at that address',
      detail: `Nothing is listening at ${config.url ?? 'the configured URL'}. Check EXPO_PUBLIC_SUPABASE_URL against Project Settings → Data API.`,
      staleSignIn: false,
    };
  }

  if (status >= 500) {
    return {
      ok: false,
      headline: 'The project is not answering',
      detail: `${ref} returned ${status}. A free project pauses after seven days with nothing happening, and has to be restored by hand from the dashboard.`,
      staleSignIn: false,
    };
  }

  return {
    ok: false,
    headline: `The server answered ${status}`,
    detail: 'Not a failure this app knows how to name. The status code above is the whole of what it said.',
    staleSignIn: false,
  };
}

/**
 * The same, for the probe made while holding the phone's session.
 *
 * Reached only once the key is known good, so a refusal here can only be about
 * the token — which makes it the one diagnosis in the app that can honestly say
 * "sign in again" rather than "something is wrong".
 */
export function readSessionProbe(status: number): Omit<ConnectionReport, 'anonymousSignIns'> {
  if (status === 200) {
    return { ok: true, headline: 'Connected and signed in', detail: '', staleSignIn: false };
  }

  return {
    ok: false,
    headline: 'This sign-in is no longer accepted',
    detail:
      'The key is fine, so the server is refusing the sign-in stored on this phone. That happens when the project’s keys were rotated or its database was reset under it. Forget the sign-in below and sign in again — nothing recorded on this phone is affected.',
    staleSignIn: true,
  };
}

/**
 * Check it, end to end.
 *
 * Never throws: a connection check that fails by throwing would have to be
 * reported by whatever it was that could not connect, which is the problem this
 * exists to solve.
 */
export async function checkConnection(accessToken: string | null): Promise<ConnectionReport> {
  if (config.problem !== null || config.url === null || config.key === null) {
    return {
      ok: false,
      headline: 'Not configured',
      detail: config.complaint ?? 'This build has no Supabase project.',
      staleSignIn: false,
      anonymousSignIns: null,
    };
  }

  let settings: Response;
  try {
    settings = await fetch(`${config.url}${SETTINGS_PATH}`, {
      headers: { apikey: config.key },
    });
  } catch {
    return {
      ok: false,
      headline: 'Could not reach the server',
      detail: `No answer from ${config.url}. On a phone that usually means no signal or a wifi network that blocks it; the night carries on being recorded either way.`,
      staleSignIn: false,
      anonymousSignIns: null,
    };
  }

  const keyVerdict = readKeyProbe(settings.status);
  const anonymousSignIns = settings.status === 200 ? await readAnonymousFlag(settings) : null;
  if (!keyVerdict.ok) return { ...keyVerdict, anonymousSignIns };

  if (accessToken === null) {
    return {
      ...keyVerdict,
      headline: 'Connected · not signed in',
      anonymousSignIns,
    };
  }

  let user: Response;
  try {
    user = await fetch(`${config.url}${USER_PATH}`, {
      headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return { ...keyVerdict, anonymousSignIns };
  }

  return { ...readSessionProbe(user.status), anonymousSignIns };
}

/**
 * Whether the project will issue anonymous sessions.
 *
 * Worth reading while we are here: a watcher opening a link and a player
 * spending an invite code both begin with `signInAnonymously`, so a project
 * with the toggle off breaks both — silently, and nowhere near the toggle.
 */
async function readAnonymousFlag(response: Response): Promise<boolean | null> {
  try {
    const body = (await response.json()) as { external?: { anonymous_users?: boolean } };
    return body.external?.anonymous_users ?? null;
  } catch {
    return null;
  }
}
