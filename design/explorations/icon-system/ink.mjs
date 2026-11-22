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
    let n = 0, tone = 0, x0 = 176, y0 = 176, x1 = -1, y1 = -1;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] <= 127) continue;
      n++;
      /* A dark pixel weighs more than a pale one: white card stock counts .6, ink 1. */
      const L = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      tone += 0.6 + 0.4 * (1 - L);
      const px = (i / 4) % 176, py = Math.floor(i / 4 / 176);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    const A = 176 * 176;
    return { ink: +(n / A).toFixed(4), tone: +(tone / A).toFixed(4), box: +(((x1 - x0 + 1) * (y1 - y0 + 1)) / A).toFixed(4) };
  }, svg);
}
await b.close();
writeFileSync(new URL('./ink.json', import.meta.url), JSON.stringify(Object.fromEntries(keys.map((k) => [k, out[k].ink]))));
/* optical.json: what the eye takes as an object's size is between what it paints
   (weighted by how dark) and the outline it occupies. sizeFor holds their
   geometric mean constant. */
writeFileSync(new URL('./optical.json', import.meta.url), JSON.stringify(Object.fromEntries(keys.map((k) => [k, +Math.sqrt(out[k].tone * out[k].box).toFixed(4)]))));
console.log(keys.length, 'measured');
