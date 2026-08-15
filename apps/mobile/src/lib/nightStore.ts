import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
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
} from '@poker-club/core';
import { recordEntry } from './ledgerRepo';
import { CURRENT_NIGHT } from './nightQueries';

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

/*
 * WEB PREVIEW ONLY. expo-sqlite's browser build stores its file in OPFS, which
 * a sandboxed page cannot open — so on web the same SQLite runs in memory
 * instead. It means a browser preview starts from the seed every time it is
 * loaded and remembers nothing, which is what you want from a preview and
 * would be a bug anywhere else. Phones are untouched: they get the real file.
 */
const DB_NAME = Platform.OS === 'web' ? ':memory:' : 'poker-club.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        ${Platform.OS === 'web' ? '' : 'PRAGMA journal_mode = WAL;'}

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
      ]) {
        try {
          await db.execAsync(`ALTER TABLE night ADD COLUMN ${column};`);
        } catch {
          // Already there.
        }
      }

      return db;
    });
  }
  return dbPromise;
}

export interface Night {
  sessionId: string;
  groupName: string;
  startedAt: string;
  status: 'open' | 'counting' | 'settled';
  players: Player[];
  entries: LedgerEntry[];
  /** The host's end-of-night count, for players still seated. */
  finalCounts: Map<PlayerId, Money>;
  rules: MoneyRule[];
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

  const sessionId = row!.session_id;

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

  night = {
    sessionId,
    groupName: row!.group_name,
    startedAt: row!.started_at,
    status: row!.status,
    rules: JSON.parse(row!.rules_json),
    ...(row!.me_id ? { meId: row!.me_id } : {}),
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
    occurredAt: Object.fromEntries(entries.map((e) => [e.id, e.occurred_at])),
    noteOf: Object.fromEntries(entries.filter((e) => e.note).map((e) => [e.id, e.note!])),
    seeded: row!.seed_version !== null,
    ...(row!.ack_json ? { acknowledgement: JSON.parse(row!.ack_json) } : {}),
  };

  emit();
  return night;
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
    for (const table of ['night_count', 'night_entry', 'night_player', 'night_settlement']) {
      await db.runAsync(`DELETE FROM ${table} WHERE session_id = ?`, sessionId);
    }
    await db.runAsync(`DELETE FROM night WHERE session_id = ?`, sessionId);
  });
}

async function seedNight(seed: Seed, seedVersion: number): Promise<void> {
  const db = await getDb();
  const sessionId = randomUUID();

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

    let seq = 0;
    for (const e of seed.entries) {
      seq += 1;
      await db.runAsync(
        `INSERT INTO night_entry
           (session_id, id, seq, type, player_id, payer_id, amount, corrects_entry_id,
            occurred_at, note, covered_by, spend_group)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
        sessionId,
        randomUUID(),
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

/** Mark someone as playing tonight. Idempotent. */
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
}

/**
 * Add somebody to the roster without seating them.
 *
 * The roster outlives a night: it is who the group is. Somebody can be on it
 * and not playing tonight — the treasurer who holds the kitty is exactly that,
 * and so is anyone who came to watch.
 */
export async function addPlayer(name: string): Promise<PlayerId> {
  if (night === null) throw new Error('No night is open.');
  const trimmed = name.trim();

  const existing = night.players.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (existing !== undefined) return existing.id;

  const db = await getDb();
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO night_player (session_id, id, name, at_table) VALUES (?, ?, ?, 0)`,
    night.sessionId,
    id,
    trimmed,
  );
  night = { ...night, players: [...night.players, { id, name: trimmed, atTable: false }] };
  emit();
  return id;
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
 * Who fronted a spend — the four cases from 11-bill-and-kitty.md.
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
      const settled = settle({
        players: night.players,
        entries: night.entries,
        finalCounts: night.finalCounts,
        rules: night.rules,
        ...(night.acknowledgement ? { acknowledgedDiscrepancy: night.acknowledgement } : {}),
      });
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
export async function seatAndBuyIn(name: string, amount: Money): Promise<PlayerId> {
  const id = await addPlayer(name);
  await buyIn(id, amount);
  return id;
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
    name: destination === 'kitty' ? 'Group kitty' : destination === 'bill' ? 'Food & drinks' : 'Host fee',
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
  rules: readonly MoneyRule[];
  seats: ReadonlyArray<{ playerId: PlayerId; name: string; buyIn: Money }>;
  meId?: PlayerId;
}): Promise<void> {
  const db = await getDb();
  const sessionId = randomUUID();
  const startedAt = new Date();

  // The demo is over the moment there is a real game. Leaving it in place put
  // two "open" nights on the phone at once, and the sample — being older — is
  // the one the home screen kept offering.
  const seeded = await db.getAllAsync<{ session_id: string }>(
    `SELECT session_id FROM night WHERE seed_version IS NOT NULL`,
  );
  for (const s of seeded) await forgetNight(s.session_id);

  await db.runAsync(
    `INSERT INTO night (session_id, group_name, started_at, status, rules_json, me_id)
     VALUES (?, ?, ?, 'open', ?, ?)`,
    sessionId,
    input.groupName,
    startedAt.toISOString(),
    JSON.stringify(input.rules),
    input.meId ?? null,
  );

  for (const seat of input.seats) {
    await db.runAsync(
      `INSERT INTO night_player (session_id, id, name, at_table) VALUES (?, ?, ?, 1)`,
      sessionId,
      seat.playerId,
      seat.name,
    );
  }

  // Everything after this point is the ledger's own business, so the night is
  // loaded first and the buy-ins are appended through the same path every
  // other entry takes.
  const previous = night;
  night = {
    sessionId,
    groupName: input.groupName,
    startedAt: startedAt.toISOString(),
    status: 'open',
    players: input.seats.map((s) => ({ id: s.playerId, name: s.name, atTable: true })),
    entries: [],
    finalCounts: new Map(),
    rules: [...input.rules],
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
           (session_id, group_name, started_at, status, rules_json, ack_json, stakes, default_buyin, ended_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        n.sessionId,
        n.groupName,
        n.startedAt,
        n.status,
        JSON.stringify(n.rules),
        n.acknowledgement === undefined ? null : JSON.stringify(n.acknowledgement),
        n.stakes,
        n.defaultBuyIn,
        n.endedAt,
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
  await db.runAsync(`UPDATE night SET status = ? WHERE session_id = ?`, status, night.sessionId);
  night = { ...night, status };
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
export { lastRebuyAmount } from '@poker-club/core';
export { standardBuyIn as defaultBuyIn } from '@poker-club/core';
