import { useSyncExternalStore } from 'react';
import type * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { database } from './db';
import { money, type Money, type MoneyRule, type PlayerId } from '@poker-club/core';

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
  name: string;
  currency: string;
  /** The club's own default, which the app default fills in when unset. */
  defaultBuyIn: Money;
  rules: MoneyRule[];
  members: Member[];
}

/** What the app falls back to when a club has said nothing. */
export const APP_DEFAULT_BUY_IN = money(500);

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
      name: c.name,
      currency: c.currency,
      defaultBuyIn: (c.default_buy_in ?? APP_DEFAULT_BUY_IN) as Money,
      rules: JSON.parse(c.rules_json) as MoneyRule[],
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
    await db.runAsync(
      `INSERT INTO club_member (club_id, id, name, standing, invited, pays_kitty, removed)
       VALUES (?, ?, ?, 'name_only', 0, 1, 0)`,
      id,
      randomUUID(),
      name.trim(),
    );
  }

  await loadClubs();
  await switchClub(id);
  return id;
}

export async function renameClub(clubId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club SET name = ? WHERE id = ?`, name.trim(), clubId);
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
 * Add somebody by name. They exist immediately and can play the same evening —
 * naming comes first and the invite second, always.
 */
export async function addMember(clubId: string, name: string): Promise<PlayerId> {
  const db = await getDb();
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO club_member (club_id, id, name, standing, invited, pays_kitty, removed)
     VALUES (?, ?, ?, 'name_only', 0, 1, 0)`,
    clubId,
    id,
    name.trim(),
  );
  await loadClubs();
  return id;
}

export async function renameMember(clubId: string, id: PlayerId, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE club_member SET name = ? WHERE club_id = ? AND id = ?`,
    name.trim(),
    clubId,
    id,
  );
  await loadClubs();
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
  await loadClubs();
}

/** Removing keeps their nights. Unsettled amounts stay on the night they came from. */
export async function removeMember(clubId: string, id: PlayerId): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE club_member SET removed = 1 WHERE club_id = ? AND id = ?`, clubId, id);
  await loadClubs();
}

// ---------------------------------------------------------------------------
// The chain
// ---------------------------------------------------------------------------

export interface Inherited {
  buyIn: Money;
  rules: MoneyRule[];
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
  const last = await db.getFirstAsync<{ buy_in: number | null; rules_json: string | null }>(
    `SELECT buy_in, rules_json FROM club_last_game WHERE club_id = ?`,
    club.id,
  );

  if (last?.buy_in != null) {
    return {
      buyIn: last.buy_in as Money,
      rules: last.rules_json ? (JSON.parse(last.rules_json) as MoneyRule[]) : club.rules,
      from: 'last game',
    };
  }
  if (club.defaultBuyIn !== APP_DEFAULT_BUY_IN) {
    return { buyIn: club.defaultBuyIn, rules: club.rules, from: 'club default' };
  }
  return { buyIn: APP_DEFAULT_BUY_IN, rules: club.rules, from: 'app default' };
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
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO club_last_game (club_id, buy_in, rules_json) VALUES (?, ?, ?)
     ON CONFLICT (club_id) DO UPDATE SET buy_in = excluded.buy_in, rules_json = excluded.rules_json`,
    clubId,
    buyIn,
    JSON.stringify(rules),
  );
}
