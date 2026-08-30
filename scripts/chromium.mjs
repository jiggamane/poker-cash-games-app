/*
 * Find a Chromium, the same way in every tool that drives one.
 *
 * `ui-check.mjs` grew this first and the two GATE passes never got it, which
 * is a version of the fault `docs/bugs.md` keeps recording: a check that only
 * runs where somebody has already set the machine up is a check that does not
 * run. `npm run check:ui` is the merge gate, so it has to start on a box whose
 * browsers live wherever that box keeps them.
 *
 * PLAYWRIGHT_CHROMIUM wins if it is set. Otherwise, if the machine keeps its
 * browsers somewhere central (PLAYWRIGHT_BROWSERS_PATH, which the sandboxes
 * set), look for the binary there — the directory is versioned, so the path
 * cannot be written down. Failing both, let Playwright find its own, which is
 * what `undefined` means to `launch()`.
 */

import fs from 'node:fs';
import path from 'node:path';

export function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;

  const store = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!store || !fs.existsSync(store)) return undefined;

  const candidates = fs
    .readdirSync(store)
    .filter((d) => d.startsWith('chromium-'))
    .sort()
    .reverse()
    .map((d) => path.join(store, d, 'chrome-linux', 'chrome'));

  return candidates.find((c) => fs.existsSync(c));
}

/** What to hand `chromium.launch()`, with nothing in it when there is nothing to say. */
export function launchOptions(extra = {}) {
  const executablePath = chromiumPath();
  return executablePath === undefined ? extra : { ...extra, executablePath };
}
