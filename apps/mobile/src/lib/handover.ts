import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { switchClub } from './clubStore';
import { holds, holdOf } from './hold';
import { applyLateChange, markHold, replaceNight } from './nightStore';
import { pullNight } from './pull';
import { isSupabaseConfigured, supabase } from './supabase';
import { drain, handIn, outbox } from './sync';

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

/**
 * Any session at all — since 0017 an anonymous phone can hold a night it was
 * handed, so "signed in" is not the question here. Nobody at all is.
 */
async function signedIn(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}

/** The account on this phone, making an anonymous one if there is none. */
async function someone(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session !== null) return data.session.user.id;
  const { data: made, error } = await supabase.auth.signInAnonymously();
  if (error || made.user === null) throw new Error(error?.message ?? 'Could not sign in.');
  return made.user.id;
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

/**
 * The code, wrapped in a link that opens Take over with it already typed — the
 * same shape as an invite's (`inviteLinkFor`), and with the same caveat: the
 * code is the primitive, and the link only works where the two phones run the
 * app the same way. On the web copy it always does.
 */
export function takeOverLinkFor(code: string): string {
  return Linking.createURL('/take-over', { queryParams: { c: code } });
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
 * The night is on another phone now: this one reads it from here on.
 *
 * ANYTHING STILL QUEUED FOR IT IS HANDED IN FIRST — 0017 — so it is kept on
 * the server for the phone recording the night to add, not thrown away. Only
 * once that has worked is the copy here replaced with the server's. If it has
 * not (no signal), the night is still marked away, so nothing new can be
 * recorded on it, and the next look hands in and refreshes.
 */
export async function watchFromHere(sessionId: string): Promise<void> {
  await markHold(sessionId, 'away');
  await handIn(sessionId);
  const got = await pullNight(sessionId);
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
  /* No account needed — the code is the grant (0017). A phone with no session
     gets an anonymous one, exactly as claiming a seat does. */
  await someone();
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
  /* Anything this phone still had queued for the night — the host's own
     changes from before it went, unsent — joins the others waiting to be
     added rather than being sent in numbering the night has moved past. */
  await handIn(sessionId);
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

  /* A phone with no account has no retry pump (`backupPump` waits for one), so
     this look is what sends the night it was handed when the signal returns. */
  await drain().catch(() => undefined);

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
        /* The queue can mark a night away on its own (`movedAway` in
           sync.ts), and it cannot reach the store the screens read. Say it
           here too, before anything that needs signal, so a phone that learned
           mid-send stops offering to record on the night — B94. */
        await markHold(h.sessionId, 'away');
        await handIn(h.sessionId);
        const got = await pullNight(h.sessionId);
        if (got !== null) {
          await replaceNight(got.night, where.yours ? 'here' : 'away', got.bookId);
        }
      } else if (!where.yours) {
        await watchFromHere(h.sessionId);
      }
      await refreshLate(h.sessionId);
    } catch {
      // Next time.
    }
  }
}

// ---------------------------------------------------------------------------
// Late changes — 0017
// ---------------------------------------------------------------------------

/** One change handed in by a phone that no longer held the night. */
export interface LateChange {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  queuedAt: string;
  status: 'waiting' | 'added' | 'left_out';
  /** Handed in by this phone — the other end of the same row. */
  fromHere: boolean;
}

/**
 * What one night's late changes add up to, from where this phone stands.
 *
 *   toReview   waiting, and this phone records the night — it is the one to
 *              add them or leave them out
 *   fromHere   handed in by this phone, by what became of them
 */
export interface LateSummary {
  toReview: number;
  fromHere: { waiting: number; added: number; leftOut: number };
}

const NONE: LateSummary = { toReview: 0, fromHere: { waiting: 0, added: 0, leftOut: 0 } };
let late = new Map<string, LateSummary>();
const lateListeners = new Set<() => void>();

function publishLate(sessionId: string, summary: LateSummary): void {
  late = new Map(late).set(sessionId, summary);
  for (const l of lateListeners) l();
}

/** The late changes for one night, as last read. Refreshed every look. */
export function useLate(sessionId: string | null | undefined): LateSummary {
  return useSyncExternalStore(
    (l) => {
      lateListeners.add(l);
      return () => lateListeners.delete(l);
    },
    () => (sessionId == null ? NONE : (late.get(sessionId) ?? NONE)),
  );
}

/** Every late change for a night, oldest first, as the server holds them. */
export async function readLate(sessionId: string): Promise<LateChange[]> {
  const { data: auth } = await supabase.auth.getSession();
  const me = auth.session?.user.id ?? null;
  const { data, error } = await supabase
    .from('night_late_change')
    .select('id, kind, payload, queued_at, status, from_user')
    .eq('session_id', sessionId)
    .order('queued_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    kind: r.kind as string,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    queuedAt: r.queued_at as string,
    status: r.status as LateChange['status'],
    fromHere: r.from_user === me,
  }));
}

/** Re-read one night's late changes and publish the summary. */
export async function refreshLate(sessionId: string): Promise<LateSummary> {
  const rows = await readLate(sessionId);
  const mine = (await holdOf(sessionId))?.hold !== 'away';
  const from = rows.filter((r) => r.fromHere);
  const summary: LateSummary = {
    toReview: mine ? rows.filter((r) => r.status === 'waiting').length : 0,
    fromHere: {
      waiting: from.filter((r) => r.status === 'waiting').length,
      added: from.filter((r) => r.status === 'added').length,
      leftOut: from.filter((r) => r.status === 'left_out').length,
    },
  };
  publishLate(sessionId, summary);
  return summary;
}

/**
 * Decide every waiting change: the ones in `add` are re-recorded on this phone
 * — in its own numbering, through the same store calls a tap would make — and
 * marked added; the rest are marked left out. Neither is deleted: a change left
 * out stays on the server, with who made it and when, saying so.
 *
 * IN THE ORDER THEY HAPPENED, so a guest joins before their buy-in and a count
 * lands after the stack it counts.
 */
export async function decideLate(sessionId: string, add: ReadonlySet<string>): Promise<void> {
  const waiting = (await readLate(sessionId)).filter((r) => r.status === 'waiting');
  for (const change of waiting) {
    const added = add.has(change.id) && (await applyLateChange(change.kind, change.payload));
    await rpc<null>('decide_late_change', { target_id: change.id, added });
  }
  await refreshLate(sessionId);
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

/** How many changes this phone handed in for a night, rather than sent. */
export async function handedInOn(sessionId: string): Promise<number> {
  return (await holdOf(sessionId))?.handedIn ?? 0;
}
