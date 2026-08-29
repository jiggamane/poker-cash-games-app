import { useEffect, useSyncExternalStore } from 'react';
import type * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { database } from './db';
import {
  formatMoney,
  money,
  resolveLedger,
  settle,
  type LedgerEntry,
  type Money,
  type MoneyRule,
  type DiscrepancyAcknowledgement,
  type Player,
  type PlayerId,
  type ResolvedLedger,
  type RoundingMode,
  type SettlementInput,
} from '@poker-club/core';
import { outbox, recordEntry } from './ledgerRepo';
import { queuePlayer, queueSessionOpen } from './sync';
import {
  CURRENT_NIGHT,
  FIRST_TABLE,
  renamedForSecondTable,
  uniqueTableName,
} from './whichNight';

/**
 * The night, on this phone.
 *
 * This is the READ MODEL. The outbox is a send queue — entries leave it once
 * the server has them — so it cannot also be what the screens render from, or
 * a successful sync would empty the app. Everything the host records lands
 * here first and stays, and syncing is a separate concern that can fail all
 * evening without anybody noticing.
 *
 * Nothing in here does arithmetic. Totals, positions and settlement all come
 * from @poker-club/core, which is tested; a screen that added up its own
 * column would be a second, untested implementation of the same sum.
 */

/** The night's tables, on the app's one connection. See `db.ts`. */
const getDb = (): Promise<SQLite.SQLiteDatabase> =>
  database('night', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS night (
        session_id  TEXT PRIMARY KEY NOT NULL,
        group_name  TEXT NOT NULL,
        started_at  TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'open',
        rules_json  TEXT NOT NULL,
        -- Which player row is the person holding this phone. Null until
        -- somebody claims their place; nothing in the money depends on it,
        -- only on which figures a screen calls yours.
        me_id       TEXT,
        -- The host's confirmation of money that could not be accounted for.
        -- Part of the night's record, not a UI flag: it is what allows a
        -- night that does not add up to be closed at all.
        ack_json    TEXT
      );

      CREATE TABLE IF NOT EXISTS night_player (
        session_id  TEXT NOT NULL,
        id          TEXT NOT NULL,
        name        TEXT NOT NULL,
        at_table    INTEGER NOT NULL,
        PRIMARY KEY (session_id, id)
      );

      -- Append-only, exactly as on the server: a correction is a new row.
      CREATE TABLE IF NOT EXISTS night_entry (
        session_id        TEXT NOT NULL,
        id                TEXT NOT NULL,
        seq               INTEGER NOT NULL,
        type              TEXT NOT NULL,
        player_id         TEXT,
        payer_id          TEXT,
        amount            INTEGER NOT NULL,
        corrects_entry_id TEXT,
        occurred_at       TEXT NOT NULL,
        -- What the money was for: "Pizza", "Drinks". Display only — the
        -- engine never reads it, which is why it is not on LedgerEntry.
        note              TEXT,
        -- A spend with no person behind it: 'kitty' or 'unpaid'. Mirrors the
        -- server column added in migration 0004.
        covered_by        TEXT,
        -- Ties the several fronters of one spend back into one thing bought.
        spend_group       TEXT,
        PRIMARY KEY (session_id, id)
      );

      CREATE TABLE IF NOT EXISTS night_count (
        session_id  TEXT NOT NULL,
        player_id   TEXT NOT NULL,
        amount      INTEGER NOT NULL,
        PRIMARY KEY (session_id, player_id)
      );

      -- Who has actually handed over the money — E7.
      --
      -- SETTLING AND PAYING ARE SEPARATE. The book closes at the table and the
      -- cash moves over the following week, so this is not a ledger entry and
      -- it changes no figure: a settled night stays settled whether or not
      -- anybody has paid. One row per transfer that HAS been paid; a transfer
      -- with no row here is waiting.
      --
      -- Keyed by the pair, which is safe because the settlement gives a
      -- debtor and a creditor at most one transfer between them: paying
      -- someone either finishes the debtor or empties the creditor.
      CREATE TABLE IF NOT EXISTS night_payment (
        session_id     TEXT NOT NULL,
        from_player_id TEXT NOT NULL,
        to_player_id   TEXT NOT NULL,
        paid_at        TEXT NOT NULL,
        PRIMARY KEY (session_id, from_player_id, to_player_id)
      );

      -- What a settled night settled at, frozen at the moment it closed.
      --
      -- Only ever written for nights that arrive from the server: a night
      -- this phone recorded is recomputed from its own rows on demand, and
      -- there is nothing to preserve. A pulled night, though, may one day
      -- meet a newer settlement engine, and the figures the room actually
      -- paid each other are not a thing a later version gets to revise.
      CREATE TABLE IF NOT EXISTS night_settlement (
        session_id  TEXT PRIMARY KEY NOT NULL,
        computed_at TEXT NOT NULL,
        payload     TEXT NOT NULL
      );
    `);

    /*
     * Phones that already hold a night were created before the bill was
     * redrawn, and CREATE TABLE IF NOT EXISTS will not add a column to them.
     * Adding it twice is the expected outcome on every later launch, so the
     * failure is the success case and is swallowed on purpose.
     */
    for (const column of ['covered_by TEXT', 'spend_group TEXT']) {
      try {
        await db.execAsync(`ALTER TABLE night_entry ADD COLUMN ${column};`);
      } catch {
        // Already there.
      }
    }
    for (const column of [
      'me_id TEXT',
      // Which sample night this is, or NULL if it is a real one. See
      // SEED_VERSION in data/sampleNight.
      'seed_version INTEGER',
      // Carried by nights arriving from the server. A night this phone
      // recorded has them on its session row upstream; locally they are
      // display only, which is why they may be null on every existing row.
      'stakes TEXT',
      'default_buyin INTEGER',
      'ended_at TEXT',
      // What this table is called. A club can run two at once, so the club's
      // name (group_name) is not enough to tell them apart. Null on every
      // row written before tables had names, which reads as "Tonight".
      'table_name TEXT',
      // How coarsely this night settles, copied off the club when it opened.
      // Null on every night recorded before the setting existed, and null
      // reads as whole dollars — which is exactly what those nights ran at,
      // so an old night re-derives to the figures it closed with.
      'rounding_mode TEXT',
    ]) {
      try {
        await db.execAsync(`ALTER TABLE night ADD COLUMN ${column};`);
      } catch {
        // Already there.
      }
    }

  });

export interface Night {
  sessionId: string;
  groupName: string;
  /**
   * What this table is called — "Tonight" while it is the only one, a name the
   * host gives it once the club is running two. Distinct per open table: it is
   * the only thing telling two cards on home apart.
   */
  tableName: string;
  startedAt: string;
  /** When the game stopped being played, set the moment counting starts. */
  endedAt?: string;
  status: 'open' | 'counting' | 'settled';
  players: Player[];
  entries: LedgerEntry[];
  /** The host's end-of-night count, for players still seated. */
  finalCounts: Map<PlayerId, Money>;
  /**
   * When each settled-up transfer was paid — E7. Keyed by `transferKey`, and
   * absent means waiting. It settles nothing: a night is settled by its
   * ledger, and this is the week afterwards.
   */
  paidAt: Map<string, string>;
  rules: MoneyRule[];
  /**
   * How coarsely this night settles — the group's rounding rule, snapshotted
   * when the night opened, exactly like the rules beside it. Null is whole
   * dollars. Changing the club's setting never moves a night already running.
   */
  roundingMode: RoundingMode | null;
  /**
   * The player row this device belongs to, when it is known. It decides whose
   * figures a screen calls yours — never what any of them are.
   */
  meId?: PlayerId;
  /** When each entry happened, which is not derivable from its seq. */
  occurredAt: Record<string, string>;
  /** What an expense was for. Display only. */
  noteOf: Record<string, string>;
  /**
   * True while this is the demo night the app seeds itself with. It exists so
   * there is a club to start from and a screen to hold against the canonical
   * frame — it is never the host's own game, and the home screen must not
   * offer it as tonight's.
   */
  seeded: boolean;
  /**
   * Set only when the count did not balance and the host confirmed what was
   * missing. Without it, `settle()` refuses to run — that refusal is the close
   * gate, and it lives in the engine so no screen can route around it.
   */
  acknowledgement?: DiscrepancyAcknowledgement;
}

// ---------------------------------------------------------------------------
// The store: one night in memory, with subscribers.
//
// A module-level store rather than a React context, because these screens are
// separate routes: a provider would have to sit above the router and every
// sheet would have to be inside it. useSyncExternalStore keeps it plain.
// ---------------------------------------------------------------------------

let night: Night | null = null;
let listeners = new Set<() => void>();

const emit = () => {
  for (const l of listeners) l();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const snapshot = () => night;

/** The night this phone is holding, or null while it loads. */
export function useNight(): Night | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** The resolved ledger, which is what almost every screen actually wants. */
export function useLedger(): ResolvedLedger | null {
  const n = useNight();
  return n === null ? null : resolveLedger(n.entries);
}

export const nameOf = (n: Night | null, id: PlayerId | null | undefined): string =>
  n?.players.find((p) => p.id === id)?.name ?? 'Someone';

/**
 * The night, as the engine wants it.
 *
 * ONE ASSEMBLY, read by every screen that settles. Ten screens were each
 * building this object by hand, which was fine while it had four fields and
 * stopped being fine the moment it had five: a screen that forgot the group's
 * rounding rule would show a different set of figures from the screen beside
 * it, and the host would have no way of telling which was the night.
 */
export function settlementInput(n: Night): SettlementInput {
  return {
    players: n.players,
    entries: n.entries,
    finalCounts: n.finalCounts,
    rules: n.rules,
    ...(n.roundingMode === null ? {} : { roundingMode: n.roundingMode }),
    ...(n.acknowledgement ? { acknowledgedDiscrepancy: n.acknowledgement } : {}),
  };
}

export { isTonight, FIRST_TABLE, MAIN_TABLE, tableNameProblem } from './whichNight';

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

interface NightRow {
  session_id: string;
  group_name: string;
  started_at: string;
  status: Night['status'];
  rules_json: string;
  ack_json: string | null;
  me_id: string | null;
  /** Non-null only on the sample night. See SEED_VERSION in data/sampleNight. */
  seed_version: number | null;
  table_name: string | null;
  ended_at: string | null;
  /** What a seat cost. Carried by pulled nights; null on locally started ones. */
  default_buyin: number | null;
  /** How coarsely to settle. Null is whole dollars. */
  rounding_mode: RoundingMode | null;
}

/**
 * Open the night on this phone, seeding one the first time.
 *
 * TEMPORARY SEED. Until groups and sessions are real, opening the app for the
 * first time creates a night from `sampleNight` so there is something to look
 * at. It runs once — after that this is the host's own data, and the seed
 * never touches it again.
 */
export async function openNight(): Promise<Night> {
  const db = await getDb();
  let row = await db.getFirstAsync<NightRow>(CURRENT_NIGHT);

  /*
   * Lay down the sample night, or replace one that has gone stale.
   *
   * The second half matters more than the first. Seeding only when the database
   * is empty means a phone keeps whichever demo night it met on its very first
   * launch, and every build after that arrives looking unchanged however much
   * the seed has moved — which is exactly what happened while this app was
   * being drawn.
   *
   * A night the host STARTED has no seed_version and is never in scope here. A
   * seeded one is demo data by definition, so replacing it loses nothing.
   */
  if (row === null || row.seed_version !== null) {
    // Loaded lazily so the sample night stays out of the main bundle; a build
    // with a real night in it never pulls the chunk at all.
    const seed = await import('../data/sampleNight');
    if (row === null || row.seed_version! < seed.SEED_VERSION) {
      if (row !== null) await forgetNight(row.session_id);
      await seedNight(seed.SEED, seed.SEED_VERSION);
      row = await db.getFirstAsync<NightRow>(CURRENT_NIGHT);
    }
  }

  night = await readNight(row!);
  emit();
  return night;
}

/**
 * Make one of the club's other tables the one every screen is looking at.
 *
 * A club can have two games open at once, and every screen below home —
 * Tonight, the bill, the ending flow — reads "the night" from this store. So
 * choosing a table on home is this call: the store swaps which night it holds,
 * and the screens that follow are about that table without knowing there was a
 * choice. It is the same load path as `openNight`, by id instead of by rule.
 */
export async function openNightById(sessionId: string): Promise<Night | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<NightRow>(
    `SELECT * FROM night WHERE session_id = ?`,
    sessionId,
  );
  if (row === null) return null;
  night = await readNight(row);
  emit();
  return night;
}

/**
 * Every table this club has open, newest first.
 *
 * Home draws one card per game, so it needs a list rather than the one night
 * the store is holding — and the figures on those cards have to agree with the
 * screens they lead to. So each one is READ AND RESOLVED THROUGH THE ENGINE,
 * exactly as the session screen does it, rather than counted with a clever
 * SELECT: a seat count derived twice is two implementations of the same sum,
 * and the one on home would be the untested one.
 *
 * There are never many. Two tables is the case this exists for, three is a
 * long night, and a settled night is not in the list at all.
 */
export interface OpenGame {
  sessionId: string;
  tableName: string;
  startedAt: string;
  endedAt: string | null;
  status: 'open' | 'counting';
  /** People with money in front of them right now. */
  seated: number;
  /** Everyone who played, which is what "2 of 6 stacks" counts against. */
  played: number;
  /** Stacks counted so far, for a night that has ended. */
  counted: number;
  /** What a seat costs at this table, when the night recorded one. */
  buyIn: Money | null;
}

let games: OpenGame[] = [];
const gameListeners = new Set<() => void>();
const gamesSnapshot = (): OpenGame[] => games;
const subscribeGames = (l: () => void): (() => void) => {
  gameListeners.add(l);
  return () => {
    gameListeners.delete(l);
  };
};

/** Re-read the list. Called whenever the night store changes underneath it. */
export async function refreshOpenGames(): Promise<OpenGame[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NightRow>(
    `SELECT * FROM night
      WHERE status != 'settled' AND seed_version IS NULL
      ORDER BY started_at DESC`,
  );

  const next: OpenGame[] = [];
  for (const row of rows) {
    const n = await readNight(row);
    const ledger = resolveLedger(n.entries);
    const standings = standingsOf(n, ledger).filter((st) => st.played);
    next.push({
      sessionId: n.sessionId,
      tableName: n.tableName,
      startedAt: n.startedAt,
      endedAt: n.endedAt ?? null,
      status: n.status === 'counting' ? 'counting' : 'open',
      seated: standings.filter((st) => st.atTable).length,
      played: standings.length,
      counted: n.finalCounts.size,
      buyIn: (row.default_buyin as Money | null) ?? null,
    });
  }

  games = next;
  for (const l of gameListeners) l();
  return games;
}

/**
 * The tables on this phone, kept current.
 *
 * The list is derived from the same rows the night store writes, so it is
 * re-read whenever that store emits — a buy-in changes a seat count, ending a
 * night moves a card from live to counting, and neither should need a screen
 * to remember to ask again.
 */
export function useOpenGames(): OpenGame[] {
  const current = useNight();
  useEffect(() => {
    void refreshOpenGames().catch(() => {});
  }, [current]);
  return useSyncExternalStore(subscribeGames, gamesSnapshot, gamesSnapshot);
}

/** Read one night off the database. Touches nothing: the caller decides. */
async function readNight(row: NightRow): Promise<Night> {
  const db = await getDb();
  const sessionId = row.session_id;

  const players = await db.getAllAsync<{ id: string; name: string; at_table: number }>(
    `SELECT id, name, at_table FROM night_player WHERE session_id = ? ORDER BY rowid`,
    sessionId,
  );

  const entries = await db.getAllAsync<{
    id: string;
    seq: number;
    type: LedgerEntry['type'];
    player_id: string | null;
    payer_id: string | null;
    amount: number;
    corrects_entry_id: string | null;
    occurred_at: string;
    note: string | null;
    covered_by: 'kitty' | 'unpaid' | null;
    spend_group: string | null;
  }>(`SELECT * FROM night_entry WHERE session_id = ? ORDER BY seq ASC`, sessionId);

  const counts = await db.getAllAsync<{ player_id: string; amount: number }>(
    `SELECT player_id, amount FROM night_count WHERE session_id = ?`,
    sessionId,
  );

  const paid = await db.getAllAsync<{ from_player_id: string; to_player_id: string; paid_at: string }>(
    `SELECT from_player_id, to_player_id, paid_at FROM night_payment WHERE session_id = ?`,
    sessionId,
  );

  return {
    sessionId,
    groupName: row.group_name,
    tableName: row.table_name ?? FIRST_TABLE,
    startedAt: row.started_at,
    ...(row.ended_at ? { endedAt: row.ended_at } : {}),
    status: row.status,
    rules: JSON.parse(row.rules_json),
    roundingMode: row.rounding_mode ?? null,
    ...(row.me_id ? { meId: row.me_id } : {}),
    players: players.map((p) => ({ id: p.id, name: p.name, atTable: p.at_table === 1 })),
    entries: entries.map((e) => ({
      id: e.id,
      seq: e.seq,
      type: e.type,
      playerId: e.player_id,
      payerId: e.payer_id,
      amount: e.amount as Money,
      correctsEntryId: e.corrects_entry_id,
      coveredBy: e.covered_by,
      spendGroup: e.spend_group,
    })),
    finalCounts: new Map(counts.map((c) => [c.player_id, c.amount as Money])),
    paidAt: new Map(paid.map((p) => [transferKey(p.from_player_id, p.to_player_id), p.paid_at])),
    occurredAt: Object.fromEntries(entries.map((e) => [e.id, e.occurred_at])),
    noteOf: Object.fromEntries(entries.filter((e) => e.note).map((e) => [e.id, e.note!])),
    seeded: row.seed_version !== null,
    ...(row.ack_json ? { acknowledgement: JSON.parse(row.ack_json) } : {}),
  };
}

interface Seed {
  groupName: string;
  startedAt: string;
  players: Player[];
  entries: Array<Omit<LedgerEntry, 'id' | 'seq'> & { occurredAt: string; note?: string }>;
  rules: MoneyRule[];
  meId?: PlayerId;
}

/** Drop a night and everything hanging off it. Only ever a stale seed. */
async function forgetNight(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const table of [
      'night_count',
      'night_entry',
      'night_payment',
      'night_player',
      'night_settlement',
    ]) {
      await db.runAsync(`DELETE FROM ${table} WHERE session_id = ?`, sessionId);
    }
    await db.runAsync(`DELETE FROM night WHERE session_id = ?`, sessionId);
  });
}

async function seedNight(seed: Seed, seedVersion: number): Promise<void> {
  const db = await getDb();
  const sessionId = randomUUID();

  let seq = 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO night (session_id, group_name, started_at, status, rules_json, me_id, seed_version)
       VALUES (?, ?, ?, 'open', ?, ?, ?)`,
      sessionId,
      seed.groupName,
      seed.startedAt,
      JSON.stringify(seed.rules),
      seed.meId ?? null,
      seedVersion,
    );

    for (const p of seed.players) {
      await db.runAsync(
        `INSERT INTO night_player (session_id, id, name, at_table) VALUES (?, ?, ?, ?)`,
        sessionId,
        p.id,
        p.name,
        p.atTable ? 1 : 0,
      );
    }

    for (const e of seed.entries) {
      seq += 1;
      await db.runAsync(
        `INSERT INTO night_entry
           (session_id, id, seq, type, player_id, payer_id, amount, corrects_entry_id,
            occurred_at, note, covered_by, spend_group)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
        sessionId,
        // NAMED, not random. The seed's players already have `seed-` ids, and
        // an entry with a fresh UUID every install is the one part of the
        // fixture nothing can point at — the frame check cannot open the
        // correction sheet on a known line, and a bug report cannot name the
        // row it happened on. Ids only have to be unique within a session, and
        // a stale seed is deleted before this runs.
        `seed-entry-${seq}`,
        seq,
        e.type,
        e.playerId ?? null,
        e.payerId ?? null,
        e.amount,
        e.occurredAt,
        e.note ?? null,
        e.coveredBy ?? null,
        e.spendGroup ?? null,
      );
    }
  });

  // The seed writes straight into the ledger, so the queue has never seen
  // these seqs. Told about them, the next entry the host makes continues the
  // night's numbering instead of starting again at 1 on top of it.
  await outbox.noteSeq(sessionId, seq);
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Record one entry: locally first, then queued for the server.
 *
 * The order matters. The local write is what the host sees, and it must not
 * depend on a network that is not there — a kitchen at 1am is exactly where
 * the signal goes. `recordEntry` puts it in the outbox and returns immediately.
 */
async function append(
  draft: Omit<LedgerEntry, 'id' | 'seq'>,
  occurredAt: Date = new Date(),
  note?: string,
): Promise<void> {
  if (night === null) throw new Error('No night is open.');
  const db = await getDb();

  const entry = await recordEntry(night.sessionId, draft, occurredAt);

  await db.runAsync(
    `INSERT INTO night_entry
       (session_id, id, seq, type, player_id, payer_id, amount, corrects_entry_id,
        occurred_at, note, covered_by, spend_group)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    night.sessionId,
    entry.id,
    entry.seq,
    entry.type,
    entry.playerId ?? null,
    entry.payerId ?? null,
    entry.amount,
    entry.correctsEntryId ?? null,
    occurredAt.toISOString(),
    note ?? null,
    entry.coveredBy ?? null,
    entry.spendGroup ?? null,
  );

  night = {
    ...night,
    entries: [...night.entries, entry],
    occurredAt: { ...night.occurredAt, [entry.id]: occurredAt.toISOString() },
    noteOf: note === undefined ? night.noteOf : { ...night.noteOf, [entry.id]: note },
  };
  emit();
}

/**
 * Chips on the table, from the ledger — never a running total kept by hand.
 *
 * A buy-in seats whoever it is for. Being at the table and having money on it
 * are the same fact, and keeping them as two would let a player be charged a
 * share of the bill while officially not playing.
 */
export async function buyIn(playerId: PlayerId, amount: Money): Promise<void> {
  await seat(playerId);
  return append({ type: 'buyin', playerId, amount });
}

/**
 * Mark someone as playing tonight. Idempotent.
 *
 * QUEUED AS WELL AS WRITTEN. Their seat is a row on the server —
 * `session_seat` — and the buy-in that put them there is queued a moment later
 * with a foreign key pointing at it. Only a night OPENING used to queue seats,
 * so anybody who sat down after the first hand had their money arrive ahead of
 * the seat it belonged to, which the server refuses; the queue then halts, and
 * halts on every night behind it.
 */
export async function seat(playerId: PlayerId): Promise<void> {
  if (night === null) return;
  const player = night.players.find((p) => p.id === playerId);
  if (player === undefined || player.atTable) return;

  const db = await getDb();
  await db.runAsync(
    `UPDATE night_player SET at_table = 1 WHERE session_id = ? AND id = ?`,
    night.sessionId,
    playerId,
  );
  night = {
    ...night,
    players: night.players.map((p) => (p.id === playerId ? { ...p, atTable: true } : p)),
  };
  emit();

  await queuePlayer(night.sessionId, night.groupName, {
    id: playerId,
    name: player.name,
    atTable: true,
  });
}

/**
 * Put somebody in tonight's night without seating them.
 *
 * They can be in it and not playing — the treasurer who holds the piggy bank is
 * exactly that, and so is anyone who came to watch.
 *
 * THE ID COMES FROM THE ROSTER where there is one. The group's list of people
 * is `clubStore`'s, not this file's, and a night that minted its own id for
 * somebody the group already knows made a second person out of one human:
 * their nights split in two, their stats halved, and the name appearing twice
 * the moment both lists were on one screen. `rosterIdFor` resolves the name to
 * the row the group already has and hands the id down here.
 */
export async function addPlayer(name: string, playerId?: PlayerId): Promise<PlayerId> {
  if (night === null) throw new Error('No night is open.');
  const trimmed = name.trim();

  const existing = night.players.find(
    (p) => p.id === playerId || p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing !== undefined) return existing.id;

  const db = await getDb();
  const id = playerId ?? randomUUID();
  await db.runAsync(
    `INSERT INTO night_player (session_id, id, name, at_table) VALUES (?, ?, ?, 0)`,
    night.sessionId,
    id,
    trimmed,
  );
  night = { ...night, players: [...night.players, { id, name: trimmed, atTable: false }] };
  emit();

  // In the book, but in no seat. `player` is a row on the book and needs no
  // session behind it, which is exactly what somebody not playing yet is.
  await queuePlayer(night.sessionId, night.groupName, { id, name: trimmed, atTable: false });
  return id;
}

/**
 * A name changed on the roster, in every night still in play.
 *
 * A SETTLED NIGHT IS NEVER TOUCHED. It is immutable — the figures were agreed
 * and paid under the names it carries — so a rename applies from here forward
 * and the book keeps what it said at the time.
 *
 * Every table still running does move, not only the one loaded: a club can run
 * two at once, and a name that changed on one screen and not the other is the
 * confusion this whole file is being joined up to end.
 */
export async function renamePlayerInPlay(id: PlayerId, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === '') return;

  const db = await getDb();
  await db.runAsync(
    `UPDATE night_player SET name = ?
      WHERE id = ?
        AND session_id IN (SELECT session_id FROM night WHERE status != 'settled')`,
    trimmed,
    id,
  );

  if (night === null || night.status === 'settled') return;
  night = {
    ...night,
    players: night.players.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
  };
  emit();
}

/**
 * Somebody removed from the group, taken out of the nights they had not yet
 * played in.
 *
 * REMOVING KEEPS EVERY NIGHT THEY PLAYED — `12-the-group.md` is explicit, and
 * an unsettled amount stays on the night it came from. So this deletes only a
 * row that carries nothing: not at the table, no entry of theirs anywhere in
 * that night, and the night not settled. Anything else is left exactly where it
 * is, which is why this is a no-op far more often than not.
 */
export async function dropPlayerFromPlay(id: PlayerId): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM night_player
      WHERE id = ?
        AND at_table = 0
        AND session_id IN (SELECT session_id FROM night WHERE status != 'settled')
        AND NOT EXISTS (
          SELECT 1 FROM night_entry e
           WHERE e.session_id = night_player.session_id
             AND (e.player_id = night_player.id OR e.payer_id = night_player.id))`,
    id,
  );

  if (night === null || night.status === 'settled') return;
  const gone =
    (await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM night_player WHERE session_id = ? AND id = ?`,
      night.sessionId,
      id,
    )) === null;
  if (!gone) return;

  night = { ...night, players: night.players.filter((p) => p.id !== id) };
  emit();
}

/**
 * Restate an entry without erasing it.
 *
 * The ledger is append-only, here and on the server, and this is why: a host
 * who mistypes $5,000 for $500 at midnight must be able to fix it, and every
 * player must still be able to see that it was fixed. A correction writes a
 * new row pointing at the old one; both stay in the feed.
 */
export function correctEntry(entryId: string, amount: Money): Promise<void> {
  return append({ type: 'correction', correctsEntryId: entryId, amount });
}

/** The same, for an entry that should never have existed at all. */
export function voidEntry(entryId: string): Promise<void> {
  return append({ type: 'void', correctsEntryId: entryId, amount: money(0) });
}

export function rebuy(playerId: PlayerId, amount: Money): Promise<void> {
  return append({ type: 'rebuy', playerId, amount });
}

export function cashOut(playerId: PlayerId, amount: Money): Promise<void> {
  return append({ type: 'cashout', playerId, amount });
}

/**
 * Something somebody bought for the table.
 *
 * The bill rule's own `amount` is never used for a reimbursing bill — the
 * engine takes the real sum of these entries — so adding one here changes what
 * is charged at settle-up without anybody editing a rule.
 */
/**
 * Who fronted a spend — the four cases from 11-bill-and-piggy-bank.md.
 *
 * `players` carries one row per fronter, and those rows must sum to the spend:
 * that is what lets each of them be repaid exactly what they put in. `kitty`
 * and `unpaid` have nobody to repay, which is why they are the other shape
 * rather than a player row with a funny id.
 */
export type Cover =
  | { kind: 'players'; shares: Array<{ playerId: PlayerId; amount: Money }> }
  | { kind: 'kitty' }
  | { kind: 'unpaid' };

export class SpendError extends Error {}

/**
 * Add a spend to tonight's bill. L2.
 *
 * The time is stamped here, on save — there is no time field on the screen and
 * no way to back-date a round of drinks. A spend covered by several people
 * becomes several entries sharing one `spendGroup`, because the ledger records
 * money moving from a person, and two people fronting a bar tab is two
 * movements even though it was one bar tab.
 */
export async function addSpend(amount: Money, note: string, cover: Cover): Promise<void> {
  const at = new Date();
  const text = note.trim();

  if (cover.kind !== 'players') {
    await append({ type: 'expense', amount, coveredBy: cover.kind }, at, text);
    return;
  }

  const shares = cover.shares.filter((s) => s.amount > 0);
  if (shares.length === 0) throw new SpendError('Nobody is down for any of it.');

  const fronted = shares.reduce((sum, s) => sum + s.amount, 0);
  if (fronted !== amount) {
    throw new SpendError(
      `The fronted amounts come to ${formatMoney(fronted as Money)}, not ${formatMoney(amount)}.`,
    );
  }

  // One entry is the whole spend and needs no group; several do.
  const group = shares.length === 1 ? undefined : randomUUID();
  for (const s of shares) {
    await append(
      {
        type: 'expense',
        amount: s.amount,
        payerId: s.playerId,
        ...(group === undefined ? {} : { spendGroup: group }),
      },
      at,
      text,
    );
  }
}

/** A night as it appears in a list of your own — 1A/1B, and My stats. */
export interface MyNight {
  sessionId: string;
  groupName: string;
  /** "Thu 13 August". */
  date: string;
  /** "13/8", for the chart's axis. */
  short: string;
  /** "20:05 – 00:15", or the start alone while the night is still running. */
  times: string;
  /** False for a night of this club you sat out. */
  played: boolean;
  /** Your net after deductions. Zero on a night you did not play. */
  result: Money;
  /** When it started, ISO — what `myStats` counts calendar months by. */
  startedAt: string;
  /** How long the table ran, in minutes. Zero while it is still running. */
  minutes: number;
}

/**
 * Your nights, most recent last.
 *
 * ONE NIGHT, FOR NOW. This phone holds the session it is recording and nothing
 * else — history arrives with the server — so this is honest rather than
 * complete: it reads what is here, works out your result the same way the
 * results screen does, and returns a list of one. The screens above it are
 * built for many and will not change when many arrive.
 *
 * `withinDays` bounds the period; null is all time.
 */
export function myNights(night: Night | null, withinDays: number | null): MyNight[] {
  if (night === null || night.status !== 'settled') return [];

  const started = new Date(night.startedAt);
  if (withinDays !== null) {
    const age = (Date.now() - started.getTime()) / 86_400_000;
    if (age > withinDays) return [];
  }

  let result = 0 as Money;
  let played = false;

  if (night.meId !== undefined) {
    try {
      const settled = settle(settlementInput(night));
      const me = settled.players.find((p) => p.playerId === night.meId);
      if (me !== undefined) {
        result = me.finalPosition;
        played = true;
      }
    } catch {
      // A night that will not settle has no result to show. It still appears,
      // as a night you were at, with no figure beside it.
      played = false;
    }
  }

  const last = [...night.entries].sort((a, b) => b.seq - a.seq)[0];
  const ended = last === undefined ? undefined : night.occurredAt[last.id];

  return [
    {
      sessionId: night.sessionId,
      groupName: night.groupName,
      date: started.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }),
      short: `${started.getDate()}/${started.getMonth() + 1}`,
      times:
        ended === undefined
          ? hhmm(night.startedAt)
          : `${hhmm(night.startedAt)} – ${hhmm(ended)}`,
      played,
      result,
      startedAt: night.startedAt,
      minutes:
        ended === undefined
          ? 0
          : Math.max(0, Math.round((Date.parse(ended) - started.getTime()) / 60_000)),
    },
  ];
}

const hhmm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** One thing the night bought, however many people put money towards it. */
export interface Spend {
  /** The group id where there is one, else the single entry's id. */
  id: string;
  entryIds: string[];
  amount: Money;
  /** May be empty — a spend with no note shows as its amount alone. */
  note: string;
  /** "21:48", which is when it was stamped on save. */
  at: string;
  occurredAt: string;
  coveredBy: 'kitty' | 'unpaid' | null;
  fronters: Array<{ playerId: PlayerId; amount: Money }>;
}

/**
 * The bill, as spends rather than as ledger rows.
 *
 * Several people fronting one bar tab is several movements of money and so
 * several entries — that is what makes each of them repaid exactly what they
 * put in — but it is one line on the bill, so they are gathered back up here.
 * Voided entries drop out entirely; the ledger keeps them, the bill does not.
 */
export function spendsOf(night: Night, ledger: ResolvedLedger): Spend[] {
  const spends = new Map<string, Spend>();

  for (const e of ledger.entries) {
    if (e.type !== 'expense' || e.voided) continue;

    const id = e.spendGroup ?? e.id;
    const at = night.occurredAt[e.id] ?? night.startedAt;
    const existing = spends.get(id);

    if (existing === undefined) {
      spends.set(id, {
        id,
        entryIds: [e.id],
        amount: e.amount,
        note: night.noteOf[e.id] ?? '',
        at: new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        occurredAt: at,
        coveredBy: e.coveredBy ?? null,
        fronters: e.payerId ? [{ playerId: e.payerId, amount: e.amount }] : [],
      });
      continue;
    }

    existing.entryIds.push(e.id);
    existing.amount = (existing.amount + e.amount) as Money;
    if (e.payerId) existing.fronters.push({ playerId: e.payerId, amount: e.amount });
  }

  return [...spends.values()].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

/**
 * Take a spend off the bill. L3.
 *
 * Nothing is deleted: a void is a new row against each entry of the spend, and
 * the original lines stay in the ledger where anybody can still see what was
 * claimed and when it was withdrawn.
 */
export async function voidSpend(entryIds: readonly string[]): Promise<void> {
  for (const id of entryIds) await voidEntry(id);
}

/**
 * Seat someone who was not playing, and log their first buy-in.
 *
 * One act, not two: a player with no buy-in is not at the table, and the
 * design's button says so — "Seat Kuba · log buy-in".
 */
export async function seatAndBuyIn(
  name: string,
  amount: Money,
  playerId?: PlayerId,
): Promise<PlayerId> {
  const id = await addPlayer(name, playerId);
  await buyIn(id, amount);
  return id;
}

/**
 * How one transfer is named, in the one place that decides it.
 *
 * The settlement is recomputed from the ledger every time anybody looks at it,
 * so a payment cannot point at a transfer by identity — there isn't one. It
 * points at the pair, and this is the only spelling of that.
 */
export const transferKey = (from: PlayerId, to: PlayerId): string => `${from}>${to}`;

/**
 * Mark one transfer paid — E7.
 *
 * NOT A LEDGER ENTRY, and deliberately not append-only: nothing about the
 * night's result depends on it, so there is nothing here that needs to be
 * unfalsifiable. The book closed at the table; this is the cash arriving over
 * the following week.
 *
 * WHAT IS NOT BUILT: unmarking. E7 draws Mark paid on waiting rows and draws
 * nothing on paid ones, so there is no way back from a mis-tap. Flagged rather
 * than invented — but it is a real trap and the state that answers it is on
 * the handoff's own "not drawn" list.
 */
export async function markPaid(from: PlayerId, to: PlayerId): Promise<void> {
  if (night === null) return;
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO night_payment (session_id, from_player_id, to_player_id, paid_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (session_id, from_player_id, to_player_id) DO NOTHING`,
    night.sessionId,
    from,
    to,
    new Date().toISOString(),
  );
  const row = await db.getFirstAsync<NightRow>(
    `SELECT * FROM night WHERE session_id = ?`,
    night.sessionId,
  );
  if (row === null) return;
  night = await readNight(row);
  emit();
}

/** The host's end-of-night count for one player. Overwrites: counting again is normal. */
export async function setFinalCount(playerId: PlayerId, amount: Money): Promise<void> {
  if (night === null) throw new Error('No night is open.');
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO night_count (session_id, player_id, amount) VALUES (?, ?, ?)
     ON CONFLICT (session_id, player_id) DO UPDATE SET amount = excluded.amount`,
    night.sessionId,
    playerId,
    amount,
  );

  const finalCounts = new Map(night.finalCounts);
  finalCounts.set(playerId, amount);
  night = { ...night, finalCounts };
  emit();

  // Any confirmation of a shortfall is now about a total that no longer
  // exists. The engine would reject it as stale; withdrawing it here means the
  // host is asked again about the number they are actually looking at.
  if (night.acknowledgement !== undefined) await setAcknowledgement(null);
}

/**
 * The host has looked at money that cannot be accounted for and said so.
 *
 * Stored with the night rather than held in a screen's state: it is part of
 * the record of what happened, it is what a player is entitled to see later,
 * and `settle()` will not run without it. Pass null to withdraw it — which is
 * what has to happen the moment a count changes, because an acknowledgement of
 * $150 is not an acknowledgement of $90.
 */
export async function setAcknowledgement(
  ack: DiscrepancyAcknowledgement | null,
): Promise<void> {
  if (night === null) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE night SET ack_json = ? WHERE session_id = ?`,
    ack === null ? null : JSON.stringify(ack),
    night.sessionId,
  );
  const { acknowledgement: _dropped, ...rest } = night;
  night = ack === null ? rest : { ...rest, acknowledgement: ack };
  emit();
}

/**
 * Add or replace a money rule.
 *
 * Rules are stored with the NIGHT, not with the group, and that is deliberate:
 * a night is settled with the rules it opened with, so a change made in
 * October cannot quietly restate what everyone agreed in September. When
 * groups exist, opening a session will copy the group's rules into it, and
 * this is what edits the copy.
 */
export async function saveRule(rule: MoneyRule): Promise<void> {
  if (night === null) throw new Error('No night is open.');
  const rules = night.rules.some((r) => r.id === rule.id)
    ? night.rules.map((r) => (r.id === rule.id ? rule : r))
    : [...night.rules, rule];
  await writeRules(rules);
}

export async function deleteRule(ruleId: string): Promise<void> {
  if (night === null) return;
  await writeRules(night.rules.filter((r) => r.id !== ruleId));
}

export async function toggleRule(ruleId: string, active: boolean): Promise<void> {
  if (night === null) return;
  await writeRules(night.rules.map((r) => (r.id === ruleId ? { ...r, active } : r)));
}

/**
 * What one person carries of one rule, decided by hand at the end of the night.
 *
 * THE COUNT IS THE COUNT; A SHARE IS A DECISION. Nothing here can move a chip
 * count or a gross result — those come off the table. What it moves is a
 * SHARE, and the engine takes it from there: the named person pays exactly
 * this, and on a rule with a fixed total to cover the difference is re-divided
 * between the people who have NOT been named, by the rule's own split. So a
 * host correcting Petr's bill share never leaves the bar short, and never
 * silently restates a figure somebody else already agreed to.
 *
 * Pass null to withdraw it and put that person back on the split.
 *
 * It is written onto TONIGHT's snapshot of the rule and never onto the club's,
 * for the same reason a sit-out is: it is an answer about one night, and next
 * week's game must open from the rule the group actually has.
 */
export async function setManualCharge(
  ruleId: string,
  playerId: PlayerId,
  amount: Money | null,
): Promise<void> {
  if (night === null) return;
  await writeRules(
    night.rules.map((r) => {
      if (r.id !== ruleId) return r;
      const rest = (r.manualCharges ?? []).filter((m) => m.playerId !== playerId);
      const next = amount === null ? rest : [...rest, { playerId, amount }];
      // Dropped entirely when empty rather than left as [], so a rule nobody
      // has touched is byte-identical to the one the night opened with.
      const { manualCharges: _cleared, ...bare } = r;
      return next.length === 0 ? bare : { ...bare, manualCharges: next };
    }),
  );
}

/** Put everybody on this rule back on its split. */
export async function clearManualCharges(ruleId: string): Promise<void> {
  if (night === null) return;
  await writeRules(
    night.rules.map((r) => {
      if (r.id !== ruleId) return r;
      const { manualCharges: _cleared, ...bare } = r;
      return bare;
    }),
  );
}

/**
 * How coarsely TONIGHT settles.
 *
 * A night is settled with what it opened with, so this changes tonight and
 * nothing else — the club's own default is set in Settings and reaches the
 * next night. It is stored on the session row beside the rules, which is what
 * carries it into the frozen record when the night closes.
 */
export async function setNightRounding(mode: RoundingMode | null): Promise<void> {
  if (night === null) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE night SET rounding_mode = ? WHERE session_id = ?`,
    mode,
    night.sessionId,
  );
  night = { ...night, roundingMode: mode };
  emit();
}

async function writeRules(rules: MoneyRule[]): Promise<void> {
  if (night === null) return;
  const ordered = [...rules].sort((a, b) => a.sortOrder - b.sortOrder);
  const db = await getDb();
  await db.runAsync(
    `UPDATE night SET rules_json = ? WHERE session_id = ?`,
    JSON.stringify(ordered),
    night.sessionId,
  );
  night = { ...night, rules: ordered };
  emit();
}

/** A blank rule, ready to be filled in. */
export function draftRule(destination: MoneyRule['destination'], sortOrder: number): MoneyRule {
  return {
    id: randomUUID(),
    name: destination === 'kitty' ? 'Group piggy bank' : destination === 'bill' ? 'Food & drinks' : 'Host fee',
    active: true,
    amountKind: destination === 'bill' ? 'fixed' : 'percent',
    amount: (destination === 'bill' ? 0 : 10) as Money,
    basis: 'gross',
    charge: 'winners_only',
    destination,
    // S62: by size of win, not evenly between the winners. `by_percent` is the
    // stored name for it — see `splitSentence()` in core for why the value and
    // the label are allowed to differ.
    split: 'by_percent',
    collectorPlayerId: '',
    sortOrder,
  };
}

/**
 * Open a night for a club. S64, S65.
 *
 * A NIGHT COPIES, IT DOES NOT REFERENCE. Every rule the club carries is
 * snapshotted onto the session here, at birth, and from this moment the night
 * owns them: a later change to the club cannot alter what is running in the
 * kitchen, and can never alter what has been settled.
 *
 * Starting a game is therefore adding players and their first buy-ins, which
 * is all this takes — the rules arrived by inheritance and want no form.
 */
export async function startNight(input: {
  clubId: string;
  groupName: string;
  /** What to call this table. Empty means the first one, which is "Tonight". */
  tableName?: string;
  /**
   * What a seat costs here. Recorded on the night because home states it on a
   * card the moment a club has two tables — the whole reason the figure is on
   * the card is that it now differs between them.
   */
  buyIn?: Money;
  /**
   * What the table plays at, already in words — "$5 / $5", or with the
   * straddle after it.
   *
   * A STRING, AND DELIBERATELY. The blinds are the one setting on a night that
   * nothing computes with: no clock, no schedule, no figure in the settlement
   * reads them. What they are for is being stated — on the night, and to a
   * watcher, whose `session.stakes` column upstream is text and has always
   * been. Formatting needs the club's currency symbol, which lives in
   * `clubStore`; resolving it in the caller keeps this file from reaching
   * across into another store's tables, exactly as `nameOfCollector` does.
   */
  stakes?: string;
  rules: readonly MoneyRule[];
  /**
   * How coarsely the group settles, copied onto the night at birth like the
   * rules. Omitted — a caller written before the setting existed — is whole
   * dollars, which is what every night so far has run at.
   */
  roundingMode?: RoundingMode | null;
  seats: ReadonlyArray<{ playerId: PlayerId; name: string; buyIn: Money }>;
  meId?: PlayerId;
  /**
   * When the game began. Defaults to now, which since 29 August is what every
   * night gets: O1 used to carry an editable *Start time* row and no longer
   * does — the stamp is taken when the table is opened, because that is the
   * moment somebody is standing at the table pressing the button.
   *
   * The parameter stays for a caller that knows better than the clock — a
   * night restored from the server carries its own — and because the figure is
   * not cosmetic: the elapsed clock and every entry's stamp read from it.
   */
  startedAt?: Date;
  /**
   * What to call a rule's collector who is not playing tonight. The roster
   * lives in `clubStore`, so the caller resolves the name rather than this
   * reaching across into another store's tables.
   */
  nameOfCollector?: (id: PlayerId) => string | undefined;
}): Promise<void> {
  const db = await getDb();
  const sessionId = randomUUID();
  const startedAt = input.startedAt ?? new Date();

  // The demo is over the moment there is a real game. Leaving it in place put
  // two "open" nights on the phone at once, and the sample — being older — is
  // the one the home screen kept offering.
  const seeded = await db.getAllAsync<{ session_id: string }>(
    `SELECT session_id FROM night WHERE seed_version IS NOT NULL`,
  );
  for (const s of seeded) await forgetNight(s.session_id);

  /*
   * A CLUB CAN RUN TWO TABLES, so this adds a night rather than replacing one.
   *
   * What it has to do first is settle the names. While one game is running it
   * is called "Tonight", which is a time and not a name — the moment a second
   * one opens, the two cards on home are told apart by nothing else, and
   * "Tonight" cannot mean this table when the other one is also tonight. So
   * any table still carrying the default becomes the main one, which is what
   * it is: the table that was already going.
   */
  const others = await db.getAllAsync<{ session_id: string; table_name: string | null }>(
    `SELECT session_id, table_name FROM night
      WHERE status != 'settled' AND seed_version IS NULL`,
  );
  const taken = others.map((o) => o.table_name ?? FIRST_TABLE);
  for (const other of others) {
    const wanted = renamedForSecondTable(other.table_name ?? FIRST_TABLE);
    if (wanted === null) continue;
    // More than one table can be carrying the default — a phone that has been
    // opening nights since before tables had names has a row of them — and
    // renaming them all to the same thing swaps one indistinguishable pair for
    // another.
    const renamed = uniqueTableName(wanted, taken);
    taken.push(renamed);
    await db.runAsync(
      `UPDATE night SET table_name = ? WHERE session_id = ?`,
      renamed,
      other.session_id,
    );
    if (night?.sessionId === other.session_id) night = { ...night, tableName: renamed };
  }

  const tableName =
    others.length === 0
      ? FIRST_TABLE
      : uniqueTableName((input.tableName ?? '').trim() || FIRST_TABLE, taken);

  await db.runAsync(
    `INSERT INTO night
       (session_id, group_name, table_name, started_at, status, rules_json, me_id, default_buyin,
        stakes, rounding_mode)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)`,
    sessionId,
    input.groupName,
    tableName,
    startedAt.toISOString(),
    JSON.stringify(input.rules),
    input.meId ?? null,
    input.buyIn ?? null,
    input.stakes ?? null,
    input.roundingMode ?? null,
  );

  for (const seat of input.seats) {
    await db.runAsync(
      `INSERT INTO night_player (session_id, id, name, at_table) VALUES (?, ?, ?, 1)`,
      sessionId,
      seat.playerId,
      seat.name,
    );
  }

  /*
   * THE PEOPLE WHO HOLD MONEY BUT DO NOT PLAY.
   *
   * A rule names one person who physically holds what it takes — the piggy bank's
   * treasurer, whoever collects a host fee — and `12-the-group.md` is explicit
   * that they need not be playing. The sample night says the same thing in its
   * own data: Radka is `atTable: false`, holds the piggy bank, never sits down.
   *
   * Only the seats were being written, so the moment a host started a real
   * game the inherited piggy bank rule named somebody who was not in the night at
   * all, and `settle()` refused it: "names a collector who is not in the player
   * list". That refusal is correct — money cannot go to a person the night has
   * never heard of — and it arrived at the END of the evening, as an
   * unexplained loop between counting up and the deductions screen, with the
   * night unclosable and no way back.
   *
   * So a collector who is not seated joins the night as a participant who is
   * not at the table: counted by nothing, charged nothing, and able to receive
   * what the rule collects. They never appear on Tonight, which lists only
   * people who have played.
   */
  const seated = new Set(input.seats.map((s) => s.playerId));
  const collectors = new Map<PlayerId, string>();
  for (const rule of input.rules) {
    if (!rule.active) continue;
    const id = rule.collectorPlayerId;
    if (id === '' || seated.has(id) || collectors.has(id)) continue;
    collectors.set(id, input.nameOfCollector?.(id) ?? 'The group');
  }

  for (const [id, name] of collectors) {
    await db.runAsync(
      `INSERT INTO night_player (session_id, id, name, at_table) VALUES (?, ?, ?, 0)`,
      sessionId,
      id,
      name,
    );
  }

  const players = [
    ...input.seats.map((s) => ({ id: s.playerId, name: s.name, atTable: true })),
    ...[...collectors].map(([id, name]) => ({ id, name, atTable: false })),
  ];

  /** What the table bought in for, where the night itself was not told. */
  const biggest = input.seats.reduce<number | undefined>(
    (max, s) => (s.buyIn > 0 && (max === undefined || s.buyIn > max) ? s.buyIn : max),
    undefined,
  );

  /*
   * THE NIGHT'S EXISTENCE, QUEUED BEFORE ITS MONEY.
   *
   * The book, the session, everybody in it, their seats and the rules it opened
   * with — all of it ahead of the first buy-in in the same one queue, because
   * that is the order the server's foreign keys require. `sync.ts` has been
   * able to send this since the server half landed and nothing ever called it,
   * so a host signed in recorded entries that reached a server with no session
   * to put them in: the insert was refused, the queue halted at it, and every
   * night behind it stayed on the phone for ever.
   */
  await queueSessionOpen({
    sessionId,
    groupName: input.groupName,
    startedAt: startedAt.toISOString(),
    // NEVER ZERO: `session.default_buyin` is checked greater than zero, and a
    // night opened without one — the buy-in is optional here and nullable in
    // the local column — would be refused and halt the queue at the head. What
    // the table actually bought in for is the honest answer when nobody said.
    defaultBuyIn: input.buyIn ?? biggest ?? money(500),
    ...(input.stakes === undefined ? {} : { stakes: input.stakes }),
    players,
    rules: input.rules,
    // Sent as well as stored. `sync.ts` has carried this since the server half
    // landed and this — its only caller — was not passing it, so every night a
    // signed-in host opened reached the server saying it settled in whole
    // dollars whatever the group had actually set.
    roundingMode: input.roundingMode ?? null,
  });

  // Everything after this point is the ledger's own business, so the night is
  // loaded first and the buy-ins are appended through the same path every
  // other entry takes.
  const previous = night;
  night = {
    sessionId,
    groupName: input.groupName,
    tableName,
    startedAt: startedAt.toISOString(),
    status: 'open',
    players,
    entries: [],
    finalCounts: new Map(),
    paidAt: new Map(),
    rules: [...input.rules],
    roundingMode: input.roundingMode ?? null,
    ...(input.meId === undefined ? {} : { meId: input.meId }),
    occurredAt: {},
    noteOf: {},
    seeded: false,
  };
  emit();

  try {
    for (const seat of input.seats) {
      if (seat.buyIn > 0) await buyIn(seat.playerId, seat.buyIn);
    }
  } catch (e) {
    night = previous;
    emit();
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Nights arriving FROM the server
// ---------------------------------------------------------------------------
// The other direction, and the half that makes claiming a place mean anything:
// somebody who has just taken their seat has an empty phone, and every screen
// in this app reads from these tables. So a pull writes into them and nothing
// else has to know it happened.
//
// NEVER OVERWRITES. A night this phone already holds is skipped whole — the
// device that recorded a night is the authority on it, and a pull that could
// restate a local ledger would be the one way this app loses money. The host
// pulling their own book therefore gets nothing back, which is correct.

export interface ImportedNight {
  sessionId: string;
  groupName: string;
  startedAt: string;
  endedAt: string | null;
  status: Night['status'];
  stakes: string | null;
  defaultBuyIn: number;
  rules: MoneyRule[];
  players: Array<{ id: string; name: string; atTable: boolean }>;
  entries: Array<LedgerEntry & { occurredAt: string; note: string | null }>;
  counts: Array<{ playerId: string; amount: number }>;
  acknowledgement?: DiscrepancyAcknowledgement;
  /** How coarsely it was settled. Absent is whole dollars. */
  roundingMode?: RoundingMode | null;
}

/** How many nights this phone did not already have. */
export async function importNights(nights: readonly ImportedNight[]): Promise<number> {
  const db = await getDb();
  let added = 0;

  for (const n of nights) {
    const existing = await db.getFirstAsync<{ session_id: string }>(
      `SELECT session_id FROM night WHERE session_id = ?`,
      n.sessionId,
    );
    if (existing) continue;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO night
           (session_id, group_name, started_at, status, rules_json, ack_json, stakes, default_buyin, ended_at,
            rounding_mode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        n.sessionId,
        n.groupName,
        n.startedAt,
        n.status,
        JSON.stringify(n.rules),
        n.acknowledgement === undefined ? null : JSON.stringify(n.acknowledgement),
        n.stakes,
        n.defaultBuyIn,
        n.endedAt,
        n.roundingMode ?? null,
      );

      // The people, too. A roster is what a group IS, and somebody reading
      // their own nights should see the names they played them against.
      for (const p of n.players) {
        await db.runAsync(
          `INSERT OR IGNORE INTO night_player (session_id, id, name, at_table) VALUES (?, ?, ?, ?)`,
          n.sessionId,
          p.id,
          p.name,
          p.atTable ? 1 : 0,
        );
      }

      for (const e of n.entries) {
        await db.runAsync(
          `INSERT OR IGNORE INTO night_entry
             (session_id, id, seq, type, player_id, payer_id, amount, corrects_entry_id,
              occurred_at, note, covered_by, spend_group)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          n.sessionId,
          e.id,
          e.seq,
          e.type,
          e.playerId ?? null,
          e.payerId ?? null,
          e.amount,
          e.correctsEntryId ?? null,
          e.occurredAt,
          e.note,
          e.coveredBy ?? null,
          e.spendGroup ?? null,
        );
      }

      for (const c of n.counts) {
        await db.runAsync(
          `INSERT OR IGNORE INTO night_count (session_id, player_id, amount) VALUES (?, ?, ?)`,
          n.sessionId,
          c.playerId,
          c.amount,
        );
      }
    });

    added += 1;

    /*
     * Freeze what a settled night settled at.
     *
     * Recomputed here rather than carried down the wire, and that is safe for
     * one reason only: settlement is a pure, versioned function of the rows
     * above, so the same inputs give the same result on any device. The rules
     * came from the night's own snapshot, not from what the group uses today.
     *
     * A night that will not recompute is left without a frozen record instead
     * of blocking the import — the ledger is still there and still readable,
     * which is more than the alternative leaves.
     */
    if (n.status === 'settled') {
      try {
        const result = settle({
          players: n.players.map((p) => ({ id: p.id, name: p.name, atTable: p.atTable })),
          entries: n.entries,
          finalCounts: new Map(n.counts.map((c) => [c.playerId, c.amount as Money])),
          rules: n.rules,
          ...(n.roundingMode == null ? {} : { roundingMode: n.roundingMode }),
          ...(n.acknowledgement ? { acknowledgedDiscrepancy: n.acknowledgement } : {}),
        });
        await db.runAsync(
          `INSERT INTO night_settlement (session_id, computed_at, payload) VALUES (?, ?, ?)
             ON CONFLICT (session_id) DO NOTHING`,
          n.sessionId,
          n.endedAt ?? n.startedAt,
          JSON.stringify(result),
        );
      } catch {
        // Left unfrozen on purpose. See above.
      }
    }
  }

  if (added > 0) await openNight();
  return added;
}

export async function setStatus(status: Night['status']): Promise<void> {
  if (night === null) return;
  const db = await getDb();

  /*
   * COUNTING IS WHEN THE GAME STOPPED. Home says "ended 23:52" on a night that
   * is holding money, and until now nothing wrote that moment down: the row
   * had a started_at and the app inferred the rest. A host settling up the
   * next morning needs the time the cards stopped, not the time they looked.
   * Stamped once — a night that goes back to counting keeps the first answer.
   */
  const endedAt = status === 'counting' ? (night.endedAt ?? new Date().toISOString()) : night.endedAt;

  await db.runAsync(
    `UPDATE night SET status = ?, ended_at = ? WHERE session_id = ?`,
    status,
    endedAt ?? null,
    night.sessionId,
  );
  night = { ...night, status, ...(endedAt === undefined ? {} : { endedAt }) };
  emit();
}

/**
 * Where everyone stands, as one answer.
 *
 * Every screen was asking this its own way — "at the table" meant a flag on
 * the player in one place, a positive buy-in in another, and money not yet
 * cashed out in a third. They disagree in exactly the cases that matter:
 *
 *   BUSTING OUT. A player who loses their stack cashes out for ZERO. Reading
 *   "has cashed out" as "cashed out more than nothing" leaves them sitting at
 *   a table they walked away from, and the close flow then waits forever for
 *   a count of chips they do not have.
 *
 *   COMING BACK. Somebody who busts and buys in again is normal, and by then
 *   they have both a cash-out and a later buy-in. Whether they are at the
 *   table is decided by WHICH CAME LAST, not by whether either exists.
 */
export interface Standing {
  id: PlayerId;
  name: string;
  /** Everything they have put on the table tonight. */
  boughtIn: Money;
  /** Everything they have taken off it, across every time they left. */
  cashedOut: Money;
  /** Do they have chips in front of them right now? */
  atTable: boolean;
  /** Have they played at all tonight, or are they only on the roster? */
  played: boolean;
  /** How many times they have gone back to the table for more. */
  rebuys: number;
  /** True once they have left and come back. */
  returned: boolean;
}

export function standingsOf(night: Night, ledger: ResolvedLedger): Standing[] {
  return night.players
    .map((p) => {
      const mine = ledger.entries.filter((e) => !e.voided && e.playerId === p.id);
      const buys = mine.filter((e) => e.type === 'buyin' || e.type === 'rebuy');
      const outs = mine.filter((e) => e.type === 'cashout');

      const lastBuy = buys.length === 0 ? -1 : Math.max(...buys.map((e) => e.seq));
      const lastOut = outs.length === 0 ? -1 : Math.max(...outs.map((e) => e.seq));

      return {
        id: p.id,
        name: p.name,
        boughtIn: (ledger.boughtInByPlayer.get(p.id) ?? 0) as Money,
        cashedOut: (ledger.cashedOutByPlayer.get(p.id) ?? 0) as Money,
        atTable: lastBuy > lastOut,
        played: buys.length > 0,
        rebuys: Math.max(0, buys.length - 1),
        returned: outs.length > 0 && lastBuy > lastOut,
      };
    })
    .filter((s) => s.played || night.players.find((p) => p.id === s.id)?.atTable === true);
}

/** One person's standing, or undefined if they have not played. */
export function standingOf(
  night: Night,
  ledger: ResolvedLedger,
  playerId: PlayerId,
): Standing | undefined {
  return standingsOf(night, ledger).find((s) => s.id === playerId);
}

/**
 * How deep somebody is, in the words the design uses.
 *
 * "buy-in + 2 rebuys" rather than a number, because that is what the host says
 * out loud when they are asked.
 */
export function depthOf(ledger: ResolvedLedger, playerId: PlayerId): string {
  const mine = ledger.entries.filter((e) => !e.voided && e.playerId === playerId);
  const buys = mine.filter((e) => e.type === 'buyin' || e.type === 'rebuy');
  const outs = mine.filter((e) => e.type === 'cashout');

  const lastBuy = buys.length === 0 ? -1 : Math.max(...buys.map((e) => e.seq));
  const lastOut = outs.length === 0 ? -1 : Math.max(...outs.map((e) => e.seq));
  const rebuys = Math.max(0, buys.length - 1);

  if (buys.length === 0) return 'on the roster';

  if (lastOut > lastBuy) {
    const counted = ledger.cashedOutByPlayer.get(playerId) ?? 0;
    return counted === 0
      ? 'busted out'
      : `cashed out · counted ${counted.toLocaleString("en-US")}`;
  }

  const back = outs.length > 0 ? 'back in · ' : '';
  return rebuys === 0
    ? `${back}buy-in`
    : `${back}buy-in + ${rebuys} ${rebuys === 1 ? 'rebuy' : 'rebuys'}`;
}

/**
 * The most anyone can take off the table.
 *
 * You cannot cash out chips that are not there. This is the same figure the
 * close flow reconciles against, and catching an impossible count HERE — while
 * the player is still standing in the room — is worth far more than catching
 * it at 1am when everyone has gone home.
 */
export function chipsOnTable(ledger: ResolvedLedger): Money {
  return (ledger.totalBoughtIn - ledger.totalCashedOut) as Money;
}

/*
 * Both of these are pure reads over a resolved ledger, so they live in the
 * money core where they are tested, and are re-exported here because every
 * screen already reaches for the store.
 */
export { lastRebuyAmount, rebuyPrefill } from '@poker-club/core';
export { standardBuyIn as defaultBuyIn } from '@poker-club/core';
