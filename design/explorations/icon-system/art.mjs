/**
 * The spot illustrations, as code.
 *
 * Every drawing on the board is built from the primitives below, which is the
 * design system in the only form that cannot drift: one projection (K), one
 * palette per theme, one chip, one card. A new spot is a composition of these,
 * never a new freehand shape with its own idea of perspective or colour.
 *
 * Each spot draws on a 96 × 96 box with the ground at y = 84. Output is plain
 * SVG with flat fills and no gradients, so a spot ports to react-native-svg as
 * it stands (the board's `text` elements become paths when it does).
 */

/** The projection: a circle lying on the table reads as an ellipse this flat. */
export const K = 0.34;
/** The ground line every object stands on. */
export const GROUND = 84;

export const PALETTES = {
  light: {
    ink: { side: '#1B1F2B', top: '#232837', inlay: '#555B6E', core: '#1A1E29', mark: '#EEEAE1' },
    red: { side: '#B3343A', top: '#C33F45', inlay: '#E7898B', core: '#AD3036', mark: '#F4EFE6' },
    bone: { side: '#DCD6CA', top: '#F2EEE6', inlay: '#C8C0B0', core: '#ECE7DD', mark: '#232837' },
    stock: '#F7F4EE',
    stockEdge: '#D8D2C5',
    seam: 'rgba(8,10,16,.38)',
    shadow: 'rgba(27,30,40,.14)',
    fire: '#F2A23A',
    fireCore: '#FFD889',
    fireOuter: '#D9483B',
    fuse: '#CFC6B4',
  },
  dark: {
    /* Ink lifts so it separates from a dark ground; nothing else moves. */
    ink: { side: '#2C3244', top: '#363D52', inlay: '#6A7289', core: '#2A3041', mark: '#EEEAE1' },
    red: { side: '#B83A40', top: '#C9464C', inlay: '#EC9497', core: '#B1353B', mark: '#F4EFE6' },
    bone: { side: '#D3CCBE', top: '#EEEAE1', inlay: '#C2B9A8', core: '#E6E1D6', mark: '#232837' },
    stock: '#F2EEE6',
    stockEdge: '#C9C2B4',
    seam: 'rgba(0,0,0,.45)',
    shadow: 'rgba(0,0,0,.42)',
    fire: '#F4A944',
    fireCore: '#FFDC94',
    fireOuter: '#E0544A',
    fuse: '#BDB4A2',
  },
};

const f = (n) => +n.toFixed(2);
const rad = (d) => (d * Math.PI) / 180;

/* ── chips ─────────────────────────────────────────────────────────────── */

function ellPt(cx, cy, rx, ry, t) {
  return [f(cx + rx * Math.cos(t)), f(cy + ry * Math.sin(t))];
}

/** Eight inserts round the edge, each as wide as the gap: the signature. */
function edgeInserts(cx, yTop, yBot, r, color, phase) {
  const ry = r * K;
  const half = rad(11.25);
  let out = '';
  for (let i = 0; i < 8; i++) {
    const c = rad(phase + i * 45);
    for (const k of [-2, 0, 2]) {
      let a = c - half + k * Math.PI;
      let b = c + half + k * Math.PI;
      a = Math.max(a, 0);
      b = Math.min(b, Math.PI);
      if (b - a < 0.02) continue;
      const [x1, y1] = ellPt(cx, yTop, r, ry, a);
      const [x2, y2] = ellPt(cx, yTop, r, ry, b);
      const [x3, y3] = ellPt(cx, yBot, r, ry, b);
      const [x4, y4] = ellPt(cx, yBot, r, ry, a);
      out += `<path d="M${x1} ${y1}A${f(r)} ${f(ry)} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${f(r)} ${f(ry)} 0 0 0 ${x4} ${y4}Z" fill="${color}"/>`;
    }
  }
  return out;
}

/** A ring segment on a top face, between two fractions of the radius. */
function faceDash(cx, cy, r, a, b, inner, outer, color) {
  const ry = r * K;
  const [x1, y1] = ellPt(cx, cy, r * outer, ry * outer, a);
  const [x2, y2] = ellPt(cx, cy, r * outer, ry * outer, b);
  const [x3, y3] = ellPt(cx, cy, r * inner, ry * inner, b);
  const [x4, y4] = ellPt(cx, cy, r * inner, ry * inner, a);
  return `<path d="M${x1} ${y1}A${f(r * outer)} ${f(ry * outer)} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${f(r * inner)} ${f(ry * inner)} 0 0 0 ${x4} ${y4}Z" fill="${color}"/>`;
}

/**
 * One chip lying flat. `by` is the centre of its bottom face.
 * `face` draws the top face's inlay and dashes — only the top of a stack shows it.
 */
export function chip(P, { cx, by, r, h, mat, face = true, seam = false, phase = 0, small = false, mark }) {
  const m = P[mat];
  const ry = r * K;
  const yt = by - h;
  let s = '';
  s += `<path d="M${f(cx - r)} ${f(yt)}L${f(cx - r)} ${f(by)}A${f(r)} ${f(ry)} 0 0 0 ${f(cx + r)} ${f(by)}L${f(cx + r)} ${f(yt)}A${f(r)} ${f(ry)} 0 0 1 ${f(cx - r)} ${f(yt)}Z" fill="${m.side}"/>`;
  s += edgeInserts(cx, yt, by, r, m.mark, phase);
  if (seam) s += `<path d="M${f(cx - r)} ${f(by)}A${f(r)} ${f(ry)} 0 0 0 ${f(cx + r)} ${f(by)}" fill="none" stroke="${P.seam}" stroke-width=".9"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(yt)}" rx="${f(r)}" ry="${f(ry)}" fill="${m.top}"/>`;
  if (face) {
    if (!small) {
      for (let i = 0; i < 8; i++) {
        const c = rad(phase + i * 45);
        s += faceDash(cx, yt, r, c - rad(9), c + rad(9), 0.74, 0.93, m.mark);
      }
    }
    s += `<ellipse cx="${f(cx)}" cy="${f(yt)}" rx="${f(r * 0.6)}" ry="${f(ry * 0.6)}" fill="${m.core}"${small ? '' : ` stroke="${m.inlay}" stroke-width="1"`}/>`;
    if (mark) s += mark(cx, yt, r);
  }
  return s;
}

/** A stack, bottom first. Each chip sits a little off the one below. */
export function stack(P, { cx, by, r, h, mats, wobble = [], small = false, topMark }) {
  let s = '';
  mats.forEach((mat, i) => {
    const top = i === mats.length - 1;
    s += chip(P, {
      cx: cx + (wobble[i] ?? 0),
      by: by - i * h,
      r,
      h,
      mat,
      face: top,
      seam: i > 0,
      phase: (i * 17) % 45,
      small,
      mark: top ? topMark : undefined,
    });
  });
  return s;
}

/** A chip standing on its edge, face on, with its thickness to the right. */
export function standingChip(P, { cx, by, r, mat, t = 5, small = false, letter, letterColor, glyph }) {
  const m = P[mat];
  const cy = by - r;
  const rx = r * 0.94;
  let s = '';
  s += `<ellipse cx="${f(cx + t)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(r)}" fill="${m.side}"/>`;
  s += `<rect x="${f(cx)}" y="${f(cy - r)}" width="${f(t)}" height="${f(2 * r)}" fill="${m.side}"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(r)}" fill="${m.top}"/>`;
  for (let i = 0; i < 8; i++) {
    const a = rad(i * 45 - 11.25 + 22.5);
    const b = a + rad(22.5);
    const o = 1, n = 0.8;
    const p = (rr, tt) => [f(cx + rx * rr * Math.cos(tt)), f(cy + r * rr * Math.sin(tt))];
    const [x1, y1] = p(o, a), [x2, y2] = p(o, b), [x3, y3] = p(n, b), [x4, y4] = p(n, a);
    s += `<path d="M${x1} ${y1}A${f(rx)} ${f(r)} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${f(rx * n)} ${f(r * n)} 0 0 0 ${x4} ${y4}Z" fill="${m.mark}"/>`;
  }
  s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * 0.6)}" ry="${f(r * 0.6)}" fill="${m.core}"${small ? '' : ` stroke="${m.inlay}" stroke-width="1"`}/>`;
  if (letter && !small)
    s += `<text x="${f(cx)}" y="${f(cy + r * 0.24)}" text-anchor="middle" font-family="Figtree,-apple-system,sans-serif" font-weight="800" font-size="${f(r * 0.7)}" fill="${letterColor ?? m.mark}">${letter}</text>`;
  if (glyph) s += glyph(cx, cy, r);
  return s;
}

export function shadow(P, cx, w, h = w * K * 0.9, y = GROUND) {
  return `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(w)}" ry="${f(h)}" fill="${P.shadow}"/>`;
}

/* ── cards ─────────────────────────────────────────────────────────────── */

const SUIT = {
  heart: 'M5 9.4C5 9.4 0 6.2 0 3.1 0 1.4 1.3 0 2.9 0 3.8 0 4.6.5 5 1.3 5.4.5 6.2 0 7.1 0 8.7 0 10 1.4 10 3.1 10 6.2 5 9.4 5 9.4Z',
  spade: 'M5 0C5 0 0 3.8 0 6.2 0 7.7 1.2 8.7 2.5 8.7 3.4 8.7 4.1 8.3 4.5 7.7L3.9 10H6.1L5.5 7.7C5.9 8.3 6.6 8.7 7.5 8.7 8.8 8.7 10 7.7 10 6.2 10 3.8 5 0 5 0Z',
  diamond: 'M5 0L9 5 5 10 1 5Z',
  club: 'M5 0A2.3 2.3 0 0 0 3.1 3.6 2.3 2.3 0 1 0 4.3 7.5L3.8 10H6.2L5.7 7.5A2.3 2.3 0 1 0 6.9 3.6 2.3 2.3 0 0 0 5 0Z',
};

export function suit(name, x, y, size, color) {
  return `<path d="${SUIT[name]}" transform="translate(${f(x)} ${f(y)}) scale(${f(size / 10)})" fill="${color}"/>`;
}

/** A card standing on the ground, turned `rot` degrees about its foot. */
export function card(P, { cx, by = GROUND, w = 34, h = 48, rot = 0, rank, suitName, color, back = false, centre, small = false }) {
  const x = cx - w / 2, y = by - h;
  let s = `<g transform="rotate(${rot} ${f(cx)} ${f(by)})">`;
  s += `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="3.6" fill="${P.stock}" stroke="${P.stockEdge}" stroke-width=".9"/>`;
  if (back) {
    const m = P.red;
    s += `<rect x="${f(x + 3.5)}" y="${f(y + 3.5)}" width="${f(w - 7)}" height="${f(h - 7)}" rx="2" fill="${m.side}"/>`;
    if (!small) {
      const clip = `cb${Math.round(cx * 7 + rot * 13 + h)}`;
      s += `<clipPath id="${clip}"><rect x="${f(x + 3.5)}" y="${f(y + 3.5)}" width="${f(w - 7)}" height="${f(h - 7)}" rx="2"/></clipPath><g clip-path="url(#${clip})" stroke="${m.mark}" stroke-opacity=".35" stroke-width=".9">`;
      for (let d = -h; d < w + h; d += 5) s += `<path d="M${f(x + d)} ${f(y)}l${h} ${h}M${f(x + d)} ${f(y + h)}l${h} ${-h}"/>`;
      s += `</g>`;
    }
  } else {
    const c = color === 'red' ? P.red.side : P.ink.top;
    if (rank && !small) {
      s += `<text x="${f(x + 4.2)}" y="${f(y + 10.5)}" font-family="Figtree,-apple-system,sans-serif" font-weight="800" font-size="9.5" fill="${c}">${rank}</text>`;
      if (suitName) s += suit(suitName, x + 4.2, y + 13, 6, c);
    }
    if (centre) s += centre(cx, y + h / 2, c);
    else if (suitName) s += suit(suitName, cx - w * 0.22, y + h / 2 - w * 0.2, w * 0.44, c);
  }
  return s + '</g>';
}

/* ── the rest of the table ─────────────────────────────────────────────── */

export function bomb(P, { cx, cy, r, small = false }) {
  const m = P.ink;
  let s = '';
  /* The cap, behind the sphere, turned to the upper right. */
  const ca = rad(-50);
  const capX = cx + r * 0.78 * Math.cos(ca), capY = cy + r * 0.78 * Math.sin(ca);
  s += `<g transform="rotate(40 ${f(capX)} ${f(capY)})"><rect x="${f(capX - r * 0.3)}" y="${f(capY - r * 0.3)}" width="${f(r * 0.6)}" height="${f(r * 0.42)}" rx="2" fill="${m.side}"/><ellipse cx="${f(capX)}" cy="${f(capY - r * 0.3)}" rx="${f(r * 0.3)}" ry="${f(r * 0.3 * K)}" fill="${m.inlay}"/></g>`;
  s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${m.top}"/>`;
  if (!small) s += `<ellipse cx="${f(cx - r * 0.38)}" cy="${f(cy - r * 0.45)}" rx="${f(r * 0.32)}" ry="${f(r * 0.18)}" transform="rotate(-35 ${f(cx - r * 0.38)} ${f(cy - r * 0.45)})" fill="#FFFFFF" fill-opacity=".13"/>`;
  /* The fuse and its spark. */
  const fx = capX + r * 0.22, fy = capY - r * 0.36;
  const ex = fx + r * 0.42, ey = fy - r * 0.5;
  s += `<path d="M${f(fx)} ${f(fy)}C${f(fx + r * 0.05)} ${f(fy - r * 0.3)} ${f(ex - r * 0.3)} ${f(ey + r * 0.05)} ${f(ex)} ${f(ey)}" fill="none" stroke="${P.fuse}" stroke-width="${small ? 2.6 : 2.2}" stroke-linecap="round"/>`;
  s += spark(P, ex, ey, r * 0.34);
  return s;
}

export function spark(P, cx, cy, R) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = rad(i * 22.5 - 90);
    const rr = i % 2 === 0 ? R : R * 0.45;
    pts.push(`${f(cx + rr * Math.cos(a))} ${f(cy + rr * Math.sin(a))}`);
  }
  return `<path d="M${pts.join('L')}Z" fill="${P.fire}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.32)}" fill="${P.fireCore}"/>`;
}

export function flame(P, { cx, by, h }) {
  const w = h * 0.62;
  const outer = `M${f(cx)} ${f(by - h)}C${f(cx + w * 0.15)} ${f(by - h * 0.7)} ${f(cx + w * 0.62)} ${f(by - h * 0.55)} ${f(cx + w * 0.55)} ${f(by - h * 0.25)}C${f(cx + w * 0.5)} ${f(by - h * 0.02)} ${f(cx + w * 0.2)} ${f(by)} ${f(cx)} ${f(by)}C${f(cx - w * 0.22)} ${f(by)} ${f(cx - w * 0.52)} ${f(by - h * 0.04)} ${f(cx - w * 0.52)} ${f(by - h * 0.3)}C${f(cx - w * 0.52)} ${f(by - h * 0.5)} ${f(cx - w * 0.3)} ${f(by - h * 0.55)} ${f(cx - w * 0.25)} ${f(by - h * 0.72)}C${f(cx - w * 0.1)} ${f(by - h * 0.6)} ${f(cx - w * 0.05)} ${f(by - h * 0.62)} ${f(cx)} ${f(by - h)}Z`;
  const ih = h * 0.55, iw = w * 0.55;
  const inner = `M${f(cx + iw * 0.05)} ${f(by - ih)}C${f(cx + iw * 0.5)} ${f(by - ih * 0.6)} ${f(cx + iw * 0.55)} ${f(by - ih * 0.2)} ${f(cx + iw * 0.3)} ${f(by - ih * 0.05)}C${f(cx + iw * 0.1)} ${f(by + 1)} ${f(cx - iw * 0.3)} ${f(by + 1)} ${f(cx - iw * 0.45)} ${f(by - ih * 0.2)}C${f(cx - iw * 0.55)} ${f(by - ih * 0.45)} ${f(cx - iw * 0.2)} ${f(by - ih * 0.55)} ${f(cx + iw * 0.05)} ${f(by - ih)}Z`;
  return `<path d="${outer}" fill="${P.fireOuter}"/><path d="${inner}" transform="translate(0 -1)" fill="${P.fire}"/><ellipse cx="${f(cx)}" cy="${f(by - ih * 0.28)}" rx="${f(iw * 0.2)}" ry="${f(ih * 0.22)}" fill="${P.fireCore}"/>`;
}

/* ── the spots ─────────────────────────────────────────────────────────── */

const text = (x, y, size, color, str, extra = '') =>
  `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="Figtree,-apple-system,sans-serif" font-weight="800" font-size="${size}" fill="${color}"${extra}>${str}</text>`;

/** A mark drawn flat on a top face: squashed by K, like the face itself. */
const onFace = (svg) => (cx, cy) => `<g transform="translate(${f(cx)} ${f(cy)}) scale(1 ${K})">${svg}</g>`;

export const SPOTS = {
  session: {
    name: 'Start a session',
    where: 'Home · the start card',
    status: 'keep',
    draw: (P, o) =>
      shadow(P, 48, 31) +
      stack(P, { cx: 48, by: GROUND - 1, r: 25, h: 8, mats: ['ink', 'red', 'ink', 'red', 'ink'], wobble: [0, 1.6, -0.6, 1.2, -1.4], small: o.small }),
  },
  bombPot: {
    name: 'Bomb pot',
    where: 'Boosters',
    status: 'keep',
    draw: (P, o) => shadow(P, 46, 22) + bomb(P, { cx: 45, cy: 59, r: 23, small: o.small }),
  },
  group: {
    name: 'The group',
    where: 'Home · tile',
    status: 'new',
    draw: (P, o) =>
      shadow(P, 48, 38) +
      standingChip(P, { cx: 24, by: GROUND - 5, r: 15, mat: 'red', t: 4, small: o.small, letter: 'L' }) +
      standingChip(P, { cx: 68, by: GROUND - 5, r: 15, mat: 'bone', t: 4, small: o.small, letter: 'M' }) +
      standingChip(P, { cx: 45, by: GROUND, r: 19, mat: 'ink', t: 5, small: o.small, letter: 'D' }),
  },
  sessionsA: {
    name: 'Sessions',
    variant: 'A · the book',
    where: 'Home · tile',
    status: 'redraw',
    pick: true,
    draw: (P, o) => {
      const m = P.ink;
      let s = shadow(P, 50, 27);
      /* The page block, seen past the cover's right edge. */
      s += `<path d="M66 18L73 23V85L66 82Z" fill="${P.stock}" stroke="${P.stockEdge}" stroke-width=".8"/>`;
      if (!o.small) for (let y = 30; y < 80; y += 6) s += `<path d="M67 ${y}L72 ${y + 3}" stroke="${P.stockEdge}" stroke-width=".7"/>`;
      s += `<rect x="26" y="18" width="42" height="64" rx="3.5" fill="${m.top}"/>`;
      s += `<rect x="26" y="18" width="6" height="64" rx="2" fill="${m.side}"/>`;
      if (!o.small) s += `<rect x="36" y="23" width="27" height="54" rx="2" fill="none" stroke="${m.inlay}" stroke-width=".9"/>`;
      s += suit('spade', 42.5, 39, 15, m.inlay);
      /* The ribbon, the one red. */
      s += `<path d="M54 80V90L57 87.5 60 90V80Z" fill="${P.red.side}"/>`;
      return s;
    },
  },
  sessionsB: {
    name: 'Sessions',
    variant: 'B · the date',
    where: 'Home · tile',
    status: 'redraw',
    draw: (P, o) => {
      let s = shadow(P, 48, 30);
      s += `<rect x="22" y="22" width="50" height="58" rx="6" fill="${P.stock}" stroke="${P.stockEdge}" stroke-width=".9"/>`;
      s += `<path d="M22 28a6 6 0 0 1 6-6h38a6 6 0 0 1 6 6v8H22Z" fill="${P.ink.top}"/>`;
      s += `<rect x="33" y="17" width="4" height="10" rx="2" fill="${P.red.side}"/><rect x="57" y="17" width="4" height="10" rx="2" fill="${P.red.side}"/>`;
      if (!o.small) s += text(47, 66, 24, P.ink.top, '20', ' letter-spacing="-1"');
      else s += `<rect x="34" y="48" width="26" height="12" rx="3" fill="${P.ink.inlay}"/>`;
      s += chip(P, { cx: 71, by: GROUND - 2, r: 12, h: 4.5, mat: 'red', small: true, phase: 10 });
      return s;
    },
  },
  stats: {
    name: 'My stats',
    where: 'Home · tile',
    status: 'new',
    draw: (P, o) =>
      shadow(P, 48, 38) +
      stack(P, { cx: 25, by: GROUND - 1, r: 11, h: 5.5, mats: ['bone', 'bone'], small: true }) +
      stack(P, { cx: 48, by: GROUND - 1, r: 11, h: 5.5, mats: ['red', 'red', 'red', 'red'], wobble: [0, 0.8, -0.5, 0.6], small: true }) +
      stack(P, { cx: 71, by: GROUND - 1, r: 11, h: 5.5, mats: ['ink', 'ink', 'ink', 'ink', 'ink', 'ink', 'ink'], wobble: [0, -0.7, 0.5, -0.4, 0.8, -0.6, 0.3], small: true }),
  },
  toolsA: {
    name: 'Poker tools',
    variant: 'A · two cards and a chip',
    where: 'Home · tile',
    status: 'redraw',
    pick: true,
    draw: (P, o) =>
      shadow(P, 50, 30) +
      card(P, { cx: 40, by: GROUND - 4, rot: -13, rank: 'A', suitName: 'spade', color: 'ink', small: o.small }) +
      card(P, { cx: 56, by: GROUND - 4, rot: 9, rank: 'K', suitName: 'heart', color: 'red', small: o.small }) +
      stack(P, { cx: 66, by: GROUND, r: 13, h: 5, mats: ['ink', 'red'], wobble: [0, -1], small: true }),
  },
  toolsB: {
    name: 'Poker tools',
    variant: 'B · the dealer button',
    where: 'Home · tile',
    status: 'redraw',
    draw: (P, o) =>
      shadow(P, 48, 30) +
      chip(P, {
        cx: 48, by: GROUND - 2, r: 27, h: 11, mat: 'bone', small: true, phase: 4,
        mark: onFace(text(0, 9, 26, P.ink.top, 'D')),
      }),
  },
  calculator: {
    name: 'Calculator',
    where: 'Poker tools · tile',
    status: 'new',
    draw: (P, o) =>
      shadow(P, 49, 24) +
      standingChip(P, {
        cx: 46, by: GROUND, r: 25, mat: 'bone', t: 6, small: o.small,
        glyph: (cx, cy) =>
          `<g fill="none" stroke="${P.ink.top}" stroke-width="3.2" stroke-linecap="round"><path d="M${cx + 6} ${cy - 8}L${cx - 6} ${cy + 8}"/><circle cx="${cx - 6}" cy="${cy - 6}" r="2.6"/><circle cx="${cx + 6}" cy="${cy + 6}" r="2.6"/></g>`,
      }),
  },
  rulings: {
    name: 'Rulings',
    where: 'Poker tools · tile',
    status: 'new',
    draw: (P, o) =>
      shadow(P, 52, 20) +
      card(P, {
        cx: 47, by: GROUND - 2, w: 42, h: 60, rot: 12, small: o.small,
        centre: (cx, cy) => text(cx, cy + 12, 34, P.red.side, '?'),
      }),
  },
  boosters: {
    name: 'Boosters',
    where: 'Poker tools · tile',
    status: 'new',
    draw: (P, o) =>
      shadow(P, 48, 27) +
      stack(P, { cx: 48, by: GROUND - 1, r: 22, h: 7, mats: ['ink', 'red'], wobble: [0, 1], small: true }) +
      flame(P, { cx: 49, by: GROUND - 15, h: 50 }),
  },
  doubleBoard: {
    name: 'Double-board bomb pot',
    where: 'Boosters',
    status: 'new',
    draw: (P, o) => shadow(P, 47, 30) + bomb(P, { cx: 61, cy: 52, r: 15, small: o.small }) + bomb(P, { cx: 38, cy: 63, r: 19, small: o.small }),
  },
  straddle: {
    name: 'Straddle',
    where: 'Boosters',
    status: 'new',
    draw: (P, o) =>
      shadow(P, 48, 28) +
      card(P, { cx: 38, by: GROUND - 4, w: 36, h: 52, rot: -9, back: true, small: o.small }) +
      stack(P, { cx: 60, by: GROUND, r: 16, h: 6, mats: ['red', 'red'], wobble: [0, -1.3], small: o.small }),
  },
  ante: {
    name: 'Table ante',
    where: 'Boosters',
    status: 'new',
    draw: (P, o) =>
      shadow(P, 48, 36) +
      chip(P, { cx: 34, by: 70, r: 12, h: 4.5, mat: 'ink', small: true, phase: 8 }) +
      chip(P, { cx: 62, by: 68, r: 12, h: 4.5, mat: 'bone', small: true, phase: 20 }) +
      stack(P, { cx: 48, by: 76, r: 12, h: 4.5, mats: ['red', 'ink'], wobble: [0, 1], small: true }) +
      chip(P, { cx: 28, by: 83, r: 12, h: 4.5, mat: 'red', small: true, phase: 30 }) +
      chip(P, { cx: 69, by: 83, r: 12, h: 4.5, mat: 'red', small: true, phase: 3 }),
  },
  standUpA: {
    name: 'Stand-up game',
    variant: 'A · one chip stood up',
    where: 'Boosters',
    status: 'redraw',
    pick: true,
    draw: (P, o) =>
      shadow(P, 50, 34) +
      stack(P, { cx: 34, by: GROUND - 1, r: 15, h: 5.5, mats: ['ink', 'ink'], wobble: [0, 0.8], small: true }) +
      standingChip(P, { cx: 61, by: GROUND, r: 21, mat: 'red', t: 6, small: o.small, glyph: o.small ? undefined : (cx, cy) => `<path d="M${cx} ${cy + 6}V${cy - 6}M${cx - 5} ${cy - 1.5}L${cx} ${cy - 6.5}L${cx + 5} ${cy - 1.5}" fill="none" stroke="${P.red.mark}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` }),
  },
  standUpB: {
    name: 'Stand-up game',
    variant: 'B · the empty chair',
    where: 'Boosters',
    status: 'redraw',
    draw: (P, o) => {
      const m = P.ink;
      let s = shadow(P, 51, 24);
      /* Back legs, then seat, then front legs: what is nearer is drawn later. */
      s += `<path d="M30.5 62V79M64.5 62V79" stroke="${m.side}" stroke-width="3.4" stroke-linecap="round"/>`;
      s += `<rect x="27" y="20" width="41" height="13" rx="3.5" fill="${m.top}"/>`;
      s += `<path d="M30.5 31V58M64.5 31V58" stroke="${m.top}" stroke-width="4" stroke-linecap="round"/>`;
      s += `<path d="M28 57H67L73 63H34Z" fill="${P.red.top}"/><path d="M34 63H73V67.5H34Z" fill="${P.red.side}"/><path d="M28 57L34 63V67.5L28 61.5Z" fill="${P.red.core}"/>`;
      s += `<path d="M35.5 67V84M71.5 67V84" stroke="${m.top}" stroke-width="3.6" stroke-linecap="round"/>`;
      return s;
    },
  },
  buttonGame: {
    name: 'Button game',
    where: 'Boosters',
    status: 'new',
    draw: (P, o) =>
      shadow(P, 48, 30) +
      stack(P, {
        cx: 46, by: GROUND - 1, r: 18, h: 6, mats: ['bone', 'bone', 'bone'], wobble: [0, 1.2, -0.8], small: true,
        topMark: onFace(`<path d="M0 -9L2.6 -3 9 -2.6 4.2 1.6 5.6 8 0 4.6 -5.6 8 -4.2 1.6 -9 -2.6 -2.6 -3Z" fill="${P.red.side}"/>`),
      }) +
      chip(P, { cx: 72, by: GROUND, r: 10, h: 5, mat: 'bone', small: true, phase: 15 }),
  },
  sevenTwo: {
    name: '7-2 game',
    where: 'Boosters',
    status: 'new',
    draw: (P, o) =>
      shadow(P, 48, 27) +
      card(P, { cx: 40, by: GROUND - 3, w: 36, h: 52, rot: -11, rank: '7', suitName: 'club', color: 'ink', small: o.small }) +
      card(P, { cx: 56, by: GROUND - 3, w: 36, h: 52, rot: 10, rank: '2', suitName: 'diamond', color: 'red', small: o.small }),
  },
};

/* ── round 2, 20 November: redrawn from the owner's review ─────────────── */

/** Points round a table seen from a little above, back to front. */
function seats(cx, cy, rx, ry, degs) {
  return degs
    .map((d) => ({ x: cx + rx * Math.cos(rad(d)), y: cy + ry * Math.sin(rad(d)) }))
    .sort((a, b) => a.y - b.y);
}

/** Stacks of one colour round an arc: the blinds and the straddle, by seat. */
function blinds(P, o, { cx, cy, rx, ry, degs, counts, r, h, button = false }) {
  const pts = degs.map((d, i) => ({ x: cx + rx * Math.cos(rad(d)), y: cy + ry * Math.sin(rad(d)), i }));
  let s = '';
  for (const pt of [...pts].sort((a, b) => a.y - b.y)) {
    const n = counts[pt.i];
    if (n === 0 && button) {
      s += chip(P, { cx: pt.x, by: pt.y, r: r * 0.9, h: h * 1.1, mat: 'bone', small: true, phase: 6, mark: o.small ? undefined : onFace(text(0, 6.5, 19, P.ink.top, 'D')) });
      continue;
    }
    s += stack(P, { cx: pt.x, by: pt.y, r, h, mats: Array(n).fill('red'), wobble: [0, 0.7, -0.5, 0.6], small: o.small || r < 13 });
  }
  return s;
}

/** A flop of three, upright, as a board on the felt. */
function board(P, o, { by, w, h, xs, back, suits }) {
  return xs
    .map((x, i) =>
      card(P, { cx: x, by, w, h, back, small: true, suitName: back ? undefined : suits[i], color: suits && (suits[i] === 'heart' || suits[i] === 'diamond') ? 'red' : 'ink' }),
    )
    .join('');
}

Object.assign(SPOTS, {
  anteA: {
    name: 'Table ante',
    variant: 'A · six seats',
    where: 'Boosters',
    status: 'round2',
    draw: (P, o) =>
      `<ellipse cx="48" cy="66" rx="45" ry="17" fill="${P.shadow}"/>` +
      seats(48, 61, 33, 33 * K + 1, [30, 90, 150, 210, 270, 330])
        .map((pt, i) => chip(P, { cx: pt.x, by: pt.y, r: 10, h: 4.5, mat: 'red', small: true, phase: i * 9 }))
        .join(''),
  },
  anteB: {
    name: 'Table ante',
    variant: 'B · five seats, bigger',
    where: 'Boosters',
    status: 'round2',
    draw: (P, o) =>
      `<ellipse cx="48" cy="66" rx="45" ry="17" fill="${P.shadow}"/>` +
      seats(48, 60, 31, 31 * K + 2, [90, 162, 234, 306, 18])
        .map((pt, i) => chip(P, { cx: pt.x, by: pt.y, r: 12.5, h: 5, mat: 'red', small: o.small, phase: i * 9 }))
        .join(''),
  },
  straddleA: {
    name: 'Straddle',
    variant: 'A · 1, 2, 4 round the table',
    where: 'Boosters',
    status: 'round2',
    draw: (P, o) =>
      `<ellipse cx="48" cy="71" rx="42" ry="12" fill="${P.shadow}"/>` +
      blinds(P, o, { cx: 48, cy: 58, rx: 31, ry: 17, degs: [160, 90, 20], counts: [1, 2, 4], r: 12, h: 5.5 }),
  },
  straddleB: {
    name: 'Straddle',
    variant: 'B · from the button',
    where: 'Boosters',
    status: 'round2',
    draw: (P, o) =>
      `<ellipse cx="48" cy="71" rx="42" ry="12" fill="${P.shadow}"/>` +
      blinds(P, o, { cx: 48, cy: 57, rx: 29, ry: 18, degs: [195, 135, 70, 5], counts: [0, 1, 2, 4], r: 10, h: 5, button: true }),
  },
  straddleC: {
    name: 'Straddle',
    variant: 'C · 1, 2, 4 in a row, big',
    where: 'Boosters',
    status: 'round2',
    draw: (P, o) =>
      shadow(P, 48, 44, 12, 80) +
      stack(P, { cx: 19, by: 79, r: 13, h: 6, mats: ['red'], small: true }) +
      stack(P, { cx: 47, by: 81, r: 13, h: 6, mats: ['red', 'red'], wobble: [0, 0.8], small: true }) +
      stack(P, { cx: 75, by: 83, r: 13, h: 6, mats: ['red', 'red', 'red', 'red'], wobble: [0, 0.8, -0.6, 0.7], small: o.small }),
  },
  straddleD: {
    name: 'Straddle',
    variant: 'D · the big blind, doubled',
    where: 'Boosters',
    status: 'round2',
    draw: (P, o) =>
      shadow(P, 48, 40, 12, 82) +
      stack(P, { cx: 27, by: 80, r: 16, h: 7, mats: ['red', 'red'], wobble: [0, 1], small: true }) +
      stack(P, { cx: 68, by: 84, r: 16, h: 7, mats: ['red', 'red', 'red', 'red'], wobble: [0, 1, -0.7, 0.8], small: o.small }),
  },
  doubleBoardA: {
    name: 'Double-board bomb pot',
    variant: 'A · two bombs, as before',
    where: 'Boosters',
    status: 'round2',
    draw: (P, o) => SPOTS.doubleBoard.draw(P, o),
  },
  doubleBoardB: {
    name: 'Double-board bomb pot',
    variant: 'B · the bomb over two boards',
    where: 'Boosters',
    status: 'round2',
    draw: (P, o) =>
      shadow(P, 48, 34, 8) +
      bomb(P, { cx: 48, cy: 36, r: 13, small: o.small }) +
      board(P, o, { by: 62, w: 14, h: 19, xs: [34, 49, 64], back: true }) +
      board(P, o, { by: 85, w: 17, h: 22, xs: [28, 48, 68], back: true }),
  },
  doubleBoardC: {
    name: 'Double-board bomb pot',
    variant: 'C · the bomb over two boards, face up',
    where: 'Boosters',
    status: 'round2',
    draw: (P, o) =>
      shadow(P, 48, 34, 8) +
      bomb(P, { cx: 48, cy: 36, r: 13, small: o.small }) +
      board(P, o, { by: 62, w: 14, h: 19, xs: [34, 49, 64], suits: ['spade', 'heart', 'club'] }) +
      board(P, o, { by: 85, w: 17, h: 22, xs: [28, 48, 68], suits: ['diamond', 'spade', 'heart'] }),
  },
});

/* ── round 3, 20 November: the owner's second review ────────────────────── */

/** A table: a rail and its felt, both ink. Red chips read on it in either theme. */
function felt(P, cx, cy, rx, ry) {
  return `<ellipse cx="${f(cx)}" cy="${f(cy + 3)}" rx="${f(rx)}" ry="${f(ry)}" fill="${P.shadow}"/>` +
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${P.ink.side}"/>` +
    `<ellipse cx="${f(cx)}" cy="${f(cy - 0.5)}" rx="${f(rx - 4.5)}" ry="${f(ry - 3)}" fill="${P.ink.top}"/>`;
}

/** Things at points, drawn back to front so nearer ones overlap farther ones. */
function byDepth(items) {
  return [...items].sort((a, b) => a.y - b.y).map((it) => it.draw()).join('');
}

function book(P, o, { spade, frame, chipOn = false, shadowed = true }) {
  const m = P.ink;
  let s = shadowed ? shadow(P, 50, 27) : '';
  s += `<path d="M66 18L73 23V85L66 82Z" fill="${P.stock}" stroke="${P.stockEdge}" stroke-width=".8"/>`;
  if (!o.small) for (let y = 30; y < 80; y += 6) s += `<path d="M67 ${y}L72 ${y + 3}" stroke="${P.stockEdge}" stroke-width=".7"/>`;
  s += `<rect x="26" y="18" width="42" height="64" rx="3.5" fill="${m.top}"/>`;
  s += `<rect x="26" y="18" width="6" height="64" rx="2" fill="${m.side}"/>`;
  if (!o.small && frame) s += `<rect x="36" y="23" width="27" height="54" rx="2" fill="none" stroke="${frame}" stroke-width="1"/>`;
  if (chipOn) s += standingChip(P, { cx: 49, by: 61, r: 11.5, mat: 'red', t: 0, small: true });
  else s += suit('spade', 41.5, 38, 16, spade);
  s += `<path d="M54 80V90L57 87.5 60 90V80Z" fill="${P.red.side}"/>`;
  return s;
}

function calendar(P, o, { rings = true, date = true, dateX = 47 }) {
  let s = `<rect x="22" y="22" width="50" height="58" rx="6" fill="${P.stock}" stroke="${P.stockEdge}" stroke-width=".9"/>`;
  s += `<path d="M22 28a6 6 0 0 1 6-6h38a6 6 0 0 1 6 6v8H22Z" fill="${P.ink.top}"/>`;
  if (rings) s += `<rect x="33" y="17" width="4" height="10" rx="2" fill="${P.red.side}"/><rect x="57" y="17" width="4" height="10" rx="2" fill="${P.red.side}"/>`;
  if (date) s += o.small ? `<rect x="${dateX - 13}" y="48" width="26" height="12" rx="3" fill="${P.ink.inlay}"/>` : text(dateX, 66, 24, P.ink.top, '20', ' letter-spacing="-1"');
  return s;
}

const pct = (stroke) => `<g fill="none" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round"><path d="M8 -10L-8 10"/><circle cx="-7" cy="-7" r="3.4"/><circle cx="7" cy="7" r="3.4"/></g>`;

/** Stack sizes by seat, with the straddle nearest and largest. */
function straddleSeats(P, o, extra = {}) {
  const seat = [
    { x: 23.5, y: 51, n: 1, r: 10, h: 5 },
    { x: 63, y: 47, n: 2, r: 10.5, h: 5 },
    { x: 54, y: 76, n: 4, r: 14, h: 6 },
  ];
  return byDepth(seat.map((st) => ({
    y: st.y,
    draw: () => (extra.own ? shadow(P, st.x, st.r * 1.25, st.r * K * 1.2, st.y) : '') +
      stack(P, { cx: st.x, by: st.y, r: st.r, h: st.h, mats: Array(st.n).fill('red'), wobble: [0, 0.7, -0.5, 0.6], small: o.small || st.n < 4 }),
  })));
}

Object.assign(SPOTS, {
  groupB: {
    name: 'The group', variant: 'B · three chips on edge, no names', where: 'Home · tile', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 38) +
      standingChip(P, { cx: 24, by: GROUND - 5, r: 15, mat: 'red', t: 4, small: o.small }) +
      standingChip(P, { cx: 68, by: GROUND - 5, r: 15, mat: 'bone', t: 4, small: o.small }) +
      standingChip(P, { cx: 45, by: GROUND, r: 19, mat: 'ink', t: 5, small: o.small }),
  },
  groupC: {
    name: 'The group', variant: 'C · everyone’s stack', where: 'Home · tile', status: 'round3',
    draw: (P, o) => {
      const st = [
        { x: 21, y: 76, mats: ['ink', 'ink', 'ink'] },
        { x: 40, y: 84, mats: ['red', 'red'] },
        { x: 58, y: 83, mats: ['bone', 'bone', 'bone', 'bone'] },
        { x: 76, y: 75, mats: ['red', 'red', 'red'] },
      ];
      return `<ellipse cx="48" cy="82" rx="42" ry="10" fill="${P.shadow}"/>` +
        byDepth(st.map((t) => ({ y: t.y, draw: () => stack(P, { cx: t.x, by: t.y, r: 10.5, h: 5, mats: t.mats, wobble: [0, 0.6, -0.5, 0.5], small: true }) })));
    },
  },
  groupD: {
    name: 'The group', variant: 'D · seats round the table', where: 'Home · tile', status: 'round3',
    draw: (P, o) => {
      const mats = ['red', 'ink', 'bone', 'red', 'ink'];
      return `<ellipse cx="48" cy="70" rx="44" ry="15" fill="${P.shadow}"/>` +
        seats(48, 66, 31, 12, [90, 162, 234, 306, 18])
          .map((pt, i) => standingChip(P, { cx: pt.x - 1.5, by: pt.y + 4, r: 11, mat: mats[i], t: 3, small: true }))
          .join('');
    },
  },
  sessionsC: {
    name: 'Sessions', variant: 'C · the book, red spade', where: 'Home · tile', status: 'round3',
    draw: (P, o) => book(P, o, { spade: P.red.top, frame: P.ink.inlay }),
  },
  sessionsD: {
    name: 'Sessions', variant: 'D · the book, bone spade', where: 'Home · tile', status: 'round3',
    draw: (P, o) => book(P, o, { spade: P.bone.top, frame: P.bone.inlay }),
  },
  sessionsE: {
    name: 'Sessions', variant: 'E · the book, a chip on the cover', where: 'Home · tile', status: 'round3',
    draw: (P, o) => book(P, o, { chipOn: true, frame: P.ink.inlay }),
  },
  sessionsF: {
    name: 'Sessions', variant: 'F · the chip is the date', where: 'Home · tile', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 30) + calendar(P, o, { date: false }) +
      standingChip(P, { cx: 47, by: 74, r: 15, mat: 'red', t: 0, small: true, glyph: o.small ? undefined : (cx, cy) => text(cx, cy + 4.5, 13, P.red.mark, '20') }),
  },
  sessionsG: {
    name: 'Sessions', variant: 'G · a chip holds the page', where: 'Home · tile', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 30) + calendar(P, o, { rings: false }) +
      standingChip(P, { cx: 46, by: 39, r: 11, mat: 'red', t: 3, small: true }),
  },
  sessionsH: {
    name: 'Sessions', variant: 'H · chips on the page', where: 'Home · tile', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 30, 10, 87) + calendar(P, o, {}) +
      stack(P, { cx: 47, by: 88, r: 14, h: 5.5, mats: ['ink', 'red'], wobble: [0, 1], small: o.small }),
  },
  toolsC: {
    name: 'Poker tools', variant: 'C · the chip rack', where: 'Home · tile', status: 'round3',
    draw: (P, o) => {
      const m = P.ink;
      let s = shadow(P, 48, 38, 9, 84);
      s += `<rect x="14" y="40" width="68" height="36" rx="7" fill="${m.top}"/>`;
      s += `<rect x="18" y="43" width="60" height="28" rx="4" fill="${m.core}"/>`;
      ['bone', 'red', 'ink'].forEach((mat, i) => {
        const mm = P[mat], y = 46 + i * 8.5, x0 = 22, x1 = 74, hh = 8;
        s += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${hh}" rx="${hh / 2}" fill="${mm.side}"/>`;
        for (let x = x0 + 4; x < x1 - 3; x += 5) s += `<rect x="${x}" y="${y}" width="2.2" height="${hh}" fill="${mm.mark}" opacity="${mat === 'bone' ? 0.85 : 1}"/>`;
        s += `<ellipse cx="${x0 + 2}" cy="${y + hh / 2}" rx="2.6" ry="${hh / 2}" fill="${mm.top}"/>`;
      });
      s += `<path d="M14 68h68v8a7 7 0 0 1-7 7H21a7 7 0 0 1-7-7Z" fill="${m.side}"/>`;
      return s;
    },
  },
  toolsD: {
    name: 'Poker tools', variant: 'D · the ruling and the odds', where: 'Home · tile', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 32) +
      card(P, { cx: 38, by: GROUND - 3, w: 36, h: 52, rot: 12, small: o.small, centre: (cx, cy) => text(cx, cy + 10, 28, P.red.side, '?') }) +
      standingChip(P, { cx: 62, by: GROUND, r: 18, mat: 'bone', t: 5, small: true, glyph: (cx, cy) => `<g transform="translate(${cx} ${cy}) scale(.72)">${pct(P.ink.top)}</g>` }),
  },
  toolsE: {
    name: 'Poker tools', variant: 'E · the button on a stack', where: 'Home · tile', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 30) +
      card(P, { cx: 36, by: GROUND - 6, w: 34, h: 48, rot: -10, back: true, small: o.small }) +
      stack(P, { cx: 56, by: GROUND, r: 19, h: 6.5, mats: ['ink', 'red'], wobble: [0, 1], small: true }) +
      chip(P, { cx: 57, by: GROUND - 13, r: 15, h: 6, mat: 'bone', small: true, phase: 5, mark: onFace(text(0, 6, 17, P.ink.top, 'D')) }),
  },
  calculatorB: {
    name: 'Calculator', variant: 'B · % on top of a stack', where: 'Poker tools · tile', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 29) +
      stack(P, { cx: 48, by: GROUND - 1, r: 23, h: 7.5, mats: ['ink', 'red', 'bone'], wobble: [0, 1.2, -0.6], small: true, topMark: onFace(`<g transform="scale(1.6)">${pct(P.ink.top)}</g>`) }),
  },
  calculatorC: {
    name: 'Calculator', variant: 'C · the odds and the pot', where: 'Poker tools · tile', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 36) +
      stack(P, { cx: 28, by: 76, r: 13, h: 5.5, mats: ['red', 'red', 'red'], wobble: [0, 0.8, -0.5], small: true }) +
      chip(P, { cx: 41, by: 82, r: 11, h: 4.5, mat: 'red', small: true, phase: 20 }) +
      standingChip(P, { cx: 61, by: GROUND + 1, r: 21, mat: 'bone', t: 5, small: true, glyph: (cx, cy) => `<g transform="translate(${cx} ${cy}) scale(.82)">${pct(P.ink.top)}</g>` }),
  },
  boostersB: {
    name: 'Boosters', variant: 'B · fire behind the stack', where: 'Poker tools · tile', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 28) +
      flame(P, { cx: 50, by: GROUND - 16, h: 50 }) +
      stack(P, { cx: 48, by: GROUND - 1, r: 22, h: 7, mats: ['ink', 'red', 'ink'], wobble: [0, 1, -0.8], small: true }),
  },
  boostersC: {
    name: 'Boosters', variant: 'C · chips thrown up', where: 'Poker tools · tile', status: 'round3',
    draw: (P, o) => {
      const fly = (cx, cy, rot, mat) => `<g transform="rotate(${rot} ${cx} ${cy})">${chip(P, { cx, by: cy, r: 11, h: 4.5, mat, small: true, phase: rot })}</g>`;
      return shadow(P, 46, 26) +
        stack(P, { cx: 46, by: GROUND - 1, r: 20, h: 7, mats: ['ink', 'red'], wobble: [0, 1], small: true }) +
        fly(28, 52, -24, 'red') + fly(63, 44, 18, 'ink') + fly(45, 33, -8, 'red');
    },
  },
  boostersD: {
    name: 'Boosters', variant: 'D · a fire in a ring of chips', where: 'Poker tools · tile', status: 'round3',
    draw: (P, o) => {
      const pts = seats(48, 74, 27, 9.5, [90, 150, 210, 270, 330, 30]);
      const mats = ['red', 'ink'];
      const chipAt = (pt, i) => chip(P, { cx: pt.x, by: pt.y, r: 8.5, h: 4, mat: mats[i % 2], small: true, phase: i * 11 });
      const back = pts.filter((pt) => pt.y < 74), front = pts.filter((pt) => pt.y >= 74);
      return `<ellipse cx="48" cy="77" rx="40" ry="12" fill="${P.shadow}"/>` +
        back.map(chipAt).join('') + flame(P, { cx: 48, by: 76, h: 50 }) + front.map((pt, i) => chipAt(pt, i + 1)).join('');
    },
  },
  anteC: {
    name: 'Table ante', variant: 'C · six seats and the pot', where: 'Boosters', status: 'round3',
    draw: (P, o) =>
      `<ellipse cx="48" cy="66" rx="45" ry="17" fill="${P.shadow}"/>` +
      byDepth([
        ...seats(48, 62, 34, 34 * K + 1, [30, 90, 150, 210, 270, 330]).map((pt, i) => ({ y: pt.y, draw: () => chip(P, { cx: pt.x, by: pt.y, r: 9, h: 4, mat: 'red', small: true, phase: i * 9 }) })),
        { y: 62, draw: () => stack(P, { cx: 48, by: 62, r: 9, h: 4, mats: ['red', 'red', 'red'], wobble: [0, 0.8, -0.6], small: true }) },
      ]),
  },
  anteD: {
    name: 'Table ante', variant: 'D · six seats on the felt', where: 'Boosters', status: 'round3',
    draw: (P, o) =>
      felt(P, 48, 64, 43, 19) +
      seats(48, 64, 31, 11, [30, 90, 150, 210, 270, 330])
        .map((pt, i) => chip(P, { cx: pt.x, by: pt.y, r: 9, h: 4, mat: 'red', small: true, phase: i * 9 }))
        .join(''),
  },
  anteE: {
    name: 'Table ante', variant: 'E · four seats, close up', where: 'Boosters', status: 'round3',
    draw: (P, o) =>
      `<ellipse cx="48" cy="68" rx="45" ry="17" fill="${P.shadow}"/>` +
      seats(48, 63, 28, 13, [45, 135, 225, 315])
        .map((pt, i) => chip(P, { cx: pt.x, by: pt.y, r: 14, h: 5.5, mat: 'red', small: o.small, phase: i * 9 }))
        .join(''),
  },
  straddleE: {
    name: 'Straddle', variant: 'E · the straddle nearest', where: 'Boosters', status: 'round3',
    draw: (P, o) => `<ellipse cx="46" cy="70" rx="42" ry="15" fill="${P.shadow}"/>` + straddleSeats(P, o),
  },
  straddleF: {
    name: 'Straddle', variant: 'F · no table', where: 'Boosters', status: 'round3',
    draw: (P, o) => straddleSeats(P, o, { own: true }),
  },
  straddleG: {
    name: 'Straddle', variant: 'G · on the felt', where: 'Boosters', status: 'round3',
    draw: (P, o) => felt(P, 48, 62, 43, 21) + straddleSeats(P, o),
  },
  straddleH: {
    name: 'Straddle', variant: 'H · the straddle up front, blinds behind', where: 'Boosters', status: 'round3',
    draw: (P, o) =>
      shadow(P, 48, 40, 11, 82) +
      stack(P, { cx: 22, by: 62, r: 9.5, h: 4.5, mats: ['red'], small: true }) +
      stack(P, { cx: 74, by: 62, r: 9.5, h: 4.5, mats: ['red', 'red'], wobble: [0, 0.6], small: true }) +
      stack(P, { cx: 48, by: 83, r: 18, h: 7, mats: ['red', 'red', 'red', 'red'], wobble: [0, 1, -0.7, 0.8], small: o.small }),
  },
});

/* ── round 4, 20 November: the owner's third review ─────────────────────── */

/** Stacks at given seats, each with its own shadow: no table. */
function seatStacks(P, o, list) {
  return list.map((st) => shadow(P, st.x, st.r * 1.25, st.r * K * 1.2, st.y)).join('') +
    byDepth(list.map((st) => ({ y: st.y, draw: () => stack(P, { cx: st.x, by: st.y, r: st.r, h: st.h, mats: Array(st.n).fill('red'), wobble: [0, 0.7, -0.5, 0.6], small: o.small || st.n < 4 }) })));
}

function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** The book lying on the table, turned `deg` in the table's plane. */
function bookFlat(P, o, { deg = 18, cx = 48, cy = 62, w = 46, d = 62, t = 9 }) {
  const c = Math.cos(rad(deg)), sn = Math.sin(rad(deg));
  const M = [c, K * sn, -sn, K * c, cx, cy];
  const at = (x, y, dy = 0) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5] + dy];
  const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
  const all = corners.flatMap(([x, y]) => [at(x, y), at(x, y, t)]);
  const poly = (pts) => pts.map((q) => `${f(q[0])} ${f(q[1])}`).join('L');
  const mat = `matrix(${M.map(f).join(' ')})`;
  let s = `<ellipse cx="${cx}" cy="${cy + t + 2}" rx="${f(w * 0.75)}" ry="${f(d * K * 0.75)}" fill="${P.shadow}"/>`;
  s += `<path d="M${poly(hull(all))}Z" fill="${P.stock}" stroke="${P.stockEdge}" stroke-width=".8"/>`;
  /* The spine is the cover's colour all the way down its edge. */
  const sp = [at(-w / 2, -d / 2), at(-w / 2, d / 2), at(-w / 2, d / 2, t), at(-w / 2, -d / 2, t)];
  s += `<path d="M${poly(sp)}Z" fill="${P.ink.side}"/>`;
  s += `<g transform="${mat}"><rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" rx="3" fill="${P.ink.top}"/>`;
  s += `<rect x="${-w / 2}" y="${-d / 2}" width="6" height="${d}" rx="2" fill="${P.ink.side}"/>`;
  if (!o.small) s += `<rect x="${-w / 2 + 10}" y="${-d / 2 + 5}" width="${w - 15}" height="${d - 10}" rx="2" fill="none" stroke="${P.bone.inlay}" stroke-width="1.2"/>`;
  s += `<path d="${'M5 0C5 0 0 3.8 0 6.2 0 7.7 1.2 8.7 2.5 8.7 3.4 8.7 4.1 8.3 4.5 7.7L3.9 10H6.1L5.5 7.7C5.9 8.3 6.6 8.7 7.5 8.7 8.8 8.7 10 7.7 10 6.2 10 3.8 5 0 5 0Z'}" transform="translate(-6 -12) scale(2.4)" fill="${P.bone.top}"/></g>`;
  const rb = at(8, d / 2, t);
  s += `<path d="M${f(rb[0])} ${f(rb[1] - 1)}v7l3-2.5 3 2.5v-7Z" fill="${P.red.side}"/>`;
  return s;
}

Object.assign(SPOTS, {
  anteF: {
    name: 'Table ante', variant: 'F · five seats, no table', where: 'Boosters', status: 'round4',
    draw: (P, o) => {
      const pts = seats(48, 60, 31, 31 * K + 2, [90, 162, 234, 306, 18]);
      return pts.map((pt) => shadow(P, pt.x, 15, 6, pt.y + 0.5)).join('') +
        pts.map((pt, i) => chip(P, { cx: pt.x, by: pt.y, r: 12.5, h: 5, mat: 'red', small: o.small, phase: i * 9 })).join('');
    },
  },
  anteG: {
    name: 'Table ante', variant: 'G · six seats, no table', where: 'Boosters', status: 'round4',
    draw: (P, o) => {
      const pts = seats(48, 61, 33, 33 * K + 2, [30, 90, 150, 210, 270, 330]);
      return pts.map((pt) => shadow(P, pt.x, 12.5, 5, pt.y + 0.5)).join('') +
        pts.map((pt, i) => chip(P, { cx: pt.x, by: pt.y, r: 10.5, h: 4.5, mat: 'red', small: true, phase: i * 9 })).join('');
    },
  },
  boostersE: {
    name: 'Boosters', variant: 'E · the fire in an ink chip', where: 'Poker tools · tile', status: 'round4',
    draw: (P, o) =>
      shadow(P, 49, 26) +
      standingChip(P, { cx: 46, by: GROUND, r: 27, mat: 'ink', t: 6, small: true, glyph: (cx, cy) => flame(P, { cx, by: cy + 11, h: 25 }) }),
  },
  boostersF: {
    name: 'Boosters', variant: 'F · the fire in a bone chip', where: 'Poker tools · tile', status: 'round4',
    draw: (P, o) =>
      shadow(P, 49, 26) +
      standingChip(P, { cx: 46, by: GROUND, r: 27, mat: 'bone', t: 6, small: true, glyph: (cx, cy) => flame(P, { cx, by: cy + 11, h: 25 }) }),
  },
  sessionsI: {
    name: 'Sessions', variant: 'I · the book lying on the table', where: 'Home · tile', status: 'round4',
    draw: (P, o) => bookFlat(P, o, {}),
  },
  sessionsJ: {
    name: 'Sessions', variant: 'J · the book leaning', where: 'Home · tile', status: 'round4',
    draw: (P, o) => shadow(P, 54, 27) + `<g transform="rotate(10 50 84)">${book(P, o, { spade: P.bone.top, frame: P.bone.inlay, shadowed: false })}</g>`,
  },
  sessionsK: {
    name: 'Sessions', variant: 'K · the book turned, spine out', where: 'Home · tile', status: 'round4',
    draw: (P, o) => {
      const m = P.ink;
      let s = shadow(P, 50, 28);
      s += `<path d="M24 22L37 18V84L24 81Z" fill="${m.side}"/>`;
      s += `<path d="M24 31L37 28V32L24 35ZM24 68L37 69V73L24 72Z" fill="${P.bone.side}"/>`;
      s += `<path d="M37 18L72 23V80L37 84Z" fill="${m.top}"/>`;
      if (!o.small) s += `<path d="M42 25L67 28.6V75.5L42 78.6Z" fill="none" stroke="${P.bone.inlay}" stroke-width="1"/>`;
      s += `<g transform="matrix(1 .14 0 1 0 0)">${suit('spade', 46.5, 31.5, 15, P.bone.top)}</g>`;
      s += `<path d="M58 80.5V90L61 87.5 64 90V79.8Z" fill="${P.red.side}"/>`;
      return s;
    },
  },
  sessionsL: {
    name: 'Sessions', variant: 'L · the chip on the corner', where: 'Home · tile', status: 'round4',
    draw: (P, o) =>
      shadow(P, 50, 32) + calendar(P, o, {}) +
      standingChip(P, { cx: 70, by: 89, r: 13, mat: 'red', t: 0, small: true }),
  },
  sessionsM: {
    name: 'Sessions', variant: 'M · the chip is the date, with depth', where: 'Home · tile', status: 'round4',
    draw: (P, o) =>
      shadow(P, 48, 30) + calendar(P, o, { date: false }) +
      standingChip(P, { cx: 44, by: 75, r: 15, mat: 'red', t: 5, small: true, glyph: o.small ? undefined : (cx, cy) => text(cx, cy + 4.5, 13, P.red.mark, '20') }),
  },
  sessionsN: {
    name: 'Sessions', variant: 'N · the chip is the date, lying', where: 'Home · tile', status: 'round4',
    draw: (P, o) =>
      shadow(P, 48, 30) + calendar(P, o, { date: false }) +
      chip(P, { cx: 47, by: 72, r: 19, h: 7, mat: 'red', small: true, phase: 4, mark: o.small ? undefined : onFace(text(0, 8, 24, P.red.mark, '20', ' letter-spacing="-1"')) }),
  },
  straddleI: {
    name: 'Straddle', variant: 'I · the other way round', where: 'Boosters', status: 'round4',
    draw: (P, o) => seatStacks(P, o, [
      { x: 72, y: 51, n: 1, r: 10, h: 5 },
      { x: 33, y: 47, n: 2, r: 10.5, h: 5 },
      { x: 42, y: 76, n: 4, r: 14, h: 6 },
    ]),
  },
  straddleJ: {
    name: 'Straddle', variant: 'J · an arc away from you', where: 'Boosters', status: 'round4',
    draw: (P, o) => seatStacks(P, o, [
      { x: 19, y: 70, n: 1, r: 10, h: 5 },
      { x: 43, y: 56, n: 2, r: 10.5, h: 5 },
      { x: 71, y: 74, n: 4, r: 14.5, h: 6.2 },
    ]),
  },
  toolsF: {
    name: 'Poker tools', variant: 'F · the three tools', where: 'Home · tile', status: 'round4',
    draw: (P, o) =>
      shadow(P, 49, 36) +
      card(P, { cx: 50, by: 74, w: 30, h: 44, rot: 10, small: o.small, centre: (cx, cy) => text(cx, cy + 9, 24, P.red.side, '?') }) +
      standingChip(P, { cx: 26, by: 87, r: 15, mat: 'bone', t: 4, small: true, glyph: (cx, cy) => `<g transform="translate(${cx} ${cy}) scale(.6)">${pct(P.ink.top)}</g>` }) +
      standingChip(P, { cx: 68, by: 88, r: 15, mat: 'ink', t: 4, small: true, glyph: (cx, cy) => flame(P, { cx, by: cy + 6.5, h: 14 }) }),
  },
  toolsG: {
    name: 'Poker tools', variant: 'G · the ruling and the odds, the other way', where: 'Home · tile', status: 'round4',
    draw: (P, o) =>
      shadow(P, 48, 32) +
      card(P, { cx: 58, by: GROUND - 3, w: 36, h: 52, rot: -12, small: o.small, centre: (cx, cy) => text(cx, cy + 10, 28, P.red.side, '?') }) +
      standingChip(P, { cx: 32, by: GROUND + 1, r: 18, mat: 'bone', t: 5, small: true, glyph: (cx, cy) => `<g transform="translate(${cx} ${cy}) scale(.72)">${pct(P.ink.top)}</g>` }),
  },
  toolsH: {
    name: 'Poker tools', variant: 'H · the ruling and the bomb', where: 'Home · tile', status: 'round4',
    draw: (P, o) =>
      shadow(P, 48, 32) +
      card(P, { cx: 38, by: GROUND - 3, w: 36, h: 52, rot: -9, small: o.small, centre: (cx, cy) => text(cx, cy + 10, 28, P.red.side, '?') }) +
      bomb(P, { cx: 63, cy: 69, r: 15, small: o.small }),
  },
});

/* ── round 5, 20 November: the owner's fourth review ────────────────────── */

/* The three approved tools as parts: Rulings' card, Calculator's chip, Boosters' chip. */
const toolCard = (P, o, cx, by, h, rot) => card(P, { cx, by, w: h * 0.7, h, rot, small: o.small, centre: (x, y) => text(x, y + h * 0.19, h * 0.56, P.red.side, '?') });
const pctChip = (P, cx, by, r) => standingChip(P, { cx, by, r, mat: 'bone', t: r * 0.26, small: true, glyph: (x, y) => `<g transform="translate(${x} ${y}) scale(${f(r / 25)})">${pct(P.ink.top)}</g>` });
const fireChip = (P, cx, by, r) => standingChip(P, { cx, by, r, mat: 'ink', t: r * 0.24, small: true, glyph: (x, y) => flame(P, { cx: x, by: y + r * 0.42, h: r * 0.93 }) });

Object.assign(SPOTS, {
  sessionsO: {
    name: 'Sessions', variant: 'O · the chip on the sheet', where: 'Home · tile', status: 'round5',
    draw: (P, o) => shadow(P, 48, 30) + calendar(P, o, { dateX: 39 }) + standingChip(P, { cx: 62, by: 78, r: 8.5, mat: 'red', t: 0, small: true }),
  },
  sessionsP: {
    name: 'Sessions', variant: 'P · the chip on the sheet, with depth', where: 'Home · tile', status: 'round5',
    draw: (P, o) => shadow(P, 48, 30) + calendar(P, o, { dateX: 39 }) + standingChip(P, { cx: 60, by: 78, r: 8.5, mat: 'red', t: 3, small: true }),
  },
  toolsI: {
    name: 'Poker tools', variant: 'I · the chips together in front', where: 'Home · tile', status: 'round5',
    draw: (P, o) => shadow(P, 48, 34) + toolCard(P, o, 48, 70, 46, 6) + pctChip(P, 37, 89, 15) + fireChip(P, 61, 90, 15),
  },
  toolsJ: {
    name: 'Poker tools', variant: 'J · a diagonal', where: 'Home · tile', status: 'round5',
    draw: (P, o) => shadow(P, 50, 36) + toolCard(P, o, 30, 72, 46, -8) + pctChip(P, 52, 80, 14) + fireChip(P, 71, 89, 14),
  },
  toolsK: {
    name: 'Poker tools', variant: 'K · the card in front', where: 'Home · tile', status: 'round5',
    draw: (P, o) => shadow(P, 48, 36) + pctChip(P, 25, 74, 15) + fireChip(P, 69, 74, 15) + toolCard(P, o, 48, 88, 48, 4),
  },
  toolsL: {
    name: 'Poker tools', variant: 'L · in a row', where: 'Home · tile', status: 'round5',
    draw: (P, o) => shadow(P, 48, 42, 10, 82) + toolCard(P, o, 19, 82, 34, -6) + pctChip(P, 47, 83, 13) + fireChip(P, 75, 83, 13),
  },
});

/* ── round 6, 20 November: the owner's fifth review ─────────────────────── */

/** The calendar, scaled, with its foot at (x, y): for standing it on something. */
const calendarAt = (P, o, x, y, sc, opts = {}) =>
  `<g transform="translate(${f(x)} ${f(y)}) scale(${sc}) translate(-47 -80)">${calendar(P, o, opts)}</g>`;

Object.assign(SPOTS, {
  sessionsQ: {
    name: 'Sessions', variant: 'Q · the calendar on two chips', where: 'Home · tile', status: 'round6',
    draw: (P, o) => {
      const top = 86 - 2 * 6.5;
      return shadow(P, 48, 34, 11, 86) +
        stack(P, { cx: 48, by: 86, r: 31, h: 6.5, mats: ['ink', 'red'], wobble: [0, 1], small: true }) +
        calendarAt(P, o, 48, top + 2, 0.82);
    },
  },
  sessionsR: {
    name: 'Sessions', variant: 'R · the calendar on a stack', where: 'Home · tile', status: 'round6',
    draw: (P, o) => {
      const top = 88 - 3 * 6;
      return shadow(P, 48, 30, 10, 88) +
        stack(P, { cx: 48, by: 88, r: 27, h: 6, mats: ['ink', 'red', 'ink'], wobble: [0, 1, -0.6], small: true }) +
        calendarAt(P, o, 48, top + 2, 0.74);
    },
  },
  sessionsS: {
    name: 'Sessions', variant: 'S · a stack on the corner', where: 'Home · tile', status: 'round6',
    draw: (P, o) =>
      shadow(P, 52, 32) + calendar(P, o, { dateX: 44 }) +
      stack(P, { cx: 70, by: 89, r: 13, h: 5, mats: ['ink', 'red', 'red'], wobble: [0, 0.8, -0.6], small: true }),
  },
  toolsM: {
    name: 'Poker tools', variant: 'M · three cards, one tool each', where: 'Home · tile', status: 'round6',
    draw: (P, o) => {
      const c = (cx, rot, centre) => card(P, { cx, by: GROUND - 2, w: 31, h: 45, rot, small: o.small, centre });
      return shadow(P, 48, 32) +
        c(34, -16, (x, y) => `<g transform="translate(${x - 4} ${y}) scale(.55)">${pct(P.ink.top)}</g>`) +
        c(62, 16, (x, y) => flame(P, { cx: x + 4, by: y + 9, h: 18 })) +
        c(48, 0, (x, y) => text(x, y + 9, 26, P.red.side, '?'));
    },
  },
  toolsN: {
    name: 'Poker tools', variant: 'N · leaning together', where: 'Home · tile', status: 'round6',
    draw: (P, o) =>
      shadow(P, 48, 30) + toolCard(P, o, 46, 82, 54, 0) +
      `<g transform="rotate(-10 30 86)">${pctChip(P, 30, 86, 17)}</g>` +
      `<g transform="rotate(10 64 86)">${fireChip(P, 64, 86, 17)}</g>`,
  },
  toolsO: {
    name: 'Poker tools', variant: 'O · the card and a stack', where: 'Home · tile', status: 'round6',
    draw: (P, o) =>
      shadow(P, 48, 32) + toolCard(P, o, 34, 80, 50, -8) +
      chip(P, { cx: 62, by: 86, r: 17, h: 6.5, mat: 'ink', small: true, phase: 6 }) +
      chip(P, { cx: 63, by: 79.5, r: 17, h: 6.5, mat: 'bone', small: true, phase: 20, mark: onFace(`<g transform="scale(1.15)">${pct(P.ink.top)}</g>`) }),
  },
});

/* ── round 7, 20 November: the owner's sixth review ─────────────────────── */

Object.assign(SPOTS, {
  sessionsT: {
    name: 'Sessions', variant: 'T · a stack on the corner, date centred', where: 'Home · tile', status: 'round7',
    draw: (P, o) =>
      shadow(P, 52, 32) + calendar(P, o, {}) +
      stack(P, { cx: 70, by: 89, r: 13, h: 5, mats: ['ink', 'red', 'red'], wobble: [0, 0.8, -0.6], small: true }),
  },
  sessionsU: {
    name: 'Sessions', variant: 'U · a taller stack on the corner', where: 'Home · tile', status: 'round7',
    draw: (P, o) =>
      shadow(P, 52, 32) + calendar(P, o, {}) +
      stack(P, { cx: 75, by: 90, r: 11.5, h: 5, mats: ['ink', 'red', 'ink', 'red', 'red'], wobble: [0, 0.8, -0.6, 0.5, -0.4], small: true }),
  },
  sessionsV: {
    name: 'Sessions', variant: 'V · a stack on the other corner', where: 'Home · tile', status: 'round7',
    draw: (P, o) =>
      shadow(P, 44, 32) + calendar(P, o, {}) +
      stack(P, { cx: 24, by: 89, r: 13, h: 5, mats: ['ink', 'red', 'red'], wobble: [0, -0.8, 0.6], small: true }),
  },
  sessionsW: {
    name: 'Sessions', variant: 'W · a stack on each corner', where: 'Home · tile', status: 'round7',
    draw: (P, o) =>
      shadow(P, 48, 38) + calendar(P, o, {}) +
      stack(P, { cx: 24, by: 89, r: 11.5, h: 4.5, mats: ['red', 'red'], wobble: [0, -0.7], small: true }) +
      stack(P, { cx: 71, by: 90, r: 12, h: 4.5, mats: ['ink', 'red', 'red', 'red'], wobble: [0, 0.8, -0.6, 0.5], small: true }),
  },
  toolsP: {
    name: 'Poker tools', variant: 'P · the fire chip on the % chip’s edge', where: 'Home · tile', status: 'round7',
    draw: (P, o) =>
      shadow(P, 48, 34) + toolCard(P, o, 28, 80, 48, -8) + fireChip(P, 74, 73, 13) + pctChip(P, 51, 88, 17),
  },
  toolsQ: {
    name: 'Poker tools', variant: 'Q · the fire chip balanced on top', where: 'Home · tile', status: 'round7',
    draw: (P, o) =>
      shadow(P, 48, 32) + toolCard(P, o, 31, 82, 50, -8) + pctChip(P, 62, 88, 16) +
      `<g transform="rotate(9 64 57)">${fireChip(P, 64, 57.5, 12.5)}</g>`,
  },
  toolsR: {
    name: 'Poker tools', variant: 'R · the fire chip standing on a lying % chip', where: 'Home · tile', status: 'round7',
    draw: (P, o) =>
      shadow(P, 48, 32) + toolCard(P, o, 30, 80, 50, -8) +
      chip(P, { cx: 62, by: 87, r: 18, h: 7, mat: 'bone', small: true, phase: 20, mark: onFace(`<g transform="scale(1.15)">${pct(P.ink.top)}</g>`) }) +
      fireChip(P, 66, 82, 14),
  },
});

export function spot(key, theme = 'light', { size = 96, small = size <= 44 } = {}) {
  const P = PALETTES[theme];
  return `<svg viewBox="4 12 88 88" width="${size}" height="${size}" aria-hidden="true">${SPOTS[key].draw(P, { small })}</svg>`;
}
