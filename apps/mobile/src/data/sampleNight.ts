/**
 * A night to open the app with, the first time and only the first time.
 *
 * TEMPORARY. `nightStore.openNight()` copies this into the device's database
 * when it finds no night there, so there is something to look at and something
 * to record against. After that it is the host's own data: the seed is never
 * read again, and deleting this file once groups are real will not lose
 * anybody's night.
 */

import { money, type LedgerEntry, type MoneyRule, type Player } from '@poker-club/core';

const MAREK = 'seed-marek';
const PETR = 'seed-petr';
const DANA = 'seed-dana';
const RADKA = 'seed-radka';

const players: Player[] = [
  { id: MAREK, name: 'Marek', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  { id: DANA, name: 'Dana', atTable: true },
  // the group's treasurer: holds the kitty, never sits down
  { id: RADKA, name: 'Radka', atTable: false },
];

/** Today, at a given wall-clock time — so the feed reads like tonight. */
const at = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

type SeedEntry = Omit<LedgerEntry, 'id' | 'seq'> & { occurredAt: string; note?: string };

/** In time order, which is also seq order. */
const entries: SeedEntry[] = [
  { type: 'buyin', playerId: MAREK, amount: money(500), occurredAt: at('20:07') },
  { type: 'buyin', playerId: PETR, amount: money(500), occurredAt: at('20:09') },
  { type: 'buyin', playerId: DANA, amount: money(1000), occurredAt: at('20:41') },
  { type: 'rebuy', playerId: PETR, amount: money(1000), occurredAt: at('21:04') },
  { type: 'expense', payerId: MAREK, amount: money(170), occurredAt: at('21:48'), note: 'Pizza & drinks' },
];

const rules: MoneyRule[] = [
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

export const SEED = {
  groupName: 'The Thursday game',
  startedAt: at('20:05'),
  players,
  entries,
  rules,
  /*
   * Whoever is holding this phone. It is a seeded guess and nothing more —
   * the real answer arrives when a member claims their place from an invite,
   * and until then it is what lets "What you paid" and My stats say YOUR
   * figures rather than everybody's.
   */
  meId: MAREK,
};
