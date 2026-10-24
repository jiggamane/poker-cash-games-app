import { describe, expect, it } from 'vitest';
import { grouped, oddsStatus, type OddsStatusInput } from './oddsStatus';

const base: OddsStatusInput = {
  halfDealtSeat: -1,
  fullHands: 0,
  problem: null,
  boardsDealt: null,
  calculating: false,
  progress: 0,
};
const line = (over: Partial<OddsStatusInput>) => oddsStatus({ ...base, ...over });

describe('the five states, as the brief writes them', () => {
  it('1 · a seat with one card names the lowest such seat, one-based', () => {
    expect(line({ halfDealtSeat: 0 })).toBe('Player 1 needs a second card');
    expect(line({ halfDealtSeat: 2, fullHands: 2 })).toBe('Player 3 needs a second card');
  });

  it('2 · a result says how many boards, grouped by commas, singular for one', () => {
    expect(line({ fullHands: 2, boardsDealt: 1_712_304 })).toBe('1,712,304 boards dealt · exact');
    expect(line({ fullHands: 2, boardsDealt: 903 })).toBe('903 boards dealt · exact');
    expect(line({ fullHands: 2, boardsDealt: 1 })).toBe('1 board dealt · exact');
    expect(line({ fullHands: 2, boardsDealt: 990 })).toBe('990 boards dealt · exact');
  });

  it('3 · counting shows a whole-number percentage', () => {
    expect(line({ fullHands: 2, calculating: true, progress: 0 })).toBe('Calculating · 0%');
    expect(line({ fullHands: 2, calculating: true, progress: 0.624 })).toBe('Calculating · 62%');
    expect(line({ fullHands: 2, calculating: true, progress: 0.625 })).toBe('Calculating · 63%');
    expect(line({ fullHands: 2, calculating: true, progress: 1 })).toBe('Calculating · 100%');
  });

  it('4 · two hands the engine refuses show the engine’s sentence', () => {
    const sentence = 'Not enough cards left in the deck to finish the board.';
    expect(line({ fullHands: 2, problem: sentence })).toBe(sentence);
  });

  it('5 · fewer than two full hands is the invitation', () => {
    expect(line({})).toBe('Texas hold’em · deal two hands');
    expect(line({ fullHands: 1, problem: 'Two hands are needed before there are odds.' })).toBe(
      'Texas hold’em · deal two hands',
    );
  });
});

describe('precedence', () => {
  it('a half-dealt seat beats a result still in hand — B102', () => {
    expect(line({ halfDealtSeat: 2, fullHands: 2, boardsDealt: 1_712_304 })).toBe(
      'Player 3 needs a second card',
    );
  });

  it('a half-dealt seat beats counting and beats the engine’s refusal', () => {
    expect(line({ halfDealtSeat: 0, fullHands: 2, calculating: true, progress: 0.5 })).toBe(
      'Player 1 needs a second card',
    );
    expect(line({ halfDealtSeat: 1, fullHands: 2, problem: 'anything' })).toBe(
      'Player 2 needs a second card',
    );
  });

  it('a result beats counting, which is only tidiness: both cannot be true', () => {
    expect(line({ fullHands: 2, boardsDealt: 10, calculating: true, progress: 0.2 })).toBe(
      '10 boards dealt · exact',
    );
  });

  it('the engine’s refusal needs two full hands; below that it is not shown', () => {
    expect(line({ fullHands: 1, problem: 'The same card is dealt twice.' })).toBe(
      'Texas hold’em · deal two hands',
    );
  });
});

describe('grouping', () => {
  it('writes thousands with commas and leaves small numbers alone', () => {
    expect(grouped(0)).toBe('0');
    expect(grouped(999)).toBe('999');
    expect(grouped(1000)).toBe('1,000');
    expect(grouped(15_180)).toBe('15,180');
    expect(grouped(2_598_960)).toBe('2,598,960');
  });
});
