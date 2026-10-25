/**
 * Outs — with one card still to come, which cards win for whom, and what they
 * make.
 *
 * `odds()` says how often a hand wins. It does not say *which cards* win it, and
 * the player-card layout (decided 25 October, `design/handoff-odds-calculator`)
 * wants exactly that for a hand that is chasing: the cards that put it in front,
 * grouped by the hand they make — nine hearts for a flush, three tens for a
 * straight, six aces and kings for a pair. This is that, and the screen adds up
 * nothing of it.
 *
 * ONE CARD TO COME, ONLY. With the board at four cards every unseen card is one
 * way the hand finishes, so a card either wins for a hand, shares the pot, or
 * does neither, and "the cards that win it" means something. On the flop there
 * are two cards to come and no single card wins anything; that case is not drawn
 * on the board and is not answered here — `outsToCome` returns `null` for it.
 *
 * THE EVALUATOR IS THE ENGINE'S OWN. Each unseen card is dealt to the board and
 * every hand is ranked by `evaluate`, the same function `odds()` ranks with, so
 * a card's verdict here cannot differ from the figure it adds to: for any table
 * a seat's `wins` is that seat's win count in `odds()`, and its `splits` its tie
 * count. `outs.test.ts` holds that on random tables.
 *
 * A TIE IS NOT A WIN. A card on which two hands share the pot goes in each of
 * their `splits`, never in `wins`, so an out is only ever a card that wins the
 * whole pot outright.
 */

import type { Card } from './cards';
import { DECK } from './cards';
import { HAND_CATEGORIES, categoryOf, evaluate, type HandCategory } from './evaluate';
import { oddsProblem, type OddsInput } from './odds';

/** The hand a card makes, named the way the screen names a group of outs. */
export const OUT_KIND: Record<HandCategory, string> = {
  'High card': 'High card',
  Pair: 'One pair',
  'Two pair': 'Two pair',
  'Three of a kind': 'Three of a kind',
  Straight: 'Straight',
  Flush: 'Flush',
  'Full house': 'Full house',
  'Four of a kind': 'Four of a kind',
  'Straight flush': 'Straight flush',
};

export interface Out {
  card: Card;
  /** The category of this seat's best five cards once the card is down. */
  category: HandCategory;
}

export interface SeatOuts {
  /** Cards on which this seat is the only best hand, in deck order. */
  wins: Out[];
  /** Cards on which this seat shares the best hand with another, in deck order. */
  splits: Out[];
}

/**
 * For every seat, the unseen cards that win it the pot and the ones that split
 * it. `null` unless the board has exactly four cards. Throws the engine's own
 * sentence when the table cannot be calculated.
 */
export function outsToCome(input: OddsInput): SeatOuts[] | null {
  const problem = oddsProblem(input);
  if (problem !== null) throw new Error(problem);
  if (input.board.length !== 4) return null;

  const used = new Set<Card>([...input.hands.flat(), ...input.board, ...(input.dead ?? [])]);
  const out: SeatOuts[] = input.hands.map(() => ({ wins: [], splits: [] }));
  for (const card of DECK) {
    if (used.has(card)) continue;
    const values = input.hands.map((h) => evaluate([...h, ...input.board, card]));
    const best = Math.max(...values);
    const winners = values.flatMap((v, p) => (v === best ? [p] : []));
    for (const p of winners) {
      (winners.length === 1 ? out[p]!.wins : out[p]!.splits).push({ card, category: categoryOf(values[p]!) });
    }
  }
  return out;
}

export interface OutGroup {
  /** `OUT_KIND` of the category: "Flush", "One pair". */
  kind: string;
  category: HandCategory;
  /** Strongest rank first, clubs to spades inside a rank. */
  cards: Card[];
}

/**
 * The outs of one seat, grouped by the hand they make, the strongest hand
 * first. One group per category, so every pair is one group — an ace and a king
 * both make "One pair".
 */
export function groupOuts(outs: readonly Out[]): OutGroup[] {
  const groups: OutGroup[] = [];
  for (let k = HAND_CATEGORIES.length - 1; k >= 0; k--) {
    const category = HAND_CATEGORIES[k]!;
    const cards = outs
      .filter((o) => o.category === category)
      .map((o) => o.card)
      .sort((a, b) => (b >> 2) - (a >> 2) || (a & 3) - (b & 3));
    if (cards.length > 0) groups.push({ kind: OUT_KIND[category], category, cards });
  }
  return groups;
}
