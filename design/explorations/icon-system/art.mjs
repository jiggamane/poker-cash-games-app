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

export function spot(key, theme = 'light', { size = 96, small = size <= 44 } = {}) {
  const P = PALETTES[theme];
  return `<svg viewBox="4 12 88 88" width="${size}" height="${size}" aria-hidden="true">${SPOTS[key].draw(P, { small })}</svg>`;
}
