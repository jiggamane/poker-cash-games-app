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
export type RuleDestination = 'bill' | 'kitty' | 'host_fee' | 'next_pot';
export type RuleSplit = 'equal' | 'by_win_size' | 'across_everyone';

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
  note?: string;
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
