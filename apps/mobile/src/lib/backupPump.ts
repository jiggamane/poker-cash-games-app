import { useEffect } from 'react';
import { AppState } from 'react-native';
import { drain, syncStatus } from './sync';
import { nextWake } from './retrySchedule';

/**
 * THE QUEUE, KEPT MOVING.
 *
 * `docs/storage-and-sync.md` described this for weeks before it existed: the
 * queue drained after a write and from `Sync now`, and nothing else ever
 * retried. So a send that failed waited for the host's next game — and B83 is
 * the sharper version of the same fault, where the end of the night queued the
 * one artefact that cannot be rebuilt and never asked anybody to send it.
 *
 * Two things wake it, and one stops it:
 *
 * **Coming to the foreground.** A person opening the app is real information
 * about the network that no backoff has: they have walked indoors, or taken the
 * phone off aeroplane mode, or simply come back on Tuesday. It resets the
 * backoff for exactly that reason.
 *
 * **A timer, while anything is waiting** — 15 seconds, doubling, capped at five
 * minutes. `retrySchedule.ts` holds that policy and its test.
 *
 * **And an empty queue stops it dead.** Not a slower poll: cancelled. There is
 * nothing to send and the next write will push by itself, so a timer here would
 * be battery with no upside. It starts again the moment a write leaves something
 * queued, because that write's own push ends in the same check.
 *
 * MOUNTED ONCE, AT THE ROOT. It is in `_layout.tsx` beside `openNight` and for
 * the same reason given there: a deep link, a restored route or a notification
 * are each enough to make some other screen first, and this must not depend on
 * which one that is.
 *
 * Nothing here is on any screen's critical path and every failure is ordinary:
 * no signal at a table is the normal case, the queue keeps everything, and the
 * next wake sends it all in order.
 */
export function useBackupPump(): void {
  useEffect(() => {
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    const cancel = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    /**
     * Try, then decide whether to come back.
     *
     * `fresh` is "something happened that the backoff does not know about" —
     * the app being opened — and it puts the wait back to the first step.
     */
    const pump = async (fresh: boolean): Promise<void> => {
      if (!alive) return;
      if (fresh) attempt = 0;
      cancel();

      try {
        await drain();
      } catch {
        // The ordinary case. `drain` already coalesces with any run in flight.
      }
      if (!alive) return;

      const { waiting } = await syncStatus().catch(() => ({ waiting: 0, lastError: null }));
      const wait = nextWake(waiting, attempt);
      if (wait === null) {
        attempt = 0;
        return;
      }
      attempt += 1;
      timer = setTimeout(() => void pump(false), wait);
    };

    // A cold start with a queue is the case this exists for: the app was closed
    // with a night unsent and nothing else would have asked.
    void pump(true);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void pump(true);
    });

    return () => {
      alive = false;
      cancel();
      sub.remove();
    };
  }, []);
}
