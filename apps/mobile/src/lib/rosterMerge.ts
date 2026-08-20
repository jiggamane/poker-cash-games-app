import type { PlayerId } from '@poker-club/core';

/**
 * The roster, as decisions rather than as database calls.
 *
 * ONE LIST OF PEOPLE, in four places that each used to keep their own: the
 * club's roster (`club_member`), the night on this phone (`night_player`), the
 * book on the server (`player`), and whatever a screen happened to be holding.
 * Nothing here touches SQLite, Supabase or React Native, for the same reason
 * `syncRows.ts` and `pullReads.ts` do not — the rules that decide who is on the
 * list are the part worth testing, and they cannot be reached from a test if
 * they are buried in a store.
 *
 * `clubStore` applies these; `pull.ts` and `app/seat.tsx` read them.
 */

/** A person as the roster knows them: an id and a name, and nothing else. */
export interface RosterPerson {
  id: PlayerId;
  name: string;
}

/** Enough of a club to match a book against. */
export interface ClubRef {
  id: string;
  /** The server book this club is the local copy of — null until a pull says. */
  bookId: string | null;
  name: string;
}

/** Enough of a book to match a club against. */
export interface BookRef {
  id: string;
  groupName: string;
}

/**
 * Two names are the same person's name if they differ only in case or padding.
 * It is the rule the roster already enforces when the admin adds somebody, so
 * it is the rule everything else has to agree with.
 */
export const sameName = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Which club on this phone a book from the server belongs to, or null if none
 * of them does and one has to be made.
 *
 * A stamped club wins outright. Failing that, a club that has never been
 * matched to any book and carries the book's name is taken to be it — which is
 * the host's own case, where the club was created on the phone first and the
 * book was created for it later by the queue, with neither ever told about the
 * other. A club already stamped with a DIFFERENT book is never matched by
 * name: two groups may perfectly well be called "Friday".
 */
export function clubForBook(clubs: readonly ClubRef[], book: BookRef): string | null {
  const stamped = clubs.find((c) => c.bookId === book.id);
  if (stamped !== undefined) return stamped.id;

  const named = clubs.find((c) => c.bookId === null && sameName(c.name, book.groupName));
  return named?.id ?? null;
}

/**
 * Who the book knows that this phone does not.
 *
 * A PULL ADDS AND NEVER RENAMES, exactly as it never overwrites a night. Names
 * travel the other way — the phone's roster is what the queue pushes up — and a
 * pull that also wrote them back would make the two ends argue, with the loser
 * decided by whichever ran last.
 *
 * Skipped by id AND by name. Somebody already on the roster under a locally
 * minted id is the same human as the book's row for that name, and adding them
 * again would leave two rows the ledger cannot tell apart — which is the very
 * thing the roster refuses when the admin types a name that is already there.
 */
export function rosterAdditions(
  known: readonly RosterPerson[],
  book: readonly RosterPerson[],
): RosterPerson[] {
  const ids = new Set(known.map((p) => p.id));
  const names = new Set(known.map((p) => p.name.trim().toLowerCase()));

  const added: RosterPerson[] = [];
  for (const p of book) {
    if (ids.has(p.id) || names.has(p.name.trim().toLowerCase())) continue;
    ids.add(p.id);
    names.add(p.name.trim().toLowerCase());
    added.push(p);
  }
  return added;
}

/**
 * The chips above the name field on N7 — "people the group already knows who
 * are not playing tonight", which is what that sheet has always said they are.
 *
 * They come off the ROSTER, not off the night. Drawn from the night's own
 * player list, the row could only ever show somebody a previous night had
 * already put there, so a player added on GR4 between games — the ordinary way
 * to add somebody — was missing from the one screen that exists to seat them.
 *
 * Anyone in the night but not on the roster still shows, after them: a phone
 * that recorded nights before this list was joined up has people in exactly
 * that position, and they are still at the table.
 */
export function benchFor(args: {
  members: readonly RosterPerson[];
  nightPlayers: ReadonlyArray<{ id: PlayerId; name: string }>;
  /** Who has money on the table. They are playing; they are not on the bench. */
  playing: ReadonlySet<PlayerId>;
}): RosterPerson[] {
  const seen = new Set<PlayerId>();
  // By name as well as by id: a night recorded before the two lists were
  // joined up holds its own row for somebody the roster also has, and the same
  // person twice on one row of chips is worse than either of them missing.
  const names = new Set<string>();
  const bench: RosterPerson[] = [];

  for (const p of [...args.members, ...args.nightPlayers]) {
    const name = p.name.trim().toLowerCase();
    if (seen.has(p.id) || names.has(name) || args.playing.has(p.id)) continue;
    seen.add(p.id);
    names.add(name);
    bench.push({ id: p.id, name: p.name });
  }
  return bench;
}
