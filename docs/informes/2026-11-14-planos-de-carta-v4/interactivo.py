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
    "carta_plan", "carta_ac011", "meniu", "uber_terminos",
]  # fmt: skip


INV = RAIZ / "docs" / "research"


def modelo_js() -> str:
    """El modelo de escenarios tal cual: sólo se quita `export ` y se devuelven sus funciones en un objeto."""
    import re

    src = (INV / "2026-11-14-modelo-de-escenarios.mjs").read_text(encoding="utf-8")
    nombres = re.findall(r"^export (?:async )?(?:function|const) (\w+)", src, flags=re.M)
    cuerpo = re.sub(r"^export ", "", src, flags=re.M)
    return (
        "(function(){\n" + cuerpo + "\nreturn {" + ",".join(nombres + ["PARAMS_SENS"]) + "};\n})()"
    )


def podado(ruta: Path | None, claves: tuple[str, ...], datos: dict | None = None) -> str:
    """JSON incrustado con sólo las claves que el interactivo pinta (lo demás es de rondas viejas y no viaja)."""
    d = datos if datos is not None else json.loads(ruta.read_text(encoding="utf-8"))
    return json.dumps({k: d[k] for k in claves}, ensure_ascii=False)


def clases() -> list[dict]:
    """Establecimientos por clase SCIAN (DENUE, mayo de 2026), de mayor a menor."""
    d = json.loads((INV / "2026-11-13-mercado-de-carta-tablas.json").read_text(encoding="utf-8"))
    return sorted(({"clave": k, "n": v["n"]} for k, v in d["por_clase"].items()), key=lambda x: -x["n"])


def b64(p: Path) -> str:
    return base64.b64encode(p.read_bytes()).decode()


def js_seguro(texto: str) -> str:
    """JSON que viaja dentro de un <script>: `<` se escapa como \\u003c (sigue siendo JSON válido) para que un texto con `</script` o `<!--` no rompa la página."""
    return texto.replace("<", "\\u003c")


def main() -> None:
    d = cargar5()
    # la cifra de cartas «alcanzables» (1,780) quedó superada por la muestra de las 17 zonas: no viaja
    d["mercado"] = {k: v for k, v in d["mercado"].items() if k not in ("muestra", "muestra_motivos")}
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
        .replace("__PARAM__", js_seguro((INV / "2026-11-14-parametros.json").read_text(encoding="utf-8")))
        .replace("__RECS__", js_seguro(podado(INV / "2026-11-14-recomendaciones.json", ("decisiones",))))
        .replace(
            "__GLOS__", js_seguro((INV / "2026-11-14-glosario-de-negocio.json").read_text(encoding="utf-8"))
        )
        .replace("__BAND__", js_seguro(podado(INV / "2026-11-14-banderas-de-operacion.json", ("banderas", "escalones"))))
        .replace("__RYP__", js_seguro((INV / "2026-11-14-recursos-y-palancas.json").read_text(encoding="utf-8")))
        .replace("__CLASES__", js_seguro(json.dumps(clases())))
        .replace("__SEG__", js_seguro(podado(INV / "2026-11-14-segmentacion-datos.json", ("estratos", "parametros"))))
        .replace("__DATOS__", js_seguro(podado(None, ("mercado", "matriz", "mercado_planes", "inegi_tamano"), d)))
        .replace("__REFS__", js_seguro(json.dumps(refs, ensure_ascii=False)))
        .replace("__NEG__", js_seguro(podado(INV / "2026-11-17-como-gana-dinero-carta.json", ("plataformas_de_referencia", "secuencia"))))
        .replace("__SANS__", b64(FUENTES / "DMSans-variable-latin.woff2"))
        .replace("__SERIF__", b64(FUENTES / "DMSerifDisplay-Regular-latin.woff2"))
    )
    # ningún dato puede cerrar un <script> de más: sólo los de la plantilla y los del propio código
    assert html.count("</script") == plantilla.count("</script") + js.count("</script") + modelo_js().count("</script"), "un dato incrusta </script"
    (AQUI / "interactivo.html").write_text(html, encoding="utf-8")
    print(f"escrito interactivo.html ({len(html) // 1024} KB)")


if __name__ == "__main__":
    main()
