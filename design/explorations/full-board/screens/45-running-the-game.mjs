/**
 * Running the game: who records the night, passing it to a person, what every
 * other phone reads, and the review of what another phone recorded.
 * Governed by `design/handoff-game-admin/` (cut 26 September).
 *
 * Tonight's main state and its Table admin drawer are in `10-home-tonight.mjs`.
 */
import { push, sheet, bar, barSplit, label, card, row, note, para, pill, terms, button, quiet, ico, topPill, topButton, topDropdown, topHero } from '../kit.mjs';

/* ── parts the kit does not have (see the report) ─────────────────────── */

/** The plan list's round tick: filled when on, a ring when not. */
const tick = (on = false) =>
  `<span style="flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;${on ? 'background:var(--pri);color:var(--onpri)' : 'box-shadow:inset 0 0 0 1.5px var(--outline)'}">${on ? ico('check', 12) : ''}</span>`;
/** A radio: a ring, with a dot when picked. `off` is a row that cannot be picked. */
const radio = (on = false, off = false) =>
  `<span style="flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 1.5px ${on ? 'var(--text)' : off ? 'var(--line)' : 'var(--outline)'}">${on ? '<i style="width:10px;height:10px;border-radius:50%;background:var(--text)"></i>' : ''}</span>`;
/** A small outlined action at the end of a row (Invite, Ask). */
const rowChip = (text) => `<span class="chip" style="height:32px;padding:0 12px;font-size:13px;flex:none">${text}</span>`;
/** An outlined state tag (WAITING ON LENA, ADDED, LEFT OUT). The app draws the pending ones amber; the kit has no amber token. */
const tag = (text, { strong = false } = {}) =>
  `<span style="flex:none;align-self:flex-start;justify-self:start;display:inline-block;font:700 10.5px/1 var(--body);letter-spacing:.1em;padding:4px 7px;border-radius:7px;white-space:nowrap;color:${strong ? 'var(--text)' : 'var(--muted)'};box-shadow:inset 0 0 0 1px ${strong ? 'var(--text)' : 'var(--outline)'}">${text}</span>`;
/** The read-only band: where a dock would be, the screen ends in a statement. Pinned to the foot of the sheet. */
const band = (inner, { spacer = true } = {}) =>
  `${spacer ? '<div class="grow"></div>' : ''}<div style="margin:0 -18px;padding:14px 20px 22px;border-top:1px solid var(--line);display:grid;gap:8px">${inner}</div>`;
/** The table as the scrolling list it is in the app: it clips under whatever is pinned below it. */
const scroller = (items) => `<div class="grow" style="overflow:hidden;display:flex;flex-direction:column;gap:12px;margin:-4px -18px 0;padding:4px 18px 0">${items.join('')}</div>`;
/** A timed row: time · words (+ a small line) · figure · whatever ends it. */
const timed = (time, what, { sub = '', amount = '', under = '', end = '', dim = false } = {}) =>
  `<div class="row"><span class="num muted" style="flex:none;width:40px;font-size:12.5px;font-weight:600">${time}</span><span class="n"${dim ? ' style="color:var(--muted)"' : ''}>${what}${sub ? `<small class="wrap">${sub}</small>` : ''}</span>${
    amount || under ? `<span class="a"${dim ? ' style="color:var(--muted)"' : ''}>${amount}${under ? `<small>${under}</small>` : ''}</span>` : ''}${end}</div>`;
/** A feed line on /watch: lighter than a row, no rules between. */
const feed = (time, what, amount = '', mine = false) =>
  `<div style="display:flex;align-items:center;gap:10px;min-height:32px"><span class="num muted" style="flex:none;width:40px;font-size:12.5px;font-weight:600">${time}</span><span style="flex:1;min-width:0;font-size:14.5px;font-weight:${mine ? 600 : 500};white-space:nowrap;overflow:hidden;text-overflow:ellipsis"${mine ? '' : ' class="muted"'}>${what}</span>${
    amount ? `<b class="num" style="flex:none;font-size:14.5px">${amount}</b>` : ''}</div>`;

/* ── Tonight, as the other phones read it ─────────────────────────────── */

const hero = topHero({ label: 'On the table', big: '$4,500', side: '$5,000 in play<br>5 seated · 1 out', shares: [1500, 1000, 1000, 500, 500] });
const table = [
  label('Still playing · 5'),
  card([['Petr', '$1,500'], ['Lena', '$1,000'], ['Ivo', '$1,000'], ['Andro', '$500'], ['Tomáš', '$500']].map(([name, amount]) => row({ name, amount }))),
  label('Cashed out · 1'),
  card(row({ name: 'Dana', meta: '17:17 · out 2,120', amount: '+$1,620', tone: 'win' })),
];

const settledRows = card([
  row({ name: 'Dana', meta: '+1,620', amount: '+$1,429', tone: 'win', under: terms(`${ico('food', 12)} −110 ${ico('piggy', 12)} −81`) }),
  row({ name: 'Andro', meta: '+460', amount: '+$526', tone: 'win', under: terms(`${ico('food', 12)} −31 +120 ${ico('piggy', 12)} −23`) }),
  row({ name: 'Lena', meta: '+430', amount: '+$429', tone: 'win', under: terms(`${ico('food', 12)} −29 +50 ${ico('piggy', 12)} −22`) }),
  row({ name: 'Tomáš', meta: '−500', amount: '−$500', tone: 'loss' }),
  row({ name: 'Ivo', meta: '−780', amount: '−$780', tone: 'loss' }),
  row({ name: 'Petr', meta: '−1,230', amount: '−$1,230', tone: 'loss' }),
]);

/* ── the pass sheet's people ──────────────────────────────────────────── */

const person = (name, meta, trail) => row({ name, meta, trail, wrapMeta: true });
const passSub = 'They record from the moment you pass it. You keep watching, and can take it back.';

export const section = { title: 'Running the game', blurb: 'Who records the night: passing it to a person, what every other phone reads on Tonight, watching by link, and reviewing what another phone recorded.' };

export default [
  { id: 'session-empty', route: '/session', name: 'Tonight · nobody seated', nav: 'push',
    note: 'The dock’s empty-table variant: the bar’s primary is Seat a player and Bill is dead until somebody is in.',
    html: push({ title: 'Tonight', trailing: topPill('just opened'), sub: '<b>You’re recording</b> · opened 14:07', subRight: topButton('questionCard'),
      extra: topHero({ label: 'On the table', big: '$0', side: 'nobody seated' }),
      body: [
        `<div style="display:grid;justify-items:center;text-align:center;gap:8px;padding:56px 22px 0"><span class="dimt">${ico('person', 34)}</span><div class="h2">Nobody has bought in yet</div>${note('Seat the first player and the table starts filling. Buy-ins are $500 tonight.')}</div>`,
      ],
      bar: barSplit('Seat a player', { label: 'Bill', icon: 'receipt' }, { primaryIcon: 'person', secondaryDead: true, disc: { label: 'Table admin', hint: 'seat · cash out · end' } }) }) },

  { id: 'session-watching', route: '/session', name: 'Tonight · watching', nav: 'push',
    note: 'A claimed player’s phone. No bar: nothing here records money, so the screen ends in the read-only line instead of an action.',
    flags: [
      'Open question: a watcher’s Tonight has no bar at all, so the white sheet runs to the bottom edge. The alternative is an ink strip carrying only the read-only line; it was not drawn because the bar is defined as the action.',
      'Lena as the recorder is illustrative: the seeded night is recorded by Andro and was never passed.',
    ],
    html: push({ title: 'Tonight', trailing: topPill('3h 16m'), sub: '<b>Watching</b> · Lena is recording', subRight: topButton('questionCard'), extra: hero,
      body: [...table, band(note('Read-only. Only Lena can write to the ledger.'))] }) },

  { id: 'session-passed', route: '/session', name: 'Tonight · passed, waiting on Lena', nav: 'push',
    note: 'The phone that passed the game away. Its one action is the hold that takes the game back, so that hold is the bar. The table scrolls under the pinned waiting line, as in the app.',
    flags: [
      'Third extra state of /session (the brief asked for two): drawn because taking the game back is the only bar in this section that is a hold.',
      'The pass time 16:40 is illustrative; the seeded night was never passed.',
      'WAITING ON LENA is an amber outlined pill in the app. The kit has no amber token, so it is drawn in the text colour.',
      'Open question: a hold as the whole bar. The hold line sits under the words as on End this poker night, but nothing else marks it as press-and-keep-pressing.',
      'Not drawn: after Lena’s phone opens the game the pill goes and the line reads “Lena is recording. Every entry they make shows here as they make it.” Same layout, same bar.',
    ],
    html: push({ title: 'Tonight', trailing: topPill('3h 16m'), sub: '<span style="white-space:nowrap"><b>Watching</b> · passed to Lena at 16:40</span>', subRight: topButton('questionCard'), extra: hero,
      body: [scroller(table), band(`${tag('WAITING ON LENA', { strong: true })}${note('The game is Lena’s. It opens on their phone the next time they look at the app. Until then nothing new is recorded.')}`, { spacer: false })],
      bar: bar('Take the game back', { sub: 'Hold 1.5s · this phone records again' }) }) },

  { id: 'pass-game', route: '/pass-game', name: 'Pass the game', nav: 'sheet',
    flags: [
      'Who is on which tier, and “back on 1 Dec”, are illustrative: the reference build has no server, so every row there reads “Name only · no app to send it to”.',
      'Nothing picked: the bar reads “Pass the game”, blocked. Not drawn as its own entry.',
      'Not drawn: the failed pass. The pick stays, a NOT PASSED pill (amber in the app, no kit token) sits over “No connection. The game is still yours and this phone is still recording. It moves only when the server confirms.” and the bar reads “Try again · pass to Lena”.',
    ],
    html: sheet({ behind: 'Tonight', title: 'Pass the game', sub: passSub, tall: true,
      body: [
        label('Can take it · 3', { quiet: true }),
        card([
          person('Lena', 'Full · at the table', tick(true)),
          person('Ivo', 'Regular · at the table · uses their one host night', tick()),
          person('Radka', 'Full · not playing tonight', tick()),
        ]),
        label('Can’t take it tonight · 3', { quiet: true }),
        card([
          person('Petr', 'Regular · host night used · back on 1 Dec'),
          person('Tomáš', 'Free · can’t run a game'),
          person('Dana', 'Name only · no app to send it to', rowChip('Invite')),
        ]),
      ],
      bar: bar('Pass to Lena') }) },

  { id: 'pass-game-confirm', route: '/pass-game', name: 'Pass the game · confirm a Regular', nav: 'sheet',
    note: 'Only when the pick is on Regular. Same sheet, content replaced, one close.',
    flags: [
      'The app has no back control on this step: “Pick someone else” is the way back. The board’s rule puts a back circle on a later step, so both are drawn; one of them is redundant.',
      '“1 December” is illustrative: it is the picked person’s own renewal date.',
    ],
    html: sheet({ behind: 'Tonight', title: 'Pass to Ivo', stepBack: true,
      body: [
        para('Ivo is on Regular, which runs one game a month. Taking this one uses it.'),
        card(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><span class="fl">Ivo’s host night</span><b class="num" style="font-size:18px">Used tonight</b></div><div><span class="fl">Next one</span><b class="num" style="font-size:18px">1 December</b></div></div>`, { pad: true }),
        note('If the game comes back to you, it stays used. Passing it to Ivo again tonight uses nothing more.'),
        note('Ivo doesn’t need to accept. It arrives on their phone and they record from then.'),
        quiet('Pick someone else'),
      ],
      bar: bar('Pass to Ivo') }) },

  { id: 'pass-game-nobody', route: '/pass-game', name: 'Pass the game · nobody can take it', nav: 'sheet',
    note: 'No bar: there is nobody to pass to. Ask sends a message; it is not a purchase.',
    flags: ['Who is on which tier, and “back on 1 Dec”, are illustrative.'],
    html: sheet({ behind: 'Tonight', title: 'Pass the game', tall: true,
      body: [
        para('Nobody in the group can take it tonight. That’s their membership, not anything you set.'),
        card(`<p class="note" style="color:var(--text)">A game can go to anyone on the Full plan, or on the Regular plan with their host night still free. Each person picks their own.</p>`, { pad: true }),
        label('Can’t take it tonight · 6', { quiet: true }),
        card([
          person('Lena', 'Regular · host night used · back on 1 Dec', rowChip('Ask')),
          person('Petr', 'Regular · host night used · back on 1 Dec', rowChip('Ask')),
          person('Ivo', 'Free · can’t run a game', rowChip('Ask')),
          person('Tomáš', 'Free · can’t run a game', rowChip('Ask')),
          person('Radka', 'Free · not playing tonight', rowChip('Ask')),
          person('Dana', 'Name only · no app to send it to', rowChip('Invite')),
        ]),
        note('Ask sends them a message. Nobody can buy a membership for someone else.'),
      ] }) },

  { id: 'hand-over', route: '/hand-over', name: 'Hand over admin', nav: 'sheet',
    flags: ['Lena, Ivo and Petr as claimed players are illustrative: in the reference everybody is “not claimed yet”, which is the next entry.'],
    html: sheet({ behind: 'The group', title: 'Hand over admin', sub: 'One admin at a time. You stay in the group as a player, with your whole history.', tall: true,
      body: [
        card([
          person('Dana', '1 night · not claimed yet', radio(false, true)),
          person('Lena', '1 night · claimed', radio(true)),
          person('Tomáš', '1 night · not claimed yet', radio(false, true)),
          person('Ivo', '1 night · claimed', radio()),
          person('Petr', '1 night · claimed', radio()),
          person('Radka', 'holds the piggy bank · not claimed yet', radio(false, true)),
        ]),
        label('What moves', { quiet: true }),
        `<div style="margin:0 2px;display:grid;gap:4px"><div style="font-weight:600;font-size:15px">Money rules, settle-up, invites and the exits.</div><div class="win" style="font-size:13px">Nothing already settled changes hands.</div></div>`,
        note('Only a claimed player can be admin. Once handed over, only Lena can hand it back — you cannot take it.'),
      ],
      bar: bar('Hand over to Lena') }) },

  { id: 'hand-over-none', route: '/hand-over', name: 'Hand over admin · nobody claimed', nav: 'sheet',
    note: 'The seeded group: nobody has claimed a place, so no row can be picked and the bar stays blocked.',
    flags: ['The sheet behind is titled “The group” on the assumption that /hand-over opens from there.'],
    html: sheet({ behind: 'The group', title: 'Hand over admin', sub: 'One admin at a time. You stay in the group as a player, with your whole history.', tall: true,
      body: [
        card([
          person('Dana', '1 night · not claimed yet', radio(false, true)),
          person('Lena', '1 night · not claimed yet', radio(false, true)),
          person('Tomáš', '1 night · not claimed yet', radio(false, true)),
          person('Ivo', '1 night · not claimed yet', radio(false, true)),
          person('Petr', '1 night · not claimed yet', radio(false, true)),
          person('Radka', 'holds the piggy bank · not claimed yet', radio(false, true)),
        ]),
        label('What moves', { quiet: true }),
        `<div style="margin:0 2px;display:grid;gap:4px"><div style="font-weight:600;font-size:15px">Money rules, settle-up, invites and the exits.</div><div class="win" style="font-size:13px">Nothing already settled changes hands.</div></div>`,
        note('Only a claimed player can be admin. Once handed over, only they can hand it back — you cannot take it.'),
      ],
      bar: bar('Hand over admin', { blocked: true }) }) },

  { id: 'watch', route: '/watch', name: 'Watching a night', nav: 'push',
    note: 'No bar, by the app’s own design: the screen ends in a statement where a dock would be. The live figures stay on the sheet; only the recording phone’s Tonight keeps its pot on the ink.',
    flags: [
      'Open question (same as Tonight · watching): no bar, so the sheet runs to the bottom edge with the read-only line pinned at its foot.',
      'Open question: IN PLAY and AT THE TABLE could move onto the ink as Tonight’s pot does. Left on the sheet because the app’s two labels do not fit the pot’s shape without rewording.',
      'The feed’s times other than 17:17, the reader being Tomáš, and the recorder being Lena are illustrative: the reference build cannot open a watched night (“This link isn’t live”).',
      '“Andro passed the game to Lena” is the app’s string; the handoff marks it UNSURE.',
    ],
    html: push({ title: 'Tonight', sub: '<b>Watching</b> · Lena is recording', subRight: topButton('questionCard'),
      body: [
        card(`<div style="display:grid;gap:5px"><span class="fl" style="margin:0;letter-spacing:.1em;font-size:10.5px;font-weight:700">YOUR SEAT</span><div class="h2">You, Tomáš</div><div style="font-size:15px;font-weight:500">in $500 · 1 buy-in</div><div class="muted" style="font-size:13px">counted at the end</div></div>`, { pad: true }),
        `<div style="display:flex;gap:40px;margin:2px 2px 0"><div><span class="fl" style="margin:0 0 6px;letter-spacing:.1em;font-size:10.5px;font-weight:700">IN PLAY</span><div class="fig s">$5,000</div></div><div><span class="fl" style="margin:0 0 6px;letter-spacing:.1em;font-size:10.5px;font-weight:700">AT THE TABLE</span><div class="fig s">5</div></div></div>`,
        label('The night so far', { quiet: true }),
        `<div style="margin:0 2px">${[
          feed('17:17', 'Dana cashed out', '$2,120'),
          feed('16:40', 'Andro passed the game to Lena'),
          feed('16:12', 'You bought in', '$500', true),
          feed('15:48', 'Petr rebought', '$500'),
          feed('15:20', 'Ivo rebought', '$500'),
          feed('14:55', 'Petr rebought', '$500'),
          feed('14:31', 'Dana bought in', '$500'),
        ].join('')}</div>`,
        band(note('Read-only. Only Lena can write to the ledger.')),
      ] }) },

  { id: 'watch-ended', route: '/watch', name: 'Watching · the night has ended', nav: 'push',
    note: 'The same result the host reads on Post-game results, without its bar: a watcher has no Who pays whom to open.',
    flags: [
      'The app’s title here is the long date, “Friday 20 Nov”; Post-game results on the board reads “Fri 20 Nov”.',
      'The read-only line names Andro, the seeded night’s recorder.',
      'At this width the app’s meta line (“3h 16m · 6 players · settled”) and the view control do not fit on one line together, so the meta wraps.',
    ],
    html: push({ title: 'Friday 20 Nov', sub: '3h 16m · 6 players · settled', subRight: topDropdown('Final, detailed'),
      body: [
        settledRows,
        label('Deductions', { right: '$296', quiet: true }),
        `<div style="display:grid;gap:6px;font-size:12.5px;margin:0 2px">
          <div style="display:flex;gap:8px;align-items:center"><span class="muted">${ico('food', 15)}</span><span>Kitchen &amp; drinks</span><span class="muted" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Lena, Andro</span><b class="num">$170</b></div>
          <div style="display:flex;gap:8px;align-items:center"><span class="muted">${ico('piggy', 15)}</span><span>Group piggy bank</span><span class="muted" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">held by the group</span><b class="num">$126</b></div></div>`,
        band(note('Read-only. Only Andro can write to the ledger.')),
      ] }) },

  { id: 'watch-refused', route: '/watch', name: 'Watching · the link is dead', nav: 'push',
    note: 'One line for every way a link can fail. No control: there is nothing for a watcher to type.',
    html: push({ title: 'This link isn’t live', body: [para('<span class="muted">Ask whoever sent it for a new one.</span>')] }) },

  { id: 'late-changes', route: '/late-changes', name: 'From another phone', nav: 'sheet',
    note: 'The bar counts the ticks. What is left unticked on submit is marked LEFT OUT, never deleted.',
    flags: [
      'The four changes, their times and “Lena’s phone” are illustrative: the reference build has no server and shows only “Reading them off the server…”.',
      'LEFT OUT is an amber outlined tag in the app; the kit has no amber token, so it is drawn in the text colour and ADDED muted.',
      'Nothing ticked: the bar reads “Add 0 to the night”, blocked. Not drawn as its own entry.',
      'Nothing left to decide: the app’s footer is a secondary “Close”, so there is no bar and Close would be an outlined button in the content. Not drawn.',
      'Not drawn: the line on Tonight that opens this sheet (“2 changes from another phone · Review”, above the dock). On the board it would need a line above Tonight’s split bar, which barSplit does not have.',
    ],
    html: sheet({ behind: 'Tonight', title: 'From Lena’s phone', tall: true,
      sub: 'Recorded there after you took the game back. Tick what belongs in the night. Nothing is deleted: what you leave out stays on record.',
      body: [
        label('Not decided · 2', { quiet: true, right: 'Tick all' }),
        card([
          timed('16:48', 'Ivo rebought', { sub: 'logged on Lena’s phone', amount: '$500', end: tick(true) }),
          timed('16:51', 'Petr rebought', { sub: 'logged on Lena’s phone', amount: '$500', end: tick() }),
        ]),
        label('Decided · 2', { quiet: true }),
        card([
          timed('16:44', 'Tomáš rebought', { sub: 'added 16:55', amount: '$500', under: tag('ADDED'), dim: true }),
          timed('16:46', 'Lena paid for pizza', { sub: 'left out 16:55', amount: '$40', under: tag('LEFT OUT', { strong: true }), dim: true }),
        ]),
      ],
      bar: bar('Add 1 to the night') }) },
];
