import { describe, expect, it } from 'vitest';
import { MoneyError } from '../money';
import { parseCards } from './cards';
import { EQUITY_UNIT, odds, type Hand } from './odds';
import { MAX_POT_AMOUNT, formatHundredths, potOdds } from './potOdds';

const hand = (s: string): Hand => parseCards(s)! as unknown as Hand;
const cards = (s: string) => parseCards(s)!;

/** The canvas's own example: A♥K♥ against 2♣2♦ on Q♥ J♥ 3♠ 7♣, Player 1 to call. */
const turn = odds({ hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c') });
const seat = (i: number, r = turn) => r.seats[i]!;

describe('pot odds, worked by hand', () => {
  it('$25 into a $75 pot needs 25.00%; the hand has 40.91%; the call returns about $16', () => {
    /* 18 of the 44 river cards win: equity 18/44 = 40.909…%. The call returns
       18/44 × 100 − 25 = 15.909…, a whole unit of 16 — the app has no cents. */
    expect(turn.boards).toBe(44);
    const p = potOdds(75, 25, seat(0), turn.boards);
    expect(p.problem).toBeNull();
    expect(formatHundredths(p.needsHundredths)).toBe('25.00%');
    expect(formatHundredths(p.hasHundredths)).toBe('40.91%');
    expect(p.returns).toBe(16);
  });

  it('the other hand has the rest, and the same call is a loss for it', () => {
    const p = potOdds(75, 25, seat(1), turn.boards);
    expect(formatHundredths(p.hasHundredths)).toBe('59.09%');
    expect(p.returns).toBe(34); // 26/44 × 100 − 25 = 34.09
  });

  it('a call that needs more than the hand has is a negative return, rounded the same way', () => {
    /* $100 into a $10 pot: needs 100/110 = 90.91%; 18/44 × 110 − 100 = −55. */
    const p = potOdds(10, 100, seat(0), turn.boards);
    expect(formatHundredths(p.needsHundredths)).toBe('90.91%');
    expect(p.returns).toBe(-55);
  });

  it('breaks even exactly when the hand has what the call needs', () => {
    /* Pre-flop heads-up with a fair coin: two hands that tie on every board. */
    const flip = odds({ hands: [hand('AsKs'), hand('AhKh')], board: cards('2c 7d 9c Jd Qs') });
    expect(flip.seats[0]!.equity).toBe(0.5);
    const p = potOdds(50, 50, flip.seats[0]!, flip.boards);
    expect(formatHundredths(p.needsHundredths)).toBe('50.00%');
    expect(formatHundredths(p.hasHundredths)).toBe('50.00%');
    expect(p.returns).toBe(0);
  });
});

describe('the edges', () => {
  it('a pot of nothing makes the call need all of it', () => {
    const p = potOdds(0, 40, seat(0), turn.boards);
    expect(formatHundredths(p.needsHundredths)).toBe('100.00%');
    expect(p.returns).toBe(-24); // 18/44 × 40 − 40 = −23.6
  });

  it('a call larger than the pot is allowed', () => {
    const p = potOdds(20, 500, seat(0), turn.boards);
    expect(formatHundredths(p.needsHundredths)).toBe('96.15%');
    expect(p.returns).toBe(-287); // 18/44 × 520 − 500 = −287.27
  });

  it('no call is no comparison: the hand still has its equity, and nothing is returned', () => {
    const p = potOdds(75, 0, seat(0), turn.boards);
    expect(p.problem).not.toBeNull();
    expect(formatHundredths(p.hasHundredths)).toBe('40.91%');
    expect(p.returns).toBe(0);
  });

  it('a tie pays half, and a three-way tie a third', () => {
    const board = cards('2c 3d 4h 5s 9c');
    const two = odds({ hands: [hand('AsKd'), hand('AdKs')], board });
    expect(two.seats[0]!.equity).toBe(0.5);
    expect(potOdds(100, 100, two.seats[0]!, two.boards).returns).toBe(0); // 0.5 × 200 − 100
    const three = odds({ hands: [hand('AsKd'), hand('AdKs'), hand('AcKh')], board });
    expect(formatHundredths(potOdds(100, 100, three.seats[0]!, three.boards).hasHundredths)).toBe('33.33%');
    expect(potOdds(100, 100, three.seats[0]!, three.boards).returns).toBe(-33); // 200/3 − 100 = −33.33
  });

  it('equity of nothing and of everything', () => {
    const river = odds({ hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c Kc') });
    expect(river.boards).toBe(1);
    const win = potOdds(75, 25, river.seats[0]!, 1);
    expect(formatHundredths(win.hasHundredths)).toBe('100.00%');
    expect(win.returns).toBe(75); // the whole pot comes back, the call with it
    const lose = potOdds(75, 25, river.seats[1]!, 1);
    expect(formatHundredths(lose.hasHundredths)).toBe('0.00%');
    expect(lose.returns).toBe(-25);
  });

  it('rounds half away from zero, the same for a gain as for a loss', () => {
    /* Equity ½ on pot 3 + call 1 = 4: ½ × 4 − 1 = +1 exactly; use pot 2, call 1: ½ × 3 − 1 = +0.5 → 1, and the mirror −0.5 → −1. */
    expect(potOdds(2, 1, { equity: 0.5 }, 1).returns).toBe(1);
    expect(potOdds(2, 2, { equity: 0.25 }, 1).returns).toBe(-1); // 0.25 × 4 − 2 = −1 exactly
    expect(potOdds(1, 1, { equity: 0.25 }, 1).returns).toBe(-1); // 0.25 × 2 − 1 = −0.5 → −1
    expect(potOdds(1, 1, { equity: 0.75 }, 1).returns).toBe(1); // +0.5 → +1
  });
});

describe('it refuses what it cannot be exact about', () => {
  it('amounts that are not whole, not safe, negative or beyond what the keypad types', () => {
    expect(() => potOdds(75.5, 25, seat(0), 44)).toThrow(MoneyError);
    expect(() => potOdds(75, 25.5, seat(0), 44)).toThrow(MoneyError);
    expect(() => potOdds(-1, 25, seat(0), 44)).toThrow(MoneyError);
    expect(() => potOdds(75, -25, seat(0), 44)).toThrow(MoneyError);
    expect(() => potOdds(Number.NaN, 25, seat(0), 44)).toThrow(MoneyError);
    expect(() => potOdds(Number.MAX_SAFE_INTEGER, 25, seat(0), 44)).toThrow(MoneyError);
    expect(() => potOdds(MAX_POT_AMOUNT + 1, 25, seat(0), 44)).toThrow(MoneyError);
    expect(() => potOdds(75, MAX_POT_AMOUNT + 1, seat(0), 44)).toThrow(MoneyError);
  });

  it('the largest amounts are exact rather than overflowed', () => {
    /* units × (pot + call) is 4.3e9 × 2e9 — past 2^53 as a float. Exact in BigInt: */
    const big = odds({ hands: [hand('AhKh'), hand('2c2d')], board: [] });
    const p = potOdds(MAX_POT_AMOUNT, MAX_POT_AMOUNT, big.seats[0]!, big.boards);
    expect(formatHundredths(p.needsHundredths)).toBe('50.00%');
    /* equity ≈ 0.5008: returns ≈ 0.5008 × 2e9 − 1e9 ≈ 1.6e6, to the unit: */
    const units = Math.round(big.seats[0]!.equity * EQUITY_UNIT * big.boards);
    const exact = (BigInt(units) * 1_999_999_998n - 999_999_999n * BigInt(EQUITY_UNIT * big.boards)) / BigInt(EQUITY_UNIT * big.boards);
    expect(Math.abs(p.returns - Number(exact))).toBeLessThanOrEqual(1);
  });

  it('an equity that is not a whole number of units, or boards that are not', () => {
    expect(() => potOdds(75, 25, { equity: 0.4091 }, 44)).toThrow(MoneyError);
    expect(() => potOdds(75, 25, { equity: 1.5 }, 44)).toThrow(MoneyError);
    expect(() => potOdds(75, 25, { equity: -0.1 }, 44)).toThrow(MoneyError);
    expect(() => potOdds(75, 25, seat(0), 0)).toThrow(MoneyError);
    expect(() => potOdds(75, 25, seat(0), 4.5)).toThrow(MoneyError);
  });

  it('formats only a share of a whole', () => {
    expect(formatHundredths(0)).toBe('0.00%');
    expect(formatHundredths(5)).toBe('0.05%');
    expect(formatHundredths(10_000)).toBe('100.00%');
    expect(() => formatHundredths(10_001)).toThrow(MoneyError);
    expect(() => formatHundredths(-1)).toThrow(MoneyError);
    expect(() => formatHundredths(1.5)).toThrow(MoneyError);
  });
});

describe('it is the same arithmetic the engine does', () => {
  it('over random tables, `has` is the engine equity and `needs` is call ÷ (pot + call)', () => {
    let s = 12345;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 200; i++) {
      const pot = Math.floor(rnd() * 5000);
      const call = 1 + Math.floor(rnd() * 5000);
      const p = potOdds(pot, call, seat(0), turn.boards);
      const needs = (call / (pot + call)) * 100;
      expect(Math.abs(p.needsHundredths / 100 - needs)).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(Math.abs(p.hasHundredths / 100 - seat(0).equity * 100)).toBeLessThanOrEqual(0.005 + 1e-9);
      /* the money line agrees with the float formula to within the rounding to a whole unit */
      expect(Math.abs(p.returns - (seat(0).equity * (pot + call) - call))).toBeLessThanOrEqual(0.5 + 1e-6);
    }
  });
});
