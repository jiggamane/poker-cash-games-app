/**
 * The icons the app draws today, as SVG: `app-icons.json`, one string per name
 * in `apps/mobile/src/components/Icon.tsx`, for the board to show beside what
 * is proposed in their place.
 *
 *   node design/explorations/icon-system/app-icons.mjs
 *
 * Nothing is redrawn or copied by hand. The real component is bundled with
 * `react-native-svg` swapped for the plain SVG elements of the same names, and
 * rendered once per name at the size the component itself defaults to, in
 * `currentColor`. So a glyph here is the glyph on the phone, path for path.
 * Re-run it whenever `Icon.tsx` changes.
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const src = join(here, '../../../apps/mobile/src/components/Icon.tsx');
/* Beside this file, so that `react` resolves from the repository's own node_modules; removed afterwards. */
const out = join(here, '.app-icons.tmp.mjs');

const stub = `import { createElement as h } from 'react';
const el = (tag) => (props) => h(tag, props);
export const Svg = (p) => h('svg', { xmlns: 'http://www.w3.org/2000/svg', ...p });
export const Path = el('path'), Circle = el('circle'), Rect = el('rect'), G = el('g'), Line = el('line'), Ellipse = el('ellipse');`;

await esbuild.build({
  entryPoints: [src], bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error',
  external: ['react', 'react/jsx-runtime'],
  plugins: [{ name: 'svg-stub', setup(b) {
    b.onResolve({ filter: /^react-native-svg$/ }, () => ({ path: 'svg-stub', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: stub, loader: 'js', resolveDir: here }));
  } }],
});
const { Icon } = await import(pathToFileURL(out).href);
rmSync(out);
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

/* Every `case` in the component's switch: the union above it lists a few names on one line. */
const names = [...new Set([...readFileSync(src, 'utf8').matchAll(/^\s*case '(\w+)':/gm)].map((m) => m[1]))];
const icons = Object.fromEntries(names.map((n) => [n, renderToStaticMarkup(createElement(Icon, { name: n, color: 'currentColor' }))]));
writeFileSync(join(here, 'app-icons.json'), JSON.stringify(icons, null, 0));
console.log(names.length, 'icons');
