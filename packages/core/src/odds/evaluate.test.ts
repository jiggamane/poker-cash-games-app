import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { HAND_CATEGORIES, categoryOf, evaluate } from './evaluate';

const v = (s: string) => evaluate(parseCards(s)!);
const cat = (s: string) => categoryOf(v(s));

describe('seven-card evaluation', () => {
  it('names every category', () => {
    expect(cat('As Ks Qs Js Ts 2d 3c')).toBe('Straight flush');
    expect(cat('As Ad Ah Ac Ks 2d 3c')).toBe('Four of a kind');
    expect(cat('As Ad Ah Kc Ks 2d 3c')).toBe('Full house');
    expect(cat('As Ks 9s 5s 2s 3d 4c')).toBe('Flush');
    expect(cat('As Kd Qh Jc Ts 2d 3c')).toBe('Straight');
    expect(cat('As Ad Ah Kc 9s 2d 3c')).toBe('Three of a kind');
    expect(cat('As Ad Kh Kc 9s 2d 3c')).toBe('Two pair');
    expect(cat('As Ad Kh Qc 9s 2d 3c')).toBe('Pair');
    expect(cat('As Kd Qh 9c 7s 2d 3c')).toBe('High card');
  });

  it('orders the categories as the rules do', () => {
    const ladder = [
      'As Kd Qh 9c 7s 2d 3c',
      'As Ad Kh Qc 9s 2d 3c',
      'As Ad Kh Kc 9s 2d 3c',
      'As Ad Ah Kc 9s 2d 3c',
      'As Kd Qh Jc Ts 2d 3c',
      'As Ks 9s 5s 2s 3d 4c',
      'As Ad Ah Kc Ks 2d 3c',
      'As Ad Ah Ac Ks 2d 3c',
      'As Ks Qs Js Ts 2d 3c',
    ];
    for (let i = 1; i < ladder.length; i++) {
      expect(v(ladder[i]!)).toBeGreaterThan(v(ladder[i - 1]!));
    }
    expect(HAND_CATEGORIES).toHaveLength(9);
  });

  it('plays the wheel as the lowest straight, and the ace high elsewhere', () => {
    const wheel = v('As 2d 3h 4c 5s 9d Jc');
    const sixHigh = v('2s 3d 4h 5c 6s 9d Jc');
    const broadway = v('As Kd Qh Jc Ts 2d 7c');
    expect(categoryOf(wheel)).toBe('Straight');
    expect(sixHigh).toBeGreaterThan(wheel);
    expect(broadway).toBeGreaterThan(sixHigh);
    /* A K Q 2 3 is not a straight: the ace does not wrap. */
    expect(cat('As Kd Qh 2c 3s 9d 7c')).toBe('High card');
  });

  it('decides a tie by the kicker, and only the kickers that play', () => {
    /* Both have a pair of aces; the king kicker wins. */
    expect(v('As Ad Kh 9c 7s 2d 3c')).toBeGreaterThan(v('Ah Ac Qh 9c 7s 2d 3c'));
    /* Five cards play. The sixth and seventh do not: identical boards, both
       with the same pair and the same three kickers, split. */
    expect(v('As Ad Kh Qc Js 2d 3c')).toBe(v('Ah Ac Kh Qc Js 4d 5c'));
    /* A higher pair beats a higher kicker. */
    expect(v('Ks Kd 2h 3c 4s 7d 9c')).toBeGreaterThan(v('Qs Qd Ah Kc Js 7d 9c'));
    /* Two pair: the high pair first, then the low, then the kicker. */
    expect(v('As Ad 2h 2c Ks 7d 9c')).toBeGreaterThan(v('Ks Kd Qh Qc As 7d 9c'));
    expect(v('As Ad Kh Kc 2s 7d 9c')).toBeGreaterThan(v('Ah Ac Qh Qc Ks 7d 9c'));
  });

  it('plays the best five of three pairs, and the best pair of two trips', () => {
    /* Three pairs: aces and kings play, the queen is the kicker, not the deuces. */
    expect(v('As Ad Kh Kc Qs Qd 2c')).toBe(v('Ah Ac Ks Kd Qh Qc 3c'));
    expect(v('As Ad Kh Kc Qs Qd 2c')).toBeGreaterThan(v('Ah Ac Ks Kd Jh Jc 3c'));
    /* Two trips are a full house, the higher trips on top. */
    const two = v('As Ad Ah Kc Ks Kd 2c');
    expect(categoryOf(two)).toBe('Full house');
    expect(two).toBeGreaterThan(v('Ks Kd Kh Qc Qs Qd 2c'));
    expect(two).toBe(v('As Ad Ah Kc Ks Kd 9c'));
  });

  it('prefers a flush to a straight, a straight flush to quads', () => {
    expect(v('As Ks 9s 5s 2s 3d 4c')).toBeGreaterThan(v('As Kd Qh Jc Ts 2d 3c'));
    expect(v('5s 6s 7s 8s 9s Ad Ac')).toBeGreaterThan(v('As Ad Ah Ac Ks 2d 3c'));
    /* A straight flush hidden in seven cards with a higher straight across suits. */
    const sf = v('5s 6s 7s 8s 9s Td Jc');
    expect(categoryOf(sf)).toBe('Straight flush');
  });

  it('compares flushes on all five cards', () => {
    expect(v('As Ks 9s 5s 2s 3d 4c')).toBeGreaterThan(v('Ah Kh 9h 4h 2h 3d 5c'));
    /* Seven of a suit: the best five of them play. */
    expect(v('As Ks Qs Js 9s 8s 2s')).toBe(v('Ah Kh Qh Jh 9h 3c 4d'));
  });

  it('evaluates five and six cards too', () => {
    expect(cat('As Ks Qs Js Ts')).toBe('Straight flush');
    expect(cat('As Ad Kh Kc 9s 2d')).toBe('Two pair');
  });
});
