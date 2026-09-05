/** Stages 8-10: the three places the night is read back afterwards. */
import { writeFileSync } from 'node:fs';
import {
  T, F, money, signed, col, pushHead, sheetHead, sectionLabel,
  button, chip, spacer, footer, artboard,
} from './build.mjs';

const DIR = new URL('.', import.meta.url).pathname;
const W = 800, H = 910;
const write = (file, s) => writeFileSync(DIR + file, artboard({ ...s, w: W, h: H }));
const arrow = `<svg width="18" height="12" viewBox="0 0 18 12" fill="none" style="flex-shrink:0"><path d="M0 6h16M11.5 1.5 16 6l-4.5 4.5" stroke="${T.muted}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const tick = (on) => on
  ? `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" style="flex-shrink:0"><circle cx="11" cy="11" r="10" fill="${T.winTint}"/><path d="M6 11l3.5 3.5L16 7.5" stroke="${T.win}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  : `<div style="padding: 6px 10px; border-radius: 999px; border: 1.5px solid ${T.quietOutline}; font: 600 11.5px ${F}; color: ${T.text}; flex-shrink: 0">Mark paid</div>`;

/* -- 8 · Full ledger ----------------------------------------------------- */
const head = (label, w) =>
  `<div style="width: ${w}px; padding-left: 8px; text-align: right; font: 600 10px ${F}; letter-spacing: .7px; text-transform: uppercase; color: ${T.muted}">${label}</div>`;
const cell = (n, w) =>
  `<div style="width: ${w}px; padding-left: 8px; text-align: right; font: 400 14px ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums">${n === 0 ? '—' : signed(n)}</div>`;

const ledgerRow = (name, game, food, piggy, net) => `
        <div style="display: flex; align-items: center; padding: 9px 0; border-top: 1px solid ${T.hairline}">
          <div style="flex: 1; min-width: 0; font: 600 16px ${F}; color: ${T.text}">${name}</div>
${cell(game, 64)}${cell(food, 60)}${cell(piggy, 60)}
          <div style="width: 74px; padding-left: 8px; text-align: right; font: 700 16px ${F}; color: ${col(net)}; font-variant-numeric: tabular-nums">${signed(net)}</div>
        </div>`;

write('FullLedger.dc.html', {
  n: 8, name: 'Full ledger', route: '/ledger', chrome: 'PUSH · read-only', spec: 'format 7e · 02-E6-results-row',
  engine: 'resultColumns() · columnsFit()',
  prints: 'The same four terms the deductions preview says as a sentence, said as a table instead. A column nobody has a figure in is not drawn; a night whose rules do not fit four columns gets a message instead of a term short.',
  notes: [
    { kind: 'keep', title: 'Two drawings of one night, not two answers', body: 'The columns and the formula line are the same decomposition off the same engine. That is a legitimate pair — width is the reason there are two of them.' },
    { kind: 'drop', title: 'It is now the only place the net lives on a settled night', body: 'Since the settled night stopped folding deductions into the row, this screen carries the one figure a player actually argues about a week later, behind a button labelled with a word for a document. Either put the net back on the settled row as a second, muted figure — or promote this screen.' },
    { kind: 'dup', title: 'The fifth view model of one decomposition', body: '<code>resultColumns</code>, <code>resultFormula</code>, <code>receiptRows</code>, <code>resultRows</code> and <code>workingRows</code> all break one player’s night into terms. Two of those five have no reader in the app at all.' },
  ],
  body: `${pushHead('Full ledger')}
      <div style="margin: 4px 20px 0">
        <div style="display: flex; align-items: flex-end; padding-bottom: 7px">
          <div style="flex: 1"></div>
${head('game', 64)}${head('food', 60)}${head('piggy', 60)}${head('net', 74)}
        </div>
${ledgerRow('Dana', 1620, -110, -81, 1429)}
${ledgerRow('Marek', 460, 89, -23, 526)}
${ledgerRow('Lena', 430, 21, -22, 429)}
${ledgerRow('Tomáš', -500, 0, 0, -500)}
${ledgerRow('Ivo', -780, 0, 0, -780)}
${ledgerRow('Petr', -1230, 0, 0, -1230)}
        <div style="padding-top: 9px; font: 400 11.5px/1.48 ${F}; color: ${T.muted}">Game = cashed out less bought in. Food = their share of the bill, plus whatever they paid at the counter.</div>
      </div>
${spacer}
${footer(button('Back to the night', 'primary'))}`,
});

/* -- 9 · The player card ------------------------------------------------- */
const statPair = (label, value, tone, align) => `
          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; ${align ? `text-align: ${align};` : ''}">
            <div style="font: 500 12.5px ${F}; color: ${T.muted}">${label}</div>
            <div style="font: 800 28px/1 ${F}; letter-spacing: -1px; color: ${tone}; font-variant-numeric: tabular-nums">${value}</div>
          </div>`;

const workingRow = (label, amount, tone, signedFig) => `
          <div style="display: flex; align-items: center; gap: 12px; padding: 7px 0">
            <div style="flex-grow: 1; min-width: 0; font: 400 14px ${F}; color: ${tone === T.muted ? T.muted : T.text}">${label}</div>
            <div style="font: 600 15px ${F}; color: ${tone}; font-variant-numeric: tabular-nums">${signedFig ? signed(amount) : money(amount)}</div>
          </div>`;

const entry = (kind, when, amount) => `
          <div style="display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid ${T.hairline}">
            <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
              <div style="font: 600 15px ${F}; color: ${T.text}">${kind}</div>
              <div style="font: 400 11.5px ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums">${when}</div>
            </div>
            <div style="font: 600 15px ${F}; color: ${T.text}; font-variant-numeric: tabular-nums">${amount}</div>
          </div>`;

write('PlayerCard.dc.html', {
  n: 9, name: 'The player card', route: '/player', chrome: 'SHEET · Chrome B', spec: 'T2 / T4 · 08-tonight-home',
  engine: 'workingRows() · nightScore() · finalPosition',
  prints: 'One person’s night as the working — in, out, result, then every rule that touched them, then their score. The answer to “why is my number this”, for somebody who cannot ask the host three weeks later.',
  notes: [
    { kind: 'engine', title: 'The labels come off the night’s own rule snapshot', body: 'A night settled under an older bill still names the split it was settled with. That is why these rows live in core rather than on the screen.' },
    { kind: 'dup', title: 'A sixth shape for the same decomposition', body: 'The ledger says Marek as <code>460 · +89 · −23 · 526</code>; this says the same night as six labelled rows, because it also shows the $120 he fronted and got back. Both are right — but they are two hand-maintained orderings of one list.' },
    { kind: 'drop', title: 'Three strings here are not on any board', body: '“After deductions”, “Their night” and the empty line were written to fit, and flagged as such in the source. No board draws this sheet after a night has been settled at all — the surface that answers the commonest question is the least specified one in the flow.' },
  ],
  body: `${sheetHead('Marek', 'settled · Sat 29 Aug')}
      <div style="display: flex; gap: 12px; margin: 14px 20px 0; padding: 16px 18px; border-radius: 14px; background: ${T.surface}; border: 1px solid ${T.hairline}">
${statPair('In for', '$500', T.text)}
${statPair('Counted', '$960', T.text, 'center')}
${statPair('Night', '+$460', T.win, 'right')}
      </div>
${sectionLabel('Entries', '20px 26px 4px')}
      <div style="margin: 0 22px">
${entry('Buy-in', '20:12', '$500')}
${entry('Paid for pizza', '21:40', '$120')}
${entry('Final count', '23:52', '$960')}
      </div>
      <div style="margin: 20px 22px 0; padding-top: 14px; border-top: 1px solid ${T.hairline}">
        <div style="font: 700 12px ${F}; letter-spacing: 1.2px; text-transform: uppercase; color: ${T.muted}; padding-bottom: 4px">After deductions</div>
${workingRow('In', 500, T.text)}
${workingRow('Out', 960, T.text)}
${workingRow('Result', 460, T.win, true)}
${workingRow('Group piggy bank · 5%', -23, T.offTable, true)}
${workingRow('Kitchen &amp; drinks · by size of win', -31, T.offTable, true)}
${workingRow('Back to you · fronted the bill', 120, T.text, true)}
        <div style="display: flex; align-items: center; gap: 12px; padding-top: 11px; margin-top: 5px; border-top: 1px solid ${T.hairline}">
          <div style="flex-grow: 1; font: 700 16px ${F}; color: ${T.text}">Their night</div>
          <div style="font: 800 20px ${F}; color: ${T.win}; font-variant-numeric: tabular-nums">+$526</div>
        </div>
      </div>
${spacer}
      <div style="display: flex; gap: 14px; padding: 14px 20px 6px">${button('Correct an entry', 'secondary')}${button('Close', 'secondary')}</div>`,
});

/* -- 10 · Who has paid --------------------------------------------------- */
const payRow = (from, to, amount, paid, last) => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 13px 12px; margin: 0 20px 8px; border-radius: 10px; background: ${paid ? T.drawerFill : 'transparent'}; border: 1px solid ${paid ? 'transparent' : T.hairline}">
          <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
            <div style="display: flex; align-items: center; gap: 8px">
              <span style="font: 600 16px ${F}; color: ${paid ? T.muted : T.text}">${from}</span>
              ${arrow}
              <span style="font: 600 16px ${F}; color: ${paid ? T.muted : T.text}">${to}</span>
            </div>
            <div style="font: 400 11.5px ${F}; color: ${paid ? T.win : T.amber}">${paid ? 'Paid' : 'Waiting'}</div>
          </div>
          <div style="font: 700 17px ${F}; color: ${paid ? T.muted : T.text}; font-variant-numeric: tabular-nums">${money(amount)}</div>
          ${tick(paid)}
        </div>`;

write('Payments.dc.html', {
  n: 10, name: 'Who has paid', route: '/payments', chrome: 'PUSH · the week after', spec: 'E7 · 13-after-the-night',
  engine: 'settle().transfers — again',
  prints: 'One row per transfer, with a state under the names. Nothing on this screen changes the night’s result: the book closes at the table and the money moves over the following week.',
  notes: [
    { kind: 'keep', title: 'The one honest repeat of the transfer list', body: 'Settle up is a list you read out loud once; this is a checklist you clear over a week. Same rows, genuinely different job — and no figure in the app reads <code>paidAt</code>, so a host who never opens it has lost nothing.' },
    { kind: 'dup', title: 'Drawn from scratch anyway', body: 'A transfer row is a name, an arrow, a name and a figure on both screens, and the two are separate markup. One <code>TransferRow</code> with an optional trailing slot covers both.' },
    { kind: 'drop', title: 'And it is reachable from exactly one place', body: 'The settled night’s <b>Who has paid</b> chip is the only door into it in the whole app — a deviation the source flags, still open, waiting on a place for E7 to be reached from.' },
  ],
  body: `${pushHead('Who has paid', { meta: 'Sat 29 Aug · 2 of 6 cleared' })}
      <div style="padding-top: 4px">
${payRow('Petr', 'Dana', 1230, true)}
${payRow('Ivo', 'Marek', 526, true)}
${payRow('Ivo', 'Lena', 254, false)}
${payRow('Tomáš', 'Dana', 199, false)}
${payRow('Tomáš', 'Lena', 175, false)}
${payRow('Tomáš', 'Piggy bank', 126, false, true)}
      </div>
${spacer}
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 14px 20px 6px">
        ${chip('Nudge the table')}
        ${button('Back to the night', 'primary')}
      </div>`,
});
