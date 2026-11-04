"""Extract specs from a PSD: canvas, layer tree (bbox, visibility, opacity, blend),
text layers (string, font, size, colour, tracking, leading), fills, layer effects,
and a composite PNG. Usage: python3 -I extract.py <psd> <outdir>"""
import sys, json, os
from psd_tools import PSDImage

def hexc(vals):
    try:
        v = [float(x) for x in vals]
        if len(v) == 4:  # ARGB 0..1 from engine data
            a, r, g, b = v
            return '#%02X%02X%02X' % (round(r*255), round(g*255), round(b*255)) + ('' if a >= 0.999 else '/%d%%' % round(a*100))
    except Exception:
        pass
    return str(vals)

def desc_color(d):
    try:
        c = d.get(b'Clr ') or d
        r, g, b = c.get(b'Rd  '), c.get(b'Grn '), c.get(b'Bl  ')
        if r is not None:
            return '#%02X%02X%02X' % (round(float(r)), round(float(g)), round(float(b)))
    except Exception:
        pass
    return None

def text_info(layer):
    out = {'text': layer.text}
    try:
        ed = layer.engine_dict
        rf = layer.resource_dict
        fonts = [f.get('Name') for f in rf['FontSet']]
        runs = []
        rr = ed['StyleRun']['RunArray']
        lens = ed['StyleRun']['RunLengthArray']
        pos = 0
        for run, ln in zip(rr, lens):
            sd = run['StyleSheet']['StyleSheetData']
            seg = layer.text[pos:pos+int(ln)]; pos += int(ln)
            if not seg.strip():
                continue
            r = {'chars': seg[:40]}
            if 'Font' in sd: r['font'] = str(fonts[int(sd['Font'])])
            if 'FontSize' in sd: r['size'] = round(float(sd['FontSize']), 2)
            if 'FillColor' in sd: r['color'] = hexc(sd['FillColor']['Values'])
            if 'Tracking' in sd and float(sd['Tracking']): r['tracking'] = float(sd['Tracking'])
            if 'Leading' in sd and not sd.get('AutoLeading', True): r['leading'] = round(float(sd['Leading']), 2)
            if sd.get('FauxBold'): r['fauxBold'] = True
            if sd.get('FontCaps'): r['caps'] = int(sd['FontCaps'])
            runs.append(r)
        out['runs'] = runs
        # transform scale applies to the font size
        try:
            xx, xy, yx, yy, tx, ty = layer.transform
            if abs(xx - 1) > 1e-3 or abs(yy - 1) > 1e-3:
                out['transform_scale'] = [round(xx, 4), round(yy, 4)]
        except Exception:
            pass
        try:
            pr = ed['ParagraphRun']['RunArray'][0]['ParagraphSheet']['Properties']
            j = int(pr.get('Justification', 0)); out['align'] = ['left','right','center','justify'][j] if j < 4 else j
        except Exception:
            pass
    except Exception as e:
        out['error'] = repr(e)[:120]
    return out

def effects(layer):
    res = []
    try:
        for e in layer.effects:
            item = {'type': type(e).__name__, 'enabled': bool(getattr(e, 'enabled', True))}
            for attr in ('color', 'size', 'distance', 'angle', 'opacity', 'blend_mode', 'position', 'choke', 'gradient'):
                if hasattr(e, attr):
                    try:
                        v = getattr(e, attr)
                        if attr == 'color':
                            v = desc_color(v) or str(v)[:60]
                        elif attr == 'gradient':
                            v = str(v)[:80]
                        else:
                            v = str(v) if not isinstance(v, (int, float)) else v
                        item[attr] = v
                    except Exception:
                        pass
            res.append(item)
    except Exception:
        pass
    return res

def fill(layer):
    try:
        for key in (b'SoCo',):
            pass
        tb = layer.tagged_blocks
        if tb is None: return None
        from psd_tools.constants import Tag
        b = tb.get_data(Tag.SOLID_COLOR_SHEET_SETTING)
        if b is not None:
            return desc_color(b)
    except Exception:
        return None
    return None

def walk(group, depth=0):
    nodes = []
    for layer in group:
        n = {'name': layer.name, 'kind': layer.kind,
             'bbox': list(layer.bbox), 'visible': layer.is_visible()}
        w = layer.bbox[2] - layer.bbox[0]; h = layer.bbox[3] - layer.bbox[1]
        n['size'] = [w, h]
        if layer.opacity != 255: n['opacity'] = round(layer.opacity / 255 * 100)
        bm = str(layer.blend_mode).split('.')[-1]
        if bm not in ('NORMAL', 'PASS_THROUGH'): n['blend'] = bm
        if layer.kind == 'type': n['type'] = text_info(layer)
        f = fill(layer)
        if f: n['fill'] = f
        fx = effects(layer)
        if fx: n['effects'] = fx
        if layer.is_group():
            n['children'] = walk(layer, depth + 1)
        nodes.append(n)
    return nodes

def main(path, outdir):
    from psd_tools.psd.parse_limits import ParseLimits
    psd = PSDImage.open(path, parse_limits=ParseLimits(max_objects=50_000_000, max_nesting_depth=256))
    base = os.path.splitext(os.path.basename(path))[0]
    spec = {'file': os.path.basename(path), 'canvas': [psd.width, psd.height],
            'color_mode': str(psd.color_mode).split('.')[-1], 'depth': psd.depth,
            'layers': walk(psd)}
    try:
        from psd_tools.constants import Resource
        ri = psd.image_resources.get_data(Resource.RESOLUTION_INFO)
        spec['dpi'] = float(getattr(ri, 'horizontal', 0)) / 65536 if ri else None
    except Exception:
        pass
    with open(os.path.join(outdir, base + '.json'), 'w') as fh:
        json.dump(spec, fh, ensure_ascii=False, indent=1, default=str)
    try:
        img = psd.composite() if psd.has_preview() is False else psd.topil()
        if img is None: img = psd.composite()
        img.convert('RGB').save(os.path.join(outdir, base + '.png'))
    except Exception as e:
        try:
            psd.composite().convert('RGB').save(os.path.join(outdir, base + '.png'))
        except Exception as e2:
            print('composite failed', e2)
    def count(ns): return sum(1 + count(n.get('children', [])) for n in ns)
    print(base, spec['canvas'], 'layers=%d' % count(spec['layers']))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
