import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './supabaseConfig';

/**
 * The Supabase client.
 *
 * Only the ANON key ever appears in the app. It is designed to be public — the
 * row-level security policies in supabase/migrations are what actually protect
 * the data, not the secrecy of this key. The service_role key must never come
 * near this file; it bypasses every policy and belongs only in edge functions.
 * `supabaseConfig` refuses to start with one, rather than trusting that.
 */

/** False until the project is configured, so the app can say so plainly. */
export const isSupabaseConfigured = config.problem === null;

export { config as supabaseConfig };

export const supabase: SupabaseClient = createClient(
  config.url ?? 'https://unconfigured.supabase.co',
  config.key ?? 'unconfigured',
  {
    auth: {
      // The host stays signed in between nights.
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // There is no browser URL to read a session back from.
      detectSessionInUrl: false,
    },
    global: { fetch: refuseWhenUnconfigured },
  },
);

/**
 * A misconfigured build must not be allowed to ask.
 *
 * `unconfigured.supabase.co` is not a dead address — supabase.co answers on
 * every subdomain — so without this the placeholders above reach a real gateway,
 * which refuses the placeholder key and answers "Invalid API key". That message
 * then surfaces on whichever screen happened to make the call, and it describes
 * neither the cause (there is no project in this build) nor the cure (a line in
 * a file). One check here means every screen in the app reports the real fault
 * instead, without any of them knowing about it.
 */
function refuseWhenUnconfigured(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (config.problem !== null) {
    return Promise.reject(new Error(config.complaint ?? 'This build has no Supabase project.'));
  }
  return fetch(input, init);
}

/**
 * What went wrong, said to a host rather than to a developer.
 *
 * The server's own wording is kept for anything this does not recognise — a
 * message we cannot improve on is better than a message we have flattened into
 * "something went wrong". These four are the ones worth rewriting because each
 * one is reported in language about the protocol and fixed in language about
 * the app.
 */
export function explainServerError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);

  if (/invalid api key/i.test(raw)) {
    return `The server refused this build’s key${
      config.ref === null ? '' : ` for project ${config.ref}`
    }. Settings → Connection says which key it is and what to replace it with.`;
  }

  if (/jwt expired|token is expired|invalid claim|bad_jwt/i.test(raw)) {
    return 'This sign-in has expired. Settings → Connection will clear it, then sign in again.';
  }

  if (/network request failed|failed to fetch|fetch failed/i.test(raw)) {
    return 'No answer from the server. The night keeps recording on this phone and sends when there is signal.';
  }

  if (/anonymous sign-ins are disabled/i.test(raw)) {
    return 'This project has anonymous sign-ins turned off, and a code cannot be spent without one. Authentication → Sign In / Providers → Anonymous sign-ins.';
  }

  return raw;
}

/**
 * Drop the sign-in this phone is holding, without asking the server first.
 *
 * The case that needs it is precisely the case where the server will not
 * answer: a token it no longer accepts. An ordinary `signOut()` posts to
 * /logout, is refused, and leaves the bad token in place — so the one action
 * that could rescue the app fails for the same reason the app is stuck.
 */
export async function forgetSignIn(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}

/**
 * Email the host a sign-in link.
 *
 * redirectTo comes from authRedirectUrl(), which returns whatever suits how the
 * app is running — an exp:// dev URL inside Expo Go, pokerclub:// in a build.
 * Hardcoding either one breaks the other.
 *
 * shouldCreateUser is FALSE, and that single word is the whole invite system:
 * an address nobody has invited gets no account and no email, so the closed
 * test is enforced by the auth server rather than by us remembering who we told
 * about it. Testers are added by hand in the dashboard under Authentication ->
 * Users -> Invite. See docs/auth-test-period.md.
 */
export async function sendSignInLink(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

/**
 * True when Supabase refused because this address has not been invited.
 *
 * It reports that as a 422 with `otp_disabled`, whose default message —
 * "Signups not allowed for otp" — reads like a broken build rather than a door
 * that is simply shut, so the sign-in screen says it in its own words.
 */
export function isNotInvited(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: string; message?: string };
  return e.code === 'otp_disabled' || /signups not allowed/i.test(e.message ?? '');
}

/**
 * Exchange a six-digit code for a session.
 *
 * Only reachable once the project has custom SMTP and its email templates carry
 * {{ .Token }} — Supabase's built-in mail sends a link and nothing else. Kept
 * because a code is the better flow when it is available: no leaving the app.
 */
export async function verifySignInCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Turn a share link into read access to one night.
 *
 * Three steps, and the order matters:
 *
 *   1. A watcher with no session gets an ANONYMOUS one. It is a real Supabase
 *      user and a real JWT — no email, no password, nothing to remember — and
 *      it exists only to be something the grant can be attached to. A watcher
 *      who already has a session (a host looking at someone else's game) keeps
 *      the one they have.
 *   2. redeem_share_token records the grant, and is the only thing in the
 *      system that can. The token never goes anywhere near a table the app
 *      writes to directly.
 *   3. The session is refreshed, because the grant only reaches this device as
 *      a claim inside a NEWLY ISSUED token. Skip this and everything reads as
 *      empty until the token happens to refresh on its own — which looks
 *      exactly like a broken policy and is the one failure mode of this design
 *      worth naming out loud.
 */
export async function redeemShareToken(token: string): Promise<string> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session === null) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }

  const { data, error } = await supabase.rpc('redeem_share_token', { token });
  if (error) throw error;

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;

  return data as string;
}

/**
 * The night this device last opened a link to.
 *
 * Deliberately a note to ourselves rather than a permission: it says which
 * night to try, and the database says whether that is allowed. If the host
 * revokes the link, this value stays and the query behind it returns nothing —
 * which is exactly what the watcher should see. Reading permission off the
 * device would mean the app deciding what it is allowed to read, which is the
 * one thing this design refuses to do.
 */
const WATCHING_KEY = 'poker-club.watching';

export async function rememberWatching(sessionId: string): Promise<void> {
  await AsyncStorage.setItem(WATCHING_KEY, sessionId);
}

export async function watchedSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(WATCHING_KEY);
}

export async function forgetWatching(): Promise<void> {
  await AsyncStorage.removeItem(WATCHING_KEY);
}
