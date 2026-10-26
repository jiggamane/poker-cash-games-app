/**
 * The scenarios `ui-odds.mjs` plays through the real screen, and what the
 * screen has to show for each.
 *
 * Written as TypeScript because the answers come from the engine, and the
 * engine is: `ui-odds.mjs` runs this through `vite-node` and reads the JSON.
 * Seeded, so a failing scenario is the same one next time.
 *
 * WHAT IT IS FOR. The engine is held to the facts about poker by
 * `npm run odds:verify`. What that cannot see is the screen between a tap and a
 * figure: a card going to the wrong seat, a gap between two seats shifting
 * everyone's results up one, a card taken back leaving a ghost behind, a dead
 * card not counted. So the screen is played through with real taps and what it
 * prints is compared, to the digit, with what the engine gives for the table
 * those taps made.
 */

import { DECK, cardText, type Card } from '../packages/core/src/odds/cards';
import { odds, oddsProblem, type Hand } from '../packages/core/src/odds/odds';
import { dealRandom, rng } from '../packages/core/src/odds/reference';

const GLYPH: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };
/** The deck button's own name for a card: rank, then the suit's glyph. */
const name = (c: Card): string => {
  const t = cardText(c);
  return t[0]! + GLYPH[t[1]!]!;
};
const grouped = (x: number): string => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** Two decimals; a whole number once the board is complete (decided 26 October). */
const pct = (x: number, whole: boolean): string => (whole ? `${Math.round(x * 100)}%` : `${(x * 100).toFixed(2)}%`);

type Placement = { slot: string; card: string; decoy?: string };
type Case = {
  title: string;
  seats: number;
  placements: Placement[];
  /** Per seat in order: [win, tie], or null where the seat is not in the hand. */
  figures: ([string, string] | null)[];
  /** What the line under the title has to read once it has settled. */
  meta: string;
};

const next = rng(20261024);
const cases: Case[] = [];

for (let i = 0; i < 36; i++) {
  const seats = 2 + Math.floor(next() * 8); // 2..9; the screen opens with three
  const shown = Math.max(seats, 3);
  /* Which seats hold a full hand, which hold one card, which are empty. */
  const state: ('full' | 'one' | 'none')[] = Array.from({ length: shown }, () => 'none');
  const wantFull = 2 + Math.floor(next() * Math.min(shown - 1, 4));
  const order = dealRandom(next, shown, Array.from({ length: shown }, (_, k) => k));
  order.slice(0, wantFull).forEach((k) => (state[k] = 'full'));
  const halfDealt = i % 6 === 5;
  if (halfDealt) state[order[wantFull] ?? order[shown - 1]!] = 'one';
  const boardSlots = dealRandom(next, Math.floor(next() * 6), [0, 1, 2, 3, 4]); // 0..5 cards, anywhere
  const deadN = Math.floor(next() * 5);
  const heavy = boardSlots.length === 0 && wantFull <= 3 ? 0 : 1; // pre-flop is the slow one: allow it, fewer of them

  const fullCount = state.filter((x) => x === 'full').length;
  const need = fullCount * 2 + (halfDealt ? 1 : 0) + boardSlots.length + deadN;
  const cards = dealRandom(next, need);
  let at = 0;
  const take = () => cards[at++]!;

  const placements: Placement[] = [];
  const hands: Hand[] = [];
  state.forEach((st, seat) => {
    if (st === 'none') return;
    const a = take();
    const b = st === 'full' ? take() : null;
    const first = Math.floor(next() * 2); // which of the two places is filled first, and whether a hand is split
    placements.push({ slot: `Player ${seat + 1}, card ${first + 1}`, card: name(a) });
    if (b !== null) {
      placements.push({ slot: `Player ${seat + 1}, card ${2 - first}`, card: name(b) });
      hands.push([a, b]);
    }
  });
  const board: Card[] = [];
  for (const slot of boardSlots) {
    const c = take();
    board.push(c);
    placements.push({ slot: `Board, card ${slot + 1}`, card: name(c) });
  }
  const dead: Card[] = [];
  for (let d = 0; d < deadN; d++) {
    const c = take();
    dead.push(c);
    placements.push({ slot: 'Next dead card', card: name(c) });
  }
  /* A card put in the wrong place and taken back, in a few scenarios: the
     decoy must leave no trace in the answer. */
  if (i % 4 === 1 && placements.length > 0) {
    const used = new Set<Card>(cards.slice(0, need));
    const spare = DECK.filter((c) => !used.has(c));
    const p = placements[Math.floor(next() * placements.length)]!;
    if (!p.slot.startsWith('Next dead')) p.decoy = name(spare[0]!);
  }
  /* Deal them in a shuffled order: the order must not matter either. */
  const shuffled = dealRandom(next, placements.length, placements);
  void heavy;

  const problem = halfDealt ? null : oddsProblem({ hands, board, dead });
  let figures: Case['figures'] = state.map(() => null);
  let meta: string;
  if (halfDealt) {
    const seat = state.findIndex((x) => x === 'one');
    meta = `Player ${seat + 1} needs a second card`;
  } else if (problem !== null) {
    meta = hands.length < 2 ? 'Texas hold’em · deal two hands' : problem;
  } else {
    const r = odds({ hands, board, dead });
    let k = 0;
    figures = state.map((st) => {
      if (st !== 'full') return null;
      const s = r.seats[k++]!;
      return [pct(s.win, board.length === 5), pct(s.tie, board.length === 5)];
    });
    meta = `${grouped(r.boards)} ${r.boards === 1 ? 'board' : 'boards'} dealt · exact`;
  }
  cases.push({
    title: `${state.map((x) => ({ full: 'H', one: 'h', none: '.' })[x]).join('')} · board ${board.length} · dead ${dead.length}${halfDealt ? ' · half-dealt seat' : ''}${shuffled.some((p) => p.decoy) ? ' · take-back' : ''}`,
    seats: shown,
    placements: shuffled,
    figures,
    meta,
  });
}

console.log(JSON.stringify(cases));
