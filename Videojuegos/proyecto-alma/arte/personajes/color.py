"""Disciplina de color y limpieza de sprites recortados (dirección de arte v6: color solo con significado).

- disciplina(rgba, acentos): pasa a gris todo lo que no esté en los tonos permitidos de ese personaje.
- sin_islas(rgba): borra los trazos sueltos que no tocan la figura (restos de repintados).
- sin_halo_verde(rgb): lleva al verde de fondo los brillos verdosos que deja un repintado alrededor de la figura.
"""
import numpy as np
from PIL import Image, ImageDraw

# (tono inicial, tono final, saturación mínima), en grados
TEAL = (150, 205, 0.12)
ORO = (36, 62, 0.30)
ROJO_A, ROJO_B = (0, 12, 0.45), (340, 360, 0.45)
TRIAJE = (0, 360, 0.45)   # los cinco colores del brazalete: todo lo muy saturado

def disciplina(rgba, acentos=()):
    a = np.asarray(rgba.convert('RGBA')).astype(np.float32)
    hsv = np.asarray(rgba.convert('RGB').convert('HSV')).astype(np.float32)
    h, s = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
    keep = np.zeros(h.shape, bool)
    for h0, h1, smin in acentos:
        keep |= (h >= h0) & (h <= h1) & (s >= smin)
    gris = a[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)
    rgb = np.where(keep[..., None], a[..., :3], gris[..., None])
    return Image.fromarray(np.dstack([rgb, a[..., 3]]).clip(0, 255).astype(np.uint8), 'RGBA')

def sin_islas(rgba, umbral=40):
    """Conserva solo la pieza conectada más grande (la figura)."""
    al = np.asarray(rgba.getchannel('A'))
    small = Image.fromarray(((al > umbral) * 255).astype(np.uint8)).resize((al.shape[1] // 4, al.shape[0] // 4), Image.BOX)
    m = (np.asarray(small) > 60).astype(np.uint8)
    # etiquetado por relleno (a 1/4 de resolución, rápido sin scipy)
    lab = np.zeros(m.shape, np.int32); n = 0; sizes = {}
    H, W = m.shape
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]: continue
        n += 1; pila = [(y0, x0)]; lab[y0, x0] = n; c = 0
        while pila:
            y, x = pila.pop(); c += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; pila.append((yy, xx))
        sizes[n] = c
    if n <= 1: return rgba
    mayor = max(sizes, key=sizes.get)
    keep = Image.fromarray(((lab == mayor) * 255).astype(np.uint8)).resize(rgba.size, Image.NEAREST)
    keep = np.asarray(keep.filter(__import__('PIL.ImageFilter', fromlist=['x']).MaxFilter(9))) > 0
    out = np.asarray(rgba).copy(); out[..., 3] = np.where(keep, out[..., 3], 0)
    print(f'  islas borradas: {n - 1}')
    return Image.fromarray(out, 'RGBA')

def sin_halo_verde(path_in, path_out, margen=22):
    c = np.asarray(Image.open(path_in).convert('RGB')).astype(np.int32)
    b = max(8, c.shape[1] // 100)
    bg = np.median(np.concatenate([c[:b].reshape(-1, 3), c[:, :b].reshape(-1, 3), c[:, -b:].reshape(-1, 3)]), axis=0)
    g = (c[..., 1] > c[..., 0] + margen) & (c[..., 1] > c[..., 2] + margen)
    c[g] = bg
    Image.fromarray(c.astype(np.uint8)).save(path_out)
