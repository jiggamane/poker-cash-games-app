/*
 * Assemble everything this repository publishes into one folder, `_site`.
 *
 *   _site/index.html, before.html, night.html, after.html   the design boards
 *   _site/app/                                              the app, in a browser
 *
 * The boards keep the URLs they already have — docs/ lands at the site root,
 * exactly where GitHub Pages' branch mode put it, so every link anyone has been
 * given still resolves. The app goes one folder down, at /app/.
 *
 * Run the export first; this script only arranges what is already built:
 *
 *   WEB_BASE_URL=/<repo>/app npm --workspace @poker-club/mobile run export:web
 *   node scripts/site-build.mjs /<repo>/app
 *
 * The base URL is passed twice on purpose. The export bakes it into every asset
 * path; this script asserts that it did, because the failure it prevents — a
 * build exported for the root and served one folder down — is a white screen
 * with nothing in it saying why.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] ?? process.env.WEB_BASE_URL ?? '').replace(/\/$/, '');
const site = path.join(repo, '_site');
const build = path.join(repo, 'apps/mobile/.web');

if (!fs.existsSync(path.join(build, 'index.html'))) {
  console.error(
    `no web export at ${build}\n\n` +
      `  WEB_BASE_URL=${base || '/<repo>/app'} npm --workspace @poker-club/mobile run export:web\n`,
  );
  process.exit(1);
}

fs.rmSync(site, { recursive: true, force: true });
fs.mkdirSync(site, { recursive: true });

// The boards, at the root, untouched. .nojekyll comes with them — it is what
// tells Pages to serve the files through instead of running them past Jekyll,
// which would drop anything starting with an underscore. The app's bundle
// lives in _expo/, so without it the app is a white screen too.
fs.cpSync(path.join(repo, 'docs'), site, { recursive: true });
fs.writeFileSync(path.join(site, '.nojekyll'), '');

fs.cpSync(build, path.join(site, 'app'), { recursive: true });

const indexPath = path.join(site, 'app/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

if (base && !html.includes(`${base}/_expo/`)) {
  console.error(
    `the export was not built for ${base} — its bundle is still at an absolute path.\n` +
      'Export again with WEB_BASE_URL set; see apps/mobile/app.config.js.\n',
  );
  process.exit(1);
}

/*
 * Two additions, for the phone this is being read on.
 *
 * `viewport-fit=cover` puts the page under the notch and the home indicator,
 * so the safe-area insets the screens are drawn against are the real ones.
 * The rest is what makes "Add to Home Screen" open the app without a browser
 * bar — the only way to see Chrome A and Chrome B at the size they were drawn.
 *
 * theme-color in both schemes, from the design tokens: without it a phone
 * paints the bar white and the dark screens end below a white strip.
 */
const META = `
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
    <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0A0A0B" media="(prefers-color-scheme: dark)" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="The Poker Club" />
`;

html = html.replace(/\n\s*<meta name="viewport"[^>]*>/, '');
html = html.replace('</head>', `${META}  </head>`);
fs.writeFileSync(indexPath, html);

/*
 * The export is a single page: one index.html, and the router reads the URL
 * once the bundle boots. A static host has no /app/session to serve, so a
 * reload anywhere but the root 404s. Pages serves 404.html for those, so a
 * copy of the app IS the fallback — the same trick scripts/ui-serve.mjs plays
 * locally.
 */
fs.copyFileSync(indexPath, path.join(site, 'app/404.html'));

const count = fs.readdirSync(path.join(site, 'app')).length;
console.log(`_site: boards at /, app at /app/ (${count} files), base ${base || '(root)'}`);
