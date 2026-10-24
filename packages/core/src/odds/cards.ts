/**
 * A playing card, for the odds calculator.
 *
 * A card is one integer, 0–51: `rank * 4 + suit`. Rank 0 is the deuce and
 * rank 12 the ace; suit 0–3 is clubs, diamonds, hearts, spades. One integer
 * rather than an object because the evaluator looks at a few million of them
 * per calculation, and `c >> 2` and `c & 3` are the whole cost of reading one.
 *
 * Nothing here is money. The calculator is the one part of `packages/core`
 * that does not touch `Money`, and it is here for the same reason the money
 * is: arithmetic that is tested in one place rather than redone on a screen.
 */

export type Card = number;

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export const SUITS = ['c', 'd', 'h', 's'] as const;
export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

/** The 52 cards, in deck order: deuces first, aces last, clubs to spades. */
export const DECK: readonly Card[] = Array.from({ length: 52 }, (_, i) => i);

export const card = (rank: Rank, suit: Suit): Card => RANKS.indexOf(rank) * 4 + SUITS.indexOf(suit);
export const rankOf = (c: Card): number => c >> 2;
export const suitOf = (c: Card): number => c & 3;

/** `As`, `Td`, `7c` — the two-letter form every poker text uses. */
export function cardText(c: Card): string {
  return `${RANKS[c >> 2]}${SUITS[c & 3]}`;
}

/**
 * The two-letter form back to a card. Case-insensitive on the rank, so `as`
 * and `AS` both read as the ace of spades, and `10` is accepted for a ten.
 * Anything else is `null` rather than a guess.
 */
export function parseCard(text: string): Card | null {
  const s = text.trim().replace(/^10/, 'T');
  if (s.length !== 2) return null;
  const r = RANKS.indexOf(s[0]!.toUpperCase() as Rank);
  const u = SUITS.indexOf(s[1]!.toLowerCase() as Suit);
  if (r < 0 || u < 0) return null;
  return r * 4 + u;
}

/** Several cards written together — `AsKs`, `As Ks`, `As,Ks`. */
export function parseCards(text: string): Card[] | null {
  const parts = text.trim().replace(/10/g, 'T').replace(/[\s,]+/g, '');
  if (parts.length % 2 !== 0) return null;
  const out: Card[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const c = parseCard(parts.slice(i, i + 2));
    if (c === null) return null;
    out.push(c);
  }
  return out;
}
