/**
 * Domain types for the ledger and settlement.
 *
 * These mirror the database schema (supabase/migrations/0001_init.sql) but are
 * deliberately plain data: no database client, no dates-as-Date, nothing that
 * would stop this running identically in the app and in an edge function.
 */

import type { Money } from './money';

export type PlayerId = string;
export type EntryId = string;
export type RuleId = string;

export type EntryType =
  | 'buyin'
  | 'rebuy'
  | 'cashout'
  | 'expense'
  | 'correction'
  | 'void';

/** One row of the append-only ledger. */
export interface LedgerEntry {
  id: EntryId;
  /** The host's local monotonic counter. Defines order, independent of arrival. */
  seq: number;
  type: EntryType;
  /** The player the money concerns (buy-in / rebuy / cash-out). */
  playerId?: PlayerId | null;
  /** Who fronted a shared expense. */
  payerId?: PlayerId | null;
  /**
   * An expense nobody is owed for. A spend is covered by a person, by the
   * kitty, or by nobody yet — and the last two have no payer to reimburse, so
   * they carry this instead. Exactly one of `payerId` and `coveredBy` is set on
   * an expense; the database enforces the same pair.
   */
  coveredBy?: 'kitty' | 'unpaid' | null;
  /**
   * Several people can front one spend. Each fronter is their own entry — that
   * is what makes each of them repaid exactly what they put in — and this ties
   * those entries back into the single thing that was bought.
   */
  spendGroup?: string | null;
  amount: Money;
  /** Set on correction/void: the entry being restated. */
  correctsEntryId?: EntryId | null;
}

export interface Player {
  id: PlayerId;
  name: string;
  /**
   * Did this person sit at the table this session? A collector who only holds
   * money — the group's treasurer, say — is a player row with atTable: false.
   * Only people at the table can be charged; anyone can be paid.
   */
  atTable: boolean;
}

export type RuleAmountKind = 'percent' | 'fixed';
export type RuleBasis = 'gross' | 'net_after_others';
export type RuleCharge = 'winners_only' | 'everyone_flat';
/**
 * Where a rule's money goes.
 *
 * THE WORD IN THE INTERFACE IS "PIGGY BANK" — the handoff renamed it and every
 * string a person reads says so. `'kitty'` survives HERE because this value is
 * written into `rules_json` on every night ever recorded and into `covered_by`
 * on every spend, on this phone and on the server. Renaming it is a migration
 * of stored money records on both sides, and it buys nothing a reader can see.
 * Map it at the edge — `ruleText.ts` and the screens — never in the ledger.
 */
export type RuleDestination = 'bill' | 'kitty' | 'host_fee' | 'next_pot';
/**
 * How a fixed total is divided between the people paying it.
 *
 *   by_percent — in proportion to the size of each win. **This is what the
 *                design calls "by size of win", and since S62 it is the
 *                default** for a bill. The stored value keeps its old name
 *                because it is written into every settled night on the server;
 *                `splitSentence()` below is what a screen shows a person.
 *   evenly     — the same share each. The default until S62, and still what
 *                `04-money-math.md` and the E-series frames draw.
 *   custom     — the host types an amount per person. This is also how ONE
 *                person covers a whole bill, and it is the only split that
 *                ignores the winners-only constraint.
 *
 * There is deliberately no "across everyone" value: that is `charge:
 * 'everyone_flat'` with `split: 'evenly'`, which says the same thing without
 * two settings competing to decide who pays.
 */
export type RuleSplit = 'by_percent' | 'evenly' | 'custom';

/** A rule that takes money off the table at settle-up — never during play. */
export interface MoneyRule {
  id: RuleId;
  name: string;
  active: boolean;
  amountKind: RuleAmountKind;
  /** Whole percent (10 = 10%) when amountKind is 'percent', else whole units. */
  amount: Money;
  basis: RuleBasis;
  charge: RuleCharge;
  destination: RuleDestination;
  split: RuleSplit;
  /**
   * Per-person amounts, only when split is 'custom'. Must sum to the rule's
   * resolved amount — for a bill, to the real expense total.
   */
  customShares?: ReadonlyArray<{ playerId: PlayerId; amount: Money }>;
  /**
   * People this rule does not charge tonight.
   *
   * A group's kitty is a standing arrangement and somebody sitting out of it
   * for one night is an exception to that night, not a change to the group —
   * which is why it rides on the session's snapshot of the rule rather than on
   * the group. A custom split ignores it: an amount the host typed against a
   * name is already an explicit answer.
   */
  exemptPlayerIds?: readonly PlayerId[];
  /** Exactly one person physically holds this money. Need not be playing. */
  collectorPlayerId: PlayerId;
  /** Rules apply in this order, which is what makes 'net_after_others' defined. */
  sortOrder: number;
}

/** What one deduction took, from whom, and who ended up holding it. */
export interface Deduction {
  ruleId: RuleId;
  name: string;
  destination: RuleDestination;
  total: Money;
  charges: Array<{ playerId: PlayerId; amount: Money }>;
  credits: Array<{ playerId: PlayerId; amount: Money }>;
}

/**
 * A night cannot be closed unless the money balances — or unless the host has
 * looked at what is missing and said so out loud.
 *
 * Chips get miscounted and people leave early, so a real game does sometimes
 * fail to add up. Refusing to close would leave the group stuck; closing
 * silently would hide missing money. So the shortfall is named, the host
 * confirms it, and the confirmation is stored as part of the night's record.
 */
export interface DiscrepancyAcknowledgement {
  /** Must equal the difference exactly, so a stale confirmation cannot be reused. */
  amount: Money;
  /** The host who confirmed it. */
  confirmedByUserId: string;
  confirmedAt: string;
  /** What the host says happened. Shown wherever the night is read back. */
  note?: string;
  /**
   * Who takes the shortfall, if the room decided on the spot.
   *
   * Leave it unset to close the night with the gap recorded but unassigned —
   * the figures stand, the note explains, and the payouts can be adjusted by
   * hand afterwards. Set it to a person or to the piggy bank's collector to have
   * somebody absorb it immediately instead.
   */
  absorbedByPlayerId?: PlayerId;
}

/** One player's night, end to end. */
export interface PlayerSettlement {
  playerId: PlayerId;
  name: string;
  /** Everything they put on the table. */
  boughtIn: Money;
  /** What they took off it: cash-outs plus any chips still in front of them. */
  endedWith: Money;
  /** endedWith − boughtIn, before any rule applies. */
  grossResult: Money;
  /** What the rules took off them. */
  charged: Money;
  /** What they are owed as a collector or an expense payer. */
  credited: Money;
  /** grossResult − charged + credited. Positions across everyone sum to zero. */
  finalPosition: Money;
}

/** "Petr → Dana $1,230". */
export interface Transfer {
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  amount: Money;
}

/**
 * Counted chips against the money that should still be on the table.
 * The design blocks the close flow until difference is exactly zero.
 */
export interface Reconciliation {
  /** buy-ins − cash-outs: what should be in front of the seated players. */
  chipsOnTable: Money;
  /** What the host actually counted. */
  counted: Money;
  /** counted − chipsOnTable. Zero, or the host must confirm what is missing. */
  difference: Money;
  reconciled: boolean;
}

/**
 * The synthetic party that holds a confirmed discrepancy.
 *
 * Money that cannot be accounted for still has to appear somewhere, or the
 * settlement would not add up and every downstream check would be meaningless.
 * Giving it a name keeps the books closed AND keeps the hole visible, rather
 * than quietly spreading it across the players.
 */
export const UNACCOUNTED_ID = '__unaccounted__';
export const UNACCOUNTED_NAME = 'Unaccounted';
