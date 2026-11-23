/**
 * The Randomiser, drawn in the approved look (`../full-board/kit.mjs`).
 *
 * A new tool, so every string on these phones is new and flagged. It sits on
 * Poker tools as the fourth tile, filling the half the grid has left empty
 * since Boosters, and so on Tonight's Poker tools sheet too (`ToolTiles`).
 *
 * PLAYING CARDS are the one place a literal colour is written, as on the
 * calculator (`../full-board/screens/90-poker-tools.mjs`): card stock is white
 * in both themes. The ink is tokens: `var(--top)` for spades and clubs,
 * `var(--red)` for hearts and diamonds and for the card's back.
 */
import { push, sheet, bar, label, card, row, para, chips, seg, keypad, field, ico, tile } from '../full-board/kit.mjs';
import { SPOTS, chip, shadow, spot, GROUND } from '../icon-system/art.mjs';

/* ── the tile's drawing: a chip tossed, as you would to settle a choice ── */

SPOTS.randomiser = {
  name: 'Randomiser',
  where: 'Poker tools · tile',
  status: 'draft',
  draw: (P, o) =>
    shadow(P, 50, 15, 15 * 0.34 * 0.9, GROUND - 1) +
    `<g transform="rotate(-24 48 50)">${chip(P, { cx: 48, by: 56, r: 23, h: 7, mat: 'red', small: o.small })}</g>` +
    `<g fill="none" stroke="${P.ink.top}" stroke-width="2.2" stroke-linecap="round" opacity=".55"><path d="M20 40c-3 6-3 12 0 18"/><path d="M76 34c4 6 5 13 2 20"/></g>`,
};
/** The drawing in a tile's corner, both palettes; CSS shows one. */
const randomiserArt = (size = 74) =>
  `<span class="art" style="position:absolute;right:-2px;bottom:-8px">${['freshDeck', 'freshDeckOnInk'].map((p, i) => `<span class="${i ? 'art-d' : 'art-l'}">${spot('randomiser', p, { size, small: false })}</span>`).join('')}</span>`;
export const randomiserTile = `<div class="tile">${randomiserArt()}<div><div class="tn">Randomiser</div><div class="tx">call, fold or a bomb pot size</div></div></div>`;

/* ── the dealt card ───────────────────────────────────────────────────── */

const FACE = '#FFFFFF'; // card stock, the same in both themes
const BACK = '#C8283A'; // the back is card stock too: light theme's red in both, as the dark --red reads pink on it
export const SUIT = {
  s: '<path d="M12 2.5C8 7 3.5 9.8 3.5 14a4.3 4.3 0 0 0 7.3 3.1L9.6 21.5h4.8l-1.2-4.4A4.3 4.3 0 0 0 20.5 14C20.5 9.8 16 7 12 2.5z"/>',
  h: '<path d="M12 21C5 15.5 2.5 12 2.5 8.2c0-2.9 2.2-5 4.9-5 1.9 0 3.6 1 4.6 2.6 1-1.6 2.7-2.6 4.6-2.6 2.7 0 4.9 2.1 4.9 5 0 3.8-2.5 7.3-9.5 12.8z"/>',
  d: '<path d="M12 2.5l6.8 9.5L12 21.5 5.2 12z"/>',
  c: '<circle cx="12" cy="7.3" r="3.7"/><circle cx="7.2" cy="13.2" r="3.7"/><circle cx="16.8" cy="13.2" r="3.7"/><path d="M12 11.5l-2.2 10h4.4z"/>',
};
export const inkOf = (s) => (s === 'h' || s === 'd' ? 'var(--red)' : 'var(--top)');
const pip = (s, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${inkOf(s)}" style="display:block">${SUIT[s]}</svg>`;

/*
 * Each answer is a card of its own suit, so the four of My move are told apart
 * at a glance and the two that put chips in are red: Call clubs, Fold spades,
 * Raise diamonds, All in hearts. A bomb pot size is a diamond, the mark the
 * Boosters list gives Bigger pots.
 */
export const ANSWERS = {
  call: { word: 'Call', suit: 'c' },
  fold: { word: 'Fold', suit: 's' },
  raise: { word: 'Raise', suit: 'd' },
  allin: { word: 'All in', suit: 'h' },
};

export const CARD_W = 196, CARD_H = 268;
const cardShell = (inner, extra = '') =>
  `<div style="width:${CARD_W}px;height:${CARD_H}px;border-radius:14px;position:relative;flex:none;${extra}">${inner}</div>`;
const corners = (s) =>
  `<span style="position:absolute;left:12px;top:12px">${pip(s, 20)}</span><span style="position:absolute;right:12px;bottom:12px;transform:rotate(180deg)">${pip(s, 20)}</span>`;

/** A card face up: the answer in the middle, its suit in two corners. `under` is a smaller line below the word. */
export const faceUp = ({ word, suit, under = '', size = 44 }) =>
  cardShell(`${corners(suit)}<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:0 14px;text-align:center">
    <b style="font:800 ${size}px/1 var(--head);letter-spacing:-.025em;color:${inkOf(suit)}">${word}</b>${under ? `<span style="font:600 13px/1.3 var(--body);color:#596171">${under}</span>` : ''}</div>`,
  `background:${FACE};box-shadow:inset 0 0 0 1px var(--outline),0 1px 3px rgba(20,26,42,.10),0 12px 22px -14px rgba(20,26,42,.45)`);

/** The back: red, cross-hatched, inside a white border. */
export const faceDown = () =>
  cardShell(`<div style="position:absolute;inset:9px;border-radius:8px;background:${BACK};background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.22) 0 1.2px,transparent 1.2px 8px),repeating-linear-gradient(-45deg,rgba(255,255,255,.22) 0 1.2px,transparent 1.2px 8px)"></div>`,
  `background:${FACE};box-shadow:inset 0 0 0 1px var(--outline),0 1px 3px rgba(20,26,42,.10),0 12px 22px -14px rgba(20,26,42,.45)`);

/** No card to deal: a dashed place for one. */
const noCard = (text) =>
  cardShell(`<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:0 20px;font:600 15px/1.3 var(--body);color:var(--muted)">${text}</div>`,
  'border:1.5px dashed var(--outline)');

const table = (c) => `<div style="display:flex;justify-content:center;padding:16px 0 8px">${c}</div>`;

/* ── the screen ───────────────────────────────────────────────────────── */

const THREE = tile('Calculator', 'hand and pot odds', 'calculator', 'tools') + tile('Rulings', 'look up a ruling', 'rulings', 'tools') + tile('Boosters', 'bomb pots and more', 'boosters', 'tools');
const MODES = ['Call or fold', 'My move', 'Bomb pot'];
const top = { title: 'Randomiser', sub: 'a fair draw, nothing recorded' };
const deckChips = (ids, on) => chips(ids.map((id) => ({ text: ANSWERS[id].word, on: id === on })));
const SIZES = [2, 3, 4, 5];
const sizeChips = (sizes, on) => chips(sizes.map((n) => ({ text: `×${n}`, on: n === on })));
const editLink = `<span style="font:600 13px/1 var(--body);letter-spacing:0;text-transform:none;color:var(--text)">Edit</span>`;

const COPY_FLAG = 'All copy on this screen is new: the title, the line under it, the three modes, the four answers, “In the deck”, “1 in 2 each”, Deal and Deal again.';

export const section = {
  title: 'Randomiser',
  blurb: 'A fourth poker tool. One screen with three decks: Call or fold, My move, and Bomb pot, whose sizes the user adds and keeps. Nothing on it touches the ledger.',
};

export default [
  { id: 'tools-four', route: '/tools', name: 'Poker tools, with the fourth tile', nav: 'push',
    note: 'Randomiser fills the half of the second row that has stood empty since Boosters. Tonight’s Poker tools sheet draws the same tiles (ToolTiles), so it gains it too.',
    flags: ['The tile’s drawing is a draft: a red chip tossed, not one from the icon system. It needs a turn on the icon board.',
      '“Randomiser”, British spelling, as the request had it. The sub-line “call, fold or a bomb pot size” is new.'],
    html: push({ title: 'Poker tools', sub: 'nothing here touches the ledger',
      body: `<div class="tiles">${THREE}${randomiserTile}</div>` }) },

  { id: 'randomiser-ready', route: '/randomiser', name: 'Randomiser · before the first deal', nav: 'push',
    note: 'Opens on the last deck used (Call or fold the first time), with the card face down. The deck is the segmented control, the answers it can give are the chips under the card, and Deal is the bar.',
    flags: [COPY_FLAG],
    html: push({ ...top,
      body: [seg(MODES, 0), table(faceDown()), label('In the deck', { quiet: true, right: '<span class="muted" style="font:600 12px/1 var(--body)">1 in 2 each</span>' }), deckChips(['call', 'fold'])],
      bar: bar('Deal') }) },

  { id: 'randomiser-fold', route: '/randomiser', name: 'Randomiser · Call or fold, dealt', nav: 'push',
    note: 'The card turns over on the answer, and its chip below is lit. Deal again draws afresh: each deal is independent, so the same answer can come twice running.',
    html: push({ ...top,
      body: [seg(MODES, 0), table(faceUp({ ...ANSWERS.fold })), label('In the deck', { quiet: true, right: '<span class="muted" style="font:600 12px/1 var(--body)">1 in 2 each</span>' }), deckChips(['call', 'fold'], 'fold')],
      bar: bar('Deal again') }) },

  { id: 'randomiser-move', route: '/randomiser', name: 'Randomiser · My move, dealt', nav: 'push',
    note: 'Four answers, equally likely. Raise and All in are red (diamonds, hearts), because they put chips in; Call and Fold are ink.',
    flags: ['Equal chances. A table may want All in rarer than the rest: weighting is not drawn (see the open questions).'],
    html: push({ ...top,
      body: [seg(MODES, 1), table(faceUp({ ...ANSWERS.raise })), label('In the deck', { quiet: true, right: '<span class="muted" style="font:600 12px/1 var(--body)">1 in 4 each</span>' }), deckChips(['call', 'fold', 'raise', 'allin'], 'raise')],
      bar: bar('Deal again') }) },

  { id: 'randomiser-bomb', route: '/randomiser', name: 'Randomiser · Bomb pot, dealt', nav: 'push',
    note: 'A size is a multiple of the big blind, which is how the Bomb pot booster states the ante (“one to five big blinds is the usual range”). The sizes are the user’s own, kept on the phone; Edit opens them.',
    flags: ['“Your sizes”, “Edit”, “big blinds each” are new.'],
    html: push({ ...top,
      body: [seg(MODES, 2), table(faceUp({ word: '×3', suit: 'd', size: 64, under: 'big blinds each' })), label('Your sizes', { quiet: true, right: editLink }), sizeChips(SIZES, 3)],
      bar: bar('Deal again') }) },

  { id: 'randomiser-bomb-tonight', route: '/randomiser', name: 'Randomiser · Bomb pot, from Tonight', nav: 'push',
    note: 'Opened from Tonight’s tools sheet while a game is open, the card can also say what the size comes to at tonight’s blinds, so the host reads one figure to the table.',
    flags: ['Option, not decided: it is the only place the tool would read the night. The figure would come from packages/core (a multiple of Stakes.big), never from the screen.',
      'The blinds “$5 / $10” and “$30 each” are illustrative: the seeded night has no blinds.'],
    html: push({ ...top,
      body: [seg(MODES, 2), table(faceUp({ word: '×3', suit: 'd', size: 64, under: '$30 each<br><span style="font-weight:500">at $5 / $10</span>' })), label('Your sizes', { quiet: true, right: editLink }), sizeChips(SIZES, 3)],
      bar: bar('Deal again') }) },

  { id: 'randomiser-bomb-empty', route: '/randomiser', name: 'Randomiser · Bomb pot, no sizes yet', nav: 'push',
    note: 'The first time, there is nothing to deal: the place for the card says so, Add a size opens the sizes sheet, and Deal is faint until there are two.',
    flags: ['“No sizes yet”, the paragraph and “Add a size” are new. Two sizes is the least a draw makes sense with: one size is not a choice.'],
    html: push({ ...top,
      body: [seg(MODES, 2), table(noCard('No sizes yet')), para('Add the bomb pot sizes your table plays, in big blinds. One to five is usual.'),
        `<div class="btn2" style="box-shadow:none;border:1.5px dashed var(--outline)">${ico('plus', 18)}Add a size</div>`],
      bar: bar('Deal', { blocked: true }) }) },

  { id: 'bomb-sizes', route: '/bomb-pot-sizes', name: 'Bomb pot sizes', nav: 'sheet',
    note: 'A sheet, because it ends in Save. One row per size with its bin; the field takes a whole number of big blinds on the keypad and Add puts it in the list in order. Save keeps the list on this phone; the close discards.',
    flags: ['Whole numbers only (×1 to ×20). Half sizes (×1.5) and named sizes (“double board ×2”) are not drawn.',
      'Saved on this phone, not with the group: see the open questions.',
      'All copy here is new.'],
    html: sheet({ behind: 'Randomiser', title: 'Bomb pot sizes', sub: 'Saved on this phone. All equally likely.', tall: true,
      body: [
        card(SIZES.map((n) => row({ name: `×${n}`, meta: `${n} big blinds each`, trail: `<span class="muted">${ico('trash', 18)}</span>` }))),
        `<div style="display:flex;gap:10px;align-items:flex-end"><div style="flex:1">${field('Add a size', '6', { focus: true, suffix: 'big blinds' })}</div><div class="btn2" style="width:96px">Add ×6</div></div>`,
        keypad({ zeros: false }),
      ],
      bar: bar('Save') }) },

  { id: 'pick-tool-four', route: '/pick-tool', name: 'Poker tools sheet, from Tonight', nav: 'sheet',
    note: 'The same four tiles; a tile closes the sheet first and then pushes the tool from Tonight, as the other three do.',
    html: sheet({ behind: 'Tonight', title: 'Poker tools', sub: 'nothing here touches the ledger',
      body: `<div class="tiles">${THREE}${randomiserTile}</div>` }) },
];
