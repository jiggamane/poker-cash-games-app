import { describe, expect, it } from 'vitest';
import { cardText, parseCards, type Card } from './cards';
import { evaluate } from './evaluate';
import { bestFive, decidingKicker, nameHand, riverHands } from './hand';
import type { Hand } from './odds';
import { dealRandom, rng } from './reference';

const cards = (s: string): Card[] => parseCards(s)!;
const hand = (s: string): Hand => cards(s) as unknown as Hand;
const name = (s: string): string => nameHand(evaluate(cards(s)));
const five = (s: string): string => bestFive(cards(s)).map(cardText).join(' ');

describe('a hand named for the river, in the owner’s wording', () => {
  it('the canonical river: a pair of kings beats a pair of deuces', () => {
    expect(name('Ah Kh Qh Jh 3s 7c Kc')).toBe('Pair of kings');
    expect(name('2c 2d Qh Jh 3s 7c Kc')).toBe('Pair of deuces');
  });

  it('every category', () => {
    expect(name('Ah Kd 9c 7s 4d 3c 2h')).toBe('High card, ace');
    expect(name('Ah As Kd Kc 9c 7s 4d')).toBe('Two pair, aces and kings');
    expect(name('7h 7s 7d Kc 9c 2s 4d')).toBe('Three of a kind, sevens');
    expect(name('Kh Qs Jd Tc 9c 2s 4d')).toBe('Straight, nine to king');
    expect(name('Ah 2s 3d 4c 5c Ks 9d')).toBe('Straight, ace to five');
    expect(name('Ah 9h 7h 4h 2h Ks 9d')).toBe('Flush, ace high');
    expect(name('Kh Ks Kd 7c 7s 9c 4d')).toBe('Full house, kings full of sevens');
    expect(name('7h 7s 7d 7c 2s Kc 4d')).toBe('Four of a kind, sevens');
    expect(name('Ah Kh Qh Jh Th 2s 9d')).toBe('Royal flush');
    expect(name('9h 8h 7h 6h 5h Ks 2d')).toBe('Straight flush, five to nine');
    expect(name('Ah 2h 3h 4h 5h Ks 9d')).toBe('Straight flush, ace to five');
    expect(() => nameHand(9 << 20)).toThrow(/not a hand/);
  });
});

describe('the five cards that make it', () => {
  it('the canonical river: the making cards first, then the kickers in order', () => {
    expect(five('Ah Kh Qh Jh 3s 7c Kc')).toBe('Kc Kh Ah Qh Jh');
    expect(five('2c 2d Qh Jh 3s 7c Kc')).toBe('2c 2d Kc Qh Jh');
  });

  it('every category, matching the packing', () => {
    expect(five('Ah Kd 9c 7s 4d 3c 2h')).toBe('Ah Kd 9c 7s 4d');
    expect(five('Ah As Kd Kc 9c 7s 4d')).toBe('Ah As Kc Kd 9c');
    expect(five('7h 7s 7d Kc 9c 2s 4d')).toBe('7d 7h 7s Kc 9c');
    expect(five('Kh Qs Jd Tc 9c 2s 4d')).toBe('Kh Qs Jd Tc 9c');
    expect(five('Ah 2s 3d 4c 5c Ks 9d')).toBe('5c 4c 3d 2s Ah');
    expect(five('Ah 9h 7h 4h 2h Ks 9d')).toBe('Ah 9h 7h 4h 2h');
    expect(five('Kh Ks Kd 7c 7s 9c 4d')).toBe('Kd Kh Ks 7c 7s');
    expect(five('7h 7s 7d 7c 2s Kc 4d')).toBe('7c 7d 7h 7s Kc');
    expect(five('Ah Kh Qh Jh Th 2s 9d')).toBe('Ah Kh Qh Jh Th');
    expect(five('Ah 2h 3h 4h 5h Ks 9d')).toBe('5h 4h 3h 2h Ah');
    /* Two trips: the higher is the trips of a full house, the lower its pair. */
    expect(five('Kh Ks Kd 7c 7s 7d 4d')).toBe('Kd Kh Ks 7c 7d');
    /* A flush with a pair in it: the pair is not in the five. */
    expect(five('Ah 9h 7h 4h 2h As 9d')).toBe('Ah 9h 7h 4h 2h');
  });

  it('re-evaluates to the same value as the seven, on random hands', () => {
    const next = rng(26);
    for (let n = 0; n < 2000; n++) {
      const seven = dealRandom(next, 7);
      const chosen = bestFive(seven);
      expect(chosen).toHaveLength(5);
      expect(new Set(chosen).size).toBe(5);
      for (const c of chosen) expect(seven).toContain(c);
      expect(evaluate(chosen)).toBe(evaluate(seven));
    }
  });
});

describe('whether a kicker decided', () => {
  const v = (s: string) => evaluate(cards(s));

  it('the same pair, a different kicker: yes, and which', () => {
    const a = v('Ah Kh Ad 7c 5s 3d 9c');
    const b = v('As Qs Ad 7c 5s 3d 9c');
    expect(decidingKicker(a, b)).toEqual({ a: 11, b: 10 });
    expect(decidingKicker(b, a)).toEqual({ a: 10, b: 11 });
  });

  it('a different hand, or the same hand: no', () => {
    expect(decidingKicker(v('Ah Kh Qh Jh 3s 7c Kc'), v('2c 2d Qh Jh 3s 7c Kc'))).toBeNull(); // kings against deuces
    expect(decidingKicker(v('Ah Ad 7c 5s 3d 9c Kh'), v('2c 2d Qh Jh 3s 7c Kc'))).toBeNull(); // a pair against two pair? no: pair v pair of a different rank
    expect(decidingKicker(v('2c 3d As Kd Qh Jc Ts'), v('4h 5s As Kd Qh Jc Ts'))).toBeNull(); // a chop
    /* Two ace-high flushes that differ are different flushes, not a kicker. */
    expect(decidingKicker(v('Ah Kh 9h 7h 4h 2s 3d'), v('Ah Qh 9h 7h 4h 2s 3d'))).toBeNull();
    /* Two pair with a different second pair is a different hand; with the same two pairs the kicker decides. */
    expect(decidingKicker(v('Ah As Kd Kc 9c 7s 4d'), v('Ah As Qd Qc 9c 7s 4d'))).toBeNull();
    expect(decidingKicker(v('Ah As Kd Kc 9c 7s 4d'), v('Ah As Kd Kc 8c 7s 4d'))).toEqual({ a: 7, b: 6 });
  });
});

describe('the river, named per seat', () => {
  it('the canonical river: no kicker decided', () => {
    const r = riverHands({ hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c Kc') });
    expect(r.map((x) => x.label)).toEqual(['Pair of kings', 'Pair of deuces']);
    expect(r.map((x) => x.five.map(cardText).join(' '))).toEqual(['Kc Kh Ah Qh Jh', '2c 2d Kc Qh Jh']);
    expect(r.map((x) => x.kicker)).toEqual([null, null]);
  });

  it('the kicker case: both seats say which kicker', () => {
    const r = riverHands({ hands: [hand('AhKh'), hand('AsQs')], board: cards('Ad 7c 5s 3d 9c') });
    expect(r.map((x) => x.label)).toEqual(['Pair of aces · king kicker', 'Pair of aces · queen kicker']);
    expect(r[0]!.value).toBeGreaterThan(r[1]!.value);
  });

  it('a chop: the same five cards, no kicker', () => {
    const r = riverHands({ hands: [hand('2c3d'), hand('4h5s')], board: cards('As Kd Qh Jc Ts') });
    expect(r.map((x) => x.label)).toEqual(['Straight, ten to ace', 'Straight, ten to ace']);
    expect(r[0]!.value).toBe(r[1]!.value);
    expect(r.map((x) => x.kicker)).toEqual([null, null]);
  });

  it('three-handed, each loser is measured against the winner', () => {
    const r = riverHands({ hands: [hand('AhKh'), hand('AsQs'), hand('2c2d')], board: cards('Ad 7c 5s 3d 9c') });
    expect(r.map((x) => x.label)).toEqual(['Pair of aces · king kicker', 'Pair of aces · queen kicker', 'Pair of deuces']);
  });

  it('needs the whole board', () => {
    expect(() => riverHands({ hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c') })).toThrow(/whole board/);
  });
});
