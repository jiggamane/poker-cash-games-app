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
import type { LedgerEntry, MoneyRule, Player, PlayerId } from './types';

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
    split: 'equal',
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

  it('rounds a percentage down, so a rule never takes more than it says', () => {
    reset();
    const r = settle({
      players: [at(PETR), at(DANA), away(RADKA)],
      entries: [buyin(PETR, 1000), buyin(DANA, 1000)],
      finalCounts: counts([[PETR, 995], [DANA, 1005]]),
      rules: [rule({ id: 'kitty', amount: money(10) })],
    });
    // 10% of a 5 win is 0.5 -> 0
    expect(chargedOf(r, DANA)).toBe(0);
    expect(r.totalOffTable).toBe(0);
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
        rule({ id: 'kitty', amountKind: 'fixed', amount: money(100), charge: 'everyone_flat', split: 'equal' }),
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
        rule({ id: 'bill2', amountKind: 'fixed', amount: money(300), charge: 'winners_only', split: 'by_win_size' }),
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
        rule({ id: 'kitty', amountKind: 'fixed', amount: money(90), charge: 'winners_only', split: 'across_everyone' }),
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
               charge: 'everyone_flat', split: 'equal', collectorPlayerId: MAREK }),
      ],
    });

    expect(r.deductions[0].total).toBe(180); // 60 + 90 + 30
    // each is credited exactly their own outlay, not an average
    expect(r.players.find((p) => p.playerId === PETR)!.credited).toBe(90);
    expect(r.players.find((p) => p.playerId === MAREK)!.credited).toBe(90);
    expect(r.players.find((p) => p.playerId === DANA)!.credited).toBe(0);
    expect(chargedOf(r, DANA)).toBe(60); // 180 split three ways
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
               charge: 'everyone_flat', split: 'equal', collectorPlayerId: MAREK }),
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
          charge: 'winners_only', split: 'by_win_size', collectorPlayerId: MAREK,
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
               charge: 'winners_only', split: 'by_win_size', collectorPlayerId: MAREK }),
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
          split: 'across_everyone', collectorPlayerId: MAREK,
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

    // the bill: 170 across three -> 57 / 57 / 56
    expect(r.deductions[0].total).toBe(170);
    // the kitty: 10% of Marek's win after the bill -> floor(1425 * 0.1) = 142
    expect(r.deductions[1].total).toBe(142);

    expect(chargedOf(r, MAREK)).toBe(199); // 57 + 142
    expect(positionOf(r, MAREK)).toBe(1453); // 1482 - 199 + 170 reimbursed
    expect(positionOf(r, PETR)).toBe(-1287);
    expect(positionOf(r, DANA)).toBe(-308);
    expect(positionOf(r, RADKA)).toBe(142);

    expect(r.totalOffTable).toBe(312);
    expect(sum(r.players.map((p) => p.finalPosition))).toBe(0);
  });

  it('settles it in as few payments as it can, largest debt first', () => {
    const r = settle(input());
    expect(r.transfers).toEqual([
      { fromPlayerId: PETR, toPlayerId: MAREK, amount: 1287 },
      { fromPlayerId: DANA, toPlayerId: MAREK, amount: 166 },
      { fromPlayerId: DANA, toPlayerId: RADKA, amount: 142 },
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
      { playerId: 'a', boughtIn: money(0), endedWith: money(0), grossResult: money(0), charged: money(0), credited: money(0), finalPosition: money(-500) },
      { playerId: 'b', boughtIn: money(0), endedWith: money(0), grossResult: money(0), charged: money(0), credited: money(0), finalPosition: money(-300) },
      { playerId: 'c', boughtIn: money(0), endedWith: money(0), grossResult: money(0), charged: money(0), credited: money(0), finalPosition: money(600) },
      { playerId: 'd', boughtIn: money(0), endedWith: money(0), grossResult: money(0), charged: money(0), credited: money(0), finalPosition: money(200) },
    ]);

    expect(transfers).toEqual([
      { fromPlayerId: 'a', toPlayerId: 'c', amount: 500 },
      { fromPlayerId: 'b', toPlayerId: 'c', amount: 100 },
      { fromPlayerId: 'b', toPlayerId: 'd', amount: 200 },
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
    const splits = ['equal', 'by_win_size', 'across_everyone'] as const;
    const destinations = ['bill', 'kitty', 'host_fee', 'next_pot'] as const;

    const rules: MoneyRule[] = Array.from({ length: next(4) }, (_, i) => {
      const amountKind = kinds[next(kinds.length)];
      return rule({
        id: `r${i}`,
        amountKind,
        amount: money(amountKind === 'percent' ? 1 + next(100) : 1 + next(500)),
        basis: bases[next(bases.length)],
        charge: charges[next(charges.length)],
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
