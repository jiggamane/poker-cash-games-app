import type { Member } from './clubStore';

/**
 * THE POLICY SEAM — who may take a game.
 *
 * `design/handoff-game-admin/` (cut 26 September) gates taking a game — opening
 * one, or being passed one — by membership: Full always, Regular while this
 * billing period's host night is unused, Free never. Rev 18 § 4 says to build
 * none of it and keep ONE seam that answers yes to everything until membership
 * ships, and this file is that seam. Every screen the handoff draws is built
 * against these four functions; the gates and the "can't take it" rows appear
 * the day this file returns real answers, and not before.
 *
 * ⚠ TWO VOCABULARIES, AND THIS IS WHERE THEY MEET. The handoff (and rev 18
 * `01-product-logic.md` § 4, and `docs/pricing-model.md` since this cut) name
 * the tiers Free / Regular / Full. `0018_accounts.sql` on main, cut the day
 * before, names an account's plan free / pro / club, and `my_plan()` is its one
 * reader. Nothing built has both: the database enforces a plan only for STARTING
 * A GROUP, and this seam answers for taking a game. When the two are joined it
 * is one mapping in `membershipOf` below (pro → full is the obvious one; where
 * Regular's host night lives is the owner's call) and nothing on any screen.
 * `docs/screens.md` carries the question.
 *
 * TODAY: everyone with the app is Full. A name the host typed (`name_only`) has
 * nobody behind it, which is not a membership fact and is not answered here —
 * `passTargets` asks it first, because the handoff runs the checks in that
 * order: claimed, then membership, then not the current admin.
 */

export type Tier = 'free' | 'regular' | 'full';

export interface Membership {
  tier: Tier;
  /** Regular only: whether this billing period's host night is spent. */
  hostNightUsed: boolean;
  /**
   * Regular only: when the host night comes back — each person's own renewal
   * date, never the calendar month (the handoff's "1 October" is an example).
   * Null for Free and Full.
   */
  hostNightRenewsOn: Date | null;
  /**
   * Whether this is a real answer or the seam's placeholder. The pass sheet
   * names a person's tier only when it is real — printing "Full" beside
   * everybody because the seam says yes would tell the admin something that
   * is not true about their friends.
   */
  known: boolean;
}

/** The seam's placeholder: allows everything, and is not anybody's real tier. */
const FULL: Membership = { tier: 'full', hostNightUsed: false, hostNightRenewsOn: null, known: false };

/**
 * A person's membership. THE SEAM: it answers Full for everybody.
 *
 * Takes the roster row so the call sites are already right when there is a
 * real answer to look up by it.
 */
export function membershipOf(_member: Pick<Member, 'id'>): Membership {
  return FULL;
}

/** Whether this membership can take a game tonight — open one, or be passed one. */
export const canTakeGame = (m: Membership): boolean =>
  m.tier === 'full' || (m.tier === 'regular' && !m.hostNightUsed);

/**
 * Whether taking THIS game would spend a Regular's host night. Spent once per
 * game per person — a game coming back to somebody it already landed on costs
 * nothing, which is what `spentBy` carries.
 */
export const willSpendHostNight = (
  m: Membership,
  game: { hostNightSpentBy: ReadonlySet<string> },
  personId: string,
): boolean => m.tier === 'regular' && !game.hostNightSpentBy.has(personId);

/** How a game's pass sheet reads one person — the row's sub-line is decided from this. */
export interface CanRow {
  kind: 'can';
  member: Member;
  membership: Membership;
  spendsHostNight: boolean;
}
export interface CannotRow {
  kind: 'cannot';
  member: Member;
  membership: Membership;
  why: 'name_only' | 'host_night_used' | 'free';
}
export type PassRow = CanRow | CannotRow;

/**
 * Everyone the game could go to, and everyone it cannot, with the reason —
 * in the order the checks run: claimed, membership, not the current admin.
 *
 * The current admin is not listed at all. "Not playing tonight" is not a
 * reason: being at the table is not required, and the row merely says so.
 */
export function passTargets(
  members: readonly Member[],
  adminId: string | null,
  game: { hostNightSpentBy: ReadonlySet<string> },
): { can: CanRow[]; cannot: CannotRow[] } {
  const can: CanRow[] = [];
  const cannot: CannotRow[] = [];
  for (const member of members) {
    if (member.id === adminId) continue;
    const membership = membershipOf(member);
    if (member.standing === 'name_only') {
      cannot.push({ kind: 'cannot', member, membership, why: 'name_only' });
    } else if (!canTakeGame(membership)) {
      cannot.push({
        kind: 'cannot',
        member,
        membership,
        why: membership.tier === 'free' ? 'free' : 'host_night_used',
      });
    } else {
      can.push({
        kind: 'can',
        member,
        membership,
        spendsHostNight: willSpendHostNight(membership, game, member.id),
      });
    }
  }
  return { can, cannot };
}

/**
 * What GR4's "Who can run a game" view says under each name — one of the
 * handoff's five lines, never a tier name (state 18: "This view never prints a
 * tier name", because Regular is also a roster word).
 *
 * `renewal` is the person's own date, formatted by the caller.
 */
export function runsLine(
  member: Pick<Member, 'standing'>,
  m: Membership,
  renewal: (d: Date) => string,
): string {
  if (member.standing === 'name_only') return 'no app yet';
  if (m.tier === 'full') return 'any night';
  if (m.tier === 'regular') {
    return m.hostNightUsed
      ? `host night used · back on ${m.hostNightRenewsOn === null ? '—' : renewal(m.hostNightRenewsOn)}`
      : 'one night left';
  }
  return 'watches for free';
}

/**
 * Which gate, if any, stands between this membership and opening a game —
 * `design/handoff-game-admin/` states 13 (Free) and 15 (Regular, host night
 * used). Null is O1 as it is, with state 14's note when the night would spend
 * a Regular's host night.
 */
export function gateFor(m: Membership): 'free' | 'regular_used' | null {
  if (m.tier === 'free') return 'free';
  if (m.tier === 'regular' && m.hostNightUsed) return 'regular_used';
  return null;
}

/** The tier as the owner named it, 26 September: Free / Regular / Full. */
export const TIER_NAME: Record<Tier, string> = { free: 'Free', regular: 'Regular', full: 'Full' };

/**
 * One row's sub-line on the pass sheet — `design/handoff-game-admin/` state 3,
 * and since 26 September the owner's call on top of it: **the admin sees each
 * person's tier at the moment of passing**, first on the line, where the seam
 * has a real answer. Only there: GR4's *Who can run a game* view still never
 * prints a tier name, and nobody but the phone passing the game sees one.
 *
 *   Full · at the table
 *   Regular · at the table · uses their one host night
 *   Full · not playing tonight
 *   Regular · host night used · back on 1 Oct
 *   Free · can't run a game
 *   Name only · no app to send it to
 *
 * With the seam's placeholder (today, for everybody) the tier is left off and
 * the line is the board's own: "At the table · can take it any night".
 */
export function passLine(row: PassRow, seated: boolean, day: (d: Date) => string): string {
  const where = seated ? 'at the table' : 'not playing tonight';
  const m = row.membership;
  if (row.kind === 'cannot' && row.why === 'name_only') return 'Name only · no app to send it to';
  if (row.kind === 'cannot' && row.why === 'free') {
    return seated ? 'Free · can’t run a game' : 'Free · not playing tonight';
  }
  if (row.kind === 'cannot') {
    const back = m.hostNightRenewsOn === null ? '—' : day(m.hostNightRenewsOn);
    return `${m.known ? 'Regular · h' : 'H'}ost night used · back on ${back}`;
  }
  /* ⚠ "uses their one host night" is marked UNSURE on the board. */
  const tail = row.spendsHostNight
    ? 'uses their one host night'
    : m.known
      ? null
      : seated
        ? 'can take it any night'
        : 'any night';
  const lead = m.known ? `${TIER_NAME[m.tier]} · ${where}` : cap(where);
  return tail === null ? lead : `${lead} · ${tail}`;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
