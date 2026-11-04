"""Build SPECS.md + tokens.json from extracted spec JSONs.
Usage: python3 -I summarize.py <specs_dir> <index_json> <out_dir>"""
import sys, json, os, glob, collections, re

specs_dir, index_path, out = sys.argv[1:4]
index = {f['id'][-6:]: f for f in json.load(open(index_path))['files']}

def device(w, h):
    s = {(640, 1136): 'iPhone 5/5s portrait @2x (320x568pt)', (1136, 640): 'iPhone 5/5s landscape @2x (568x320pt)',
         (750, 1334): 'iPhone 6 @2x', (1242, 2208): 'iPhone 6 Plus portrait @3x (414x736pt)',
         (2208, 1242): 'iPhone 6 Plus landscape @3x (736x414pt)', (1280, 800): 'Android tablet/phone landscape (mdpi 1280x800)',
         (768, 1280): 'WP/Android portrait'}
    return s.get((w, h), 'board / multi-frame canvas')

def walk(nodes, parent_visible=True, path=''):
    for n in nodes:
        vis = parent_visible and n.get('visible', True)
        yield n, vis, path
        yield from walk(n.get('children', []), vis, path + n['name'] + ' / ')

fonts = collections.Counter(); sizes = collections.Counter(); colors = collections.Counter(); fills = collections.Counter()
texts_all = []
rows = []
per_file = []
for jf in sorted(glob.glob(os.path.join(specs_dir, '*.json'))):
    d = json.load(open(jf))
    key = os.path.basename(jf)[:6]
    meta = index.get(key, {})
    w, h = d['canvas']
    nlayers = ntext = 0
    texts = []; shapes = []
    for n, vis, path in walk(d['layers']):
        nlayers += 1
        if n.get('fill') and vis:
            fills[n['fill']] += 1
            if n['kind'] == 'shape' and n['size'][0] * n['size'][1] > 0:
                shapes.append((path + n['name'], n['bbox'], n['fill'], n.get('opacity')))
        t = n.get('type')
        if t:
            ntext += 1
            for r in t.get('runs', []):
                f = (r.get('font') or '').strip("'")
                sz = r.get('size')
                sc = t.get('transform_scale')
                if sz and sc: sz = round(sz * sc[1], 1)
                if f: fonts[f] += 1
                if f and sz: sizes[(f, sz)] += 1
                if r.get('color'): colors[r['color']] += 1
            if vis and t.get('text', '').strip():
                r0 = (t.get('runs') or [{}])[0]
                sz = r0.get('size'); sc = t.get('transform_scale')
                if sz and sc: sz = round(sz * sc[1], 1)
                texts.append((t['text'].replace('\r', ' / ').replace('\n', ' / ').strip()[:70], n['bbox'],
                               (r0.get('font') or '').strip("'"), sz, r0.get('color'), t.get('align')))
    folder = meta.get('parentId', '')[-6:]
    rows.append((os.path.basename(jf)[:-5], meta.get('title', '?'), meta.get('modifiedTime', '')[:10], f'{w}x{h}', device(w, h), nlayers, ntext))
    per_file.append((os.path.basename(jf)[:-5], meta, d, texts, shapes, device(w, h)))
    texts_all.extend(texts)

tokens = {'fonts': fonts.most_common(), 'font_sizes_px': [[f, s, c] for (f, s), c in sizes.most_common(60)],
          'text_colors': colors.most_common(40), 'shape_fills': fills.most_common(40)}
json.dump(tokens, open(os.path.join(out, 'tokens.json'), 'w'), indent=1, ensure_ascii=False)

L = []
L.append('# Poker Chips (2014–15) — specs extracted from the PSDs\n')
L.append('Machine-extracted from the Photoshop sources with `psd-tools`. Coordinates are **canvas pixels** '
         '(divide by 2 for @2x iPhone 5 frames, by 3 for @3x 6 Plus frames to get points). '
         'Per-file JSON next to this file has the full layer tree (every layer, bbox, opacity, blend, '
         'text runs, fills, effects); `img/` has a flattened render of each file.\n')
L.append('## Files\n')
L.append('| spec | PSD | modified | canvas | target | layers | text layers |')
L.append('|---|---|---|---|---|---|---|')
for r in rows:
    L.append('| `%s` | %s | %s | %s | %s | %d | %d |' % r)
L.append('\n## Tokens across all files\n')
L.append('### Fonts (text runs using each)\n')
for f, c in fonts.most_common(): L.append(f'- `{f}` — {c}')
L.append('\n### Font sizes in canvas px (font, size, uses) — top 40\n')
L.append('| font | px | uses |'); L.append('|---|---|---|')
for (f, s), c in sizes.most_common(40): L.append(f'| {f} | {s} | {c} |')
L.append('\n### Text colours\n')
L.append(', '.join(f'`{c}` ×{n}' for c, n in colors.most_common(30)))
L.append('\n\n### Shape fill colours\n')
L.append(', '.join(f'`{c}` ×{n}' for c, n in fills.most_common(30)))
L.append('\n\n## Per file\n')
for name, meta, d, texts, shapes, dev in per_file:
    L.append(f"### {meta.get('title', name)} — `{name}`\n")
    L.append(f"Canvas {d['canvas'][0]}×{d['canvas'][1]} · {dev} · modified {meta.get('modifiedTime','')[:10]} · ![render](img/{name}.jpg)\n")
    if texts:
        L.append('| text | x,y,w,h | font | px | colour | align |'); L.append('|---|---|---|---|---|---|')
        seen = set()
        for t, bb, f, sz, col, al in texts[:120]:
            k = (t, tuple(bb))
            if k in seen: continue
            seen.add(k)
            t = t.replace('|', '\\|')
            L.append(f'| {t} | {bb[0]},{bb[1]},{bb[2]-bb[0]},{bb[3]-bb[1]} | {f} | {sz} | {col or ""} | {al or ""} |')
        if len(texts) > 120: L.append(f'\n_…{len(texts)-120} more text layers in the JSON._')
    if shapes:
        L.append('\n<details><summary>%d filled shapes</summary>\n' % len(shapes))
        L.append('| layer | x,y,w,h | fill | opacity |'); L.append('|---|---|---|---|')
        for p, bb, f, op in shapes[:150]:
            L.append(f'| {p.replace("|","/")[:80]} | {bb[0]},{bb[1]},{bb[2]-bb[0]},{bb[3]-bb[1]} | {f} | {op or ""} |')
        L.append('\n</details>\n')
    L.append('')
open(os.path.join(out, 'SPECS.md'), 'w').write('\n'.join(L))
print('files', len(rows), 'fonts', len(fonts), 'texts', len(texts_all))
