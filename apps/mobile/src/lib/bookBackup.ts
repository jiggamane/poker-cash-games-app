import { freeze, thaw, type Money, type MoneyRule, type RoundingMode } from '@poker-club/core';
import type { ImportedNight } from './nightStore';

/**
 * THE THIRD COPY.
 *
 * The phone holds the book and the server holds it again, and until now that
 * was the whole of it: lose the phone before the queue drains and that night
 * existed nowhere else, because **nothing ever left this app in a form anybody
 * could keep**. `docs/sharing-formats.md` counted what does — a nudge message,
 * a watcher link, an invite code — and none of the three is a record.
 *
 * This is deliberately NOT a sharing format. `sharing-formats.md` §7 says so and
 * says why: a results message for people is new copy that no cut has written,
 * and `CLAUDE.md` is explicit that missing copy is flagged rather than invented.
 * What that section does nominate is this — *"if a backup or a host handover
 * ever wants a file, `freeze()` is the format and it exists"*.
 *
 * IT IS SHAPED TO GO BACK IN. Every night is exactly what `importNights()`
 * consumes, so restoring is the pull's own code path with a paste instead of a
 * server. A backup that cannot be restored is a file somebody feels better for
 * having, and `bookBackup.test.ts` round-trips a real night through the real
 * store rather than asserting the shape looks right.
 *
 * `freeze()` carries the settlement because `rounding.positions` is a `Map` and
 * a `Map` stringifies to `{}` with no error anywhere — B52, and the reason that
 * function exists at all.
 */

/** What the file says it is. A reader that finds anything else must refuse it. */
export const BACKUP_FORMAT = 'poker-club.backup';

/**
 * Bumped when the shape changes in a way an older reader would misread.
 *
 * A backup is opened by whatever the app is on the day it is needed, which is
 * not the day it was written — that is the entire point of it — so the version
 * is here from the first one rather than added when it first hurts.
 */
export const BACKUP_VERSION = 1;

/** One night, as it goes out and as it comes back. */
export interface BackedUpNight extends ImportedNight {
  /**
   * What the night settled at, frozen. Carried for the record rather than for
   * the restore: `importNights` recomputes it from the rules and rows above,
   * and `bookBackup.test.ts` asserts the two agree — which is the same claim
   * `npm run audit` makes against the server, made against a file.
   */
  settlement: unknown | null;
}

export interface BookBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** ISO, when the copy was taken. */
  exportedAt: string;
  nights: BackedUpNight[];
}

/** A night as this phone holds it — structural, so this file imports no store. */
export interface HeldNight {
  sessionId: string;
  groupName: string;
  tableName: string | null;
  startedAt: string;
  endedAt?: string;
  status: 'open' | 'counting' | 'settled';
  stakes: string | null;
  defaultBuyIn: number | null;
  roundingMode: RoundingMode | null;
  rules: MoneyRule[];
  meId?: string;
  players: ReadonlyArray<{ id: string; name: string; atTable: boolean }>;
  entries: ReadonlyArray<{
    id: string;
    seq: number;
    type: string;
    /* `LedgerEntry` leaves these optional as well as nullable. */
    playerId?: string | null;
    payerId?: string | null;
    amount: number;
    correctsEntryId?: string | null;
    coveredBy?: 'kitty' | 'unpaid' | null;
    spendGroup?: string | null;
  }>;
  /** When each entry happened, by entry id. */
  occurredAt: Record<string, string>;
  /** What an expense was for, by entry id. */
  noteOf: Record<string, string>;
  finalCounts: ReadonlyMap<string, Money>;
  /** Keyed `from>to`, exactly as `transferKey` writes it. */
  paidAt: ReadonlyMap<string, string>;
  acknowledgement?: unknown;
  settlement?: unknown;
}

/** The copy, as a value. Pure — the caller decides where it goes. */
export function backupOf(nights: readonly HeldNight[], exportedAt: string): BookBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    nights: nights.map(oneNight),
  };
}

function oneNight(n: HeldNight): BackedUpNight {
  return {
    sessionId: n.sessionId,
    groupName: n.groupName,
    startedAt: n.startedAt,
    endedAt: n.endedAt ?? null,
    status: n.status,
    stakes: n.stakes,
    /*
     * A NIGHT THAT NEVER RECORDED ONE STILL HAS TO CARRY A NUMBER, because
     * `ImportedNight.defaultBuyIn` is not optional and a restore that wrote
     * null would put it back differently from how it went out. Zero is what
     * `readNight` already reads a null column back as.
     */
    defaultBuyIn: n.defaultBuyIn ?? 0,
    rules: n.rules,
    roundingMode: n.roundingMode,
    tableName: n.tableName,
    ...(n.meId === undefined ? {} : { meId: n.meId }),
    players: n.players.map((p) => ({ id: p.id, name: p.name, atTable: p.atTable })),
    entries: n.entries.map((e) => ({
      ...e,
      amount: e.amount as Money,
      type: e.type as ImportedNight['entries'][number]['type'],
      occurredAt: n.occurredAt[e.id] ?? n.startedAt,
      note: n.noteOf[e.id] ?? null,
    })) as ImportedNight['entries'],
    counts: [...n.finalCounts.entries()].map(([playerId, amount]) => ({ playerId, amount })),
    payments: [...n.paidAt.entries()].map(([key, paidAt]) => {
      const [from, to] = key.split('>');
      return { from: from ?? '', to: to ?? '', paidAt };
    }),
    ...(n.acknowledgement === undefined
      ? {}
      : { acknowledgement: n.acknowledgement as ImportedNight['acknowledgement'] }),
    // Through `freeze`, never `JSON.stringify` — B52.
    settlement: n.settlement === undefined ? null : freeze(n.settlement as never),
  };
}

/**
 * Read a backup back, or refuse it.
 *
 * NULL FOR ANYTHING IT DOES NOT RECOGNISE, and the caller says so to the host.
 * This is parsing something a person pasted, which is the one input in this app
 * that is neither the engine's nor the server's — the wrong clipboard, a
 * truncated copy and a file from a newer build all arrive here looking the
 * same, and the only safe answer to all three is not to import it.
 *
 * It does not validate the nights themselves. `importNights` writes them inside
 * a transaction and `settle()` refuses a night that does not add up, so a
 * damaged night fails where every other damaged night fails rather than here.
 */
export function nightsFrom(payload: unknown): ImportedNight[] | null {
  if (payload === null || typeof payload !== 'object') return null;
  const b = payload as Partial<BookBackup>;
  if (b.format !== BACKUP_FORMAT) return null;
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) return null;
  if (!Array.isArray(b.nights)) return null;

  return b.nights.map((n) => {
    const { settlement, ...night } = n;
    void settlement;
    return night as ImportedNight;
  });
}

/** Whether a stored settlement still reads back — the file's own audit. */
export const settlementReads = (n: BackedUpNight): boolean =>
  n.settlement === null || thaw(n.settlement) !== null;
