/**
 * Which seat belongs to the person holding this phone, and what they are called.
 *
 * THE SEED USED TO HAND THE PHONE SOMEBODY ELSE'S NAME. `sampleNight` lays down
 * the handoff's canonical night so a screen can be held against the frame it was
 * drawn from, and it stamped `meId` onto Marek — a name out of the design's
 * example, chosen because "What you paid" and My stats need *some* seat to call
 * yours. The host then opened the app and found the table's figures, the results
 * row and their own stats all attributed to a man in a spec. Nothing in the app
 * said which of the seven names was theirs, and nothing offered to change it.
 *
 * So the seat has a name here, in one place that both halves of the app read:
 * the seed that lays the night down, and the roster the club keeps beside it.
 *
 * THE ID NEVER MOVES. `seed-marek` is what every phone, every club_member row
 * and every book already carries for this person; a fresh id would strand the
 * roster row beside the night's and put two of the same person in the group.
 * A name is what a person is called and an id is who they are — this file
 * changes the first and is careful never to touch the second.
 */

/** The seat the phone belongs to. Opaque, and older than the name above it. */
export const HOST_ID = 'seed-marek';

/** What that seat is called. */
export const HOST_NAME = 'Andro';

/**
 * Names this seat has carried before, newest last.
 *
 * A phone that has ever opened this app already holds a club, and a club is
 * seeded once and never again — so the roster's copy of this row would keep
 * whichever name it met on the first launch however far the seed moved. The
 * repair below fixes it, ONCE, and this list is what makes "once" true: a row
 * still carrying a name nobody chose is repaired, and a row carrying a name the
 * host typed is left exactly alone. Add to it rather than replacing it, so a
 * phone two names behind still lands on the current one.
 */
export const RETIRED_HOST_NAMES = ['Marek'] as const;

/**
 * Give the host's roster row the host's name — once, and never over the top of
 * a name they chose.
 *
 * Bound: the id, then one parameter per retired name.
 */
export const NAME_THE_HOST = `
  UPDATE club_member
     SET name = '${HOST_NAME}'
   WHERE id = ?
     AND name IN (${RETIRED_HOST_NAMES.map(() => '?').join(', ')})
`;

/**
 * Move which seat a night calls yours.
 *
 * EVERY TABLE STILL RUNNING, not only the one on screen — a club can have two
 * open at once and "this is me" is a fact about the phone, not about one game.
 *
 * IT IS NOT SCOPED TO A CLUB, and cannot be: `night` carries a group's NAME and
 * not its id, so there is nothing here to join on. Two clubs each with a table
 * open is the only case that notices, and it lands the right way — an id that
 * is nobody at that table matches nobody, so the screen shows no You and no
 * figures rather than the wrong ones. Scoping it to the nights the player is
 * seated at was the obvious alternative and is worse: a host who runs the game
 * without playing would never be matched at all, which is the very state that
 * takes the write controls off them.
 *
 * A SETTLED NIGHT IS NEVER TOUCHED. It is the same line `renamePlayerInPlay`
 * draws and for the same reason: what the book said at the time is what it goes
 * on saying. A night settled under the old seat keeps its result filed there,
 * and the honest fix for that is the ledger's own — not a rewrite of it.
 *
 * Bound: the player id.
 */
export const CLAIM_LIVE_NIGHTS = `
  UPDATE night SET me_id = ? WHERE status != 'settled'
`;
