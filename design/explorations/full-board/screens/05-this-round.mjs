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


/*
 * Your groups, without a picture per group and without the currency (owner, 22 November: "no need to
 * select, or have randomly selected, an icon for each group… show several options for this list").
 * Four ways to tell groups apart using only what a group already has: its name, its players, its
 * standing and whether a night is running. Same three groups in each.
 */
const GROUPS = [
  { name: 'The Thursday game', players: 6, who: ['Andro', 'Dana', 'Lena', 'Ivo', 'Petr', 'Tomáš'], standing: 'admin', live: true, current: true },
  { name: 'Friday deep stack', players: 9, who: ['Marek', 'Jana', 'Ondra', 'Eva', 'Pavel', 'Klára', 'Filip', 'Zuzana', 'Andro'], standing: 'member' },
  { name: 'Office game', players: 4, who: ['Andro', 'Tereza', 'Martin', 'Lucie'], standing: 'name only' },
];
const caps = (t, onInk = false) => `<span style="font:700 10px/1 var(--body);letter-spacing:.09em;text-transform:uppercase;padding:4px 7px;border-radius:999px;${onInk ? 'background:rgba(255,255,255,.16);color:inherit' : 'background:var(--raised);color:var(--muted)'};white-space:nowrap">${t}</span>`;
const liveLine = '<span class="win" style="display:inline-flex;align-items:center;gap:6px"><i style="width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block"></i>a night is running</span>';
const lineOf = (g) => (g.live ? liveLine : `${g.players} players`);
const GFLAGS = ['“Friday deep stack” and “Office game” and their players are sample groups: the seeded phone belongs to one group only.', 'Drawn without the currency, the owner’s call; the app shows it on this row today.'];
const groupsScreen = (body) => push({ title: 'Your groups', sub: '3 groups', body, bar: bar('New group') });

/* A — plain rows: one card, a row per group; the current one carries a tick. */
const gA = groupsScreen([card(GROUPS.map((g) => `<div class="row" style="min-height:62px">
  <span class="n" style="font:700 17px/1.2 var(--head)">${g.name}<small>${lineOf(g)}</small></span>
  ${caps(g.standing)}<span style="width:20px;display:grid;place-items:center;flex:none">${g.current ? ico('check', 18) : ''}</span></div>`))]);

/* B — a monogram made from the name: two letters, no choosing, nothing random. */
const initials = (n) => n.replace(/^The /, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const gB = groupsScreen(GROUPS.map((g) => `<div class="card" style="display:flex;align-items:center;gap:12px;padding:12px">
  <span style="width:48px;height:48px;border-radius:14px;flex:none;display:grid;place-items:center;font:800 18px/1 var(--head);letter-spacing:-.02em;${g.current ? 'background:var(--pri);color:var(--onpri)' : 'box-shadow:inset 0 0 0 1.5px var(--outline);color:var(--text)'}">${initials(g.name)}</span>
  <div style="flex:1;min-width:0"><div style="font:700 17px/1.15 var(--head)">${g.name}</div><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--muted);margin-top:5px"><span>${lineOf(g)}</span>${caps(g.standing)}</div></div></div>`));

/* C — the people: the first names at the table say which group it is faster than any picture. */
const who = (g) => `${g.who.slice(0, 3).join(', ')}${g.who.length > 3 ? ` and ${g.who.length - 3} more` : ''}`;
const gC = groupsScreen(GROUPS.map((g) => `<div class="card pad" style="display:grid;gap:6px;${g.current ? 'box-shadow:var(--lift),inset 0 0 0 2px var(--text)' : ''}">
  <div style="display:flex;align-items:center;gap:8px"><b style="flex:1;min-width:0;font:700 17px/1.15 var(--head);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</b>${caps(g.standing)}</div>
  <div style="font-size:13px;color:var(--text)">${who(g)}</div>
  ${g.live ? `<div style="font-size:12.5px">${liveLine}</div>` : ''}</div>`));

/* D — the name as the headline: the group you are in is the ink card, the others white. */
const gD = groupsScreen(GROUPS.map((g) => `<div class="card" style="padding:14px 16px;display:grid;gap:8px;${g.current ? 'background:var(--pri);color:var(--onpri)' : ''}">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">${caps(g.standing, g.current)}${g.live ? `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;${g.current ? '' : 'color:var(--win)'}" class="${g.current ? 'live-pri' : ''}"><i style="width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block"></i>a night is running</span>` : `<span style="font-size:12px;opacity:.6">${g.players} players</span>`}</div>
  <div style="font:800 22px/1.1 var(--head);letter-spacing:-.02em">${g.name}</div></div>`));

const LIVE_PRI = `<style>.fb .live-pri{color:#7BE3AE}.dark .fb .live-pri{color:#0E7A45}</style>`;
const GROUP_OPTIONS = [
  { id: 'groups-plain', route: '/groups', name: 'Your groups A · plain rows', nav: 'push',
    note: 'One card, a row per group: the name, how many play or that a night is running, your standing, and a tick on the group you are in. The quietest; the list reads like Tonight’s.', flags: GFLAGS, html: gA },
  { id: 'groups-monogram', route: '/groups', name: 'Your groups B · a monogram from the name', nav: 'push',
    note: 'Two letters from the group’s own name (TG, FD, OG) stand where the picture was: nothing to choose, nothing random. The group you are in has the ink square.',
    flags: [...GFLAGS, 'Two groups whose names start with the same letters would share a monogram; the name beside it still tells them apart.'], html: gB },
  { id: 'groups-people', route: '/groups', name: 'Your groups C · who plays there', nav: 'push',
    note: 'Under each name, the first names at that table. People know a game by who is in it, so this tells groups apart faster than a picture. The group you are in is edged in ink.', flags: GFLAGS, html: gC },
  { id: 'groups-headline', route: '/groups', name: 'Your groups D · the name as the headline', nav: 'push',
    note: 'Each group a card with its name large and its standing above it. The group you are in is the ink card, so it reads at once as the one that is open.', flags: GFLAGS, html: LIVE_PRI + gD },
];

export const section = { title: 'This round: Your groups, full and empty',
  blurb: 'Your groups without a picture per group and without the currency, four ways; then four explainer concepts for the empty screen a new person sees. Approve one of each, or say which parts to combine.' };

export default [
  ...GROUP_OPTIONS,
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
