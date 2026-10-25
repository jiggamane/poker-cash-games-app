/**
 * The pot odds scenarios `ui-odds.mjs` plays through the real screen, and what
 * the screen has to say for each.
 *
 * Same arrangement as `odds-ui-cases.ts`: the answers come from the engine and
 * from `potOdds()` in core, `ui-odds.mjs` runs this through `vite-node` and
 * reads the JSON, and nothing in the browser script knows poker or arithmetic.
 * What it holds is the screen between a tap on a keypad and a figure: that the
 * digits typed are the amount used, that the amount goes to the right field,
 * that the card is where the table says it should be, and that what it prints is
 * what the function says.
 *
 * Pot odds is permanent (decided 24 October, made so on 25 October: no setting),
 * and applies on the flop and the turn only — with a result on screen and Player
 * 1 in the hand. So each scenario says whether the card should be there at all:
 * not before the flop, not on the river, not with Player 1 out, not with no
 * result.
 */

import { cardText, parseCards, type Card } from '../packages/core/src/odds/cards';
import { odds, type Hand } from '../packages/core/src/odds/odds';
import { formatHundredths, potOdds } from '../packages/core/src/odds/potOdds';
import { formatMoney, formatSigned, money } from '../packages/core/src/money';

const GLYPH: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };
const name = (c: Card): string => cardText(c)[0]! + GLYPH[cardText(c)[1]!]!;
const cards = (s: string) => parseCards(s)!;
const hand = (s: string): Hand => cards(s) as unknown as Hand;
const grouped = (x: number): string => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

type Placement = { slot: string; card: string };
type Scenario = {
  title: string;
  /** Seats on show; the screen opens with three. */
  seats: number;
  placements: Placement[];
  /** What the line under the title reads once settled. */
  meta: string;
  /** The digits typed into each field, in order; null leaves it untouched. */
  pot: string | null;
  call: string | null;
  /** Whether the card is on the screen. */
  visible: boolean;
  /** When it is: the three figures and the two lines, exactly as printed. */
  needs?: string;
  has?: string;
  returns?: string;
  formula?: string;
  /** The amounts as the fields read, so the typed digits are held to the field. */
  potShown?: string;
  callShown?: string;
};

type Table = { hands: (string | null)[]; board: string; seatCount?: number };

function scenario(title: string, t: Table, pot: string | null, call: string | null): Scenario {
  const placements: Placement[] = [];
  const full: Hand[] = [];
  let youIndex = -1;
  t.hands.forEach((h, seat) => {
    if (h === null) return;
    const [a, b] = cards(h) as [Card, Card];
    placements.push({ slot: `Player ${seat + 1}, card 1`, card: name(a) }, { slot: `Player ${seat + 1}, card 2`, card: name(b) });
    if (seat === 0) youIndex = full.length;
    full.push([a, b]);
  });
  const board = t.board === '' ? [] : cards(t.board);
  board.forEach((c, i) => placements.push({ slot: `Board, card ${i + 1}`, card: name(c) }));
  const seats = Math.max(3, t.hands.length);
  /* Fewer than two hands is no result: the line under the title says so and there is no card. */
  if (full.length < 2) {
    return { title, seats, placements, meta: 'Texas hold’em · deal two hands', pot, call, visible: false };
  }
  const r = odds({ hands: full, board });
  const base = {
    title,
    seats,
    placements,
    meta: `${grouped(r.boards)} ${r.boards === 1 ? 'board' : 'boards'} dealt · exact`,
    pot,
    call,
  };
  /* The card needs the flop or the turn down (not the river: the board is
     complete) and Player 1 (the first seat) in the hand. */
  if (board.length < 3 || board.length > 4 || youIndex < 0) return { ...base, visible: false };
  const potN = pot === null ? 0 : Number(pot);
  const callN = call === null ? 0 : Number(call);
  const p = potOdds(potN, callN, r.seats[youIndex]!, r.boards);
  const out: Scenario = {
    ...base,
    visible: true,
    has: formatHundredths(p.hasHundredths),
    needs: p.problem === null ? formatHundredths(p.needsHundredths) : '—',
    potShown: formatMoney(money(potN)),
    callShown: formatMoney(money(callN)),
  };
  if (p.problem === null) {
    out.returns = `Over many runs this call returns ${formatSigned(p.returns)}`;
    out.formula = `${out.has} × (${formatMoney(money(potN))} + ${formatMoney(money(callN))}) − ${formatMoney(money(callN))}. Side pots are not counted.`;
  }
  return out;
}

const scenarios: Scenario[] = [
  /* The canvas's own example: $25 into $75, turn, the hand ahead by 18 river cards of 44. */
  scenario('turn, heads-up: $25 into $75 (the canvas example)', { hands: ['AhKh', '2c2d'], board: 'Qh Jh 3s 7c' }, '75', '25'),
  scenario('flop, three-way: $50 into $200', { hands: ['9s8s', 'AhAd', 'KcQc'], board: '2s 7s Td' }, '200', '50'),
  scenario('turn, the hand cannot lose: $10 into $40 (a royal flush)', { hands: ['AhKh', '2c2d'], board: 'Qh Jh Th 3s' }, '40', '10'),
  scenario('turn, behind: $100 into $10 is a loss', { hands: ['2c2d', 'AhKh'], board: 'Qh Jh 3s 7c' }, '10', '100'),
  scenario('a near split on the flop: the same hand in other suits', { hands: ['AsKd', 'AdKs'], board: '2c 3d 4h' }, '100', '100'),
  scenario('no call typed yet: Needs is a dash and there is no money line', { hands: ['AhKh', '2c2d'], board: 'Qh Jh 3s 7c' }, '50', null),
  scenario('the biggest amounts the keypad types, on the flop', { hands: ['AhKh', '2c2d'], board: 'Qh Jh 3s' }, '999999999', '999999999'),
  /* Where it must not be. */
  scenario('before the flop: nothing', { hands: ['AhKh', '2c2d'], board: '' }, null, null),
  scenario('two cards of board: nothing', { hands: ['AhKh', '2c2d'], board: 'Qh Jh' }, null, null),
  scenario('the river: nothing, the board is complete', { hands: ['AhKh', '2c2d'], board: 'Qh Jh 3s 7c Kc' }, null, null),
  scenario('one hand alone on the flop: no result, nothing', { hands: ['AhKh', null], board: 'Qh Jh 3s' }, null, null),
  scenario('Player 1 is not in the hand: nothing', { hands: [null, 'AhKh', '2c2d'], board: 'Qh Jh 3s' }, null, null),
];

console.log(JSON.stringify(scenarios));
