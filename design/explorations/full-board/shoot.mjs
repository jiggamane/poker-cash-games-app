/**
 * Photograph drawn phones off the built board (`index.html`), light and dark,
 * for the build plan's drawn-against-built pairs.
 *
 *   node design/explorations/full-board/shoot.mjs out-dir id [id …]
 *
 * Writes `<id>-light.png` and `<id>-dark.png`, each one phone at 2×.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { launchOptions } from '../../../scripts/chromium.mjs';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const [out, ...ids] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(join(here, 'index.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(1500);
for (const dark of [false, true]) {
  await page.evaluate((d) => document.getElementById('board').classList.toggle('dark', d), dark);
  for (const id of ids) {
    const el = page.locator(`#s-${id} .pg-ph .fb`).first();
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: join(out, `${id}-${dark ? 'dark' : 'light'}.png`) });
  }
}
await browser.close();
console.log(`${ids.length * 2} phones → ${out}`);
