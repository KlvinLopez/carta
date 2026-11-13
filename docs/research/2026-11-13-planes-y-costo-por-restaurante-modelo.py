"""Modelo de costo y capacidad por restaurante (apoya docs/research/2026-11-13-planes-y-costo-por-restaurante.md).

Sin dependencias: `python3 docs/research/2026-11-13-planes-y-costo-por-restaurante-modelo.py`.
Cada constante lleva su origen; cambia un número y vuelve a correr para rehacer las tablas del informe.
"""

from __future__ import annotations

# --- Costos por petición: modelo de capacidad (perf/2026-11-13-modelo-de-capacidad.md) [medida aquí] ---
S_MS = 3.3  # ms de CPU por petición, mezcla realista (±2× en Railway)
BYTES_304 = 580  # cabeceras de un 304 de sondeo
BYTES_MEZCLA = 640  # 93 % 304 + 5 % 200 (1.7 KB) + resto
SONDEO_POR_MIN = 20  # 1 cada 3 s (INTERVALO_SONDEO_MS = 3000, fijo hoy)
# Tope de la configuración de hoy (2 workers): comensales con la app abierta a 70 % de CPU
TOPE_COMENSALES = {
    "hoy (2 workers)": 1200,
    "4 workers": 2200,
    "8 workers": 4000,
}  # ×1.8 y ×3.3 [estimada]

# --- Precios leídos el 13-nov-2026 [fuente externa] ---
USD_VCPU_S = 20 / (30 * 24 * 3600)  # Railway 20 USD/vCPU-mes
USD_GB_RAM_MES = 10.0
USD_GB_EGRESS = 0.05
USD_GB_VOLUMEN_MES = 0.15
USD_GB_R2_MES = 0.015
USD_OPUS_IN, USD_OPUS_OUT = 4 / 1e6, 20 / 1e6  # claude-opus-5-5 por token
USD_HAIKU_IN, USD_HAIKU_OUT = 0.10 / 1e6, 0.50 / 1e6
MXN_USD = 18.6188  # FIX Banxico 12-nov-2026

# --- Fases de la visita: (nombre, fracción de la visita, fracción con la app abierta al frente) [estimada] ---
FASES = [
    ("1 Entran y ven el menú", 0.10, 1.0),
    ("2 Arman la orden en grupo", 0.13, 1.0),
    ("3 Esperan la comida", 0.25, 0.4),
    ("4 Se sirve y comen", 0.38, 0.1),
    ("5 Cuenta cerrada y propina", 0.07, 1.0),
    ("6 Pagan (el mesero valida)", 0.05, 0.6),
    ("7 Mesa limpia (ya se fueron)", 0.02, 0.0),
]

# --- Perfiles (ver informe §1) ---
# mesas, platillos, ppm = personas por mesa, visitas_dia = mesas atendidas al día (con rotación),
# minutos = duración de la visita, pico_ocup = ocupación en la hora pico, con_foto = parte de platillos con foto
PERFILES = {
    "Chico (fonda / taquería)": dict(
        mesas=10, platillos=30, ppm=2.3, visitas_dia=60, minutos=25, pico_ocup=0.8, con_foto=0.2
    ),
    "Mediano (cafetería / casual)": dict(
        mesas=18, platillos=55, ppm=2.6, visitas_dia=60, minutos=50, pico_ocup=0.8, con_foto=0.4
    ),
    "Grande (casual lleno)": dict(
        mesas=40, platillos=90, ppm=3.0, visitas_dia=150, minutos=75, pico_ocup=0.85, con_foto=0.6
    ),
    "Formal (cena / hotel)": dict(
        mesas=25, platillos=80, ppm=3.0, visitas_dia=50, minutos=110, pico_ocup=0.8, con_foto=0.7
    ),
}
DIAS_MES = 30
USO_APP = 0.6  # parte de los comensales que abre la app (el resto pide al mesero) [estimada]
FOTO_ORIGINAL_KB = (
    3000  # foto de teléfono 12 MP [estimada]; el detalle y la miniatura salen de procesar_foto
)
FOTO_DETALLE_KB, FOTO_MINIATURA_KB = (
    90,
    15,
)  # [medida aquí] con material gráfico real; cota de ruido 413 / 56 KB
DB_KB_PLATILLO = 1.1  # 865 B medidos con URLs locales + URLs de R2 más largas
DB_KB_VISITA = 12  # ≈ 50 filas (sesión, miembros, órdenes, comanda, 30 eventos) × ~250 B con índices [estimada ±2×]


def sondeos_por_comensal(minutos: float) -> float:
    return SONDEO_POR_MIN * minutos * sum(f * a for _, f, a in FASES)


def por_perfil(p: dict) -> dict:
    comensales_visita = p["ppm"] * USO_APP
    visitas_mes = p["visitas_dia"] * DIAS_MES
    sond = sondeos_por_comensal(p["minutos"])
    peticiones_visita = (
        comensales_visita * sond * 1.07 + 14 * comensales_visita
    )  # + escrituras y menú
    cpu_s = peticiones_visita * S_MS / 1000
    bytes_mb = peticiones_visita * BYTES_MEZCLA / 1e6
    cpu_usd = cpu_s * visitas_mes * USD_VCPU_S
    egress_usd = bytes_mb * visitas_mes / 1000 * USD_GB_EGRESS
    db_mb_mes = visitas_mes * DB_KB_VISITA / 1024
    pico_comensales = p["mesas"] * p["pico_ocup"] * p["ppm"] * USO_APP
    almacen_mb = p["platillos"] * (
        DB_KB_PLATILLO / 1024
        + p["con_foto"] * (FOTO_ORIGINAL_KB + FOTO_DETALLE_KB + FOTO_MINIATURA_KB) / 1024
    )
    return dict(
        visitas_mes=visitas_mes,
        peticiones_visita=peticiones_visita,
        cpu_s_visita=cpu_s,
        mb_visita=bytes_mb,
        cpu_usd_mes=cpu_usd,
        egress_usd_mes=egress_usd,
        peticiones_mes=peticiones_visita * visitas_mes,
        db_mb_mes=db_mb_mes,
        pico_comensales=pico_comensales,
        almacen_mb=almacen_mb,
        r2_usd_mes=almacen_mb / 1024 * USD_GB_R2_MES,
        peticion_por_comensal_hora=SONDEO_POR_MIN * 60 * sum(f * a for _, f, a in FASES),
    )


FRENTE = sum(
    f * a for _, f, a in FASES
)  # parte de los teléfonos con la app al frente en un instante


def capacidad(
    p: dict, tope: int, activos: float = 0.6, relativo: float = 0.7, frente: float = 1.0
) -> float:
    """Restaurantes registrados de este perfil que caben a 70 % de CPU.
    `activos`: parte de los registrados con servicio en la hora más cargada del sistema;
    `relativo`: carga de ese restaurante frente a su propio pico en esa hora. [estimada]"""
    carga = por_perfil(p)["pico_comensales"] * relativo * activos * frente
    return tope / carga


def importacion_usd(paginas: int, platillos: int, modelo: str = "opus") -> float:
    entrada = 3500 * paginas + 1000
    salida = 60 * platillos
    if modelo == "opus":
        return entrada * USD_OPUS_IN + salida * USD_OPUS_OUT
    return entrada * USD_HAIKU_IN + salida * USD_HAIKU_OUT


if __name__ == "__main__":
    print(
        "Fases: sondeos activos por minuto de visita =",
        round(sum(f * a for _, f, a in FASES) * SONDEO_POR_MIN, 1),
    )
    for nombre, p in PERFILES.items():
        r = por_perfil(p)
        print(f"\n{nombre}")
        for k, v in r.items():
            print(f"  {k:28s} {v:12.4f}")
        for etiqueta, tope in TOPE_COMENSALES.items():
            print(
                f"  caben ({etiqueta:16s}) {capacidad(p, tope):6.0f} (todos al frente) "
                f"{capacidad(p, tope, frente=FRENTE):6.0f} (según fase) registrados"
            )
    for pag, pla in ((4, 40), (8, 100), (20, 300)):
        print(
            f"\nimportar {pag} pág / {pla} platillos: Opus {importacion_usd(pag, pla):.3f} USD, "
            f"Haiku {importacion_usd(pag, pla, 'haiku'):.4f} USD"
        )


# --- Costo de sostener N restaurantes (Railway cobra por uso; §6.3 del informe) ---
CORE_POR_COMENSAL = (
    S_MS / 1000 / 3
)  # núcleos por comensal con la app al frente (1 petición cada 3 s)


def sostener(
    n: int,
    p: dict,
    activos: float = 0.6,
    relativo: float = 0.7,
    meses_retencion: int = 6,
    palancas: float = 1.0,
) -> dict:
    """`palancas`: factor de ahorro de CPU (1.0 = hoy; 0.4 = con A+B+C+palancas de perfil, §5)."""
    r = por_perfil(p)
    conc = n * r["pico_comensales"] * relativo * activos * FRENTE
    nucleos = conc * CORE_POR_COMENSAL * palancas / 0.7  # 70 % de uso como margen
    workers = max(2, -int(-nucleos // 1))
    ram_gb = workers * 0.17 + (1.5 if n <= 100 else 3.0 if n <= 500 else 4.5)
    volumen_gb = (
        n * (r["db_mb_mes"] * meses_retencion + p["platillos"] * DB_KB_PLATILLO / 1024) / 1024
    )
    r2_gb = n * r["almacen_mb"] / 1024
    partes = {
        "workers": workers,
        "suscripcion": 20,
        "ram": ram_gb * USD_GB_RAM_MES,
        "cpu_uso": n * r["cpu_usd_mes"] * palancas,
        "egress": n * r["egress_usd_mes"] * palancas,
        "volumen": volumen_gb * USD_GB_VOLUMEN_MES,
        "r2": max(0, r2_gb - 10) * USD_GB_R2_MES,
        "staging": 10,
    }
    partes["total"] = sum(v for k, v in partes.items() if k != "workers")
    partes["volumen_gb"] = volumen_gb
    partes["r2_gb"] = r2_gb
    partes["import_unica"] = n * importacion_usd(5, p["platillos"])
    return partes


if __name__ == "__main__":
    libre = dict(PERFILES["Chico (fonda / taquería)"])
    print("\nSostener N restaurantes gratuitos (perfil chico, activos 60 %):")
    for n in (100, 500, 1000):
        for pal in (1.0, 0.4):
            s = sostener(n, libre, palancas=pal)
            print(n, "palancas", pal, {k: round(v, 1) for k, v in s.items()})
