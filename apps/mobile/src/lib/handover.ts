import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { switchClub } from './clubStore';
import {
  dismissNoticeRow,
  holds,
  holdOf,
  noteNotice,
  noticedIds,
  openNotices,
  type Notice,
} from './hold';
import { applyLateChange, markHold, replaceNight } from './nightStore';
import { pullNight } from './pull';
import { isSupabaseConfigured, supabase } from './supabase';
import { drain, handIn, outbox } from './sync';

/**
 * Passing the game: another phone records tonight.
 *
 * `0020_pass_to_a_person.sql` holds the rule — one writer per night, and it
 * moves by NAME: the admin picks a person from the group in the Table admin
 * drawer, the server moves the night to that person's account at once, and
 * the receiving phone does nothing. It learns on its next look, or the moment
 * the server says so if it is open, and the game arrives as an announcement.
 * `design/handoff-game-admin/` is the design; `docs/storage-and-sync.md`
 * § Passing the game is the whole of the mechanism. `hold.ts` says where each
 * night is; this moves it.
 *
 * THE ORDER EVERY FUNCTION HERE KEEPS: the server moves first, then this phone
 * reads the night back from the server and replaces its own copy. Never the
 * other way round. The server is the only place both phones can see, so it is
 * the only place the question "who is writing this" can have one answer.
 *
 * THE CODE (0016) IS GONE FROM THIS FILE. Its server functions still exist and
 * nothing calls them; `docs/storage-and-sync.md` says why they are left.
 */

/**
 * Not everything this phone recorded has reached the server, so it cannot pass
 * the night yet. The phone taking over reads the night off the server; handing
 * it over now would hand over a ledger missing its last entries. The sheet
 * draws this as state 6 — NOT PASSED, this phone is still recording — because
 * from the table it is the same fact: no signal.
 */
export class PassBlockedError extends Error {
  constructor(readonly waiting: number) {
    super(`${waiting} waiting to send`);
  }
}

/**
 * Any session at all — since 0017 an anonymous phone can hold a night it was
 * handed, so "signed in" is not the question here. Nobody at all is.
 */
async function signedIn(): Promise<{ id: string } | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session === null ? null : { id: data.session.user.id };
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------------------------------------------------------------------------
// Giving it, and taking it back
// ---------------------------------------------------------------------------

/**
 * Pass the night to a person. Throws `PassBlockedError` if anything for it is
 * still waiting to send, after trying once to send it; otherwise the server
 * has moved the game when this returns, and this phone reads from here on.
 *
 * WHAT THE SHEET SHOWS BETWEEN: nothing moves on this phone until the server
 * confirms (state 6). The role line then reads "passed to Lena at 23:10" and
 * the band WAITING ON LENA until her phone acknowledges (`ack_pass`).
 */
export async function passTo(sessionId: string, playerId: string): Promise<void> {
  await drain().catch(() => undefined);
  const waiting = await outbox.countFor(sessionId);
  if (waiting > 0) throw new PassBlockedError(waiting);

  const passId = await rpc<string>('pass_night', {
    target_session_id: sessionId,
    to_player_id: playerId,
  });
  /* Its own pass: heard, never announced. */
  await noteNotice({
    id: passId,
    sessionId,
    kind: 'seen',
    fromName: null,
    at: new Date().toISOString(),
    spentHostNight: false,
  });
  await watchFromHere(sessionId);
  await refreshRole(sessionId);
}

/**
 * Take the game back — the host's way, and since 0020 the way of whoever
 * passed it away. No code and no check: taking back is running the game, not
 * taking a new one. Anything the other phone had not sent is handed in by
 * that phone when it next has signal, and reviewed here (`useLate`).
 */
export async function takeBack(sessionId: string): Promise<void> {
  await rpc<null>('take_back_night', { target_session_id: sessionId });
  await adopt(sessionId);
  await refreshRole(sessionId);
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

/** The night is this phone's now: read it whole off the server and record from here. */
async function adopt(sessionId: string, options: { show?: boolean } = {}): Promise<void> {
  /* Anything this phone still had queued for the night — its own changes from
     before it went, unsent — joins the others waiting to be added rather than
     being sent in numbering the night has moved past. */
  await handIn(sessionId);
  const got = await pullNight(sessionId);
  if (got === null) throw new Error('The game was passed, but it could not be read back yet.');
  await replaceNight(got.night, 'here', got.bookId, options);
  /* A phone taking up a group it has never held opens on its own; every
     screen below home reads the club, so it has to be this night's. */
  await switchClub(got.clubId);
}

// ---------------------------------------------------------------------------
// Where a night stands — the role line
// ---------------------------------------------------------------------------

/** What `night_role` (0020) says about one night, from this phone's side. */
export interface Role {
  /** This phone records it. */
  yours: boolean;
  /** This phone hosts the book. */
  host: boolean;
  /** The name of whoever records it — null when they claimed no seat. */
  recorder: string | null;
  /** The most recent hand-off, or null on a night that never changed hands. */
  last: {
    id: string;
    kind: 'passed' | 'taken_back';
    fromName: string | null;
    toName: string | null;
    at: string;
    /** Whether the phone it went to has taken it up. */
    opened: boolean;
  } | null;
}

let roles = new Map<string, Role>();
const roleListeners = new Set<() => void>();

function publishRole(sessionId: string, role: Role): void {
  roles = new Map(roles).set(sessionId, role);
  for (const l of roleListeners) l();
}

interface RoleRow {
  yours: boolean;
  host: boolean;
  recorder: string | null;
  last: {
    id: string;
    kind: 'passed' | 'taken_back';
    from_name: string | null;
    to_name: string | null;
    at: string;
    opened: boolean;
  } | null;
}

/**
 * Ask the server where one night stands and publish the answer. Silent on
 * failure: no signal is the ordinary case and the next look is seconds away.
 * Null means the server cannot see the night for this account — a night that
 * never reached it — and the phone's own answer is left alone.
 */
export async function refreshRole(sessionId: string): Promise<Role | null> {
  if ((await signedIn()) === null) return null;
  try {
    const row = await rpc<RoleRow | null>('night_role', { target_session_id: sessionId });
    if (row === null) return null;
    const role: Role = {
      yours: row.yours,
      host: row.host,
      recorder: row.recorder,
      last:
        row.last === null
          ? null
          : {
              id: row.last.id,
              kind: row.last.kind,
              fromName: row.last.from_name,
              toName: row.last.to_name,
              at: row.last.at,
              opened: row.last.opened,
            },
    };
    publishRole(sessionId, role);
    return role;
  } catch {
    return null;
  }
}

/** How often a screen showing a role line asks again while it is up. */
const ROLE_EVERY_MS = 15_000;

/**
 * The role of one night as last heard, kept fresh while a screen reads it.
 * Undefined until the server has answered once — a screen draws its own best
 * answer (the club's admin, this phone's hold) until then.
 */
export function useRole(sessionId: string | null | undefined): Role | undefined {
  useEffect(() => {
    if (sessionId == null) return;
    const tick = () => void refreshRole(sessionId);
    tick();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') tick();
    }, ROLE_EVERY_MS);
    return () => clearInterval(timer);
  }, [sessionId]);
  return useSyncExternalStore(
    (l) => {
      roleListeners.add(l);
      return () => roleListeners.delete(l);
    },
    () => (sessionId == null ? undefined : roles.get(sessionId)),
  );
}

// ---------------------------------------------------------------------------
// The announcement — one card, two places
// ---------------------------------------------------------------------------

let notices: Notice[] = [];
const noticeListeners = new Set<() => void>();

async function publishNotices(): Promise<void> {
  notices = await openNotices();
  for (const l of noticeListeners) l();
}

/**
 * The announcement still up, if any — for one night, or (home) for any.
 * States 9, 9b, 10 and 11: the card is a card in the page, dismissed by a tap
 * anywhere on it, its close, the first entry the new admin makes, or opening
 * Tonight from home. Never a toast, never an overlay.
 */
export function useNotice(sessionId?: string | null): Notice | null {
  useEffect(() => {
    void publishNotices();
  }, []);
  return useSyncExternalStore(
    (l) => {
      noticeListeners.add(l);
      return () => noticeListeners.delete(l);
    },
    () =>
      notices.find((n) => sessionId == null || n.sessionId === sessionId) ?? null,
  );
}

export async function dismissNotice(id: string): Promise<void> {
  await dismissNoticeRow(id);
  await publishNotices();
}

// ---------------------------------------------------------------------------
// Keeping this phone's answer current
// ---------------------------------------------------------------------------

interface PassRow {
  id: string;
  session_id: string;
  book_id: string;
  kind: 'passed' | 'taken_back';
  from_user: string;
  to_user: string;
  from_name: string | null;
  to_name: string | null;
  passed_at: string;
  opened: boolean;
  mine_now: boolean;
}

/**
 * Look at every hand-off that named this phone, and every night it has been
 * part of one, and bring this phone's answer in line with the server's. Nights
 * that never were cost nothing: `my_passes` is one call, and there is no hold
 * row for them, so they are never asked about.
 *
 *   a pass TO me, not yet heard    take the night up (state 9), acknowledge
 *                                  it, and announce it — with the host-night
 *                                  sentence when the seam says it was spent
 *   a take-back FROM me            let the night go (state 11), and announce
 *   my own pass, my own take-back  heard, and nothing to announce
 *   away                           re-read, so the phone that passed it
 *                                  watches it live; if the server says it is
 *                                  this phone's again, take it up
 *   here                           if the server says it is no longer this
 *                                  phone's, let it go — somebody took it back
 *
 * Silent on failure. No signal is the ordinary case.
 */
export async function checkHolds(): Promise<void> {
  const me = await signedIn();
  if (me === null) return;

  /* A phone with no account has no retry pump (`backupPump` waits for one), so
     this look is what sends the night it was handed when the signal returns. */
  await drain().catch(() => undefined);

  try {
    const heard = await noticedIds();
    const passes = await rpc<PassRow[]>('my_passes', {});
    for (const p of passes ?? []) {
      if (heard.has(p.id)) continue;
      try {
        if (p.kind === 'passed' && p.to_user === me.id) {
          if (p.mine_now) {
            await adopt(p.session_id);
            await rpc<null>('ack_pass', { target_id: p.id }).catch(() => undefined);
          }
          await noteNotice({
            id: p.id,
            sessionId: p.session_id,
            kind: p.mine_now ? 'received' : 'seen',
            fromName: p.from_name,
            at: p.passed_at,
            /* The seam answers Full for everybody, so this is false until
               membership ships — `membership.ts`. It is the receiving phone's
               own membership that decides, and this phone is it. */
            spentHostNight: false,
          });
        } else if (p.kind === 'taken_back' && p.from_user === me.id) {
          if (!p.mine_now) await watchFromHere(p.session_id);
          await noteNotice({
            id: p.id,
            sessionId: p.session_id,
            kind: 'taken_back',
            fromName: p.to_name,
            at: p.passed_at,
            spentHostNight: false,
          });
        } else {
          await noteNotice({
            id: p.id,
            sessionId: p.session_id,
            kind: 'seen',
            fromName: null,
            at: p.passed_at,
            spentHostNight: false,
          });
        }
      } catch {
        // Next time: the row stays unheard, so it is tried again.
      }
    }
    await publishNotices();
  } catch {
    // No signal. The holds below still get their look.
  }

  for (const h of await holds()) {
    try {
      const role = await refreshRole(h.sessionId);
      // The server cannot see it for this account: say nothing, change nothing.
      if (role === null) continue;

      if (h.hold === 'away') {
        /* The queue can mark a night away on its own (`movedAway` in
           sync.ts), and it cannot reach the store the screens read. Say it
           here too, before anything that needs signal, so a phone that learned
           mid-send stops offering to record on the night — B94. */
        await markHold(h.sessionId, 'away');
        await handIn(h.sessionId);
        const got = await pullNight(h.sessionId);
        if (got !== null) {
          await replaceNight(got.night, role.yours ? 'here' : 'away', got.bookId);
        }
      } else if (!role.yours) {
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
  decidedAt: string | null;
  /** Handed in by this phone — the other end of the same row. */
  fromHere: boolean;
  /** The account it came from; `readLateSources` names it. */
  fromUser: string;
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
    .select('id, kind, payload, queued_at, status, decided_at, from_user')
    .eq('session_id', sessionId)
    .order('queued_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    kind: r.kind as string,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    queuedAt: r.queued_at as string,
    status: r.status as LateChange['status'],
    decidedAt: (r.decided_at as string | null) ?? null,
    fromHere: r.from_user === me,
    fromUser: r.from_user as string,
  }));
}

/**
 * Whose phone each late change came from, by account — the review sheet is
 * titled "From Lena's phone" (state 12b). Resolved on the server because a
 * member cannot read who claimed which seat.
 */
export async function readLateSources(sessionId: string): Promise<Map<string, string | null>> {
  const rows = await rpc<Array<{ user_id: string; name: string | null }>>('late_change_sources', {
    target_session_id: sessionId,
  });
  return new Map((rows ?? []).map((r) => [r.user_id, r.name]));
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
 * Keep every passed night current while the app is in front of somebody, and
 * hear a game arrive the moment it does.
 *
 * Mounted once, in the root layout. Does nothing on a phone that has never
 * passed or been passed a night beyond one call every fifteen seconds — and
 * one realtime channel on `night_pass`, which row-level security keeps to the
 * hand-offs that name this account, so a phone nobody passes anything to hears
 * nothing on it at all.
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

    /* "Instantly if it is open" — the brief's own words for how the game
       arrives. The feed carries the row; the look does the work. */
    const channel = isSupabaseConfigured
      ? supabase
          .channel('passes')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'night_pass' }, tick)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'night_pass' }, tick)
          .subscribe()
      : null;

    return () => {
      clearInterval(timer);
      sub.remove();
      if (channel !== null) void supabase.removeChannel(channel);
    };
  }, []);
}

/** How many changes this phone handed in for a night, rather than sent. */
export async function handedInOn(sessionId: string): Promise<number> {
  return (await holdOf(sessionId))?.handedIn ?? 0;
}
