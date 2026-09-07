/**
 * What is allowed to leave the phone.
 *
 * B56, and it is a two-line predicate guarding a failure with no floor: the
 * outbox halts at its first refusal, by design, so ONE row the server cannot
 * accept blocks every real night queued behind it, permanently, on a queue
 * whose whole contract is that retrying is safe.
 *
 * The night that could do it is the one every phone has: the sample night is
 * seeded on first launch, is the ACTIVE night until the host starts their own,
 * and never queued a `session.open` — so anything queued about it names a
 * session the server has never heard of.
 */

import { describe, expect, it, vi } from 'vitest';

// `expo-crypto` is a native module; only the id shape matters here.
vi.mock('expo-crypto', () => ({
  randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
}));

const { isSampleId, leavesThePhone, sampleSessionId } = await import('./queueable');

describe('what may be queued', () => {
  it('lets a real night through', () => {
    expect(leavesThePhone('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(true);
    // Case is not part of the shape: Postgres accepts either.
    expect(leavesThePhone('AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE')).toBe(true);
  });

  it.each([
    ['the sample night', 'sample:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'],
    ['an id from before ids were uuids', 'night-1'],
    ['nothing at all', ''],
    ['a uuid with something after it', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee '],
    ['a uuid with something before it', ' aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'],
    ['most of a uuid', 'aaaaaaaa-bbbb-4ccc-8ddd'],
  ])('keeps %s on the phone', (_what, id) => {
    expect(leavesThePhone(id)).toBe(false);
  });
});

describe('the sample night', () => {
  /*
   * THE ONE ASSERTION THE WHOLE FIX RESTS ON. The prefix is not a label — the
   * predicate is anchored, so `sample:` in front of a perfectly good uuid is
   * what makes the id unsendable. Mint it any other way and B56 comes back.
   */
  it('is minted with an id that can never be queued', () => {
    expect(leavesThePhone(sampleSessionId())).toBe(false);
  });

  it('is recognisable as demo data from the id alone', () => {
    expect(isSampleId(sampleSessionId())).toBe(true);
    expect(isSampleId('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(false);
  });

  it('still carries a unique id under the prefix, because rows are keyed on it', () => {
    expect(sampleSessionId()).toBe('sample:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  });
});
