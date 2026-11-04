import { describe, expect, it } from 'vitest';
import { needsSecondCard, seatName } from './seatName';

describe('seatName', () => {
  it('heads-up: Me and Opponent', () => {
    expect(seatName(0, 2)).toBe('Me');
    expect(seatName(1, 2)).toBe('Opponent');
  });
  it('three or more: the opponents numbered from 1', () => {
    expect([0, 1, 2].map((s) => seatName(s, 3))).toEqual(['Me', 'Opponent 1', 'Opponent 2']);
    expect(seatName(8, 9)).toBe('Opponent 8');
  });
  it('the half-dealt sentence', () => {
    expect(needsSecondCard(0, 2)).toBe('My hand needs a second card');
    expect(needsSecondCard(1, 2)).toBe('Opponent needs a second card');
    expect(needsSecondCard(2, 4)).toBe('Opponent 2 needs a second card');
  });
});
