import { useSyncExternalStore } from 'react';
import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import {
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

const DB_NAME = 'poker-club.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS night (
          session_id  TEXT PRIMARY KEY NOT NULL,
          group_name  TEXT NOT NULL,
          started_at  TEXT NOT NULL,
          status      TEXT NOT NULL DEFAULT 'open',
          rules_json  TEXT NOT NULL,
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
          PRIMARY KEY (session_id, id)
        );

        CREATE TABLE IF NOT EXISTS night_count (
          session_id  TEXT NOT NULL,
          player_id   TEXT NOT NULL,
          amount      INTEGER NOT NULL,
          PRIMARY KEY (session_id, player_id)
        );

        -- Small facts about this phone rather than about any night. Currently
        -- one: which of the names at the table is the person holding it.
        CREATE TABLE IF NOT EXISTS setting (
          key    TEXT PRIMARY KEY NOT NULL,
          value  TEXT NOT NULL
        );
      `);

      // The two columns O1 sets when a night is opened. Added rather than
      // baked into the CREATE above, because a phone that has already run this
      // app has the old table and its night on it — dropping and recreating
      // would take somebody's ledger with it.
      await addColumn(db, 'night', 'stakes', 'TEXT');
      await addColumn(db, 'night', 'default_buyin', 'INTEGER');

      return db;
    });
  }
  return dbPromise;
}

/** Add a column if this database does not have it yet. */
async function addColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (cols.some((c) => c.name === column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

export interface Night {
  sessionId: string;
  groupName: string;
  startedAt: string;
  status: 'open' | 'counting' | 'settled';
  /** "$5 / $5". Written down at the table, never used in any arithmetic. */
  stakes?: string;
  /** What the keypad offers first. A night can still take any amount. */
  defaultBuyIn: Money;
  players: Player[];
  entries: LedgerEntry[];
  /** The host's end-of-night count, for players still seated. */
  finalCounts: Map<PlayerId, Money>;
  rules: MoneyRule[];
  /** When each entry happened, which is not derivable from its seq. */
  occurredAt: Record<string, string>;
  /** What an expense was for. Display only. */
  noteOf: Record<string, string>;
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
  stakes: string | null;
  default_buyin: number | null;
}

/**
 * The night this phone is showing: the one most recently OPENED.
 *
 * By rowid, not by started_at, and the difference is not academic. A night's
 * start time is a stated fact that can sit anywhere — the seeded sample night
 * claims 20:05 today, so a table opened this afternoon would sort behind a
 * night that has not begun yet, and the app would show the wrong one all
 * evening. Insertion order is the only thing that actually means "latest".
 */
const NEWEST = `SELECT * FROM night ORDER BY rowid DESC LIMIT 1`;

/** What the app falls back to when nothing has ever been played here. */
const FALLBACK_BUYIN = 500 as Money;

/**
 * Open the newest night on this phone, seeding one the first time.
 *
 * NEWEST, not "the only one". A phone now holds every night it has played —
 * that is what makes starting a session a real act rather than a reset — so
 * this reads the most recent and the ones behind it stay where they are.
 *
 * TEMPORARY SEED. Until groups and sessions are real, opening the app for the
 * first time creates a night from `sampleNight` so there is something to look
 * at. It runs once — after that this is the host's own data, and the seed
 * never touches it again.
 */
export async function openNight(): Promise<Night> {
  const db = await getDb();
  let row = await db.getFirstAsync<NightRow>(NEWEST);

  if (!row) {
    const seed = await import('../data/sampleNight');
    await seedNight(seed.SEED);
    row = await db.getFirstAsync<NightRow>(NEWEST);
  }

  night = await readNight(db, row!);
  emit();
  return night;
}

/**
 * Build one night out of its five tables.
 *
 * Separate from openNight because My stats reads every night rather than the
 * current one, and two readers of the same rows that drifted apart would be a
 * genuinely nasty bug: the month would disagree with the night it is made of.
 */
async function readNight(db: SQLite.SQLiteDatabase, row: NightRow): Promise<Night> {
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
  }>(`SELECT * FROM night_entry WHERE session_id = ? ORDER BY seq ASC`, sessionId);

  const counts = await db.getAllAsync<{ player_id: string; amount: number }>(
    `SELECT player_id, amount FROM night_count WHERE session_id = ?`,
    sessionId,
  );

  return {
    sessionId,
    groupName: row.group_name,
    startedAt: row.started_at,
    status: row.status,
    ...(row.stakes ? { stakes: row.stakes } : {}),
    defaultBuyIn: (row.default_buyin ?? FALLBACK_BUYIN) as Money,
    rules: JSON.parse(row.rules_json),
    players: players.map((p) => ({ id: p.id, name: p.name, atTable: p.at_table === 1 })),
    entries: entries.map((e) => ({
      id: e.id,
      seq: e.seq,
      type: e.type,
      playerId: e.player_id,
      payerId: e.payer_id,
      amount: e.amount as Money,
      correctsEntryId: e.corrects_entry_id,
    })),
    finalCounts: new Map(counts.map((c) => [c.player_id, c.amount as Money])),
    occurredAt: Object.fromEntries(entries.map((e) => [e.id, e.occurred_at])),
    noteOf: Object.fromEntries(entries.filter((e) => e.note).map((e) => [e.id, e.note!])),
    ...(row.ack_json ? { acknowledgement: JSON.parse(row.ack_json) } : {}),
  };
}

/**
 * What a night is opened with — O1, "New session".
 *
 * Every field has a sensible answer already, which is the point: the host taps
 * one thing on the home screen and the table is open. Setting it up by hand is
 * the same call with the fields filled in differently.
 */
export interface Setup {
  stakes?: string;
  defaultBuyIn: Money;
  /** Who is at the table before a single chip moves. Names, not accounts. */
  playerNames: string[];
  /** Carried from the last night unless the host says otherwise. */
  rules: MoneyRule[];
}

/**
 * What the last night was played with — the "same as last time" the home card
 * promises, and the prefill behind O1.
 *
 * Rules are carried by VALUE, not by reference: a night's rules are the ones it
 * was opened with, and editing tonight's kitty must not reach back and change
 * what last month settled at. That is the same rule the server enforces with a
 * frozen settlement, applied one step earlier.
 */
export async function lastSetup(): Promise<Setup> {
  const db = await getDb();
  const row = await db.getFirstAsync<NightRow>(NEWEST);
  if (!row) return { defaultBuyIn: FALLBACK_BUYIN, playerNames: [], rules: [] };

  const players = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM night_player WHERE session_id = ? ORDER BY rowid`,
    row.session_id,
  );

  return {
    ...(row.stakes ? { stakes: row.stakes } : {}),
    defaultBuyIn: (row.default_buyin ?? FALLBACK_BUYIN) as Money,
    playerNames: players.map((p) => p.name),
    rules: JSON.parse(row.rules_json) as MoneyRule[],
  };
}

/**
 * Everybody this phone has ever seated, most recently played first.
 *
 * The roster O2 picks from. There is no players table — a player is a name on a
 * night — so this is the union of every night's names, which is exactly what
 * "people you play with" means here.
 */
export async function roster(): Promise<Array<{ name: string; lastPlayed: string; nights: number }>> {
  const db = await getDb();
  return db.getAllAsync<{ name: string; lastPlayed: string; nights: number }>(
    `SELECT p.name           AS name,
            MAX(n.started_at) AS lastPlayed,
            COUNT(*)          AS nights
       FROM night_player p
       JOIN night n ON n.session_id = p.session_id
      GROUP BY lower(trim(p.name))
      ORDER BY lastPlayed DESC`,
  );
}

/**
 * Open a table. The one act that creates a night.
 *
 * Deliberately NOT a reset: the night this replaces stays on the phone with
 * every entry it had. A host who starts a new session while last night is still
 * open has not lost it — it is simply no longer the newest, and the money in it
 * is still there to be counted. Nothing in this app deletes a ledger.
 */
export async function startNight(setup: Setup): Promise<Night> {
  const db = await getDb();
  const sessionId = randomUUID();
  const startedAt = new Date().toISOString();
  const groupName = night?.groupName ?? 'The Poker Club';

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO night (session_id, group_name, started_at, status, rules_json, stakes, default_buyin)
       VALUES (?, ?, ?, 'open', ?, ?, ?)`,
      sessionId,
      groupName,
      startedAt,
      JSON.stringify(setup.rules),
      setup.stakes ?? null,
      setup.defaultBuyIn,
    );

    for (const name of setup.playerNames) {
      // Seated, but in for nothing: they are at the table and have not bought
      // in yet, which is the true state of everyone at 20:05.
      await db.runAsync(
        `INSERT INTO night_player (session_id, id, name, at_table) VALUES (?, ?, ?, 1)`,
        sessionId,
        randomUUID(),
        name,
      );
    }
  });

  return openNight();
}

// ---------------------------------------------------------------------------
// Who is holding the phone
// ---------------------------------------------------------------------------
// My stats is a screen about ONE person, and until now nothing in this app knew
// which person that is. A player is a name the host typed, not an account, so
// the answer is a name — matched across nights case-insensitively, because
// "Dana" and "dana" are one person to everybody at the table.
//
// This is the small local ancestor of X2 "Claim your place". It is not identity
// and it grants nothing: it only decides whose row the stats are about.

const ME = 'me';

export async function whoAmI(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM setting WHERE key = ?`,
    ME,
  );
  // An empty value is how "not me any more" is stored, so it reads as unset.
  return row?.value === undefined || row.value.trim() === '' ? null : row.value;
}

export async function setWhoAmI(name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO setting (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ME,
    name,
  );
  emit();
}

/** One past night, from the reader's point of view. */
export interface PastNight {
  sessionId: string;
  groupName: string;
  startedAt: string;
  /** The last thing that happened. There is no stored end time yet. */
  lastEntryAt: string | null;
  status: Night['status'];
  /** Did the reader play at all? A night can be watched rather than played. */
  played: boolean;
  /**
   * Their result. AFTER deductions once a night is settled, and the gross
   * result before that — the honest figure at each stage, never a mixture.
   */
  net: Money | null;
  settled: boolean;
}

/**
 * Every night on this phone, newest first, reduced to what My stats needs.
 *
 * The nets come from the real settlement engine, one night at a time, rather
 * than from a running total kept somewhere: a figure a player reads about their
 * own month has to be the same arithmetic that decided what they paid on the
 * night, or the two will disagree and the app will be wrong in the only way
 * that matters.
 */
export async function history(): Promise<PastNight[]> {
  const db = await getDb();
  const me = await whoAmI();
  const rows = await db.getAllAsync<NightRow>(`SELECT * FROM night ORDER BY rowid DESC`);

  const out: PastNight[] = [];
  for (const row of rows) {
    const n = await readNight(db, row);
    const mine =
      me === null
        ? undefined
        : n.players.find((p) => p.name.trim().toLowerCase() === me.trim().toLowerCase());

    const lastEntry = n.entries[n.entries.length - 1];
    let net: Money | null = null;

    if (mine !== undefined) {
      const ledger = resolveLedger(n.entries);
      const bought = ledger.boughtInByPlayer.get(mine.id) ?? 0;

      if (bought > 0) {
        if (n.status === 'settled') {
          try {
            const result = settle({
              players: n.players,
              entries: n.entries,
              finalCounts: n.finalCounts,
              rules: n.rules,
              ...(n.acknowledgement ? { acknowledgement: n.acknowledgement } : {}),
            });
            net = result.players.find((p) => p.playerId === mine.id)?.finalPosition ?? null;
          } catch {
            // A settled night that will not re-settle is a bug worth seeing on
            // the results screen, not one worth crashing a stats page over.
            net = null;
          }
        } else {
          // Mid-night there is no result, only what has moved. Cash-outs less
          // buy-ins is the most that can honestly be said.
          net = ((ledger.cashedOutByPlayer.get(mine.id) ?? 0) - bought) as Money;
        }
      }
    }

    out.push({
      sessionId: n.sessionId,
      groupName: n.groupName,
      startedAt: n.startedAt,
      lastEntryAt: lastEntry === undefined ? null : (n.occurredAt[lastEntry.id] ?? null),
      status: n.status,
      played: net !== null,
      net,
      settled: n.status === 'settled',
    });
  }

  return out;
}

interface Seed {
  groupName: string;
  startedAt: string;
  players: Player[];
  entries: Array<Omit<LedgerEntry, 'id' | 'seq'> & { occurredAt: string; note?: string }>;
  rules: MoneyRule[];
}

async function seedNight(seed: Seed): Promise<void> {
  const db = await getDb();
  const sessionId = randomUUID();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO night (session_id, group_name, started_at, status, rules_json)
       VALUES (?, ?, ?, 'open', ?)`,
      sessionId,
      seed.groupName,
      seed.startedAt,
      JSON.stringify(seed.rules),
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
           (session_id, id, seq, type, player_id, payer_id, amount, corrects_entry_id, occurred_at, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        sessionId,
        randomUUID(),
        seq,
        e.type,
        e.playerId ?? null,
        e.payerId ?? null,
        e.amount,
        e.occurredAt,
        e.note ?? null,
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
       (session_id, id, seq, type, player_id, payer_id, amount, corrects_entry_id, occurred_at, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
export function addExpense(payerId: PlayerId, amount: Money, note: string): Promise<void> {
  return append({ type: 'expense', payerId, amount }, new Date(), note);
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
    split: 'evenly',
    collectorPlayerId: '',
    sortOrder,
  };
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

/** What a first buy-in should default to: whatever the table has been buying in for. */
export function defaultBuyIn(ledger: ResolvedLedger): Money {
  const firsts = ledger.entries.filter((e) => !e.voided && e.type === 'buyin').map((e) => e.amount);
  // Nobody has bought in yet, so what the night was OPENED with is the only
  // answer there is — and at 20:05 it is the right one.
  if (firsts.length === 0) return night?.defaultBuyIn ?? money(500);
  // The most common one, not the average: a mean would invent an amount nobody
  // has ever bought in for.
  const tally = new Map<number, number>();
  for (const a of firsts) tally.set(a, (tally.get(a) ?? 0) + 1);
  const [best] = [...tally.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  return money(best[0]);
}
