/*
 * WHICH BUILD THIS IS, as two environment variables for the bundler to inline.
 *
 *   node scripts/build-stamp.mjs
 *   EXPO_PUBLIC_BUILD_COMMIT=51f04af EXPO_PUBLIC_BUILD_AT=2026-09-08T17:07:50Z
 *
 * Printed as one line on purpose: the npm scripts in `apps/mobile/package.json`
 * put it in front of the command with `env $(…)`, so one file decides the stamp
 * for the dev server, the web export and the Expo Go publish alike.
 *
 * WHY THIS EXISTS. An update was published on 8 September, the workflow was
 * green, the commit was right, and the phone went on drawing the previous
 * screen. Nothing could tell a stale bundle from a bad publish: the phone said
 * nothing about which build it was running, and the repository could only say
 * what it had sent. Expo Go fetches an update on a cold start and applies it on
 * the NEXT one, so a phone one launch behind is behaving exactly as designed and
 * looks exactly like a phone that got a broken publish.
 *
 * ⚠ EXPO_PUBLIC_ AND NOT `extra` IN app.config.js, which is the obvious place
 * and the wrong one. `expo export --platform web` embeds app.json — the STATIC
 * config — so a value added by the dynamic config reaches a phone and is null in
 * the browser preview and in every UI check. That is exactly the half nobody can
 * look at while they are wondering which build they are looking at. Metro
 * inlines EXPO_PUBLIC_ on every platform, which is the same mechanism the
 * Supabase keys already ride on (see `.github/workflows/expo-go.yml`).
 *
 * ⚠ AND NOT `expo-updates`. `Updates.updateId` is the other obvious answer: in
 * Expo Go the native side belongs to Expo Go, the package is inert, and the
 * field would be null precisely when a host needs it. A string substituted at
 * bundle time cannot be null and cannot be stale — if the line is old, so is
 * everything around it, which is the whole question being asked.
 *
 * `GITHUB_SHA` when the workflow publishes; `git` when a person does; `unknown`
 * on a checkout with neither, where Settings says so rather than inventing a
 * commit.
 */

import { execFileSync } from 'node:child_process';

const short = () => {
  const fromCI = process.env.GITHUB_SHA;
  if (fromCI !== undefined && fromCI !== '') return fromCI.slice(0, 7);
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
};

/*
 * SECONDS, NOT MILLISECONDS, and no colons past the time: this string goes
 * through a shell as one word, so anything needing a quote would need the npm
 * script to quote it, and an npm script inside a JSON string is two levels of
 * escaping deep already. `2026-09-08T17:07:50Z` has no shell metacharacters.
 */
const at = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

process.stdout.write(`EXPO_PUBLIC_BUILD_COMMIT=${short()} EXPO_PUBLIC_BUILD_AT=${at}\n`);
