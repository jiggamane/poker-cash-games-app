/**
 * Photograph drawn phones, light and dark, for the drawn-against-built pairs.
 *
 * Reads the GALLERY page (`build.mjs --gallery`), built fresh into a temp file
 * each run: every phone open, no folds and no review furniture. The working
 * board folds parts behind <details>, so a phone there may not be visible.
 *
 *   node design/explorations/full-board/shoot.mjs out-dir id [id …]
 *
 * Writes `<id>-light.png` and `<id>-dark.png`, each one phone at 2×.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { launchOptions } from '../../../scripts/chromium.mjs';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const [out, ...ids] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const gallery = join(mkdtempSync(join(tmpdir(), 'fb-shoot-')), 'gallery.html');
execFileSync(process.execPath, [join(here, 'build.mjs'), '--gallery', gallery], { stdio: 'ignore' });
await page.goto(pathToFileURL(gallery).href, { waitUntil: 'load' });
await page.waitForTimeout(1500);
for (const dark of [false, true]) {
  await page.evaluate((d) => document.getElementById('board').classList.toggle('dark', d), dark);
  for (const id of ids) {
    const el = page.locator(`#g-${id} .g-ph .fb`).first();
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: join(out, `${id}-${dark ? 'dark' : 'light'}.png`) });
  }
}
await browser.close();
console.log(`${ids.length * 2} phones → ${out}`);
