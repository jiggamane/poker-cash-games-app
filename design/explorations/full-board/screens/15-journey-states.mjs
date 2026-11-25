/**
 * States the journeys need that no phone drew (UX review, 24 November: ux-review.md). Each is the
 * board's own phone with only what changes in that state: the Home a person sees on their first night,
 * while a night runs, while it is being counted, and as a member; the game arriving by pass and being
 * taken back; a rebuy written with its Undo; taking a player back out of Add players; Restore purchases,
 * and the store's waiting and failed states; and the confirm before removing someone from the group.
 * Words the app already has are the app's; every other line is marked draft in its flags.
 */
import { sheet, bar, card, row, note, quiet, ico, label, art, TOOLS_ICON } from '../kit.mjs';
import home from './10-home-tonight.mjs';
import running from './45-running-the-game.mjs';
import addPlayers from './05-this-round.mjs';
import plan from './85-your-plan.mjs';

const H = Object.fromEntries([...home, ...running, ...addPlayers, ...plan].map((x) => [x.id, x.html]));
const CTA = /<div class="cta">[\s\S]*?<\/div><\/div><\/div>/;
const swapCta = (html, inner) => { if (!CTA.test(html)) throw new Error('no start card'); return html.replace(CTA, inner); };
const inkCard = (title, sub, extra = '') => `<div class="cta"><span class="art">${'${ART}'}</span><div><div class="t">${title}</div><div class="s">${sub}</div>${extra}</div></div>`;
const ART = (H.home.match(/<span class="art">([\s\S]*?)<\/span><div>/) || [])[1] ?? '';
const ink = (title, sub, extra = '') => inkCard(title, sub, extra).replace('${ART}', ART);
const liveDot = '<i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#7BE3AE;margin-right:8px;vertical-align:2px"></i>';
const lifted = (title, sub, trail = '') => `<div class="card" style="display:flex;align-items:center;gap:12px;padding:14px 16px"><div style="flex:1;min-width:0"><b style="display:block;font:700 16px/1.2 var(--head)">${title}</b><span class="muted" style="font-size:12.5px">${sub}</span></div>${trail}</div>`;
const plus = `<span style="width:28px;height:28px;border-radius:50%;background:var(--pri);color:var(--onpri);display:grid;place-items:center;flex:none">${ico('plus', 15)}</span>`;
const afterBody = (html, inner) => html.replace('<div class="body">', `<div class="body">${inner}`);
const beforeBar = (html, inner) => { const i = html.lastIndexOf('<div class="bar'); return html.slice(0, i) + inner + html.slice(i); };
const passCard = (title, sub) => `<div class="card" style="display:flex;gap:12px;align-items:flex-start;padding:14px;box-shadow:var(--lift),inset 3px 0 0 #0E7A45"><span style="flex:none;width:30px;height:30px;border-radius:50%;background:#0E7A45;color:#fff;display:grid;place-items:center">${ico('pass', 16)}</span><div><b style="display:block;font:700 15.5px/1.25 var(--head)">${title}</b><span class="muted" style="font-size:13px;line-height:1.4">${sub}</span></div></div>`;





/* The tools button, bigger (owner, 25 November: “I want this icon to be larger, show several options”). */
const TB_NOW = `<span class="tbtn">${TOOLS_ICON}</span>`;
const sized = (icon, round) => {
  const svg = TOOLS_ICON.replace('width="24" height="24"', `width="${icon}" height="${icon}"`);
  const inner = typeof round === 'string' ? `<span style="display:grid;place-items:center;flex:none;${round}">${svg}</span>` : round ? `<span class="tbtn" style="width:${round}px;height:${round}px">${svg}</span>` : `<span style="display:grid;place-items:center;width:${icon + 4}px;height:${icon + 4}px">${svg}</span>`;
  if (!H.session.includes(TB_NOW)) throw new Error('no tools button');
  return H.session.replace(TB_NOW, inner);
};
const SIZE_OPTIONS = [
  ['d', 'D · 32, no shape', 'The one you liked: the cards alone on the ink, 32 points.', 32, 0],
  ['e', 'E · a rounded square', 'The same 32 cards in a 44-point rounded square, translucent like the time pill.', 32, 'width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.14)'],
  ['f', 'F · a thin ring', 'A 44-point circle drawn as a hairline ring, no fill: the cards stay the loudest thing.', 32, 'width:44px;height:44px;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.3)'],
  ['g', 'G · a pill', 'A wider pill, 50 by 38, the same translucency as the time pill above it.', 32, 'width:50px;height:38px;border-radius:999px;background:rgba(255,255,255,.14)'],
  ['h', 'H · on felt', 'A 44-point round in deep table-felt green: the cards sit on the table.', 32, 'width:44px;height:44px;border-radius:50%;background:#0E5A36'],
];

const DRAFT = (what) => `New words, draft: ${what}.`;

export const section = { title: 'States the journeys were missing', blurb: '' };

export default [
  { id: 'home-first', route: '/', name: 'Home · first night, a group of one', nav: 'root',
    note: 'A group just made: the start card asks for the first session, the tiles wait. The app’s own state (index.tsx, fresh).',
    html: swapCta(H.home, ink('Start the first session', 'You’ll set the buy-in and blinds once, here'))
      .replace(/(<div class="tx">)6 on the roster/, '$1just you so far').replace(/(<div class="tx">)Fri 20 Nov/, '$1none yet') },

  { id: 'home-live', route: '/', name: 'Home · a night is running', nav: 'root',
    note: 'While a night runs, the start card is the live table: tapping it opens Tonight. No second table is offered (owner, 24 November). The app’s LiveCard; its StartAnother is dropped.',
    html: swapCta(H.home, ink(`${liveDot}The Thursday game`, '5 at the table · the ledger is open') ) },

  { id: 'home-unsettled', route: '/', name: 'Home · counting, not settled', nav: 'root',
    note: 'The night has ended but the count is not finished: the card says how far it got and goes straight back to Count up. The app’s UnsettledCard.',
    html: swapCta(H.home, ink('Counting · not settled', 'ended 17:23 · 2 of 6 stacks still uncounted', `<div style="display:inline-flex;margin-top:10px;padding:8px 14px;border-radius:10px;background:var(--onpri);color:var(--pri);font:700 14px/1 var(--head)">Settle up</div>`)) },

  { id: 'home-member', route: '/', name: 'Home · a member, not the host', nav: 'root',
    note: 'A player’s Home: the header names who hosts, there is no start card, and a running night shows what this person is in for.',
    html: swapCta(H.home.replace('<div class="eyebrow">Your group</div>', '<div class="eyebrow">Hosted by Andro</div>'), ink(`${liveDot}Tonight`, 'you’re in for $500 · 5 at the table')) },

  { id: 'home-pass', route: '/', name: 'Home · the game arrives', nav: 'root',
    note: 'Passed a game, the receiver does nothing: it arrives as a card on Home (and on Tonight), and tapping it opens the table. When it spends a Regular’s host night, the line says so.',
    flags: ['The host-night line is the app’s: “… This uses your host night for November.”'],
    html: afterBody(swapCta(H.home, ink(`${liveDot}The Thursday game`, '5 at the table · the ledger is open')), passCard('Andro passed you the game', 'You’re recording from 16:40. Everything before that is already here. Tap to open the table.')) },

  { id: 'session-takenback', route: '/session', name: 'Tonight · the game taken back', nav: 'push', allowOverflow: true,
    note: 'On the receiver’s phone when the passer takes the game back: the same card, now saying they are watching and that nothing is lost.',
    html: afterBody(H['session-watching'], passCard('Lena took the game back', 'You’re watching now. Nothing you recorded is lost.')) },

  { id: 'session-rebuy-undo', route: '/session', name: 'Tonight · a rebuy written, with Undo', nav: 'push',
    note: 'Just after a rebuy is logged: a strip above the bar confirms it, with Undo in a soft red (#FF8A95, the red that reads on ink) for two seconds — seen, but not louder than the line, and Petr’s row is washed for a moment. The app’s RebuyConfirmation.',
    html: beforeBar(H.session.replace('<div class="row"><span class="n">Petr</span>', '<div class="row" style="margin:0 -12px;padding:8px 12px;background:color-mix(in srgb,var(--win) 10%,transparent)"><span class="n">Petr</span>'),
      `<div style="position:absolute;left:14px;right:14px;bottom:150px;z-index:4;display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:14px;background:var(--pri);color:var(--onpri);box-shadow:0 10px 24px -10px rgba(0,0,0,.5)"><span style="color:#7BE3AE">${ico('check', 17)}</span><span style="flex:1;min-width:0;font:600 13.5px/1.2 var(--body);white-space:nowrap">Rebuy $500 added to Petr</span><style>.dark .fb .undo-r{color:#C8283A!important}</style><b class="undo-r" style="font:800 17px/1 var(--head);color:#FF8A95;padding:6px 0 6px 8px">Undo</b></div>`) },

  { id: 'c-std-remove', route: '/new-night', name: 'Add players · taking a player back out', nav: 'sheet', allowOverflow: true,
    note: 'How an added player is taken off the night before it opens: tapping their figure opens the keypad, and under the list sits a red quiet Remove. Nothing else on the sheet changes.',
    flags: [DRAFT('“Remove Ivo from tonight”')],
    html: H['c-std-3'].replace('<div class="kp"', `<div class="btnq red" style="margin:-4px 0 2px">${ico('close', 15)}Remove Ivo from tonight</div><div class="kp"`) },

  { id: 'plan-restore', route: '/plan', name: 'Your plan · Restore purchases', nav: 'push', allowOverflow: true,
    note: 'The store requires a way to restore a purchase on a new phone: a quiet row at the foot of Your plan, under the store line.',
    flags: [DRAFT('“Restore purchases”'), 'The app sells nothing yet; this and the two store states wait on the decision to sell plans in the app.'],
    html: H['plan-regular'].replace(/(Subscriptions\.<\/p>)/, `$1${quiet('Restore purchases')}`) },

  { id: 'plan-store-wait', route: '/plan', name: 'Move up to Full · waiting for the store', nav: 'sheet',
    note: 'After Upgrade, while the store’s own sheet is open: the bar goes faint and says what it is waiting for. Cancelling there returns to this sheet unchanged.',
    flags: [DRAFT('“Waiting for the App Store…”')],
    html: H['plan-upgrade'].replace('<div class="bar">', '<div class="bar blocked">').replace('Upgrade · $9.99 a month', 'Waiting for the App Store…') },

  { id: 'plan-store-failed', route: '/plan', name: 'Move up to Full · the store did not confirm', nav: 'sheet',
    note: 'If the store fails, the sheet says nothing was charged and the bar offers to try again.',
    flags: [DRAFT('“The App Store did not confirm. Nothing was charged.”')],
    html: H['plan-upgrade'].replace('Upgrade · $9.99 a month', 'Try again').replace('<div class="mbody">', `<div class="mbody"><p class="note red" style="font-size:13.5px">The App Store did not confirm. Nothing was charged.</p>`) },

  { id: 'member-remove', route: '/member', name: 'A player · remove from the group?', nav: 'sheet',
    note: 'Today one tap removes a player from the group. This puts a confirm in the same sheet: what it keeps, a red quiet remove, and Keep as the bar.',
    flags: [DRAFT('“Remove Dana from the group?”, “Remove Dana”'), 'The line under the title is the app’s own (member.tsx); today it sits under a one-tap remove.'],
    html: sheet({ behind: 'Players', title: 'Remove Dana from the group?', stepBack: true,
      body: [note('Removing somebody keeps every night they played. The ledger keeps what they already played, and anything unsettled stays on the night it came from.'), quiet('Remove Dana', { red: true })],
      bar: bar('Keep Dana') }) },
  ...SIZE_OPTIONS.map(([k, name, note, icon, round]) => ({ id: `tools-size-${k}`, route: '/session', name: `Tonight · the tools button · ${name}`, nav: 'push', note, html: sized(icon, round) })),
];
