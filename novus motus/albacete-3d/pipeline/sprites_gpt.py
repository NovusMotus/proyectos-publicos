# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26", "scipy>=1.11"]
# ///
"""Personajes generados con GPT Images → atlas de sprites para la demo.

Fuentes (data/raw/personajes_gpt/, declaradas en personajes.json):
  - «hoja_modelo»: fila de N personajes en una pose (fondo blanco). Se recortan y se usa esa pose en todas las
    direcciones (la demo le añade un vaivén al andar). Provisional hasta tener su hoja de paso.
  - «hoja_paso»: rejilla 4 columnas x 3 filas (frente, perfil a la derecha, espalda; 4 fotogramas de paso).
Fondo: se quita el blanco conectado con el borde (se conservan los blancos rodeados de tinta).
Salida: web/data/personajes/atlas.webp (celdas de 256x256, 12 por personaje, un personaje por fila) + atlas.json.
Uso: uv run pipeline/sprites_gpt.py
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "personajes_gpt"
OUT = ROOT / "web" / "data" / "personajes"
OUT.mkdir(parents=True, exist_ok=True)
CW, CH, BASE = 256, 256, 6  # celda cuadrada (caben carritos y niños a hombros); los pies apoyan en CH - BASE
VPR = 1
SINTETIZAR_PERFIL = False  # experimental: rotación de piernas (deja costuras; desactivado)


def cutout(img):
    """Imagen → (RGBA sin fondo, máscara de primer plano). Admite PNG con transparencia real, fondo blanco
    o el damero gris «de transparencia» que GPT a veces pinta dentro de la imagen."""
    if img.mode in ("RGBA", "LA") and np.asarray(img.convert("RGBA"))[..., 3].min() < 250:
        rgba = np.asarray(img.convert("RGBA")).copy()
        fg = rgba[..., 3] > 128
        rgba[..., 3] = np.where(fg, 255, 0)
        return rgba, fg
    rgb = img.convert("RGB")
    a = np.asarray(rgb).astype(np.int16)
    neutral = (a.max(axis=2) - a.min(axis=2)) < 22
    white = neutral & (a.min(axis=2) > 228)
    # damero pintado: si el borde de la imagen es sobre todo gris neutro, el fondo es todo gris/blanco neutro claro
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    edge_neutral_gray = ((edge.max(axis=1) - edge.min(axis=1)) < 22) & (edge.min(axis=1) > 110) & (edge.min(axis=1) < 228)
    if edge_neutral_gray.mean() > 0.3:
        white = neutral & (a.min(axis=2) > 110)
    lab, _ = ndimage.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(border))
    fg = ndimage.binary_opening(fg, iterations=1)
    rgba = np.dstack([np.asarray(rgb), (fg * 255).astype(np.uint8)])
    return rgba, fg


def split_model_sheet(path, n):
    """Separa n personajes: componentes conexas y, si se tocan, corte por la columna más estrecha."""
    rgba, fg = cutout(Image.open(path))
    comp, m = ndimage.label(fg)
    sizes = ndimage.sum(np.ones_like(comp), comp, index=range(1, m + 1))
    groups = [{"mask": comp == (i + 1)} for i in range(m) if sizes[i] > 2500]
    for g in groups:
        xs = np.where(g["mask"].any(axis=0))[0]; g["x0"], g["x1"] = xs.min(), xs.max() + 1
    while len(groups) < n:
        gi = max(range(len(groups)), key=lambda i: groups[i]["x1"] - groups[i]["x0"])
        g = groups.pop(gi)
        w = g["x1"] - g["x0"]
        prof = g["mask"][:, g["x0"]:g["x1"]].sum(axis=0).astype(float)
        lo, hi = int(w * 0.2), int(w * 0.8)
        cut = g["x0"] + lo + int(np.argmin(ndimage.uniform_filter1d(prof, 9)[lo:hi]))
        left = g["mask"].copy(); left[:, cut:] = False
        right = g["mask"].copy(); right[:, :cut] = False
        # trozos sueltos junto al corte (una nariz, una mano) vuelven al personaje del otro lado
        for a_, b_ in ((left, right), (right, left)):
            lab, k = ndimage.label(a_)
            if k > 1:
                sz = ndimage.sum(np.ones_like(lab), lab, index=range(1, k + 1))
                main = int(np.argmax(sz)) + 1
                for j in range(1, k + 1):
                    if j == main:
                        continue
                    piece = lab == j
                    cols = np.where(piece.any(axis=0))[0]
                    if abs(cols.max() - (cut - 1)) <= 2 or abs(cols.min() - cut) <= 2:
                        a_[piece] = False; b_[piece] = True
        for mk in (left, right):
            xs = np.where(mk.any(axis=0))[0]
            groups.append({"mask": mk, "x0": xs.min(), "x1": xs.max() + 1})
    groups.sort(key=lambda t: t["x0"])
    out = []
    for g in groups:
        ys = np.where(g["mask"].any(axis=1))[0]
        box = (slice(ys.min(), ys.max() + 1), slice(g["x0"], g["x1"]))
        sub = rgba[box].copy(); sub[..., 3] = np.where(g["mask"][box], 255, 0)
        out.append(Image.fromarray(sub, "RGBA"))
    return out


def split_walk_sheet(path):
    """Rejilla 4x3 → 12 fotogramas (orden frente, perfil, espalda). Cada pieza se asigna a la casilla de su
    centro, así lo que se sale un poco de la casilla (un bolso, un carrito) no se corta."""
    rgba, fg = cutout(Image.open(path))
    H, W = fg.shape
    # separar fotogramas que se tocan: en cada frontera entre casillas, cortar por la línea con menos tinta (±15 %)
    fgc = fg.copy()
    for r in range(1, 3):
        y0 = int(H * r / 3); m = int(H * 0.15)
        for c in range(4):
            xs = slice(int(W * c / 4), int(W * (c + 1) / 4))
            ys = range(max(1, y0 - m), min(H - 1, y0 + m))
            yb = min(ys, key=lambda y: (fg[y, xs].sum(), abs(y - y0)))
            fgc[yb, xs] = False
    for c in range(1, 4):
        x0 = int(W * c / 4); m = int(W * 0.1)
        for r in range(3):
            ys_ = slice(int(H * r / 3), int(H * (r + 1) / 3))
            xr = range(max(1, x0 - m), min(W - 1, x0 + m))
            xb = min(xr, key=lambda x: (fg[ys_, x].sum(), abs(x - x0)))
            fgc[ys_, xb] = False
    comp, k = ndimage.label(fgc)
    sizes = ndimage.sum(np.ones_like(comp), comp, index=range(1, k + 1))
    cents = ndimage.center_of_mass(fgc, comp, range(1, k + 1))
    cells = [[] for _ in range(12)]
    for i in range(k):
        if sizes[i] < 150:
            continue
        cy, cx = cents[i]
        r = min(2, int(cy / (H / 3))); c = min(3, int(cx / (W / 4)))
        cells[r * 4 + c].append(i + 1)
    frames = []
    for labs in cells:
        keep = np.isin(comp, labs)
        ys, xs = np.where(keep)
        box = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        sub = rgba[box].copy(); sub[..., 3] = np.where(keep[box], 255, 0)
        # centro horizontal por el tercio superior (cabeza): el cuerpo no «baila» aunque se muevan piernas o carrito
        kb = keep[box]; top = kb[: max(1, kb.shape[0] // 3)]
        tx = np.where(top.any(axis=0))[0]
        frames.append({"img": Image.fromarray(sub, "RGBA"), "cx": (tx.min() + tx.max()) / 2, "h": kb.shape[0]})
    return frames



# ------------------------------------------------------------------ ciclo de paso sintetizado
# GPT dibuja los 4 fotogramas de cada vista casi iguales (siempre la misma pierna delante). Se rehacen a partir de uno:
#  - perfil: se localizan las dos piernas bajo la cadera y se desplazan en cizalla (el zapato conserva su forma y
#    orientación): u=0 pierna A delante, 0,5 piernas juntas (paso intermedio, pie que avanza levantado), 1 pierna B delante.
#  - frente y espalda: se reflejan SOLO las piernas respecto a la cadera (el cuerpo y los objetos no cambian de mano).
def find_legs(a, con_carro=False):
    """a: RGBA (h, w, 4). Devuelve (y_cadera, [mascara pierna 1, mascara pierna 2], x_torso) o None."""
    M = a[..., 3] > 0
    h, w = M.shape
    band = M[int(h * 0.42):int(h * 0.55)]
    cols = np.where(band.any(axis=0))[0]
    if not len(cols):
        return None
    x_torso = float(np.average(np.arange(w), weights=band.sum(axis=0) + 1e-6))
    foot_row = int(h * 0.86)
    best = None
    for y in range(int(h * 0.93), int(h * 0.38), -2):
        lab, n = ndimage.label(M[y:])
        if n < 2:
            break
        cand = []
        for i in range(1, n + 1):
            comp = lab == i
            rows = np.where(comp.any(axis=1))[0]
            if rows.min() == 0 and rows.max() + y >= foot_row:
                xs = np.where(comp.any(axis=0))[0]
                if con_carro and xs.max() - xs.min() > 0.42 * w:  # demasiado ancho para ser una pierna (carrito)
                    continue
                cand.append((abs(xs.mean() - x_torso), i))
        if len(cand) < 2:
            break
        cand.sort()
        best = (y, lab, [cand[0][1], cand[1][1]])
    if best is None:
        return None
    y, lab, ids = best
    legs = []
    for i in ids:
        m = np.zeros_like(M); m[y:] = lab == i
        legs.append(m)
    return y, legs, x_torso


def _paste_shifted(dst, src, mask, y0, dxf, dyf):
    """Copia los píxeles de 'mask' de src a dst desplazados por fila: dx = dxf(fila), dy = dyf(fila)."""
    h, w = mask.shape
    ys, xs = np.where(mask)
    for yy in np.unique(ys):
        sel = ys == yy
        dx, dy = int(round(dxf(yy))), int(round(dyf(yy)))
        ty = yy + dy
        if ty < 0 or ty >= h:
            continue
        tx = xs[sel] + dx
        ok = (tx >= 0) & (tx < w)
        dst[ty, tx[ok]] = src[yy, xs[sel][ok]]


def synth_side(img, con_carro=False):
    """4 fotogramas de perfil: cada pierna gira rígida sobre la cadera. u=0 original (pierna A delante),
    0,5 piernas bajo la cadera (paso intermedio, el cuerpo sube solo porque los pies siguen en el suelo),
    1 ángulos intercambiados (pierna B delante). La pierna cercana se dibuja siempre encima."""
    a = np.asarray(img.convert("RGBA"))
    r = find_legs(a, con_carro)
    if r is None:
        return None
    y_c, legs, _ = r
    h, w = a.shape[:2]
    feet, tops = [], []
    for l in legs:
        rows = np.where(l.any(axis=1))[0]
        low = l[rows.max() - max(2, int((rows.max() - y_c) * 0.15)):]
        feet.append((np.where(low.any(axis=0))[0].mean(), rows.max()))
        tops.append(np.where(l[y_c])[0].mean() if l[y_c].any() else np.where(l.any(axis=0))[0].mean())
    px, py = (tops[0] + tops[1]) / 2, float(y_c)
    ang = [np.degrees(np.arctan2(fx - px, fy - py)) for fx, fy in feet]  # + = pie por delante (mira a la derecha)
    front = int(np.argmax(ang))
    base = a.copy()
    for l in legs:
        base[l] = 0
    pad = max(h, w)
    out = []
    for u, swing in ((0.0, None), (0.5, 1 - front), (1.0, None), (0.5, front)):
        canvas = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
        canvas.alpha_composite(Image.fromarray(base, "RGBA"), (pad, pad))
        for li in (1 - front, front):
            layer = np.zeros_like(a); layer[legs[li]] = a[legs[li]]
            limg = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
            limg.alpha_composite(Image.fromarray(layer, "RGBA"), (pad, pad))
            rot = -2 * ang[li] * u  # grados: intercambia el ángulo en u=1
            if rot:
                # relleno de la cuña de la cadera: el muslo (cerca del pivote) barrido en abanico por debajo
                yy, xx = np.mgrid[0:h, 0:w]
                ll = legs[li]; ys_l = np.where(ll.any(axis=1))[0]
                near = ll & (np.hypot(xx - px, yy - py) < 0.35 * (ys_l.max() - y_c + 1))
                thigh = np.zeros_like(a); thigh[near] = a[near]
                timg = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
                timg.alpha_composite(Image.fromarray(thigh, "RGBA"), (pad, pad))
                for k in range(1, 8):
                    t2 = timg.rotate(rot * k / 8, resample=Image.NEAREST, center=(px + pad, py + pad))
                    canvas.alpha_composite(t2)
            limg = limg.rotate(rot, resample=Image.BICUBIC, center=(px + pad, py + pad))  # PIL: + = antihorario en pantalla
            if swing == li:  # pie que avanza: levantado en el paso intermedio
                limg = limg.transform(limg.size, Image.AFFINE, (1, 0, 0, 0, 1, h * 0.03), resample=Image.BICUBIC)
            la = np.asarray(limg).copy(); la[..., 3] = np.where(la[..., 3] > 110, 255, 0)
            canvas.alpha_composite(Image.fromarray(la, "RGBA"))
        bb = canvas.getbbox()
        out.append(canvas.crop(bb))
    return out


def synth_front(img, cx_head=None):
    """4 fotogramas de frente/espalda: original, bote, pies reflejados, bote. Se refleja respecto al eje de las piernas
    solo lo que toca el suelo por debajo de la rodilla (30 % inferior): bolsos, cestas y manos no cambian de lado."""
    a = np.asarray(img.convert("RGBA"))
    M = a[..., 3] > 0
    h, w = M.shape
    if cx_head is None:
        cx_head = w / 2
    ys_all = np.where(M.any(axis=1))[0]
    top, bot = ys_all.min(), ys_all.max()
    y_k = int(bot - 0.30 * (bot - top))
    lab, n = ndimage.label(M[y_k:])
    legs = np.zeros_like(M)
    for i in range(1, n + 1):
        comp = lab == i
        rows = np.where(comp.any(axis=1))[0]
        if rows.min() == 0 and rows.max() + y_k >= bot - 3:
            legs[y_k:] |= comp
    if not legs.any():
        return None
    # eje y anchura de las piernas: el tramo de la fila de la rodilla más cercano al centro de la cabeza
    row = M[y_k]
    runs, x = [], 0
    while x < w:
        if row[x]:
            x0 = x
            while x < w and row[x]:
                x += 1
            runs.append((x0, x - 1))
        x += 1
    if not runs:
        return None
    x0, x1 = min(runs, key=lambda r_: abs((r_[0] + r_[1]) / 2 - cx_head))
    axis, hw = (x0 + x1) / 2, (x1 - x0) / 2
    cols = np.arange(w)[None, :]
    legs &= np.abs(cols - axis) <= max(hw * 1.3, 6)  # bolsos y maletines a los lados no se reflejan
    m = a.copy(); m[legs] = 0
    ys, xx = np.where(legs)
    tx = np.round(2 * axis - xx).astype(int)
    ok = (tx >= 0) & (tx < w)
    m[ys[ok], tx[ok]] = a[ys[ok], xx[ok]]
    A, B = Image.fromarray(a, "RGBA"), Image.fromarray(m, "RGBA")
    return [A, A, B, B]


def rebuild_cycle(frames, sin_sintesis=(), con_carro=False):
    """frames: 12 (frente 0-3, perfil 4-7, espalda 8-11). Sustituye cada vista por su ciclo sintetizado."""
    out = list(frames)
    for vista, idx in (("frente", range(0, 4)), ("perfil", range(4, 8)), ("espalda", range(8, 12))):
        if vista in sin_sintesis:
            continue
        fr = [frames[i] for i in idx]
        if vista == "perfil" and not SINTETIZAR_PERFIL:
            # la rotación de piernas sobre dibujos planos deja costuras: se conservan los fotogramas de GPT con bote
            for k, i in enumerate(idx):
                out[i] = {**frames[i], "bote": k % 2 == 1}
            continue
        if vista == "perfil":
            # base: el fotograma con los pies más separados
            def spread(f):
                a = np.asarray(f["img"])[..., 3] > 0; low = a[int(a.shape[0] * 0.9):]
                xs = np.where(low.any(axis=0))[0]
                return xs.max() - xs.min() if len(xs) else 0
            b = max(fr, key=spread)
            imgs = synth_side(b["img"], con_carro)
        else:
            b = fr[0]
            imgs = synth_front(b["img"], b["cx"])
        if imgs is None:
            print(f"    aviso: {vista}: no se localizan las piernas; se dejan los fotogramas originales")
            continue
        for k, i in enumerate(idx):
            im = imgs[k]; al = np.asarray(im)[..., 3] > 0
            top = al[: max(1, al.shape[0] // 3)]; tx = np.where(top.any(axis=0))[0]
            out[i] = {"img": im, "cx": (tx.min() + tx.max()) / 2 if len(tx) else b["cx"], "h": im.height,
                      "bote": vista != "perfil" and k % 2 == 1}
    return out


def place(atlas, img, cell_index, scale, cx=None, lift=0):
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    im = img.resize((w, h), Image.LANCZOS)
    col, row = cell_index % (12 * VPR), cell_index // (12 * VPR)
    ox = col * CW + round(CW / 2 - (cx * scale if cx is not None else w / 2))
    oy = row * CH + CH - BASE - h - lift
    atlas.alpha_composite(im, (max(col * CW, ox), max(row * CH, oy)))


def main():
    reg = json.loads((SRC / "personajes.json").read_text(encoding="utf-8"))
    hojas = {}
    variantes = []
    for p in reg["personajes"]:
        if p.get("hoja_paso") and (SRC / p["hoja_paso"]).exists():
            fr = split_walk_sheet(SRC / p["hoja_paso"])
            print(f"  {p['id']}")
            fr = rebuild_cycle(fr, p.get("sin_sintesis", []), p["id"] in ("abueloCarrito", "abuelaCarro"))
            variantes.append({**p, "fr": fr, "animado": True})
        elif p.get("hoja_modelo"):
            key = (p["hoja_modelo"], reg["hojas_modelo"][p["hoja_modelo"]])
            if key not in hojas:
                hojas[key] = split_model_sheet(SRC / key[0], key[1])
            img = hojas[key][p["indice"]]
            variantes.append({**p, "fr": [{"img": img, "cx": None, "h": img.height}] * 12, "animado": False})
    rows = (len(variantes) + VPR - 1) // VPR
    atlas = Image.new("RGBA", (12 * VPR * CW, rows * CH), (0, 0, 0, 0))
    meta = []
    for vi, v in enumerate(variantes):
        # escala común por personaje: el fotograma más alto ocupa la celda (menos márgenes)
        hmax = max(f["h"] for f in v["fr"]); wmax = max(f["img"].width for f in v["fr"])
        scale = min((CH - BASE - 4) / hmax, (CW - 4) / wmax)
        order = [0, 1, 2, 3, 8, 9, 10, 11, 4, 5, 6, 7]  # atlas: frente, espalda, perfil
        for k in range(12):
            f = v["fr"][order[k]] if v["animado"] else v["fr"][0]
            place(atlas, f["img"], vi * 12 + k, scale, f["cx"], lift=int(CH * 0.018) if f.get("bote") else 0)
        meta.append({"id": v["id"], "animado": v["animado"], "alto": v.get("alto", 1.0), "fuente": v.get("hoja_paso") or v.get("hoja_modelo"),
                     "origen": v.get("origen"), "edad": v.get("edad"), "no_dice": v.get("no_dice", [])})
    atlas.save(ROOT / "data" / "build" / "personajes_atlas.png", optimize=True)  # fuente sin pérdida (no se publica)
    atlas.save(OUT / "atlas.webp", quality=90, method=6)
    (OUT / "atlas.png").unlink(missing_ok=True)
    (OUT / "atlas.json").write_text(json.dumps({"celda": [CW, CH], "vpr": VPR, "cols": 12 * VPR, "rows": rows, "variantes": meta,
        "generado_con": "GPT Images (OpenAI) a partir de prompts de Javier; recorte automático (pipeline/sprites_gpt.py)"}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(variantes)} personajes ({sum(v['animado'] for v in variantes)} animados) → atlas {atlas.width}x{atlas.height}")


if __name__ == "__main__":
    main()
