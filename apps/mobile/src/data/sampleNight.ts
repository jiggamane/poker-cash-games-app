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
  // the group's treasurer: holds the piggy bank, never sits down
  { id: RADKA, name: 'Radka', atTable: false },
];

/**
 * The night's clock, written as the wall-clock times it was designed at and
 * played back so that it is ENDING NOW.
 *
 * These times used to be taken literally — 20:05 today — which is right for
 * about four hours a day and wrong for the other twenty. Opened in the morning
 * the whole night sat in the future, so the header counted "0h 00m" for a
 * table that had six people and $4,500 on it, and the one figure on the home
 * screen that is supposed to say the night is live said the opposite.
 *
 * So the times keep their spacing and lose their absolute position: the last
 * thing that happened lands a few minutes ago, everything else falls back from
 * it, and the night reads as three hours old whenever the app is opened.
 */
/** The latest time used below. Keep it in step if a later entry is added. */
const LAST = '23:15';
/** How long ago the most recent entry was. Recent, but not this second. */
const SINCE_LAST_MIN = 6;

const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};

const at = (hhmm: string): string =>
  new Date(
    Date.now() - (minutes(LAST) - minutes(hhmm) + SINCE_LAST_MIN) * 60_000,
  ).toISOString();

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
 * The night's own snapshot of the rules, in the order they apply.
 *
 * The bill is split BY SIZE OF WIN — S62 made that the default and
 * `14-invite-and-watcher.md` § 5 re-derived this night on it: 110 / 31 / 29
 * rather than the E-series' 57 / 57 / 56, with nets still summing to −126.
 * The seeded night is what a screen gets held against, so it has to be the
 * night the current drawings show. `rev15-night.test.ts` asserts every figure
 * below to the dollar.
 */
const rules: MoneyRule[] = [
  {
    id: 'kitty', name: 'Group piggy bank', active: true,
    amountKind: 'percent', amount: money(5), basis: 'gross',
    charge: 'winners_only', destination: 'kitty', split: 'evenly',
    collectorPlayerId: RADKA, sortOrder: 2,
  },
  {
    id: 'kitchen', name: 'Kitchen & drinks', active: true,
    // The expenses are the amount; the rule only says how it is shared.
    amountKind: 'fixed', amount: money(170), basis: 'gross',
    charge: 'winners_only', destination: 'bill', split: 'by_percent',
    collectorPlayerId: MAREK, sortOrder: 1,
  },
];

/**
 * Bump this whenever anything above changes.
 *
 * A phone seeds itself once and then never again, because after the first
 * launch there is a night in the database and the seed only runs when there is
 * not. So a device that has ever opened this app keeps whichever demo night it
 * met first, for good — and every later build lands on it looking unchanged.
 * That is not a hypothetical: it is why the seeded night on the phone stayed at
 * an older shape while the screens around it moved on for a week.
 *
 * A night carries the version it was seeded at, and a version behind this one
 * is replaced on launch. A night the host STARTED carries no version at all and
 * is never touched by any of this — see `openNight`.
 */
export const SEED_VERSION = 3;

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
