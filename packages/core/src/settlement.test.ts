import { describe, expect, it } from 'vitest';
import { allocate, money, sum, type Money } from './money';
import {
  ALGORITHM_VERSION,
  checkReconciliation,
  matchTransfers,
  ReconciliationError,
  settle,
  SettlementError,
  type SettlementInput,
} from './settlement';
import {
  UNACCOUNTED_ID,
  UNACCOUNTED_NAME,
  type LedgerEntry,
  type MoneyRule,
  type Player,
  type PlayerId,
} from './types';

// --- fixtures ----------------------------------------------------------------
// Ids are deliberately sortable: player order in the engine is by id, so the
// tests can predict exactly who absorbs a rounding remainder.

const MAREK = 'p1';
const PETR = 'p2';
const DANA = 'p3';
const RADKA = 'p9'; // the group's treasurer — collects, never plays

let seq = 0;
const reset = () => (seq = 0);

const at = (id: PlayerId, name = id): Player => ({ id, name, atTable: true });
const away = (id: PlayerId, name = id): Player => ({ id, name, atTable: false });

const buyin = (playerId: PlayerId, amount: number): LedgerEntry => ({
  id: `e${++seq}`, seq, type: 'buyin', playerId, amount: money(amount),
});
const rebuy = (playerId: PlayerId, amount: number): LedgerEntry => ({
  id: `e${++seq}`, seq, type: 'rebuy', playerId, amount: money(amount),
});
const cashout = (playerId: PlayerId, amount: number): LedgerEntry => ({
  id: `e${++seq}`, seq, type: 'cashout', playerId, amount: money(amount),
});
const covered = (coveredBy: 'kitty' | 'unpaid', amount: number): LedgerEntry => ({
  id: `e${++seq}`, seq, type: 'expense', coveredBy, amount: money(amount),
});
const expense = (payerId: PlayerId, amount: number): LedgerEntry => ({
  id: `e${++seq}`, seq, type: 'expense', payerId, amount: money(amount),
});

const counts = (entries: Array<[PlayerId, number]>) =>
  new Map(entries.map(([id, n]) => [id, money(n)] as const));

function rule(over: Partial<MoneyRule> & { id: string }): MoneyRule {
  return {
    name: over.id,
    active: true,
    amountKind: 'percent',
    amount: money(10),
    basis: 'gross',
    charge: 'winners_only',
    destination: 'kitty',
    split: 'evenly',
    collectorPlayerId: RADKA,
    sortOrder: 0,
    ...over,
  } as MoneyRule;
}

const positionOf = (r: ReturnType<typeof settle>, id: PlayerId) =>
  r.players.find((p) => p.playerId === id)!.finalPosition;
const chargedOf = (r: ReturnType<typeof settle>, id: PlayerId) =>
  r.players.find((p) => p.playerId === id)!.charged;

/** Applying the transfers must leave everybody at zero. */
function transfersBalance(result: ReturnType<typeof settle>): boolean {
  const net = new Map<PlayerId, number>();
  for (const p of result.players) net.set(p.playerId, p.finalPosition);
  for (const t of result.transfers) {
    net.set(t.fromPlayerId, (net.get(t.fromPlayerId) ?? 0) + t.amount);
    net.set(t.toPlayerId, (net.get(t.toPlayerId) ?? 0) - t.amount);
  }
  return [...net.values()].every((v) => v === 0);
}

// =============================================================================

describe('reconciliation gate', () => {
  it('refuses to settle while the count is off', () => {
    reset();
    const input: SettlementInput = {
      players: [at(PETR), at(DANA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 1000], [DANA, 900]]), // 100 short
      rules: [],
    };

    expect(() => settle(input)).toThrow(ReconciliationError);
    const r = checkReconciliation(input);
    expect(r.difference).toBe(-100);
    expect(r.reconciled).toBe(false);
  });

  it('can be checked live while the host is still counting', () => {
    reset();
    const base = {
      players: [at(PETR), at(DANA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      rules: [],
    };
    expect(checkReconciliation({ ...base, finalCounts: counts([[PETR, 500]]) }).difference).toBe(-1500);
    expect(checkReconciliation({ ...base, finalCounts: counts([[PETR, 2000]]) }).difference).toBe(0);
  });
});

describe('closing a night that does not balance', () => {
  // A night closes only when the money adds up, OR when the host has looked at
  // the exact shortfall and confirmed it. Chips get miscounted and people leave
  // early, so this has to be possible — but never silently.
  const shortNight = (ack?: SettlementInput['acknowledgedDiscrepancy']): SettlementInput => {
    reset();
    return {
      players: [at(MAREK), at(PETR), at(DANA)],
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000)],
      // 3000 on the table but only 2950 counted — 50 is missing
      finalCounts: counts([[MAREK, 1500], [PETR, 950], [DANA, 500]]),
      rules: [],
      ...(ack ? { acknowledgedDiscrepancy: ack } : {}),
    };
  };

  const confirm = (amount: number) => ({
    amount: money(amount),
    confirmedByUserId: 'host-1',
    confirmedAt: '2026-08-12T23:59:00.000Z',
    note: 'Chips came up short; Ivo left early.',
  });

  it('refuses to close while the money is unaccounted for', () => {
    expect(() => settle(shortNight())).toThrow(ReconciliationError);
  });

  it('tells the UI exactly how much is missing, so it can be shown live', () => {
    const r = checkReconciliation(shortNight());
    expect(r.chipsOnTable).toBe(3000);
    expect(r.counted).toBe(2950);
    expect(r.difference).toBe(-50);
    expect(r.reconciled).toBe(false);
  });

  it('closes once the host confirms the missing amount', () => {
    const r = settle(shortNight(confirm(-50)));
    expect(r.acknowledgedDiscrepancy?.amount).toBe(-50);
    expect(r.acknowledgedDiscrepancy?.confirmedByUserId).toBe('host-1');
  });

  it('still balances to zero — the shortfall is carried, not hidden', () => {
    const r = settle(shortNight(confirm(-50)));
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
    expect(transfersBalance(r)).toBe(true);
  });

  it('names the missing money instead of spreading it across the players', () => {
    const r = settle(shortNight(confirm(-50)));
    const unaccounted = r.players.find((p) => p.playerId === UNACCOUNTED_ID)!;
    expect(unaccounted.name).toBe(UNACCOUNTED_NAME);
    expect(unaccounted.finalPosition).toBe(50);
    // the real players keep exactly their own results
    expect(positionOf(r, MAREK)).toBe(500);
    expect(positionOf(r, PETR)).toBe(-50);
    expect(positionOf(r, DANA)).toBe(-500);
  });

  it('refuses a confirmation that no longer matches the count', () => {
    // The host confirmed 50 missing, then someone found 20 of it.
    expect(() => settle(shortNight(confirm(-30)))).toThrow(SettlementError);
    expect(() => settle(shortNight(confirm(-30)))).toThrow(/must confirm the current figure/);
  });

  it('refuses a confirmation on a night that balances perfectly', () => {
    reset();
    expect(() =>
      settle({
        players: [at(PETR), at(DANA)],
        entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
        finalCounts: counts([[PETR, 0], [DANA, 2000]]),
        rules: [],
        acknowledgedDiscrepancy: confirm(-50),
      }),
    ).toThrow(/balances exactly/);
  });

  it('handles a surplus as well as a shortfall', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 1000], [DANA, 1075]]), // 75 too many
      rules: [],
      acknowledgedDiscrepancy: confirm(75),
    });
    expect(r.players.find((p) => p.playerId === UNACCOUNTED_ID)!.finalPosition).toBe(-75);
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
  });

  it('counts the bills, the kitty and the fees before deciding it balances', () => {
    // A night that reconciles on chips must still balance once everything that
    // leaves the table is applied — that is the check that actually matters.
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA), away(RADKA)],
      entries: [
        buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000),
        expense(MAREK, 150),
      ],
      finalCounts: counts([[MAREK, 2000], [PETR, 500], [DANA, 500]]),
      rules: [
        rule({ id: 'bill', name: 'Food', destination: 'bill', amountKind: 'fixed',
               amount: money(150), charge: 'winners_only', split: 'evenly', collectorPlayerId: MAREK, sortOrder: 1 }),
        rule({ id: 'kitty', name: 'Kitty', destination: 'kitty', amountKind: 'percent',
               amount: money(10), charge: 'winners_only', collectorPlayerId: RADKA, sortOrder: 2 }),
        rule({ id: 'fee', name: 'Host fee', destination: 'host_fee', amountKind: 'fixed',
               amount: money(20), charge: 'winners_only', split: 'evenly', collectorPlayerId: RADKA, sortOrder: 3 }),
      ],
    });

    expect(r.reconciliation.reconciled).toBe(true);
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
    expect(transfersBalance(r)).toBe(true);
    // everything that left the table is accounted for in the total
    expect(r.totalOffTable).toBe(sum(r.deductions.map((d) => d.total)));
  });
});

describe('the simplest night: no rules', () => {
  it('nets one player against the other', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 0], [DANA, 2000]]),
      rules: [],
    });

    expect(r.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(positionOf(r, PETR)).toBe(-1000);
    expect(positionOf(r, DANA)).toBe(1000);
    expect(r.totalOffTable).toBe(0);
    expect(r.transfers).toEqual([{ fromPlayerId: PETR, toPlayerId: DANA, amount: 1000 }]);
  });

  it('counts someone who left by what they cashed out', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000), cashout(DANA, 1500)],
      finalCounts: counts([[PETR, 500]]),
      rules: [],
    });
    expect(positionOf(r, DANA)).toBe(500);
    expect(positionOf(r, PETR)).toBe(-500);
  });
});

describe('percentage rules', () => {
  it('takes a percentage of the gross win from winners only', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 0], [DANA, 2000]]),
      rules: [rule({ id: 'kitty', amount: money(10) })],
    });

    expect(chargedOf(r, DANA)).toBe(100); // 10% of 1000
    expect(chargedOf(r, PETR)).toBe(0); // lost; pays nothing
    expect(positionOf(r, DANA)).toBe(900);
    expect(positionOf(r, RADKA)).toBe(100);
    expect(r.totalOffTable).toBe(100);
  });

  it('applies rules in order, so net_after_others means something', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 0], [DANA, 2000]]),
      rules: [
        rule({ id: 'first', amount: money(10), basis: 'gross', sortOrder: 1 }),
        rule({ id: 'second', amount: money(10), basis: 'net_after_others', sortOrder: 2 }),
      ],
    });

    // first: 10% of 1000 = 100. second: 10% of (1000 - 100) = 90.
    expect(chargedOf(r, DANA)).toBe(190);
    expect(r.deductions.map((d) => d.total)).toEqual([100, 90]);
  });

  it('rounds a percentage half up', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 995], [DANA, 1005]]),
      rules: [rule({ id: 'kitty', amount: money(10) })],
    });
    // 10% of a 5 win is 0.5 -> 1
    expect(chargedOf(r, DANA)).toBe(1);
    expect(r.totalOffTable).toBe(1);
  });

  it('collects nothing when nobody won', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 1000], [DANA, 1000]]),
      rules: [rule({ id: 'kitty', amount: money(10) })],
    });
    expect(r.totalOffTable).toBe(0);
    expect(r.transfers).toEqual([]);
  });
});

describe('fixed rules and how they are split', () => {
  it('splits equally, giving the odd unit to the earlier player', () => {
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[MAREK, 1000], [PETR, 1000], [DANA, 1000]]),
      rules: [
        rule({ id: 'kitty', amountKind: 'fixed', amount: money(100), charge: 'everyone_flat', split: 'evenly' }),
      ],
    });

    expect(chargedOf(r, MAREK)).toBe(34);
    expect(chargedOf(r, PETR)).toBe(33);
    expect(chargedOf(r, DANA)).toBe(33);
    expect(r.totalOffTable).toBe(100); // nothing invented, nothing lost
    expect(positionOf(r, RADKA)).toBe(100);
  });

  it('splits in proportion to the size of each win', () => {
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA), away(RADKA)],
      // Dana has to have bought in for what she loses — 5000 on the table
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 3000)],
      // Marek +2000, Petr +1000, Dana -3000
      finalCounts: counts([[MAREK, 3000], [PETR, 2000], [DANA, 0]]),
      rules: [
        rule({ id: 'bill2', amountKind: 'fixed', amount: money(300), charge: 'winners_only', split: 'by_percent' }),
      ],
    });

    expect(chargedOf(r, MAREK)).toBe(200); // twice Petr's win, twice the share
    expect(chargedOf(r, PETR)).toBe(100);
    expect(chargedOf(r, DANA)).toBe(0);
  });

  it('charges everyone when the split says across everyone, winners or not', () => {
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[MAREK, 3000], [PETR, 0], [DANA, 0]]),
      rules: [
        rule({ id: 'kitty', amountKind: 'fixed', amount: money(90), charge: 'everyone_flat', split: 'evenly' }),
      ],
    });

    expect(chargedOf(r, MAREK)).toBe(30);
    expect(chargedOf(r, PETR)).toBe(30);
    expect(chargedOf(r, DANA)).toBe(30);
  });
});

describe('collectors', () => {
  it('pays a collector who never sat at the table', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 0], [DANA, 2000]]),
      rules: [rule({ id: 'kitty', amount: money(10), collectorPlayerId: RADKA })],
    });

    expect(positionOf(r, RADKA)).toBe(100);
    expect(chargedOf(r, RADKA)).toBe(0); // never charged — they weren't playing
    // ...and they show up as an ordinary payee
    expect(r.transfers.some((t) => t.toPlayerId === RADKA && t.amount === 100)).toBe(true);
  });

  it('combines the two sides when the collector is also playing', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 0], [DANA, 2000]]),
      rules: [rule({ id: 'hostfee', amount: money(10), collectorPlayerId: DANA, destination: 'host_fee' })],
    });

    // Dana wins 1000, is charged 100, and holds that 100 as collector
    expect(positionOf(r, DANA)).toBe(1000);
    expect(positionOf(r, PETR)).toBe(-1000);
  });

  it('refuses a rule whose collector is not a known person', () => {
    reset();
    expect(() =>
      settle({
        players: [at(PETR), at(DANA)],
        entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
        finalCounts: counts([[PETR, 0], [DANA, 2000]]),
        rules: [rule({ id: 'kitty', collectorPlayerId: 'ghost' })],
      }),
    ).toThrow(SettlementError);
  });
});

describe('expenses', () => {
  it('leaves the tab out of the settlement entirely when there is no bill rule', () => {
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA)],
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000), expense(MAREK, 170)],
      finalCounts: counts([[MAREK, 1000], [PETR, 1000], [DANA, 1000]]),
      rules: [],
    });

    // The group chose not to put the bar tab through the settlement. It stays
    // in the ledger as a record; nobody is charged and nobody is reimbursed.
    expect(r.deductions).toEqual([]);
    expect(r.totalOffTable).toBe(0);
    expect(chargedOf(r, MAREK)).toBe(0);
    expect(positionOf(r, MAREK)).toBe(0);
    expect(r.transfers).toEqual([]);
  });

  it('adds up several bills across the night, paid by different people', () => {
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA)],
      entries: [
        buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000),
        expense(PETR, 60), // food, settled mid-evening
        expense(MAREK, 90), // drinks, settled at the end
        expense(PETR, 30), // one more round
      ],
      finalCounts: counts([[MAREK, 1000], [PETR, 1000], [DANA, 1000]]),
      rules: [
        rule({ id: 'tab', destination: 'bill', amountKind: 'fixed', amount: money(1),
               charge: 'everyone_flat', split: 'evenly', collectorPlayerId: MAREK }),
      ],
    });

    expect(r.deductions[0].total).toBe(180); // 60 + 90 + 30
    // each is credited exactly their own outlay, not an average
    expect(r.players.find((p) => p.playerId === PETR)!.credited).toBe(90);
    expect(r.players.find((p) => p.playerId === MAREK)!.credited).toBe(90);
    expect(r.players.find((p) => p.playerId === DANA)!.credited).toBe(0);
    expect(chargedOf(r, DANA)).toBe(60); // 180 split three ways
  });

  it('charges a spend the kitty paid for, and repays the kitty', () => {
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA)],
      entries: [
        buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000),
        expense(PETR, 60),
        covered('kitty', 120), // the kitty bought the pizza itself
      ],
      finalCounts: counts([[MAREK, 1200], [PETR, 1000], [DANA, 800]]),
      rules: [
        rule({ id: 'tab', destination: 'bill', amountKind: 'fixed', amount: money(1),
               charge: 'everyone_flat', split: 'evenly', collectorPlayerId: MAREK }),
        rule({ id: 'kitty', destination: 'kitty', amountKind: 'percent', amount: money(5),
               charge: 'winners_only', split: 'by_percent', collectorPlayerId: DANA }),
      ],
    });

    // The whole 180 is on the bill, whoever put the money up...
    expect(r.deductions.find((d) => d.destination === 'bill')!.total).toBe(180);
    // ...and the 120 goes back to whoever holds the kitty, not to a player who
    // never spent it. Dana collects the kitty, so Dana is credited it.
    expect(r.players.find((p) => p.playerId === PETR)!.credited).toBe(60);
    expect(r.players.find((p) => p.playerId === DANA)!.credited).toBeGreaterThanOrEqual(120);
  });

  it('leaves a player off tonight out of the charge, without touching the others', () => {
    reset();
    const off = settle({
      players: [at(MAREK), at(PETR), at(DANA)],
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[MAREK, 1400], [PETR, 1000], [DANA, 600]]),
      rules: [
        rule({ id: 'kitty', destination: 'kitty', amountKind: 'percent', amount: money(10),
               charge: 'winners_only', split: 'by_percent', collectorPlayerId: DANA,
               exemptPlayerIds: [MAREK] }),
      ],
    });

    // Marek won 400 and would have paid 40. He brought the food, so tonight he
    // pays nothing, and nobody else's share moves to cover it.
    expect(chargedOf(off, MAREK)).toBe(0);
    // He was the only winner, so with him off there is nothing to charge and
    // the rule produces no deduction at all rather than an empty one.
    expect(off.deductions).toEqual([]);
    expect(off.totalOffTable).toBe(0);
  });

  it('refuses to settle while a spend has nobody covering it', () => {
    reset();
    expect(() =>
      settle({
        players: [at(MAREK), at(PETR), at(DANA)],
        entries: [
          buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000),
          covered('unpaid', 120),
        ],
        finalCounts: counts([[MAREK, 1000], [PETR, 1000], [DANA, 1000]]),
        rules: [
          rule({ id: 'tab', destination: 'bill', amountKind: 'fixed', amount: money(1),
                 charge: 'everyone_flat', split: 'evenly', collectorPlayerId: MAREK }),
        ],
      }),
    ).toThrow(SettlementError);
  });

  it('refuses a kitty-paid spend when no kitty rule is active to be repaid', () => {
    reset();
    expect(() =>
      settle({
        players: [at(MAREK), at(PETR), at(DANA)],
        entries: [
          buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000),
          covered('kitty', 120),
        ],
        finalCounts: counts([[MAREK, 1000], [PETR, 1000], [DANA, 1000]]),
        rules: [
          rule({ id: 'tab', destination: 'bill', amountKind: 'fixed', amount: money(1),
                 charge: 'everyone_flat', split: 'evenly', collectorPlayerId: MAREK }),
        ],
      }),
    ).toThrow(SettlementError);
  });

  it("nets a payer's own share against what they fronted", () => {
    // The worked example: A covers a 150 bill, wins, and owes 50 of it.
    // They are charged 50 and credited 150, so they come out 100 ahead.
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA)],
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000), expense(MAREK, 150)],
      finalCounts: counts([[MAREK, 1000], [PETR, 1000], [DANA, 1000]]),
      rules: [
        rule({ id: 'tab', destination: 'bill', amountKind: 'fixed', amount: money(1),
               charge: 'everyone_flat', split: 'evenly', collectorPlayerId: MAREK }),
      ],
    });

    const marek = r.players.find((p) => p.playerId === MAREK)!;
    expect(marek.charged).toBe(50); // a third of 150
    expect(marek.credited).toBe(150); // what he actually paid the bar
    expect(marek.finalPosition).toBe(100); // 0 - 50 + 150
    expect(r.totalOffTable).toBe(150);
  });

  it('lets a bill rule decide how the cost is shared', () => {
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA)],
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 3000), expense(MAREK, 300)],
      // Marek +2000, Petr +1000, Dana -3000
      finalCounts: counts([[MAREK, 3000], [PETR, 2000], [DANA, 0]]),
      rules: [
        rule({
          id: 'kitchen', name: 'Kitchen & drinks', destination: 'bill',
          amountKind: 'fixed', amount: money(1), // ignored: the expenses are the amount
          charge: 'winners_only', split: 'by_percent', collectorPlayerId: MAREK,
        }),
      ],
    });

    expect(r.deductions[0].total).toBe(300); // the real expense, not the rule's 1
    expect(chargedOf(r, MAREK)).toBe(200);
    expect(chargedOf(r, PETR)).toBe(100);
    expect(chargedOf(r, DANA)).toBe(0);
    expect(positionOf(r, MAREK)).toBe(2000 - 200 + 300);
  });

  it('shares an expense across the table when only losers are left to pay', () => {
    reset();
    const r = settle({
      players: [at(MAREK), at(PETR), at(DANA)],
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000), expense(MAREK, 90)],
      finalCounts: counts([[MAREK, 1000], [PETR, 1000], [DANA, 1000]]), // nobody won
      rules: [
        rule({ id: 'bill', destination: 'bill', amountKind: 'fixed', amount: money(90),
               charge: 'winners_only', split: 'by_percent', collectorPlayerId: MAREK }),
      ],
    });

    // somebody actually spent this, so it cannot simply vanish
    expect(r.totalOffTable).toBe(90);
    expect(chargedOf(r, MAREK)).toBe(30);
    expect(chargedOf(r, PETR)).toBe(30);
    expect(chargedOf(r, DANA)).toBe(30);
  });
});

describe('inactive rules', () => {
  it('ignores a rule that is switched off', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 0], [DANA, 2000]]),
      rules: [rule({ id: 'kitty', active: false })],
    });
    expect(r.totalOffTable).toBe(0);
    expect(r.deductions).toEqual([]);
  });
});

describe('a whole night', () => {
  // Marek, Petr and Dana play; Radka holds the kitty and never sits down.
  // Marek also pays 170 for food out of his own pocket.
  const input = (): SettlementInput => {
    reset();
    return {
      players: [at(MAREK, 'Marek'), at(PETR, 'Petr'), at(DANA, 'Dana'), away(RADKA, 'Radka')],
      entries: [
        buyin(MAREK, 500),
        buyin(PETR, 500),
        rebuy(PETR, 1000),
        buyin(DANA, 1000),
        expense(MAREK, 170),
      ],
      // 3000 bought in, nothing cashed out, so the counts must total 3000
      finalCounts: counts([[MAREK, 1982], [PETR, 270], [DANA, 748]]),
      rules: [
        rule({
          id: 'kitchen', name: 'Kitchen & drinks', destination: 'bill', sortOrder: 1,
          amountKind: 'fixed', amount: money(170), charge: 'everyone_flat',
          split: 'evenly', collectorPlayerId: MAREK,
        }),
        rule({
          id: 'kitty', name: 'Group kitty', destination: 'kitty', sortOrder: 2,
          amountKind: 'percent', amount: money(10), basis: 'net_after_others',
          charge: 'winners_only', collectorPlayerId: RADKA,
        }),
      ],
    };
  };

  it('produces the right money for everyone', () => {
    const r = settle(input());

    // gross: Marek +1482, Petr -1230, Dana -252
    const marek = r.players.find((p) => p.playerId === MAREK)!;
    expect(marek.boughtIn).toBe(500);
    expect(marek.endedWith).toBe(1982);
    expect(marek.grossResult).toBe(1482);

    // the bill: 170 across three -> 57 / 57 / 56, biggest winner first
    expect(r.deductions[0].total).toBe(170);
    // the kitty: 10% of Marek's win after the bill -> 1425 * 0.1 = 142.5 -> 143
    expect(r.deductions[1].total).toBe(143);

    expect(chargedOf(r, MAREK)).toBe(200); // 57 + 143
    expect(positionOf(r, MAREK)).toBe(1452); // 1482 - 200 + 170 reimbursed
    expect(positionOf(r, PETR)).toBe(-1286);
    expect(positionOf(r, DANA)).toBe(-309);
    expect(positionOf(r, RADKA)).toBe(143);

    expect(r.totalOffTable).toBe(313);
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
  });

  it('settles it in as few payments as it can, largest debt first', () => {
    const r = settle(input());
    expect(r.transfers).toEqual([
      { fromPlayerId: PETR, toPlayerId: MAREK, amount: 1286 },
      { fromPlayerId: DANA, toPlayerId: MAREK, amount: 166 },
      { fromPlayerId: DANA, toPlayerId: RADKA, amount: 143 },
    ]);
    expect(transfersBalance(r)).toBe(true);
  });

  it('does not depend on the order things arrive in', () => {
    const a = settle(input());

    const shuffled = input();
    const b = settle({
      ...shuffled,
      players: [...shuffled.players].reverse(),
      entries: [...shuffled.entries].reverse(),
      rules: [...shuffled.rules].reverse(), // sortOrder still decides
    });

    expect(b.players).toEqual(a.players);
    expect(b.transfers).toEqual(a.transfers);
    expect(b.totalOffTable).toBe(a.totalOffTable);
  });

  it('gives the identical answer every time it runs', () => {
    const a = settle(input());
    for (let i = 0; i < 20; i++) {
      expect(settle(input())).toEqual(a);
    }
  });
});

describe('matchTransfers()', () => {
  it('pairs the biggest debtor with the biggest creditor', () => {
    const transfers = matchTransfers([
      { playerId: 'a', name: 'a', boughtIn: money(0), endedWith: money(0), grossResult: money(0), charged: money(0), credited: money(0), finalPosition: money(-500) },
      { playerId: 'b', name: 'b', boughtIn: money(0), endedWith: money(0), grossResult: money(0), charged: money(0), credited: money(0), finalPosition: money(-300) },
      { playerId: 'c', name: 'c', boughtIn: money(0), endedWith: money(0), grossResult: money(0), charged: money(0), credited: money(0), finalPosition: money(600) },
      { playerId: 'd', name: 'd', boughtIn: money(0), endedWith: money(0), grossResult: money(0), charged: money(0), credited: money(0), finalPosition: money(200) },
    ]);

    // a owes 500, b owes 300; c is owed 600, d is owed 200.
    // a clears against c (the biggest), leaving c on 100. b then pays the
    // largest outstanding creditor first — d's 200 before c's remaining 100.
    expect(transfers).toEqual([
      { fromPlayerId: 'a', toPlayerId: 'c', amount: 500 },
      { fromPlayerId: 'b', toPlayerId: 'd', amount: 200 },
      { fromPlayerId: 'b', toPlayerId: 'c', amount: 100 },
    ]);
  });

  it('has nothing to do when everyone is square', () => {
    expect(matchTransfers([])).toEqual([]);
  });
});

// =============================================================================
// Properties — the things that must hold for ANY night
// =============================================================================

describe('invariants over many random nights', () => {
  // Deterministic pseudo-random, so a failure can be reproduced exactly.
  // xorshift32, kept inside 32 bits — a plain LCG here overflows
  // Number.MAX_SAFE_INTEGER and quietly stops being random.
  let seed = 987654321;
  const next = (n: number) => {
    seed ^= seed << 13; seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= seed << 5; seed >>>= 0;
    return seed % n;
  };

  function randomNight(): SettlementInput {
    reset();
    const playerCount = 2 + next(5);
    const ids = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
    const players: Player[] = ids.map((id) => at(id));
    const collectorIsPlaying = next(2) === 0;
    if (!collectorIsPlaying) players.push(away(RADKA));

    const entries: LedgerEntry[] = [];
    const buyIns = ids.map(() => money(100 * (1 + next(20))));
    ids.forEach((id, i) => entries.push(buyin(id, buyIns[i])));

    // Someone occasionally pays for food.
    if (next(3) === 0) entries.push(expense(ids[next(ids.length)], money(10 * (1 + next(30)))));

    // Chips are conserved: distribute exactly what was bought in.
    const pot = sum(buyIns);
    const stacks = allocate(pot, ids.map(() => next(100)));
    const finalCounts = new Map<PlayerId, Money>();
    ids.forEach((id, i) => finalCounts.set(id, stacks[i]));

    const collector = collectorIsPlaying ? ids[next(ids.length)] : RADKA;
    const kinds = ['percent', 'fixed'] as const;
    const bases = ['gross', 'net_after_others'] as const;
    const charges = ['winners_only', 'everyone_flat'] as const;
    const splits = ['by_percent', 'evenly'] as const;
    const destinations = ['bill', 'kitty', 'host_fee', 'next_pot'] as const;

    const rules: MoneyRule[] = Array.from({ length: next(4) }, (_, i) => {
      const amountKind = kinds[next(kinds.length)];
      return rule({
        id: `r${i}`,
        amountKind,
        amount: money(amountKind === 'percent' ? 1 + next(100) : 1 + next(500)),
        basis: bases[next(bases.length)],
        // A percentage may only ever be charged to winners, so the generator
        // never produces the pair the engine rejects.
        charge: amountKind === 'percent' ? 'winners_only' : charges[next(charges.length)],
        split: splits[next(splits.length)],
        destination: destinations[next(destinations.length)],
        collectorPlayerId: collector,
        sortOrder: i,
      });
    });

    return { players, entries, finalCounts, rules };
  }

  it('always balances: positions sum to zero and the transfers clear them', () => {
    // A property test is only worth as much as the cases it actually reaches,
    // so the run keeps score and asserts the corpus was varied at the end.
    const seen = {
      expenses: 0, percentRule: 0, fixedRule: 0, netBasis: 0,
      absentCollector: 0, deductions: 0, moneyMoved: 0,
    };

    for (let i = 0; i < 1500; i++) {
      const night = randomNight();
      const r = settle(night);

      if (night.entries.some((e) => e.type === 'expense')) seen.expenses++;
      if (night.rules.some((x) => x.amountKind === 'percent')) seen.percentRule++;
      if (night.rules.some((x) => x.amountKind === 'fixed')) seen.fixedRule++;
      if (night.rules.some((x) => x.basis === 'net_after_others')) seen.netBasis++;
      if (night.players.some((p) => !p.atTable)) seen.absentCollector++;
      if (r.deductions.length > 0) seen.deductions++;
      if (r.totalOffTable > 0) seen.moneyMoved++;

      expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
      expect(transfersBalance(r)).toBe(true);

      // every deduction pays out exactly what it took
      for (const d of r.deductions) {
        expect(sum(d.charges.map((c) => c.amount))).toBe(d.total);
        expect(sum(d.credits.map((c) => c.amount))).toBe(d.total);
      }

      // money off the table is the sum of the deductions, and never negative
      expect(r.totalOffTable).toBe(sum(r.deductions.map((d) => d.total)));
      expect(r.totalOffTable).toBeGreaterThanOrEqual(0);

      // every figure is a whole number
      for (const p of r.players) expect(Number.isInteger(p.finalPosition)).toBe(true);
      for (const t of r.transfers) expect(t.amount).toBeGreaterThan(0);
    }

    // If any of these ever hits zero the generator has degenerated and the
    // "1500 nights passed" above would be meaningless.
    for (const [what, count] of Object.entries(seen)) {
      expect(count, `random nights never covered: ${what}`).toBeGreaterThan(50);
    }
  });

  it('never needs more transfers than there are people', () => {
    for (let i = 0; i < 500; i++) {
      const night = randomNight();
      const r = settle(night);
      expect(r.transfers.length).toBeLessThan(r.players.length);
    }
  });
});

describe('what happens to money that is missing', () => {
  // Two ways to close a short night, both allowed: record the gap and sort the
  // payouts out afterwards, or have somebody absorb it there and then.
  const shortNight = (
    ack: Partial<SettlementInput['acknowledgedDiscrepancy']> = {},
  ): SettlementInput => {
    reset();
    return {
      players: [at(MAREK), at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[MAREK, 1500], [PETR, 950], [DANA, 500]]), // 50 short
      rules: [],
      acknowledgedDiscrepancy: {
        amount: money(-50),
        confirmedByUserId: 'host-1',
        confirmedAt: '2026-08-12T23:59:00.000Z',
        note: 'Fifty short after counting twice.',
        ...ack,
      },
    };
  };

  it('records the gap and leaves it unassigned by default', () => {
    const r = settle(shortNight());
    const unaccounted = r.players.find((p) => p.playerId === UNACCOUNTED_ID);

    expect(unaccounted?.finalPosition).toBe(50);
    expect(r.acknowledgedDiscrepancy?.note).toBe('Fifty short after counting twice.');
    // nobody's own result was quietly altered to make it balance
    expect(positionOf(r, MAREK)).toBe(500);
    expect(positionOf(r, PETR)).toBe(-50);
    expect(positionOf(r, DANA)).toBe(-500);
  });

  it('lets the kitty holder absorb it there and then', () => {
    const r = settle(shortNight({ absorbedByPlayerId: RADKA }));

    // no phantom party: the shortfall sits with a real person
    expect(r.players.some((p) => p.playerId === UNACCOUNTED_ID)).toBe(false);
    expect(positionOf(r, RADKA)).toBe(50);
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
    expect(transfersBalance(r)).toBe(true);
  });

  it('lets a player take it instead', () => {
    const r = settle(shortNight({ absorbedByPlayerId: MAREK }));
    // Marek was up 500 and takes the 50 himself
    expect(positionOf(r, MAREK)).toBe(550);
    expect(r.players.some((p) => p.playerId === UNACCOUNTED_ID)).toBe(false);
  });

  it('absorbs a surplus the other way round', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 1000], [DANA, 1075]]), // 75 too many
      rules: [],
      acknowledgedDiscrepancy: {
        amount: money(75),
        confirmedByUserId: 'host-1',
        confirmedAt: '2026-08-12T23:59:00.000Z',
        absorbedByPlayerId: RADKA,
      },
    });
    expect(positionOf(r, RADKA)).toBe(-75);
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
  });

  it('refuses to hand the shortfall to somebody who was not there', () => {
    expect(() => settle(shortNight({ absorbedByPlayerId: 'ghost' }))).toThrow(SettlementError);
  });
});
