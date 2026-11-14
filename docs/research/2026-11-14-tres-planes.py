"""Tres planes de Carta sacados de los datos: cobertura de topes, a quién empuja cada tope y economía.

Entradas: muestra de 148 cartas (estadística de cartas, CSV), estratos del núcleo DENUE, resultados de
2026-11-14-planes-y-corredor.py y del modelo de disco. Salida: 2026-11-14-tres-planes-datos.json y
…-cobertura-platillos.csv. Sólo biblioteca estándar. Marcas en el .md.
"""

import csv
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
fil = list(csv.DictReader(open(f"{AQUI}/2026-11-13-estadistica-de-cartas-y-personal-datos.csv")))
platillos = [(f["tipo"], int(f["total"])) for f in fil if f["total"].isdigit()]
tipos = sorted({t for t, _ in platillos})

# 1) cobertura de topes de platillos y a quién empuja (muestra de 148; sesgo: 147 son cartas de reparto)
cob = []
for tope in (40, 60, 80, 100, 120):
    fila = {
        "tope": tope,
        "total_cubre_pct": round(100 * sum(n <= tope for _, n in platillos) / len(platillos), 1),
    }
    fila["total_empuja_pct"] = round(100 - fila["total_cubre_pct"], 1)
    for t in tipos:
        v = [n for tt, n in platillos if tt == t]
        fila[f"{t}_empuja_pct"] = round(100 * sum(n > tope for n in v) / len(v), 1)
    cob.append(fila)
with open(f"{AQUI}/2026-11-14-cobertura-platillos.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(cob[0]))
    w.writeheader()
    w.writerows(cob)

# 2) núcleo por estrato de personal [medida: DENUE 05/2026, mercado-de-carta §2.1]
nucleo = {
    "0 a 5": 73193,
    "6 a 10": 17855,
    "11 a 30": 10809,
    "31 a 50": 2263,
    "51 a 100": 542,
    "101 a 250": 193,
    "251 o más": 27,
}
total = sum(nucleo.values())
assert total == 104882
tramos = {
    "Gratuito": nucleo["0 a 5"],
    "Servicio": nucleo["6 a 10"] + nucleo["11 a 30"],
    "Salón": nucleo["31 a 50"] + nucleo["51 a 100"] + nucleo["101 a 250"] + nucleo["251 o más"],
}
cobertura_nucleo = {k: dict(negocios=v, pct=round(100 * v / total, 1)) for k, v in tramos.items()}

# 3) economía por plan (pesos al mes antes de IVA). Pisos y costos: ver planes-y-corredor.py
corr = json.load(open(f"{AQUI}/2026-11-14-corredor-y-planes-datos.json"))
disco = json.load(open(f"{AQUI}/2026-11-14-disco-e-historial-datos.json"))
planes = {
    "Gratuito": dict(
        precio=0,
        perfil="chico",
        costo_var=1.0,
        fijo=3.0,
        mb_en_linea=disco["por_perfil"]["chico"]["mb_mes_total"] * 1
        + disco["por_perfil"]["chico"]["mb_fijos_por_restaurante"],
    ),
    "Servicio": dict(
        precio=349,
        perfil="mediano",
        costo_var=1.9,
        fijo=3.0,
        mb_en_linea=disco["por_perfil"]["mediano"]["mb_mes_sin_eventos"] * 3
        + disco["por_perfil"]["mediano"]["mb_mes_eventos"]
        + disco["por_perfil"]["mediano"]["mb_fijos_por_restaurante"],
    ),
    "Salón": dict(
        precio=549,
        perfil="grande",
        costo_var=7.5,
        fijo=3.0,
        mb_en_linea=disco["por_perfil"]["grande"]["mb_mes_sin_eventos"] * 6
        + disco["por_perfil"]["grande"]["mb_mes_eventos"]
        + disco["por_perfil"]["grande"]["mb_fijos_por_restaurante"],
    ),
}
STRIPE = lambda p: (0.036 * p + 3) * 1.16 if p else 0.0
for n, p in planes.items():
    soporte = 60.0 if p["precio"] else 0.0
    p["costo_total"] = round(p["costo_var"] + p["fijo"] + STRIPE(p["precio"]) + soporte, 1)
    p["margen_pct"] = round(100 * (1 - p["costo_total"] / p["precio"])) if p["precio"] else None
    p["mb_en_linea"] = round(p["mb_en_linea"], 1)
    # cuántos gratuitos «ocupa» uno de este plan: por costo variable y por disco
    p["gratuitos_por_costo"] = round((p["costo_var"] + p["fijo"]) / (1.0 + 3.0), 1)
    p["gratuitos_por_disco"] = round(p["mb_en_linea"] / planes["Gratuito"]["mb_en_linea"], 1)
    p["restaurantes_en_5gb_solo_de_este_plan"] = int((5e9 - 7_586_319) / (p["mb_en_linea"] * 1e6))

# 4) ingresos por cada 1,000 restaurantes registrados con la forma del núcleo y tres conversiones [supuesto]
escenarios = []
for conv in (0.03, 0.05, 0.10):
    n2 = 1000 * cobertura_nucleo["Servicio"]["pct"] / 100
    n3 = 1000 * cobertura_nucleo["Salón"]["pct"] / 100
    ing = conv * (n2 * 349 + n3 * 549)
    costo_fijo = 138 * 18.6188  # documento: planes-y-costo §0, 1,000 restaurantes
    escenarios.append(
        dict(
            conversion=conv,
            pagan_servicio=round(conv * n2),
            pagan_salon=round(conv * n3),
            ingreso_mes=round(ing),
            costo_fijo_1000_mes=round(costo_fijo),
            punto_de_equilibrio_pagantes=round(costo_fijo / 349, 1),
        )
    )

salida = dict(
    cobertura_platillos=cob, nucleo_por_plan=cobertura_nucleo, planes=planes, escenarios=escenarios
)
json.dump(
    salida, open(f"{AQUI}/2026-11-14-tres-planes-datos.json", "w"), ensure_ascii=False, indent=1
)
print(json.dumps(salida, ensure_ascii=False, indent=1))
