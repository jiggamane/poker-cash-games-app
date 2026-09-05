/** Page 2: where each figure is printed, and what to do about it. */
import { writeFileSync } from 'node:fs';
const DIR = new URL('.', import.meta.url).pathname;
const F = "-apple-system, 'SF Pro Text', 'Figtree', sans-serif";

const shell = (title, w, h, inner) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; background: #F6F6F8; font-family: ${F}; }
    a { color: #0B0B0F; } a:hover { color: #4A4D55; }
  </style>
</helmet>
<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; padding: 40px 44px; background: #F6F6F8; display: flex; flex-direction: column; gap: 22px">
${inner}
</div>
</x-dc>
</body>
</html>
`;

const heading = (eyebrow, h1, p) => `
  <div style="display: flex; flex-direction: column; gap: 9px; max-width: 940px">
    <span style="font: 700 10.5px ${F}; letter-spacing: .15em; text-transform: uppercase; color: #8E8E93">${eyebrow}</span>
    <h1 style="margin: 0; font: 800 32px/1.1 ${F}; color: #0B0B0F; letter-spacing: -.032em">${h1}</h1>
    <p style="margin: 0; font: 400 13.5px/1.62 ${F}; color: #6C6C70; text-wrap: pretty">${p}</p>
  </div>`;

/* ---- the overlap matrix ------------------------------------------------- */

const SURFACES = ['Tonight', 'Count up', 'Stands', 'Deductions', 'Settle up', 'Off balance', 'Settled', 'Full ledger', 'Player card', 'Payments', 'Stats / Watch'];

/* o = where the figure is decided · x = the same figure again · . = absent */
const ROWS = [
  ['Money in', '<code>totalBoughtIn</code>', 'x o . . . x x . x . x', '“total in”, “bought in”, “prizepool”, “in play”, “in for” — one number, five nouns'],
  ['How many · entries, players', '<code>prizePool</code> · <code>balanceCheck</code>', '. o . . . . x . . . x', 'split across the card and the meta line on the settled night'],
  ['Game result', '<code>resultBeforeDeductions</code>', 'x x x . . x o x x . .', 'seven surfaces, one function — and four row treatments to draw it'],
  ['Net after deductions', '<code>resultFormula</code> · <code>nightScore</code>', '. . . o x . . x x . x', 'not on the settled night at all since 3 Sept'],
  ['Deductions total', '<code>totalOffTable</code>', '. . . x . . o . . . .', 'twice on the settled night alone — the card and the block’s total'],
  ['Where the money went', '<code>ruleOutcomes</code> · credits', '. . . x x . o . x . .', 'a longhand line, half a lede, and a block'],
  ['Transfers', '<code>settle().transfers</code>', '. . . . o . . . . x .', 'the one honest repeat: read out once, ticked off over a week'],
  ['The rounding step', '<code>roundingMode</code>', '. o . . x x . . . . .', 'settable on one, inert on the rest'],
  ['Does it balance', '<code>balanceCheck</code>', '. o . . . x x . . . .', 'a card, a sentence, and a block — same two figures'],
  ['“Change a rule and look again”', '—', '. . . o x . . . . . .', 'same label, same destination, one step apart'],
];

const dot = (c) => {
  if (c === 'o') return `<div style="width: 11px; height: 11px; border-radius: 6px; background: #0B0B0F"></div>`;
  if (c === 'x') return `<div style="width: 11px; height: 11px; border-radius: 6px; border: 2px solid #C08A2A; box-sizing: border-box"></div>`;
  return `<div style="width: 5px; height: 5px; border-radius: 3px; background: rgba(12,13,15,.14)"></div>`;
};

const matrixRow = (r, i) => {
  const cells = r[2].split(' ').map((c) =>
    `<div style="width: 74px; flex-shrink: 0; display: flex; align-items: center; justify-content: center">${dot(c)}</div>`).join('');
  return `
      <div style="display: flex; align-items: center; ${i === 0 ? '' : 'border-top: 1px solid rgba(12,13,15,.08);'}">
        <div style="width: 232px; flex-shrink: 0; padding: 11px 12px 11px 0; display: flex; flex-direction: column; gap: 2px">
          <div style="font: 700 13.5px ${F}; color: #0B0B0F">${r[0]}</div>
          <div style="font: 400 11px ${F}; color: #8E8E93">${r[1]}</div>
        </div>
        ${cells}
        <div style="flex: 1; min-width: 0; padding: 11px 0 11px 18px; font: 400 11.5px/1.45 ${F}; color: #6C6C70">${r[3]}</div>
      </div>`;
};

writeFileSync(DIR + 'Overlap.dc.html', shell('Overlap', 1560, 800, `
${heading('The poker club · game outcomes · overlap', 'Ten figures, eleven surfaces',
  'Where each outcome figure is printed. A <b>filled dot</b> is the surface that owns it — where it is decided, entered or first stated. A <b>ring</b> is the same figure printed again somewhere else. Every one of them comes off the same engine call, so none of these can disagree; what they cost is a reader working out whether two numbers on two screens are the same number.')}

  <div style="background: #FFFFFF; border-radius: 14px; border: 1px solid rgba(12,13,15,.08); padding: 6px 20px 10px; flex-grow: 1">
    <div style="display: flex; align-items: flex-end; padding-bottom: 6px; border-bottom: 1px solid rgba(12,13,15,.14)">
      <div style="width: 232px; flex-shrink: 0"></div>
      ${SURFACES.map((s) => `<div style="width: 74px; flex-shrink: 0; display: flex; justify-content: center"><div style="font: 700 9.5px ${F}; letter-spacing: .06em; color: #6C6C70; text-align: center; line-height: 1.3">${s.replace(' ', '<br>')}</div></div>`).join('')}
      <div style="flex: 1; min-width: 0"></div>
    </div>
${ROWS.map(matrixRow).join('')}
  </div>

  <div style="display: flex; gap: 22px; align-items: center">
    <div style="display: flex; align-items: center; gap: 8px"><div style="width: 11px; height: 11px; border-radius: 6px; background: #0B0B0F"></div><span style="font: 500 11.5px ${F}; color: #4A4D55">the surface that owns it</span></div>
    <div style="display: flex; align-items: center; gap: 8px"><div style="width: 11px; height: 11px; border-radius: 6px; border: 2px solid #C08A2A; box-sizing: border-box"></div><span style="font: 500 11.5px ${F}; color: #4A4D55">printed again</span></div>
    <div style="display: flex; align-items: center; gap: 8px"><div style="width: 5px; height: 5px; border-radius: 3px; background: rgba(12,13,15,.14)"></div><span style="font: 500 11.5px ${F}; color: #4A4D55">absent</span></div>
  </div>
`));

/* ---- the ranked findings ------------------------------------------------ */

const KIND = {
  drop: ['#B03A28', 'rgba(176,58,40,.09)', 'DROP OR MERGE'],
  merge: ['#8A5A00', 'rgba(138,90,0,.1)', 'ONE COMPONENT'],
  name: ['#0A5C31', 'rgba(10,122,61,.08)', 'NAME IT'],
  gap: ['#3A4CA0', 'rgba(58,76,160,.08)', 'A GAP THIS OPENED'],
  done: ['#0A5C31', 'rgba(10,122,61,.12)', 'DONE · 5 SEPT'],
};

const finding = (n, kind, title, where, body, action) => {
  const [fg, bg, label] = KIND[kind];
  return `
      <div style="display: flex; gap: 16px; padding: 16px 18px; border-radius: 12px; background: #FFFFFF; border: 1px solid rgba(12,13,15,.08)">
        <div style="width: 26px; height: 26px; border-radius: 13px; background: #0B0B0F; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font: 800 12px ${F}; flex-shrink: 0">${n}</div>
        <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px">
          <div style="display: flex; align-items: center; gap: 9px; flex-wrap: wrap">
            <div style="font: 700 16px ${F}; color: #0B0B0F">${title}</div>
            <span style="padding: 3px 7px; border-radius: 4px; background: ${bg}; font: 700 9px ${F}; letter-spacing: .1em; color: ${fg}">${label}</span>
          </div>
          <div style="font: 500 11px ${F}; color: #8E8E93">${where}</div>
          <div style="font: 400 12.5px/1.6 ${F}; color: #3F4149; text-wrap: pretty">${body}</div>
          <div style="display: flex; gap: 8px; align-items: flex-start; padding-top: 3px">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink: 0; margin-top: 2px"><path d="M1 7h11M8 3l4 4-4 4" stroke="${fg}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <div style="font: 600 12.5px/1.55 ${F}; color: ${fg}">${action}</div>
          </div>
        </div>
      </div>`;
};

writeFileSync(DIR + 'Findings.dc.html', shell('Findings', 1560, 1620, `
${heading('The poker club · game outcomes · what to cut', 'Twelve places the same thing is said twice',
  'Ordered by what a reader loses, not by how much code moves. Nothing here is an arithmetic bug — every figure comes off one tested engine, and that part of the app is right. What repeats is the <i>saying</i> of it: the same number under a second noun, the same list one screen later, the same block rewritten as a sentence. Each entry names where it is now and the smallest change that removes it.')}

  <div style="display: flex; gap: 16px; flex-grow: 1">
    <div style="flex: 1; display: flex; flex-direction: column; gap: 12px">
${finding(1, 'merge', 'The balance card is built once and rewritten as prose', 'count-up.tsx · settle-up.tsx (E5)',
  'Count up draws the whole equation as a card with a bar and a verdict. “It doesn’t add up” states the same two figures, off the same <code>balanceCheck</code> call, as a sentence in an alert. B40 already had to fix that sentence once for pairing the wrong two figures — the card cannot make that mistake, and the prose can make it again.',
  'Extract <code>BalanceBlock</code> to <code>src/components/</code>. E5 draws it in the <b>short</b> / <b>over</b> paint that <code>paint()</code> already defines and nothing currently reaches.')}
${finding(2, 'name', 'Two lists of money that disagree, with nothing saying why', 'settle-up.tsx',
  'The transfers move the food money and the piggy bank; the <b>Night’s net</b> chips are the winnings after those came off. Tomáš pays out $500 across three rows and shows −$500 in a chip. The reasoning is three paragraphs in <code>docs/screens.md</code> and not one word on the screen.',
  'One line under the section label — <i>what each night came to, after the food and the piggy bank</i> — or drop the chips, which are the deductions preview again one screen later.')}
${finding(3, 'drop', 'The deductions total is printed twice on one screen', 'NightResult.tsx',
  '<code>DEDUCTIONS $296</code> in the header card and <code>TOTAL $296</code> at the foot of the block are the same <code>totalOffTable</code>. The four-screens board draws both. <code>docs/screens.md</code> says there is no total row <i>“because the total is already on the screen, at the top”</i>. Board and spec now contradict each other and nobody has answered which wins.',
  'Answer it. The spec wins on behaviour and the board on layout, and this is layout — so the row stays and the doc is wrong. Fix the doc, or take the row and say so.')}
${finding(4, 'drop', 'Four view models in core have no reader', 'packages/core/src/working.ts',
  '<code>receiptRows</code>, <code>resultRows</code>, <code>playerDeductions</code> and <code>ruleCollector</code> are exported, tested and called from nowhere in the app. <code>docs/screens.md</code> still says <i>“<code>receiptRows</code> is still what the player card draws”</i> — the player card draws <code>workingRows</code>.',
  'Delete the four and their tests, or write down which screen is waiting for them. A tested function with no caller is a claim about the app that is not true.')}
${finding(5, 'merge', 'Where the money went is said three times, three ways', 'deductions.tsx · settle-up.tsx · NightResult.tsx',
  '“$120 back to Marek, $50 to Lena · $126 to the piggy bank” on E3; “The piggy bank is set aside for the group” in E4’s lede; “→ Lena, Marek” and “held by Radka” in E6’s block. All three are <code>deductions[].credits</code>, and only the third is built on <code>ruleOutcomes()</code>.',
  'One <code>RuleOutcomeList</code> off <code>ruleOutcomes()</code>, drawn on E3 and E6. E4’s lede keeps the transfer count and drops the rest.')}
${finding(6, 'drop', '“Leaves the table” is the one phrase this flow forbids', 'deductions.tsx',
  'The four-screens handoff, verbatim: <i>never the phrases “leaves the table” or “taken from the table” anywhere in this flow.</i> It is the label on E3’s summary card. The settled night says the same figure correctly, one word: <b>Deductions</b>.',
  'Relabel the card <b>Deductions</b>, matching E6. It is a one-string change and it is a copy rule, not a preference.')}
    </div>

    <div style="flex: 1; display: flex; flex-direction: column; gap: 12px">
${finding(7, 'gap', 'A settled night no longer shows anybody their net', 'settled.tsx · ledger.tsx',
  'Taking the deductions out of the game-results row was right — a bill split flat across eight people is not a poker result. But it also moved the figure a player argues about a week later ($1,429, not $1,620) behind a button called <b>Full ledger</b>, and no row on the record is tappable.',
  'Put the net back on the row as a second, muted figure at the right of the game result — or give <b>Full ledger</b> a name that says it holds your number.')}
${finding(8, 'done', 'A whole screen existed to re-sort the screen behind it', 'stands.tsx — deleted',
  '<b>Where everyone stands</b> drew Count up’s finished players again, off the same two calls, in the same two groups. What it added was a sort and a rank number. The screen, its route, its link off E2 and its legs in four UI passes are gone; E2’s two finished groups rank biggest winner first in their place — within each group, because a counted slab reopens the keypad and a cashed-out one does not.',
  'Still open: Tonight’s <b>Cashed out</b> group. <code>session.tsx</code> sent that exact question to E2b, which no longer exists.')}
${finding(9, 'done', 'One number, four nouns', 'session.tsx · count-up.tsx · NightResult.tsx',
  '$5,000 was “total in” on Tonight, “BOUGHT IN” on Count up and “PRIZEPOOL” on the settled night — a host sees all three inside ten minutes with nothing saying they are one figure. <code>/watch</code> already said <b>IN PLAY</b>, so that is the word and the other three now use it. <b>On the table</b> and <b>In for</b> keep their own names: different numbers, not the same one spelled differently.',
  'Two costs, recorded not argued away: it deviates from the board, which draws PRIZEPOOL, and it is past tense on a settled night.')}
${finding(10, 'merge', 'Four row treatments for one player’s result', 'PlayerList.tsx · settle-up.tsx',
  'Tonight, Count up and Where everyone stands share <code>ActiveRow</code> and <code>FinishedSlab</code>. E5’s counted list hand-rolls a fourth for the same three facts — name, what finished them, the signed result.',
  'E5 uses <code>FinishedSlab</code>. Same for the transfer row, which Settle up and Who has paid each draw from scratch.')}
${finding(11, 'drop', '“Change a rule and look again” is on two consecutive screens', 'deductions.tsx · settle-up.tsx',
  'Identical label, identical destination, one step apart. On E3 it is the point of the screen — the rules are itemised right above it. On E4 the decision has been made and the room is handing over cash.',
  'Keep it on E3. If E4 needs a way back, it is the back button, which is already there.')}
${finding(12, 'name', 'The rounding row hides itself against its own contract', 'NightResult.tsx',
  'Its prop doc says the row <i>“says <code>off</code> rather than vanishing”</i>, because a night that never rounded still has a setting. The render is <code>result.rounding.on &amp;&amp; …</code>, so on a settled night that did not round, it vanishes.',
  'Pick one and make the code and the comment agree. Showing it is the documented intent and the one that keeps the settled night’s height stable.')}
    </div>
  </div>
`));
