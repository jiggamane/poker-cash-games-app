/**
 * During the game: everything the host opens from Tonight while cards are in
 * the air. A player's card, the amount keypad (rebuy, first buy-in, cash out),
 * seating somebody new, correcting one ledger entry, the tools chooser, and
 * the one sheet here that is not about money: a player's own name in a group.
 *
 * Every one of these is a SHEET in the app, so every one is a sheet here.
 * `/pick` and `/session` are in `10-home-tonight.mjs`.
 *
 * The clock is the board's: Tonight started 14:07 and is 3h 16m old, so the
 * seeded entries read 14:09, 15:14, 16:05 (Petr), 14:43 and 17:17 (Dana), and
 * an entry written now is stamped 17:23.
 */
import { sheet, bar, label, card, row, note, para, button, field, chips, ico, tile } from '../kit.mjs';

/* ── parts the kit does not have yet (see the report) ─────────────────── */

/** The state badge beside a sheet's title: SEATED, REBUY, CASH OUT. */
const badge = (text) =>
  `<span style="display:inline-block;vertical-align:middle;margin:-3px 0 0 8px;padding:5px 9px;border-radius:999px;background:var(--raised);color:var(--text);font:700 10.5px/1 var(--body);letter-spacing:.1em;text-transform:uppercase">${text}</span>`;
const titled = (name, tag) => `${name}${badge(tag)}`;

/** The summary card: a caps label over a figure, two or three across. `tail` is the note that stands in for the third. */
/*
 * Figures are written in full and the type steps down to fit, never abbreviated (owner, 22 November:
 * "use auto size down for the values once they near collision"). 26 points while three fit a third of
 * the card each; below that, the size that fits, to a floor of 18. In the app: adjustsFontSizeToFit
 * on the figure, minimumFontScale 0.7, the same rule for every figure in the row so they stay one size.
 */
const FIT = { 3: 76, 2: 116 };
const fitSize = (values, across) => {
  const chars = Math.max(...values.map((v) => v.replace(/<[^>]+>/g, '').length));
  return Math.max(18, Math.min(26, Math.floor(FIT[across] / (chars * 0.6))));
};
const stat = (lbl, value, { tone = '', align = 'left', size = 26 } = {}) =>
  `<div style="text-align:${align};min-width:0"><div style="font:700 10.5px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${lbl}</div><div class="num ${tone}" style="font:700 ${size}px/1 var(--head);letter-spacing:-.02em;margin-top:6px;white-space:nowrap">${value}</div></div>`;
/** Three or two figures across, all at the one size the longest of them fits. */
const stats = (items) => {
  const size = fitSize(items.map(([, v]) => v), items.length === 3 ? 3 : 2);
  return items.map(([l, v, o = {}]) => stat(l, v, { ...o, size }));
};
const summary = (items, tail = '') =>
  card(`<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px">${items.join('')}${tail ? `<div class="muted" style="font-size:12px;line-height:1.35;max-width:104px;text-align:right">${tail}</div>` : ''}</div>`, { pad: true });

/** One line of a player's night: the time, what it was, what has happened to it since, the amount. */
const mark = (text) => `<span style="margin-left:7px;padding:3px 7px;border-radius:999px;background:var(--raised);color:var(--muted);font:700 9.5px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;vertical-align:2px">${text}</span>`;
const entry = (time, title, sub, amount, { struck = false, pill: p = '', wrap = false } = {}) =>
  `<div class="row"><span class="num muted" style="flex:none;width:40px;font-size:12.5px;font-weight:600">${time}</span><span class="n"><span${struck ? ' class="muted" style="text-decoration:line-through"' : ''}>${title}</span>${p ? mark(p) : ''}<small${wrap ? ' class="wrap"' : ''}>${sub}</small></span><span class="a${struck ? ' muted' : ''}">${amount}</span></div>`;

/** The figure being typed. */
const typed = (text, { tone = '', under = '' } = {}) =>
  `<div style="text-align:center;padding:2px 0 0"><div class="num ${tone}" style="font:800 56px/1 var(--head);letter-spacing:-.045em">${text}</div>${under ? `<div class="${tone}" style="font-size:12.5px;font-weight:500;line-height:1.4;margin:8px 16px 0">${under}</div>` : ''}</div>`;

/** The preset row: a figure over a caps caption, one of them selected. */
const presets = (items) =>
  `<div style="display:flex;gap:8px">${items.map(([fig, cap, on]) =>
    `<div style="flex:1;min-width:0;height:52px;border-radius:12px;display:grid;place-content:center;text-align:center;gap:4px;${on ? 'background:var(--pri);color:var(--onpri)' : 'box-shadow:inset 0 0 0 1.5px var(--outline);color:var(--text)'}"><b class="num" style="font:700 15px/1 var(--head)">${fig}</b><span style="font:700 9.5px/1 var(--body);letter-spacing:.1em;opacity:.7">${cap}</span></div>`).join('')}</div>`;

/** "Stamped 17:23": when the entry will be written. */
const stamped = (time) => `<div style="display:flex;align-items:center;gap:10px;font-size:14.5px;font-weight:500;margin:0 2px"><span class="muted">${ico('clock', 17)}</span>Stamped ${time}</div>`;

/** The app's keypad, which has a 00 where the kit's has a blank. */
const keys = () => `<div class="kp" style="margin-bottom:-18px">${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => `<span>${k}</span>`).join('')}<span class="muted">00</span><span>0</span><span>${ico('backspace', 22).replace('class="ico"', 'class="ico" style="height:auto;border:0;display:inline-flex"')}</span></div>`;

/** A result line inside a card: words left, a signed figure right. */
const result = (words, figure, tone) => card(`<div class="split" style="align-items:center"><b style="font-size:14.5px;font-weight:600">${words}</b><b class="num ${tone}" style="font:700 19px/1 var(--head)">${figure}</b></div>`, { pad: true });

const pair = (a, b) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${[a, b].map((x) => x.replace('class="btn2"', 'class="btn2" style="font-size:14px;letter-spacing:-.01em"')).join('')}</div>`;

/** The entry being corrected, stated once at the top of both steps. */
const entryHead = card(`<div style="font:700 10.5px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">15:14 · as logged</div><div class="h2" style="margin-top:7px;font-size:21px">Petr · rebuy · $500</div>`, { pad: true });

/** New player's buy-in line: the label, a short outlined field, the hint. */
const stake = (hint) =>
  `<div style="display:flex;align-items:center;gap:10px;margin:0 2px"><span style="font-size:15px;font-weight:500;flex:none">First buy-in</span><span class="fi num" style="margin-left:auto;min-height:40px;width:104px;flex:none;padding:0 12px;font-weight:700"><span>$</span><span>500</span></span><span class="muted" style="font-size:12px;font-weight:600;text-align:right;line-height:1.25;max-width:64px">${hint}</span></div>`;

const seatBody = (name, { placeholder = false, hint = '' } = {}) => [
  field('Name', name, { placeholder, focus: true }),
  hint ? note(hint) : '',
  label('From the roster', { quiet: true }),
  chips(['Radka']),
  `<div class="hr"></div>`,
  stake('same as the table'),
];
const seatSub = 'Seats them tonight and adds them to the group roster. They can be invited later.';

const petrEntries = label('Entries', { quiet: true });

export const section = { title: 'During the game', blurb: 'What the host opens from Tonight while the game runs: a player’s card, the amount keypad, seating someone new, correcting an entry, and the tools chooser.' };

export default [
  /* ── /player ── */
  { id: 'player', route: '/player', name: 'Player card · seated', nav: 'sheet',
    note: 'Rebuy $500 is the card’s one primary, so it is the bar. Other amount and Cash out stay in the sheet as the outlined pair, directly above it.',
    flags: ['Rebuy $500 writes to the ledger on one tap (Undo lives on Tonight for two seconds). As a full-width bar at the bottom edge it is a much larger target than the app’s button: confirm that is wanted, with Cash out a thumb-width above it.',
      'The settled-night version of this card (badge “counted”, the “After deductions” block, a Close-only footer) is not drawn here; it is reached from the settled night.'],
    html: sheet({ behind: 'Tonight', title: titled('Petr', 'seated'), sub: 'since 14:09',
      body: [
        summary(stats([['In for', '$1,500'], ['Counted', '<span class="dimt">—</span>', { align: 'center' }]]), 'Net is known once chips are counted'),
        petrEntries,
        card([entry('14:09', 'Buy-in', 'first buy-in', '$500'), entry('15:14', 'Rebuy', 'first rebuy', '$500'), entry('16:05', 'Rebuy', 'second rebuy', '$500')]),
        pair(button('Other amount'), button('Cash out')),
      ],
      bar: bar('Rebuy $500') }) },

  { id: 'player-out', route: '/player', name: 'Player card · cashed out', nav: 'sheet',
    note: 'No primary once they are out, so no bar: the sheet ends in its two outlined buttons. The three figures are written in full and step down together to the size the longest fits (22 here), never abbreviated.',
    flags: ['The app abbreviates these figures ($2.1k, +$1.6k). Writing them in full and sizing them down is the owner’s call of 22 November; it changes the summary card in `app/player.tsx`.'],
    html: sheet({ behind: 'Tonight', title: titled('Dana', 'cashed out'), sub: 'left 17:17',
      body: [
        summary(stats([['In for', '$500'], ['Counted', '$2,120', { align: 'center' }], ['Night', '+$1,620', { tone: 'win', align: 'right' }]])),
        label('Entries', { quiet: true }),
        card([entry('14:43', 'Buy-in', 'first buy-in', '$500'), entry('17:17', 'Cashed out', 'stack counted · seat closed', '$2,120', { wrap: true })]),
        note('Their result is set. Bills and the piggy bank still come off it at settle-up.'),
        pair(button('Correct an entry'), button('Back to table')),
      ] }) },

  { id: 'player-corrected', route: '/player', name: 'Player card · a corrected entry', nav: 'sheet',
    note: 'The ledger is append-only and the list says so: the replaced line stays, struck through, and the correction is its own row.',
    flags: ['Not the seeded night: this is the seed after correcting Petr’s first rebuy from $500 to $300 in the running app. $1,300 and $300 are read off that capture.'],
    html: sheet({ behind: 'Tonight', title: titled('Petr', 'seated'), sub: 'since 14:09',
      body: [
        summary(stats([['In for', '$1,300'], ['Counted', '<span class="dimt">—</span>', { align: 'center' }]]), 'Net is known once chips are counted'),
        petrEntries,
        card([
          entry('14:09', 'Buy-in', 'first buy-in', '$500'),
          entry('15:14', 'Rebuy', 'replaced at 17:23', '$500', { struck: true, pill: 'voided' }),
          entry('16:05', 'Rebuy', 'second rebuy', '$500'),
          entry('17:23', 'Rebuy', 'replaces the 15:14 rebuy', '$300', { pill: 'correction' }),
        ]),
        pair(button('Other amount'), button('Cash out')),
      ],
      bar: bar('Rebuy $500') }) },

  /* ── /log ── */
  { id: 'log-rebuy', route: '/log', name: 'How much? · rebuy', nav: 'sheet',
    note: 'The bar names the act, as the app’s button does. A first buy-in is this same sheet with BUY-IN · FIRST, DEFAULT in place of STANDARD, and “Log Radka’s buy-in”.',
    html: sheet({ behind: 'Tonight', title: titled('Petr', 'rebuy'), sub: 'in for $1,500 · buy-in + 2 rebuys',
      body: [
        typed('$500'),
        presets([['$500', 'STANDARD', true], ['$1,000', 'X2', false], ['Custom', 'SET', false]]),
        stamped('17:23'),
        keys(),
      ],
      bar: bar('Log Petr’s rebuy') }) },

  { id: 'log-cashout', route: '/log', name: 'How much? · cash out', nav: 'sheet',
    note: 'Counting chips, not money going in: the presets give way to what the night comes to as it is typed.',
    html: sheet({ behind: 'Tonight', title: titled('Petr', 'cash out'), sub: 'in for $1,500 · buy-in + 2 rebuys',
      body: [
        typed('$270'),
        result('Petr’s night', '−$1,230', 'loss'),
        stamped('17:23'),
        keys(),
      ],
      bar: bar('Cash Petr out') }) },

  { id: 'log-cashout-over', route: '/log', name: 'How much? · more than the table holds', nav: 'sheet',
    note: 'Blocked: the bar goes faint and carries the reason, in the app’s words.',
    html: sheet({ behind: 'Tonight', title: titled('Petr', 'cash out'), sub: 'in for $1,500 · buy-in + 2 rebuys',
      body: [
        typed('$27,000', { tone: 'loss', under: 'More chips than the table holds. Somebody’s buy-in is missing.' }),
        result('Petr’s night', '+$25,500', 'win'),
        stamped('17:23'),
        keys(),
      ],
      bar: bar('Only $2,880 is on the table', { blocked: true }) }) },

  /* ── /seat ── */
  { id: 'seat', route: '/seat', name: 'New player', nav: 'sheet',
    note: 'The bar carries the name and the amount, so the host reads the whole write before making it.',
    flags: ['“Marek” is a sample name typed into the field for the drawing; it is not in the seed. “Their name” (the empty state) is the app’s placeholder.'],
    html: sheet({ behind: 'Tonight', title: 'New player', sub: seatSub,
      body: seatBody('Marek'),
      bar: bar('Seat Marek · $500') }) },

  { id: 'seat-empty', route: '/seat', name: 'New player · no name yet', nav: 'sheet',
    html: sheet({ behind: 'Tonight', title: 'New player', sub: seatSub,
      body: seatBody('Their name', { placeholder: true }),
      bar: bar('Type a name', { blocked: true }) }) },

  { id: 'seat-clash', route: '/seat', name: 'New player · name already at the table', nav: 'sheet',
    html: sheet({ behind: 'Tonight', title: 'New player', sub: seatSub,
      body: seatBody('Petr', { hint: 'Somebody by that name is already in this night. Two Petrs need two different names, or the ledger cannot tell them apart.' }),
      bar: bar('Petr is already here', { blocked: true }) }) },

  /* ── /entry ── */
  { id: 'entry', route: '/entry', name: 'One entry', nav: 'sheet',
    note: 'A choice, not a confirm: nothing here is the primary, so there is no bar. Close stays as the app has it, outlined.',
    flags: ['With no chevrons, “writes a correction” and “writes a reversal” sit under their labels rather than at the right of the row (the two did not fit one line at this width).',
      'Close duplicates the sheet’s own close button now that it is not a full-width footer. Keep it, or drop it?'],
    html: sheet({ behind: 'Tonight', title: 'One entry',
      body: [
        entryHead,
        note('The ledger is append-only. A correction does not erase this line — it writes a reversal underneath it, and both stay visible to everyone.'),
        card([
          row({ name: 'Change the amount', meta: 'writes a correction' }),
          row({ name: '<span class="red">Void this entry</span>', meta: 'writes a reversal' }),
        ]),
        button('Close'),
      ] }) },

  { id: 'entry-amount', route: '/entry', name: 'One entry · the right amount', nav: 'sheet',
    note: 'Step two of the same sheet. The bar is the correction, with the figure in it.',
    html: sheet({ behind: 'Tonight', title: 'One entry', stepBack: true,
      body: [
        entryHead,
        typed('$300'),
        presets([['$500', 'AS LOGGED', false], ['Custom', 'SET', true]]),
        keys(),
      ],
      bar: bar('Correct to $300') }) },

  { id: 'entry-amount-blocked', route: '/entry', name: 'One entry · amount not changed yet', nav: 'sheet',
    html: sheet({ behind: 'Tonight', title: 'One entry', stepBack: true,
      body: [
        entryHead,
        typed('$500', { tone: 'muted' }),
        presets([['$500', 'AS LOGGED', true], ['Custom', 'SET', false]]),
        keys(),
      ],
      bar: bar('Type the right amount', { blocked: true }) }) },

  /* ── /pick-tool ── */
  { id: 'pick-tool', route: '/pick-tool', name: 'Poker tools (from Tonight)', nav: 'sheet',
    note: 'A chooser: tapping a tile closes the sheet and pushes the tool from Tonight. No bar.',
    flags: ['The app’s tiles carry a line icon (percent, question card, flame); these carry the board’s drawings, as /tools will. Confirm the sheet should match /tools rather than keep the icons.'],
    html: sheet({ behind: 'Tonight', title: 'Poker tools', sub: 'nothing here touches the ledger',
      body: [
        `<div class="tiles">${tile('Calculator', 'hand and pot odds', 'calculator', 'tools')}${tile('Rulings', 'look up a ruling<br><span style="display:inline-block;margin-top:7px;font:700 9.5px/1 var(--body);letter-spacing:.08em;padding:3px 6px;border-radius:999px;background:var(--raised);color:var(--muted)">BETA</span>', 'rulings', 'tools')}${tile('Boosters', 'bomb pots and more', 'boosters', 'tools')}</div>`,
      ] }) },

  /* ── /seat-name ── */
  { id: 'seat-name', route: '/seat-name', name: 'Your name in a group', nav: 'sheet',
    note: 'Opened from Settings, not from Tonight. It opens with the name unchanged, so the bar starts blocked.',
    html: sheet({ behind: 'Settings', title: 'Your name in The Thursday game',
      body: [
        para('Everyone in The Thursday game sees this. Andro added you as Lena.'),
        field('', 'Lena', { focus: true }),
      ],
      bar: bar('Save', { blocked: true }) }) },

  { id: 'seat-name-changed', route: '/seat-name', name: 'Your name in a group · changed', nav: 'sheet',
    flags: ['“Lenka” is a sample name typed into the field for the drawing; it is not in the app or the seed.'],
    html: sheet({ behind: 'Settings', title: 'Your name in The Thursday game',
      body: [
        para('Everyone in The Thursday game sees this. Andro added you as Lena.'),
        field('', 'Lenka', { focus: true }),
      ],
      bar: bar('Save') }) },
];
