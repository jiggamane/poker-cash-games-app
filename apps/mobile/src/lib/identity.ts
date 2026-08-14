import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Which seat on this phone is the reader's own.
 *
 * X1a leads with "YOUR SEAT · You, Lena" and X1c labels one row of the table
 * **You**, so both screens need to know which of six names belongs to whoever
 * is holding the phone. Nothing they can read tells them: a member's view of
 * `player` is `id, display_name` and deliberately not `claimed_by_user_id` —
 * "a member reading the roster has no business knowing which of the others have
 * accounts" (`pullReads.ts`), and that reticence applies to their own row too.
 *
 * The one moment the answer is known for certain is the claim itself:
 * `redeem_player_invite` returns the player id it just bound. So it is written
 * down there and read back here.
 *
 * THIS IS A NOTE TO OURSELVES, NEVER A PERMISSION — the same rule
 * `rememberWatching` follows. It decides whose row to put first and whose to
 * call "You". It does not decide what may be read; the policies do that, and if
 * this value were wrong the worst outcome is a screen pointing at the wrong
 * name, not a screen showing something it should not.
 */

const CLAIMED_KEY = 'poker-club.claimed-player';

export async function rememberClaimedSeat(playerId: string): Promise<void> {
  await AsyncStorage.setItem(CLAIMED_KEY, playerId);
}

export async function claimedSeat(): Promise<string | null> {
  return AsyncStorage.getItem(CLAIMED_KEY);
}

export async function forgetClaimedSeat(): Promise<void> {
  await AsyncStorage.removeItem(CLAIMED_KEY);
}
