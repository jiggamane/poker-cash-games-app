/**
 * Builds the full board: every screen of the app in the approved look.
 *
 *   node design/explorations/full-board/build.mjs [--artifact <path>]
 *
 * Draws nothing itself. Each `screens/NN-*.mjs` exports a `section` and an
 * array of screens made with `kit.mjs`; this lays them out, one cell per
 * screen, with a Light / Dark switch over all the phones. `--artifact` also
 * writes the published copy, with the Approve / Needs work controls the other
 * boards use (`../icon-system/review.js`; collection `reviews`, one document
 * per screen id, plus `general`).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CSS, FONTS } from './kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const artifactAt = process.argv.includes('--artifact') ? process.argv[process.argv.indexOf('--artifact') + 1] : null;

const files = readdirSync(join(here, 'screens')).filter((f) => f.endsWith('.mjs')).sort();
const sections = [];
for (const f of files) {
  const m = await import(pathToFileURL(join(here, 'screens', f)).href);
  sections.push({ file: f, ...(m.section ?? { title: f, blurb: '' }), screens: m.default });
}
const all = sections.flatMap((s) => s.screens);

/*
 * Behind every sheet is the screen it came from. The kit draws only that
 * screen's title; here the real screen is put behind the scrim wherever the
 * board has one with that title, so a sheet is not floating over a blank.
 */
const titleOf = (html) => (html.match(/<h1[^>]*>(.*?)<\/h1>/) ?? [])[1];
const innerOf = (html) => html.slice(html.indexOf('<div class="scr">') + 17, html.lastIndexOf('</div></div>'));
const behind = new Map();
for (const s of all) if (s.nav !== 'sheet' && !s.wide && !behind.has(titleOf(s.html))) behind.set(titleOf(s.html), innerOf(s.html));
/* Every phone in a cell, not only the first: an option cell can hold two sheets side by side. */
const withBehind = (phone) => {
  const at = phone.indexOf('<div class="scrim">');
  if (at < 0) return phone;
  const back = behind.get(titleOf(phone));
  return back ? phone.slice(0, phone.indexOf('<div class="scr">') + 17) + back + phone.slice(at) : phone;
};
for (const s of all) s.html = s.html.split('<div class="fb">').map((part, i) => (i === 0 ? part : withBehind('<div class="fb">' + part).slice(16))).join('<div class="fb">');
const dup = all.map((s) => s.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dup.length) throw new Error(`duplicate screen ids: ${[...new Set(dup)].join(', ')}`);
const routes = new Set(all.map((s) => s.route));

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const NAV = { push: 'pushed screen', sheet: 'sheet', root: 'home' };

let REVIEW = false;
const reviewBlock = (key, labelText, rows = 2) => `<div class="rv" data-key="${key}">
      <div class="rvb">
        <button type="button" class="rvbtn ok" data-v="approved" aria-pressed="false" disabled>Approve</button>
        <button type="button" class="rvbtn no" data-v="changes" aria-pressed="false" disabled>Needs work</button>
      </div>
      <label class="sr" for="c-${key}">Comment on ${esc(labelText)}</label>
      <textarea id="c-${key}" rows="${rows}" placeholder="Comment (optional)" disabled></textarea>
      <span class="rvs" aria-live="polite"></span>
    </div>`;

const cell = (s) => `<figure class="cell scr-cell${s.wide ? ' wide' : ''}" data-key="${s.id}" id="s-${s.id}">
  <div class="pg-ph">${s.html}</div>
  <figcaption><b>${esc(s.name)}</b><span class="pg-meta"><code>${esc(s.route)}</code> · ${NAV[s.nav] ?? s.nav}</span>${
    s.note ? `<span class="pg-nt">${esc(s.note)}</span>` : ''}${
    (s.flags ?? []).map((f) => `<span class="pg-flag">${esc(f)}</span>`).join('')}</figcaption>
  ${REVIEW ? reviewBlock(s.id, s.name) : ''}</figure>`;

const flagged = all.filter((s) => (s.flags ?? []).length);

const page = () => `<title>Poker Club Full Board</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="${FONTS}">
<style>
/* Layout: a short brief, a sticky strip (theme switch, section links, review tally), then one band per part of the app, each a wrapping grid of phone cells. */
:root{--bg:#F4F5F7;--panel:#FFFFFF;--fg:#141A2A;--muted:#596171;--line:#DDE1E7;--ok:#0E7A45;--warn:#A3282E;--accent:#2B6CDF;--flag:#8A5A00;--flagbg:#FFF4D6;
  --head:'Libre Franklin',system-ui,sans-serif;--body:'Inter',system-ui,sans-serif}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#10131A;--panel:#191D27;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;--ok:#5CCB93;--warn:#F08A82;--accent:#7FA8F5;--flag:#F2CD7A;--flagbg:#3A2F12;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#10131A;--panel:#191D27;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;--ok:#5CCB93;--warn:#F08A82;--accent:#7FA8F5;--flag:#F2CD7A;--flagbg:#3A2F12;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:400 15px/1.55 var(--body);margin:0}
.pg-wrap{max-width:1500px;margin:0 auto;padding-block:36px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.pg-eyebrow{font:600 12px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.pg-wrap>header>h1{font:800 clamp(28px,4vw,40px)/1.05 var(--head);letter-spacing:-.025em;margin:10px 0 12px;text-wrap:balance}
.pg-wrap>section>h2{font:800 24px/1.15 var(--head);letter-spacing:-.02em;margin:0 0 6px;text-wrap:balance}
.pg-wrap>header>p,.pg-wrap>section>p{margin:0;max-width:74ch;color:var(--muted)}.pg-wrap>header>p b{color:var(--fg)}
.pg-wrap>section{margin-top:48px;display:flex;flex-direction:column;gap:14px;scroll-margin-top:120px}
.pg-rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-top:16px}
.pg-rules div{background:var(--panel);border-radius:12px;padding:12px 14px;font-size:13.5px;color:var(--muted)}.pg-rules b{display:block;color:var(--fg);font-size:14px;margin-bottom:2px}
.pg-strip{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;background:var(--fg);color:var(--bg);border-radius:14px;padding:10px 14px;margin-top:18px}
.pg-strip b{font:800 14px var(--body)}
.pg-mode{display:inline-flex;background:rgba(127,127,127,.28);border-radius:999px;padding:3px}
.pg-mode button{font:700 12.5px var(--body);color:inherit;background:none;border:0;border-radius:999px;padding:6px 12px;cursor:pointer}
.pg-mode button[aria-pressed="true"]{background:var(--bg);color:var(--fg)}
.pg-mode button:focus-visible,.pg-strip a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.pg-strip nav{display:flex;gap:4px 12px;flex-wrap:wrap;flex:1;min-width:0}
.pg-strip nav a{font:600 12.5px var(--body);color:inherit;opacity:.85;text-decoration:none;white-space:nowrap}.pg-strip nav a:hover{opacity:1;text-decoration:underline}
.cnt{display:flex;gap:6px;flex-wrap:wrap}.cnt span{font:700 12px var(--body);padding:4px 9px;border-radius:999px;background:rgba(127,127,127,.25)}
.rvnote{font:500 12px var(--body);flex-basis:100%;opacity:.85}
.pg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:22px 18px;justify-items:center}
.scr-cell{margin:0;width:330px;max-width:100%;display:flex;flex-direction:column;gap:10px;scroll-margin-top:120px;border-radius:20px;padding:0}
.scr-cell .pg-ph{line-height:0}
.scr-cell.wide{width:678px;grid-column:span 2}
@media (max-width:760px){.scr-cell.wide{width:330px;grid-column:auto}}
.scr-cell figcaption{display:flex;flex-direction:column;gap:4px;padding:0 6px}
.scr-cell figcaption b{font:700 15px var(--head)}
.scr-cell .pg-meta{font-size:12.5px;color:var(--muted)}.scr-cell code{font:500 12px ui-monospace,Menlo,monospace}
.scr-cell .pg-nt{font-size:13px;color:var(--muted)}
.pg-flag{font-size:12.5px;line-height:1.4;color:var(--flag);background:var(--flagbg);border-radius:8px;padding:6px 9px}
.pg-flag::before{content:"Open: ";font-weight:700}
.rv{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;padding:0 6px}
.rvb{display:flex;gap:6px}
.rvbtn{font:700 13px var(--body);padding:8px 14px;border-radius:10px;border:1.5px solid var(--line);background:var(--panel);color:var(--fg);cursor:pointer}
.rvbtn:disabled{cursor:default;opacity:.45}
.rvbtn:focus-visible,.rv textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.rvbtn.ok[aria-pressed="true"]{background:var(--ok);border-color:var(--ok);color:#fff}
.rvbtn.no[aria-pressed="true"]{background:var(--warn);border-color:var(--warn);color:#fff}
.rv textarea{flex-basis:100%;font:400 13px/1.4 var(--body);color:var(--fg);border:1.5px solid var(--line);border-radius:10px;padding:7px 9px;background:var(--panel);resize:vertical;box-sizing:border-box}
.rvs{font:500 12px var(--body);color:var(--muted);flex-basis:100%}.rvs.err{color:var(--warn)}
.cell.is-approved .pg-ph{outline:3px solid var(--ok);outline-offset:3px;border-radius:46px}.cell.is-changes .pg-ph{outline:3px solid var(--warn);outline-offset:3px;border-radius:46px}
.pg-general{background:var(--panel);border-radius:16px;padding:14px;margin:0;display:flex;flex-direction:column;gap:10px;max-width:760px}
.pg-general figcaption b{font:700 16px var(--head)}.pg-general figcaption span{display:block;font-size:13.5px;color:var(--muted)}
.pg-open{margin:0;padding:0;list-style:none;display:grid;gap:8px;max-width:900px}
.pg-open li{background:var(--panel);border-radius:12px;padding:10px 14px;font-size:13.5px;color:var(--muted)}
.pg-open a{color:var(--fg);font-weight:700;text-decoration:none}.pg-open a:hover{text-decoration:underline}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
${CSS}
</style>
<main class="pg-wrap" id="board">
<header>
  <span class="pg-eyebrow">Design board · 22 November 2026 · not a handoff, nothing here is in the app</span>
  <h1>The whole app, in the approved look</h1>
  <p>Every route of the app, redrawn with what you approved today: the <b>ink top</b>, the <b>white sheet</b>, <b>lifted cards</b>, their <b>dark version</b>, and the footer where <b>the bar is the button</b>. ${all.length} phones cover ${routes.size} routes. The words, the figures and the order of things on each screen are the app’s; only the chrome and the surfaces changed. Approve a screen, or say what to change on it. Code changes wait for your approval here.</p>
  <div class="pg-rules">
    <div><b>The header</b>The top of an ink screen, in white type. A back chevron and the title; a step or a status at the right. Tonight keeps its pot up there.</div>
    <div><b>The sheet and the cards</b>One white sheet rises over the ink. Groups are white cards on one soft shadow. Nothing grey sits under content; inputs are outlined.</div>
    <div><b>The bar is the button</b>A screen’s one primary action is the ink bar at the bottom, words straight on it. Faint when it is not available yet. Other actions stay in the content, outlined or as quiet text.</div>
    <div><b>Sheets</b>Keep their grabber and close. A sheet that ends in Save or Add ends in the same bar. Behind each one is the screen it opened from, dimmed.</div>
    <div><b>Kept from Fresh Deck</b>Names only, nothing points, red belongs to chips and to hearts and diamonds, no green fills.</div>
    <div><b>Not yet seen on a phone</b>These are 330-point mock phones. Use the switch below to see every one of them dark.</div>
  </div>
  <div class="pg-strip" role="group" aria-label="Board controls">
    <div class="pg-mode" role="group" aria-label="Phone theme"><button type="button" id="m-light" aria-pressed="true">Light</button><button type="button" id="m-dark" aria-pressed="false">Dark</button></div>
    <nav aria-label="Sections">${sections.map((s, i) => `<a href="#sec-${i}">${esc(s.title)}</a>`).join('')}${flagged.length ? `<a href="#sec-open">Open questions</a>` : ''}</nav>
    ${REVIEW ? `<div class="cnt" role="status"><span id="cA">0 approved</span><span id="cC">0 need work</span><span id="cO">to review</span></div><span id="rvnote" class="rvnote" hidden></span>` : ''}
  </div>
</header>

${REVIEW ? `<section><figure class="cell pg-general" data-key="general"><figcaption><b>The look as a whole</b><span>Approve here if the system is right and only single screens need work, or leave a note that applies to all of them.</span></figcaption>${reviewBlock('general', 'the look as a whole', 3)}</figure></section>` : ''}

${sections.map((s, i) => `<section id="sec-${i}">
  <h2>${esc(s.title)}</h2>
  <p>${esc(s.blurb ?? '')}</p>
  <div class="pg-grid">${s.screens.map(cell).join('')}</div>
</section>`).join('\n')}

${flagged.length ? `<section id="sec-open">
  <h2>Open questions</h2>
  <p>Places where a redraw had to decide something the app or the handoffs do not say, or where a word on the board is not yet in the app. Each links to its screen.</p>
  <ul class="pg-open">${flagged.flatMap((s) => s.flags.map((f) => `<li><a href="#s-${s.id}">${esc(s.name)}</a> — ${esc(f)}</li>`)).join('')}</ul>
</section>` : ''}
</main>
<script>
(() => {
  const board = document.getElementById('board'), L = document.getElementById('m-light'), D = document.getElementById('m-dark');
  const set = (dark) => { board.classList.toggle('dark', dark); L.setAttribute('aria-pressed', String(!dark)); D.setAttribute('aria-pressed', String(dark)); try { localStorage.setItem('fb-mode', dark ? 'dark' : 'light'); } catch (e) {} };
  L.addEventListener('click', () => set(false)); D.addEventListener('click', () => set(true));
  /* A sheet tall enough to reach the title of the screen behind it hides that title, so it is never half-cropped. */
  document.querySelectorAll('.fb .modal').forEach((m) => { if (m.offsetTop < 84) m.closest('.scr').classList.add('cover'); });
  let saved = null; try { saved = localStorage.getItem('fb-mode'); } catch (e) {}
  if (saved === 'dark') set(true);
})();
</script>
${REVIEW ? `<script>\n${readFileSync(join(here, '../icon-system/review.js'), 'utf8')}</script>` : ''}`;

const html = page();
writeFileSync(join(here, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${html.replace('</style>', '</style></head><body>')}</body></html>`);
console.log(`wrote index.html ${(html.length / 1024).toFixed(0)} KB · ${all.length} phones · ${routes.size} routes · ${flagged.length} flagged`);
if (artifactAt) {
  REVIEW = true;
  const out = page();
  writeFileSync(artifactAt, out);
  console.log('wrote', artifactAt, (out.length / 1024).toFixed(0) + ' KB');
}
