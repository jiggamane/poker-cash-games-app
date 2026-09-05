/**
 * Generates the stage artboards of the game-outcomes journey map.
 *
 * Each stage is one .dc.html artboard: the phone at ship size (393 x 852, dark
 * theme, real tokens off apps/mobile/src/design/tokens.ts) beside a column that
 * says what the engine handed the screen, what the screen prints, and where the
 * same figure is printed somewhere else. The generator exists so the chrome --
 * frame, back button, title, footer -- is written once rather than eleven times
 * and cannot drift between artboards.
 *
 * Figures are the seeded canonical night, read off the engine itself
 * (rev15-night.test.ts's fixture through settle()), never typed by hand.
 */
export const F = "-apple-system, 'SF Pro Text', 'Figtree', sans-serif";

export const T = {
  ground: '#0A0A0B', surface: '#16161A', text: '#FFFFFF', muted: '#8B8D93',
  hairline: 'rgba(255,255,255,0.11)', win: '#6FCF97', loss: '#F0705C',
  offTable: '#D9D3C4', amber: '#E8B455', dim: '#7F8187', strip: '#1E1E22',
  dashed: 'rgba(255,255,255,0.26)', roundFill: 'rgba(255,255,255,0.09)',
  winStrong: 'rgba(111,207,151,0.45)', winEdge: 'rgba(111,207,151,0.35)',
  winWash: 'rgba(111,207,151,0.13)',
  dangerWash: 'rgba(240,112,92,0.12)', dangerEdge: 'rgba(240,112,92,0.35)',
  dangerStrong: 'rgba(240,112,92,0.55)', dangerTrack: 'rgba(240,112,92,0.28)',
  previewRule: 'rgba(255,255,255,0.13)', track: 'rgba(255,255,255,0.16)',
  sheet: '#101013', grabber: 'rgba(255,255,255,0.22)', onFill: '#0C0D0F',
  quietOutline: 'rgba(255,255,255,0.28)', outline: 'rgba(255,255,255,0.55)',
  offTableWash: 'rgba(217,211,196,0.09)', winTint: 'rgba(111,207,151,0.14)',
  drawerFill: 'rgba(255,255,255,0.07)',
};

export const money = (n) => (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US');
export const signed = (n) => (n < 0 ? '−$' : '+$') + Math.abs(n).toLocaleString('en-US');
export const col = (n) => (n > 0 ? T.win : n < 0 ? T.loss : T.muted);

/* ---- phone chrome ------------------------------------------------------- */

/** Chrome A, a pushed screen: round back button, and nothing top-right but text. */
export const pushHead = (title, { meta, step, lede } = {}) => `
      <div style="display: flex; align-items: center; gap: 12px; padding: 18px 22px 4px">
        <div style="width: 38px; height: 38px; border-radius: 19px; background: ${T.roundFill}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5 2 7.5l5.5 6" stroke="${T.text}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div style="font: 800 32px/1.05 ${F}; letter-spacing: -.96px; color: ${T.text}; flex-grow: 1; min-width: 0">${title}</div>
        ${step ? `<div style="font: 600 14px ${F}; color: ${T.muted}; flex-shrink: 0">${step}</div>` : ''}
      </div>
      ${meta ? `<div style="padding: 0 22px 14px 68px; font: 500 13px ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums">${meta}</div>` : ''}
      ${lede ? `<div style="padding: 6px 22px 16px; font: 400 14.5px/1.5 ${F}; color: ${T.muted}; text-wrap: pretty">${lede}</div>` : ''}`;

/** Chrome B, a sheet: grabber and a close, dismissed rather than left. */
export const sheetHead = (title, sub) => `
      <div style="display: flex; flex-direction: column; align-items: center; padding: 10px 0 4px">
        <div style="width: 38px; height: 5px; border-radius: 3px; background: ${T.grabber}"></div>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px 22px 4px">
        <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
          <div style="font: 800 30px/1.05 ${F}; letter-spacing: -.9px; color: ${T.text}">${title}</div>
          ${sub ? `<div style="font: 500 13px ${F}; color: ${T.muted}">${sub}</div>` : ''}
        </div>
        <div style="width: 30px; height: 30px; border-radius: 15px; background: ${T.roundFill}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M10 1l-9 9" stroke="${T.text}" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
      </div>`;

export const sectionLabel = (s, pad = '0 26px 6px') =>
  `<div style="padding: ${pad}; font: 700 12px ${F}; letter-spacing: 1.2px; text-transform: uppercase; color: ${T.muted}">${s}</div>`;

export const groupLabel = (s, n) =>
  `<div style="padding: 16px 26px 7px; font: 700 12px ${F}; letter-spacing: 1.2px; text-transform: uppercase; color: ${T.muted}">${s} · ${n}</div>`;

/** A row for somebody still playing: name, a fact under it, something at the right. */
export const activeRow = (name, fact, right, last) => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 4px; margin: 0 22px; ${last ? '' : `border-bottom: 1px solid ${T.hairline};`}">
          <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
            <div style="font: 700 17px ${F}; color: ${T.text}">${name}</div>
            <div style="font: 400 12px ${F}; color: ${T.muted}; font-variant-numeric: tabular-nums">${fact}</div>
          </div>
          ${right}
        </div>`;

/** A finished player: the treatment that says the figure beside them is final. */
export const slab = (name, fact, result, lead = '') => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin: 0 22px 6px; border-radius: 8px; background: ${T.drawerFill}">
          ${lead}
          <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
            <div style="font: 700 17px ${F}; color: ${T.muted}">${name}</div>
            <div style="font: 400 12px ${F}; color: ${T.dim}; font-variant-numeric: tabular-nums">${fact}</div>
          </div>
          <div style="font: 700 19px ${F}; color: ${col(result)}; font-variant-numeric: tabular-nums; flex-shrink: 0">${signed(result)}</div>
        </div>`;

/** The step the night settles at. Drawn on four surfaces; settable on one. */
export const roundingBar = (right, chevron = true) => `
      <div style="display: flex; align-items: center; gap: 10px; margin: 12px 22px 0; height: 45px; border-top: 1px solid ${T.hairline}; border-bottom: 1px solid ${T.hairline}">
        <div style="font: 600 15px ${F}; color: ${T.text}; flex-grow: 1">Rounding · off</div>
        <div style="font: 600 14px ${F}; color: ${T.offTable}; font-variant-numeric: tabular-nums">${right}</div>
        ${chevron ? `<svg width="8" height="13" viewBox="0 0 8 13" fill="none" style="flex-shrink: 0"><path d="M1 1l5.5 5.5L1 12" stroke="${T.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
      </div>`;

export const button = (label, variant) => {
  const base = `display: flex; align-items: center; justify-content: center; height: 52px; border-radius: 12px; font: 700 16px ${F}; flex-grow: 1; box-sizing: border-box`;
  if (variant === 'primary') return `<div style="${base}; background: ${T.text}; color: ${T.onFill}">${label}</div>`;
  if (variant === 'blocked') return `<div style="${base}; background: ${T.drawerFill}; color: ${T.dim}">${label}</div>`;
  return `<div style="${base}; border: 2px solid ${T.outline}; color: ${T.text}">${label}</div>`;
};

export const chip = (label) =>
  `<div style="align-self: center; padding: 9px 14px; border-radius: 999px; border: 1.5px solid ${T.quietOutline}; font: 600 12.5px ${F}; color: ${T.text}">${label}</div>`;

/** Everything below the fold pushes down; the footer sits on the safe area. */
export const spacer = `      <div style="flex-grow: 1"></div>`;
export const footer = (inner) =>
  `      <div style="display: flex; gap: 14px; padding: 14px 20px 6px">${inner}</div>`;

/* ---- the notes column --------------------------------------------------- */

const FLAG = {
  engine: ['rgba(10,122,61,.1)', '#0A5C31'],
  dup: ['rgba(138,90,0,.12)', '#8A5A00'],
  drop: ['rgba(176,58,40,.11)', '#B03A28'],
  keep: ['rgba(12,13,15,.06)', '#6B6F76'],
};

const note = ({ kind, title, body }) => {
  const [bg, fg] = FLAG[kind];
  return `
      <div style="display: flex; flex-direction: column; gap: 5px; padding: 11px 13px; border-radius: 9px; background: ${bg}">
        <div style="font: 700 9.5px ${F}; letter-spacing: .11em; text-transform: uppercase; color: ${fg}">${title}</div>
        <div style="font: 400 12px/1.55 ${F}; color: #3F4149; text-wrap: pretty">${body}</div>
      </div>`;
};

const notesColumn = (s) => `
    <div style="width: 356px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px">

      <div style="display: flex; flex-direction: column; gap: 7px">
        <div style="display: flex; align-items: center; gap: 9px">
          <div style="width: 26px; height: 26px; border-radius: 13px; background: #0B0B0F; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font: 800 12px ${F}; flex-shrink: 0">${s.n}</div>
          <div style="font: 800 19px ${F}; color: #0B0B0F; letter-spacing: -.02em">${s.name}</div>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap">
          <span style="padding: 3px 7px; border-radius: 4px; background: rgba(12,13,15,.06); font: 600 10px ${F}; color: #4A4D55">${s.route}</span>
          <span style="padding: 3px 7px; border-radius: 4px; background: rgba(12,13,15,.06); font: 600 10px ${F}; color: #4A4D55">${s.chrome}</span>
          ${s.spec ? `<span style="padding: 3px 7px; border-radius: 4px; background: rgba(12,13,15,.06); font: 600 10px ${F}; color: #4A4D55">${s.spec}</span>` : ''}
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; padding: 13px 14px; border-radius: 11px; background: #FFFFFF; border: 1px solid rgba(12,13,15,.08)">
        <div style="font: 700 9.5px ${F}; letter-spacing: .13em; text-transform: uppercase; color: #8E8E93">What the engine hands it</div>
        <div style="font: 600 12.5px/1.55 ${F}; color: #0B0B0F">${s.engine}</div>
        <div style="height: 1px; background: rgba(12,13,15,.09)"></div>
        <div style="font: 700 9.5px ${F}; letter-spacing: .13em; text-transform: uppercase; color: #8E8E93">What it puts on screen</div>
        <div style="font: 400 12.5px/1.6 ${F}; color: #3F4149; text-wrap: pretty">${s.prints}</div>
      </div>

      ${s.notes.map(note).join('')}

    </div>`;

/* ---- one artboard ------------------------------------------------------- */

export function artboard(s) {
  return `<!doctype html>
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
    body { margin: 0; background: #F6F6F8; font-family: ${F}; }
    a { color: #0B0B0F; } a:hover { color: #4A4D55; }
  </style>
</helmet>

<div style="width: ${s.w}px; height: ${s.h}px; box-sizing: border-box; padding: 28px 30px; background: #F6F6F8; display: flex; gap: 26px; align-items: flex-start">

  <div style="width: 393px; height: 852px; flex-shrink: 0; border-radius: 46px; background: ${T.ground}; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 18px 44px rgba(11,11,15,.18)">
    <div style="height: 59px; flex-shrink: 0"></div>
${s.body}
    <div style="height: 34px; flex-shrink: 0"></div>
  </div>

${notesColumn(s)}

</div>
</x-dc>
</body>
</html>
`;
}
