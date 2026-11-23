/**
 * Where review stands: the panel at the top of the board.
 *
 * The verdicts live in the published artifact's db (collection `reviews`). The page renders this
 * panel from `SNAPSHOT` (the db as read when the board was last built) so it is right at rest, then
 * the inline script re-renders it from the live db as verdicts change.
 *
 * `ADDRESSED` is what Claude changed after a "Needs work" note, and when. A screen whose verdict is
 * still Needs work but older than its fix reads "changed since your note, check again"; one whose
 * note is newer than the fix, or that has no fix, reads "waiting on Claude".
 *
 * `DECIDED` are options the owner chose between; their cells are gone from the board.
 */
export const BUILT = '2026-11-23T12:40:00Z';
/* The last round: changes at or after this time are the ones at the top of the board. Move it forward each round. */
export const LATEST = '2026-11-23T14:30:00Z';

export const ADDRESSED = {
  'dark-foot-a': ['Six ways to colour the footer in the dark against the blue sheet: as drawn, the sheet’s blue with a hairline, with a soft shadow, a step lighter, a richer blue, and the action as a light pill.', '2026-11-23T14:35:00Z'],
  'new-group-players': ['The bar reads Create the group, without the group’s name.', '2026-11-23T13:50:00Z'],
  'new-night-players': ['One line per player: the tick and the line under each name are gone. A buy-in at the standard sits muted; a changed one is full ink. Every frame redrawn.', '2026-11-23T14:25:00Z'],
  'new-night-gate-used': ['Nine new screens for changing a plan from Settings: your plan on Regular, moving up, on Full, moving down, moving to Free, a change waiting, on Free, Home after a plan ran out, and a founder’s plan.', '2026-11-23T13:50:00Z'],
  'new-night-gate': ['The same fix to the tags, for the three plans.', '2026-11-23T13:40:00Z'],
  session: ['The icon shows what a tap does, with its word back: the struck eye and Hide while the money shows.', '2026-11-23T12:40:00Z'],
  'session-hidden': ['The open eye and Show while the money is hidden.', '2026-11-23T12:40:00Z'],
  'claim-typing': ['Still needed: it is how someone already in a group joins another (Settings) and where a dead invite sends you. Now the same form as the walkthrough’s last page, with Scan the QR code.', '2026-11-23T12:40:00Z'],
  'auth-callback-wait': ['Smooth: every move eased in and out with no stops mid-move and no small twitches; the push and the peak are one motion; the chips flow down in a short overlapping wave. Measured at 60 frames a second, the biggest jolt went from 16 pixels to under 1.', '2026-11-22T23:15:00Z'],
  'groups-empty-2': ['New group and I have a code are now two equal halves of the bar on every page; on the last page the right half is Check the code. The joining card carries the group’s three chips.', '2026-11-22T23:25:00Z'],
  'groups-empty-4': ['Scan the QR code added under the code boxes (and as a QR button beside the field on the semi-open page).', '2026-11-22T23:35:00Z'],
  'groups-empty-4-old': ['One New group, on the bar only; the invite code is the page, as an open form (boxes and Check the code) or semi-open (one field that opens).', '2026-11-22T23:05:00Z'],
  'groups-empty': ['The walkthrough you picked (B), all four pages: the group’s chips first, as you asked, and the create or invite choice from D folded in, with the invite code on every page and the two doors on the last.', '2026-11-22T22:50:00Z'],
  'new-night-rule-rest': ['Remove moved into the bar beside Save rule, on every rule editor that edits an existing rule.', '2026-11-22T22:00:00Z'],
  'new-night-second': ['Named by your rule: “Friday session”, and a second the same day “Friday session 2”.', '2026-11-23T11:20:00Z'],
  groups: ['Your pick, D, applied: the name as the headline, standing above it, the group you are in as the ink card. No picture, no currency.', '2026-11-22T22:20:00Z'],
  invite: ['The code is six characters with a dash after three: K7M-4XP. Flagged: a server and security decision.', '2026-11-22T21:29:00Z'],
  'invite-qr': ['The square QR you picked, now real: it scans to the invite’s link.', '2026-11-22T21:45:00Z'],
  'new-night-gate': ['A chosen plan makes the bar live: the ink card carries a tick and the bar names it (Get Full · $9.99 a month). Not now is gone; the X closes.', '2026-11-23T11:20:00Z'],
  'new-night-seated': ['Name chips lifted like the cards, with the add in an ink circle (C, your pick), on every screen.', '2026-11-22T21:45:00Z'],
  pick: ['The same chips (C), and Tonight now sits behind the sheet instead of a grey blank.', '2026-11-22T21:45:00Z'],
  'player-out': ['Figures written in full, all three sized down together to fit.', '2026-11-22T21:29:00Z'],
  general: ['The card shadow’s fall shortened, which you approved on its own.', '2026-11-22T17:35:00Z'],
};

/* When the change is new screens rather than an edit, the update shows those screens, not the old one. */
export const SHOW = { 'dark-foot-a': ['dark-foot-a', 'dark-foot-b', 'dark-foot-c', 'dark-foot-d', 'dark-foot-e', 'dark-foot-f'], 'new-night-players': ['c-std-1', 'c-std-2', 'c-std-3', 'c-std-4', 'c-rest', 'c-amount', 'c-search', 'c-nomatch', 'c-new', 'c-taken'], 'players-add-c': ['c-rest', 'c-amount', 'c-search', 'c-nomatch', 'c-new', 'c-taken'], 'new-night-gate-used': ['plan-regular', 'plan-upgrade', 'plan-upgraded', 'plan-downgrade', 'plan-cancel', 'plan-pending', 'plan-free', 'plan-lapsed', 'plan-founder'], 'groups-empty': ['groups-empty', 'groups-empty-2', 'groups-empty-3', 'groups-empty-4'], 'groups-empty-2': ['groups-empty', 'groups-empty-2', 'groups-empty-3', 'groups-empty-4'] };

export const DECIDED = [
  ['Home’s footer', 'as drawn: the ink bar with its three controls'],
  ['The words on the bar', 'as drawn: Libre Franklin bold, 18 points'],
  ['The card shadow', 'the shorter fall'],
  ['The dark cards', 'as they are: one step lighter than the sheet, no shadow'],
  ['QR codes', 'square'],
  ['Name chips', 'C: lifted like the cards, the add in an ink circle'],
  ['Hidden money', 'dots, behind an eye at the first section label'],
  ['Your groups', 'the name as the headline, no picture, no currency'],
  ['Your groups, empty', 'the walkthrough (B), with D’s two ways in'],
];

/** The db as read at build: id → [status, comment, updatedAt]. Only screens with a verdict. */
export const SNAPSHOT = {
  'auth-callback-wait': ['approved', '', '2026-11-22T22:21:47Z'],
  'groups-empty-2': ['changes', 'invite code should be not less important than creating the group option', '2026-11-22T22:15:45Z'],
  'groups-empty-4b': ['changes', 'group icon is the 3 chips one', '2026-11-22T22:16:53Z'],
  'groups-empty-4': ['approved', '', '2026-11-22T22:32:03Z'],
  'groups-empty': ['approved', '', '2026-11-22T22:22:06Z'],
  'new-night': ['approved', '', '2026-11-22T21:37:00Z'],
  'new-night-amount': ['approved', '', '2026-11-22T21:37:09Z'],
  'new-night-rule-rest': ['approved', '', '2026-11-22T22:23:42Z'],
  'new-night-second': ['changes', 'Friday (or other day of the week) session; another the same day adds 2 (and so on)', '2026-11-23T11:01:31Z'],
  bill: ['approved', '', '2026-11-22T17:49:10Z'],
  'bill-empty': ['approved', '', '2026-11-22T17:49:17Z'],
  booster: ['approved', '', '2026-11-22T17:51:41Z'],
  boosters: ['approved', '', '2026-11-22T17:52:21Z'],
  'entry-amount': ['approved', '', '2026-11-22T17:47:39Z'],
  'entry-amount-blocked': ['approved', '', '2026-11-22T17:47:49Z'],
  general: ['changes', 'the key problem that i find in term of style is that the shades below the content areas conflict with the ‘still’ data with no such background. maybe using a bit less shade at the bottom of such areas would help', '2026-11-22T17:31:28Z'],
  'groups': ['approved', '', '2026-11-22T22:21:55Z'],
  home: ['approved', '', '2026-11-22T17:36:11Z'],
  'invite': ['approved', '', '2026-11-22T22:22:52Z'],
  'invite-qr': ['approved', '', '2026-11-22T21:36:44Z'],
  'log-cashout': ['approved', '', '2026-11-22T17:47:14Z'],
  'log-cashout-over': ['approved', '', '2026-11-22T17:47:19Z'],
  'log-rebuy': ['approved', '', '2026-11-22T17:46:58Z'],
  'new-night-currency': ['approved', '', '2026-11-22T17:43:56Z'],
  'new-night-gate': ['changes', 'it looks good, but is it correct that the button looks inactive while the plan is chosen above? is not now really needed since we have the X?', '2026-11-23T11:03:30Z'],
  'new-night-seated': ['approved', '', '2026-11-22T21:37:05Z'],
  pick: ['approved', '', '2026-11-22T21:49:47Z'],
  'pick-tool': ['approved', '', '2026-11-22T17:48:11Z'],
  player: ['approved', '', '2026-11-22T17:45:09Z'],
  'player-out': ['approved', '', '2026-11-22T21:42:48Z'],
  'player-corrected': ['approved', '', '2026-11-22T21:43:14Z'],
  session: ['approved', '', '2026-11-22T17:11:48Z'],
  'session-admin': ['approved', '', '2026-11-22T17:11:53Z'],
  settled: ['approved', '', '2026-11-22T17:38:30Z'],
  'settled-view-menu': ['approved', '', '2026-11-22T17:50:00Z'],
  'spend-edit': ['approved', '', '2026-11-22T17:49:27Z'],
  'your-name': ['approved', '', '2026-11-22T17:40:03Z'],
  'your-name-edit': ['approved', '', '2026-11-22T17:40:04Z'],
};

/*
 * The panel, as one self-contained function: run at build for the page at rest, and inlined into the
 * page to re-run on every change in the db. `d` is { screens: [[id, name, sectionIndex]], sections:
 * [title], addressed, decided }; `v` is id → [status, comment, updatedAt].
 */
export function renderProgress(d, v) {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const link = (id, name) => `<a href="#s-${id}">${esc(name)}</a>`;
  const names = Object.fromEntries(d.screens.map(([id, name]) => [id, name]));
  names.general = 'The look as a whole';
  const ids = ['general', ...d.screens.map(([id]) => id)];
  const approved = [], recheck = [], waiting = [], open = new Map();
  for (const id of ids) {
    const [st, comment, at] = v[id] || ['', '', ''];
    if (st === 'approved') approved.push(id);
    else if (st === 'changes') {
      const fix = d.addressed[id];
      if (fix && (!at || at <= fix[1])) recheck.push([id, comment, fix[0]]);
      else waiting.push([id, comment]);
    } else if (id !== 'general') {
      const sec = d.screens.find((s) => s[0] === id)[2];
      if (!open.has(sec)) open.set(sec, []);
      open.get(sec).push(id);
    }
  }
  const nOpen = [...open.values()].reduce((a, b) => a + b.length, 0);
  const pill = (n, t, cls) => `<span class="pp ${cls}"><b>${n}</b> ${t}</span>`;
  return `<div class="pp-row">${pill(approved.length, 'approved', 'ok')}${pill(recheck.length, 'changed since your note', 're')}${pill(waiting.length, 'waiting on Claude', 'wt')}${pill(nOpen, 'not reviewed yet', 'nr')}</div>
  ${recheck.length ? `<div class="pp-block"><h3>Changed since your note — check again</h3><ul>${recheck.map(([id, c, fix]) => `<li>${link(id, names[id])}${c ? `<span class="pp-q">“${esc(c)}”</span>` : ''}<span class="pp-a">${esc(fix)}</span></li>`).join('')}</ul></div>` : ''}
  ${waiting.length ? `<div class="pp-block"><h3>Waiting on Claude</h3><ul>${waiting.map(([id, c]) => `<li>${link(id, names[id])}${c ? `<span class="pp-q">“${esc(c)}”</span>` : '<span class="pp-a">Needs work, no note.</span>'}</li>`).join('')}</ul></div>` : ''}
  <div class="pp-block"><h3>Not reviewed yet, by section</h3><ul class="pp-secs">${[...open.entries()].sort((a, b) => a[0] - b[0]).map(([sec, list]) => `<li><a href="#sec-${sec}"><b>${esc(d.sections[sec])}</b></a> <span class="pp-n">${list.length}</span><span class="pp-ids">${list.map((id) => link(id, names[id])).join(' · ')}</span></li>`).join('') || '<li>Everything has a verdict.</li>'}</ul></div>
  <div class="pp-block"><h3>Decided along the way</h3><ul class="pp-dec">${d.decided.map(([k, t]) => `<li><b>${esc(k)}</b> ${esc(t)}</li>`).join('')}</ul></div>`;
}
