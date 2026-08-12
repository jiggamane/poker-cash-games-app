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
 * Sign the host in with a six-digit code emailed to them.
 *
 * A CODE, not a magic link. A link has to reopen the app through a custom URL
 * scheme, which does not exist while the app runs inside Expo Go, and which
 * needs a redirect allowlist entry per environment even once it does. A code is
 * typed into the screen the host is already looking at, works identically
 * everywhere, and needs no configuration at all.
 *
 * It is also better at a kitchen table: no leaving the app mid-sign-in.
 */
export async function sendSignInCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Exchange the emailed code for a session. */
export async function verifySignInCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code.trim(),
    type: 'email',
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
