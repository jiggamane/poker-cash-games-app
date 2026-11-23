/**
 * The footer in the dark (owner, 23 November: "the footer is black while the content area is dark blue;
 * I'd rather have the footer in dark blue, but if it is the same as the content it may not work; try
 * several approaches"). Each option is the dark theme with only the bar's colour, and how it is parted
 * from the sheet, changed; shown on Tonight (the split bar under its drawer row) and on the settled night
 * (a single action). The light theme is untouched by all of them.
 */
import screens from './10-home-tonight.mjs';
import getIn from './20-getting-in.mjs';
import opening from './30-opening-a-game.mjs';
import during from './40-during-the-game.mjs';
import counting from './60-counting-up.mjs';
import settling from './65-settling.mjs';
import settings from './80-settings-and-rules.mjs';

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

/*
 * Option C across the app (owner, 23 November: "show me more screens using that style"): the dark
 * theme's bar in the sheet's own blue, parted from the content by a soft shadow cast upward. Every kind
 * of bar the app has, each forced dark: the split bar and its open drawer, Home's three controls, a bar
 * with a line above it, a blocked one, two halves, a hold, and the bars that end sheets.
 */
const C_CSS = OPTIONS.find(([k]) => k === 'c')[3];
const ALL = Object.fromEntries([...screens, ...getIn, ...opening, ...during, ...counting, ...settling, ...settings].map((x) => [x.id, x]));
const darkC = (id, k) => `<style>${scope('c' + k, C_CSS)}</style><div class="dark dfc-wrap dfc-c${k}" style="display:contents">${ALL[id].html}</div>`.replace(new RegExp(`\\.df-c${k} `, 'g'), `.dfc-c${k} `);
const MORE = [
  ['session-admin', 'Tonight, the drawer open', 'The split bar with the Table admin drawer open above it: the drawer rows sit on the same blue.'],
  ['home', 'Home', 'Home’s bar holds three controls rather than one action; on the sheet’s blue the round controls keep their lighter fill.'],
  ['new-night-seated', 'New session', 'A sheet whose bar carries a line above the action ($1,800 on the table).'],
  ['log-rebuy', 'How much? · rebuy', 'A sheet ending in its action, the keypad just above the shadow.'],
  ['seat-empty', 'New player, blocked', 'A blocked action: the words go faint on the blue, the bar itself stays.'],
  ['groups-empty', 'Your groups, the walkthrough', 'Two equal halves, parted by their hairline.'],
  ['count-up-off', 'Count up', 'Step 1 of 3, the bar live.'],
  ['settle-up', 'Settle up', 'Close the session, under a long list.'],
  ['payments', 'Who pays whom', 'Mark all as paid.'],
  ['delete-account', 'Delete your account', 'A hold on the bar, with its line under the words.'],
];
export const section = { title: 'This round: the footer in the dark',
  blurb: 'Dark theme only. First, option C (the sheet’s blue with a soft shadow above) on ten more screens covering every kind of bar, as you asked; then the six options as you saw them.' };

export default [
  ...MORE.map(([id, name, note], i) => ({ id: `dark-c-${id}`, route: ALL[id].route, name: `Dark footer C · ${name}`, nav: ALL[id].nav, note, html: darkC(id, i) })),
  ...OPTIONS.map(([k, name, note, css]) => ({ id: `dark-foot-${k}`, route: '/session', name: `Dark footer ${name}`, nav: 'push', wide: true, note, html: pair(k, css) })),
];
