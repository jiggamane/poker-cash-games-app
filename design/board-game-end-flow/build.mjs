/**
 * Generates the artboards of the game-end-flow board.
 *
 * Every phone on this board is a PHOTOGRAPH of the built app, not a redrawing
 * of it: `scripts/ui-shots.mjs` plays the canonical night through the web
 * export at 393 x 852 and writes the PNGs that sit beside this file. So the
 * board cannot drift from the app the way a hand-drawn frame can — it is the
 * app, on the commit it was cut from, with a column beside it saying what the
 * screen owns, which cut governs it and what carries to the next screen.
 *
 * The canvas vocabulary — light ground, 393-wide phone at 46 radius, a 356
 * notes column of white cards and flagged notes — is the one
 * `design/cjm-game-outcomes/build.mjs` established, so the two read as one set.
 *
 *   node flow.mjs        # rewrites every .dc.html here
 */
export const F = "-apple-system, 'SF Pro Text', 'Figtree', sans-serif";

/* The canvas, not the app. App colours only appear inside the screenshots. */
export const C = {
  ground: '#F6F6F8', ink: '#0B0B0F', body: '#3F4149', muted: '#6C6C70',
  faint: '#8E8E93', card: '#FFFFFF', edge: 'rgba(12,13,15,.08)',
  rule: 'rgba(12,13,15,.09)', chipBg: 'rgba(12,13,15,.06)', chipFg: '#4A4D55',
};

export const PHONE_W = 393;
export const PHONE_H = 852;

/* ---- the phone ---------------------------------------------------------- */

/**
 * One screenshot in a phone frame, with the state it was caught in under it.
 * `scale` shrinks the frame for the overview strip; the caption stays legible.
 */
export const phone = (src, { state, scale = 1 } = {}) => {
  const w = Math.round(PHONE_W * scale);
  const h = Math.round(PHONE_H * scale);
  return `
    <div style="display: flex; flex-direction: column; gap: 9px; flex-shrink: 0; width: ${w}px">
      <img src="${src}" width="${w}" height="${h}" alt="" style="display: block; width: ${w}px; height: ${h}px; border-radius: ${Math.round(46 * scale)}px; box-shadow: 0 18px 44px rgba(11,11,15,.18)">
      ${state ? `<div style="font: 500 12px/1.45 ${F}; color: ${C.muted}; text-wrap: pretty">${state}</div>` : ''}
    </div>`;
};

/* ---- the notes column --------------------------------------------------- */

const FLAG = {
  /* Where the screen came from: the cut that governs it. */
  cut: ['rgba(10,122,61,.1)', '#0A5C31'],
  /* What carries out of this screen into the next one. */
  carries: ['rgba(12,13,15,.06)', '#4A4D55'],
  /* A deliberate deviation from the cut, recorded in docs/screens.md. */
  deviates: ['rgba(138,90,0,.12)', '#8A5A00'],
  /* Something wrong, or something nobody has drawn. */
  open: ['rgba(176,58,40,.11)', '#B03A28'],
};

export const note = ({ kind, title, body }) => {
  const [bg, fg] = FLAG[kind];
  return `
      <div style="display: flex; flex-direction: column; gap: 5px; padding: 11px 13px; border-radius: 9px; background: ${bg}">
        <div style="font: 700 9.5px ${F}; letter-spacing: .11em; text-transform: uppercase; color: ${fg}">${title}</div>
        <div style="font: 400 12px/1.55 ${F}; color: ${C.body}; text-wrap: pretty">${body}</div>
      </div>`;
};

export const tag = (s) =>
  `<span style="padding: 3px 7px; border-radius: 4px; background: ${C.chipBg}; font: 600 10px ${F}; color: ${C.chipFg}">${s}</span>`;

const notesColumn = (s) => `
    <div style="width: 356px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px">

      <div style="display: flex; flex-direction: column; gap: 7px">
        <div style="display: flex; align-items: center; gap: 9px">
          <div style="width: 26px; height: 26px; border-radius: 13px; background: ${C.ink}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font: 800 12px ${F}; flex-shrink: 0">${s.n}</div>
          <div style="font: 800 19px ${F}; color: ${C.ink}; letter-spacing: -.02em">${s.name}</div>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap">
          ${[s.route, s.chrome, s.step].filter(Boolean).map(tag).join('')}
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; padding: 13px 14px; border-radius: 11px; background: ${C.card}; border: 1px solid ${C.edge}">
        <div style="font: 700 9.5px ${F}; letter-spacing: .13em; text-transform: uppercase; color: ${C.faint}">What this screen owns</div>
        <div style="font: 600 12.5px/1.55 ${F}; color: ${C.ink}; text-wrap: pretty">${s.owns}</div>
        <div style="height: 1px; background: ${C.rule}"></div>
        <div style="font: 700 9.5px ${F}; letter-spacing: .13em; text-transform: uppercase; color: ${C.faint}">The way out</div>
        <div style="font: 400 12.5px/1.6 ${F}; color: ${C.body}; text-wrap: pretty">${s.exit}</div>
      </div>

      ${s.notes.map(note).join('')}

    </div>`;

/* ---- one artboard ------------------------------------------------------- */

export const shell = (w, h, inner, gap = 26) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; background: ${C.ground}; font-family: ${F}; }
    a { color: ${C.ink}; } a:hover { color: ${C.chipFg}; }
  </style>
</helmet>

<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; padding: 28px 30px; background: ${C.ground}; display: flex; gap: ${gap}px; align-items: flex-start">
${inner}
</div>
</x-dc>
</body>
</html>
`;

/** A stop on the flow: one or more photographs, and the column that reads them. */
export function artboard(s) {
  const phones = s.shots.map((p) => phone(p.src, { state: p.state })).join('');
  const w = 60 + s.shots.length * PHONE_W + (s.shots.length - 1) * 22 + 26 + 356;
  return shell(
    w,
    970,
    `  <div style="display: flex; gap: 22px; align-items: flex-start; flex-shrink: 0">${phones}
  </div>

${notesColumn(s)}`,
  );
}
