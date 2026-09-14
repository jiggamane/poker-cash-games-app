import { describe, expect, it } from 'vitest';
import { money, type Money } from './money';
import { periodsOf, rateLabel, ruleTerms, settle, SettlementError, type SettlementInput } from './index';
import type { LedgerEntry, MoneyRule, Player, PlayerId, RulePeriod } from './types';

/**
 * The fees that are not a share of a win — `fees.ts`.
 *
 * The night every case here is built on is the plainest one that can carry a
 * fee: three people, a thousand each, and Dana up $600 on Petr's $400 and
 * Marek's $200. Every figure below is worked out in the test's own name, so a
 * failure says what the fee should have been rather than that a number moved.
 */

const MAREK = 'p1';
const PETR = 'p2';
const DANA = 'p3';
const HOST = 'p9'; // holds the money; never sits down

let seq = 0;
const at = (id: PlayerId): Player => ({ id, name: id, atTable: true });
const away = (id: PlayerId): Player => ({ id, name: id, atTable: false });
const buyin = (playerId: PlayerId, amount: number): LedgerEntry => ({
  id: `e${++seq}`, seq, type: 'buyin', playerId, amount: money(amount),
});
const rebuy = (playerId: PlayerId, amount: number): LedgerEntry => ({
  id: `e${++seq}`, seq, type: 'rebuy', playerId, amount: money(amount),
});

function rule(over: Partial<MoneyRule> & { id: string }): MoneyRule {
  return {
    name: over.id,
    active: true,
    amountKind: 'fixed',
    amount: money(100),
    basis: 'gross',
    charge: 'everyone_flat',
    destination: 'host_fee',
    split: 'evenly',
    collectorPlayerId: HOST,
    sortOrder: 0,
    ...over,
  } as MoneyRule;
}

const HOUR: RulePeriod = { minutes: 60, rounding: 'up' };

/** Marek −$800, Petr −$600, Dana +$1,400 before anything is taken off. */
function night(rules: MoneyRule[], timing?: SettlementInput['timing']): SettlementInput {
  seq = 0;
  return {
    players: [at(MAREK), at(PETR), at(DANA), away(HOST)],
    entries: [buyin(MAREK, 1000), buyin(PETR, 1000), buyin(DANA, 1000)],
    finalCounts: new Map<PlayerId, Money>([
      [MAREK, money(200)],
      [PETR, money(400)],
      [DANA, money(2400)],
    ]),
    rules,
    ...(timing === undefined ? {} : { timing }),
  };
}

const chargedOf = (r: ReturnType<typeof settle>, id: PlayerId) =>
  r.players.find((p) => p.playerId === id)!.charged;
const positionOf = (r: ReturnType<typeof settle>, id: PlayerId) =>
  r.players.find((p) => p.playerId === id)!.finalPosition;

/** Nothing is invented or lost, whatever the fee did. */
const balances = (r: ReturnType<typeof settle>) =>
  r.players.reduce((a, p) => a + p.finalPosition, 0) === 0;

// =============================================================================

describe('periods', () => {
  const half = (rounding: RulePeriod['rounding']): RulePeriod => ({ minutes: 30, rounding });

  it('charges every period begun — what "time" means in a card room', () => {
    expect(periodsOf(31, half('up'))).toBe(2);
    expect(periodsOf(60, half('up'))).toBe(2);
    expect(periodsOf(61, half('up'))).toBe(3);
  });

  it('charges only whole periods, or the nearest, or the exact fraction', () => {
    expect(periodsOf(59, half('down'))).toBe(1);
    expect(periodsOf(44, half('nearest'))).toBe(1);
    expect(periodsOf(46, half('nearest'))).toBe(2);
    expect(periodsOf(45, half('prorate'))).toBe(1.5);
  });

  it('charges nothing for a table that has not started', () => {
    expect(periodsOf(0, half('up'))).toBe(0);
  });
});

describe('a rake by the hour, per player', () => {
  it('charges each person for the hours they sat, winners and losers alike', () => {
    // $5 an hour. Marek 4h, Petr 3h 10m (four hours begun), Dana 5h.
    const r = settle(
      night(
        [rule({ id: 'time', amountKind: 'per_player_time', amount: money(5), period: HOUR })],
        {
          tableMinutes: 300,
          minutesByPlayer: new Map([[MAREK, 240], [PETR, 190], [DANA, 300]]),
        },
      ),
    );

    expect(chargedOf(r, MAREK)).toBe(20);
    expect(chargedOf(r, PETR)).toBe(20);
    expect(chargedOf(r, DANA)).toBe(25);
    // The host holds all of it, and the table is $65 lighter.
    expect(positionOf(r, HOST)).toBe(65);
    expect(r.totalOffTable).toBe(65);
    expect(balances(r)).toBe(true);
  });

  it('charges anybody the caller could not time for the whole night', () => {
    const r = settle(
      night([rule({ id: 'time', amountKind: 'per_player_time', amount: money(5), period: HOUR })], {
        tableMinutes: 300,
        minutesByPlayer: new Map([[MAREK, 60]]),
      }),
    );

    expect(chargedOf(r, MAREK)).toBe(5);
    expect(chargedOf(r, PETR)).toBe(25);
    expect(chargedOf(r, DANA)).toBe(25);
  });

  it('stops at the ceiling — "five an hour, forty a night at most"', () => {
    const r = settle(
      night(
        [
          rule({
            id: 'time',
            amountKind: 'per_player_time',
            amount: money(5),
            period: HOUR,
            maxPerPlayer: money(40),
          }),
        ],
        { tableMinutes: 720 }, // twelve hours: $60 each, capped to $40
      ),
    );

    expect(chargedOf(r, MAREK)).toBe(40);
    expect(chargedOf(r, DANA)).toBe(40);
    expect(r.totalOffTable).toBe(120);
  });

  it(`prorates to the group's step when the group prorates`, () => {
    const r = settle(
      night(
        [
          rule({
            id: 'time',
            amountKind: 'per_player_time',
            amount: money(20),
            period: { minutes: 60, rounding: 'prorate' },
          }),
        ],
        { tableMinutes: 90, minutesByPlayer: new Map([[MAREK, 45], [PETR, 90], [DANA, 90]]) },
      ),
    );

    expect(chargedOf(r, MAREK)).toBe(15); // three quarters of an hour at $20
    expect(chargedOf(r, PETR)).toBe(30);
  });

  it('can be charged to the winners only, when that is what the group agreed', () => {
    const r = settle(
      night(
        [
          rule({
            id: 'time',
            amountKind: 'per_player_time',
            amount: money(10),
            period: HOUR,
            charge: 'winners_only',
          }),
        ],
        { tableMinutes: 180 },
      ),
    );

    expect(chargedOf(r, MAREK)).toBe(0);
    expect(chargedOf(r, PETR)).toBe(0);
    expect(chargedOf(r, DANA)).toBe(30);
  });
});

describe('renting the room', () => {
  it('by the hour, split evenly across the table', () => {
    // $20 an hour for five hours = $100, three ways.
    const r = settle(
      night([rule({ id: 'room', amountKind: 'per_time', amount: money(20), period: HOUR })], {
        tableMinutes: 300,
      }),
    );

    expect(r.deductions[0].total).toBe(100);
    expect(chargedOf(r, MAREK) + chargedOf(r, PETR) + chargedOf(r, DANA)).toBe(100);
    // $100 three ways is 34/33/33, and the remainder goes to the biggest win.
    expect(chargedOf(r, DANA)).toBe(34);
    expect(balances(r)).toBe(true);
  });

  it('by the hour, carried by the winners in proportion to the win', () => {
    const r = settle(
      night(
        [
          rule({
            id: 'room',
            amountKind: 'per_time',
            amount: money(30),
            period: HOUR,
            charge: 'winners_only',
            split: 'by_percent',
          }),
        ],
        { tableMinutes: 120 },
      ),
    );

    expect(chargedOf(r, DANA)).toBe(60); // the only winner carries the lot
    expect(chargedOf(r, MAREK)).toBe(0);
  });

  it('a flat hire is the fixed rule it always was', () => {
    const r = settle(night([rule({ id: 'room', amountKind: 'fixed', amount: money(90) })]));
    expect(r.deductions[0].total).toBe(90);
    expect(chargedOf(r, MAREK)).toBe(30);
  });
});

describe('a fee per head and a fee per buy-in', () => {
  it('takes the same stated amount off everybody at the table', () => {
    const r = settle(night([rule({ id: 'cards', amountKind: 'per_player', amount: money(10) })]));

    expect(chargedOf(r, MAREK)).toBe(10);
    expect(chargedOf(r, PETR)).toBe(10);
    expect(chargedOf(r, DANA)).toBe(10);
    expect(r.totalOffTable).toBe(30);
    // The host was never at the table, so the fee does not reach them.
    expect(positionOf(r, HOST)).toBe(30);
  });

  it('takes the drop off every buy-in and every rebuy', () => {
    const input = night([rule({ id: 'drop', amountKind: 'per_buyin', amount: money(5) })]);
    // Marek rebought twice; the table's money and the count move with it.
    const withRebuys: SettlementInput = {
      ...input,
      entries: [...input.entries, rebuy(MAREK, 1000), rebuy(MAREK, 1000)],
      finalCounts: new Map(input.finalCounts).set(MAREK, money(2200)),
    };

    const r = settle(withRebuys);
    expect(chargedOf(r, MAREK)).toBe(15); // three times on the table
    expect(chargedOf(r, PETR)).toBe(5);
    expect(balances(r)).toBe(true);
  });

  it(`does not round a stated amount to the group's step`, () => {
    // A group settling in tens still charges the $12 it agreed on.
    const r = settle({
      ...night([rule({ id: 'cards', amountKind: 'per_player', amount: money(12) })]),
      roundingMode: 'tens',
    });

    expect(r.deductions[0].charges.every((c) => c.amount === 12)).toBe(true);
  });

  it(`lets the host type over one person's figure, cap and all`, () => {
    const r = settle(
      night([
        rule({
          id: 'cards',
          amountKind: 'per_player',
          amount: money(20),
          maxPerPlayer: money(15),
          manualCharges: [{ playerId: PETR, amount: money(50) }],
        }),
      ]),
    );

    expect(chargedOf(r, MAREK)).toBe(15); // the rule's own figure, capped
    expect(chargedOf(r, PETR)).toBe(50); // the host's answer, untouched
  });
});

describe('what the engine refuses', () => {
  it('refuses a time fee on a night with no running time', () => {
    expect(() =>
      settle(night([rule({ id: 'time', amountKind: 'per_player_time', amount: money(5), period: HOUR })])),
    ).toThrow(SettlementError);
  });

  it('refuses a time fee with no period to charge by', () => {
    expect(() =>
      settle(
        night([rule({ id: 'time', amountKind: 'per_time', amount: money(5) })], {
          tableMinutes: 60,
        }),
      ),
    ).toThrow(SettlementError);
  });

  it('refuses a per-head fee that is also split by hand', () => {
    expect(() =>
      settle(
        night([
          rule({
            id: 'cards',
            amountKind: 'per_player',
            amount: money(10),
            split: 'custom',
            customShares: [{ playerId: DANA, amount: money(30) }],
          }),
        ]),
      ),
    ).toThrow(SettlementError);
  });

  it('refuses a ceiling on a total for the table, which has no per-person figure', () => {
    expect(() =>
      settle(night([rule({ id: 'room', amountKind: 'fixed', amount: money(90), maxPerPlayer: money(20) })])),
    ).toThrow(SettlementError);
  });

  it('settles a night whose time fee is switched off, clock or no clock', () => {
    const r = settle(
      night([
        rule({ id: 'time', amountKind: 'per_player_time', amount: money(5), period: HOUR, active: false }),
      ]),
    );
    expect(r.totalOffTable).toBe(0);
  });
});

describe('the terms, in words', () => {
  it('says the rate a person actually agreed to', () => {
    expect(rateLabel(rule({ id: 'x', amountKind: 'percent', amount: money(5) }))).toBe('5%');
    expect(rateLabel(rule({ id: 'x', amountKind: 'per_player', amount: money(10) }))).toBe('$10 each');
    expect(
      rateLabel(rule({ id: 'x', amountKind: 'per_player_time', amount: money(5), period: HOUR })),
    ).toBe('$5 an hour each');
    expect(
      rateLabel(
        rule({ id: 'x', amountKind: 'per_time', amount: money(20), period: { minutes: 30, rounding: 'up' } }),
      ),
    ).toBe('$20 a half hour');
    expect(rateLabel(rule({ id: 'x', amountKind: 'per_buyin', amount: money(5) }))).toBe('$5 a buy-in');
  });

  it('states the ceiling, because the ceiling is half of the deal', () => {
    expect(
      ruleTerms(rule({ id: 'x', amountKind: 'percent', amount: money(5), maxPerPlayer: money(50) })),
    ).toBe('5%, $50 at most');
  });

  it('says both halves of a room charged by the hour', () => {
    expect(
      ruleTerms(rule({ id: 'x', amountKind: 'per_time', amount: money(20), period: HOUR })),
    ).toBe('$20 an hour · evenly across the table');
  });

  it('leaves a percentage and a fixed sum reading exactly as they did', () => {
    expect(ruleTerms(rule({ id: 'x', amountKind: 'percent', amount: money(5) }))).toBe('5%');
    expect(
      ruleTerms(rule({ id: 'x', amountKind: 'fixed', amount: money(170), charge: 'winners_only' })),
    ).toBe('evenly between the winners');
  });
});
