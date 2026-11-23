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

export const section = { title: 'This round: Add players, the buy-in and the Add',
  blurb: 'Four ways to draw the buy-in on a player you have added, the Add on the others, and the new-player line. Same sheet and words in each. Approve one.' };

export default [
  { id: 'players-add-a', route: '/new-night', name: 'Add players A · as drawn', nav: 'sheet', note: 'For comparison: an outlined box with the figure, an outlined Add pill, a dashed field.', html: playersSheet(OPTIONS.a) },
  { id: 'players-add-b', route: '/new-night', name: 'Add players B · in the chips’ language', nav: 'sheet', note: 'The buy-in in a soft pill with its $ and the tick inside it; Add is the ink round plus the name chips already use; the new-player field ends in the same plus, grey until a name is typed.', html: playersSheet(OPTIONS.b) },
  { id: 'players-add-c', route: '/new-night', name: 'Add players C · like the seats', nav: 'sheet', note: 'The buy-in written as New session writes a seat: the figure large with a dashed underline, tap to type. Add is a small lifted chip with its plus; the new-player line is a lifted card with the same chip, grey until a name is typed.', html: playersSheet(OPTIONS.c) },
  { id: 'players-add-d', route: '/new-night', name: 'Add players D · the row is the control', nav: 'sheet', note: 'No Add buttons: a round tick at the left of every row, filled for the people in, and tapping a row adds or removes them. Only the added rows carry an outlined money box. The new player types into a field with its own Add inside it.', flags: ['Tapping a row to add someone means tapping it again removes them; the app has Add only.'], html: playersSheet(OPTIONS.d) },
];
