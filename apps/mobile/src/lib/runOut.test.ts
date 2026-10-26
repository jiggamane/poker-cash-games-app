import { describe, expect, it } from 'vitest';
import { parseCards, showdown, type Hand } from '@poker-club/core';
import { parseRunOutParams, playersNamed, runOutFigure, runOutParams, stillToCome, verdictOf } from './runOut';

const hand = (s: string): Hand => parseCards(s)! as unknown as Hand;
const cards = (s: string) => parseCards(s)!;

describe('the figures, as board 19 prints them', () => {
  it('one decimal, and none where it would be nought', () => {
    expect(runOutFigure(0.50117)).toBe('50.1%');
    expect(runOutFigure(0.6485)).toBe('64.8%');
    expect(runOutFigure(0.40909)).toBe('40.9%');
    expect(runOutFigure(1)).toBe('100%');
    expect(runOutFigure(0)).toBe('0%');
    expect(runOutFigure(0.0049)).toBe('0.5%');
  });
});

describe('what is still to come, as boards 15 to 17 print it', () => {
  it('boards before the flop and on it, cards on the turn', () => {
    expect(stillToCome('preflop', 1_712_304)).toBe('1,712,304 boards still to come');
    expect(stillToCome('flop', 990)).toBe('990 boards still to come');
    expect(stillToCome('turn', 44)).toBe('44 cards could still come');
    expect(stillToCome('turn', 1)).toBe('1 card could still come');
  });
});

describe('the verdict on the river', () => {
  const board = cards('Qh Jh 3s 7c Kc');

  it('the board’s own: Player 1 won on the river · A pair of kings beats a pair of deuces', () => {
    expect(verdictOf(showdown({ hands: [hand('AhKh'), hand('2c2d')], board }), 2)).toEqual({
      title: 'Player 1 won on the river',
      detail: 'A pair of kings beats a pair of deuces',
    });
  });

  it('a split pot, not drawn: who split it, and what they hold', () => {
    expect(verdictOf(showdown({ hands: [hand('2c3d'), hand('4h5s')], board: cards('As Kd Qh Jc Ts') }), 2)).toEqual({
      title: 'Player 1 and Player 2 split it on the river',
      detail: 'Both hold an ace-high straight',
    });
    expect(verdictOf(showdown({ hands: [hand('AcKd'), hand('AdKs'), hand('2c2d')], board: cards('As 9d 5h 7c Ts') }), 3)).toEqual({
      title: 'Player 1 and Player 2 split it on the river',
      detail: 'A pair of aces beats a pair of deuces',
    });
    expect(verdictOf({ winners: [0, 1, 2], best: 'an ace-high straight', beaten: null }, 3)).toEqual({
      title: 'Players 1, 2 and 3 split it on the river',
      detail: 'All hold an ace-high straight',
    });
  });

  it('names players the way a sentence does', () => {
    expect(playersNamed([0])).toBe('Player 1');
    expect(playersNamed([0, 2])).toBe('Player 1 and Player 3');
    expect(playersNamed([0, 1, 3])).toBe('Players 1, 2 and 4');
  });
});

describe('the link', () => {
  it('writes the table as three strings and reads it back', () => {
    const input = { hands: [hand('AhKh'), hand('2c2d')], board: cards('Qh Jh 3s 7c Kc'), dead: cards('Ts') };
    const p = runOutParams(input);
    expect(p).toEqual({ h: 'AhKh,2c2d', b: 'QhJh3s7cKc', d: 'Ts' });
    expect(parseRunOutParams(p)).toEqual(input);
    expect(runOutParams({ hands: input.hands, board: [] })).toEqual({ h: 'AhKh,2c2d', b: '' });
    expect(parseRunOutParams({ h: 'AhKh,2c2d', b: '' })).toEqual({ hands: input.hands, board: [], dead: [] });
    /* expo-router can hand a repeated param over as an array; the first one is the one meant. */
    expect(parseRunOutParams({ h: ['AhKh,2c2d'], b: ['QhJh3s'] })).toEqual({ hands: input.hands, board: cards('Qh Jh 3s'), dead: [] });
  });

  it('refuses what it cannot read rather than guessing', () => {
    expect(parseRunOutParams({})).toBeNull();
    expect(parseRunOutParams({ h: 'AhK,2c2d', b: '' })).toBeNull();
    expect(parseRunOutParams({ h: 'AhKhQh,2c2d', b: '' })).toBeNull();
    expect(parseRunOutParams({ h: 'AhKh,2c2d', b: 'Zz' })).toBeNull();
    expect(parseRunOutParams({ h: 'AhKh,2c2d', b: '', d: 'T' })).toBeNull();
  });
});
