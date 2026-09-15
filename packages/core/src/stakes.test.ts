import { describe, expect, it } from 'vitest';
import { money } from './money';
import {
  sameStakes,
  stakesLabel,
  stakesSummary,
  straddleLabel,
  withStraddle,
  type Stakes,
} from './stakes';

/** The board's own game: O1 draws "$5 / $5" and no straddle. */
const drawn: Stakes = {
  small: money(5),
  big: money(5),
  straddle: 'none',
  straddleAmount: null,
};

describe('stakesLabel', () => {
  it('is the string the board draws', () => {
    expect(stakesLabel(drawn)).toBe('$5 / $5');
  });

  it('takes the club’s symbol, because a group is not always in dollars', () => {
    expect(stakesLabel({ ...drawn, small: money(1), big: money(2) }, '€')).toBe('€1 / €2');
  });

  it('groups a big blind that has grown past a thousand', () => {
    expect(stakesLabel({ ...drawn, small: money(1000), big: money(2500) })).toBe('$1,000 / $2,500');
  });

  /*
   * A MANDATORY STRADDLE IS THE THIRD FIGURE — the 15 September change. A table
   * where everyone has to straddle is playing 5/5/10, and every screen that
   * states the stakes reads this one function, so saying it here says it
   * everywhere.
   */
  it('writes a mandatory straddle as the third blind', () => {
    expect(stakesLabel(withStraddle(drawn, 'mandatory'))).toBe('$5 / $5 / $10');
  });

  it('takes the club’s symbol on all three of them', () => {
    expect(stakesLabel(withStraddle(drawn, 'mandatory'), '€')).toBe('€5 / €5 / €10');
  });

  /*
   * AND AN OPTIONAL ONE IS NOT IN IT. This is the assertion that keeps the
   * three-state pick meaning something: a straddle somebody MAY post is not a
   * forced bet, and a line reading `$5 / $5 / $10` tells the table the stakes
   * are higher than they are.
   */
  it('leaves an optional straddle out of the blinds', () => {
    expect(stakesLabel(withStraddle(drawn, 'optional'))).toBe('$5 / $5');
  });
});

describe('straddleLabel', () => {
  it('says nothing when there is no straddle', () => {
    expect(straddleLabel(drawn)).toBeNull();
  });

  it('names the amount and whether it has to be played', () => {
    const on = withStraddle(drawn, 'mandatory');
    expect(straddleLabel(on)).toBe('$10 straddle · mandatory');
    expect(straddleLabel(withStraddle(drawn, 'optional'))).toBe('$10 straddle · optional');
  });
});

describe('stakesSummary', () => {
  it('is just the blinds when there is no straddle', () => {
    expect(stakesSummary(drawn)).toBe('$5 / $5');
  });

  it('carries an optional straddle after them', () => {
    expect(stakesSummary(withStraddle(drawn, 'optional'))).toBe(
      '$5 / $5 · $10 straddle · optional',
    );
  });

  /*
   * THE FIGURE IS SAID ONCE. The blinds carry a mandatory straddle now, so what
   * follows them names which figure it is rather than repeating it — the old
   * string said ten dollars twice.
   */
  it('names a mandatory straddle without saying its figure twice', () => {
    expect(stakesSummary(withStraddle(drawn, 'mandatory'))).toBe(
      '$5 / $5 / $10 · mandatory straddle',
    );
  });
});

describe('withStraddle', () => {
  it('seeds an unset straddle at twice the big blind', () => {
    expect(withStraddle(drawn, 'optional').straddleAmount).toBe(money(10));
  });

  it('keeps a figure the host has already set', () => {
    const set = { ...drawn, straddle: 'optional' as const, straddleAmount: money(15) };
    expect(withStraddle(set, 'mandatory').straddleAmount).toBe(money(15));
  });

  /*
   * The reason this function exists. A host who sets a $15 straddle and then
   * turns it off leaves the figure behind, and the next screen to read the
   * stakes has to decide what a straddle of $15 that is not played means. It
   * means nothing, so it is cleared here rather than explained there.
   */
  it('drops the figure when the straddle is turned off', () => {
    const set = { ...drawn, straddle: 'mandatory' as const, straddleAmount: money(15) };
    expect(withStraddle(set, 'none')).toEqual(drawn);
  });
});

describe('sameStakes', () => {
  it('compares every field, not just the blinds', () => {
    expect(sameStakes(drawn, { ...drawn })).toBe(true);
    expect(sameStakes(drawn, withStraddle(drawn, 'optional'))).toBe(false);
    expect(sameStakes(drawn, { ...drawn, big: money(10) })).toBe(false);
  });
});
