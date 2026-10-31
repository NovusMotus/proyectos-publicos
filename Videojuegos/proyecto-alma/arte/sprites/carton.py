"""Convierte un sprite con transparencia en una figura de cartón troquelada.

Genera:
  <nombre>_carton.png     -> sprite con borde blanco de troquel y textura de cartón impreso
  <nombre>_contorno.json  -> contorno simplificado (en píxeles) para construir la malla en Blender

Uso: python carton.py dani_grito.png [borde_px]
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

src = sys.argv[1]
BORDER = int(sys.argv[2]) if len(sys.argv) > 2 else 14
base = os.path.splitext(src)[0]
im = Image.open(src).convert('RGBA')
W, H = im.size
PAD = BORDER + 6
canvas = Image.new('RGBA', (W + 2 * PAD, H + 2 * PAD), (0, 0, 0, 0))
canvas.paste(im, (PAD, PAD))
W2, H2 = canvas.size

# --- máscara del troquel: silueta dilatada, redondeada y sin agujeros
alpha = canvas.getchannel('A').point(lambda a: 255 if a > 20 else 0)
m = alpha
if BORDER == 0:      # figura limpia: el contorno sigue la silueta sin borde blanco
    m = m.filter(ImageFilter.MaxFilter(3))
else:
    for _ in range(max(1, BORDER // 4)):
        m = m.filter(ImageFilter.MaxFilter(9))
    m = m.filter(ImageFilter.GaussianBlur(4)).point(lambda a: 255 if a > 110 else 0)
mask = np.array(m) > 0
ext = Image.fromarray((~mask).astype(np.uint8) * 255).copy()
ImageDraw.floodfill(ext, (0, 0), 128)            # rellena el exterior
mask = np.array(ext) != 128                        # todo lo que no es exterior (tapa agujeros)

# --- recorte de un borde inferior recto (la figura "se apoya" en su base)
bottom = H2 - PAD
mask[bottom:, :] = False

# --- contorno por seguimiento de Moore
def moore(msk):
    h, w = msk.shape
    mm = np.zeros((h + 2, w + 2), bool); mm[1:-1, 1:-1] = msk
    ys, xs = np.nonzero(mm)
    k = np.lexsort((xs, ys))[0]
    start = (int(ys[k]), int(xs[k]))
    dirs = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    b, c, pts = (start[0], start[1] - 1), start, [start]
    for _ in range(8 * h * w):
        db = dirs.index((b[0] - c[0], b[1] - c[1]))
        nxt = None
        for i in range(1, 9):
            d = (db + i) % 8
            p = (c[0] + dirs[d][0], c[1] + dirs[d][1])
            if mm[p]:
                nxt = p; break
            b = p
        if nxt is None:
            break
        c = nxt
        if c == start:
            break
        pts.append(c)
    return [(x - 1, y - 1) for y, x in pts]

def rdp(pts, eps):
    pts = np.asarray(pts, float)
    def _r(a, b):
        if b - a < 2:
            return [a, b]
        p0, p1 = pts[a], pts[b]; seg = p1 - p0; L = np.hypot(*seg) or 1e-9
        q = pts[a + 1:b] - p0
        d = np.abs(seg[0] * q[:, 1] - seg[1] * q[:, 0]) / L
        i = int(np.argmax(d))
        if d[i] > eps:
            left = _r(a, a + 1 + i); right = _r(a + 1 + i, b)
            return left[:-1] + right
        return [a, b]
    idx = _r(0, len(pts) - 1)
    return pts[idx].tolist()

contour = moore(mask)
# contorno cerrado: se parte en dos mitades por el punto más lejano al inicio
far = int(np.argmax([np.hypot(x - contour[0][0], y - contour[0][1]) for x, y in contour]))
simple = rdp(contour[:far + 1], 1.2)[:-1] + rdp(contour[far:] + [contour[0]], 1.2)[:-1]
print('contorno:', len(contour), '->', len(simple), 'puntos')

# --- textura frontal: borde blanco de troquel + ligero tono de cartón impreso
rng = np.random.default_rng(3)
front = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
white = Image.new('RGBA', (W2, H2), (246, 242, 232, 255))
if BORDER:
    front.paste(white, (0, 0), Image.fromarray(mask.astype(np.uint8) * 255))
front.alpha_composite(canvas)
arr = np.array(front).astype(np.int16)
noise = rng.normal(0, 5 if BORDER else 0, (H2, W2, 1)).astype(np.int16)
arr[..., :3] = np.clip(arr[..., :3] + noise, 0, 255)
out = Image.fromarray(arr.astype(np.uint8), 'RGBA')
d = ImageDraw.Draw(out)
if BORDER:
    d.line([tuple(p) for p in simple] + [tuple(simple[0])], fill=(180, 170, 150, 255), width=2)   # canto del troquel
out.save(base + '_carton.png')
json.dump({'width': W2, 'height': H2, 'bottom': bottom, 'points': simple}, open(base + '_contorno.json', 'w'))
print('ok', base + '_carton.png')
