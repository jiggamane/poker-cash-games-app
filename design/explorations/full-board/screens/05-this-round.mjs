/**
 * This round: options for Add players (owner, 23 November: "let's iterate on the shapes and looks of
 * the value entry area and an 'add' button"). Same sheet, same people, same words; only the buy-in
 * entry on an added row, the Add control on the others, and the new-player line change.
 */
import { sheet, bar, label, card, row, field, ico, note, button, quiet } from '../kit.mjs';
import { eyebrow, shareRow, codeHero, qrWide } from './20-getting-in.mjs';
import { qrSvg, inviteLink } from '../qr.mjs';
const MCODE = 'R4D-9WT';

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
    added: (v) => `<span class="num" style="font:700 16.5px/1.1 var(--head);padding-bottom:2px;border-bottom:1.5px dashed var(--outline);flex:none;${String(v).replace(/,/g, '') === '500' ? 'color:var(--muted)' : ''}">$${v}</span>`,
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
const sheetC = (rows, extra = [], barText = 'Done · 3 seated', search = 'Search by name', searching = false) => sheet({ behind: 'The Thursday game', title: 'Add players', sub: 'Each player starts at the standard buy-in, $500. Tap a figure to change it.', tall: true, stepBack: true,
  body: [field('', search, { placeholder: !searching, focus: searching }), ...(rows.length ? [label('Most recent first', { quiet: true }), card(rows, { style: 'padding:0 8px 0 10px' })] : []), ...extra],
  bar: bar(barText, { line: barText.includes('4') ? '$2,300 on the table' : '$1,800 on the table' }) });
const caret = (h = 15) => `<span style="display:inline-block;width:1.5px;height:${h}px;background:var(--text);vertical-align:-2px;margin-left:1px"></span>`;
/*
 * One line per player (owner, 23 November): the name and its buy-in, nothing under the name, no tick.
 * Nobody approves a buy-in, so nothing marks one as done. What the lost line said, the figure now says:
 * at the standard it sits quiet, in the muted ink; changed, it is full ink, so a different amount stands
 * out without a sentence.
 */
const r = (name, meta, v, { editing = false } = {}) => row({ name, trail: v ? (editing ? `<span class="num" style="font:700 16.5px/1.1 var(--head);padding:2px 6px;border-radius:6px;box-shadow:inset 0 0 0 2px var(--text);flex:none">$${v}${caret()}</span>` : C.added(v)) : C.add() }).replace('class="row"', 'class="row" style="min-height:52px"');
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

export const section = { title: 'This round: Add players, one line per player',
  blurb: 'The version you picked to see further: the buy-in written like a seat’s, Add as a small lifted chip. Every state the sheet has: at rest, a buy-in being typed, searching, a search with no match, a new name typed, and a name already at the table. Words are the app’s.' };

export default [
  { id: 'c-std-1', route: '/new-night', name: 'Add players C · the standard, before Add', nav: 'sheet', note: 'The sheet says the standard buy-in once, under its title. Ivo has not been added yet.',
    flags: ['The line under the title is draft; “Standard buy-in” is the app’s own name for it (Game details).'],
    html: stdSheet(ROWS(null), [C.fresh], 'Done · 3 seated', '$1,800 on the table') },
  { id: 'c-std-2', route: '/new-night', name: 'Add players C · added: the standard is set, no keypad', nav: 'sheet', note: 'One tap on Add and Ivo is in at $500, prefilled where Add was. Nothing opens: no keypad, no field to fill. The row glows for a moment so the eye finds it; the bar counts four and the total moves on. Adding the next player is the next tap.',
    flags: ['The glow is new: it fades after about a second. The total is the board’s own sum of the four figures.'],
    html: stdSheet(ROWS(500, { glow: true }), [], 'Done · 4 seated', '$2,300 on the table') },
  { id: 'c-std-3', route: '/new-night', name: 'Add players C · only if the figure is tapped: the keypad', nav: 'sheet', note: 'The keypad appears only when the admin taps the figure itself (the dashed underline says it can be tapped); adding a player never opens it. The $500 opens ringed and selected, so the first digit replaces it; Done closes the keypad and keeps the list.', allowOverflow: true,
    html: sheet({ behind: 'The Thursday game', title: 'Add players', sub: `Each player starts at the standard buy-in, $${STD}. Tap a figure to change it.`, tall: true, stepBack: true,
      body: [card([seat(...BASE[0]), seat(...BASE[1]), seat('Ivo', 'played 22 November · 1 night', 500, { editing: true }).replace('<span class="num" style="font:700 16.5px/1.1 var(--head);padding:2px 6px;border-radius:6px;box-shadow:inset 0 0 0 2px var(--text);flex:none">', '<span class="num" style="position:relative;font:700 16.5px/1.1 var(--head);padding:2px 6px;border-radius:6px;box-shadow:inset 0 0 0 2px var(--text);flex:none"><i style="position:absolute;right:-8px;bottom:-10px;width:22px;height:22px;border-radius:50%;background:color-mix(in srgb,var(--text) 16%,transparent);box-shadow:0 0 0 5px color-mix(in srgb,var(--text) 7%,transparent)"></i>'), seat(...BASE[2])], { style: 'padding:0 8px 0 10px' }), kp], bar: bar('Done', { line: '$2,300 on the table' }) }) },
  { id: 'c-std-4', route: '/new-night', name: 'Add players C · a buy-in off the standard', nav: 'sheet', note: 'Typed to $1,000: the figure turns full ink, as Lena’s $800 is, while the ones at the standard stay quiet. No line under the name says by how much any more.',
    html: stdSheet(ROWS(1000), [], 'Done · 4 seated', '$2,800 on the table') },
  { id: 'c-search', route: '/new-night', name: 'Add players C · searching', nav: 'sheet', note: 'Typing narrows the roster as you go; a match keeps its Add or its figure.', html: sheetC([r('Petr', 'played 22 November · 1 night', null)], [C.fresh], 'Done · 3 seated', 'Pe', true) },
  { id: 'c-nomatch', route: '/new-night', name: 'Add players C · nobody by that name', nav: 'sheet', note: 'No match: the app’s line points at the field below, and the name typed in the search carries down into it, its Add live.', flags: ['Carrying the searched name into the new-player field is new; the app leaves that field empty.'], html: sheetC([], [`<p class="note">Nobody called “Marek” — type the name below to add them.</p>`, typedNew('Marek')], 'Done · 3 seated', 'Marek', true) },
  { id: 'c-new', route: '/new-night', name: 'Add players C · a new name typed', nav: 'sheet', note: 'A name typed in the new-player line: its Add turns ink. Adding seats them at the standard buy-in, which then shows as a figure like the others.', html: sheetC(ALL().slice(0, 4), [typedNew('Marek')]) },
  { id: 'c-taken', route: '/new-night', name: 'Add players C · that name is here', nav: 'sheet', note: 'A name already at the table: Add stays grey and the app’s line says why.', html: sheetC(ALL().slice(0, 4), [typedNew('Lena', false), `<p class="note">Lena is already here</p>`]) },

  /*
   * The invitation (owner, 23 November: "more states here, to include the invitation mechanic"). A name
   * typed new is a seat with no account behind it. Once added, the sheet offers to invite them, in the
   * same sheet; the invite is the app's own Invite a player, content replaced, so its code, its four ways
   * to send and its QR are the ones the Players screen already has. Inviting is never required to play.
   */
  { id: 'c-new-added', route: '/new-night', name: 'Add players C · a new player added, the invite offered', nav: 'sheet', allowOverflow: true,
    note: 'Marek is in at the standard, his row glowing like any added player. Under the list, one card offers the invite: what it gives them, and Invite as the same lifted chip as Add. Skipping it costs nothing; the card stays until the sheet closes.',
    flags: ['New words, draft: “Marek is new to the group” and the line under it. The app seats a new name with no invite offered.'],
    html: sheetC([...ALL().slice(0, 4).map((x) => x), glow(seat('Marek', '', 500))], [`<div style="display:flex;align-items:center;gap:12px;padding:12px 8px 12px 14px;border-radius:12px;${lift}"><div style="flex:1;min-width:0"><b style="font:600 14.5px/1.2 var(--body)">Marek is new to the group</b><div class="muted" style="font-size:12.5px;line-height:1.35;margin-top:3px">Invite them and the night, with their money, shows on their phone.</div></div><span style="display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 6px 0 12px;border-radius:10px;font:600 13.5px/1 var(--body);${lift.replace('background:var(--card)', 'background:var(--sheet)')};flex:none">Invite${inkPlus(22)}</span></div>`], 'Done · 4 seated') },
  { id: 'c-invite', route: '/new-night', name: 'Add players C · inviting Marek', nav: 'sheet',
    note: 'Invite replaces the Add players sheet’s content, one close as always: Marek’s own code, Copy, Message, Share and the QR code, as on Invite a player. The back circle returns to the code; the bar returns to the list.',
    flags: ['The parts are Invite a player’s; “Invite Marek” as the title and “Back to the players” are new, draft. Reset the code stays on the Players screen, not here.'],
    html: sheet({ behind: 'The Thursday game', title: 'Invite Marek', sub: 'The Thursday game', tall: true, stepBack: true,
      body: [eyebrow('Marek’s code'), codeHero(MCODE).replace('font-size:31px;letter-spacing:.05em', 'font-size:40px;letter-spacing:.08em'),
        note('One person, one code — it only ever attaches to Marek. It works for a month.'),
        shareRow([['copy', 'Copy'], ['message', 'Message'], ['share', 'Share']]), qrWide],
      bar: bar('Back to the players') }) },
  { id: 'c-invite-qr', route: '/new-night', name: 'Add players C · Marek scans the code', nav: 'sheet',
    note: 'At the table the quickest way: QR code turns the sheet to the code; Marek scans it with the phone’s camera and claims the seat. A real code: it scans to pokerclub://claim?c=R4D-9WT.',
    html: sheet({ behind: 'The Thursday game', title: 'Scan to join', sub: 'Marek · The Thursday game', tall: true, stepBack: true,
      body: [`<div style="display:grid;place-items:center;margin-top:8px">${qrSvg(inviteLink(MCODE))}</div>`,
        `<div class="num" style="font-weight:700;font-size:17px;letter-spacing:.05em;text-align:center">${MCODE}</div>`,
        `<p class="note" style="text-align:center">If the camera will not read it, the code can be typed.</p>`],
      bar: bar('Back to the players') }) },
  { id: 'c-invited', route: '/new-night', name: 'Add players C · back to the list, Marek invited', nav: 'sheet',
    note: 'Back on the list the offer is gone and Marek’s row carries a small Invited tag after his name until he claims the seat; then it is an ordinary row.',
    flags: ['“Invited” as a tag is new.'],
    html: sheetC([...ALL().slice(0, 4), seat('Marek <span style="font:700 10px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;padding:4px 7px;border-radius:999px;background:var(--raised);color:var(--muted);vertical-align:2px;margin-left:6px">Invited</span>', '', 500)], [C.fresh], 'Done · 4 seated') },
];
