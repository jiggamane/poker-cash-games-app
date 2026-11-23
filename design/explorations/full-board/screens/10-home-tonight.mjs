/**
 * Home, Tonight and the settled night: the three screens the approved look was
 * reviewed on, redrawn with the kit. These are the pattern for every other file.
 */
import { push, pushRaw, sheet, bar, barSplit, barMenu, drawerRow, label, card, row, note, terms, chips, ico, art, tile, topPill, topButton, topDropdown, topHero } from '../kit.mjs';

/*
 * Hiding the money on the sheet (owner, 22 November): an eye with Hide / Show at the right of the first
 * section label hides every figure on the white sheet; the pot on the ink stays. Hidden figures are dots,
 * the owner's pick of five; never the real figure blurred, so a screenshot gives nothing away.
 */
const EYE = (open) => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>${open ? '' : '<path d="M4 20L20 4"/>'}</svg>`;
/* The control shows what a tap will do (owner, 23 November): while the money shows, the struck eye and Hide; while it is hidden, the open eye and Show. */
const hideCtl = (hidden) => `<span role="button" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;letter-spacing:0;text-transform:none;font:600 12.5px/1 var(--body);color:var(--muted)">${EYE(hidden)}${hidden ? 'Show' : 'Hide'}</span>`;
const dots = (n = 4) => `<span style="display:inline-flex;gap:4px;align-items:center;height:18px;color:var(--muted)">${'<i style="width:6px;height:6px;border-radius:50%;background:currentColor;display:block"></i>'.repeat(n)}</span>`;

const playing = [['Petr', '$1,500'], ['Lena', '$1,000'], ['Ivo', '$1,000'], ['Andro', '$500'], ['Tomáš', '$500']];
const tonightTop = { title: 'Tonight', trailing: topPill('3h 16m'), sub: '<b>You’re recording</b> · started 14:07', subRight: topButton('questionCard'),
  extra: topHero({ label: 'On the table', big: '$4,500', side: '$5,000 in play<br>5 seated · 1 out', shares: [1500, 1000, 1000, 500, 500] }) };
const tonightBody = [
  `<div class="lbl">Still playing · 5${hideCtl(false)}</div>`,
  card(playing.map(([name, amount]) => row({ name, amount }))),
  label('Cashed out · 1'),
  card(row({ name: 'Dana', meta: '17:17 · out 2,120', amount: '+$1,620', tone: 'win' })),
];

export const section = { title: 'Home, Tonight and the settled night', blurb: 'The three places the approved look was reviewed on, redrawn with the kit, plus Tonight’s drawer open and the sheet behind Rebuy.' };

export default [
  { id: 'home', route: '/', name: 'Main menu', nav: 'root', note: 'Footer approved as drawn on 22 November, after four alternatives; the type on every bar approved as drawn the same day.',
    html: pushRaw({
      topHtml: `<div class="eyebrow">Your group</div><h1 class="home">The Thursday game</h1>`,
      body: [
        `<div class="cta"><span class="art">${art('session', 76, { onInk: true })}</span><div><div class="t">Start a session</div><div class="s">$500 buy-in · same rules as last time</div></div></div>`,
        `<div class="tiles">${tile('The group', '6 on the roster', 'group')}${tile('Sessions', 'Fri 20 Nov', 'sessions')}${tile('My stats', 'across every group you play in', 'stats')}${tile('Poker tools', 'calculator, rulings, boosters', 'tools')}</div>`,
      ],
      bar: barMenu(),
    }) },

  { id: 'session', route: '/session', name: 'Tonight', nav: 'push',
    html: push({ ...tonightTop, body: tonightBody,
      bar: barSplit('Rebuy', { label: 'Bill', icon: 'receipt' }, { primaryIcon: 'plus', disc: { label: 'Table admin', hint: 'seat · cash out · end' } }) }) },

  { id: 'session-hidden', route: '/session', name: 'Tonight · money hidden', nav: 'push',
    note: 'The same screen with Hide on: every figure on the sheet is dots, Dana’s count included. The pot on the ink stays. A choice on this phone, kept until Show.',
    flags: ['Hiding is a new feature; “Hide” and “Show” are new words. The icon shows the action, not the state.', 'Open: is the choice remembered across nights, and does it reach the settled night and My stats?'],
    html: push({ ...tonightTop,
      body: [
        `<div class="lbl">Still playing · 5${hideCtl(true)}</div>`,
        card(playing.map(([name]) => row({ name, trail: dots() }))),
        label('Cashed out · 1'),
        card(row({ name: 'Dana', meta: `17:17 · out <span style="display:inline-block;vertical-align:middle;transform:scale(.7);transform-origin:left center">${dots()}</span>`, trail: dots() })),
      ],
      bar: barSplit('Rebuy', { label: 'Bill', icon: 'receipt' }, { primaryIcon: 'plus', disc: { label: 'Table admin', hint: 'seat · cash out · end' } }) }) },

  { id: 'session-admin', route: '/session', name: 'Tonight · Table admin open', nav: 'push',
    allowOverflow: true, note: 'The drawer opens upward inside the bar. Ending the night is still a hold, never a tap.',
    html: push({ ...tonightTop, body: tonightBody,
      bar: barSplit('Rebuy', { label: 'Bill', icon: 'receipt' }, { primaryIcon: 'plus', disc: { label: 'Table admin', open: true },
        drawer: [drawerRow('person', 'Seat a player'), drawerRow('cashOut', 'Cash out a player'), drawerRow('rules', 'Money rules'), drawerRow('pass', 'Pass the game'),
          drawerRow('clock', 'End this poker night', { hold: true, sub: 'Hold 1.5s · counting starts, no rebuys' })].join('') }) }) },

  { id: 'pick', route: '/pick', name: 'Who’s playing?', nav: 'sheet',
    html: sheet({ behind: 'Tonight', title: 'Who’s playing?', sub: 'Pick someone at the table to add chips, or seat a player who isn’t in yet.',
      body: [
        label('At the table · rebuy', { quiet: true }),
        card([['Andro', 'buy-in', '$500'], ['Lena', 'buy-in', '$1,000'], ['Tomáš', 'buy-in', '$500'], ['Ivo', 'buy-in + 1 rebuy', '$1,000'], ['Petr', 'buy-in + 2 rebuys', '$1,500']]
          .map(([name, meta, amount]) => row({ name, meta, amount }))),
        label('Not at the table · buy in', { quiet: true }),
        chips(['Dana', { text: '+ New player', dash: true }]),
      ] }) },

  { id: 'settled', route: '/settled', name: 'Post-game results', nav: 'push',
    html: push({ title: 'Fri 20 Nov', sub: '14:07 → 17:23', subRight: topDropdown('Final, detailed'),
      body: [
        card([
          row({ name: 'Dana', meta: '+1,620', amount: '+$1,429', tone: 'win', under: terms(`${ico('food', 12)} −110 ${ico('piggy', 12)} −81`) }),
          row({ name: 'Andro', meta: '+460', amount: '+$526', tone: 'win', under: terms(`${ico('food', 12)} −31 +120 ${ico('piggy', 12)} −23`) }),
          row({ name: 'Lena', meta: '+430', amount: '+$429', tone: 'win', under: terms(`${ico('food', 12)} −29 +50 ${ico('piggy', 12)} −22`) }),
          row({ name: 'Tomáš', meta: '−500', amount: '−$500', tone: 'loss' }),
          row({ name: 'Ivo', meta: '−780', amount: '−$780', tone: 'loss' }),
          row({ name: 'Petr', meta: '−1,230', amount: '−$1,230', tone: 'loss' }),
        ]),
        label('Deductions', { right: '$296', quiet: true }),
        `<div style="display:grid;gap:6px;font-size:12.5px;margin:0 2px">
          <div style="display:flex;gap:8px;align-items:center"><span class="muted">${ico('food', 15)}</span><span>Kitchen &amp; drinks</span><span class="muted" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Lena and Andro fronted</span><b class="num">$170</b></div>
          <div style="display:flex;gap:8px;align-items:center"><span class="muted">${ico('piggy', 15)}</span><span>Group piggy bank</span><span class="muted" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">held by the group</span><b class="num">$126</b></div></div>`,
      ],
      bar: bar('Who pays whom') }) },
];
