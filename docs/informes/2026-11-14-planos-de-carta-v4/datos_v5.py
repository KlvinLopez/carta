"""Cifras adicionales de la versión 5 (interactivo): todas salen de JSON y CSV del repositorio.

`cargar5()` devuelve lo de `datos.cargar()` más lo que necesitan las cajas nuevas. Cuando llegue el modelo de
escenarios de la sesión de análisis (`docs/research/2026-11-14-modelo-de-escenarios.mjs`) se incrusta tal cual
en `interactivo.tpl.html` y sustituye al motor provisional.
"""

from __future__ import annotations

import csv
import json

from datos import INV, V3, cargar


def cargar5() -> dict:
    d = cargar()
    anu = json.loads((V3 / "anuncios.json").read_text(encoding="utf-8"))
    eco = anu["economia"]
    # anuncios: pesos al mes por restaurante gratuito típico (bajo, medio, alto) [anuncios.json, economía]
    d["anuncios_mxn"] = {k: round(v, 1) for k, v in eco["ads_por_restaurante_mes_mxn"].items()}
    d["uso"] = {
        "visitas_mes_gratuito": round(
            eco["parametros"]["visitas_mes"]["gratuito"]
            if "visitas_mes" in eco["parametros"]
            else eco["parametros"]["visitas_app_mes"]["gratuito"]
        ),
        "comensales_dia_gratuito": round(eco["parametros"]["comensales_dia"]["gratuito"]),
        "comensales_dia_paga": round(eco["parametros"]["comensales_dia"]["paga"]),
    }
    # escalones con eventos: capacidad por recurso, gratuitos y de paga
    esc = []
    for e in anu["escalones"]:
        if e["forma"] != "eventos":
            continue
        esc.append({
            "clave": e["clave"], "procesos": e["procesos"], "plan": e["plan"],
            "cpu_g": e["gratuito"]["n_cpu"], "disco_g": e["gratuito"]["n_disco"], "con_g": e["gratuito"]["n_conexiones"],
            "cpu_p": e["paga"]["n_cpu"], "disco_p": e["paga"]["n_disco"], "con_p": e["paga"]["n_conexiones"],
            "usd": {"e1": 12, "e2": 30, "e3": 44, "e4": 54}[e["clave"]],  # [documento] anuncios-y-capa §0
        })  # fmt: skip
    d["escalones"] = esc
    # todos los planes publicados (CSV de funciones y precios, leído el 14 de noviembre)
    filas = list(
        csv.DictReader((INV / "2026-11-14-funciones-y-precios.csv").open(encoding="utf-8"))
    )
    d["mercado_planes"] = [
        {
            "proveedor": r["proveedor"].replace(" Cloud", " Cloud").strip(),
            "plan": r["plan"],
            "precio": int(r["precio_mxn_mes"]),
        }
        for r in filas
        if r["precio_mxn_mes"].strip().isdigit()
    ]
    # muestra de cartas (20 de 200): motivos [muestra-500-cartas §11.2]
    d["mercado"]["muestra_motivos"] = [
        ["Carta completa", 20], ["Carta parcial", 7], ["Sin carta en el sitio", 77], ["El sitio lo prohíbe (robots.txt)", 33],
        ["Carta sólo en imagen", 11], ["Sitio caído", 9], ["Otros motivos", 43],
    ]  # fmt: skip
    emb = json.loads((INV / "2026-11-13-mercado-de-carta-tablas.json").read_text(encoding="utf-8"))[
        "embudo"
    ]["escenarios"]
    d["mercado"]["metas"] = {
        k: [emb[k]["12"]["activos"], emb[k]["24"]["activos"]] for k in ("bajo", "medio", "alto")
    }
    d["matriz_trabajos_futuros"] = [
        "Pantalla de cocina",
        "Caja (POS)",
        "Pago en mesa",
        "Factura",
        "Reservas",
        "Reparto",
        "Inventario",
        "Reportes",
    ]
    return d


if __name__ == "__main__":
    x = cargar5()
    print(list(x), x["anuncios_mxn"], x["uso"], len(x["mercado_planes"]))
