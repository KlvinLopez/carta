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

disco = json.load(open(f"{AQUI}/2026-11-14-disco-e-historial-datos.json"))

# 3) economía por plan (pesos al mes). Piso con comisión sobre el precio con IVA y soporte [supuesto]
def piso(costo_var, precio, soporte=60.0):
    com = (0.036 * precio * 1.16 + 3.0) * 1.16 if precio else 0.0  # [documento: planes-y-costo §7.2]
    return costo_var + 3.0 + com + (soporte if precio else 0.0)


pf = disco["por_perfil"]
planes = {
    "Gratuito": dict(perfil="chico", costo_var=1.0, meses_visitas=1,
                     mb=pf["chico"]["mb_mes_total"] + pf["chico"]["mb_fijos_por_restaurante"]),
    "Servicio": dict(perfil="mediano", costo_var=1.9, meses_visitas=3,
                     mb=pf["mediano"]["mb_mes_sin_eventos"] * 3 + pf["mediano"]["mb_mes_eventos"] + pf["mediano"]["mb_fijos_por_restaurante"]),
    "Salón": dict(perfil="grande", costo_var=7.5, meses_visitas=6,
                  mb=pf["grande"]["mb_mes_sin_eventos"] * 6 + pf["grande"]["mb_mes_eventos"] + pf["grande"]["mb_fijos_por_restaurante"]),
}
precios_rango = {"Gratuito": [0], "Servicio": [249, 299, 349], "Salón": [249, 399, 549]}
for n, p in planes.items():
    p["mb_en_linea"] = round(p["mb"], 1)
    del p["mb"]
    p["costo_sin_soporte_ni_comision"] = round(p["costo_var"] + 3.0, 1)
    p["piso_por_precio"] = {str(x): round(piso(p["costo_var"], x), 1) for x in precios_rango[n] if x}
    p["margen_pct_por_precio"] = {str(x): round(100 * (1 - piso(p["costo_var"], x) / x)) for x in precios_rango[n] if x}
    p["gratuitos_por_costo"] = round((p["costo_var"] + 3.0) / 4.0, 1)
    p["gratuitos_por_disco"] = round(p["mb_en_linea"] / (pf["chico"]["mb_mes_total"] + pf["chico"]["mb_fijos_por_restaurante"]), 1)
    p["restaurantes_en_5gb_solo_de_este_plan"] = int((5e9 - 7_586_319) / (p["mb_en_linea"] * 1e6))

# 4) punto de equilibrio: costo fijo ÷ margen por pagante (precio − piso), no ÷ precio
COSTO_FIJO_1000 = 138 * 18.6188  # [documento: planes-y-costo §0, 138 USD con 1,000 restaurantes]
equilibrio = {}
for x in (249, 299, 349, 399, 549):
    pl = planes["Servicio"] if x < 399 else planes["Salón"]
    m = x - piso(pl["costo_var"], x)
    equilibrio[str(x)] = dict(margen_por_pagante=round(m, 1), pagantes_para_cubrir_fijo=round(COSTO_FIJO_1000 / m, 1))

# 5) ingresos por cada 1,000 registrados: la conversión se aplica a quienes REBASAN los topes del
# gratuito (10 mesas ≈ 39 %, rango 16–71 % de los restaurantes de servicio completo [supuesto: modelo de
# mesas]); de esos, el 3 % (de todos) rebasa 40 mesas y es Salón; el resto es Servicio
escenarios = []
for rebasan in (0.16, 0.39, 0.71):
    for conv in (0.05, 0.10, 0.20):
        n_reb = 1000 * rebasan
        n_salon = 1000 * 0.03
        n_serv = n_reb - n_salon
        for p_serv, p_salon in ((299, 399), (349, 399)):
            pag_serv, pag_salon = conv * n_serv, conv * n_salon
            ing = pag_serv * p_serv + pag_salon * p_salon
            costo_pag = pag_serv * piso(1.9, p_serv) + pag_salon * piso(7.5, p_salon)
            escenarios.append(dict(rebasan_topes_pct=int(rebasan * 100), conversion_pct=int(conv * 100), precio_servicio=p_serv,
                                   precio_salon=p_salon, pagantes=round(pag_serv + pag_salon, 1), ingreso_mes=round(ing),
                                   costo_de_atender_pagantes=round(costo_pag), costo_fijo_1000=round(COSTO_FIJO_1000),
                                   neto_mes=round(ing - costo_pag - COSTO_FIJO_1000)))

salida = dict(cobertura_platillos=cob, nucleo_por_personal_contraste=cobertura_nucleo, planes=planes,
              equilibrio=equilibrio, escenarios=escenarios)
json.dump(salida, open(f"{AQUI}/2026-11-14-tres-planes-datos.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in salida.items() if k not in ("cobertura_platillos",)}, ensure_ascii=False, indent=1))
