"""Estadística de la muestra de cartas (marco de Google, lector propio).

Lee ``2026-11-13-muestra-500-datos.csv`` (sin nombres de negocio) y calcula media, mediana, moda (intervalos de 10), p75, p90 y
p95 de platillos totales (comida + bebidas), comida y bebidas, con intervalo de 90 % por remuestreo (5,000, semilla fija), por
tipo, zona y cadena, con y sin dominios .shop/.store, con y sin parciales (comida y bebidas por separado), ponderado por el
reparto de 500 y sin ponderar, más la curva de cobertura de topes. Sólo biblioteca estándar. Uso: python3 este_archivo.py
"""

import csv
import random
import statistics
from collections import Counter
from pathlib import Path

SEMILLA = 20261116
B = 5000
AQUI = Path(__file__).parent
DATOS = AQUI / "2026-11-13-muestra-500-datos.csv"

# Plazas por zona (resultado de 2026-11-13-muestra-500-reparto.py). La etiqueta es la de la consulta a Google.
PLAZAS = {
    "CDMX y Estado de México": 125,
    "Guadalajara y Zapopan": 70,
    "Monterrey": 53,
    "Tijuana": 32,
    "Toluca": 25,
    "Querétaro": 24,
    "Puebla": 21,
    "Aguascalientes": 15,
    "Chihuahua": 15,
    "Oaxaca": 15,
    "San Luis Potosí": 15,
    "Veracruz": 15,
    "Cancún": 15,
    "Morelia": 15,
    "Hermosillo": 15,
    "León": 15,
    "Mérida": 15,
}


def numero(texto):
    return int(texto) if texto.strip() != "" else None


def cargar():
    filas = []
    with open(DATOS, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            filas.append(
                {
                    "ciudad": r["ciudad"],
                    "tipo": r["tipo"],
                    "cadena": r["cadena"],
                    "comida": numero(r["comida"]),
                    "bebidas": numero(r["bebidas"]),
                    "total": numero(r["total"]),
                    "tienda": any(s in r["notas"].lower() for s in (".shop", ".store")),
                    "tanda": r["tanda"],
                }
            )
    return filas


def pct(v, p):
    v = sorted(v)
    k = (len(v) - 1) * p
    i = int(k)
    j = min(i + 1, len(v) - 1)
    return v[i] + (v[j] - v[i]) * (k - i)


def pesada(v, w, p):
    pares = sorted(zip(v, w, strict=True))
    tot = sum(w)
    acc = 0.0
    for x, wi in pares:
        acc += wi
        if acc >= p * tot:
            return x
    return pares[-1][0]


def moda(v):
    c = Counter((int(x) // 10) * 10 for x in v)
    k = max(c.values())
    lo = min(b for b, m in c.items() if m == k)
    return f"{lo}-{lo + 9}"


def estadisticos(vv, ww):
    if ww is None:
        return {
            "media": statistics.fmean(vv),
            "mediana": statistics.median(vv),
            "p75": pct(vv, 0.75),
            "p90": pct(vv, 0.90),
            "p95": pct(vv, 0.95),
        }
    t = sum(ww)
    return {
        "media": sum(x * y for x, y in zip(vv, ww, strict=True)) / t,
        "mediana": pesada(vv, ww, 0.5),
        "p75": pesada(vv, ww, 0.75),
        "p90": pesada(vv, ww, 0.90),
        "p95": pesada(vv, ww, 0.95),
    }


def resumen(v, w=None):
    """Estadísticos y su intervalo de 90 % por remuestreo (None con menos de 5 datos)."""
    rng = random.Random(SEMILLA)
    n = len(v)
    if n < 5:
        return None
    base = estadisticos(v, w)
    sims = {k: [] for k in base}
    for _ in range(B):
        idx = [rng.randrange(n) for _ in range(n)]
        e = estadisticos([v[i] for i in idx], None if w is None else [w[i] for i in idx])
        for k in base:
            sims[k].append(e[k])
    ic = {k: (pct(s, 0.05), pct(s, 0.95)) for k, s in sims.items()}
    return {
        "n": n,
        "min": min(v),
        "max": max(v),
        "moda": moda(v),
        **{k: (base[k], *ic[k]) for k in base},
    }


def fila_md(nombre, r):
    if r is None:
        return f"| {nombre} | < 5 | | | | | | | |"

    def f(t):
        return f"{t[0]:.1f} ({t[1]:.1f}–{t[2]:.1f})"

    return (
        f"| {nombre} | {r['n']} | {f(r['media'])} | {f(r['mediana'])} | {r['moda']} | {r['min']}–{r['max']} | "
        f"{f(r['p75'])} | {f(r['p90'])} | {f(r['p95'])} |"
    )


ENCABEZADO = "| Grupo | n | Media (IC 90 %) | Mediana (IC 90 %) | Moda | Mín–máx | p75 | p90 | p95 |\n|---|---|---|---|---|---|---|---|---|"


def tabla(titulo, grupos):
    print(f"\n#### {titulo}\n\n{ENCABEZADO}")
    for nombre, v, w in grupos:
        print(fila_md(nombre, resumen(v, w) if v else None))


def pesos(filas):
    por = Counter(f["ciudad"] for f in filas)
    return [PLAZAS[f["ciudad"]] / por[f["ciudad"]] for f in filas]


def cobertura(v, w=None):
    rng = random.Random(SEMILLA)
    n = len(v)
    print("\n| Tope | % de negocios con ≤ tope (IC 90 %) |\n|---|---|")
    for tope in (40, 60, 80, 100, 120):

        def frac(vv, ww, tope=tope):
            if ww is None:
                return sum(1 for x in vv if x <= tope) / len(vv)
            return sum(y for x, y in zip(vv, ww, strict=True) if x <= tope) / sum(ww)

        b = frac(v, w)
        s = []
        for _ in range(B):
            idx = [rng.randrange(n) for _ in range(n)]
            s.append(frac([v[i] for i in idx], None if w is None else [w[i] for i in idx]))
        print(f"| {tope} | {100 * b:.0f} % ({100 * pct(s, 0.05):.0f}–{100 * pct(s, 0.95):.0f}) |")


def main():
    filas = cargar()
    comp = [f for f in filas if f["total"] is not None]
    print(
        f"Filas: {len(filas)}; completas (comida y bebidas): {len(comp)}; parciales: {len(filas) - len(comp)}"
    )
    print(f"Por tanda (completas): {dict(sorted(Counter(f['tanda'] for f in comp).items()))}")
    print(f"Con dominio .shop/.store (completas): {sum(f['tienda'] for f in comp)}")
    w = pesos(comp)
    tot = [f["total"] for f in comp]
    tabla(
        "Platillos totales (comida + bebidas), completas",
        [
            ("Todas, sin ponderar", tot, None),
            ("Todas, ponderadas por el reparto de 500", tot, w),
            ("Sin cadenas (cadena = no)", [f["total"] for f in comp if f["cadena"] == "no"], None),
            ("Cadenas (cadena = sí)", [f["total"] for f in comp if f["cadena"] == "si"], None),
            ("Sin dominios .shop/.store", [f["total"] for f in comp if not f["tienda"]], None),
        ],
    )
    tabla(
        "Por tipo (completas, sin ponderar)",
        [
            (t, [f["total"] for f in comp if f["tipo"] == t], None)
            for t in ("taqueria_fonda", "cafeteria", "casual", "formal", "bar_cantina")
        ],
    )
    grandes = {"CDMX y Estado de México", "Guadalajara y Zapopan", "Monterrey"}
    tabla(
        "Por zona (completas, sin ponderar)",
        [
            (
                "CDMX, Guadalajara y Monterrey",
                [f["total"] for f in comp if f["ciudad"] in grandes],
                None,
            ),
            ("Resto de las zonas", [f["total"] for f in comp if f["ciudad"] not in grandes], None),
        ],
    )
    con_comida = [f for f in filas if f["comida"] is not None]
    con_bebidas = [f for f in filas if f["bebidas"] is not None]
    tabla(
        "Comida sola",
        [
            ("Sólo completas", [f["comida"] for f in comp], None),
            ("Completas + parciales con comida", [f["comida"] for f in con_comida], None),
        ],
    )
    tabla(
        "Bebidas solas",
        [
            ("Sólo completas", [f["bebidas"] for f in comp], None),
            ("Completas + parciales con bebidas", [f["bebidas"] for f in con_bebidas], None),
        ],
    )
    print("\n#### Curva de cobertura de topes (platillos totales, completas, sin ponderar)")
    cobertura(tot)
    print("\n#### Curva de cobertura de topes (ponderada por el reparto)")
    cobertura(tot, w)


if __name__ == "__main__":
    main()
