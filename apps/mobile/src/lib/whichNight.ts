/**
 * Which night, and whether it is tonight's.
 *
 * Two decisions that look trivial, are made in more than one place, and each
 * of which shipped wrong: which of the nights on the phone the app opens, and
 * whether the night it opened is a game the host is actually playing.
 *
 * They live here because `nightStore.ts` cannot be imported outside a phone —
 * it pulls in React, react-native and expo-sqlite — so anything in it that
 * could be wrong in a way nobody would notice sits here instead, as a value,
 * and is tested. `pullReads.ts` and `syncRows.ts` exist for the same reason
 * and in the same shape.
 */

/**
 * Is this a night the host is actually playing?
 *
 * The home card and "Set up the game" both have to answer this, and they used
 * to answer it separately: the card asked whether the night was settled, the
 * setup sheet asked whether one existed at all. Both were right about the
 * question each was asking and the pair was unusable — with the sample night
 * seeded open on the phone, the card correctly offered to start a game and the
 * screen it opened correctly refused to, because a night was "already
 * running". One rule, in one place, so they cannot drift apart again.
 *
 * A SEEDED night is demo data and never tonight's game. A SETTLED one is
 * history, and history belongs in My nights. 'counting' IS tonight: a
 * half-counted night is still being played, and a host who steps back to the
 * root has to be able to step into it again.
 *
 * Takes the shape rather than the `Night` type, so this module stays free of
 * anything that only loads on a phone — and so the two fields the decision
 * actually rests on are visible in the signature.
 */
export const isTonight = (
  n: { seeded: boolean; status: 'open' | 'counting' | 'settled' } | null,
): boolean => n !== null && !n.seeded && n.status !== 'settled';

/**
 * What a table is called while it is the only one.
 *
 * It is a time, not a name, and that is the point: with one game running there
 * is nothing to tell apart, and "Tonight" is what a host calls it out loud.
 */
export const FIRST_TABLE = 'Tonight';

/**
 * What that table becomes the moment a second one opens.
 *
 * Two cards on home, and the only thing separating them is their names — so
 * "Tonight" stops being one. It cannot mean this table when the other one is
 * also tonight. The first table is the main one by definition: it is the one
 * that was already running.
 */
export const MAIN_TABLE = 'Main table';

/**
 * The name an existing table takes when another opens beside it, or null when
 * it already has a name of its own and keeps it.
 */
export const renamedForSecondTable = (name: string): string | null =>
  name.trim() === FIRST_TABLE ? MAIN_TABLE : null;

/**
 * Is this name usable for a new table?
 *
 * Empty is not a name, "Tonight" is not a name once there are two, and a name
 * another open table already answers to is worse than either — the host would
 * be choosing between two identical cards with money on both.
 */
export function tableNameProblem(
  typed: string,
  openNames: readonly string[],
): 'empty' | 'reserved' | 'taken' | null {
  const name = typed.trim();
  if (name === '') return 'empty';
  if (name === FIRST_TABLE) return 'reserved';
  const taken = openNames.some((n) => n.trim().toLowerCase() === name.toLowerCase());
  // A table called "Main table" is only a clash once the rename has happened,
  // which is exactly what `openNames` will say by then.
  return taken ? 'taken' : null;
}

/**
 * Which night the app opens on.
 *
 * A phone can hold several. It is seeded with the sample night so there is a
 * club to start from; the host then starts their own; and `importNights` adds
 * every night pulled back from the server. Choosing between them used to be
 * `SELECT * FROM night LIMIT 1`, which has no ORDER BY at all — so SQLite
 * returned rows in rowid order, which is insertion order, which is THE SEED.
 * A host recorded a real night, closed the app, reopened it, and found Marek
 * and Dana still sitting at a table from days before, with their own game
 * intact in the database and unreachable from anywhere in the interface.
 *
 * Two rules, in this order:
 *
 *   1. A REAL NIGHT BEATS A SEEDED ONE. `seed_version` is non-null only on
 *      demo data, so `(seed_version IS NULL) DESC` puts the host's own first.
 *      SQLite has no booleans: the comparison yields 1 or 0 and DESC puts the
 *      1s — the real nights — on top.
 *   2. THE MOST RECENT WINS, on `started_at` rather than rowid, because an
 *      imported night arrives on the phone long after the night it describes.
 */
export const CURRENT_NIGHT = `SELECT * FROM night
   ORDER BY (seed_version IS NULL) DESC, started_at DESC
   LIMIT 1`;
