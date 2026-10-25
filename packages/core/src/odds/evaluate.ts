/**
 * The best five-card hand in seven cards, as one comparable integer.
 *
 * A bigger number is a better hand, and two equal numbers are a split pot —
 * that is the whole contract, and `odds.ts` needs nothing else from here. The
 * integer is the category in the top bits and the five ranks that decide a
 * tie under it, highest first, so a straight comparison of two values is a
 * comparison of two hands exactly as the rules order them.
 *
 *   category << 20 | k1 << 16 | k2 << 12 | k3 << 8 | k4 << 4 | k5
 *
 * The categories, 0–8: high card, pair, two pair, trips, straight, flush,
 * full house, quads, straight flush. A royal flush is a straight flush to the
 * ace and needs no category of its own.
 *
 * It is written for speed rather than for reading, because a heads-up hand
 * before the flop is 1,712,304 boards and each of them is evaluated once per
 * player. Everything is rank counts and 13-bit masks; the one table is the
 * straight lookup, 8,192 entries built once.
 */

import type { Card } from './cards';

export const HAND_CATEGORIES = [
  'High card',
  'Pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
] as const;
export type HandCategory = (typeof HAND_CATEGORIES)[number];

const HIGH_CARD = 0;
const PAIR = 1;
const TWO_PAIR = 2;
const TRIPS = 3;
const STRAIGHT = 4;
const FLUSH = 5;
const FULL_HOUSE = 6;
const QUADS = 7;
const STRAIGHT_FLUSH = 8;

/**
 * For every 13-bit rank mask, the rank of the highest straight in it, or -1.
 * The wheel — A 2 3 4 5 — is a five-high straight, and the ace bit at 12 is
 * folded down to sit under the deuce for that one check.
 */
const STRAIGHT_HIGH: Int8Array = (() => {
  const t = new Int8Array(8192).fill(-1);
  for (let m = 0; m < 8192; m++) {
    // Bit 0 is the ace playing low; rank r is bit r + 1. A run of five ending
    // at rank r is then the five bits from r - 3 up to r + 1, all set.
    const low = (m << 1) | ((m >> 12) & 1);
    for (let r = 12; r >= 3; r--) {
      if (((low >> (r - 3)) & 0x1f) === 0x1f) {
        t[m] = r;
        break;
      }
    }
  }
  return t;
})();

/** The five highest set bits of a rank mask, packed highest first, 4 bits each. */
function top5(mask: number): number {
  let out = 0;
  let n = 0;
  for (let r = 12; r >= 0 && n < 5; r--) {
    if ((mask >> r) & 1) {
      out = (out << 4) | r;
      n++;
    }
  }
  return out;
}

/** The highest set bit of a rank mask, or -1. */
function highBit(mask: number): number {
  return mask === 0 ? -1 : 31 - Math.clz32(mask);
}

const counts = new Uint8Array(13);
const suitMask = new Uint16Array(4);

/**
 * Evaluate the seven (or five, or six) cards given. Returns the packed value
 * described at the top of the file.
 */
export function evaluate(cards: readonly Card[]): number {
  counts.fill(0);
  suitMask.fill(0);
  let rankMask = 0;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]!;
    const r = c >> 2;
    counts[r]!++;
    suitMask[c & 3]! |= 1 << r;
    rankMask |= 1 << r;
  }
  return score(rankMask, counts, suitMask);
}

/**
 * Rank the hand from its tallies. Split from `evaluate` so the enumeration in
 * `odds.ts` can keep the board's tallies and add two hole cards per player
 * without rebuilding them.
 */
export function score(rankMask: number, count: Uint8Array, bySuit: Uint16Array): number {
  // Flushes first: the only category that needs the suits, and a straight
  // flush outranks everything so it is the first thing to settle.
  let flushMask = 0;
  for (let s = 0; s < 4; s++) {
    const m = bySuit[s]!;
    // popcount >= 5
    let v = m;
    v = v - ((v >> 1) & 0x5555);
    v = (v & 0x3333) + ((v >> 2) & 0x3333);
    v = (v + (v >> 4)) & 0x0f0f;
    v = (v + (v >> 8)) & 0x1f;
    if (v >= 5) {
      flushMask = m;
      break;
    }
  }
  if (flushMask !== 0) {
    const sf = STRAIGHT_HIGH[flushMask]!;
    if (sf >= 0) return (STRAIGHT_FLUSH << 20) | (sf << 16);
  }

  // Quads, trips and pairs, highest first.
  let quad = -1;
  let trips = -1;
  let pairHi = -1;
  let pairLo = -1;
  for (let r = 12; r >= 0; r--) {
    const n = count[r]!;
    if (n === 4) {
      if (quad < 0) quad = r;
    } else if (n === 3) {
      if (trips < 0) trips = r;
      else if (pairHi < 0) pairHi = r; // a second trips plays as the pair of a full house
      else if (pairLo < 0) pairLo = r;
    } else if (n === 2) {
      if (pairHi < 0) pairHi = r;
      else if (pairLo < 0) pairLo = r;
    }
  }

  if (quad >= 0) {
    const kicker = highBit(rankMask & ~(1 << quad));
    return (QUADS << 20) | (quad << 16) | (kicker << 12);
  }
  if (trips >= 0 && pairHi >= 0) {
    return (FULL_HOUSE << 20) | (trips << 16) | (pairHi << 12);
  }
  if (flushMask !== 0) {
    return (FLUSH << 20) | top5(flushMask);
  }
  const st = STRAIGHT_HIGH[rankMask]!;
  if (st >= 0) return (STRAIGHT << 20) | (st << 16);

  if (trips >= 0) {
    const rest = rankMask & ~(1 << trips);
    const k1 = highBit(rest);
    const k2 = highBit(rest & ~(1 << k1));
    return (TRIPS << 20) | (trips << 16) | (k1 << 12) | (k2 << 8);
  }
  if (pairHi >= 0 && pairLo >= 0) {
    const kicker = highBit(rankMask & ~(1 << pairHi) & ~(1 << pairLo));
    return (TWO_PAIR << 20) | (pairHi << 16) | (pairLo << 12) | (kicker << 8);
  }
  if (pairHi >= 0) {
    const rest = rankMask & ~(1 << pairHi);
    const k1 = highBit(rest);
    const k2 = highBit(rest & ~(1 << k1));
    const k3 = highBit(rest & ~(1 << k1) & ~(1 << k2));
    return (PAIR << 20) | (pairHi << 16) | (k1 << 12) | (k2 << 8) | (k3 << 4);
  }
  return (HIGH_CARD << 20) | top5(rankMask);
}

/**
 * The packed value the cards would score as a plain flush — the category and
 * the five highest ranks of the flush suit — or -1 where there is no flush.
 * Same packing as `score`, same `top5`, so it compares against any value from
 * `evaluate`. `outs.ts` asks it one question: on a card that makes a straight
 * flush, would a flush alone have won?
 */
export function flushValue(cards: readonly Card[]): number {
  suitMask.fill(0);
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]!;
    suitMask[c & 3]! |= 1 << (c >> 2);
  }
  for (let s = 0; s < 4; s++) {
    let v = suitMask[s]!;
    let n = 0;
    while (v) {
      v &= v - 1;
      n++;
    }
    if (n >= 5) return (FLUSH << 20) | top5(suitMask[s]!);
  }
  return -1;
}

/** Which category a packed value is — for a label, never for a comparison. */
export function categoryOf(value: number): HandCategory {
  return HAND_CATEGORIES[value >> 20]!;
}
