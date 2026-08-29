import { useSyncExternalStore } from 'react';
import type * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { database } from './db';
import {
  money,
  type Money,
  type MoneyRule,
  type PlayerId,
  type RoundingMode,
  type Stakes,
} from '@poker-club/core';
import { HOST_ID, NAME_THE_HOST, RETIRED_HOST_NAMES } from './hostSeat';
import { dropPlayerFromPlay, renamePlayerInPlay, setMeSeat } from './nightStore';
import { clubForBook, rosterAdditions, sameName, type RosterPerson } from './rosterMerge';
import { drain, queueRosterPlayer } from './sync';

/**
 * The club, on this phone. 12-the-group.md.
 *
 * A club owns four things and nothing else: a name and a currency, a roster,
 * money rules, and a history of nights. It does NOT own a night in progress —
 * a night is a child that copies what it needs at birth and then lives on its
 * own. Everything else in this file follows from that one sentence.
 *
 * The inheritance chain is the part to get literally right:
 *
 *   this game → last game → club default → app default
 *
 * A night COPIES, it does not reference. Change the club at midnight and the
 * night running in the kitchen does not move, and a night settled last month
 * can never move. What the last game actually ran with becomes the next
 * game's suggestion — not the club's setting, which only Settings changes.
 */

/** Standing is per club: the same person can be admin here and a name there. */
export type Standing = 'admin' | 'member' | 'name_only';

export interface Member {
  id: PlayerId;
  name: string;
  standing: Standing;
  /** A link is out and has not been opened yet. A badge, never a queue. */
  invited: boolean;
  /** Off for somebody who does not pay into the piggy bank at all. */
  paysKitty: boolean;
}

export interface Club {
  id: string;
  /**
   * The server book this club is the local copy of, once a pull has said which
   * one it is. Null on a club that has never met the server — which is every
   * club until somebody signs in, and is not a fault.
   */
  bookId: string | null;
  name: string;
  currency: string;
  /** The club's own default, which the app default fills in when unset. */
  defaultBuyIn: Money;
  rules: MoneyRule[];
  /**
   * How coarsely this group settles. Null — every club that existed before the
   * setting did — means whole dollars, which is what they have all been doing.
   *
   * It sits beside `rules` rather than inside one because it is not a rule's
   * term: it governs every rule at once, and a group that rounds to hundreds
   * rounds the bill and the piggy bank alike.
   */
  roundingMode: RoundingMode | null;
  /**
   * What this group plays at — M8's blinds and straddle, the first row of *The
   * game* on O1 and the top of the settings list on GR7.
   *
   * NULL MEANS THE GROUP HAS NEVER SAID, which is a different thing from
   * playing at the app's default, and the difference is the whole reason this
   * is nullable rather than seeded. `defaultBuyIn` learned that the hard way:
   * it stores the app default as its own value and `inheritedFor` has to
   * compare against the constant to guess whether anybody chose it.
   */
  stakes: Stakes | null;
  members: Member[];
}

/** What the app falls back to when a club has said nothing. */
export const APP_DEFAULT_BUY_IN = money(500);

/**
 * And what it falls back to for the blinds.
 *
 * $5 / $5 is not invented here: it is the game O1 is drawn playing, and the
 * canonical night in the handoff is played at it. A group that plays something
 * else says so on the first night and never sees this figure again.
 */
export const APP_DEFAULT_STAKES: Stakes = {
  small: money(5),
  big: money(5),
  straddle: 'none',
  straddleAmount: null,
};

/**
 * The stakes off a `stakes_json` column, or null when the column has nothing
 * in it — which is every row written before the setting existed.
 *
 * Parsing is defensive because this column is the only one on either table
 * holding a shape rather than a scalar: a half-written row would otherwise
 * take the club list down on launch, and a club with no blinds recorded is a
 * club that inherits, which is a state the chain already knows how to be in.
 */
function readStakes(json: string | null): Stakes | null {
  if (json == null || json === '') return null;
  try {
    const raw = JSON.parse(json) as Partial<Stakes>;
    if (typeof raw.small !== 'number' || typeof raw.big !== 'number') return null;
    return {
      small: money(raw.small),
      big: money(raw.big),
      straddle: raw.straddle ?? 'none',
      straddleAmount:
        raw.straddle === undefined ||
        raw.straddle === 'none' ||
        typeof raw.straddleAmount !== 'number'
          ? null
          : money(raw.straddleAmount),
    };
  } catch {
    return null;
  }
}

/** The club's tables, on the app's one connection. See `db.ts`. */
const getDb = (): Promise<SQLite.SQLiteDatabase> =>
  database('club', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS club (
        id             TEXT PRIMARY KEY NOT NULL,
        name           TEXT NOT NULL,
        currency       TEXT NOT NULL DEFAULT 'USD',
        default_buy_in INTEGER,
        rules_json     TEXT NOT NULL DEFAULT '[]',
        created_at     TEXT NOT NULL
      );

      -- The roster. ONE list: standing is a column, not a second table, and
      -- an outstanding invite is a flag on the row rather than a pending
      -- queue somewhere else.
      CREATE TABLE IF NOT EXISTS club_member (
        club_id   TEXT NOT NULL,
        id        TEXT NOT NULL,
        name      TEXT NOT NULL,
        standing  TEXT NOT NULL DEFAULT 'name_only',
        invited   INTEGER NOT NULL DEFAULT 0,
        pays_kitty INTEGER NOT NULL DEFAULT 1,
        -- Removing somebody keeps every night they played. The ledger keeps
        -- what they already played, always; this only stops them appearing
        -- when players are seated.
        removed   INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (club_id, id)
      );

      -- What the last session actually ran with, overrides included. It is
      -- the middle layer of the chain and nothing else reads it.
      CREATE TABLE IF NOT EXISTS club_last_game (
        club_id    TEXT PRIMARY KEY NOT NULL,
        buy_in     INTEGER,
        rules_json TEXT
      );
    `);

    /*
     * Columns a phone that already holds a club will not have.
     *
     *   book_id       — which book on the server this club is. A club is made
     *                   on the phone and a book is made by the queue, neither
     *                   ever telling the other, so a pull had no way to know
     *                   which local club a book's roster belonged to and put it
     *                   nowhere. Null until a pull matches them by name, once.
     *   rounding_mode — how coarsely the group settles, and what the last game
     *                   actually ran at. Null is whole dollars, which is what
     *                   every club has been doing.
     *
     * CREATE TABLE IF NOT EXISTS will not add a column to a phone that already
     * has the table, so these run every launch and fail on all but the first.
     * The failure is the success case.
     */
    for (const [table, column] of [
      ['club', 'book_id TEXT'],
      ['club', 'rounding_mode TEXT'],
      ['club_last_game', 'rounding_mode TEXT'],
      // The blinds and the straddle, at both layers of the chain. JSON rather
      // than four columns because they are one setting: a row holding a small
      // blind and no big one is not a state the app has words for.
      ['club', 'stakes_json TEXT'],
      ['club_last_game', 'stakes_json TEXT'],
    ] as const) {
      try {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column};`);
      } catch {
        // Already there.
      }
    }

    /*
     * THE HOST'S OWN ROW, GIVEN THE HOST'S NAME.
     *
     * A stale seeded NIGHT is replaced on launch — `SEED_VERSION` exists for
     * exactly that — but the club seeded beside it is not: `loadClubs` seeds
     * only when there is no club at all, so the roster's copy of this person
     * keeps whichever name it met on the very first launch, for ever. A phone
     * that had already opened the app would have shown the night's new name on
     * every screen and the old one on Players, which is worse than either.
     *
     * So it is repaired here, where the columns are, and it repairs itself
     * ONCE: the WHERE clause matches only a name out of an old seed, so the
     * second launch finds nothing and a name the host typed is never touched.
     * See `hostSeat.ts`.
     */
    await db.runAsync(NAME_THE_HOST, HOST_ID, ...RETIRED_HOST_NAMES);
  });

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

interface State {
  clubs: Club[];
  currentId: string | null;
}

let state: State = { clubs: [], currentId: null };
const listeners = new Set<() => void>();

const emit = () => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => state;

export function useClubs(): State {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** The club everything below Home belongs to. */
export function useClub(): Club | null {
  const { clubs, currentId } = useClubs();
  return clubs.find((c) => c.id === currentId) ?? clubs[0] ?? null;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

interface ClubRow {
  id: string;
  name: string;
  currency: string;
  default_buy_in: number | null;
  rules_json: string;
  book_id: string | null;
  rounding_mode: RoundingMode | null;
  stakes_json: string | null;
}

interface MemberRow {
  club_id: string;
  id: string;
  name: string;
  standing: Standing;
  invited: number;
  pays_kitty: number;
  removed: number;
}

/**
 * Read every club this phone knows, seeding one from tonight if there is none.
 *
 * The seed exists because the app shipped with a night before it had a club:
 * the players at that table are its roster, and whoever is holding the phone
 * is its admin. It runs once.
 */
export async function loadClubs(seed?: {
  name: string;
  players: Array<{ id: PlayerId; name: string }>;
  rules: MoneyRule[];
  meId?: PlayerId;
}): Promise<void> {
  const db = await getDb();

  let rows = await db.getAllAsync<ClubRow>(`SELECT * FROM club ORDER BY created_at`);

  if (rows.length === 0 && seed !== undefined) {
    const id = randomUUID();
    await db.runAsync(
      `INSERT INTO club (id, name, currency, default_buy_in, rules_json, created_at)
       VALUES (?, ?, 'USD', ?, ?, ?)`,
      id,
      seed.name,
      APP_DEFAULT_BUY_IN,
      JSON.stringify(seed.rules),
      new Date().toISOString(),
    );
    for (const p of seed.players) {
      await db.runAsync(
        `INSERT INTO club_member (club_id, id, name, standing, invited, pays_kitty, removed)
         VALUES (?, ?, ?, ?, 0, 1, 0)`,
        id,
        p.id,
        p.name,
        p.id === seed.meId ? 'admin' : 'name_only',
      );
    }
    rows = await db.getAllAsync<ClubRow>(`SELECT * FROM club ORDER BY created_at`);
  }

  const members = await db.getAllAsync<MemberRow>(
    `SELECT * FROM club_member WHERE removed = 0 ORDER BY rowid`,
  );

  state = {
    clubs: rows.map((c) => ({
      id: c.id,
      bookId: c.book_id ?? null,
      name: c.name,
      currency: c.currency,
      defaultBuyIn: (c.default_buy_in ?? APP_DEFAULT_BUY_IN) as Money,
      rules: JSON.parse(c.rules_json) as MoneyRule[],
      roundingMode: c.rounding_mode ?? null,
      stakes: readStakes(c.stakes_json ?? null),
      members: members
        .filter((m) => m.club_id === c.id)
        .map((m) => ({
          id: m.id,
          name: m.name,
          standing: m.standing,
          invited: m.invited === 1,
          paysKitty: m.pays_kitty === 1,
        })),
    })),
    currentId: state.currentId ?? rows[0]?.id ?? null,
  };
  emit();
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Send what has just been queued, without making anybody wait for it.
 *
 * The same fire-and-forget as every ledger entry: a roster change is written to
 * the phone and is on screen before this is called, and a failure here simply
 * leaves it in the queue for the next drain. See `docs/storage-and-sync.md`.
 */
const push = (): void => {
  void drain().catch(() => {});
};

/**
 * The group's name, which is how a payload names the book — the phone never
 * learns the book's id. Null means the club is not loaded, and a payload that
 * cannot name its book is not worth queueing.
 */
const nameOfClub = (clubId: string): string | null =>
  state.clubs.find((c) => c.id === clubId)?.name ?? null;

/** One roster row, on its way to the book. Call it after `loadClubs`. */
async function queueUp(clubId: string, person: RosterPerson): Promise<void> {
  const groupName = nameOfClub(clubId);
  if (groupName === null) return;
  await queueRosterPlayer(clubId, groupName, person);
  push();
}

/** The roster row carrying this name, removed or not. The roster's own identity test. */
async function memberNamed(
  clubId: string,
  name: string,
): Promise<{ id: PlayerId; removed: number } | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; name: string; removed: number }>(
    `SELECT id, name, removed FROM club_member WHERE club_id = ?`,
    clubId,
  );
  const hit = rows.find((r) => sameName(r.name, name));
  return hit === undefined ? null : { id: hit.id, removed: hit.removed };
}

export async function switchClub(clubId: string): Promise<void> {
  state = { ...state, currentId: clubId };
  emit();
}

/** A group needs only a name; everything else has a default behind it. */
export async function createClub(input: {
  name: string;
  currency?: string;
  defaultBuyIn?: Money;
  playerNames?: readonly string[];
}): Promise<string> {
  const db = await getDb();
  const id = randomUUID();

  await db.runAsync(
    `INSERT INTO club (id, name, currency, default_buy_in, rules_json, created_at)
     VALUES (?, ?, ?, ?, '[]', ?)`,
    id,
    input.name.trim(),
    input.currency ?? 'USD',
    input.defaultBuyIn ?? APP_DEFAULT_BUY_IN,
    new Date().toISOString(),
  );

  for (const name of input.playerNames ?? []) {
    if (name.trim() === '') continue;
    const memberId = randomUUID();
    await db.runAsync(
      `INSERT INTO club_member (club_id, id, name, standing, invited, pays_kitty, removed)
       VALUES (?, ?, ?, 'name_only', 0, 1, 0)`,
      id,
      memberId,
      name.trim(),
    );
    await queueRosterPlayer(id, input.name.trim(), { id: memberId, name: name.trim() });
  }
  push();

  await loadClubs();
  await switchClub(id);
  return id;
}

export async function renameClub(clubId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club SET name = ? WHERE id = ?`, name.trim(), clubId);
  await loadClubs();
}

/**
 * What money this group's book is written in — ISO 4217, one code.
 *
 * IT RENAMES THE COLUMN; IT CONVERTS NOTHING. A group keeps one book, so every
 * figure already in it — tonight's buy-ins, last month's settlement — is read
 * back under the new symbol at the same number. That is right for the case
 * this exists for (a club that was set up in dollars by the default and plays
 * in korunas) and it is why the picker says so in as many words.
 *
 * Unlike the buy-in and the rules there is no per-night layer to overrule:
 * `03-data-model.md` carries the currency on the group and nowhere else, and a
 * book whose column changed money halfway down would be unreadable.
 */
export async function setClubCurrency(clubId: string, code: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club SET currency = ? WHERE id = ?`, code.toUpperCase(), clubId);
  await loadClubs();
}

export async function setClubBuyIn(clubId: string, amount: Money): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club SET default_buy_in = ? WHERE id = ?`, amount, clubId);
  await loadClubs();
}

export async function setClubRules(clubId: string, rules: readonly MoneyRule[]): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club SET rules_json = ? WHERE id = ?`, JSON.stringify(rules), clubId);
  await loadClubs();
}

/**
 * How coarsely this group settles, from tomorrow.
 *
 * The club's layer of the chain, so it reaches the NEXT night and never the
 * one running in the kitchen — same as every rule beside it. Tonight's own
 * rounding is changed on tonight's money rules, which writes the session.
 */
export async function setClubRounding(
  clubId: string,
  mode: RoundingMode | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club SET rounding_mode = ? WHERE id = ?`, mode, clubId);
  await loadClubs();
}

/**
 * The group's own blinds — GR7's *Stakes* row, and the layer O1 seeds from.
 *
 * Like every other club default this changes what the NEXT night opens with
 * and nothing about a night already running: a game copies its stakes at birth
 * and settles with what it opened with.
 */
export async function setClubStakes(clubId: string, stakes: Stakes): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club SET stakes_json = ? WHERE id = ?`, JSON.stringify(stakes), clubId);
  state = {
    ...state,
    clubs: state.clubs.map((c) => (c.id === clubId ? { ...c, stakes } : c)),
  };
  emit();
}

/**
 * Add somebody by name. They exist immediately and can play the same evening —
 * naming comes first and the invite second, always.
 *
 * The row is written here, queued for the book, and that is the whole of it.
 * They reach every screen that shows people because every screen reads this
 * list: `useClub` is what GR4, GR5, the setup sheet and the seat sheet all draw
 * from, so there is nowhere else to put them.
 *
 * Somebody already on the roster under this name is HANDED BACK rather than
 * added again — including somebody who was removed, who is un-removed instead.
 * Two rows with one name is a ledger that cannot tell them apart, and the
 * server refuses it outright: `player_unique_name_per_book`.
 */
export async function addMember(clubId: string, name: string): Promise<PlayerId> {
  const db = await getDb();
  const trimmed = name.trim();
  if (trimmed === '') throw new Error('A player needs a name.');

  const existing = await memberNamed(clubId, trimmed);
  if (existing !== null) {
    if (existing.removed === 1) {
      await db.runAsync(
        `UPDATE club_member SET removed = 0 WHERE club_id = ? AND id = ?`,
        clubId,
        existing.id,
      );
      await loadClubs();
    }
    // Queued even though nothing changed here. Every roster row added before
    // the queue carried them is on this phone and on no server, and this is
    // the one moment somebody is asking about that person by name.
    await queueUp(clubId, { id: existing.id, name: trimmed });
    return existing.id;
  }

  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO club_member (club_id, id, name, standing, invited, pays_kitty, removed)
     VALUES (?, ?, ?, 'name_only', 0, 1, 0)`,
    clubId,
    id,
    trimmed,
  );
  await loadClubs();
  await queueUp(clubId, { id, name: trimmed });
  return id;
}

/**
 * The id the group already has for this name, minting one if it does not.
 *
 * What the seat sheet calls when a name is typed at the table. It used to mint
 * an id inside the NIGHT — so a player the group had known for months became a
 * second person the moment the host typed their name instead of tapping their
 * chip, with their history split between two rows nothing would ever join up.
 */
export async function rosterIdFor(clubId: string, name: string): Promise<PlayerId> {
  return addMember(clubId, name);
}

/**
 * Rename somebody, everywhere the name is.
 *
 * Three places, and they used to be one: the roster, the nights still in play,
 * and the book on the server. A rename that stopped at the roster left the old
 * name on Tonight until the night ended and on every other phone for ever.
 *
 * A settled night keeps the name it was played and paid under. See
 * `renamePlayerInPlay`.
 */
export async function renameMember(clubId: string, id: PlayerId, name: string): Promise<void> {
  const db = await getDb();
  const trimmed = name.trim();
  if (trimmed === '') return;

  const clash = await memberNamed(clubId, trimmed);
  if (clash !== null && clash.id !== id) {
    throw new Error(`${trimmed} is already on the roster.`);
  }

  await db.runAsync(
    `UPDATE club_member SET name = ? WHERE club_id = ? AND id = ?`,
    trimmed,
    clubId,
    id,
  );
  await loadClubs();
  await renamePlayerInPlay(id, trimmed);
  await queueUp(clubId, { id, name: trimmed });
}

export async function setPaysKitty(clubId: string, id: PlayerId, pays: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE club_member SET pays_kitty = ? WHERE club_id = ? AND id = ?`,
    pays ? 1 : 0,
    clubId,
    id,
  );
  await loadClubs();
}

/**
 * Send this player their link. It is theirs: single-use, tied to this row, and
 * opening it hands them the name they already have — every night of theirs
 * already in the book becomes theirs.
 */
export async function inviteMember(clubId: string, id: PlayerId): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE club_member SET invited = 1 WHERE club_id = ? AND id = ?`,
    clubId,
    id,
  );
  await loadClubs();
}

export async function resetInvite(clubId: string, id: PlayerId): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club_member SET invited = 0 WHERE club_id = ? AND id = ?`, clubId, id);
  await loadClubs();
}

/**
 * Say which roster row is the person holding this phone.
 *
 * The club's admin and the reader are the same person — it is what
 * `new-night.tsx` reads to stamp `meId` onto a night, and `meId` is what makes
 * a results screen able to say "You" and My stats able to say what YOU won.
 * Until now the only admin was the one the sample night seeded, so a host who
 * removed that name and added their own had a club with no admin at all: every
 * night they recorded was stamped with nobody, and their own stats came back
 * empty with nothing on screen explaining why.
 *
 * ONE ADMIN AT A TIME. Whether a club can have two is open — `12-the-group.md`
 * § 4.1, along with how admin would be handed over — so this promotes one row
 * and demotes whoever held it to `member`: they still have the app, they no
 * longer run the club. Nothing here creates the second admin that question is
 * about.
 */
export async function makeAdmin(clubId: string, id: PlayerId): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE club_member SET standing = 'member' WHERE club_id = ? AND standing = 'admin'`,
      clubId,
    );
    await db.runAsync(
      `UPDATE club_member SET standing = 'admin' WHERE club_id = ? AND id = ?`,
      clubId,
      id,
    );
  });
  /*
   * AND THE NIGHT FOLLOWS. Standing is the club's answer to "who is holding
   * this phone" and `meId` is the night's, and until now only the first of them
   * moved — so the row this call had just named as you went on being somebody
   * else everywhere the money is: home's "What you paid", the You on the
   * results, My stats, and `useIsAdmin`, which locked the host out of the very
   * game they were recording. One tap, one answer, both places. See `setMeSeat`
   * for what it does and does not reach.
   */
  await setMeSeat(id);
  await loadClubs();
}

/**
 * How many nights each person has sat at — GR9's sub-line.
 *
 * A count of rows, not a sum of money, so it stays here: `night_player` holds
 * one row per person per session and the answer is how many distinct sessions
 * carry their id. Settled or not makes no difference — the question is how
 * long they have been part of this, and a night in progress is part of it.
 *
 * Keyed by player id, and a person with no nights is simply absent.
 */
export async function nightsPlayed(): Promise<Map<PlayerId, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; n: number }>(
    `SELECT id, COUNT(DISTINCT session_id) AS n FROM night_player GROUP BY id`,
  );
  return new Map(rows.map((r) => [r.id, r.n]));
}

/** One person's history with the club, as O2's roster row states it. */
export interface PlayHistory {
  nights: number;
  /** ISO of the most recent night they sat at, or null if they never have. */
  last: string | null;
}

/**
 * How many nights each person has sat at, and when the last one was — O2's
 * sub-line, "played 28 July · 26 nights".
 *
 * The roster is sorted most-recent-first from this, which is the whole reason
 * it exists: the six people who played last week are the six about to play
 * tonight, and a host should not scroll past a name from March to find them.
 *
 * Keyed by player id, and a person who has never played is simply absent.
 */
export async function playHistory(): Promise<Map<PlayerId, PlayHistory>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; n: number; last: string | null }>(
    `SELECT np.id AS id,
            COUNT(DISTINCT np.session_id) AS n,
            MAX(n.started_at) AS last
       FROM night_player np
       JOIN night n ON n.session_id = np.session_id
      GROUP BY np.id`,
  );
  return new Map(rows.map((r) => [r.id as PlayerId, { nights: r.n, last: r.last }]));
}

/**
 * Removing keeps their nights. Unsettled amounts stay on the night they came
 * from, and a settled night is never touched at all.
 *
 * It also takes them out of a night still in play that they had not started —
 * "stops them appearing when players are seated", which is what the roster row
 * on the seat sheet now IS. A night where they hold money keeps them.
 *
 * Nothing is queued: the book has no notion of a removed player, and a row on
 * the server is what every night that names them still points at.
 */
export async function removeMember(clubId: string, id: PlayerId): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club_member SET removed = 1 WHERE club_id = ? AND id = ?`, clubId, id);
  await loadClubs();
  await dropPlayerFromPlay(id);
}

// ---------------------------------------------------------------------------
// The roster, arriving FROM the server
// ---------------------------------------------------------------------------

/** What a book's roster did to this phone. */
export interface RosterImport {
  /** The local club it landed in — made here if there was not one. */
  clubId: string;
  /** People this phone had never heard of. */
  added: number;
}

/**
 * Fold a book's roster into this phone's.
 *
 * THE OTHER HALF OF `pull.ts`, and the half that was missing. A pull brought
 * back every night in the book and not one person: `night_player` filled up,
 * `club_member` stayed exactly as it was, and a member who had just claimed
 * their place landed on a Players screen reading "Nobody on the roster yet"
 * while their nights sat one screen away with six names in them. Nothing about
 * it looked like a failure, which is the worst kind.
 *
 * IT ADDS AND NEVER RENAMES — see `rosterAdditions`. Names travel the other
 * way, up through the queue, and a pull that also wrote them back would make
 * the two ends argue with the winner decided by whichever ran last.
 *
 * The club is stamped with the book's id the first time the two are matched, so
 * a group renamed on either side still lands in the same place next time.
 */
export async function importRoster(book: {
  id: string;
  groupName: string;
  players: readonly RosterPerson[];
}): Promise<RosterImport> {
  const db = await getDb();
  const clubs = await db.getAllAsync<{ id: string; name: string; book_id: string | null }>(
    `SELECT id, name, book_id FROM club ORDER BY created_at`,
  );

  let clubId = clubForBook(
    clubs.map((c) => ({ id: c.id, bookId: c.book_id, name: c.name })),
    book,
  );

  if (clubId === null) {
    clubId = randomUUID();
    await db.runAsync(
      `INSERT INTO club (id, name, currency, default_buy_in, rules_json, created_at, book_id)
       VALUES (?, ?, 'USD', ?, '[]', ?, ?)`,
      clubId,
      book.groupName,
      APP_DEFAULT_BUY_IN,
      new Date().toISOString(),
      book.id,
    );
  } else {
    await db.runAsync(`UPDATE club SET book_id = ? WHERE id = ? AND book_id IS NULL`, book.id, clubId);
  }

  const known = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM club_member WHERE club_id = ?`,
    clubId,
  );

  // Removed people are in `known` on purpose: somebody the admin took off the
  // roster must not come back every time the book is read.
  const added = rosterAdditions(known, book.players);
  for (const p of added) {
    await db.runAsync(
      `INSERT INTO club_member (club_id, id, name, standing, invited, pays_kitty, removed)
       VALUES (?, ?, ?, 'name_only', 0, 1, 0)`,
      clubId,
      p.id,
      p.name,
    );
  }

  // Whether or not anybody was added: the club may have just been made, or
  // just been stamped, and every screen below Home reads this state.
  await loadClubs();
  return { clubId, added: added.length };
}

// ---------------------------------------------------------------------------
// The chain
// ---------------------------------------------------------------------------

export interface Inherited {
  buyIn: Money;
  rules: MoneyRule[];
  /** How coarsely to settle. Null is whole dollars. */
  roundingMode: RoundingMode | null;
  /**
   * What the table plays at. Always answered — a night has to state its blinds
   * somewhere, so the chain runs to the app default rather than to null.
   */
  stakes: Stakes;
  /** Where the buy-in came from, for a screen that wants to say so. */
  from: 'last game' | 'club default' | 'app default';
}

/**
 * What a new night opens with: this game → last game → club default → app
 * default, read top-down and stopping at the first layer that has an answer.
 *
 * The last game's overrides become the next game's SUGGESTION, never the
 * club's setting. If the host ran a $1,000 buy-in one Friday, next Friday
 * offers $1,000 and Settings still says $500 until somebody changes it there.
 */
export async function inheritedFor(club: Club): Promise<Inherited> {
  const db = await getDb();
  const last = await db.getFirstAsync<{
    buy_in: number | null;
    rules_json: string | null;
    rounding_mode: RoundingMode | null;
    stakes_json: string | null;
  }>(
    `SELECT buy_in, rules_json, rounding_mode, stakes_json FROM club_last_game WHERE club_id = ?`,
    club.id,
  );

  /*
   * The stakes run the same three layers, and — like rounding beside them — the
   * middle layer answers only for what it actually recorded. A club_last_game
   * row written before blinds existed says nothing about them, and reading its
   * silence as an answer would let one old row outrank the group's own setting
   * for ever.
   */
  const stakes = readStakes(last?.stakes_json ?? null) ?? club.stakes ?? APP_DEFAULT_STAKES;

  if (last?.buy_in != null) {
    return {
      buyIn: last.buy_in as Money,
      rules: last.rules_json ? (JSON.parse(last.rules_json) as MoneyRule[]) : club.rules,
      /*
       * The middle layer answers only for what it recorded. A club_last_game
       * row written before rounding existed says nothing about it, and reading
       * its null as "whole dollars" would let one old row outrank the setting
       * the group has since made in Settings, for ever.
       */
      roundingMode: last.rounding_mode ?? club.roundingMode,
      stakes,
      from: 'last game',
    };
  }
  if (club.defaultBuyIn !== APP_DEFAULT_BUY_IN) {
    return {
      buyIn: club.defaultBuyIn,
      rules: club.rules,
      roundingMode: club.roundingMode,
      stakes,
      from: 'club default',
    };
  }
  return {
    buyIn: APP_DEFAULT_BUY_IN,
    rules: club.rules,
    roundingMode: club.roundingMode,
    stakes,
    from: 'app default',
  };
}

/**
 * Remember what a night actually ran with, the moment it opens.
 *
 * This is the write that makes "last game" mean the game as played rather than
 * the club as configured — which is the whole point of the middle layer.
 */
export async function rememberLastGame(
  clubId: string,
  buyIn: Money,
  rules: readonly MoneyRule[],
  roundingMode: RoundingMode | null = null,
  stakes: Stakes | null = null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO club_last_game (club_id, buy_in, rules_json, rounding_mode, stakes_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (club_id) DO UPDATE SET buy_in = excluded.buy_in, rules_json = excluded.rules_json,
       rounding_mode = excluded.rounding_mode, stakes_json = excluded.stakes_json`,
    clubId,
    buyIn,
    JSON.stringify(rules),
    roundingMode,
    stakes === null ? null : JSON.stringify(stakes),
  );
}
