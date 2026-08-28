/*
 * app.json is the config. This file exists for the two things that must NOT be
 * in it, because each one is right for one way of running the app and wrong for
 * every other way. Both come from the environment and are absent unless a
 * command asks for them, so the ordinary loop — `npm start`, scan the QR code —
 * is bit-for-bit what it was before this file existed.
 *
 * 1 · WEB_BASE_URL — the browser preview (docs/phone-preview.md) is served from
 * a SUBDIRECTORY — https://<user>.github.io/<repo>/app/ — and `expo export`
 * writes every asset URL absolute from the domain root: /_expo/…, /assets/…,
 * /favicon.ico. Served one folder down, all of them 404 and the page stays
 * blank. `experiments.baseUrl` is Expo's answer: it prefixes them at bundle
 * time. It must NOT be set for anything else. `npm run ui` serves the same
 * export at the root, where a prefix breaks it exactly as its absence breaks
 * Pages, and on iOS and Android it means nothing at all.
 *
 * 2 · EAS_PROJECT — the three lines app.json describes and deliberately does
 * not carry: the EAS project id, `updates.url`, and `runtimeVersion`. See the
 * long comment below; the short version is that each one breaks something, and
 * WHICH one it breaks depends on how the app is being opened.
 */

/** The project on expo.dev. The same id in both places, always. */
const EAS_PROJECT_ID = '938b4629-9a41-4ddf-bcd8-86bb4e4696b3';

/*
 * THE THREE LINES, AND WHY THEY ARE A SWITCH RATHER THAN A SETTING.
 *
 * `extra.eas.projectId` names the project on expo.dev. Publishing anything
 * needs it. But Expo Go asks a project with an id who you are, so a phone
 * scanning the dev-server QR code is made to log in before it can look at a
 * screen — for nothing, because a dev server does not care.
 *
 * `updates.url` is where a built app fetches its JavaScript from. Harmless on a
 * dev server, which never asks.
 *
 * `runtimeVersion` is the one that cannot be shared. It says which native build
 * a bundle is allowed to land on. Expo Go is a single fixed native build that
 * identifies itself as `exposdk:54.0.0` and opens ONLY updates stamped exactly
 * that, so an update stamped `0.1.0` is, correctly, not for it — and it is
 * turned away in silence. A standalone build is the exact opposite: without a
 * runtime version, JavaScript expecting newer native code can land on an older
 * build and crash it.
 *
 * Note what this is NOT: an argument for leaving `go` without one. `eas update`
 * treats a missing runtime version as an oversight and supplies the standalone
 * answer itself. Omitting it does not publish an unstamped update, it publishes
 * a wrongly stamped one.
 *
 * So there are two answers and no third:
 *
 *   EAS_PROJECT=go     id + updates.url, runtimeVersion `exposdk:54.0.0`.
 *                      `eas update` then publishes something Expo Go can open
 *                      from a link, with no dev server and no laptop — which is
 *                      the only way to put this app on an iPhone that is not a
 *                      paid Apple Developer account. docs/live-test.md.
 *
 *   EAS_PROJECT=build  all three, runtimeVersion tied to the app version.
 *                      For `eas build` — a real installed app. An update
 *                      published this way is invisible to Expo Go, deliberately.
 *
 * Unset — the everyday case — is none of them, and the QR-code loop is intact.
 */
const EAS_MODES = ['go', 'build'];

module.exports = ({ config }) => {
  let out = config;

  const base = process.env.WEB_BASE_URL;
  if (base) {
    out = { ...out, experiments: { ...out.experiments, baseUrl: base } };
  }

  const mode = process.env.EAS_PROJECT;
  if (mode === undefined || mode === '') return out;

  // A typo here would otherwise publish a perfectly valid update that the phone
  // it was made for silently cannot see.
  if (!EAS_MODES.includes(mode)) {
    throw new Error(
      `EAS_PROJECT is "${mode}". It has to be "go" (publish something Expo Go can open) ` +
        `or "build" (a standalone EAS build). See the comment in app.config.js.`,
    );
  }

  out = {
    ...out,
    extra: { ...out.extra, eas: { projectId: EAS_PROJECT_ID } },
    updates: { ...out.updates, url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  };

  /*
   * BOTH modes must state a runtime version, and they must state DIFFERENT ones.
   *
   * Leaving `go` without one does not mean the update goes out without one. It
   * means `eas update` fills the gap itself: it runs its own configure step,
   * writes `{"policy":"appVersion"}` into app.json on whatever machine is
   * publishing, and stamps the update `0.1.0`. Run #4 on 28 August is that
   * exact story — green workflow, real update, and an update Expo Go will not
   * open, because Expo Go is one fixed native build that calls itself
   * `exposdk:54.0.0` and takes only updates stamped to match. The refusal is
   * silent, which is what makes this worth six lines of comment.
   *
   * So `go` says `exposdk:54.0.0` and gets opened; `build` says the app version
   * and keeps JavaScript off native code too old for it.
   *
   * The literal, not `{ policy: 'sdkVersion' }` which derives the same string:
   * that policy has been deprecated once already, and this is the one value in
   * this file that must never quietly stop resolving. It is pinned to the SDK
   * — apps/mobile/AGENTS.md says the SDK moves only with Expo Go in the App
   * Store, and this line moves in the same commit or the publish breaks.
   */
  out =
    mode === 'build'
      ? { ...out, runtimeVersion: { policy: 'appVersion' } }
      : { ...out, runtimeVersion: `exposdk:${out.sdkVersion ?? '54.0.0'}` };

  return out;
};
