/**
 * Builds `Icon System.html` — the working board for the app's illustrations.
 *
 *   node design/explorations/icon-system/build.mjs
 *   node design/explorations/icon-system/build.mjs --artifact <path>
 *
 * `--artifact` also writes the published version: the same board with an
 * Approve / Needs work pair and a comment box under every drawing, saved to the
 * artifact's `db` (collection `reviews`, one document per spot key, plus
 * `general`), so the verdicts can be read back from the store.
 *
 * Every drawing on the board comes from `art.mjs`; nothing is pasted in. Change
 * a primitive there and every spot that uses it changes with it, which is the
 * point of drawing them this way.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPOTS, PALETTES, K, spot, stack, shadow } from './art.mjs';
import { BOOSTERS } from '../../../packages/core/src/boosters.ts';
import { FD_CSS, FD_FONTS, OPT_CSS, freshDeckScreens, positionOptions, shapeOptions, variantOption, anchoredOption, toolsTileOption, boosterOption, sizingTable, RHO } from './fresh-deck.mjs';

const ROW_SPOT = { 'bomb-pot': 'bombPot', 'double-board': 'doubleBoardA', straddle: 'straddleA', 'stand-up': 'standUpA', 'seven-deuce': 'sevenTwo' };

const here = dirname(fileURLToPath(import.meta.url));
const artifactAt = process.argv.includes('--artifact') ? process.argv[process.argv.indexOf('--artifact') + 1] : null;
let REVIEW = false;
const REVIEW_JS = () => `<script>\n${readFileSync(join(here, 'review.js'), 'utf8')}</script>`;

const reviewBlock = (key, label) => `<div class="rv" data-key="${key}">
      <div class="rvb">
        <button type="button" class="rvbtn ok" data-v="approved" aria-pressed="false" disabled>Approve</button>
        <button type="button" class="rvbtn no" data-v="changes" aria-pressed="false" disabled>Needs work</button>
      </div>
      <label class="sr" for="c-${key}">Comment on ${label}</label>
      <textarea id="c-${key}" rows="2" placeholder="Comment (optional)" disabled></textarea>
      <span class="rvs" aria-live="polite"></span>
    </div>`;

/* ── the board's own look: the handoff boards' greys and type ─────────── */
const C = {
  page: '#F6F6F8', ink: '#0B0B0F', mut: '#6C6C70', faint: '#8E8E93', line: '#E4E4E8',
  card: '#FFFFFF', darkCard: '#1A1C22', darkPage: '#0E0F12', darkText: '#F2F2F5', darkMut: '#9A9AA2',
};
const font = `-apple-system,'SF Pro Text','Figtree',sans-serif`;

const STATUS = {
  keep: { label: 'Kept', note: 'you liked it', bg: '#E6F4EA', fg: '#1D6B36' },
  redraw: { label: 'Redrawn', note: 'candidate', bg: '#FBEAEA', fg: '#A3282E' },
  new: { label: 'New', note: 'in the system', bg: '#ECECF1', fg: '#45474F' },
  round2: { label: 'Round 2', note: 'from your review', bg: '#FFF1DB', fg: '#8A4B00' },
  round16: { label: 'Round 16', note: 'from your fifteenth review', bg: '#EDEAF6', fg: '#4A3C8A' },
  round15: { label: 'Round 15', note: 'from your fourteenth review', bg: '#E9F3EE', fg: '#2C6148' },
  round14: { label: 'Round 14', note: 'from your thirteenth review', bg: '#F6EAE0', fg: '#86431A' },
  round13: { label: 'Round 13', note: 'from your twelfth review', bg: '#EEF0F8', fg: '#3A4789' },
  round12: { label: 'Round 12', note: 'from your eleventh review', bg: '#FCEBEA', fg: '#8E2A24' },
  round11: { label: 'Round 11', note: 'from your tenth review', bg: '#E6EEF5', fg: '#2B4E70' },
  round10: { label: 'Round 10', note: 'from your ninth review', bg: '#F1ECE4', fg: '#6B4E1F' },
  round9: { label: 'Round 9', note: 'from your eighth review', bg: '#E8F0E3', fg: '#3D6B1F' },
  round8: { label: 'Round 8', note: 'from your seventh review', bg: '#FFF4D6', fg: '#7A5A00' },
  round7: { label: 'Round 7', note: 'from your sixth review', bg: '#E3F4F8', fg: '#0F5F73' },
  round6: { label: 'Round 6', note: 'from your fifth review', bg: '#FDE8F1', fg: '#A1275F' },
  round5: { label: 'Round 5', note: 'from your fourth review', bg: '#F3E8FF', fg: '#6B2FB3' },
  round26: { label: 'Round 26', note: 'the straddle’s seats the other way', bg: '#FDEBEC', fg: '#A3282E' },
  round25: { label: 'Round 25', note: 'the approved tile, two framed cards', bg: '#E8F3EC', fg: '#1D6B36' },
  round24: { label: 'Round 24', note: 'cards closer, chips tipped', bg: '#EEE9F7', fg: '#4B3A86' },
  round23: { label: 'Round 23', note: 'chips on the table; the Button game', bg: '#E9F1EC', fg: '#2A5E40' },
  round22: { label: 'Round 22', note: 'one card face', bg: '#FBE9EA', fg: '#9A2530' },
  round21: { label: 'Round 21', note: 'chips facing front; Rulings fuller', bg: '#F3ECE2', fg: '#7A4A12' },
  round20: { label: 'Round 20', note: 'Poker tools reworked', bg: '#E7EEF9', fg: '#24477E' },
  round4: { label: 'Round 4', note: 'from your third review', bg: '#EAF6F0', fg: '#14613E' },
  round3: { label: 'Round 3', note: 'from your second review', bg: '#E5EEFF', fg: '#1F4BA8' },
};

const pill = (st, pick) =>
  `<span class="pill" style="background:${STATUS[st].bg};color:${STATUS[st].fg}">${STATUS[st].label}${pick ? ' · my pick' : ''}</span>`;

function cell(key, before = false) {
  const s = SPOTS[key];
  return `<figure class="cell${before ? ' before' : ''}" data-key="${key}">
    <div class="pair">
      <div class="tile light">${spot(key, 'light', { size: 96 })}</div>
      <div class="tile dark">${spot(key, 'dark', { size: 96 })}</div>
    </div>
    <figcaption>
      <b>${s.name}</b>${s.variant ? `<span class="variant">${s.variant}</span>` : ''}
      <span class="where">${s.where}</span>
      ${pill(s.status, s.pick)}
    </figcaption>
    ${REVIEW ? reviewBlock(key, s.name + (s.variant ? ' ' + s.variant : '')) : ''}
  </figure>`;
}

/* Nothing came back after the fifteenth review: R was approved. */
const ROUND = [];
/* Nothing left to decide: Sessions is calendar T (owner, 21 November). */
const DECIDE = [];
/* The approved drawing for each place, by the app's own names. */
const PICK = { session: 'session', group: 'groupB', sessions: 'sessionsT', stats: 'stats', tools: 'toolsAB', calculator: 'calculator', rulings: 'rulings', boosters: 'boostersE', 'bomb-pot': 'bombPot', 'double-board': 'doubleBoardA', straddle: 'straddleL', 'table-ante': 'anteF', 'stand-up': 'standUpR', 'button-game': 'buttonD', 'seven-deuce': 'sevenTwo' };
const APPROVED = ['session', 'stats', 'rulings', 'sevenTwo', 'bombPot', 'doubleBoardA', 'calculator', 'groupB', 'anteF', 'boostersE', 'straddleL', 'toolsAB', 'standUpR', 'sessionsT', 'buttonD'];
/* One place in the app each, and what is approved for it. */
const SLOTS = [
  ['Start a session', 'session'], ['The group', 'groupB'], ['Sessions', 'sessionsT'], ['My stats', 'stats'],
  ['Poker tools', 'toolsAB'], ['Calculator', 'calculator'], ['Rulings', 'rulings'], ['Boosters', 'boostersE'],
  ['Bomb pot', 'bombPot'], ['Double-board', 'doubleBoardA'], ['Straddle', 'straddleL'], ['Table ante', 'anteF'],
  ['Stand-up game', 'standUpR'], ['Button game', 'buttonD'], ['7-2 game', 'sevenTwo'],
];
/* Reviewed in an earlier round, needed work, and answered since. */
const EARLIER = ['straddleK', 'straddleI', 'buttonC', 'buttonGame', 'sessionsJ', 'standUpQ', 'standUpN', 'standUpJ', 'standUpE', 'standUpG', 'standUpI', 'standUpA', 'toolsY', 'toolsV', 'toolsT', 'toolsP', 'sessionsS', 'toolsO', 'sessionsL', 'toolsF', 'toolsI', 'toolsJ', 'toolsK', 'toolsL', 'sessionsO', 'sessionsP', 'group', 'sessionsA', 'sessionsB', 'toolsA', 'toolsB', 'straddleA', 'anteB', 'boosters', 'sessionsD', 'sessionsF', 'straddleF', 'toolsD'];
/* The first round's drawings that the second replaced outright. */
const RETIRED = ['ante', 'straddle', 'doubleBoard'];
const ROUND20 = ['toolsAT', 'straddleM', 'straddleN', 'straddleO', 'straddleP', 'straddleQ', 'toolsAE', 'toolsAF', 'toolsAG', 'toolsAH', 'toolsAI', 'toolsAJ', 'toolsAK', 'rulingsB', 'rulingsC', 'rulingsD', 'toolsAL', 'toolsAM', 'toolsAN', 'rulingsE', 'rulingsF', 'toolsAO', 'toolsAP', 'rulingsG', 'buttonB', 'buttonD', 'buttonE', 'toolsAQ', 'toolsAR', 'toolsAS'];
const shownAbove = new Set([...ROUND20, ...ROUND.flatMap((g) => g[2]), ...DECIDE.flatMap((g) => g[1]), ...APPROVED, ...EARLIER, ...RETIRED]);
const EARLIER_SHOWN = EARLIER.filter((k) => !ROUND.some((g) => g[2].includes(k)));
const UNMARKED = Object.keys(SPOTS).filter((k) => !shownAbove.has(k));

const setSoFar = () => `<div class="slots">${SLOTS.map(([name, key, note]) => `<div class="slot${key ? '' : ' gap'}">
    <div class="slart">${key ? spot(key, 'light', { size: 64 }) : '<span>?</span>'}</div><b>${name}</b>${note ? `<i>${note}</i>` : ''}</div>`).join('')}</div>`;

/*
 * Round 18's options, kept so round 19 can open each group with the one the
 * note was left on.
 */
const ROUND18 = [
  ['', '', 'posBR', [{ key: 'posBR2', title: '5b · bleeding off the corner, larger', note: 'The drawing at 116: about half the tile, still cropped by its edge.', cls: 'pos-br', size: 116 }]],
  ['', '', 'posBRin', [{ key: 'posBRin2', title: '4b · bottom right, a bit larger', note: 'The drawing at 84, still whole inside the tile.', cls: 'pos-brin', size: 84 }]],
];
/*
 * Round 19: the owner's notes on round 18, 21 November, quoted as written.
 * "dont need to leave options with titles on bottom": only name-on-top
 * placements remain on the board.
 */
const ROUND19 = [
  ['Icon bleeding off the corner', 'find best positioning for chips on all 4', 'posBR2', [
    { key: 'bleedA', title: '5d · placed by outline, same crop on all four', note: 'Each drawing sized to the same visual weight and run 10 past the right edge and 8 past the bottom.', T: 86, cx: 10, cy: 8 },
    { key: 'bleedB', title: '5e · placed by outline, larger, more crop', note: 'The same, bigger: 16 past the right, 12 past the bottom.', T: 98, cx: 16, cy: 12 },
    { key: 'bleedC', title: '5f · placed by outline, just touching the corner', note: 'Large, but each drawing only kisses the edges, so nothing is cut off.', T: 90, cx: 2, cy: 2 },
  ]],
  ['Icon in the bottom right', 'adjust the title size', 'posBRin2', [
    { key: 'inA', title: '4d · name at 19', note: 'The name up from 16.5 to 19. Drawings placed by outline, 6 in from the corner.', T: 68, cx: -6, cy: -6, tn: 19 },
    { key: 'inB', title: '4e · name at 21', note: 'The name at 21, the drawings as 4d.', T: 68, cx: -6, cy: -6, tn: 21 },
    { key: 'inC', title: '4f · name at 23', note: 'The name at 23, the largest that keeps “Poker tools” on one line.', T: 68, cx: -6, cy: -6, tn: 23 },
  ]],
];


const optCell = ({ key, title, note, html }) => `<figure class="cell opt" data-key="${key}">${html}<figcaption><b>${title}</b><span>${note}</span></figcaption>${REVIEW ? reviewBlock(key, title) : ''}</figure>`;

const roundNow = () => ROUND.map(([title, quote, keys]) => `
  <div class="group">
    <div class="ghead"><h3>${title}</h3><p>${quote ? `first: the one you reviewed · then ${keys.length - 1} new` : `${keys.length} new`}</p></div>
    <blockquote class="quote">${quote ? `“${quote}”` : title === 'Poker tools' ? 'All four layouts of the three tools came back Needs work, with no comment. So not a fifth layout: three different ideas. The four are under Earlier rounds.' : ''}</blockquote>
    <div class="grid">${keys.map((k, i) => cell(k, i === 0 && !!quote)).join('')}</div>
    <div class="at40"><span>At 40 pt, the size on a tile or a list row</span>${keys.map((k) => spot(k, 'light', { size: 40 })).join('')}${keys.map((k) => `<i>${spot(k, 'dark', { size: 40 })}</i>`).join('')}</div>
  </div>`).join('');

const group = (title, note, keys) => `
  <div class="group">
    <div class="ghead"><h3>${title}</h3><p>${note}</p></div>
    <div class="grid">${keys.map(cell).join('')}</div>
  </div>`;

/* ── anatomy: the reference stack, large, with its parts named ─────────── */
function anatomy() {
  const P = PALETTES.light;
  const art = `<svg viewBox="0 0 96 96" width="300" height="300">${shadow(P, 48, 31)}${stack(P, { cx: 48, by: 83, r: 25, h: 8, mats: ['ink', 'red', 'ink', 'red', 'ink'], wobble: [0, 1.6, -0.6, 1.2, -1.4] })}</svg>`;
  const labels = [
    ['Top face', 'only the top chip shows one', 6],
    ['Inlay ring', 'a lighter line at 0.6 r', 22],
    ['Rim dashes', 'eight, lined up with the inserts', 38],
    ['Edge inserts', 'eight round the edge, each as wide as the gap', 56],
    ['Seam', 'a dark hairline where two chips meet', 74],
    ['Ground shadow', 'one soft ellipse, never a drop shadow', 91],
  ];
  return `<div class="anatomy">
    <div class="anart">${art}</div>
    <ol class="anlist">${labels.map(([a, b, y]) => `<li style="top:${y}%"><b>${a}</b><span>${b}</span></li>`).join('')}</ol>
  </div>`;
}

function projection() {
  const rx = 60, ry = rx * K;
  return `<svg viewBox="0 0 200 150" width="260" height="195" font-family="${font}">
    <line x1="10" y1="120" x2="190" y2="120" stroke="${C.line}" stroke-width="1.5"/>
    <text x="190" y="138" text-anchor="end" font-size="10" fill="${C.faint}">ground · y 84 of 96</text>
    <ellipse cx="100" cy="74" rx="${rx}" ry="${ry}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>
    <line x1="100" y1="74" x2="160" y2="74" stroke="${C.faint}" stroke-dasharray="3 3"/>
    <line x1="100" y1="74" x2="100" y2="${74 + ry}" stroke="${C.faint}" stroke-dasharray="3 3"/>
    <text x="130" y="68" text-anchor="middle" font-size="11" fill="${C.mut}">r</text>
    <text x="108" y="88" font-size="11" fill="${C.mut}">0.34 r</text>
    <g transform="translate(26 24)"><circle r="9" fill="#F2A23A" opacity=".9"/><path d="M12 8l22 16" stroke="${C.faint}" stroke-width="1.2" marker-end="url(#ah)"/></g>
    <defs><marker id="ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3 0 6Z" fill="${C.faint}"/></marker></defs>
    <text x="40" y="20" font-size="10" fill="${C.faint}">light, upper left</text>
  </svg>`;
}

function swatches(theme) {
  const P = PALETTES[theme];
  const rows = [
    ['Ink', P.ink.top, P.ink.side, 'chips, the bomb, the book'],
    ['Felt red', P.red.top, P.red.side, 'chips, hearts, diamonds, the ribbon'],
    ['Bone', P.bone.top, P.bone.side, 'inserts, buttons, card stock'],
    ['Fire', P.fire, P.fireOuter, 'only ever a flame or a spark'],
  ];
  return `<div class="sw ${theme}">
    <span class="swt">${theme === 'light' ? 'Light' : 'Dark'}</span>
    ${rows.map(([n, a, b, u]) => `<div class="swr"><i style="background:linear-gradient(90deg,${a} 50%,${b} 50%)"></i><div><b>${n}</b><code>${a} · ${b}</code><span>${u}</span></div></div>`).join('')}
  </div>`;
}

/* ── the glyph family, for contrast: copied from Icon.tsx ───────────────── */
const glyph = (inner) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="${C.ink}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const GLYPHS = [
  glyph('<path d="M5 12h13M12.5 6l6 6-6 6" stroke-width="2"/>'),
  glyph('<circle cx="12" cy="12" r="8.5" stroke-width="1.9"/><path d="M12 7.5V12l3 2" stroke-width="1.9"/>'),
  glyph('<path d="M4.5 12.5l5 5 10-11" stroke-width="2.2"/>'),
  glyph('<path d="M5 3.5h14v17l-2.3-1.5-2.4 1.5-2.3-1.5-2.4 1.5L7.3 19 5 20.5z" stroke-width="1.8"/><path d="M8.5 8.5h7M8.5 12.5h7" stroke-width="1.8"/>'),
  glyph('<circle cx="7.5" cy="7.5" r="2.6" stroke-width="2"/><circle cx="16.5" cy="16.5" r="2.6" stroke-width="2"/><path d="M18.5 5.5l-13 13" stroke-width="2"/>'),
  glyph('<rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke-width="2"/>'),
];

/* ── in place ──────────────────────────────────────────────────────────── */
function startCard(theme) {
  const d = theme === 'dark';
  return `<div class="phone ${theme}">
    <div class="start" style="background:${d ? C.darkCard : C.card}">
      <div>
        <div class="st" style="color:${d ? C.darkText : C.ink}">Start a session <span>&rarr;</span></div>
        <div class="sm" style="color:${d ? C.darkMut : C.mut}">$500 buy-in · same rules as last time</div>
      </div>
      ${spot('session', theme, { size: 92 })}
    </div>
    <div class="tiles">
      ${[['group', 'The group'], ['sessionsA', 'Sessions'], ['stats', 'My stats'], ['toolsA', 'Poker tools']]
        .map(([k, n]) => `<div class="htile" style="background:${d ? C.darkCard : C.card}">${spot(k, theme, { size: 52 })}<b style="color:${d ? C.darkText : C.ink}">${n}</b></div>`)
        .join('')}
    </div>
  </div>`;
}

function boostersList(theme) {
  const d = theme === 'dark';
  /* The summaries are the app's own, from packages/core/src/boosters.ts. */
  const rows = BOOSTERS.filter((b) => ROW_SPOT[b.id]).map((b) => [ROW_SPOT[b.id], b.name, b.summary]);
  return `<div class="phone ${theme}"><div class="list" style="background:${d ? C.darkCard : C.card}">
    ${rows
      .map(([k, n, s], i) => `<div class="lrow" style="border-color:${d ? '#2A2C33' : C.line};${i === rows.length - 1 ? 'border:0' : ''}">${spot(k, theme, { size: 40 })}<div><b style="color:${d ? C.darkText : C.ink}">${n}</b><span style="color:${d ? C.darkMut : C.mut}">${s}</span></div></div>`)
      .join('')}
  </div></div>`;
}

function sizes() {
  const keys = ['session', 'toolsA', 'standUpA', 'sessionsA'];
  const ss = [96, 64, 44, 32];
  return `<table class="sizes"><tr><th></th>${ss.map((s) => `<th>${s} pt${s <= 44 ? '<br><span>small rule</span>' : ''}</th>`).join('')}</tr>
    ${keys.map((k) => `<tr><td>${SPOTS[k].name}</td>${ss.map((s) => `<td>${spot(k, 'light', { size: s })}</td>`).join('')}</tr>`).join('')}
  </table>`;
}

const RULES = [
  ['Only things that sit on a poker table.', 'Chips, cards, the dealer button, a bomb, the book. No people, no hands, no abstract shapes. If it couldn’t be put down on the felt, it isn’t a spot.'],
  ['One projection.', 'Seen from a little above: a circle lying flat is an ellipse 0.34 as tall as it is wide. Things that stand up (cards, the book, a chip on its edge) are drawn face-on. Everything stands on one ground line with one soft shadow under it.'],
  ['Three materials, and fire.', 'Ink, felt red, bone. Card stock is bone. Amber appears only as a flame or a spark, so the two places it shows — Boosters and the bomb — read as the exciting ones.'],
  ['No outlines.', 'An edge is where two materials meet. The only strokes are the seam between chips, the inlay ring, and a card’s hairline edge so it holds on white.'],
  ['The inserts are the signature.', 'Every chip has eight, each exactly as wide as the gap between them, and they follow the edge’s curve. That stripe is what makes something read as ours at 32 pt.'],
  ['Flat fills, light from the upper left.', 'The side of a chip is darker than its face; that is the only shading. No gradients — it keeps the drawings portable to react-native-svg as they are.'],
  ['Below 44 pt, drop the fine detail.', 'The rim dashes, the inlay ring, letters and card indices go. The silhouette, the inserts and the colours stay.'],
  ['Dark mode moves one colour.', 'Ink lifts from #232837 to #363D52 so a black chip separates from a dark card. Red, bone and fire do not move; the shadow deepens.'],
  ['Spots name places and games; glyphs do everything else.', 'A spot sits on a card or a tile that opens somewhere. Inside a row, a bar, a button or beside a figure, it is a line glyph from Icon.tsx — never a spot, and never a spot shrunk down to glyph size.'],
];

const OPEN = [
  ['The Stand-up game has no verdict yet.', 'A (a chip stood up) and B (the empty chair) are under Not reviewed yet.'],
  ['Whether spots replace the glyphs on home’s tiles.', 'Today each tile has a line glyph in a grey round (N6, 25 October). The phone mock above shows spots instead; that reopens a decided screen, so it is yours to say.'],
  ['Nothing is in the app yet.', 'When the set is agreed it goes in as one Spot.tsx beside Icon.tsx, ported from art.mjs, and docs/screens.md records where each is used.'],
];

const page = () => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Poker Club Icon System</title>${REVIEW ? '\n<meta name="claude:viewport-fit-sides" content="cover">' : ''}
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="${FD_FONTS}" rel="stylesheet">
<style>
:root{color-scheme:light}
${FD_CSS}${OPT_CSS}
.opt{margin:0;background:${C.card};border-radius:18px;padding:10px 10px 14px;display:flex;flex-direction:column;gap:10px}
.optgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px}
.opt figcaption b{font:700 14px ${font}}.opt figcaption span{font:400 12.5px/1.45 ${font};color:${C.mut}}
body{margin:0;background:${C.page};font-family:${font};color:${C.ink}}
.proj{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.board{display:flex;flex-direction:column;gap:56px;padding-block:48px 64px;padding-left:max(48px,env(safe-area-inset-left,0px));padding-right:max(48px,env(safe-area-inset-right,0px));max-width:1240px;box-sizing:border-box}
.eyebrow{font:700 11px/1 ${font};letter-spacing:.14em;text-transform:uppercase;color:${C.faint}}
h1{margin:10px 0 10px;font:800 32px/1.1 ${font};letter-spacing:-.025em}
h2{margin:0 0 6px;font:800 22px/1.2 ${font};letter-spacing:-.02em}
h3{margin:0;font:700 15px/1.3 ${font}}
p{margin:0;font:400 14px/1.6 ${font};color:${C.mut};text-wrap:pretty}
.lede{max-width:780px}
.sec>p{max-width:780px;margin-bottom:22px}
.fam{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.fam>div{background:${C.card};border-radius:20px;padding:22px;display:flex;flex-direction:column;gap:14px}
.fam .row svg{max-width:100%}.fam .row{display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap}
.mat{display:grid;grid-template-columns:auto 1fr;gap:16px}
.box{background:${C.card};border-radius:20px;padding:22px}
.anatomy{position:relative;display:flex;gap:8px;align-items:center}
.anlist{position:relative;list-style:none;margin:0;padding:0;width:270px;height:300px}
.anlist li{position:absolute;left:0;transform:translateY(-50%);display:flex;flex-direction:column;gap:1px;padding-left:14px;border-left:2px solid ${C.line}}
.anlist b{font:700 13px ${font}}.anlist span{font:400 12px/1.35 ${font};color:${C.mut}}
.matr{display:flex;flex-direction:column;gap:16px}
.swrow{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.sw{border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px}
.sw.light{background:#FFFFFF;box-shadow:inset 0 0 0 1px ${C.line}}.sw.dark{background:${C.darkCard};color:${C.darkText}}
.swt{font:700 11px ${font};letter-spacing:.12em;text-transform:uppercase;opacity:.6}
.swr{display:flex;gap:10px;align-items:center}.swr i{width:44px;height:30px;border-radius:8px;flex:none;box-shadow:inset 0 0 0 1px rgba(127,127,127,.25)}
.swr div{display:flex;flex-direction:column;gap:1px}.swr b{font:700 13px ${font}}.swr code{font:500 11px ui-monospace,Menlo,monospace;opacity:.65}.swr span{font:400 11.5px ${font};opacity:.7}
.group{display:flex;flex-direction:column;gap:14px;margin-bottom:34px}
.ghead{display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(222px,1fr));gap:14px}
.cell{margin:0;background:${C.card};border-radius:18px;padding:10px 10px 14px;display:flex;flex-direction:column;gap:10px}
.pair{display:flex;gap:6px}.tile{flex:1;display:flex;justify-content:center;align-items:center;border-radius:12px;padding:6px 0}
.tile.light{background:#F4F4F6}.tile.dark{background:${C.darkCard}}
figcaption{display:flex;flex-direction:column;gap:3px;padding:0 4px}
figcaption b{font:700 14px ${font}}.variant{font:600 12.5px ${font};color:${C.ink}}.where{font:400 12px ${font};color:${C.faint}}
.pill{align-self:flex-start;margin-top:5px;font:700 11px ${font};padding:4px 8px;border-radius:999px}
.sizes{border-collapse:separate;border-spacing:0;background:${C.card};border-radius:20px;padding:12px 18px}
.sizes th{font:700 12px ${font};color:${C.mut};padding:8px 18px;text-align:center}.sizes th span{font-weight:500;color:${C.faint}}
.sizes td{padding:6px 18px;text-align:center;vertical-align:middle}.sizes td:first-child{text-align:left;font:600 13px ${font};padding-left:4px}
.places{display:flex;gap:18px;flex-wrap:wrap}
.phone{width:360px;border-radius:30px;padding:18px 16px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px}
.phone.light{background:#EEEEF2}.phone.dark{background:${C.darkPage}}
.start{border-radius:24px;padding:20px 18px 18px 22px;display:flex;align-items:center;justify-content:space-between;gap:6px}
.st{white-space:nowrap;font:800 22px/1.1 ${font};letter-spacing:-.02em}.st span{font-weight:500;margin-left:4px}
.sm{font:400 15px/1.35 ${font};margin-top:8px;max-width:190px}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.htile{border-radius:16px;padding:12px 14px 14px;height:108px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between}
.htile svg{margin:-6px 0 0 -8px}.htile b{font:700 16px ${font};letter-spacing:-.01em}
.list{border-radius:20px;padding:4px 14px}
.lrow{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid}
.lrow div{display:flex;flex-direction:column;gap:2px}.lrow b{font:600 15px ${font}}.lrow span{font:400 12.5px/1.35 ${font}}
.rules{display:grid;grid-template-columns:1fr 1fr;gap:12px;counter-reset:r}
.rules>div{background:${C.card};border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:4px;counter-increment:r}
.rules b{font:700 14px ${font}}.rules b::before{content:counter(r) '  ';color:${C.faint}}
.open{display:flex;flex-direction:column;gap:10px;max-width:820px}
.cell.before .pair{opacity:.92}.cell.before figcaption b::after{content:'  · reviewed';font-weight:600;color:${C.faint}}
.slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
.slot{background:${C.card};border-radius:14px;padding:10px 10px 12px;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center}
.slart{height:64px;display:flex;align-items:center;justify-content:center}.slot b{font:700 13px ${font}}.slot i{font:500 11.5px ${font};font-style:normal;color:${C.faint}}
.slot.gap{background:transparent;box-shadow:inset 0 0 0 1.5px ${C.line};border-radius:14px}.slot.gap .slart span{width:46px;height:46px;border-radius:50%;border:2px dashed #C9C9D1;display:flex;align-items:center;justify-content:center;font:700 18px ${font};color:#B0B0B8}
.sizing{border-collapse:collapse;background:#fff;border-radius:14px;font:500 13px ${font};color:${C.ink};overflow:hidden}.sizing th{font:700 11px ${font};letter-spacing:.08em;text-transform:uppercase;color:${C.faint};text-align:left;padding:10px 14px}.sizing td{padding:6px 14px;border-top:1px solid ${C.line};vertical-align:middle}.sizing td:nth-child(3),.sizing td:nth-child(4){font-variant-numeric:tabular-nums}
.more{display:flex;flex-direction:column;gap:14px}.more+.more{margin-top:18px}
.more summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px}.more summary::-webkit-details-marker{display:none}
.more summary h2{margin:0}.more summary h2::before{content:'▸ ';color:${C.faint}}.more[open] summary h2::before{content:'▾ '}
.more summary span{font:700 13px ${font};color:${C.mut};background:#ECECF1;border-radius:999px;padding:3px 9px;vertical-align:middle}
.more>p{margin-top:8px}.more>.grid{margin-top:14px}
.quote{margin:0;max-width:780px;font:500 14px/1.55 ${font};color:${C.ink};background:#FFF8EC;border-radius:12px;padding:10px 14px}
.at40{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;background:${C.card};border-radius:14px;padding:10px 14px}
.at40 span{font:600 12px ${font};color:${C.faint};flex-basis:100%}.at40 i{display:inline-flex;background:${C.darkCard};border-radius:8px;padding:2px}
.open>div{border-left:3px solid #F2A23A;padding:4px 0 4px 14px}.open b{font:700 14px ${font};display:block;margin-bottom:2px}
${REVIEW ? `.rvbar{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;background:${C.ink};color:#fff;border-radius:16px;padding:12px 16px;box-shadow:0 6px 20px rgba(0,0,0,.12)}
.rvbar b{font:800 15px ${font}}.rvbar .cnt{display:flex;gap:8px;flex-wrap:wrap}.rvbar .cnt span{font:700 12px ${font};padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.12)}
.rvbar .cnt .a{background:#1D6B36}.rvbar .cnt .c{background:#A3282E}
.rvnote{font:500 12.5px ${font};color:#FFD889;flex-basis:100%}
.rv{display:flex;flex-direction:column;gap:6px;padding:10px 4px 0;border-top:1px solid ${C.line}}
.rvb{display:flex;gap:6px}
.rvbtn{flex:1;font:700 12.5px ${font};padding:8px 6px;border-radius:10px;border:1.5px solid ${C.line};background:#fff;color:${C.ink};cursor:pointer}
.rvbtn:disabled{cursor:default;opacity:.45}
.rvbtn:focus-visible,.rv textarea:focus-visible,.gen textarea:focus-visible{outline:2px solid #2B6CDF;outline-offset:2px}
.rvbtn.ok[aria-pressed="true"]{background:#1D6B36;border-color:#1D6B36;color:#fff}
.rvbtn.no[aria-pressed="true"]{background:#A3282E;border-color:#A3282E;color:#fff}
.rv textarea,.gen textarea{font:400 13px/1.4 ${font};color:${C.ink};border:1.5px solid ${C.line};border-radius:10px;padding:7px 9px;resize:vertical;background:#FAFAFB;box-sizing:border-box;width:100%}
.rvs{font:500 11.5px ${font};color:${C.faint};min-height:14px}
.rvs.err{color:#A3282E}
.cell.is-approved{box-shadow:inset 0 0 0 2px #1D6B36}.cell.is-changes{box-shadow:inset 0 0 0 2px #A3282E}
.gen{background:${C.card};border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;max-width:820px}
.gen b{font:700 14px ${font}}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
` : ''}
@media (max-width:760px){.board{padding-block:28px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}.fam,.mat,.rules,.swrow{grid-template-columns:1fr}.anatomy{flex-direction:column}.anlist{height:auto;display:flex;flex-direction:column;gap:10px}.anlist li{position:static;transform:none}.phone{width:100%}.sizes{display:block;overflow-x:auto}}
</style>
</head>
<body>
<main class="board">

<header>
  <span class="eyebrow">Exploration · 20 November 2026 · not a handoff</span>
  <h1>One way of drawing the app’s pictures</h1>
  <p class="lede">The chip stack on the start card is the reference: chunky, flat, three materials, seen from a little above, standing on a soft shadow. This board turns it into a system — the rules it follows, its parts and colours, and every illustration the app needs redrawn to match, including new candidates for the three that weren’t working: <b style="color:${C.ink}">Sessions</b>, <b style="color:${C.ink}">Poker tools</b> and the <b style="color:${C.ink}">Stand-up game</b>.</p>${REVIEW ? `
  <p class="lede" style="margin-top:10px">Under every drawing in <b style="color:${C.ink}">The set</b>: tap <b style="color:${C.ink}">Approve</b> or <b style="color:${C.ink}">Needs work</b>, and say what to change in the box. Everything saves as you go, and Claude reads it from here.</p>` : ''}
</header>
${REVIEW ? `<div class="rvbar" role="status"><b>Review</b><div class="cnt"><span id="cA" class="a">0 approved</span><span id="cC" class="c">0 need work</span><span id="cO">to review</span></div><span id="rvnote" class="rvnote" hidden></span></div>` : ''}

<section class="sec">
  <h2>Round 26 — the Straddle, its seats the other way round</h2>
  <p>From chat: keep the curve of the seats as it was and change only the direction; and show the same view with the chips on a straight line. L is the approved drawing mirrored, and is on the screens below. M is a second reading of the same note. N to Q put the three stacks on a line.</p>
  <div class="group"><div class="ghead"><h3>The curve</h3><p>one chip the small blind, two the big blind, four the straddle</p></div>
    <div class="optgrid">${[
      ['straddleL', 'L · the approved drawing, mirrored', 'The same curve round the table; the big blind now sits to the straddle’s right, the small blind to the big blind’s right.'],
      ['straddleM', 'M · a curve, reading left to right', 'The straddle in front on the left, the blinds curving away to the right.'],
    ].map(([k, t, n]) => optCell(boosterOption(k, t, n, 'straddle'))).join('')}</div></div>
  <div class="group"><div class="ghead"><h3>On a straight line</h3><p>the same view; straddle, big blind, small blind</p></div>
    <div class="optgrid">${[
      ['straddleN', 'N · a level row', 'Side by side on one line across.'],
      ['straddleQ', 'Q · a level row, touching', 'As N, the stacks closed up.'],
      ['straddleO', 'O · a line running away to the right', 'The straddle nearest, the blinds further off.'],
      ['straddleP', 'P · a steep line, overlapping', 'The same line, steeper: each stack partly behind the one in front.'],
    ].map(([k, t, n]) => optCell(boosterOption(k, t, n, 'straddle'))).join('')}</div></div>
</section>

<section class="sec">
  <h2>Round 25 — the approved tile with the new cards</h2>
  <p>From your comment on the Poker tools tile on the main menu: “lets try changing only the card layout (acc to the updated option above)”. AB’s chips exactly as approved; its single card replaced by round 24’s two framed cards, moved in over the chips. AB stays on the screens until you approve this one.</p>
  <div class="optgrid">${[
    ['toolsAT', 'AT · AB’s chips, the two framed cards', 'The % chip flat and the fire chip resting on it, as on AB; the two framed rulings behind them.'],
  ].map(([k, t, n]) => optCell(toolsTileOption(k, t, n))).join('')}</div>
</section>

<section class="sec">
  <h2>Round 24 — the cards closer, the chips tipped toward you</h2>
  <p>From your note on AP: “need to place cards a bit closer to chips. and turn chips a little bit so that the face value is better visible”. The chips still lie on the table, but tip toward you so their faces read rounder; their edges are drawn thinner to match. Button game D is on the screens below.</p>
  <div class="optgrid">${[
    ['toolsAQ', 'AQ · cards closer, chips tipped toward you', 'The cards moved in over the chips, each chip tipped and turned a few degrees.'],
    ['toolsAR', 'AR · as AQ, tipped further', 'The faces rounder still: the % and the fire read at a glance.'],
    ['toolsAS', 'AS · the chips over the cards’ feet', 'As AQ, the chips nearer, overlapping the bottom of the cards.'],
  ].map(([k, t, n]) => optCell(toolsTileOption(k, t, n))).join('')}</div>
</section>

<section class="sec">
  <details class="more">
  <summary><h2>Round 23 — chips on the table, two rulings, and the Button game <span>earlier</span></h2></summary>
  <p>Two notes, and one request in chat. On AN: “this way to show cards. try alt chips position (put on table) too”. On Rulings F: “try this with 2 cards”. And the Button game: too little as it stands; try the star chip on its edge so its face is fully visible.</p>
  <div class="group"><div class="ghead"><h3>Poker tools</h3><p>AN’s framed cards; the chips on the table</p></div>
    <div class="optgrid">${[
      ['toolsAO', 'AO · the chips on the table, one resting on the other', 'AB’s pair: the % chip flat, the fire chip resting on its edge.'],
      ['toolsAP', 'AP · the chips flat, side by side', 'Both chips lying face up on the table, touching.'],
    ].map(([k, t, n]) => optCell(toolsTileOption(k, t, n))).join('')}</div></div>
  <div class="group"><div class="ghead"><h3>Rulings, on the Poker tools screen</h3></div>
    <div class="optgrid">${[
      ['rulingsG', 'G · F with two cards', 'Two framed rulings fanned, the chip stack at their foot.'],
    ].map(([k, t, n]) => optCell(toolsTileOption(k, t, n, { name: 'Rulings', sub: 'look up a ruling', level: 'tools', c: -10 }))).join('')}</div></div>
  <div class="group"><div class="ghead"><h3>Button game</h3><p>in its Game boosters row, and at the head of its sheet</p></div>
    <div class="optgrid">${[
      ['buttonB', 'B · the star button on its edge', 'One bone button standing up, the star facing you: as big as the row allows.'],
      ['buttonD', 'D · on its edge, on top of the buttons won', 'The star button standing on the stack, like the Stand-up game’s J.'],
      ['buttonE', 'E · three buttons on their edges', 'Three star buttons standing together: collecting them is the game.'],
    ].map(([k, t, n]) => optCell(boosterOption(k, t, n))).join('')}</div></div>
  </details>
</section>

<section class="sec">
  <details class="more">
  <summary><h2>Round 22 — one card face for every card <span>earlier</span></h2></summary>
  <p>From your note on Rulings D: “use this card face for each of the variants where we show cards (regardless if they are face up or down - make all cards in this group appear only in this way)”. Every card in the round-21 options is now D’s: bone, a red inner frame, its mark inside. The ace keeps its spade; the card backs become rulings.</p>
  <div class="group"><div class="ghead"><h3>Poker tools</h3><p>round 21’s three, with the framed cards</p></div>
    <div class="optgrid">${[
      ['toolsAL', 'AL · AI with the framed cards', 'The ace (its spade in the frame) and the ruling, the chips standing in front.'],
      ['toolsAM', 'AM · AJ with the framed card', 'One framed ruling, the chips standing in front.'],
      ['toolsAN', 'AN · AK with the framed cards', 'The card back is now a second ruling: two framed ?s, the chips in front.'],
    ].map(([k, t, n]) => optCell(toolsTileOption(k, t, n))).join('')}</div></div>
  <div class="group"><div class="ghead"><h3>Rulings, on the Poker tools screen</h3><p>first: the one the note was on</p></div>
    <div class="optgrid">${[
      ['rulingsD', 'D · a framed card face', 'Where the note was left.'],
      ['rulingsE', 'E · B with the framed cards', 'Two framed rulings fanned, the back one replacing B’s card back.'],
      ['rulingsF', 'F · C with the framed card', 'The framed ruling with the chip stack at its foot.'],
    ].map(([k, t, n]) => optCell(toolsTileOption(k, t, n, { name: 'Rulings', sub: 'look up a ruling', level: 'tools', c: -10 }))).join('')}</div></div>
  </details>
</section>

<section class="sec">
  <details class="more">
  <summary><h2>Round 21 — the chips facing front, and a fuller Rulings card <span>earlier</span></h2></summary>
  <p>Two comments. On the menu’s Poker tools: “also try positioning chips face to (like cards) front”. On the Poker tools screen’s Rulings: “lets try more poptions for this one, looks too empty/white when applied”.</p>
  <div class="group"><div class="ghead"><h3>Poker tools, the chips standing face to the front</h3><p>the cards from round 20, the chips as on N</p></div>
    <div class="optgrid">${[
      ['toolsAI', 'AI · two cards, the chips facing front', 'AF’s ace and ruling, the % chip and the fire chip standing up in front of them, faces out.'],
      ['toolsAJ', 'AJ · one card, the chips facing front', 'AE’s single card, the same two chips standing in front of it.'],
      ['toolsAK', 'AK · a card back and the ruling, the chips facing front', 'AH’s pair, the chips standing.'],
    ].map(([k, t, n]) => optCell(toolsTileOption(k, t, n))).join('')}</div></div>
  <div class="group"><div class="ghead"><h3>Rulings, on the Poker tools screen</h3><p>shown in its tile at that screen’s size</p></div>
    <div class="optgrid">${[
      ['rulings', 'Now · the card alone', 'Approved in round 1. White card on a white tile: the emptiness you saw. (For comparison.)'],
      ['rulingsB', 'B · the ruling over a card back', 'A red card back behind it, so the tile carries a block of colour.'],
      ['rulingsC', 'C · the ruling with chips at its foot', 'A short stack beside the card: the same chips as the other two tiles.'],
    ].map(([k, t, n]) => { const o = toolsTileOption(k, t, n, { name: 'Rulings', sub: 'look up a ruling', level: 'tools', c: -10 }); return k === 'rulings' ? `<figure class="opt" style="margin:0">${o.html}<figcaption><b>${t}</b><span>${n}</span></figcaption></figure>` : optCell(o); }).join('')}</div></div>
  </details>
</section>

<section class="sec">
  <details class="more">
  <summary><h2>Round 20 — the Poker tools drawing, reworked <span>earlier</span></h2></summary>
  <p>From your comment on the menu: “need to rework this icon. try putting card closer to chips, try 2 cards (position them like on 7-2 game ison)”. Each is shown in the menu’s tile at its real size. The chips are AB’s, unchanged.</p>
  <div class="optgrid">${[
    ['toolsAB', 'Now · AB', 'The card well behind and left of the chips. (Shown for comparison; approve or comment on it in Approved below.)'],
    ['toolsAE', 'AE · the card closer to the chips', 'One Rulings card, moved in so its foot sits behind the % chip.'],
    ['toolsAF', 'AF · two cards, as on the 7-2 game', 'An ace and the Rulings card, fanned the way 7-2’s are, the chips in front of them.'],
    ['toolsAG', 'AG · two cards, the chips beside them', 'The same pair smaller and to the left, the chips to their right, less overlap.'],
    ['toolsAH', 'AH · a card back and the ruling', 'As AF, the ace swapped for a card face down, so the only face is the ruling.'],
  ].map(([k, t, n]) => { const o = toolsTileOption(k, t, n); return k === 'toolsAB' ? `<figure class="opt" style="margin:0">${o.html}<figcaption><b>${t}</b><span>${n}</span></figcaption></figure>` : optCell(o); }).join('')}</div>
  </details>
</section>

<section class="sec">
  <h2>The screens they land on, in Fresh Deck</h2>
  <p>Updated 21 November with the tile layout you picked: the name on top at 19, the drawing in the bottom-right corner placed by its outline (4d). Drawn on the locked Fresh Deck direction from your style page: its layout, type, colours and copy, with the approved drawings in place of its placeholder icons. The drawings keep their approved shapes; their ink and red are Fresh Deck’s. Results and Tonight carry none: a spot names a place or a game, and those screens are rows and figures.</p>
  ${freshDeckScreens(PICK)}
</section>

<section class="sec">
  <details class="more">
  <summary><h2>Round 19 — name on top, the drawing placed by its outline <span>decided</span></h2></summary>
  <p>Chosen 21 November: <b style="color:${C.ink}">4d, the name at 19</b>, now on the screens above. 19 is one step under the start button’s 21 and well over the 13 of the small lines, so the tiles read as the next level down without competing with it.</p>
  ${ROUND19.map(([title, quote, was, opts]) => {
    const before = ROUND18.flatMap((g) => g[3]).map((o) => variantOption(o, PICK)).find((o) => o.key === was);
    return `<div class="group"><div class="ghead"><h3>${title}</h3><p>first: the one you reviewed · then ${opts.length} new</p></div>
      <blockquote class="quote">“${quote}”</blockquote>
      <div class="optgrid">${[before, ...opts.map((o) => anchoredOption(o, PICK))].map(optCell).join('')}</div></div>`;
  }).join('')}
  </details>
</section>

<section class="sec">
  <h2>How a drawing’s size is picked</h2>
  <p>By how much it paints, not by its box. A lone chip fills most of its square; three chips with gaps between them fill much less, so at one box size the lone chip looks heavier. Each drawing is scaled so the area it paints is a fixed share of its tile: the side of that painted area is <b style="color:${C.ink}">${RHO.home} of the tile’s side on Home</b>, where the tiles are the places you go, and <b style="color:${C.ink}">${RHO.tools} on Poker tools</b>, one level down, where they are tools on a page you are already on. Your corrections on Home (the group and the calendar a little smaller) fall out of the rule on their own; and it is what brings Poker tools down.</p>
  <div class="fd" style="overflow-x:auto;max-width:100%">${sizingTable(PICK)}</div>
</section>

<section class="sec">
  <h2>The set so far</h2>
  <p>One drawing per place in the app, from what you’ve approved. All fifteen are settled.</p>
  ${setSoFar()}
</section>

<section class="sec">
  <h2>Approved</h2>
  <p>The settled ones. Tap Approve again to take one back.</p>
  <div class="grid">${APPROVED.map((k) => cell(k)).join('')}</div>
</section>

<section class="sec">
  <details class="more">
    <summary><h2>Not marked yet <span>${UNMARKED.length}</span></h2></summary>
    <p>Options from earlier rounds with no verdict, the Stand-up game among them. Approve any you want to keep; the rest are taken as passed over.</p>
    <div class="grid">${UNMARKED.map((k) => cell(k)).join('')}</div>
  </details>
  <details class="more">
    <summary><h2>Earlier rounds <span>${EARLIER_SHOWN.length}</span></h2></summary>
    <p>Drawings you sent back, kept with your notes on them. Each has been answered by a later round.</p>
    <div class="grid">${EARLIER_SHOWN.map((k) => cell(k)).join('')}</div>
  </details>
</section>

<section class="sec">
  <h2>Two families, and which is which</h2>
  <p>The app already has a line-icon set in <code>Icon.tsx</code>, matched path for path to the boards. It stays. Spots are a second family, for a different job, and the two never stand in for each other.</p>
  <div class="fam">
    <div><h3>Glyphs — actions and labels</h3><div class="row">${GLYPHS.join('')}</div><p>One colour, a 1.7–2.3 stroke, 15–21 pt. In rows, bars, buttons, beside a figure. Unchanged.</p></div>
    <div><h3>Spots — places and games</h3><div class="row">${['session', 'bombPot', 'sessionsA', 'toolsA', 'standUpA'].map((k) => spot(k, 'light', { size: 56 })).join('')}</div><p>Full colour, 32–96 pt. On a card or tile that opens a place, at the head of a game’s description, in an empty state.</p></div>
  </div>
</section>

<section class="sec">
  <h2>The material</h2>
  <p>Everything is assembled from the same few parts in <code>art.mjs</code> — a chip, a stack, a chip on its edge, a card, a bomb, a flame — so a new drawing inherits the projection and the colours instead of guessing them.</p>
  <div class="mat">
    <div class="box">${anatomy()}</div>
    <div class="matr">
      <div class="box proj">${projection()}<p style="max-width:220px">Every spot is drawn on a 96 × 96 box with the ground at 84, and shown through an 88 × 88 window from (4, 12). Flat things are ellipses at 0.34; standing things are face-on. The light is always upper left, which is why a chip’s side is the darker colour.</p></div>
      <div class="swrow">${swatches('light')}${swatches('dark')}</div>
    </div>
  </div>
</section>

<section class="sec">
  <h2>Sizes</h2>
  <p>Four sizes and no others. At 44 and below the fine detail goes — dashes, inlay, letters, card indices — and the silhouette and inserts carry it.</p>
  ${sizes()}
</section>

<section class="sec">
  <h2>The rules</h2>
  <p>Short enough to hold in your head while drawing the next one.</p>
  <div class="rules">${RULES.map(([a, b]) => `<div><b>${a}</b><p>${b}</p></div>`).join('')}</div>
</section>

<section class="sec">
  <h2>Open</h2>
  <div class="open">${OPEN.map(([a, b]) => `<div><b>${a}</b><p>${b}</p></div>`).join('')}</div>
  ${REVIEW ? `<div class="gen cell" data-key="general" style="margin-top:18px"><b>Anything else</b><p>The rules, the colours, the sizes, the mockups — anything that isn’t one drawing.</p>${reviewBlock('general', 'the board as a whole').replace('<div class="rvb">', '<div class="rvb" hidden>')}</div>` : ''}
</section>

</main>
${REVIEW ? REVIEW_JS() : ''}
</body>
</html>
`;

const html = page();
writeFileSync(join(here, 'Icon System.html'), html);
console.log('wrote Icon System.html', (html.length / 1024).toFixed(0) + ' KB');

if (artifactAt) {
  REVIEW = true;
  /* The publish wraps the page in its own document, so the wrapper goes. */
  const out = page()
    .replace(/^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/, '')
    .replace('</head>\n<body>\n', '')
    .replace('</body>\n</html>\n', '');
  writeFileSync(artifactAt, out);
  console.log('wrote', artifactAt, (out.length / 1024).toFixed(0) + ' KB');
}
