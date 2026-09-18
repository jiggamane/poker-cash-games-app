/**
 * WHEN TO TRY AGAIN, AND WHEN TO STOP ASKING.
 *
 * `docs/storage-and-sync.md` promised this for weeks and described software
 * that did not exist: the queue drained after a write and from `Sync now`, and
 * nothing else ever retried. So a send that failed — the wifi dropped, the
 * server was down for a minute — waited for the host's next game.
 *
 * The decision is here and pure; the timer and the `AppState` listener are in
 * `backupPump.ts`. That split is the one `hostSeat.ts` and `seatReconcile.ts`
 * use, and for the same reason: the interesting part is the policy, the policy
 * is three lines of arithmetic, and a test of it should not need a clock, a
 * network or a screen.
 */

/** The first wait after a failure. Long enough not to chase a dropped packet. */
export const FIRST_RETRY_MS = 15_000;

/**
 * And the longest. Five minutes is the gap between "the wifi came back and the
 * app noticed" and "the app is awake for no reason" — a host who walks back
 * into signal mid-evening gets their night up within five minutes without
 * anybody tapping anything, and a phone in a pocket on a train wakes twelve
 * times an hour rather than two hundred and forty.
 */
export const MAX_RETRY_MS = 300_000;

/**
 * How long until the next attempt, or null to stop.
 *
 * **NULL WHEN NOTHING IS WAITING, and that is the important half.** A timer that
 * keeps firing over an empty queue is a battery cost with no upside: there is
 * nothing to send, and the next write will push by itself. The pump cancels
 * rather than idling, and starts again the moment something is queued.
 *
 * Doubling from `FIRST_RETRY_MS` and capped. `attempt` is how many times this
 * run of failures has already waited — zero for the first — and it resets when
 * the app comes to the foreground, because a person opening the app is new
 * information about the network that the backoff does not have.
 *
 * No jitter. Jitter spreads a thundering herd across many clients; this is one
 * phone talking to one project, and the herd is one.
 */
export function nextWake(waiting: number, attempt: number): number | null {
  if (waiting <= 0) return null;
  if (attempt < 0) return FIRST_RETRY_MS;
  return Math.min(FIRST_RETRY_MS * 2 ** attempt, MAX_RETRY_MS);
}
