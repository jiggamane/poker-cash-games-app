/**
 * What an invite means — the two rules the screens were getting wrong.
 *
 * OUT HERE, WITH NO IMPORTS, for the reason `queueable.ts` is: each is a
 * decision about one value, each was previously spelt out inline in a screen or
 * a query, and neither had anything in front of it that could go red. `invites.ts`
 * cannot hold them — it reaches expo-linking and the Supabase client, so a test
 * that imported it would drag react-native into the runner and fail before it
 * asserted anything.
 *
 * `invites.ts` re-exports both, so a screen goes on importing from the one
 * place it always did.
 */

/**
 * Why a claim did not land.
 *
 * `0009_invite_privacy.sql` gives the four dead causes — unknown, spent,
 * revoked, expired — ONE message and one duration, and that is a security
 * property rather than a copy preference: a ten-character code from a
 * thirty-character alphabet is about fifty bits, and a refusal that says which
 * kind it was partitions a guesser's list for them. Nothing here undoes that.
 *
 * What it does undo is the screen answering with that message for two things
 * that are not refusals of a code at all:
 *
 *   · A SERVER THAT DID NOT ANSWER. A phone in a tunnel learnt nothing about
 *     any code, and "ask whoever invited you for a new link" is advice about a
 *     link that is perfectly good. `claim.tsx` said so in a comment three lines
 *     above the line that did the opposite.
 *   · A SEAT THE READER ALREADY HOLDS. The server keeps this one honest on
 *     purpose — it only fires for a code that resolves to a book they can
 *     already read, so saying so reveals nothing they did not have.
 *
 * ANYTHING UNRECOGNISED IS TREATED AS UNREACHABLE, never as dead. A thrown
 * error is not evidence about a code; only `preview_player_invite` answering
 * with nothing is that. The cost of being wrong this way is a retry the reader
 * did not need; the cost of being wrong the other way is sending somebody to
 * ask for a replacement for a code that works.
 */
export type ClaimFailure = 'unreachable' | 'already-a-member' | 'dead';

/**
 * Read a refusal. A pure function of the message, so it is asserted without a
 * network — the same reason `readKeyProbe` is one.
 */
export function readClaimFailure(e: unknown): ClaimFailure {
  const raw = e instanceof Error ? e.message : String(e);

  // The one message the four dead causes share. Matched on the server's exact
  // sentence, because everything else that can be thrown here is not about the
  // code at all.
  if (/this invite cannot be used/i.test(raw)) return 'dead';

  if (/already have a place in this book/i.test(raw)) return 'already-a-member';

  return 'unreachable';
}

/**
 * Is this invite still worth handing to somebody? — B49.
 *
 * The host's screen and the server disagreed about what "live" means. Every
 * server path spells it `claimed_at is null and revoked_at is null and
 * expires_at > now()`; `seatStatuses` spelled it with the first two and not the
 * third, so a code whose month had run out came back as the current one, was
 * drawn as the hero with its share chips enabled, and got sent — to land the
 * person holding it on the dead screen.
 *
 * The expiry is tested HERE, on the row, rather than added to the query as a
 * fourth `.is()`, so that the rule this app depends on is a pure function with
 * a test in front of it rather than a clause nothing can see. There are a
 * handful of invites per roster; fetching an expired one and dropping it costs
 * nothing worth measuring.
 *
 * A timestamp that will not parse counts as NOT live. The cost of that is one
 * fresh code, which is what the sheet does anyway when a seat has none; the
 * cost the other way is handing a host ten characters the app cannot vouch for.
 */
export function isLive(expiresAt: string | null, now: number = Date.now()): boolean {
  if (expiresAt === null) return false;
  const at = Date.parse(expiresAt);
  return !Number.isNaN(at) && at > now;
}
