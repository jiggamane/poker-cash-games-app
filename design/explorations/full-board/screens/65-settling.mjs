/**
 * Ending the night: the transfers that clear it (E4), the same step when the
 * count does not balance (E5), the settled night's other two views, Who pays
 * whom afterwards, and the reminder sheet.
 *
 * `/settled`'s Final, detailed view is in `10-home-tonight.mjs`; this file adds
 * Final, grouped and On table, and the view menu open.
 */
import { push, sheet, bar, label, card, row, note, pill, button, quiet, ico } from '../kit.mjs';

const arrow = `<span class="muted" style="display:inline-block;vertical-align:-2px;margin:0 7px">${ico('arrow', 15)}</span>`;
const transfers = [['Petr', 'Dana', '$1,230'], ['Ivo', 'Andro', '$526'], ['Ivo', 'Lena', '$254'], ['Tomáš', 'Dana', '$199'], ['Tomáš', 'Lena', '$175']];

/* The rounding step, stated as one row. On settle-up it opens the Rounding sheet; after the close it is locked. */
const rounding = card(row({ name: 'Rounding · off', value: 'to the dollar' }));

/* A transfer row. `mark`: undefined (no marker), 'open' (ring) or 'paid' (check); `off` draws a payee that is not a player in the muted ink. */
const ring = `<span style="width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 1.6px var(--outline);flex:none"></span>`;
const tick = `<span class="win" style="width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 1.6px currentColor;display:grid;place-items:center;flex:none">${ico('check', 13)}</span>`;
const transfer = ([from, to, amount], { mark, off = false } = {}) =>
  `<div class="row${mark === 'paid' ? ' dimr' : ''}"><span class="n${off && mark !== 'paid' ? ' muted' : ''}">${from}${arrow}${to}</span><span class="a${off && mark !== 'paid' ? ' muted' : ''}">${amount}</span>${mark === 'paid' ? tick : mark === 'open' ? ring : ''}</div>`;

/* Night's net: a name and a signed figure, outlined, no currency symbol. */
const netChip = ([name, amount]) =>
  `<span style="display:flex;justify-content:center;align-items:baseline;gap:4px;height:32px;line-height:32px;padding:0 2px;min-width:0;border-radius:10px;box-shadow:inset 0 0 0 1px var(--line);font-weight:600;font-size:12px;white-space:nowrap">${name}<b class="num ${amount.startsWith('+') ? 'win' : 'loss'}">${amount}</b></span>`;
const nets = [['Dana', '+1,429'], ['Andro', '+526'], ['Lena', '+429'], ['Tomáš', '−500'], ['Ivo', '−780'], ['Petr', '−1,230']];

/* The settled night's rows in the two views that draw both stacks. */
const stacks = (i, o) => `<span style="display:inline-flex;align-items:center;gap:4px">${ico('chipsIn', 12)}${i}<span style="width:6px"></span>${ico('chipsOut', 12)}${o}</span>`;
const spendMarks = (figure) => `<span style="display:inline-flex;align-items:center;gap:5px">${ico('food', 12)}${ico('piggy', 12)}<span class="num">${figure}</span></span>`;
const night = [
  ['Dana', '−500', '+2,120', '+$1,429', '−191', '+$1,620'],
  ['Andro', '−500', '+960', '+$526', '+66', '+$460'],
  ['Lena', '−1,000', '+1,430', '+$429', '−1', '+$430'],
  ['Tomáš', '−500', '+0', '−$500', '', '−$500'],
  ['Ivo', '−1,000', '+220', '−$780', '', '−$780'],
  ['Petr', '−1,500', '+270', '−$1,230', '', '−$1,230'],
];
const tone = (s) => (s.startsWith('+') ? 'win' : 'loss');
const groupedRows = card(night.map(([name, i, o, net, spends]) => row({ name, meta: stacks(i, o), amount: net, tone: tone(net), under: spends ? spendMarks(spends) : '' })));
const tableRows = card(night.map(([name, i, o, , , table]) => row({ name, meta: stacks(i, o), amount: table, tone: tone(table), under: 'before spends' })));

const blockLine = (icon, name, what, figure) =>
  `<div style="display:flex;gap:6px;align-items:center"><span class="muted">${ico(icon, 14)}</span><span>${name}</span><span class="muted" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${what}</span><b class="num">${figure}</b></div>`;
const block = (lines) => `<div style="display:grid;gap:6px;font-size:12px;margin:0 2px">${lines.join('')}</div>`;
const deductionsBlock = [
  label('Deductions', { right: '$296', quiet: true }),
  block([blockLine('food', 'Kitchen &amp; drinks', 'Lena and Andro fronted', '$170'), blockLine('piggy', 'Group piggy bank', 'held by the group', '$126')]),
];
const ended = card(row({ name: 'Ended · 17:23', value: 'same night' }));
const settledTop = { title: 'Fri 20 Nov', sub: '14:07 → 17:23' };
const dd = (text, open = false) => `<span class="tdd">${text}${ico(open ? 'chevronUp' : 'chevronDown', 14)}</span>`;

const menuItem = (name, sub, on) =>
  `<div style="display:flex;gap:10px;align-items:center;padding:10px 14px;${on ? 'background:var(--raised)' : ''}"><span style="width:16px;flex:none">${on ? ico('check', 14) : ''}</span><span><b style="display:block;font-weight:${on ? 700 : 500};font-size:15px">${name}</b><span class="muted" style="font-size:12.5px">${sub}</span></span></div>`;
const viewMenu = `<div style="position:absolute;top:8px;right:18px;width:212px;z-index:2;border-radius:14px;overflow:hidden;background:var(--card);box-shadow:var(--lift),0 0 0 1px var(--line)">${
  menuItem('Final, detailed', 'every spend itemised', false)}${menuItem('Final, grouped', 'spends as one figure', true)}${menuItem('On table', 'chips in, chips out', false)}</div>`;

const piggyNote = `<div style="display:flex;gap:9px;align-items:flex-start"><span class="muted" style="margin-top:2px">${ico('info', 14)}</span>${note('The piggy bank is set aside for the group, so it stays on the book after the night closes.')}</div>`;

export const section = { title: 'Ending the night: who pays whom', blurb: 'The transfers that close the session, the same step when the count is off, the settled night read two more ways, and the payments ticked off afterwards.' };

export default [
  { id: 'settle-up', route: '/settle-up', name: 'Settle up', nav: 'push',
    note: 'Close the session is the bar. The rounding step and the way back to the rules stay in the content.',
    html: push({ title: 'Settle up', trailing: '3 of 3',
      body: [
        note('Six transfers clear the night. The piggy bank is set aside for the group.'),
        rounding,
        card([...transfers.map((t) => transfer(t)), transfer(['Tomáš', 'Piggy bank', '$126'])]),
        label('Night’s net', { quiet: true }),
        `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">${nets.map(netChip).join('')}</div>`,
        button('Change a rule and look again'),
      ],
      bar: bar('Close the session') }) },

  { id: 'settle-up-off', route: '/settle-up', name: 'It doesn’t add up', nav: 'push',
    note: 'The bar keeps the app’s two controls: Settle the night blocked, Fix live beside it. Writing the difference off stays a sentence, not a button.',
    flags: ['The app draws the “Off by” block on a red wash with a red edge. The kit has no danger surface, so it is a card with a red label here: does the look want a wash for an alarm?'],
    html: push({ title: 'It doesn’t add up',
      body: [
        card(`<div class="red" style="font:700 11px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;margin-bottom:7px">Off by $2,880</div><div style="font-size:13px;line-height:1.45">$5,000 went in, $2,120 is accounted for. Someone’s stack is short, or a buy-in was never written down.</div>`, { pad: true }),
        label('Counted', { quiet: true }),
        card([['Dana', 'in 500 · out 2,120', '+$1,620'], ['Andro', 'in 500 · out 0', '−$500'], ['Lena', 'in 1,000 · out 0', '−$1,000'], ['Tomáš', 'in 500 · out 0', '−$500'], ['Ivo', 'in 1,000 · out 0', '−$1,000'], ['Petr', 'in 1,500 · out 0', '−$1,500']]
          .map(([name, meta, amount]) => row({ name, meta, amount, tone: tone(amount) }))),
        note('Fix a count, add the missing buy-in, or <span style="text-decoration:underline">write the difference off to the piggy bank</span>.'),
      ],
      bar: `<div class="bar"><div class="acts"><div class="act dead"><span>Settle the night</span></div><div class="act sec">${ico('pencil', 20)}<span>Fix</span></div></div></div>` }) },

  { id: 'settled-grouped', route: '/settled', name: 'Post-game results · Final, grouped', nav: 'push',
    flags: ['The app reads “Lena and Andro fronted”; the Final, detailed entry in 10-home-tonight.mjs has “Lena and Andro paid”. One of the two is wrong, and the app says fronted.', 'The app’s “Ended · 17:23 / same night” row (it opens the end-time sheet) is drawn here and is missing from the Final, detailed entry. With no chevrons, nothing marks it as the one row on this screen that can be changed.', 'In the app this screen’s footer button is outlined on purpose (a record being read, not a step). The bar makes it the action, following the Final, detailed entry.'],
    html: push({ ...settledTop, subRight: dd('Final, grouped'),
      body: [groupedRows, ...deductionsBlock, ended],
      bar: bar('Who pays whom') }) },

  { id: 'settled-view-menu', route: '/settled', name: 'Post-game results · view menu open', nav: 'push',
    note: 'The menu drops from the control on the ink and lies over the sheet; the list behind it goes to 32%, as in the app.',
    html: push({ ...settledTop, subRight: dd('Final, grouped', true),
      body: [`<div style="opacity:.32;display:flex;flex-direction:column;gap:12px">${[groupedRows, ...deductionsBlock].join('')}</div>`, ended, viewMenu],
      bar: bar('Who pays whom') }) },

  { id: 'settled-on-table', route: '/settled', name: 'Post-game results · On table', nav: 'push',
    html: push({ ...settledTop, subRight: dd('On table'),
      body: [
        tableRows,
        label('Chips', { right: 'balanced', quiet: true }),
        block([blockLine('chipsIn', 'In', '9 buy-ins', '$5,000'), blockLine('chipsOut', 'Out', '6 counted', '$5,000')]),
        note('$296 of spends is not applied in this view.'),
        ended,
      ],
      bar: bar('See the final result') }) },

  { id: 'payments', route: '/payments', name: 'Who pays whom', nav: 'push',
    flags: ['The app draws the piggy bank’s row (Tomáš → Radka) in its bone colour. The kit has no bone token, so it is muted ink here.', 'Nudge the table is a small outlined chip in the app; here it is a quiet text button with the message icon, which the app does not draw.', 'Settle up names this payee “Piggy bank” and this screen names the holder, “Radka”. Both are the app’s own; drawn as they are.'],
    note: 'Mark all as paid is the bar; Nudge the table stays in the content. A row is ticked by tapping it anywhere.',
    html: push({ title: 'Who pays whom', sub: 'Fri 20 Nov · 6 transfers',
      body: [
        card([
          `<div class="row" style="align-items:flex-end;padding:10px 0"><span class="n"><span class="muted" style="display:block;font:700 10.5px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Left to move</span><span class="num" style="font-weight:700;font-size:26px;line-height:1;letter-spacing:-.02em">$2,510</span></span><span style="text-align:right"><span class="muted" style="display:block;font:700 10.5px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Status</span>${pill('$2,510 to move')}</span></div>`,
          row({ name: 'Rounding · off', value: 'to the dollar' }),
        ]),
        label('Transfers', { right: '0 of 6 paid', quiet: true }),
        card([...transfers.map((t) => transfer(t, { mark: 'open' })), transfer(['Tomáš', 'Radka', '$126'], { mark: 'open', off: true })]),
        piggyNote,
        quiet('Nudge the table', { icon: 'message' }),
      ],
      bar: bar('Mark all as paid') }) },

  { id: 'payments-settled', route: '/payments', name: 'Who pays whom · all paid', nav: 'push',
    flags: ['Not captured from the app: figures follow from every row being ticked ($0, 6 of 6 paid, pill “Settled”, all from the source). The app fills the paid marker green; drawn as a green ring with a check, since the look has no green fills.'],
    note: 'With every row ticked the app has no footer at all, so there is no bar: back is the way out.',
    html: push({ title: 'Who pays whom', sub: 'Fri 20 Nov · 6 transfers',
      body: [
        card([
          `<div class="row" style="align-items:flex-end;padding:10px 0"><span class="n"><span class="muted" style="display:block;font:700 10.5px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Left to move</span><span class="num" style="font-weight:700;font-size:26px;line-height:1;letter-spacing:-.02em">$0</span></span><span style="text-align:right"><span class="muted" style="display:block;font:700 10.5px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Status</span>${pill('Settled', 'win')}</span></div>`,
          row({ name: 'Rounding · off', value: 'to the dollar' }),
        ]),
        label('Transfers', { right: '6 of 6 paid', quiet: true }),
        card([...transfers.map((t) => transfer(t, { mark: 'paid' })), transfer(['Tomáš', 'Radka', '$126'], { mark: 'paid', off: true })]),
        piggyNote,
      ] }) },

  { id: 'nudge', route: '/nudge', name: 'Nudge the table', nav: 'sheet',
    flags: ['No capture of this sheet with figures. Each debtor’s amount is the sum of their transfers ($1,230, $780, $500, which equal the night’s final losses), and Dana is the collector by the source’s rule (owed the most).'],
    html: sheet({ behind: 'Who pays whom', title: 'Nudge the table',
      sub: 'One message, to the three who have not paid. It says the amount and who is collecting — nothing else.',
      body: [
        card(`<div class="muted" style="font:700 11px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px">What they get</div><div style="font-size:15px;line-height:1.45">The Thursday game · Fri 20 Nov. You owe $1,230. Dana is collecting.</div>`, { pad: true }),
        label('Goes to', { quiet: true }),
        card([['Petr', '$1,230'], ['Ivo', '$780'], ['Tomáš', '$500']].map(([name, amount]) => row({ name, amount, tone: 'loss' }))),
        note('A nudge never marks anything paid, and it goes out once. Whoever has paid already is left out of it.'),
      ],
      bar: bar('Send to three') }) },

  { id: 'nudge-none', route: '/nudge', name: 'Nudge the table · nobody left', nav: 'sheet',
    note: 'Nothing to send, so no bar: the app’s one control here is a secondary.',
    html: sheet({ behind: 'Who pays whom', title: 'Nudge the table',
      sub: 'Everyone has paid. There is nobody left to remind.',
      body: [button('Back to the payments')] }) },
];
