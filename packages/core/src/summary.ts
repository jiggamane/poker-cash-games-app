/**
 * The night in one line — E6's prize pool.
 *
 * `handoff-E6` opens the settled screen with a single block: what went through
 * the table, how many entries made it up, and how many people. Three figures,
 * and every one of them is a count or a sum, which is why they are here and not
 * on the screen. `CLAUDE.md`: a screen that adds up its own column is a second,
 * untested implementation of the same sum.
 *
 * NOTHING NEW IS COMPUTED. Every figure is read off the RESOLVED ledger —
 * voids already dropped, corrections already applied. Counting the raw
 * `LedgerEntry[]` instead would call a voided buy-in an entry and a player
 * whose buy-in was struck out a player, which is the whole reason the resolver
 * exists.
 */

import type { Money } from './money';
import type { ResolvedLedger } from './ledger';

/** `PRIZE POOL $31,000` over `17 entries · 7 players`. */
export interface PrizePool {
  /** Every buy-in and re-entry that still stood when the night closed. */
  total: Money;
  /** How many of them there were. Entries, not people: a re-entry counts. */
  entries: number;
  /** How many people put money on the table at any point. */
  players: number;
}

export function prizePool(ledger: ResolvedLedger): PrizePool {
  return {
    total: ledger.totalBoughtIn,
    entries: ledger.entries.filter(
      (e) => !e.voided && (e.type === 'buyin' || e.type === 'rebuy'),
    ).length,
    /* The resolver keys this map on the first buy-in and never removes a
       player, so its size is exactly "how many people bought in". */
    players: ledger.boughtInByPlayer.size,
  };
}
