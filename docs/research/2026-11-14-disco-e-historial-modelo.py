"""Modelo del disco de la base de Carta: cuántos restaurantes caben en 5 GB con cada palanca.

Entrada: 2026-11-14-disco-e-historial-medicion-bruta.json (medido con psql en PostgreSQL 16 local,
esquema real con las migraciones 0001-0003; datos del generador .sql).
Salida: 2026-11-14-disco-e-historial-datos.json y …-capacidad.csv. Sólo biblioteca estándar.
Marcas: [medida] sale de la medición; [supuesto] juicio con su cómo-se-obtiene en el .md.
"""

import csv
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
M = json.load(open(f"{AQUI}/2026-11-14-disco-e-historial-medicion-bruta.json"))

# Lo que se generó (ver correr.sh): restaurantes, visitas por mes, eventos por visita [supuesto]
PERFIL = {
    "chico": dict(visitas=1800, ev_visita=10, platillos=30),
    "mediano": dict(visitas=1800, ev_visita=10, platillos=55),
    "grande": dict(visitas=4500, ev_visita=10, platillos=90),
    "formal": dict(visitas=1500, ev_visita=10, platillos=80),
}
NREST = 10
TABLAS_VISITA = [
    "sesion_grupal",
    "miembro_sesion",
    "orden_personal",
    "item_orden",
    "comanda",
    "comanda_orden",
    "llamada_mesero",
]
TABLAS_FIJAS = [
    "restaurante",
    "categoria_menu",
    "mesa",
    "personal_restaurante",
    "platillo",
    "importacion_menu",
    "usuario",
    "operador_restaurante",
]
BASE_VACIA = 7_586_319  # [medida] pg_database_size de la base migrada y vacía
GB = 1e9  # Railway cobra y limita en GB decimales; se usa 5e9 bytes (conservador)
VOLUMEN = 5 * GB
RESERVA = (
    0.20  # [supuesto] WAL, hinchazón y catálogo; dato por conseguir: pg_ls_waldir() en producción
)

out = {"por_perfil": {}, "capacidad": []}
for p, c in PERFIL.items():
    t = M[p]["tablas"]
    visitas = c["visitas"] * NREST
    b_visita = sum(t[x]["total"] for x in TABLAS_VISITA) / visitas
    ev = t["evento_analitica"]
    b_evento = ev["total"] / ev["filas"]
    ix_ev = M[p]["indices"]["evento_analitica"]
    fk_idx = sum(
        v
        for k, v in ix_ev.items()
        if k
        in ("idx_evento_sesion", "idx_evento_mesa", "idx_evento_miembro", "idx_evento_platillo")
    )
    fija = sum(t[x]["total"] for x in TABLAS_FIJAS if x in t) / NREST
    mensual_visita = b_visita * c["visitas"]
    mensual_evento = b_evento * c["visitas"] * c["ev_visita"]
    out["por_perfil"][p] = dict(
        visitas_mes=c["visitas"],
        eventos_por_visita=c["ev_visita"],
        bytes_por_visita_sin_eventos=round(b_visita),
        bytes_por_evento=round(b_evento),
        bytes_por_visita_con_eventos=round(b_visita + b_evento * c["ev_visita"]),
        parte_eventos=round(mensual_evento / (mensual_visita + mensual_evento), 3),
        mb_fijos_por_restaurante=round(fija / 1e6, 3),
        mb_mes_sin_eventos=round(mensual_visita / 1e6, 2),
        mb_mes_eventos=round(mensual_evento / 1e6, 2),
        mb_mes_total=round((mensual_visita + mensual_evento) / 1e6, 2),
        bytes_por_tabla={x: round(t[x]["total"] / visitas) for x in TABLAS_VISITA},
        indices_fk_de_evento_parte=round(fk_idx / ev["total"], 3),
        platillos=c["platillos"],
        bytes_por_platillo=round(t["platillo"]["total"] / t["platillo"]["filas"]),
    )

MEZCLA = {
    "gratuito": {"chico": 0.60, "mediano": 0.25, "grande": 0.05, "formal": 0.10},
    "paga": {"mediano": 0.50, "grande": 0.25, "formal": 0.25},
}


def mb_por_restaurante(plan, mes_visitas, mes_eventos, indices_fk_fuera=False, ev_bytes_factor=1.0):
    """Bytes en línea en régimen por restaurante promedio de la mezcla del plan."""
    tot = 0.0
    for p, w in MEZCLA[plan].items():
        d = out["por_perfil"][p]
        ev_mes = d["mb_mes_eventos"] * 1e6 * ev_bytes_factor
        if indices_fk_fuera:
            ev_mes *= 1 - d["indices_fk_de_evento_parte"]
        tot += w * (
            d["mb_fijos_por_restaurante"] * 1e6
            + mes_visitas * d["mb_mes_sin_eventos"] * 1e6
            + mes_eventos * ev_mes
        )
    return tot


# (nombre, meses de visitas en línea gratuito, paga, meses de eventos gratuito, paga, sin índices FK, factor bytes evento)
PALANCAS = [
    ("P0 hoy: 30 días / 12 meses, todo en línea", 1, 12, 1, 12, False, 1.0),
    ("P1 analítica en línea sólo 30 días", 1, 12, 1, 1, False, 1.0),
    ("P2 = P1 + historial en línea 3 meses, resto archivado", 1, 3, 1, 1, False, 1.0),
    ("P3 = P2 + sin los 4 índices de clave foránea de evento_analitica", 1, 3, 1, 1, True, 1.0),
    ("P4 = P3 + analítica 7 días en bruto (resto, agregados)", 1, 3, 7 / 30, 7 / 30, True, 1.0),
    ("P5 = P4 + historial en línea 1 mes (archivo desde el 2.º)", 1, 1, 7 / 30, 7 / 30, True, 1.0),
]
ESC = {"todo gratuito": 0.0, "90/10": 0.10, "80/20": 0.20, "todo de paga": 1.0}
for nombre, vg, vp, eg, ep, sinfk, f in PALANCAS:
    g = mb_por_restaurante("gratuito", vg, eg, sinfk, f)
    p = mb_por_restaurante("paga", vp, ep, sinfk, f)
    fila = dict(palanca=nombre, mb_gratuito=round(g / 1e6, 1), mb_paga=round(p / 1e6, 1))
    for e, frac in ESC.items():
        medio = (1 - frac) * g + frac * p
        fila[f"N_{e}"] = int((VOLUMEN - BASE_VACIA) / medio)
        fila[f"N_{e}_con_reserva"] = int((VOLUMEN * (1 - RESERVA) - BASE_VACIA) / medio)
    out["capacidad"].append(fila)

json.dump(
    out, open(f"{AQUI}/2026-11-14-disco-e-historial-datos.json", "w"), ensure_ascii=False, indent=1
)
with open(f"{AQUI}/2026-11-14-disco-e-historial-capacidad.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(out["capacidad"][0]))
    w.writeheader()
    w.writerows(out["capacidad"])

for p, d in out["por_perfil"].items():
    print(p, {k: v for k, v in d.items() if k not in ("bytes_por_tabla",)})
for f in out["capacidad"]:
    print(
        f["palanca"],
        f["mb_gratuito"],
        f["mb_paga"],
        [f[f"N_{e}"] for e in ESC],
        [f[f"N_{e}_con_reserva"] for e in ESC],
    )
