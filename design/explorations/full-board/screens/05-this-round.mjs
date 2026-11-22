/**
 * This round: the empty "Your groups" as an explainer (owner, 22 November: "this should be an
 * explainer screen showing the (usually new) user the features and the way to start a group, let's
 * research several visual concepts").
 *
 * Four concepts, one screen each. Every one keeps the app's own line ("No groups yet. A group needs
 * only a name to exist.") and its one action, New group, on the bar. Everything else in them is DRAFT
 * COPY written for this round, flagged on each: the app has no explainer today.
 */
import { push, bar, card, row, note, ico, art, slotArt } from '../kit.mjs';

const DRAFT = 'Everything but “No groups yet. A group needs only a name to exist.” and “New group” is draft copy for this round; none of it is in the app.';
const LINE = 'No groups yet. A group needs only a name to exist.';
const h = (t, size = 22) => `<div style="font:800 ${size}px/1.12 var(--head);letter-spacing:-.02em;text-wrap:balance">${t}</div>`;
const p = (t) => `<p class="note" style="font-size:13.5px">${t}</p>`;

/* A — Three steps: what a group is for, in the order you will do it. */
const step = (n, place, title, body) => `<div class="card" style="display:flex;align-items:center;gap:10px;padding:10px 12px 10px 6px">
  ${slotArt(place, 'rows', 58, 50)}
  <div style="flex:1;min-width:0"><div style="display:flex;align-items:baseline;gap:7px"><span class="num muted" style="font:700 12px var(--head)">${n}</span><b style="font:700 15.5px/1.2 var(--head)">${title}</b></div><div style="font-size:12.5px;line-height:1.4;color:var(--muted);margin-top:3px">${body}</div></div></div>`;
const steps = push({ title: 'Your groups',
  body: [
    h('Start your game in three steps'),
    p(LINE),
    step(1, 'group', 'Make a group', 'Give it a name, a currency and the usual buy-in.'),
    step(2, 'sessions', 'Bring your players', 'Add them by name. Invite the ones who want the app.'),
    step(3, 'session', 'Run the night', 'Log buy-ins and rebuys, count the chips, and see who pays whom.'),
  ],
  bar: bar('New group') });

/* B — A walkthrough: one idea a page, a large drawing each, dots for the pages. Page one drawn. */
const dots = (on, n = 4) => `<div style="display:flex;gap:6px;justify-content:center">${Array.from({ length: n }, (_, i) => `<i style="width:${i === on ? 18 : 6}px;height:6px;border-radius:3px;background:var(--${i === on ? 'text' : 'line'});display:block"></i>`).join('')}</div>`;
const tour = push({ title: 'Your groups',
  body: [
    `<div style="flex:1;display:grid;place-items:center;align-content:center;gap:18px;text-align:center;padding:0 6px">
      ${art('session', 150)}
      ${h('Every buy&#8209;in, in one place', 24)}
      ${p('Record each buy-in and rebuy as it happens. At the end of the night, the app counts it up and settles who pays whom.')}
      ${dots(0)}
    </div>`,
    `<div class="btnq" style="margin-top:-4px">Skip</div>`,
  ],
  bar: bar('New group') });

/* C — The end of the night, shown: a small preview of what the app produces, then what it does. */
const mini = `<div class="card" style="padding:12px;transform:rotate(-2deg);margin:4px 8px 0">
  <div style="font:700 10.5px var(--body);letter-spacing:.1em;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Who pays whom</div>
  ${[['Petr', 'Dana', '$1,230'], ['Ivo', 'Andro', '$526'], ['Tomáš', 'Lena', '$175']].map(([a, b, x]) => `<div style="display:flex;align-items:center;gap:7px;padding:6px 0;border-bottom:1px solid var(--line);font-weight:600;font-size:14px">${a}<span class="muted">${ico('arrow', 13)}</span>${b}<span class="num" style="margin-left:auto;font:700 15px var(--head)">${x}</span></div>`).join('')}
  <div style="font-size:12px;color:var(--muted);margin-top:7px">Six transfers clear the night.</div></div>`;
const feat = (icon, t) => `<div style="display:flex;align-items:center;gap:10px;font-size:13.5px"><span style="width:30px;height:30px;border-radius:9px;background:var(--raised);display:grid;place-items:center;flex:none">${ico(icon, 16)}</span>${t}</div>`;
const outcome = push({ title: 'Your groups',
  body: [
    mini,
    h('Settle the night in a minute', 21),
    `<div style="display:grid;gap:9px">${feat('chipsIn', 'Buy-ins and rebuys, logged as they happen')}${feat('receipt', 'Food, drinks and the piggy bank, split fairly')}${feat('people', 'Your players, their nights and their stats')}</div>`,
    p(LINE),
  ],
  bar: bar('New group') });

/* D — Two doors: start a group, or join one with a code. Most new people arrive by invitation. */
const door = (place, title, body, ink) => `<div class="card" style="display:flex;align-items:center;gap:12px;padding:14px 14px 14px 8px;${ink ? 'background:var(--pri);color:var(--onpri)' : ''}">
  <span style="flex:none">${art(place, 74, { onInk: ink })}</span>
  <div style="flex:1;min-width:0"><b style="font:700 18px/1.15 var(--head)">${title}</b><div style="font-size:12.5px;line-height:1.4;opacity:.72;margin-top:4px">${body}</div></div></div>`;
const doors = push({ title: 'Your groups',
  body: [
    h('How do you want to start?'),
    door('session', 'Start a group', 'You run the game: name it, add your players, open the first night.', true),
    door('rulings', 'I have an invite code', 'Somebody added you to their table. Type the code from their invite.', false),
    p(LINE),
  ],
  bar: bar('New group') });

export const section = { title: 'This round: Your groups, empty, as an explainer',
  blurb: 'Four concepts for the first screen a new person sees with no group yet. Each keeps the app’s own line and New group on the bar; everything else is draft copy for this round. Approve one, or say which parts to combine.' };

export default [
  { id: 'empty-steps', route: '/groups', name: 'Explainer A · three steps', nav: 'push',
    note: 'What a group is for, in the order you will do it: make it, bring your players, run the night. A drawing per step from the approved set. Reads in one glance; nothing to swipe.',
    flags: [DRAFT], html: steps },
  { id: 'empty-tour', route: '/groups', name: 'Explainer B · a walkthrough', nav: 'push',
    note: 'One idea a page with a large drawing, swiped through: buy-ins, counting up, who pays whom, your players. Page one shown. The most welcoming, and the slowest to the button; Skip is always there.',
    flags: [DRAFT, 'The other three pages are not drawn; their drawings would be Sessions, the calculator and The group.'], html: tour },
  { id: 'empty-outcome', route: '/groups', name: 'Explainer C · the end of the night, shown', nav: 'push',
    note: 'Starts from the payoff: a tilted card of who pays whom from the canonical night, then three things the app does. Sells the result rather than describing the steps.',
    flags: [DRAFT, 'The transfers are the canonical night’s, used as an illustration.'], html: outcome },
  { id: 'empty-doors', route: '/groups', name: 'Explainer D · two ways in', nav: 'push',
    note: 'Most new people arrive because somebody invited them, so the screen asks first: start a group (the ink card), or join with a code. The bar still opens New group.',
    flags: [DRAFT, '“I have an invite code” is the app’s own words (Settings); here it opens /claim.'], html: doors },
];
