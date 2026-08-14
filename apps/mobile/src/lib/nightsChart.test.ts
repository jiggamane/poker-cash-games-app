import { describe, expect, it } from 'vitest';
import { largestResult, niceScale, plotBar } from './nightsChart';

describe('niceScale', () => {
  it('lands on a round number a person can read off the axis', () => {
    expect(niceScale(540)).toBe(600);
    expect(niceScale(1015)).toBe(1500);
    expect(niceScale(72)).toBe(80);
    expect(niceScale(21)).toBe(25);
  });

  it('does not round a night off the top of the chart', () => {
    for (const value of [1, 7, 40, 99, 100, 101, 540, 999, 1000, 4321, 87654]) {
      expect(niceScale(value)).toBeGreaterThanOrEqual(value);
    }
  });

  it('reads the size of a night, not its sign', () => {
    expect(niceScale(-540)).toBe(niceScale(540));
  });

  it('is nothing when there is nothing to plot', () => {
    expect(niceScale(0)).toBe(0);
    expect(niceScale(Number.NaN)).toBe(0);
  });
});

describe('largestResult', () => {
  it('finds the biggest night in either direction', () => {
    expect(largestResult([120, -540, 40])).toBe(540);
    expect(largestResult([])).toBe(0);
  });
});

describe('plotBar', () => {
  const HALF = 44;

  it('sends a win up and a loss down', () => {
    expect(plotBar(300, 600, HALF).side).toBe('above');
    expect(plotBar(-300, 600, HALF).side).toBe('below');
  });

  it('draws the same distance either side of the line for the same money', () => {
    expect(plotBar(-300, 600, HALF).height).toBe(plotBar(300, 600, HALF).height);
  });

  it('makes the height proportional to the amount', () => {
    expect(plotBar(600, 600, HALF).height).toBe(HALF);
    expect(plotBar(300, 600, HALF).height).toBe(HALF / 2);
    expect(plotBar(150, 600, HALF).height).toBe(HALF / 4);
  });

  it('keeps a small night visible rather than rounding it away', () => {
    expect(plotBar(1, 600, HALF).height).toBe(2);
    expect(plotBar(-1, 600, HALF).height).toBe(2);
  });

  it('draws nothing at all for a night that came out square', () => {
    expect(plotBar(0, 600, HALF)).toEqual({ height: 0, side: 'none' });
  });

  it('never escapes its half of the chart', () => {
    expect(plotBar(9999, 600, HALF).height).toBe(HALF);
  });

  it('has nothing to draw without a scale', () => {
    expect(plotBar(300, 0, HALF)).toEqual({ height: 0, side: 'none' });
  });
});
