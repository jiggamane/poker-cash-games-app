/**
 * Render one screens file to a PNG, light above dark, to check it before the board is built.
 *   node design/explorations/full-board/preview.mjs screens/<file>.mjs <out.png> [id ...]
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { CSS, FONTS } from './kit.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [, , file, out, ...ids] = process.argv;
let screens = (await import(pathToFileURL(resolve(file)).href)).default;
if (ids.length) screens = screens.filter((s) => ids.includes(s.id));
const strip = (cls) => `<div class="${cls}" style="display:flex;gap:18px;padding:14px;background:${cls ? '#10131A' : '#F4F5F7'}">${screens.map((s) => `<figure style="margin:0"><div>${s.html}</div><figcaption style="font:600 12px Inter,sans-serif;color:#8a90a0;padding:6px">${s.id} · ${s.nav}</figcaption></figure>`).join('')}</div>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 400 } });
await p.setContent(`<link rel="stylesheet" href="${FONTS}"><style>body{margin:0;width:max-content}${CSS}</style>${strip('')}${strip('dark')}`);
await p.waitForTimeout(900);
const allow = new Set(screens.filter((s) => s.allowOverflow).map((s) => s.id));
const over = (await p.evaluate(() => [...document.querySelectorAll('.fb')].flatMap((fb, i) => [...fb.querySelectorAll('.body,.mbody')].filter((e) => e.scrollHeight > e.clientHeight + 2).map((e) => `${fb.closest('figure').querySelector('figcaption').textContent}: content overflows by ${e.scrollHeight - e.clientHeight}px`)))).filter((o) => !allow.has(o.split(' · ')[0]));
[...new Set(over)].forEach((o) => console.log('OVERFLOW', o));
await p.screenshot({ path: out, fullPage: true }); await b.close();
console.log('wrote', out, screens.length, 'screens');
