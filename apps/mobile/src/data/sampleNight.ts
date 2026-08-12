/**
 * A fixed night, used until the screens read from the store.
 *
 * TEMPORARY. It exists so the screens can be built and looked at against real
 * engine output rather than mock figures — every number on screen is computed
 * by @poker-club/core from these entries. Replaced by the repository in the
 * next step; nothing outside this file knows where the data came from.
 */

import { money, settle, type LedgerEntry, type Money, type MoneyRule, type Player, type PlayerId } from '@poker-club/core';

export const GROUP_NAME = 'The Thursday game';

const MAREK = 'p1';
const PETR = 'p2';
const DANA = 'p3';
const RADKA = 'p9';

export const players: Player[] = [
  { id: MAREK, name: 'Marek', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  { id: DANA, name: 'Dana', atTable: true },
  // the group's treasurer: holds the kitty, never sits down
  { id: RADKA, name: 'Radka', atTable: false },
];

export const nameOf = (id: PlayerId): string =>
  players.find((p) => p.id === id)?.name ?? 'Unaccounted';

let n = 0;
const entry = (e: Omit<LedgerEntry, 'id' | 'seq'>): LedgerEntry => ({ id: `e${++n}`, seq: n, ...e });

export const entries: LedgerEntry[] = [
  entry({ type: 'buyin', playerId: MAREK, amount: money(500) }),
  entry({ type: 'buyin', playerId: PETR, amount: money(500) }),
  entry({ type: 'rebuy', playerId: PETR, amount: money(1000) }),
  entry({ type: 'buyin', playerId: DANA, amount: money(1000) }),
  entry({ type: 'expense', payerId: MAREK, amount: money(170) }),
];

/** Wall-clock times for the feed, alongside the entries above. */
export const timeOf: Record<string, string> = {
  e1: '20:07', e2: '20:09', e3: '21:04', e4: '20:41', e5: '21:48',
};

export const finalCounts = new Map<PlayerId, Money>([
  [MAREK, money(1982)],
  [PETR, money(270)],
  [DANA, money(748)],
]);

export const rules: MoneyRule[] = [
  {
    id: 'kitchen', name: 'Kitchen & drinks', active: true,
    amountKind: 'fixed', amount: money(170), basis: 'gross',
    charge: 'everyone_flat', destination: 'bill', split: 'evenly',
    collectorPlayerId: MAREK, sortOrder: 1,
  },
  {
    id: 'kitty', name: 'Group kitty', active: true,
    amountKind: 'percent', amount: money(10), basis: 'net_after_others',
    charge: 'winners_only', destination: 'kitty', split: 'evenly',
    collectorPlayerId: RADKA, sortOrder: 2,
  },
];

export const settlement = settle({ players, entries, finalCounts, rules });

/** What is on the table right now, for the live session header. */
export const inPlay: Money = settlement.reconciliation.chipsOnTable;
