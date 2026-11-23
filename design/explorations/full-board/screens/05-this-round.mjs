/**
 * This round: options for Add players (owner, 23 November: "let's iterate on the shapes and looks of
 * the value entry area and an 'add' button"). Same sheet, same people, same words; only the buy-in
 * entry on an added row, the Add control on the others, and the new-player line change.
 */
import { sheet, bar, label, card, row, field, ico } from '../kit.mjs';

const PEOPLE = [
  ['Andro', 'played 22 November · host', '500'], ['Dana', 'played 22 November · 1 night', '500'], ['Ivo', 'played 22 November · 1 night', null],
  ['Lena', 'played 22 November · 1 night', '800'], ['Petr', 'played 22 November · 1 night', null], ['Radka', 'played 22 November · 1 night', null],
  ['Tomáš', 'played 22 November · 1 night', null],
];
const tick = `<span class="win" style="display:grid;place-items:center">${ico('check', 14)}</span>`;
const inkPlus = (size = 28) => `<span style="width:${size}px;height:${size}px;border-radius:50%;background:var(--pri);color:var(--onpri);display:grid;place-items:center;flex:none">${ico('plus', Math.round(size * 0.55))}</span>`;
const lift = 'box-shadow:0 0 0 1px rgba(20,26,42,.06),0 1px 2px rgba(20,26,42,.08),0 5px 10px -7px rgba(20,26,42,.3);background:var(--card)';

const OPTIONS = {
  /* A — as drawn: an outlined box with the figure, an outlined Add pill, a dashed field and a dead Add. */
  a: {
    added: (v) => `${tick}<span class="fi" style="min-height:34px;width:50px;padding:0 6px;font-size:14px;justify-content:flex-end;flex:none"><span class="num" style="font-weight:700">${v}</span></span>`,
    add: () => `<span class="btn2" style="height:34px;padding:0 14px;border-radius:999px;font-size:13px;flex:none">Add</span>`,
    fresh: `<div style="display:flex;gap:8px;align-items:center"><div class="fi ph" style="flex:1;box-shadow:none;border:1.5px dashed var(--outline);font-size:13.5px;min-height:44px;white-space:nowrap">New player — type a name</div><span class="btn2 dead" style="height:44px;padding:0 14px;border-radius:12px;font-size:13px;flex:none">Add</span></div>`,
  },
  /* B — the chips' language: the figure in a soft pill with $, Add as the ink round plus the name chips use. */
  b: {
    added: (v) => `<span style="display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 10px 0 8px;border-radius:999px;background:var(--raised);flex:none">${tick}<span class="num" style="font:700 15px/1 var(--head)"><span class="muted" style="font-weight:500">$</span>${v}</span></span>`,
    add: () => inkPlus(30),
    fresh: `<div class="fi ph" style="justify-content:space-between;font-size:13.5px;padding-right:7px">New player — type a name${inkPlus(30).replace('background:var(--pri)', 'background:var(--outline)')}</div>`,
  },
  /* C — the seat's figure: the buy-in written large with a dashed underline, as on New session’s seats; Add as a lifted chip with its plus. */
  c: {
    added: (v) => `<span class="num" style="font:700 16.5px/1.1 var(--head);padding-bottom:2px;border-bottom:1.5px dashed var(--outline);flex:none">$${v}</span>${tick}`,
    add: () => `<span style="display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 6px 0 12px;border-radius:10px;font:600 13.5px/1 var(--body);${lift};flex:none">Add${inkPlus(22)}</span>`,
    fresh: `<div style="display:flex;align-items:center;gap:10px;min-height:48px;padding:0 8px 0 14px;border-radius:12px;${lift}"><span class="muted" style="flex:1;font-size:13.5px;white-space:nowrap">New player — type a name</span><span style="display:inline-flex;align-items:center;gap:6px;font:600 13.5px/1 var(--body);color:var(--dim)">Add${inkPlus(22).replace('background:var(--pri)', 'background:var(--outline)')}</span></div>`,
  },
  /* D — the row is the control: a round tick at the left marks who is in; the buy-in is an outlined money box only on those rows. */
  d: {
    lead: (on) => on ? `<span style="width:24px;height:24px;border-radius:50%;background:var(--pri);color:var(--onpri);display:grid;place-items:center">${ico('check', 14)}</span>` : `<span style="width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--outline);display:block"></span>`,
    added: (v) => `<span class="fi" style="min-height:36px;width:72px;padding:0 10px;font-size:14px;flex:none"><span class="muted">$</span><span class="num" style="font-weight:700">${v}</span></span>`,
    add: () => '',
    fresh: `<div class="fi" style="padding:0 6px 0 14px;box-shadow:inset 0 0 0 1.5px var(--outline)"><span class="dimt" style="font-weight:400;font-size:13.5px;white-space:nowrap">New player — type a name</span><span style="height:34px;padding:0 14px;border-radius:9px;background:var(--pri);color:var(--onpri);display:inline-flex;align-items:center;font:700 13px/1 var(--head);opacity:.35">Add</span></div>`,
  },
};

const playersSheet = (o) => sheet({ behind: 'The Thursday game', title: 'Add players', tall: true, stepBack: true,
  body: [
    field('', 'Search by name', { placeholder: true }),
    label('Most recent first', { quiet: true }),
    card(PEOPLE.map(([name, meta, v]) => row({ name, meta, lead: o.lead ? o.lead(!!v) : '', trail: v ? o.added(v) : o.add() })), { style: 'padding:0 8px 0 10px' }),
    o.fresh,
  ],
  bar: bar('Done · 3 seated') });

const C = OPTIONS.c;
const kp = `<div class="kp" style="margin:0 -20px">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((k) => `<span>${k}</span>`).join('')}<span>${ico('backspace', 22)}</span></div>`;
const sheetC = (rows, extra = [], barText = 'Done · 3 seated', search = 'Search by name', searching = false) => sheet({ behind: 'The Thursday game', title: 'Add players', tall: true, stepBack: true,
  body: [field('', search, { placeholder: !searching, focus: searching }), ...(rows.length ? [label('Most recent first', { quiet: true }), card(rows, { style: 'padding:0 8px 0 10px' })] : []), ...extra],
  bar: bar(barText) });
const caret = (h = 15) => `<span style="display:inline-block;width:1.5px;height:${h}px;background:var(--text);vertical-align:-2px;margin-left:1px"></span>`;
const r = (name, meta, v, { editing = false } = {}) => row({ name, meta, trail: v ? (editing ? `<span class="num" style="font:700 16.5px/1.1 var(--head);padding:2px 6px;border-radius:6px;box-shadow:inset 0 0 0 2px var(--text);flex:none">$${v}${caret()}</span>${tick}` : C.added(v)) : C.add() });
const ALL = () => PEOPLE.map(([n, m, v]) => r(n, m, v));
const typedNew = (name, ok = true) => `<div style="display:flex;align-items:center;gap:10px;min-height:48px;padding:0 8px 0 14px;border-radius:12px;background:var(--card);box-shadow:inset 0 0 0 2px var(--text)"><span style="flex:1;font:600 15px/1 var(--body);white-space:nowrap">${name}${caret(16)}</span><span style="display:inline-flex;align-items:center;gap:6px;font:600 13.5px/1 var(--body);${ok ? '' : 'color:var(--dim)'}">Add${ok ? inkPlus(22) : inkPlus(22).replace('background:var(--pri)', 'background:var(--outline)')}</span></div>`;


/*
 * The standard buy-in (owner, 23 November: "there is a default buy-in, editable, and the default should
 * appear prefilled once the player is added"). The sheet says the standard once, under its title. Add
 * seats the player at it at once: the figure appears where Add was, prefilled, and the row glows for a
 * moment so the eye finds it. The figure stays tappable; a different amount says how far it is from
 * the standard, in the app's own words ("$300 above the standard").
 */
const STD = 500;
const stdSheet = (rows, extra = [], barText, barLine = '') => sheet({ behind: 'The Thursday game', title: 'Add players', sub: `Each player starts at the standard buy-in, $${STD}. Tap a figure to change it.`, tall: true, stepBack: true,
  body: [field('', 'Search by name', { placeholder: true }), label('Most recent first', { quiet: true }), card(rows, { style: 'padding:0 8px 0 10px' }), ...extra],
  bar: bar(barText, barLine ? { line: barLine } : {}) });
const glow = (html) => html.replace('<div class="row', '<div style="margin:0 -10px;padding:0 10px;border-radius:10px;background:color-mix(in srgb,var(--win) 9%,transparent);box-shadow:inset 3px 0 0 var(--win)"><div class="row').replace(/<\/div>$/, '</div></div>');
const above = (v) => (v > STD ? `$${(v - STD).toLocaleString('en-US')} above the standard` : v < STD ? `$${(STD - v).toLocaleString('en-US')} below the standard` : '');
const seat = (name, meta, v, opts = {}) => {
  const html = r(name, v && v !== STD ? above(v) : meta, v ? v.toLocaleString('en-US') : v, opts);
  /* Opened for typing, the prefilled figure is selected, so the first digit replaces it. */
  return opts.editing ? html.replace(/(\$[\d,]+)(<span style="display:inline-block;width:1.5px)/, '<span style="background:color-mix(in srgb,var(--text) 18%,transparent);border-radius:3px;padding:0 2px">$1</span>$2') : html;
};
const BASE = [['Andro', 'played 22 November · host', 500], ['Dana', 'played 22 November · 1 night', 500], ['Lena', 'played 22 November · 1 night', 800]];
const ROWS = (ivo, opts = {}) => [
  seat(...BASE[0]), seat(...BASE[1]),
  ivo === null ? r('Ivo', 'played 22 November · 1 night', null) : (opts.glow ? glow(seat('Ivo', 'played 22 November · 1 night', ivo, opts)) : seat('Ivo', 'played 22 November · 1 night', ivo, opts)),
  seat(...BASE[2]),
  r('Petr', 'played 22 November · 1 night', null),
];

export const section = { title: 'This round: Add players, version C in every state, and the standard buy-in',
  blurb: 'The version you picked to see further: the buy-in written like a seat’s, Add as a small lifted chip. Every state the sheet has: at rest, a buy-in being typed, searching, a search with no match, a new name typed, and a name already at the table. Words are the app’s.' };

export default [
  { id: 'c-std-1', route: '/new-night', name: 'Add players C · the standard, before Add', nav: 'sheet', note: 'The sheet says the standard buy-in once, under its title. Ivo has not been added yet.',
    flags: ['The line under the title is draft; “Standard buy-in” is the app’s own name for it (Game details).'],
    html: stdSheet(ROWS(null), [], 'Done · 3 seated', '$1,800 on the table') },
  { id: 'c-std-2', route: '/new-night', name: 'Add players C · added, at the standard', nav: 'sheet', note: 'One tap on Add: Ivo is seated at $500, prefilled where Add was. The row glows for a moment so the eye finds it; the bar counts four and the total moves on.',
    flags: ['The glow is new: it fades after about a second. The total is the board’s own sum of the four figures.'],
    html: stdSheet(ROWS(500, { glow: true }), [], 'Done · 4 seated', '$2,300 on the table') },
  { id: 'c-std-3', route: '/new-night', name: 'Add players C · changing the prefilled buy-in', nav: 'sheet', note: 'Tapping the prefilled figure opens it ringed, with the keypad: the $500 is selected, so the first digit replaces it.', allowOverflow: true,
    html: sheet({ behind: 'The Thursday game', title: 'Add players', sub: `Each player starts at the standard buy-in, $${STD}. Tap a figure to change it.`, tall: true, stepBack: true,
      body: [card([seat(...BASE[0]), seat(...BASE[1]), seat('Ivo', 'played 22 November · 1 night', 500, { editing: true }), seat(...BASE[2])], { style: 'padding:0 8px 0 10px' }), kp], bar: bar('Done', { line: '$2,300 on the table' }) }) },
  { id: 'c-std-4', route: '/new-night', name: 'Add players C · a buy-in off the standard', nav: 'sheet', note: 'Typed to $1,000: the line under Ivo says by how much, in the app’s words, as Lena’s already does. A figure at the standard says nothing.',
    html: stdSheet(ROWS(1000), [], 'Done · 4 seated', '$2,800 on the table') },
  { id: 'c-rest', route: '/new-night', name: 'Add players C · at rest', nav: 'sheet', note: 'Three added with their buy-ins; the rest each with Add; the new-player line grey until a name is typed.', html: sheetC(ALL(), [C.fresh]) },
  { id: 'c-amount', route: '/new-night', name: 'Add players C · typing a buy-in', nav: 'sheet', note: 'Tapping a figure opens it in place, ringed, with the keypad under the list; the bar becomes Done with the total on its line, as on New session.', flags: ['The total is the three buy-ins on the board ($1,800); typing Lena’s changes it live.'],
    html: sheet({ behind: 'The Thursday game', title: 'Add players', tall: true, stepBack: true, body: [card(PEOPLE.slice(0, 4).map(([n, m, v]) => r(n, m, v, { editing: n === 'Lena' })), { style: 'padding:0 8px 0 10px' }), kp], bar: bar('Done', { line: '$1,800 on the table' }) }) },
  { id: 'c-search', route: '/new-night', name: 'Add players C · searching', nav: 'sheet', note: 'Typing narrows the roster as you go; a match keeps its Add or its figure.', html: sheetC([r('Petr', 'played 22 November · 1 night', null)], [C.fresh], 'Done · 3 seated', 'Pe', true) },
  { id: 'c-nomatch', route: '/new-night', name: 'Add players C · nobody by that name', nav: 'sheet', note: 'No match: the app’s line points at the field below, and the name typed in the search carries down into it, its Add live.', flags: ['Carrying the searched name into the new-player field is new; the app leaves that field empty.'], html: sheetC([], [`<p class="note">Nobody called “Marek” — type the name below to add them.</p>`, typedNew('Marek')], 'Done · 3 seated', 'Marek', true) },
  { id: 'c-new', route: '/new-night', name: 'Add players C · a new name typed', nav: 'sheet', note: 'A name typed in the new-player line: its Add turns ink. Adding seats them at the standard buy-in, which then shows as a figure like the others.', html: sheetC(ALL().slice(0, 4), [typedNew('Marek')]) },
  { id: 'c-taken', route: '/new-night', name: 'Add players C · that name is here', nav: 'sheet', note: 'A name already at the table: Add stays grey and the app’s line says why.', html: sheetC(ALL().slice(0, 4), [typedNew('Lena', false), `<p class="note">Lena is already here</p>`]) },
];
