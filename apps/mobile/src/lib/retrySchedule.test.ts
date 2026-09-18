import { describe, expect, it } from 'vitest';
import { FIRST_RETRY_MS, MAX_RETRY_MS, nextWake } from './retrySchedule';

/** A queue somebody could actually send, unless a test says otherwise. */
const waiting = (n: number, canSend = true) => ({ waiting: n, canSend });

/**
 * The retry policy, which is the whole of the decision the pump makes.
 *
 * The two properties worth pinning are the two that cost something when wrong:
 * a queue with nothing in it must stop the timer dead, and a queue that keeps
 * failing must back off rather than hammer.
 */
describe('when to try the queue again', () => {
  it('stops entirely when there is nothing to send', () => {
    expect(nextWake(waiting(0), 0)).toBeNull();
    expect(nextWake(waiting(0), 5)).toBeNull();
    // A count that somehow came back negative is still nothing to send.
    expect(nextWake(waiting(-1), 0)).toBeNull();
  });

  it('waits before the first retry rather than chasing a dropped packet', () => {
    expect(nextWake(waiting(1), 0)).toBe(FIRST_RETRY_MS);
  });

  it('backs off, doubling', () => {
    expect(nextWake(waiting(3), 1)).toBe(FIRST_RETRY_MS * 2);
    expect(nextWake(waiting(3), 2)).toBe(FIRST_RETRY_MS * 4);
    expect(nextWake(waiting(3), 3)).toBe(FIRST_RETRY_MS * 8);
  });

  /*
   * A PHONE IN A POCKET ON A TRAIN. Without the cap this reaches hours, and a
   * host who walks back into signal would find the night still on the phone
   * because the next attempt is not due until Thursday.
   */
  it('and stops backing off at five minutes', () => {
    expect(nextWake(waiting(3), 20)).toBe(MAX_RETRY_MS);
    expect(nextWake(waiting(3), 200)).toBe(MAX_RETRY_MS);
    for (let attempt = 0; attempt < 50; attempt++) {
      const wait = nextWake(waiting(1), attempt);
      expect(wait).not.toBeNull();
      expect(wait!).toBeLessThanOrEqual(MAX_RETRY_MS);
      expect(wait!).toBeGreaterThanOrEqual(FIRST_RETRY_MS);
    }
  });

  it('never returns a delay of zero, which would be a spin', () => {
    for (let attempt = -3; attempt < 20; attempt++) {
      const wait = nextWake(waiting(1), attempt);
      expect(wait!).toBeGreaterThan(0);
    }
  });

  /*
   * PLAYING SIGNED OUT IS SUPPORTED ON PURPOSE, and `drain()` returns early
   * with no session — so without this the queue stays non-empty all evening and
   * the pump wakes every five minutes until morning to call a function that
   * does nothing. Found writing the sign-in drain, not by anything going red.
   */
  it('never schedules a retry nobody could send', () => {
    expect(nextWake(waiting(12, false), 0)).toBeNull();
    expect(nextWake(waiting(12, false), 9)).toBeNull();
    // And the same queue, once somebody signs in.
    expect(nextWake(waiting(12, true), 0)).toBe(FIRST_RETRY_MS);
  });
});
