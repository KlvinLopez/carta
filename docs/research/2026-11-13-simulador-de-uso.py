"""Simulador de uso de Carta por plan (apoya docs/research/2026-11-13-mapa-de-procesos-y-costos.md).

Es un MODELO, no una prueba de carga: predice hasta dónde llegan los servicios que se pagan hoy.
Sólo biblioteca estándar, semilla fija. Uso:

    python3 docs/research/2026-11-13-simulador-de-uso.py            # informe completo (~1 min)
    python3 docs/research/2026-11-13-simulador-de-uso.py --rapido   # menos muestras
    python3 docs/research/2026-11-13-simulador-de-uso.py --distribuciones mi.json

`--distribuciones` sustituye PERFILES y MEZCLAS (p. ej. con lo que entregue la estadística de cartas
y personal, rama `agente/estadistica-de-cartas-y-personal`). Formato: {"perfiles": {...}, "mezclas": {...}}.

Marcas de cada supuesto: [medida] (medida en una sesión previa o aquí), [documento] (lo dice un
documento del repositorio), [externa] (página leída el 13-nov-2026), [estimada] (juicio, con ±),
[PENDIENTE] (lo medirá otra rama o la T-4.4; se usa el valor conservador indicado).

Cómo funciona (en llano): para cada hora del día se arma un «fondo» de restaurantes-hora simulados
(tamaño, mesas ocupadas, personas, quién abre la app, en qué fase de la mesa está y si tiene la
pantalla encendida). La carga de N restaurantes es la suma de N sorteos de ese fondo (aproximación
normal con corrección de asimetría), multiplicada por un factor común del día (día de la semana y
azar). Se repite por 364 días y se lee el percentil de la hora más cargada.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import statistics
from dataclasses import dataclass, replace

SEMILLA = 20261113


# ============================================================================================
# SUPUESTOS (todo lo que se puede cambiar está aquí; cambiar uno recalcula todo)
# ============================================================================================
@dataclass(frozen=True)
class Supuestos:
    # --- CPU y red [medida]: docs/plan/perf/2026-11-13-modelo-de-capacidad.md ---
    S_MS: float = 3.3  # ms de CPU por petición, mezcla realista de sondeo (±2× en Railway)
    S_MS_OPT: float = 2.0  # con palancas 1-5 de capacidad (1.5-2 ms) [documento, estimada]
    S_PERSONAL_MS: float = 10.0  # ms por sondeo del personal (vista de estatus) [estimada, M4]
    S_ESCRITURA_MS: float = 6.0  # ms por escritura/entrar/confirmar [medida: 5.7-10 entrar]
    PETICIONES_POR_COMENSAL_VISITA: float = 14  # además del sondeo [documento: planes §3.2]
    BYTES_PETICION: float = 640  # mezcla 93 % 304 [medida]
    NUCLEOS: float = 2.0  # WORKERS=2 hoy [documento]; 4 workers ≈ 3.6 núcleos útiles [estimada]
    UTILIZACION_MAX: float = 0.70  # tope de diseño [documento: capacidad §3]
    # --- Entrega de «cambió algo» ---
    # Intervalo de sondeo (s) por fase 1..7; 0 = detenido
    INTERVALO_HOY: tuple = (3, 3, 3, 3, 3, 3, 0)  # [documento] INTERVALO_SONDEO_MS = 3000
    INTERVALO_FASE: tuple = (5, 3, 10, 20, 3, 5, 0)  # [documento] planes §5 alternativa A
    # Eventos con respaldo [PENDIENTE: rama medicion-eventos-frente-a-sondeo]; valores conservadores
    # [medida] docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md (rama medicion-eventos-frente-a-sondeo,
    # commit 41b2608, primera página); avisos por minuto: [estimada] de su mapa de eventos §1
    EV_RESPALDO_S: float = 60.0  # pregunta de respaldo cada 60 s [medida]
    EV_LATIDO_S: float = 25.0  # latido de la conexión abierta [medida]
    EV_LATIDO_MS: float = 0.09  # CPU por latido [medida]
    EV_AVISOS_MIN: float = (
        1.0  # avisos por minuto por teléfono al frente (0.7-1 promedio, 2-3 pico)
    )
    EV_AVISO_MS: float = (
        4.2  # CPU por aviso con la lectura 200 que provoca, sin la escritura [medida]
    )
    EV_CONEXIONES_MAX: int = 10_000  # [externa] Railway: 10,000 conexiones simultáneas
    # --- Personal ---
    PERSONAL_INTERVALO_S: float = 5.0  # [documento] 02 §6
    PERSONAL_INTERVALO_EV_S: float = 60.0  # el personal usa el mismo respaldo de 60 s [supuesto]
    MESAS_POR_MESERO: float = 6.0  # [estimada]
    DUENO_PANEL: float = 0.3  # parte de las horas con el panel del dueño abierto [estimada]
    # --- Comensales ---
    USO_APP: float = 0.6  # parte de comensales que abre la app [estimada ±0.2]
    # Fases de la visita (Spec 001): fracción del tiempo y fracción con pantalla encendida
    FASE_TIEMPO: tuple = (0.10, 0.13, 0.25, 0.38, 0.07, 0.05, 0.02)  # [estimada]
    FASE_FRENTE: tuple = (1.0, 1.0, 0.4, 0.1, 1.0, 0.6, 0.0)  # [estimada, la más débil]
    ACTIVOS: float = 0.60  # parte de registrados que opera en un día cualquiera [estimada]
    FACTOR_OCUPACION: float = 1.0  # multiplicador de la ocupación pico (sensibilidad)
    FACTOR_DURACION: float = 1.0  # multiplicador de la duración de la visita (sensibilidad)
    WIFI_COMPARTIDO: float = 0.7  # parte de teléfonos del local en el WiFi del local [estimada]
    CF_REGLA_RPS: float = 30.0  # [externa] 300 peticiones por 10 s por IP (Cloudflare Free)
    SIGMA_DIA: float = 0.15  # variación común entre días (lognormal) [estimada]
    DIA_SEMANA: tuple = (0.80, 0.85, 0.90, 1.00, 1.30, 1.35, 0.95)  # lun..dom, media 1.02
    # --- Datos y almacenamiento ---
    KB_VISITA: float = 12.0  # [estimada ±2×] planes §2.1
    KB_PLATILLO: float = 1.1  # [medida] planes §2.1
    RETENCION_DIAS_GRATIS: int = 30  # [propuesta, sin decidir] planes §7.2
    RETENCION_DIAS_PAGA: int = 365  # [propuesta, sin decidir]
    FOTO_MB_PLATILLO: float = 3.1  # original 3 MB + variantes [estimada]
    # --- Precios (13-nov-2026) [externa] ---
    USD_VCPU_MES: float = 20.0  # docs.railway.com/reference/pricing/plans
    USD_GB_RAM_MES: float = 10.0
    USD_GB_RED: float = 0.05
    USD_GB_VOL_MES: float = 0.15
    USD_GB_R2_MES: float = 0.015  # developers.cloudflare.com/r2/pricing (10 GB gratis)
    R2_GRATIS_GB: float = 10.0
    # Railway Hobby [externa: docs.railway.com/reference/pricing/plans y /faqs, 13-nov-2026]:
    # 5 USD de suscripción que incluyen 5 USD de uso; el excedente se cobra; volumen de 5 GB.
    HOBBY_SUSCRIPCION: float = 5.0
    HOBBY_INCLUIDO: float = 5.0
    ENTORNOS: int = 2  # staging y producción encendidos [dato de Calvin, 13-nov]
    RAM_API_GB_PROCESO: float = 0.16  # [medida] ≈ 160 MB por proceso en reposo (capacidad M5)
    # Memoria de PostgreSQL y del servicio de respaldo en Railway por entorno: DEDUCIDA de la
    # factura real (Usage by Project, 13-nov-2026 ≈ 04:35 UTC; ver `deducir_de_la_factura`):
    # memoria media por entorno ≈ 0.405 GB (0.365-0.455) menos la API medida (2 × 0.16 GB).
    # Supuesto: el ciclo de cobro cubre todo el tiempo desplegado; producción desde el 11-nov 12:00.
    PG_RAM_GB: float = 0.085
    PG_RAM_GB_ALTO: float = 0.135  # producción desplegada al final del 11-nov (rango alto)
    DOMINIO_USD_ANIO: float = 25.0  # [dato de Calvin, 13-nov]; no entra en la factura de Railway
    # Medios por platillo con foto y modelo 3D (sin realidad aumentada)
    FOTO_ORIGINAL_MB: float = 3.0  # [estimada ±2×] foto de teléfono 12 MP; no hay original real
    FOTO_DETALLE_KB: float = 81.0  # [medida] 35-81 KB; se toma el máximo medido
    FOTO_MINIATURA_KB: float = 16.0  # [medida] 7-16 KB
    GLB_MB: float = 4.0  # [documento] docs/mvp/05_3D_Pipeline.md §4: presupuesto duro del .glb
    POSTER_KB: float = 81.0  # póster WebP 1200 px ≈ foto de detalle [documento + medida]
    R2_CLASE_B_GRATIS: float = 10e6  # [externa] 10 millones al mes
    USD_CLASE_B_M: float = 0.36  # [externa] por millón
    USD_OPUS_IN: float = 4 / 1e6  # platform.claude.com/docs/en/about-claude/pricing
    USD_OPUS_OUT: float = 20 / 1e6
    MXN_USD: float = 18.6188  # FIX Banxico 12-nov-2026
    VOLUMEN_MAX_GB_HOBBY: float = 5.0  # [externa]
    VOLUMEN_MAX_GB_PRO: float = 1000.0  # [externa] 1 TB
    # --- Límites de servicios [externa salvo nota] ---
    PG_MAX_CONEXIONES: int = 100  # [estimada, SIN VERIFICAR: la página de Railway no lo dice]
    DB_POOL: int = 20  # DB_POOL_SIZE 10 + DB_MAX_OVERFLOW 10 por worker [documento]
    WORKERS: int = 2
    FIREBASE_MAU_GRATIS: int = 50_000  # firebase.google.com/pricing (Identity Platform)
    OPERADORES_POR_RESTAURANTE: float = 1.5  # [estimada]
    # --- Lecturas de PDF ---
    LECTURAS_GRATIS_TOPE: int = 3  # Calvin 13-nov: 3 intentos en total, una sola vez
    LECTURAS_GRATIS_USO: tuple = (0.55, 0.30, 0.15)  # P(1, 2, 3 lecturas) [estimada]
    LECTURAS_PAGA_MES_USO: float = 0.5  # lecturas por mes de un restaurante de paga [estimada]
    ROTACION_MES: float = 0.04  # altas nuevas por mes sobre N (crecimiento/rotación) [estimada]
    TOKENS_PAGINA: int = 3500  # [estimada ±30 %] planes §3.5
    TOKENS_BASE: int = 1000
    TOKENS_SALIDA_PLATILLO: int = 60
    REINTENTO_MEDIO: float = 1.3  # corridas medias por lectura (MAX_CORRIDAS = 3) [estimada]
    # --- Objetivo de la simulación ---
    PERCENTIL: float = 0.95  # «cabe con 95 % de probabilidad»


# ============================================================================================
# PERFILES y MEZCLAS (sustituibles con --distribuciones)
# ============================================================================================
# Cada perfil: rangos (mín, moda, máx) triangulares, salvo lo escalar. [estimada] salvo platillos
# (contados en 12 cartas, planes §1.2). `picos` = (hora_centro, sigma_h, peso) de la curva de
# ocupación; la comida fuerte es 14-16 y la cena 20-22 [externa: chilango.com, planes §1.1].
PERFILES = {
    "chico": dict(
        mesas=(6, 10, 14),
        ppm=(1.8, 2.3, 3.0),
        platillos=(15, 30, 45),
        personal=(2, 3, 4),
        minutos=(20, 25, 35),
        visitas_dia=(40, 60, 90),
        pico_ocup=0.8,
        con_foto=0.2,
        picos=((9.0, 1.0, 0.3), (14.5, 1.3, 1.0), (21.0, 1.3, 0.7)),
        apertura=(8, 22),
    ),
    "mediano": dict(
        mesas=(12, 18, 26),
        ppm=(2.0, 2.6, 3.4),
        platillos=(30, 55, 80),
        personal=(3, 4, 6),
        minutos=(35, 50, 70),
        visitas_dia=(40, 60, 90),
        pico_ocup=0.8,
        con_foto=0.4,
        picos=((9.0, 1.0, 0.5), (14.5, 1.3, 1.0), (20.0, 1.3, 0.6)),
        apertura=(8, 21),
    ),
    "grande": dict(
        mesas=(30, 40, 60),
        ppm=(2.5, 3.0, 4.0),
        platillos=(60, 90, 140),
        personal=(8, 10, 14),
        minutos=(55, 75, 95),
        visitas_dia=(110, 150, 200),
        pico_ocup=0.85,
        con_foto=0.6,
        picos=((14.5, 1.3, 1.0), (21.0, 1.3, 0.9)),
        apertura=(12, 24),
    ),
    "formal": dict(
        mesas=(15, 25, 35),
        ppm=(2.5, 3.0, 4.0),
        platillos=(50, 80, 120),
        personal=(6, 8, 10),
        minutos=(80, 110, 140),
        visitas_dia=(35, 50, 70),
        pico_ocup=0.8,
        con_foto=0.7,
        picos=((14.5, 1.2, 0.8), (21.0, 1.3, 1.0)),
        apertura=(13, 24),
    ),
}
# Mezcla de tamaños por plan [estimada]. «paga» es la de planes §6.2. 96 % de las unidades son
# microempresas [externa: INEGI-CANIRAC 2021], por eso el gratuito es sobre todo chico.
MEZCLAS = {
    "gratuito": {"chico": 0.60, "mediano": 0.25, "grande": 0.05, "formal": 0.10},
    "paga": {"mediano": 0.50, "grande": 0.25, "formal": 0.25},
}
# Topes por plan. Gratuito: 10 mesas × 6 [Calvin 13-nov]; personal 3. Paga: 40 mesas × 12,
# personal 20 [Calvin 13-nov]. Platillos: 60 / 300 [propuesta anterior; la decide la estadística].
TOPES = {
    "gratuito": dict(mesas=10, ppm_max=6, platillos=80, personal=3),
    "paga": dict(mesas=40, ppm_max=12, platillos=300, personal=20),
}


def cargar_distribuciones(ruta: str) -> None:
    with open(ruta, encoding="utf-8") as f:
        datos = json.load(f)
    if "perfiles" in datos:
        PERFILES.clear()
        for k, v in datos["perfiles"].items():
            PERFILES[k] = {
                c: (tuple(x) if isinstance(x, list) and c != "apertura" else x)
                for c, x in v.items()
            }
            PERFILES[k]["picos"] = tuple(tuple(p) for p in v["picos"])
            PERFILES[k]["apertura"] = tuple(v["apertura"])
    if "mezclas" in datos:
        MEZCLAS.clear()
        MEZCLAS.update(datos["mezclas"])


# ============================================================================================
# ESCENARIOS
# ============================================================================================
@dataclass(frozen=True)
class Escenario:
    nombre: str
    # lista de (plan, peso, al_tope); al_tope = cada restaurante en el tope de su plan
    partes: tuple
    activos: float | None = None  # sustituye Supuestos.ACTIVOS (1.0 = todos coinciden)
    nota: str = ""


ESCENARIOS = [
    Escenario("Peor caso: todos gratuitos al tope (10 mesas × 6)", (("gratuito", 1.0, True),)),
    Escenario(
        "Peor caso + todos coinciden a la vez",
        (("gratuito", 1.0, True),),
        activos=1.0,
        nota="ninguno descansa ese día",
    ),
    Escenario("Todos gratuitos, típicos", (("gratuito", 1.0, False),)),
    Escenario(
        "Mezcla 90 % gratuitos / 10 % paga", (("gratuito", 0.9, False), ("paga", 0.1, False))
    ),
    Escenario(
        "Mezcla 80 % gratuitos / 20 % paga", (("gratuito", 0.8, False), ("paga", 0.2, False))
    ),
    Escenario("Caso base: todos de paga, típicos", (("paga", 1.0, False),)),
    Escenario("Todos de paga al tope (40 mesas × 12)", (("paga", 1.0, True),)),
]

FORMAS = {
    "hoy": dict(entrega="hoy", s="S_MS", nombre="Hoy (sondeo de 3 s)"),
    "optimizada": dict(entrega="fase", s="S_MS_OPT", nombre="Sondeo por fase + palancas de CPU"),
    "eventos": dict(
        entrega="eventos", s="S_MS", nombre="Eventos con respaldo (medidos, sin palancas)"
    ),
}

# ============================================================================================
# FONDO DE RESTAURANTES-HORA
# ============================================================================================
MEDIDAS = (
    "personas",  # personas sentadas
    "usuarios",  # con la app abierta
    "frente",  # con la pantalla encendida
    "eq_hoy",  # peticiones equivalentes/s (1 equivalente = una petición de sondeo de S_MS)
    "eq_fase",
    "eq_eventos",
    "visitas",  # mesas que empiezan en esa hora
    "llegadas",  # personas que llegan en esa hora
    "mesas_ocupadas",
)


def tri(rng: random.Random, t: tuple) -> float:
    return rng.triangular(t[0], t[2], t[1])


def curva(picos: tuple, hora: float) -> float:
    """Ocupación relativa (0..1) a una hora: suma de campanas, recortada a 1."""
    v = sum(w * math.exp(-0.5 * ((hora - c) / s) ** 2) for c, s, w in picos)
    return min(1.0, v)


def sortear_restaurante(rng: random.Random, p: dict, topes: dict, al_tope: bool, sup: Supuestos):
    if al_tope:
        mesas = topes["mesas"]
        ppm = float(topes["ppm_max"])
        personal = topes["personal"]
        minutos = tri(rng, p["minutos"])
        ocup = 0.95  # peor caso: lleno en la hora pico
        platillos = topes["platillos"]
    else:
        mesas = min(round(tri(rng, p["mesas"])), topes["mesas"])
        ppm = min(tri(rng, p["ppm"]), float(topes["ppm_max"]))
        personal = min(round(tri(rng, p["personal"])), topes["personal"])
        minutos = tri(rng, p["minutos"])
        ocup = min(0.98, p["pico_ocup"] * sup.FACTOR_OCUPACION)
        platillos = min(round(tri(rng, p["platillos"])), topes["platillos"])
    return dict(
        mesas=max(1, mesas),
        ppm=max(1.0, ppm),
        personal=max(1, personal),
        minutos=minutos * sup.FACTOR_DURACION,
        ocup=ocup,
        platillos=platillos,
        con_foto=p["con_foto"],
        picos=p["picos"],
        apertura=p["apertura"],
    )


def sortear_hora(rng: random.Random, r: dict, hora: int, sup: Supuestos) -> tuple:
    """Un restaurante en una hora: vector de MEDIDAS (en el orden de MEDIDAS)."""
    a, c = r["apertura"]
    if not (a <= hora < c):
        return (0.0,) * len(MEDIDAS)
    occ = r["ocup"] * curva(r["picos"], hora + 0.5)
    ocupadas = rng.binomialvariate(r["mesas"], min(1.0, occ))
    if ocupadas == 0:
        return (0.0,) * len(MEDIDAS)
    media = ocupadas * r["ppm"]
    personas = int(
        min(
            ocupadas * (r["ppm"] * 2.2 + 1),
            max(ocupadas, rng.gauss(media, 1.2 * math.sqrt(ocupadas))),
        )
    )
    usuarios = rng.binomialvariate(personas, sup.USO_APP)
    # reparto entre fases: multinomial secuencial; luego pantalla encendida por fase
    restantes, prob_resto = usuarios, 1.0
    frente_f = []
    for t, f in zip(sup.FASE_TIEMPO, sup.FASE_FRENTE, strict=True):
        n = restantes if t >= prob_resto - 1e-9 else rng.binomialvariate(restantes, t / prob_resto)
        restantes -= n
        prob_resto -= t
        frente_f.append(rng.binomialvariate(n, f) if 0 < f < 1 else int(n * f))
    frente = sum(frente_f)

    def sondeo_rps(intervalos: tuple) -> float:
        return sum(n / i for n, i in zip(frente_f, intervalos, strict=True) if i)

    # peticiones equivalentes (1 eq = S_MS de sondeo): escritura y entrar pesan S_ESCRITURA/S_MS
    peso_esc = sup.S_ESCRITURA_MS / sup.S_MS
    visitas = ocupadas * 60.0 / r["minutos"]  # mesas que empiezan en la hora (rotación)
    llegadas = visitas * r["ppm"]
    llegan_app = llegadas * sup.USO_APP
    escrituras_rps = llegan_app * sup.PETICIONES_POR_COMENSAL_VISITA / 3600.0 * peso_esc
    mozos = max(1, min(r["personal"], math.ceil(ocupadas / sup.MESAS_POR_MESERO)))
    disp_personal = mozos + sup.DUENO_PANEL
    peso_per = sup.S_PERSONAL_MS / sup.S_MS
    eq_hoy = (
        sondeo_rps(sup.INTERVALO_HOY)
        + escrituras_rps
        + disp_personal / sup.PERSONAL_INTERVALO_S * peso_per
    )
    eq_fase = (
        sondeo_rps(sup.INTERVALO_FASE)
        + escrituras_rps
        + disp_personal / sup.PERSONAL_INTERVALO_S * peso_per
    )
    eq_ev = (
        frente / sup.EV_RESPALDO_S
        + frente / sup.EV_LATIDO_S * sup.EV_LATIDO_MS / sup.S_MS
        + frente * sup.EV_AVISOS_MIN / 60.0 * sup.EV_AVISO_MS / sup.S_MS
        + escrituras_rps
        + disp_personal / sup.PERSONAL_INTERVALO_EV_S * peso_per
    )
    return (
        personas,
        usuarios,
        frente,
        eq_hoy,
        eq_fase,
        eq_ev,
        visitas,
        llegadas,
        ocupadas,
    )


class Fondo:
    """Momentos crudos (m1, m2, m3) de cada medida y hora para una clase de restaurante."""

    def __init__(self, plan: str, al_tope: bool, sup: Supuestos, tam: int, rng: random.Random):
        topes = TOPES[plan]
        pesos = MEZCLAS[plan]
        nombres = list(pesos)
        horas = range(24)
        acum = {h: [[0.0, 0.0, 0.0] for _ in MEDIDAS] for h in horas}
        # sin cap de tope no hay variación entre restaurantes más allá del perfil
        wifi_exceso = 0
        wifi_total = 0
        max_frente = 0
        for _ in range(tam):
            perfil = PERFILES[rng.choices(nombres, [pesos[n] for n in nombres])[0]]
            r = sortear_restaurante(rng, perfil, topes, al_tope, sup)
            dia_activo = 1.0
            for h in horas:
                v = sortear_hora(rng, r, h, sup)
                for i, x in enumerate(v):
                    x *= dia_activo
                    a = acum[h][i]
                    a[0] += x
                    a[1] += x * x
                    a[2] += x**3
                # regla de Cloudflare por IP: teléfonos del local en el WiFi del local
                frente = v[2]
                if frente > 0:
                    wifi_total += 1
                    rps_wifi = sup.WIFI_COMPARTIDO * v[3]
                    if rps_wifi > sup.CF_REGLA_RPS:
                        wifi_exceso += 1
                    max_frente = max(max_frente, frente)
        self.tam = tam
        self.mom = {h: [[x / tam for x in a] for a in acum[h]] for h in horas}
        self.cf_exceso = wifi_exceso / wifi_total if wifi_total else 0.0
        self.max_frente = max_frente
        self.platillos_medios = None
        self.fotos_medias = None
        self.topes = topes
        self.plan = plan
        self.al_tope = al_tope
        self.activos = sup.ACTIVOS
        # medias estructurales (para guardados): muestreo pequeño
        sp, sf, sm = 0.0, 0.0, 0.0
        for _ in range(min(tam, 1500)):
            perfil = PERFILES[rng.choices(nombres, [pesos[n] for n in nombres])[0]]
            r = sortear_restaurante(rng, perfil, topes, al_tope, sup)
            sp += r["platillos"]
            sf += r["platillos"] * r["con_foto"]
            sm += r["mesas"]
        m = min(tam, 1500)
        self.platillos_medios, self.fotos_medias, self.mesas_medias = sp / m, sf / m, sm / m


def mezclar(fondos: list[tuple[float, Fondo]], activos: float) -> dict:
    """Momentos crudos de la mezcla por plan, ya multiplicados por la prob. de estar activo."""
    mom = {}
    for h in range(24):
        fila = []
        for i in range(len(MEDIDAS)):
            m = [0.0, 0.0, 0.0]
            for peso, f in fondos:
                for k in range(3):
                    m[k] += peso * f.mom[h][i][k]
            # restaurante activo con prob. `activos`; si no, aporta 0 (momentos escalan por prob.)
            fila.append([x * activos for x in m])
        mom[h] = fila
    return mom


def suma_n(mom_hi: list[float], n: int, z: float) -> float:
    """Sorteo de la suma de n restaurantes iid con momentos crudos dados (Cornish-Fisher)."""
    m1, m2, m3 = mom_hi
    var = max(m2 - m1 * m1, 0.0)
    if var == 0.0:
        return n * m1
    k3 = m3 - 3 * m1 * m2 + 2 * m1**3
    sd = math.sqrt(n * var)
    asim = (n * k3) / (sd**3)
    x = z + asim / 6.0 * (z * z - 1.0)
    return max(0.0, n * m1 + sd * x)


# ============================================================================================
# SIMULACIÓN DE DÍAS
# ============================================================================================
def nucleos_necesarios(eq_s: float, s_ms: float, sup: Supuestos) -> float:
    return eq_s * s_ms / 1000.0 / sup.UTILIZACION_MAX


def simular_dias(mom: dict, n: int, forma: str, sup: Supuestos, dias: int, rng: random.Random):
    """Devuelve listas por día: medidas en la hora pico, y nucleos necesarios en esa hora."""
    idx = {m: i for i, m in enumerate(MEDIDAS)}
    clave = {"hoy": "eq_hoy", "optimizada": "eq_fase", "eventos": "eq_eventos"}[forma]
    s_ms = getattr(sup, FORMAS[forma]["s"])
    sal = {"nucleos": [], "personas": [], "usuarios": [], "frente": [], "eq": []}
    for d in range(dias):
        f = sup.DIA_SEMANA[d % 7] / statistics.mean(sup.DIA_SEMANA)
        f *= math.exp(rng.gauss(-0.5 * sup.SIGMA_DIA**2, sup.SIGMA_DIA))
        mejor = None
        for h in range(24):
            z = rng.gauss(0, 1)
            eq = f * suma_n(mom[h][idx[clave]], n, z)
            if mejor is None or eq > mejor[0]:
                mejor = (eq, h, z)
        eq, h, z = mejor
        sal["eq"].append(eq)
        sal["nucleos"].append(nucleos_necesarios(eq, s_ms, sup))
        for m in ("personas", "usuarios", "frente"):
            sal[m].append(f * suma_n(mom[h][idx[m]], n, z))
    return sal


def percentil(xs: list[float], q: float) -> float:
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(q * len(xs)))]


def max_n(mom: dict, forma: str, sup: Supuestos, dias: int, seed: int, nucleos: float) -> int:
    """Mayor N con P(núcleos necesarios ≤ nucleos) ≥ PERCENTIL, por bisección."""

    def cabe(n: int) -> bool:
        s = simular_dias(mom, n, forma, sup, dias, random.Random(seed))
        return percentil(s["nucleos"], sup.PERCENTIL) <= nucleos

    if not cabe(1):
        return 0
    lo, hi = 1, 2
    while cabe(hi) and hi < 200_000:
        lo, hi = hi, hi * 2
    while hi - lo > max(1, lo // 200):
        mid = (lo + hi) // 2
        if cabe(mid):
            lo = mid
        else:
            hi = mid
    return lo


# ============================================================================================
# COSTO Y OTROS RECURSOS PARA UN N DADO
# ============================================================================================
def lectura_pdf_usd(sup: Supuestos, paginas: float, platillos: float) -> float:
    ent = sup.TOKENS_PAGINA * paginas + sup.TOKENS_BASE
    sal = sup.TOKENS_SALIDA_PLATILLO * platillos
    return (ent * sup.USD_OPUS_IN + sal * sup.USD_OPUS_OUT) * sup.REINTENTO_MEDIO


def costos_railway(sup: Supuestos, workers: int, cpu_s_mes: float, gb_red: float, vol_gb: float):
    """Uso de Railway (staging + producción) y factura Hobby = 5 USD + exceso sobre 5 USD de uso."""
    # producción con `workers` procesos; los demás entornos (staging) se quedan en 2
    procesos = workers + (sup.ENTORNOS - 1) * 2
    ram_gb = procesos * sup.RAM_API_GB_PROCESO + sup.ENTORNOS * sup.PG_RAM_GB
    usd = dict(
        ram=ram_gb * sup.USD_GB_RAM_MES,
        cpu=cpu_s_mes / (30 * 24 * 3600) * sup.USD_VCPU_MES,
        red=gb_red * sup.USD_GB_RED,
        volumen=vol_gb * sup.USD_GB_VOL_MES,
    )
    usd["uso"] = sum(usd.values())
    usd["factura"] = sup.HOBBY_SUSCRIPCION + max(0.0, usd["uso"] - sup.HOBBY_INCLUIDO)
    return usd


def medias_por_restaurante(escenario: Escenario, fondos, mom, forma: str, sup: Supuestos):
    """Por restaurante registrado: peticiones equivalentes/día, visitas/día, platillos, fotos..."""
    idx = {m: i for i, m in enumerate(MEDIDAS)}
    clave = {"hoy": "eq_hoy", "optimizada": "eq_fase", "eventos": "eq_eventos"}[forma]
    eq_dia = sum(mom[h][idx[clave]][0] for h in range(24)) * 3600.0
    vis_dia = sum(mom[h][idx["visitas"]][0] for h in range(24))
    peso = {p: w for p, w, _ in escenario.partes}
    ret = sum(
        w * (sup.RETENCION_DIAS_GRATIS if p == "gratuito" else sup.RETENCION_DIAS_PAGA)
        for p, w in peso.items()
    )
    platillos = sum(w * f.platillos_medios for (w, f) in fondos)
    return eq_dia, vis_dia, ret, platillos


def uso_para_n(escenario, fondos, mom, n: int, forma: str, sup: Supuestos) -> dict:
    """Costos y volumen de N restaurantes sin simular días (sólo medias)."""
    eq_dia, vis_dia, ret, platillos = medias_por_restaurante(escenario, fondos, mom, forma, sup)
    s_ms = getattr(sup, FORMAS[forma]["s"])
    cpu_s_mes = n * eq_dia * 30 * s_ms / 1000.0
    gb_red = n * eq_dia * 30 * sup.BYTES_PETICION / 1e9
    vol_gb = n * (vis_dia * ret * sup.KB_VISITA / 1e6 + platillos * sup.KB_PLATILLO / 1e6)
    usd = costos_railway(sup, sup.WORKERS, cpu_s_mes, gb_red, vol_gb)
    usd["vol_gb"] = vol_gb
    return usd


def detalle(escenario: Escenario, fondos, mom, n: int, forma: str, sup: Supuestos, dias: int):
    idx = {m: i for i, m in enumerate(MEDIDAS)}
    clave = {"hoy": "eq_hoy", "optimizada": "eq_fase", "eventos": "eq_eventos"}[forma]
    s = simular_dias(mom, n, forma, sup, dias, random.Random(SEMILLA))
    # medias por día (todas las horas), por restaurante registrado
    vis_dia = sum(mom[h][idx["visitas"]][0] for h in range(24))
    lleg_dia = sum(mom[h][idx["llegadas"]][0] for h in range(24))
    eq_medio_h = [mom[h][idx[clave]][0] for h in range(24)]
    eq_dia = sum(eq_medio_h) * 3600.0  # peticiones equivalentes por día y por restaurante
    peso = {p: w for p, w, _ in escenario.partes}
    ret = sum(
        w * (sup.RETENCION_DIAS_GRATIS if p == "gratuito" else sup.RETENCION_DIAS_PAGA)
        for p, w in peso.items()
    )
    platillos = sum(w * f.platillos_medios for (w, f) in fondos)
    fotos = sum(w * f.fotos_medias for (w, f) in fondos)
    mesas = sum(w * f.mesas_medias for (w, f) in fondos)
    activos = escenario.activos if escenario.activos is not None else sup.ACTIVOS
    # los momentos ya traen `activos`: vis_dia es por registrado
    cpu_s_mes = n * eq_dia * 30 * getattr(sup, FORMAS[forma]["s"]) / 1000.0
    gb_red = n * eq_dia * 30 * sup.BYTES_PETICION / 1e9
    vol_gb = n * (vis_dia * ret * sup.KB_VISITA / 1e6 + platillos * sup.KB_PLATILLO / 1e6)
    r2_gb = n * fotos * sup.FOTO_MB_PLATILLO / 1024.0
    workers = sup.WORKERS
    usd = costos_railway(sup, workers, cpu_s_mes, gb_red, vol_gb)
    usd["r2"] = max(0.0, r2_gb - sup.R2_GRATIS_GB) * sup.USD_GB_R2_MES
    # lecturas de PDF
    n_paga = n * peso.get("paga", 0.0)
    lect_gratis = sum(p * (i + 1) for i, p in enumerate(sup.LECTURAS_GRATIS_USO))
    usd_lectura = lectura_pdf_usd(sup, paginas=6, platillos=platillos or 50)
    alta_usd = n * (lect_gratis * peso.get("gratuito", 0) + 1.5 * peso.get("paga", 0)) * usd_lectura
    mes_usd = (
        n * sup.ROTACION_MES * lect_gratis * peso.get("gratuito", 0) * usd_lectura
        + n_paga * sup.LECTURAS_PAGA_MES_USO * usd_lectura
    )
    mau = n * sup.OPERADORES_POR_RESTAURANTE
    conexiones = workers * sup.DB_POOL
    return dict(
        n=n,
        p50=percentil(s["frente"], 0.50),
        p95=percentil(s["frente"], 0.95),
        p99=percentil(s["frente"], 0.99),
        personas_p95=percentil(s["personas"], 0.95),
        usuarios_p95=percentil(s["usuarios"], 0.95),
        nuc_p50=percentil(s["nucleos"], 0.50),
        nuc_p95=percentil(s["nucleos"], 0.95),
        nuc_p99=percentil(s["nucleos"], 0.99),
        comensales_dia=n * lleg_dia,
        comensales_mes=n * lleg_dia * 30,
        visitas_dia=n * vis_dia,
        mesas=n * mesas,
        platillos=n * platillos,
        fotos=n * fotos,
        peticiones_mes=n * eq_dia * 30,
        gb_red=gb_red,
        vol_gb=vol_gb,
        r2_gb=r2_gb,
        usd=usd,
        alta_pdf_usd=alta_usd,
        mes_pdf_usd=mes_usd,
        mau=mau,
        conexiones=conexiones,
        cf_exceso=max(f.cf_exceso for _, f in fondos),
        activos=activos,
        vol_pro_ok=vol_gb <= sup.VOLUMEN_MAX_GB_PRO,
        vol_hobby_ok=vol_gb <= sup.VOLUMEN_MAX_GB_HOBBY,
    )


def construir(escenario: Escenario, sup: Supuestos, tam: int):
    # semilla estable por escenario (hash() de str varía por proceso)
    rng = random.Random(SEMILLA + sum(ord(c) for c in escenario.nombre))
    activos = escenario.activos if escenario.activos is not None else sup.ACTIVOS
    fondos = []
    for plan, peso, al_tope in escenario.partes:
        fondos.append((peso, Fondo(plan, al_tope, sup, tam, rng)))
    return fondos, mezclar(fondos, activos)


# ============================================================================================
# INFORME
# ============================================================================================
def fmt(x: float, d: int = 0) -> str:
    return f"{x:,.{d}f}"


def informe(sup: Supuestos, dias: int, tam: int) -> dict:
    resultados = {}
    print("# Simulador de uso de Carta (modelo, no prueba de carga)")
    print(f"semilla {SEMILLA}, {dias} días simulados, fondo de {tam} restaurantes por clase\n")
    print("## Mayor N que cabe con 95 % de probabilidad (CPU a 70 %, 2 workers = 2 núcleos)\n")
    print("| Escenario | " + " | ".join(FORMAS[f]["nombre"] for f in FORMAS) + " |")
    print("|---|" + "---|" * len(FORMAS))
    for esc in ESCENARIOS:
        fondos, mom = construir(esc, sup, tam)
        fila = {}
        for f in FORMAS:
            fila[f] = max_n(mom, f, sup, dias, SEMILLA, sup.NUCLEOS)
        resultados[esc.nombre] = (fondos, mom, fila)
        print(f"| {esc.nombre} | " + " | ".join(fmt(fila[f]) for f in FORMAS) + " |")
    for forma in ("hoy", "optimizada", "eventos"):
        print(f"\n## Detalle con N máximo, forma «{FORMAS[forma]['nombre']}»\n")
        print(
            "| Escenario | N | Frente p50 / p95 / p99 | Núcleos p95 (tope 2) | Comensales/día | /mes | "
            "Mesas | Platillos | Factura Hobby USD/mes | USD/rest. |"
        )
        print("|---|---|---|---|---|---|---|---|---|---|")
        for esc in ESCENARIOS:
            fondos, mom, fila = resultados[esc.nombre]
            n = fila[forma]
            if n == 0:
                print(f"| {esc.nombre} | 0 | | | | | | | | |")
                continue
            d = detalle(esc, fondos, mom, n, forma, sup, dias)
            print(
                f"| {esc.nombre} | {fmt(n)} | {fmt(d['p50'])} / {fmt(d['p95'])} / {fmt(d['p99'])} | "
                f"{d['nuc_p95']:.2f} | {fmt(d['comensales_dia'])} | {fmt(d['comensales_mes'])} | "
                f"{fmt(d['mesas'])} | {fmt(d['platillos'])} | {fmt(d['usd']['factura'], 0)} | "
                f"{d['usd']['factura'] / n:.2f} |"
            )
        print(
            "\n| Escenario | Red GB/mes | Volumen GB | R2 GB | PDF alta USD | PDF mes USD | Regla CF excedida |"
        )
        print("|---|---|---|---|---|---|---|")
        for esc in ESCENARIOS:
            fondos, mom, fila = resultados[esc.nombre]
            n = fila[forma]
            if n == 0:
                continue
            d = detalle(esc, fondos, mom, n, forma, sup, dias)
            print(
                f"| {esc.nombre} | {fmt(d['gb_red'])} | {fmt(d['vol_gb'], 1)} | {fmt(d['r2_gb'], 1)} | "
                f"{fmt(d['alta_pdf_usd'], 0)} | {fmt(d['mes_pdf_usd'], 0)} | "
                f"{d['cf_exceso'] * 100:.1f} % de las restaurante-hora |"
            )
    print("\n## Hasta cuánto llega cada recurso (N de cada escenario en que topa)\n")
    topes_por_recurso(sup, resultados, dias)
    return resultados


def topes_por_recurso(sup: Supuestos, resultados: dict, dias: int) -> None:
    print(
        "| Escenario (forma hoy) | CPU 2 workers | Conexiones PG | Volumen Hobby 5 GB | Firebase 50k | Red 1 TB/mes |"
    )
    print("|---|---|---|---|---|---|")
    for esc in ESCENARIOS:
        fondos, mom, fila = resultados[esc.nombre]
        n_cpu = fila["hoy"]
        base = detalle(esc, fondos, mom, max(n_cpu, 1), "hoy", sup, dias)
        vol_por_n = base["vol_gb"] / max(n_cpu, 1)
        red_por_n = base["gb_red"] / max(n_cpu, 1)
        n_vol = int(sup.VOLUMEN_MAX_GB_HOBBY / vol_por_n) if vol_por_n else 0
        n_fb = int(sup.FIREBASE_MAU_GRATIS / sup.OPERADORES_POR_RESTAURANTE)
        n_red = int(1000 / red_por_n) if red_por_n else 0
        conex = f"{sup.WORKERS * sup.DB_POOL} de {sup.PG_MAX_CONEXIONES} (no depende de N)"
        print(
            f"| {esc.nombre} | {fmt(n_cpu)} | {conex} | {fmt(n_vol)} | {fmt(n_fb)} | {fmt(n_red)} |"
        )


def sensibilidad(sup: Supuestos, dias: int, tam: int) -> None:
    """Tornado: cuánto cambia el N máximo (forma hoy) de dos escenarios al mover cada supuesto."""
    casos = [ESCENARIOS[2], ESCENARIOS[5]]  # gratuitos típicos y caso base
    variaciones = [
        ("S_MS (CPU por petición) ×0.5 / ×2", dict(S_MS=sup.S_MS * 0.5), dict(S_MS=sup.S_MS * 2)),
        ("USO_APP 0.4 / 0.8", dict(USO_APP=0.4), dict(USO_APP=0.8)),
        (
            "Sondeo del personal: S_PERSONAL_MS 3 / 20",
            dict(S_PERSONAL_MS=3.0),
            dict(S_PERSONAL_MS=20.0),
        ),
        (
            "Pantalla encendida (FASE_FRENTE) ×0.5 / todas al frente",
            dict(FASE_FRENTE=tuple(f * 0.5 for f in sup.FASE_FRENTE)),
            dict(FASE_FRENTE=(1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0)),
        ),
        ("ACTIVOS 0.4 / 0.8", dict(ACTIVOS=0.4), dict(ACTIVOS=0.8)),
        ("Ocupación pico ×0.8 / ×1.2", dict(FACTOR_OCUPACION=0.8), dict(FACTOR_OCUPACION=1.2)),
        ("Duración de la visita ×0.7 / ×1.4", dict(FACTOR_DURACION=0.7), dict(FACTOR_DURACION=1.4)),
        ("Núcleos 2 → 4 (4 workers, 3.6 útiles)", dict(NUCLEOS=3.6), dict(NUCLEOS=2.0)),
        ("Utilización máxima 0.6 / 0.8", dict(UTILIZACION_MAX=0.6), dict(UTILIZACION_MAX=0.8)),
        ("Variación entre días σ 0.05 / 0.30", dict(SIGMA_DIA=0.05), dict(SIGMA_DIA=0.30)),
        ("Percentil 0.50 / 0.99", dict(PERCENTIL=0.50), dict(PERCENTIL=0.99)),
    ]
    print("\n## Sensibilidad (N máximo, forma «hoy»; ±; ordenado por efecto)\n")
    for esc in casos:
        fondos, mom = construir(esc, sup, tam)
        base = max_n(mom, "hoy", sup, dias, SEMILLA, sup.NUCLEOS)
        filas = []
        for nombre, a, b in variaciones:
            vals = []
            for cambio in (a, b):
                s2 = replace(sup, **cambio)
                fondos2, mom2 = construir(esc, s2, tam)
                vals.append(max_n(mom2, "hoy", s2, dias, SEMILLA, s2.NUCLEOS))
            efecto = max(abs(v - base) for v in vals) / max(base, 1)
            filas.append((efecto, nombre, vals))
        filas.sort(reverse=True)
        print(f"**{esc.nombre}** (base N = {fmt(base)})\n")
        print("| Supuesto | N (valor bajo) | N (valor alto) | Efecto máximo |")
        print("|---|---|---|---|")
        for efecto, nombre, vals in filas:
            print(f"| {nombre} | {fmt(vals[0])} | {fmt(vals[1])} | {efecto * 100:.0f} % |")
        print()


# ============================================================================================
# CURVA INVERSA: cuántos caben si la factura de Railway no pasa de B USD al mes
# ============================================================================================
PRESUPUESTOS = (5, 10, 15, 20, 40)


def bisecar(f, tope: int = 1_000_000) -> int:
    """Mayor n entero con f(n) verdadero (f monótona decreciente), 0 si ni n=1 cabe."""
    if not f(1):
        return 0
    lo, hi = 1, 2
    while f(hi) and hi < tope:
        lo, hi = hi, hi * 2
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if f(mid):
            lo = mid
        else:
            hi = mid
    return lo


def curva_factura(sup: Supuestos, resultados: dict) -> None:
    """Tres tablas (una por forma): N que cabe por tope de factura, con el muro que manda."""
    print("\n## Cuántos caben si la factura de Railway no pasa de B USD al mes\n")
    print(
        f"Hobby: {sup.HOBBY_SUSCRIPCION:.0f} USD de suscripción que incluyen {sup.HOBBY_INCLUIDO:.0f} USD "
        f"de uso; factura = 5 + exceso de uso sobre 5. {sup.ENTORNOS} entornos encendidos. "
        f"Memoria de PostgreSQL y respaldo en Railway = {sup.PG_RAM_GB} GB por entorno "
        "(deducida de la factura real del 13-nov; ver la tabla anterior). Muros que no dependen del dinero: "
        f"CPU de {sup.NUCLEOS:.0f} procesos y disco de {sup.VOLUMEN_MAX_GB_HOBBY:.0f} GB.\n"
    )
    f_piso = costos_railway(sup, sup.WORKERS, 0.0, 0.0, 0.0)
    print(
        f"Piso sin tráfico: uso {f_piso['uso']:.2f} USD (RAM de {sup.ENTORNOS} entornos: API y PostgreSQL"
        f") → factura {f_piso['factura']:.2f} USD. Si B < piso, no cabe ninguno.\n"
    )
    for forma in FORMAS:
        print(
            f"**{FORMAS[forma]['nombre']}** — N (muro que manda: C = CPU, D = disco, $ = factura)\n"
        )
        print(
            "| Escenario | "
            + " | ".join(f"≤ {b} USD" for b in PRESUPUESTOS)
            + " | USD marginal por restaurante |"
        )
        print("|---|" + "---|" * (len(PRESUPUESTOS) + 1))
        for esc in ESCENARIOS:
            fondos, mom, fila = resultados[esc.nombre]
            n_cpu = fila[forma]
            n_disco = bisecar(
                lambda n, e=esc, fo=fondos, m=mom, f=forma: (
                    uso_para_n(e, fo, m, n, f, sup)["vol_gb"] <= sup.VOLUMEN_MAX_GB_HOBBY
                )
            )
            marg = (
                uso_para_n(esc, fondos, mom, 100, forma, sup)["uso"]
                - uso_para_n(esc, fondos, mom, 0, forma, sup)["uso"]
            ) / 100
            celdas = []
            for b in PRESUPUESTOS:
                n_b = bisecar(
                    lambda n, e=esc, fo=fondos, m=mom, f=forma, bb=b: (
                        uso_para_n(e, fo, m, n, f, sup)["factura"] <= bb
                    )
                )
                n = min(n_cpu, n_disco, n_b)
                muro = "C" if n == n_cpu else "D" if n == n_disco else "$"
                celdas.append(f"{fmt(n)} ({muro})")
            print(f"| {esc.nombre} | " + " | ".join(celdas) + f" | {marg:.3f} |")
        print()


# ============================================================================================
# FOTO Y MODELO 3D POR PLATILLO (dimensionamiento; el 3D sigue fuera de la v1, ADR-011)
# ============================================================================================
def medios(sup: Supuestos, resultados: dict) -> None:
    """Almacenamiento en R2 con TODOS los platillos de cada plan en su tope, con foto y con 3D."""
    foto_mb = sup.FOTO_ORIGINAL_MB + (sup.FOTO_DETALLE_KB + sup.FOTO_MINIATURA_KB) / 1024
    glb_mb = sup.GLB_MB + sup.POSTER_KB / 1024
    print("\n## Foto y modelo 3D por platillo (todos los platillos en el tope del plan)\n")
    print(
        f"Por platillo: foto = original {sup.FOTO_ORIGINAL_MB} MB [estimada] + detalle {sup.FOTO_DETALLE_KB:.0f} KB "
        f"+ miniatura {sup.FOTO_MINIATURA_KB:.0f} KB [medidas] = {foto_mb:.2f} MB; modelo 3D = .glb de "
        f"{sup.GLB_MB} MB [documento: presupuesto duro de 05_3D_Pipeline.md] + póster {sup.POSTER_KB:.0f} KB "
        f"= {glb_mb:.2f} MB (el .usdz es para realidad aumentada y no cuenta).\n"
    )
    print(
        "| Plan | Platillos (tope) | GB por restaurante: sólo fotos | fotos + 3D | Restaurantes que llenan los 10 GB gratis (fotos / fotos+3D) | USD/mes de R2 por restaurante (fuera de la capa gratuita) |"
    )
    print("|---|---|---|---|---|---|")
    for plan, t in TOPES.items():
        gb_f = t["platillos"] * foto_mb / 1024
        gb_3 = t["platillos"] * (foto_mb + glb_mb) / 1024
        print(
            f"| {plan} | {t['platillos']} | {gb_f:.2f} | {gb_3:.2f} | "
            f"{sup.R2_GRATIS_GB / gb_f:.0f} / {sup.R2_GRATIS_GB / gb_3:.0f} | "
            f"{gb_f * sup.USD_GB_R2_MES:.3f} / {gb_3 * sup.USD_GB_R2_MES:.3f} |"
        )
    print(
        "\n| Escenario (N de «hoy») | R2 GB sólo fotos | R2 GB fotos + 3D | R2 USD/mes (fotos / fotos+3D) | N donde se acaba la capa gratuita (fotos+3D) |"
    )
    print("|---|---|---|---|---|")
    for esc in ESCENARIOS:
        _, _, fila = resultados[esc.nombre]
        n = fila["hoy"]
        gb_f = gb_3 = 0.0
        por_n = 0.0
        for plan, peso, _ in esc.partes:
            t = TOPES[plan]
            gb_f += n * peso * t["platillos"] * foto_mb / 1024
            gb_3 += n * peso * t["platillos"] * (foto_mb + glb_mb) / 1024
            por_n += peso * t["platillos"] * (foto_mb + glb_mb) / 1024
        print(
            f"| {esc.nombre} | {gb_f:.1f} | {gb_3:.1f} | "
            f"{max(0, gb_f - sup.R2_GRATIS_GB) * sup.USD_GB_R2_MES:.2f} / "
            f"{max(0, gb_3 - sup.R2_GRATIS_GB) * sup.USD_GB_R2_MES:.2f} | {sup.R2_GRATIS_GB / por_n:.0f} |"
        )
    print(
        f"\nBytes que baja un comensal: ver un platillo = detalle {sup.FOTO_DETALLE_KB:.0f} KB; ver un "
        f"modelo 3D = {glb_mb:.2f} MB ({glb_mb / 1.5:.1f} s a 1.5 MB/s [documento: NFR-04]). Los sirven "
        "Cloudflare y R2, **no la API**: salida de R2 gratis [externa], la caché de Cloudflare Free "
        "los guarda; nada de eso entra en la factura de Railway. Lo único que cuenta son las "
        f"operaciones clase B de R2 (10 millones gratis al mes, {sup.USD_CLASE_B_M} USD por millón después): "
        "una vista que no encuentra la copia en el borde es una operación. "
        "**Pendiente: diseñar el proceso que genera los modelos.**"
    )


# ============================================================================================
# AUDITORÍA DE FUENTES (regla de Calvin: toda cifra con fuente)
# ============================================================================================
# (parámetro, valor, marca, fuente o por qué no la tiene)
AUDITORIA = [
    (
        "S_MS",
        "3.3 ms",
        "medida",
        "docs/plan/perf/2026-11-13-modelo-de-capacidad.md M3 (mezcla realista, contenedor local de 4 vCPU)",
    ),
    (
        "S_MS_OPT",
        "2.0 ms",
        "estimada",
        "mismo documento, palancas 0-5: ganancia estimada sin probar por palanca",
    ),
    (
        "S_ESCRITURA_MS",
        "6 ms",
        "medida",
        "mismo documento: entrar 5.7-10 ms, evento 1.1-4.2 ms (6 es un punto dentro del rango)",
    ),
    (
        "S_PERSONAL_MS",
        "10 ms",
        "estimada",
        "mismo documento M4 lo usa como ejemplo («aun a 10 ms»); no hay medición: la vista no existe",
    ),
    (
        "BYTES_PETICION",
        "640 B",
        "medida",
        "mismo documento: 304 = 580 B, 200 = 1.7 KB, mezcla 93 % 304",
    ),
    ("PETICIONES_POR_COMENSAL_VISITA", "14", "estimada", "planes-y-costo §3.2, sin origen medido"),
    (
        "NUCLEOS / WORKERS",
        "2",
        "documento",
        "WORKERS=2 en deploy/railway/README.md; 3.6 núcleos con 4 workers es ×1.8 estimado (palanca 1)",
    ),
    ("UTILIZACION_MAX", "0.70", "documento", "capacidad §3: tope de diseño"),
    ("INTERVALO_HOY", "3 s", "documento", "frontend/src/comensal/entrada/useEntrada.ts:9"),
    (
        "INTERVALO_FASE",
        "5/3/10/20/3/5 s",
        "propuesta",
        "planes-y-costo §5, alternativa A: no está decidida ni construida",
    ),
    ("PERSONAL_INTERVALO_S", "5 s", "documento", "02_Arquitectura §6"),
    (
        "EV_* (cinco valores)",
        "60 s, 25 s, 0.09 ms, 4.2 ms, 1/min",
        "medida",
        "docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md, primera página (rama medicion-eventos-frente-a-sondeo, commit 41b2608); avisos/min estimada de su mapa de eventos",
    ),
    (
        "PERSONAL_INTERVALO_EV_S",
        "60 s",
        "supuesto",
        "se asume el mismo respaldo que los teléfonos; el informe de eventos no lo mide para el personal",
    ),
    ("MESAS_POR_MESERO", "6", "estimada", "sin origen"),
    ("DUENO_PANEL", "0.3", "estimada", "sin origen"),
    (
        "USO_APP",
        "0.6",
        "estimada",
        "sin origen; la analítica del piloto puede darlo (scan frente a mesas atendidas)",
    ),
    (
        "FASE_TIEMPO",
        "7 fracciones",
        "estimada",
        "sin origen; la Spec 001 (US-35) guarda las horas de cada paso: el piloto las dará",
    ),
    (
        "FASE_FRENTE",
        "7 fracciones",
        "estimada",
        "sin origen: es el supuesto más débil; el evento de visibilidad aceptado por Calvin lo medirá",
    ),
    ("ACTIVOS", "0.6", "estimada", "sin origen"),
    (
        "WIFI_COMPARTIDO",
        "0.7",
        "estimada",
        "sin origen; ip_hash de la analítica ya permite contarlo",
    ),
    (
        "CF_REGLA_RPS",
        "30 rps",
        "documento",
        "300 peticiones por 10 s por IP: deploy/railway/README.md; Cloudflare Free admite 1 regla, ventana 10 s, por IP [externa: developers.cloudflare.com/waf/rate-limiting-rules]",
    ),
    ("DIA_SEMANA, SIGMA_DIA", "0.8-1.35; 0.15", "estimada", "sin origen"),
    (
        "PERFILES: mesas, ppm, personal, minutos, visitas_dia, pico_ocup, con_foto",
        "ver tabla",
        "estimada",
        "sin estadística de mesas ni comensales (planes-y-costo §1.1). Personal y mesas: rama agente/estadistica-de-cartas-y-personal (modelo con supuestos)",
    ),
    (
        "PERFILES: platillos",
        "15-140",
        "medida (parcial)",
        "rama agente/estadistica-de-cartas-y-personal: 148 cartas, mediana 44, media 51, p90 82 (147 de 148 son de reparto)",
    ),
    (
        "PERFILES: picos de ocupación",
        "14:30 y 21:00",
        "externa (horas)",
        "chilango.com/general/988-la-hora-de-la-comida (comida 14-16, cena 20-22), planes-y-costo §1.1; los pesos son estimados",
    ),
    (
        "MEZCLAS",
        "ver tabla",
        "estimada",
        "96 % microempresas [externa: INEGI-CANIRAC 2021]; el reparto por tamaño es juicio",
    ),
    (
        "TOPES",
        "10×6/80/3 · 40×12/300/20",
        "Calvin",
        "decisiones del 13-nov (mesas, personal, 6 y 12 por mesa); platillos 80/300 son la propuesta de la rama de estadística, sin decidir",
    ),
    ("KB_VISITA", "12 KB", "estimada", "planes-y-costo §2.1; ±2×, sin medir"),
    ("KB_PLATILLO", "1.1 KB", "medida", "planes-y-costo §2.1 (865 B medidos + URLs de R2)"),
    ("RETENCION_DIAS", "30 / 365", "Calvin", "aceptado en la ronda 2 (13-nov)"),
    (
        "FOTO_ORIGINAL_MB",
        "3 MB",
        "estimada",
        "foto de teléfono de 12 MP; no hay originales reales de ningún restaurante",
    ),
    (
        "FOTO_DETALLE_KB / MINIATURA_KB",
        "81 / 16 KB",
        "medida",
        "planes-y-costo §2.1 (35-81 y 7-16 KB, material gráfico real)",
    ),
    (
        "GLB_MB / POSTER_KB",
        "4 MB / 81 KB",
        "documento",
        "docs/mvp/05_3D_Pipeline.md §4 (presupuesto duro del .glb); el póster se iguala a la foto de detalle",
    ),
    (
        "Precios Railway",
        "10 / 20 / 0.05 / 0.15",
        "externa",
        "docs.railway.com/reference/pricing/plans, 13-nov-2026",
    ),
    (
        "Hobby: 5 USD, 5 USD de uso incluido, volumen 5 GB",
        "",
        "externa",
        "docs.railway.com/reference/pricing/plans y /faqs y /reference/volumes, 13-nov-2026",
    ),
    (
        "Hard limit de gasto",
        "mínimo 10 USD",
        "externa",
        "docs.railway.com/reference/usage-limits (Cost Control), 13-nov-2026: al alcanzarlo, todo se apaga",
    ),
    (
        "RAM_API_GB_PROCESO",
        "0.16 GB",
        "medida",
        "capacidad M5 (≈160 MB por proceso en reposo, local)",
    ),
    (
        "PG_RAM_GB (y servicio de respaldo)",
        "0.085 GB por entorno (0.045-0.135)",
        "Calvin + estimada",
        "deducida de la factura real de Railway del 13-nov (2,649 GB-min de memoria): memoria media "
        "por entorno menos la API medida; falta el desglose por servicio y el inicio del ciclo",
    ),
    (
        "PG_MAX_CONEXIONES",
        "100",
        "sin dato",
        "no figura en docs.railway.com/databases/postgresql; falta SHOW max_connections",
    ),
    (
        "DB_POOL",
        "20 por proceso",
        "documento",
        "app/core/config.py: DB_POOL_SIZE 10 + DB_MAX_OVERFLOW 10",
    ),
    (
        "Precios R2",
        "0.015 / 4.50 / 0.36",
        "externa",
        "developers.cloudflare.com/r2/pricing, 13-nov-2026 (10 GB, 1 M clase A y 10 M clase B gratis; salida gratis)",
    ),
    (
        "Firebase",
        "50,000 MAU",
        "externa",
        "firebase.google.com/pricing, 13-nov-2026; cuota del enlace por correo: no figura",
    ),
    ("OPERADORES_POR_RESTAURANTE", "1.5", "estimada", "sin origen"),
    (
        "Precios Claude (Opus 5.5)",
        "4 / 20 USD por M",
        "externa",
        "platform.claude.com/docs/en/about-claude/pricing, 13-nov-2026",
    ),
    (
        "TOKENS_PAGINA, TOKENS_BASE, TOKENS_SALIDA",
        "3,500 / 1,000 / 60",
        "estimada",
        "±30 %; la documentación de PDF da 1,500-3,000 tokens de texto por página más la imagen",
    ),
    ("REINTENTO_MEDIO", "1.3", "estimada", "MAX_CORRIDAS = 3 [documento]; la media no está medida"),
    ("LECTURAS_GRATIS_TOPE", "3 por dueño", "Calvin", "ronda 2 (13-nov)"),
    ("LECTURAS_GRATIS_USO", "55/30/15 %", "estimada", "sin origen"),
    (
        "LECTURAS_PAGA_MES_USO",
        "0.5",
        "estimada",
        "Calvin: en paga, sin número, fila prioritaria sujeta a disponibilidad; el gasto sólo se acota por disponibilidad",
    ),
    ("ROTACION_MES", "4 %", "estimada", "sin origen"),
    ("MXN_USD", "18.6188", "externa", "FIX Banxico 12-nov-2026 (planes-y-costo)"),
    (
        "Dominio",
        "25 USD al año",
        "Calvin",
        "dato de Calvin (ronda 2); fuera de la factura de Railway",
    ),
]

# (dato por conseguir, cómo, costo, quién)
DATOS_POR_CONSEGUIR = [
    (
        "Memoria y CPU reales de API y PostgreSQL por entorno, y factura real del mes",
        "Métricas de Railway de staging y producción (panel o `scripts/railway.py estado`) y la factura de Calvin",
        "0 USD; 10 min",
        "Calvin (factura) y la sesión maestra (métricas de staging)",
    ),
    (
        "`max_connections` de PostgreSQL de Railway",
        "`SHOW max_connections` en staging, sólo lectura",
        "0 USD; 5 min",
        "sesión maestra",
    ),
    (
        "CPU real por petición en Railway (S_MS) y por palanca",
        "T-4.4 contra staging con k6",
        "≈ 0.3-0.5 USD de Railway; 1 sesión",
        "sesión hija de la T-4.4",
    ),
    (
        "Costo de `GET /op/mesas` (S_PERSONAL_MS)",
        "Medición local cuando exista la vista (T-3.6), con 3, 10 y 20 mesas",
        "0 USD; media sesión",
        "sesión de la T-3.6",
    ),
    (
        "Parte que abre la app y parte con pantalla encendida por fase",
        "Evento de visibilidad en la analítica del piloto (aceptado por Calvin) + scans frente a mesas atendidas",
        "0 USD; una tarea chica",
        "sesión hija; datos del piloto",
    ),
    (
        "Mesas, comensales por mesa, visitas por día, duración y horarios reales",
        "Datos de los primeros 10-20 restaurantes del piloto (la base ya los tiene: mesas, sesiones, miembros, horas de cada paso de la Spec 001); estadística de consumo fuera del hogar (INEGI ENIGH/DENUE) para el universo",
        "0 USD; 1 sesión",
        "sesión hija con acceso de lectura a producción, tras el piloto",
    ),
    (
        "Cartas y personal por tamaño de negocio",
        "Rama agente/estadistica-de-cartas-y-personal (148 cartas de reparto) + microdatos de INEGI (Censos Económicos 2024, SCIAN 722511/722412) + 30-40 cartas de salón",
        "0-? USD; lo de INEGI es gratuito",
        "sesión hija; Calvin si se compra una fuente",
    ),
    (
        "Teléfonos por IP en un local (WIFI_COMPARTIDO) y simultáneos reales",
        "Contar miembros por `ip_hash` y restaurante en la analítica (ya existe)",
        "0 USD; media sesión",
        "sesión hija",
    ),
    (
        "Restaurantes activos por día, día de la semana, variación (ACTIVOS, DIA_SEMANA, SIGMA_DIA)",
        "Scans por día del piloto durante ≥ 4 semanas",
        "0 USD",
        "sesión hija tras el piloto",
    ),
    (
        "Bytes por visita en la base (KB_VISITA)",
        "Medición local: crear una visita con el seed y medir `pg_total_relation_size`",
        "0 USD; media sesión",
        "sesión hija",
    ),
    (
        "Tamaño real de las fotos originales",
        "Mirar el bucket R2 privado del piloto",
        "0 USD",
        "sesión maestra",
    ),
    (
        "Tokens reales de una lectura de PDF y reintentos medios",
        "Prueba `live` con 2-3 cartas reales (`pytest -m live`)",
        "≈ 0.5-1 USD de la API de Claude",
        "sesión hija; autoriza Calvin",
    ),
    (
        "Cuota diaria del enlace por correo de Firebase y plan de Resend",
        "Leer la documentación de Auth y la cuenta de Resend",
        "0 USD",
        "Calvin / sesión maestra",
    ),
    (
        "Tiempo y costo de generar un modelo 3D o una imagen (si algún día se hace)",
        "Probar un modelo en una máquina de prueba y leer el precio por hora de la GPU el día de la decisión",
        "pocos USD",
        "sesión hija; fuera de la v1",
    ),
]


def auditoria() -> None:
    print("\n## Auditoría de fuentes: cada parámetro del simulador\n")
    print("| Parámetro | Valor | Marca | Fuente |")
    print("|---|---|---|---|")
    for a, b, c, d in AUDITORIA:
        print(f"| {a} | {b} | {c} | {d} |")
    print("\n## Datos por conseguir (lo que hoy es juicio)\n")
    print("| Dato | Cómo conseguirlo | Costo | Quién |")
    print("|---|---|---|---|")
    for a, b, c, d in DATOS_POR_CONSEGUIR:
        print(f"| {a} | {b} | {c} | {d} |")


# Factura real de Railway (captura de Calvin, «Usage by Project», proyecto `carta`, plan Hobby,
# 13-nov-2026 ≈ 04:35 UTC) [dato de Calvin]. Cantidades y precios unitarios de la propia captura.
FACTURA_RAILWAY = dict(
    memoria_gb_min=(2649.07, 0.000231),
    cpu_vcpu_min=(44.00, 0.000463),
    red_gb=(0.04, 0.05),
    volumen_gb_min=(1909.54, 0.00000347),
)
FACTURA_TOTAL_USD = 0.6422
CORTE = (2026, 11, 13, 4, 35)  # hora de la captura (UTC)
STAGING_DESDE = (2026, 11, 10, 8, 10)  # [documento: 04 §11] staging desplegado
PRODUCCION_DIA = (2026, 11, 11)  # [dato de Calvin] sin hora: se barre 00:00, 12:00 y 23:59


def deducir_de_la_factura(sup: Supuestos) -> None:
    """Memoria media por entorno y costo mensual proyectado a partir de la factura real."""
    from datetime import datetime, timedelta

    corte = datetime(*CORTE)
    stg = (corte - datetime(*STAGING_DESDE)).total_seconds() / 60
    print("\n## Lo que dice la factura real de Railway (13-nov-2026)\n")
    suma = sum(c * p for c, p in FACTURA_RAILWAY.values())
    print(f"Suma de las partidas: {suma:.4f} USD (la captura dice {FACTURA_TOTAL_USD} USD).\n")
    print(
        "| Producción desde | Minutos-entorno | Memoria media por entorno GB | PostgreSQL + respaldo GB "
        "(menos la API medida) | Volumen medio GB | vCPU medio | Proyección USD/mes (2 entornos, 30 días) |"
    )
    print("|---|---|---|---|---|---|---|")
    for etiqueta, horas in (
        ("11-nov 00:00", 0.0),
        ("11-nov 12:00 (central)", 12.0),
        ("11-nov 23:59", 23.98),
    ):
        inicio = datetime(*PRODUCCION_DIA) + timedelta(hours=horas)
        prod = (corte - inicio).total_seconds() / 60
        t = stg + prod
        mem = FACTURA_RAILWAY["memoria_gb_min"][0] / t
        api = sup.WORKERS * sup.RAM_API_GB_PROCESO
        vol = FACTURA_RAILWAY["volumen_gb_min"][0] / t
        cpu = FACTURA_RAILWAY["cpu_vcpu_min"][0] / t
        mes = FACTURA_TOTAL_USD / t * sup.ENTORNOS * 30 * 24 * 60
        print(
            f"| {etiqueta} | {t:,.0f} | {mem:.3f} | {mem - api:.3f} | {vol:.3f} | {cpu:.4f} | {mes:.2f} |"
        )
    print(
        "\nSupuestos: el ciclo de cobro empezó antes del 10-nov (si empezó después, la ventana es más "
        "corta y la memoria por entorno sale mayor); los dos entornos pesan lo mismo sin tráfico; la "
        "API pesa en Railway lo que se midió en local (0.16 GB por proceso). **Dato por conseguir:** "
        "inicio del ciclo y costo por servicio (panel de Railway → Usage, desglose por servicio).\n"
    )


def supuestos_a_texto(sup: Supuestos) -> None:
    print("## Supuestos usados\n")
    for campo in sup.__dataclass_fields__:
        print(f"- {campo} = {getattr(sup, campo)}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--rapido", action="store_true", help="menos días y menos muestras")
    ap.add_argument(
        "--distribuciones", help="JSON con perfiles y mezclas que sustituyen a los de aquí"
    )
    ap.add_argument("--sin-sensibilidad", action="store_true")
    args = ap.parse_args()
    if args.distribuciones:
        cargar_distribuciones(args.distribuciones)
    dias, tam = (120, 400) if args.rapido else (364, 1500)
    sup = Supuestos()
    resultados = informe(sup, dias, tam)
    deducir_de_la_factura(sup)
    for pg in (sup.PG_RAM_GB, sup.PG_RAM_GB_ALTO):  # deducida de la factura: central y alta
        curva_factura(replace(sup, PG_RAM_GB=pg), resultados)
    medios(sup, resultados)
    if not args.sin_sensibilidad:
        sensibilidad(sup, dias if args.rapido else 200, tam if args.rapido else 800)
    auditoria()
    supuestos_a_texto(sup)


if __name__ == "__main__":
    main()
