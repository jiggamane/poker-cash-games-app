import { useClub } from './clubStore';
import { useNight } from './nightStore';

/**
 * Whether the phone reading this screen runs the group.
 *
 * ONE ANSWER, IN ONE PLACE. Home and Settings each worked this out for
 * themselves — `club.members.find(standing === 'admin')` against `night.meId` —
 * and the moment a third screen needed it the two readings would have started
 * to drift. What money a person may restate is not a question two files get to
 * answer differently.
 *
 * A READER IS THE HOST UNLESS THE CLUB POSITIVELY SAYS SOMEBODY ELSE IS. That
 * is deliberate and it is what home already does: a club seeded before anyone
 * claimed a seat has an admin nobody is matched to, and locking the host out of
 * their own game because the roster has not caught up is worse than trusting a
 * phone that is, in every case that matters, the phone the game is being
 * recorded on.
 *
 * `12-the-group.md` § 4.1: a power the reader does not have is REMOVED, never
 * disabled. A member sees the figures; they do not see a greyed-out pencil.
 */
export function useIsAdmin(): boolean {
  const club = useClub();
  const night = useNight();

  const admin = club?.members.find((m) => m.standing === 'admin');
  const meId = night?.meId;
  return admin === undefined || meId === undefined || admin.id === meId;
}
