import * as Linking from 'expo-linking';
import { supabase } from './supabase';

/**
 * Where the sign-in email should send the host back to.
 *
 * NOT a hardcoded `pokerclub://`. That scheme only exists once the app is
 * installed as a standalone build; while it runs inside Expo Go the app owns no
 * scheme at all, and iOS has nothing to hand the link to — which is exactly the
 * "the application couldn't be opened" dead end.
 *
 * Linking.createURL() returns whatever is correct for how the app is running
 * right now: an exp:// URL pointing at the dev server in Expo Go, and
 * pokerclub:// in a real build. One call, both environments, no branching.
 */
export function authRedirectUrl(): string {
  return Linking.createURL('/auth-callback');
}

/**
 * Finish signing in from the link the host tapped.
 *
 * Supabase returns the tokens in the URL fragment (`#access_token=…`), which is
 * why detectSessionInUrl is off in the client — there is no browser here to do
 * it for us, so the app reads them and installs the session itself.
 *
 * Returns false for any other URL, so this is safe to call on every deep link.
 */
export async function completeSignInFromUrl(url: string): Promise<boolean> {
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const parsed = Linking.parse(url);

  const fromFragment = new URLSearchParams(fragment);
  const accessToken =
    fromFragment.get('access_token') ?? (parsed.queryParams?.access_token as string | undefined);
  const refreshToken =
    fromFragment.get('refresh_token') ?? (parsed.queryParams?.refresh_token as string | undefined);

  // Supabase reports a refused or expired link this way rather than by failing.
  const errorDescription =
    fromFragment.get('error_description') ??
    (parsed.queryParams?.error_description as string | undefined);
  if (errorDescription) throw new Error(errorDescription);

  if (!accessToken || !refreshToken) return false;

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return true;
}
