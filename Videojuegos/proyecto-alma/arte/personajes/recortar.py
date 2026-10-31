"""Quita el fondo blanco de un sprite generado y lo deja en PNG con transparencia.

Rellena desde los bordes solo los píxeles casi blancos y conectados con el exterior, así que el blanco
de la bata (rodeado por el trazo del dibujo) no se borra.
Uso: python recortar.py <entrada.png> [salida.png] [umbral=244]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from collections import deque

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else src.replace('.png', '_recorte.png')
TH = int(sys.argv[3]) if len(sys.argv) > 3 else 244
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.int16)
H, W, _ = a.shape
near_white = (a.min(axis=2) >= TH) & ((a.max(axis=2) - a.min(axis=2)) <= 12)
bg = np.zeros((H, W), bool)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if near_white[y, x] and not bg[y, x]:
            bg[y, x] = True; q.append((y, x))
for y in range(H):
    for x in (0, W - 1):
        if near_white[y, x] and not bg[y, x]:
            bg[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and not bg[ny, nx] and near_white[ny, nx]:
            bg[ny, nx] = True; q.append((ny, nx))
# huecos de fondo atrapados (entre mechones, bajo el brazo): blanco puro encerrado y de tamaño pequeño
pure = (a.min(axis=2) >= 252) & ((a.max(axis=2) - a.min(axis=2)) <= 6) & ~bg
seen = np.zeros_like(pure)
for sy, sx in zip(*np.nonzero(pure)):
    if seen[sy, sx]:
        continue
    comp, q2 = [], deque([(sy, sx)]); seen[sy, sx] = True
    while q2:
        y, x = q2.popleft(); comp.append((y, x))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and pure[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q2.append((ny, nx))
    ys = [c[0] for c in comp]
    if 40 <= len(comp) <= 9000 and min(ys) < H * 0.3:     # solo en la zona del pelo
        for y, x in comp:
            bg[y, x] = True
alpha = Image.fromarray(((~bg) * 255).astype(np.uint8))
alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))   # borde limpio y suave
rgba = im.copy(); rgba.putalpha(alpha)
bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
if bbox and not (len(sys.argv) > 4 and sys.argv[4] == 'nocrop'):
    m = 12
    rgba = rgba.crop((max(0, bbox[0] - m), max(0, bbox[1] - m), min(W, bbox[2] + m), min(H, bbox[3] + m)))
rgba.save(out)
print('ok', out, rgba.size)
