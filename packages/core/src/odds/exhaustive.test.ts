import { describe, expect, it } from 'vitest';
import { HAND_CATEGORIES, evaluate } from './evaluate';

/**
 * Every five-card hand there is, against the figures every book prints.
 *
 * 2,598,960 hands, 52 choose 5. The count of each category is a fact that
 * has been published for a century, and the number of distinct hand
 * strengths — 7,462 — is the one figure that says every tie-break is right:
 * one too few means two different hands are being scored the same, one too
 * many means a kicker is being read that does not play. Neither can be
 * fudged by a sample.
 */
describe('all 2,598,960 five-card hands', () => {
  it('fall into the published categories, 7,462 distinct strengths', () => {
    const counts = new Array<number>(9).fill(0);
    const distinct = new Set<number>();
    const hand = [0, 0, 0, 0, 0];
    for (let a = 0; a < 48; a++)
      for (let b = a + 1; b < 49; b++)
        for (let c = b + 1; c < 50; c++)
          for (let d = c + 1; d < 51; d++)
            for (let e = d + 1; e < 52; e++) {
              hand[0] = a; hand[1] = b; hand[2] = c; hand[3] = d; hand[4] = e;
              const v = evaluate(hand);
              counts[v >> 20]!++;
              distinct.add(v);
            }
    const byName = Object.fromEntries(HAND_CATEGORIES.map((n, i) => [n, counts[i]]));
    expect(byName).toEqual({
      'High card': 1_302_540,
      Pair: 1_098_240,
      'Two pair': 123_552,
      'Three of a kind': 54_912,
      Straight: 10_200,
      Flush: 5_108,
      'Full house': 3_744,
      'Four of a kind': 624,
      'Straight flush': 40,
    });
    expect(distinct.size).toBe(7_462);
  });
});
