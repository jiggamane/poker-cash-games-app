/**
 * Tonight, the whole screen, once per treatment of the tools button — round 31.
 *
 *   node design/explorations/icon-system/tonight-buttons.mjs   (needs Playwright)
 *
 * The owner asked to see the tools-button options "on the full app screen".
 * Tonight exists only as the round-two style page's phone, so this does what
 * ../updated-screens/build.mjs does to it — renders the page, moves the head
 * onto the approved rail, swaps in the app's own small icons — and then, per
 * option, restyles the one round on the role line. Writes tonight-buttons.html,
 * a fragment build.mjs sets into the board inside a shadow root, so the style
 * page's stylesheet cannot touch the board around it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { railN } from './fresh-deck.mjs';
import APP from './app-icons.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');

/* [key, letter, name, round style, glyph colour] — the same six as round 30. */
export const TB = [
  ['tb-grey', 'A', 'grey fill', 'background:#EEF0F3;box-shadow:none', '#141A2A'],
  ['tb-ring', 'B', 'a hairline ring', 'background:#fff;box-shadow:inset 0 0 0 1.5px #E4E7EC', '#141A2A'],
  ['tb-raised', 'C', 'white, raised', 'background:#fff;box-shadow:0 1px 2px rgba(20,26,42,.14),0 4px 10px -4px rgba(20,26,42,.22)', '#141A2A'],
  ['tb-ink', 'D', 'ink', 'background:#141A2A;box-shadow:none', '#FFFFFF'],
  ['tb-tint', 'E', 'a faint ink tint', 'background:rgba(20,26,42,.06);box-shadow:none', '#141A2A'],
  ['tb-bare', 'F', 'no round', 'background:none;box-shadow:none', '#141A2A'],
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(join(here, '../updated-screens/sources/style-round-two.html')).href);
const lifted = await page.evaluate((APP) => {
  for (const pad of document.querySelectorAll('#d2 .phone .scr > .pad')) {
    const head = [...pad.children].filter((c) => c.matches('.hdr, .role, .hero, .meta-l, .sub'));
    if (!head.length || !pad.querySelector('.hdr')) continue;
    const rail = document.createElement('div'); rail.className = 'railp';
    pad.insertBefore(rail, head[0]); head.forEach((c) => rail.appendChild(c));
  }
  const MAP = { tools: 'questionCard', receipt: 'receipt', cutlery: 'food', piggy: 'piggy' };
  for (const svg of document.querySelectorAll('#d2 .phone svg.ri')) {
    const name = MAP[svg.querySelector('use')?.getAttribute('href')?.replace('#r-', '')];
    if (!name) continue;
    const size = Math.round(parseFloat(getComputedStyle(svg).width) * 0.86);
    const span = document.createElement('span');
    span.className = 'appico'; span.innerHTML = APP[name];
    span.firstElementChild.setAttribute('width', size); span.firstElementChild.setAttribute('height', size);
    svg.replaceWith(span);
  }
  return {
    css: [...document.querySelectorAll('style')].map((s) => s.textContent).filter((t) => !t.startsWith(':root{color-scheme:light;box-sizing')).join('\n'),
    sprite: [...document.querySelectorAll('svg')].filter((s) => s.querySelector('symbol')).map((s) => s.outerHTML).join(''),
    night: document.querySelector('#d2 .strip figure .phone').outerHTML,
  };
}, APP);
await browser.close();

/* One copy of Tonight per option: the role line's round restyled, nothing else touched. */
const phones = TB.map(([key, letter, name, style, ink]) => {
  const html = lifted.night.replace(/(<div class="role">[\s\S]*?<span class="rb")([^>]*)>/, (_, a) => `${a} style="${style}">`)
    .replace(/(<div class="role">[\s\S]*?<span class="appico")/, `$1 style="color:${ink}"`);
  return `<figure><div class="tbwrap">${html}</div><figcaption><b>${letter} · ${name}</b>${key === 'tb-ink' ? ' · you leaned to this one' : key === 'tb-ring' ? ' · my pick in round 30' : ''}</figcaption></figure>`;
});

const scoped = (css) => css.replace(/:root/g, ':host').replace(/(^|\})\s*body\s*\{/g, '$1:host{');
const out = `<div class="us-shadow"><template shadowrootmode="open"><style>${scoped(lifted.css)}
:host{display:block;background:none!important;color:inherit}
.tbstrip{display:flex;gap:22px;overflow-x:auto;padding:6px 2px 18px}
.tbstrip figure{margin:0;flex:none;display:flex;flex-direction:column;gap:10px}
.tbstrip figcaption{font:500 13px/1.3 'Inter',system-ui,sans-serif;color:#596171;padding-left:6px}.tbstrip figcaption b{color:#141A2A}
${railN('.d-d2')}
.appico{display:inline-flex;flex:none;line-height:0}.terms .appico,.dl .appico{color:var(--p-muted)}.terms .appico{vertical-align:-2px;margin-right:2px}
</style>${lifted.sprite}<div class="tbstrip names-only">${phones.map((p) => p.replace('<div class="tbwrap">', '<div class="tbwrap d-d2" style="display:contents">').replace('class="phone d-d2"', 'class="phone d-d2"')).join('')}</div></template></div>`;

writeFileSync(join(here, 'tonight-buttons.html'), out);
console.log('wrote tonight-buttons.html', (out.length / 1024).toFixed(0) + ' KB');
