/** Stages 4-7: where the rules come off, and where the night is closed. */
import { writeFileSync } from 'node:fs';
import {
  T, F, money, signed, col, pushHead, sectionLabel, groupLabel,
  roundingBar, button, chip, spacer, footer, artboard,
} from './build.mjs';

const DIR = new URL('.', import.meta.url).pathname;
const W = 800, H = 910;
const write = (file, s) => writeFileSync(DIR + file, artboard({ ...s, w: W, h: H }));
const arrow = `<svg width="18" height="12" viewBox="0 0 18 12" fill="none" style="flex-shrink:0"><path d="M0 6h16M11.5 1.5 16 6l-4.5 4.5" stroke="${T.muted}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* -- 4 · Deductions ------------------------------------------------------ */
const shareRow = (name, working, amount, last) => `
          <div style="display: flex; align-items: center; gap: 10px; padding: 9px 0; ${last ? '' : `border-bottom: 1px solid ${T.hairline};`}">
            <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px">
              <div style="font: 600 15px ${F}; color: ${T.text}">${name}</div>
              <div style="font: 400 11.5px ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums">${working}</div>
            </div>
            <div style="font: 700 16px ${F}; color: ${T.offTable}; font-variant-numeric: tabular-nums">${money(amount)}</div>
          </div>`;

const ruleBlock = (name, terms, total, rows) => `
      <div style="margin: 0 20px 12px; padding: 14px 16px; border-radius: 14px; background: ${T.surface}">
        <div style="display: flex; align-items: baseline; gap: 10px; padding-bottom: 8px">
          <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
            <div style="font: 700 16px ${F}; color: ${T.text}">${name}</div>
            <div style="font: 400 11.5px ${F}; color: ${T.muted}">${terms}</div>
          </div>
          <div style="font: 800 18px ${F}; color: ${T.offTable}; font-variant-numeric: tabular-nums">${money(total)}</div>
        </div>
        ${rows}
      </div>`;

const previewRow = (name, formula, net, last) => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; ${last ? '' : `border-bottom: 1px solid ${T.previewRule};`}">
          <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
            <div style="font: 700 16px ${F}; color: ${T.text}">${name}</div>
            ${formula ? `<div style="font: 400 11.5px/1.35 ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums">${formula}</div>` : ''}
          </div>
          <div style="font: 700 18px ${F}; color: ${col(net)}; font-variant-numeric: tabular-nums; flex-shrink: 0">${signed(net)}</div>
        </div>`;

write('Deductions.dc.html', {
  n: 4, name: 'Deductions', route: '/deductions', chrome: 'PUSH · step 2 of 3', spec: 'E3 · 13-after-the-night',
  engine: 'settle().deductions · resultFormula()',
  prints: 'Every rule itemised per person while there is still time to change one. Then a dashed preview of where the rules leave everybody, as a sentence per player.',
  notes: [
    { kind: 'engine', title: 'The preview does no arithmetic', body: '<code>resultFormula</code> decides the membership, the order and the terms. The screen decides nothing — which is why it can never disagree with Settle up, which calls the same function.' },
    { kind: 'drop', title: '“Leaves the table” breaks the flow’s own copy rule', body: 'The four-screens handoff: <i>never the phrases “leaves the table” or “taken from the table” anywhere in this flow.</i> It is the label on this card. The settled night says the same thing correctly — <b>Deductions</b>.' },
    { kind: 'dup', title: 'The destinations line is said again twice', body: '“$120 back to Marek, $50 to Lena · $126 to the piggy bank” is <code>ruleOutcomes()</code> written out longhand. Settle up says half of it in its lede; the settled night draws all of it as a block. One component, three callers.' },
    { kind: 'dup', title: 'And the net list is said again one tap later', body: 'These six figures are Settle up’s <b>Night’s net</b> chips, in the same order, off the same call, with only the rounding bar between them.' },
  ],
  body: `${pushHead('Deductions', { step: '2 of 3' })}
      <div style="margin: 8px 20px 14px; padding: 15px 18px; border-radius: 14px; background: ${T.surface}; border: 1px solid ${T.hairline}; display: flex; flex-direction: column; gap: 4px">
        <div style="font: 500 13px ${F}; color: ${T.muted}">Leaves the table</div>
        <div style="font: 800 30px/1 ${F}; letter-spacing: -1px; color: ${T.text}; font-variant-numeric: tabular-nums">$296</div>
        <div style="font: 400 11.5px/1.5 ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums; padding-top: 2px">$120 back to Marek, $50 to Lena · $126 to the piggy bank</div>
      </div>
${ruleBlock('Group piggy bank', '5% of each win · split evenly', 126,
  shareRow('Dana', '5% of $1,620', 81) + shareRow('Marek', '5% of $460', 23) + shareRow('Lena', '5% of $430', 22, true))}
${ruleBlock('Kitchen &amp; drinks', '$170 · by size of win', 170,
  shareRow('Dana', '64.5% of $170', 110) + shareRow('Marek', '18.3% of $170', 31) + shareRow('Lena', '17.1% of $170', 29, true))}
      <div style="margin: 2px 20px 0; border: 1.5px dashed ${T.dashed}; border-radius: 12px; overflow: hidden">
        <div style="display: flex; align-items: center; gap: 10px; padding: 12px 14px 8px">
          <div style="font: 700 16px ${F}; color: ${T.text}; flex-grow: 1">Everyone after deductions</div>
          <div style="padding: 3px 7px; border: 1px solid ${T.dashed}; border-radius: 4px; font: 700 9.5px ${F}; letter-spacing: 1px; color: ${T.muted}">PREVIEW</div>
        </div>
${previewRow('Dana', 'game&nbsp;+$1,620 · piggy&nbsp;−$81 · food&nbsp;−$110', 1429)}
${previewRow('Marek', 'game&nbsp;+$460 · piggy&nbsp;−$23 · food&nbsp;+$89', 526)}
${previewRow('Lena', 'game&nbsp;+$430 · piggy&nbsp;−$22 · food&nbsp;+$21', 429)}
${previewRow('Tomáš', '', -500)}
${previewRow('Ivo', '', -780)}
${previewRow('Petr', '', -1230, true)}
        <div style="padding: 4px 14px 12px; font: 400 11.5px/1.5 ${F}; color: ${T.muted}">Provisional until you settle. Tap any figure above to change it.</div>
      </div>
${spacer}
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 14px 20px 6px">
        ${chip('Change a rule and look again')}
        ${button('See who pays whom', 'secondary')}
      </div>`,
});

/* -- 5 · Settle up ------------------------------------------------------- */
const transfer = (from, to, amount, last) => `
        <div style="display: flex; align-items: center; gap: 10px; padding: 12px 0; margin: 0 22px; ${last ? '' : `border-bottom: 1px solid ${T.hairline};`}">
          <div style="font: 600 16px ${F}; color: ${T.text}">${from}</div>
          ${arrow}
          <div style="font: 600 16px ${F}; color: ${T.text}; flex-grow: 1">${to}</div>
          <div style="font: 700 18px ${F}; color: ${T.text}; font-variant-numeric: tabular-nums">${money(amount)}</div>
        </div>`;

const netChip = (name, n) => `
          <div style="display: flex; align-items: center; gap: 7px; padding: 7px 11px; border-radius: 999px; border: 1px solid ${T.hairline}">
            <span style="font: 600 14px ${F}; color: ${T.text}">${name}</span>
            <span style="font: 700 14px ${F}; color: ${col(n)}; font-variant-numeric: tabular-nums">${n < 0 ? '−' : '+'}${Math.abs(n).toLocaleString('en-US')}</span>
          </div>`;

write('SettleUp.dc.html', {
  n: 5, name: 'Settle up', route: '/settle-up', chrome: 'PUSH · step 3 of 3', spec: 'E4 · frame 4a',
  engine: 'settle().transfers · resultFormula()',
  prints: 'The smallest set of transfers that clears the night, with the piggy bank as a payee like anybody else. Underneath, everybody’s net as a chip.',
  notes: [
    { kind: 'keep', title: 'The two lists disagree on purpose', body: 'The transfers are <b>balances</b> — what you hand over when the room breaks up, food money and piggy bank included. The chips are <b>scores</b> — the winnings after those came off. Both off the engine; neither computed here.' },
    { kind: 'drop', title: 'But the screen never says so', body: 'Nothing on it explains why Tomáš pays $500 across three rows and shows −$500 in a chip. Two lists of money that disagree, unlabelled, at 1am, is the sharpest confusion in the flow. Either caption the section or drop it.' },
    { kind: 'dup', title: 'The chips are E3’s preview again', body: 'Same six people, same order, same <code>resultFormula</code> call, one screen apart. If the caption above is added, keep them; if not, this is the copy to drop — the preview is where a figure can still be changed.' },
    { kind: 'dup', title: '“Change a rule and look again” is on both screens', body: 'Same label, same destination, one step apart. It belongs where the rules are itemised.' },
  ],
  body: `${pushHead('Settle up', { step: '3 of 3', lede: 'Six transfers clear the night. The piggy bank is set aside for the group.' })}
${roundingBar('nothing left over')}
      <div style="padding-top: 6px">
${transfer('Petr', 'Dana', 1230)}
${transfer('Ivo', 'Marek', 526)}
${transfer('Ivo', 'Lena', 254)}
${transfer('Tomáš', 'Dana', 199)}
${transfer('Tomáš', 'Lena', 175)}
${transfer('Tomáš', 'Piggy bank', 126, true)}
      </div>
${sectionLabel('Night’s net', '22px 26px 8px')}
        <div style="display: flex; flex-wrap: wrap; gap: 7px; margin: 0 22px">
${netChip('Dana', 1429)}${netChip('Marek', 526)}${netChip('Lena', 429)}${netChip('Tomáš', -500)}${netChip('Ivo', -780)}${netChip('Petr', -1230)}
        </div>
${spacer}
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 14px 20px 6px">
        ${chip('Change a rule and look again')}
        ${button('Close the session', 'primary')}
      </div>`,
});

/* -- 6 · It doesn't add up ----------------------------------------------- */
const countRow = (name, out, result, last) => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 11px 4px; margin: 0 22px; ${last ? '' : `border-bottom: 1px solid ${T.hairline};`}">
          <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
            <div style="font: 700 17px ${F}; color: ${T.text}">${name}</div>
            <div style="font: 400 12px ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums">${out}</div>
          </div>
          <div style="font: 700 19px ${F}; color: ${col(result)}; font-variant-numeric: tabular-nums">${signed(result)}</div>
        </div>`;

write('OutOfBalance.dc.html', {
  n: 6, name: 'It doesn’t add up', route: '/settle-up · caught', chrome: 'PUSH · replaces E4', spec: 'E5 · 13-after-the-night',
  engine: 'settle() threw → checkReconciliation() + balanceCheck()',
  prints: 'The gap twice — as a tag and as a sentence naming both figures and both likely causes — then every counted player as a row back into their own count. Three ways out, the third a footnote.',
  notes: [
    { kind: 'engine', title: 'The throw is the gate', body: '<code>settle()</code> refuses a night that does not balance and has not been confirmed. Catching that is what turns step 3 into this screen — the state is not stored anywhere, so it cannot go stale.' },
    { kind: 'drop', title: 'This is Count up’s balance block, retyped', body: '<code>$5,000 went in, $4,980 is accounted for</code> comes from the same <code>balanceCheck</code> call that paints the block one screen back. B40 already had to fix this sentence once for pairing the wrong two figures — a prose restatement of a card is a thing that drifts.' },
    { kind: 'drop', title: 'And these rows are a fourth row treatment', body: 'Tonight, Count up and Where everyone stands share <code>PlayerList.tsx</code>. This screen hand-rolls its own row for the same three facts.' },
    { kind: 'drop', title: 'The one screen in the flow that does its own arithmetic', body: '<code>stands.tsx</code> reads <code>resultBeforeDeductions(boughtIn, out)</code>. This screen reads <code>(out - s.boughtIn) as Money</code> — the same subtraction, on the screen, cast past the guard <code>subtract()</code> exists to apply.' },
  ],
  body: `${pushHead('It doesn’t add up')}
      <div style="margin: 8px 20px 18px; padding: 13px 15px; border-radius: 12px; background: ${T.dangerWash}; border: 1px solid ${T.dangerEdge}; display: flex; flex-direction: column; gap: 5px">
        <div style="font: 700 11px ${F}; letter-spacing: 1.1px; text-transform: uppercase; color: ${T.loss}; font-variant-numeric: tabular-nums">Off by $20</div>
        <div style="font: 400 13px/1.5 ${F}; color: ${T.text}">$5,000 went in, $4,980 is accounted for. Someone’s stack is short, or a buy-in was never written down.</div>
      </div>
${sectionLabel('Counted', '0 26px 4px')}
${countRow('Dana', 'out $2,120', 1620)}
${countRow('Marek', 'counted $960', 460)}
${countRow('Lena', 'counted $1,410', 410)}
${countRow('Tomáš', 'counted $0', -500)}
${countRow('Ivo', 'counted $220', -780)}
${countRow('Petr', 'counted $270', -1230, true)}
${spacer}
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 14px 20px 6px">
        <div style="font: 400 12.5px/1.6 ${F}; color: ${T.muted}">Fix a count, add the missing buy-in, or <span style="color: ${T.text}; text-decoration: underline; text-underline-offset: 3px">write the difference off to the piggy bank</span>.</div>
        <div style="display: flex; gap: 12px">
          ${button('Settle the night', 'blocked')}
          <div style="display: flex; align-items: center; justify-content: center; width: 96px; height: 52px; border-radius: 12px; border: 2px solid ${T.outline}; color: ${T.text}; font: 700 16px ${F}; flex-shrink: 0">Fix</div>
        </div>
      </div>`,
});

/* -- 7 · The night, settled ---------------------------------------------- */
const stat = (label, value, tone, align) => `
          <div style="min-width: 0; display: flex; flex-direction: column; gap: 4px; ${align === 'right' ? 'flex-shrink: 0; text-align: right;' : align === 'fixed' ? 'width: 74px;' : 'flex: 1;'}">
            <div style="font: 700 11px ${F}; letter-spacing: 1.1px; text-transform: uppercase; color: ${T.muted}">${label}</div>
            <div style="font: 800 26px/1 ${F}; letter-spacing: -.7px; color: ${tone}; font-variant-numeric: tabular-nums">${value}</div>
          </div>`;

const gameRow = (name, game, last) => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 4px; margin: 0 22px; ${last ? '' : `border-bottom: 1px solid ${T.hairline};`}">
          <div style="font: 700 17px ${F}; color: ${T.text}; flex-grow: 1">${name}</div>
          <div style="font: 700 19px ${F}; color: ${col(game)}; font-variant-numeric: tabular-nums">${signed(game)}</div>
        </div>`;

const outcomeRow = (name, holder, amount, float) => `
          <div style="display: flex; align-items: center; gap: 10px">
            <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
              <div style="font: 600 15px ${F}; color: ${float ? T.offTable : T.text}">${name}</div>
              <div style="font: 400 12.5px ${F}; color: ${T.muted}">${holder}</div>
            </div>
            <div style="font: 700 17px ${F}; color: ${float ? T.offTable : T.text}; font-variant-numeric: tabular-nums">${money(amount)}</div>
          </div>`;

write('Settled.dc.html', {
  n: 7, name: 'The night, settled', route: '/settled', chrome: 'PUSH · the record', spec: 'E6 · handoff-four-screens',
  engine: 'prizePool() · gameResults() · ruleOutcomes() · totalOffTable',
  prints: 'What the night was in three figures, what everybody did at the table, and what came off the top and who has it. Deductions are <b>not</b> folded into any player’s row — that is the whole of the 3 September change.',
  notes: [
    { kind: 'engine', title: 'The check this layout can state', body: 'The game results sum to <b>zero</b>. Nothing about the rules or the step can move them, which is what says the poker half of the night is sound.' },
    { kind: 'drop', title: '$296 is printed twice on one screen', body: '<code>DEDUCTIONS</code> at the top and <code>TOTAL</code> at the foot of the block are the same <code>totalOffTable</code>. The board draws both; <code>docs/screens.md</code> says there is no total row <i>“because the total is already on the screen, at the top”</i>. One of the two is wrong and nobody has answered which.' },
    { kind: 'drop', title: 'A player’s own net is no longer on the record', body: 'Taking the deductions out of the row was right. It also means “what did I actually end up with” — $1,429 for Dana — is now only behind <b>Full ledger</b> or on the player card, and no row here is tappable. That is a gap the de-duplication opened.' },
    { kind: 'dup', title: 'The rounding row is drawn here and does nothing', body: 'Rule 8 locks the step on a closed night, so it carries no chevron. It is also the only surface where it hides itself when rounding is off, against its own prop doc — which says it reads <i>off</i> rather than vanishing.' },
  ],
  body: `${pushHead('Sat 29 Aug', { meta: '20:05 → 23:45 · 3h 40m · 6 players · settled' })}
      <div style="display: flex; align-items: flex-start; gap: 12px; margin: 0 20px 18px; padding: 15px 18px; border-radius: 14px; background: ${T.surface}">
${stat('In play', '$5,000', T.text)}
${stat('Entries', '9', T.text, 'fixed')}
${stat('Deductions', '$296', T.offTable, 'right')}
      </div>
${sectionLabel('Game results', '0 26px 6px')}
${gameRow('Dana', 1620)}
${gameRow('Marek', 460)}
${gameRow('Lena', 430)}
${gameRow('Tomáš', -500)}
${gameRow('Ivo', -780)}
${gameRow('Petr', -1230, true)}
      <div style="margin: 14px 20px 0; padding: 14px 16px; border-radius: 14px; background: ${T.surface}; display: flex; flex-direction: column; gap: 10px">
        <div style="font: 700 12px ${F}; letter-spacing: 1.2px; text-transform: uppercase; color: ${T.muted}">Deductions</div>
${outcomeRow('Group piggy bank', 'held by Radka', 126, true)}
${outcomeRow('Kitchen &amp; drinks', '→ Lena, Marek', 170, false)}
        <div style="display: flex; align-items: center; gap: 10px; padding-top: 10px; border-top: 1px solid ${T.hairline}">
          <div style="font: 700 11px ${F}; letter-spacing: 1.1px; text-transform: uppercase; color: ${T.text}; flex-grow: 1">Total</div>
          <div style="font: 800 17px ${F}; color: ${T.text}; font-variant-numeric: tabular-nums">$296</div>
        </div>
      </div>
${spacer}
      <div style="display: flex; flex-direction: column; gap: 20px; padding: 14px 20px 6px">
        ${chip('Who has paid')}
        <div style="display: flex; gap: 14px">${button('Full ledger', 'secondary')}${button('Close', 'secondary')}</div>
      </div>`,
});
