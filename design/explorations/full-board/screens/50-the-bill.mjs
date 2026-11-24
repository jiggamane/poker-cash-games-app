/**
 * The bill and the small sheets around the end of the night: the bill itself,
 * a spend, one person's share of a rule, the end time, and rounding.
 *
 * All five are sheets in the app, so all five are sheets here. What changes is
 * the foot: each sheet's primary button becomes the bar, and whatever was the
 * second button under it moves up into the content.
 */
import { sheet, bar, label, card, row, note, pill, button, quiet, field, chips, keypad, ico } from '../kit.mjs';

/* ── parts the kit does not have (reported as kit gaps) ───────────────── */

/** The figure a keypad types into, centred, with an optional line under it. `tone`: '' | 'muted'. */
const typed = (text, { under = '', muted = false, underTone = 'muted' } = {}) =>
  `<div style="text-align:center"><div class="fig${muted ? ' muted' : ''}">${text}</div>${
    under === null ? '' : `<div class="${underTone}" style="font-size:12.5px;margin-top:6px;min-height:17px">${under}</div>`}</div>`;

/** The preset row: a figure over a small caption, one of them selected. The app's `Preset.tsx`. */
const presets = (items, on) =>
  `<div style="display:flex;gap:8px">${items.map(([big, cap], i) =>
    `<div style="flex:1;min-width:0;height:48px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;${
      i === on ? 'background:var(--pri);color:var(--onpri)' : 'background:var(--card);box-shadow:var(--lift);color:var(--text)'}">` +
    `<b class="num" style="font-size:15px;line-height:1">${big}</b><span style="font:700 9px/1 var(--body);letter-spacing:.1em;opacity:.72">${cap}</span></div>`).join('')}</div>`;

/** A sheet title with the app's badge beside it. */
const titled = (text, badge) => `${text} <span style="vertical-align:4px;margin-left:4px">${pill(`<span style="text-transform:uppercase;letter-spacing:.08em;font-size:10px">${badge}</span>`)}</span>`;

/** A spend on the bill: the time, what it was and who fronted it, the amount. */
const spendRow = (at, what, who, amount) =>
  `<div class="row"><span class="muted num" style="flex:none;width:38px;font-size:12.5px;font-weight:600">${at}</span><span class="n">${what}<small>${who}</small></span><span class="a">${amount}</span></div>`;

/** A titled block of explanation, as a lifted card. `rows` are extra HTML under the paragraph. `plain` sets it straight on the sheet, where a pad has to fit under it. */
const block = (title, body, rows = '', { plain = false } = {}) => {
  const inner = `<div style="font:700 15px/1.2 var(--head);margin-bottom:${plain ? 3 : 5}px">${title}</div><p class="note" style="font-size:12.5px;line-height:1.4">${body}</p>${rows}`;
  return plain ? `<div style="margin:0 2px">${inner}</div>` : card(inner, { pad: true });
};

/** One line of "what the others become": the name, what they were on, what they would be on. */
const other = (name, was, now, { tone = 'muted', last = false } = {}) =>
  `<div style="display:flex;align-items:center;gap:10px;padding:6px 0 ${last ? '0' : '6px'};${last ? '' : 'border-bottom:1px solid var(--line);'}"><b style="flex:1;font-size:14px;font-weight:600">${name}</b><span class="muted num" style="font-size:12.5px">${was}</span><b class="num ${tone}" style="width:56px;text-align:right;font-size:15px">${now}</b></div>`;

/** A choice in a list with a check on the one chosen (Rounding). Not a fill and not a radio. */
const choice = (name, meta, on = false) => row({ name, meta, wrapMeta: true, trail: on ? `<span style="flex:none;color:var(--text)">${ico('check', 18)}</span>` : '' });

/* ── copy the app holds in one place ──────────────────────────────────── */

const BILL_SUB = 'food, drinks and whatever else the night bought';
const SHARE_BODY = 'The rest is shared out again by the rule — but only between the people whose share has not been set by hand. Anyone already set stays exactly where they were.';
const ROUNDING_BODY = 'Set it here and it governs the whole night: every position lands on the step, and the transfers follow. Nothing rewrites a count — what was counted is kept underneath. Changeable until the night is closed.';
const ROUNDING_AT_SETTLE = 'Changing the step here recomputes the transfers on screen. Changeable until the night is closed.';

const onTheBill = (figure, right, { empty = false } = {}) =>
  card(`<div style="display:flex;align-items:flex-end;gap:12px"><div><div class="muted" style="font-size:12.5px;font-weight:500;margin-bottom:6px">On the bill</div><div class="fig${empty ? ' muted' : ''}">${figure}</div></div><div style="margin-left:auto;text-align:right;font-size:12.5px;line-height:1.5">${right}</div></div>`, { pad: true });

const noteField = (value) => `<div>${`<span class="fl" style="display:flex;justify-content:space-between"><span style="text-transform:uppercase;letter-spacing:.1em;font-size:11px;font-weight:700">Note</span><span class="dimt" style="font-weight:400">optional</span></span>`}<div class="fi${value ? '' : ' ph'}"><span>${value || 'What it was'}</span></div></div>`;
const coveredField = (value, { nobody = false } = {}) => `<div><span class="fl" style="text-transform:uppercase;letter-spacing:.1em;font-size:11px;font-weight:700">Covered by</span><div class="fi${nobody ? ' ph' : ''}"><span>${value}</span></div></div>`;

const shareTop = { behind: 'Deductions', tall: true };
const sharePresets = (on) => presets([['$29', 'BY THE RULE'], ['$0', 'NOTHING'], ['Custom', 'SET']], on);

export const section = { title: 'The bill', blurb: 'What the night spent and how it is shared: the bill, a spend, one person’s share set by hand, and the two small sheets the count-up opens, End time and Rounding.' };

export default [
  /* ── /bill ──────────────────────────────────────────────────────────── */
  { id: 'bill', route: '/bill', name: 'The bill', nav: 'sheet',
    note: 'Add a spend is the bar; Bill rules, the second button under it in the app, stays in the content as the outlined secondary.',
    html: sheet({ behind: 'Tonight', title: 'The bill', sub: BILL_SUB,
      body: [
        onTheBill('$170', `<span class="muted" style="font-weight:600">split by size of win</span><br><span class="dimt">2 spends</span>`),
        label('Spends', { quiet: true }),
        card([spendRow('15:19', 'Pizza', 'Andro fronted it', '$120'), spendRow('15:51', 'Drinks', 'Lena fronted it', '$50')]),
        block('How it will be split', 'The winners pay it in proportion to the size of each win, so the biggest winner carries the most. Nothing is worked out until settle-up, and whoever fronted a spend is repaid exactly what they fronted — and still pays their own share.'),
        button('Bill rules'),
      ],
      bar: bar('Add a spend') }) },

  { id: 'bill-empty', route: '/bill', name: 'The bill · nothing on it', nav: 'sheet',
    html: sheet({ behind: 'Tonight', title: 'The bill', sub: BILL_SUB,
      body: [
        onTheBill('$0', `<span class="dimt">nothing added yet</span>`, { empty: true }),
        `<div style="display:grid;justify-items:center;gap:12px;padding:26px 14px 22px;text-align:center"><span class="dimt">${ico('receipt', 34)}</span><div class="h2">Nothing on the bill yet</div><p class="note" style="max-width:250px;font-size:14px">Add what the night spends as it is spent. Who pays it back is worked out at settle-up, never now.</p></div>`,
        button('Bill rules'),
      ],
      bar: bar('Add a spend') }) },

  /* ── /spend ─────────────────────────────────────────────────────────── */
  { id: 'spend', route: '/spend', name: 'Add a spend', nav: 'sheet',
    note: 'Opens blocked on the app’s own words, Type an amount. Once a figure is in, the bar reads “Add $120 to the bill”. The pad stays directly under the figure it types into.',
    flags: ['The kit’s keypad has no 00 key; the app’s pad has one, bottom left, on every amount sheet.',
      'Covered by is a row that opens the second step. The app marks it with a chevron, which the look forbids, so here it is told from the Note field above it only by its label. Does it need a mark of its own?'],
    html: sheet({ behind: 'Tonight', title: 'Add a spend', sub: 'stamped 16:52',
      body: [typed('$0', { muted: true, under: null }), keypad(), noteField(''), coveredField('Nobody yet', { nobody: true })],
      bar: bar('Type an amount', { blocked: true }) }) },

  { id: 'spend-edit', route: '/spend', name: 'The spend', nav: 'sheet',
    note: 'A spend opened from the bill. Save changes is the bar; Void this spend, the app’s destructive button, is the quiet red line in the content.',
    html: sheet({ behind: 'Tonight', title: 'The spend', sub: 'logged 15:19',
      body: [typed('$120', { under: null }), keypad(), noteField('Pizza'), coveredField('Andro'), quiet('Void this spend', { red: true })],
      bar: bar('Save changes') }) },

  { id: 'spend-covered', route: '/spend', name: 'Covered by', nav: 'sheet',
    note: 'The second step of the same sheet. A chip writes as it is tapped, so the bar is only Done; with several people picked and their amounts not adding up to the spend, the bar is blocked and reads the shortfall instead (“$20 still to cover”).',
    flags: ['In the app this step has no back control: its one close comes back a step. Drawn with the kit’s step-back circle as the README asks, which gives the step two ways out.',
      'Not drawn: several people fronting one spend, which adds a row and an amount field per person and the line “$120 of $120 covered.”'],
    html: sheet({ behind: 'Tonight', title: 'Covered by', stepBack: true,
      body: [
        chips(['Dana', { text: 'Andro', on: true }, 'Lena', 'Tomáš', 'Ivo', 'Petr', 'The piggy bank', { text: 'Nobody yet', dash: true }]),
        note('Fronting is not exemption: whoever put money in gets exactly that back, and still pays their own share.'),
      ],
      bar: bar('Done') }) },

  /* ── /share ─────────────────────────────────────────────────────────── */
  { id: 'share', route: '/share', name: 'A share · Lena', nav: 'sheet',
    note: 'Opened from a figure on Deductions. The bar carries the app’s own sentence, which restates the figure being typed.',
    flags: ['The app’s source marks every string on this sheet as written for it and not drawn by any handoff (share.tsx, “COPY NOT DRAWN”). Copied as the app has them.',
      'The selected preset is filled, as a selected chip is in the kit. If no fill is wanted in the content at all, it needs another mark.'],
    html: sheet({ ...shareTop, title: titled('Lena', 'Bill'), sub: 'Kitchen &amp; drinks · $29 on the split',
      body: [
        typed('$29', { under: 'of $170 to cover' }),
        block('Nobody else moves', SHARE_BODY, `<div style="margin-top:4px">${other('Dana', 'unchanged', '$110')}${other('Andro', 'unchanged', '$31', { last: true })}</div>`, { plain: true }),
        sharePresets(0), keypad(),
      ],
      bar: bar('Lena carries $29') }) },

  { id: 'share-typed', route: '/share', name: 'A share · a figure typed', nav: 'sheet',
    note: 'What everybody else becomes is listed before it is saved. Typing more than the rule has to cover blocks the bar with “Only $170 is left to give”.',
    html: sheet({ ...shareTop, title: titled('Lena', 'Bill'), sub: 'Kitchen &amp; drinks · $29 on the split',
      body: [
        typed('$50', { under: 'of $170 to cover' }),
        block('What the others become', SHARE_BODY, `<div style="margin-top:4px">${other('Dana', '$110', '$93', { tone: 'win' })}${other('Andro', '$31', '$27', { tone: 'win', last: true })}</div>`, { plain: true }),
        sharePresets(2), keypad(),
      ],
      bar: bar('Lena carries $50') }) },

  { id: 'share-set', route: '/share', name: 'A share · already set by hand', nav: 'sheet', allowOverflow: true,
    note: 'In the new look (owner, 24 November): the presets are lifted like the chips, the chosen one ink; the way back onto the split is a lifted row with what it would come to. Nothing to save until the figure changes, so the bar is blocked on Saved. The way back onto the split sits in the content, above the presets; the pad runs under the bar here, as it runs under the two buttons in the app.',
    html: sheet({ ...shareTop, title: titled('Lena', 'Bill'), sub: 'Kitchen &amp; drinks · set by hand',
      body: [
        typed('$50', { under: 'of $170 to cover' }),
        block('Nobody else moves', SHARE_BODY, `<div style="margin-top:4px">${other('Dana', 'unchanged', '$93')}${other('Andro', 'unchanged', '$27', { last: true })}</div>`, { plain: true }),
        `<div style="display:flex;align-items:center;gap:10px;min-height:48px;padding:0 14px;border-radius:12px;background:var(--card);box-shadow:var(--lift)"><span class="muted">${ico('restart', 17)}</span><span style="flex:1;font:600 14.5px/1.2 var(--body)">Put Lena back on the split</span><span class="num muted" style="font-size:13px">$29</span></div>`,
        sharePresets(2), keypad(),
      ],
      bar: bar('Saved', { blocked: true }) }) },

  { id: 'share-viewer', route: '/share', name: 'A share · read by a player', nav: 'sheet',
    note: 'Somebody who does not run the group gets no pad and no bar: there is nothing to confirm. Close stays an outlined button.',
    html: sheet({ behind: 'Deductions', title: titled('Lena', 'Bill'), sub: 'Kitchen &amp; drinks · $29',
      body: [note('This is what the rule gives them. Only the person who runs the group can change it.'), button('Close')] }) },

  /* ── /end-time ──────────────────────────────────────────────────────── */
  { id: 'end-time', route: '/end-time', name: 'End time', nav: 'sheet',
    note: 'Opens on the time End game stamped. The line under the clock is the span, which is how a right time on the wrong day gets caught. From a settled night the line under the title reads “This night is settled. Changing when it ended moves no money — the result stands.”',
    flags: ['The app’s source says no board draws this sheet and every string on it was written for it (end-time.tsx). Copied as the app has them.',
      'The date is the board’s night, Fri 20 Nov, to agree with the settled screen; the reference capture was taken on Sun 22 Nov and says so.'],
    html: sheet({ behind: 'Count up', title: 'End time', sub: 'When the cards stopped, not when the night was added up.',
      body: [typed('17:23', { under: '14:07 → 17:23 · 3h 16m' }), presets([['Fri 20 Nov', 'THE NIGHT']], 0), keypad()],
      bar: bar('Save') }) },

  { id: 'end-time-empty', route: '/end-time', name: 'End time · nothing stamped', nav: 'sheet',
    note: 'A night with no end time opens empty rather than on a plausible wrong one. Save is blocked until four digits and a day make a time.',
    html: sheet({ behind: 'Count up', title: 'End time', sub: 'When the cards stopped, not when the night was added up.',
      body: [typed('––:––', { muted: true, under: '' }), presets([['Fri 20 Nov', 'THE NIGHT']], -1), keypad()],
      bar: bar('Save', { blocked: true }) }) },

  /* ── /rounding ──────────────────────────────────────────────────────── */
  { id: 'rounding', route: '/rounding', name: 'Rounding', nav: 'sheet',
    note: 'As Count up opens it. The chosen step keeps its check, not a fill. Opened for the group from Settings, the rows lose their second lines and the paragraph is the group’s.',
    html: sheet({ behind: 'Count up', title: titled('Rounding', 'admin only'),
      body: [
        note(ROUNDING_BODY),
        card([
          choice('Off', 'To the dollar · $2,880 so far', true),
          choice('Nearest $10', 'No net moves by more than $9'),
          choice('Nearest $50', 'No net moves by more than $49'),
          choice('Nearest $100', 'No net moves by more than $99'),
          choice('Nearest $1,000', 'No net moves by more than $999'),
        ]),
      ],
      bar: bar('Apply') }) },

  { id: 'rounding-settle', route: '/rounding', name: 'Rounding · from Deductions or Settle up', nav: 'sheet',
    note: 'The same sheet once the stacks are counted: each step says what it does to the piggy bank and how many payments it leaves.',
    html: sheet({ behind: 'Settle up', title: titled('Rounding', 'admin only'),
      body: [
        note(ROUNDING_AT_SETTLE),
        card([
          choice('Off', 'Nets to the dollar · piggy bank $126 · six transfers', true),
          choice('Nearest $10', 'Nets land on $10 · piggy bank $120 · six transfers'),
          choice('Nearest $50', 'Nets land on $50 · piggy bank $100 · six transfers'),
          choice('Nearest $100', 'Nets land on $100 · piggy bank $100 · six transfers'),
          choice('Nearest $1,000', 'Nets land on $1,000 · three transfers'),
        ]),
      ],
      bar: bar('Apply') }) },

  { id: 'rounding-locked', route: '/rounding', name: 'Rounding · night closed', nav: 'sheet',
    note: 'Locked once the night is closed: the step it settled at under the title, no list and no bar. A player who does not run the group sees the same sheet with “Only the person who runs the group can change it.”',
    flags: ['The app’s source says the closed-night sentence is not drawn in any handoff (rounding.tsx). Copied as the app has it.'],
    html: sheet({ behind: 'Fri 20 Nov', title: 'Rounding', sub: 'Off',
      body: [note(ROUNDING_BODY), note('This night is closed. What it settled at is part of the record now.'), button('Close')] }) },
];
