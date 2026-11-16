"""Reúne las cifras del informe v4 desde los JSON y CSV del repositorio (nada se teclea a mano salvo lo marcado).

Lo usan `generar.py` (PDF) y la versión interactiva (se incrusta como JSON). Cada bloque dice de dónde sale.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
INV = RAIZ / "docs" / "research"
V3 = RAIZ / "docs" / "informes" / "2026-11-13-planos-de-carta" / "datos"


def _j(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def cargar() -> dict:
    mercado = _j(INV / "2026-11-13-mercado-de-carta-tablas.json")
    planes = _j(INV / "2026-11-14-tres-planes-datos.json")
    disco = _j(INV / "2026-11-14-disco-e-historial-datos.json")
    corredor = _j(INV / "2026-11-14-corredor-y-planes-datos.json")
    anuncios = _j(V3 / "anuncios.json")

    # --- mercado (DENUE 05/2026; cálculo propio) -------------------------------------------
    emb = mercado["embudo"]
    nuc = mercado["nucleo"]
    estratos = []
    for est, n in nuc["por_estrato"].items():
        cs = nuc["con_sitio_por_estrato"][est]
        estratos.append(
            {"estrato": est, "n": n, "con_sitio": cs, "pct_sitio": round(100 * cs / n, 1)}
        )
    mercado_out = {
        "total": emb["mercado_total"],
        "nucleo": emb["nucleo"],
        "servible": emb["servible_central"],
        "servible_rango": emb["servible_rango"],
        "zonas17": emb["nucleo_en_17_zonas"],
        "zonas17_con_sitio": emb["nucleo_en_17_zonas_con_sitio"],
        "nucleo_con_sitio": emb["nucleo_con_sitio"],
        "nucleo_sin_sitio": emb["nucleo_sin_sitio"],
        "nucleo_11mas": emb["nucleo_de_11_personas_o_mas"],
        "nucleo_11mas_con_sitio": emb["nucleo_de_11_o_mas_con_sitio"],
        "expansion": emb["expansion"],
        "ganable_12m": [
            emb["escenarios"]["bajo"]["12"]["activos"],
            emb["escenarios"]["alto"]["12"]["activos"],
        ],
        "estratos": estratos,
        # [medida propia] ENDUTIH 2024 (INEGI, 2025) y DENUE: cifras ya citadas en el estudio de mercado
        "usa_internet_pct": 83.1,
        "celular_pct": 97.2,
        "micro_con_sitio_pct": 0.8,
        "micro_n": 657347,
        # muestra de cartas (rama agente/muestra-500-cartas, §11.2): 20 de 200 = 0.100 [medida]
        "muestra": {
            "intentos": 200,
            "completas": 20,
            "tasa": 0.100,
            "con_sitio_universo": 17827,
            "alcanzables": 1780,
            "rango": [1250, 2500],
        },
    }

    # --- capacidad con eventos (simulador, semilla fija) -----------------------------------
    usd = {"e1": 12, "e2": 30, "e3": 44, "e4": 54}  # [documento] anuncios-y-capa §0
    escalones = []
    for e in anuncios["escalones"]:
        if e["forma"] != "eventos":
            continue
        escalones.append(
            {
                "clave": e["clave"],
                "procesos": e["procesos"],
                "plan": e["plan"],
                "gratuitos": e["gratuito"]["n"],
                "muro_gratuitos": e["gratuito"]["muro"],
                "paga": e["paga"]["n"],
                "muro_paga": e["paga"]["muro"],
                "n_cpu": e["gratuito"]["n_cpu"],
                "n_disco": e["gratuito"]["n_disco"],
                "n_conexiones": e["gratuito"]["n_conexiones"],
                "usd": usd[e["clave"]],
            }
        )
    cap = {"escalones": escalones, "replicas_n": anuncios["muro_conexiones_n_gratuitos"]}

    # --- disco ------------------------------------------------------------------------------
    cortas = {
        "P00": "Plan 03 §7 como está escrito",
        "P0": "12 meses de historial en línea",
        "P1": "+ analítica sólo 30 días",
        "P2": "+ historial 3 meses, resto archivado",
        "P3": "+ sin 4 índices de la analítica",
        "P4": "+ analítica en bruto 7 días",
        "P5": "+ historial en línea 1 mes",
    }
    palancas = []
    for c in disco["capacidad"]:
        k = c["palanca"].split(" ")[0]
        palancas.append(
            {
                "clave": k,
                "nombre": cortas[k],
                "paga": c["N_todo de paga"],
                "paga_reserva": c["N_todo de paga_con_reserva"],
                "mixto_80_20": c["N_80/20"],
                "gratuito": c["N_todo gratuito"],
                "mb_paga": c["mb_paga"],
            }
        )
    por_perfil = disco["por_perfil"]
    disco_out = {"palancas": palancas, "bytes_visita": [7.1, 8.5]}  # KB [medida: disco §0]
    disco_out["perfil_mediano"] = {
        "visitas_mes": por_perfil["mediano"]["visitas_mes"] if "mediano" in por_perfil else None
    }

    # --- planes -----------------------------------------------------------------------------
    pl = planes["planes"]
    plan_out = {
        "cobertura_platillos": planes["cobertura_platillos"],
        "empuja": {
            "mesas": {"pct": 39, "bajo": 16, "alto": 71},
            "cuentas": {"pct": 36, "bajo": 24, "alto": 54},
            "platillos": {"pct": 10.8},
        },  # [supuesto] mesas y cuentas; [medida] platillos (tres planes §0)
        "negocios_722511": 72521,
        "empujados": 28300,
        "equilibrio": planes["equilibrio"],
        "costo_fijo_1000": 2569,  # [documento] planes-y-costo §0
        "escenarios": planes["escenarios"],
        "planes": {
            k: {
                "costo": v["costo_sin_soporte_ni_comision"],
                "mb": v["mb_en_linea"],
                "caben_5gb": v["restaurantes_en_5gb_solo_de_este_plan"],
            }
            for k, v in pl.items()
        },
        "margen": {
            "Servicio": pl["Servicio"]["margen_pct_por_precio"],
            "Salón": pl["Salón"]["margen_pct_por_precio"],
        },
    }

    # --- precio -----------------------------------------------------------------------------
    sust = {s["nombre"]: s["mxn_mes"] for s in corredor["sustitutos"]}
    precio_out = {
        "sustitutos": {
            "Meniu": sust["Meniu Business"],
            "Fudo Avanzado": 652,
            "Fudo + mesas": 745,
        },
        "evaluacion": corredor["evaluacion"],
        "precio_por_K": corredor["precio_por_K_y_sustituto"],
        "soporte": corredor["soporte_K0_5"],
        "volumen": corredor["volumen"],
        "salon": corredor["salon"],
        "formula": {
            "costo_var_mediano": 1.9,
            "fijo": 3.0,
            "stripe_pct": 0.036,
            "stripe_fijo": 3.0,
            "iva": 0.16,
        },
    }

    # --- matriz de funciones (CSV de 14-nov) -------------------------------------------------
    rows = list(csv.DictReader((INV / "2026-11-14-funciones-y-precios.csv").open(encoding="utf-8")))
    elegidos = [
        ("Meniu", "Business"),
        ("Fudo", "Avanzado"),
        ("MenuTiger", "Advanced"),
        ("OlaClick", "Premium"),
        ("Last.app", "Starter"),
        ("Poster", "Business"),
        ("Soft Restaurant Cloud", "Lite"),
        ("Waitry", "Premium"),
        ("Neolo", "Plan 0"),
        ("Loyverse", "POS gratis"),
    ]
    trabajos = [
        ("menu_qr", "Menú QR"),
        ("pedir_mesa", "Pedir desde la mesa"),
        ("grupo", "Pedir en grupo"),
        ("comanda_app", "Comanda al mesero"),
        ("cocina", "Pantalla de cocina"),
        ("pos", "Caja (POS)"),
        ("pago_mesa", "Pago en mesa"),
        ("factura", "Factura"),
        ("reservas", "Reservas"),
        ("reparto", "Reparto"),
        ("inventario", "Inventario"),
        ("reportes", "Reportes"),
    ]
    filas = []
    for prov, plan in elegidos:
        r = next(x for x in rows if x["proveedor"].startswith(prov) and x["plan"] == plan)
        celdas = []
        for k, _ in trabajos:
            v = r[k].strip()
            celdas.append("si" if v == "1" else "no" if v == "0" else "np")
        filas.append(
            {"nombre": prov, "plan": plan, "precio": int(r["precio_mxn_mes"]), "celdas": celdas}
        )
    matriz = {"trabajos": [t for _, t in trabajos], "filas": filas}

    return {
        "mercado": mercado_out,
        "capacidad": cap,
        "disco": disco_out,
        "planes": plan_out,
        "precio": precio_out,
        "matriz": matriz,
    }


if __name__ == "__main__":
    d = cargar()
    (AQUI / "datos" / "datos_v4.json").write_text(
        json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print("escrito datos/datos_v4.json")
