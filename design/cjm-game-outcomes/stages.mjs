/** The ten outcome surfaces, in the order a host walks them. */
import { writeFileSync } from 'node:fs';
import {
  T, F, money, signed, col, pushHead, sheetHead, sectionLabel, groupLabel,
  activeRow, slab, roundingBar, button, chip, spacer, footer, artboard,
} from './build.mjs';

const DIR = new URL('.', import.meta.url).pathname;
const W = 800, H = 910;
const chevron = `<svg width="8" height="13" viewBox="0 0 8 13" fill="none" style="flex-shrink:0"><path d="M1 1l5.5 5.5L1 12" stroke="${T.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const pencil = `<svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M11.6 1.9l3.5 3.5L5.4 15.1 1 16l.9-4.4 9.7-9.7z" stroke="${T.amber}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const check = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 8l4 4 8-10" stroke="${T.win}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const arrow = `<svg width="18" height="12" viewBox="0 0 18 12" fill="none" style="flex-shrink:0"><path d="M0 6h16M11.5 1.5 16 6l-4.5 4.5" stroke="${T.muted}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const write = (file, s) => writeFileSync(DIR + file, artboard({ ...s, w: W, h: H }));

/* -- 1 · Tonight --------------------------------------------------------- */
write('Tonight.dc.html', {
  n: 1, name: 'Tonight', route: '/session', chrome: 'PUSH · Chrome A', spec: 'T1 · 08-tonight-home',
  engine: 'resolveLedger() → totalBoughtIn · resultBeforeDeductions()',
  prints: 'Two sums, and only when they differ: what the seated players still have in front of them, and every dollar the night has to reconcile against. One row per player; a finished row already carries a result.',
  notes: [
    { kind: 'engine', title: 'First appearance of a result', body: 'A cashed-out slab prints <b>out less in</b> — the same subtraction Count up, Where everyone stands and the settled night all print. One function, <code>resultBeforeDeductions</code>, four callers. This is the part that is right.' },
    { kind: 'engine', title: 'DONE · the word is “in play”', body: '5 September. $5,000 was “total in” here, “BOUGHT IN” on E2 and “PRIZEPOOL” on the settled night — one figure under three nouns on three screens a host sees inside ten minutes. <code>/watch</code> already said <b>in play</b>, so that is the word everywhere. <b>On the table</b> beside it is a different figure and keeps its name.' },
    { kind: 'dup', title: 'Still open: this group does not rank', body: 'E2’s two finished groups now rank biggest winner first. These rows draw their result at the right edge too, and <code>session.tsx</code> sent exactly this question to <b>Where everyone stands</b> — which no longer exists. Left in seat order pending a call.' },
  ],
  body: `${pushHead('Tonight', { meta: 'The Thursday game · 3h 40m · since 20:05' })}
      <div style="margin: 4px 20px 0; padding: 18px; border-radius: 14px; background: ${T.surface}; display: flex; align-items: flex-end; gap: 12px">
        <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px">
          <div style="font: 500 15px ${F}; color: ${T.muted}">On the table</div>
          <div style="font: 800 44px/1 ${F}; letter-spacing: -1.8px; color: ${T.text}; font-variant-numeric: tabular-nums">$2,880</div>
        </div>
        <div style="font: 500 13.5px ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums; flex-shrink: 0; padding-bottom: 5px">$5,000 in play</div>
      </div>
${groupLabel('Still playing', 5)}
${activeRow('Petr', 'in $1,500 · 3 buy-ins', chevron)}
${activeRow('Lena', 'in $1,000', chevron)}
${activeRow('Ivo', 'in $1,000 · 2 buy-ins', chevron)}
${activeRow('Marek', 'in $500', chevron)}
${activeRow('Tomáš', 'in $500', chevron, true)}
${groupLabel('Cashed out', 1)}
${slab('Dana', '23:15 · out $2,120', 1620)}
${spacer}
      <div style="display: flex; gap: 10px; padding: 10px 20px 6px">
        ${button('+ Rebuy', 'primary')}
        <div style="display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 12px; border: 2px solid ${T.outline}; color: ${T.text}; font: 700 20px ${F}; flex-shrink: 0">⋯</div>
      </div>`,
});

/* -- 2 · Count up -------------------------------------------------------- */
const sum = (label, labelColor, figure, figureColor, sub) => `
          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px">
            <div style="font: 700 11px ${F}; letter-spacing: 1.1px; text-transform: uppercase; color: ${labelColor}">${label}</div>
            <div style="font: 800 26px/1 ${F}; letter-spacing: -.7px; color: ${figureColor}; font-variant-numeric: tabular-nums">${figure}</div>
            <div style="font: 400 11.5px ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums">${sub}</div>
          </div>`;

write('CountUp.dc.html', {
  n: 2, name: 'Count up', route: '/count-up', chrome: 'PUSH · step 1 of 3', spec: 'E2 · handoff-E2',
  engine: 'balanceCheck() → boughtIn · accountedFor · left · state',
  prints: 'The whole equation in one block that never changes height: what went in, what is accounted for, what is left, and how far along. Then three groups — still to count, counted, cashed out earlier.',
  notes: [
    { kind: 'engine', title: 'Green is only ever the verdict', body: 'The state holds at <i>counting</i> until every seated stack is in, including the busted player’s $0, so two figures meeting by coincidence can never paint the card green.' },
    { kind: 'dup', title: 'The block is built here and rebuilt as prose on E5', body: '“It doesn’t add up” states the same two figures as a sentence — <code>$5,000 went in, $4,980 is accounted for</code> — from the same <code>balanceCheck</code> call. The paint table in <code>count-up.tsx</code> already has <b>short</b> and <b>over</b> states nothing else can reach.' },
    { kind: 'drop', title: 'Extract BalanceBlock', body: 'Move it to <code>src/components/</code> and let E5 draw it in the red paint <code>paint()</code> already defines and this screen already reaches. One block, three states, two screens — and the sentence that has to be kept in step with it disappears.' },
    { kind: 'engine', title: 'DONE · the finished groups rank', body: '5 September. Biggest winner first, within each group. <b>Where everyone stands</b> was a whole screen that drew these same rows in this same order one tap away; it is deleted, along with the link that was here. <b>Still to count</b> keeps seat order — an em dash is not a position.' },
  ],
  body: `${pushHead('Count up', { step: '1 of 3' })}
      <div style="margin: 8px 20px 0; border-radius: 14px; background: ${T.surface}; border: 1px solid ${T.hairline}; overflow: hidden">
        <div style="display: flex; gap: 14px; padding: 15px 18px 13px">
${sum('In play', T.muted, '$5,000', T.text, '6 players · 9 buy-ins')}
          <div style="width: 1px; background: ${T.hairline}"></div>
${sum('Accounted for', T.amber, '$3,570', T.text, '4 counted · 1 cashed out')}
        </div>
        <div style="display: flex; height: 6px; margin: 0 18px 12px; border-radius: 3px; overflow: hidden">
          <div style="flex: 3570; background: ${T.amber}"></div>
          <div style="flex: 1430; background: ${T.track}"></div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; padding: 11px 18px; background: ${T.strip}; border-top: 1px solid ${T.hairline}">
          <div style="font: 700 12.5px ${F}; letter-spacing: .8px; color: ${T.text}; font-variant-numeric: tabular-nums; flex-grow: 1">$1,430 LEFT TO ACCOUNT FOR</div>
          <div style="font: 400 11.5px ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums">71% accounted for</div>
        </div>
      </div>
${roundingBar('nothing left over')}
${groupLabel('Still to count', 1)}
${activeRow('Lena', 'in $1,000', `<div style="display:flex;align-items:center;gap:10px"><span style="font:700 19px ${F};color:${T.dim}">—</span>${pencil}</div>`, true)}
${groupLabel('Counted', 4)}
${slab('Marek', 'counted $960', 460)}
${slab('Tomáš', 'counted $0', -500)}
${slab('Ivo', 'counted $220', -780)}
${slab('Petr', 'counted $270', -1230)}
${groupLabel('Cashed out earlier', 1)}
${slab('Dana', '23:15', 1620)}
${spacer}
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 10px 20px 6px">
        ${button('Next', 'blocked')}
      </div>`,
});
