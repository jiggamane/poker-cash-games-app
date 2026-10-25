/**
 * The run-out — the same hands, street by street.
 *
 * `odds()` answers one question: on THIS board, how often does each hand win.
 * The run-out (`design/handoff-odds-calculator/`, § 8, board 19 "How it ran
 * out") asks it four times: what the odds were before the flop, on the flop,
 * on the turn and on the river, for the board the reader has dealt. Two hands
 * all in before the flop that ran out Q♥ J♥ 3♠ 7♣ K♣ were 50 / 50, then 65 / 35,
 * then 41 / 59, then 100 / 0 — and that line is the story a picture of the
 * hand tells.
 *
 * EACH STREET IS THE TABLE AS IT STOOD. On the flop the turn and river cards
 * are not yet dealt, so they are back in the deck for that count, not dead:
 * the flop figure is what the calculator would have said with three cards on
 * the board, to the digit. Dead cards stay dead on every street — they were out
 * of the deck before the hand started.
 *
 * THE WORK IS ALMOST ALL THE PRE-FLOP COUNT. The river is one board, the turn
 * at most 44, the flop at most 990, and pre-flop up to 1,712,304. So the streets
 * are counted LAST FIRST — river, turn, flop, pre-flop — and a screen that reads
 * `result()` between slices has three of its four figures at once and the bar
 * on the fourth.
 */

import type { Card } from './cards';
import { BOARD_CARDS, OddsEnumeration, oddsProblem, type Odds, type OddsInput } from './odds';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

/** In the order they are dealt. */
export const STREETS: readonly Street[] = ['preflop', 'flop', 'turn', 'river'];

/** The board on each street. A board of one or two cards has not reached the flop. */
export const STREET_CARDS: Readonly<Record<Street, number>> = { preflop: 0, flop: 3, turn: 4, river: 5 };

/** The streets a board of `boardLength` cards has reached, in dealing order. Pre-flop always. */
export function streetsReached(boardLength: number): Street[] {
  return STREETS.filter((s) => STREET_CARDS[s] <= Math.min(boardLength, BOARD_CARDS));
}

/**
 * The table as it stood on that street: the board cut to the street's cards
 * and the rest of it back in the deck. The hands and the dead cards are as
 * given. Asking for a street the board has not reached is an error, not a
 * guess.
 */
export function tableOn(input: OddsInput, street: Street): OddsInput {
  const n = STREET_CARDS[street];
  if (input.board.length < n) throw new Error(`The board has not reached the ${street}.`);
  return { hands: input.hands, board: input.board.slice(0, n), dead: input.dead ?? [] };
}

export interface RunOutProgress {
  /** The figures for every street counted so far, by street. */
  streets: ReadonlyMap<Street, Odds>;
  /** The street being counted now, or null once every street is. */
  counting: Street | null;
  /** 0–1 of the street being counted; 1 when none is. */
  progress: number;
}

/**
 * Every street the board has reached, stepped a slice at a time like
 * `OddsEnumeration` — construct, `step()` until true, `result()`. The streets
 * finish last first (see the head of the file), so `result()` is worth reading
 * between slices.
 */
export class RunOutEnumeration {
  /** The streets in the order they are counted: the river first. */
  readonly order: readonly Street[];
  /** Boards over every street together. */
  readonly total: number;
  done = 0;

  private readonly runs: { street: Street; e: OddsEnumeration }[];
  private at = 0;
  private readonly finished = new Map<Street, Odds>();

  constructor(input: OddsInput) {
    const problem = oddsProblem(input);
    if (problem !== null) throw new Error(problem);
    this.order = streetsReached(input.board.length).slice().reverse();
    this.runs = this.order.map((street) => ({ street, e: new OddsEnumeration(tableOn(input, street)) }));
    this.total = this.runs.reduce((n, r) => n + r.e.total, 0);
  }

  /** Deal up to `limit` more boards, across streets. True once every street is counted. */
  step(limit = 50_000): boolean {
    limit = limit >= 1 ? Math.floor(limit) : 1;
    while (this.at < this.runs.length && limit > 0) {
      const run = this.runs[this.at]!;
      const before = run.e.done;
      const finished = run.e.step(limit);
      const dealt = run.e.done - before;
      this.done += dealt;
      limit -= dealt;
      if (finished) {
        this.finished.set(run.street, run.e.result());
        this.at++;
      }
    }
    return this.at >= this.runs.length;
  }

  result(): RunOutProgress {
    const run = this.runs[this.at];
    return {
      streets: new Map(this.finished),
      counting: run === undefined ? null : run.street,
      progress: run === undefined ? 1 : run.e.done / run.e.total,
    };
  }
}

/** The whole run-out in one call: the odds on every street the board has reached. */
export function runOut(input: OddsInput): Map<Street, Odds> {
  const e = new RunOutEnumeration(input);
  while (!e.step(1 << 20)) {
    /* every street, in slices */
  }
  return new Map(e.result().streets);
}

/** The cards on the board on that street — for drawing it. */
export function boardOn(board: readonly Card[], street: Street): Card[] {
  return board.slice(0, STREET_CARDS[street]);
}
