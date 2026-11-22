/**
 * This round: options for the notes that asked for them (owner, 22 November).
 *   invite-qr        "let's try some themed QR code types if available. if not then the square one"
 *   new-night-seated "maybe we should make the names' shapes with slight shadow or something else to help fit the new UI"
 * Every QR here is real and scans: the app's own encoder (`qrcode`, as `apps/mobile/src/lib/qr.ts` uses
 * it) over the app's own link for a code (`pokerclub://claim?c=…`, `inviteLinkFor`). Only the drawing
 * of the modules changes. A QR stays dark on white in both themes: a camera needs the contrast.
 */
import { createRequire } from 'node:module';
import { sheet, bar, label, card, row, quiet, ico } from '../kit.mjs';
import opening from './30-opening-a-game.mjs';
import tonight from './10-home-tonight.mjs';

const qrcode = createRequire(import.meta.url)('qrcode/lib/core/qrcode.js');
const LINK = 'pokerclub://claim?c=K7M-4XP';
const matrix = (level) => {
  const m = qrcode.create(LINK, { errorCorrectionLevel: level }).modules;
  return Array.from({ length: m.size }, (_, r) => Array.from({ length: m.size }, (_, c) => !!m.get(r, c)));
};
const INK = '#141A2A', RED = '#C8283A';
const isFinder = (n, r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

/**
 * One QR, drawn. style: 'square' | 'dots' | 'rounded'. `hole` clears a centre square of that many modules
 * for a mark (only with level H, which survives about 30% of the code being covered).
 */
function qrSvg(m, { style = 'square', hole = 0, eye = 'square', px = 184, mark = '' } = {}) {
  const n = m.length, q = 2, size = n + q * 2, mid = n / 2;
  const inHole = (r, c) => hole && Math.abs(r + 0.5 - mid) < hole / 2 && Math.abs(c + 0.5 - mid) < hole / 2;
  let out = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!m[r][c] || isFinder(n, r, c) || inHole(r, c)) continue;
    const x = c + q, y = r + q;
    if (style === 'dots') out += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.43" fill="${INK}"/>`;
    else if (style === 'rounded') out += `<rect x="${x + 0.06}" y="${y + 0.06}" width="0.88" height="0.88" rx="0.32" fill="${INK}"/>`;
    else out += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${INK}"/>`;
  }
  const eyeAt = (x, y) => eye === 'round'
    ? `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="2" fill="none" stroke="${INK}" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="1" fill="${INK}"/>`
    : eye === 'suit'
      ? `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.6" fill="none" stroke="${INK}" stroke-width="1"/><circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${RED}"/>`
      : `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" fill="none" stroke="${INK}" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${INK}"/>`;
  out += eyeAt(q, q) + eyeAt(q + n - 7, q) + eyeAt(q, q + n - 7);
  return `<svg width="${px}" height="${px}" viewBox="0 0 ${size} ${size}" style="display:block;background:#fff;border-radius:12px" shape-rendering="${style === 'square' ? 'crispEdges' : 'geometricPrecision'}" aria-label="QR code for the invite">${out}${mark}</svg>`;
}
/** The club's mark at the centre of a level-H code: a red chip with a spade, as on Signing you in. */
const chipMark = (m) => {
  const n = m.length, c = n / 2 + 2;
  return `<circle cx="${c}" cy="${c}" r="3.6" fill="#fff"/><circle cx="${c}" cy="${c}" r="3.1" fill="${RED}"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${c - 0.45}" y="${c - 3.1}" width="0.9" height="1.1" fill="#fff" transform="rotate(${i * 60} ${c} ${c})"/>`).join('')}<circle cx="${c}" cy="${c}" r="1.75" fill="#fff"/><path transform="translate(${c - 1.1} ${c - 1.15}) scale(.092)" d="M12 2.5s-7.8 5.6-7.8 10.6a4 4 0 0 0 6.6 3.1L9.3 21.5h5.4l-1.5-5.3a4 4 0 0 0 6.6-3.1C19.8 8.1 12 2.5 12 2.5z" fill="${INK}"/>`;
};
const M = matrix('M'), H = matrix('H');

/** The QR sheet, with only the code's picture changed. `framed` sets the code on a playing card. */
const qrSheet = (pic) => sheet({ behind: 'Players', title: 'Scan to join', sub: 'Ivo · The Thursday game', stepBack: true,
  body: [
    `<div style="display:grid;place-items:center;padding:2px 0">${pic}</div>`,
    `<div class="num" style="font-weight:700;font-size:17px;letter-spacing:.08em;text-align:center">K7M-4XP</div>`,
    `<p class="note" style="text-align:center">If the camera will not read it, the code can be typed.</p>`,
    quiet('Back to the invite'),
    `<div style="height:6px"></div>`,
  ] });
const onCard = (svg) => `<div style="position:relative;width:206px;padding:30px 11px;border-radius:16px;background:#fff;box-shadow:0 0 0 1px rgba(20,26,42,.08),0 10px 24px -12px rgba(20,26,42,.45)">
  <span style="position:absolute;left:9px;top:6px;display:grid;justify-items:center;font:800 12px/1 'Libre Franklin',sans-serif;color:${INK}">K<svg width="10" height="10" viewBox="0 0 24 24"><path d="M12 2.5s-7.8 5.6-7.8 10.6a4 4 0 0 0 6.6 3.1L9.3 21.5h5.4l-1.5-5.3a4 4 0 0 0 6.6-3.1C19.8 8.1 12 2.5 12 2.5z" fill="${INK}"/></svg></span>
  <span style="position:absolute;right:9px;bottom:6px;display:grid;justify-items:center;font:800 12px/1 'Libre Franklin',sans-serif;color:${INK};transform:rotate(180deg)">K<svg width="10" height="10" viewBox="0 0 24 24"><path d="M12 2.5s-7.8 5.6-7.8 10.6a4 4 0 0 0 6.6 3.1L9.3 21.5h5.4l-1.5-5.3a4 4 0 0 0 6.6-3.1C19.8 8.1 12 2.5 12 2.5z" fill="${INK}"/></svg></span>${svg}</div>`;

/* Name chips, three ways, on New session and on Who's playing. Scoped so each option touches only its own phones. */
const CHIP = {
  a: '',
  b: `.fb .chip:not(.on):not(.dash){box-shadow:0 0 0 1px rgba(20,26,42,.06),0 1px 2px rgba(20,26,42,.08),0 5px 10px -7px rgba(20,26,42,.3);background:var(--card)}
.dark .fb .chip:not(.on):not(.dash){box-shadow:none;background:var(--card)}`,
  c: `.fb .chip:not(.on):not(.dash){box-shadow:0 0 0 1px rgba(20,26,42,.06),0 1px 2px rgba(20,26,42,.08),0 5px 10px -7px rgba(20,26,42,.3);background:var(--card);border-radius:12px}
.dark .fb .chip:not(.on):not(.dash){box-shadow:none;background:var(--card)}
.fb .chip:not(.on):not(.dash) .muted{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--pri);color:var(--onpri)}`,
  d: `.fb .chip:not(.on):not(.dash){box-shadow:none;background:var(--raised)}`,
};
const byO = Object.fromEntries(opening.map((s) => [s.id, s.html]));
const byT = Object.fromEntries(tonight.map((s) => [s.id, s.html]));
const chipPair = (k) => `<style>.ch-${k} ${CHIP[k].replace(/\n/g, ` .ch-${k} `).replace(/^\.dark/, '.dark')}</style>`.replace(/\.ch-\w+ \.dark \.fb/g, (m) => m) ;
const scoped = (k) => CHIP[k].split('\n').map((line) => line.startsWith('.dark') ? line.replace('.dark .fb', `.dark .ch-${k} .fb`) : `.ch-${k} ${line}`).join('\n');
const chipOption = (k) => `<style>${scoped(k)}</style><div class="ch-${k}" style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center">${byO['new-night-seated']}${byT['pick']}</div>`;

export const section = { title: 'This round: QR codes and name chips',
  blurb: 'Options for two of your notes; the others are applied on their screens below. Every QR here is real and scans to the invite’s link. Approve one of each.' };

export default [
  { id: 'qr-square', route: '/invite', name: 'QR A · square', nav: 'sheet', note: 'The plain square code, as the app draws it today (error correction M).', html: qrSheet(qrSvg(M, { px: 188 })) },
  { id: 'qr-dots', route: '/invite', name: 'QR B · dots, round eyes', nav: 'sheet', note: 'Every module a dot, the three corner eyes rounded. Softer, still plain ink on white.', html: qrSheet(qrSvg(M, { style: 'dots', eye: 'round', px: 188 })) },
  { id: 'qr-chip', route: '/invite', name: 'QR C · the club’s chip at the centre', nav: 'sheet',
    note: 'Rounded modules with the red chip and spade in the middle. The centre mark needs the strongest error correction (H), which makes the pattern denser.',
    flags: ['Needs error correction H in qr.ts (it is M today) so the code still reads with its centre covered.'], html: qrSheet(qrSvg(H, { style: 'rounded', eye: 'round', hole: 9, px: 188, mark: chipMark(H) })) },
  { id: 'qr-card', route: '/invite', name: 'QR D · on a playing card', nav: 'sheet',
    note: 'The code set on a white card with a king of spades in two corners. The most themed of the four; it reads as an invitation to the table.',
    flags: ['Red pips in the three eyes, and dots at this size, were both tried and did not scan; the eyes stay ink and the modules rounded squares.'], html: qrSheet(onCard(qrSvg(M, { style: 'rounded', eye: 'round', px: 184 }))) },

  { id: 'chips-a', route: '/new-night', name: 'Name chips A · as drawn', nav: 'sheet', wide: true, note: 'Outlined pills, as every screen has them now. Shown on New session and on Who’s playing.', html: chipOption('a') },
  { id: 'chips-b', route: '/new-night', name: 'Name chips B · lifted like the cards', nav: 'sheet', wide: true,
    note: 'No outline: each name is a small white card on the same soft shadow as the cards, so the chips belong to the new look. In dark, one step lighter than the sheet, as the cards are.', html: chipOption('b') },
  { id: 'chips-c', route: '/new-night', name: 'Name chips C · lifted, with a round add', nav: 'sheet', wide: true,
    note: 'As B, squarer to match the cards, and the plus set in a small ink circle so each one reads as a button that adds.', html: chipOption('c') },
  { id: 'chips-d', route: '/new-night', name: 'Name chips D · a soft fill', nav: 'sheet', wide: true,
    note: 'No outline and no shadow: a light grey fill. Flattest of the three; it brings back a little grey under content.', html: chipOption('d') },
];
