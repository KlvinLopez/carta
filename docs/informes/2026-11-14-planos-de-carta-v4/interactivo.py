"""Construye `interactivo.html`: la versión interactiva del informe v4, en un solo archivo y sin conexión.

Incrusta las cifras de `datos.py` (JSON y CSV del repositorio), las referencias citadas y las dos fuentes de Carta.

    python3 docs/informes/2026-11-14-planos-de-carta-v4/interactivo.py
"""

from __future__ import annotations

import base64
import json
from pathlib import Path

from datos_v5 import cargar5

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
FUENTES = RAIZ / "frontend" / "public" / "fonts"

USADAS = [
    "inegi_endutih", "inegi_denue", "carta_mercado", "carta_muestra", "paginas_proveedores_14nov",
    "carta_precio", "carta_anuncios", "carta_capacidad", "railway_limites", "carta_disco",
    "cloudflare_r2_precios", "carta_tres_planes", "carta_estadistica", "calvin_posturas", "carta_planes",
    "carta_plan", "carta_ac011",
]  # fmt: skip


INV = RAIZ / "docs" / "research"


def modelo_js() -> str:
    """El modelo de escenarios tal cual: sólo se quita `export ` y se devuelven sus funciones en un objeto."""
    import re

    src = (INV / "2026-11-14-modelo-de-escenarios.mjs").read_text(encoding="utf-8")
    nombres = re.findall(r"^export (?:async )?(?:function|const) (\w+)", src, flags=re.M)
    cuerpo = re.sub(r"^export ", "", src, flags=re.M)
    return "(function(){\n" + cuerpo + "\nreturn {" + ",".join(nombres + ["PARAMS_SENS"]) + "};\n})()"


def b64(p: Path) -> str:
    return base64.b64encode(p.read_bytes()).decode()


def main() -> None:
    d = cargar5()
    refs_all = json.loads((AQUI / "datos" / "referencias.json").read_text(encoding="utf-8"))
    refs = {}
    for r in refs_all["referencias"]:
        if r["clave"] in USADAS:
            refs[r["clave"]] = {
                "corta": f"{r['corta']} {r['año']}" if r.get("corta") else f"{r['autor']}, {r['año'] or 's. f.'}",
                "año": r["año"], "titulo": r["titulo"], "url": r["url"], "publica": r["publica"],
            }  # fmt: skip
    js = "\n".join(p.read_text(encoding="utf-8") for p in sorted((AQUI / "js").glob("*.js")))
    plantilla = (AQUI / "interactivo.tpl.html").read_text(encoding="utf-8")
    html = (
        plantilla.replace("__JS__", js)
        .replace("__MODELO__", modelo_js())
        .replace("__PARAM__", (INV / "2026-11-14-parametros.json").read_text(encoding="utf-8"))
        .replace("__RECS__", (INV / "2026-11-14-recomendaciones.json").read_text(encoding="utf-8"))
        .replace(
            "__GLOS__", (INV / "2026-11-14-glosario-de-negocio.json").read_text(encoding="utf-8")
        )
        .replace("__DATOS__", json.dumps(d, ensure_ascii=False))
        .replace("__REFS__", json.dumps(refs, ensure_ascii=False))
        .replace("__SANS__", b64(FUENTES / "DMSans-variable-latin.woff2"))
        .replace("__SERIF__", b64(FUENTES / "DMSerifDisplay-Regular-latin.woff2"))
    )
    (AQUI / "interactivo.html").write_text(html, encoding="utf-8")
    print(f"escrito interactivo.html ({len(html) // 1024} KB)")


if __name__ == "__main__":
    main()
