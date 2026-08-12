import * as Linking from 'expo-linking';
import { redeemShareToken, rememberWatching } from './supabase';

/**
 * The watcher's link.
 *
 * The token IS the credential — there is no sign-up behind it and nothing else
 * to hold — so the link is treated with the care that implies: it is built from
 * the server's own token, never derived from anything guessable, and it points
 * at one night rather than at the group.
 *
 * Built with Linking.createURL for the same reason the sign-in redirect is: in
 * Expo Go the app owns no URL scheme, so a hardcoded pokerclub:// link opens
 * nothing at all during exactly the period we are trying to test.
 */
export function shareLinkFor(token: string): string {
  return Linking.createURL('/watch', { queryParams: { t: token } });
}

/**
 * Pull the token out of an incoming link, or null if this is some other URL.
 *
 * Safe to call on every deep link, including the sign-in callback.
 */
export function parseShareLink(url: string): string | null {
  const parsed = Linking.parse(url);
  const path = parsed.path?.replace(/^\/+/, '') ?? '';
  if (path !== 'watch') return null;

  const token = parsed.queryParams?.t;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

/**
 * Open a share link: redeem it, and remember the night it opened.
 *
 * Returns the session id so the caller can navigate straight to it — a watcher
 * tapping a link in a group chat should land on the night, not on a screen
 * asking them what they would like to do.
 */
export async function openShareLink(token: string): Promise<string> {
  const sessionId = await redeemShareToken(token);
  await rememberWatching(sessionId);
  return sessionId;
}
