/**
 * Texas hold'em odds — win and tie for every hand at the table, exactly.
 *
 * The same calculation as the classic online calculators: every card that is
 * not in somebody's hand, on the board or dead is still in the deck, every
 * way the board can finish from that deck is dealt once, and each hand is
 * counted as a win where it is alone at the top and a tie where it shares it.
 * Nothing is sampled, so the same cards always give the same figures and the
 * figures are the true ones, not an estimate of them.
 *
 * How much work that is depends only on how many cards are still to come:
 *
 *   before the flop, heads-up   C(48,5) = 1,712,304 boards
 *   before the flop, nine-handed C(34,5) =   278,256
 *   on the flop                  C(45,2) ≤       990
 *   on the turn                                 ≤ 44
 *   on the river                                   1
 *
 * A phone gets through the worst of those in a second or two, which is long
 * enough to want the screen to stay alive while it happens. So the work is
 * exposed as an enumeration that is stepped a slice at a time — `odds()` for
 * the one-call form, `OddsEnumeration` for a screen that wants to show a
 * running count and give the next tap a chance to cancel it.
 *
 * Only `win` and `tie` are shown on the screen; `equity` is here because a
 * caller that wants one number per seat should not have to re-derive it from
 * the tie counts and get the shares wrong.
 */

import { DECK, type Card } from './cards';
import { score } from './evaluate';

/** Two hole cards. */
export type Hand = readonly [Card, Card];

export interface OddsInput {
  /** The hands still in the pot, in seat order. At least two. */
  hands: readonly Hand[];
  /** The community cards dealt so far, 0–5. */
  board: readonly Card[];
  /** Cards known to be out of the deck for any other reason. */
  dead?: readonly Card[];
}

export interface SeatOdds {
  /** Boards on which this hand is the only best hand. */
  wins: number;
  /** Boards on which this hand shares the best hand with another. */
  ties: number;
  /** `wins / boards`, 0–1. */
  win: number;
  /** `ties / boards`, 0–1. */
  tie: number;
  /** Share of the pot over all boards: a win is 1, an n-way tie is 1/n. 0–1. */
  equity: number;
}

export interface Odds {
  seats: SeatOdds[];
  /** How many ways the board was finished. 1 on the river. */
  boards: number;
}

/** A hand is complete at two cards; a seat with one card is not yet a hand. */
export const HOLE_CARDS = 2;
export const BOARD_CARDS = 5;
export const MAX_SEATS = 9;

/**
 * Why the input cannot be calculated, or `null` when it can. A screen shows
 * the figures only when this is null and the reason otherwise.
 */
export function oddsProblem(input: OddsInput): string | null {
  if (input.hands.length < 2) return 'Two hands are needed before there are odds.';
  if (input.hands.length > MAX_SEATS) return `No more than ${MAX_SEATS} hands.`;
  if (input.board.length > BOARD_CARDS) return `The board holds ${BOARD_CARDS} cards.`;
  const seen = new Set<Card>();
  const all = [...input.hands.flat(), ...input.board, ...(input.dead ?? [])];
  for (const c of all) {
    if (!Number.isInteger(c) || c < 0 || c > 51) return 'That is not a card.';
    if (seen.has(c)) return 'The same card is dealt twice.';
    seen.add(c);
  }
  return null;
}

/** `n` choose `k`, as a plain number. Small arguments only — 52 choose 5 at most. */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let out = 1;
  for (let i = 1; i <= k; i++) out = (out * (n - k + i)) / i;
  return Math.round(out);
}

/**
 * The enumeration itself. Construct it, call `step()` until it returns true,
 * read `result()`. `done / total` is the progress for a screen to show.
 */
export class OddsEnumeration {
  readonly total: number;
  done = 0;

  private readonly hands: readonly Hand[];
  private readonly board: readonly Card[];
  private readonly deck: Card[];
  private readonly toCome: number;
  private readonly idx: number[];
  private finished = false;

  private readonly wins: number[];
  private readonly ties: number[];
  private readonly equity: number[];

  /* The tallies of the cards every seat shares, rebuilt per board, and the
     working copies each seat adds its two cards to. Allocated once. */
  private readonly boardCounts = new Uint8Array(13);
  private readonly boardSuits = new Uint16Array(4);
  private readonly counts = new Uint8Array(13);
  private readonly suits = new Uint16Array(4);
  private readonly values: number[];

  constructor(input: OddsInput) {
    const problem = oddsProblem(input);
    if (problem !== null) throw new Error(problem);
    this.hands = input.hands;
    this.board = input.board;
    const used = new Set<Card>([...input.hands.flat(), ...input.board, ...(input.dead ?? [])]);
    this.deck = DECK.filter((c) => !used.has(c));
    this.toCome = BOARD_CARDS - input.board.length;
    this.total = choose(this.deck.length, this.toCome);
    this.idx = Array.from({ length: this.toCome }, (_, i) => i);
    this.wins = input.hands.map(() => 0);
    this.ties = input.hands.map(() => 0);
    this.equity = input.hands.map(() => 0);
    this.values = input.hands.map(() => 0);
  }

  /**
   * Deal up to `limit` more boards. Returns true once every board has been
   * dealt. The default slice is about a tenth of a second on a phone.
   */
  step(limit = 50_000): boolean {
    if (this.finished) return true;
    const { deck, idx, toCome } = this;
    const n = deck.length;
    let dealt = 0;
    while (dealt < limit) {
      this.tally();
      dealt++;
      this.done++;
      // Next combination, lexicographic: bump the rightmost index that can
      // still move, reset everything after it.
      let i = toCome - 1;
      while (i >= 0 && idx[i] === n - toCome + i) i--;
      if (i < 0) {
        this.finished = true;
        return true;
      }
      idx[i]!++;
      for (let j = i + 1; j < toCome; j++) idx[j] = idx[j - 1]! + 1;
    }
    return false;
  }

  /** The figures so far — the final ones once `step()` has returned true. */
  result(): Odds {
    const boards = Math.max(this.done, 1);
    return {
      boards: this.done,
      seats: this.hands.map((_, i) => ({
        wins: this.wins[i]!,
        ties: this.ties[i]!,
        win: this.wins[i]! / boards,
        tie: this.ties[i]! / boards,
        equity: this.equity[i]! / boards,
      })),
    };
  }

  /** Score every seat on the board currently indexed and count the outcome. */
  private tally(): void {
    const { boardCounts, boardSuits, counts, suits, values, hands } = this;
    boardCounts.fill(0);
    boardSuits.fill(0);
    let boardMask = 0;
    for (let i = 0; i < this.board.length; i++) {
      const c = this.board[i]!;
      boardCounts[c >> 2]!++;
      boardSuits[c & 3]! |= 1 << (c >> 2);
      boardMask |= 1 << (c >> 2);
    }
    for (let i = 0; i < this.toCome; i++) {
      const c = this.deck[this.idx[i]!]!;
      boardCounts[c >> 2]!++;
      boardSuits[c & 3]! |= 1 << (c >> 2);
      boardMask |= 1 << (c >> 2);
    }

    let best = -1;
    let bestCount = 0;
    for (let p = 0; p < hands.length; p++) {
      counts.set(boardCounts);
      suits.set(boardSuits);
      const [a, b] = hands[p]!;
      counts[a >> 2]!++;
      suits[a & 3]! |= 1 << (a >> 2);
      counts[b >> 2]!++;
      suits[b & 3]! |= 1 << (b >> 2);
      const v = score(boardMask | (1 << (a >> 2)) | (1 << (b >> 2)), counts, suits);
      values[p] = v;
      if (v > best) {
        best = v;
        bestCount = 1;
      } else if (v === best) {
        bestCount++;
      }
    }

    if (bestCount === 1) {
      for (let p = 0; p < hands.length; p++) {
        if (values[p] === best) {
          this.wins[p]!++;
          this.equity[p]! += 1;
          break;
        }
      }
    } else {
      const share = 1 / bestCount;
      for (let p = 0; p < hands.length; p++) {
        if (values[p] === best) {
          this.ties[p]!++;
          this.equity[p]! += share;
        }
      }
    }
  }
}

/** The whole calculation in one call. */
export function odds(input: OddsInput): Odds {
  const e = new OddsEnumeration(input);
  while (!e.step(1 << 20)) {
    /* every board, in slices */
  }
  return e.result();
}
