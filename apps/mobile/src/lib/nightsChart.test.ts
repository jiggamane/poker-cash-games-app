import { describe, expect, it } from 'vitest';
import { largestResult, plotBar } from './nightsChart';

describe('largestResult', () => {
  it('finds the biggest night in either direction', () => {
    expect(largestResult([120, -540, 40])).toBe(540);
    expect(largestResult([])).toBe(0);
  });
});

describe('plotBar', () => {
  /* The handoff's own band, so the worked window below is its arithmetic and
     not a restatement of it. */
  const BAND = 38;

  it('sends a win up and a loss down', () => {
    expect(plotBar(300, 600, BAND).side).toBe('above');
    expect(plotBar(-300, 600, BAND).side).toBe('below');
  });

  it('draws the same distance either side of the line for the same money', () => {
    expect(plotBar(-300, 600, BAND).height).toBe(plotBar(300, 600, BAND).height);
  });

  it('gives the peak night the whole band and scales the rest against it', () => {
    expect(plotBar(600, 600, BAND).height).toBe(BAND);
    expect(plotBar(300, 600, BAND).height).toBe(19);
    expect(plotBar(150, 600, BAND).height).toBe(10);
  });

  /*
   * THE HANDOFF'S WORKED WINDOW, to the point — peak $540, k = 0.0704 px/$.
   * It is the one place the rule is stated as numbers rather than as a formula,
   * so it is the one worth asserting: a change to the floor, the band or the
   * rounding shows up here as a row that no longer matches the document.
   */
  it('reproduces the handoff’s worked window', () => {
    const peak = 540;
    const window = [
      [-210, 15, 'below'],
      [120, 8, 'above'],
      [-90, 6, 'below'],
      [315, 22, 'above'],
      [0, 2, 'even'],
      [-60, 4, 'below'],
      [180, 13, 'above'],
      [540, 38, 'above'],
    ] as const;

    for (const [net, height, side] of window) {
      expect(plotBar(net, peak, BAND)).toEqual({ height, side });
    }
  });

  it('keeps a small night visible rather than rounding it away', () => {
    /* $6 on a $540 peak is 0.4px unclamped. */
    expect(plotBar(6, 540, BAND).height).toBe(3);
    expect(plotBar(-6, 540, BAND).height).toBe(3);
  });

  it('marks a night that came out exactly square on both sides of the line', () => {
    expect(plotBar(0, 600, BAND)).toEqual({ height: 2, side: 'even' });
  });

  it('never escapes its half of the chart', () => {
    expect(plotBar(9999, 600, BAND).height).toBe(BAND);
  });

  it('has nothing to scale against when no night moved any money', () => {
    expect(plotBar(300, 0, BAND)).toEqual({ height: 2, side: 'even' });
  });
});
