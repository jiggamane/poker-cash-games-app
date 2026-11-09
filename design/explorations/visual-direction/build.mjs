/*
 * The visual-direction study, as one static page.
 *
 *   node design/explorations/visual-direction/build.mjs
 *
 * Writes index.html beside this file. Every phone on the page is drawn from the
 * data below, which is the seeded night (`apps/mobile/src/data/sampleNight.ts`)
 * settled under the rev-15 rules (`packages/core/src/rev15-night.test.ts`), so
 * the figures are the engine's to the dollar and the three directions are
 * showing the same night.
 *
 * This is an exploration. It is not a handoff, and nothing in it supersedes a
 * board. See README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const img = (name) =>
  `data:image/webp;base64,${fs.readFileSync(path.join(HERE, name)).toString('base64')}`;

/* ─── The night ──────────────────────────────────────────────────────────── */

const LIVE = [
  { n: 'Petr', i: 'PR', sat: '20:07', amt: 1500 },
  { n: 'Lena', i: 'LN', sat: '20:06', amt: 1000 },
  { n: 'Ivo', i: 'IV', sat: '20:11', amt: 1000 },
  { n: 'Andro', i: 'AR', sat: '20:09', amt: 500 },
  { n: 'Tomáš', i: 'TM', sat: '22:34', amt: 500 },
];
const CASHED = { n: 'Dana', i: 'DN', at: '23:15', inn: 500, out: 2120, net: 1620 };

/* Final, after the bill (split by size of win) and the 5% piggy bank. */
const FINAL = [
  { n: 'Dana', i: 'DN', net: 1429, inn: 500, out: 2120, bill: -110, piggy: -81 },
  { n: 'Andro', i: 'AR', net: 526, inn: 500, out: 960, bill: -31, back: 120, piggy: -23 },
  { n: 'Lena', i: 'LN', net: 429, inn: 1000, out: 1430, bill: -29, back: 50, piggy: -22 },
  { n: 'Tomáš', i: 'TM', net: -500, inn: 500, out: 0 },
  { n: 'Ivo', i: 'IV', net: -780, inn: 1000, out: 220 },
  { n: 'Petr', i: 'PR', net: -1230, inn: 1500, out: 270 },
];
const MAX_NET = 1429;
const IN_PLAY = 5000;

const MINUS = '−';
const n0 = (v) => Math.abs(v).toLocaleString('en-US');
const $ = (v) => `${v < 0 ? MINUS : ''}$${n0(v)}`;
const $s = (v) => `${v < 0 ? MINUS : '+'}$${n0(v)}`;
const tone = (v) => (v > 0 ? 'win' : v < 0 ? 'loss' : '');

/* ─── Glyphs (24-unit line icons, drawn here rather than copied) ─────────── */

const svg = (d, s = 24, w = 1.8) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const G = {
  back: (s) => svg('<path d="M14.5 5 7.5 12l7 7"/>', s, 2.2),
  arrow: (s) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', s, 2),
  up: (s) => svg('<path d="m6 15 6-6 6 6"/>', s, 2.2),
  down: (s) => svg('<path d="m6 9 6 6 6-6"/>', s, 2),
  plus: (s) => svg('<path d="M12 5v14M5 12h14"/>', s, 2.4),
  people: (s) => svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.6c1.6.6 2.7 2.2 3 4.4"/>', s),
  calendar: (s) => svg('<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>', s),
  chart: (s) => svg('<path d="M4 20h16M7.5 16.5v-5M12 16.5V7M16.5 16.5v-8"/>', s),
  cards: (s) => svg('<rect x="6.5" y="3.5" width="11" height="17" rx="2"/><path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.5.2-.6.6-.6 1.1M12 15.2v.1"/>', s),
  gear: (s) => svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.7 4.7l1.7 1.7M17.6 17.6l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.7 19.3l1.7-1.7M17.6 6.4l1.7-1.7"/>', s),
  invite: (s) => svg('<circle cx="10" cy="8" r="3.4"/><path d="M3.8 19.5c.7-3.2 3.2-5 6.2-5 1.2 0 2.3.3 3.2.8M18 14v6M15 17h6"/>', s),
  sun: (s) => svg('<circle cx="12" cy="12" r="3.6"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>', s),
  receipt: (s) => svg('<path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-1.2-.8-1.2.8-2.4-1.6L6 20.5z"/><path d="M9 8.5h6M9 12h6"/>', s),
  inArrow: (s) => svg('<path d="M12 4v11M7 10.5l5 5 5-5M6 20h12"/>', s, 2),
  outArrow: (s) => svg('<path d="M12 16V5M7 9.5l5-5 5 5M6 20h12"/>', s, 2),
  fork: (s) => svg('<path d="M7 3.5v6.5a2 2 0 0 0 4 0V3.5M9 12v8.5M16.5 20.5V3.5c-2 1-3 3.3-3 6v3.5h3"/>', s),
  piggy: (s) => svg('<circle cx="12" cy="12" r="8"/><path d="M9.2 14.8l5.6-5.6"/><circle cx="9.5" cy="9.5" r="1"/><circle cx="14.5" cy="14.5" r="1"/>', s),
  share: (s) => svg('<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>', s),
};
const spade = (s, fill = 'currentColor') =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path fill="${fill}" d="M12 2.2c-2.1 3.1-7.6 6.6-7.6 10.5 0 2.6 2 4.4 4.2 4.4 1.3 0 2.4-.6 3-1.4-.3 2.5-1.2 4.1-2.9 5.6v.5h6.6v-.5c-1.7-1.5-2.6-3.1-2.9-5.6.6.8 1.7 1.4 3 1.4 2.2 0 4.2-1.8 4.2-4.4 0-3.9-5.5-7.4-7.6-10.5z"/></svg>`;

const statusBar = () => `
  <div class="sb"><span class="sb-t">23:21</span><span class="sb-r">
    <svg width="18" height="11" viewBox="0 0 18 11" aria-hidden="true"><g fill="currentColor"><rect x="0" y="7" width="3" height="4" rx=".8"/><rect x="5" y="5" width="3" height="6" rx=".8"/><rect x="10" y="2.5" width="3" height="8.5" rx=".8"/><rect x="15" y="0" width="3" height="11" rx=".8"/></g></svg>
    <svg width="27" height="12" viewBox="0 0 27 12" aria-hidden="true"><rect x=".5" y=".5" width="23" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="15" height="8" rx="1.8" fill="currentColor"/><rect x="24.6" y="4" width="1.6" height="4" rx=".8" fill="currentColor" opacity=".45"/></svg>
  </span></div>`;

const phone = (cls, body, label) => `
  <figure class="ph">
    <div class="phone ${cls}" role="img" aria-label="${label}">${statusBar()}${body}<div class="hi"></div></div>
    <figcaption>${label}</figcaption>
  </figure>`;

/* The four destinations and the dock are the same objects in every direction. */
const DEST = [
  ['people', 'The group'],
  ['calendar', 'Sessions'],
  ['chart', 'My stats'],
  ['cards', 'Poker tools'],
];
const homeDock = (p) => `
  <div class="${p}-hdock">
    <span class="${p}-pill">${G.gear(20)}<span>Settings</span></span>
    <span class="${p}-round">${G.invite(20)}</span>
    <span class="${p}-round push">${G.sun(20)}</span>
  </div>`;

/* Terms line, as the session-views board draws it: in, out, then the evening's take. */
const termsIcons = (r, p) => {
  const bits = [
    `<span>${G.inArrow(13)}${MINUS}$${n0(r.inn)}</span>`,
    `<span>${G.outArrow(13)}+$${n0(r.out)}</span>`,
  ];
  const take = [];
  if (r.bill) take.push(`<span>${G.fork(13)}${$(r.bill)}${r.back ? ` <b>+$${r.back} back</b>` : ''}</span>`);
  if (r.piggy) take.push(`<span>${G.piggy(13)}${$(r.piggy)}</span>`);
  return `<div class="${p}-terms">${bits.join('')}${take.length ? `<span class="${p}-take">${take.join('')}</span>` : ''}</div>`;
};
const termsWords = (r, p) => {
  const t = [`in ${n0(r.inn)}`, `out ${n0(r.out)}`];
  if (r.bill) t.push(`bill ${MINUS}${n0(r.bill)}${r.back ? ` +${r.back} back` : ''}`);
  if (r.piggy) t.push(`piggy ${MINUS}${n0(r.piggy)}`);
  return `<div class="${p}-terms">${t.map((x) => `<span>${x}</span>`).join('')}</div>`;
};

/* ═══ A · SHARPENED ═══════════════════════════════════════════════════════ */

const A = {
  home: () => phone('a dark', `
    <div class="a-pad">
      <div class="a-eyebrow">Your group</div>
      <div class="a-h1">The Thursday game</div>
      <div class="a-start">
        <div><div class="a-start-t">Start a session</div><div class="a-start-m">$500 buy-in · same rules as last time</div></div>
        <span class="a-start-go">${G.arrow(20)}</span>
      </div>
      <div class="a-dest">${DEST.map(([g, t]) => `<div class="a-dest-r"><span class="a-dest-i">${G[g](24)}</span><span>${t}</span></div>`).join('')}</div>
    </div>
    ${homeDock('a')}`, 'Home'),

  tonight: (theme = 'dark') => phone(`a ${theme}`, `
    <div class="a-nav"><span class="a-back">${G.back(20)}</span><span class="a-title">Tonight</span><span class="a-live"><i></i>3h 16m</span></div>
    <div class="a-sub"><b>You’re recording</b> · started 20:05</div>
    <div class="a-hero">
      <div><div class="a-lbl">On the table</div><div class="a-fig">$4,500</div></div>
      <div class="a-hero-r"><span>$5,000 in play</span><span class="d">5 seated · 1 out</span></div>
    </div>
    <div class="a-sec">Still playing <span>5</span></div>
    ${LIVE.map((r) => `
      <div class="a-row"><span class="a-name">${r.n}</span><span class="a-amt">${$(r.amt)}</span>
        <i class="a-rule"><i style="width:${(r.amt / IN_PLAY) * 100}%"></i></i></div>`).join('')}
    <div class="a-sec">Cashed out <span>1</span></div>
    <div class="a-row out"><span class="a-name">${CASHED.n} <small>${CASHED.at} · out ${n0(CASHED.out)}</small></span><span class="a-amt win">${$s(CASHED.net)}</span>
      <i class="a-rule"><i class="w" style="width:${(CASHED.out / IN_PLAY) * 100}%"></i></i></div>
    <div class="a-dock">
      <div class="a-dock-h">${G.up(16)}<span>Table admin</span><em>seat · cash out · end</em></div>
      <div class="a-dock-b"><span class="a-btn">${G.plus(20)}Rebuy</span><span class="a-btn2">${G.receipt(20)}Bill</span></div>
    </div>`, theme === 'dark' ? 'Tonight' : 'Tonight, light'),

  settled: () => phone('a dark', `
    <div class="a-nav"><span class="a-back">${G.back(20)}</span></div>
    <div class="a-pad tight">
      <div class="a-h1 s">Thu 5 November</div>
      <div class="a-meta"><span>Settled · 3h 15m · 6 players</span><span class="a-view">Final, detailed ${G.down(14)}</span></div>
    </div>
    <div class="a-list">${FINAL.map((r, k) => `
      <div class="a-res">
        <i class="a-wash ${tone(r.net)}" style="width:${Math.max(6, (Math.abs(r.net) / MAX_NET) * 58)}%"></i>
        <div class="a-res-1"><span class="a-rank">${k + 1}</span><span class="a-name">${r.n}</span><span class="a-amt ${tone(r.net)}">${$s(r.net)}</span></div>
        ${termsIcons(r, 'a')}
      </div>`).join('')}
    </div>
    <div class="a-foot"><span class="a-btn3">Who pays whom ${G.arrow(18)}</span></div>`, 'Settled night'),
};

/* ═══ B · CARD ROOM ═══════════════════════════════════════════════════════ */

const token = (i, cls = '') => `
  <span class="b-tok ${cls}"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="4.2 3.95"/></svg><b>${i}</b></span>`;
const crest = (s) => `
  <svg viewBox="0 0 40 40" width="${s}" height="${s}" aria-hidden="true"><circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="20" cy="20" r="15.5" fill="none" stroke="currentColor" stroke-width=".8" stroke-dasharray="1.6 2"/><g transform="translate(11.5 11) scale(.71)">${spade(24).replace(/<\/?svg[^>]*>/g, '')}</g></svg>`;

const B = {
  home: () => phone('b dark', `
    <div class="b-pad">
      <div class="b-eyebrow">${crest(26)}<span>Your group</span></div>
      <div class="b-h1">The Thursday game</div>
      <div class="b-card">
        <span class="b-idx tl">${spade(15)}</span><span class="b-idx br">${spade(15)}</span>
        <div class="b-card-t">Start a session</div>
        <div class="b-card-m">$500 buy-in · same rules as last time</div>
        <span class="b-card-go">${G.arrow(20)}</span>
      </div>
      <div class="b-tiles">${DEST.map(([g, t]) => `<div class="b-tile">${G[g](22)}<span>${t}</span></div>`).join('')}</div>
    </div>
    ${homeDock('b')}`, 'Home'),

  tonight: (theme = 'dark') => phone(`b ${theme}`, `
    <div class="b-nav"><span class="b-back">${G.back(20)}</span><span class="b-title">Tonight</span>
      <span class="b-live"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2.4 1.8"/><circle cx="8" cy="8" r="2.6" fill="currentColor"/></svg>3h 16m</span></div>
    <div class="b-sub"><b>You’re recording</b> · started 20:05</div>
    <div class="b-hero">
      <div><div class="b-lbl">On the table</div><div class="b-fig">$4,500</div></div>
      <div class="b-hero-r"><span>$5,000 in play</span><span class="d">5 seated · 1 out</span></div>
    </div>
    <div class="b-sec"><span>Still playing · 5</span><i></i></div>
    ${LIVE.map((r) => `<div class="b-row">${token(r.i)}<span class="b-name">${r.n}</span><span class="b-amt">${$(r.amt)}</span></div>`).join('')}
    <div class="b-sec"><span>Cashed out · 1</span><i></i></div>
    <div class="b-row out">${token(CASHED.i, 'dim')}<span class="b-name">${CASHED.n}<small>${CASHED.at} · out ${n0(CASHED.out)}</small></span><span class="b-amt win">${$s(CASHED.net)}</span></div>
    <div class="b-dock">
      <div class="b-dock-h">${G.up(16)}<span>Table admin</span><em>seat · cash out · end</em></div>
      <div class="b-dock-b"><span class="b-btn">${G.plus(20)}Rebuy</span><span class="b-btn2">${G.receipt(20)}Bill</span></div>
    </div>`, theme === 'dark' ? 'Tonight' : 'Tonight, light'),

  settled: () => phone('b dark', `
    <div class="b-nav"><span class="b-back">${G.back(20)}</span></div>
    <div class="b-pad tight">
      <div class="b-h1 s">Thu 5 November</div>
      <div class="b-meta"><span>Settled · 3h 15m · 6 players</span><span class="b-view">Final, detailed ${G.down(14)}</span></div>
      <div class="b-result">
        <span class="b-idx tl">${spade(13)}</span><span class="b-idx br">${spade(13)}</span>
        <div class="b-result-1">${token('DN', 'ink')}<span class="b-result-n">Dana</span><span class="b-result-f"><span class="sg">+</span>$1,429</span></div>
        <div class="b-result-2"><span>$5,000 in play</span><span>3h 15m</span><span>6 players</span></div>
      </div>
    </div>
    <div class="b-list">${FINAL.map((r, k) => `
      <div class="b-res">
        <div class="b-res-1"><span class="b-rank">${k + 1}</span>${token(r.i, 'sm')}<span class="b-name">${r.n}</span><span class="b-amt ${tone(r.net)}">${$s(r.net)}</span></div>
        ${termsIcons(r, 'b')}
      </div>`).join('')}
    </div>
    <div class="b-foot"><span class="b-btn3">Who pays whom ${G.arrow(18)}</span></div>`, 'Settled night'),
};

/* ═══ C · LEDGER ══════════════════════════════════════════════════════════ */

const dbl = '<i class="c-dbl"></i>';
const C = {
  home: () => phone('c light', `
    <div class="c-margin"></div>
    <div class="c-pad">
      <div class="c-eyebrow">Your group</div>
      <div class="c-h1">The Thursday game</div>
      <div class="c-start">
        <div class="c-start-t">Start a session</div>
        <div class="c-start-m">$500 buy-in · same rules as last time</div>
        <span class="c-start-go">${G.arrow(20)}</span>
      </div>
      <div class="c-dest">${DEST.map(([g, t]) => `<div class="c-dest-r"><span>${t}</span>${G.arrow(18)}</div>`).join('')}</div>
    </div>
    ${homeDock('c')}`, 'Home'),

  tonight: (theme = 'light') => phone(`c ${theme}`, `
    <div class="c-margin"></div>
    <div class="c-nav"><span class="c-back">${G.back(20)}</span><span class="c-title">Tonight</span><span class="c-live"><i></i>3h 16m</span></div>
    <div class="c-sub"><b>You’re recording</b> · started 20:05</div>
    <div class="c-hero">
      <div><div class="c-lbl">On the table</div><div class="c-fig">$4,500</div></div>
      <div class="c-hero-r"><span>$5,000 in play</span><span>5 seated · 1 out</span></div>
    </div>
    <div class="c-cols"><span>sat</span><span>Still playing</span><span>in</span></div>
    ${LIVE.map((r) => `<div class="c-row"><span class="c-t">${r.sat}</span><span class="c-name">${r.n}</span><span class="c-amt">${n0(r.amt)}</span></div>`).join('')}
    <div class="c-sum"><span class="c-t"></span><span>5 seated</span><span class="c-amt">4,500</span></div>${dbl}
    <div class="c-cols gap"><span>left</span><span>Cashed out</span><span>net</span></div>
    <div class="c-row out"><span class="c-t">${CASHED.at}</span><span class="c-name">${CASHED.n} <small>out ${n0(CASHED.out)}</small></span><span class="c-amt win">${$s(CASHED.net)}</span></div>
    <div class="c-dock">
      <div class="c-dock-h">${G.up(16)}<span>Table admin</span><em>seat · cash out · end</em></div>
      <div class="c-dock-b"><span class="c-btn">${G.plus(20)}Rebuy</span><span class="c-btn2">${G.receipt(20)}Bill</span></div>
    </div>`, theme === 'light' ? 'Tonight' : 'Tonight, dark'),

  settled: () => phone('c light', `
    <div class="c-margin"></div>
    <div class="c-nav"><span class="c-back">${G.back(20)}</span></div>
    <div class="c-pad tight">
      <div class="c-h1 s">Thu 5 November</div>
      <div class="c-meta"><span>Settled · 3h 15m · 6 players</span><span class="c-view">Final, detailed ${G.down(14)}</span></div>
    </div>
    <div class="c-list">${FINAL.map((r, k) => `
      <div class="c-res"><div class="c-res-1"><span class="c-t">${k + 1}</span><span class="c-name">${r.n}</span><span class="c-amt ${tone(r.net)}">${$s(r.net)}</span></div>${termsWords(r, 'c')}</div>`).join('')}
      <div class="c-sum"><span class="c-t"></span><span>$5,000 in, $5,000 out</span><span class="c-amt">$0</span></div>${dbl}
      <div class="c-stampw"><div class="c-stamp"><b>Settled</b><span>5 Nov 2026</span></div></div>
      <div class="c-ded"><span>Deductions</span><span class="c-amt">$296</span></div>
      <div class="c-dedr"><span>Kitchen &amp; drinks</span><em>Andro, Lena fronted</em><span class="c-amt">170</span></div>
      <div class="c-dedr"><span>Group piggy bank</span><em>Radka holds</em><span class="c-amt">126</span></div>
    </div>
    <div class="c-foot"><span class="c-btn3">Who pays whom ${G.arrow(18)}</span></div>`, 'Settled night'),
};

/* ─── Specimens: palette chips with contrast, and type ───────────────────── */

const L = (h) => {
  const c = [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
  return ((x + 0.05) / (y + 0.05)).toFixed(1);
};
const palette = (ground, chips) => `
  <div class="pal">${chips.map(([name, hex, role]) => `
    <div class="chip"><i style="background:${hex}"></i><b>${name}</b><code>${hex}</code><span>${role ?? (hex === ground ? 'ground' : `${ratio(hex, ground)}:1 on ground`)}</span></div>`).join('')}
  </div>`;

/* ─── Icons ──────────────────────────────────────────────────────────────── */

const iconA = `<svg viewBox="0 0 120 120" role="img" aria-label="Icon for direction A"><rect width="120" height="120" fill="#0E0D0C"/><g fill="#F7F5F0"><rect x="30" y="38" width="60" height="9" rx="4.5"/><rect x="30" y="56" width="44" height="9" rx="4.5"/></g><rect x="30" y="74" width="26" height="9" rx="4.5" fill="#6FCF97"/></svg>`;
const iconB = `<svg viewBox="0 0 120 120" role="img" aria-label="Icon for direction B"><defs><linearGradient id="ib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6EFE1"/><stop offset="1" stop-color="#E9DFCB"/></linearGradient></defs><rect width="120" height="120" fill="#13110E"/><g transform="rotate(-8 60 60)"><rect x="33" y="22" width="54" height="76" rx="7" fill="url(#ib)"/><rect x="37" y="26" width="46" height="68" rx="4" fill="none" stroke="#1A1610" stroke-opacity=".2"/><g transform="translate(45 41) scale(1.25)">${spade(24, '#1A1610').replace(/<\/?svg[^>]*>/g, '')}</g></g></svg>`;
const iconC = `<svg viewBox="0 0 120 120" role="img" aria-label="Icon for direction C"><rect width="120" height="120" fill="#F3F3EF"/><g stroke="#1B1E28" stroke-opacity=".1"><path d="M0 30h120M0 50h120M0 70h120M0 90h120"/></g><text x="60" y="66" text-anchor="middle" font-family="'DM Mono', ui-monospace, monospace" font-weight="500" font-size="34" fill="#1B1E28" letter-spacing="-1">$0</text><path d="M36 78h48M36 83h48" stroke="#1B1E28" stroke-width="3"/></svg>`;

/* ─── Page ───────────────────────────────────────────────────────────────── */

const html = fs.readFileSync(path.join(HERE, 'page.html'), 'utf8')
  .replace('{{A_PHONES}}', [A.home(), A.tonight(), A.settled(), A.tonight('light')].join(''))
  .replace('{{B_PHONES}}', [B.home(), B.tonight(), B.settled(), B.tonight('light')].join(''))
  .replace('{{C_PHONES}}', [C.home(), C.tonight(), C.settled(), C.tonight('dark')].join(''))
  .replace('{{A_PAL}}', palette('#0E0D0C', [
    ['Ground', '#0E0D0C'], ['Surface', '#191816'], ['Text', '#F7F5F0'], ['Muted', '#9A958C'],
    ['Annotation', '#8C8578'], ['Win', '#6FCF97'], ['Loss', '#F0705C'], ['Off table', '#D9D3C4'],
  ]))
  .replace('{{B_PAL}}', palette('#13110E', [
    ['Walnut', '#13110E'], ['Felt rail', '#1D1A16'], ['Card stock', '#F2EADB'], ['Muted', '#A89E8D'],
    ['Off table', '#C9AE7E'], ['Pending', '#F09A3E'], ['Win', '#7DD3A2'], ['Loss', '#F27A66'],
  ]))
  .replace('{{C_PAL}}', palette('#F3F3EF', [
    ['Paper', '#F3F3EF'], ['Sheet', '#FFFFFF', 'the raised page'], ['Ink', '#1B1E28'], ['Muted', '#626775'],
    ['Off table', '#6B5A3A'], ['Win', '#0A7A3D'], ['Loss', '#B03A28'], ['Carbon', '#14161B', 'dark ground'],
  ]))
  .replace('{{ICON_A}}', iconA).replace('{{ICON_B}}', iconB).replace('{{ICON_C}}', iconC)
  .replace('{{TOKEN}}', token('DN'))
  .replace('{{CREST}}', crest(56))
  .replace(/\{\{IMG:([a-z-]+\.webp)\}\}/g, (_, f) => img(f));

fs.writeFileSync(path.join(HERE, 'index.html'), html);
console.log(`wrote index.html (${(html.length / 1024).toFixed(0)} KB)`);
