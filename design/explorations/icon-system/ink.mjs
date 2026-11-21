/**
 * Measures each spot's INK: the share of its 88 x 88 window that it actually
 * paints, shadow left out (freshDeckFlat). A box measures a spread-out group and
 * a single chip alike; ink measures how much of the object the eye takes in, so
 * it is what the sizing rule (fresh-deck.mjs, sizeFor) holds constant.
 * Writes ink.json. Needs Playwright.
 *
 *   node design/explorations/icon-system/ink.mjs
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { SPOTS, spot } from './art.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const keys = Object.keys(SPOTS);
const b = await chromium.launch();
const p = await b.newPage();
const out = {};
for (const k of keys) {
  const svg = spot(k, 'freshDeckFlat', { size: 176, small: false }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  out[k] = await p.evaluate(async (svg) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const c = document.createElement('canvas'); c.width = 176; c.height = 176;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 176, 176);
    const d = g.getImageData(0, 0, 176, 176).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 127) n++;
    return +(n / (176 * 176)).toFixed(4);
  }, svg);
}
await b.close();
writeFileSync(new URL('./ink.json', import.meta.url), JSON.stringify(out));
console.log(keys.length, 'measured');
