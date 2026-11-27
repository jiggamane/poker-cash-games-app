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
import { SPOTS, card as artCard, stack, chip, shadow, spot, GROUND } from '../icon-system/art.mjs';
import { E } from './load.mjs';
import { init, whoWins, sidePots } from './draw.mjs';

init(E, ico);

/* ── the two tiles' drawings (drafts) ─────────────────────────────────── */

SPOTS.whoWins = {
  name: 'Who wins',
  where: 'Poker tools · tile',
  status: 'draft',
  /*
   * The board: five cards face up, lying on the table (owner, 27 November:
   * "put them on the surface"), in a diagonal from the front left to the back
   * right. Each card is drawn flat and then foreshortened into the ground
   * plane, the way the icon system foreshortens a chip's face (`K` in
   * `art.mjs`, eased to 0.5 so a card still reads as a card), with its edge a
   * step below it and a soft shadow on the felt. The faces are placeholders, a
   * single suit at the centre with no rank, as the small 7-2 drawing draws its
   * cards. Drawn back to front so each card lies on the one behind it.
   */
  draw: (P) => flatBoard(P),
};

/**
 * The flat board, drawn from a few settings so its variations differ only
 * where they mean to. `at(k)` places card k; `turn(k)` turns it in the plane
 * of the table; `extra` is drawn on the felt before the cards.
 */
function flatBoard(P, { W = 23, H = 32, FLAT = 0.5, at = (k) => [19 + k * 14.5, GROUND - 14 - k * 3.5], turn = () => -8, extra = '', five = [['heart', 'red'], ['spade', 'ink'], ['diamond', 'red'], ['club', 'ink'], ['heart', 'red']] } = {}) {
  const lie = (x, y, r, inner) => `<g transform="translate(${x} ${y}) scale(1 ${FLAT}) rotate(${r})">${inner}</g>`;
  const plate = (fill) => `<rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="3.6" fill="${fill}"/>`;
  return extra + five.map((_, k) => 4 - k).map((k) => {
    const [x, y] = at(k), r = turn(k);
    return lie(x + 1.5, y + 2.5, r, plate(P.shadow)) +
      lie(x, y + 1.6, r, plate(P.stockEdge)) +
      lie(x, y, r, artCard(P, { cx: 0, by: H / 2, w: W, h: H, suitName: five[k][0], color: five[k][1], small: true }));
  }).join('');
}

/* Four variations of the flat board (owner, 27 November: "very close; four variations of pretty much the same, with minor deviations"). */
const V = { name: 'Who wins', where: 'Poker tools · tile', status: 'draft' };
/* 1 · Dealt as a dealer lays it: the flop together, a small gap before the turn and another before the river. */
SPOTS.whoWins1 = { ...V, draw: (P) => flatBoard(P, { at: (k) => [17 + k * 12.5 + (k >= 3 ? 3 : 0) + (k >= 4 ? 3 : 0), GROUND - 14 - k * 3.5] }) };
/* 2 · Square to the row: every card turned the same as the line it lies on, so the board reads as one straight strip. */
SPOTS.whoWins2 = { ...V, draw: (P) => flatBoard(P, { turn: () => -2, at: (k) => [18 + k * 15, GROUND - 13 - k * 3.2] }) };
/* 3 · Laid by hand: each card a few degrees off the one before, as cards land when they are slid out one at a time. */
SPOTS.whoWins3 = { ...V, draw: (P) => flatBoard(P, { turn: (k) => [-14, -4, -11, -2, -9][k], at: (k) => [19 + k * 14.5, GROUND - 14 - k * 3.5 + [0, 1, -0.5, 1, 0][k]] }) };
/* 4 · With the pot: the same board a little further back, and one red chip on the felt in front of it. */
SPOTS.whoWins4 = { ...V, draw: (P) => flatBoard(P, { W: 21, H: 29, at: (k) => [27 + k * 12.5, GROUND - 19 - k * 3.2],
  extra: shadow(P, 17, 9, 3, GROUND - 3) + chip(P, { cx: 16, by: GROUND - 4, r: 8, h: 3.5, mat: 'red', small: true }) }) };

SPOTS.sidePots = {
  name: 'Side pots',
  where: 'Poker tools · tile',
  status: 'draft',
  /* Three stacks of different heights: the short stack's pot, and what the deeper ones play for over it. */
  draw: (P, o) =>
    shadow(P, 50, 32) +
    stack(P, { cx: 26, by: GROUND - 2, r: 14, h: 6, mats: ['ink', 'red'], wobble: [0, 1], small: true }) +
    stack(P, { cx: 72, by: GROUND - 2, r: 14, h: 6, mats: ['red', 'ink', 'red', 'ink', 'red', 'ink'], wobble: [0, -1, 1, 0, -1, 1], small: true }) +
    stack(P, { cx: 49, by: GROUND + 2, r: 15, h: 6, mats: ['ink', 'red', 'ink', 'red'], wobble: [0, 1, -1, 0], small: o.small }),
};
/*
 * Side pots, more drawings (owner, 27 November: "more options, e.g. with two
 * bunches of chips, depicting two pots"). A bunch is a few short stacks and a
 * loose chip or two lying flat, drawn back to front; each pile sits on its own
 * shadow so the two pots read as two places on the felt.
 */
const bunch = (P, piles) => [...piles].sort((a, b) => a.by - b.by).map((q) =>
  q.flat ? chip(P, { cx: q.cx, by: q.by, r: q.r, h: 3, mat: q.mats[0], small: true })
    : stack(P, { cx: q.cx, by: q.by, r: q.r, h: q.h ?? 5, mats: q.mats, wobble: q.wobble ?? q.mats.map((_, i) => (i % 2 ? 1 : 0)), small: true })).join('');
SPOTS.sidePotsB = { name: 'Side pots · two bunches', where: 'Poker tools · tile', status: 'draft',
  /* B: two bunches of about the same size, side by side, each three short stacks in a triangle and a loose chip. */
  draw: (P) => shadow(P, 28, 23, 7, GROUND - 2) + shadow(P, 71, 22, 7, GROUND - 2) +
    bunch(P, [
      { cx: 19, by: GROUND - 10, r: 9.5, mats: ['ink', 'red', 'ink'] }, { cx: 36, by: GROUND - 9, r: 9.5, mats: ['red', 'ink', 'red', 'ink'] },
      { cx: 27, by: GROUND + 1, r: 9.5, mats: ['red', 'ink'] }, { cx: 42, by: GROUND + 3, r: 8, mats: ['ink'], flat: true },
      { cx: 63, by: GROUND - 10, r: 9.5, mats: ['red', 'ink', 'red'] }, { cx: 80, by: GROUND - 8, r: 9.5, mats: ['ink', 'red'] },
      { cx: 70, by: GROUND + 1, r: 9.5, mats: ['ink', 'red', 'ink'] },
    ]) };
SPOTS.sidePotsC = { name: 'Side pots · main and side', where: 'Poker tools · tile', status: 'draft',
  /* C: the main pot the bigger bunch, the side pot a small one, a dashed line on the felt between them. */
  draw: (P) => shadow(P, 30, 26, 7.5, GROUND - 1) + shadow(P, 75, 15, 5, GROUND - 1) +
    `<path d="M56 ${GROUND - 20}L52 ${GROUND + 4}" stroke="${P.ink.top}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2.5 3.5" opacity=".45"/>` +
    bunch(P, [
      { cx: 18, by: GROUND - 11, r: 9.5, mats: ['ink', 'red', 'ink', 'red'] }, { cx: 35, by: GROUND - 11, r: 9.5, mats: ['red', 'ink', 'red', 'ink', 'red'] },
      { cx: 41, by: GROUND + 1, r: 9.5, mats: ['ink', 'red'] }, { cx: 24, by: GROUND + 1, r: 9.5, mats: ['red', 'ink', 'red'] },
      { cx: 10, by: GROUND + 3, r: 7, mats: ['red'], flat: true },
      { cx: 71, by: GROUND - 5, r: 9, mats: ['red', 'ink'] }, { cx: 80, by: GROUND + 1, r: 9, mats: ['ink', 'red', 'ink'] },
    ]) };
SPOTS.sidePotsD = { name: 'Side pots · front and back', where: 'Poker tools · tile', status: 'draft',
  /* D: the main pot in front, the side pot behind it and smaller, as two pots sit on a table seen from a seat. */
  draw: (P) => shadow(P, 66, 16, 4.5, GROUND - 19) + shadow(P, 36, 27, 8, GROUND) +
    bunch(P, [
      { cx: 59, by: GROUND - 22, r: 8, h: 4, mats: ['red', 'ink', 'red'] }, { cx: 71, by: GROUND - 21, r: 8, h: 4, mats: ['ink', 'red'] },
      { cx: 66, by: GROUND - 17, r: 8, h: 4, mats: ['ink', 'red', 'ink', 'red'] },
      { cx: 26, by: GROUND - 6, r: 12, mats: ['red', 'ink', 'red'] }, { cx: 42, by: GROUND - 5, r: 12, mats: ['ink', 'red', 'ink', 'red'] },
      { cx: 33, by: GROUND + 2, r: 12, mats: ['ink', 'red'] }, { cx: 51, by: GROUND + 3, r: 10, mats: ['red'], flat: true },
    ]) };

/*
 * D at other angles (owner, 27 November: "try this in different orientations").
 * The same two pots, the main one in front and the side one behind it and
 * smaller; only where the side pot sits relative to the main one changes.
 */
const frontAndBack = (P, [fx, fy], [bx, by], mirror = false) => {
  const m = mirror ? -1 : 1;
  return shadow(P, bx, 16, 4.5, by + 1) + shadow(P, fx, 27, 8, fy) + bunch(P, [
    { cx: bx - 7 * m, by: by - 2, r: 8, h: 4, mats: ['red', 'ink', 'red'] }, { cx: bx + 5 * m, by: by - 1, r: 8, h: 4, mats: ['ink', 'red'] },
    { cx: bx, by: by + 3, r: 8, h: 4, mats: ['ink', 'red', 'ink', 'red'] },
    { cx: fx - 10 * m, by: fy - 6, r: 12, mats: ['red', 'ink', 'red'] }, { cx: fx + 6 * m, by: fy - 5, r: 12, mats: ['ink', 'red', 'ink', 'red'] },
    { cx: fx - 3 * m, by: fy + 2, r: 12, mats: ['ink', 'red'] }, { cx: fx + 15 * m, by: fy + 3, r: 10, mats: ['red'], flat: true },
  ]);
};
const DV = { name: 'Side pots · front and back', where: 'Poker tools · tile', status: 'draft' };
SPOTS.sidePotsD2 = { ...DV, draw: (P) => frontAndBack(P, [58, GROUND], [28, GROUND - 20], true) };
SPOTS.sidePotsD3 = { ...DV, draw: (P) => frontAndBack(P, [44, GROUND], [52, GROUND - 30]) };
SPOTS.sidePotsD4 = { ...DV, draw: (P) => frontAndBack(P, [32, GROUND - 1], [72, GROUND - 10]) };
SPOTS.sidePotsD5 = { ...DV, draw: (P) => frontAndBack(P, [32, GROUND], [62, GROUND - 31]) };

const cornerArt = (key, size = 78, right = -4, bottom = -10) =>
  `<span class="art" style="position:absolute;right:${right}px;bottom:${bottom}px">${['freshDeck', 'freshDeckOnInk'].map((p, i) => `<span class="${i ? 'art-d' : 'art-l'}">${spot(key, p, { size, small: false })}</span>`).join('')}</span>`;
export const whoWinsTile = `<div class="tile">${cornerArt('whoWins', 90, 4)}<div><div class="tn">Who wins</div><div class="tx">the best hand now, no odds</div></div></div>`;
const potsTile = (key) => `<div class="tile">${key === 'sidePots' ? cornerArt(key) : cornerArt(key, 84, 4, -2)}<div><div class="tn">Side pots</div><div class="tx">a multi-way all in, pot by pot</div></div></div>`;
export const sidePotsTile = potsTile('sidePots');
const TOOLS_THREE = () => `${tile('Calculator', 'hand and pot odds', 'calculator', 'tools')}${tile('Rulings', 'look up a ruling', 'rulings', 'tools')}${tile('Boosters', 'bomb pots and more', 'boosters', 'tools')}`;
/* Each Side pots drawing on the screen it lives on, for the owner to pick. */
const winsTile = (key) => `<div class="tile">${cornerArt(key, 90, 4, key === 'whoWins4' ? -3 : -10)}<div><div class="tn">Who wins</div><div class="tx">the best hand now, no odds</div></div></div>`;
const WINS_OPTIONS = [
  ['whoWins', '0', 'As now', 'The current drawing, for comparison: five cards flat on a shallow line, each turned a little.'],
  ['whoWins1', '1', 'Dealt 3 + 1 + 1', 'The flop together, a small gap before the turn and another before the river, as a dealer lays the board.'],
  ['whoWins2', '2', 'One straight strip', 'Every card square to the line it lies on, so the board reads as one clean row.'],
  ['whoWins3', '3', 'Laid by hand', 'Each card a few degrees off the one before, as cards land when slid out one at a time.'],
  ['whoWins4', '4', 'With the pot', 'The same board a little further back, and one red chip on the felt in front of it.'],
].map(([key, n, title, note]) => ({ id: `tile-wins-${n}`, route: '/tools', name: `Who wins tile ${n} · ${title}`, nav: 'push', option: 'winsTile', note,
  html: push({ title: 'Poker tools', sub: 'nothing here touches the ledger', body: `<div class="tiles">${TOOLS_THREE()}${winsTile(key)}${sidePotsTile}</div>` }) }));
const TILE_OPTIONS = [
  ['sidePots', 'A', 'Three stacks', 'As drawn: three stacks of different heights, the short stack’s pot and what the deeper ones play for over it.'],
  ['sidePotsB', 'B', 'Two bunches', 'Two bunches of chips about the same size, side by side: two pots.'],
  ['sidePotsC', 'C', 'Main and side', 'The main pot the bigger bunch, the side pot a small one, a dashed line on the felt between them.'],
  ['sidePotsD', 'D', 'Front and back', 'The main pot in front, the side pot behind it and smaller, as a seat at the table sees two pots.'],
  ['sidePotsD2', 'D2', 'Front and back, mirrored', 'D turned the other way: the main pot front right, the side pot behind it to the left.'],
  ['sidePotsD3', 'D3', 'Front and back, straight behind', 'The side pot directly behind the main one, the depth alone telling them apart.'],
  ['sidePotsD4', 'D4', 'Front and back, shallow', 'A low angle: the side pot nearly beside the main one, only a little further back.'],
  ['sidePotsD5', 'D5', 'Front and back, steep', 'A steep angle: the side pot well back and to the right, the most depth of the five.'],
].map(([key, letter, title, note]) => ({ id: `tile-pots-${letter.toLowerCase()}`, route: '/tools', name: `Side pots tile ${letter} · ${title}`, nav: 'push', option: 'tile', note,
  html: push({ title: 'Poker tools', sub: 'nothing here touches the ledger', body: `<div class="tiles">${TOOLS_THREE()}${whoWinsTile}${potsTile(key)}</div>` }) }));

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
  ...WINS_OPTIONS,
  ...TILE_OPTIONS,
  { id: 'tools-five', route: '/tools', name: 'Poker tools, with the two new tiles', nav: 'push',
    note: 'Who wins and Side pots take the half of the second row that is empty and a third row. With the Randomiser draft as well, it is three full rows.',
    flags: ['Both tile drawings are drafts from the icon system’s parts. Who wins is the board, five cards face up lying on the table on a diagonal, suit-only faces like the small 7-2 drawing (owner, 27 November); Side pots is three stacks.',
      'Tile names and lines are new: “Who wins” · “the best hand now, no odds”, “Side pots” · “a multi-way all in, pot by pot”.'],
    html: push({ title: 'Poker tools', sub: 'nothing here touches the ledger',
      body: `<div class="tiles">${tile('Calculator', 'hand and pot odds', 'calculator', 'tools')}${tile('Rulings', 'look up a ruling', 'rulings', 'tools')}${tile('Boosters', 'bomb pots and more', 'boosters', 'tools')}${whoWinsTile}${sidePotsTile}</div>` }) },

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

