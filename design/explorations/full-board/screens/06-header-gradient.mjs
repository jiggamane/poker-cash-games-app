/**
 * The header gradient (owner, 23 November, from a reference frame called "Rail"): the ink top lit from
 * above, a lighter shade at the status bar falling to the top's own colour where the sheet rises over it,
 * with a soft glow at the upper left. Only the top's background changes; the sheet, the cards and the bar
 * are as approved. Each screen is shown light and dark side by side.
 */
import home from './10-home-tonight.mjs';
import counting from './60-counting-up.mjs';

const ALL = Object.fromEntries([...home, ...counting].map((x) => [x.id, x]));

// Light: the ink #141A2A, lit to #2B3348. Dark: the near-black #0A0D14, lit to #262A33 (the reference's grey).
const CSS = `
.hg .fb .scr{background:radial-gradient(120% 60% at 15% 0%,rgba(255,255,255,.07),transparent 60%),linear-gradient(180deg,#2B3348 0,#141A2A 300px)}
.hg.dark .fb .scr{background:radial-gradient(120% 60% at 15% 0%,rgba(255,255,255,.06),transparent 60%),linear-gradient(180deg,#262A33 0,#0A0D14 300px)}
.hg .fb .top .tpill{background:rgba(255,255,255,.12)}`;

const pair = (id) => `<div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center"><div class="hg" style="display:contents">${ALL[id].html}</div><div class="hg dark" style="display:contents">${ALL[id].html}</div></div>`;

const SCREENS = [
  ['home', 'Home', 'The group’s name and the doors under a lit top.'],
  ['session', 'Tonight', 'The figure on the table sits in the lit part; the sheet rises where the top has reached its own colour.'],
  ['settled', 'Post-game results', 'A short top: only the first of the light shows above the sheet.'],
  ['count-up', 'Count up', 'The equation on the top, lit from above.'],
];

export const section = { title: 'This round: the header gradient',
  blurb: 'The top lit from above, as in the reference you sent: a lighter shade at the status bar falling to the ink where the sheet begins, with a soft glow at the upper left. Light on the left of each pair, dark on the right.' };

export default SCREENS.map(([id, name, note], i) => ({
  id: `hg-${id}`, route: ALL[id].route, name: `Header gradient · ${name}`, nav: ALL[id].nav, wide: true, note,
  html: (i === 0 ? `<style>${CSS}</style>` : '') + pair(id),
}));
