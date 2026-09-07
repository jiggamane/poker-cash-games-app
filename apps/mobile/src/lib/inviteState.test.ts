import { describe, expect, it } from 'vitest';
import { isLive, readClaimFailure } from './inviteState';

/**
 * The two rules the invite screens were getting wrong — B49 and B50.
 *
 * Both are pure functions of one value for the reason `readKeyProbe` is: the
 * fault they exist to prevent is a decision, not a network, and a decision can
 * be asserted. Neither bug was visible in a passing test suite because neither
 * rule was written down anywhere a test could reach.
 */

/** A month either side of a fixed instant, so nothing here depends on today. */
const NOW = Date.parse('2026-09-07T21:00:00.000Z');
const LATER = '2026-10-07T21:00:00.000Z';
const EARLIER = '2026-08-07T21:00:00.000Z';

describe('B49 · what counts as a code the host may still send', () => {
  it('a code inside its month is live', () => {
    expect(isLive(LATER, NOW)).toBe(true);
  });

  /*
   * THE WHOLE BUG. `seatStatuses` asked for `claimed_at is null and revoked_at
   * is null` and stopped there, where every server path also says `expires_at >
   * now()`. So a code whose month had run out came back as the current one, was
   * drawn as the hero with Copy, Message, Share and QR all live, and got sent.
   */
  it('a code past its month is not, however unclaimed and unrevoked it is', () => {
    expect(isLive(EARLIER, NOW)).toBe(false);
  });

  it('the instant it expires it is already gone, as the server has it', () => {
    expect(isLive(LATER, Date.parse(LATER))).toBe(false);
  });

  /*
   * Both fall the same way on purpose: not live. The cost is one fresh code,
   * which is what the sheet mints anyway for a seat that has none. The cost of
   * the other answer is handing a host ten characters the app cannot vouch for.
   */
  it('an absent or unreadable expiry is not live', () => {
    expect(isLive(null, NOW)).toBe(false);
    expect(isLive('whenever', NOW)).toBe(false);
  });
});

describe('B50 · why a claim did not land', () => {
  /*
   * The four dead causes keep their one string. 0009_invite_privacy.sql pads
   * all four to a common floor so the timing cannot answer the question either,
   * and nothing here undoes that — this asserts the message is recognised, not
   * that it is taken apart.
   */
  it('the one message the four dead causes share is dead', () => {
    expect(readClaimFailure(new Error('This invite cannot be used.'))).toBe('dead');
  });

  it('a seat the reader already holds is its own answer, as the server intends', () => {
    expect(readClaimFailure(new Error('You already have a place in this book.'))).toBe(
      'already-a-member',
    );
  });

  /*
   * The bug: a phone in a tunnel learnt nothing about any code, and was told to
   * go and ask for a replacement for a link that works.
   */
  it('a server that did not answer is not a dead code', () => {
    expect(readClaimFailure(new Error('Network request failed'))).toBe('unreachable');
    expect(readClaimFailure(new Error('TypeError: Failed to fetch'))).toBe('unreachable');
  });

  it('a build fault is not a dead code either', () => {
    expect(readClaimFailure(new Error('Invalid API key'))).toBe('unreachable');
    expect(readClaimFailure(new Error('Anonymous sign-ins are disabled'))).toBe('unreachable');
  });

  /*
   * THE DEFAULT IS THE SAFE ONE, and it is a decision rather than an oversight.
   * A thrown error is never evidence about a code — only the preview answering
   * with nothing is that. Being wrong this way costs a retry nobody needed;
   * being wrong the other way sends somebody to ask for a new link.
   */
  it('anything unrecognised is unreachable, never dead', () => {
    expect(readClaimFailure(new Error('something nobody has seen yet'))).toBe('unreachable');
    expect(readClaimFailure('not even an error')).toBe('unreachable');
    expect(readClaimFailure(undefined)).toBe('unreachable');
  });
});
