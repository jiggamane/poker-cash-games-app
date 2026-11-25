/**
 * States the journeys need that no phone drew (UX review, 24 November: ux-review.md). Each is the
 * board's own phone with only what changes in that state: the Home a person sees on their first night,
 * while a night runs, while it is being counted, and as a member; the game arriving by pass and being
 * taken back; a rebuy written with its Undo; taking a player back out of Add players; Restore purchases,
 * and the store's waiting and failed states; and the confirm before removing someone from the group.
 * Words the app already has are the app's; every other line is marked draft in its flags.
 */
import { sheet, bar, card, row, note, quiet, ico, label, art, topButton } from '../kit.mjs';
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


/* The round button on Tonight's top opens Poker tools (owner, 24 November: “let's update this icon”). Four options for what it shows. */
const TB = topButton('questionCard');
const withButton = (inner) => { if (!H.session.includes(TB)) throw new Error('no top button'); return H.session.replace(TB, `<span class="tbtn">${inner}</span>`); };
const QCARD = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><g transform="rotate(12 10 10)"><rect x="4.5" y="2" width="11" height="16" rx="2.2" fill="#fff"/><text x="10" y="13.6" text-anchor="middle" font-family="Libre Franklin, sans-serif" font-weight="800" font-size="10" fill="#141A2A">?</text></g></svg>`;
const QCHIP = `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10" fill="#E5484D"/>${[0, 60, 120, 180, 240, 300].map((a) => `<rect x="9.6" y="1" width="2.8" height="3.6" rx=".6" fill="#fff" transform="rotate(${a} 11 11)"/>`).join('')}<circle cx="11" cy="11" r="5.6" fill="#fff"/><text x="11" y="14.6" text-anchor="middle" font-family="Libre Franklin, sans-serif" font-weight="800" font-size="9.5" fill="#141A2A">?</text></svg>`;
const QCARD_UP = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="4.5" y="2" width="11" height="16" rx="2.2" fill="#fff"/><text x="10" y="13.6" text-anchor="middle" font-family="Libre Franklin, sans-serif" font-weight="800" font-size="10" fill="#141A2A">?</text></svg>`;
const QCARD_RED = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><g transform="rotate(12 10 10)"><rect x="4.5" y="2" width="11" height="16" rx="2.2" fill="#fff"/><text x="10" y="13.6" text-anchor="middle" font-family="Libre Franklin, sans-serif" font-weight="800" font-size="10" fill="#E5484D">?</text></g></svg>`;
const QCARD_FAN = `<svg width="22" height="20" viewBox="0 0 22 20" aria-hidden="true"><rect x="3" y="3.5" width="10" height="14.5" rx="2" transform="rotate(-14 8 10.75)" fill="#fff" opacity=".5"/><g transform="rotate(10 13 10)"><rect x="8" y="2.5" width="10.5" height="15" rx="2.1" fill="#fff"/><text x="13.25" y="13.6" text-anchor="middle" font-family="Libre Franklin, sans-serif" font-weight="800" font-size="9.5" fill="#141A2A">?</text></g></svg>`;
const QCARD_PIP = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><g transform="rotate(12 10 10)"><rect x="4.5" y="2" width="11" height="16" rx="2.2" fill="#fff"/><circle cx="7.3" cy="5" r="1.2" fill="#E5484D"/><text x="10" y="14.2" text-anchor="middle" font-family="Libre Franklin, sans-serif" font-weight="800" font-size="10" fill="#141A2A">?</text></g></svg>`;
const QCARD_LINE = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><g transform="rotate(12 10 10)"><rect x="5" y="2.5" width="10" height="15" rx="2" fill="none" stroke="#fff" stroke-width="1.6"/><text x="10" y="13.4" text-anchor="middle" font-family="Libre Franklin, sans-serif" font-weight="800" font-size="9" fill="#fff">?</text></g></svg>`;
const ICON_OPTIONS = [
  ['g', 'G · the question card, tilted', 'Today’s question card, flat and white, tilted, the question mark in ink.', QCARD],
  ['i', 'I · upright', 'The same card standing straight: calmer, lines up with the time pill.', QCARD_UP],
  ['j', 'J · a red question mark', 'Tilted, with the question mark in the hearts-and-diamonds red: the one note of colour.', QCARD_RED],
  ['k', 'K · two cards', 'A second card fanned behind it, half white: reads more as a deck, a little busier.', QCARD_FAN],
  ['l', 'L · with a corner pip', 'A red pip in the corner like a playing card’s index, the question mark in the middle.', QCARD_PIP],
  ['m', 'M · outline', 'Drawn in a white line instead of filled: the lightest, closest to the app’s line icons.', QCARD_LINE],
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
      `<div style="position:absolute;left:14px;right:14px;bottom:150px;z-index:4;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:var(--pri);color:var(--onpri);box-shadow:0 10px 24px -10px rgba(0,0,0,.5)"><span style="color:#7BE3AE">${ico('check', 17)}</span><span style="flex:1;font:600 14px/1.2 var(--body)">Rebuy $500 added to Petr</span><b style="font:700 14.5px/1 var(--head);color:#FF8A95">Undo</b></div>`) },

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
  ...ICON_OPTIONS.map(([k, name, note, inner]) => ({ id: `session-icon-${k}`, route: '/session', name: `Tonight · the tools button · ${name}`, nav: 'push', note, html: withButton(inner) })),
];
