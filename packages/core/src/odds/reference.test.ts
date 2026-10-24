/**
 * The engine against an independent reference.
 *
 * `evaluate.ts` is written for speed and `odds.ts` for slicing, and neither
 * is the kind of code a reader checks by eye. So this file re-derives both
 * the slow way, sharing nothing with them but the card numbering: a hand is
 * ranked by looking at every one of the twenty-one five-card subsets with a
 * textbook five-card ranker, and the odds are counted by dealing every board
 * in plain nested loops. Where the two disagree, one of them is wrong, and
 * the slow one is the one a person can read.
 *
 * The random hands are seeded, so a failure reproduces.
 */

import { describe, expect, it } from 'vitest';
import { DECK, parseCards, type Card } from './cards';
import { evaluate } from './evaluate';
import { odds, type Hand } from './odds';

/* --- the reference ranker: five cards, by the book ---------------------- */

type Ranked = { category: number; tiebreak: number[] };

function rankFive(cards: readonly Card[]): Ranked {
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

function compareRanked(a: Ranked, b: Ranked): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < a.tiebreak.length; i++) {
    if (a.tiebreak[i] !== b.tiebreak[i]) return a.tiebreak[i]! - b.tiebreak[i]!;
  }
  return 0;
}

/** The best five of seven, by trying all twenty-one. */
function bestOfSeven(cards: readonly Card[]): Ranked {
  let best: Ranked | null = null;
  for (let a = 0; a < cards.length; a++)
    for (let b = a + 1; b < cards.length; b++)
      for (let c = b + 1; c < cards.length; c++)
        for (let d = c + 1; d < cards.length; d++)
          for (let e = d + 1; e < cards.length; e++) {
            const r = rankFive([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
            if (best === null || compareRanked(r, best) > 0) best = r;
          }
  return best!;
}

/* --- a seeded shuffle, so a failure can be run again -------------------- */

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dealRandom(next: () => number, n: number, from: readonly Card[] = DECK): Card[] {
  const deck = [...from];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck.slice(0, n);
}

const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);

describe('the evaluator against the twenty-one-subset reference', () => {
  it('orders five thousand random pairs of seven-card hands the same way', () => {
    const next = rng(20261024);
    for (let n = 0; n < 5_000; n++) {
      const fourteen = dealRandom(next, 14);
      const a = fourteen.slice(0, 7);
      const b = fourteen.slice(7);
      const fast = sign(evaluate(a) - evaluate(b));
      const slow = sign(compareRanked(bestOfSeven(a), bestOfSeven(b)));
      if (fast !== slow) {
        throw new Error(`disagree on ${a.join(',')} vs ${b.join(',')}: fast ${fast}, reference ${slow}`);
      }
    }
  });

  it('agrees on the category of every random hand, and on hands sharing a board', () => {
    const next = rng(7);
    for (let n = 0; n < 3_000; n++) {
      /* Two hands on one board, which is the shape the odds actually compare:
         near-ties are far more common here than between unrelated hands. */
      const nine = dealRandom(next, 9);
      const board = nine.slice(0, 5);
      const a = [...board, nine[5]!, nine[6]!];
      const b = [...board, nine[7]!, nine[8]!];
      expect(evaluate(a) >> 20).toBe(bestOfSeven(a).category);
      expect(sign(evaluate(a) - evaluate(b))).toBe(sign(compareRanked(bestOfSeven(a), bestOfSeven(b))));
    }
  });
});

/* --- the enumeration against plain nested loops ------------------------- */

function referenceOdds(hands: readonly Hand[], board: readonly Card[], dead: readonly Card[] = []) {
  const used = new Set<Card>([...hands.flat(), ...board, ...dead]);
  const deck = DECK.filter((c) => !used.has(c));
  const wins = hands.map(() => 0);
  const ties = hands.map(() => 0);
  let boards = 0;
  const settle = (full: Card[]) => {
    boards++;
    const ranked = hands.map((h) => bestOfSeven([...full, ...h]));
    let best = ranked[0]!;
    for (const r of ranked) if (compareRanked(r, best) > 0) best = r;
    const top = ranked.map((r) => compareRanked(r, best) === 0);
    const n = top.filter(Boolean).length;
    top.forEach((isTop, i) => {
      if (!isTop) return;
      if (n === 1) wins[i]!++;
      else ties[i]!++;
    });
  };
  const toCome = 5 - board.length;
  if (toCome === 0) settle([...board]);
  else if (toCome === 1) for (const a of deck) settle([...board, a]);
  else if (toCome === 2)
    for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) settle([...board, deck[i]!, deck[j]!]);
  else throw new Error('the reference stops at the flop; the pre-flop case is too slow to re-derive here');
  return { boards, wins, ties };
}

const hand = (s: string): Hand => parseCards(s)! as unknown as Hand;
const cards = (s: string) => parseCards(s)!;

describe('the odds against the nested-loop reference', () => {
  it('agree on random flops and turns for two to nine players', () => {
    const next = rng(99);
    for (let n = 0; n < 24; n++) {
      const players = 2 + (n % 8); // 2..9
      const onFlop = n % 2 === 0;
      const deadCount = n % 3; // 0..2 dead cards
      const dealt = dealRandom(next, players * 2 + (onFlop ? 3 : 4) + deadCount);
      const hands: Hand[] = [];
      for (let p = 0; p < players; p++) hands.push([dealt[2 * p]!, dealt[2 * p + 1]!]);
      const board = dealt.slice(players * 2, players * 2 + (onFlop ? 3 : 4));
      const dead = dealt.slice(players * 2 + (onFlop ? 3 : 4));
      const fast = odds({ hands, board, dead });
      const slow = referenceOdds(hands, board, dead);
      expect(fast.boards).toBe(slow.boards);
      expect(fast.seats.map((s) => s.wins)).toEqual(slow.wins);
      expect(fast.seats.map((s) => s.ties)).toEqual(slow.ties);
    }
  });

  it('agree on a river showdown nine-handed, where only the ranking matters', () => {
    const hands = ['AsKs', 'AdKd', 'QcQh', 'JsTs', '9d8d', '7c6c', '5h4h', '3s2s', 'Th9h'].map(hand);
    const board = cards('Ac Kh 2d 9c 5c');
    const fast = odds({ hands, board });
    const slow = referenceOdds(hands, board);
    expect(fast.seats.map((s) => s.wins)).toEqual(slow.wins);
    expect(fast.seats.map((s) => s.ties)).toEqual(slow.ties);
  });
});
