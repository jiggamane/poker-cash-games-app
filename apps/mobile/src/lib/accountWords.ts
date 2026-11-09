/**
 * The words on the delete-account sheet, from the server's plan — pure, so
 * they are tested (`accountWords.test.ts`).
 *
 * Every string here is the board's: `design/handoff-account-and-names/`,
 * approved by the owner on 9 November, S2–S8. The board marks some UNSURE;
 * `docs/screens.md` lists them. The plan is `account_deletion_plan()`
 * (0024, 0029, 0030) — the same answer `delete_my_account()` acts on, so the
 * sheet cannot describe a different deletion from the one that happens.
 */

export interface DeletionGroup {
  book_id: string;
  group_name: string;
  outcome: 'deleted' | 'closed';
  /** Other people with a claimed seat. A closed group can have 0 (S2, the 0 case). */
  members: number;
}

export interface DeletionSeat {
  player_id: string;
  /** The name the group sees — the player's own, if they renamed it. */
  display_name: string;
  /** Set when the player renamed the seat: the admin's name, which comes back. */
  admin_name: string | null;
  book_id: string;
  group_name: string;
  /** Always there since 0029: the admin's seat, or their account name. */
  host_name: string | null;
}

export interface DeletionPlan {
  running: { session_id: string; book_id: string; group_name: string; started_at: string } | null;
  groups: DeletionGroup[];
  seats: DeletionSeat[];
  store_subscription: boolean;
  /** Only on the answer to the delete itself. */
  deleted?: boolean;
  refused?: 'game_running';
}

/** Which reading of the sheet this account gets — S2, S3, S4 or S5. */
export type Reading = 'host' | 'member' | 'empty' | 'watcher';

export function readingOf(plan: DeletionPlan, anonymous: boolean): Reading {
  if (plan.groups.length > 0) return 'host';
  if (plan.seats.length > 0) return 'member';
  return anonymous ? 'watcher' : 'empty';
}

/** S2: what happens to one group this account runs. */
export function groupLine(g: DeletionGroup): string {
  if (g.outcome === 'deleted') return 'Deleted, with every night in it. Nobody else ever had a seat.';
  if (g.members <= 0) return 'Closed and kept. Nobody can add to it.';
  const who = g.members === 1 ? '1 person keeps' : `${g.members} people keep`;
  return `Closed and kept. ${who} every night they were in. Nobody can add to it.`;
}

/** The admin's name, or a plain word for one nobody named. 0029 makes the blank rare. */
const admin = (s: DeletionSeat): string => s.host_name ?? 'The admin';

/** A seat's row title: "Petr in The Thursday game". */
export function seatTitle(s: DeletionSeat): string {
  return `${s.display_name} in ${s.group_name}`;
}

/** S2: a host's seat in somebody else's group. */
export function hostSeatLine(s: DeletionSeat): string {
  if (s.admin_name !== null) return renamedLine(s);
  return `Becomes a name again. ${admin(s)} still sees every night you played.`;
}

/** S3: a member's seat. */
export function memberSeatLine(s: DeletionSeat): string {
  if (s.admin_name !== null) return renamedLine(s);
  return `${admin(s)} still sees every night you played, and can invite you back.`;
}

function renamedLine(s: DeletionSeat): string {
  return `You renamed this seat. It goes back to ${s.admin_name}, the name ${s.host_name ?? 'the admin'} gave it.`;
}

/** S2: the plan line, or nothing for Free — there is no plan to lose. */
export function planEndsLine(planLine: string | null): string | null {
  if (planLine === null || planLine === 'Free') return null;
  return `Your plan, ${planLine}, ends with the account. Signing up again starts on Free.`;
}

/** S6: "It started at 20:05." — the clock on this phone. */
export function startedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `It started at ${hh}:${mm}.`;
}
