/**
 * The club's name, and the names it carried before.
 *
 * Owner, 27 November: the club is **Kaklebi**. It was "The Thursday game" — a
 * name out of the seed, which every phone that has ever opened the app took on
 * its first launch and has kept since, because a club is seeded once and never
 * again. Changing the seed alone would reach only a fresh install, so the old
 * name is repaired on launch, ONCE, the same way `hostSeat.ts` repairs the
 * host's own name: a row still carrying a name nobody chose moves, and a name
 * the host typed is never touched.
 *
 * THREE PLACES CARRY IT, AND ALL THREE MOVE TOGETHER. A night names its group
 * by name, not by club id (`hostSeat.ts` § CLAIM_LIVE_NIGHTS), and so does a
 * passed night's hold — so a club renamed on its own would leave every night it
 * owns pointing at a group that no longer exists. The nights and holds move
 * first, before anything is read; the club then moves through `renameClub`,
 * which carries the old name to the queue so the server renames the same book
 * rather than minting a second one.
 */

/** What the club is called. */
export const CLUB_NAME = 'Kaklebi';

/**
 * Names the club has carried before, newest last. Add to it rather than
 * replacing it, so a phone two names behind still lands on the current one.
 */
export const RETIRED_CLUB_NAMES = ['The Thursday game'] as const;

const placeholders = RETIRED_CLUB_NAMES.map(() => '?').join(', ');

/**
 * Every night of the club, settled or not, onto the new name.
 *
 * Unlike `CLAIM_LIVE_NIGHTS` this DOES reach a settled night: `group_name` is
 * not what the book said, it is the join from a night to its club, and a
 * settled night left on the old name drops out of the club's history.
 *
 * Bound: one parameter per retired name.
 */
export const RENAME_GROUP_NIGHTS = `
  UPDATE night
     SET group_name = '${CLUB_NAME}'
   WHERE group_name IN (${placeholders})
`;

/** The same, for a passed night's hold. Bound: one parameter per retired name. */
export const RENAME_GROUP_HOLDS = `
  UPDATE night_hold
     SET group_name = '${CLUB_NAME}'
   WHERE group_name IN (${placeholders})
`;

/** Whether a club still carries a name out of an old seed. */
export const isRetiredClubName = (name: string): boolean =>
  (RETIRED_CLUB_NAMES as readonly string[]).includes(name);
