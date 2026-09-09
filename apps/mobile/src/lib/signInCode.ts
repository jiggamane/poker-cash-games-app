/**
 * The six digits in the sign-in email.
 *
 * WHY A CODE EXISTS BESIDE THE LINK, which is the whole point of this file.
 *
 * A link in an email is four systems agreeing: Supabase builds the href, Go's
 * html/template decides the href is safe enough to emit, the mail client
 * decides to render it as a link, and the phone decides which app owns the
 * scheme. Any one of them can refuse, and three of the four refuse SILENTLY —
 * what arrives is a button that does nothing, and nothing anywhere says why.
 * B66 is that, and the middle one: Go replaces an href whose scheme it does not
 * recognise with the literal `#ZgotmplZ`, so a template that puts `exp://` or
 * `pokerclub://` straight into the button ships a button with no link in it.
 *
 * A code agrees with nobody. It is six digits of text in the body of the mail,
 * it is read with eyes and typed with thumbs, and it signs you in without
 * leaving the app — no scheme, no allow-list, no sanitiser, no mail client
 * rewriting anything, and no dev-server IP that changes when the laptop moves.
 * When the link works it is the nicer flow; when it does not, this is the only
 * flow, and it is the reason the sheet does not dead-end at "check your email".
 *
 * `{{ .Token }}` in the email template is what puts the code in the mail —
 * Supabase's stock magic-link template carries only the link. See
 * `docs/email-templates/magic-link.html`, which carries both.
 *
 * The verification itself is `verifySignInCode` in `supabase.ts`. This file is
 * the part with no network in it, so it can be tested.
 */

/** Supabase's email OTP is six digits. Not configurable on the hosted plan. */
export const CODE_LENGTH = 6;

/**
 * What the host actually typed, reduced to what can be sent.
 *
 * Digits only, and capped. A code is read off a screen and typed on a phone, so
 * it arrives with spaces in it, with the dash somebody's mail client drew, and
 * — the one that matters — with a trailing space from the iOS keyboard's
 * autocomplete. `verifyOtp` refuses all three with "Token has expired or is
 * invalid", which sends a host off to ask for another email that will fail the
 * same way.
 */
export function normaliseCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/** Whether there is a whole code to send. The button is blocked until there is. */
export function codeIsComplete(raw: string): boolean {
  return normaliseCode(raw).length === CODE_LENGTH;
}

/**
 * Why the code was refused, said to a host rather than to a developer.
 *
 * Supabase reports the three cases that matter with one 403 and one string —
 * "Token has expired or is invalid" — which is true and useless: it does not
 * say which of the two it was, and the cures differ. Expired means ask for
 * another; wrong means look again at the one you have. There is no way to tell
 * them apart from the response, so the sentence names both and puts the action
 * first, rather than picking one and being wrong half the time.
 *
 * The mistyped-into-an-old-email case is worth the clause it costs: asking for
 * a second email invalidates the first, and a host with two of them open will
 * reliably type the older code and be told, correctly and unhelpfully, that it
 * is invalid.
 */
export function explainCodeFailure(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);

  if (/network request failed|failed to fetch|fetch failed/i.test(raw)) {
    return 'No answer from the server. The code is still good — try it again when there is signal.';
  }

  /*
   * Before the expiry clause, not after: a throttle can come back worded as an
   * invalid request, and telling somebody to ask for another email is the one
   * thing that makes a rate limit worse.
   */
  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(raw)) {
    return 'Too many attempts for now. Wait a minute, then try the code again.';
  }

  if (/expired|invalid|not found/i.test(raw)) {
    return 'That code was not accepted. Codes expire, and asking for a second email retires the first — so use the code in the newest email, or send yourself another.';
  }

  return raw;
}
