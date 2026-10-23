import { describe, expect, it } from 'vitest';
import { money } from '../money';
import { EMPTY_TABLE_RULES } from './tableRules';
import { rebuyAllowed, shortBank, sidePots } from './calculators';

const m = (n: number) => money(n);

describe('side pots', () => {
  it('lays out the textbook three-way all-in', () => {
    /* A has 100, B 300, C 500, all in. */
    const pots = sidePots([
      { playerId: 'a', amount: m(100) },
      { playerId: 'b', amount: m(300) },
      { playerId: 'c', amount: m(500) },
    ]);
    expect(pots).toEqual([
      { amount: m(300), eligible: ['a', 'b', 'c'] },
      { amount: m(400), eligible: ['b', 'c'] },
      { amount: m(200), eligible: ['c'] },
    ]);
    expect(pots.reduce((t, p) => t + p.amount, 0)).toBe(m(900));
  });

  it('keeps a folded player\'s chips in the pot but out of the eligibility', () => {
    const pots = sidePots(
      [
        { playerId: 'a', amount: m(100) },
        { playerId: 'b', amount: m(100) },
        { playerId: 'f', amount: m(40) },
      ],
      ['f'],
    );
    expect(pots).toEqual([
      { amount: m(120), eligible: ['a', 'b'] },
      { amount: m(120), eligible: ['a', 'b'] },
    ]);
  });

  it('is one pot when everyone matched', () => {
    expect(sidePots([{ playerId: 'a', amount: m(50) }, { playerId: 'b', amount: m(50) }])).toEqual([
      { amount: m(100), eligible: ['a', 'b'] },
    ]);
    expect(sidePots([])).toEqual([]);
  });
});

describe('the short bank', () => {
  const players = [
    { playerId: 'host', result: m(200), host: true },
    { playerId: 'l1', result: m(-150), host: false },
    { playerId: 'l2', result: m(-50), host: false },
  ];

  it('says who carries it under each rule', () => {
    expect(shortBank(m(1000), m(980), { shortBank: 'hostAbsorbs' }, players).carriers).toEqual([
      { playerId: 'host', amount: m(20) },
    ]);
    expect(shortBank(m(1000), m(980), { shortBank: 'splitLosers' }, players).carriers).toEqual([
      { playerId: 'l1', amount: m(10) },
      { playerId: 'l2', amount: m(10) },
    ]);
    const all = shortBank(m(1000), m(800), { shortBank: 'splitAll' }, players);
    expect(all.missing).toBe(money(200));
    expect(all.carriers.map((c) => c.amount)).toEqual([money(67), money(67), money(66)]);
  });

  it('leaves it open when the group has not decided, or decides on the night', () => {
    expect(shortBank(m(1000), m(980), EMPTY_TABLE_RULES, players)).toEqual({
      missing: m(20),
      carriers: [],
      rule: 'unset',
    });
    expect(shortBank(m(1000), m(980), { shortBank: 'decideThen' }, players).carriers).toEqual([]);
  });

  it('carries nothing when the bank balances or is over', () => {
    expect(shortBank(m(1000), m(1000), { shortBank: 'hostAbsorbs' }, players).carriers).toEqual([]);
    const over = shortBank(m(1000), m(1010), { shortBank: 'hostAbsorbs' }, players);
    expect(over.missing).toBe(m(-10));
    expect(over.carriers).toEqual([]);
  });
});

describe('a rebuy against the cap', () => {
  it('allows anything with no cap set, and says so', () => {
    const v = rebuyAllowed(EMPTY_TABLE_RULES, m(1500), m(200), m(5000));
    expect(v.allowed).toBe(true);
    expect(v.cap).toBeNull();
    expect(v.reason).toMatch(/has not set/);
  });

  it('measures a stack cap against the biggest stack and the buyer\'s own', () => {
    const rules = { rebuyCap: { kind: 'largestStack', percent: 50 } as const };
    const ok = rebuyAllowed(rules, m(1500), m(200), m(500));
    expect(ok.allowed).toBe(true);
    expect(ok.cap).toBe(m(550));
    const over = rebuyAllowed(rules, m(1500), m(200), m(600));
    expect(over.allowed).toBe(false);
    expect(over.reason).toBe('Over the cap: the most that can be bought now is $550.');
  });

  it('measures a fixed cap', () => {
    const v = rebuyAllowed({ rebuyCap: { kind: 'fixed', amount: m(1000) } }, m(5000), m(900), m(200));
    expect(v.allowed).toBe(false);
    expect(v.cap).toBe(m(100));
  });
});
