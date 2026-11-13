"""Arma el informe «Planos de Carta» (HTML con gráficas SVG en línea) desde sus datos.

Biblioteca estándar. Lee `datos/entrada.json` (cifras a mano, cada una con su fuente),
`datos/simulador.json` (lo escribe `extraer_simulador.py`) y la muestra de cartas
(`docs/research/2026-11-13-estadistica-de-cartas-y-personal-datos.csv`). Escribe `informe.html`.

    python3 docs/informes/2026-11-13-planos-de-carta/extraer_simulador.py   # ≈ 10 s
    python3 docs/informes/2026-11-13-planos-de-carta/generar.py
    node docs/informes/2026-11-13-planos-de-carta/pdf.mjs                  # PDF tamaño carta
"""

from __future__ import annotations

import csv
import json
import math
from html import escape
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
E = json.loads((AQUI / "datos" / "entrada.json").read_text(encoding="utf-8"))
S = json.loads((AQUI / "datos" / "simulador.json").read_text(encoding="utf-8"))
CSV = RAIZ / "docs" / "research" / "2026-11-13-estadistica-de-cartas-y-personal-datos.csv"

TC = E["tipo_de_cambio"]["mxn_usd"]
VINO, DORADO, AZUL = "#8C3A52", "#B8860B", "#2E7AAB"
GRIS, TINTA, TINTA2, REJILLA = "#B9AFA3", "#1A1A1A", "#5B4A3D", "#E9DFD0"
ANCHO = 640


# ---------------------------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------------------------
def n(x: float, d: int = 0) -> str:
    """Número con coma de miles y punto decimal (estilo del repositorio)."""
    return f"{x:,.{d}f}"


def esc(t: str) -> str:
    return escape(str(t), quote=True)


def marca(tipo: str) -> str:
    nombres = {
        "medida": "medida",
        "documento": "documento",
        "externa": "fuente externa",
        "calvin": "dato de Calvin",
        "supuesto": "supuesto",
    }
    return f'<span class="marca {tipo}">{nombres[tipo]}</span>'


def figura(svg: str, titulo: str, fuente: str, num: list) -> str:
    num[0] += 1
    return (
        f"<figure><figcaption><b>Gráfica {num[0]}.</b> {titulo}</figcaption>{svg}"
        f'<p class="fuente"><b>Fuente:</b> {fuente}</p></figure>'
    )


def svg_abre(alto: int, etiqueta: str) -> str:
    return (
        f'<svg viewBox="0 0 {ANCHO} {alto}" width="100%" role="img" aria-label="{esc(etiqueta)}" '
        f'xmlns="http://www.w3.org/2000/svg" font-family="DM Sans, sans-serif">'
    )


def texto(x, y, t, tam=11, color=TINTA2, ancla="start", peso=400) -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-size="{tam}" fill="{color}" text-anchor="{ancla}" '
        f'font-weight="{peso}">{esc(t)}</text>'
    )


def barra(x, y, w, h, color) -> str:
    w = max(w, 0.0)
    r = min(4, w / 2, h / 2)
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r:.1f}" fill="{color}"/>'


def leyenda(x, y, items) -> str:
    out = []
    for etiqueta, color in items:
        out.append(f'<rect x="{x}" y="{y - 9}" width="12" height="12" rx="3" fill="{color}"/>')
        out.append(texto(x + 17, y + 1, etiqueta, 11, TINTA2))
        x += 26 + 6.2 * len(etiqueta)
    return "".join(out)


def barras_h(filas, maximo, fmt, alto_fila=26, izq=210, der=70, titulo_eje="", marcas_eje=None):
    """filas: (etiqueta, valor, color, texto_valor | None)."""
    alto = 20 + alto_fila * len(filas) + (34 if titulo_eje else 14)
    ancho_util = ANCHO - izq - der
    out = [svg_abre(alto, titulo_eje or "barras")]
    if marcas_eje:
        for m in marcas_eje:
            x = izq + ancho_util * m / maximo
            out.append(
                f'<line x1="{x:.1f}" y1="12" x2="{x:.1f}" y2="{alto - 30}" stroke="{REJILLA}"/>'
            )
            out.append(texto(x, alto - 16, fmt(m), 10, TINTA2, "middle"))
    for i, (etq, val, color, tv) in enumerate(filas):
        y = 16 + i * alto_fila
        out.append(texto(izq - 8, y + alto_fila / 2 + 3, etq, 11, TINTA, "end"))
        w = ancho_util * val / maximo
        out.append(barra(izq, y + 4, w, alto_fila - 9, color))
        out.append(
            texto(izq + w + 6, y + alto_fila / 2 + 3, tv or fmt(val), 11, TINTA, "start", 600)
        )
    if titulo_eje:
        out.append(texto(izq + ancho_util / 2, alto - 2, titulo_eje, 10, TINTA2, "middle"))
    out.append("</svg>")
    return "".join(out)


# ---------------------------------------------------------------------------------------------
# Modelo económico (todo sale de entrada.json y simulador.json; ver §8 del informe)
# ---------------------------------------------------------------------------------------------
ESC = {e["nombre"]: e for e in S["escenarios"]}
GT = ESC["Todos gratuitos, típicos"]
PT = ESC["Caso base: todos de paga, típicos"]
FACT_MES = E["factura_railway"]["proyeccion_mes_usd"]["central"]
DOMINIO_MES = E["dominio_usd_anio"]["valor"] / 12
PRECIO_USD = E["precio"]["servicio_mxn"] / TC
LECTURA = S["usd_lectura_pdf_6_paginas_50_platillos"]
RAM_WORKER_USD = 0.16 * 10.0  # 0.16 GB por proceso [medida, capacidad M5] × 10 USD/GB-mes [externa]
# Versión 2: escaleras y anuncios (los escribe docs/research/2026-11-13-anuncios-y-capa-del-comensal-modelo.py)
A = json.loads((AQUI / "datos" / "anuncios.json").read_text(encoding="utf-8"))
AE = A["economia"]
TAR = AE["tarifas"]  # anuncios NO personalizados, USD por mil visitas
RPM_BAJO = TAR["bajo"]["usd_por_mil_visitas"]
RPM_MEDIO = TAR["medio"]["usd_por_mil_visitas"]
RPM_ALTO = TAR["alto"]["usd_por_mil_visitas"]
VISITAS_APP_MES_GRATIS = GT["por_restaurante"]["comensales_dia"] * 30 * S["uso_app"]


def economia(n_total: float, conv: float, rpm: float = 0.0) -> dict:
    """Costo e ingreso mensual en USD con eventos, N registrados y una conversión a paga."""
    nf, np_ = n_total * (1 - conv), n_total * conv
    uso = FACT_MES + nf * GT["usd_marginal_eventos"] + np_ * PT["usd_marginal_eventos"]
    carga = nf / GT["cpu_eventos"] + np_ / PT["cpu_eventos"]  # fracción de 2 procesos
    extra = max(0, math.ceil(2 * carga) - 2)
    uso += extra * RAM_WORKER_USD
    disco = nf * GT["por_restaurante"]["disco_gb"] + np_ * PT["por_restaurante"]["disco_gb"]
    pro = disco > 5.0
    railway = max(20.0, uso) if pro else max(5.0, uso)
    fotos_gb = (
        (nf * GT["por_restaurante"]["fotos"] + np_ * PT["por_restaurante"]["fotos"])
        * E["medios"]["mb_foto"]
        / 1024
    )
    r2 = max(0.0, fotos_gb - 10) * 0.015
    pdf = (
        nf * S["rotacion_mes"] * S["lecturas_gratis_medias"] * LECTURA
        + np_ * S["lecturas_paga_mes"] * LECTURA
    )
    costo = railway + r2 + pdf + DOMINIO_MES
    ingreso = np_ * PRECIO_USD + nf * VISITAS_APP_MES_GRATIS * rpm / 1000
    return dict(costo=costo, ingreso=ingreso, excedente=ingreso - costo, pro=pro, disco=disco)


def equilibrio(conv: float, rpm: float = 0.0) -> int | None:
    for k in range(1, 5001):
        if economia(k, conv, rpm)["excedente"] >= 0:
            return k
    return None


ADS_RESTAURANTE = [VISITAS_APP_MES_GRATIS * r / 1000 for r in (RPM_BAJO, RPM_MEDIO, RPM_ALTO)]
EQ_ADS_BAJO = AE["equilibrio_solo_anuncios"]["eventos/npa/bajo"]["primero"]
EQ_ADS_MEDIO = AE["equilibrio_solo_anuncios"]["eventos/npa/medio"]["primero"]
EQ_ADS_ALTO = AE["equilibrio_solo_anuncios"]["eventos/npa/alto"]["primero"]


# ---------------------------------------------------------------------------------------------
# Gráficas
# ---------------------------------------------------------------------------------------------
def g_costo_hoy() -> str:
    partidas = E["factura_railway"]["partidas"]
    total = E["factura_railway"]["total_usd"]
    filas = [
        (
            p["nombre"],
            p["usd"],
            VINO if i == 0 else GRIS,
            f"{p['usd']:.4f} USD · {100 * p['usd'] / total:.1f} %",
        )
        for i, p in enumerate(partidas)
    ]
    return barras_h(
        filas,
        0.7,
        lambda v: f"{v:.2f}",
        izq=150,
        der=170,
        titulo_eje="USD acumulados del ciclo (al 13-nov ≈ 04:35 UTC)",
        marcas_eje=[0, 0.2, 0.4, 0.6],
    )


def g_mes_hoy() -> str:
    filas = [
        ("Railway (2 entornos)", FACT_MES, VINO, f"{FACT_MES:.2f} USD (7.64–9.53)"),
        ("Dominio (25 USD al año)", DOMINIO_MES, DORADO, f"{DOMINIO_MES:.2f} USD"),
        ("Cloudflare (plan gratuito)", 0.0, GRIS, "0 USD"),
    ]
    return barras_h(
        filas,
        12,
        lambda v: f"{v:.0f}",
        izq=190,
        der=150,
        titulo_eje="USD al mes",
        marcas_eje=[0, 4, 8, 12],
    )


def g_peticiones() -> str:
    p = E["eventos"]["peticiones_visita_90min"]
    filas = [
        ("Hoy: pregunta cada 3 s", p["hoy"], VINO, f"≈ {n(p['hoy'])}"),
        ("A: pregunta según la fase", p["fase"], GRIS, f"≈ {n(p['fase'])}"),
        ("B: eventos (decidido)", p["eventos"], AZUL, f"≈ {n(p['eventos'])}"),
    ]
    return barras_h(
        filas,
        2000,
        lambda v: n(v),
        izq=190,
        der=70,
        titulo_eje="peticiones de un comensal en una visita de 90 min",
        marcas_eje=[0, 500, 1000, 1500, 2000],
    )


def g_visible() -> str:
    v = E["eventos"]["visible_ms"]
    alto = 170
    izq, der = 150, 40
    au = ANCHO - izq - der
    out = [svg_abre(alto, "tiempo hasta ver el cambio")]
    for s in (0, 1, 2, 3):
        x = izq + au * s / 3
        out.append(f'<line x1="{x:.1f}" y1="10" x2="{x:.1f}" y2="{alto - 34}" stroke="{REJILLA}"/>')
        out.append(texto(x, alto - 20, f"{s} s", 10, TINTA2, "middle"))
    filas = [
        ("Hoy (sondeo 3 s)", v["hoy_p50"], v["hoy_p95"], VINO),
        ("Eventos", v["eventos_p50"], v["eventos_p95"], AZUL),
    ]
    for i, (etq, p50, p95, c) in enumerate(filas):
        y = 32 + i * 52
        out.append(texto(izq - 8, y + 12, etq, 11, TINTA, "end"))
        out.append(barra(izq, y, au * p95 / 3000, 22, c + "55"))
        out.append(barra(izq, y, au * p50 / 3000, 22, c))
        lab = (
            f"p50 {p50 / 1000:.2f} s · p95 {p95 / 1000:.2f} s"
            if p50 > 100
            else f"p50 {p50:.0f} ms · p95 {p95:.0f} ms (+ red del celular ≈ 0.1–0.3 s)"
        )
        out.append(texto(izq, y - 4, lab, 10.5, TINTA, "start", 600))
    out.append(
        leyenda(izq, alto - 4, [("p50 (típico)", TINTA2), ("p95 (peor caso habitual)", GRIS)])
    )
    out.append("</svg>")
    return "".join(out)


ESC_CORTOS = [
    ("Peor caso: todos gratuitos al tope (10 mesas × 6)", "Gratuitos al tope"),
    ("Peor caso + todos coinciden a la vez", "Gratuitos al tope, todos a la vez"),
    ("Todos gratuitos, típicos", "Gratuitos típicos"),
    ("Mezcla 80 % gratuitos / 20 % paga", "Mezcla 80 % / 20 % paga"),
    ("Caso base: todos de paga, típicos", "De paga típicos"),
    ("Todos de paga al tope (40 mesas × 12)", "De paga al tope (40 × 12)"),
]


def g_capacidad() -> str:
    """Puntos en escala logarítmica: muro de CPU hoy, muro de CPU con eventos, muro de disco."""
    izq, der = 190, 150
    au = ANCHO - izq - der
    lo, hi = math.log10(5), math.log10(2000)
    alto = 40 + 34 * len(ESC_CORTOS) + 40

    def X(v):
        return izq + au * (math.log10(max(v, 5)) - lo) / (hi - lo)

    out = [svg_abre(alto, "capacidad por escenario")]
    for m in (5, 10, 20, 50, 100, 200, 500, 1000, 2000):
        out.append(
            f'<line x1="{X(m):.1f}" y1="14" x2="{X(m):.1f}" y2="{alto - 54}" stroke="{REJILLA}"/>'
        )
        out.append(texto(X(m), alto - 40, n(m), 10, TINTA2, "middle"))
    out.append(
        texto(
            izq + au / 2,
            alto - 26,
            "restaurantes registrados (escala que se multiplica: cada marca es ×2 o ×2.5)",
            10,
            TINTA2,
            "middle",
        )
    )
    out.append(texto(ANCHO - der + 10, 14, "Lo que cabe", 10, TINTA2, "start", 600))
    for i, (clave, corto) in enumerate(ESC_CORTOS):
        e = ESC[clave]
        y = 34 + i * 34
        out.append(texto(izq - 8, y + 4, corto, 11, TINTA, "end"))
        cabe_hoy = min(e["cpu_hoy"], e["disco"])
        cabe_ev = min(e["cpu_eventos"], e["disco"])
        out.append(
            f'<line x1="{X(cabe_hoy):.1f}" y1="{y}" x2="{X(cabe_ev):.1f}" y2="{y}" stroke="{AZUL}" stroke-width="2" opacity=".35"/>'
        )
        out.append(
            f'<rect x="{X(e["disco"]) - 1.5:.1f}" y="{y - 11}" width="3" height="22" rx="1.5" fill="{DORADO}"/>'
        )
        for v, c in ((e["cpu_hoy"], VINO), (e["cpu_eventos"], AZUL)):
            out.append(
                f'<circle cx="{X(v):.1f}" cy="{y}" r="6" fill="{c}" stroke="#FEF9F1" stroke-width="2"/>'
            )
        out.append(texto(ANCHO - der + 10, y - 2, f"hoy {n(cabe_hoy)}", 10, TINTA, "start", 600))
        out.append(
            texto(ANCHO - der + 10, y + 11, f"con eventos {n(cabe_ev)}", 10, TINTA, "start", 600)
        )
    out.append(
        leyenda(
            20,
            alto - 6,
            [
                ("Muro de procesador hoy", VINO),
                ("Muro de procesador con eventos", AZUL),
                ("Muro de disco 5 GB", DORADO),
            ],
        )
    )
    out.append("</svg>")
    return "".join(out)


def g_medios() -> str:
    m = E["medios"]["gb_por_restaurante"]
    izq, der = 150, 160
    au = ANCHO - izq - der
    alto = 150
    out = [svg_abre(alto, "almacenamiento por restaurante")]
    for v in (0, 0.5, 1, 1.5, 2, 2.5):
        x = izq + au * v / 2.5
        out.append(f'<line x1="{x:.1f}" y1="10" x2="{x:.1f}" y2="{alto - 40}" stroke="{REJILLA}"/>')
        out.append(texto(x, alto - 26, f"{v:g}", 10, TINTA2, "middle"))
    out.append(
        texto(
            izq + au / 2,
            alto - 12,
            "GB en R2 por restaurante, con todos los platillos del tope",
            10,
            TINTA2,
            "middle",
        )
    )
    llen = E["medios"]["llenan_10_gb"]
    for i, (plan, etq) in enumerate(
        (("gratuito", "Gratuito (80 platillos)"), ("paga", "De paga (300 platillos)"))
    ):
        y = 16 + i * 46
        out.append(texto(izq - 8, y + 18, etq, 11, TINTA, "end"))
        out.append(barra(izq, y, au * m[plan]["fotos"] / 2.5, 16, VINO))
        out.append(barra(izq, y + 19, au * m[plan]["fotos_3d"] / 2.5, 16, AZUL))
        out.append(
            texto(
                izq + au * m[plan]["fotos"] / 2.5 + 6,
                y + 12,
                f"{m[plan]['fotos']:.2f} GB · 10 GB gratis = {llen[plan][0]} restaurantes",
                10,
                TINTA,
                "start",
                600,
            )
        )
        out.append(
            texto(
                izq + au * m[plan]["fotos_3d"] / 2.5 + 6,
                y + 31,
                f"{m[plan]['fotos_3d']:.2f} GB · {llen[plan][1]} restaurantes",
                10,
                TINTA,
                "start",
                600,
            )
        )
    out.append(leyenda(izq, alto - 0, [("Sólo fotos", VINO), ("Fotos + modelo 3D", AZUL)]))
    out.append("</svg>")
    return "".join(out)


def cargar_cartas():
    with CSV.open(encoding="utf-8") as f:
        return [(r["tipo"], int(r["total"])) for r in csv.DictReader(f)]


def g_histograma(cartas) -> str:
    totales = [t for _, t in cartas]
    bins = list(range(0, 160, 10))
    cuentas = [sum(1 for t in totales if b <= t < b + 10) for b in bins]
    resto = sum(1 for t in totales if t >= 160)
    izq, der, arriba = 46, 20, 16
    alto = 230
    au = ANCHO - izq - der
    ah = alto - arriba - 52
    tope = 30
    out = [svg_abre(alto, "histograma de platillos")]
    for v in range(0, tope + 1, 10):
        y = arriba + ah * (1 - v / tope)
        out.append(
            f'<line x1="{izq}" y1="{y:.1f}" x2="{ANCHO - der}" y2="{y:.1f}" stroke="{REJILLA}"/>'
        )
        out.append(texto(izq - 6, y + 3, str(v), 10, TINTA2, "end"))
    k = len(bins) + 1
    bw = au / k
    for i, c in enumerate(cuentas + [resto]):
        h = ah * c / tope
        x = izq + i * bw + 1
        out.append(
            f'<rect x="{x:.1f}" y="{arriba + ah - h:.1f}" width="{bw - 2:.1f}" height="{h:.1f}" rx="3" fill="{VINO if i < len(bins) else GRIS}"/>'
        )
        if c:
            out.append(
                texto(
                    x + bw * (0.78 if i < len(bins) and bins[i] <= 44 < bins[i] + 10 else 0.5) - 1,
                    arriba + ah - h - 4,
                    str(c),
                    9.5,
                    TINTA,
                    "middle",
                    600,
                )
            )
        etq = f"{bins[i]}" if i < len(bins) else "160+"
        out.append(
            texto(
                x - 1 if i < len(bins) else x + bw / 2, arriba + ah + 14, etq, 9.5, TINTA2, "middle"
            )
        )
    for valor, etq, color in ((44, "mediana 44", AZUL), (82, "p90 ≈ 82", DORADO)):
        x = izq + (valor / 10) * bw
        out.append(
            f'<line x1="{x:.1f}" y1="{arriba}" x2="{x:.1f}" y2="{arriba + ah}" stroke="{color}" stroke-width="2" stroke-dasharray="4 3"/>'
        )
        out.append(texto(x + 4, arriba + 10, etq, 10, TINTA, "start", 600))
    out.append(
        texto(
            izq + au / 2,
            alto - 18,
            "platillos por carta, comida + bebidas (intervalos de 10)",
            10,
            TINTA2,
            "middle",
        )
    )
    out.append(
        texto(
            izq + au / 2,
            alto - 4,
            f"n = {len(totales)} negocios; eje vertical: cuántos negocios",
            10,
            TINTA2,
            "middle",
        )
    )
    out.append("</svg>")
    return "".join(out)


def g_cobertura() -> str:
    filas = E["cobertura_platillos"]["filas"]
    izq, der, arriba = 46, 24, 14
    alto = 220
    au = ANCHO - izq - der
    ah = alto - arriba - 48
    xmax = 300

    def X(v):
        return izq + au * v / xmax

    def Y(p):
        return arriba + ah * (1 - p / 100)

    out = [svg_abre(alto, "curva de cobertura")]
    for p in (0, 25, 50, 75, 100):
        out.append(
            f'<line x1="{izq}" y1="{Y(p):.1f}" x2="{ANCHO - der}" y2="{Y(p):.1f}" stroke="{REJILLA}"/>'
        )
        out.append(texto(izq - 6, Y(p) + 3, f"{p} %", 10, TINTA2, "end"))
    for v in (0, 50, 100, 150, 200, 250, 300):
        out.append(texto(X(v), alto - 30, str(v), 10, TINTA2, "middle"))
    banda = (
        " ".join(f"{X(f[0]):.1f},{Y(f[3]):.1f}" for f in filas)
        + " "
        + " ".join(f"{X(f[0]):.1f},{Y(f[2]):.1f}" for f in reversed(filas))
    )
    out.append(f'<polygon points="{banda}" fill="{VINO}" opacity=".18"/>')
    linea = " ".join(f"{X(f[0]):.1f},{Y(f[1]):.1f}" for f in filas)
    out.append(f'<polyline points="{linea}" fill="none" stroke="{VINO}" stroke-width="2"/>')
    for f in filas:
        out.append(
            f'<circle cx="{X(f[0]):.1f}" cy="{Y(f[1]):.1f}" r="4" fill="{VINO}" stroke="#FEF9F1" stroke-width="2"/>'
        )
    for v, etq in ((80, "gratuito 80 → 89 % (85–93)"), (300, "paga 300 → 99 %")):
        out.append(
            f'<line x1="{X(v):.1f}" y1="{arriba}" x2="{X(v):.1f}" y2="{arriba + ah}" stroke="{DORADO}" stroke-width="2" stroke-dasharray="4 3"/>'
        )
        out.append(
            texto(
                X(v) + (5 if v < 200 else -5),
                Y(40),
                etq,
                10,
                TINTA,
                "start" if v < 200 else "end",
                600,
            )
        )
    out.append(
        texto(
            izq + au / 2,
            alto - 12,
            "tope de platillos; la banda es el intervalo de confianza de 90 %",
            10,
            TINTA2,
            "middle",
        )
    )
    out.append("</svg>")
    return "".join(out)


TIPOS = [
    ("taqueria_fonda", "Fonda / taquería"),
    ("cafeteria", "Cafetería"),
    ("casual", "Casual"),
    ("bar_cantina", "Bar / cantina"),
    ("formal", "Formal"),
]


def g_por_tipo(cartas) -> str:
    izq, der = 130, 24
    au = ANCHO - izq - der
    xmax = 200
    alto = 52 + 40 * len(TIPOS) + 30

    def X(v):
        return izq + au * min(v, xmax) / xmax

    out = [svg_abre(alto, "platillos por tipo de negocio")]
    for v in (0, 40, 80, 120, 160, 200):
        out.append(
            f'<line x1="{X(v):.1f}" y1="12" x2="{X(v):.1f}" y2="{alto - 44}" stroke="{REJILLA}"/>'
        )
        out.append(texto(X(v), alto - 30, str(v) if v < 200 else "200+", 10, TINTA2, "middle"))
    out.append(
        f'<rect x="{X(0):.1f}" y="12" width="{X(80) - X(0):.1f}" height="{alto - 56}" fill="{DORADO}" opacity=".07"/>'
    )
    out.append(texto(X(80) - 4, 24, "dentro del tope gratuito (80)", 9.5, TINTA2, "end"))
    for i, (clave, etq) in enumerate(TIPOS):
        vals = sorted(t for tp, t in cartas if tp == clave)
        y = 56 + i * 40
        med = (
            vals[len(vals) // 2]
            if len(vals) % 2
            else (vals[len(vals) // 2 - 1] + vals[len(vals) // 2]) / 2
        )
        out.append(texto(izq - 8, y + 4, f"{etq} (n={len(vals)})", 11, TINTA, "end"))
        for j, v in enumerate(vals):
            dy = ((j * 7) % 13) - 6
            out.append(
                f'<circle cx="{X(v):.1f}" cy="{y + dy:.1f}" r="3.2" fill="{VINO}" opacity=".55"/>'
            )
        out.append(
            f'<rect x="{X(med) - 1.5:.1f}" y="{y - 12}" width="3" height="24" rx="1.5" fill="{TINTA}"/>'
        )
        out.append(texto(X(med) + 5, y - 9, f"mediana {med:g}", 9.5, TINTA, "start", 600))
    out.append(
        texto(
            izq + au / 2,
            alto - 14,
            "platillos por carta (cada punto es un negocio; la raya negra, la mediana)",
            10,
            TINTA2,
            "middle",
        )
    )
    out.append("</svg>")
    return "".join(out)


def g_enigh() -> str:
    filas = []
    for nombre, fuera, _alim in E["enigh_2024"]["filas"]:
        filas.append((nombre, fuera, DORADO if nombre == "Nacional" else VINO, f"{n(fuera)} pesos"))
    filas.sort(key=lambda f: -f[1])
    return barras_h(
        filas,
        8000,
        lambda v: n(v),
        alto_fila=19,
        izq=150,
        der=80,
        titulo_eje="pesos por hogar al trimestre en alimentos y bebidas fuera de casa (2024)",
        marcas_eje=[0, 2000, 4000, 6000, 8000],
    )


def g_precios() -> str:
    filas = []
    for nombre, precio, cuando, _ in E["competidores"]["filas"]:
        color = DORADO if cuando == "carta" else (VINO if cuando == "nov" else GRIS)
        filas.append(
            (nombre, precio, color, f"{n(precio)}" + (" (sep)" if cuando == "sep" else ""))
        )
    svg = barras_h(
        filas,
        1200,
        lambda v: n(v),
        alto_fila=21,
        izq=200,
        der=70,
        titulo_eje="pesos al mes (sin IVA donde el proveedor lo dice)",
        marcas_eje=[0, 300, 600, 900, 1200],
    )
    return svg.replace("</svg>", leyenda(200, 0, []) + "</svg>")


def g_equilibrio() -> str:
    izq, der, arriba = 56, 170, 16
    alto = 320
    au = ANCHO - izq - der
    ah = alto - arriba - 56
    xmax, ymin, ymax = 1000, -100, 600

    def X(v):
        return izq + au * v / xmax

    def Y(v):
        return arriba + ah * (1 - (v - ymin) / (ymax - ymin))

    out = [svg_abre(alto, "punto de equilibrio")]
    out.append(
        f'<defs><clipPath id="area"><rect x="{izq}" y="{arriba}" width="{au}" height="{ah}"/>'
        "</clipPath></defs>"
    )
    for v in range(ymin, ymax + 1, 100):
        out.append(
            f'<line x1="{izq}" y1="{Y(v):.1f}" x2="{izq + au}" y2="{Y(v):.1f}" '
            f'stroke="{TINTA2 if v == 0 else REJILLA}" stroke-width="{1.5 if v == 0 else 1}"/>'
        )
        out.append(texto(izq - 6, Y(v) + 3, n(v), 10, TINTA2, "end"))
    for v in range(0, 1001, 200):
        out.append(texto(X(v), alto - 36, n(v), 10, TINTA2, "middle"))
    out.append(texto(izq + au / 2, alto - 20, "restaurantes registrados", 10, TINTA2, "middle"))
    out.append(
        texto(14, arriba + ah / 2, "excedente, USD al mes", 10, TINTA2, "middle").replace(
            "<text ", f'<text transform="rotate(-90 14 {arriba + ah / 2:.0f})" '
        )
    )
    series = [
        ("Sin ningún ingreso (referencia)", 0.0, 0.0, GRIS),
        ("Gratuito con anuncios (medio)", 0.0, RPM_MEDIO, DORADO),
        ("Gratuito con anuncios (bajo)", 0.0, RPM_BAJO, "#8F7A4A"),
        ("1 % paga 349 pesos", 0.01, 0.0, AZUL),
        ("3 % paga 349 pesos", 0.03, 0.0, VINO),
    ]
    etiquetas = []
    for etq, c, rpm, color in series:
        pts = [f"{X(k):.1f},{Y(economia(k, c, rpm)['excedente']):.1f}" for k in range(0, 1001, 5)]
        out.append(
            f'<polyline clip-path="url(#area)" points="{" ".join(pts)}" fill="none" '
            f'stroke="{color}" stroke-width="2.2"'
            + (' stroke-dasharray="6 4"/>' if rpm == 0 and c == 0 else "/>")
        )
        fin = economia(1000, c, rpm)["excedente"]
        if fin > ymax:
            k = next(k for k in range(0, 1001, 5) if economia(k, c, rpm)["excedente"] > ymax)
            out.append(
                texto(
                    X(k) + 4,
                    Y(ymax) + 12,
                    f"sigue ↑ hasta ≈ {n(fin)} USD con 1,000",
                    9.5,
                    TINTA,
                    "start",
                    600,
                )
            )
            etq = f"{etq}: ≈ {n(fin)} USD con 1,000"
        etiquetas.append([Y(min(fin, ymax)) + 4, etq, color])
    etiquetas.sort()
    for i in range(1, len(etiquetas)):
        etiquetas[i][0] = max(etiquetas[i][0], etiquetas[i - 1][0] + 26)
    for y, etq, color in etiquetas:
        partes = etq.split(": ")
        out.append(
            f'<rect x="{X(1000) + 6}" y="{y - 9}" width="10" height="3" rx="1.5" fill="{color}"/>'
        )
        out.append(texto(X(1000) + 20, y - 4, partes[0], 9.5, TINTA, "start", 600))
        if len(partes) > 1:
            out.append(texto(X(1000) + 20, y + 8, partes[1], 9.5, TINTA2))
    for c, color in ((0.01, AZUL), (0.03, VINO)):
        k = equilibrio(c)
        out.append(
            f'<circle cx="{X(k):.1f}" cy="{Y(0):.1f}" r="5" fill="{color}" stroke="#FEF9F1" stroke-width="2"/>'
        )
    out.append("</svg>")
    return "".join(out)


# ---------------------------------------------------------------------------------------------
# Texto del informe
# ---------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------
# Versión 2: escaleras de capacidad y de conversión, y escenario «sólo anuncios»
# (datos de datos/anuncios.json, que escribe docs/research/2026-11-13-anuncios-y-capa-del-comensal-modelo.py)
# ---------------------------------------------------------------------------------------------
MURO_CORTO = {
    "procesador": "procesador",
    "disco de 5 GB": "disco 5 GB",
    "10,000 conexiones abiertas": "conexiones",
}
NOMBRES_ESCALON = [
    "E0 · Hoy (sondeo, 2 procesos, Hobby)",
    "E1 · Eventos, 2 procesos, Hobby",
    "E2 · Eventos, 2 procesos, Pro",
    "E3 · Eventos, 4 procesos, Pro",
    "E4 · Eventos, 8 procesos, Pro",
]


def g_escalera_capacidad() -> str:
    """Barras agrupadas: gratuitos y de paga típicos que caben en cada escalón."""
    filas = [(NOMBRES_ESCALON[i], e["gratuito"], e["paga"]) for i, e in enumerate(A["escalones"])]
    rep = A["replicas"]
    filas.append(
        (
            "E5 · Réplicas (×2 o ×4 de 8 procesos)",
            {"n": rep[0]["n"], "muro": "10,000 conexiones abiertas"},
            {"n": A["escalones"][-1]["paga"]["n"], "muro": "10,000 conexiones abiertas"},
        )
    )
    izq, der, grupo = 196, 110, 46
    alto = 24 + grupo * len(filas) + 40
    maximo = 2400
    au = ANCHO - izq - der
    out = [svg_abre(alto, "escalera de capacidad")]
    xm = izq + au * A["muro_conexiones_n_gratuitos"] / maximo
    out.append(
        f'<line x1="{xm:.1f}" y1="10" x2="{xm:.1f}" y2="{alto - 34}" stroke="{TINTA2}" '
        'stroke-dasharray="4 3" stroke-width="1.3"/>'
    )
    out.append(texto(xm - 4, 20, "muro de 10,000 conexiones abiertas", 9.5, TINTA2, "end", 600))
    for v in (0, 500, 1000, 1500, 2000):
        x = izq + au * v / maximo
        out.append(f'<line x1="{x:.1f}" y1="26" x2="{x:.1f}" y2="{alto - 34}" stroke="{REJILLA}"/>')
        out.append(texto(x, alto - 20, n(v), 10, TINTA2, "middle"))
    out.append(
        texto(izq + au / 2, alto - 5, "restaurantes típicos que caben", 10, TINTA2, "middle")
    )
    for i, (etq, g, p) in enumerate(filas):
        y = 30 + i * grupo
        out.append(texto(izq - 8, y + 24, etq, 10.5, TINTA, "end", 600))
        for j, (d, color, quien) in enumerate(((g, VINO, "gratuitos"), (p, DORADO, "de paga"))):
            yy = y + j * 17
            w = au * d["n"] / maximo
            out.append(barra(izq, yy + 2, w, 14, color))
            out.append(
                texto(
                    izq + w + 5,
                    yy + 13,
                    f"{n(d['n'])} · {MURO_CORTO[d['muro']]}",
                    10,
                    TINTA,
                    "start",
                    600 if j == 0 else 400,
                )
            )
    out.append("</svg>")
    return "".join(out) + (
        '<p class="fuente" style="margin-top:0">'
        f'<span style="color:{VINO}">■</span> gratuitos típicos &nbsp; '
        f'<span style="color:{DORADO}">■</span> de paga típicos (12 meses de historial)</p>'
    )


def g_escalera_conversion() -> str:
    """Gratuitos que sostiene el costo según cuántos restaurantes de paga hay (k = 0 a 10)."""
    izq, der, arriba, alto = 52, 18, 14, 318
    au, ah = ANCHO - izq - der, alto - arriba - 82
    ymax, kmax = 2200, 10
    conv = AE["escalera_conversion"]

    def X(k):
        return izq + au * k / kmax

    def Y(v):
        return arriba + ah * (1 - v / ymax)

    out = [svg_abre(alto, "escalera de conversión")]
    for v in range(0, ymax + 1, 500):
        out.append(
            f'<line x1="{izq}" y1="{Y(v):.1f}" x2="{izq + au}" y2="{Y(v):.1f}" stroke="{REJILLA}"/>'
        )
        out.append(texto(izq - 6, Y(v) + 3, n(v), 10, TINTA2, "end"))
    for k in range(0, kmax + 1, 2):
        out.append(texto(X(k), alto - 64, str(k), 10, TINTA2, "middle"))
    out.append(texto(izq + au / 2, alto - 50, "restaurantes de paga", 10, TINTA2, "middle"))
    out.append(
        texto(13, arriba + ah / 2, "gratuitos que sostiene el costo", 10, TINTA2, "middle").replace(
            "<text ", f'<text transform="rotate(-90 13 {arriba + ah / 2:.0f})" '
        )
    )
    series = [
        (
            "Cupo con eventos (se achica 2.4 por cada de paga)",
            "eventos/349",
            "g_cap",
            TINTA2,
            "5 4",
        ),
        ("Con eventos, a 449", "eventos/449", "g_costo", DORADO, ""),
        ("Con eventos, a 349", "eventos/349", "g_costo", VINO, ""),
        ("Con eventos, a 249", "eventos/249", "g_costo", AZUL, ""),
        ("Forma de hoy, a 349", "hoy/349", "g_costo", GRIS, ""),
    ]
    for _etq, clave, campo, color, dash in series:
        filas = [f for f in conv[clave]["filas"] if f["k"] <= kmax]
        pts = " ".join(f"{X(f['k']):.1f},{Y(f[campo]):.1f}" for f in filas)
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        out.append(
            f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2.2"{extra}/>'
        )
        for f in filas:
            out.append(
                f'<circle cx="{X(f["k"]):.1f}" cy="{Y(f[campo]):.1f}" r="2.6" fill="{color}"/>'
            )
    x0, y0 = 8, alto - 30
    out.append(leyenda(x0, y0, [(s[0], s[3]) for s in series[:2]]))
    out.append(leyenda(x0, y0 + 16, [(s[0], s[3]) for s in series[2:]]))
    out.append("</svg>")
    return "".join(out)


def _interp(curva, g):
    """Costo mínimo (USD al mes) de sostener g gratuitos, por interpolación lineal de la curva."""
    for (g0, c0, _), (g1, c1, _) in zip(curva, curva[1:], strict=False):
        if g0 <= g <= g1:
            return c0 + (c1 - c0) * (g - g0) / max(g1 - g0, 1)
    return curva[-1][1]


def g_solo_anuncios() -> str:
    """Ingreso por anuncios no personalizados contra el costo mínimo, de 0 a 60 gratuitos."""
    izq, der, arriba, alto = 52, 150, 14, 300
    au, ah = ANCHO - izq - der, alto - arriba - 56
    xmax, ymax = 60, 40

    def X(g):
        return izq + au * g / xmax

    def Y(v):
        return arriba + ah * (1 - min(v, ymax * 1.05) / ymax)

    out = [svg_abre(alto, "sólo anuncios")]
    out.append(
        f'<defs><clipPath id="areaA"><rect x="{izq}" y="{arriba - 4}" width="{au}" height="{ah + 8}"/>'
        "</clipPath></defs>"
    )
    for v in range(0, ymax + 1, 10):
        out.append(
            f'<line x1="{izq}" y1="{Y(v):.1f}" x2="{izq + au}" y2="{Y(v):.1f}" stroke="{REJILLA}"/>'
        )
        out.append(texto(izq - 6, Y(v) + 3, n(v), 10, TINTA2, "end"))
    for g in range(0, xmax + 1, 10):
        out.append(texto(X(g), alto - 34, str(g), 10, TINTA2, "middle"))
    out.append(
        texto(
            izq + au / 2,
            alto - 18,
            "restaurantes gratuitos típicos (sin ninguno de paga)",
            10,
            TINTA2,
            "middle",
        )
    )
    out.append(
        texto(13, arriba + ah / 2, "USD al mes", 10, TINTA2, "middle").replace(
            "<text ", f'<text transform="rotate(-90 13 {arriba + ah / 2:.0f})" '
        )
    )
    visitas = AE["parametros"]["visitas_app_mes"]["gratuito"]
    curva_hoy = AE["curva_costo"]["hoy"]
    curva_ev = AE["curva_costo"]["eventos"]
    gs = list(range(0, xmax + 1))
    pts_c = " ".join(f"{X(g):.1f},{Y(_interp(curva_hoy, g)):.1f}" for g in gs)
    out.append(
        f'<polyline clip-path="url(#areaA)" points="{pts_c}" fill="none" stroke="{TINTA}" stroke-width="2.4"/>'
    )
    pts_e = " ".join(f"{X(g):.1f},{Y(_interp(curva_ev, g)):.1f}" for g in gs)
    out.append(
        f'<polyline clip-path="url(#areaA)" points="{pts_e}" fill="none" stroke="{TINTA2}" '
        'stroke-width="1.6" stroke-dasharray="5 4"/>'
    )
    etiquetas = []
    for nivel, color in (("alto", DORADO), ("medio", VINO), ("bajo", AZUL)):
        tasa = TAR[nivel]["usd_por_mil_visitas"]
        pts = " ".join(f"{X(g):.1f},{Y(g * visitas * tasa / 1000):.1f}" for g in gs)
        out.append(
            f'<polyline clip-path="url(#areaA)" points="{pts}" fill="none" stroke="{color}" stroke-width="2.2"/>'
        )
        eq = AE["equilibrio_solo_anuncios"][f"hoy/npa/{nivel}"]["primero"]
        if eq <= xmax:
            out.append(
                f'<circle cx="{X(eq):.1f}" cy="{Y(_interp(curva_hoy, eq)):.1f}" r="5" fill="{color}" '
                'stroke="#FEF9F1" stroke-width="2"/>'
            )
        fin = xmax * visitas * tasa / 1000
        yfin = Y(min(fin, ymax))
        etiquetas.append([yfin, f"Anuncios {nivel}", f"equilibrio con {eq}", color])
    etiquetas.sort()
    for i in range(1, len(etiquetas)):
        etiquetas[i][0] = max(etiquetas[i][0], etiquetas[i - 1][0] + 28)
    for y, t1, t2, color in etiquetas:
        out.append(
            f'<rect x="{izq + au + 6}" y="{y - 6}" width="10" height="3" rx="1.5" fill="{color}"/>'
        )
        out.append(texto(izq + au + 20, y - 1, t1, 10, TINTA, "start", 600))
        out.append(texto(izq + au + 20, y + 11, t2, 9.5, TINTA2))
    yc = Y(_interp(curva_hoy, xmax)) - 6
    out.append(
        texto(
            izq + au + 20,
            max(yc, etiquetas[-1][0] + 34),
            "Costo mínimo (hoy)",
            10,
            TINTA,
            "start",
            600,
        )
    )
    out.append("</svg>")
    return "".join(out)


def tabla(cab, filas, clase="") -> str:
    th = "".join(f"<th>{c}</th>" for c in cab)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in f) + "</tr>" for f in filas)
    return f'<table class="{clase}"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


def construir() -> str:
    num = [0]
    cartas = cargar_cartas()
    fr = E["factura_railway"]
    pm = fr["proyeccion_mes_usd"]
    mes_total = FACT_MES + DOMINIO_MES
    eq1, eq3 = equilibrio(0.01), equilibrio(0.03)
    gratis_costo = (
        GT["usd_marginal_eventos"] + S["rotacion_mes"] * S["lecturas_gratis_medias"] * LECTURA
    )
    alta_gratis = S["lecturas_gratis_medias"] * LECTURA
    e1000_3 = economia(1000, 0.03)
    e300_0 = economia(299, 0.0)
    e300_ads = economia(299, 0.0, RPM_MEDIO)
    e300_ads_b = economia(299, 0.0, RPM_BAJO)
    e300_ads_a = economia(299, 0.0, RPM_ALTO)
    e1000_ads = {
        k: economia(1000, 0.0, r)
        for k, r in (("bajo", RPM_BAJO), ("medio", RPM_MEDIO), ("alto", RPM_ALTO))
    }
    e1000_0 = economia(1000, 0.0)
    e100_3 = economia(100, 0.03)

    def fila_cap(clave, corto, perc=""):
        e = ESC[clave]
        pr = e["por_restaurante"]
        sufijo = "_p50" if perc else ""
        ch, ce = e["cpu_hoy" + sufijo], e["cpu_eventos" + sufijo]
        cab_h, cab_e = min(ch, e["disco"]), min(ce, e["disco"])
        muro_h = "procesador" if ch <= e["disco"] else "disco"
        muro_e = "procesador" if ce <= e["disco"] else "disco"
        return [
            corto + perc,
            n(ch),
            n(ce),
            n(e["disco"]),
            f"<b>{n(cab_h)}</b> <small>({muro_h})</small>",
            f"<b>{n(cab_e)}</b> <small>({muro_e})</small>",
            n(min(ce, 99999)),
            n(pr["comensales_dia"]),
            n(pr["mesas"], 1),
            n(pr["platillos"]),
        ]

    filas_cap = [
        fila_cap(
            "Peor caso + todos coinciden a la vez", "Gratuitos al tope, todos a la vez (peor)"
        ),
        fila_cap("Peor caso: todos gratuitos al tope (10 mesas × 6)", "Gratuitos al tope"),
        fila_cap("Todos gratuitos, típicos", "Gratuitos típicos"),
        fila_cap("Todos gratuitos, típicos", "Gratuitos típicos", ", día mediano (mejor)"),
        fila_cap("Mezcla 80 % gratuitos / 20 % paga", "Mezcla 80 / 20"),
        fila_cap("Todos de paga al tope (40 mesas × 12)", "De paga al tope (peor)"),
        fila_cap("Caso base: todos de paga, típicos", "De paga típicos"),
        fila_cap("Caso base: todos de paga, típicos", "De paga típicos", ", día mediano (mejor)"),
    ]
    tabla_cap = tabla(
        [
            "Escenario",
            "Procesador hoy",
            "Procesador con eventos",
            "Disco 5 GB",
            "<b>Cabe hoy</b>",
            "<b>Cabe con eventos</b>",
            "Con eventos y Pro",
            "Comensales al día por rest.",
            "Mesas por rest.",
            "Platillos por rest.",
        ],
        filas_cap,
        "chica",
    )

    escenarios_negocio = tabla(
        [
            "Escenario (con eventos, precios de hoy)",
            "Restaurantes",
            "Costo USD/mes",
            "Ingreso USD/mes",
            "Excedente USD/mes",
            "Plan Railway",
        ],
        [
            [
                "Hoy, sin restaurantes",
                "0",
                f"{mes_total:.2f}",
                "0",
                f"<b>−{mes_total:.2f}</b>",
                "Hobby",
            ],
            [
                "<b>Gratuito con anuncios no personalizados</b>, tarifa baja<br><small>derivada de fuentes débiles (sección 9)</small>",
                "299 (muro de disco)",
                f"{e300_ads_b['costo']:.2f}",
                f"{e300_ads_b['ingreso']:.2f}",
                f"<b>{e300_ads_b['excedente']:.2f}</b>",
                "Hobby",
            ],
            [
                "<b>Gratuito con anuncios no personalizados</b>, tarifa media",
                "299",
                f"{e300_ads['costo']:.2f}",
                f"{e300_ads['ingreso']:.2f}",
                f"<b>{e300_ads['excedente']:.2f}</b>",
                "Hobby",
            ],
            [
                "<b>Gratuito con anuncios no personalizados</b>, tarifa alta",
                "299",
                f"{e300_ads_a['costo']:.2f}",
                f"{e300_ads_a['ingreso']:.2f}",
                f"<b>{e300_ads_a['excedente']:.2f}</b>",
                "Hobby",
            ],
            [
                "Gratuito sin ningún ingreso (referencia: «no se sostiene nunca»)",
                "299 (muro de disco)",
                f"{e300_0['costo']:.2f}",
                "0",
                f"<b>{e300_0['excedente']:.2f}</b>",
                "Hobby",
            ],
            [
                "<b>Gratuito con anuncios</b>, tarifa media",
                "1,000",
                f"{e1000_ads['medio']['costo']:.2f}",
                f"{e1000_ads['medio']['ingreso']:.2f}",
                f"<b>{e1000_ads['medio']['excedente']:.2f}</b>",
                "Pro" if e1000_ads["medio"]["pro"] else "Hobby",
            ],
            [
                "Gratuito sin ningún ingreso (referencia)",
                "1,000",
                f"{e1000_0['costo']:.2f}",
                "0",
                f"<b>{e1000_0['excedente']:.2f}</b>",
                "Pro" if e1000_0["pro"] else "Hobby",
            ],
            [
                "3 % pasa a paga (349 pesos)",
                "100",
                f"{e100_3['costo']:.2f}",
                f"{e100_3['ingreso']:.2f}",
                f"<b>{e100_3['excedente']:.2f}</b>",
                "Pro" if e100_3["pro"] else "Hobby",
            ],
            [
                "3 % pasa a paga (349 pesos)",
                "1,000",
                f"{e1000_3['costo']:.2f}",
                f"{e1000_3['ingreso']:.2f}",
                f"<b>{e1000_3['excedente']:.2f}</b> (≈ {n(e1000_3['excedente'] * TC)} pesos)",
                "Pro" if e1000_3["pro"] else "Hobby",
            ],
        ],
        "chica",
    )

    secciones = []

    # ---- Portada ----
    secciones.append(f"""
<section class="portada">
  <p class="sobre">Carta · informe para Calvin · 13 de noviembre de 2026 · versión 2</p>
  <h1>Planos de Carta</h1>
  <p class="bajada">Cuánto cuesta, cuánto aguanta y de qué viviría: la historia de los análisis del 13 de noviembre, con sus fuentes, y las decisiones que te tocan.</p>
  <div class="tarjeta destacada">
    <p class="pregunta">La pregunta del millón</p>
    <p>Con lo que pagas hoy de Cloudflare y Railway, y con todo en la capa gratuita, ¿el negocio se sostiene solo y puede escalar?</p>
    <p class="respuesta">Todo gratis no se sostiene solo, pero cuesta poco: <b>≈ {mes_total:.1f} USD al mes</b> (≈ {n(mes_total * TC)} pesos) más centavos por restaurante. <b>Un solo restaurante de paga a 349 pesos cubre toda la operación de hoy.</b> Con eventos, el servidor de hoy aguanta <b>≈ 300 restaurantes gratuitos típicos</b>; el límite pasa a ser el disco de 5 GB, no el dinero, y se quita con el plan Pro (20 USD). A 1,000 restaurantes basta con que pague <b>1 de cada 100</b> para no perder dinero. <b>Con anuncios no personalizados</b> (lo que entiendes por gratuito) la infraestructura de hoy se pagaría con ≈ {EQ_ADS_ALTO} a {EQ_ADS_BAJO} restaurantes gratuitos, pero esa tarifa se derivó de fuentes débiles y no está medida (sección 9).</p>
  </div>
  <p class="nota">Cómo leer las marcas: {marca("medida")} lo midió una sesión en un contenedor local · {marca("documento")} lo dice un documento del repositorio · {marca("externa")} página leída con fecha · {marca("calvin")} lo dio Calvin · {marca("supuesto")} juicio o cálculo con supuestos, que va a «datos por conseguir». Las cifras de procesador tienen un margen de <b>±2×</b> hasta medir en Railway.</p>
  <p class="aviso"><b>Qué cambió en la versión 2.</b> Sección 9 nueva: escalera de capacidad, escalera de conversión y el escenario «sólo anuncios», con sus gráficas y fuentes nuevas (AdSense, Google 2019, ley de datos personales, comisión de cobro). Sección 8 corregida: «gratuito» es ahora gratuito <b>con anuncios no personalizados</b>, y se ve qué tarifa es dato y cuál supuesto. Las secciones 9 y 10 anteriores pasan a ser la 10 y la 11. Las demás cifras no cambian.</p>
  <p class="nota">Fuente reproducible: <code>docs/informes/2026-11-13-planos-de-carta/</code> (datos, guiones y HTML). Este PDF se genera con <code>generar.py</code> y <code>pdf.mjs</code>.</p>
</section>""")

    # ---- 1. Respuesta y decisiones ----
    secciones.append(f"""
<section>
  <h2><span>1</span> La respuesta en una página</h2>
  <div class="dos">
    <div class="cifra"><b>{
        mes_total:.1f} USD</b><span>al mes cuesta Carta hoy, sin restaurantes: proyección sobre la captura de Calvin {
        marca("supuesto")
    }</span></div>
    <div class="cifra"><b>1</b><span>restaurante de paga a 349 pesos cubre eso y deja ≈ {
        PRECIO_USD - mes_total:.0f} USD {marca("supuesto")}</span></div>
    <div class="cifra"><b>≈ 300</b><span>gratuitos típicos caben con eventos y el plan de hoy (muro: disco) {
        marca("supuesto")
    }</span></div>
    <div class="cifra"><b>1 %</b><span>de conversión a paga basta para no perder dinero a escala {
        marca("supuesto")
    }</span></div>
  </div>
  <h3>¿Se sostiene? Sí, bajo tres condiciones</h3>
  <ol>
    <li><b>Que lleguen los eventos</b> (ya lo decidiste). Con la pregunta cada 3 s caben ≈ 148 gratuitos típicos; con eventos, ≈ 1,064 por procesador. Sin eventos el muro llega antes que cualquier ingreso.</li>
    <li><b>Que paguen al menos ≈ 1 de cada 100 registrados</b> a 349 pesos. Con 1 % se cubre todo a partir de ≈ {
        eq1
    } restaurantes; con 3 %, a partir de ≈ {eq3}.</li>
    <li><b>Que el disco no se llene sin aviso.</b> El plan Hobby da 5 GB de base de datos; con 12 meses de historial, <b>17 restaurantes de paga típicos lo llenan</b>. La salida es el plan Pro (20 USD con 20 de uso incluidos) o menos historial.</li>
  </ol>
  <p>Lo que <b>no</b> responde este informe es si <b>tú</b> vives de esto: 10,000 pesos al mes piden ≈ 30 restaurantes de paga. Eso depende de cuántos restaurantes de más de 10 mesas alcances y de si pagan, y <b>nadie lo ha medido</b>. La prueba de precio del piloto lo mide.</p>
  <h3>Siete decisiones recomendadas</h3>
  {
        tabla(
            ["#", "Decisión", "Por qué en una línea"],
            [
                [
                    "1",
                    "Construir los eventos empezando por la escucha de la base",
                    "Sola ya duplica la capacidad del sondeo; luego la conexión de eventos da 5–8×.",
                ],
                [
                    "2",
                    "Quedarse en Hobby en el piloto y pasar a Pro al 70 % del disco (3.5 GB)",
                    "El disco es el muro que manda con eventos; Pro cuesta 15 USD más al mes.",
                ],
                [
                    "3",
                    "Topes: 10 / 40 mesas como lo que separa; 80 / 300 platillos y 3 / 20 personas como guardas",
                    "Los platillos se traslapan entre tipos de negocio; las mesas sí miden tamaño y costo.",
                ],
                [
                    "4",
                    "Precio de lista 349 antes de IVA (rango 249–449); en el piloto, descuento en una segunda hoja",
                    "Es el percentil 40 de 10 competidores; la segunda hoja no borra el precio que se mide.",
                ],
                [
                    "5",
                    "Anuncios no personalizados en gratuito sólo al 70 % del muro que mande, y antes medir con una prueba pequeña",
                    f"Pagarían lo fijo con ≈ {EQ_ADS_ALTO}–{EQ_ADS_BAJO} gratuitos, pero la tarifa se derivó de fuentes débiles y falta la aprobación de AdSense (sección 9.3).",
                ],
                [
                    "6",
                    "Dejar la regla de Cloudflare en 300 por 10 s y medirla en la prueba de carga (T-4.4), ya con eventos (decisión de Calvin del 13 de noviembre)",
                    "Con el sondeo, un local con WiFi compartido la dispara con ≈ 90 teléfonos; con eventos hay que medirlo.",
                ],
                [
                    "7",
                    "Conseguir cinco datos que cuestan ≈ 0 pesos",
                    "Desglose de Railway, conexiones de PostgreSQL, pantalla encendida, costo de la vista del personal y 5–10 entrevistas.",
                ],
            ],
        )
    }
  <p class="fuente">Detalle, porqué y fuente de cada una en la sección 11.</p>
</section>""")

    # ---- 2. Lo que cuesta hoy ----
    partidas_tabla = tabla(
        ["Partida", "Cantidad", "Precio unitario (USD)", "USD", "Parte"],
        [
            [
                p["nombre"],
                f"{n(p['cantidad'], 2)} {p['unidad']}",
                f"{p['precio']:g}",
                f"{p['usd']:.4f}",
                f"{100 * p['usd'] / fr['total_usd']:.1f} %",
            ]
            for p in fr["partidas"]
        ]
        + [["<b>Total de la captura</b>", "", "", f"<b>{fr['total_usd']:.4f}</b>", "100 %"]],
        "chica",
    )
    secciones.append(f"""
<section>
  <h2><span>2</span> Lo que cuesta hoy</h2>
  <p>El dato nuevo de hoy es tu captura de Railway {marca("calvin")}: proyecto <code>carta</code>, plan Hobby, «Usage by Project» al 13 de noviembre ≈ 04:35 UTC. Lleva <b>{fr["total_usd"]:.4f} USD</b> acumulados con staging encendido desde el 10 de noviembre (08:10 UTC) y producción desde el 11 (sin hora).</p>
  {figura(g_costo_hoy(), "Casi todo lo que se paga es memoria encendida, no tráfico", "captura de Calvin de Railway «Usage by Project», 13-nov-2026 ≈ 04:35 UTC " + marca("calvin") + ". Cantidades y precios unitarios de la propia captura.", num)}
  {partidas_tabla}
  <h3>Proyección al mes</h3>
  <p>Si el ciclo de cobro empezó antes del 10 de noviembre y producción lleva desde el 11 a mediodía, los dos entornos han estado encendidos ≈ 6,540 minutos-entorno. A ese ritmo, un mes de 30 días cuesta <b>≈ {pm["central"]:.2f} USD</b>, entre {pm["bajo"]:.2f} y {pm["alto"]:.2f} según la hora de producción {marca("supuesto")}. Como pasa de los 5 USD que el plan Hobby incluye, la factura es el uso: ≈ 8.5 USD.</p>
  {figura(g_mes_hoy(), "Costo mensual de hoy: ≈ " + f"{mes_total:.1f}" + " USD (≈ " + n(mes_total * TC) + " pesos)", "Railway: proyección del simulador (función <code>deducir_de_la_factura</code>) " + marca("supuesto") + "; dominio: 25 USD al año " + marca("calvin") + "; Cloudflare «Free Website», confirmado por la API " + marca("documento") + ". Tipo de cambio 18.6188 (FIX Banxico, 12-nov-2026) " + marca("externa") + ".", num)}
  <h3>De qué se compone y qué es gratis</h3>
  <ul>
    <li><b>Memoria (95 %).</b> Lo que cuesta es tener encendidos dos entornos, cada uno con la API (2 procesos) y PostgreSQL. La memoria media por entorno salió de ≈ <b>0.405 GB</b> (0.365–0.455). Si la API pesa en Railway lo que en local (2 × 0.16 GB {marca("medida")}), PostgreSQL y el respaldo pesan ≈ <b>0.085 GB</b> por entorno. Esto sustituye en el simulador el supuesto de memoria de PostgreSQL (antes 0 o 0.5 GB ilustrativo).</li>
    <li><b>Procesador, disco y red: 5 %.</b> Sin restaurantes, casi no trabajan.</li>
    <li><b>Gratis hoy:</b> Cloudflare (plan gratuito), R2 hasta 10 GB y sin cobro por descarga {marca("externa")}, y Firebase hasta 50,000 usuarios activos al mes {marca("externa")}.</li>
    <li><b>Lo único que crece por restaurante y cuesta de verdad:</b> leer el PDF de la carta con la API de Claude: 0.11 a 0.64 USD por lectura {marca("documento")}; ≈ {alta_gratis:.2f} USD de media por dueño gratuito con el tope de 3 lecturas {marca("supuesto")}.</li>
  </ul>
  <p class="aviso"><b>Datos por conseguir:</b> el día en que empezó el ciclo de cobro y el costo por servicio (API, PostgreSQL, respaldo), en el panel de Railway → Usage. Con eso la proyección pasa de supuesto a dato.</p>
</section>""")

    # ---- 3. Qué consume el servidor ----
    secciones.append(f"""
<section>
  <h2><span>3</span> Qué consume el servidor</h2>
  <p>Hoy cada teléfono abierto pregunta al servidor <b>«¿cambió algo?» cada 3 segundos</b>, aunque nada haya cambiado. Esa pregunta es más del 90 % de las peticiones {
        marca("medida")
    } y cuesta <b>1.8 a 3.5 ms de procesador</b> cada vez, no 0.4 como suponía el plan {
        marca("medida")
    }. Por eso el tope real era 4–5 veces menor que el escrito.</p>
  {
        figura(
            g_peticiones(),
            "Un comensal hace ≈ 11 veces menos peticiones con eventos",
            "docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md §2 "
            + marca("supuesto")
            + " (5,400 s ÷ 3 s; con eventos: 65 lecturas por aviso + 90 de respaldo + 9 reconexiones).",
            num,
        )
    }
  <h3>Lo medido con eventos</h3>
  <p>Una sesión armó un prototipo desechable y lo midió en local con 1,200 comensales y 1 cambio por minuto por mesa {
        marca("medida")
    }:</p>
  {
        tabla(
            ["", "Hoy (pregunta cada 3 s)", "Eventos"],
            [
                ["Trabajo del servidor", "1.06 núcleos", "<b>0.23 núcleos</b>"],
                ["Procesador por comensal", "0.88 ms por segundo", "<b>0.195 ms por segundo</b>"],
                [
                    "Tope cómodo con 2 procesos",
                    "1,200–1,600 comensales",
                    "<b>8,000–10,000 comensales</b>",
                ],
                [
                    "Tiempo hasta ver el cambio (servidor)",
                    "1.5 s típico · 2.8 s peor habitual",
                    "<b>0.02 s · 0.03 s</b>",
                ],
            ],
            "chica",
        )
    }
  {
        figura(
            g_visible(),
            "El cambio llega casi al instante con eventos",
            "docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md §3.2 "
            + marca("medida")
            + " (servidor local, sin red de celular; la red añade ≈ 0.1–0.3 s "
            + marca("supuesto")
            + ").",
            num,
        )
    }
  <h3>Por qué decidiste eventos</h3>
  <p>Lo pediste («que nadie pregunte entre eventos») y los números lo respaldan: 5–7 veces más comensales por núcleo, cambios en milisegundos y ≈ 10 veces menos tráfico. La Spec 001 quitó el cierre por inactividad: las mesas viven más y, con la pregunta de cada 3 s, cada teléfono olvidado seguiría gastando. La alternativa más simple (preguntar según la fase de la mesa) da 3–5× pero los cambios tardan de 3 a 45 s. El ADR-018, aceptado por Calvin el 13 de noviembre, sustituye al ADR-004.</p>
  <h3>Qué queda «por tiempo» y por qué</h3>
  <ul>
    <li><b>Un latido cada 25 s</b>: un byte para que Cloudflare (125 s) y Railway (5 min sin datos) no corten la línea {
        marca("externa")
    }. 5,000 teléfonos quietos usan el 4 % de un núcleo {marca("medida")}.</li>
    <li><b>Una pregunta de respaldo cada 60 s</b>, por si un aviso se pierde. Es la mitad del costo en reposo.</li>
    <li><b>Reconectar cada ≈ 10 min</b>: Railway corta toda conexión a los 15 min {
        marca("externa")
    }.</li>
    <li><b>Los relojes</b> (minutos en mesa, verde/amarillo/rojo, recordatorio) <b>viven en el teléfono</b>. Y con el teléfono bloqueado no llega nada, ni hoy ni con eventos: al volver se pone al día (lo aceptaste).</li>
  </ul>
  <p class="aviso"><b>Riesgo principal:</b> al desplegar, todas las conexiones caen y vuelven juntas; con 5,000 teléfonos el servidor estuvo ≈ 9 s al 100 % {
        marca("medida")
    }. El remedio está en el diseño: cada teléfono espera un tiempo al azar antes de volver.</p>
</section>""")

    # ---- 4. Cuántos caben ----
    secciones.append(f"""
<section class="ancha">
  <h2><span>4</span> Cuántos caben</h2>
  <p>El simulador de uso sortea cada hora de 364 días restaurantes con su tamaño, ocupación, comensales y fases de la mesa, y busca el mayor número de restaurantes que cabe con <b>95 % de probabilidad</b> de que la hora más cargada de cualquier día no pase de 70 % del procesador de los <b>2 procesos de hoy</b> {marca("supuesto")}. Sus cifras sustituyen a las del informe de planes, que no contaba el trabajo del personal ni las escrituras. Hay <b>dos muros que no se pagan con dinero</b> dentro de Hobby: el procesador y el disco de 5 GB de PostgreSQL. Manda el que llega primero.</p>
  {figura(g_capacidad(), "Con eventos el procesador deja de mandar: el muro pasa a ser el disco", "simulador de uso (docs/research/2026-11-13-simulador-de-uso.py, semilla fija, ronda 3) vía <code>extraer_simulador.py</code> " + marca("supuesto") + "; costo por petición " + marca("medida") + "; disco de 5 GB de Hobby " + marca("externa") + " (docs.railway.com/reference/pricing/plans, 13-nov-2026).", num)}
  {tabla_cap}
  <p class="fuente"><b>Fuente:</b> mismo simulador. «Peor»: todos en el tope de su plan (10 mesas × 6 o 40 × 12), o todos abiertos el mismo día. «Típico»: tamaños según los perfiles del informe de planes. «Mejor»: el día mediano (p50) en vez del día malo del año (p95). Disco con historial de 30 días en gratuito y 12 meses en paga {marca("calvin")}. «Con eventos y Pro»: sin muro de disco (Pro llega a 1 TB {marca("externa")}). Personal por restaurante: chico 2–4, mediano 3–6, grande 8–14, formal 6–10 {marca("supuesto")}; topes 3 y 20 {marca("calvin")}.</p>
  <h3>Cómo se lee</h3>
  <ul>
    <li><b>Hoy</b> (pregunta cada 3 s): caben <b>41 a 148 gratuitos</b> según el caso y <b>8 a 17 de paga</b>. En gratuito manda el procesador; en paga manda el disco (17), porque se guardan 12 meses de historial.</li>
    <li><b>Con eventos</b>: el procesador sube 6–7 veces (148 → 1,064 gratuitos típicos), pero el disco frena antes: <b>≈ 299 gratuitos típicos</b>, 240 al tope, 85 con 20 % de paga, 17 de paga. Con 30 días de historial también en paga, el muro de disco de los de paga sube de 17 a 212.</li>
    <li><b>En comensales:</b> 299 gratuitos típicos atienden ≈ {n(GT["con_eventos"]["comensales_dia"])} comensales al día (≈ {n(GT["con_eventos"]["comensales_mes"] / 1e6, 1)} millones al mes), en ≈ {n(299 * GT["por_restaurante"]["mesas"])} mesas y ≈ {n(299 * GT["por_restaurante"]["platillos"])} platillos; en la hora pico, ≈ {n(GT["con_eventos"]["frente_p95"])} teléfonos con la pantalla encendida. Con Pro y eventos, 1,064 gratuitos atienden ≈ 121,000 comensales al día {marca("supuesto")}.</li>
    <li><b>Un restaurante de paga al tope (40 × 12) pesa ≈ 8 gratuitos al tope</b> y en el 11 % de sus horas dispara la regla de Cloudflare de 300 peticiones por 10 s por IP {marca("supuesto")}.</li>
  </ul>
  <h3>Foto y modelo 3D por platillo (peor caso de almacenamiento)</h3>
  {figura(g_medios(), "Las fotos viven en R2 y casi no cuestan; los 10 GB gratis se acaban pronto, pero el excedente son centavos", "docs/research/2026-11-13-mapa-de-procesos-y-costos.md §4.13 (simulador): foto = original 3 MB " + marca("supuesto") + " + variantes 97 KB " + marca("medida") + "; modelo .glb de 4 MB, presupuesto de docs/mvp/05_3D_Pipeline.md " + marca("documento") + "; R2: 10 GB gratis y 0.015 USD/GB-mes " + marca("externa") + ". El 3D sigue fuera de la v1 (ADR-011).", num)}
  <p>Fuera de los 10 GB gratis, un restaurante de paga con fotos y 3D en sus 300 platillos cuesta ≈ 0.03 USD al mes de R2. Un comensal que abre un modelo baja 4.08 MB, pero lo sirven R2 y Cloudflare, no la API, y la salida de R2 es gratis {marca("externa")}. <b>El almacenamiento no es un muro; el disco de la base de datos sí.</b></p>
</section>""")

    # ---- 5. Mercado ----
    secciones.append(f"""
<section>
  <h2><span>5</span> El mercado</h2>
  <p>Para fijar topes se leyó la carta pública de <b>148 negocios en 16 capitales</b>, de cinco tipos {marca("medida")}. Los conteos los hizo la herramienta de lectura (±5 %) y 147 de 148 son cartas de reparto (Rappi), no de salón.</p>
  {figura(g_histograma(cartas), "Tres de cada cuatro cartas tienen hasta 60 platillos; nueve de cada diez, hasta 82", "docs/research/2026-11-13-estadistica-de-cartas-y-personal-datos.csv (148 filas, columna <code>total</code> = comida + bebidas) " + marca("medida") + ".", num)}
  {figura(g_cobertura(), "Con un tope de 80 platillos cabe el 89 % de los negocios", "docs/research/2026-11-13-estadistica-de-cartas-y-personal.md §3.3: porcentaje acumulado con intervalo de confianza de 90 % por remuestreo (5,000) " + marca("medida") + ".", num)}
  <h3>Por qué los platillos separan mal gratuito de paga</h3>
  {figura(g_por_tipo(cartas), "Los tipos de negocio se traslapan: casi todos caben en 80 platillos", "mismo archivo de datos, por la columna <code>tipo</code> " + marca("medida") + ". Formal (n = 9) y bar (n = 14) son poco fiables.", num)}
  <p>Las medianas van de 34 (fondas) a 51 (bares): una fonda y un casual tienen cartas parecidas. Por encima de 80 quedan pocos, y no por ser «más grandes». <b>Lo que sí separa es el tamaño operativo</b>: mesas y personal. Por eso el platillo debe ser una guarda amplia (80 / 300) y el plan debe ordenarse por mesas.</p>
</section>""")

    secciones.append(f"""
<section>
  <h3>La demanda: cuánto gastan los hogares en comer fuera</h3>
  {figura(g_enigh(), "La Ciudad de México gasta 3.5 veces el promedio nacional en comer fuera", E["enigh_2024"]["fuente"] + " " + marca("externa"), num)}
  <p>El hogar mexicano destina el <b>14 % de su gasto en alimentos a comer fuera</b> (2,249 de 15,614 pesos al trimestre) y creció 38 % entre 2022 y 2024 {marca("externa")}. En la Ciudad de México es un tercio. Querétaro, Baja California y Colima rondan 28–30 %; Oaxaca, Guanajuato y Campeche, 16–17 %. Lectura para el piloto: empezar donde se come fuera más seguido.</p>
  <h3>Sesgos de la muestra (lo que no se sabe)</h3>
  <ul>
    <li><b>Reparto en vez de salón:</b> la carta de Rappi es un subconjunto; probablemente subestima a los formales.</li>
    <li><b>No es al azar:</b> se leyó lo que abría; sesga a ciudad y cadenas.</li>
    <li><b>Personal y mesas no tienen estadística</b> en México: los porcentajes de 3 personas (≈ 64 %) y 10 mesas (≈ 61 %, entre 29 y 84 %) salen de un modelo con supuestos.</li>
    <li><b>No hay cifra oficial de cuántas veces se come fuera</b> ni del tamaño del grupo en la mesa.</li>
  </ul>
  <p class="fuente">docs/research/2026-11-13-estadistica-de-cartas-y-personal.md §2, §4 y §8.</p>
</section>""")

    # ---- 6. Planes ----
    secciones.append(f"""
<section>
  <h2><span>6</span> Los planes</h2>
  <p>Cada tope sirve para una de tres cosas: <b>ahorrar dinero</b> (algo que cuesta por uso), <b>proteger capacidad</b> (el procesador o el disco) o <b>dar una razón comercial para pagar</b>. Mezclarlas enoja al dueño: siente que le cobran por un límite artificial.</p>
  {
        tabla(
            ["Tope", "Gratuito", "De paga", "Para qué sirve", "Por qué", "Fuente"],
            [
                [
                    "Mesas activas",
                    "10",
                    "40",
                    "<b>Comercial</b> y capacidad",
                    "Mide tamaño, valor y costo a la vez; 10 cubre ≈ 61 % (29–84) de los de servicio completo y 40 ≈ 97 %",
                    "Calvin; estadística §4.3 " + marca("supuesto"),
                ],
                [
                    "Comensales por mesa",
                    "6",
                    "12",
                    "Capacidad",
                    "Acota los teléfonos por mesa; un paga al tope pesa ≈ 8 gratuitos",
                    "Calvin; simulador",
                ],
                [
                    "Personal (cuentas con PIN)",
                    "3",
                    "20",
                    "Comercial débil",
                    "Un PIN cuesta 131 ms de procesador una vez: no ahorra nada; 3 cubre ≈ 64 %",
                    "Calvin; mapa §3.3 " + marca("medida") + "; estadística",
                ],
                [
                    "Platillos activos",
                    "80",
                    "300",
                    "Guarda de capacidad",
                    "Casi no cuesta (≈ 1.1 KB cada uno); 80 cubre el 89 %; no debe cortar la importación del PDF",
                    "estadística §3 " + marca("medida"),
                ],
                [
                    "Lecturas de PDF",
                    "3 en total por dueño",
                    "fila prioritaria, sin número",
                    "<b>Ahorra dinero</b>",
                    "Es el único costo directo: 0.11–0.64 USD por lectura",
                    "Calvin; planes §3.5 " + marca("documento"),
                ],
                [
                    "Historial",
                    "30 días",
                    "12 meses",
                    "Capacidad (disco)",
                    "Con 12 meses, 17 de paga llenan los 5 GB de Hobby",
                    "Calvin; simulador",
                ],
                [
                    "Marca «Hecho con Carta»",
                    "sí",
                    "no",
                    "Comercial",
                    "Imagen propia del dueño; además da distribución",
                    "estrategia §3.2",
                ],
                [
                    "Anuncios",
                    "más adelante, al llegar a la meta",
                    "no",
                    "Ingreso",
                    f"≈ {ADS_RESTAURANTE[0]:.1f}–{ADS_RESTAURANTE[2]:.1f} USD por gratuito al mes, no personalizados; falta aprobación y tarifa medida",
                    "Calvin; comparativo §5 " + marca("supuesto"),
                ],
            ],
            "chica",
        )
    }
  <p>La lectura de conjunto: <b>las mesas son la razón de pago; los platillos, las lecturas y el historial son guardas</b> que un restaurante normal nunca debería sentir. El de personal (3) es el más discutible: un restaurante de 10 mesas con dos turnos tiene 4 o 5 meseros distintos (supuesto de la estrategia, por confirmar en entrevistas).</p>
  <p class="fuente">docs/research/2026-11-13-estrategia-de-precios.md §3.2; 2026-11-13-estadistica-de-cartas-y-personal.md §0; 2026-11-13-mapa-de-procesos-y-costos.md §6; decisiones de Calvin en 04 §11 (13-nov).</p>
</section>""")

    # ---- 7. Precios ----
    secciones.append(f"""
<section>
  <h2><span>7</span> Los precios</h2>
  <p><b>De dónde sale 349.</b> Aparece el 4 de abril de 2026 en <code>Carta_Market_Analysis.md</code> como «≈ 20 USD» para un plan Pro, sin ninguna lectura de precios detrás: son 20 dólares convertidos a pesos {
        marca("documento")
    }. Es una hipótesis, no un cálculo. Hoy se contrastó con 10 planes de entrada leídos en la página de cada proveedor {
        marca("externa")
    }.</p>
  {
        figura(
            g_precios(),
            "Carta Servicio (dorado) cae arriba de los menús QR y debajo de cualquier punto de venta",
            E["competidores"]["fuente"]
            + " "
            + marca("externa")
            + ". Planes gratuitos que también existen: Neolo (200 visitas), MenuTiger Free (75 pedidos), Waitry Lite (sólo carta) y Loyverse (POS sin QR).",
            num,
        )
    }
  <p>De los 10 planes de entrada, 4 cuestan menos que 349 y 6 más: es el <b>percentil 40</b>. La mediana de los menús QR es 225 y la de los puntos de venta, 699 {
        marca("documento")
    }. El comparativo recomienda <b>349 de lista con un rango defendible de 249 a 449</b>: debajo de 249 compites con lo casi gratis; arriba de 449 te acercas al POS más barato (550) sin cobrar ni facturar {
        marca("supuesto")
    }. Ninguno de los leídos dice tener orden compartida de la mesa ni alérgenos por platillo con filtro en el teléfono: esa es la diferencia que 349 tiene que sostener.</p>
  <h3>Qué compra el dueño con 349 pesos</h3>
  <p>349 pesos al mes son ≈ 11.6 pesos al día. Se pagan solos si Carta evita <b>un</b> platillo rehecho de 349 pesos al mes, gana <b>una</b> mesa de 349 o evita <b>una</b> reimpresión de la carta {
        marca("supuesto")
    }. Ninguna de esas cifras de valor está medida: hay que preguntarlas.</p>
  <h3>La oferta del piloto</h3>
  <p>Tu postura: gratuito para todos y un plan de paga con <b>descuento especial</b>. La estrategia pedía no descontar durante la prueba para no ensuciar el precio que se mide. El comparativo concilia las dos cosas con <b>dos hojas</b> en la semana 6 {
        marca("documento")
    }:</p>
  <ol>
    <li><b>Hoja 1 (la que mide):</b> «Carta Servicio: 349 pesos al mes más IVA», sin descuento, con las preguntas de siempre.</li>
    <li><b>Hoja 2, sólo a quien dijo que sí o «sí, pero es caro»:</b> primer mes gratis y 3 meses a 175 pesos (50 %); después 349, congelado 12 meses. A cambio: carta firmada el día 1, una entrevista de 20 minutos y permiso de contar el caso.</li>
  </ol>
  <p>El descuento deja de cobrar ≈ 872 pesos (47 USD) por restaurante que lo acepte; no genera pérdida por costo {
        marca("supuesto")
    }. El porcentaje sigue siendo tu decisión.</p>
  <h3>La prueba de precio (fijada antes de ver respuestas)</h3>
  {
        tabla(
            ["Resultado al final de 6 semanas (activos con más de 10 mesas)", "Decisión"],
            [
                [
                    "≥ 30 % paga el primer mes o firma carta de compromiso",
                    "Aprobado: abrir la Spec 002 con 349",
                ],
                ["15–29 %", "Repetir con los siguientes 10, la mitad a 249"],
                ["< 15 % y dicen «es caro»", "El precio es el problema: probar 249"],
                [
                    "< 15 % y dicen «no me sirve»",
                    "El problema es el valor, no el precio: bajarlo no ayuda",
                ],
            ],
            "chica",
        )
    }
  <p class="fuente">docs/research/2026-11-13-estrategia-de-precios.md §1.4, §4.1 y §5. Con 10 restaurantes, un «sí» más o menos mueve 10 puntos: es una señal, no una estadística.</p>
</section>""")

    # ---- 8. ¿Es negocio? ----
    secciones.append(f"""
<section>
  <h2><span>8</span> ¿Es negocio?</h2>
  <p class="aviso"><b>Versión 2:</b> aquí «gratuito» es lo que entiende Calvin: <b>gratuito con anuncios no personalizados</b> (no se venden datos), con sus restaurantes sin pagar. El gratuito sin ningún ingreso queda sólo como referencia, porque «no se va a sostener nunca». <b>La tarifa de los anuncios es supuesto derivado de fuentes débiles</b> (tabla de la sección 9.3); lo que es dato son el RPM de la calculadora de AdSense y la pérdida medida por Google en 2019.</p>
  <p>Modelo de este informe {marca("supuesto")}: con eventos, cada restaurante gratuito típico cuesta ≈ {gratis_costo:.3f} USD al mes (tráfico y disco {GT["usd_marginal_eventos"]:.3f} + lecturas de PDF de altas nuevas), más ≈ {alta_gratis:.2f} USD una sola vez al darse de alta. Uno de paga típico cuesta ≈ {PT["usd_marginal_eventos"] + S["lecturas_paga_mes"] * LECTURA:.2f} USD al mes y paga {PRECIO_USD:.2f} USD (349 pesos antes de IVA). Lo fijo son los ≈ {mes_total:.1f} USD de hoy. Si el disco pasa de 5 GB, Railway pasa a Pro (mínimo 20 USD).</p>
  {figura(g_equilibrio(), "Excedente mensual según cuántos se registran y cuántos pagan", "cálculo de <code>generar.py</code> (función <code>economia</code>) con el costo por restaurante del simulador " + marca("supuesto") + ", la proyección sobre la captura de Railway de Calvin " + marca("supuesto") + ", precio 349 " + marca("documento") + f" y anuncios no personalizados a {RPM_BAJO:.2f} (bajo), {RPM_MEDIO:.2f} (medio) y {RPM_ALTO:.2f} (alto) USD por mil visitas, derivados en la sección 9.3 " + marca("supuesto") + ". El escalón de las líneas de paga es el paso a Pro.", num)}
  {escenarios_negocio}
  <h3>Lo que dicen los números</h3>
  <ul>
    <li><b>Todo gratuito, sin ingresos:</b> pagas ≈ {mes_total:.0f}–{-e1000_0["excedente"]:.0f} USD al mes de 0 a 1,000 restaurantes. No se sostiene solo, pero el agujero es chico.</li>
    <li><b>Gratuito con anuncios no personalizados:</b> ≈ {ADS_RESTAURANTE[0]:.2f} (bajo), {ADS_RESTAURANTE[1]:.2f} (medio) y {ADS_RESTAURANTE[2]:.2f} (alto) USD por restaurante gratuito al mes ({n(VISITAS_APP_MES_GRATIS)} visitas con la app). <b>Sin nadie de paga, la infraestructura se pagaría sola desde ≈ {EQ_ADS_ALTO} (alto), {EQ_ADS_MEDIO} (medio) o {EQ_ADS_BAJO} (bajo) restaurantes gratuitos</b>, con eventos. Pero la tarifa de México no tiene fuente primaria, hace falta que AdSense apruebe el sitio y que se abra la política de seguridad; <b>y no cubre tu ingreso</b>: la sección 9.3 dice cuántos hacen falta para 10,000 pesos al mes.</li>
    <li><b>Punto de equilibrio con paga:</b> con 1 % de conversión, desde ≈ <b>{eq1}</b> restaurantes; con 3 %, desde ≈ <b>{eq3}</b>. A 1,000 restaurantes con 3 % quedan ≈ <b>{n(e1000_3["excedente"])} USD</b> (≈ {n(e1000_3["excedente"] * TC)} pesos) al mes antes de impuestos, soporte y tu tiempo.</li>
    <li><b>El costo no es la restricción; tu ingreso sí.</b> Para 10,000 pesos al mes hacen falta ≈ 30 restaurantes de paga a 349. Lo que decide es cuántos restaurantes de más de 10 mesas alcanzas.</li>
  </ul>
  <p>A mayor escala (Pro y eventos), el informe de mapa de procesos da ≈ 23 USD de uso con 500 gratuitos típicos y ≈ 29 con 1,000; ≈ 52 con 500 de paga y ≈ 89 con 1,000 {marca("supuesto")} (con PostgreSQL de 0.5 GB ilustrativo; con lo deducido hoy, ≈ 8 USD menos).</p>
</section>""")

    # ---- 9 (versión 2). Escaleras y anuncios ----
    esc_ = A["escalones"]
    conv = AE["escalera_conversion"]
    eqs = AE["equilibrio_solo_anuncios"]
    meta = AE["meta_calvin"]
    m10 = AE["meta_10000_mxn_solo_anuncios"]
    com29 = AE["comensal29"]
    neto_rest = AE["restaurante_neto_mxn"]
    capa = AE["capa_comensal"]

    def celda_escalon(e, tipo):
        d = e[tipo]
        return f"<b>{n(d['n'])}</b> <small>({MURO_CORTO[d['muro']]})</small>"

    filas_escalera = []
    for i, e in enumerate(esc_):
        filas_escalera.append(
            [
                f"<b>{NOMBRES_ESCALON[i].split(' · ')[0]}</b> · {NOMBRES_ESCALON[i].split(' · ')[1]}",
                celda_escalon(e, "gratuito"),
                celda_escalon(e, "paga"),
                n(e["gratuito"]["comensales_dia"]),
                f"{e['gratuito']['factura_usd']:.0f}",
                f"{e['peso_paga_en_gratuitos']:.1f}",
            ]
        )
    rep = A["replicas"]
    filas_escalera.append(
        [
            "<b>E5</b> · Réplicas: 2 × 8 procesos (16) o 4 × 8 (32)",
            f"<b>{n(rep[0]['n'])}</b> <small>(el mismo muro; el procesador daría {n(rep[0]['n_cpu_gratuito'])} y {n(rep[1]['n_cpu_gratuito'])})</small>",
            f"<b>{n(esc_[-1]['paga']['n'])}</b> <small>(conexiones)</small>",
            n(rep[0]["n"] * esc_[0]["gratuito"]["comensales_dia"] / esc_[0]["gratuito"]["n"]),
            f"{rep[0]['factura_usd']:.0f} / {rep[1]['factura_usd']:.0f}",
            "—",
        ]
    )
    tabla_escalera = tabla(
        [
            "Escalón",
            "Gratuitos típicos que caben",
            "De paga típicos que caben",
            "Comensales al día (gratuitos)",
            "USD al mes (gratuitos)",
            "Un de paga pesa (gratuitos)",
        ],
        filas_escalera,
        "chica junta",
    )
    h48 = A["hoy_4_8"]

    def k_fila(clave, k):
        return next(f for f in conv[clave]["filas"] if f["k"] == k)

    def nc(clave, k):
        f = k_fila(clave, k)
        return n(f["g_costo"]) + (" <small>(cupo)</small>" if f["g_costo"] >= f["g_cap"] else "")

    filas_conv = []
    for k in (1, 2, 3, 5, 10):
        filas_conv.append(
            [str(k)]
            + [nc(f"hoy/{p}", k) for p in (249, 349, 449)]
            + [nc(f"eventos/{p}", k) for p in (249, 349, 449)]
        )
    tabla_conv = tabla(
        [
            "Restaurantes de paga",
            "Hoy · 249",
            "Hoy · 349",
            "Hoy · 449",
            "Eventos · 249",
            "Eventos · 349",
            "Eventos · 449",
        ],
        filas_conv,
        "chica junta",
    )
    mg = AE["marginal"]

    def var_cubre(forma, precio):
        neto_usd = neto_rest[str(precio)] / TC
        return (neto_usd - mg[forma]["paga"]["usd_marginal"]) / mg[forma]["gratuito"][
            "usd_marginal"
        ]

    filas_var = [
        ["Gratuitos que cubre el costo variable de cada restaurante de paga, forma de hoy"]
        + [n(var_cubre("hoy", p)) for p in (249, 349, 449)],
        ["Ídem, con eventos"] + [n(var_cubre("eventos", p)) for p in (249, 349, 449)],
        ["Neto por restaurante tras la comisión del cobro, pesos al mes"]
        + [n(neto_rest[str(p)]) for p in (249, 349, 449)],
    ]
    tabla_var = tabla(["", "A 249", "A 349", "A 449"], filas_var, "chica junta")
    filas_tarifa = [
        [
            "RPM de Américas, comida y bebida (USD por mil vistas)",
            "2.62 (los tres)",
            "Calculadora de AdSense, 19 de septiembre (hoy el resultado es JavaScript y no se pudo leer). Un blog da 2.50 con 1,500 USD al año por 50,000 vistas al mes",
            marca("documento") + marca("externa"),
        ],
        [
            "Multiplicador de México frente a EE. UU.",
            "0.2&nbsp;·&nbsp;0.3&nbsp;·&nbsp;0.4",
            "WeForAds, abril de 2026: «Brazil/Mexico: 0.2–0.4x». Blog de proveedor, sin metodología; el 0.3 es el punto medio",
            marca("externa") + " débil · " + marca("supuesto"),
        ],
        [
            "Pérdida por no personalizar",
            "64&nbsp;%&nbsp;·&nbsp;52&nbsp;%&nbsp;·&nbsp;37.5&nbsp;%",
            "Google, 2019: sin cookies el ingreso cae 52 % en promedio y 64 % en la mediana (500 mayores publicadores de Ad Manager); 37.5 % es el mínimo de otro estudio que cita. Es sin cookies, no AdSense «no personalizado»: cota alta",
            marca("externa"),
        ],
        [
            "Impresiones por visita",
            "1&nbsp;·&nbsp;2&nbsp;·&nbsp;3",
            "Mías: espera de la orden (P04b del prototipo), más el fondo del menú (P03), más el detalle de platillo (P02). El prototipo no dibuja anuncios",
            marca("supuesto"),
        ],
        [
            "Visitas con la app por restaurante gratuito al mes",
            n(VISITAS_APP_MES_GRATIS),
            "Simulador de uso (113.9 comensales al día × 30 × 0.6 que abre la app); el 0.6 es supuesto",
            marca("medida") + marca("supuesto"),
        ],
        [
            "<b>Resultado: USD por mil visitas</b>",
            f"<b>{TAR['bajo']['usd_por_mil_visitas']:.2f}&nbsp;·&nbsp;{TAR['medio']['usd_por_mil_visitas']:.2f}&nbsp;·&nbsp;{TAR['alto']['usd_por_mil_visitas']:.2f}</b>",
            f"= {TAR['bajo']['mxn_por_mil_visitas']:.1f} · {TAR['medio']['mxn_por_mil_visitas']:.1f} · {TAR['alto']['mxn_por_mil_visitas']:.1f} pesos. Con anuncios personalizados serían {TAR['bajo']['usd_por_mil_visitas_personalizado']:.2f} · {TAR['medio']['usd_por_mil_visitas_personalizado']:.2f} · {TAR['alto']['usd_por_mil_visitas_personalizado']:.2f} USD",
            marca("supuesto"),
        ],
    ]
    tabla_tarifa = tabla(
        ["Eslabón", "Bajo · medio · alto", "De dónde sale", "Marca"], filas_tarifa, "chica"
    )
    filas_eq = []
    for nivel, etq in (("bajo", "Baja"), ("medio", "Media"), ("alto", "Alta")):
        h = eqs[f"hoy/npa/{nivel}"]
        ev = eqs[f"eventos/npa/{nivel}"]
        filas_eq.append(
            [
                f"{etq} ({TAR[nivel]['mxn_por_mil_visitas']:.1f} pesos por mil visitas)",
                f"<b>{h['primero']}</b>",
                f"<b>{ev['primero']}</b>",
                n(h["visitas_mes"]),
                f"{n(m10[f'hoy/{nivel}']['n']) if m10[f'hoy/{nivel}']['n'] else 'no cabe'}",
                n(m10[f"eventos/{nivel}"]["n"]),
            ]
        )
    tabla_eq = tabla(
        [
            "Tarifa (no personalizada)",
            "Gratuitos que pagan la infraestructura, forma de hoy",
            "Ídem, con eventos",
            "Visitas con la app al mes (hoy)",
            "Gratuitos para dejar 10,000 pesos al mes: hoy",
            "Ídem, con eventos",
        ],
        filas_eq,
        "chica junta",
    )
    diez = meta["10000_visitas_mes_usd"]
    filas_meta = [
        [
            "10,000 usuarios leídos como 10,000 visitas al mes",
            f"≈ {meta['restaurantes_para_10000_visitas']:.0f} gratuitos típicos",
            f"{diez['bajo'] + 1e-9:.1f} · {diez['medio'] + 1e-9:.1f} · {diez['alto'] + 1e-9:.1f}",
            f"{AE['curva_costo']['hoy'][0][1]:.1f}",
            "Sólo con tarifa alta",
        ],
        [
            "70 % de la capacidad de hoy",
            f"{meta['hoy']['G70']} gratuitos · {n(meta['hoy']['visitas_mes_70'])} visitas",
            " · ".join(f"{meta['hoy']['ads_70_usd'][k]:.0f}" for k in ("bajo", "medio", "alto")),
            f"{meta['hoy']['costo_70']:.1f}",
            "Las tres tarifas",
        ],
        [
            "70 % del muro de disco con eventos (E1)",
            f"{meta['eventos']['G70']} gratuitos · {n(meta['eventos']['visitas_mes_70'])} visitas",
            " · ".join(
                f"{meta['eventos']['ads_70_usd'][k]:.0f}" for k in ("bajo", "medio", "alto")
            ),
            f"{meta['eventos']['costo_70']:.1f}",
            "Las tres tarifas",
        ],
    ]
    tabla_meta = tabla(
        [
            "Tu meta",
            "En este modelo",
            "Anuncios USD al mes (bajo · medio · alto)",
            "Costo USD",
            "¿Cubre?",
        ],
        filas_meta,
        "chica junta",
    )
    secciones.append(f"""
<section>
  <h2><span>9</span> Escaleras de capacidad y de conversión, y qué pasa sólo con anuncios</h2>
  <p class="aviso">Sección nueva de la versión 2. Responde tres preguntas de Calvin del 13 de noviembre: <b>cuántos restaurantes caben en cada escalón</b> y qué cambia en cada uno; <b>cuántos gratuitos más</b> se pueden recibir por cada restaurante de paga (y por cada 100 comensales de 29 pesos); y si <b>con anuncios y sin nadie de paga</b> el negocio se sostiene. Todo sale del simulador de uso (misma semilla) y de <code>docs/research/2026-11-13-anuncios-y-capa-del-comensal.md</code>. <b>La v1 no tiene cuenta del comensal, anuncios ni cobro</b>: aquí se modela una visión, no se construye.</p>

  <h3>9.1 La escalera de capacidad</h3>
  {
        figura(
            g_escalera_capacidad(),
            "Cuántos restaurantes típicos caben en cada escalón, y qué muro manda",
            "simulador de uso (<code>2026-11-13-simulador-de-uso.py</code>), CPU a 70 % en la hora más cargada con 95 % de probabilidad; 4 procesos = 3.6 núcleos (×1.8) "
            + marca("documento")
            + ", 8 procesos = 6.6 (×3.3) "
            + marca("supuesto")
            + "; conexiones abiertas 10,000 por dominio "
            + marca("externa")
            + " con la pantalla encendida "
            + marca("supuesto"),
            num,
        )
    }
  {tabla_escalera}
  <ul>
    <li><b>El primer paso que más rinde es pasar a eventos (E1):</b> de {
        n(esc_[0]["gratuito"]["n"])
    } a {n(esc_[1]["gratuito"]["n"])} gratuitos y <b>más barato</b> ({
        esc_[1]["gratuito"]["factura_usd"]:.0f} contra {
        esc_[0]["gratuito"][
            "factura_usd"
        ]:.0f} USD), porque deja de gastarse procesador en preguntar. El muro pasa del procesador al <b>disco de 5 GB</b>.</li>
    <li><b>Pro (E2) cuesta ≈ 18 USD más</b> y lleva el cupo a {
        n(esc_[2]["gratuito"]["n"])
    }; sin Pro no se pasa de {
        n(esc_[1]["gratuito"]["n"])
    }. Cuatro y ocho procesos suman ≈ 1.6 USD por proceso, pero exigen bajar el conjunto de conexiones a PostgreSQL (hoy 40; Railway permite ≈ 100 {
        marca("supuesto")
    }).</li>
    <li><b>El muro de las 10,000 conexiones abiertas de Railway llega en ≈ {
        n(A["muro_conexiones_n_gratuitos"])
    } gratuitos o ≈ {
        n(A["muro_conexiones_n_paga"])
    } de paga.</b> Las réplicas no lo mueven (el límite es por dominio). Pasarlo pide cambiar la entrega (sondeo por fase para el exceso), otro dominio o otra plataforma: <b>nada de eso está medido ni diseñado</b>.</li>
    <li>Sin eventos, sólo con más procesos: 4 procesos = {n(h48[0]["n_cpu_gratuito"])} gratuitos y {
        n(h48[0]["n_cpu_paga"])
    } de paga ({h48[0]["factura_hobby"]:.0f} USD en Hobby); 8 procesos = {
        n(h48[1]["n_cpu_gratuito"])
    } y {n(h48[1]["n_cpu_paga"])} (el disco frena a {n(h48[1]["n_hobby"])} en Hobby; {
        h48[1]["factura_pro"]:.0f} USD en Pro).</li>
    <li><b>Lo que no está medido:</b> el procesador de Railway (±2×), los núcleos que da Hobby, la pantalla encendida y la memoria por conexión abierta. Los pasos E1 a E5 usan las cifras de eventos medidas en local, no en Railway; la decisión de adoptarlos ya está tomada (ADR-018, aceptado el 13 de noviembre; sustituye al ADR-004).</li>
  </ul>

  <h3>9.2 La escalera de conversión</h3>
  <p>Por cada restaurante de paga que entra, hay dos respuestas distintas: <b>cuánto costo cubre</b> (mucho) y <b>cuánta capacidad ocupa</b> (más que un gratuito). Neto = lo que queda del precio tras la comisión de cobro (Stripe México, 3.6 % + 3 pesos, más IVA {
        marca("externa")
    }), con el precio más IVA cobrado al restaurante {marca("supuesto")}.</p>
  {tabla_var}
  {
        figura(
            g_escalera_conversion(),
            "Gratuitos que sostiene el costo según cuántos restaurantes de paga hay",
            "script de cálculo <code>2026-11-13-anuncios-y-capa-del-comensal-modelo.py</code>: el costo mínimo del escalón que alcance (lo fijo, procesos y plan), contra el neto de cada de paga tras la comisión de Stripe México "
            + marca("externa")
            + " (3.6 % + 3 pesos, más IVA). Cuando el costo ya no frena, manda el cupo: un restaurante de paga ocupa el lugar de ≈ 2.4 gratuitos con eventos.",
            num,
        )
    }
  {tabla_conv}
  <ul>
    <li><b>Costo:</b> el primer restaurante de paga a 349 cubre lo fijo y <b>{
        n(k_fila("hoy/349", 1)["g_costo"])
    } gratuitos más</b> con la forma de hoy ({
        n(k_fila("eventos/349", 1)["g_costo"])
    } con eventos); cada uno siguiente cubre ≈ {n(var_cubre("hoy", 349))} ({
        n(var_cubre("eventos", 349))
    } con eventos) en costo variable. Con <b>3 a 5 de paga</b> el costo deja de ser el límite.</li>
    <li><b>Capacidad:</b> entra con signo contrario. Un restaurante de paga típico <b>ocupa el lugar de {
        AE["peso_paga"]["hoy/hobby2"]:.1f} gratuitos</b> con la forma de hoy y {
        AE["peso_paga"][
            "eventos/pro2"
        ]:.1f} con eventos en procesador (y 17.6 en el disco de Hobby, por los 12 meses de historial). <b>No agranda el cupo: paga el escalón siguiente.</b></li>
    <li>Cambiar el precio de 349 a 249 o 449 mueve el tamaño del primer salto ({
        n(k_fila("hoy/249", 1)["g_costo"])
    } a {n(k_fila("hoy/449", 1)["g_costo"])} con la forma de hoy; {
        n(k_fila("eventos/249", 1)["g_costo"])
    } a {n(k_fila("eventos/449", 1)["g_costo"])} con eventos), no el tope de capacidad.</li>
    <li><b>Por cada 100 comensales de paga a 29 pesos:</b> entran <b>{
        n(100 * com29["neto_mxn_con_iva_incluido"])
    } pesos al mes</b> ({n(100 * com29["neto_mxn_con_iva_incluido"] / TC)} USD; {
        n(100 * com29["neto_mxn_mas_iva"])
    } si los 29 son antes de IVA) tras IVA y comisión. Eso paga <b>toda la infraestructura hasta el tope de cada escalón</b> ({
        n(AE["g_max"]["hoy"])
    } gratuitos con la forma de hoy, {n(AE["g_max"]["eventos"])} con eventos). Equivalen a {
        100
        * com29["neto_mxn_con_iva_incluido"]
        / neto_rest["349"]:.1f} restaurantes de paga a 349; un restaurante de paga equivale a {
        capa[
            "comensales_29_por_restaurante_349"
        ]:.0f} comensales de paga. No ocupan cupo: ya iban a escanear.</li>
  </ul>

  <h3>9.3 ¿Se sostiene sin nadie de paga, sólo con anuncios?</h3>
  <p>Calvin lo dijo así: gratuito sin que entre un peso «no se va a sostener nunca». Se modelan <b>anuncios no personalizados</b> (no se venden datos). <b>Aquí la tarifa es lo más débil del informe:</b> ninguna fuente primaria da el ingreso por mil impresiones para México. Cada eslabón, con su marca:</p>
  {
        figura(
            g_solo_anuncios(),
            "Cuántos gratuitos pagan la infraestructura con sólo anuncios no personalizados",
            "ingreso = gratuitos × 2,050 visitas con la app × tarifa "
            + marca("supuesto")
            + "; costo mínimo del simulador de uso con la factura de Railway deducida de la captura de Calvin "
            + marca("calvin")
            + " y el dominio de 25 USD al año. Línea punteada: costo con eventos. Los puntos marcan el equilibrio con la forma de hoy.",
            num,
        )
    }
  {tabla_tarifa}
  <p><b>Dato</b> es la cifra de la calculadora de AdSense (de septiembre) y la pérdida medida por Google en 2019. <b>Supuesto</b> son las impresiones por visita, el 0.3 de México y el 0.6 de uso de la app. El multiplicador por país viene de un blog sin metodología; el resultado queda en el mismo orden de magnitud que la guía débil de CPM de compra (0.60–1.50 USD × 68 % × 80 %) del comparativo.</p>
  {tabla_eq}
  {tabla_meta}
  <ul>
    <li><b>La infraestructura sí se paga con anuncios desde pocos restaurantes:</b> {
        eqs["hoy/npa/alto"]["primero"]
    } a {eqs["hoy/npa/bajo"]["primero"]} gratuitos típicos ({
        n(eqs["hoy/npa/alto"]["visitas_mes"])
    } a {
        n(eqs["hoy/npa/bajo"]["visitas_mes"])
    } visitas con la app al mes), según la tarifa. <b>Con la tarifa media, 10,000 visitas al mes casi la cubren</b> ({
        diez[
            "medio"
        ]:.1f} USD contra ≈ 10); tu meta de 70 % de la capacidad la cubre con las tres.</li>
    <li><b>Tu ingreso no.</b> Para que los anuncios dejen 10,000 pesos al mes netos de infraestructura hacen falta {
        n(m10["eventos/alto"]["n"])
    } gratuitos con la tarifa alta, {n(m10["eventos/medio"]["n"])} con la media y {
        n(m10["eventos/bajo"]["n"])
    } con la baja (con la forma de hoy la baja ni cabe: el tope es {
        n(AE["g_max"]["hoy"])
    }). Con restaurantes de paga a 349 serían ≈ 30.</li>
    <li><b>Por restaurante gratuito los anuncios son poco dinero:</b> {
        AE["ads_por_restaurante_mes_mxn"]["bajo"]:.0f} · {
        AE["ads_por_restaurante_mes_mxn"]["medio"]:.0f} · {
        AE["ads_por_restaurante_mes_mxn"][
            "alto"
        ]:.0f} pesos al mes (bajo · medio · alto), contra 329 netos de uno de paga: <b>uno de paga vale lo que {
        neto_rest["349"]
        / AE["ads_por_restaurante_mes_mxn"][
            "medio"
        ]:.0f} gratuitos con anuncios</b> (caso medio).</li>
    <li><b>Lo que puede tumbarlo antes de la tarifa:</b> que AdSense no apruebe una carta detrás de un código de mesa casi sin texto; que la política de seguridad (<code>script-src 'self'</code>) deba abrirse a un tercero; un aviso de violación por clics accidentales junto a los botones de la orden; y que la regla 10 pida un ADR. Meta Audience Network no es opción: dejó de servir en web móvil el 11 de abril de 2020.</li>
    <li><b>Cómo medirlo de verdad, a costo cero:</b> correr la calculadora a mano, pedir la aprobación de AdSense con una página pública, y después un solo bloque no personalizado en la pantalla de espera de un restaurante del piloto (con aviso al dueño) durante 2 a 4 semanas; el pago no sale (empieza en Mex$1,200) pero el informe da impresiones y RPM.</li>
  </ul>

  <h3>9.4 La capa del comensal, en cifras</h3>
  {
        tabla(
            ["Nivel", "Qué guarda Carta", "Ingreso", "Marca"],
            [
                [
                    "Anónimo",
                    "Lo de hoy; nada del comensal",
                    f"Anuncios: {TAR['bajo']['mxn_por_mil_visitas']:.1f} a {TAR['alto']['mxn_por_mil_visitas']:.0f} pesos por mil visitas",
                    marca("supuesto"),
                ],
                [
                    "Registrado gratis",
                    "Cuenta, historial y preferencias: datos personales; las alergias, sólo en el teléfono",
                    "Anuncios no personalizados (iguales al anónimo)",
                    marca("supuesto"),
                ],
                [
                    "De paga, 29 al mes",
                    "Lo anterior; el cobro lo guarda el procesador",
                    f"{com29['neto_mxn_con_iva_incluido']:.1f} pesos netos si los 29 llevan IVA ({com29['neto_mxn_mas_iva']:.1f} si no); el cobro anual deja ≈ {com29['neto_anual_mxn_a'] / 12:.1f} al mes",
                    marca("externa") + marca("supuesto"),
                ],
            ],
            "chica",
        )
    }
  <ul>
    <li><b>Guardar y recomendar casi no cuesta:</b> el historial es ≈ {
        capa["gb_por_registrado_anio"]
        * 1000:.2f} MB por registrado al año (menos de 5 USD al mes con 100,000 {
        marca("supuesto")
    }). Recomendar con Opus 5.5 cuesta {
        capa[
            "opus_mxn_por_recomendacion"
        ]:.2f} pesos por recomendación, <b>17 veces lo que un anuncio deja por visita</b> ({
        capa["anuncios_mxn_por_visita"]["medio"]:.3f} pesos); con un modelo chico o con SQL cabe ({
        capa["haiku_mxn_por_recomendacion"]:.3f} pesos).</li>
    <li><b>Un comensal de paga vale ≈ 700 veces lo que dejan sus anuncios</b> (20.3 pesos contra 0.03 al mes con 2 visitas). Los anuncios de un restaurante gratuito equivalen a ≈ 1.4 comensales de paga.</li>
    <li><b>Tasas necesarias:</b> cubrir la infraestructura con el pago del comensal pide 18 pagadores con 104 gratuitos (0.017 % de las personas) o 40 con 1,000 (0.004 %); dejar 10,000 pesos pide ≈ {
        capa[
            "pagan_para_10000_mxn"
        ]:.0f}. La mediana de conversión de apps freemium con suscripción es 2.18 % (RevenueCat, 2025; no es de menús) {
        marca("externa")
    }; la tasa de registro (2 a 10 %) es {marca("supuesto")}.</li>
    <li><b>Lo que habría que cambiar para construirlo:</b> la regla dura 10 (ADR nuevo), «Qué NO construir» y <code>01_Alcance_v1.md</code>, la política de cabeceras de <code>02_Arquitectura_v1.md</code> §12, el aviso de privacidad y una Spec nueva. <b>Ley:</b> la LFPDPPP nueva (DOF del 20 de marzo de 2025, texto vigente al 14 de noviembre de 2025; autoridad: Secretaría Anticorrupción y Buen Gobierno) pide consentimiento expreso y por escrito para datos sensibles como la salud (art. 8; por eso las alergias siguen en el teléfono), consentimiento expreso para datos financieros (art. 7) y una cláusula de transferencia si se ceden datos a un tercero (art. 35); multas de 100 a 320,000 UMA (art. 59). La ley no menciona cookies ni publicidad; el valor de la UMA, los lineamientos de la autoridad y el reglamento son datos por conseguir. La suscripción se rige además por la Ley Federal de Protección al Consumidor, art. 76 Bis (cobros recurrentes con consentimiento expreso, aviso de renovación con cinco días y cancelación inmediata).</li>
  </ul>
</section>""")

    # ---- 10. Riesgos y datos por conseguir ----
    secciones.append(f"""
<section>
  <h2><span>10</span> Riesgos y datos por conseguir</h2>
  <h3>Riesgos</h3>
  {
        tabla(
            ["Riesgo", "Qué pasa", "Remedio"],
            [
                [
                    "El procesador de Railway es más lento que el local",
                    "Las capacidades bajan hasta la mitad (±2×)",
                    "Medir en staging con la T-4.4 (≈ 0.3–0.5 USD)",
                ],
                [
                    "El disco de 5 GB se llena",
                    "Con 12 meses de historial, a 17 de paga",
                    "Alerta al 70 %; Pro o menos historial",
                ],
                [
                    "Despliegue con muchas conexiones",
                    "9 s al 100 % con 5,000 teléfonos",
                    "Reconexión con espera al azar (diseño del ADR-018)",
                ],
                [
                    "Regla de Cloudflare de 300 por 10 s",
                    "Corta a locales con WiFi compartido y ≈ 90 teléfonos",
                    "Dejarla en 300 y medirla en la T-4.4 con eventos (decisión de Calvin, 13-nov)",
                ],
                [
                    "Límite duro de gasto en Railway",
                    "Al tocarlo apaga todo (mínimo 10 USD)",
                    "Usar sólo el aviso por correo",
                ],
                [
                    "Lecturas de PDF en paga sin número",
                    "El único costo sin techo",
                    "Vigilar el gasto mensual de la API",
                ],
                [
                    "Nadie paga",
                    "La base gratuita cuesta ≈ 10–30 USD al mes",
                    "La prueba de precio decide; anuncios como respaldo",
                ],
            ],
            "chica",
        )
    }
  <h3>Datos por conseguir</h3>
  {
        tabla(
            ["Dato", "Cómo", "Quién", "Costo"],
            [
                [
                    "Inicio del ciclo de cobro y costo por servicio de Railway",
                    "Panel → Usage, desglose por servicio",
                    "Calvin",
                    "0; 10 min",
                ],
                [
                    "<code>max_connections</code> de PostgreSQL",
                    "<code>SHOW max_connections</code> en staging",
                    "sesión maestra",
                    "0; 5 min",
                ],
                [
                    "Procesador real por petición en Railway",
                    "T-4.4 con k6 contra staging",
                    "sesión hija",
                    "≈ 0.3–0.5 USD",
                ],
                [
                    "Costo de la vista del personal (<code>GET /op/mesas</code>)",
                    "Medir cuando exista (T-3.6)",
                    "sesión de T-3.6",
                    "0",
                ],
                [
                    "Cuántos teléfonos tienen la pantalla encendida",
                    "Evento de visibilidad en la analítica del piloto",
                    "sesión hija + piloto",
                    "0",
                ],
                [
                    "Valor para el dueño (minutos de mesero, errores, rotación, impresión)",
                    "5–10 entrevistas sin vender",
                    "Calvin",
                    "su tiempo",
                ],
                [
                    "Cuántos restaurantes pasan de 10 mesas",
                    "Entrevistas y mesas activas del piloto",
                    "Calvin / sesión hija",
                    "0",
                ],
                [
                    "Tarifa real de anuncios en México e impresiones por visita",
                    "Correr la calculadora de AdSense, pedir la aprobación del sitio y abrir el Planificador de alcance de Google Ads (cuenta sin gasto)",
                    "Calvin",
                    "0",
                ],
                [
                    "Tokens reales por lectura de PDF",
                    "Prueba <code>live</code> con 2–3 cartas",
                    "sesión hija",
                    "≈ 0.5–1 USD",
                ],
                [
                    "Disco de la base con datos reales (12 KB por visita)",
                    "Medir con el seed",
                    "sesión hija",
                    "0",
                ],
                [
                    "Si un volumen de Hobby puede pasar de 5 GB",
                    "Preguntar a Railway",
                    "Calvin",
                    "0",
                ],
                [
                    "Precios de OpenTable, Parrot y Wansoft; qué incluye cada competidor",
                    "Cotización por teléfono; demo de cada uno",
                    "Calvin / sesión hija",
                    "0",
                ],
            ],
            "chica",
        )
    }
</section>""")

    # ---- 10. Decisiones ----
    secciones.append(f"""
<section>
  <h2><span>11</span> Decisiones</h2>
  {
        tabla(
            ["Decisión", "Recomendación", "Por qué", "Fuente"],
            [
                [
                    "Entrega por eventos",
                    "<b>Sí (ya decidida).</b> Primero la escucha de la base; luego la conexión de eventos; el sondeo por fase como respaldo",
                    "Tope de 1,200–1,600 a 8,000–10,000 comensales; cambios en milisegundos",
                    "perf/eventos §0, §3 " + marca("medida"),
                ],
                [
                    "4 procesos antes del primer restaurante real",
                    "Sí, si el piloto empieza antes que los eventos",
                    "+85 % de procesador por ≈ 3.2 USD al mes; hay que bajar el pool de conexiones",
                    "mapa §0 " + marca("supuesto"),
                ],
                [
                    "Plan de Railway",
                    "Hobby en el piloto; Pro al 70 % del disco (3.5 GB)",
                    "Con eventos el disco es el muro; Pro = 20 USD",
                    "simulador; Railway " + marca("externa"),
                ],
                [
                    "Historial",
                    "30 días gratuito / 12 meses paga (decidido); revisar si se llena el disco",
                    "Con 30 días en paga el muro sube de 17 a 212",
                    "simulador",
                ],
                [
                    "Topes",
                    "Mesas 10 / 40 como razón de pago; platillos 80 / 300 y personal 3 / 20 como guardas",
                    "Los platillos se traslapan; 80 cubre el 89 %",
                    "estadística " + marca("medida"),
                ],
                [
                    "Lecturas de PDF",
                    "3 por dueño (decidido); en paga, alerta de gasto mensual",
                    "Único costo directo",
                    "planes §3.5 " + marca("documento"),
                ],
                [
                    "Precio",
                    "349 pesos antes de IVA como precio de lista",
                    "Arriba de los menús QR (mediana 225), debajo del POS más barato (550)",
                    "comparativo §3 " + marca("externa"),
                ],
                [
                    "Oferta del piloto",
                    "Gratuito para todos; a quien diga sí a 349: primer mes gratis y 3 a 175, lista congelada 12 meses",
                    "Se mide con la hoja 1 sin descuento; el descuento premia decidir rápido",
                    "comparativo §4; estrategia §5",
                ],
                [
                    "Anuncios",
                    "Más adelante, como quieres, y no personalizados; antes, pedir la aprobación de AdSense con una página pública y medir la tarifa con un bloque en un restaurante del piloto; meta = 10,000 visitas al mes medidas con <code>scan</code> o 70 % del muro (≈ 210 gratuitos típicos)",
                    f"Pagarían lo fijo con ≈ {EQ_ADS_ALTO}–{EQ_ADS_BAJO} gratuitos, pero no tu ingreso; «usuarios» no se mide hoy, visitas sí. Abre la política de seguridad y la regla 10 pide ADR",
                    "Calvin; sección 9.3 e informe de anuncios " + marca("supuesto"),
                ],
                [
                    "Regla de Cloudflare",
                    "Dejarla en 300 por 10 s y medirla en la prueba de carga (T-4.4), ya con eventos",
                    "Decisión de Calvin del 13 de noviembre; no se sube ahora",
                    "capacidad, palanca 0; 04 §11",
                ],
                [
                    "Límite de gasto de Railway",
                    "Aviso por correo, sin límite duro",
                    "El límite duro apaga producción",
                    "Railway usage-limits " + marca("externa"),
                ],
                [
                    "Spec 002 «Planes»",
                    "Después de la prueba de precio",
                    "Los topes saldrán de los datos del piloto",
                    "estrategia §6",
                ],
            ],
            "chica",
        )
    }
</section>""")

    # ---- Anexos ----
    secciones.append("""
<section>
  <h2><span>A</span> Fuentes</h2>
  <h3>Del repositorio (rama <code>master</code>, 13 de noviembre de 2026)</h3>
  <ul class="fuentes">
    <li><code>docs/plan/perf/2026-11-13-modelo-de-capacidad.md</code> y sus datos (41 corridas).</li>
    <li><code>docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md</code> y sus datos (215 líneas).</li>
    <li><code>docs/research/2026-11-13-mapa-de-procesos-y-costos.md</code> y <code>2026-11-13-simulador-de-uso.py</code> (ronda 3: memoria de PostgreSQL deducida de la factura).</li>
    <li><code>docs/research/2026-11-13-planes-y-costo-por-restaurante.md</code> y su guion.</li>
    <li><code>docs/research/2026-11-13-estadistica-de-cartas-y-personal.md</code>, sus datos (148 cartas) y su guion.</li>
    <li><code>docs/research/2026-11-13-estrategia-de-precios.md</code>; <code>2026-11-13-comparativo-de-precios-y-anuncios.md</code> (en master desde el PR 33: precios de hoy, anuncios, oferta del piloto); <code>2026-09-19-modelo-de-negocio-y-pagos.md</code>; <code>2026-09-19-competencia-real-mexico.md</code>; <code>2026-09-20-olaclick-a-fondo.md</code>.</li>
    <li><code>docs/research/2026-11-13-anuncios-y-capa-del-comensal.md</code>, su guion y sus datos (versión 2: anuncios, capa del comensal y escaleras).</li>
    <li><code>docs/plan/04_Fases_y_Tareas.md</code> §11 (decisiones de Calvin del 13 de noviembre).</li>
  </ul>
  <h3>Externas (leídas el 13 de noviembre de 2026 salvo donde se dice)</h3>
  <ul class="fuentes">
    <li>Railway: docs.railway.com/reference/pricing/plans, /reference/usage-limits, /reference/volumes, /networking/public-networking/specs-and-limits.</li>
    <li>Cloudflare: developers.cloudflare.com/r2/pricing, /waf/rate-limiting-rules, /fundamentals/reference/connection-limits.</li>
    <li>Firebase: firebase.google.com/pricing. Claude: platform.claude.com/docs/en/about-claude/pricing.</li>
    <li>INEGI, ENIGH 2024: inegi.org.mx/contenidos/programas/enigh/nc/2024/doc/enigh2024_ns_presentacion_resultados_tab.pdf (y por entidad).</li>
    <li>Data México (DENUE, mayo de 2026): economia.gob.mx/datamexico/es/profile/industry/restaurants-and-other-eating-places.</li>
    <li>Precios (13-nov, en el comparativo): neolo.com/mexico/menu-qr, pricing.olaclick.app, meniuapp.com/es/plans, menutiger.com/es/pricing, waitry.net/es-mx/precios, joinposter.com/mx/pricing, fu.do/precios, softrestaurant.com/cloud, softrestaurant.com/soft-restaurant-precio, last.app/mx/precios, loyverse.com/pricing.</li>
    <li>Anuncios (versión 2, todas leídas el 13-nov; enlaces en <code>docs/research/2026-11-13-anuncios-y-capa-del-comensal-datos.csv</code>): AdSense, reparto 68 % (support.google.com/adsense/answer/180195), anuncios no personalizados (/9007336, /15450188, /7670312), umbral de pago (/1709871), elegibilidad (/9724), ubicación de anuncios (/1346295), menores de 13 (/10502938); Google, «Effect of disabling third-party cookies on publisher revenue», 27-ago-2019 (services.google.com/fh/files/misc/disabling_third-party_cookies_publisher_revenue.pdf); WeForAds, «Ad Revenue Benchmarks 2026» (weforads.com); guía de CPM por país (adscalculator.xyz, débil); Marketing Dive y AdExchanger sobre Meta Audience Network (feb 2020); Estudio Valor Total Media 2024 por prensa (marketing4ecommerce.mx, expansion.mx; el PDF de cim.mx dio 404); RevenueCat, State of Subscription Apps 2025.</li>
    <li>Cobro y ley (versión 2): Stripe México, stripe.com/mx/pricing (3.6 % + 3 pesos, sin IVA); LFPDPPP, texto vigente en diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf (DOF 20-mar-2025, última reforma 14-nov-2025); Ley Federal de Protección al Consumidor, art. 76 Bis, diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf; ECIJA sobre cookies (31-oct-2025, secundaria).</li>
    <li>No abrieron: PDF de Valor Total Media en cim.mx (404), EMARKETER y WordStream (403), Mercado Pago, Conekta y Clip (403/404), resultado de la calculadora de AdSense (JavaScript) y el Planificador de alcance de Google Ads (pide cuenta).</li>
    <li>Tipo de cambio: FIX de Banxico del 12-nov-2026, 18.6188 pesos por dólar.</li>
  </ul>
  <h3>Dato de Calvin</h3>
  <ul class="fuentes"><li>Captura de Railway «Usage by Project» del 13-nov-2026 ≈ 04:35 UTC; plan Hobby; Cloudflare gratuito; dominio 25 USD al año; decisiones del 13-nov (eventos, oferta del piloto, anuncios con meta, lecturas de PDF, teléfono bloqueado).</li></ul>
  <h2><span>B</span> Método</h2>
  <p>Las cifras de procesador vienen de mediciones locales (contenedor de 4 núcleos, API fijada a 2) y se trasladan a Railway con un margen de ±2×. La capacidad la da el simulador: 364 días, cada hora un sorteo de restaurantes por perfil (aproximación normal con corrección de asimetría), y se lee el percentil 95 de la hora más cargada. La economía de la sección 8 la calcula <code>generar.py</code> con los costos por restaurante del simulador, la factura real proyectada y los precios documentados. Todo se regenera con <code>extraer_simulador.py</code>, <code>generar.py</code> y <code>pdf.mjs</code>.</p>
  <h2><span>C</span> Glosario en llano</h2>
  <dl class="glosario">
    <dt>Proceso (worker)</dt><dd>Un «cajero» de la API: atiende peticiones de una en una y usa un núcleo. Hoy hay 2.</dd>
    <dt>Núcleo (vCPU)</dt><dd>Una unidad de procesador. Railway cobra 20 USD por núcleo-mes usado.</dd>
    <dt>Sondeo</dt><dd>El teléfono pregunta «¿cambió algo?» cada cierto tiempo, aunque nada cambie.</dd>
    <dt>Eventos</dt><dd>El servidor avisa al teléfono cuando algo cambia; entre avisos nadie pregunta.</dd>
    <dt>Latido</dt><dd>Un byte que el servidor manda cada 25 s para que nadie corte la línea por silencio.</dd>
    <dt>Percentil (p50, p95)</dt><dd>p95 = el valor que no se pasa 95 de cada 100 veces. p50 es el típico; p95, el peor caso habitual.</dd>
    <dt>Intervalo de confianza</dt><dd>Rango en el que está la cifra real con 90 % de seguridad, dado lo chico de la muestra.</dd>
    <dt>Volumen (disco)</dt><dd>Donde PostgreSQL guarda los datos. En Hobby, 5 GB; en Pro, hasta 1 TB.</dd>
    <dt>Hobby / Pro</dt><dd>Planes de Railway: 5 USD con 5 de uso incluidos, o 20 con 20 incluidos.</dd>
    <dt>Capa gratuita</dt><dd>Lo que un proveedor da sin cobrar: R2 10 GB, Firebase 50,000 usuarios al mes, Cloudflare Free.</dd>
    <dt>Conversión</dt><dd>De cada 100 restaurantes registrados, cuántos pagan.</dd>
    <dt>Punto de equilibrio</dt><dd>El número de restaurantes a partir del cual los ingresos cubren los costos.</dd>
    <dt>RPM</dt><dd>Lo que recibe el sitio por cada mil páginas vistas con anuncios. Distinto del CPM, que es lo que paga el anunciante por mil impresiones.</dd>
    <dt>Anuncio no personalizado</dt><dd>Se elige por la página que se ve, no por el historial de la persona; no usa datos personales. Rinde menos que uno personalizado.</dd>
    <dt>Escalera</dt><dd>La lista de cambios (eventos, plan Pro, más procesos…) que suben el cupo, con lo que cuesta cada uno y el muro que llega después.</dd>
    <dt>Muro</dt><dd>Un límite que no se quita pagando un poco más dentro del plan: el procesador de 2 procesos o el disco de 5 GB.</dd>
  </dl>
</section>""")
    return "\n".join(secciones)


def main() -> None:
    css = (AQUI / "estilos.css").read_text(encoding="utf-8")
    html = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Planos de Carta</title>
<style>{css}</style></head>
<body>{construir()}</body></html>
"""
    (AQUI / "informe.html").write_text(html, encoding="utf-8")
    print("escrito informe.html")
    for c in (0.01, 0.03):
        print(f"equilibrio con {c:.0%}: {equilibrio(c)} restaurantes")


if __name__ == "__main__":
    main()
