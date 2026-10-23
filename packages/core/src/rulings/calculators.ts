/**
 * The three situations that compute rather than explain.
 *
 * `docs/rulings.md` § 1 and § 5.4: general chatbots miscount pots and double
 * count straddles, so the library never asks a model for a number. Side pots,
 * a short bank and a rebuy cap are arithmetic, and arithmetic lives here —
 * `packages/core` is the only place it happens in this app, and the only place
 * it is tested.
 */

import { ZERO, add, formatMoney, money, subtract, type Money } from '../money';
import type { RebuyCap, TableRules } from './tableRules';

// ---------------------------------------------------------------------------
// Side pots
// ---------------------------------------------------------------------------

export interface Commitment {
  playerId: string;
  /** What this player has put in the pot by showdown. */
  amount: Money;
}

export interface Pot {
  amount: Money;
  /** Who can win it: everybody who matched this layer. */
  eligible: string[];
}

/**
 * Who is eligible for what, when several players are all in for different
 * amounts. The textbook rule: each pot holds only what everybody in it could
 * match. Layered by the distinct amounts committed, lowest first; a player
 * whose commitment covers a layer is in that layer's pot.
 *
 * A player who committed nothing is in no pot. Folded players are not
 * modelled: the caller passes what stayed in the pot, and a folded player's
 * chips are part of whatever layer they reached — pass them with the
 * commitment and an `eligible` list that excludes them is the caller's
 * job (see `foldedIds`).
 */
export function sidePots(commitments: readonly Commitment[], foldedIds: readonly string[] = []): Pot[] {
  const live = commitments.filter((c) => c.amount > 0);
  const levels = [...new Set(live.map((c) => c.amount))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let floor = ZERO;
  for (const level of levels) {
    const slice = subtract(level, floor);
    let amount = ZERO;
    const eligible: string[] = [];
    for (const c of live) {
      const contributes = c.amount >= level ? slice : c.amount > floor ? subtract(c.amount, floor) : ZERO;
      amount = add(amount, contributes);
      if (c.amount >= level && !foldedIds.includes(c.playerId)) eligible.push(c.playerId);
    }
    if (amount > 0) pots.push({ amount, eligible });
    floor = level;
  }
  return pots;
}

// ---------------------------------------------------------------------------
// The short bank
// ---------------------------------------------------------------------------

export interface ShortBankShare {
  playerId: string;
  amount: Money;
}

export interface ShortBankOutcome {
  /** Positive when the bank is short, negative when it is over, zero when it balances. */
  missing: Money;
  /** Who carries it under the group's rule. Empty when the rule leaves it open. */
  carriers: ShortBankShare[];
  /** The rule applied, or 'unset' when the group has not decided. */
  rule: NonNullable<TableRules['shortBank']> | 'unset';
}

/**
 * How much the bank is short, and who carries it under the group's rule.
 *
 * `inPlay` and `accountedFor` are the two sums the count-up header already
 * shows (`balance.ts`); this never re-adds the table. A split that does not
 * divide evenly puts the odd minor units on the first carriers in the order
 * given, one each — the same even-split rule as `allocate` in `money.ts`.
 */
export function shortBank(
  inPlay: Money,
  accountedFor: Money,
  rules: Pick<TableRules, 'shortBank'>,
  players: readonly { playerId: string; result: Money; host: boolean }[],
): ShortBankOutcome {
  const missing = subtract(inPlay, accountedFor);
  const rule = rules.shortBank ?? 'unset';
  if (missing <= 0 || rule === 'unset' || rule === 'decideThen') {
    return { missing, carriers: [], rule };
  }
  let group: readonly { playerId: string }[];
  if (rule === 'hostAbsorbs') group = players.filter((p) => p.host);
  else if (rule === 'splitLosers') group = players.filter((p) => p.result < 0);
  else group = players;
  if (group.length === 0) return { missing, carriers: [], rule };
  const each = Math.floor(missing / group.length);
  let remainder = missing - each * group.length;
  const carriers = group.map((p) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { playerId: p.playerId, amount: money(each + extra) };
  });
  return { missing, carriers, rule };
}

// ---------------------------------------------------------------------------
// A rebuy against the cap
// ---------------------------------------------------------------------------

export interface RebuyVerdict {
  allowed: boolean;
  /** The most this player may buy right now, or null when there is no cap. */
  cap: Money | null;
  /** Why, in a sentence the sheet can show. ⚠ UNSURE copy. */
  reason: string;
}

/**
 * Whether `amount` may be bought now. `largestStack` is the biggest stack on
 * the table, which is what the cap is measured against; `stack` is the
 * buyer's own, because a cap on a stack is a cap on what they end up with,
 * not on the chips they add.
 */
export function rebuyAllowed(
  rules: Pick<TableRules, 'rebuyCap'>,
  largestStack: Money,
  stack: Money,
  amount: Money,
  symbol = '$',
): RebuyVerdict {
  const cap: RebuyCap | null = rules.rebuyCap;
  if (cap === null) {
    return { allowed: true, cap: null, reason: 'Your group has not set a cap, so any rebuy is allowed.' };
  }
  if (cap.kind === 'none') {
    return { allowed: true, cap: null, reason: 'Your group sets no cap.' };
  }
  const ceiling =
    cap.kind === 'fixed' ? cap.amount : money(Math.floor((largestStack * cap.percent) / 100));
  const room = money(Math.max(0, ceiling - stack));
  const allowed = amount <= room;
  const fmt = (m: Money) => formatMoney(m, symbol);
  return {
    allowed,
    cap: room,
    reason: allowed
      ? `Within the cap: up to ${fmt(room)} more brings the stack to the group's limit.`
      : `Over the cap: the most that can be bought now is ${fmt(room)}.`,
  };
}
