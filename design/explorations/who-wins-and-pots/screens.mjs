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
import { SPOTS, card as artCard, stack, shadow, spot, GROUND } from '../icon-system/art.mjs';
import { E } from './load.mjs';
import { init, whoWins, sidePots } from './draw.mjs';

init(E, ico);

/* ── the two tiles' drawings (drafts) ─────────────────────────────────── */

SPOTS.whoWins = {
  name: 'Who wins',
  where: 'Poker tools · tile',
  status: 'draft',
  /*
   * The board: five cards face up, laid in a diagonal from the front left to
   * the back right (owner, 27 November). The faces are placeholders, a single
   * suit at the centre with no rank, as the small 7-2 drawing draws its cards:
   * at tile size a rank would not read. Drawn back to front so each card lies
   * on the one behind it.
   */
  draw: (P) => {
    const five = [['heart', 'red'], ['spade', 'ink'], ['diamond', 'red'], ['club', 'ink'], ['heart', 'red']];
    const at = (k) => ({ cx: 24 + k * 13, by: GROUND - 2 - k * 8 });
    /* The shadow runs along the line of cards, under the first and the last, not as one puddle beneath them. */
    const lay = `<ellipse cx="51" cy="${GROUND - 16}" rx="36" ry="6.5" transform="rotate(-29 51 ${GROUND - 16})" fill="${P.shadow}"/>`;
    return lay + five.map((_, k) => 4 - k).map((k) =>
      artCard(P, { ...at(k), w: 24, h: 34, rot: -10, suitName: five[k][0], color: five[k][1], small: true })).join('');
  },
};
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
const cornerArt = (key, size = 78) =>
  `<span class="art" style="position:absolute;right:-4px;bottom:-10px">${['freshDeck', 'freshDeckOnInk'].map((p, i) => `<span class="${i ? 'art-d' : 'art-l'}">${spot(key, p, { size, small: false })}</span>`).join('')}</span>`;
export const whoWinsTile = `<div class="tile">${cornerArt('whoWins')}<div><div class="tn">Who wins</div><div class="tx">the best hand now, no odds</div></div></div>`;
export const sidePotsTile = `<div class="tile">${cornerArt('sidePots')}<div><div class="tn">Side pots</div><div class="tx">a multi-way all in, pot by pot</div></div></div>`;

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
  { id: 'tools-five', route: '/tools', name: 'Poker tools, with the two new tiles', nav: 'push',
    note: 'Who wins and Side pots take the half of the second row that is empty and a third row. With the Randomiser draft as well, it is three full rows.',
    flags: ['Both tile drawings are drafts from the icon system’s parts. Who wins is the board, five cards face up on a diagonal with suit-only faces like the small 7-2 drawing (owner, 27 November); Side pots is three stacks.',
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

