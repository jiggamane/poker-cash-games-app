import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase client.
 *
 * Only the ANON key ever appears in the app. It is designed to be public — the
 * row-level security policies in supabase/migrations are what actually protect
 * the data, not the secrecy of this key. The service_role key must never come
 * near this file; it bypasses every policy and belongs only in edge functions.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False until the project is configured, so the app can say so plainly. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = createClient(
  url ?? 'https://unconfigured.supabase.co',
  anonKey ?? 'unconfigured',
  {
    auth: {
      // The host stays signed in between nights.
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // There is no browser URL to read a session back from.
      detectSessionInUrl: false,
    },
  },
);

/**
 * Email the host a sign-in link.
 *
 * redirectTo comes from authRedirectUrl(), which returns whatever suits how the
 * app is running — an exp:// dev URL inside Expo Go, pokerclub:// in a build.
 * Hardcoding either one breaks the other.
 */
export async function sendSignInLink(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
  });
  if (error) throw error;
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
