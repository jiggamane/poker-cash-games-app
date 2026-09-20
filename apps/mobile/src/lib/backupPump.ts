import { useEffect } from 'react';
import { AppState } from 'react-native';
import { drain, syncStatus } from './sync';
import { nextWake } from './retrySchedule';
import { isSupabaseConfigured, supabase } from './supabase';
import { canSend } from './who';

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
 * **Signing in.** The queue fills whether or not there is an account — playing
 * the whole night signed out is supported on purpose — so signing in is the
 * moment a phone full of nights becomes able to send them. Without this the
 * host signs in, stays on the screen, and waits for the timer.
 *
 * **A timer, while anything is waiting** — 15 seconds, doubling, capped at five
 * minutes. `retrySchedule.ts` holds that policy and its test.
 *
 * **And nothing-to-do stops it dead.** Not a slower poll: cancelled. Two ways to
 * have nothing to do — an empty queue, and a queue nobody can send, which is
 * every phone that is signed out or has no project configured. Both would
 * otherwise wake every five minutes for ever to call a function that returns
 * immediately. It starts again when a write leaves something queued, or when
 * somebody signs in.
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
    /** Null until the first answer from auth — which is not the same as false. */
    let signedIn: boolean | null = null;

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
      const wait = nextWake({ waiting, canSend: isSupabaseConfigured && signedIn === true }, attempt);
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

    /**
     * SIGNING IN IS THE THIRD WAKE, and the transition is what is watched
     * rather than the event name.
     *
     * The first answer is the starting state, not a change — except when it
     * says signed in, because the mount pump above ran before auth had
     * answered and will have decided it could not send. Pumping again there is
     * how the timer gets started at all on a phone that opens already signed
     * in; `drain()` coalesces, so the two attempts are one request.
     *
     * A sign-OUT deliberately does nothing. Any timer already scheduled fires
     * once, finds it cannot send, and stops itself.
     */
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      const was = signedIn;
      /*
       * `canSend` rather than a null test — B89. A watcher's phone and a
       * claimed seat both arrive here with a real anonymous session, and this
       * line used to read them as a sign-in: the pump then woke every fifteen
       * seconds, doubling, to push a book the row policies refuse, and the
       * outbox halts at its first failure by design.
       */
      signedIn = canSend(session);
      if (signedIn && was !== true) void pump(true);
    });

    return () => {
      alive = false;
      cancel();
      sub.remove();
      auth.subscription.unsubscribe();
    };
  }, []);
}
