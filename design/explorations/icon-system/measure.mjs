/**
 * Measures each spot's drawn outline (its bounding box in the 96 box, shadow
 * included) so a placement can anchor the object rather than the square it is
 * drawn in. Writes bboxes.json beside this file. Needs Playwright.
 *
 *   node design/explorations/icon-system/measure.mjs
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { SPOTS, PALETTES } from './art.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const keys = Object.keys(SPOTS);
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="960" height="960">${keys.map((k) => `<g id="${k}" style="display:none">${SPOTS[k].draw(PALETTES.freshDeck, { small: false })}</g>`).join('')}</svg>`);
const out = await p.evaluate((keys) => Object.fromEntries(keys.map((k) => {
  const g = document.getElementById(k); g.style.display = ''; const r = g.getBBox(); g.style.display = 'none';
  return [k, [r.x, r.y, r.width, r.height].map((n) => +n.toFixed(1))];
})), keys);
await b.close();
writeFileSync(new URL('./bboxes.json', import.meta.url), JSON.stringify(out, null, 0));
console.log(Object.keys(out).length, 'measured');
