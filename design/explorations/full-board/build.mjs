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
import { SNAPSHOT, ADDRESSED, DECIDED, SHOW, LATEST, renderProgress } from './progress.mjs';
import { PARTS, ACROSS, PLAN_DATE } from './plan.mjs';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const artifactAt = process.argv.includes('--artifact') ? process.argv[process.argv.indexOf('--artifact') + 1] : null;
const galleryAt = process.argv.includes('--gallery') ? process.argv[process.argv.indexOf('--gallery') + 1] : null;

const files = readdirSync(join(here, 'screens')).filter((f) => f.endsWith('.mjs')).sort();
const sections = [];
for (const f of files) {
  const m = await import(pathToFileURL(join(here, 'screens', f)).href);
  sections.push({ file: f, ...(m.section ?? { title: f, blurb: '' }), screens: m.default });
}
const fileOf = Object.fromEntries(sections.flatMap((s) => s.screens.map((x) => [x.id, s.file])));
const { PARTS: APP_PARTS } = await import(pathToFileURL(join(here, 'journeys.mjs')).href);
{
  const byId = Object.fromEntries(sections.flatMap((s) => s.screens.map((x) => [x.id, x])));
  const used = new Set();
  const grouped = APP_PARTS.map((part) => {
    const ids = [...part.journeys.flatMap((j) => j.steps.flatMap((st) => st.ids)), ...(part.extra ?? [])].filter((id) => byId[id] && !used.has(id) && used.add(id));
    return { part, title: part.title, blurb: part.blurb, screens: ids.map((id) => byId[id]) };
  });
  const left = sections.flatMap((s) => s.screens).filter((x) => !used.has(x.id));
  for (const x of left) {
    const g = grouped.find((g) => g.part.files.includes(fileOf[x.id]));
    if (!g) throw new Error(`screen ${x.id} (${fileOf[x.id]}) belongs to no part in journeys.mjs`);
    g.screens.push(x);
  }
  sections.length = 0;
  sections.push(...grouped);
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
for (const s of all) if (s.nav !== 'sheet' && !s.wide && s.html.startsWith('<div class="fb">') && !behind.has(titleOf(s.html))) behind.set(titleOf(s.html), innerOf(s.html));
/* Every phone in a cell, not only the first: an option cell can hold two sheets side by side. */
const withBehind = (phone) => {
  const at = phone.indexOf('<div class="scrim">');
  if (at < 0) return phone;
  const back = behind.get(titleOf(phone));
  return back ? phone.slice(0, phone.indexOf('<div class="scr">') + 17) + back + phone.slice(at) : phone;
};
for (const s of all) s.html = s.html.split('<div class="fb">').map((part, i) => (i === 0 ? part : withBehind('<div class="fb">' + part).slice(16))).join('<div class="fb">');

/*
 * Every money figure in one face (owner, 22 November: "check for all numbers (money values) to use the
 * same new font"). A figure is a currency amount ($500, +$1,620, $9.99, $2.1k), a signed amount
 * (−110, +460, +1,620) or a grouped number (2,120). Times, dates and percentages are left alone.
 * Only text between tags is touched, and nothing inside <style>, <script> or an <svg>.
 */
const MONEY = /[+\-−]?\$\d[\d,]*(?:\.\d+)?k?|[+\-−]\d{1,3}(?:,\d{3})+|[+\-−]\d{2,}(?![\d:])|\b\d{1,3}(?:,\d{3})+\b/g;
function moneyFont(html) {
  let skip = 0;
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith('<')) {
      const t = part.match(/^<\/?\s*([a-zA-Z]+)/)?.[1]?.toLowerCase();
      if (t === 'style' || t === 'script' || t === 'svg') skip += part.startsWith('</') ? -1 : part.endsWith('/>') ? 0 : 1;
      return part;
    }
    return skip > 0 ? part : part.replace(MONEY, (m) => `<span class="m">${m}</span>`);
  }).join('');
}
for (const s of all) s.html = moneyFont(s.html);
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

const ORDER = new Map(all.map((x, i) => [x.id, i]));
const cell = (s, copy = '') => `<figure class="cell scr-cell${s.wide ? ' wide' : ''}${copy ? ' upd' : ''}" data-key="${s.id}" data-order="${ORDER.get(s.id)}" id="${copy ? 'u' : 's'}-${s.id}"${copy ? ` data-upd="${s.id}"` : ''}>${copy ? `<div class="upd-what"><b>What changed</b>${esc(copy)}</div>` : ''}
  <div class="pg-ph">${s.html}</div>
  <figcaption><b>${esc(s.name)}</b><span class="pg-meta"><code>${esc(s.route)}</code> · ${NAV[s.nav] ?? s.nav}</span>${
    s.note ? `<details class="pg-why"><summary>Why</summary><span class="pg-nt">${esc(s.note)}</span></details>` : ''}${
    (s.flags ?? []).map((f) => `<span class="pg-flag">${esc(f)}</span>`).join('')}</figcaption>
  ${REVIEW ? reviewBlock(s.id, s.name) : ''}</figure>`;

const isApproved = (id, v) => (v[id] || [])[0] === 'approved';
/*
 * The working board's head for each part of the app: the journey as numbered steps (each step's phones
 * linked, an approved one ticked), the states no phone draws yet, and the questions still open on this
 * part's unapproved phones. Built from journeys.mjs; the counts are as of the build.
 */
const PRI = { P1: 'Must have', P2: 'Should have', P3: 'Nice to have' };
function partHead(sec, i) {
  const p = sec.part;
  const n = sec.screens.length, ok = sec.screens.filter((x) => isApproved(x.id, SNAPSHOT)).length;
  const name = Object.fromEntries(all.map((x) => [x.id, x.name]));
  const chip = (id) => `<a class="jr-id${isApproved(id, SNAPSHOT) ? ' ok' : ''}" href="#s-${id}">${esc((name[id] || id).replace(/^.*? · /, ''))}</a>`;
  const journeys = p.journeys.map((j) => `<div class="jr"><h3>${esc(j.name)}</h3><ol>${j.steps.map((st) => `<li><b>${esc(st.label)}</b>${st.ids.length ? `<span class="jr-ids">${st.ids.filter((id) => name[id]).map(chip).join('')}</span>` : ''}${(p.missing ?? []).filter((m) => m.step === st.label).map((m) => `<span class="jr-miss">To draw · ${esc(m.state)}</span>`).join('')}</li>`).join('')}</ol></div>`).join('');
  const missing = (p.missing ?? []).length ? `<div class="pt-block"><h3>States to draw · ${p.missing.length}</h3><ul class="pt-miss">${p.missing.map((m) => `<li><span class="pri ${m.priority}">${m.priority}</span><b>${esc(m.state)}</b><span>${esc(m.shows)}</span>${m.why ? `<em>${esc(m.why)}</em>` : ''}</li>`).join('')}</ul></div>` : '';
  const qs = sec.screens.filter((x) => !isApproved(x.id, SNAPSHOT)).flatMap((x) => (x.flags ?? []).map((f) => [x, f]));
  const questions = qs.length ? `<details class="pt-block pt-q"><summary><h3>Open questions · ${qs.length}</h3></summary><ul>${qs.map(([x, f]) => `<li><a href="#s-${x.id}">${esc(x.name)}</a> ${esc(f)}</li>`).join('')}</ul></details>` : '';
  const decide = (p.decisions ?? []).length ? `<div class="pt-block"><h3>To decide</h3><ul class="pt-dec">${p.decisions.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>` : '';
  return `<div class="pt-head"><div class="pt-stat"><span class="pp ok"><b>${ok}</b> of ${n} approved</span><span class="pp nr"><b>${n - ok}</b> to review</span>${(p.missing ?? []).length ? `<span class="pp wt"><b>${p.missing.length}</b> to draw</span>` : ''}</div>${journeys}${decide}${missing}${questions}</div>`;
}

const SECOF = Object.fromEntries(sections.flatMap((sec, i) => sec.screens.map((x) => [x.id, i])));
const PDATA = { secOf: SECOF, show: SHOW, screens: sections.flatMap((sec, i) => sec.screens.map((x) => [x.id, x.name, i])), sections: sections.map((x) => x.title), addressed: ADDRESSED, decided: DECIDED };
const needsLook = (id, v) => { const x = v[id]; const fix = ADDRESSED[id]; const picked = (SHOW[id] || []).some((c) => (v[c] || [])[0] === 'approved'); return !!fix && !picked && (!x || x[0] !== 'approved'); };
const flagged = all.filter((s) => (s.flags ?? []).length);
const openFlags = flagged.filter((x) => !isApproved(x.id, SNAPSHOT));

/*
 * The build plan (plan.mjs): each part, its state, and for a built part every screen as a pair —
 * the drawing, and the app's own screen photographed off the web export (`built/<id>-light|dark.webp`,
 * `scripts/ui-look.mjs`) — with its own review key, `built-<id>`.
 */
const img = (id, th) => {
  const f = join(here, 'built', `${id}-${th}.webp`);
  return existsSync(f) ? `<img class="bt-${th[0]}" alt="${th === 'light' ? 'Light' : 'Dark'}: the app as built" width="312" height="676" src="data:image/webp;base64,${readFileSync(f).toString('base64')}">` : '';
};
const STATE = { built: ['Built', 'ok'], next: ['Next', 're'], waiting: ['Waiting', 'nr'] };
const planPair = (id) => {
  const s = all.find((x) => x.id === id);
  return `<figure class="cell bt-pair" data-key="built-${id}" id="b-${id}">
    <div class="bt-two"><div><span class="bt-cap">Drawn</span><div class="pg-ph">${s.html}</div></div><div><span class="bt-cap">Built</span><div class="bt-shot">${img(id, 'light')}${img(id, 'dark')}</div></div></div>
    <figcaption><b>${esc(s.name)}</b><span class="pg-meta"><code>${esc(s.route)}</code> · ${NAV[s.nav] ?? s.nav}</span></figcaption>
    ${REVIEW ? reviewBlock(`built-${id}`, `${s.name}, as built`) : ''}</figure>`;
};
const planSection = () => `<section id="sec-plan"><h2>Building it</h2>
  <p>The new look is being written into the app in parts, in this order: what has the fewest open questions goes first. A built screen is shown beside its drawing — the right-hand phone is the app itself, photographed at 393 × 852 off its web build — and has its own Approve / Needs work. Plan as of ${esc(PLAN_DATE)}.</p>
  <ol class="bt-parts">${PARTS.map((p, i) => `<li class="bt-part"><div class="bt-h"><span class="pp ${STATE[p.state][1]}"><b>${i}</b> ${STATE[p.state][0]}</span><h3>${esc(p.title)}</h3></div><p>${esc(p.what)}</p>
    ${p.items ? `<ul class="bt-list">${p.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${p.notes ? `<ul class="bt-notes">${p.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${p.rows ? `<table class="bt-rows"><tbody>${p.rows.map(([n, r, q]) => `<tr><th>${esc(n)}</th><td><code>${esc(r)}</code></td><td>${esc(q || '—')}</td></tr>`).join('')}</tbody></table>` : ''}
    ${p.built ? `<div class="pg-grid bt-grid">${p.built.map(planPair).join('')}</div>` : ''}</li>`).join('')}</ol>
  <h3 class="bt-across">Across parts — to settle before the parts that wait on them</h3>
  <ul class="pg-open">${ACROSS.map(([k, t]) => `<li><b>${esc(k)}</b> — ${esc(t)}</li>`).join('')}</ul>
</section>`;

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
.pg-progress{background:var(--panel);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:14px;max-width:1100px}
#pp-body{display:flex;flex-direction:column;gap:18px}
.pp-row{display:flex;flex-wrap:wrap;gap:8px}
.pp{font:600 13px var(--body);padding:7px 12px;border-radius:999px;background:var(--bg);color:var(--muted)}.pp b{font:800 15px var(--head);color:var(--fg);margin-right:2px}
.pp.ok b{color:var(--ok)}.pp.re b{color:var(--accent)}.pp.wt b{color:var(--warn)}
.pp-block h3{font:700 14px var(--head);margin:0 0 6px}
.pp-block ul{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.pp-block li{font-size:13.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:2px 10px;align-items:baseline}
.pp-block a{color:var(--fg);font-weight:700;text-decoration:none}.pp-block a:hover{text-decoration:underline}
.pp-q{font-style:italic}.pp-a{flex-basis:100%;color:var(--fg);opacity:.8}
.pp-secs li{display:block}.pp-n{font:700 12px var(--body);background:var(--bg);border-radius:999px;padding:2px 8px;margin-left:4px}
.pp-ids{display:block;font-size:12.5px;margin-top:3px}.pp-ids a{font-weight:500;color:var(--muted)}
.pp-dec{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}.pp-dec b{color:var(--fg)}
.pp-live{font:500 12px var(--body);color:var(--muted)}
.upd-what{font-size:12.5px;line-height:1.4;color:var(--fg);background:var(--panel);border-radius:10px;padding:8px 10px;box-shadow:inset 3px 0 0 var(--accent)}
.upd-what b{display:block;font:700 11px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:2px}
.pg-none{font-style:italic}
.pg-zone{display:flex;flex-direction:column}
.pg-zone-h{font:800 30px/1.1 var(--head);letter-spacing:-.025em;margin:56px 0 4px;padding-top:18px;border-top:2px solid var(--fg)}
.pg-zone-p{margin:0;max-width:74ch;color:var(--muted)}
.pg-sec:not(:has(figure:not([hidden])))> *{display:none}.pg-sec:not(:has(figure:not([hidden]))){margin:0}
#zone-ok .pg-sec h2{font-size:19px}
.upd-noted{font:600 12px var(--body);color:var(--warn);padding:0 6px}
.upd[hidden],.pg-none[hidden]{display:none!important}
.pg-why>summary{cursor:pointer;font:600 12.5px var(--body);color:var(--muted);list-style:none}.pg-why>summary::before{content:"+ "}.pg-why[open]>summary::before{content:"− "}
.pt-head{display:flex;flex-direction:column;gap:12px;background:var(--panel);border-radius:16px;padding:16px;margin-bottom:6px}
.pt-stat{display:flex;gap:8px;flex-wrap:wrap}
.jr h3,.pt-block h3{font:700 14px var(--head);margin:0 0 8px;display:inline}
.jr ol{margin:6px 0 0;padding-left:22px;display:grid;gap:6px;font-size:13.5px}
.jr li b{font-weight:600;margin-right:8px}
.jr-ids{display:inline-flex;flex-wrap:wrap;gap:4px 6px;vertical-align:middle}
.jr-id{font:600 12px var(--body);padding:3px 8px;border-radius:999px;background:var(--bg);color:var(--fg);text-decoration:none;white-space:nowrap}.jr-id.ok{color:var(--ok)}.jr-id.ok::before{content:"✓ "}
.jr-id:hover{text-decoration:underline}
.jr-miss{display:inline-block;margin-left:6px;font:700 11.5px var(--body);padding:3px 8px;border-radius:999px;border:1.5px dashed var(--warn);color:var(--warn)}
.pt-miss,.pt-dec,.pt-q ul{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:8px;font-size:13.5px}
.pt-miss li{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:baseline}.pt-miss li>span:not(.pri),.pt-miss li>em{grid-column:2;color:var(--muted)}.pt-miss li>em{font-style:normal;font-size:12.5px}
.pri{font:800 11px var(--body);padding:2px 7px;border-radius:6px;background:var(--bg)}.pri.P1{color:var(--warn)}.pri.P2{color:var(--accent)}.pri.P3{color:var(--muted)}
.pt-dec li{padding-left:22px;position:relative}.pt-dec li::before{content:"☐";position:absolute;left:0;color:var(--muted)}
.pt-q>summary{cursor:pointer;list-style:none}.pt-q li{color:var(--muted)}.pt-q a{color:var(--fg);font-weight:700;text-decoration:none;margin-right:6px}

.pg-fold{margin-top:14px;background:var(--panel);border-radius:14px;padding:12px 16px}
.pg-fold>summary{cursor:pointer;font:700 16px var(--head)}
.pg-fold[open]>summary{margin-bottom:10px}
.pg-fold .pg-zone-p{margin-bottom:6px}
#sec-folded{margin-top:56px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.bt-parts{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.bt-part{background:var(--panel);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px}
.bt-part>p{margin:0;color:var(--muted);font-size:14px;max-width:80ch}
.bt-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.bt-h h3{font:800 19px/1.2 var(--head);margin:0}
.bt-list,.bt-notes{margin:0;padding-left:20px;font-size:13.5px;display:grid;gap:3px}.bt-notes{color:var(--muted)}
.bt-rows{border-collapse:collapse;font-size:13.5px;width:100%;max-width:1000px}
.bt-rows th{text-align:left;font-weight:700;padding:6px 12px 6px 0;vertical-align:top;width:30%}
.bt-rows td{padding:6px 12px 6px 0;color:var(--muted);vertical-align:top;border-top:1px solid var(--line)}.bt-rows th{border-top:1px solid var(--line)}
.bt-rows td:nth-child(2){width:22%}
.bt-grid{display:flex;flex-wrap:wrap;gap:28px 36px;margin-top:8px;justify-items:start}
.bt-pair{width:678px;max-width:100%;margin:0;display:flex;flex-direction:column;gap:10px}
.bt-two{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}.bt-two>div{display:flex;flex-direction:column;gap:6px}
.bt-cap{font:700 11px var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding-left:6px}
.bt-shot{width:330px;max-width:100%;line-height:0;padding:9px;border-radius:46px;background:#050506;box-shadow:0 0 0 1px #2a2a2e inset,0 24px 50px -24px rgba(0,0,0,.6);box-sizing:border-box}
.bt-shot img{width:312px;max-width:100%;height:auto;border-radius:37px}
.bt-shot .bt-d{display:none}#board.dark .bt-shot .bt-d{display:block}#board.dark .bt-shot .bt-l{display:none}
.bt-across{font:700 16px var(--head);margin:10px 0 0}
${CSS}
</style>
<main class="pg-wrap" id="board">
<header>
  <span class="pg-eyebrow">Design board · the review</span>
  <h1>What is left to review</h1>
  <p>Only the screens still waiting for your approval are open here, with the live count in the strip below. Approve one, or say what to change on it. Approved screens, the build plan and what was decided are folded away at the foot of the page.</p>
  <div class="pg-strip" role="group" aria-label="Board controls">
    <div class="pg-mode" role="group" aria-label="Phone theme"><button type="button" id="m-light" aria-pressed="true">Light</button><button type="button" id="m-dark" aria-pressed="false">Dark</button></div>
    <nav aria-label="Sections"><a href="#sec-updates">Last round</a><a href="#sec-progress">Where review stands</a><a href="#zone-review"><b>To review</b></a>${sections.map((s, i) => s.screens.some((x) => !isApproved(x.id, SNAPSHOT)) ? `<a href="#sec-${i}">${esc(s.title)}</a>` : '').join('')}${openFlags.length ? `<a href="#sec-open">Open questions</a>` : ''}<a href="#sec-folded">Folded away</a></nav>
    ${REVIEW ? `<div class="cnt" role="status"><span id="cA">0 approved</span><span id="cC">0 need work</span><span id="cO">to review</span></div><span id="rvnote" class="rvnote" hidden></span>` : ''}
  </div>
</header>

<section id="sec-updates"><h2>Updated in the last round</h2>
  <p>The screens I changed in the last round, always first. They stay here until the next round replaces them, whatever their verdict; each is also in its place below.</p>
  <div class="pg-grid" id="upd-grid">${all.filter((x) => ADDRESSED[x.id] && ADDRESSED[x.id][1] >= LATEST).map((x) => (SHOW[x.id] ? SHOW[x.id].map((id) => all.find((y) => y.id === id)).filter(Boolean).map((y, n) => cell(y, n === 0 ? ADDRESSED[x.id][0] : `For “${x.name}”: ${n + 1} of ${SHOW[x.id].length}.`).replace(`data-upd="${y.id}"`, `data-upd="${x.id}"`)) : [cell(x, ADDRESSED[x.id][0])]).join('')).join('')}</div>
</section>


<section id="sec-progress"><h2>Where review stands</h2><div class="pg-progress"><div id="pp-body">${renderProgress(PDATA, SNAPSHOT)}</div><span class="pp-live" id="pp-live">As of the last build. ${REVIEW ? 'Updates as you review.' : ''}</span></div></section>

${REVIEW ? `<section><figure class="cell pg-general" data-key="general"><figcaption><b>The look as a whole</b><span>Approve here if the system is right and only single screens need work, or leave a note that applies to all of them.</span></figcaption>${reviewBlock('general', 'the look as a whole', 3)}</figure></section>` : ''}

<div class="pg-zone" id="zone-review"><h2 class="pg-zone-h">To review</h2><p class="pg-zone-p">Every screen without your approval, in the app’s order. A screen you approve moves down to Approved once you are not typing.</p>
${sections.map((s, i) => `<section id="sec-${i}" class="pg-sec">
  <h2>${esc(s.title)}</h2>
  ${partHead(s, i)}
  <div class="pg-grid" data-zone="review" data-sec="${i}">${s.screens.filter((x) => !isApproved(x.id, SNAPSHOT)).map((x) => cell(x)).join('')}</div>
</section>`).join('\n')}
</div>
<section id="sec-folded"><h2>Folded away</h2><p>Kept on the board, closed. Open one to look.</p></section>
<details class="pg-fold"><summary>Approved screens</summary><div class="pg-zone" id="zone-ok"><p class="pg-zone-p">Screens you have approved, by section. A screen you approve lands here.</p>
${sections.map((s, i) => `<section id="sec-ok-${i}" class="pg-sec">
  <h2>${esc(s.title)}</h2>
  <div class="pg-grid" data-zone="ok" data-sec="${i}">${s.screens.filter((x) => isApproved(x.id, SNAPSHOT)).map((x) => cell(x)).join('')}</div>
</section>`).join('\n')}
</div></details>
<details class="pg-fold"><summary>Building it: the approved screens going into the app</summary>${planSection()}</details>
<details class="pg-fold"><summary>Decided along the way</summary><ul class="pg-open">${DECIDED.map(([k, t]) => `<li><b style="color:var(--fg)">${esc(k)}</b> ${esc(t)}</li>`).join('')}</ul></details>

${openFlags.length ? `<section id="sec-open">
  <h2>Open questions</h2>
  <p>Only for screens still to review: places where a redraw decided something the app or the handoffs do not say, or a word not yet in the app. Each links to its screen.</p>
  <ul class="pg-open">${openFlags.flatMap((s) => s.flags.map((f) => `<li><a href="#s-${s.id}">${esc(s.name)}</a> — ${esc(f)}</li>`)).join('')}</ul>
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
${REVIEW ? `<script>
(() => {
  const D = ${JSON.stringify(PDATA)};
  const V = ${JSON.stringify(SNAPSHOT)};
  const render = ${renderProgress.toString()};
  const body = document.getElementById('pp-body'), live = document.getElementById('pp-live');
  (async () => {
    let db = null; try { db = await window.claude?.use?.('db'); } catch (e) {}
    if (!db) return;
    /*
     * Nothing moves under the reviewer's hands (owner, 23 November: a card jumped from "to review"
     * as soon as a comment began, before it was finished). So:
     *   - a card in "Updated since your last look" leaves ONLY when it is approved; a note, however
     *     new, keeps it where it is, marked "Your note is with Claude";
     *   - nothing is re-laid out while a comment box has the focus: the panel and the cards wait,
     *     and catch up when the typing stops (the box loses focus);
     *   - a card the reviewer is working in never hides, even if approved from another window.
     */
    const typing = () => document.activeElement && document.activeElement.tagName === 'TEXTAREA';
    let pending = false;
    const apply = () => {
      if (typing()) { pending = true; return; }
      pending = false;
      body.innerHTML = render(D, V);
      document.querySelectorAll('[data-upd]').forEach((el) => {
        const id = el.dataset.upd, x = V[id] || [], fix = D.addressed[id];
        const noted = x[0] === 'changes' && fix && x[2] > fix[1];
        let tag = el.querySelector('.upd-noted');
        if (noted && !tag) { tag = document.createElement('div'); tag.className = 'upd-noted'; tag.textContent = 'Your note is with Claude'; el.querySelector('.upd-what')?.after(tag); }
        if (!noted && tag) tag.remove();
      });
      /* Move each original screen to the zone its verdict puts it in, back into its place in the app's order. */
      document.querySelectorAll('figure.scr-cell:not(.upd)').forEach((el) => {
        if (el.contains(document.activeElement)) return;
        const ok = (V[el.dataset.key] || [])[0] === 'approved';
        const grid = document.querySelector('.pg-grid[data-zone="' + (ok ? 'ok' : 'review') + '"][data-sec="' + D.secOf[el.dataset.key] + '"]');
        if (!grid || el.parentElement === grid) return;
        const n = +el.dataset.order;
        const after = [...grid.children].find((c) => +c.dataset.order > n);
        grid.insertBefore(el, after || null);
      });
      live.textContent = 'Live: updates as you review.';
    };
    document.addEventListener('focusout', () => setTimeout(() => { if (pending) apply(); }, 0));
    db.collection('reviews').onSnapshot((snap) => {
      for (const ch of snap.docChanges()) {
        const x = ch.doc.data() || {};
        if (ch.type === 'removed') delete V[ch.doc.id];
        else V[ch.doc.id] = [x.status || '', x.comment || '', x.updatedAt || ''];
      }
      apply();
    }, () => { live.textContent = 'Live updates stopped. Reload the page to reconnect.'; });
  })();
})();
</script>` : ''}
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

if (galleryAt) {
  const gcell = (x) => `<figure class="g-cell${x.wide ? ' wide' : ''}" id="g-${x.id}"><div class="g-ph">${x.html}</div><figcaption>${esc(x.name)}</figcaption></figure>`;
  const g = `<title>Poker Club Design</title>
<link rel="stylesheet" href="${FONTS}">
<style>
:root{--bg:#F4F5F7;--fg:#141A2A;--muted:#596171;--line:#DDE1E7;--head:'Libre Franklin',system-ui,sans-serif;--body:'Inter',system-ui,sans-serif}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#10131A;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#10131A;--fg:#ECEEF2;--muted:#A0A7B4;--line:#2A303C;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:400 15px/1.5 var(--body);margin:0}
.g-wrap{max-width:1500px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-left,0px)) 64px}
.g-wrap>header h1{font:800 clamp(28px,4vw,40px)/1.05 var(--head);letter-spacing:-.025em;margin:0 0 6px}
.g-wrap>header p{margin:0;color:var(--muted)}
.g-strip{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;background:var(--fg);color:var(--bg);border-radius:14px;padding:10px 14px;margin-top:16px}
.g-strip nav{display:flex;gap:4px 12px;flex-wrap:wrap}.g-strip a{font:600 12.5px var(--body);color:inherit;opacity:.85;text-decoration:none}.g-strip a:hover{opacity:1;text-decoration:underline}
.g-mode{display:inline-flex;background:rgba(127,127,127,.28);border-radius:999px;padding:3px}.g-mode button{font:700 12.5px var(--body);color:inherit;background:none;border:0;border-radius:999px;padding:6px 12px;cursor:pointer}.g-mode button[aria-pressed="true"]{background:var(--bg);color:var(--fg)}
.g-wrap>section{margin-top:44px;scroll-margin-top:80px}.g-wrap>section>h2{font:800 24px/1.15 var(--head);margin:0 0 4px}.g-wrap>section>p{margin:0 0 14px;color:var(--muted)}
.g-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:24px 18px;justify-items:center}
.g-cell{margin:0;width:330px;max-width:100%;display:flex;flex-direction:column;gap:8px}.g-cell.wide{width:678px;grid-column:span 2}@media (max-width:760px){.g-cell.wide{width:330px;grid-column:auto}}
.g-ph{line-height:0}.g-cell figcaption{font:600 13.5px var(--head);padding:0 8px;color:var(--fg)}
${CSS}
</style>
<main class="g-wrap" id="board">
<header><h1>The Poker Club · the design</h1><p>Every screen of the app in the approved look, by part of the app and in the order a person meets them. ${all.length} phones. Use the switch for dark.</p>
<div class="g-strip"><div class="g-mode" role="group" aria-label="Phone theme"><button type="button" id="m-light" aria-pressed="true">Light</button><button type="button" id="m-dark" aria-pressed="false">Dark</button></div><nav aria-label="Parts">${sections.map((x, i) => `<a href="#g-sec-${i}">${esc(x.title)}</a>`).join('')}</nav></div></header>
${sections.map((x, i) => `<section id="g-sec-${i}"><h2>${esc(x.title)}</h2>${x.part.galleryBlurb ? `<p>${esc(x.part.galleryBlurb)}</p>` : ''}<div class="g-grid">${x.screens.map(gcell).join('')}</div></section>`).join('\n')}
</main>
<script>
(() => {
  const board = document.getElementById('board'), L = document.getElementById('m-light'), D = document.getElementById('m-dark');
  const set = (dark) => { board.classList.toggle('dark', dark); L.setAttribute('aria-pressed', String(!dark)); D.setAttribute('aria-pressed', String(dark)); try { localStorage.setItem('fb-mode', dark ? 'dark' : 'light'); } catch (e) {} };
  L.addEventListener('click', () => set(false)); D.addEventListener('click', () => set(true));
  document.querySelectorAll('.fb .modal').forEach((m) => { if (m.offsetTop < 84) m.closest('.scr').classList.add('cover'); });
  let saved = null; try { saved = localStorage.getItem('fb-mode'); } catch (e) {}
  if (saved === 'dark') set(true);
})();
</script>`;
  writeFileSync(galleryAt, g);
  console.log('wrote', galleryAt, (g.length / 1024).toFixed(0) + ' KB');
}
