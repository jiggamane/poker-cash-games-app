/*
 * Screen headers — a follow-up to the visual-direction study.
 *
 *   node design/explorations/screen-headers/build.mjs
 *
 * Writes index.html beside this file. The night, the glyphs, the phone frame and
 * every style below the header come from ../visual-direction (its build.mjs and
 * page.html), so the bodies of these phones are the study's to the pixel and
 * only the top of each screen changes. That is the point: hold the list still
 * and compare headers.
 *
 * An exploration. Not a handoff; nothing here supersedes a board. See README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LIVE, CASHED, FINAL, n0, $, $s, tone, G, spade, token, crest, phone, termsIcons,
  A, B, C,
} from '../visual-direction/build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDY = path.join(HERE, '../visual-direction/page.html');

/* The study's phone styles, verbatim: from the shared-phones banner to </style>. */
const studyCss = (() => {
  const s = fs.readFileSync(STUDY, 'utf8');
  const from = s.indexOf('/* ═══ PHONES — shared');
  const to = s.indexOf('</style>');
  if (from < 0 || to < 0) throw new Error('visual-direction/page.html: phone styles not found');
  return s.slice(from, to);
})();

/* ─── Pieces every header draws ──────────────────────────────────────────── */

const liveB = `<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2.4 1.8"/><circle cx="8" cy="8" r="2.6" fill="currentColor"/></svg>`;
const tag = (p) => `<span class="${p}-live">${p === 'b' ? liveB : '<i></i>'}3h 16m</span>`;
const back = (p) => `<span class="${p}-back">${G.back(20)}</span>`;
const role = (p, extra = '') => `<div class="${p}-sub ${extra}"><b>You’re recording</b> · started 20:05</div>`;

/* A chip's edge, as the seat token draws it, at the size of a header. */
const chipRing = (cls) => `
  <svg class="ring ${cls}" viewBox="0 0 400 400" aria-hidden="true">
    <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" stroke-width="16" stroke-dasharray="44 40"/>
    <circle cx="200" cy="200" r="160" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 6"/>
  </svg>`;

/* Grain: one SVG turbulence tile, laid over the header as a texture. */
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>`,
)}")`;

/* ─── Bodies: everything under the header, exactly as the study draws it ─── */

const bodyA = () => `
    <div class="a-sec">Still playing <span>5</span></div>
    ${LIVE.map((r) => `
      <div class="a-row"><span class="a-name">${r.n}</span><span class="a-amt">${$(r.amt)}</span>
        <i class="a-rule"><i style="width:${(r.amt / 5000) * 100}%"></i></i></div>`).join('')}
    <div class="a-sec">Cashed out <span>1</span></div>
    <div class="a-row out"><span class="a-name">${CASHED.n} <small>${CASHED.at} · out ${n0(CASHED.out)}</small></span><span class="a-amt win">${$s(CASHED.net)}</span>
      <i class="a-rule"><i class="w" style="width:${(CASHED.out / 5000) * 100}%"></i></i></div>
    <div class="a-dock">
      <div class="a-dock-h">${G.up(16)}<span>Table admin</span><em>seat · cash out · end</em></div>
      <div class="a-dock-b"><span class="a-btn">${G.plus(20)}Rebuy</span><span class="a-btn2">${G.receipt(20)}Bill</span></div>
    </div>`;

const bodyB = () => `
    <div class="b-sec"><span>Still playing · 5</span><i></i></div>
    ${LIVE.map((r) => `<div class="b-row">${token(r.i)}<span class="b-name">${r.n}</span><span class="b-amt">${$(r.amt)}</span></div>`).join('')}
    <div class="b-sec"><span>Cashed out · 1</span><i></i></div>
    <div class="b-row out">${token(CASHED.i, 'dim')}<span class="b-name">${CASHED.n}<small>${CASHED.at} · out ${n0(CASHED.out)}</small></span><span class="b-amt win">${$s(CASHED.net)}</span></div>
    <div class="b-dock">
      <div class="b-dock-h">${G.up(16)}<span>Table admin</span><em>seat · cash out · end</em></div>
      <div class="b-dock-b"><span class="b-btn">${G.plus(20)}Rebuy</span><span class="b-btn2">${G.receipt(20)}Bill</span></div>
    </div>`;

const bodyC = () => `
    <div class="c-cols"><span>sat</span><span>Still playing</span><span>in</span></div>
    ${LIVE.map((r) => `<div class="c-row"><span class="c-t">${r.sat}</span><span class="c-name">${r.n}</span><span class="c-amt">${n0(r.amt)}</span></div>`).join('')}
    <div class="c-sum"><span class="c-t"></span><span>5 seated</span><span class="c-amt">4,500</span></div><i class="c-dbl"></i>
    <div class="c-cols gap"><span>left</span><span>Cashed out</span><span>net</span></div>
    <div class="c-row out"><span class="c-t">${CASHED.at}</span><span class="c-name">${CASHED.n} <small>out ${n0(CASHED.out)}</small></span><span class="c-amt win">${$s(CASHED.net)}</span></div>
    <div class="c-dock">
      <div class="c-dock-h">${G.up(16)}<span>Table admin</span><em>seat · cash out · end</em></div>
      <div class="c-dock-b"><span class="c-btn">${G.plus(20)}Rebuy</span><span class="c-btn2">${G.receipt(20)}Bill</span></div>
    </div>`;

const settledListB = () => `
    <div class="b-list">${FINAL.map((r, k) => `
      <div class="b-res">
        <div class="b-res-1"><span class="b-rank">${k + 1}</span>${token(r.i, 'sm')}<span class="b-name">${r.n}</span><span class="b-amt ${tone(r.net)}">${$s(r.net)}</span></div>
        ${termsIcons(r, 'b')}
      </div>`).join('')}
    </div>
    <div class="b-foot"><span class="b-btn3">Who pays whom ${G.arrow(18)}</span></div>`;

const winnerCard = () => `
      <div class="b-result">
        <span class="b-idx tl">${spade(13)}</span><span class="b-idx br">${spade(13)}</span>
        <div class="b-result-1">${token('DN', 'ink')}<span class="b-result-n">Dana</span><span class="b-result-f"><span class="sg">+</span>$1,429</span></div>
        <div class="b-result-2"><span>$5,000 in play</span><span>3h 15m</span><span>6 players</span></div>
      </div>`;
const meta = (p) => `<div class="${p}-meta"><span>Settled · 3h 15m · 6 players</span><span class="${p}-view">Final, detailed ${G.down(14)}</span></div>`;

/* The hero, as each direction draws it. `bare` drops its own card surface. */
const heroA = (x = '') => `
    <div class="a-hero ${x}">
      <div><div class="a-lbl">On the table</div><div class="a-fig">$4,500</div></div>
      <div class="a-hero-r"><span>$5,000 in play</span><span class="d">5 seated · 1 out</span></div>
    </div>`;
const heroB = (x = '') => `
    <div class="b-hero ${x}">
      <div><div class="b-lbl">On the table</div><div class="b-fig">$4,500</div></div>
      <div class="b-hero-r"><span>$5,000 in play</span><span class="d">5 seated · 1 out</span></div>
    </div>`;
const heroC = (x = '') => `
    <div class="c-hero ${x}">
      <div><div class="c-lbl">On the table</div><div class="c-fig">$4,500</div></div>
      <div class="c-hero-r"><span>$5,000 in play</span><span>5 seated · 1 out</span></div>
    </div>`;

/* ═══ H1 · LAMP ═══════════════════════════════════════════════════════════
   The layout is untouched. The ground gets a light source: a warm pool from
   above the title that falls off by the second row, and grain in it, so the top
   of the screen is lit and the list sits in the shade. */

const lamp = '<div class="h-lamp"></div>';
const H1 = {
  a: () => phone('a dark h1', `${lamp}
    <div class="a-nav">${back('a')}<span class="a-title">Tonight</span>${tag('a')}</div>
    ${role('a')}${heroA()}${bodyA()}`, 'A · Tonight'),
  b: (t = 'dark') => phone(`b ${t} h1`, `${lamp}
    <div class="b-nav">${back('b')}<span class="b-title">Tonight</span>${tag('b')}</div>
    ${role('b')}${heroB()}${bodyB()}`, t === 'dark' ? 'B · Tonight' : 'B · Tonight, light'),
  c: () => phone('c light h1', `${lamp}<div class="c-margin"></div>
    <div class="c-nav">${back('c')}<span class="c-title">Tonight</span>${tag('c')}</div>
    ${role('c')}${heroC()}${bodyC()}`, 'C · Tonight'),
  s: () => phone('b dark h1', `${lamp}
    <div class="b-nav">${back('b')}</div>
    <div class="b-pad tight"><div class="b-h1 s">Thu 5 November</div>${meta('b')}${winnerCard()}</div>
    ${settledListB()}`, 'B · Settled night'),
};

/* ═══ H2 · RAIL ═══════════════════════════════════════════════════════════
   The header and the figure are one object: a raised panel that runs up under
   the status bar and ends in a rounded edge, like the rail round a table. The
   hero loses its own card; the list lives on the ground below the rail. */

const H2 = {
  a: () => phone('a dark h2', `
    <div class="rail">
      <div class="a-nav">${back('a')}<span class="a-title">Tonight</span>${tag('a')}</div>
      ${role('a')}${heroA('bare')}
    </div>${bodyA()}`, 'A · Tonight'),
  b: (t = 'dark') => phone(`b ${t} h2`, `
    <div class="rail">
      <div class="b-nav">${back('b')}<span class="b-title">Tonight</span>${tag('b')}</div>
      ${role('b')}${heroB('bare')}
    </div>${bodyB()}`, t === 'dark' ? 'B · Tonight' : 'B · Tonight, light'),
  c: () => phone('c light h2', `<div class="c-margin"></div>
    <div class="rail">
      <div class="c-nav">${back('c')}<span class="c-title">Tonight</span>${tag('c')}</div>
      ${role('c')}${heroC('bare')}
    </div>${bodyC()}`, 'C · Tonight'),
  s: () => phone('b dark h2', `
    <div class="rail">
      <div class="b-nav">${back('b')}</div>
      <div class="b-pad tight"><div class="b-h1 s">Thu 5 November</div>${meta('b')}${winnerCard()}</div>
    </div>${settledListB()}`, 'B · Settled night'),
};

/* ═══ H3 · FIGURE FIRST ═══════════════════════════════════════════════════
   The title becomes a navigation-bar title and the money becomes the header.
   "Tonight" is never the thing a host is looking for; $4,500 is. The figure
   sits centred on a chip's edge drawn at header size, which is the seat
   token's ring and the live tag's ring, grown. */

const fx = (p, figCls) => `
    <div class="fx">
      ${chipRing(p)}
      <div class="fx-nav">${back(p)}<span class="fx-title">Tonight</span>${tag(p)}</div>
      ${role(p, 'fx-sub')}
      <div class="fx-lbl">On the table</div>
      <div class="fx-fig ${figCls}">$4,500</div>
      <div class="fx-meta"><span>$5,000 in play</span><i></i><span>5 seated · 1 out</span></div>
    </div>`;
const H3 = {
  a: () => phone('a dark h3', `${fx('a', 'a')}${bodyA()}`, 'A · Tonight'),
  b: (t = 'dark') => phone(`b ${t} h3`, `${fx('b', 'b')}${bodyB()}`, t === 'dark' ? 'B · Tonight' : 'B · Tonight, light'),
  c: () => phone('c light h3', `<div class="c-margin"></div>${fx('c', 'c')}${bodyC()}`, 'C · Tonight'),
  s: () => phone('b dark h3', `
    <div class="fx s">
      ${chipRing('b')}
      <div class="fx-nav">${back('b')}<span class="fx-title">Thu 5 November</span><span class="fx-gap"></span></div>
      <div class="fx-sub">Settled · 3h 15m · 6 players</div>
      ${winnerCard()}
      <div class="fx-view"><span class="b-view">Final, detailed ${G.down(14)}</span></div>
    </div>${settledListB()}`, 'B · Settled night'),
};

/* ═══ H4 · LARGE TITLE ════════════════════════════════════════════════════
   The controls get a row of their own and the title gets the whole width
   below them, under the group's crest and name, with the crest drawn again
   as a watermark cropped off the top-right. A full-width title is also the
   one layout `docs/tonight-title-row.md` found holds at every phone width
   and at large text. */

const watermark = (p) => `<div class="wm ${p}">${p === 'c' ? '' : spade(300)}</div>`;
const lt = (p, title, right = true, cls = '') => `
    ${watermark(p)}
    <div class="lt-nav">${back(p)}${right ? tag(p) : ''}</div>
    <div class="lt-eye ${p}">${p === 'b' ? crest(20) : ''}<span>The Thursday game</span></div>
    <div class="lt-title ${p} ${cls}">${title}</div>`;
const H4 = {
  a: () => phone('a dark h4', `${lt('a', 'Tonight')}${role('a', 'lt-sub')}${heroA()}${bodyA()}`, 'A · Tonight'),
  b: (t = 'dark') => phone(`b ${t} h4`, `${lt('b', 'Tonight')}${role('b', 'lt-sub')}${heroB()}${bodyB()}`, t === 'dark' ? 'B · Tonight' : 'B · Tonight, light'),
  c: () => phone('c light h4', `<div class="c-margin"></div>${lt('c', 'Tonight')}${role('c', 'lt-sub')}${heroC()}${bodyC()}`, 'C · Tonight'),
  s: () => phone('b dark h4', `${lt('b', 'Thu 5 November', false, 's')}
    <div class="b-pad tight lt-pad">${meta('b')}${winnerCard()}</div>${settledListB()}`, 'B · Settled night'),
};

/* ─── Page ───────────────────────────────────────────────────────────────── */

const settledToday = () =>
  B.settled().replace('<figcaption>Settled night</figcaption>', '<figcaption>B · Settled night</figcaption>');
const relabel = (html, label) => html.replace(/<figcaption>[^<]*<\/figcaption>/, `<figcaption>${label}</figcaption>`);

const rows = {
  TODAY: [
    relabel(A.tonight(), 'A · Tonight'), relabel(B.tonight(), 'B · Tonight'),
    relabel(B.tonight('light'), 'B · Tonight, light'), relabel(C.tonight(), 'C · Tonight'), settledToday(),
  ],
  H1: [H1.a(), H1.b(), H1.b('light'), H1.c(), H1.s()],
  H2: [H2.a(), H2.b(), H2.b('light'), H2.c(), H2.s()],
  H3: [H3.a(), H3.b(), H3.b('light'), H3.c(), H3.s()],
  H4: [H4.a(), H4.b(), H4.b('light'), H4.c(), H4.s()],
};

let html = fs.readFileSync(path.join(HERE, 'page.html'), 'utf8')
  .replace('{{STUDY_CSS}}', studyCss)
  .replaceAll('{{GRAIN}}', GRAIN);
for (const [k, v] of Object.entries(rows)) html = html.replace(`{{${k}}}`, v.join(''));

fs.writeFileSync(path.join(HERE, 'index.html'), html);
console.log(`wrote index.html (${(html.length / 1024).toFixed(0)} KB)`);
