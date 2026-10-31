# /// script
# requires-python = ">=3.11"
# dependencies = ["pyproj>=3.6"]
# ///
"""Mobiliario urbano real de OpenStreetMap (© OpenStreetMap contributors, ODbL) → web/data/mobiliario.json.

Solo elementos mapeados en OSM, en su posición. Tamaños genéricos (OSM casi nunca trae altura): se declaran en la web.
"""
import json
from pathlib import Path

from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
WEB = ROOT / "web" / "data"


def main():
    meta = json.loads((WEB / "meta.json").read_text(encoding="utf-8"))
    oe, on = meta["origin_epsg25830"]
    tr = Transformer.from_crs("EPSG:4326", "EPSG:25830", always_xy=True)
    d = json.loads((RAW / "osm_mobiliario.json").read_text(encoding="utf-8"))

    def dm(lat, lon):
        e, n = tr.transform(lon, lat)
        return [round((e - oe) * 10), round((n - on) * 10)]

    out = {k: [] for k in ("arbol_frondoso", "arbol_conifera", "farola", "banco", "paso", "paso_via", "semaforo",
                           "parada_bus", "fuente", "papelera", "bicis")}
    for e in d["elements"]:
        t = e.get("tags", {})
        if e["type"] == "node":
            p = dm(e["lat"], e["lon"])
            if t.get("natural") == "tree":
                (out["arbol_conifera"] if t.get("leaf_type") == "needleleaved" else out["arbol_frondoso"]).extend(p)
            elif t.get("highway") == "street_lamp":
                out["farola"].extend(p)
            elif t.get("amenity") == "bench":
                out["banco"].extend(p)
            elif t.get("highway") == "crossing":
                out["paso"].extend(p)
            elif t.get("highway") == "traffic_signals":
                out["semaforo"].extend(p)
            elif t.get("highway") == "bus_stop":
                out["parada_bus"].extend(p)
            elif t.get("amenity") in ("fountain", "drinking_water"):
                out["fuente"].extend(p)
            elif t.get("amenity") == "waste_basket":
                out["papelera"].extend(p)
            elif t.get("amenity") == "bicycle_parking":
                out["bicis"].extend(p)
        elif e["type"] == "way" and t.get("footway") == "crossing" and "geometry" in e:
            g = e["geometry"]
            if len(g) >= 2:
                a, b = dm(g[0]["lat"], g[0]["lon"]), dm(g[-1]["lat"], g[-1]["lon"])
                out["paso_via"].extend(a + b)
        elif e["type"] == "way" and t.get("natural") == "tree_row" and "geometry" in e:
            for q in e["geometry"]:
                out["arbol_frondoso"].extend(dm(q["lat"], q["lon"]))
    res = {"timestamp": d["osm3s"]["timestamp_osm_base"], "atribucion": "© OpenStreetMap contributors (ODbL)",
           "recuentos": {k: (len(v) // 4 if k == "paso_via" else len(v) // 2) for k, v in out.items()}, **out}
    (WEB / "mobiliario.json").write_text(json.dumps(res, separators=(",", ":")), encoding="utf-8")
    print(res["recuentos"], f"{(WEB / 'mobiliario.json').stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
