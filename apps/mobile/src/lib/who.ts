import type { Session } from '@supabase/supabase-js';

/**
 * WHO IS BEHIND THIS PHONE — not whether anybody is.
 *
 * `session !== null` was read as "signed in" in six places, and it is not the
 * same question. Two ordinary things in this app hand a phone a real Supabase
 * session with no account behind it at all: opening a share link
 * (`redeemShareToken`) and claiming a seat with an invite code
 * (`redeemInvite`) both call `signInAnonymously` first, because a grant has to
 * be attached to somebody and "somebody" starts as a key on the handset.
 *
 * That session is a real user and a real JWT. It has no email, it belongs to no
 * book, and it cannot write a night. Every screen that asked `session !== null`
 * then told a watcher they were signed in — Settings said *Signed in as
 * unknown* and offered them Sync now — and the two places that decide whether
 * to SEND believed it too, which is the half that costs something rather than
 * merely reading wrong. See B89.
 *
 * So the question is asked once, here, and it has three answers rather than
 * two. Pure and free of React so the queue can ask it as well as the screens.
 */
export type Who =
  /** No session at all. Playing signed out is supported on purpose. */
  | { kind: 'nobody' }
  /** A key from a share link or a claimed seat. Reads; never writes. */
  | { kind: 'anonymous' }
  /** An account, reached by the magic link. The only one that can send. */
  | { kind: 'person'; email: string | null };

/**
 * Read it off the session.
 *
 * `is_anonymous` is optional on Supabase's `User` — absent on a server too old
 * to say — so the test is `=== true` rather than truthiness. Absent means a
 * real account, which is the safe way round: the worst case is offering a sign
 * out to somebody who has one.
 *
 * An email of `''` is `null`. A person is identified by their address on the
 * screen, and an empty string draws a blank space where a name should be.
 */
export function whoIs(session: Session | null): Who {
  if (session === null) return { kind: 'nobody' };
  if (session.user.is_anonymous === true) return { kind: 'anonymous' };
  const email = session.user.email ?? '';
  return { kind: 'person', email: email === '' ? null : email };
}

/**
 * Whether this phone could send its queue if it tried.
 *
 * The one predicate `drain()` and the pump both need, written out so the two
 * cannot drift apart again. An anonymous session is NOT able to send: the row
 * policies refuse it, the outbox halts at its first failure by design, and a
 * queue stopped behind a refusal it will never get past is the expensive
 * version of this bug.
 */
export function canSend(session: Session | null): boolean {
  return whoIs(session).kind === 'person';
}
