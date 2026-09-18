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

/** What the pump knows when it decides whether to come back. */
export interface QueueState {
  /** Operations still queued, across every night this phone holds. */
  waiting: number;
  /**
   * Whether an attempt could plausibly reach anybody: a project is configured
   * AND somebody is signed in.
   *
   * ⚠ WITHOUT THIS THE TIMER NEVER STOPS. `drain()` returns early when there is
   * no session, so a host playing signed out — which this app supports on
   * purpose, and `docs/storage-and-sync.md` says so — fills the queue, and
   * `waiting` then stays above zero for ever. The pump would wake every five
   * minutes for the rest of the evening to call a function that returns
   * immediately. That is the same battery-for-nothing the empty-queue rule
   * below exists to prevent, arriving from the other direction, and it was
   * found writing the sign-in drain rather than by anything going red.
   */
  canSend: boolean;
}

/**
 * How long until the next attempt, or null to stop.
 *
 * **NULL WHEN THERE IS NOTHING TO DO, and that is the important half.** Two ways
 * to have nothing to do: an empty queue, and a queue nobody can send. A timer
 * firing over either is a battery cost with no upside — the next write pushes
 * by itself, and signing in wakes the pump directly.
 *
 * Doubling from `FIRST_RETRY_MS` and capped. `attempt` is how many times this
 * run of failures has already waited — zero for the first — and it resets when
 * the app comes to the foreground or somebody signs in, because both are new
 * information about the network that the backoff does not have.
 *
 * No jitter. Jitter spreads a thundering herd across many clients; this is one
 * phone talking to one project, and the herd is one.
 */
export function nextWake(state: QueueState, attempt: number): number | null {
  if (!state.canSend) return null;
  if (state.waiting <= 0) return null;
  if (attempt < 0) return FIRST_RETRY_MS;
  return Math.min(FIRST_RETRY_MS * 2 ** attempt, MAX_RETRY_MS);
}
