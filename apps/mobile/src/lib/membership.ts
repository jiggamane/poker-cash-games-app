import type { Member } from './clubStore';

/**
 * THE POLICY SEAM — who may take a game.
 *
 * `design/handoff-game-admin/` (cut 26 September) gates taking a game — opening
 * one, or being passed one — by membership: Full always, Regular while this
 * billing period's host night is unused, Free never. Rev 18 § 4 said to build
 * none of it and keep ONE seam that answers yes to everything until membership
 * ships, and this file was that seam. Every screen the handoff draws is built
 * against these functions.
 *
 * SINCE 26 OCTOBER THE SEAM HAS A REAL ANSWER. The owner joined the two
 * vocabularies — `0018_accounts.sql`'s plan free / pro / club and the handoff's
 * tiers Free / Regular / Full — as: pro and club are Full, and Regular is a
 * plan of its own with ONE host night a billing period, counted on the server
 * (`0021_membership.sql`). This file is still pure: `membershipStore.ts` asks
 * the server (`my_membership`, `roster_membership`) and hands the answers to
 * `setMemberships` below; `membershipOf` reads them. Until an answer lands,
 * and on a phone the server gives no answer to (a member reading GR4), the
 * seam answers the placeholder it always did — Full, and `known: false`, so no
 * screen prints a tier it made up.
 *
 * The server is the floor under every answer here: `pass_night` refuses what
 * `passTargets` would not list, and opening a night is checked by a trigger.
 * A stale list on the phone costs a refused pass, never a wrong one.
 *
 * A name the host typed (`name_only`) has nobody behind it, which is not a
 * membership fact and is not answered here — `passTargets` asks it first,
 * because the handoff runs the checks in that order: claimed, then membership,
 * then not the current admin.
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

/** A plan as `my_plan()` names it. `0021` maps it to a tier: pro and club are Full. */
export type Plan = 'free' | 'regular' | 'pro' | 'club';

export const tierOfPlan = (plan: Plan): Tier =>
  plan === 'pro' || plan === 'club' ? 'full' : plan;

/** One row as `my_membership()` and `roster_membership()` return it. */
export interface MembershipRow {
  tier: Tier;
  host_night_used: boolean;
  host_night_renews_on: string | null;
  /** Whether the night asked about already spent this person's host night. */
  spent_on_this: boolean;
}

export const fromRow = (r: MembershipRow): Membership => ({
  tier: r.tier,
  hostNightUsed: r.host_night_used,
  hostNightRenewsOn: r.host_night_renews_on === null ? null : new Date(r.host_night_renews_on),
  known: true,
});

/**
 * What the server has said, and about which night.
 *
 *   byPlayer    each claimed seat the caller may read — the host's phone and
 *               the phone recording a night get the roster; a member gets none
 *   mine        the caller's own, under the roster row that is theirs
 *   spentBy     the seats whose host night the night asked about already spent
 */
interface Answers {
  byPlayer: Map<string, Membership>;
  mine: { playerId: string; membership: Membership } | null;
  sessionId: string | null;
  spentBy: Set<string>;
}

let answers: Answers = { byPlayer: new Map(), mine: null, sessionId: null, spentBy: new Set() };

/** The store hands the server's answers in here. Tests do too. */
export function setMemberships(next: {
  byPlayer: ReadonlyMap<string, Membership>;
  mine: { playerId: string; membership: Membership } | null;
  sessionId: string | null;
  spentBy: ReadonlySet<string>;
}): void {
  answers = {
    byPlayer: new Map(next.byPlayer),
    mine: next.mine,
    sessionId: next.sessionId,
    spentBy: new Set(next.spentBy),
  };
}

/** Back to the placeholder — a sign-out, and the tests. */
export function forgetMemberships(): void {
  answers = { byPlayer: new Map(), mine: null, sessionId: null, spentBy: new Set() };
}

/**
 * A person's membership: the server's answer for their seat, the caller's own
 * under their own row, and the placeholder for everybody else.
 */
export function membershipOf(member: Pick<Member, 'id'>): Membership {
  const row = answers.byPlayer.get(member.id);
  if (row !== undefined) return row;
  if (answers.mine !== null && answers.mine.playerId === member.id) return answers.mine.membership;
  return FULL;
}

/**
 * The night the answers were asked about, as `passTargets` and
 * `willSpendHostNight` take it: who this game already landed on. Empty for a
 * night the server was not asked about, and for a new one.
 */
export function gameFor(sessionId: string | null): { hostNightSpentBy: ReadonlySet<string> } {
  return {
    hostNightSpentBy: sessionId !== null && sessionId === answers.sessionId ? answers.spentBy : new Set(),
  };
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
    } else if (!canTakeGame(membership) && !game.hostNightSpentBy.has(member.id)) {
      /* A Regular whose night THIS game already spent can have it back for
         nothing — README § 1, and what `pass_night` allows. */
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
