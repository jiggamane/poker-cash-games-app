/**
 * The run-out scenarios `ui-odds.mjs` plays through the real screens, and what
 * `/run-out` has to print for each — board 19 of `design/handoff-odds-calculator/`.
 *
 * Same arrangement as the other three case files: the answers come from core
 * (`runOut`, `showdown`, `standings`) and the app's own words (`src/lib/runOut`,
 * `oddsTone`), `ui-odds.mjs` runs this through `vite-node` and reads the JSON,
 * and nothing in the browser script knows poker. What it holds is the screen
 * between the calculator and the picture: that *Run it out* is on the odds
 * screen exactly when the board has a flop, that the table the reader dealt is
 * the table the picture draws, that every street's headline and every small
 * figure under it is the engine's for THAT street — the later board cards back
 * in the deck, not dead — that the colour the headline takes is the standing
 * rule's, and that the foot says what the river said.
 */

import { cardText, parseCards, type Card } from '../packages/core/src/odds/cards';
import { oddsProblem, type Hand } from '../packages/core/src/odds/odds';
import { STREETS, runOut, type Street } from '../packages/core/src/odds/runout';
import { showdown } from '../packages/core/src/odds/showdown';
import { standings } from '../packages/core/src/odds/standing';
import { oddsTone } from '../apps/mobile/src/lib/oddsTone';
import { STREET_LABEL, otherFigure, runOutFigure, stillToCome, verdictOf } from '../apps/mobile/src/lib/runOut';

const GLYPH: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };
const name = (c: Card): string => cardText(c)[0]! + GLYPH[cardText(c)[1]!]!;
const cards = (s: string) => parseCards(s)!;

type Placement = { slot: string; card: string };
type StreetWant = {
  /** `49.8%`, or `—` for a street the board has not reached. */
  figure: string;
  /** `P2 49.6`, one per other hand; empty where not reached. */
  others: string[];
  /** The column's spoken label, which carries the word the picture leaves off. */
  label: string;
};
type Case = {
  title: string;
  seats: number;
  placements: Placement[];
  /** Whether *Run it out* is on the odds screen for this table. */
  button: boolean;
  streets: Record<Street, StreetWant>;
  /** The box at the foot: the verdict on the river, else what is still to come. Null until a street is counted. */
  foot: { title: string; detail: string | null } | null;
};

function build(title: string, hands: string[], board: string, dead = ''): Case {
  const placements: Placement[] = [];
  const full: Hand[] = [];
  hands.forEach((h, seat) => {
    const [a, b] = cards(h) as [Card, Card];
    placements.push({ slot: `Player ${seat + 1}, card 1`, card: name(a) }, { slot: `Player ${seat + 1}, card 2`, card: name(b) });
    full.push([a, b]);
  });
  const boardCards = board === '' ? [] : cards(board);
  boardCards.forEach((c, i) => placements.push({ slot: `Board, card ${i + 1}`, card: name(c) }));
  const deadCards = dead === '' ? [] : cards(dead);
  deadCards.forEach((c) => placements.push({ slot: 'Next dead card', card: name(c) }));
  const seats = Math.max(3, hands.length);
  const input = { hands: full, board: boardCards, dead: deadCards };
  if (oddsProblem(input) !== null) throw new Error(`${title}: ${oddsProblem(input)}`);
  const button = boardCards.length >= 3;
  const r = runOut(input);
  const streets = {} as Record<Street, StreetWant>;
  let last: Street = 'preflop';
  for (const s of STREETS) {
    const o = r.get(s);
    if (o === undefined) {
      streets[s] = { figure: '—', others: [], label: `${STREET_LABEL[s]}: not reached` };
      continue;
    }
    last = s;
    const tone = oddsTone(standings(o.seats)[0]!, { name: 'dark', amber: '' }, s === 'river');
    streets[s] = {
      figure: runOutFigure(o.seats[0]!.win),
      others: o.seats.slice(1).map((x, i) => otherFigure(i + 1, x.win)),
      label: `${STREET_LABEL[s]}: ${o.seats
        .map((x, i) => `Player ${i + 1} ${runOutFigure(x.win)}${i === 0 ? `, ${tone.word.toLowerCase()}` : ''}`)
        .join('; ')}`,
    };
  }
  const foot =
    last === 'river'
      ? (() => {
          const v = verdictOf(showdown(input), full.length);
          return { title: v.title, detail: v.detail };
        })()
      : { title: stillToCome(last, r.get(last)!.boards), detail: null };
  return { title, seats, placements, button, streets, foot };
}

const cases: Case[] = [
  /* The canvas's own hand, board 19: A♥K♥ all in against 2♣2♦, run out Q♥ J♥ 3♠ 7♣ K♣. */
  build('the canvas: A♥K♥ against 2♣2♦, run out Q♥ J♥ 3♠ 7♣ K♣', ['AhKh', '2c2d'], 'Qh Jh 3s 7c Kc'),
  /* The same, stopped on the flop: two streets, two columns empty, 990 boards to come. */
  build('the same on the flop only', ['AhKh', '2c2d'], 'Qh Jh 3s'),
  /* On the turn with a dead card: 43 cards could come, and the flop's figure is over the deck less the dead card only. */
  build('on the turn, the T♠ dead', ['AhKh', '2c2d'], 'Qh Jh 3s 7c', 'Ts'),
  /* Three hands to the river, one of them beaten by a straight flush. */
  build('three-way, the straight flush comes', ['AsAh', 'KsKh', '7d6d'], 'Qd Jd Td 9c 8d'),
  /* A split pot on the river: the board plays. */
  build('a split: broadway on the board', ['2c3d', '4h5s'], 'As Kd Qh Jc Ts'),
  /* Four hands on the river, the figures stacking four deep under the headline. */
  build('four-handed to the river', ['AcKc', 'QdQh', 'JsTs', '9h8h'], '2d 7c Qs 3h 3d'),
  /* Before the flop: no button, nothing to run. */
  build('before the flop: no button', ['AhKh', '2c2d'], ''),
];

console.log(JSON.stringify(cases));
