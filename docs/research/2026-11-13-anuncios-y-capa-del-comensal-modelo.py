"""Modelo de anuncios, capa del comensal y escaleras de capacidad y conversión de Carta.

Apoya docs/research/2026-11-13-anuncios-y-capa-del-comensal.md. Es un MODELO, no una prueba.
Reutiliza el simulador de uso (2026-11-13-simulador-de-uso.py: mismas distribuciones, semilla fija).
Lee las cifras de fuentes de `2026-11-13-anuncios-y-capa-del-comensal-datos.csv` (columna `id`);
cada supuesto que no es dato lleva `marca = supuesta`. Escribe el JSON que usa el informe en PDF.

    python3 docs/research/2026-11-13-anuncios-y-capa-del-comensal-modelo.py            # ~1 min
    python3 docs/research/2026-11-13-anuncios-y-capa-del-comensal-modelo.py --rapido   # ~10 s
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
import json
import sys
from dataclasses import replace
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
SALIDA = RAIZ / "docs/informes/2026-11-13-planos-de-carta/datos/anuncios.json"

_espec = importlib.util.spec_from_file_location(
    "simulador", AQUI / "2026-11-13-simulador-de-uso.py"
)
sim = importlib.util.module_from_spec(_espec)
sys.modules["simulador"] = sim
_espec.loader.exec_module(sim)  # type: ignore[union-attr]


def cifras() -> dict[str, float]:
    """Valores numéricos del CSV por `id`."""
    datos: dict[str, float] = {}
    with open(AQUI / "2026-11-13-anuncios-y-capa-del-comensal-datos.csv", encoding="utf-8") as f:
        for fila in csv.DictReader(f):
            try:
                datos[fila["id"]] = float(fila["valor"])
            except ValueError:
                pass
    return datos


# Escalones de la escalera: (clave, nombre, forma de entrega, procesos, núcleos útiles, plan)
# núcleos útiles: 2 procesos = 2 [documento: mapa §0]; 4 procesos = 3.6 (×1.8) [documento: capacidad
# palanca 1]; 8 procesos = 6.6 (×3.3) [documento: planes §6.1, no medido en Railway].
ESCALONES = [
    ("e0", "Hoy: sondeo, 2 procesos, Hobby", "hoy", 2, 2.0, "hobby"),
    ("e1", "Con eventos, 2 procesos, Hobby", "eventos", 2, 2.0, "hobby"),
    ("e2", "Con eventos, 2 procesos, Pro", "eventos", 2, 2.0, "pro"),
    ("e3", "Con eventos, 4 procesos, Pro", "eventos", 4, 3.6, "pro"),
    ("e4", "Con eventos, 8 procesos, Pro", "eventos", 8, 6.6, "pro"),
]
CONEXIONES_ABIERTAS_MAX = 10_000  # [externa] Railway: conexiones simultáneas por dominio


def factura(sup, plan: str, workers: int, cpu_s_mes: float, gb_red: float, vol_gb: float):
    """Uso y factura de Railway; Hobby = 5 + exceso sobre 5 de uso; Pro = 20 + exceso sobre 20."""
    procesos = workers + (sup.ENTORNOS - 1) * 2
    ram_gb = procesos * sup.RAM_API_GB_PROCESO + sup.ENTORNOS * sup.PG_RAM_GB
    uso = (
        ram_gb * sup.USD_GB_RAM_MES
        + cpu_s_mes / (30 * 24 * 3600) * sup.USD_VCPU_MES
        + gb_red * sup.USD_GB_RED
        + vol_gb * sup.USD_GB_VOL_MES
    )
    base = 5.0 if plan == "hobby" else 20.0
    return uso, base + max(0.0, uso - base)


NOMBRES = {  # mismos nombres que el simulador: la semilla del fondo depende del nombre
    "gratuito": "Todos gratuitos, típicos",
    "paga": "Caso base: todos de paga, típicos",
}


def construir_mezcla(sup, partes, tam, nombre):
    esc = sim.Escenario(nombre, tuple(partes))
    fondos, mom = sim.construir(esc, sup, tam)
    return esc, fondos, mom


def n_max_forma(mom, forma, sup, dias, nucleos):
    return sim.max_n(mom, forma, sup, dias, sim.SEMILLA, nucleos)


def por_restaurante(esc, fondos, mom, forma, sup):
    """Medias por restaurante registrado: peticiones/día, visitas, disco GB/mes (régimen)."""
    eq_dia, vis_dia, ret, platillos = sim.medias_por_restaurante(esc, fondos, mom, forma, sup)
    idx = {m: i for i, m in enumerate(sim.MEDIDAS)}
    lleg_dia = sum(mom[h][idx["llegadas"]][0] for h in range(24))
    s_ms = getattr(sup, sim.FORMAS[forma]["s"])
    return dict(
        eq_dia=eq_dia,
        cpu_s_mes=eq_dia * 30 * s_ms / 1000.0,
        gb_red=eq_dia * 30 * sup.BYTES_PETICION / 1e9,
        vol_gb=vis_dia * ret * sup.KB_VISITA / 1e6 + platillos * sup.KB_PLATILLO / 1e6,
        comensales_dia=lleg_dia,
        visitas_app_mes=lleg_dia * 30 * sup.USO_APP,
        platillos=platillos,
    )


def costo_n(sup, pr, n, plan, workers):
    return factura(sup, plan, workers, n * pr["cpu_s_mes"], n * pr["gb_red"], n * pr["vol_gb"])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--rapido", action="store_true")
    args = ap.parse_args()
    dias, tam = (120, 400) if args.rapido else (364, 1500)
    c = cifras()
    base = sim.Supuestos()
    out: dict = {"semilla": sim.SEMILLA, "dias": dias, "tam": tam, "escalones": [], "pesos": {}}

    planes = {
        "gratuito": [("gratuito", 1.0, False)],
        "paga": [("paga", 1.0, False)],
    }
    mezclas = {k: construir_mezcla(base, v, tam, NOMBRES[k]) for k, v in planes.items()}
    sup_pro = replace(
        base, PG_RAM_GB=0.5
    )  # PostgreSQL con datos: 0.5 GB ilustrativo [documento: mapa §4.9]

    for clave, nombre, forma, workers, nucleos, plan in ESCALONES:
        sup = base if plan == "hobby" else sup_pro
        fila: dict = dict(
            clave=clave, nombre=nombre, forma=forma, procesos=workers, nucleos=nucleos, plan=plan
        )
        for tipo, (esc, fondos, mom) in mezclas.items():
            cpu = n_max_forma(mom, forma, sup, dias, nucleos)
            pr = por_restaurante(esc, fondos, mom, forma, sup)
            disco = int(sup.VOLUMEN_MAX_GB_HOBBY / pr["vol_gb"]) if plan == "hobby" else None
            # frente p95 por restaurante en el N de CPU, para el muro de conexiones abiertas
            d = sim.detalle(esc, fondos, mom, max(cpu, 1), forma, sup, dias)
            frente_por_rest = d["p95"] / max(cpu, 1)
            n_conex = int(CONEXIONES_ABIERTAS_MAX / frente_por_rest) if forma == "eventos" else None
            tope = min(x for x in (cpu, disco, n_conex) if x)
            muro = {
                cpu: "procesador",
                disco: "disco de 5 GB",
                n_conex: "10,000 conexiones abiertas",
            }[tope]
            uso, fact = costo_n(sup, pr, tope, plan, workers)
            piso_uso, piso_fact = costo_n(sup, pr, 0, plan, workers)
            marg = (uso - piso_uso) / tope
            fila[tipo] = dict(
                n_cpu=cpu,
                n_disco=disco,
                n_conexiones=n_conex,
                n=tope,
                muro=muro,
                comensales_dia=tope * pr["comensales_dia"],
                visitas_app_mes=tope * pr["visitas_app_mes"],
                visitas_app_mes_por_rest=pr["visitas_app_mes"],
                uso_usd=uso,
                factura_usd=fact,
                piso_factura_usd=piso_fact,
                marginal_usd_por_rest=marg,
                frente_por_rest=frente_por_rest,
            )
        fila["peso_paga_en_gratuitos"] = fila["gratuito"]["n_cpu"] / max(fila["paga"]["n_cpu"], 1)
        out["escalones"].append(fila)

    # E5: más allá del muro de conexiones: réplicas (más núcleos, mismo dominio)
    esc, fondos, mom = mezclas["gratuito"]
    pr = por_restaurante(esc, fondos, mom, "eventos", sup_pro)
    frente_por_rest = out["escalones"][-1]["gratuito"]["frente_por_rest"]
    out["muro_conexiones_n_gratuitos"] = int(CONEXIONES_ABIERTAS_MAX / frente_por_rest)
    esc_p, fondos_p, mom_p = mezclas["paga"]
    out["muro_conexiones_n_paga"] = int(
        CONEXIONES_ABIERTAS_MAX / out["escalones"][-1]["paga"]["frente_por_rest"]
    )
    # réplicas: núcleos de 13.2 (2 réplicas de 8 procesos) y 26.4 (4), CPU solo [no medido]
    out["replicas"] = []
    for nrep in (2, 4):
        nuc = 6.6 * nrep
        cpu = n_max_forma(mom, "eventos", sup_pro, dias, nuc)
        n_rep = min(cpu, out["muro_conexiones_n_gratuitos"])
        _, f_rep = costo_n(sup_pro, pr, n_rep, "pro", 8 * nrep)
        out["replicas"].append(
            dict(
                replicas=nrep,
                procesos=8 * nrep,
                nucleos=nuc,
                n_cpu_gratuito=cpu,
                n=n_rep,
                factura_usd=f_rep,
            )
        )
    # Escalón 'hoy' con 4 y 8 procesos (por si Calvin no adopta eventos)
    out["hoy_4_8"] = []
    pr_hoy = por_restaurante(*mezclas["gratuito"], "hoy", base)
    for workers, nuc in ((4, 3.6), (8, 6.6)):
        n_g = n_max_forma(mezclas["gratuito"][2], "hoy", sup_pro, dias, nuc)
        n_hobby = min(n_g, int(base.VOLUMEN_MAX_GB_HOBBY / pr_hoy["vol_gb"]))
        _, f_hobby = costo_n(base, pr_hoy, n_hobby, "hobby", workers)
        _, f_pro = costo_n(sup_pro, pr_hoy, n_g, "pro", workers)
        out["hoy_4_8"].append(
            dict(
                procesos=workers,
                nucleos=nuc,
                n_cpu_gratuito=n_g,
                n_cpu_paga=n_max_forma(mezclas["paga"][2], "hoy", sup_pro, dias, nuc),
                n_hobby=n_hobby,
                factura_hobby=f_hobby,
                factura_pro=f_pro,
            )
        )
    out["pr"] = {k: por_restaurante(*v, "eventos", base) for k, v in mezclas.items()}
    out["economia"] = economia(base, sup_pro, mezclas, dias, c)
    for e in out["escalones"]:
        g = e["gratuito"]
        e["anuncios_usd"] = {
            n: g["visitas_app_mes"] * out["economia"]["tarifas"][n]["usd_por_mil_visitas"] / 1000
            for n in ("bajo", "medio", "alto")
        }
    SALIDA.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    imprimir(out)


def imprimir(out: dict) -> None:
    print("## Escalera de capacidad (N = mínimo de los muros)")
    for e in out["escalones"]:
        g, p = e["gratuito"], e["paga"]
        print(
            f"| {e['nombre']} | {g['n']:,} ({g['muro']}) | {p['n']:,} ({p['muro']}) | "
            f"{g['comensales_dia']:,.0f} | {g['factura_usd']:.1f} / {p['factura_usd']:.1f} | "
            f"{e['peso_paga_en_gratuitos']:.2f} |"
        )
    print("muro de conexiones:", out["muro_conexiones_n_gratuitos"], out["muro_conexiones_n_paga"])
    print("réplicas:", out["replicas"])
    print("hoy 4/8:", out["hoy_4_8"])
    print(json.dumps(out["economia"], ensure_ascii=False, indent=1)[:12000])


# ============================================================================================
# ECONOMÍA: anuncios, equilibrio, escalera de conversión, capa del comensal
# ============================================================================================
PASOS = {  # (clave, plan, procesos, núcleos útiles)
    "hobby2": ("hobby", 2, 2.0),
    "hobby4": ("hobby", 4, 3.6),
    "hobby8": ("hobby", 8, 6.6),
    "pro2": ("pro", 2, 2.0),
    "pro4": ("pro", 4, 3.6),
    "pro8": ("pro", 8, 6.6),
}


def economia(base, sup_pro, mezclas, dias, c):
    mxn = base.MXN_USD
    iva = c["iva"]
    dominio = base.DOMINIO_USD_ANIO / 12
    res: dict = {"parametros": {}}
    # --- capacidad por forma y paso: N de CPU de cada tipo ---
    cap = {}
    pr = {}
    for forma in ("hoy", "eventos"):
        for clave, (plan, _w, nuc) in PASOS.items():
            sup = base if plan == "hobby" else sup_pro
            cap[(forma, clave)] = {
                t: n_max_forma(mezclas[t][2], forma, sup, dias, nuc) for t in ("gratuito", "paga")
            }
        for t in ("gratuito", "paga"):
            pr[(forma, t)] = por_restaurante(*mezclas[t], forma, base)
    frente = {t: None for t in ("gratuito", "paga")}
    for t in ("gratuito", "paga"):
        esc, fondos, mom = mezclas[t]
        n0 = cap[("eventos", "pro8")][t]
        d = sim.detalle(esc, fondos, mom, max(n0, 1), "eventos", sup_pro, dias)
        frente[t] = d["p95"] / max(n0, 1)
    lect = sum(p * (i + 1) for i, p in enumerate(base.LECTURAS_GRATIS_USO))
    usd_lectura = sim.lectura_pdf_usd(base, 6, pr[("hoy", "gratuito")]["platillos"] or 50)
    res["parametros"] = dict(
        dominio_mes=dominio,
        usd_lectura=usd_lectura,
        lecturas_gratis_medias=lect,
        frente=frente,
        visitas_app_mes={t: pr[("hoy", t)]["visitas_app_mes"] for t in ("gratuito", "paga")},
        comensales_dia={t: pr[("hoy", t)]["comensales_dia"] for t in ("gratuito", "paga")},
    )

    def costo(G, k, forma, pasos=None):
        """(USD/mes, paso) mínimo que sostiene G gratuitos y k de paga; None si no cabe."""
        mejor = None
        for clave, (plan, w, _nuc) in PASOS.items():
            if pasos and clave not in pasos:
                continue
            sup = base if plan == "hobby" else sup_pro
            cg, cp = cap[(forma, clave)]["gratuito"], cap[(forma, clave)]["paga"]
            peso = cg / max(cp, 1)
            if G + peso * k > cg:
                continue
            g, p = pr[(forma, "gratuito")], pr[(forma, "paga")]
            vol = G * g["vol_gb"] + k * p["vol_gb"]
            if plan == "hobby" and vol > base.VOLUMEN_MAX_GB_HOBBY:
                continue
            if forma == "eventos" and G * frente["gratuito"] + k * frente["paga"] > 10_000:
                continue
            _, fact = factura(
                sup,
                plan,
                w,
                G * g["cpu_s_mes"] + k * p["cpu_s_mes"],
                G * g["gb_red"] + k * p["gb_red"],
                vol,
            )
            pdf = (
                G * base.ROTACION_MES * lect * usd_lectura
                + k * base.LECTURAS_PAGA_MES_USO * usd_lectura
            )
            tot = fact + dominio + pdf
            if mejor is None or tot < mejor[0]:
                mejor = (tot, clave)
        return mejor

    def g_max(forma, k=0):
        lo = 0
        for clave in PASOS:
            cg, cp = cap[(forma, clave)]["gratuito"], cap[(forma, clave)]["paga"]
            v = int(cg - (cg / max(cp, 1)) * k)
            if forma == "eventos":  # muro de conexiones abiertas por dominio
                v = min(v, int((CONEXIONES_ABIERTAS_MAX - k * frente["paga"]) / frente["gratuito"]))
            lo = max(lo, v)
        return lo

    # --- anuncios ---
    t = {}
    for nivel in ("bajo", "medio", "alto"):
        imp = c[f"imp_visita_{nivel}"]
        pv_pers = (
            c["rpm_americas"] * c[f"mult_pais_{nivel}"]
        )  # USD por mil páginas vistas, personalizado
        pv_npa = pv_pers * (1 - c[f"perdida_npa_{nivel}"])
        t[nivel] = dict(
            impresiones=imp,
            mult_pais=c[f"mult_pais_{nivel}"],
            perdida_npa=c[f"perdida_npa_{nivel}"],
            usd_por_mil_pv_npa=pv_npa,
            usd_por_mil_pv_personalizado=pv_pers,
            usd_por_mil_visitas=imp * pv_npa,
            mxn_por_mil_visitas=imp * pv_npa * mxn,
            usd_por_mil_visitas_personalizado=imp * pv_pers,
            mxn_por_mil_visitas_personalizado=imp * pv_pers * mxn,
        )
    # contraste con la guía de CPM de compra (débil): 1 impresión × CPM × 0.68, relleno 80 %
    res["contraste_cpm_compra"] = {
        n: c[f"cpm_compra_mx_{n}"] * c["reparto_adsense"] * 0.8 for n in ("bajo", "alto")
    }
    res["tarifas"] = t
    v_g = pr[("hoy", "gratuito")]["visitas_app_mes"]
    res["ads_por_restaurante_mes_mxn"] = {n: v_g * t[n]["mxn_por_mil_visitas"] / 1000 for n in t}

    # --- equilibrio sin nadie de paga (anuncios no personalizados y, de contraste, personalizados) ---
    eq = {}
    for forma in ("hoy", "eventos"):
        topes = g_max(forma)
        costos = {G: costo(G, 0, forma) for G in range(1, topes + 1)}
        for variante, clave_tarifa in (
            ("npa", "usd_por_mil_visitas"),
            ("pers", "usd_por_mil_visitas_personalizado"),
        ):
            for nivel in t:
                tasa = t[nivel][clave_tarifa]
                sostenibles = [
                    G for G, cs in costos.items() if cs and G * v_g * tasa / 1000 >= cs[0]
                ]
                primero = sostenibles[0] if sostenibles else None
                faltan = [G for G, cs in costos.items() if cs and G not in set(sostenibles)]
                estable = (max(faltan) + 1) if (sostenibles and faltan) else primero
                eq[f"{forma}/{variante}/{nivel}"] = dict(
                    primero=primero,
                    estable=estable,
                    tope=topes,
                    visitas_mes=(primero or 0) * v_g,
                    excedente_en_tope_usd=(topes * v_g * tasa / 1000 - costos[topes][0])
                    if costos[topes]
                    else None,
                )
    res["equilibrio_solo_anuncios"] = eq
    # --- cuántos gratuitos hacen falta para que los anuncios dejen 10,000 pesos al mes netos de infraestructura ---
    meta10 = {}
    for forma in ("hoy", "eventos"):
        topes = g_max(forma)
        for nivel in t:
            tasa = t[nivel]["usd_por_mil_visitas"]
            n10 = None
            for G in range(1, topes + 1):
                cs = costo(G, 0, forma)
                if cs and (G * v_g * tasa / 1000 - cs[0]) * mxn >= 10_000:
                    n10 = G
                    break
            meta10[f"{forma}/{nivel}"] = dict(n=n10, tope=topes)
    res["meta_10000_mxn_solo_anuncios"] = meta10
    # curva para la gráfica: costo mínimo e ingreso por G
    curva = {}
    for forma in ("hoy", "eventos"):
        topes = g_max(forma)
        pts = []
        for G in sorted(
            set(
                list(range(0, min(topes, 400), 5))
                + list(range(0, topes + 1, max(1, topes // 120)))
                + [topes]
            )
        ):
            cs = costo(G, 0, forma) if G else (None)
            if G == 0:
                cs = costo(0, 0, forma)
            if cs:
                pts.append([G, cs[0], cs[1]])
        curva[forma] = pts
    res["curva_costo"] = curva
    res["g_max"] = {"hoy": g_max("hoy"), "eventos": g_max("eventos")}

    # --- meta de Calvin: 10,000 usuarios / 70 % de la capacidad ---
    meta = {}
    for forma in ("hoy", "eventos"):
        cap_hobby = cap[(forma, "hobby2")]["gratuito"]
        if plan_hobby_disco := int(base.VOLUMEN_MAX_GB_HOBBY / pr[(forma, "gratuito")]["vol_gb"]):
            cap_hobby = min(cap_hobby, plan_hobby_disco)
        G70 = int(0.7 * cap_hobby)
        cs = costo(G70, 0, forma)
        meta[forma] = dict(
            capacidad_hobby=cap_hobby,
            G70=G70,
            visitas_mes_70=G70 * v_g,
            costo_70=cs[0] if cs else None,
            ads_70_usd={n: G70 * v_g * t[n]["usd_por_mil_visitas"] / 1000 for n in t},
        )
    meta["10000_visitas_mes_usd"] = {n: 10_000 * t[n]["usd_por_mil_visitas"] / 1000 for n in t}
    meta["restaurantes_para_10000_visitas"] = 10_000 / v_g
    res["meta_calvin"] = meta

    # --- comisión de cobro y neto por comensal / restaurante ---
    def neto_tarjeta(monto_sin_iva, con_iva_en_cobro):
        """Neto en MXN de un cobro con tarjeta nacional de Stripe México (comisión + IVA)."""
        cobro = monto_sin_iva * (1 + iva) if con_iva_en_cobro else monto_sin_iva
        com = cobro * c["stripe_pct"] + c["stripe_fija"]
        return monto_sin_iva - com * (1 + iva) if con_iva_en_cobro else cobro - com * (1 + iva)

    com29_a = 29 / (1 + iva) - (29 * c["stripe_pct"] + c["stripe_fija"]) * (
        1 + iva
    )  # 29 incluye IVA
    com29_b = 29 - (29 * c["stripe_pct"] + c["stripe_fija"]) * (1 + iva)  # 29 más IVA
    res["comensal29"] = dict(
        neto_mxn_con_iva_incluido=com29_a,
        neto_mxn_mas_iva=com29_b,
        comision_pct_a=1 - com29_a / (29 / (1 + iva)),
        neto_anual_mxn_a=(348 / (1 + iva)) - (348 * c["stripe_pct"] + c["stripe_fija"]) * (1 + iva),
    )
    res["restaurante_neto_mxn"] = {str(p): neto_tarjeta(p, True) for p in (249, 349, 449)}

    # --- escalera de conversión: por k de paga, cuántos gratuitos se sostienen ---
    esc = {}
    for forma in ("hoy", "eventos"):
        for precio in (249, 349, 449):
            ing_k = neto_tarjeta(precio, True) / mxn
            filas = []
            for k in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50):
                # gratuitos sostenidos en COSTO: mayor G con costo(G,k) <= k*ingreso (sin anuncios)
                gc = 0
                for G in range(0, g_max(forma, k) + 1, 1):
                    cs = costo(G, k, forma)
                    if cs and cs[0] <= k * ing_k:
                        gc = G
                filas.append(dict(k=k, g_costo=gc, g_cap=g_max(forma, k)))
            esc[f"{forma}/{precio}"] = dict(ingreso_usd=ing_k, filas=filas)
    res["escalera_conversion"] = esc
    # costo marginal por gratuito y peso
    res["marginal"] = {
        f: {
            t: dict(
                cpu_s_mes=pr[(f, t)]["cpu_s_mes"],
                usd_marginal=(
                    pr[(f, t)]["cpu_s_mes"] / (30 * 24 * 3600) * base.USD_VCPU_MES
                    + pr[(f, t)]["gb_red"] * base.USD_GB_RED
                    + pr[(f, t)]["vol_gb"] * base.USD_GB_VOL_MES
                ),
            )
            for t in ("gratuito", "paga")
        }
        for f in ("hoy", "eventos")
    }
    res["peso_paga"] = {
        f"{f}/{cl}": cap[(f, cl)]["gratuito"] / max(cap[(f, cl)]["paga"], 1)
        for f in ("hoy", "eventos")
        for cl in PASOS
    }
    res["capacidad_por_paso"] = {f"{f}/{cl}": v for (f, cl), v in cap.items()}

    # --- 100 comensales de paga a 29 pesos ---
    com = {}
    for forma in ("hoy", "eventos"):
        for nombre, neto in (("iva_incluido", com29_a), ("mas_iva", com29_b)):
            ing = 100 * neto / mxn
            gc = 0
            for G in range(0, g_max(forma) + 1):
                cs = costo(G, 0, forma)
                if cs and cs[0] <= ing:
                    gc = G
            com[f"{forma}/{nombre}"] = dict(ingreso_usd_100=ing, gratuitos_costo=gc)
    res["cien_comensales_29"] = com

    # --- capa del comensal: costo por registrado y tasas necesarias ---
    reg = dict(
        visitas_por_persona_mes=c["visitas_persona_mes"],
        kb_visita=base.KB_VISITA,
        gb_por_registrado_anio=c["visitas_persona_mes"] * 12 * base.KB_VISITA / 1e6,
        usd_disco_por_registrado_mes=c["visitas_persona_mes"]
        * 12
        * base.KB_VISITA
        / 1e6
        * base.USD_GB_VOL_MES
        / 2,
        llm_opus_usd_por_recomendacion=(
            c["tokens_rec_entrada"] * base.USD_OPUS_IN + c["tokens_rec_salida"] * base.USD_OPUS_OUT
        )
        * base.REINTENTO_MEDIO,
    )
    reg["llm_haiku_usd_por_recomendacion"] = (
        reg["llm_opus_usd_por_recomendacion"] / c["razon_haiku_opus"]
    )
    reg["opus_mxn_por_recomendacion"] = reg["llm_opus_usd_por_recomendacion"] * mxn
    reg["haiku_mxn_por_recomendacion"] = reg["llm_haiku_usd_por_recomendacion"] * mxn
    reg["anuncios_mxn_por_visita"] = {n: t[n]["mxn_por_mil_visitas"] / 1000 for n in t}
    reg["comensales_29_por_restaurante_349"] = res["restaurante_neto_mxn"]["349"] / com29_a
    # tasas: personas distintas = visitas / visitas por persona; pagan = personas × registro × pago
    tasas = []
    for forma, N in (("hoy", 104), ("eventos", 1000)):
        cs = costo(N, 0, forma)
        personas = N * v_g / c["visitas_persona_mes"]
        for r in (0.02, 0.05, 0.10):
            for q in (0.01, 0.0218, 0.05):
                pagan = personas * r * q
                tasas.append(
                    dict(
                        forma=forma,
                        N=N,
                        personas=personas,
                        registro=r,
                        pago=q,
                        pagan=pagan,
                        ingreso_mxn=pagan * com29_a,
                        costo_mxn=cs[0] * mxn if cs else None,
                    )
                )
        reg[f"pagan_para_cubrir_costo_{forma}_{N}"] = (
            cs[0] * mxn / com29_a,
            cs[0] * mxn / com29_a / personas,
        )
    reg["pagan_para_10000_mxn"] = 10_000 / com29_a
    res["tasas_comensal"] = tasas
    res["capa_comensal"] = reg
    return res


if __name__ == "__main__":
    main()
