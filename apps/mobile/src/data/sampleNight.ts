/**
 * A night to open the app with, the first time and only the first time.
 *
 * It is THE CANONICAL NIGHT — the one every drawn frame in the handoff shows
 * and the one `packages/core/src/canonical-night.test.ts` asserts to the
 * dollar: $5,000 in, $5,000 counted out, a $170 bill fronted by two people, a
 * 5% kitty, and six transfers that clear it. Seeding the app with it means a
 * screen can be held up against the frame it was drawn from and the figures
 * match, which is the only way to tell a layout bug from a money bug.
 *
 * TEMPORARY, still. `nightStore.openNight()` copies this into the device's
 * database when it finds no night there. It runs once — after that this is the
 * host's own data, and deleting this file once groups are real will not lose
 * anybody's night.
 */

import { money, type LedgerEntry, type MoneyRule, type Player } from '@poker-club/core';

const DANA = 'seed-dana';
const MAREK = 'seed-marek';
const LENA = 'seed-lena';
const TOMAS = 'seed-tomas';
const IVO = 'seed-ivo';
const PETR = 'seed-petr';
const RADKA = 'seed-radka';

const players: Player[] = [
  { id: DANA, name: 'Dana', atTable: true },
  { id: MAREK, name: 'Marek', atTable: true },
  { id: LENA, name: 'Lena', atTable: true },
  { id: TOMAS, name: 'Tomáš', atTable: true },
  { id: IVO, name: 'Ivo', atTable: true },
  { id: PETR, name: 'Petr', atTable: true },
  // the group's treasurer: holds the kitty, never sits down
  { id: RADKA, name: 'Radka', atTable: false },
];

/** Today, at a given wall-clock time — so the night reads like tonight. */
const at = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

type SeedEntry = Omit<LedgerEntry, 'id' | 'seq'> & { occurredAt: string; note?: string };

/** In time order, which is also seq order. */
const entries: SeedEntry[] = [
  { type: 'buyin', playerId: LENA, amount: money(1000), occurredAt: at('20:06') }, // double
  { type: 'buyin', playerId: PETR, amount: money(500), occurredAt: at('20:07') },
  { type: 'buyin', playerId: MAREK, amount: money(500), occurredAt: at('20:09') },
  { type: 'buyin', playerId: IVO, amount: money(500), occurredAt: at('20:11') },
  { type: 'buyin', playerId: DANA, amount: money(500), occurredAt: at('20:41') }, // late
  { type: 'rebuy', playerId: PETR, amount: money(500), occurredAt: at('21:12') },
  { type: 'rebuy', playerId: IVO, amount: money(500), occurredAt: at('21:35') },
  { type: 'expense', payerId: MAREK, amount: money(120), occurredAt: at('21:48'), note: 'Pizza' },
  { type: 'rebuy', playerId: PETR, amount: money(500), occurredAt: at('22:03') },
  { type: 'expense', payerId: LENA, amount: money(50), occurredAt: at('22:20'), note: 'Drinks' },
  { type: 'buyin', playerId: TOMAS, amount: money(500), occurredAt: at('22:34') },
  // Dana leaves with her stack, which is why the count screen has a third
  // group: somebody already gone is never re-counted.
  { type: 'cashout', playerId: DANA, amount: money(2120), occurredAt: at('23:15') },
];

/*
 * The night's own snapshot of the rules, in the order they apply. The bill is
 * split EVENLY BETWEEN THE WINNERS here, which is what the E-series frames are
 * drawn from; the club's default is a separate question (S62) and a night
 * keeps whatever it opened with either way.
 */
const rules: MoneyRule[] = [
  {
    id: 'kitty', name: 'Group kitty', active: true,
    amountKind: 'percent', amount: money(5), basis: 'gross',
    charge: 'winners_only', destination: 'kitty', split: 'evenly',
    collectorPlayerId: RADKA, sortOrder: 2,
  },
  {
    id: 'kitchen', name: 'Kitchen & drinks', active: true,
    // The expenses are the amount; the rule only says how it is shared.
    amountKind: 'fixed', amount: money(170), basis: 'gross',
    charge: 'winners_only', destination: 'bill', split: 'evenly',
    collectorPlayerId: MAREK, sortOrder: 1,
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
