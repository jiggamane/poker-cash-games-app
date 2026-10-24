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
import { bestOfSeven, compareRanked, dealRandom, rng, sign } from './reference';

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
