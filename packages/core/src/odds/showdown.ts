/**
 * The showdown — on a complete board, who won and with what, in words.
 *
 * The run-out's last line (`design/handoff-odds-calculator/`, boards 18 and
 * 19) reads *Player 1 won on the river · A pair of kings beats a pair of
 * deuces*. The figures say 100 / 0; the sentence says why, and it is the one
 * thing on the picture a person who does not read percentages reads.
 *
 * THE NAME COMES OFF THE ENGINE'S OWN VALUE. `evaluate()` packs the category
 * and the five deciding ranks into one integer (`evaluate.ts`), and that is
 * everything a name needs: a pair of kings is category 1 with a king in the
 * top nibble. Naming the hand from the same value the engine ranks it by means
 * the sentence cannot disagree with the figure — the hand that reads 100 % is
 * the hand the sentence says won.
 *
 * ⚠ COPY NOT DRAWN beyond the one example. The board draws *a pair of kings
 * beats a pair of deuces* and nothing else; every other form below — *two
 * pair, aces and kings*, *kings full of deuces*, *an ace-high flush*, *a royal
 * flush* — is the engineer's, written the way a dealer calls a hand, and wants
 * review.
 */

import type { Card } from './cards';
import { evaluate } from './evaluate';
import { oddsProblem, BOARD_CARDS, type OddsInput } from './odds';

/** Plural rank names, deuce to ace — a dealer's, not a typesetter's. */
export const RANK_PLURAL = [
  'deuces',
  'threes',
  'fours',
  'fives',
  'sixes',
  'sevens',
  'eights',
  'nines',
  'tens',
  'jacks',
  'queens',
  'kings',
  'aces',
] as const;

/** Singular, for "ace high" and "a ten-high straight". */
export const RANK_WORD = [
  'deuce',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'jack',
  'queen',
  'king',
  'ace',
] as const;

/**
 * A packed value from `evaluate()`, named: *a pair of kings*, *two pair, aces
 * and kings*, *three queens*, *a ten-high straight*, *an ace-high flush*, *kings
 * full of deuces*, *four nines*, *a nine-high straight flush*, *a royal flush*,
 * *ace high*. Lower case, with its article, so it drops into a sentence.
 */
export function describeValue(value: number): string {
  const category = value >> 20;
  const k = (i: number): number => (value >> (16 - 4 * i)) & 15;
  const word = (r: number): string => RANK_WORD[r]!;
  const plural = (r: number): string => RANK_PLURAL[r]!;
  const high = (r: number): string => `${r === 12 ? 'an' : 'a'} ${word(r)}-high`;
  switch (category) {
    case 0:
      return `${word(k(0))} high`;
    case 1:
      return `a pair of ${plural(k(0))}`;
    case 2:
      return `two pair, ${plural(k(0))} and ${plural(k(1))}`;
    case 3:
      return `three ${plural(k(0))}`;
    case 4:
      return `${high(k(0))} straight`;
    case 5:
      return `${high(k(0))} flush`;
    case 6:
      return `${plural(k(0))} full of ${plural(k(1))}`;
    case 7:
      return `four ${plural(k(0))}`;
    case 8:
      return k(0) === 12 ? 'a royal flush' : `${high(k(0))} straight flush`;
    default:
      throw new Error('That is not a hand.');
  }
}

/** The best five of these cards, named. */
export function describeHand(cards: readonly Card[]): string {
  return describeValue(evaluate(cards));
}

export interface Showdown {
  /** The seats sharing the best hand, in seat order. One, usually. */
  winners: number[];
  /** The winning hand, named. */
  best: string;
  /** The best hand that lost, named — or null when every hand shares the pot. */
  beaten: string | null;
}

/**
 * Who won on a complete board, and what beat what. The board must be five
 * cards; anything short of that is a question for `odds()`, not a showdown.
 */
export function showdown(input: OddsInput): Showdown {
  const problem = oddsProblem(input);
  if (problem !== null) throw new Error(problem);
  if (input.board.length !== BOARD_CARDS) throw new Error('A showdown needs the whole board.');
  const values = input.hands.map((h) => evaluate([...h, ...input.board]));
  const top = Math.max(...values);
  const winners: number[] = [];
  let second = -1;
  values.forEach((v, i) => {
    if (v === top) winners.push(i);
    else if (v > second) second = v;
  });
  return {
    winners,
    best: describeValue(top),
    beaten: second < 0 ? null : describeValue(second),
  };
}
