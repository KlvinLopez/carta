"""Estadística de platillos por carta (apoya docs/research/2026-11-13-estadistica-de-cartas-y-personal.md).

Sólo biblioteca estándar:
    python3 docs/research/2026-11-13-estadistica-de-cartas-y-personal-estadistica.py [datos.csv]

Lee el CSV de la muestra (una fila por negocio y carta) y recalcula: resumen por tipo, percentiles con
intervalo de confianza de 90 % por remuestreo (bootstrap), curva de cobertura, percentiles ponderados por la
mezcla de tipos y comparación reparto contra salón. La semilla es fija: el resultado es reproducible.
"""

from __future__ import annotations

import csv
import math
import random
import statistics
import sys
from collections import defaultdict
from pathlib import Path

SEMILLA = 20261113
REMUESTREOS = 5000
CONFIANZA = 0.90
PERCENTILES = (50, 75, 90, 95)
CORTES = (30, 40, 60, 80, 100, 150, 200, 300)
TIPOS = ("taqueria_fonda", "cafeteria", "casual", "formal", "bar_cantina")

# Mezclas de tipos de negocio [estimada]: no hay conteo oficial por tipo de este agrupamiento (el DENUE cuenta por clase
# SCIAN). A: todos los tipos pesan igual. B: «mercado de servicio en mesa» supuesto (fondas y taquerías dominan).
MEZCLAS: dict[str, dict[str, float]] = {
    "A (pesos iguales)": {t: 0.2 for t in TIPOS},
    "B (mesa: 50 % fonda, 20 % casual, 12 % café, 12 % bar, 6 % formal)": {
        "taqueria_fonda": 0.50,
        "casual": 0.20,
        "cafeteria": 0.12,
        "bar_cantina": 0.12,
        "formal": 0.06,
    },
}

# --- Personal y mesas ---
# Estratos DENUE de la rama 7225 (mayo de 2026, Data México) [fuente externa] y tamaño medio por estrato de los
# Censos Económicos 2019 (INEGI, monografía de la industria restaurantera) [fuente externa].
ESTRATOS_7225 = (  # (mínimo, máximo, unidades, media de personal ocupado)
    (1, 10, 712_553, 1_447_924 / 560_805),
    (11, 50, 26_443, 380_680 / 18_812),
    (51, 250, 887 + 348, (157_847 + 11_299) / (1_895 + 18)),
)
MEDIA_722511 = (
    8.7  # 516,894 personas (CE2024) / 59,296 unidades (CE2019) [estimada: mezcla de años]
)
CV_722511 = (1.0, 1.5)  # dispersión relativa supuesta [estimada]
MEDIA_722511_RANGO = (7.0, 10.0)
FRACCION_MESAS = (0.35, 0.50)  # parte del personal que atiende mesas (mesero o capitán) [estimada]
MESAS_POR_CUENTA = (
    2.5,
    4.0,
)  # mesas por cuenta de personal [documento: perfiles de 1.3 del informe de planes]
MUESTRAS = 40_000


def percentil(valores: list[float], p: float) -> float:
    """Percentil con interpolación lineal (método 7)."""
    xs = sorted(valores)
    if not xs:
        return math.nan
    k = (len(xs) - 1) * p / 100
    i = math.floor(k)
    j = min(i + 1, len(xs) - 1)
    return xs[i] + (xs[j] - xs[i]) * (k - i)


def percentil_ponderado(valores: list[float], pesos: list[float], p: float) -> float:
    """Percentil de una distribución ponderada (función de distribución acumulada)."""
    pares = sorted(zip(valores, pesos, strict=True))
    total = sum(pesos)
    acum = 0.0
    for v, w in pares:
        acum += w
        if acum / total >= p / 100:
            return v
    return pares[-1][0]


def intervalo_bootstrap(valores: list[float], funcion, rng: random.Random) -> tuple[float, float]:
    n = len(valores)
    if n < 2:
        return (math.nan, math.nan)
    est = sorted(funcion([valores[rng.randrange(n)] for _ in range(n)]) for _ in range(REMUESTREOS))
    a = (1 - CONFIANZA) / 2
    return est[int(a * REMUESTREOS)], est[int((1 - a) * REMUESTREOS) - 1]


def moda_por_intervalos(valores: list[float], ancho: int = 10) -> str:
    if not valores:
        return "—"
    cuenta: dict[int, int] = defaultdict(int)
    for v in valores:
        cuenta[int(v // ancho)] += 1
    mejor = max(cuenta.values())
    ini = min(k for k, c in cuenta.items() if c == mejor)
    return f"{ini * ancho}–{ini * ancho + ancho - 1}"


def leer(ruta: Path) -> list[dict[str, str]]:
    with ruta.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def numero(fila: dict[str, str], campo: str) -> float | None:
    try:
        return float(fila[campo])
    except (KeyError, ValueError):
        return None


def resumen(nombre: str, valores: list[float], rng: random.Random) -> None:
    if not valores:
        print(f"{nombre}: sin datos")
        return
    print(
        f"{nombre}: n={len(valores)} media={statistics.fmean(valores):.1f} mediana={statistics.median(valores):.1f} "
        f"moda={moda_por_intervalos(valores)} desv={statistics.pstdev(valores):.1f} "
        f"mín={min(valores):.0f} máx={max(valores):.0f}"
    )
    for p in PERCENTILES:
        bajo, alto = intervalo_bootstrap(valores, lambda m, p=p: percentil(m, p), rng)
        print(f"    p{p}: {percentil(valores, p):.1f}  (IC90 {bajo:.1f}–{alto:.1f})")


def cobertura(valores: list[float], rng: random.Random) -> None:
    n = len(valores)
    for corte in CORTES:

        def frac(m, c=corte):
            return sum(1 for v in m if v <= c) / len(m)

        bajo, alto = intervalo_bootstrap(valores, frac, rng)
        print(
            f"    hasta {corte:>3}: {100 * frac(valores):5.1f} %  (IC90 {100 * bajo:.1f}–{100 * alto:.1f})  n={n}"
        )


def geometrica_truncada(media: float, lo: int, hi: int) -> list[float]:
    """Pesos de una geométrica truncada en [lo, hi] con la media pedida (bisección sobre la razón)."""
    a, b = 1e-6, 0.999999
    for _ in range(80):
        r = (a + b) / 2
        pesos = [r ** (k - lo) for k in range(lo, hi + 1)]
        m = sum(k * w for k, w in zip(range(lo, hi + 1), pesos, strict=True)) / sum(pesos)
        a, b = (r, b) if m < media else (a, r)
    return pesos


def cobertura_estratos(rng: random.Random, fraccion: float) -> dict[str, float]:
    """Toda la rama 7225 (incluye puestos y comida para llevar): cota inferior de tamaño."""
    total = sum(e[2] for e in ESTRATOS_7225)
    cuentas: list[tuple[int, float]] = []
    for lo, hi, unidades, media in ESTRATOS_7225:
        tope = hi if hi <= 50 else 250
        pesos = geometrica_truncada(media, lo, tope)
        suma = sum(pesos)
        for k, w in zip(range(lo, tope + 1), pesos, strict=True):
            cuentas.append((max(1, math.ceil(fraccion * k)), unidades / total * w / suma))
    return {
        "≤3 cuentas": sum(w for c, w in cuentas if c <= 3),
        "≤20 cuentas": sum(w for c, w in cuentas if c <= 20),
    }


def personal_y_mesas() -> None:
    print("\n=== Personal y mesas ===")
    print("  Toda la rama 7225 (cota inferior de tamaño; incluye puestos y comida para llevar):")
    for f in FRACCION_MESAS:
        c = cobertura_estratos(random.Random(SEMILLA), f)
        print(
            f"    fracción de mesas {f:.2f}: "
            + "  ".join(f"{k} {100 * v:.1f} %" for k, v in c.items())
        )
    print(
        "  Servicio completo (722511), lognormal con media y dispersión supuestas; rango sobre la rejilla de supuestos:"
    )
    res: dict[str, list[float]] = defaultdict(list)
    for media in MEDIA_722511_RANGO + (MEDIA_722511,):
        for cv in CV_722511:
            s2 = math.log(1 + cv * cv)
            mu = math.log(media) - s2 / 2
            rng = random.Random(SEMILLA)
            personas = [
                max(1, round(rng.lognormvariate(mu, math.sqrt(s2)))) for _ in range(MUESTRAS)
            ]
            for f in FRACCION_MESAS:
                cu = [max(1, math.ceil(f * k)) for k in personas]
                res["cuentas ≤3"].append(sum(c <= 3 for c in cu) / MUESTRAS)
                res["cuentas ≤20"].append(sum(c <= 20 for c in cu) / MUESTRAS)
                for r in MESAS_POR_CUENTA:
                    res["mesas ≤10"].append(sum(r * c <= 10 for c in cu) / MUESTRAS)
                    res["mesas ≤40"].append(sum(r * c <= 40 for c in cu) / MUESTRAS)
    for k, v in res.items():
        print(
            f"    {k}: {100 * min(v):.0f} %–{100 * max(v):.0f} %  (mediana de la rejilla {100 * statistics.median(v):.0f} %)"
        )


def main() -> None:
    ruta = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path(__file__).with_name("2026-11-13-estadistica-de-cartas-y-personal-datos.csv")
    )
    filas = leer(ruta)
    rng = random.Random(SEMILLA)

    # Una fila por negocio: si hay par reparto/salón, se prefiere el salón para la estadística principal.
    por_negocio: dict[tuple[str, str], dict[str, str]] = {}
    for f in filas:
        clave = (f["ciudad"], f["negocio"])
        if clave not in por_negocio or f["tipo_carta"] != "reparto":
            por_negocio[clave] = f
    base = list(por_negocio.values())
    print(
        f"Filas: {len(filas)}  negocios distintos: {len(base)}  ciudades: {len({f['ciudad'] for f in base})}"
    )

    for etiqueta, campo in (("TOTAL (con bebidas)", "total"), ("SOLO COMIDA", "comida")):
        print(f"\n=== {etiqueta} ===")
        todos = [v for f in base if (v := numero(f, campo)) is not None]
        resumen("todos", todos, rng)
        for t in TIPOS:
            resumen(
                t, [v for f in base if f["tipo"] == t and (v := numero(f, campo)) is not None], rng
            )
        if campo == "total":
            print("  Curva de cobertura (todos):")
            cobertura(todos, rng)

    for nombre, mezcla in MEZCLAS.items():
        print(f"\n=== Ponderado, mezcla {nombre} (total) ===")
        n_tipo = {t: sum(1 for f in base if f["tipo"] == t) for t in TIPOS}
        pares = [
            (v, mezcla.get(f["tipo"], 0) / n_tipo[f["tipo"]])
            for f in base
            if (v := numero(f, "total")) is not None and n_tipo[f["tipo"]]
        ]
        for p in PERCENTILES:
            est = []
            for _ in range(REMUESTREOS // 5):
                m = [pares[rng.randrange(len(pares))] for _ in pares]
                est.append(percentil_ponderado([x for x, _ in m], [w for _, w in m], p))
            est.sort()
            a = (1 - CONFIANZA) / 2
            bajo, alto = est[int(a * len(est))], est[int((1 - a) * len(est)) - 1]
            punto = percentil_ponderado([x for x, _ in pares], [w for _, w in pares], p)
            print(f"    p{p}: {punto:.1f}  (IC90 {bajo:.1f}–{alto:.1f})")
        for corte in CORTES[:5]:
            tot = sum(w for _, w in pares)
            print(
                f"    hasta {corte:>3}: {100 * sum(w for v, w in pares if v <= corte) / tot:5.1f} %"
            )

    print("\n=== Reparto contra salón (mismo negocio) ===")
    reparto = {(f["ciudad"], f["negocio"]): f for f in filas if f["tipo_carta"] == "reparto"}
    salon = {(f["ciudad"], f["negocio"]): f for f in filas if f["tipo_carta"] != "reparto"}
    pares = [(reparto[k], salon[k]) for k in reparto if k in salon]
    for r, s in pares:
        print(f"    {r['negocio']} ({r['ciudad']}): reparto {r['total']} · salón {s['total']}")
    if not pares:
        print("    sin pares")

    personal_y_mesas()

    print("\n=== Foto y descripción ===")
    for campo in ("foto_por_platillo", "descripcion", "conteo"):
        cuenta: dict[str, int] = defaultdict(int)
        for f in base:
            cuenta[f[campo]] += 1
        print(f"    {campo}: {dict(cuenta)}")


if __name__ == "__main__":
    main()
