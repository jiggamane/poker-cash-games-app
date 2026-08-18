/*
 * Serve the exported web build for `ui-check` to drive.
 *
 * `expo export` writes a single-page build: one index.html and a bundle. A
 * plain file server 404s on /session, because there is no such file — the
 * route only exists once the bundle boots and the router reads the URL. So
 * anything that is not a real file falls through to index.html.
 *
 * A dependency-free stand-in for `npx serve -s`, which is one more download
 * and one more thing to be offline.
 *
 *   node scripts/ui-serve.mjs [dir] [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'apps/mobile/.web');
const port = Number(process.argv[3] ?? process.env.UI_CHECK_PORT ?? 4321);

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(
    `no build at ${root}\n\n` +
      '  npm --workspace @poker-club/mobile run export:web\n',
  );
  process.exit(1);
}

const TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, url);

  // Never serve outside the build, whatever the URL claims.
  if (!file.startsWith(root)) file = path.join(root, 'index.html');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(root, 'index.html');
  }

  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`ui-serve: ${root} → http://127.0.0.1:${port}`);
});
