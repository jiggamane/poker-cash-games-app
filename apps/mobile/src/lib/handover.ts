import { useEffect } from 'react';
import { AppState } from 'react-native';
import { switchClub } from './clubStore';
import { holds, holdOf, noteDropped } from './hold';
import { markHold, replaceNight } from './nightStore';
import { pullNight } from './pull';
import { isSupabaseConfigured, supabase } from './supabase';
import { drain, outbox } from './sync';
import { canSend } from './who';

/**
 * Passing the book: another phone records tonight.
 *
 * `0016_pass_the_book.sql` holds the rule — one writer per night, and it moves
 * only by a ten-character code or by the host taking it back — and this file is
 * the phone's half of it. `hold.ts` says where each night is; this moves it.
 * The whole design is in `docs/storage-and-sync.md` § Passing the book.
 *
 * THE ORDER EVERY FUNCTION HERE KEEPS: the server moves first, then this phone
 * reads the night back from the server and replaces its own copy. Never the
 * other way round. The server is the only place both phones can see, so it is
 * the only place the question "who is writing this" can have one answer.
 */

/** What became of the code this phone issued. See `night_handover_state`. */
export type PassState = 'waiting' | 'taken' | 'gone';

/**
 * Not everything this phone recorded has reached the server, so it cannot pass
 * the night yet. The phone taking over reads the night off the server; handing
 * it over now would hand over a ledger missing its last entries, and the next
 * one it wrote would take a number one of them already has.
 */
export class PassBlockedError extends Error {
  constructor(readonly waiting: number) {
    super(`${waiting} waiting to send`);
  }
}

/**
 * True while the pass sheet is on screen. The code works only while it is —
 * see `issuePass` — and `checkHolds` withdraws a code it finds live with no
 * sheet showing it, which is the phone that was put in a pocket mid-handover.
 */
export const passSheet = { open: false };

async function signedIn(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data } = await supabase.auth.getSession();
  return canSend(data.session);
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------------------------------------------------------------------------
// Giving it
// ---------------------------------------------------------------------------

/**
 * Issue a code for this night. Throws `PassBlockedError` if anything for it is
 * still waiting to send, after trying once to send it.
 *
 * THE CODE LIVES AS LONG AS THE SHEET. The sheet withdraws it on the way out,
 * and while it is open nobody can record anything on this phone — it is a sheet,
 * over everything. That is what guarantees the night the other phone reads is
 * the whole night: nothing can be recorded here between the code going out and
 * it being taken. The server's ten minutes is the backstop for a sheet that
 * never got to close.
 */
export async function issuePass(sessionId: string): Promise<string> {
  await drain().catch(() => undefined);
  const waiting = await outbox.countFor(sessionId);
  if (waiting > 0) throw new PassBlockedError(waiting);

  const code = await rpc<string>('create_night_handover', { target_session_id: sessionId });
  await markHold(sessionId, 'passing');
  return code;
}

export const passState = (sessionId: string): Promise<PassState> =>
  rpc<PassState>('night_handover_state', { target_session_id: sessionId });

/**
 * Withdraw the code. Returns what the server says happened — `taken` if the
 * other phone got there first, in which case the night has gone and this phone
 * steps back to reading it.
 */
export async function withdrawPass(sessionId: string): Promise<PassState> {
  const state = await rpc<PassState>('revoke_night_handover', { target_session_id: sessionId });
  if (state === 'taken') await watchFromHere(sessionId);
  else await markHold(sessionId, 'here');
  return state;
}

/**
 * The code was taken: this phone reads the night from now on. The rows are
 * refreshed from the server where it can be reached; where it cannot, the night
 * is marked away first so nothing more can be recorded on it here.
 */
export async function watchFromHere(sessionId: string): Promise<void> {
  /* Anything still queued can never be sent now. Counted, so the phone can
     say so, before the replace below forgets it. */
  await noteDropped(sessionId, await outbox.countFor(sessionId));
  await markHold(sessionId, 'away');
  const got = await pullNight(sessionId).catch(() => null);
  if (got !== null) await replaceNight(got.night, 'away', got.bookId);
}

// ---------------------------------------------------------------------------
// Taking it
// ---------------------------------------------------------------------------

/**
 * Redeem a code: the night moves to this account, and this phone reads it whole
 * off the server and records it from here. Returns the night's id; the store is
 * already holding it when this returns, so the caller can go straight to it.
 */
export async function takeOver(code: string): Promise<string> {
  const sessionId = await rpc<string>('redeem_night_handover', { code });
  await adopt(sessionId);
  return sessionId;
}

/**
 * The host's way back with no code — the phone the night was passed to has gone
 * flat, or gone home. Anything it had not sent is lost with it, and it is told
 * so the next time it tries.
 */
export async function takeBack(sessionId: string): Promise<void> {
  await rpc<null>('take_back_night', { target_session_id: sessionId });
  await adopt(sessionId);
}

async function adopt(sessionId: string): Promise<void> {
  const got = await pullNight(sessionId);
  if (got === null) throw new Error('The night was passed, but it could not be read back yet.');
  await replaceNight(got.night, 'here', got.bookId, { show: true });
  /* A phone taking over a group it has never held opens on its own; every
     screen below home reads the club, so it has to be this night's. */
  await switchClub(got.clubId);
}

// ---------------------------------------------------------------------------
// Keeping this phone's answer current
// ---------------------------------------------------------------------------

/**
 * Look at every night that has been part of a handover and bring this phone's
 * answer in line with the server's. Nights that never were cost nothing: there
 * is no row for them, so they are never asked about.
 *
 *   passing  a code with no sheet showing it is withdrawn — or, if it was
 *            taken meanwhile, the night is let go
 *   away     re-read, so the phone that passed it watches it live; and if the
 *            server says it is this phone's again, it is taken up
 *   here     if the server says it is no longer this phone's, it is let go —
 *            the host took it back
 *
 * Silent on failure. No signal is the ordinary case, and the next look is
 * seconds away.
 */
export async function checkHolds(): Promise<void> {
  if (!(await signedIn())) return;

  for (const h of await holds()) {
    try {
      if (h.hold === 'passing') {
        if (passSheet.open) continue;
        await withdrawPass(h.sessionId);
        continue;
      }

      const where = await rpc<{ yours: boolean } | null>('night_hold', {
        target_session_id: h.sessionId,
      });
      // The server cannot see it for this account: say nothing, change nothing.
      if (where === null) continue;

      if (h.hold === 'away') {
        const got = await pullNight(h.sessionId);
        if (got === null) continue;
        await replaceNight(got.night, where.yours ? 'here' : 'away', got.bookId);
      } else if (!where.yours) {
        await watchFromHere(h.sessionId);
      }
    } catch {
      // Next time.
    }
  }
}

/** How often the phone looks, while it is open. A night is read in one pass. */
const EVERY_MS = 15_000;

/**
 * Keep every passed night current while the app is in front of somebody.
 * Mounted once, in the root layout. Does nothing on a phone that has never
 * passed or been passed a night beyond one local query every fifteen seconds.
 */
export function useHoldWatch(): void {
  useEffect(() => {
    const tick = () => void checkHolds().catch(() => undefined);
    tick();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') tick();
    }, EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
}

/** How many changes this phone made to a night that could never be sent. */
export async function droppedOn(sessionId: string): Promise<number> {
  return (await holdOf(sessionId))?.dropped ?? 0;
}
