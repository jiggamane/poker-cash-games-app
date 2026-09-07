/**
 * What the server knows about a seat, written onto the roster row — B47.
 *
 * The roster draws three standings and an invite badge, and until now it could
 * draw exactly one of them. `club_member.invited` had two writers and no
 * callers: `inviteMember` and `resetInvite` sat in `clubStore.ts` from the day
 * GR6 was superseded by the real invite sheet, and nothing ever ran them. So
 * the flag was 0 on every row, on every phone, for ever — the amber pill never
 * drew, `· 2 invited` never appeared, and the one state the whole invite flow
 * is about was invisible to the person running it.
 *
 * `standing` had the same shape of hole from the other end. Only `makeAdmin`
 * ever wrote it, so a player who had claimed their seat went on reading
 * `Name only · no app · invite` on the host's phone for the rest of time, and
 * the host had no way of knowing anybody had ever arrived.
 *
 * Both facts live on the server and only there — `player.claimed_by_user_id`
 * and a live row in `player_invite` — and `seatStatuses` already fetched both,
 * for one player, inside the invite sheet. This is that answer, for the whole
 * list, landing where the roster can read it.
 *
 * THE STATEMENTS ARE HERE AND THE ORCHESTRATION IS IN `clubStore.ts`, the same
 * split `hostSeat.ts` uses and for the same reason: the bug these prevent is
 * invisible in the SQL. An `UPDATE club_member SET standing = 'member'` looks
 * correct however wide its WHERE clause is, and the difference between one that
 * promotes a name and one that overwrites the admin's own row is a single line
 * of it. Both are run against a real SQLite in `seatReconcile.test.ts`.
 */

/**
 * Whether a live code is out for this seat.
 *
 * Set from the server's answer every time, in both directions: a code that has
 * been spent, revoked or has run out takes the badge off again. That is what
 * makes the count on the roster head a count of people who are actually
 * waiting rather than a tally of invitations ever sent.
 *
 * Bound: the flag, then the player id.
 */
export const SET_INVITED = `
  UPDATE club_member SET invited = ? WHERE id = ?
`;

/**
 * A seat with somebody behind it stops being a name.
 *
 * IT ONLY EVER PROMOTES, and the WHERE clause is the whole of that promise.
 *
 * `admin` is untouched because a host who claimed their own seat is still the
 * admin, and demoting them to `member` would take the write controls off the
 * person holding the phone — `makeAdmin` is the only thing allowed to move that
 * row, because standing-as-admin is a fact about this handset rather than about
 * the server.
 *
 * NOTHING HERE DEMOTES `member` BACK TO `name_only`, which is deliberate and is
 * the one case this file leaves on the floor. A seat that has been reset really
 * has stopped having an account behind it, and its row goes on saying "has the
 * app" until somebody claims it again. Fixing that means telling a reset apart
 * from a host who has simply never bound their own seat (B48) — and from a
 * removal, which revokes nothing at all today (B57). A demotion written before
 * those two are settled would flip the row of every host in the product, which
 * is a worse bug than the one it closes. The invite badge lands correctly in
 * the meantime: a reset issues a new code, so the row reads `invited`, which is
 * both true and the thing the host has to act on.
 *
 * Bound: the player id.
 */
export const PROMOTE_CLAIMED = `
  UPDATE club_member
     SET standing = 'member'
   WHERE id = ?
     AND standing = 'name_only'
`;
