import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { evaluate } from './evaluate';
import type { Hand } from './odds';
import { describeHand, describeValue, showdown } from './showdown';

const hand = (s: string): Hand => parseCards(s)! as unknown as Hand;
const cards = (s: string) => parseCards(s)!;
const name = (s: string) => describeHand(cards(s));

describe('a hand, named off the engine’s own value', () => {
  it('the board’s example: a pair of kings beats a pair of deuces', () => {
    expect(name('Ah Kh Qh Jh 3s 7c Kc')).toBe('a pair of kings');
    expect(name('2c 2d Qh Jh 3s 7c Kc')).toBe('a pair of deuces');
  });

  it('every category, the way a dealer calls it', () => {
    expect(name('Ah Kd 9c 7s 4d 3c 2h')).toBe('ace high');
    expect(name('Th 9d 7c 6s 4d 3c 2h')).toBe('ten high');
    expect(name('Ah As Kd Kc 9c 7s 4d')).toBe('two pair, aces and kings');
    expect(name('Qh Qs Qd Kc 9c 7s 4d')).toBe('three queens');
    expect(name('Th 9s 8d 7c 6c Ks 2d')).toBe('a ten-high straight');
    expect(name('Ah 2s 3d 4c 5c Ks 9d')).toBe('a five-high straight');
    expect(name('Ah Ks Qd Jc Tc 2s 9d')).toBe('an ace-high straight');
    expect(name('Ah 9h 7h 4h 2h Ks 9d')).toBe('an ace-high flush');
    expect(name('9h 8h 7h 4h 2h Ks 9d')).toBe('a nine-high flush');
    expect(name('Kh Ks Kd 2c 2s 9c 4d')).toBe('kings full of deuces');
    expect(name('9h 9s 9d 9c 2s Kc 4d')).toBe('four nines');
    expect(name('9h 8h 7h 6h 5h Ks 2d')).toBe('a nine-high straight flush');
    expect(name('Ah Kh Qh Jh Th 2s 9d')).toBe('a royal flush');
  });

  it('describes a value exactly as evaluate() packs it', () => {
    expect(describeValue(evaluate(cards('Ah Kh Qh Jh 3s 7c Kc')))).toBe('a pair of kings');
    expect(() => describeValue(9 << 20)).toThrow(/not a hand/);
  });
});

describe('the showdown', () => {
  const board = cards('Qh Jh 3s 7c Kc');

  it('names the winner and the best hand that lost', () => {
    expect(showdown({ hands: [hand('AhKh'), hand('2c2d')], board })).toEqual({
      winners: [0],
      best: 'a pair of kings',
      beaten: 'a pair of deuces',
    });
  });

  it('three-handed, the beaten hand is the best of the losers', () => {
    expect(showdown({ hands: [hand('2c2d'), hand('AhKh'), hand('9d9c')], board })).toEqual({
      winners: [1],
      best: 'a pair of kings',
      beaten: 'a pair of nines',
    });
  });

  it('a split pot names everyone sharing it, and nobody is beaten when all share', () => {
    expect(showdown({ hands: [hand('2c3d'), hand('4h5s')], board: cards('As Kd Qh Jc Ts') })).toEqual({
      winners: [0, 1],
      best: 'an ace-high straight',
      beaten: null,
    });
    expect(showdown({ hands: [hand('AcKd'), hand('AdKs'), hand('2c2d')], board: cards('As 9d 5h 7c Ts') })).toEqual({
      winners: [0, 1],
      best: 'a pair of aces',
      beaten: 'a pair of deuces',
    });
  });

  it('needs the whole board', () => {
    expect(() => showdown({ hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c') })).toThrow(/whole board/);
    expect(() => showdown({ hands: [hand('AhKh')], board })).toThrow(/Two hands/);
  });
});
