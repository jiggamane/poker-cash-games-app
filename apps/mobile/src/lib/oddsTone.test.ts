import { describe, expect, it } from 'vitest';
import { standings } from '@poker-club/core';
import { oddsTone, oddsTones } from './oddsTone';

const dark = { name: 'dark', amber: '#E8B455' } as const;
const light = { name: 'light', amber: '#7A5410' } as const;
const tone = (e: number[], i: number, theme: typeof dark | typeof light, done = false) =>
  oddsTone(standings(e.map((equity) => ({ equity })))[i]!, theme, done);

describe('the word and the colour of a hand', () => {
  it('the canvas example on the turn: Player 1 is the underdog, Player 2 the favourite', () => {
    expect(tone([0.4091, 0.5909], 0, dark).word).toBe('Underdog');
    expect(tone([0.4091, 0.5909], 1, dark).word).toBe('Favourite');
  });

  it('level hands are both Too close, in the theme’s amber', () => {
    expect(tone([0.5008, 0.4992], 0, dark)).toEqual({ color: '#E8B455', word: 'Too close' });
    expect(tone([0.5008, 0.4992], 1, light)).toEqual({ color: '#7A5410', word: 'Too close' });
  });

  it('on the river the words are Winner and Beaten', () => {
    expect(tone([1, 0], 0, dark, true).word).toBe('Winner');
    expect(tone([1, 0], 1, dark, true).word).toBe('Beaten');
  });

  it('the green deepens: pale at an 8-point lead, full at 70 — dark', () => {
    expect(tone([0.54, 0.46], 0, dark).color).toBe('hsl(142, 38%, 64%)');
    expect(tone([0.85, 0.15], 0, dark).color).toBe('hsl(142, 66%, 58%)');
    expect(tone([1, 0], 0, dark).color).toBe('hsl(142, 66%, 58%)');
  });

  it('and the red, dark', () => {
    expect(tone([0.46, 0.54], 0, dark).color).toBe('hsl(6, 45%, 68%)');
    expect(tone([0.15, 0.85], 0, dark).color).toBe('hsl(6, 80%, 62%)');
  });

  it('the light ramps are darker: green from 33% (the canvas’s build note), red from 46%', () => {
    expect(tone([0.54, 0.46], 0, light).color).toBe('hsl(142, 55%, 33%)');
    expect(tone([0.85, 0.15], 0, light).color).toBe('hsl(142, 65%, 27%)');
    expect(tone([0.46, 0.54], 0, light).color).toBe('hsl(6, 55%, 46%)');
    expect(tone([0.15, 0.85], 0, light).color).toBe('hsl(6, 75%, 38%)');
  });
});

describe('the rule applied to a whole table', () => {
  const words = (e: number[], river = false) => oddsTones(e.map((equity) => ({ equity })), dark, river).map((t) => t.word);

  it('heads-up before the flop: 82.63 against 17.36 is Favourite and Underdog', () => {
    expect(words([0.8263, 0.1736])).toEqual(['Favourite', 'Underdog']);
  });

  it('level: 50.08 against 49.92 is Too close for both, and both are amber', () => {
    expect(words([0.5008, 0.4992])).toEqual(['Too close', 'Too close']);
    expect(oddsTones([{ equity: 0.5008 }, { equity: 0.4992 }], dark, false).map((t) => t.color)).toEqual(['#E8B455', '#E8B455']);
  });

  it('three hands on a turn: 42.86 / 47.62 / 9.52 is Too close, Too close, Underdog', () => {
    expect(words([0.4286, 0.4762, 0.0952])).toEqual(['Too close', 'Too close', 'Underdog']);
  });

  it('the river: 100 against 0 is Winner and Beaten', () => {
    expect(words([1, 0], true)).toEqual(['Winner', 'Beaten']);
  });

  it('the figure is never coloured without its word: every tone has both', () => {
    for (const e of [[0.5, 0.5], [0.9, 0.1], [0.3, 0.3, 0.4]]) {
      for (const t of oddsTones(e.map((equity) => ({ equity })), light, false)) {
        expect(t.word.length).toBeGreaterThan(0);
        expect(t.color.length).toBeGreaterThan(0);
      }
    }
  });
});
