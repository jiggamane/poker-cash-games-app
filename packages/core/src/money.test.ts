import { describe, expect, it } from 'vitest';
import {
  allocate,
  add,
  formatMoney,
  formatSigned,
  money,
  MoneyError,
  percentOf,
  positiveMoney,
  subtract,
  sum,
} from './money';

describe('money()', () => {
  it('accepts whole numbers', () => {
    expect(money(0)).toBe(0);
    expect(money(1500)).toBe(1500);
    expect(money(-1230)).toBe(-1230);
  });

  it('rejects anything fractional — this is the whole point', () => {
    expect(() => money(10.5)).toThrow(MoneyError);
    expect(() => money(0.1 + 0.2)).toThrow(MoneyError);
    expect(() => money(1 / 3)).toThrow(MoneyError);
  });

  it('rejects NaN and Infinity', () => {
    expect(() => money(NaN)).toThrow(MoneyError);
    expect(() => money(Infinity)).toThrow(MoneyError);
    expect(() => money(-Infinity)).toThrow(MoneyError);
  });

  it('rejects integers too large to be exact', () => {
    expect(() => money(Number.MAX_SAFE_INTEGER + 2)).toThrow(MoneyError);
  });

  it('positiveMoney rejects zero and negatives', () => {
    expect(positiveMoney(1)).toBe(1);
    expect(() => positiveMoney(0)).toThrow(MoneyError);
    expect(() => positiveMoney(-5)).toThrow(MoneyError);
  });
});

describe('arithmetic', () => {
  it('adds and subtracts', () => {
    expect(add(money(500), money(500), money(250))).toBe(1250);
    expect(subtract(money(1500), money(2982))).toBe(-1482);
    expect(sum([money(100), money(200), money(300)])).toBe(600);
  });

  it('sums an empty list to zero', () => {
    expect(sum([])).toBe(0);
  });
});

describe('percentOf()', () => {
  it('computes exact percentages', () => {
    expect(percentOf(money(1000), 10)).toBe(100);
    expect(percentOf(money(2000), 5)).toBe(100);
    expect(percentOf(money(1000), 100)).toBe(1000);
    expect(percentOf(money(1000), 0)).toBe(0);
  });

  it('rounds HALF UP, as the handoff worked night requires', () => {
    // the canonical case: 5% of 430 is 21.5 and must charge 22
    expect(percentOf(money(430), 5)).toBe(22);
    // exact values are untouched
    expect(percentOf(money(1620), 5)).toBe(81);
    expect(percentOf(money(460), 5)).toBe(23);
    // and the halves go up
    expect(percentOf(money(1005), 10)).toBe(101); // 100.5
    expect(percentOf(money(999), 15)).toBe(150); // 149.85
    expect(percentOf(money(1), 50)).toBe(1); // 0.5
  });

  it('refuses a percentage of a negative amount', () => {
    expect(() => percentOf(money(-100), 10)).toThrow(MoneyError);
  });

  it('rejects nonsense percentages', () => {
    expect(() => percentOf(money(100), 150)).toThrow(MoneyError);
    expect(() => percentOf(money(100), -5)).toThrow(MoneyError);
    expect(() => percentOf(money(100), 7.5)).toThrow(MoneyError);
  });
});

describe('allocate() — the rounding rule', () => {
  it('splits evenly when it divides cleanly', () => {
    expect(allocate(money(300), [1, 1, 1])).toEqual([100, 100, 100]);
  });

  it('hands leftovers to the largest remainder, earliest first', () => {
    // 10 across three equal shares: 3.33 each, one unit left over
    expect(allocate(money(10), [1, 1, 1])).toEqual([4, 3, 3]);
    // 100 across three: 33.33 each, one left over
    expect(allocate(money(100), [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('splits in proportion to weights (a bill split by size of win)', () => {
    // Petr won twice as much as Dana, so pays two thirds of the bill
    expect(allocate(money(300), [2000, 1000])).toEqual([200, 100]);
  });

  it('NEVER creates or loses a unit — the property that matters', () => {
    const cases: Array<[number, number[]]> = [
      [1, [1, 1, 1]],
      [7, [1, 1, 1]],
      [296, [1482, 903, 511]],
      [1, [5, 5, 5, 5, 5, 5, 5]],
      [99, [1, 2, 3, 4, 5]],
      [1000, [1]],
      [0, [3, 4, 5]],
    ];
    for (const [total, weights] of cases) {
      const parts = allocate(money(total), weights);
      expect(sum(parts)).toBe(total);
      expect(parts).toHaveLength(weights.length);
      expect(parts.every((p) => p >= 0)).toBe(true);
    }
  });

  it('never creates or loses a unit across many random cases', () => {
    // Deterministic pseudo-random so a failure is reproducible. xorshift32,
    // kept inside 32 bits — a plain LCG overflows Number.MAX_SAFE_INTEGER here
    // and quietly stops being random.
    let seed = 12345;
    const next = (n: number) => {
      seed ^= seed << 13; seed >>>= 0;
      seed ^= seed >>> 17;
      seed ^= seed << 5; seed >>>= 0;
      return seed % n;
    };
    for (let i = 0; i < 2000; i++) {
      const total = next(50000);
      const count = 1 + next(9);
      const weights = Array.from({ length: count }, () => next(5000));
      const parts = allocate(money(total), weights);
      expect(sum(parts)).toBe(total);
    }
  });

  it('is deterministic — identical inputs give identical output', () => {
    const a = allocate(money(1000), [7, 7, 7, 2]);
    const b = allocate(money(1000), [7, 7, 7, 2]);
    expect(a).toEqual(b);
  });

  it('falls back to an equal split when no one has a weight', () => {
    // e.g. splitting a bill "by size of win" on a night nobody won
    expect(allocate(money(10), [0, 0, 0])).toEqual([4, 3, 3]);
    expect(sum(allocate(money(100), [0, 0]))).toBe(100);
  });

  it('handles a single recipient', () => {
    expect(allocate(money(1234), [1])).toEqual([1234]);
  });

  it('allocates nothing to nobody, but refuses to lose money', () => {
    expect(allocate(money(0), [])).toEqual([]);
    expect(() => allocate(money(100), [])).toThrow(MoneyError);
  });

  describe('rounding granularity', () => {
    // The group can round to 10s, 50s or 100s. The parts must still sum to the
    // total exactly, so when a leftover is smaller than one unit it goes whole
    // to whoever is furthest from their exact share.
    const THREE_WINNERS = [1, 1, 1]; // Dana, Marek, Lena — sorted biggest win first

    it('behaves exactly as before at a granularity of 1', () => {
      expect(allocate(money(170), THREE_WINNERS, 1)).toEqual([57, 57, 56]);
      expect(allocate(money(170), THREE_WINNERS)).toEqual([57, 57, 56]);
    });

    it('rounds to 10s, handing whole units out by largest shortfall', () => {
      // exact share 56.67 -> floor to 50 each = 150; two units of 10 remain
      expect(allocate(money(170), THREE_WINNERS, 10)).toEqual([60, 60, 50]);
    });

    it('gives a sub-unit leftover to the fairest single recipient', () => {
      // floor to 50 each = 150; the remaining 20 is smaller than one unit
      expect(allocate(money(170), THREE_WINNERS, 50)).toEqual([70, 50, 50]);
    });

    it('rounds to 100s', () => {
      // Exact share 56.67 each, so nobody's floor reaches a whole 100.
      // One unit of 100 is available and goes to the biggest winner; that
      // leaves her over-allocated, so the remaining 70 — smaller than a unit —
      // passes to the next person still short of their share.
      expect(allocate(money(170), THREE_WINNERS, 100)).toEqual([100, 70, 0]);
    });

    it('keeps the parts summing to the total at every granularity', () => {
      for (const g of [1, 5, 10, 25, 50, 100]) {
        for (const total of [0, 1, 7, 99, 170, 1234, 5000]) {
          for (const weights of [[1], [1, 1], [1, 1, 1], [3, 2, 1], [1000, 1, 1]]) {
            const parts = allocate(money(total), weights, g);
            expect(sum(parts), `total ${total} across ${weights} at ${g}s`).toBe(total);
            expect(parts.every((p) => p >= 0)).toBe(true);
          }
        }
      }
    });

    it('gives everyone a round unit except at most one person', () => {
      for (const g of [10, 50, 100]) {
        for (const total of [170, 999, 4321]) {
          const parts = allocate(money(total), [1, 1, 1, 1], g);
          const notRound = parts.filter((p) => p % g !== 0);
          expect(notRound.length, `${total} at ${g}s`).toBeLessThanOrEqual(1);
        }
      }
    });

    it('rejects a nonsense granularity', () => {
      expect(() => allocate(money(100), [1, 1], 0)).toThrow(MoneyError);
      expect(() => allocate(money(100), [1, 1], -10)).toThrow(MoneyError);
      expect(() => allocate(money(100), [1, 1], 2.5)).toThrow(MoneyError);
    });
  });

  it('rejects negative totals and bad weights', () => {
    expect(() => allocate(money(-100), [1, 1])).toThrow(MoneyError);
    expect(() => allocate(money(100), [1, -1])).toThrow(MoneyError);
    expect(() => allocate(money(100), [1.5, 1])).toThrow(MoneyError);
  });
});

describe('formatting', () => {
  it('formats whole units with no cents', () => {
    expect(formatMoney(money(2880))).toBe('$2,880');
    expect(formatMoney(money(0))).toBe('$0');
    expect(formatMoney(money(-1230))).toBe('-$1,230');
    expect(formatMoney(money(500), '€')).toBe('€500');
  });

  it('formats results with an explicit sign', () => {
    expect(formatSigned(money(1482))).toBe('+$1,482');
    expect(formatSigned(money(-1230))).toBe('−$1,230'); // U+2212
    expect(formatSigned(money(0))).toBe('$0');
  });
});
