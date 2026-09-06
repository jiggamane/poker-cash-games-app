/**
 * The game end flow, stop by stop, as the app draws it today.
 *
 * Every figure on every phone here is the seeded canonical night —
 * `packages/core/src/rev15-night.test.ts`, which the app opens with — walked
 * through the built web export by `scripts/ui-shots.mjs`. $5,000 in, $296 off
 * the table, six transfers. Nothing on this board was typed by hand into a
 * frame, so a figure that looks wrong here is wrong in the app.
 *
 *   node flow.mjs
 */
import { writeFileSync } from 'node:fs';
import { artboard, shell, phone, note, tag, C, F } from './build.mjs';

const DIR = new URL('.', import.meta.url).pathname;
const write = (file, html) => {
  writeFileSync(DIR + file, html);
  console.log('  ' + file);
};
const stop = (file, s) => write(file, artboard(s));

/* -- the flow, at a glance ------------------------------------------------ */

const STRIP = [
  { src: 'shot-01-tonight.png', id: 'T1', name: 'Tonight', door: 'hold 1s<br>End this poker night' },
  { src: 'shot-03-count-up-empty.png', id: 'E2', name: 'Count up', door: 'Next<br><i>balanced → Deductions<br>off → It doesn’t add up</i>' },
  { src: 'shot-08-deductions.png', id: 'E3', name: 'Deductions', door: 'See who<br>pays whom' },
  { src: 'shot-09-settle-up.png', id: 'E4', name: 'Settle up', door: 'Close the<br>session' },
  { src: 'shot-10-settled.png', id: 'R1', name: 'The night, settled', door: 'Who pays<br>whom' },
  { src: 'shot-12-payments.png', id: 'R2', name: 'Who pays whom', door: '' },
];

const arrow = (label) => `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 7px; width: 128px; flex-shrink: 0; padding-top: 178px">
        <svg width="40" height="12" viewBox="0 0 40 12" fill="none"><path d="M0 6h37M32.5 1.5 37 6l-4.5 4.5" stroke="${C.faint}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div style="font: 600 11.5px/1.4 ${F}; color: ${C.chipFg}; text-align: center">${label}</div>
      </div>`;

const thumb = (s) => `
      <div style="display: flex; flex-direction: column; gap: 10px; width: 197px; flex-shrink: 0">
        <img src="${s.src}" width="197" height="426" alt="" style="display: block; width: 197px; height: 426px; border-radius: 23px; box-shadow: 0 12px 30px rgba(11,11,15,.16)">
        <div style="display: flex; align-items: baseline; gap: 7px">
          <span style="font: 800 12px ${F}; color: #FFFFFF; background: ${C.ink}; padding: 3px 6px; border-radius: 5px">${s.id}</span>
          <span style="font: 700 14.5px ${F}; color: ${C.ink}">${s.name}</span>
        </div>
      </div>`;

const strip = STRIP.map((s, i) => thumb(s) + (s.door ? arrow(s.door) : '')).join('');

write(
  'Main.dc.html',
  shell(
    1890,
    760,
    `  <div style="display: flex; flex-direction: column; gap: 26px; width: 100%">

    <div style="display: flex; align-items: flex-start; gap: 40px">
      <div style="display: flex; flex-direction: column; gap: 9px; max-width: 720px">
        <span style="font: 600 11px/1 ${F}; letter-spacing: .14em; text-transform: uppercase; color: ${C.faint}">The game end flow · photographed 6 September 2026</span>
        <h1 style="margin: 0; font: 800 30px/1.12 ${F}; color: ${C.ink}; letter-spacing: -.025em">Six screens between a table with money on it and a night nobody argues about</h1>
        <p style="margin: 0; font: 400 14px/1.6 ${F}; color: ${C.muted}; text-wrap: pretty">Every phone on this board is the built app, played through the seeded canonical night — $5,000 in, $296 off the table, six transfers. The label between two screens is the control that actually moves you, in the words the app uses.</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; padding: 15px 17px; border-radius: 11px; background: ${C.card}; border: 1px solid ${C.edge}; width: 400px; flex-shrink: 0">
        <div style="font: 700 9.5px ${F}; letter-spacing: .13em; text-transform: uppercase; color: ${C.faint}">What carries down the flow</div>
        <div style="font: 400 12.5px/1.6 ${F}; color: ${C.body}; text-wrap: pretty">Counted stacks and the rounding step are set on <b>E2</b> and inherited by everything after it. Nets are computed from rounded stacks, never by rounding a net; <b>E4</b>'s transfers derive from those nets. The remainder goes to the piggy bank and nowhere else. The bill's shares and its payments stay separate in storage — <b>E3</b> and <b>E4</b> net them for display as one <code>food</code> term, <b>R1</b> puts both halves back on the row.</div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; padding: 15px 17px; border-radius: 11px; background: ${C.card}; border: 1px solid ${C.edge}; width: 400px; flex-shrink: 0">
        <div style="font: 700 9.5px ${F}; letter-spacing: .13em; text-transform: uppercase; color: ${C.faint}">Two counters that do not agree</div>
        <div style="font: 400 12.5px/1.6 ${F}; color: ${C.body}; text-wrap: pretty">The app's wizard counts <b>1 of 3 · 2 of 3 · 3 of 3</b> across Count up, Deductions and Settle up, and stops. The 1 September cut's three screens are Count up, Settle up and the settled night — Deductions is not in it, and the settled night is not a step. Both readings are on this board; nothing reconciles them.</div>
      </div>
    </div>

    <div style="display: flex; align-items: flex-start">${strip}
    </div>

  </div>`,
    0,
  ),
);

/* -- 1 · Tonight ---------------------------------------------------------- */

stop('Tonight.dc.html', {
  n: 1, name: 'Tonight', route: '/session', chrome: 'PUSH · Chrome A', step: 'T1 · 08-tonight-home',
  owns: 'The live table: who is seated, what each of them has in, what is on the table right now. It is also the only door into the ending flow.',
  exit: '<b>Table admin</b> opens the drawer; <b>End this poker night</b> is a <b>1 second hold</b>, not a tap — "counting starts, no rebuys". There is no tap path to it anywhere in the app.',
  shots: [
    { src: 'shot-01-tonight.png', state: 'Resting. <b>On the table $4,500</b> and <b>$5,000 in play</b> are different figures and keep different names.' },
    { src: 'shot-02-tonight-dock.png', state: 'The drawer open. Ending is drawn as a quiet outlined row in coral — not a red button.' },
  ],
  notes: [
    { kind: 'cut', title: 'Grouped, muted and signed · 1 Sept cut', body: 'A player who cashed out mid-night is a muted slab under <b>CASHED OUT · 1</b> carrying <b>+$1,620</b>. The right-hand column changes meaning between an active row (money in) and a settled one (result before deductions), and the group header is the only thing that says so.' },
    { kind: 'carries', title: 'Carries to E2', body: 'Every buy-in, every rebuy and every cash-out already taken. Dana is counted once here and is never re-counted — she arrives on Count up in a group of her own.' },
  ],
});

/* -- 2 · Count up --------------------------------------------------------- */

stop('CountUp.dc.html', {
  n: 2, name: 'Count up', route: '/count-up', chrome: 'PUSH · Chrome A', step: '1 of 3 · E2',
  owns: 'Every counted stack, and the rounding step for the whole night. The header block compares two sums: what went in, and what has been accounted for.',
  exit: '<b>Next</b>, dead until every stack is counted. Being off balance does <b>not</b> block the night — the gate is the count, not the agreement.',
  shots: [
    { src: 'shot-03-count-up-empty.png', state: 'Nothing counted. Only Dana\'s cash-out is accounted for: <b>−$2,880 · 42%</b>.' },
    { src: 'shot-04-count-up.png', state: 'Two stacks in. <b>−$490 · 90%</b>, and all three groups on screen at once.' },
    { src: 'shot-07-count-up-balanced.png', state: 'Balanced: <b>$0 · 100%</b>, one green segment. <b>Next</b> went live with the last stack counted, not with the balancing.' },
  ],
  notes: [
    { kind: 'cut', title: 'The header block · 6 September cut, option 1b', body: 'The <b>signed gap is the headline</b> — fluid from 38pt to a 24pt floor — with the percentage beside it and both sums in full underneath at 700 18. Nothing in the block can truncate at any digit count. The two-column card it replaced set both sums at display size in half a card each, and truncated any five-figure amount — which is the screen\'s one job (B43).' },
    { kind: 'cut', title: 'Three groups, and only one of them ranks', body: '<b>Still to count</b> holds seat order; <b>Counted</b> ranks by net, descending, exactly like the results screens; <b>Cashed out earlier</b> is never re-counted. Counting a stack animates the row into its rank slot, with the rows below FLIPping down.' },
    { kind: 'deviates', title: 'Two deliberate deviations · docs/screens.md', body: '<b>In play · 6 players</b>, not the cut\'s <i>Bought in</i> — one word for that figure app-wide was the owner\'s instruction of 5 September. And a fourth, amber state for a count that is not finished but whose figures happen to meet; the cut\'s three states are driven by the subtraction alone, and green there would call a night level with a stack still uncounted.' },
    { kind: 'carries', title: 'Carries to E3 and E4', body: '<code>countedRaw</code> and <code>countedRounded</code> for every player — the raw figure is never overwritten — plus the rounding step, which E4 and R1 display and neither owns.' },
  ],
});

/* -- 3 · It doesn't add up ------------------------------------------------ */

stop('OutOfBalance.dc.html', {
  n: 3, name: 'It doesn’t add up', route: '/settle-up · caught', chrome: 'PUSH · Chrome A', step: 'E5',
  owns: 'The branch. Every stack is counted and the two sums still do not meet, so the flow stops, names the difference to the unit and says which two things cause it.',
  exit: '<b>Settle the night</b> is drawn and dead — it carries no action at all. The two live ways on are <b>Fix</b>, back to the count, and the link in the sentence, which <b>writes the difference off to the piggy bank</b> and logs it; the night then balances and this screen becomes Settle up.',
  shots: [
    { src: 'shot-06-out-of-balance.png', state: 'Petr counted $20 light. Every player is listed with in and out, so the wrong figure can be found from here.' },
  ],
  notes: [
    { kind: 'cut', title: 'A night that does not balance skips Deductions', body: 'E2\'s <b>Next</b> goes to <code>/deductions</code> when the night is settled — the sums meet, <i>or</i> the difference has been written off — and straight to <code>/settle-up</code> when it is neither, where this is what <code>/settle-up</code> draws. So a night reaches this screen having skipped step 2, and reaches step 2 the moment the difference is accounted for. <b>Back</b> goes to Count up rather than to the step before.' },
    { kind: 'cut', title: 'Off balance does not block the count; it blocks the settle', body: '<b>Next</b> on E2 is dead only while a stack is missing — the gate there is the count. The gate here is the money: the difference is either found or written off and logged, and the write-off travels with the night into the book.' },
    { kind: 'open', title: 'The same fact, twice, in two shapes', body: 'E2\'s block already stated the same $20 in colour, at the top of the previous screen, seconds earlier. Here it is prose in a card. Recorded as finding 1 of <code>docs/game-outcomes-cjm.md</code> and unchanged since.' },
  ],
});

/* -- 4 · Deductions ------------------------------------------------------- */

stop('Deductions.dc.html', {
  n: 4, name: 'Deductions', route: '/deductions', chrome: 'PUSH · Chrome A', step: '2 of 3 · E3',
  owns: 'What leaves the table and who carries it: the bill split by the group\'s rule, the group\'s cut, and who fronted what at the counter.',
  exit: '<b>See who pays whom</b>. <b>Change a rule and look again</b> reopens the money rules without leaving the flow.',
  shots: [
    { src: 'shot-08-deductions.png', state: '<b>$296</b> leaves the table: $170 bill, $126 piggy. Each rule shows its own split, per player.' },
    { src: 'shot-08-deductions-tail.png', state: 'The foot: the preview block, the bill it was built from, and the way back to the rules.' },
  ],
  notes: [
    { kind: 'cut', title: 'This is the screen that draws format 7a', body: '<b>Everyone after deductions</b> is <code>7a</code> — name, then <code>game · food · piggy</code> on a grey sub-line, net hard right, off <code>resultFormula().terms</code>. R1 does <b>not</b> draw this row: it prints the engine\'s <code>caption</code> instead, which keeps the bill\'s two halves apart. So the settled night is not this screen with the PREVIEW tag removed, and the two rows are worth reading side by side.' },
    { kind: 'cut', title: 'A payer shows a credit', body: '<code>food</code> is a person\'s share of the bill netted with what they paid at the counter, so Andro — $31 of the split, $120 fronted — carries <b>food +$89</b>. Shares and payments stay separate in storage, and R1 puts them back on the row as <code>− 31 … + 120 paid</code>: this screen nets them, that one does not.' },
    { kind: 'deviates', title: 'The step nobody\'s flow doc names', body: 'The wizard counts this screen <b>2 of 3</b>. The 1 September cut\'s flow is E2 → E4 → E6, and Deductions is not one of its three. Neither counter is wrong; they are counting different things.' },
  ],
});

/* -- 5 · Settle up -------------------------------------------------------- */

stop('SettleUp.dc.html', {
  n: 5, name: 'Settle up', route: '/settle-up', chrome: 'PUSH · Chrome A', step: '3 of 3 · E4',
  owns: 'The transfers — the fewest moves that clear the night — read out at the table while people hand money over.',
  exit: '<b>Close the session</b>. This is the point of no return: after it the rounding step is locked and the night is a record rather than a table.',
  shots: [
    { src: 'shot-09-settle-up.png', state: 'Six transfers, the piggy bank among them as a payee. The rounding row is shown and settable while the night is open.' },
  ],
  notes: [
    { kind: 'cut', title: 'The net per player is a wrap of chips', body: 'Not a list. <b>Night\'s net</b> is six chips at <code>10 / 13</code>, radius 8, name and figure at 14 — and <b>no currency symbol</b>, because in a row of six the sign is the information and six dollar signs are six pieces of noise.' },
    { kind: 'cut', title: 'Rounding is displayed here, not owned', body: 'E2 owns the step. E4 and R1 show it, and E4 can still change it while the night is open — which recomputes from <code>countedRaw</code>, never from an already-rounded figure.' },
    { kind: 'carries', title: 'Carries to R1 and R2', body: 'The six transfers, unchanged, and the four terms per player that the settled night reads back. R2 marks these same transfers off one at a time.' },
  ],
});

/* -- 6 · The night, settled ----------------------------------------------- */

stop('Settled.dc.html', {
  n: 6, name: 'The night, settled', route: '/settled', chrome: 'PUSH · Chrome A', step: 'R1 · E6 in the 1 Sept cut',
  owns: 'The read-back, weeks later, by somebody who cannot ask the host. Three blocks: what happened at the table, what came off it, and what each person ends on.',
  exit: 'One footer button, full width: <b>Who pays whom</b>. <b>Full ledger</b> is a chip below the blocks, not a second footer action.',
  shots: [
    { src: 'shot-10-settled.png', state: 'The head: results before deductions, then the $296 that left the table, itemised by rule.' },
    { src: 'shot-10-settled-tail.png', state: 'The foot: <b>FINAL</b>, each net with its formula under the name, and the invariant stated — players net <b>−$126 → piggy bank</b>.' },
  ],
  notes: [
    { kind: 'cut', title: 'The row states the night\'s terms under the name', body: '<code>1,620 − 110 − 81</code> for Dana; <code>460 − 31 − 23 + 120 paid</code> for Andro, whose fronted bill comes back in full. The four-column table — format <code>7e</code> — is not the default here; it is what <b>Full ledger</b> opens.' },
    { kind: 'cut', title: 'Σ net = −piggy, on screen', body: '<b>Players net −$126 → piggy bank</b> is the flow doc\'s fourth invariant printed rather than asserted: the only money that leaves the table is the group\'s cut. The three above it — Σ game = 0, Σ food = 0, Σ piggy = −$126 — hold in these figures too.' },
    { kind: 'open', title: 'The meta line is clipped, in both themes', body: 'The line under the title — <code>07:35 → 10:45 · 3h 10m · 6 players · settled</code> — renders in a <b>12px box against a 17px line</b>, <code>overflow: hidden</code>, so every descender is cut. It shows here and not on <code>/payments</code>, whose identical line measures 17: this screen\'s body is long enough that the head gets squeezed. Measured on the same run these frames came from.' },
  ],
});

/* -- 7 · Full ledger ------------------------------------------------------ */

stop('FullLedger.dc.html', {
  n: 7, name: 'Full ledger', route: '/ledger', chrome: 'PUSH · Chrome A', step: 'format 7e',
  owns: 'The four columns — game, food, piggy, net — where the width is worth spending, plus the sentence that says what the first two mean.',
  exit: '<b>Back to the night</b>. It is a leaf: nothing leads on from here.',
  shots: [
    { src: 'shot-11-ledger.png', state: 'Six players, four columns, no scroll. Zero terms print as <code>$0</code> rather than being left blank.' },
  ],
  notes: [
    { kind: 'cut', title: 'Kept, but not as the default', body: '<code>7e</code> stopped being the settled screen\'s list on 1 September and became what the <b>Full ledger</b> chip opens. Where that button lands, and whether 7e is scrollable or paged, was left open by the cut — it is a chip below the blocks and the table fits without scrolling at six players.' },
    { kind: 'open', title: 'A term of $0, and nobody has decided', body: 'Two different things are drawn here and it is worth keeping them apart. <b>This table</b> prints <code>$0</code> in a cell and drops a column no one has a figure in. <b>The row</b> — R1\'s and E3\'s — is where the open question is: <code>02-E6-results-row.md</code> says a term of exactly zero still prints, the shipped <code>resultFormula</code> drops it, and <code>docs/screens.md</code> records that as unanswered rather than settled either way.' },
  ],
});

/* -- 8 · Who pays whom ---------------------------------------------------- */

stop('Payments.dc.html', {
  n: 8, name: 'Who pays whom', route: '/payments', chrome: 'PUSH · Chrome A', step: 'R2',
  owns: 'The same six transfers, now as a checklist: who still owes what, and how much of the night is still in the air.',
  exit: '<b>Mark all settled</b> closes it out, and changes its own word to <b>Mark the rest settled</b> once something has moved. <b>Nudge the table</b> is a chip in the footer above it: R2\'s footer is one button and this is not it, but <code>/payments</code> is the app\'s only door into <code>/nudge</code>. R1 answers the same problem the other way — <b>Full ledger</b> is a chip in the body.',
  shots: [
    { src: 'shot-12-payments.png', state: '<b>0 of 6 settled · $2,510 still to move</b>, and a progress rail under the list.' },
  ],
  notes: [
    { kind: 'cut', title: 'The title changed; the route did not', body: 'Always <code>/payments</code>, titled <b>Who has paid</b> until 5 September. R2 titles it <b>Who pays whom</b>, and the door off R1 is a footer button of the same name — the words on the button and the words on the screen match, which is the point.' },
    { kind: 'carries', title: 'Nothing carries on', body: 'This is where the flow ends. The night now reads back through <code>/games</code> and <code>/stats</code>, and through the player card, none of which can change a figure.' },
  ],
});

/* -- the bright theme ----------------------------------------------------- */

write(
  'BrightTheme.dc.html',
  shell(
    1440,
    1050,
    `  <div style="display: flex; flex-direction: column; gap: 22px">
    <div style="display: flex; flex-direction: column; gap: 8px; max-width: 900px">
      <span style="font: 600 11px/1 ${F}; letter-spacing: .14em; text-transform: uppercase; color: ${C.faint}">The same night, in the bright theme</span>
      <h2 style="margin: 0; font: 800 24px/1.15 ${F}; color: ${C.ink}; letter-spacing: -.02em">Money green and money red substitute; nothing else moves</h2>
      <p style="margin: 0; font: 400 13.5px/1.6 ${F}; color: ${C.muted}; max-width: 820px; text-wrap: pretty">Green <code>#6FCF97</code> becomes <code>#0A7A3D</code> and coral <code>#F0705C</code> becomes <code>#B03A28</code> — the dark values would sit at about 2.5:1 on a bright ground. Geometry, type and copy are identical, which is the check: anything that differs between these three and their dark twins is a bug, not a theme.</p>
    </div>
    <div style="display: flex; gap: 22px; align-items: flex-start">
      ${phone('shot-07-count-up-balanced-light.png', { state: 'E2 balanced. The block\'s border and both figures take the bright green.' })}
      ${phone('shot-10-settled-light.png', { state: 'R1. The meta line is clipped here too — it is geometry, not colour.' })}
      ${phone('shot-12-payments-light.png', { state: 'R2. The filled footer button inverts to ink on white.' })}
    </div>
  </div>`,
    0,
  ),
);

/* -- what this board found ------------------------------------------------ */

const finding = ({ n, title, body, where }) => `
      <div style="display: flex; gap: 14px; padding: 16px 18px; border-radius: 12px; background: ${C.card}; border: 1px solid ${C.edge}">
        <div style="width: 26px; height: 26px; border-radius: 13px; background: ${C.ink}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font: 800 12px ${F}; flex-shrink: 0">${n}</div>
        <div style="display: flex; flex-direction: column; gap: 7px; min-width: 0">
          <div style="font: 800 16px ${F}; color: ${C.ink}; letter-spacing: -.015em">${title}</div>
          <div style="font: 400 13px/1.6 ${F}; color: ${C.body}; text-wrap: pretty">${body}</div>
          <div style="font: 600 11px ${F}; color: ${C.faint}">${where}</div>
        </div>
      </div>`;

write(
  'Findings.dc.html',
  shell(
    1000,
    800,
    `  <div style="display: flex; flex-direction: column; gap: 18px; width: 100%">
    <div style="display: flex; flex-direction: column; gap: 8px">
      <span style="font: 600 11px/1 ${F}; letter-spacing: .14em; text-transform: uppercase; color: ${C.faint}">What photographing the flow turned up</span>
      <h2 style="margin: 0; font: 800 26px/1.15 ${F}; color: ${C.ink}; letter-spacing: -.02em">Four things, none of them arithmetic</h2>
      <p style="margin: 0; font: 400 13.5px/1.6 ${F}; color: ${C.muted}; text-wrap: pretty">Every figure on this board is one engine call and every one of them is right. What is listed here is what the pictures say about the screens around those figures.</p>
    </div>

${[
  {
    n: 1,
    title: 'R1’s meta line is cut in half',
    body: 'The line under the title on the settled night renders in a <b>12px box against a 17px line</b>, with <code>overflow: hidden</code> — so <code>players</code> loses its descender and the whole line looks half-drawn. <code>/payments</code> draws the identical component at its full 17px, so this is not the component: R1\'s body is long enough that the head is squeezed. It is visible only when the copy has a descender, which is why it has survived. Both themes.',
    where: 'Seen on Settled · measured on the same run · not yet in docs/bugs.md, and Screen.tsx is app-wide, so the fix wants a session of its own',
  },
  {
    n: 2,
    title: 'The balance fact is stated twice, one screen apart',
    body: 'E2\'s header block states the difference in colour, with the two sums under it. Tapping <b>Next</b> lands on a card that states the same difference again, in a paragraph, with the same two sums in prose. Recorded as finding 1 of the game-outcomes review and unchanged since; the 6 September cut rebuilt the block above it without touching this.',
    where: 'Count up → It doesn’t add up · docs/game-outcomes-cjm.md finding 1',
  },
  {
    n: 3,
    title: 'Two step counters, counting different things',
    body: 'The wizard says <b>1 of 3 · 2 of 3 · 3 of 3</b> over Count up, Deductions and Settle up. The 1 September cut\'s flow doc says the three screens are Count up, Settle up and the settled night. A host who reads both is told Deductions both is and is not a step, and that the screen they end on either is or is not the third one.',
    where: 'Count up, Deductions, Settle up · design/handoff-count-up-to-settled/docs/01-the-flow.md',
  },
  {
    n: 4,
    title: 'Three things on this board have no drawn frame at all',
    body: 'E2\'s amber fourth state — a count that is not finished but whose figures happen to meet — is built and decided and drawn nowhere. Neither is the counted-row animation, which is specified to the millisecond in the 6 September README and cannot be photographed at all. And the block has no <b>light twin</b>: the cut draws its four frames in the dark theme only, which this board\'s bright-theme artboard is standing in for.',
    where: 'Count up · design/handoff-count-up-header/README.md, docs/screens.md — “what is still to ask for is the light twin of the new block”',
  },
].map(finding).join('')}
  </div>`,
    0,
  ),
);
