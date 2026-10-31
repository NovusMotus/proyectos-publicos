"""Recorte de alta calidad para sprites en alta resolución.

1. Toma la máscara limpia calculada a baja resolución (recortar.py, que ya tapa los huecos del pelo).
2. La lleva a la resolución HD.
3. En la franja del borde exterior calcula una transparencia suave (el blanco del fondo que se mezcla
   con la línea pasa a ser transparencia) y descontamina el color: sin halo blanco ni dientes de sierra.

Uso: python recortar_hd.py <original_baja.png> <hd.png> <salida.png>
"""
import subprocess, sys, os, tempfile
import numpy as np
from PIL import Image, ImageFilter

low, hd, out = sys.argv[1:4]
HERE = os.path.dirname(os.path.abspath(__file__))

# 1) máscara limpia a baja resolución (sin recortar el lienzo)
tmp = os.path.join(tempfile.gettempdir(), 'alma_mask_low.png')
subprocess.run([sys.executable, os.path.join(HERE, 'recortar.py'), low, tmp, '252', 'nocrop'], check=True, capture_output=True)
mask_low = Image.open(tmp).getchannel('A')

# 2) a resolución HD
im = Image.open(hd).convert('RGB')
W, H = im.size
mask = mask_low.resize((W, H), Image.BILINEAR)
fg = np.asarray(mask) > 127
bg = ~fg

# 3) franja exterior: píxeles del personaje a menos de 4 px del fondo
bg_img = Image.fromarray((bg * 255).astype(np.uint8))
near_bg = np.asarray(bg_img.filter(ImageFilter.MaxFilter(9))) > 0
band = fg & near_bg

c = np.asarray(im).astype(np.float32)
a = np.clip((255.0 - c.min(axis=2)) / 215.0, 0.0, 1.0)          # "color a transparencia" contra blanco
alpha = np.where(bg, 0.0, 1.0)
alpha[band] = a[band]
# descontaminar: quitar la parte de blanco mezclada en los píxeles semitransparentes
safe = np.maximum(alpha, 1e-3)[..., None]
dec = 255.0 - (255.0 - c) / safe
col = np.where(band[..., None], np.clip(dec, 0, 255), c)
alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.5))
rgba = Image.fromarray(col.astype(np.uint8), 'RGB'); rgba.putalpha(alpha_img)
bbox = alpha_img.point(lambda v: 255 if v > 8 else 0).getbbox()
if bbox:
    m = 24
    rgba = rgba.crop((max(0, bbox[0] - m), max(0, bbox[1] - m), min(W, bbox[2] + m), min(H, bbox[3] + m)))
rgba.save(out, optimize=True)
print('ok', out, rgba.size)
