/**
 * The line under the odds calculator's title. It never changes (the owner, 29
 * October): once cards were in it used to become the status below, and the
 * screen read as a different screen from one card to the next.
 */
export const ODDS_SUBTITLE = 'Texas Hold’em card and chip odds';

/**
 * Where the table stands — one sentence, chosen here. It was the line under the
 * title until 29 October; it is now said to a screen reader as it changes and
 * drawn nowhere.
 *
 * It lives apart from the screen so the rule can be tested and written down
 * once: `design/handoff-odds-calculator/START-HERE.md` has the same five states
 * in the same order, and a screen that re-derives them inline is how a result
 * outlived the table it was counted for (B101, B102).
 *
 * The first of these that is true wins:
 *
 *   1. A seat holds exactly one card → "Player N needs a second card", N the
 *      lowest such seat. This beats everything: nothing is counted while a hand
 *      is half dealt, and any figure still showing is for a table that is gone.
 *   2. A result for THIS exact table → "1,712,304 boards dealt · exact", "1 board
 *      dealt · exact" when it is one.
 *   3. Counting → "Calculating · 62%", a whole number.
 *   4. Two or more full hands the engine will not take (dead cards left too few
 *      for the board) → the engine's own sentence.
 *   5. Anything else, which is fewer than two full hands → "Texas hold’em · deal
 *      two hands".
 *
 * Calculating and a result cannot both be true — calculating means there is no
 * result for this table — so their order between themselves is only tidiness.
 */

/** Commas by hand: a locale can write 1.712.304 on the phone that writes money with commas. */
export const grouped = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export interface OddsStatusInput {
  /** The lowest seat holding exactly one card, or -1 when none does. */
  halfDealtSeat: number;
  /** How many seats hold two cards. */
  fullHands: number;
  /** The engine's refusal for this table, or null when it can be counted. */
  problem: string | null;
  /** Boards counted, when a result for this exact table is in hand. */
  boardsDealt: number | null;
  /** Whether this table is valid and being counted now. */
  calculating: boolean;
  /** 0–1, boards counted so far. */
  progress: number;
}

export function oddsStatus(s: OddsStatusInput): string {
  if (s.halfDealtSeat >= 0) return `Player ${s.halfDealtSeat + 1} needs a second card`;
  if (s.boardsDealt !== null) {
    return `${grouped(s.boardsDealt)} ${s.boardsDealt === 1 ? 'board' : 'boards'} dealt · exact`;
  }
  if (s.calculating) return `Calculating · ${Math.round(s.progress * 100)}%`;
  if (s.fullHands >= 2 && s.problem !== null) return s.problem;
  return 'Texas hold’em · deal two hands';
}
