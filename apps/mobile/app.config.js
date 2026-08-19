/*
 * app.json is the config. This file exists for exactly one thing on top of it.
 *
 * The browser preview (docs/phone-preview.md) is served from a SUBDIRECTORY —
 * https://<user>.github.io/<repo>/app/ — and `expo export` writes every asset
 * URL absolute from the domain root: /_expo/…, /assets/…, /favicon.ico. Served
 * one folder down, all of them 404 and the page stays blank. `experiments
 * .baseUrl` is Expo's answer: it prefixes them at bundle time.
 *
 * It must NOT be set for anything else. `npm run ui` serves the same export at
 * the root, where a prefix breaks it exactly as its absence breaks Pages, and
 * on iOS and Android it means nothing at all. So it comes from the environment
 * and is absent unless a build asks for it — the phone app and the ui-check
 * loop are bit-for-bit what they were before this file existed.
 */
module.exports = ({ config }) => {
  const base = process.env.WEB_BASE_URL;
  if (!base) return config;

  return {
    ...config,
    experiments: { ...config.experiments, baseUrl: base },
  };
};
