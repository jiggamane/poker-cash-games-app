/**
 * Settings and the money rules: the group's settings, the rules a night opens
 * with and the ones it is running under, the rule editor, the table rules, and
 * deleting an account.
 *
 * Built inline here because the kit has no part for them (see the report):
 * a radio row, a row of equal preset boxes, the caps badge beside a sheet's
 * title, and a spend row that leads with a time.
 */
import { push, sheet, bar, label, card, row, note, para, pill, button, quiet, field, chips, seg, toggle, ico } from '../kit.mjs';


/*
 * A rule's save and its removal share the bar (owner, 22 November: "move it to the save button").
 * Save is the wide half; Remove is the narrow end with the trash, its word in the same red the drawer
 * uses for ending a night, and a removal still asks before it happens, as the app's does.
 */
const saveRemove = (save) => `<div class="bar"><div class="acts"><div class="act"><span>${save}</span></div><div class="act sec" style="color:#FF9AA2">${ico('trash', 20)}<span>Remove</span></div></div></div>`;

/* ── inline parts ─────────────────────────────────────────────────────── */

/** A radio row: a ring, filled when chosen, with the option's words and a caption under them. */
const radio = (on, name, caption = '', { dead = false } = {}) =>
  `<div class="row"${dead ? ' style="opacity:.45"' : ''}><span style="flex:none;width:20px;height:20px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--${on ? 'text' : 'outline'});display:grid;place-items:center">${
    on ? '<span style="width:10px;height:10px;border-radius:50%;background:var(--text)"></span>' : ''}</span><span class="n">${name}${caption ? `<small class="wrap">${caption}</small>` : ''}</span></div>`;

/** Preset boxes of equal width, the last one a typed figure. items: strings or { text, on, typed }. */
const presets = (items) =>
  `<div style="display:flex;gap:8px">${items.map((i) => (typeof i === 'string' ? { text: i } : i)).map((i) =>
    `<span class="chip${i.on ? ' on' : ''}" style="flex:1;min-width:0;padding:0;justify-content:center;border-radius:12px;font-family:var(--head);font-weight:700${i.typed ? ';color:var(--muted)' : ''}">${i.text}</span>`).join('')}</div>`;

/** The caps badge the app sets beside a sheet's title. */
const badge = (text) => ` <span class="pill" style="vertical-align:middle;margin-left:6px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:5px 8px">${text}</span>`;

/** A spend on the bill: the time it was logged leads the row. */
const spend = (time, name, who, amount) =>
  `<div class="row"><span class="num muted" style="flex:none;width:38px;font-size:12px;font-weight:600">${time}</span><span class="n">${name}<small>${who}</small></span><span class="a">${amount}</span></div>`;

/** The editor's big figure with its unit said in full beside it. */
const rate = (figure, unit) => `<div style="display:flex;align-items:baseline;gap:8px"><span class="fig" style="font-size:32px">${figure}</span><span class="muted" style="font:700 19px/1 var(--head)">${unit}</span></div>`;

/** The kit's chips, one size down, where a sheet carries a long set of them. */
const smallChips = (items) => chips(items).replace(/class="chip(?!s)/g, 'style="height:36px;padding:0 12px;font-size:13.5px" class="chip');

/** The six kinds of charge, two to a line: six do not fit a segmented control, and loose pills wrap raggedly at this width. */
const kinds = (on) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${['A share of the win', 'A sum for the table', 'So much each', 'Each, by the hour', 'Out of each buy-in', 'The table, by the hour']
  .map((text, i) => `<span class="chip${i === on ? ' on' : ''}" style="height:34px;padding:0 4px;justify-content:center;border-radius:12px;font-size:12.5px">${text}</span>`).join('')}</div>`;

const people = ['Dana', 'Andro', 'Lena', 'Tomáš', 'Ivo', 'Petr'];
const ceilingNote = note('The half of a charge nobody states on its own — "five percent" is agreed as "five percent, fifty at most". A figure you type against one name at settle-up still stands whatever this says.');
const collectorNote = note('Whoever physically holds this money. They need not be playing — a treasurer who never sits down is exactly this. Leave it unset and it is held by the group.');
const rounding = [
  label('How it is rounded', { quiet: true }),
  card(row({ name: 'Whole dollars', meta: 'Stacks are counted as they are, and each rule works out to the unit', wrapMeta: true })),
];

const billSplit = (on) => card([
  radio(on === 0, 'By size of win', 'the biggest winner carries the most'),
  radio(on === 1, 'Evenly between the winners', 'same share each, whatever they won'),
  radio(on === 2, 'Evenly between everyone', 'losers pay a share too'),
]);
const billBody = (on) => [
  label('How it is split', { quiet: true }),
  billSplit(on),
  card(row({ name: 'Rounding', value: 'Whole dollars' })),
  card(`<div class="h2" style="font-size:16px;margin-bottom:6px">When it is charged</div>${note('At settle-up, against the counted table — never during the game. Changing the rule part-way through a night changes nothing that has already been charged, because nothing has been. Where a split leaves a remainder, it goes to the largest share.')}`, { pad: true }),
];

const piggyBody = (off = []) => [
  card(`<div class="muted" style="font-size:12.5px;font-weight:600">Charged on every win</div><div class="split" style="align-items:flex-end;margin-top:6px"><span class="fig">5%</span><span class="muted" style="text-align:right;font-size:12.5px;line-height:1.5">winners only<br><span class="dimt">counted at settle-up</span></span></div>`, { pad: true }),
  card([
    row({ name: 'Piggy bank on tonight', trail: toggle(true) }),
    row({ name: 'Charge', value: '5% of each win' }),
    row({ name: 'Who collects', value: 'Radka' }),
  ]),
  label('Off for tonight', { quiet: true }),
  chips(people.map((text) => ({ text, on: off.includes(text) }))),
  note('A filled name is sitting this one out. Switching someone off applies to this night only and never touches the group’s own setting. The piggy bank is charged on wins, so a player who finishes down never pays into it.'),
];

const tableRules = [['Buy-in', 'Standard $500', true], ...['Short buy', 'Rebuy cap', 'Going south', 'Notice before leaving', 'Coming back', 'Run it twice', 'Chopping', 'Straddle', 'The button', 'Rabbit hunting', 'Check-raise', 'Short bank', 'Credit'].map((n) => [n, 'Not set', false])];

export const section = { title: 'Settings and money rules', blurb: 'The group’s settings, the money rules a night starts from and runs under, the rule editor, the table rules, and deleting an account.' };

export default [
  { id: 'settings', route: '/settings', name: 'Settings', nav: 'push',
    note: 'A place, so no bar. Each section is one card; a row that opens something carries no chevron.',
    html: push({ title: 'Settings', sub: 'The Thursday game · you are admin',
      body: [
        label('The group', { quiet: true }),
        card([row({ name: 'Group name', value: 'The Thursday game' }), row({ name: 'Currency', value: 'USD · US Dollar' }), row({ name: 'Your groups' })]),
        label('The money', { quiet: true }),
        card([row({ name: 'Standard buy-in', value: '$500' }), row({ name: 'Money rules' }), row({ name: 'Rules &amp; rulings' }), row({ name: 'Poker calculator' })]),
        label('The people', { quiet: true }),
        card([row({ name: 'You', value: 'Andro' }), row({ name: 'Players' }), row({ name: 'Invited', value: '0 waiting' }), row({ name: 'I have an invite code' })]),
      ] }) },

  { id: 'settings-more', route: '/settings', name: 'Settings · account', nav: 'push', allowOverflow: true,
    note: 'Signed in, as a user sees it: the account card with the app’s own rows, the phone’s backups, and the way out. The address is a sample.',
    html: push({ title: 'Settings', sub: 'The Thursday game · you are admin',
      body: [
        label('Account', { quiet: true }),
        card([row({ name: 'Name', value: 'Andro' }), row({ name: 'Signed in as', value: 'andro@mail.com' }), row({ name: 'Plan', value: 'Regular' }), row({ name: 'Sync now' }), row({ name: 'Fetch my nights' }), row({ name: 'Connection' }), row({ name: 'Share this night' }), row({ name: 'Sign out' })]),
        label('This phone', { quiet: true }),
        card([row({ name: 'Copy a backup' }), row({ name: 'Restore from a backup' })]),
        label('The exits', { quiet: true }),
        card([row({ name: 'Hand over admin' }), row({ name: '<span class="red">Delete your account</span>' })]),
      ] }) },

  { id: 'club-rules', route: '/club-rules', name: 'Money rules · group defaults', nav: 'push',
    note: 'Nothing here is confirmed, each row saves in its own sheet, so there is no bar; Add a rule stays the last line of the list.',
    html: push({ title: 'Money rules', sub: 'what every new night starts from',
      body: [
        label('Group defaults', { quiet: true }),
        card([
          row({ name: 'Kitchen &amp; drinks', meta: '$170 · winners, by size of win · the bill', wrapMeta: true }),
          row({ name: 'Group piggy bank', meta: '5% off each win · winners, evenly · the piggy bank', wrapMeta: true }),
          row({ name: 'Host fee', meta: 'not set — a night opens with nothing selected', wrapMeta: true, dim: true }),
        ]),
        quiet('Add a rule', { icon: 'plus' }),
        ...rounding,
        button('Use tonight’s rules as the club default').replace('class="btn2"', 'class="btn2" style="font-size:13.5px"'),
        card(`<div class="h2" style="font-size:16px;margin-bottom:6px">Group default, not law</div>${note('A night copies these when it opens and can override any of them from the house rules. Changing them here never touches a night already running, or a night already settled.')}`, { pad: true }),
      ] }) },

  { id: 'money-rules', route: '/money-rules', name: 'Money rules · tonight', nav: 'sheet',
    note: 'No bar: each switch takes effect as it is flipped. The closing footnote is below the fold.',
    allowOverflow: true,
    html: sheet({ behind: 'Tonight', tall: true, title: 'Money rules', sub: 'What comes off the table at settle-up, in the order it is taken. Nothing here touches a hand while it is being played.',
      body: [
        label('Tonight’s rules', { quiet: true }),
        card([
          row({ name: 'Kitchen &amp; drinks', meta: '$170 spent so far · winners, by size of win · paid back to whoever bought it', wrapMeta: true, trail: toggle(true) }),
          row({ name: 'Group piggy bank', meta: '5% of win · split by winners · Radka collects', wrapMeta: true, trail: toggle(true) }),
        ]),
        quiet('Add a rule', { icon: 'plus' }),
        label('The bill', { right: '$170', quiet: true }),
        card([spend('15:20', 'Pizza', 'Andro fronted it', '$120'), spend('15:52', 'Drinks', 'Lena fronted it', '$50')]),
        button('Add a spend', { icon: 'plus' }),
        ...rounding,
        note('These belong to tonight. A night is settled with the rules it opened with, so editing one here changes this night and not the ones already closed.'),
      ] }) },

  { id: 'rule', route: '/rule', name: 'Rule editor · a new rule', nav: 'sheet',
    note: 'The tallest state, a fee charged by the hour. The app stacks this sheet on the Money rules sheet.',
    html: sheet({ behind: 'Tonight', tall: true, title: 'Group piggy bank',
      body: [
        label('Called', { quiet: true }),
        field('', 'Group piggy bank').replace('class="fi"', 'class="fi" style="min-height:42px"'),
        label('How much', { quiet: true }),
        rate('$5', 'an hour each'),
        kinds(3),
        presets([{ text: '$5', on: true }, '$10', '$20', { text: '5', typed: true }]).replace(/flex:1;/g, 'flex:1;height:36px;'),
        label('Charged by', { quiet: true }),
        seg(['The half hour', 'The hour'], 1),
        seg(['Every hour begun', 'To the nearest', 'To the minute'], 0).replace(/<span class="/g, '<span style="font-size:11.5px;padding-left:0;padding-right:0" class="'),
        note('Nobody is asked to clock in: somebody who arrives buys in, and somebody going home cashes out, so the app already knows how long each person sat.'),
      ],
      bar: bar('Add this rule') }) },

  { id: 'rule-edit', route: '/rule', name: 'Rule editor · a rule that exists', nav: 'sheet',
    note: 'Scrolled to the end. Save and Remove share the bar, as in New session’s rule editor (owner, 22 November).',
    flags: ['The app blocks the primary with its reason as the label: Give it a name, Set an amount, Say how often, Set a ceiling, “$N still to allocate”, “$N too much allocated”. Not drawn; on the bar it would be those words, faint.'],
    html: sheet({ behind: 'Tonight', tall: true, title: 'Group piggy bank',
      body: [
        label('Never more than', { quiet: true }),
        presets([{ text: 'No ceiling', on: true }, '$50', '$100', { text: '—', typed: true }]).replace('flex:1;min-width:0;padding:0', 'flex:1.6;min-width:0;padding:0'),
        label('Charged to', { quiet: true }),
        card([radio(true, 'Winners, off their net win'), radio(false, 'Everyone at the table', 'A percentage of a loss is not a thing', { dead: true })]),
        label('Collected by', { quiet: true }),
        smallChips([...people, { text: 'Radka', on: true }]),
        collectorNote,
      ],
      bar: saveRemove('Save') }) },

  { id: 'bill-rules', route: '/bill-rules', name: 'Bill rules', nav: 'sheet',
    note: 'Opens blocked: Save the rule wakes only when a different split is picked.',
    html: sheet({ behind: 'Tonight', title: `Bill rules${badge('admin only')}`, sub: 'what happens to the bill when the night is counted',
      body: billBody(0), bar: bar('Save the rule', { blocked: true }) }) },

  { id: 'bill-rules-changed', route: '/bill-rules', name: 'Bill rules · a different split picked', nav: 'sheet',
    html: sheet({ behind: 'Tonight', title: `Bill rules${badge('admin only')}`, sub: 'what happens to the bill when the night is counted',
      body: billBody(1), bar: bar('Save the rule') }) },

  { id: 'table-rules', route: '/table-rules', name: 'Table rules', nav: 'sheet',
    allowOverflow: true,
    note: 'Fourteen rows; the list scrolls under the bar and the last three (Check-raise, Short bank, Credit) are below the fold.',
    flags: ['The app sets “Not set” in amber. The look has no amber, so it is drawn muted and a set value in full ink; confirm, or name a token for it.'],
    html: sheet({ behind: 'Rules &amp; rulings', tall: true, title: 'Table rules', sub: 'How the table is run. Every answer that reads one of these says it in your group\'s words.',
      body: card(tableRules.map(([name, value, set]) => row({ name, value: set ? `<b style="color:var(--text)">${value}</b>` : value }))),
      bar: bar('Save') }) },

  { id: 'table-rules-pick', route: '/table-rules', name: 'Table rules · picking one', nav: 'sheet',
    note: 'Tapping an answer picks it and returns to the list, so this step has no bar.',
    flags: ['The app has no way back from this step except picking an answer: its close shuts the whole sheet. The back circle is README rule 2’s, not the app’s.', '“Not set” is amber in the app; drawn muted, as on the list.'],
    html: sheet({ behind: 'Rules &amp; rulings', stepBack: true, title: 'Run it twice', sub: 'Pick one. The answers that read this rule will say it in your group\'s words.',
      body: card([
        row({ name: 'By agreement' }),
        row({ name: 'Never' }),
        row({ name: '<span class="muted">Not set</span>', trail: `<span class="muted">${ico('check', 18)}</span>` }),
      ]) }) },

  { id: 'delete-account', route: '/delete-account', name: 'Delete your account', nav: 'sheet',
    note: 'The bar stays ink. What says this is destructive is the words, the trash icon, and the hold: 1.5 seconds, never a tap.',
    flags: [
      'Owner to confirm: an ink bar for a destructive action. The app’s hold button here is red (its danger variant); the look keeps red off buttons, so only the hold line and the icon mark it.',
      'This state cannot be opened in the reference build (no server). Drawn from the source for an admin whose group nobody else has a seat in; the group line is the app’s own for that case, but which case the seeded group would get is assumed.',
      'How the hold fills on a bar is not drawn; the app fills its button left to right.',
    ],
    html: sheet({ behind: 'Settings', title: 'Delete your account',
      body: [
        para('You leave. The record stays.'),
        label('Groups you run', { quiet: true }),
        card(row({ name: 'The Thursday game', meta: 'Deleted, with every night in it. Nobody else ever had a seat.', wrapMeta: true })),
      ],
      bar: bar(`<span style="display:inline-flex;align-items:center;gap:8px">${ico('trash', 18)}Delete account</span>`, { sub: 'Hold 1.5s · deletes now, no undo' }) }) },

  { id: 'delete-account-running', route: '/delete-account', name: 'Delete your account · a game is running', nav: 'sheet',
    flags: ['Not reachable in the reference build. The words are the app’s; the start time is the seeded night’s.'],
    html: sheet({ behind: 'Settings', title: 'A game is running',
      body: [
        para('The Thursday game is being recorded on your account. It started at 14:07.'),
        note('Settle it, or take it back and settle it, then come back here. Nothing has been deleted.'),
      ],
      bar: bar('Go to tonight') }) },

  { id: 'delete-account-failed', route: '/delete-account', name: 'Delete your account · no answer', nav: 'sheet',
    note: 'Nothing was read, so nothing may be held: this Try again is a tap. After a failed delete the same words are a hold again, with “Hold 1.5s · deletes now, no undo” under them.',
    html: sheet({ behind: 'Settings', title: 'Delete your account',
      body: [
        para('Nothing was deleted. There was no answer from the server.'),
        note('Your account, your groups and your seats are exactly as they were. Try again when you have a signal.'),
      ],
      bar: bar('Try again') }) },
];
