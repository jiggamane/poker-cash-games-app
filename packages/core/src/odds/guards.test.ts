import { describe, expect, it } from 'vitest';
import { DECK, parseCards, type Card } from './cards';
import { OddsEnumeration, odds, oddsProblem, type Hand } from './odds';

const hand = (s: string): Hand => parseCards(s)! as unknown as Hand;
const cards = (s: string) => parseCards(s)!;

/**
 * What the engine refuses, and what it must never do instead.
 *
 * The screen lets a reader deal dead cards without limit, so the engine is
 * the only thing standing between a long run of taps and a calculation that
 * can never finish: with fewer cards left than the board needs, the
 * combination walk has nowhere to go and never reports that it is done.
 */
describe('a table that cannot be finished', () => {
  const two = [hand('AsKs'), hand('QdQc')];
  const rest = DECK.filter((c) => !two.flat().includes(c));

  it('is refused when the dead cards leave too few for the board', () => {
    const dead = rest.slice(0, rest.length - 4); // 4 left, 5 needed
    expect(oddsProblem({ hands: two, board: [], dead })).toMatch(/enough cards/i);
    expect(() => new OddsEnumeration({ hands: two, board: [], dead })).toThrow(/enough cards/i);
  });

  it('is calculated when exactly enough remain, and there is one way to finish it', () => {
    const dead = rest.slice(0, rest.length - 5); // 5 left, 5 needed
    const r = odds({ hands: two, board: [], dead });
    expect(r.boards).toBe(1);
  });

  it('counts the board against what is needed: three on the flop need only two more', () => {
    const board = cards('2c 3c 4c');
    const used = new Set<Card>([...two.flat(), ...board]);
    const left = DECK.filter((c) => !used.has(c));
    const dead = left.slice(0, left.length - 2); // 2 left, 2 needed
    expect(odds({ hands: two, board, dead }).boards).toBe(1);
    expect(oddsProblem({ hands: two, board, dead: left.slice(0, left.length - 1) })).toMatch(/enough cards/i);
  });
});

describe('a hand that is not two cards', () => {
  it('is refused rather than scored with a hole in it', () => {
    const one = [Number(parseCards('As')![0])] as unknown as Hand;
    expect(oddsProblem({ hands: [one, hand('QdQc')], board: [] })).toMatch(/two cards/i);
    const three = parseCards('AsKsQs')! as unknown as Hand;
    expect(oddsProblem({ hands: [three, hand('QdQc')], board: [] })).toMatch(/two cards/i);
  });

  it('is refused when a card is not an integer in the deck', () => {
    expect(oddsProblem({ hands: [[0, 52] as unknown as Hand, hand('QdQc')], board: [] })).toMatch(/not a card/i);
    expect(oddsProblem({ hands: [[0, 1.5] as unknown as Hand, hand('QdQc')], board: [] })).toMatch(/not a card/i);
    expect(oddsProblem({ hands: [[0, -1] as unknown as Hand, hand('QdQc')], board: [] })).toMatch(/not a card/i);
    expect(oddsProblem({ hands: [[0, NaN] as unknown as Hand, hand('QdQc')], board: [] })).toMatch(/not a card/i);
  });
});

describe('stepping', () => {
  it('always makes progress, whatever slice size it is given', () => {
    const input = { hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c') };
    for (const bad of [0, -5, 0.4, NaN]) {
      const e = new OddsEnumeration(input);
      let calls = 0;
      while (!e.step(bad)) if (++calls > 1000) throw new Error(`no progress with a slice of ${bad}`);
      expect(e.result()).toEqual(odds(input));
    }
  });

  it('reports nothing dealt, rather than a figure, before the first step', () => {
    const e = new OddsEnumeration({ hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c') });
    const r = e.result();
    expect(r.boards).toBe(0);
    expect(r.seats.every((s) => s.wins === 0 && s.ties === 0 && s.win === 0)).toBe(true);
  });
});

describe('equity is exact', () => {
  it('sums to one without rounding error, and every share is a whole count of a ninth-ish unit', () => {
    /* Five-way ties on the river put 1/5 in each seat; sevenway 1/7. The sum
       over seats must be 1 to the last bit, not to a tolerance. */
    const five = odds({
      hands: [hand('2c3d'), hand('4h5d'), hand('6c7d'), hand('8c9d'), hand('2h3s')],
      board: cards('As Kd Qh Jc Ts'),
    });
    expect(five.seats.reduce((n, s) => n + s.equity, 0)).toBe(1);
    expect(five.seats.every((s) => s.equity === 0.2)).toBe(true);

    const seven = odds({
      hands: [hand('2c3d'), hand('4h5d'), hand('6c7d'), hand('8c9d'), hand('2h3s'), hand('4c5s'), hand('6h7s')],
      board: cards('As Kd Qh Jc Ts'),
    });
    expect(seven.seats.every((s) => s.equity === 1 / 7)).toBe(true);
  });

  it('does not drift over a million three-way ties', () => {
    /* Three hands of the same rank before the flop: over a million boards are
       shared three ways, and adding 1/3 that many times in floating point
       leaves the total 1.4e-11 short of 1. Counted in whole units it is
       within the last rounding of the division. */
    const r = odds({ hands: [hand('AsKs'), hand('AhKh'), hand('AdKd')], board: [] });
    expect(r.seats.map((s) => s.ties).every((t) => t > 1_000_000)).toBe(true);
    expect(Math.abs(r.seats.reduce((n, s) => n + s.equity, 0) - 1)).toBeLessThan(1e-15);
    expect(r.seats[0]!.equity).toBe(r.seats[1]!.equity);
    expect(r.seats[1]!.equity).toBe(r.seats[2]!.equity);
  });

  it('sums to one over a whole flop, to the last bit, however the ties fall', () => {
    const hands = ['AsKs', 'AdKd', 'QcQh', 'JsTs', '9d8d', '7c6c', '5h4h', '3s2s', 'Th9h'].map(hand);
    const r = odds({ hands, board: cards('Ac Kh 2d') });
    expect(r.seats.reduce((n, s) => n + s.equity, 0)).toBeCloseTo(1, 15);
    /* Equity times the boards is a whole number of 2520ths: ties are shared
       1/2 … 1/9 and 2520 is the least number every one of them divides. */
    for (const s of r.seats) {
      const units = s.equity * r.boards * 2520;
      expect(Math.abs(units - Math.round(units))).toBeLessThan(1e-6);
    }
  });
});
