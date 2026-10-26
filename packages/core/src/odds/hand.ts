/**
 * A hand named for the river — *Pair of kings*, *Flush, ace high*, *Royal
 * flush* — the five cards that make it, and whether a kicker decided the pot.
 *
 * Decided 26 October (`design/handoff-odds-calculator/decided-2026-10-25.md`
 * § 8, board 21): once the fifth card is down, every player's card names the
 * hand it holds, a chevron opens the five cards that make it, and a kicker is
 * named only when it decided — the same hand of the same rank on both sides,
 * *Pair of aces · king kicker* against *Pair of aces · queen kicker*.
 *
 * EVERYTHING HERE READS THE ENGINE'S OWN VALUE. `evaluate()` packs the category
 * and the five deciding ranks into one integer (`evaluate.ts`); the name, the
 * making ranks and the kickers are all read off that packing, and the five
 * cards are picked from the seven to match it. There is no second ranker, so
 * what is named is what ranked, and `hand.test.ts` holds the five cards to the
 * value they re-evaluate to.
 *
 * SENTENCE CASE, NO ARTICLE — the owner's wording for the card: *Pair of kings*,
 * *Two pair, kings and queens*, *Three of a kind, sevens*, *Straight, nine to
 * king* (the wheel: *ace to five*), *Flush, ace high*, *Full house, kings full
 * of sevens*, *Four of a kind, sevens*, *Straight flush, ten to ace*, which is
 * *Royal flush* when it reaches the ace, and *High card, ace*. `showdown.ts`
 * names the same values in a sentence (*a pair of kings beats …*) for the
 * run-out's foot; the two share their rank words. ⚠ The plural of two is
 * *deuces*, because `showdown.ts` already names ranks that way and one app
 * should not say both; the brief preferred *twos*, so this is a choice to
 * review, in one place (`RANK_PLURAL`).
 */

import type { Card } from './cards';
import { evaluate } from './evaluate';
import { BOARD_CARDS, oddsProblem, type OddsInput } from './odds';
import { RANK_PLURAL, RANK_WORD } from './showdown';

/** How many of the packed ranks MAKE the hand, per category; the rest are kickers. */
const MAKING = [1, 1, 2, 1, 5, 5, 2, 1, 5] as const;
/** How many ranks the packing carries, per category. */
const RANKS_PACKED = [5, 4, 3, 3, 1, 5, 2, 2, 1] as const;

const k = (value: number, i: number): number => (value >> (16 - 4 * i)) & 15;
const categoryIndex = (value: number): number => value >> 20;

/** The ranks of a straight to `high`, highest first; the wheel ends on the ace. */
function straightRanks(high: number): number[] {
  return high === 3 ? [3, 2, 1, 0, 12] : [high, high - 1, high - 2, high - 3, high - 4];
}

/** The hand a packed value is, in the owner's wording. */
export function nameHand(value: number): string {
  const category = categoryIndex(value);
  const word = (r: number): string => RANK_WORD[r]!;
  const plural = (r: number): string => RANK_PLURAL[r]!;
  const span = (high: number): string => `${word(high === 3 ? 12 : high - 4)} to ${word(high)}`;
  switch (category) {
    case 0:
      return `High card, ${word(k(value, 0))}`;
    case 1:
      return `Pair of ${plural(k(value, 0))}`;
    case 2:
      return `Two pair, ${plural(k(value, 0))} and ${plural(k(value, 1))}`;
    case 3:
      return `Three of a kind, ${plural(k(value, 0))}`;
    case 4:
      return `Straight, ${span(k(value, 0))}`;
    case 5:
      return `Flush, ${word(k(value, 0))} high`;
    case 6:
      return `Full house, ${plural(k(value, 0))} full of ${plural(k(value, 1))}`;
    case 7:
      return `Four of a kind, ${plural(k(value, 0))}`;
    case 8:
      return k(value, 0) === 12 ? 'Royal flush' : `Straight flush, ${span(k(value, 0))}`;
    default:
      throw new Error('That is not a hand.');
  }
}

/**
 * The five cards that make the best hand in these seven (or five, or six):
 * the cards that make it first — the pair, the trips, the two pairs, the
 * quads, the straight from its top down — then the kickers in descending
 * order. Picked to match `evaluate()`'s packing exactly, so re-evaluating the
 * five gives the same value as the seven.
 */
export function bestFive(cards: readonly Card[]): Card[] {
  const value = evaluate(cards);
  const category = categoryIndex(value);
  const byRank: Card[][] = Array.from({ length: 13 }, () => []);
  const bySuit: Card[][] = Array.from({ length: 4 }, () => []);
  for (const c of [...cards].sort((a, b) => a - b)) {
    byRank[c >> 2]!.push(c);
    bySuit[c & 3]!.push(c);
  }
  const take = (rank: number, n: number): Card[] => byRank[rank]!.slice(0, n);
  const one = (rank: number): Card[] => take(rank, 1);
  const flushSuit = bySuit.findIndex((s) => s.length >= 5);
  const inSuit = (rank: number): Card => (rank << 2) | flushSuit;
  switch (category) {
    case 0:
      return [0, 1, 2, 3, 4].flatMap((i) => one(k(value, i)));
    case 1:
      return [...take(k(value, 0), 2), ...one(k(value, 1)), ...one(k(value, 2)), ...one(k(value, 3))];
    case 2:
      return [...take(k(value, 0), 2), ...take(k(value, 1), 2), ...one(k(value, 2))];
    case 3:
      return [...take(k(value, 0), 3), ...one(k(value, 1)), ...one(k(value, 2))];
    case 4:
      return straightRanks(k(value, 0)).flatMap(one);
    case 5:
      return [0, 1, 2, 3, 4].map((i) => inSuit(k(value, i)));
    case 6:
      return [...take(k(value, 0), 3), ...take(k(value, 1), 2)];
    case 7:
      return [...take(k(value, 0), 4), ...one(k(value, 1))];
    case 8:
      return straightRanks(k(value, 0)).map(inSuit);
    default:
      throw new Error('That is not a hand.');
  }
}

/**
 * Whether a kicker decided between two values: the same category, the same
 * ranks making the hand, and a kicker that differs. Returns the two ranks that
 * decided it — `a`'s and `b`'s — or null: a different hand, or an equal one
 * (a chop). A straight, a flush, a full house and a straight flush have no
 * kickers: two of those that differ are different hands, not a kicker.
 */
export function decidingKicker(a: number, b: number): { a: number; b: number } | null {
  if (a === b) return null;
  const category = categoryIndex(a);
  if (category !== categoryIndex(b)) return null;
  const making = MAKING[category]!;
  const packed = RANKS_PACKED[category]!;
  for (let i = 0; i < packed; i++) {
    const ra = k(a, i);
    const rb = k(b, i);
    if (ra === rb) continue;
    return i < making ? null : { a: ra, b: rb };
  }
  return null;
}

export interface RiverHand {
  /** The engine's packed value, which decided the pot. */
  value: number;
  /** *Pair of kings*. */
  name: string;
  /** The five cards that make it, the making cards first. */
  five: Card[];
  /** The rank of the kicker that decided this seat's standing against the best other hand, or null. */
  kicker: number | null;
  /** The name with the kicker appended where one decided: *Pair of aces · king kicker*. */
  label: string;
}

/**
 * On a complete board, every seat's hand named, with its five cards, and —
 * measured against the best OTHER hand, the way the colour and the word are —
 * the kicker that decided it, if one did. Heads-up that is one comparison, and
 * both seats name their kicker or neither does. The board must be five cards.
 */
export function riverHands(input: OddsInput): RiverHand[] {
  const problem = oddsProblem(input);
  if (problem !== null) throw new Error(problem);
  if (input.board.length !== BOARD_CARDS) throw new Error('The river needs the whole board.');
  const sevens = input.hands.map((h) => [...h, ...input.board]);
  const values = sevens.map(evaluate);
  return sevens.map((seven, i) => {
    let other = -1;
    values.forEach((v, j) => {
      if (j !== i && v > other) other = v;
    });
    const value = values[i]!;
    const name = nameHand(value);
    const decided = other < 0 ? null : decidingKicker(value, other);
    const kicker = decided === null ? null : decided.a;
    return {
      value,
      name,
      five: bestFive(seven),
      kicker,
      label: kicker === null ? name : `${name} · ${RANK_WORD[kicker]} kicker`,
    };
  });
}
