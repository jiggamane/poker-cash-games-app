/*
 * Photograph routes of the built app for the full board's build plan, light
 * and dark, at 393 × 852 — the phone every board is drawn at.
 *
 *   node scripts/ui-serve.mjs apps/mobile/.web 4321 &
 *   node scripts/ui-look.mjs out-dir /route[@key] [/route[@key] …]
 *
 * Each shot is `<key>-light.png` and `<key>-dark.png`; the key defaults to the
 * route's name. A route may carry a query (`/rule?kind=…@rule-edit`). It
 * measures nothing; the checks are `ui-audit.mjs` and `ui-journeys.mjs`. This
 * is the picture put beside the drawing for the owner to compare.
 *
 * A sheet is photographed over the screen it opens from by getting there the
 * way a person does: `/session>Bill@bill` opens /session and taps the text
 * "Bill"; each `>` is one more tap, on an element with exactly that
 * text — the last one, which is the one on top. A bare route opened as a sheet has nothing behind its scrim.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launchOptions } from './chromium.mjs';

const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');

const BASE = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:4321';
const [out, ...targets] = process.argv.slice(2);
if (!out || targets.length === 0) {
  console.error('usage: node scripts/ui-look.mjs out-dir /route[@key] …');
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch(launchOptions());
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage();
  for (const target of targets) {
    const [spec, key0] = target.split('@');
    const [route, ...taps] = spec.split('>');
    const key = key0 ?? (route.replace(/^\//, '').replace(/[?&=].*$/, '') || 'home');
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    for (const tap of taps) {
      await page.getByText(tap, { exact: true }).last().click();
      await page.waitForTimeout(900);
    }
    const file = path.join(out, `${key}-${scheme}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
