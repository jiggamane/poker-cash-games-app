import { describe, expect, it } from 'vitest';
import {
  RESEND_WAIT_SECONDS,
  explainLinkFailure,
  isThrottled,
  secondsUntilResend,
  waitSecondsIn,
} from './signInLink';

/**
 * The sign-in email is a link and nothing else, and this is the half of that
 * flow with no network in it.
 *
 * It replaces `signInCode.test.ts`. The code field it tested has gone, for the
 * reason written at the top of `signInLink.ts`: the six digits only exist once
 * the project has custom SMTP and a replaced template, and until then the field
 * asked for something that was never in the email. What matters now is that
 * *Send another link* — the only button left on that stage — does not walk a
 * locked-out host into a rate limit.
 */

describe('how long before another email can be asked for', () => {
  const t0 = 1_700_000_000_000;

  it('is the whole wait the moment one has gone out', () => {
    expect(secondsUntilResend(t0, t0)).toBe(RESEND_WAIT_SECONDS);
  });

  it('counts down', () => {
    expect(secondsUntilResend(t0, t0 + 20_000)).toBe(RESEND_WAIT_SECONDS - 20);
  });

  it('is nothing once the wait has passed', () => {
    expect(secondsUntilResend(t0, t0 + RESEND_WAIT_SECONDS * 1000)).toBe(0);
    expect(secondsUntilResend(t0, t0 + 999_000)).toBe(0);
  });

  /*
   * The server's own figure, which is the case that is not our 60-second
   * floor. A 429 names the wait it is counting and it can be longer than the
   * floor — the hourly cap is the obvious one — so the screen passes that
   * number in here rather than showing a minute and coming back to another
   * refusal. `sign-in.tsx` sets the cooldown from `waitSecondsIn` for exactly
   * this, which is why the length travels beside the start.
   */
  it('counts down whatever wait it is given, not only the floor', () => {
    expect(secondsUntilResend(t0, t0, 300)).toBe(300);
    expect(secondsUntilResend(t0, t0 + 200_000, 300)).toBe(100);
    expect(secondsUntilResend(t0, t0 + 300_000, 300)).toBe(0);
  });

  it('is nothing when no email has been sent yet', () => {
    expect(secondsUntilResend(null, t0)).toBe(0);
  });

  /*
   * A phone's clock is not monotonic — a timezone change mid-night, an NTP
   * correction, a manual set. Neither direction may strand the one button on
   * the screen: backwards must not read as hours to wait, and forwards must
   * not be answered with a negative.
   */
  it('cannot be stranded by a clock that moves', () => {
    expect(secondsUntilResend(t0, t0 - 9_000_000)).toBe(RESEND_WAIT_SECONDS);
    expect(secondsUntilResend(t0 - 9_000_000, t0)).toBe(0);
  });
});

describe('the wait the server names', () => {
  it('is lifted out of the sentence it is buried in', () => {
    expect(
      waitSecondsIn('For security purposes, you can only request this after 54 seconds.'),
    ).toBe(54);
  });

  it('handles the singular', () => {
    expect(waitSecondsIn('you can only request this after 1 second')).toBe(1);
  });

  it('is null when there is no number to lift', () => {
    expect(waitSecondsIn('Email rate limit exceeded')).toBeNull();
    expect(waitSecondsIn('')).toBeNull();
  });
});

describe('what a host is told when no email went out', () => {
  it('tells a throttle apart from a refusal, and says the wait', () => {
    const said = explainLinkFailure(
      new Error('For security purposes, you can only request this after 43 seconds.'),
    );
    expect(said).toContain('43 seconds');
    /*
     * The wait has to be IN the sentence. Naming it is what makes this
     * different from a refusal — "you can send another in 43 seconds" is an
     * instruction, "that did not work, try again" is what turns a rate limit
     * into a host tapping until the hourly cap closes the door for good.
     */
    expect(said).toMatch(/\d+ seconds/);
    expect(said?.toLowerCase()).not.toContain('try again');
  });

  it('recognises the hourly cap by its code, which names no number', () => {
    const said = explainLinkFailure({
      code: 'over_email_send_rate_limit',
      message: 'Email rate limit exceeded',
    });
    expect(said).toContain('Wait a few minutes');
  });

  it('says no email went out when nothing answered at all', () => {
    const said = explainLinkFailure(new Error('Network request failed'));
    expect(said).toContain('no email has gone out');
  });

  /*
   * The fall-through is the point of the null. A bad key, an expired session
   * and a project with anonymous sign-ins off are all `explainServerError`'s
   * sentences, and a second copy of that vocabulary here is how the two drift.
   */
  it('leaves everything that is not a send failure to explainServerError', () => {
    expect(explainLinkFailure(new Error('Invalid API key'))).toBeNull();
    expect(explainLinkFailure(new Error('Signups not allowed for otp'))).toBeNull();
  });
});

describe('isThrottled', () => {
  it('reads the code as well as the prose', () => {
    expect(isThrottled({ code: 'over_email_send_rate_limit', message: '' })).toBe(true);
    expect(isThrottled(new Error('Too many requests'))).toBe(true);
    expect(isThrottled(new Error('Invalid API key'))).toBe(false);
  });
});
