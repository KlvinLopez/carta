"""Saca del simulador de uso las cifras que usa el informe «Planos de Carta».

Corre el simulador (`docs/research/2026-11-13-simulador-de-uso.py`, semilla fija) y escribe
`datos/simulador.json`. Biblioteca estándar; ≈ 1 min:

    python3 docs/informes/2026-11-13-planos-de-carta/extraer_simulador.py

Qué guarda, por escenario: el N máximo por procesador (2 procesos, CPU a 70 %, p95 de 364 días)
con la forma de hoy y con eventos; el N del muro de disco (volumen de 5 GB de Hobby); el N del día
mediano (p50, «mejor caso»); y por restaurante: comensales al día, mesas, platillos, disco y costo
marginal en Railway. Además, el costo de una lectura de PDF y el piso de la factura.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from dataclasses import replace
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
RUTA_SIM = RAIZ / "docs" / "research" / "2026-11-13-simulador-de-uso.py"


def cargar_simulador():
    spec = importlib.util.spec_from_file_location("simulador", RUTA_SIM)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["simulador"] = mod
    spec.loader.exec_module(mod)
    return mod


def main() -> None:
    sim = cargar_simulador()
    sup = sim.Supuestos()
    dias, tam = 364, 1500
    salida: dict = {
        "fuente": "docs/research/2026-11-13-simulador-de-uso.py, semilla fija, 364 días",
        "pg_ram_gb": sup.PG_RAM_GB,
        "escenarios": [],
    }
    for esc in sim.ESCENARIOS:
        fondos, mom = sim.construir(esc, sup, tam)
        fila: dict = {"nombre": esc.nombre}
        for forma in ("hoy", "eventos"):
            fila[f"cpu_{forma}"] = sim.max_n(mom, forma, sup, dias, sim.SEMILLA, sup.NUCLEOS)
            fila[f"cpu_{forma}_p50"] = sim.max_n(
                mom, forma, replace(sup, PERCENTIL=0.50), dias, sim.SEMILLA, sup.NUCLEOS
            )
        fila["disco"] = sim.bisecar(
            lambda n, e=esc, fo=fondos, m=mom: (
                sim.uso_para_n(e, fo, m, n, "hoy", sup)["vol_gb"] <= sup.VOLUMEN_MAX_GB_HOBBY
            )
        )
        fila["disco_retencion_30"] = sim.bisecar(
            lambda n, e=esc, fo=fondos, m=mom: (
                sim.uso_para_n(e, fo, m, n, "hoy", replace(sup, RETENCION_DIAS_PAGA=30))["vol_gb"]
                <= sup.VOLUMEN_MAX_GB_HOBBY
            )
        )
        d = sim.detalle(esc, fondos, mom, 100, "hoy", sup, 60)
        fila["por_restaurante"] = {
            "comensales_dia": d["comensales_dia"] / 100,
            "mesas": d["mesas"] / 100,
            "platillos": d["platillos"] / 100,
            "fotos": d["fotos"] / 100,
            "disco_gb": d["vol_gb"] / 100,
        }
        for forma in ("hoy", "eventos"):
            u0 = sim.uso_para_n(esc, fondos, mom, 0, forma, sup)["uso"]
            u100 = sim.uso_para_n(esc, fondos, mom, 100, forma, sup)["uso"]
            fila[f"usd_marginal_{forma}"] = (u100 - u0) / 100
        # frente (pantallas encendidas) p95 en la hora pico con el N que cabe con eventos
        n_ev = min(fila["cpu_eventos"], fila["disco"])
        de = sim.detalle(esc, fondos, mom, max(n_ev, 1), "eventos", sup, dias)
        fila["con_eventos"] = {
            "n": n_ev,
            "frente_p95": de["p95"],
            "comensales_dia": de["comensales_dia"],
            "comensales_mes": de["comensales_mes"],
            "factura_usd": de["usd"]["factura"],
        }
        salida["escenarios"].append(fila)
        print(fila["nombre"], fila["cpu_hoy"], fila["cpu_eventos"], fila["disco"], flush=True)
    salida["usd_lectura_pdf_6_paginas_50_platillos"] = sim.lectura_pdf_usd(sup, 6, 50)
    salida["piso_factura_usd"] = sim.costos_railway(sup, sup.WORKERS, 0, 0, 0)["factura"]
    salida["lecturas_gratis_medias"] = sum(
        p * (i + 1) for i, p in enumerate(sup.LECTURAS_GRATIS_USO)
    )
    salida["lecturas_paga_mes"] = sup.LECTURAS_PAGA_MES_USO
    salida["rotacion_mes"] = sup.ROTACION_MES
    salida["uso_app"] = sup.USO_APP
    (AQUI / "datos").mkdir(exist_ok=True)
    (AQUI / "datos" / "simulador.json").write_text(
        json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print("escrito datos/simulador.json")


if __name__ == "__main__":
    main()
