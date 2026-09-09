import { describe, expect, it } from 'vitest';
import { CODE_LENGTH, codeIsComplete, explainCodeFailure, normaliseCode } from './signInCode';

/**
 * B66's lock, the fast half.
 *
 * The fault was that the sign-in sheet had exactly one way in — a link in an
 * email — and the link arrived unclickable. What went red here if the code
 * entry is taken back out is the import: `signInCode.ts` exists only to serve
 * that field, and `sign-in.tsx` is its only caller. The screen half of the lock
 * is the `sign in with a code` leg of `ui-journeys.mjs`.
 */

describe('what the host typed', () => {
  it('a clean code passes through untouched', () => {
    expect(normaliseCode('418302')).toBe('418302');
  });

  it('strips the spaces a mail client draws into the code', () => {
    expect(normaliseCode('418 302')).toBe('418302');
    expect(normaliseCode('418-302')).toBe('418302');
  });

  /*
   * The one that actually bit: iOS offers the code from the mail as a
   * suggestion and puts a space after it. `verifyOtp` then refuses it in the
   * same words it uses for an expired code, and the host goes and asks for
   * another email.
   */
  it('strips the trailing space the keyboard’s autocomplete adds', () => {
    expect(normaliseCode('418302 ')).toBe('418302');
    expect(codeIsComplete('418302 ')).toBe(true);
  });

  it('never sends more than the six digits Supabase issues', () => {
    expect(normaliseCode('4183021234')).toHaveLength(CODE_LENGTH);
  });

  it('is not complete until all six are there', () => {
    expect(codeIsComplete('41830')).toBe(false);
    expect(codeIsComplete('')).toBe(false);
    expect(codeIsComplete('418302')).toBe(true);
  });

  it('letters are not a code — a host pasting the link is not half-typing one', () => {
    expect(normaliseCode('https://x.supabase.co/auth/v1/verify')).toBe('1');
    expect(codeIsComplete('abcdef')).toBe(false);
  });
});

describe('why it was refused', () => {
  it('names both causes, because the server names neither', () => {
    const said = explainCodeFailure(new Error('Token has expired or is invalid'));
    expect(said).toMatch(/expire/i);
    expect(said).toMatch(/newest email/i);
  });

  it('a dead network does not accuse the code', () => {
    const said = explainCodeFailure(new Error('Network request failed'));
    expect(said).toMatch(/still good/i);
    expect(said).not.toMatch(/expire/i);
  });

  it('keeps the server’s own words for anything it cannot improve on', () => {
    expect(explainCodeFailure(new Error('Signups not allowed for otp'))).toBe(
      'Signups not allowed for otp',
    );
  });
});
