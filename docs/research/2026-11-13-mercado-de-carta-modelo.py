"""Mercado de Carta, de abajo hacia arriba, con el DENUE del INEGI (apoya docs/research/2026-11-13-mercado-de-carta.md).

Sólo biblioteca estándar. Lee los CSV de la descarga masiva del sector 72 (DENUE 05_2026) y escribe SÓLO conteos agregados
(`2026-11-13-mercado-de-carta-tablas.json`): nunca nombres, razones sociales, direcciones, teléfonos ni correos. Los nombres
comerciales se normalizan en memoria para contar repeticiones y se descartan al terminar.

    python3 -I docs/research/2026-11-13-mercado-de-carta-modelo.py RUTA/denue_inegi_72_1.csv RUTA/denue_inegi_72_2.csv

Descarga (oficial, de libre uso con crédito): https://www.inegi.org.mx/contenidos/masiva/denue/denue_00_72_1_csv.zip y …_2_csv.zip
(el listado de la página <https://www.inegi.org.mx/app/descarga/?ti=6> arma esas URL con JavaScript).
Fuente: INEGI, DENUE 05_2026 (publicada el 20 de mayo de 2026; corregida el 29 de mayo y el 1 de julio en 13 registros, sin
cambiar el universo: nota técnica <https://www.inegi.org.mx/app/mapa/denue/nota.pdf>). Los cálculos y agrupaciones son nuestros
y no representan una postura del INEGI.

Cadenas: el DENUE no las marca. Método (aproximado, ver el informe para su error): se normaliza el nombre comercial (minúsculas,
sin acentos ni signos, sin «sucursal…» ni número final); se descartan los nombres hechos sólo de palabras genéricas del giro
(«taquería», «cocina económica», «sin nombre»…) y las franquicias de nutrición (Herbalife); un nombre es «de cadena posible» si
aparece en >= N establecimientos y en >= 3 entidades. Se reportan los conteos para N = 5, 10, 25 y 50 (sensibilidad).
"""

from __future__ import annotations

import csv
import importlib.util
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("universo", AQUI / "2026-11-13-universo-denue.py")
assert _spec and _spec.loader
universo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(universo)  # type: ignore[union-attr]
ESTRATOS = universo.ESTRATOS
MUNICIPIO_A_ZONA = universo.MUNICIPIO_A_ZONA

NUCLEO = (
    "722511",
    "722411",
    "722412",
)  # a la carta o comida corrida + bares/cantinas + centros nocturnos
EXPANSION = (
    "722512",
    "722513",
    "722514",
    "722515",
)  # mariscos, antojitos, tacos y tortas, cafeterías y neverías
PARA_LLEVAR = ("722516", "722517", "722518", "722519")  # autoservicio y comida para llevar: fuera
UMBRALES = (5, 10, 25, 50)

GENERICAS = set(
    """venta de comida antojitos sin nombre taqueria tacos taco cocina economica tamales tamal cenaduria mexicanos mexicana
    mexicano loncheria gorditas gordita elaboracion jugos licuados y cooperativa escolar tienda club nutricion nutricional
    herbalife cafeteria restaurantes restaurante restaurant con servicio preparacion comedor cena fonda hamburguesas hamburguesa
    hot dogs dog pizzas pizza pollo pollos asado asados rostizado tortas torta mariscos marisqueria pescados pescado cafe bar
    cantina cerveceria botanero el la los las del en al a para un una elotes elote esquites birria barbacoa carnitas pozole menudo
    comidas corridas corrida desayunos comedores helados neveria aguas frescas fruta frutas snack snacks refrescos bebidas
    cocteles coctel ceviche quesadillas quesadilla pambazos sopes tostadas flautas enchiladas panaderia pasteleria postres
    abarrotes casa familiar bebida alimentos alimento servicios multiples no micheladas pulque pulqueria cerveza botanas
    llevar otro tipo carta atole pozol empanadas tamaleria jugueria rosticeria torteria pozoleria menuderia puesto""".split()
)


def normalizar(texto: str) -> str:
    s = unicodedata.normalize("NFKD", texto.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.split(r"\b(sucursal|suc)\b", s)[0]
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\b(no|num|numero)\b\s*\d*", "", s)
    s = re.sub(r"\s+\d+\s*$", "", s)
    return " ".join(s.split())


def es_marca(nombre: str) -> bool:
    if "herbalife" in nombre:
        return False
    return any(t not in GENERICAS and not t.isdigit() for t in nombre.split())


def main(rutas: list[str]) -> int:
    # Segmentos: nombre -> (clases) ; se acumula por clase y estrato, con y sin sitio web.
    por_clase_estrato: dict[str, Counter] = defaultdict(Counter)
    web_clase_estrato: dict[str, Counter] = defaultdict(Counter)
    nombres: dict[str, Counter] = {"nucleo": Counter(), "todo": Counter()}
    entidades: dict[str, dict[str, set]] = {"nucleo": defaultdict(set), "todo": defaultdict(set)}
    zona_nucleo: dict[str, Counter] = defaultdict(Counter)
    total = 0
    for ruta in rutas:
        with open(ruta, encoding="latin-1", newline="") as f:
            for fila in csv.DictReader(f):
                clase = fila["codigo_act"].strip()
                if clase[:4] not in ("7224", "7225"):
                    continue
                total += 1
                est = fila["per_ocu"].strip()
                web = bool(fila["www"].strip())
                por_clase_estrato[clase][est] += 1
                if web:
                    web_clase_estrato[clase][est] += 1
                en_nucleo = clase in NUCLEO
                nom = normalizar(fila["nom_estab"])
                ent = fila["cve_ent"].strip()
                if es_marca(nom):
                    nombres["todo"][nom] += 1
                    entidades["todo"][nom].add(ent)
                    if en_nucleo:
                        nombres["nucleo"][nom] += 1
                        entidades["nucleo"][nom].add(ent)
                if en_nucleo:
                    z = MUNICIPIO_A_ZONA.get(ent + fila["cve_mun"].strip())
                    zona_nucleo[z or "(resto del país)"]["n"] += 1
                    if web:
                        zona_nucleo[z or "(resto del país)"]["con_sitio"] += 1

    def segmento(clases: tuple[str, ...]) -> dict:
        por_est = {e: sum(por_clase_estrato[c].get(e, 0) for c in clases) for e in ESTRATOS}
        web_est = {e: sum(web_clase_estrato[c].get(e, 0) for c in clases) for e in ESTRATOS}
        return {
            "clases": list(clases),
            "n": sum(por_est.values()),
            "con_sitio": sum(web_est.values()),
            "por_estrato": por_est,
            "con_sitio_por_estrato": web_est,
        }

    def cadenas(clave: str) -> dict:
        salida = {}
        for u in UMBRALES:
            marcas = [
                n for n, k in nombres[clave].items() if k >= u and len(entidades[clave][n]) >= 3
            ]
            salida[f">={u}"] = {
                "nombres": len(marcas),
                "establecimientos": sum(nombres[clave][n] for n in marcas),
            }
        return salida

    salida = {
        "fuente": "INEGI, DENUE 05_2026; agregados y agrupaciones nuestros",
        "total_7224_7225": total,
        "nucleo": segmento(NUCLEO),
        "expansion": segmento(EXPANSION),
        "para_llevar": segmento(PARA_LLEVAR),
        "por_clase": {c: segmento((c,)) for c in sorted(por_clase_estrato)},
        "cadenas_posibles_nucleo": cadenas("nucleo"),
        "cadenas_posibles_todo": cadenas("todo"),
        "por_zona_nucleo": {z: dict(c) for z, c in sorted(zona_nucleo.items())},
    }
    salida["embudo"] = embudo(salida)
    destino = AQUI / "2026-11-13-mercado-de-carta-tablas.json"
    destino.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"escrito {destino.name}: {total} establecimientos de 7224 y 7225")
    return 0


# --- Embudo y escenarios (aritmética nuestra sobre los conteos; los SUPUESTOS están marcados) -------------------------
PRECIO_SERVICIO_MXN = (
    349  # antes de IVA; docs/research/2026-11-13-estrategia-de-precios.md §3 (hipótesis heredada)
)
CAPACIDAD_HOY = 299  # gratuitos típicos con la forma de hoy + eventos, Hobby (disco 5 GB): docs/research/2026-11-13-anuncios-y-capa-del-comensal.md §0
CAPACIDAD_TOPE = 2116  # gratuitos típicos, eventos + Pro + 8 procesos: manda el límite de 10,000 conexiones de Railway (mismo documento)
ESCENARIOS_ACTIVOS = {  # SUPUESTO: restaurantes activos (gratuitos + de paga) a 12 y 24 meses; ver informe §2.4
    "bajo": {"12": 100, "24": 300},
    "medio": {"12": 300, "24": 1000},
    "alto": {"12": 1000, "24": 2116},
}
CONVERSION = (0.01, 0.03)  # SUPUESTO: la misma pareja de 1 % y 3 % del informe «Planos de Carta»


def embudo(t: dict) -> dict:
    nuc = t["nucleo"]
    n_nuc = nuc["n"]
    est = nuc["por_estrato"]
    web = nuc["con_sitio_por_estrato"]
    hasta_50 = sum(est[e] for e in ESTRATOS[:4])
    de_11_en_adelante = sum(est[e] for e in ESTRATOS[2:])
    web_11 = sum(web[e] for e in ESTRATOS[2:])
    cad = t["cadenas_posibles_nucleo"]
    servible = {u: n_nuc - v["establecimientos"] for u, v in cad.items()}
    zonas = t["por_zona_nucleo"]
    n_zonas = sum(v["n"] for z, v in zonas.items() if z != "(resto del país)")
    web_zonas = sum(v.get("con_sitio", 0) for z, v in zonas.items() if z != "(resto del país)")
    esc = {}
    for nombre, por_plazo in ESCENARIOS_ACTIVOS.items():
        esc[nombre] = {}
        for plazo, activos in por_plazo.items():
            esc[nombre][plazo] = {
                "activos": activos,
                "pct_del_nucleo": round(100 * activos / n_nuc, 2),
                "pct_del_servible_10": round(100 * activos / servible[">=10"], 2),
                "mrr_mxn": {
                    f"{c:.0%}": round(activos * c * PRECIO_SERVICIO_MXN) for c in CONVERSION
                },
                "anual_mxn": {
                    f"{c:.0%}": round(activos * c * PRECIO_SERVICIO_MXN * 12) for c in CONVERSION
                },
            }
    return {
        "mercado_total": t["total_7224_7225"],
        "nucleo": n_nuc,
        "nucleo_con_sitio": nuc["con_sitio"],
        "nucleo_sin_sitio": n_nuc - nuc["con_sitio"],
        "nucleo_hasta_50_personas": hasta_50,
        "nucleo_de_11_personas_o_mas": de_11_en_adelante,
        "nucleo_de_11_o_mas_con_sitio": web_11,
        "servible_sin_cadenas_posibles": servible,
        "nucleo_en_17_zonas": n_zonas,
        "nucleo_en_17_zonas_con_sitio": web_zonas,
        "expansion": t["expansion"]["n"],
        "techo_teorico_anual_mxn_si_todo_el_nucleo_pagara": n_nuc * PRECIO_SERVICIO_MXN * 12,
        "techo_teorico_anual_mxn_nucleo_11_o_mas": de_11_en_adelante * PRECIO_SERVICIO_MXN * 12,
        "capacidad_hoy": CAPACIDAD_HOY,
        "capacidad_tope_documentado": CAPACIDAD_TOPE,
        "escenarios": esc,
        "pct_alcanzable_3000_del_universo_7225": round(100 * 3000 / 741499, 2),
    }


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
