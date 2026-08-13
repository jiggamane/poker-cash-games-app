import { useSyncExternalStore } from 'react';
import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import {
  money,
  resolveLedger,
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
          -- Groups the fronters of one spend, so a pizza two people split is
          -- one line on the bill and two reimbursements at settle-up.
          spend_id          TEXT,
          -- 'kitty' or 'unpaid' on a spend no player fronted.
          covered_by        TEXT,
          PRIMARY KEY (session_id, id)
        );

        CREATE TABLE IF NOT EXISTS night_count (
          session_id  TEXT NOT NULL,
          player_id   TEXT NOT NULL,
          amount      INTEGER NOT NULL,
          PRIMARY KEY (session_id, player_id)
        );
      `);

      // The two columns above arrived after the first release, and SQLite has
      // no IF NOT EXISTS for a column — so try, and ignore the duplicate.
      for (const column of ['spend_id TEXT', 'covered_by TEXT']) {
        await db.execAsync(`ALTER TABLE night_entry ADD COLUMN ${column}`).catch(() => {});
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
  let row = await db.getFirstAsync<NightRow>(`SELECT * FROM night LIMIT 1`);

  if (!row) {
    const seed = await import('../data/sampleNight');
    await seedNight(seed.SEED);
    row = await db.getFirstAsync<NightRow>(`SELECT * FROM night LIMIT 1`);
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
    spend_id: string | null;
    covered_by: LedgerEntry['coveredBy'];
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
    players: players.map((p) => ({ id: p.id, name: p.name, atTable: p.at_table === 1 })),
    entries: entries.map((e) => ({
      id: e.id,
      seq: e.seq,
      type: e.type,
      playerId: e.player_id,
      payerId: e.payer_id,
      amount: e.amount as Money,
      correctsEntryId: e.corrects_entry_id,
      spendId: e.spend_id,
      coveredBy: e.covered_by,
    })),
    finalCounts: new Map(counts.map((c) => [c.player_id, c.amount as Money])),
    occurredAt: Object.fromEntries(entries.map((e) => [e.id, e.occurred_at])),
    noteOf: Object.fromEntries(entries.filter((e) => e.note).map((e) => [e.id, e.note!])),
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
       (session_id, id, seq, type, player_id, payer_id, amount, corrects_entry_id, occurred_at,
        note, spend_id, covered_by)
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
    entry.spendId ?? null,
    entry.coveredBy ?? null,
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

/** Who put the money up for one spend. */
export type Cover =
  | { kind: 'players'; shares: ReadonlyArray<{ playerId: PlayerId; amount: Money }> }
  | { kind: 'kitty' }
  | { kind: 'unpaid' };

/**
 * One spend on the bill — L2.
 *
 * Several people can front one pizza, and each has to be paid back exactly
 * what they put in, so each fronter is their own ledger entry. `spendId` is
 * what makes them one line on the bill rather than three, and the same stamp
 * on all of them is what keeps them together in time.
 *
 * The shares must sum to the spend. The screen blocks Save until they do; this
 * refuses anyway, because a bill that does not add up is how money goes
 * missing between six people at 1am.
 */
export async function addSpend(amount: Money, note: string, cover: Cover): Promise<void> {
  if (night === null) throw new Error('No night is open.');
  const spendId = randomUUID();
  const at = new Date();

  if (cover.kind !== 'players') {
    await append({ type: 'expense', amount, spendId, coveredBy: cover.kind }, at, note);
    return;
  }

  const total = cover.shares.reduce((n, s) => n + s.amount, 0);
  if (total !== amount) {
    throw new Error(`The fronted amounts come to ${total}, not ${amount}.`);
  }
  for (const share of cover.shares) {
    if (share.amount <= 0) continue;
    await append(
      { type: 'expense', payerId: share.playerId, amount: share.amount, spendId },
      at,
      note,
    );
  }
}

/**
 * All the entries that make up one spend, oldest first.
 *
 * A spend written before `spendId` existed is a single entry and is its own
 * group, which is why the fallback is the entry's own id.
 */
export const spendIdOf = (e: { id: string; spendId?: string | null }): string => e.spendId ?? e.id;

/** One line on the bill: what it was, what it cost, and who put the money up. */
export interface Spend {
  /** The group id, which is the single entry's own id when it has no group. */
  id: string;
  amount: Money;
  /** Absent when the host typed no note. The row then shows the amount alone. */
  note?: string;
  at: string;
  /** 'players' means somebody is owed it back; the other two mean nobody is. */
  cover: 'players' | 'kitty' | 'unpaid';
  fronters: ReadonlyArray<{ playerId: PlayerId; amount: Money; entryId: string }>;
  /** Every entry behind it, so a correction can reach the right row. */
  entryIds: readonly string[];
}

/**
 * The bill, as lines rather than as ledger rows.
 *
 * Newest at the bottom, in ledger order — the order things were bought in is
 * the order somebody remembers them in.
 */
export function spendsOf(n: Night, ledger: ResolvedLedger): Spend[] {
  const byGroup = new Map<string, Spend>();

  for (const e of ledger.entries) {
    if (e.type !== 'expense' || e.voided) continue;
    const id = spendIdOf(e);
    const existing = byGroup.get(id);

    if (existing === undefined) {
      byGroup.set(id, {
        id,
        amount: e.amount,
        note: n.noteOf[e.id],
        at: n.occurredAt[e.id] ?? '',
        cover: e.coveredBy ?? 'players',
        fronters:
          e.coveredBy != null ? [] : [{ playerId: e.payerId!, amount: e.amount, entryId: e.id }],
        entryIds: [e.id],
      });
      continue;
    }

    byGroup.set(id, {
      ...existing,
      amount: (existing.amount + e.amount) as Money,
      note: existing.note ?? n.noteOf[e.id],
      fronters:
        e.coveredBy != null
          ? existing.fronters
          : [...existing.fronters, { playerId: e.payerId!, amount: e.amount, entryId: e.id }],
      entryIds: [...existing.entryIds, e.id],
    });
  }

  return [...byGroup.values()];
}

/**
 * Rename a spend — the Note row on L3.
 *
 * The note is NOT ledger data: no amount depends on it and the engine never
 * reads it, which is why it is a column on the row rather than an entry of its
 * own. Editing it in place is therefore not a hole in the append-only rule —
 * every figure on the bill still only ever changes by correction.
 */
export async function renameSpend(spendId: string, note: string): Promise<void> {
  if (night === null) return;
  const db = await getDb();
  const mine = night.entries.filter((e) => e.type === 'expense' && spendIdOf(e) === spendId);
  if (mine.length === 0) return;

  const noteOf = { ...night.noteOf };
  for (const e of mine) {
    await db.runAsync(
      `UPDATE night_entry SET note = ? WHERE session_id = ? AND id = ?`,
      note === '' ? null : note,
      night.sessionId,
      e.id,
    );
    if (note === '') delete noteOf[e.id];
    else noteOf[e.id] = note;
  }

  night = { ...night, noteOf };
  emit();
}

/**
 * Void a whole spend — L3.
 *
 * Every fronter's entry goes, not just the one that was tapped. Voiding one
 * half of a split pizza would leave the bill charging for a pizza that half
 * exists.
 */
export async function voidSpend(spendId: string): Promise<void> {
  if (night === null) return;
  const mine = night.entries.filter((e) => e.type === 'expense' && spendIdOf(e) === spendId);
  for (const e of mine) await voidEntry(e.id);
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

/**
 * Switch one player out of a rule FOR TONIGHT — L6's "Off for tonight".
 *
 * It lives on the night's own copy of the rule, which is a snapshot taken when
 * the night opened, so it never reaches back into what the group does next
 * week. That is the whole point of the exception.
 */
export async function toggleExemption(ruleId: string, playerId: PlayerId): Promise<void> {
  if (night === null) return;
  await writeRules(
    night.rules.map((r) => {
      if (r.id !== ruleId) return r;
      const off = new Set(r.exemptPlayerIds ?? []);
      if (off.has(playerId)) off.delete(playerId);
      else off.add(playerId);
      return { ...r, exemptPlayerIds: [...off] };
    }),
  );
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
  if (firsts.length === 0) return money(500);
  // The most common one, not the average: a mean would invent an amount nobody
  // has ever bought in for.
  const tally = new Map<number, number>();
  for (const a of firsts) tally.set(a, (tally.get(a) ?? 0) + 1);
  const [best] = [...tally.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  return money(best[0]);
}
