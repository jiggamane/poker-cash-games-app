/**
 * The footer in the dark (owner, 23 November: "the footer is black while the content area is dark blue;
 * I'd rather have the footer in dark blue, but if it is the same as the content it may not work; try
 * several approaches"). Each option is the dark theme with only the bar's colour, and how it is parted
 * from the sheet, changed; shown on Tonight (the split bar under its drawer row) and on the settled night
 * (a single action). The light theme is untouched by all of them.
 */
import screens from './10-home-tonight.mjs';

const by = Object.fromEntries(screens.map((x) => [x.id, x.html]));
const scope = (k, css) => css.split('\n').filter(Boolean).map((l) => { const i = l.indexOf('{'); return l.slice(0, i).split(',').map((sel) => `.df-${k} ${sel.trim()}`).join(',') + l.slice(i); }).join('\n');
const pair = (k, css) => `<style>${scope(k, css)}</style><div class="dark df-${k}" style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center">${by.session}${by.settled}</div>`;

const OPTIONS = [
  ['a', 'A · as drawn, near-black', 'For comparison: the bar is the top’s near-black (#0A0D14), darker than the ink sheet, so the screen reads as a dark frame round a blue middle.', ''],
  ['b', 'B · the sheet’s blue, a hairline above', 'The bar takes the sheet’s own blue (#171C27). A hairline across its top edge is all that parts it from the content; the words stay white and bold.',
    `.fb{--bar:#171C27}\n.fb .bar{box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}`],
  ['c', 'C · the sheet’s blue, a soft shadow above', 'The same blue, parted by a soft shadow cast up onto the content instead of a line, so the bar reads as floating just above the sheet.',
    `.fb{--bar:#171C27}\n.fb .bar{box-shadow:0 -12px 24px -10px rgba(0,0,0,.65)}`],
  ['d', 'D · a step lighter than the sheet', 'The bar is one step up from the sheet, the cards’ own blue (#212836): it reads as a raised surface, as the cards do, and needs no line.',
    `.fb{--bar:#212836}`],
  ['e', 'E · a deeper, richer blue', 'A blue with more colour in it (#1B2740): darker than the cards, bluer than the sheet. Distinct from the content without going black.',
    `.fb{--bar:#1B2740}\n.fb .bar{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}`],
  ['f', 'F · the light action, as on Home', 'The sheet’s blue for the bar, and the action itself set as a light pill on it, as Start a session is a light card in the dark. The most contrast; it gives up the words-straight-on-the-bar idea in the dark only.',
    `.fb{--bar:#171C27}\n.fb .bar{box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}\n.fb .bar .acts,.fb .bar > .act{margin:8px 14px 0;border-radius:16px;background:#ECEEF2}\n.fb .bar .act,.fb .bar .act *{color:#141A2A!important}\n.fb .bar .act.sec{box-shadow:inset 1px 0 0 rgba(20,26,42,.14)!important}`],
];

export const section = { title: 'This round: the footer in the dark',
  blurb: 'Dark theme only: six ways to colour the bar against the blue sheet, each on Tonight and on the settled night. Approve one, or say which to combine.' };

export default OPTIONS.map(([k, name, note, css]) => ({ id: `dark-foot-${k}`, route: '/session', name: `Dark footer ${name}`, nav: 'push', wide: true, note, html: pair(k, css) }));
