/**
 * The slow, readable ranker the fast one is held against.
 *
 * It shares nothing with `evaluate.ts` but the card numbering: five cards are
 * ranked the way a rulebook reads, by counting equal ranks, and seven cards by
 * trying every five of them. Nothing here is imported by the app — it exists
 * for the tests and for `scripts/odds-verify.ts`, and a bug in it would show
 * as a disagreement with the engine, which is the point of having two.
 */

import { DECK, type Card } from './cards';

export type Ranked = { category: number; tiebreak: number[] };

export function rankFive(cards: readonly Card[]): Ranked {
  const ranks = cards.map((c) => c >> 2).sort((a, b) => b - a);
  const suits = cards.map((c) => c & 3);
  const flush = suits.every((s) => s === suits[0]);
  const distinct = [...new Set(ranks)];
  let straightHigh = -1;
  if (distinct.length === 5) {
    if (ranks[0]! - ranks[4]! === 4) straightHigh = ranks[0]!;
    else if (ranks.join() === '12,3,2,1,0') straightHigh = 3; // the wheel: five high
  }
  const groups = new Map<number, number>();
  for (const r of ranks) groups.set(r, (groups.get(r) ?? 0) + 1);
  // Groups by size, then by rank, biggest and highest first.
  const byGroup = [...groups.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const sizes = byGroup.map((g) => g[1]).join('');
  const order = byGroup.map((g) => g[0]);

  if (flush && straightHigh >= 0) return { category: 8, tiebreak: [straightHigh] };
  if (sizes === '41') return { category: 7, tiebreak: order };
  if (sizes === '32') return { category: 6, tiebreak: order };
  if (flush) return { category: 5, tiebreak: ranks };
  if (straightHigh >= 0) return { category: 4, tiebreak: [straightHigh] };
  if (sizes === '311') return { category: 3, tiebreak: order };
  if (sizes === '221') return { category: 2, tiebreak: order };
  if (sizes === '2111') return { category: 1, tiebreak: order };
  return { category: 0, tiebreak: ranks };
}

export function compareRanked(a: Ranked, b: Ranked): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < a.tiebreak.length; i++) {
    if (a.tiebreak[i] !== b.tiebreak[i]) return a.tiebreak[i]! - b.tiebreak[i]!;
  }
  return 0;
}

/** The best five of up to seven, by trying every five. */
export function bestOfSeven(cards: readonly Card[]): Ranked {
  let best: Ranked | null = null;
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const r = rankFive([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
            if (best === null || compareRanked(r, best) > 0) best = r;
          }
  return best!;
}

/** A seeded generator, so a failing spot can be run again. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dealRandom(next: () => number, n: number, from: readonly Card[] = DECK): Card[] {
  const deck = [...from];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck.slice(0, n);
}

export const sign = (x: number): number => (x > 0 ? 1 : x < 0 ? -1 : 0);
