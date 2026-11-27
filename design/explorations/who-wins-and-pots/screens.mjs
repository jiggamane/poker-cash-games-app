/**
 * Who wins and Side pots, drawn in the approved look (`../full-board/kit.mjs`),
 * in the full board's screen-entry format (`id`, `route`, `nav`, `note`,
 * `flags`) so they can move onto the full board unchanged once approved.
 *
 * Every phone is a TABLE — seats, board, what is selected — handed to
 * `draw.mjs`, which reads it with the real engine (`engine.ts` over
 * `packages/core`). No figure or hand name below is typed in: each one is what
 * the engine says about those cards and those stacks.
 *
 * Two new tools, so every string on these phones is new and flagged, except
 * the ones the calculator already has: *Board*, *Players*, *Add a player*,
 * *Done*, *Me*, *Opponent*, *Winner*, *Beaten*, and the hand names, which are
 * `hand.ts`'s (`nameHand`, the owner's wording of 26 October).
 */
import { push, bar, ico, tile, topButton } from '../full-board/kit.mjs';
import { SPOTS, card as artCard, stack, chip, shadow, spot, suit as artSuit, GROUND } from '../icon-system/art.mjs';
import { E } from './load.mjs';
import { init, whoWins, sidePots } from './draw.mjs';

init(E, ico);

/* ── the two tiles' drawings, as the owner picked them on 27 November ── */

SPOTS.whoWins = {
  name: 'Who wins',
  where: 'Poker tools · tile',
  status: 'draft',
  /*
   * Version 5 of the board's variations, the owner's pick: five cards face up
   * lying on the table on a shallow line from the front left to the back
   * right, each card drawn flat and foreshortened into the ground plane (the
   * icon system's `K`, eased to 0.5 so a card still reads as one), its edge a
   * step below it and a soft shadow on the felt; every face framed in red as
   * the Rulings cards are (`framedCard` in `art.mjs`), the suit kept at the
   * centre. The other variations are in git history.
   */
  draw: (P) => flatBoard(P),
};

/** The flat board: five framed cards foreshortened onto the felt, drawn back to front so each lies on the one behind it. */
function flatBoard(P, { W = 23, H = 32, FLAT = 0.5, at = (k) => [19 + k * 14.5, GROUND - 14 - k * 3.5], turn = () => -8,
  five = [['heart', 'red'], ['spade', 'ink'], ['diamond', 'red'], ['club', 'ink'], ['heart', 'red']] } = {}) {
  const lie = (x, y, r, inner) => `<g transform="translate(${x} ${y}) scale(1 ${FLAT}) rotate(${r})">${inner}</g>`;
  const plate = (fill) => `<rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="3.6" fill="${fill}"/>`;
  return five.map((_, k) => 4 - k).map((k) => {
    const [x, y] = at(k), r = turn(k);
    return lie(x + 1.5, y + 2.5, r, plate(P.shadow)) +
      lie(x, y + 1.6, r, plate(P.stockEdge)) +
      lie(x, y, r, artCard(P, { cx: 0, by: H / 2, w: W, h: H, suitName: five[k][0], color: five[k][1], small: true, centre: framedFace(P, W, H, five[k]) }));
  }).join('');
}

/** The Rulings card's face: a red frame set in from the edge, card stock inside it, the suit at the centre. */
const framedFace = (P, W, H, [suitName, color]) => (x, y) => {
  const k = W / 42;
  return `<rect x="${x - W / 2 + 5 * k}" y="${y - H / 2 + 5 * k}" width="${W - 10 * k}" height="${H - 10 * k}" rx="${2.5 * k}" fill="${P.red.side}"/>` +
    `<rect x="${x - W / 2 + 8 * k}" y="${y - H / 2 + 8 * k}" width="${W - 16 * k}" height="${H - 16 * k}" rx="${2 * k}" fill="${P.stock}"/>` +
    artSuit(suitName, x - W * 0.2, y - W * 0.2, W * 0.4, color === 'red' ? P.red.side : P.ink.top);
};

/** A pot: a few short stacks and a loose chip lying flat, drawn back to front. */
const bunch = (P, piles) => [...piles].sort((a, b) => a.by - b.by).map((q) =>
  q.flat ? chip(P, { cx: q.cx, by: q.by, r: q.r, h: 3, mat: q.mats[0], small: true })
    : stack(P, { cx: q.cx, by: q.by, r: q.r, h: q.h ?? 5, mats: q.mats, wobble: q.wobble ?? q.mats.map((_, i) => (i % 2 ? 1 : 0)), small: true })).join('');

SPOTS.sidePots = {
  name: 'Side pots',
  where: 'Poker tools · tile',
  status: 'draft',
  /*
   * S2, the owner's pick: two pots side by side, the side pot on the left, the
   * main pot on the right and bigger (more stacks, taller ones; the chips the
   * same size, as the two sit at the same distance), the side pot (two short stacks' worth, its three-chip stack taken off on
   * 27 November) six points further back so the pair is turned a little off square. Each pot on its own
   * shadow. The other angles and the earlier drawings are in git history.
   */
  draw: (P) => {
    const [sx, sy] = [20, GROUND - 7];
    const [mx, my] = [64, GROUND - 1];
    return shadow(P, sx, 16, 5, sy + 1) + shadow(P, mx, 26, 7.5, my + 1) + bunch(P, [
      { cx: sx - 6, by: sy - 4, r: 9.5, mats: ['red', 'ink'] },
      { cx: sx, by: sy + 3, r: 9.5, mats: ['red'], flat: true },
      { cx: mx - 11, by: my - 7, r: 9.5, mats: ['ink', 'red', 'ink', 'red'] }, { cx: mx + 5, by: my - 8, r: 9.5, mats: ['red', 'ink', 'red', 'ink', 'red'] },
      { cx: mx + 16, by: my - 1, r: 9.5, mats: ['ink', 'red', 'ink'] }, { cx: mx - 4, by: my + 1, r: 9.5, mats: ['red', 'ink', 'red'] },
    ]);
  },
};

/*
 * S2 iterated (owner, 27 November: "iterate on the stack sizes/heights,
 * orientation; the rest on this screen is approved"). Always two pots side by
 * side, the side pot on the left and the main pot on the right and bigger.
 * A pot is a list of piles, each [dx, dy, chips] from the pot's centre, or
 * [dx, dy, 1, 'flat'] for a loose chip; `r` is the chip size for both pots.
 */
const MATS = ['red', 'ink'];
const pot = (P, cx, cy, piles, r, start = 0) => piles.map(([dx, dy, n, flat], i) => ({
  cx: cx + dx, by: cy + dy, r, flat: flat === 'flat',
  mats: Array.from({ length: n }, (_, k) => MATS[(k + i + start) % 2]),
}));
const twoPots = (P, { r = 9.5, side, main, s = [20, GROUND - 7], m = [64, GROUND - 1], sw = 16, mw = 26 }) =>
  shadow(P, s[0], sw, 5, s[1] + 1) + shadow(P, m[0], mw, 7.5, m[1] + 1) +
  bunch(P, [...pot(P, s[0], s[1], side, r), ...pot(P, m[0], m[1], main, r, 1)]);
const PV = { name: 'Side pots', where: 'Poker tools · tile', status: 'draft' };
/* P1 · Towers: fewer, taller stacks. A tall and a short one on the left; on the right a tall one, one three chips lower (owner, 27 November), and a short one. */
SPOTS.sidePotsP1 = { ...PV, draw: (P) => twoPots(P, { side: [[-5, -3, 4], [6, 1, 2]], main: [[-9, -6, 4], [7, -6, 6], [0, 2, 3]] }) };
/* P2 · Low and wide: shorter stacks, bigger chips, spread out across the felt; the main pot's front stack taken off (owner, 27 November). */
SPOTS.sidePotsP2 = { ...PV, draw: (P) => twoPots(P, { r: 11, s: [19, GROUND - 6], m: [64, GROUND - 1], sw: 18, mw: 28,
  side: [[-6, -3, 2], [7, -2, 2], [0, 4, 1, 'flat']], main: [[-13, -5, 3], [3, -7, 4], [16, -2, 2]] }) };
/* P3 · One stack each: the side pot a short stack, the main pot taller (five chips, three taken off on 27 November). */
SPOTS.sidePotsP3 = { ...PV, draw: (P) => twoPots(P, { r: 12, s: [30, GROUND - 6], m: [62, GROUND - 1], sw: 15, mw: 17,
  side: [[0, 0, 3]], main: [[0, 0, 5]] }) };
/* P4 · Turned more: the S2 stacks, the side pot well back and the main pot forward, a steeper angle between them. */
SPOTS.sidePotsP4 = { ...PV, draw: (P) => twoPots(P, { s: [22, GROUND - 14], m: [62, GROUND + 1],
  side: [[-6, -4, 2], [6, -3, 3], [0, 3, 1, 'flat']], main: [[-11, -7, 4], [5, -8, 5], [16, -1, 3], [-4, 1, 3]] }) };
/* P5 · Level and graded: the two pots on one line, the stacks stepping up in height from left to right across both. */
SPOTS.sidePotsP5 = { ...PV, draw: (P) => twoPots(P, { s: [20, GROUND - 3], m: [63, GROUND - 3],
  side: [[-6, -2, 1], [6, 0, 2]], main: [[-12, -2, 3], [1, -4, 4], [14, -1, 5], [-4, 4, 2]] }) };

const cornerArt = (key, size, right, bottom) =>
  `<span class="art" style="position:absolute;right:${right}px;bottom:${bottom}px">${['freshDeck', 'freshDeckOnInk'].map((p, i) => `<span class="${i ? 'art-d' : 'art-l'}">${spot(key, p, { size, small: false })}</span>`).join('')}</span>`;
export const whoWinsTile = `<div class="tile">${cornerArt('whoWins', 90, 4, -10)}<div><div class="tn">Who wins</div><div class="tx">the best hand now, no odds</div></div></div>`;
const potsTile = (key) => `<div class="tile">${cornerArt(key, 84, 4, -2)}<div><div class="tn">Side pots</div><div class="tx">a multi-way all in, pot by pot</div></div></div>`;
export const sidePotsTile = potsTile('sidePots');
const toolsWith = (pots) => `<div class="tiles">${tile('Rulings', 'look up a ruling', 'rulings', 'tools')}${tile('Calculator', 'hand and pot odds', 'calculator', 'tools')}${tile('Boosters', 'bomb pots and more', 'boosters', 'tools')}${whoWinsTile}${pots}</div>`;
/* The Side pots tile, iterated: each take on the approved Poker tools screen, at its real size. */
const POTS_OPTIONS = [
  ['sidePots', 'S2', 'As picked', 'S2 as it stands, for comparison.'],
  ['sidePotsP1', 'P1', 'Towers', 'Fewer, taller stacks: a tall and a short one on the left, two tall ones and a short one on the right.'],
  ['sidePotsP2', 'P2', 'Low and wide', 'Shorter stacks of bigger chips, spread out across the felt.'],
  ['sidePotsP3', 'P3', 'One stack each', 'A short stack for the side pot, a tall one for the main pot: the plainest reading of two pots, one bigger.'],
  ['sidePotsP4', 'P4', 'Turned more', 'The S2 stacks with a steeper angle: the side pot well back, the main pot forward.'],
  ['sidePotsP5', 'P5', 'Level and graded', 'Both pots on one line, the stacks stepping up in height from left to right across the two.'],
].map(([key, code, title, note]) => ({ id: `tile-pots-${code.toLowerCase()}`, route: '/tools', name: `Side pots tile ${code} · ${title}`, nav: 'push', option: 'tile', note,
  html: push({ title: 'Poker tools', sub: 'nothing here touches the ledger', body: toolsWith(potsTile(key)) }) }));

/* ── tables ───────────────────────────────────────────────────────────── */

const seats = (...hands) => hands.map(([cards, stack = 0]) => ({ cards: cards ? cards.split(' ') : [null, null], stack }));
const board = (text = '') => { const b = text ? text.split(' ') : []; return [...b, ...Array(5 - b.length).fill(null)]; };

/** A phone from a table: the screen's own top, its sheet from `draw.mjs`, Done on the bar while the keypad is up. */
const TOPS = {
  who: { title: 'Who wins', sub: '<span style="white-space:nowrap;font-size:12px">the best hand so far, no odds</span>', subRight: topButton('restart') },
  pots: { title: 'Side pots', sub: '<span style="white-space:nowrap;font-size:12px">everyone all in, pot by pot</span>', subRight: topButton('restart') },
};
export const phone = (tool, t) => {
  const s = (tool === 'who' ? whoWins : sidePots)(t);
  return push({ ...TOPS[tool], extra: s.hero, body: s.body, bar: s.bar === 'done' ? bar('Done') : '' });
};

/* The calculator's own hand, A♥ K♥ against 2♣ 2♦, so the two tools can be held against it. */
const HU = () => seats(['Ah Kh'], ['2c 2d']);
/* Three all in for three different stacks: the short stack has the best hand, the middle one beats the deep one. */
const ALLIN = () => seats(['Qh Jh', 1200], ['As Ac', 300], ['Kd Ks', 800]);

const WHO_COPY = 'New strings: the title, “the best hand so far, no odds”, “Two cards”, Ahead, Behind, Tied, Split, and the line on the ink (“Ahead on the flop”, “Winner on the river”, “Split on the river”, “Tied before the flop”). The ink names the winning hand by its two cards, not by the seat. The rest is the calculator’s.';
const POTS_COPY = 'New strings: the title, “everyone all in, pot by pot”, “All in”, Stack, Result, “As it stands”, “in the pots”, 1st 2nd 3rd…, “No pot”, “Behind in every pot”, “back, uncalled”, “, split”, Pots, Main pot, Side pot 1, “Between”, “ahead”, “wins it”, Split, “each”, Uncalled, “back to”. Each result names a hand by its two cards, never Opponent 1, 2…; a seat’s name stands in only until its cards are in.';

export const section = {
  title: 'Who wins, and Side pots',
  blurb: 'Two new poker tools beside the calculator. Who wins reads the cards on the table and says whose hand is best right now, what it is and the five cards that make it: no percentages. Side pots takes the same cards plus each player’s stack and splits a multi-way all in into its pots, says who takes each one, and what everybody ends the hand with.',
};

export default [
  ...POTS_OPTIONS,
  { id: 'tools-five', route: '/tools', name: 'Poker tools, in the new order', nav: 'push',
    note: 'The owner’s order of 27 November: Rulings, Calculator, Boosters, Who wins, Side pots. Rulings moves ahead of Calculator, which changes the shared ToolTiles and so Tonight’s Poker tools sheet too when built.',
    flags: ['Both drawings are the owner’s picks (Who wins version 5, Side pots S2), still drafts until a pass on the icon board.',
      'Tile names and lines are new: “Who wins” · “the best hand now, no odds”, “Side pots” · “a multi-way all in, pot by pot”.'],
    html: push({ title: 'Poker tools', sub: 'nothing here touches the ledger',
      body: `<div class="tiles">${tile('Rulings', 'look up a ruling', 'rulings', 'tools')}${tile('Calculator', 'hand and pot odds', 'calculator', 'tools')}${tile('Boosters', 'bomb pots and more', 'boosters', 'tools')}${whoWinsTile}${sidePotsTile}</div>` }) },

  /* ── Who wins ── */
  { id: 'who-empty', route: '/who-wins', name: 'Who wins · empty, the deck up', nav: 'push',
    note: 'Opens like the calculator: the board, two seats, and the deck as a keyboard at the foot with the first place to fill outlined. A seat counts once both its cards are in.',
    flags: [WHO_COPY, 'Push, not a sheet: like the calculator it is a place you stay in while the hand plays out, and nothing on it is confirmed.'],
    html: phone('who', { seats: seats([], []), board: board(), sel: { kind: 'hole', i: 0, j: 0 } }) },

  { id: 'who-preflop', route: '/who-wins', name: 'Who wins · before the flop', nav: 'push',
    note: 'With two hands in, the answer is on the ink: whose hand is best, and what it is. Before the flop that is the two cards alone, so a pair of deuces is ahead of ace-king.',
    flags: ['Before the flop the engine ranks two cards (a pair, or high card). evaluate() is for five to seven cards, so this needs a small addition to packages/core with its tests: the one piece of new ranking here.',
      'Is “ahead” the right word before the flop, where ace-king against deuces is close to a coin flip? The calculator says that with odds; this tool deliberately does not.'],
    html: phone('who', { seats: HU(), board: board(), sel: null }) },

  { id: 'who-flop-three', route: '/who-wins', name: 'Who wins · three players, on the flop', nav: 'push',
    note: 'From the flop every seat shows its best five so far under its cards: the cards that make the hand full, the kickers faded. Words beside the names: Ahead, Behind, Tied.',
    flags: ['Ahead in the win tone, Behind in the grey loss tone, as the calculator’s Favourite and Underdog are drawn on the full board.'],
    html: phone('who', { seats: seats(['Ah Kh'], ['2c 2d'], ['Ts 9s']), board: board('Qh Jh 3s'), sel: null }) },

  { id: 'who-river', route: '/who-wins', name: 'Who wins · on the river', nav: 'push',
    note: 'The board is complete, so the words are the calculator’s river words, Winner and Beaten, and the line on the ink says Winner. The same hand as the calculator’s river phone, named the same.',
    html: phone('who', { seats: HU(), board: board('Qh Jh 3s 7c Kc'), sel: null }) },

  { id: 'who-kicker', route: '/who-wins', name: 'Who wins · decided by the kicker', nav: 'push',
    note: 'The same pair on both sides: the kicker that decided it is named on both seats and on the ink, as the calculator names it (hand.ts, decidingKicker).',
    html: phone('who', { seats: seats(['Ah Kc'], ['Ad Qd']), board: board('As 9d 7c 4h 2s'), sel: null }) },

  { id: 'who-split', route: '/who-wins', name: 'Who wins · a split pot', nav: 'push',
    note: 'Both play two pair from the board with an ace: Split on each seat, and both hands on the ink.',
    html: phone('who', { seats: seats(['Ac 3d'], ['Ah 4c']), board: board('Ks Kd 9c 9h 5s'), sel: null }) },

  /* ── Who wins: six ways to use the header (owner, 27 November) ── */
  { id: 'hero-cards-1', route: '/who-wins', name: 'Header A · As drawn · kicker on the river', nav: 'push', allowOverflow: true, option: 'hero',
    note: 'The winning hole cards and the hand, under the street. Compact; the hand is the answer.',
    html: phone('who', { seats: seats(['Ah Kc'], ['Ad Qd']), board: board('As 9d 7c 4h 2s'), sel: null, hero: 'cards' }) },
  { id: 'hero-cards-2', route: '/who-wins', name: 'Header A · As drawn · three players on the turn', nav: 'push', allowOverflow: true, option: 'hero',
    html: phone('who', { seats: seats(['Ah Kh'], ['2c 2d'], ['Ts 9s']), board: board('Qh Jh 3s 7c'), sel: null, hero: 'cards' }) },

  { id: 'hero-board-1', route: '/who-wins', name: 'Header B · The board on the ink · kicker on the river', nav: 'push', allowOverflow: true, option: 'hero',
    note: 'The five community cards move up into the header and the verdict sits under them, so the sheet is only the players. The board is the thing everyone at the table is looking at.',
    html: phone('who', { seats: seats(['Ah Kc'], ['Ad Qd']), board: board('As 9d 7c 4h 2s'), sel: null, hero: 'board' }) },
  { id: 'hero-board-2', route: '/who-wins', name: 'Header B · The board on the ink · three players on the turn', nav: 'push', allowOverflow: true, option: 'hero',
    html: phone('who', { seats: seats(['Ah Kh'], ['2c 2d'], ['Ts 9s']), board: board('Qh Jh 3s 7c'), sel: null, hero: 'board' }) },

  { id: 'hero-sentence-1', route: '/who-wins', name: 'Header C · The sentence · kicker on the river', nav: 'push', allowOverflow: true, option: 'hero',
    note: 'What beat what, in words, the way the run-out\u2019s foot says it. No cards in the header at all.',
    html: phone('who', { seats: seats(['Ah Kc'], ['Ad Qd']), board: board('As 9d 7c 4h 2s'), sel: null, hero: 'sentence' }) },
  { id: 'hero-sentence-2', route: '/who-wins', name: 'Header C · The sentence · three players on the turn', nav: 'push', allowOverflow: true, option: 'hero',
    html: phone('who', { seats: seats(['Ah Kh'], ['2c 2d'], ['Ts 9s']), board: board('Qh Jh 3s 7c'), sel: null, hero: 'sentence' }) },

  { id: 'hero-ranking-1', route: '/who-wins', name: 'Header D · The standings · kicker on the river', nav: 'push', allowOverflow: true, option: 'hero',
    note: 'Every hand in order on the ink, 1st first, the same reading as Side pots\u2019 result. Up to three; a fourth and more stay on the sheet.',
    html: phone('who', { seats: seats(['Ah Kc'], ['Ad Qd']), board: board('As 9d 7c 4h 2s'), sel: null, hero: 'ranking' }) },
  { id: 'hero-ranking-2', route: '/who-wins', name: 'Header D · The standings · three players on the turn', nav: 'push', allowOverflow: true, option: 'hero',
    html: phone('who', { seats: seats(['Ah Kh'], ['2c 2d'], ['Ts 9s']), board: board('Qh Jh 3s 7c'), sel: null, hero: 'ranking' }) },

  { id: 'hero-five-1', route: '/who-wins', name: 'Header E · The winning five · kicker on the river', nav: 'push', allowOverflow: true, option: 'hero',
    note: 'The five cards that make the best hand, large, kickers faded; a bar under each card that came from the hand. Answers \u201cwhat\u2019s their 5-card hand\u201d first.',
    html: phone('who', { seats: seats(['Ah Kc'], ['Ad Qd']), board: board('As 9d 7c 4h 2s'), sel: null, hero: 'five' }) },
  { id: 'hero-five-2', route: '/who-wins', name: 'Header E · The winning five · three players on the turn', nav: 'push', allowOverflow: true, option: 'hero',
    html: phone('who', { seats: seats(['Ah Kh'], ['2c 2d'], ['Ts 9s']), board: board('Qh Jh 3s 7c'), sel: null, hero: 'five' }) },

  { id: 'hero-streets-1', route: '/who-wins', name: 'Header F · Street by street · kicker on the river', nav: 'push', allowOverflow: true, option: 'hero',
    note: 'Who was ahead before the flop, on the flop, the turn and the river, with the street now lit. The story of the hand, which no other screen tells.',
    html: phone('who', { seats: seats(['Ah Kc'], ['Ad Qd']), board: board('As 9d 7c 4h 2s'), sel: null, hero: 'streets' }) },
  { id: 'hero-streets-2', route: '/who-wins', name: 'Header F · Street by street · three players on the turn', nav: 'push', allowOverflow: true, option: 'hero',
    html: phone('who', { seats: seats(['Ah Kh'], ['2c 2d'], ['Ts 9s']), board: board('Qh Jh 3s 7c'), sel: null, hero: 'streets' }) },

  /* ── Side pots ── */
  { id: 'pots-stack', route: '/side-pots', name: 'Side pots · typing a stack', nav: 'push',
    note: 'Each seat has its stack at the right. Tapping it brings up the keypad in the deck’s place and Done on the bar, as the calculator’s pot field does. Cards go in the same way as on Who wins.',
    flags: [POTS_COPY, 'A stack here is everything the player has in the hand, blinds included: the most they can lose. Is that how a table thinks of it, or should it be “All in for”?'],
    html: phone('pots', { seats: seats([null, 1200], [null, 300], [null, 800]), board: board(), sel: { kind: 'stack', i: 2 } }) },

  { id: 'pots-preflop', route: '/side-pots', name: 'Side pots · all in before the flop', nav: 'push', allowOverflow: true,
    note: 'Hands first (owner, 26 November): under the seats, every hand in order of strength with its place, combo, the pots it takes, the amount and its change. Before the river it is “As it stands”: what each would take if the cards stopped here. The pot-by-pot card follows below the fold, as detail.',
    flags: ['The pots are packages/core’s sidePots(), the rulings calculator’s, unchanged. The top layer only one stack reached is shown as Uncalled rather than as a pot.'],
    html: phone('pots', { seats: ALLIN(), board: board(), sel: null }) },

  { id: 'pots-flop', route: '/side-pots', name: 'Side pots · on the flop', nav: 'push', allowOverflow: true,
    note: 'A king on the flop: the kings are now ahead in both pots.',
    html: phone('pots', { seats: ALLIN(), board: board('Kc 7d 2s'), sel: null }) },

  { id: 'pots-river', route: '/side-pots', name: 'Side pots · on the river', nav: 'push', allowOverflow: true,
    note: 'Result: 1st, the aces, take the main pot ($900, +$600); 2nd, the kings, the side pot ($1,000, +$200); 3rd, queen-jack, nothing but its uncalled $400 back (−$800). The seats above keep only the cards and stacks that went in.',
    flags: ['The big figure is what the hand takes from the pots; the signed one under it is its change on the hand, uncalled chips included. Is the change needed, or is the amount enough?',
      'Places are by hand strength. A short stack can be 1st and still take less than 2nd (here $900 against $1,000), because it could only win the main pot.'],
    html: phone('pots', { seats: ALLIN(), board: board('Kc 7d 2s Ah 9c'), sel: null }) },

  { id: 'pots-split', route: '/side-pots', name: 'Side pots · four players, split pots', nav: 'push', allowOverflow: true,
    note: 'Four stacks, two straights: the two jack-tens split both pots, $400 each from the main and $450 each from the side; the set of aces and the nines lose, and the nines’ top $500 comes back. Both straights are 1st; a shared place moves the next hand to 2nd.',
    flags: ['An odd chip in a split goes to the first player in seat order (packages/core allocate()). Tables usually give it to the first player left of the button, which this tool does not know. Ask for the button, or say which rule it uses?'],
    html: phone('pots', { seats: seats(['Jh Th', 500], ['Ac Ad', 200], ['Jc Td', 500], ['9s 9d', 1000]), board: board('As Ks Qd 7c 2h'), sel: null }) },
];

