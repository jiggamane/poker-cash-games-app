/**
 * A real QR code for the board, drawn square, as the app draws it (C3d). The owner chose the plain
 * square style on 22 November over dots, a centre mark and a playing-card frame; those four options
 * are in git history (`screens/05-this-round.mjs`, before it was removed).
 *
 * The matrix comes from the app's own encoder (`qrcode`, the module `apps/mobile/src/lib/qr.ts`
 * wraps) at the app's error correction (M), over the app's own link for a code (`inviteLinkFor`,
 * `pokerclub://claim?c=…`). It stays dark on white in both themes: a camera needs the contrast.
 */
import { createRequire } from 'node:module';

const qrcode = createRequire(import.meta.url)('qrcode/lib/core/qrcode.js');
const INK = '#141A2A';

export const inviteLink = (code) => `pokerclub://claim?c=${code}`;

export function qrSvg(text, px = 188) {
  const m = qrcode.create(text, { errorCorrectionLevel: 'M' }).modules;
  const n = m.size, q = 2, size = n + q * 2;
  let out = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (m.get(r, c)) out += `<rect x="${c + q}" y="${r + q}" width="1.02" height="1.02"/>`;
  }
  return `<svg width="${px}" height="${px}" viewBox="0 0 ${size} ${size}" style="display:block;background:#fff;border-radius:12px" shape-rendering="crispEdges" aria-label="QR code for the invite"><g fill="${INK}">${out}</g></svg>`;
}
