"""Recorte por croma: el personaje se genera sobre un fondo verde plano y aquí se elimina ese color.

A diferencia del recorte "desde fuera", también limpia los huecos cerrados (entre mechones, bajo el brazo),
porque ahí el fondo sigue siendo verde. Transparencia suave en el borde y eliminación del verde contaminado.
Uso: python recortar_croma.py <entrada.png> <salida.png> [t0=26] [t1=62] [radio_guiado=3] [reduccion=1.0]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
T0 = float(sys.argv[3]) if len(sys.argv) > 3 else 26.0
T1 = float(sys.argv[4]) if len(sys.argv) > 4 else 62.0
im = Image.open(src).convert('RGB')
c = np.asarray(im).astype(np.float32)
H, W, _ = c.shape

# color del fondo: mediana del marco exterior, con una rampa suave vertical (el fondo puede degradar un poco)
b = max(8, W // 100)
top = np.median(np.concatenate([c[:b, :].reshape(-1, 3), c[:, :b][: H // 2].reshape(-1, 3), c[:, -b:][: H // 2].reshape(-1, 3)]), axis=0)
bot = np.median(np.concatenate([c[:, :b][H // 2:].reshape(-1, 3), c[:, -b:][H // 2:].reshape(-1, 3)]), axis=0)
t = np.linspace(0, 1, H)[:, None, None]
bg = top[None, None, :] * (1 - t) + bot[None, None, :] * t
print('fondo arriba', top.round(), 'abajo', bot.round())

# distancia al fondo, con más peso a la diferencia de tono que a la de brillo
d = c - bg
lum = d.mean(axis=2, keepdims=True)
dist = np.sqrt(((d - lum) ** 2).sum(axis=2) * 1.6 + (lum[..., 0] ** 2) * 0.6)
alpha = np.clip((dist - T0) / (T1 - T0), 0.0, 1.0)

# limpiar motas: islas pequeñas de opacidad baja fuera de la figura
a_img = Image.fromarray((alpha * 255).astype(np.uint8))
solid = np.asarray(a_img.filter(ImageFilter.MaxFilter(5))) > 200
alpha = np.where(solid | (alpha > 0.6), alpha, 0.0)

# descontaminar el borde: quitar la parte de fondo mezclada y el verde sobrante
safe = np.maximum(alpha, 1e-3)[..., None]
unmixed = (c - (1 - alpha[..., None]) * bg) / safe
edge = (alpha < 0.999)[..., None]
col = np.where(edge, np.clip(unmixed, 0, 255), c)
g, r_, b_ = col[..., 1], col[..., 0], col[..., 2]
spill = np.clip(g - np.maximum(r_, b_) * 1.02, 0, None)        # verde que sobra respecto a rojo y azul
near_edge = np.asarray(Image.fromarray(((alpha < 0.98) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
col[..., 1] = np.where(near_edge, g - spill, g)

# --- refinado del borde con filtro guiado (sigue el contorno real del dibujo en vez de escalones de píxel)
def box(x, r):
    c1 = np.cumsum(np.pad(x, ((r + 1, r), (0, 0)), mode='edge'), axis=0); x = c1[2 * r + 1:] - c1[:-2 * r - 1]
    c2 = np.cumsum(np.pad(x, ((0, 0), (r + 1, r)), mode='edge'), axis=1); return (c2[:, 2 * r + 1:] - c2[:, :-2 * r - 1]) / (2 * r + 1) ** 2
def guided(I, p, r, eps):
    mI, mp = box(I, r), box(p, r)
    a_ = (box(I * p, r) - mI * mp) / (box(I * I, r) - mI * mI + eps)
    b_ = mp - a_ * mI
    return box(a_, r) * I + box(b_, r)
R = int(sys.argv[5]) if len(sys.argv) > 5 else 3
if R > 0:
    gray = (c @ np.array([0.299, 0.587, 0.114], np.float32)) / 255.0
    ref = np.clip(guided(gray, alpha.astype(np.float32), R, 2e-3), 0, 1)
    band = np.asarray(Image.fromarray(((alpha > 0.01) & (alpha < 0.99)).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(2 * R + 1))) > 0
    alpha = np.where(band, ref, alpha)

rgba = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB')
a8 = Image.fromarray((alpha * 255).astype(np.uint8))
rgba.putalpha(a8)
# --- supermuestreo: si la entrada viene a 4x, se reduce aquí con color premultiplicado (borde suave sin halo)
DOWN = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
if DOWN != 1.0:
    arr = np.asarray(rgba).astype(np.float32) / 255.0
    pm = Image.fromarray((np.dstack([arr[..., :3] * arr[..., 3:4], arr[..., 3:4]]) * 255).astype(np.uint8), 'RGBA')
    nw, nh = int(rgba.width * DOWN), int(rgba.height * DOWN)
    pm = np.asarray(pm.resize((nw, nh), Image.LANCZOS)).astype(np.float32) / 255.0
    al = np.clip(pm[..., 3:4], 1e-4, 1)
    rgb = np.clip(pm[..., :3] / al, 0, 1)
    rgba = Image.fromarray((np.dstack([rgb, pm[..., 3:4]]) * 255).astype(np.uint8), 'RGBA')
    a8 = rgba.getchannel('A'); W, H = rgba.size
bbox = a8.point(lambda v: 255 if v > 10 else 0).getbbox()
if bbox:
    m = 24
    rgba = rgba.crop((max(0, bbox[0] - m), max(0, bbox[1] - m), min(W, bbox[2] + m), min(H, bbox[3] + m)))
rgba.save(out, optimize=True)
print('ok', out, rgba.size)
