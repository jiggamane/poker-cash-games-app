/**
 * The board's engine: `packages/core`'s own functions, and the two small
 * compositions these screens need on top of them. Bundled by `build.mjs` with
 * esbuild, once for the build (every figure on the phones) and once into the
 * page (the live phone), so the board and the live phone read the same code.
 *
 * Nothing here adds up money of its own. Ranking is `evaluate()`, naming is
 * `nameHand()` / `bestFive()` / `decidingKicker()`, the pots are `sidePots()`
 * and a split is `allocate()`. What is new is only which of those to call in
 * what order — and that is exactly what moves into `packages/core` (beside
 * `showdown.ts`, with tests) if the owner approves the board. Until then it
 * lives here and the app is untouched.
 */
import { evaluate } from '../../../packages/core/src/odds/evaluate';
import { nameHand, bestFive, decidingKicker } from '../../../packages/core/src/odds/hand';
import { RANK_WORD } from '../../../packages/core/src/odds/showdown';
import { parseCard, cardText, type Card } from '../../../packages/core/src/odds/cards';
import { sidePots } from '../../../packages/core/src/rulings/calculators';
import { allocate, add, subtract, sum, money, formatMoney, formatSigned, ZERO, type Money } from '../../../packages/core/src/money';

export { parseCard, cardText, formatMoney, formatSigned };

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export const streetOf = (board: number): Street | null =>
  board === 0 ? 'preflop' : board === 3 ? 'flop' : board === 4 ? 'turn' : board === 5 ? 'river' : null;

export interface SeatStanding {
  /** *Pair of kings*, with the deciding kicker where one decided: *Pair of aces · king kicker*. */
  label: string;
  /** The cards that make the hand, best first, then the kickers; two before the flop. */
  five: string[];
  /** How many of `five` make the hand; the rest are kickers. */
  making: number;
  /** The index in `five` of the kicker that decided against the best other hand, or -1. */
  decider: number;
  /** 'best' alone at the top, 'shared' tied at the top, 'behind'. */
  place: 'best' | 'shared' | 'behind';
}

const MAKING = [1, 2, 4, 3, 5, 5, 5, 4, 5] as const;

/**
 * ⚠ NEW RANKING, the one piece here that is not `packages/core`'s.
 * `evaluate()` is for five to seven cards: with two, its kicker search runs
 * off the end (`highBit(0)` is −1) and the packing is garbage. Before the flop
 * the two hole cards are ranked on their own — a pair beats no pair, a higher
 * pair beats a lower one, otherwise the higher card and then the second —
 * packed the same way, so `nameHand` reads *Pair of queens* and *High card,
 * ace*, and `decidingKicker` finds *king kicker* against *queen kicker*.
 */
const holeValue = (h: Card[]): number => {
  const [hi, lo] = [h[0]! >> 2, h[1]! >> 2].sort((a, b) => b - a) as [number, number];
  return hi === lo ? (1 << 20) | (hi << 16) : (hi << 16) | (lo << 12);
};
const valueOf = (h: Card[], board: Card[]): number => (board.length === 0 ? holeValue(h) : evaluate([...h, ...board]));

/**
 * Every seat's best hand on the cards so far, and where it stands. Before the
 * flop that is the two hole cards alone (a pair, or high card); from the flop
 * the best five of five, six or seven. Ranking is the engine's packed value,
 * so a seat named "ahead" is the seat the engine ranks highest.
 */
export function standings(hands: Card[][], board: Card[]): SeatStanding[] {
  const values = hands.map((h) => valueOf(h, board));
  const top = Math.max(...values);
  const sharers = values.filter((v) => v === top).length;
  return hands.map((h, i) => {
    const cards = [...h, ...board];
    const value = values[i]!;
    const category = value >> 20;
    let other = -1;
    values.forEach((v, j) => { if (j !== i && v > other) other = v; });
    const decided = other >= 0 ? decidingKicker(value, other) : null;
    const name = nameHand(value);
    const five = board.length >= 3 ? bestFive(cards) : [...h].sort((a, b) => b - a);
    return {
      label: decided ? `${name} · ${RANK_WORD[decided.a]} kicker` : name,
      five: five.map(cardText),
      making: board.length >= 3 ? MAKING[category]! : category === 1 ? 2 : 1,
      decider: decided ? five.findIndex((c, k) => k >= (board.length >= 3 ? MAKING[category]! : 1) && c >> 2 === decided.a) : -1,
      place: value === top ? (sharers > 1 ? 'shared' : 'best') : 'behind',
    };
  });
}

export interface PotOutcome {
  /** 'Main pot', 'Side pot 1', … */
  name: string;
  amount: Money;
  /** Seat indexes that can win it. */
  eligible: number[];
  /** Seat indexes holding the best hand among `eligible` on the cards so far; empty while any of them has no cards. */
  leaders: number[];
  /** Each leader's share, in the same order; the odd unit goes to the first. */
  shares: Money[];
}

export interface PotsResult {
  pots: PotOutcome[];
  /** A stack nobody could match, back to its owner untouched. */
  returned: { seat: number; amount: Money } | null;
  /**
   * What each seat ends the hand with: `won` from the pots, `back` uncalled,
   * `collects` the two together, `change` against its stack. Null until every
   * pot has a leader.
   */
  ends: { won: Money; back: Money; collects: Money; change: Money }[] | null;
  /** Each seat's place by hand, 1 for the best; equal hands share a place, and the next hand takes the next one. Null without cards. */
  places: (number | null)[];
  /** Everything in the pots, the uncalled stack not included. */
  total: Money;
}

/**
 * Everybody all in for their stack: the pots layered by `sidePots()`, the
 * top layer that only one stack reached handed back as uncalled, and every
 * pot given to the best hand among those who can win it, split by
 * `allocate()` when hands are equal. On an incomplete board the "leaders" are
 * who would take each pot if the cards stopped here.
 */
export function allInPots(hands: (Card[] | null)[], board: Card[], stacks: number[]): PotsResult {
  const ids = stacks.map((_, i) => String(i));
  const layers = sidePots(stacks.map((s, i) => ({ playerId: ids[i]!, amount: money(s) })));
  const values = hands.map((h) => (h ? valueOf(h, board) : -1));
  let returned: PotsResult['returned'] = null;
  const pots: PotOutcome[] = [];
  for (const layer of layers) {
    const eligible = layer.eligible.map(Number);
    if (eligible.length === 1) { returned = { seat: eligible[0]!, amount: layer.amount }; continue; }
    const known = eligible.every((i) => values[i]! >= 0);
    const top = Math.max(...eligible.map((i) => values[i]!));
    const leaders = known ? eligible.filter((i) => values[i] === top) : [];
    pots.push({ name: pots.length === 0 ? 'Main pot' : `Side pot ${pots.length}`, amount: layer.amount, eligible, leaders, shares: known ? allocate(layer.amount, leaders.map(() => 1)) : [] });
  }
  const won = stacks.map(() => ZERO);
  for (const p of pots) p.leaders.forEach((s, k) => { won[s] = add(won[s]!, p.shares[k]!); });
  const back = stacks.map((_, i) => (returned && returned.seat === i ? returned.amount : ZERO));
  const ranked = [...new Set(values.filter((v) => v >= 0))].sort((a, b) => b - a);
  const settled = pots.length > 0 && pots.every((p) => p.leaders.length > 0);
  return {
    pots,
    returned,
    ends: settled
      ? won.map((w, i) => {
          const collects = add(w, back[i]!);
          return { won: w, back: back[i]!, collects, change: subtract(collects, money(stacks[i]!)) };
        })
      : null,
    places: values.map((v) => (v < 0 ? null : ranked.indexOf(v) + 1)),
    total: sum(pots.map((p) => p.amount)),
  };
}

/** `"Ah Kh"` → cards, for the board's sample hands. */
export const cardsOf = (text: string): Card[] => text.split(/\s+/).filter(Boolean).map((t) => { const c = parseCard(t); if (c === null) throw new Error(t); return c; });
