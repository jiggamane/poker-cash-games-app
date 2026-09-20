/**
 * The sign-in email, which carries a link and nothing else.
 *
 * WHAT THIS FILE REPLACED, because the argument is worth keeping. Until
 * 20 September the same email carried a link *and* six digits, and
 * `signInCode.ts` was the logic behind a code field on the *Check your email*
 * stage. The case for it was real — a link has to be agreed on by four separate
 * systems and three of them refuse silently — but the code was never a thing
 * this project actually sent: `{{ .Token }}` only reaches the mail once custom
 * SMTP is on and the template in the dashboard has been replaced, and until
 * then Supabase's stock magic-link mail carries a link alone. So the field
 * asked a host to type six digits that were not in the email they were looking
 * at, and the sentence above it promised digits that had not been sent. A
 * fallback that is not wired to anything is worse than no fallback: it spends
 * the one screen a locked-out host is looking at on an instruction that cannot
 * be followed.
 *
 * The link is the mechanism, so this file is about making the link's failures
 * legible instead. Two of them have wording here:
 *
 *   - **The send was throttled.** This is the one that got worse when the code
 *     went, because *Send another link* is now the only button on that stage
 *     and a host who taps it twice meets Supabase's one-email-per-60-seconds
 *     rule. It answers with a 429 whose message names the wait in seconds, and
 *     that number is worth lifting out and putting on the button rather than
 *     leaving in a paragraph.
 *   - **Nothing came back at all.** No signal is not a refusal, and the
 *     difference decides whether asking again is the right move.
 *
 * Everything else the server can say is `explainServerError`'s, in
 * `supabase.ts` — a bad key, an expired session, a project with anonymous
 * sign-ins off. This file returns `null` for those rather than carrying a
 * second copy of that vocabulary, which is why it is `string | null` and not
 * `string`.
 *
 * No network in here, on purpose: it is the half of the flow that can be
 * tested, and `signInLink.test.ts` is the test.
 */

/**
 * How long the app makes a host wait before offering to send a second email.
 *
 * Supabase's own floor, and the reason to hold it on this side as well is that
 * the server's refusal costs a round trip and lands as an error under a button
 * that looked like it would work. A button that says *Send another in 43s* has
 * already said the same thing, earlier, without spending anything.
 */
export const RESEND_WAIT_SECONDS = 60;

/**
 * Seconds still to wait, given when the last email went out.
 *
 * Clamped at both ends: never negative, and never longer than the wait itself,
 * so a phone whose clock moves — a timezone change mid-night, an NTP
 * correction — cannot strand the button at nine hours.
 */
export function secondsUntilResend(
  sentAt: number | null,
  now: number,
  wait: number = RESEND_WAIT_SECONDS,
): number {
  if (sentAt === null) return 0;
  const gone = Math.floor((now - sentAt) / 1000);
  if (gone < 0) return wait;
  const left = wait - gone;
  return left <= 0 ? 0 : Math.min(left, wait);
}

/**
 * The wait Supabase names in a throttle, in seconds.
 *
 * It says it in prose — "For security purposes, you can only request this after
 * 54 seconds" — and the number is the only part a host can act on. Returns null
 * when the message names no number, which is the case for the hourly cap.
 */
export function waitSecondsIn(message: string): number | null {
  const found = /after (\d+) seconds?/i.exec(message);
  if (found === null) return null;
  const seconds = Number(found[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** True when the server refused because too many emails have been asked for. */
export function isThrottled(e: unknown): boolean {
  const raw = e instanceof Error ? e.message : String(e);
  const code = typeof e === 'object' && e !== null ? ((e as { code?: string }).code ?? '') : '';
  return (
    /over_email_send_rate_limit|email_rate_limit_exceeded/i.test(code) ||
    /rate limit|too many requests|for security purposes/i.test(raw)
  );
}

/**
 * Why the email could not be sent, said to a host rather than to a developer.
 *
 * Returns null when this is not a failure of *sending*, which leaves it to
 * `explainServerError`. Deliberately not a catch-all: two sentences that are
 * right beats a vocabulary that is comprehensive and vague.
 */
export function explainLinkFailure(e: unknown): string | null {
  const raw = e instanceof Error ? e.message : String(e);

  if (/network request failed|failed to fetch|fetch failed/i.test(raw)) {
    return 'No answer from the server, so no email has gone out. Try again when there is signal.';
  }

  /*
   * Before anything else that could match. A throttle worded as an invalid
   * request — which is how the hourly cap sometimes arrives — must not be
   * answered with "ask for another one", because that is the single thing that
   * makes a rate limit worse.
   */
  if (isThrottled(e)) {
    const seconds = waitSecondsIn(raw);
    return seconds === null
      ? 'Too many emails asked for in a short time. Wait a few minutes, then send another.'
      : `Too soon after the last one. You can send another in ${seconds} seconds.`;
  }

  return null;
}
