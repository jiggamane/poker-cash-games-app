import {
  STREETS,
  cardText,
  parseCards,
  type Card,
  type Hand,
  type OddsInput,
  type Showdown,
  type Street,
} from '@poker-club/core';
import { grouped } from './oddsStatus';

/**
 * The words on the run-out screen — board 19 of `design/handoff-odds-calculator/`,
 * "How it ran out" — and the link that carries a table to it.
 *
 * Apart from the screen they are written down here so they can be held: the
 * street names, the figure's one-decimal form, the line that says what is
 * still to come, and the verdict on the river. `runOut.test.ts` holds each
 * against the board's own strings where the board draws one.
 *
 * ⚠ COPY NOT DRAWN, beyond what the boards print. The boards draw the four
 * street names, `50.1%` / `100%`, *1,712,304 boards still to come*,
 * *990 boards still to come*, *44 cards could still come*, and *Player 1 won on
 * the river · A pair of kings beats a pair of deuces*. A split pot, a street the
 * board has not reached (`—`), and the title's *All in before the flop* on a
 * board that is not yet complete are the engineer's and want review.
 */

export const STREET_LABEL: Readonly<Record<Street, string>> = {
  preflop: 'Pre-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
};

/**
 * A figure on the run-out: one decimal, as board 19 prints it — `50.1%`,
 * `64.8%` — and a whole number where the decimal is nought: `100%`, `0%`. The
 * calculator's own screen prints two decimals; the picture is read at a
 * glance and the board chose one. Every figure carries its sign (the owner,
 * 26 October — the board left it off the small ones).
 */
export function runOutFigure(x: number): string {
  return `${(x * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

/**
 * What the last street reached leaves open — boards 15 to 17's one line under
 * the bar. Before the flop and on the flop the deck's combinations are boards;
 * on the turn each one is a card. The river has nothing to come and takes the
 * verdict instead.
 */
export function stillToCome(street: Street, boards: number): string {
  if (street === 'turn') return `${grouped(boards)} ${boards === 1 ? 'card' : 'cards'} could still come`;
  return `${grouped(boards)} ${boards === 1 ? 'board' : 'boards'} still to come`;
}

export interface Verdict {
  /** *Player 1 won on the river* */
  title: string;
  /** *A pair of kings beats a pair of deuces* */
  detail: string;
}

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Seats as people: *Player 1*, *Player 1 and Player 2*, *Players 1, 2 and 3*. */
export function playersNamed(seats: readonly number[]): string {
  const n = seats.map((s) => s + 1);
  if (n.length === 1) return `Player ${n[0]}`;
  if (n.length === 2) return `Player ${n[0]} and Player ${n[1]}`;
  return `Players ${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

/**
 * The box at the foot of the picture, on a complete board. Board 19 draws the
 * one case — one winner, one loser. A split pot is NOT DRAWN: it reads *Player
 * 1 and Player 2 split it on the river* over *Both hold a pair of kings*, or
 * over what the split beat where a third hand lost.
 */
export function verdictOf(s: Showdown, hands: number): Verdict {
  const who = playersNamed(s.winners);
  if (s.winners.length === 1) {
    return { title: `${who} won on the river`, detail: capital(`${s.best} beats ${s.beaten ?? ''}`.trim()) };
  }
  const detail =
    s.beaten !== null
      ? capital(`${s.best} beats ${s.beaten}`)
      : `${s.winners.length === hands && hands > 2 ? 'All' : 'Both'} hold ${s.best}`;
  return { title: `${who} split it on the river`, detail };
}

/*
 * THE LINK. A table is twenty cards at most, each two letters, so the whole of
 * it travels as three query strings: `h` the hands in seat order, a comma
 * between them; `b` the board in order; `d` the dead cards. `AhKh,2c2d` on
 * `QhJh3s7cKc` is the canvas's own hand. Nothing else is carried — not the
 * figures, which the engine recounts exactly, and not names, which the odds
 * screen does not have. What `/run-out` cannot parse it refuses with the
 * engine's own sentence rather than a guess at a table.
 */
/** Indexable, because that is what expo-router's `params` takes. */
export type RunOutParams = { h: string; b: string; d?: string } & Record<string, string | undefined>;

export function runOutParams(input: OddsInput): RunOutParams {
  const out: RunOutParams = {
    h: input.hands.map((hand) => hand.map(cardText).join('')).join(','),
    b: input.board.map(cardText).join(''),
  };
  if (input.dead !== undefined && input.dead.length > 0) out.d = input.dead.map(cardText).join('');
  return out;
}

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''));

/** The table a link carries, or null where it carries nothing readable. */
export function parseRunOutParams(params: { h?: string | string[]; b?: string | string[]; d?: string | string[] }): OddsInput | null {
  const h = one(params.h);
  if (h === '') return null;
  const hands: Hand[] = [];
  for (const part of h.split(',')) {
    const cards = parseCards(part);
    if (cards === null || cards.length !== 2) return null;
    hands.push([cards[0]!, cards[1]!]);
  }
  const board: Card[] | null = one(params.b) === '' ? [] : parseCards(one(params.b));
  const dead: Card[] | null = one(params.d) === '' ? [] : parseCards(one(params.d));
  if (board === null || dead === null) return null;
  return { hands, board, dead };
}

/** Which streets a picture has columns for: every one, always — the ones the board has not reached are drawn empty. */
export const COLUMNS: readonly Street[] = STREETS;
