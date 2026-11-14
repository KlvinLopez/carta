"""Segmentación de Calvin (14-nov) traducida a topes que el producto sí aplica (mesas, cuentas de personal, platillos).

Chef (gratis) = 0–5 y 6–10 personas · Master Chef = 11–30, 31–50 y 51–100 · Chef Ejecutivo = 101–250 y 251 o más.
Entradas: estratos del núcleo (clientes potenciales) del DENUE 05/2026 [medido: mercado-de-carta §2.1]; el MODELO de
mesas y cuentas ya usado (estadística de cartas §4.2): cuentas = ⌈f × personas⌉ con f = 0.35–0.50 y mesas = cuentas × m
con m = 2.5–4. Todo lo demás [supuesto]: la forma dentro de cada estrato (geométrica truncada con la media supuesta).
Salida: 2026-11-14-segmentacion-datos.json. Sólo biblioteca estándar; `python3 -I`; determinista (sin azar).
"""
import json
import math
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
# (nombre, mín, máx, negocios [medido], media supuesta de personas dentro del estrato [supuesto])
ESTRATOS = [("0 a 5", 1, 5, 73193, 2.5), ("6 a 10", 6, 10, 17855, 7.5), ("11 a 30", 11, 30, 10809, 17.0),
            ("31 a 50", 31, 50, 2263, 38.0), ("51 a 100", 51, 100, 542, 70.0), ("101 a 250", 101, 250, 193, 150.0),
            ("251 o más", 251, 1000, 27, 380.0)]
TOTAL = sum(e[3] for e in ESTRATOS)
assert TOTAL == 104882
PLAN = {"0 a 5": "Chef", "6 a 10": "Chef", "11 a 30": "Master Chef", "31 a 50": "Master Chef", "51 a 100": "Master Chef", "101 a 250": "Chef Ejecutivo", "251 o más": "Chef Ejecutivo"}
F = [0.35, 0.425, 0.50]
MPC = [2.5, 3.25, 4.0]
# Dispersión de las mesas por cuenta [supuesto, sin dato]: lognormal con la mediana m y desviación SIGMA (en ln). 0 = determinista
# (la versión anterior). El piloto debe medir mesas y cuentas por negocio para acotarla.
SIGMAS = [0.25, 0.5, 0.75]
SIGMA_CENTRO = 0.5
NQ = 9  # puntos de igual probabilidad que representan la lognormal
MESAS = [6, 8, 10, 12, 15, 16, 20, 25, 30, 40, 60, 100, 150, 250]
CUENTAS = [2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50]


def geometrica(media, lo, hi):
    a, b = 1e-6, 0.999999
    for _ in range(80):
        r = (a + b) / 2
        pesos = [r ** (k - lo) for k in range(lo, hi + 1)]
        m = sum(k * w for k, w in zip(range(lo, hi + 1), pesos)) / sum(pesos)
        a, b = (r, b) if m < media else (a, r)
    s = sum(pesos)
    return [(k, w / s) for k, w in zip(range(lo, hi + 1), pesos)]


def _z(i, n):
    """Cuantil normal estándar en la probabilidad (i + 0.5) / n (bisección sobre la función de error)."""
    q = (i + 0.5) / n
    a, b = -8.0, 8.0
    for _ in range(80):
        x = (a + b) / 2
        if 0.5 * (1 + math.erf(x / math.sqrt(2))) < q:
            a = x
        else:
            b = x
    return (a + b) / 2


ZS = [_z(i, NQ) for i in range(NQ)]


def poblacion(f, m, sigma=0.0):
    """[(peso en negocios, personas, cuentas, mesas, plan)] para (f, m, sigma): mesas = cuentas × m × exp(sigma × z)."""
    out = []
    zs = ZS if sigma > 0 else [0.0]
    for nombre, lo, hi, n, media in ESTRATOS:
        for k, w in geometrica(media, lo, hi):
            c = max(1, math.ceil(f * k))
            for z in zs:
                out.append((n * w / len(zs), k, c, max(1, round(c * m * math.exp(sigma * z))), PLAN[nombre], nombre))
    return out


def tabla(f, m, sigma):
    pob = poblacion(f, m, sigma)
    chico = sum(p[0] for p in pob if p[1] <= 10)
    # se agrupa por (mesas, cuentas) para no recorrer toda la población en cada celda de la rejilla
    ag = {}
    for p in pob:
        key = (p[3], p[2])
        a = ag.setdefault(key, [0.0, 0.0, 0.0])
        a[0] += p[0]
        if p[1] <= 10:
            a[1] += p[0]
        else:
            a[2] += p[0]
    T = {}
    for M in MESAS:
        for C in CUENTAS:
            dentro_todos = sum(a[0] for (mm, cc), a in ag.items() if mm <= M and cc <= C)
            dentro_chico = sum(a[1] for (mm, cc), a in ag.items() if mm <= M and cc <= C)
            fuga = sum(a[2] for (mm, cc), a in ag.items() if mm <= M and cc <= C)  # de más de 10 personas que caben gratis
            T[(M, C)] = dict(dentro_todos=dentro_todos / TOTAL, seguridad_chico=dentro_chico / chico, fuga=fuga / (TOTAL - chico))
    return T


corners = {(f, m, sg): tabla(f, m, sg) for f in F for m in MPC for sg in SIGMAS}
centro = corners[(0.425, 3.25, SIGMA_CENTRO)]
sin_dispersion = {(f, m): tabla(f, m, 0.0) for f in F for m in MPC}  # versión anterior: mesas = función de las cuentas
out = {"estratos": [dict(estrato=e[0], negocios=e[3], pct=round(100 * e[3] / TOTAL, 1), plan=PLAN[e[0]], media_supuesta=e[4]) for e in ESTRATOS],
       "planes": {}, "parametros": dict(f=F, mesas_por_cuenta=MPC, sigma_mesas_por_cuenta=SIGMAS, sigma_central=SIGMA_CENTRO, nota="central: f=0.425, m=3.25, sigma=0.5; intervalo: mínimo y máximo sobre las 27 combinaciones (f, m, sigma). Todo es supuesto: sólo los conteos por estrato son medidos")}
for pl in ("Chef", "Master Chef", "Chef Ejecutivo"):
    n = sum(e[3] for e in ESTRATOS if PLAN[e[0]] == pl)
    out["planes"][pl] = dict(negocios=n, pct=round(100 * n / TOTAL, 1))
# topes para que un negocio de hasta 10 personas quede dentro del gratuito con 80, 90 y 95 % de seguridad
res = []
for q in (0.80, 0.90, 0.95):
    cand = []
    for M in MESAS:
        for C in CUENTAS:
            if centro[(M, C)]["seguridad_chico"] >= q:
                cand.append((M * 1.0 + 3 * C, M, C))
    cand.sort()
    _, M, C = cand[0]
    vals = [corners[k][(M, C)] for k in corners]
    sd = [sin_dispersion[k][(M, C)]["seguridad_chico"] for k in sin_dispersion]
    res.append(dict(seguridad=q, mesas=M, cuentas=C,
                    seguridad_chico=dict(centro=centro[(M, C)]["seguridad_chico"], min=min(v["seguridad_chico"] for v in vals), max=min(1.0, max(v["seguridad_chico"] for v in vals))),
                    sin_dispersion=dict(centro=sin_dispersion[(0.425, 3.25)][(M, C)]["seguridad_chico"], min=min(sd), max=min(1.0, max(sd))),
                    dentro_todos=dict(centro=centro[(M, C)]["dentro_todos"], min=min(v["dentro_todos"] for v in vals), max=max(v["dentro_todos"] for v in vals)),
                    fuga_de_mas_de_10_personas=dict(centro=centro[(M, C)]["fuga"], min=min(v["fuga"] for v in vals), max=max(v["fuga"] for v in vals))))
out["topes_chef"] = res
# versión conservadora: la seguridad vale aun en el peor rincón del modelo (mínimo sobre las 9 combinaciones)
cons = []
for q in (0.80, 0.90, 0.95):
    cand = sorted((M * 1.0 + 3 * C, M, C) for M in MESAS for C in CUENTAS if min(corners[k][(M, C)]["seguridad_chico"] for k in corners) >= q)
    if not cand:
        cons.append(dict(nivel=q, sin_solucion=True)); continue
    _, M, C = cand[0]
    vals = [corners[k][(M, C)] for k in corners]
    cons.append(dict(nivel=q, mesas=M, cuentas=C, seguridad_minima=min(v["seguridad_chico"] for v in vals), dentro_todos=dict(centro=centro[(M, C)]["dentro_todos"], min=min(v["dentro_todos"] for v in vals), max=max(v["dentro_todos"] for v in vals)), fuga_de_mas_de_10_personas=dict(centro=centro[(M, C)]["fuga"], max=max(v["fuga"] for v in vals))))
out["topes_chef_conservador"] = cons
# Master Chef: cubre hasta 100 personas con 95 % de seguridad (el resto es Chef Ejecutivo)
pobM = {k: poblacion(*k) for k in corners}
def seg_master(M, C, k):
    pob = pobM[k]
    n = sum(p[0] for p in pob if 11 <= p[1] <= 100)
    return sum(p[0] for p in pob if 11 <= p[1] <= 100 and p[3] <= M and p[2] <= C) / n
def share_arriba(M, C, k):
    pob = pobM[k]
    return sum(p[0] for p in pob if p[3] > M or p[2] > C) / TOTAL
mm = []
for q in (0.80, 0.90, 0.95):
    cand = []
    for M in MESAS:
        for C in CUENTAS:
            if seg_master(M, C, (0.425, 3.25, SIGMA_CENTRO)) >= q:
                cand.append((M * 1.0 + 3 * C, M, C))
    cand.sort()
    _, M, C = cand[0]
    vals = [seg_master(M, C, k) for k in corners]
    mm.append(dict(nivel=q, mesas=M, cuentas=C, seguridad=dict(centro=seg_master(M, C, (0.425, 3.25, SIGMA_CENTRO)), min=min(vals), max=max(vals)), parte_de_los_registrados_arriba=dict(centro=share_arriba(M, C, (0.425, 3.25, SIGMA_CENTRO)), min=min(share_arriba(M, C, k) for k in corners), max=max(share_arriba(M, C, k) for k in corners))))
out["topes_master_chef"] = mm
# tablas para el modelo: parte de los registrados que rebasa (mesas o cuentas), por rejilla, centro e intervalo
out["empuja_conjunto"] = dict(mesas=MESAS, cuentas=CUENTAS,
    centro=[[round(1 - centro[(M, C)]["dentro_todos"], 4) for C in CUENTAS] for M in MESAS],
    minimo=[[round(min(1 - corners[k][(M, C)]["dentro_todos"] for k in corners), 4) for C in CUENTAS] for M in MESAS],
    maximo=[[round(max(1 - corners[k][(M, C)]["dentro_todos"] for k in corners), 4) for C in CUENTAS] for M in MESAS])
out["seguridad_chico_grid"] = dict(mesas=MESAS, cuentas=CUENTAS,
    centro=[[round(centro[(M, C)]["seguridad_chico"], 4) for C in CUENTAS] for M in MESAS],
    minimo=[[round(min(corners[k][(M, C)]["seguridad_chico"] for k in corners), 4) for C in CUENTAS] for M in MESAS],
    maximo=[[round(max(corners[k][(M, C)]["seguridad_chico"] for k in corners), 4) for C in CUENTAS] for M in MESAS])
# tabla de «negocios de hasta 10 personas dentro del gratuito» para varias combinaciones
out["seguridad_chico_por_topes"] = [dict(mesas=M, cuentas=C, centro=round(centro[(M, C)]["seguridad_chico"], 3), sin_dispersion=round(sin_dispersion[(0.425, 3.25)][(M, C)]["seguridad_chico"], 3), minimo=round(min(corners[k][(M, C)]["seguridad_chico"] for k in corners), 3), dentro_todos=round(centro[(M, C)]["dentro_todos"], 3), fuga=round(centro[(M, C)]["fuga"], 3)) for (M, C) in [(10, 3), (12, 3), (15, 4), (15, 5), (20, 5), (20, 6), (25, 8), (30, 8)]]
json.dump(out, open(f"{AQUI}/2026-11-14-segmentacion-datos.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: out[k] for k in ("planes", "topes_chef", "topes_master_chef", "seguridad_chico_por_topes")}, ensure_ascii=False, indent=1))
