/**
 * The outs scenarios `ui-odds.mjs` plays through the real screen, and what the
 * player cards have to show for each — layout G, decided 25 October.
 *
 * Same arrangement as `odds-ui-cases.ts` and `odds-pot-cases.ts`: the answers
 * come from core (`standings`, `outsToCome`, `groupOuts`) and from the app's own
 * `oddsTone`, `ui-odds.mjs` runs this through `vite-node` and reads the JSON, and
 * nothing in the browser script knows poker. What it holds is the screen between
 * a tap and a card: that each hand wears the word it should, that the outs
 * control is on exactly the hands that are chasing with one card to come and on
 * no other, that closed it names the kinds and counts nothing, and that open it
 * says what core says — kind, count, and the cards in order.
 *
 * The tables are hand-picked where the board draws one (the canvas's A♥K♥ against
 * 2♣2♦) and FOUND, by a seeded search, where it does not: two hands level, three
 * hands with one ahead, a hand drawing dead, a hand whose only outs are splits.
 */

import { cardText, parseCards, type Card } from '../packages/core/src/odds/cards';
import { odds, oddsProblem, type Hand } from '../packages/core/src/odds/odds';
import { groupOuts, outsToCome } from '../packages/core/src/odds/outs';
import { dealRandom, rng } from '../packages/core/src/odds/reference';
import { standings } from '../packages/core/src/odds/standing';
import { oddsTone } from '../apps/mobile/src/lib/oddsTone';

const GLYPH: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };
const name = (c: Card): string => cardText(c)[0]! + GLYPH[cardText(c)[1]!]!;
const cards = (s: string) => parseCards(s)!;
const grouped = (x: number): string => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

type Placement = { slot: string; card: string };
type Row = { category: string; kind: string; count: number; cards: string[] };
type SeatWant = {
  /** The word beside the name; null where the seat is not in the hand. */
  word: string | null;
  /** Whether the round outs chevron is on the card. */
  control: boolean;
  /** The kinds the closed card names, strongest first. */
  names: string[];
  /** What the open card shows. */
  rows: Row[];
};
type Case = {
  title: string;
  seats: number;
  placements: Placement[];
  meta: string;
  want: SeatWant[];
};

function build(title: string, hands: (string | null)[], board: string, dead = ''): Case {
  const placements: Placement[] = [];
  const full: Hand[] = [];
  const seatOf: number[] = [];
  hands.forEach((h, seat) => {
    if (h === null) return;
    const [a, b] = cards(h) as [Card, Card];
    placements.push({ slot: `Player ${seat + 1}, card 1`, card: name(a) }, { slot: `Player ${seat + 1}, card 2`, card: name(b) });
    full.push([a, b]);
    seatOf.push(seat);
  });
  const boardCards = board === '' ? [] : cards(board);
  boardCards.forEach((c, i) => placements.push({ slot: `Board, card ${i + 1}`, card: name(c) }));
  const deadCards = dead === '' ? [] : cards(dead);
  deadCards.forEach((c) => placements.push({ slot: 'Next dead card', card: name(c) }));
  const seats = Math.max(3, hands.length);
  const want: SeatWant[] = Array.from({ length: seats }, () => ({ word: null, control: false, names: [], rows: [] }));
  if (full.length < 2) {
    return { title, seats, placements, meta: 'Texas hold’em · deal two hands', want };
  }
  const input = { hands: full, board: boardCards, dead: deadCards };
  if (oddsProblem(input) !== null) throw new Error(`${title}: ${oddsProblem(input)}`);
  const r = odds(input);
  const stands = standings(r.seats);
  const outs = outsToCome(input);
  seatOf.forEach((seat, i) => {
    const tone = oddsTone(stands[i]!, { name: 'dark', amber: '' }, boardCards.length === 5);
    const groups = stands[i]!.kind !== 'ahead' && outs !== null ? groupOuts(outs[i]!.wins) : [];
    want[seat] = {
      word: tone.word,
      control: groups.length > 0,
      names: groups.map((g) => g.kind),
      rows: groups.map((g) => ({
        category: g.category,
        kind: g.kind,
        count: g.cards.length,
        cards: g.cards.map(name),
      })),
    };
  });
  return {
    title,
    seats,
    placements,
    meta: `${grouped(r.boards)} ${r.boards === 1 ? 'board' : 'boards'} dealt · exact`,
    want,
  };
}

/** A seeded search for a table with a given shape, so the scenario is the same next time. */
function find(
  title: string,
  players: number,
  wanted: (k: { kinds: string[]; wins: number[]; splits: number[] }) => boolean,
  seed: number,
): Case {
  const next = rng(seed);
  for (let n = 0; n < 20000; n++) {
    const dealt = dealRandom(next, players * 2 + 4);
    const hands: Hand[] = Array.from({ length: players }, (_, p) => [dealt[p * 2]!, dealt[p * 2 + 1]!]);
    const board = dealt.slice(players * 2);
    const input = { hands, board };
    const outs = outsToCome(input)!;
    const kinds = standings(odds(input).seats).map((s) => s.kind as string);
    if (wanted({ kinds, wins: outs.map((o) => o.wins.length), splits: outs.map((o) => o.splits.length) })) {
      return build(
        title,
        hands.map((h) => h.map(cardText).join('')),
        board.map(cardText).join(' '),
      );
    }
  }
  throw new Error(`no table found for: ${title}`);
}

const cases: Case[] = [
  /* The canvas's own example: Player 1 chasing with four kinds, Player 2 ahead with nothing to show. */
  build('turn, heads-up: A♥K♥ against 2♣2♦ (the canvas example)', ['AhKh', '2c2d'], 'Qh Jh 3s 7c'),
  /* The same table with Player 2 in the first seat: the control follows the hand, not the seat. */
  build('the same table with the seats swapped', ['2c2d', 'AhKh'], 'Qh Jh 3s 7c'),
  /* A dead card takes an out away. */
  build('dead cards take outs away', ['AhKh', '2c2d'], 'Qh Jh 3s 7c', 'Th 9h'),
  /* A seat of three with an empty one between. */
  build('turn, an empty seat between two hands', ['AhKh', null, '2c2d'], 'Qh Jh 3s 7c'),
  find('turn, level hands: both are too close and both are chasing', 2, (k) => k.kinds.every((x) => x === 'close') && k.wins.every((w) => w >= 3), 101),
  find('turn, three-way: one ahead, two behind, both chasing', 3, (k) => k.kinds.filter((x) => x === 'ahead').length === 1 && k.kinds.filter((x) => x === 'behind').length === 2 && k.wins.every((w, i) => k.kinds[i] === 'ahead' || w >= 2), 202),
  find('turn, behind and drawing dead: no cards win it, so no control', 2, (k) => k.kinds.includes('behind') && k.wins[k.kinds.indexOf('behind')] === 0 && k.splits[k.kinds.indexOf('behind')] === 0, 303),
  find('turn, behind with only splits: no card wins it, so no control', 2, (k) => k.kinds.includes('behind') && k.wins[k.kinds.indexOf('behind')] === 0 && k.splits[k.kinds.indexOf('behind')] > 0, 404),
  /* Where there is nothing to show. */
  build('the flop: two cards to come, no control', ['AhKh', '2c2d'], 'Qh Jh 3s'),
  build('before the flop: no control', ['AhKh', '2c2d'], ''),
  build('the river: the board is complete, no control, Winner and Beaten', ['AhKh', '2c2d'], 'Qh Jh 3s 7c Kc'),
  build('one hand alone on the turn: no result, no control', ['AhKh', null], 'Qh Jh 3s 7c'),
];

console.log(JSON.stringify(cases));
