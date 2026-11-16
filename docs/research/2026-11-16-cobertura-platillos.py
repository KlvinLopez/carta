"""Cobertura de un tope de platillos (porcentaje de negocios con carta ≤ tope) en las 56 cartas COMPLETAS de sitios propios.

Entrada: 2026-11-16-muestra-56-completas.csv (copia, sin nombres ni identificadores, de las filas completas de
`2026-11-13-muestra-500-datos.csv` de la rama `agente/muestra-500-cartas` @ ec1435f: comida y bebidas contadas con la instrucción de
conteo de esa muestra). SESGO: son cartas legibles en línea de negocios con sitio propio y muchas reseñas (cartas largas y formales); la
cota ALTA del modelo viene de 148 cartas de plataformas de reparto (cartas cortas, sin bebidas). Las dos muestras no cuentan «platillo»
con la misma regla. Salida: 2026-11-16-cobertura-platillos-datos.json. Sólo biblioteca estándar; `python3 -I`; determinista.
"""
import csv
import json
import math
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
filas = list(csv.DictReader(open(os.path.join(AQUI, "2026-11-16-muestra-56-completas.csv"), encoding="utf-8")))
n = len(filas)
TOPES = [40, 60, 80, 100, 120, 150, 200, 300]


def wilson(k, n, z=1.645):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(c - h, 3), round(c + h, 3)]


def curva(campo, sub=None):
    base = [f for f in filas if sub is None or f["tipo"] == sub]
    return [dict(tope=t, cobertura=round(sum(1 for f in base if int(f[campo]) <= t) / len(base), 3), n=len(base), ic90=wilson(sum(1 for f in base if int(f[campo]) <= t), len(base))) for t in TOPES]


por_tipo = {}
for tipo in sorted({f["tipo"] for f in filas}):
    sub = [f for f in filas if f["tipo"] == tipo]
    por_tipo[tipo] = dict(n=len(sub), dentro_de_150_total=sum(1 for f in sub if int(f["total"]) <= 150), dentro_de_150_comida=sum(1 for f in sub if int(f["comida"]) <= 150))
salida = dict(n=n, fuente="2026-11-16-muestra-56-completas.csv (copia de la rama agente/muestra-500-cartas @ ec1435f)",
              sesgo="cartas legibles en línea de negocios con sitio propio y muchas reseñas: sesgo hacia cartas largas y negocios formales; el reparto (cota alta) sesga hacia cartas cortas y sin bebidas",
              total=curva("total"), comida=curva("comida"), por_tipo=por_tipo,
              maximo_comida=max(int(f["comida"]) for f in filas), maximo_total=max(int(f["total"]) for f in filas))
json.dump(salida, open(os.path.join(os.environ.get("CARTA_SALIDA", AQUI), "2026-11-16-cobertura-platillos-datos.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps({"total": [(x["tope"], x["cobertura"]) for x in salida["total"]], "comida": [(x["tope"], x["cobertura"]) for x in salida["comida"]], "por_tipo": por_tipo}, ensure_ascii=False))
