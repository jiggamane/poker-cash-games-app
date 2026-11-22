/**
 * Opening a game: O1 New session and every step behind it. It is ONE sheet whose
 * content is replaced per step (`apps/mobile/app/new-night.tsx`), so every entry
 * here is `/new-night`, and the later steps carry `stepBack`.
 *
 * Words are the app's, read from the source and from the running app with Dana,
 * Andro and Lena seated and Lena's buy-in typed up to 800.
 */
import { art } from '../kit.mjs';
import { sheet, bar, label, card, row, note, para, pill, button, quiet, field, seg, toggle, ico } from '../kit.mjs';

const BEHIND = 'The Thursday game';
const GROUP = 'The Thursday game';

/* ── parts the kit does not have (listed in the report) ───────────────── */

/** The sheet's title with the app's `meta` at its right end ("3 seated"). */
const titled = (title, meta) =>
  `<span style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">${title}<span style="font:600 12.5px/1 var(--body);letter-spacing:0;color:var(--muted);white-space:nowrap">${meta}</span></span>`;

/** A figure typed in place: the symbol beside the digits, in an outlined box. */
const moneyBox = (value, { focus = false, w = 74 } = {}) =>
  `<span class="fi${focus ? ' focus' : ''}" style="min-height:38px;width:${w}px;padding:0 10px;flex:none"><span class="muted">$</span><span class="num" style="font-weight:700">${value}</span></span>`;

/** The game in two lines with its Change pill. */
const summary = card(
  `<div style="display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><div class="num" style="font:700 16px/1.2 var(--head)">$5 / $5 · $500 buy-in</div><div class="muted" style="font-size:12.5px;margin-top:3px">Kitchen &amp; drinks, Group piggy bank</div></div>${pill('Change')}</div>`,
  { pad: true });

/** A seat's tappable figure (dashed underline: it can be typed into) and the tick that unseats. */
const seatFigure = (amount) =>
  `<span class="num" style="font:700 16.5px/1.1 var(--head);padding-bottom:2px;border-bottom:1.5px dashed var(--outline);flex:none">${amount}</span><span style="flex:none">${ico('check', 16)}</span>`;
const seat = (name, meta, amount) => row({ name, meta, trail: seatFigure(amount) });

/** The rest of the group: two columns of one-tap adds, then the dashed "creates something". */
const rest = (names) =>
  `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${names.map((n) => `<span class="chip" style="justify-content:space-between">${n}<span class="muted">${ico('plus', 13)}</span></span>`).join('')}<span class="chip dash">${ico('plus', 13)}Someone new</span></div>`;

/** A block inside a card that is not a single line: a label over a control. */
const block = (inner, last = false) => `<div style="padding:11px 0 12px;${last ? '' : 'border-bottom:1px solid var(--line)'}">${inner}</div>`;
const blockLabel = (name, meta = '') => `<div style="font-weight:600;font-size:15.5px;line-height:1.2;margin-bottom:9px">${name}${meta ? `<small style="display:block;font-weight:400;font-size:12px;color:var(--muted);margin-top:2px">${meta}</small>` : ''}</div>`;

/** A radio mark, and a row that carries one. */
const radio = (on) => `<span style="width:20px;height:20px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--${on ? 'text' : 'outline'});display:grid;place-items:center;flex:none">${on ? '<i style="width:10px;height:10px;border-radius:50%;background:var(--text)"></i>' : ''}</span>`;

/** A small outlined pill button on a row ("Add"). */
const addPill = (dead = false) => `<span class="btn2${dead ? ' dead' : ''}" style="height:34px;padding:0 14px;border-radius:999px;font-size:13px;flex:none">Add</span>`;

/** A membership plan row: name, tag, price, what it is, and its radio. */
const plan = (name, price, body, { tag = '', mine = false } = {}) =>
  `<div class="row" style="align-items:center;padding:12px 0"><span class="n${mine ? ' muted' : ''}" style="font-size:16px"><span style="display:flex;align-items:center;gap:8px">${name}${tag ? `<span style="font:700 10px/1 var(--body);letter-spacing:.1em;color:var(--muted);padding:3px 6px;border-radius:7px;box-shadow:inset 0 0 0 1px var(--outline)">${tag}</span>` : ''}<span class="num" style="margin-left:auto;font-size:14.5px">${price}</span></span><small class="wrap" style="line-height:1.4;margin-top:4px">${body}</small></span>${radio(false)}</div>`;


/*
 * The gate, made inviting (owner, 22 November: "this screen should be more inviting").
 * It opens on the drawing a host sees on Start a session, then the plans as three cards rather than
 * rows on a form: the price large, what it buys under it. Full is the ink card, because it is the one
 * that opens tonight with no limit; your own plan is marked and set back.
 */
const planCard = (name, price, per, body, { tag = '', ink = false, dim = false } = {}) =>
  `<div class="card pad" style="display:grid;gap:6px;${ink ? 'background:var(--pri);color:var(--onpri);box-shadow:var(--lift)' : ''}${dim ? 'opacity:.62' : ''}">
    <div style="display:flex;align-items:center;gap:8px"><b style="font:700 17px/1 var(--head)">${name}</b>${tag ? `<span style="font:700 10px/1 var(--body);letter-spacing:.1em;padding:4px 7px;border-radius:7px;box-shadow:inset 0 0 0 1px ${ink ? 'currentColor' : 'var(--outline)'};opacity:.8">${tag}</span>` : ''}
      <span style="margin-left:auto;display:flex;align-items:baseline;gap:3px"><span class="num" style="font:800 24px/1 var(--head);letter-spacing:-.02em">${price}</span>${per ? `<span style="font-size:12px;opacity:.7">${per}</span>` : ''}</span></div>
    <div style="font-size:13px;line-height:1.4;opacity:.75">${body}</div></div>`;
const gateHero = `<div style="display:flex;align-items:center;gap:14px;margin:-4px 0 2px"><span style="flex:none">${art('session', 84)}</span><p class="lead-p" style="font-size:14.5px">Running a game takes a paid membership. Watching, and your place in the group, stay free.</p></div>`;


/*
 * A rule's save and its removal share the bar (owner, 22 November: "move it to the save button").
 * Save is the wide half; Remove is the narrow end with the trash, its word in the same red the drawer
 * uses for ending a night, and a removal still asks before it happens, as the app's does.
 */
const saveRemove = (save) => `<div class="bar"><div class="acts"><div class="act"><span>${save}</span></div><div class="act sec" style="color:#FF9AA2">${ico('trash', 20)}<span>Remove</span></div></div></div>`;

/* ── the steps ────────────────────────────────────────────────────────── */

const seatedBody = [
  summary,
  label('Who is playing', { quiet: true }),
  card([seat('Dana', '', '$500'), seat('Andro', 'host', '$500'), seat('Lena', '$300 above the standard', '$800')]),
  label('Rest of the group', { quiet: true }),
  rest(['Tomáš', 'Ivo', 'Petr', 'Radka']),
];

const moneyCard = card([
  row({ name: 'Blinds', trail: `${moneyBox('5')}<span class="muted">/</span>${moneyBox('5')}` }),
  block(blockLabel('Straddle') + seg(['No', 'Optional', 'Mandatory'], 0)),
  row({ name: 'Standard buy-in', meta: 'what each seat is filled with', trail: moneyBox('500') }),
  row({ name: 'Currency', meta: 'the group’s book', value: '<b style="color:var(--text)">USD</b>' }),
  block(blockLabel('Round to the nearest', 'applied to what a rule takes') + seg(['1', '10', '50', '100', '1000'], 0), true),
]);

const rulesFootnote = note('These belong to tonight. They are copied from the app default and changing one here changes this game only — the group keeps its own.');

const kinds = ['A share of the win', 'A sum for the table', 'So much each', 'Each, by the hour', 'Out of each buy-in', 'The table, by the hour'];
const chipRow = (items, on, { small = false, tight = false } = {}) =>
  `<div class="chips" style="gap:6px${tight ? ';display:grid;grid-template-columns:1fr 1fr' : ''}">${items.map((t, i) => `<span class="chip${i === on ? ' on' : ''}" style="${tight ? 'height:34px;padding:0 4px;font-size:11.5px;justify-content:center' : small ? 'height:34px;padding:0 10px;font-size:12.5px' : ''}">${t}</span>`).join('')}</div>`;
const howMuch = (n) => `<div style="display:flex;align-items:baseline;gap:8px;margin:0 2px"><span class="fig">${n}</span><span class="muted" style="font:700 19px/1 var(--head)">% of the win</span></div>`;

export const section = { title: 'Opening a game', blurb: 'New session is one sheet: the game in a line, the seating as its body, and every step behind it (game details, a rule, the currency, someone new, the membership gate) replacing its content.' };

export default [
  { id: 'new-night', route: '/new-night', name: 'New session', nav: 'sheet',
    note: 'Nobody seated: the bar is blocked and says what is missing, as the app’s button does.',
    html: sheet({ behind: BEHIND, title: 'New session', sub: GROUP,
      body: [
        summary,
        label('Who is playing', { quiet: true }),
        note('Tap a name to seat them at the standard buy-in.'),
        rest(['Dana', 'Andro', 'Lena', 'Tomáš', 'Ivo', 'Petr', 'Radka']),
      ],
      bar: bar('Pick who is playing', { blocked: true }) }) },

  { id: 'new-night-seated', route: '/new-night', name: 'New session · seated', nav: 'sheet',
    note: 'The running total sits on the bar’s quiet line. A seat’s figure keeps its dashed underline (it is typed in place); the tick takes the seat away.',
    html: sheet({ behind: BEHIND, title: 'New session', sub: GROUP, body: seatedBody,
      bar: bar('Open the table · 3 seated', { line: '$1,800 on the table' }) }) },

  { id: 'new-night-amount', route: '/new-night', name: 'New session · a buy-in open', nav: 'sheet',
    note: 'With an amount open the bar is Done, not Open the table, and the seat count moves up beside the title: both are the app’s behaviour.',
    flags: ['The app draws Done as a small button at the right of an accessory strip with the total at its left. Here the whole bar is Done with the total on its line: is a full-width Done right above a number pad what the owner wants?'],
    html: sheet({ behind: BEHIND, title: titled('New session', '3 seated'), sub: GROUP,
      body: [
        summary,
        label('Who is playing', { quiet: true }),
        card([
          seat('Dana', '', '$500'), seat('Andro', 'host', '$500'),
          `<div style="padding:9px 0 11px"><div style="display:flex;align-items:center;gap:10px"><span class="n" style="flex:1;font-weight:600;font-size:15.5px;line-height:1.2">Lena<small style="display:block;font-weight:400;font-size:12px;color:var(--muted);margin-top:2px">buying in for</small></span>${moneyBox('800', { focus: true, w: 86 })}</div><div class="muted" style="font-size:12px;margin-top:8px">Type the amount Lena is putting in</div></div>`,
        ]),
        label('Rest of the group', { quiet: true }),
        rest(['Tomáš', 'Ivo', 'Petr', 'Radka']),
      ],
      bar: bar('Done', { line: '$1,800 on the table' }) }) },

  { id: 'new-night-second', route: '/new-night', name: 'New session · a second table', nav: 'sheet', allowOverflow: true,
    note: 'Owner, 22 November: no name to type, and the name made from the day of the week. The table is called for you, “Friday, table 2”, beside the one already open; nothing blocks the bar. The first table of a night is simply “Friday”. The sheet scrolls: the rest of the group runs on under the bar.',
    flags: ['The app asks for a table name when a night is already open and blocks Open the table until it has one (“Name this table”); naming it from the day is a change to new-night.tsx.', '“Friday, table 2” and “Friday, table 1 is open” are draft; the day is the night’s own (the board’s night is Friday 20 November).', 'Open: can the automatic name be changed, or is it fixed?'],
    html: sheet({ behind: BEHIND, title: 'New session', sub: GROUP, tall: true,
      body: [
        `<div class="card pad" style="padding:10px 12px"><div style="font:700 10.5px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">This table</div><div style="font:700 17px/1.2 var(--head);margin-top:5px;white-space:nowrap">Friday, table 2</div><div class="muted" style="font-size:12px;display:flex;align-items:center;gap:6px;margin-top:4px"><i style="width:7px;height:7px;border-radius:50%;background:var(--win);display:block"></i>Friday, table 1 is open</div></div>`,
        ...seatedBody,
      ],
      bar: bar('Open the table · 3 seated', { line: '$1,800 on the table' }) }) },

  { id: 'new-night-details', route: '/new-night', name: 'Game details', nav: 'sheet',
    note: 'Behind Change. Currency is the one row that opens a list; it carries no chevron here (nothing points).',
    flags: ['Currency is tappable but, with chevrons gone, nothing on the row says so. Does it need a mark of its own?'],
    html: sheet({ behind: BEHIND, title: 'Game details', sub: GROUP, tall: true, stepBack: true,
      body: [label('The money', { quiet: true }), moneyCard],
      bar: bar('Save details') }) },

  { id: 'new-night-details-rules', route: '/new-night', name: 'Game details · money rules', nav: 'sheet',
    note: 'The same step, scrolled: the rules that are on tonight, each with its switch, and Add a rule as the last row.',
    html: sheet({ behind: BEHIND, title: 'Game details', sub: GROUP, tall: true, stepBack: true,
      body: [
        label('Money rules', { quiet: true }),
        card([
          row({ name: 'Kitchen &amp; drinks', meta: '$0 spent so far · winners, by size of win · paid back to whoever bought it', wrapMeta: true, trail: toggle(true) }),
          row({ name: 'Group piggy bank', meta: '5% of win · split by winners · Radka collects', trail: toggle(true) }),
          row({ name: 'Add a rule', lead: ico('plus', 16) }),
        ]),
        rulesFootnote,
      ],
      bar: bar('Save details') }) },

  { id: 'new-night-details-empty', route: '/new-night', name: 'Game details · no rules yet', nav: 'sheet',
    note: 'A game with no rules: the empty block and three starting points. Save details is still the bar; a group that deducts nothing is finished.',
    html: sheet({ behind: BEHIND, title: 'Game details', sub: GROUP, tall: true, stepBack: true,
      body: [
        label('Money rules', { quiet: true }),
        `<div style="border:1.5px dashed var(--outline);border-radius:14px;padding:14px;display:grid;gap:10px"><div class="h2" style="font-size:17px">No rules yet</div>${note('A rule takes money off the table at settle-up — a bill to split, a piggy bank that carries over, a fee for the host. Most clubs set these once and never touch them again.')}${button('Add the first rule')}</div>`,
        card([['Food &amp; drinks', 'a bill, split between the winners'], ['Group piggy bank', 'a share of each win, saved up'], ['Host fee', 'a flat amount for the house']]
          .map(([name, meta]) => row({ name, meta, trail: `<span class="muted" style="font:700 11px/1 var(--body);letter-spacing:.1em">USE</span>` }))),
      ],
      bar: bar('Save details') }) },

  { id: 'new-night-rule', route: '/new-night', name: 'A rule · Group piggy bank', nav: 'sheet',
    note: 'The rule editor, titled with the rule’s own name. Its top: what it is called, how much, and its ceiling.',
    flags: ['The app’s presets end in a fourth box for typing your own figure (it shows 5 here, and — under Never more than). Drawn as an outlined chip; it has no label in the app.'],
    html: sheet({ behind: BEHIND, title: 'Group piggy bank', tall: true, stepBack: true,
      body: [
        field('Called', 'Group piggy bank'),
        label('How much', { quiet: true }),
        howMuch('5'),
        chipRow(kinds, 0, { tight: true }),
        chipRow(['5%', '10%', '15%', '5'], 0, { small: true }),
        label('Never more than', { quiet: true }),
        chipRow(['No ceiling', '$50', '$100', '<span class="dimt">—</span>'], 0, { small: true }),
        note('The half of a charge nobody states on its own — "five percent" is agreed as "five percent, fifty at most". A figure you type against one name at settle-up still stands whatever this says.'),
      ],
      bar: saveRemove('Save rule') }) },

  { id: 'new-night-rule-rest', route: '/new-night', name: 'A rule · who pays, who holds it', nav: 'sheet',
    note: 'The same step, scrolled. Remove sits in the bar beside Save rule, the owner’s call; a new rule has only Save.',
    flags: ['“Remove” on the bar is short for the app’s “Remove this rule”, to fit the narrow end.'],
    html: sheet({ behind: BEHIND, title: 'Group piggy bank', tall: true, stepBack: true,
      body: [
        label('Charged to', { quiet: true }),
        card([
          row({ name: 'Winners, off their net win', lead: radio(true) }),
          row({ name: 'Everyone at the table', meta: 'A percentage of a loss is not a thing', lead: radio(false), dim: true }),
        ]),
        label('Collected by', { quiet: true }),
        chipRow(['Dana', 'Andro', 'Lena', 'Tomáš', 'Ivo', 'Petr', 'Radka'], 6, { small: true }),
        note('Whoever physically holds this money. They need not be playing — a treasurer who never sits down is exactly this. Leave it unset and it is held by the group.'),
      ],
      bar: saveRemove('Save rule') }) },

  { id: 'new-night-rule-bill', route: '/new-night', name: 'A rule · Kitchen & drinks', nav: 'sheet',
    note: 'A bill has no amount to type, so its editor is short: who is charged and how it is split.',
    html: sheet({ behind: BEHIND, title: 'Kitchen &amp; drinks', stepBack: true,
      body: [
        field('Called', 'Kitchen &amp; drinks'),
        label('How much', { quiet: true }),
        note('The real bill: $0 so far. A bill covers what was actually spent, so there is no amount to type — a percentage of a specific receipt would not mean anything.'),
        label('Charged to', { quiet: true }),
        card([row({ name: 'The winners', lead: radio(true) }), row({ name: 'Everyone at the table', lead: radio(false) })]),
        label('Split', { quiet: true }),
        seg(['Evenly', 'By win size', 'By hand'], 1),
      ],
      bar: saveRemove('Save rule') }) },

  { id: 'new-night-rule-blocked', route: '/new-night', name: 'A rule · not ready to save', nav: 'sheet',
    note: 'A rule that cannot be saved says why on the bar itself, blocked: Give it a name, Set an amount, Say how often, Set a ceiling. With no name the sheet is titled New rule.',
    html: sheet({ behind: BEHIND, title: 'New rule', tall: true, stepBack: true,
      body: [
        field('Called', 'What the group calls it', { placeholder: true, focus: true }),
        label('How much', { quiet: true }),
        howMuch('10'),
        chipRow(kinds, 0, { tight: true }),
        chipRow(['5%', '10%', '15%', '<span class="dimt">—</span>'], 1, { small: true }),
        label('Never more than', { quiet: true }),
        chipRow(['No ceiling', '$50', '$100', '<span class="dimt">—</span>'], 0, { small: true }),
      ],
      bar: bar('Give it a name', { blocked: true }) }) },

  { id: 'new-night-currency', route: '/new-night', name: 'Currency', nav: 'sheet', allowOverflow: true,
    note: 'Behind the Currency row of Game details. Picking a row writes the group and returns, so Done is only the way out. The list runs on under the bar (156 currencies).',
    html: sheet({ behind: BEHIND, title: 'Currency', tall: true, stepBack: true,
      body: [
        `<div class="fi ph" style="font-size:12.5px;white-space:nowrap">Code, symbol or name — USD, €, koruna</div>`,
        note('The group keeps one book, so this is the money every night in it is counted in — past ones included. It renames the column; no figure is converted.'),
        label('Common', { quiet: true }),
        card([
          row({ name: 'CZK', meta: 'Czech Koruna', value: 'Kč' }),
          row({ name: 'EUR', meta: 'Euro', value: '€' }),
          row({ name: 'GBP', meta: 'British Pound', value: '£' }),
          row({ name: 'USD', meta: 'US Dollar', value: '$', trail: `<span class="win">${ico('check', 16)}</span>` }),
        ]),
        label('Every currency', { quiet: true }),
        card([
          row({ name: 'AED', meta: 'United Arab Emirates Dirham', value: 'AED' }),
          row({ name: 'AFN', meta: 'Afghan Afghani', value: '؋' }),
          row({ name: 'ALL', meta: 'Albanian Lek', value: 'ALL' }),
        ]),
      ],
      bar: bar('Done') }) },

  { id: 'new-night-players', route: '/new-night', name: 'Add players', nav: 'sheet',
    note: 'Behind Someone new: search the roster, or type a name that is not on it. The app’s filled Add pills are outlined here; the bar is the only filled thing. The app also sets 3 seated beside the title; the bar already says it, so it is left off here.',
    html: sheet({ behind: BEHIND, title: 'Add players', tall: true, stepBack: true,
      body: [
        field('', 'Search by name', { placeholder: true }),
        label('Most recent first', { quiet: true }),
        card([
          ['Andro', 'played 22 November · host', '500'], ['Dana', 'played 22 November · 1 night', '500'], ['Ivo', 'played 22 November · 1 night', null],
          ['Lena', 'played 22 November · 1 night', '800'], ['Petr', 'played 22 November · 1 night', null], ['Radka', 'played 22 November · 1 night', null],
          ['Tomáš', 'played 22 November · 1 night', null],
        ].map(([name, meta, amount]) => row({ name, meta, trail: amount ? `<span class="win">${ico('check', 14)}</span><span class="fi" style="min-height:34px;width:50px;padding:0 6px;font-size:14px;justify-content:flex-end;flex:none"><span class="num" style="font-weight:700">${amount}</span></span>` : addPill() })), { style: 'padding:0 8px 0 10px' }),
        `<div style="display:flex;gap:8px;align-items:center"><div class="fi ph" style="flex:1;box-shadow:none;border:1.5px dashed var(--outline);font-size:13.5px;min-height:44px;white-space:nowrap">New player — type a name</div>${addPill(true).replace('border-radius:999px', 'border-radius:12px;height:44px')}</div>`,
      ],
      bar: bar('Done · 3 seated') }) },

  { id: 'new-night-gate', route: '/new-night', name: 'Open a game · no membership', nav: 'sheet',
    note: 'Redesigned to invite (owner, 22 November): the start-a-session drawing and the reason first, then three plan cards with the price large. Full is the ink card. Buying a plan is not built, so the bar stays blocked; Not now is the way out.',
    flags: ['Not reachable in the app today (every phone reads as Full), so drawn from source, not from a capture.', 'The handoff marks INCLUDED / YOURS and the plan wording among its UNSURE strings.', 'Full drawn as the ink card is a design choice: it leans the sheet toward one plan. Say if all three should be equal.'],
    html: sheet({ behind: BEHIND, title: 'Open a game', tall: true,
      body: [
        gateHero,
        planCard('Free', '$0', '', 'Tonight, and the last three games.', { tag: 'INCLUDED', dim: true }),
        planCard('Regular', '$2.49', '/ mo', 'Every night in the book, the ones you missed included, and one night as host each month.'),
        planCard('Full', '$9.99', '/ mo', 'Everything in Regular, and you run games as often as you like.', { ink: true }),
        `<div class="btnq">Not now</div>`,
      ],
      bar: bar('Choose a plan to open a game', { blocked: true }) }) },

  { id: 'new-night-gate-used', route: '/new-night', name: 'Open a game · host night used', nav: 'sheet',
    note: 'A Regular who has spent this month’s host night, in the same inviting layout. Free is left off; waiting is the secondary.',
    flags: ['The month and the date (November, 1 December) are computed by the app from today and the renewal date; these are examples, not captured.', 'Not reachable in the app today, so drawn from source. “Wait for …” and YOURS are UNSURE in the handoff.'],
    html: sheet({ behind: BEHIND, title: 'Open a game', tall: true,
      body: [
        gateHero.replace('Running a game takes a paid membership. Watching, and your place in the group, stay free.', 'You’ve used your host night for November. It comes back on 1 December.'),
        planCard('Regular', '$2.49', '/ mo', 'Every night in the book, the ones you missed included, and one night as host each month.', { tag: 'YOURS', dim: true }),
        planCard('Full', '$9.99', '/ mo', 'Everything in Regular, and you run games as often as you like.', { ink: true }),
        note('You can still watch any game and see its money live.'),
        button('Wait for 1 December'),
      ],
      bar: bar('Choose Full to open tonight', { blocked: true }) }) },

  { id: 'new-night-host-night', route: '/new-night', name: 'New session · spends a host night', nav: 'sheet', allowOverflow: true,
    note: 'A Regular with the host night still free: one note block on top of New session as it is. See Full opens the gate. The sheet scrolls: the rest of the group runs on under the bar.',
    flags: ['The month and the date are computed by the app; examples here. Not reachable in the app today, so drawn from source.'],
    html: sheet({ behind: BEHIND, title: 'New session', sub: GROUP, tall: true,
      body: [
        card(`<div style="display:grid;gap:6px;font-size:13px;line-height:1.45"><div>This game uses your host night for November. The next one comes back on 1 December.</div><div class="muted">Full runs a game any night, $9.99 / mo. <b style="color:var(--text);font-weight:600">See Full</b></div></div>`, { pad: true }),
        ...seatedBody,
      ],
      bar: bar('Open the table · 3 seated', { line: '$1,800 on the table' }) }) },
];
