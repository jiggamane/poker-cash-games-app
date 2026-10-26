/**
 * The river scenarios `ui-odds.mjs` plays through the real screen, and what the
 * player cards have to show once the board is complete — decided 26 October
 * (`design/handoff-odds-calculator/decided-2026-10-25.md` § 8, board 21).
 *
 * Same arrangement as the other case files: the answers come from core
 * (`odds`, `standings`, `riverHands`) and the app's own `oddsTone`; `ui-odds.mjs`
 * runs this through `vite-node` and reads the JSON; nothing in the browser
 * script knows poker. Held per seat: the figures as the card must print them —
 * WHOLE on the river, two decimals on the turn — the word, the hand's name with
 * the kicker only where it decided, the chevron on every hand on the river and
 * on no favourite on the turn, and the five cards behind it in core's order.
 *
 * The tables are hand-picked: the canvas's river, the kicker case the brief
 * gives, a chop, a three-way river, and the same canvas table on the turn for
 * the contrast.
 */

import { cardText, parseCards, type Card } from '../packages/core/src/odds/cards';
import { riverHands } from '../packages/core/src/odds/hand';
import { odds, oddsProblem, type Hand } from '../packages/core/src/odds/odds';
import { groupOuts, outsToCome } from '../packages/core/src/odds/outs';
import { standings } from '../packages/core/src/odds/standing';
import { oddsTone } from '../apps/mobile/src/lib/oddsTone';

const GLYPH: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };
const name = (c: Card): string => cardText(c)[0]! + GLYPH[cardText(c)[1]!]!;
const cards = (s: string) => parseCards(s)!;
const grouped = (x: number): string => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** As the screen prints a share: two decimals, or a whole number on a completed board. */
const pct = (x: number, whole: boolean): string => (whole ? `${Math.round(x * 100)}%` : `${(x * 100).toFixed(2)}%`);

type Placement = { slot: string; card: string };
type SeatWant = {
  /** The figures as printed, or `—` where the seat is not in the hand. */
  win: string;
  tie: string;
  /** The word beside the name; null where the seat is not in the hand. */
  word: string | null;
  /** Whether the chevron is on the card as `Hand for Player N` (the river) … */
  hand: boolean;
  /** … or as `Outs for Player N` (the turn, a chasing hand). */
  outs: boolean;
  /** The hand's name with its kicker, or null off the river. */
  label: string | null;
  /** The five cards behind the chevron, in core's order. */
  five: string[];
};
type Case = {
  title: string;
  seats: number;
  placements: Placement[];
  meta: string;
  river: boolean;
  want: SeatWant[];
};

function build(title: string, hands: string[], board: string): Case {
  const placements: Placement[] = [];
  const full: Hand[] = [];
  hands.forEach((h, seat) => {
    const [a, b] = cards(h) as [Card, Card];
    placements.push({ slot: `Player ${seat + 1}, card 1`, card: name(a) }, { slot: `Player ${seat + 1}, card 2`, card: name(b) });
    full.push([a, b]);
  });
  const boardCards = cards(board);
  boardCards.forEach((c, i) => placements.push({ slot: `Board, card ${i + 1}`, card: name(c) }));
  const seats = Math.max(3, hands.length);
  const river = boardCards.length === 5;
  const input = { hands: full, board: boardCards };
  if (oddsProblem(input) !== null) throw new Error(`${title}: ${oddsProblem(input)}`);
  const r = odds(input);
  const stands = standings(r.seats);
  const named = river ? riverHands(input) : null;
  const outs = river ? null : outsToCome(input);
  const want: SeatWant[] = Array.from({ length: seats }, () => ({ win: '—', tie: '—', word: null, hand: false, outs: false, label: null, five: [] }));
  full.forEach((_, i) => {
    const tone = oddsTone(stands[i]!, { name: 'dark', amber: '' }, river);
    const chasing = stands[i]!.kind !== 'ahead' && outs !== null && groupOuts(outs[i]!.wins).length > 0;
    want[i] = {
      win: pct(r.seats[i]!.win, river),
      tie: pct(r.seats[i]!.tie, river),
      word: tone.word,
      hand: river,
      outs: chasing,
      label: named === null ? null : named[i]!.label,
      five: named === null ? [] : named[i]!.five.map(name),
    };
  });
  return {
    title,
    seats,
    placements,
    meta: `${grouped(r.boards)} ${r.boards === 1 ? 'board' : 'boards'} dealt · exact`,
    river,
    want,
  };
}

const cases: Case[] = [
  /* The canvas's river (board 21): a pair of kings beats a pair of deuces, no kicker decided. */
  build('the river: A♥K♥ against 2♣2♦ on Q♥ J♥ 3♠ 7♣ K♣ (board 21)', ['AhKh', '2c2d'], 'Qh Jh 3s 7c Kc'),
  /* The kicker decides: both cards say which. */
  build('the river, a kicker decides: A♥K♥ against A♠Q♠ on A♦ 7♣ 5♠ 3♦ 9♣', ['AhKh', 'AsQs'], 'Ad 7c 5s 3d 9c'),
  /* A chop: the same straight, 50 / 50, no kicker. */
  build('the river, a chop: both play the board’s straight', ['2c3d', '4h5s'], 'As Kd Qh Jc Ts'),
  /* Three hands: each loser measured against the winner. */
  build('the river, three-way: the kicker between the two pairs of aces, the deuces beaten', ['AhKh', 'AsQs', '2c2d'], 'Ad 7c 5s 3d 9c'),
  /* The contrast: the same canvas table a card earlier keeps its decimals, its outs and the favourite's bare card. */
  build('the turn, for contrast: two decimals, outs on the chasing hand only, no hand control', ['AhKh', '2c2d'], 'Qh Jh 3s 7c'),
];

console.log(JSON.stringify(cases));
