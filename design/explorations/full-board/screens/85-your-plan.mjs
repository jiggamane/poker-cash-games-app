/**
 * Your plan: changing a membership outside the moment of opening a game (owner, 23 November: "add all
 * the screens necessary for the plan change, incl. downgrade, that happens outside of the game opening
 * plan check, and upgrades"). Reached from Settings → Plan, a row the app already has.
 *
 * The app shows the plan as one fact (`planLine`: "Regular", "Full · founder", "Full · until 1 Dec
 * 2026") and sells nothing; payment is the store's (source apple / google / web). So every word here is
 * DRAFT, and the flows follow the stores' rules: an upgrade starts now, a downgrade or a cancel takes
 * effect at the end of the period already paid, and can be undone until then.
 */
import { push, sheet, bar, label, card, row, note, button, quiet, ico, art } from '../kit.mjs';
import home from './10-home-tonight.mjs';
const HOME = home.find((x) => x.id === 'home').html;

const DRAFT = 'New screen: the app has only the Settings row “Plan”. Every word here is draft, and payment is the store’s, so the prices and the store sheet are illustrative.';
const ink = (t) => `<span style="font:700 10px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;padding:4px 7px;border-radius:999px;background:var(--pri);color:var(--onpri)">${t}</span>`;
const soft = (t) => `<span style="font:700 10px/1 var(--body);letter-spacing:.1em;text-transform:uppercase;padding:4px 7px;border-radius:999px;background:var(--raised);color:var(--muted)">${t}</span>`;
const has = (t, on = true) => `<div style="display:flex;gap:9px;align-items:flex-start;font-size:13.5px;line-height:1.4;${on ? '' : 'color:var(--muted)'}"><span style="flex:none;margin-top:0;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;${on ? 'background:#0E7A45;color:#fff' : 'background:var(--raised);color:var(--dim)'}">${ico(on ? 'check' : 'close', 12)}</span><span${on ? '' : ' style="text-decoration:line-through"'}>${t}</span></div>`;

const FULL = ['Run games as often as you like', 'Every night in the book, the missed ones too', 'Pass a game to anyone, or take one'];
const REGULAR = ['One night as host each month', 'Every night in the book, the missed ones too', 'Take a game passed to you, once a month'];
const FREE = ['Tonight, and the last three games', 'Watch any game and see its money live', 'Your place in the group'];

/* The plan you are on, as the head of the screen: name large, price, renewal, and what is included. */
const current = (name, price, line, list, tag = '') => `<div class="card pad" style="display:grid;gap:10px">
  <div style="display:flex;align-items:center;gap:8px">${tag}<span style="margin-left:auto;font-size:12.5px;color:var(--muted)">${line}</span></div>
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px"><b style="font:800 26px/1 var(--head);letter-spacing:-.02em">${name}</b>${price}</div>
  <div style="display:grid;gap:7px">${list.map((t) => has(t)).join('')}</div></div>`;
const price = (p, per = '/ mo') => `<span style="white-space:nowrap"><span class="num" style="font:800 22px/1 var(--head)">${p}</span><span style="font-size:12px;color:var(--muted)"> ${per}</span></span>`;
const other = (name, p, sub, action) => row({ name: `<span style="font:700 16px/1.2 var(--head)">${name}</span>`, meta: sub, trail: `<span style="display:flex;align-items:center;gap:10px">${p ? `<span class="num" style="font:700 15px/1 var(--head);white-space:nowrap">${p}</span>` : ''}<span class="btn2" style="height:34px;padding:0 12px;border-radius:10px;font-size:13px">${action}</span></span>`, wrapMeta: true });
const hostNight = (used) => `<div class="card pad" style="display:flex;align-items:center;gap:12px;padding:12px">${art('session', 46)}<div style="flex:1;min-width:0"><b style="font:700 15px/1.2 var(--head)">${used ? 'No game left to host' : '1 game left to host'}</b><div style="font-size:12.5px;color:var(--muted);margin-top:3px">${used ? 'You hosted on 20 Nov · the next one comes on 1 Dec' : 'This month · the next one comes on 1 Dec'}</div></div></div>`;
/*
 * THE OFFER, not a row (owner, 24 November, on the used Regular: "the other plans look too idle. they
 * should draw attention as we do want the users to upgrade"). Full is the ink card Open a game draws:
 * its name and price large, what it adds over Regular as ticks, a headline that answers the screen's
 * own news; and the upgrade is the bar. Free stays a quiet row under it.
 */
const offer = (headline, adds) => `<div class="card pad" style="display:grid;gap:10px;background:var(--pri);color:var(--onpri);box-shadow:0 1px 2px rgba(20,26,42,.25),0 12px 24px -12px rgba(20,26,42,.55)">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px"><b style="font:800 24px/1 var(--head);letter-spacing:-.02em">Full</b>${price('$9.99').replace('color:var(--muted)', 'opacity:.7')}</div>
  <div style="font:700 15px/1.3 var(--head)">${headline}</div>
  <div style="display:grid;gap:7px">${adds.map((t) => has(t)).join('')}</div></div>`;
const FULL_ADDS = ['Run games as often as you like', 'Pass a game to anyone, or take one'];
const store = note('Billed through the App Store. Receipts and cancelling are also there, in Settings → Apple ID → Subscriptions.');

export const section = { title: 'Your plan',
  blurb: 'Changing a membership from Settings, outside the gate on opening a game: what you are on, moving up, moving down, stopping, and what happens when a plan runs out. New screens; draft words throughout.' };

export default [
  { id: 'plan-regular', route: '/plan', name: 'Your plan · Regular', nav: 'push',
    note: 'Settings → Plan opens this. The plan you are on is the card at the top, with what it includes; on Regular, how many games are left to host sits under it (owner: say what is left, not that it is free). Full is the offer, as an ink card, and Upgrade is the bar (owner, 24 November, on the used state: the other plans should draw attention); Free stays a quiet row. The screen scrolls: Free and the store line are under the bar.',
    allowOverflow: true,
    flags: [DRAFT, 'A new route; the app’s Settings row shows the plan but opens nothing.'],
    html: push({ title: 'Your plan', sub: 'Andro · The Thursday game',
      body: [current('Regular', price('$2.49'), 'renews 1 Dec', REGULAR, ink('your plan')), hostNight(false), label('Other plans', { quiet: true }),
        offer('Host as often as the table wants', FULL_ADDS), card([other('Free', '', 'Watch, and the last three games', 'Downgrade')]), store],
      bar: bar('Upgrade to Full · $9.99 a month') }) },

  { id: 'plan-regular-used', route: '/plan', name: 'Your plan · Regular, the game hosted', nav: 'push',
    note: 'The same screen once this month’s game has been hosted: the card says none is left and when the next one comes. Full is now the offer, not a row: the ink card answers that news, and Upgrade is the bar (owner, 24 November: the other plans should draw attention). The screen scrolls: Free and the store line are under the bar.',
    allowOverflow: true,
    flags: [DRAFT],
    html: push({ title: 'Your plan', sub: 'Andro · The Thursday game',
      body: [current('Regular', price('$2.49'), 'renews 1 Dec', REGULAR, ink('your plan')), hostNight(true), label('Other plans', { quiet: true }),
        offer('Host again tonight, not on 1 Dec', FULL_ADDS), card([other('Free', '', 'Watch, and the last three games', 'Downgrade')]), store],
      bar: bar('Upgrade to Full · $9.99 a month') }) },

  { id: 'plan-upgrade', route: '/plan', name: 'Move up to Full', nav: 'sheet',
    note: 'Upgrade starts now. The sheet says what Full adds over Regular, the price, and that the store settles the difference for the rest of the month. The bar opens the store’s own purchase sheet.',
    flags: [DRAFT, 'Proration is the store’s: Apple credits the unused part of Regular. The words should be checked against what the store actually does.'],
    html: sheet({ behind: 'Your plan', title: 'Move up to Full', sub: 'Starts today. You pay the difference for the rest of November.',
      body: [`<div class="card pad" style="display:grid;gap:10px;background:var(--pri);color:var(--onpri)"><div style="display:flex;align-items:baseline;justify-content:space-between"><b style="font:800 24px/1 var(--head)">Full</b>${price('$9.99').replace('color:var(--muted)', 'opacity:.7')}</div><div style="display:grid;gap:7px">${has('Run games as often as you like')}${has('Pass a game to anyone, or take one')}</div></div>`,
        label('Keeps everything in Regular', { quiet: true }), `<div style="display:grid;gap:7px">${has('Every night in the book, the missed ones too')}</div>`],
      bar: bar('Upgrade · $9.99 a month') }) },

  { id: 'plan-upgraded', route: '/plan', name: 'You’re on Full', nav: 'push',
    note: 'After the store confirms: the same screen, now Full, with a line saying since when. The host night card goes: Full has no limit.',
    flags: [DRAFT],
    html: push({ title: 'Your plan', sub: 'Andro · The Thursday game',
      body: [`<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--win)">${ico('check', 15)}You’re on Full from today.</div>`, current('Full', price('$9.99'), 'renews 1 Dec', FULL, ink('your plan')), label('Other plans', { quiet: true }),
        card([other('Regular', '$2.49', 'One night as host each month', 'Downgrade'), other('Free', '', 'Watch, and the last three games', 'Downgrade')]), store] }) },

  { id: 'plan-downgrade', route: '/plan', name: 'Move down to Regular', nav: 'sheet',
    note: 'A downgrade waits for the end of what is paid, so nothing is lost tonight. The sheet lists plainly what goes, struck through, and what stays; the bar names the date it happens.',
    flags: [DRAFT],
    html: sheet({ behind: 'Your plan', title: 'Move down to Regular', sub: 'You keep Full until 1 December. Then Regular starts at $2.49 a month.',
      body: [label('From 1 December', { quiet: true }), `<div class="card pad" style="display:grid;gap:8px">${has('Run games as often as you like', false)}${has('Pass a game to anyone', false)}${has('One night as host each month')}${has('Every night in the book, the missed ones too')}</div>`],
      bar: bar('Switch on 1 December') }) },

  { id: 'plan-cancel', route: '/plan', name: 'Stop paying', nav: 'sheet',
    note: 'Down to Free is stopping the subscription. Same shape as the downgrade, with more struck through; the red is kept for the one line that matters most, and the bar is still ink, as everywhere.',
    flags: [DRAFT, '“Older nights stay in the book but are hidden” is how 0021 reads the book for a Free account; check it before this ships.'],
    html: sheet({ behind: 'Your plan', title: 'Move to Free', sub: 'You keep Full until 1 December. Nothing is deleted.',
      body: [label('From 1 December', { quiet: true }), `<div class="card pad" style="display:grid;gap:8px">${has('Running games', false)}${has('Nights older than the last three', false)}${has('Watch any game and see its money live')}${has('Your place in the group')}</div>`,
        `<p class="note red" style="font-size:13px">Older nights stay in the book but are hidden until you have a plan again.</p>`],
      bar: bar('Move to Free on 1 December') }) },

  { id: 'plan-pending', route: '/plan', name: 'Your plan · a change waiting', nav: 'push',
    note: 'After a downgrade or a cancel: the plan you still have, a card saying what happens on which date, and Keep Full as a filled button inside it (owner: more visible and inviting), the only filled control on the screen. Until the date nothing else changes.',
    flags: [DRAFT],
    html: push({ title: 'Your plan', sub: 'Andro · The Thursday game',
      body: [`<div class="card pad" style="display:grid;gap:12px;padding:14px"><div style="display:flex;gap:10px;align-items:flex-start"><span class="muted" style="margin-top:1px">${ico('calendar', 18)}</span><div style="flex:1;font-size:14px;line-height:1.4">Moves to <b>Regular</b> on 1 December.<div class="muted" style="font-size:12.5px;margin-top:3px">Keep Full and nothing changes: unlimited games, passing to anyone.</div></div></div><div style="height:46px;border-radius:12px;background:var(--pri);color:var(--onpri);display:flex;align-items:center;justify-content:center;gap:8px;font:700 15px/1 var(--head)">${ico('check', 16)}Keep Full · $9.99 a month</div></div>`,
        current('Full', price('$9.99'), 'until 1 Dec', FULL, ink('your plan')), store] }) },

  { id: 'plan-free', route: '/plan', name: 'Your plan · Free', nav: 'push',
    note: 'On Free the head of the screen is what you have, and the two paid plans below it say what each adds, the cheaper first. Running a game is the line that matters, so each says it.',
    flags: [DRAFT],
    html: push({ title: 'Your plan', sub: 'Andro · The Thursday game',
      body: [current('Free', '', 'no charge', FREE, ink('your plan')), label('Run your own games', { quiet: true }),
        card([other('Regular', '$2.49', 'One night as host each month, every night in the book', 'Get'), other('Full', '$9.99', 'Run games as often as you like', 'Get')])] }) },

  { id: 'plan-lapsed', route: '/', name: 'Home · a plan ran out', nav: 'root',
    note: 'The handoff’s state 16, in the new look: after a plan ends, Start a session still sits where it was, its line saying why it is closed; tapping it opens the plan gate. Nothing else on Home changes.',
    flags: ['“Your Full ended on 25 Sep · renew to open one” is the handoff’s, marked UNSURE there.'],
    html: HOME.replace('$500 buy-in · same rules as last time', 'Your Full ended on 25 Sep · renew to open one') },

  { id: 'plan-founder', route: '/plan', name: 'Your plan · founder', nav: 'push',
    note: 'A plan nobody pays for (a founder, a grant, a promo) has nothing to change: it says so, and how long it lasts.',
    flags: [DRAFT, 'Grant and promo plans end on a date (endsAt); a founder’s is for ever.'],
    html: push({ title: 'Your plan', sub: 'Andro · The Thursday game',
      body: [current('Full', '', 'for ever', FULL, ink('founder')), note('Given to the people who ran the first games. There is nothing to pay and nothing to change.')] }) },

  { id: 'plan-friend', route: '/plan', name: 'Your plan · friend', nav: 'push',
    note: 'The founder’s screen for friends (owner, 23 November): one personal Full account, for life. Like the founder’s, there is nothing to pay or change; the line says it is theirs alone.',
    flags: [DRAFT, 'A new kind of grant: a lifetime Full on one person’s account. 0021 has grant plans with an end date; this one has none, like a founder’s.'],
    html: push({ title: 'Your plan', sub: 'Andro · The Thursday game',
      body: [current('Full', '', 'for life', FULL, ink('friend')), note('A gift from the people who make the app: Full on your own account, for life. It is yours alone and cannot be passed on. There is nothing to pay and nothing to change.')] }) },
];
