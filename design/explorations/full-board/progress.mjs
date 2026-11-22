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
export const BUILT = '2026-11-22T21:45:00Z';

export const ADDRESSED = {
  'auth-callback-wait': ['Designed: the whole screen is ink; the chip stack from Start a session builds chip by chip, holds, lifts away and starts again; three dots pulse.', '2026-11-22T21:40:00Z'],
  groups: ['Designed: a card per group with its drawing, name, line and standing; the current group edged in ink.', '2026-11-22T21:29:00Z'],
  invite: ['The code is six characters with a dash after three: K7M-4XP. Flagged: a server and security decision.', '2026-11-22T21:29:00Z'],
  'invite-qr': ['The square QR you picked, now real: it scans to the invite’s link.', '2026-11-22T21:45:00Z'],
  'new-night-gate': ['Redesigned to invite: the drawing and the reason first, then three plan cards with the price large.', '2026-11-22T21:29:00Z'],
  'new-night-seated': ['Name chips lifted like the cards, with the add in an ink circle (C, your pick), on every screen.', '2026-11-22T21:45:00Z'],
  pick: ['The same chips (C), and Tonight now sits behind the sheet instead of a grey blank.', '2026-11-22T21:45:00Z'],
  'player-out': ['Figures written in full, all three sized down together to fit.', '2026-11-22T21:29:00Z'],
  general: ['The card shadow’s fall shortened, which you approved on its own.', '2026-11-22T17:35:00Z'],
};

export const DECIDED = [
  ['Home’s footer', 'as drawn: the ink bar with its three controls'],
  ['The words on the bar', 'as drawn: Libre Franklin bold, 18 points'],
  ['The card shadow', 'the shorter fall'],
  ['The dark cards', 'as they are: one step lighter than the sheet, no shadow'],
  ['QR codes', 'square'],
  ['Name chips', 'C: lifted like the cards, the add in an ink circle'],
  ['Hidden money', 'dots, behind an eye at the first section label'],
];

/** The db as read at build: id → [status, comment, updatedAt]. Only screens with a verdict. */
export const SNAPSHOT = {
  'auth-callback-wait': ['changes', 'lets design this and use some running animation', '2026-11-22T17:39:42Z'],
  bill: ['approved', '', '2026-11-22T17:49:10Z'],
  'bill-empty': ['approved', '', '2026-11-22T17:49:17Z'],
  booster: ['approved', '', '2026-11-22T17:51:41Z'],
  boosters: ['approved', '', '2026-11-22T17:52:21Z'],
  'entry-amount': ['approved', '', '2026-11-22T17:47:39Z'],
  'entry-amount-blocked': ['approved', '', '2026-11-22T17:47:49Z'],
  general: ['changes', 'the key problem that i find in term of style is that the shades below the content areas conflict with the ‘still’ data with no such background. maybe using a bit less shade at the bottom of such areas would help', '2026-11-22T17:31:28Z'],
  groups: ['changes', 'this needs to be designed', '2026-11-22T17:40:19Z'],
  home: ['approved', '', '2026-11-22T17:36:11Z'],
  invite: ['changes', 'make the code 6 figure with a - after 3 symbols', '2026-11-22T17:37:30Z'],
  'invite-qr': ['changes', 'lets try some themed qr code types if available. if not then the square one', '2026-11-22T17:37:51Z'],
  'log-cashout': ['approved', '', '2026-11-22T17:47:14Z'],
  'log-cashout-over': ['approved', '', '2026-11-22T17:47:19Z'],
  'log-rebuy': ['approved', '', '2026-11-22T17:46:58Z'],
  'new-night-currency': ['approved', '', '2026-11-22T17:43:56Z'],
  'new-night-gate': ['changes', 'lets work on the design. this screen should be more inviting', '2026-11-22T17:44:56Z'],
  'new-night-seated': ['changes', 'maybe we should make the names’ shapes with slight shadow or smth else to help fit on the new ui', '2026-11-22T17:36:58Z'],
  pick: ['changes', '', '2026-11-22T17:38:21Z'],
  'pick-tool': ['approved', '', '2026-11-22T17:48:11Z'],
  player: ['approved', '', '2026-11-22T17:45:09Z'],
  'player-out': ['changes', 'all good but use auto size down for the values once they near collision', '2026-11-22T17:46:39Z'],
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
