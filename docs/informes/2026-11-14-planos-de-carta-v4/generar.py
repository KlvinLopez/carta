"""Arma el informe ejecutivo «Planos de Carta», versión 4 (PDF) y su versión interactiva (HTML).

Biblioteca estándar. Lee las cifras con `datos.py` (JSON y CSV del repositorio) y las referencias de
`datos/referencias.json`. Escribe `informe.html` (para imprimir) e `interactivo.html` (un solo archivo).

    python3 docs/informes/2026-11-14-planos-de-carta-v4/generar.py
    node docs/informes/2026-11-14-planos-de-carta-v4/pdf.mjs      # PDF horizontal tamaño carta

Reglas: una cita que no está en `referencias.json` rompe la construcción; todo supuesto lleva su etiqueta;
cada página de la historia tiene como máximo 60 palabras de texto corrido (se comprueba al construir).
"""

from __future__ import annotations

import json
import math
import re
from html import escape
from pathlib import Path

from datos import cargar

AQUI = Path(__file__).resolve().parent
D = cargar()
REFS_DATA = json.loads((AQUI / "datos" / "referencias.json").read_text(encoding="utf-8"))
REFS = {r["clave"]: r for r in REFS_DATA["referencias"]}
GRUPOS = {g["clave"]: g for g in REFS_DATA["grupos"]}
MV = json.loads((AQUI / "datos" / "modelo_v5.json").read_text(encoding="utf-8"))

VINO, VINO_OSC, DORADO = "#6B2D3E", "#4F1728", "#B8860B"
TINTA, TINTA2, ARENA, ARENA2 = "#1A1A1A", "#5B4A3D", "#E6D9C6", "#F3EADB"
AZUL, VERDE, GRIS = "#2E7AAB", "#4F7A4A", "#B9AFA3"
MAX_PALABRAS = 60


def n(x: float, d: int = 0) -> str:
    return f"{x:,.{d}f}"


def esc(t) -> str:
    return escape(str(t), quote=True)


# ------------------------------------------------------------------ referencias y citas
USADAS: set[str] = set()


def _letras(activas=None) -> dict[str, str]:
    grupos: dict[tuple, list[str]] = {}
    for r in REFS_DATA["referencias"]:
        if activas is not None and r["clave"] not in activas:
            continue
        grupos.setdefault((r["autor"], r["año"]), []).append(r["clave"])
    out = {}
    for claves in grupos.values():
        if len(claves) > 1:
            for i, c in enumerate(claves):
                out[c] = "abcdefghijklmnopqrstuvwxyz"[i]
    return out


LETRAS = _letras()


def anio(c: str) -> str:
    r = REFS[c]
    y = str(r["año"]) if r["año"] else "s. f."
    return y + LETRAS.get(c, "") if r["año"] else y


def corta(c: str) -> str:
    """Cita corta: autor u organización y año."""
    if c in GRUPOS:
        for m in GRUPOS[c]["miembros"]:
            USADAS.add(m)
        return f"{GRUPOS[c]['texto']}, s. f."
    if c not in REFS:
        raise KeyError(f"referencia no registrada en datos/referencias.json: {c}")
    USADAS.add(c)
    r = REFS[c]
    if r.get("corta"):
        return f"{r['corta']} {r['año']}" + ("" if c in ("carta_precio",) else "")
    return f"{r['autor']}, {anio(c)}"


def cita(*claves: str) -> str:
    return f'<span class="cita">({"; ".join(corta(c) for c in claves)})</span>'


def etiqueta(tipo: str) -> str:
    """Todo lo que no es dato lleva una etiqueta visible."""
    clases = {
        "supuesto": "supuesto",
        "propuesta": "propuesta",
        "medida": "medida",
        "futuro": "futuro",
    }
    return f'<span class="et {clases[tipo]}">{tipo}</span>'


# ------------------------------------------------------------------ primitivas SVG
def tx(x, y, s, size=12, fill=TINTA, anchor="start", weight=400, serif=False, extra=""):
    fam = ' font-family="DM Serif Display, serif"' if serif else ""
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" '
        f'font-weight="{weight}"{fam} {extra}>{esc(s)}</text>'
    )


def rc(x, y, w, h, fill, rx=6, extra=""):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{max(w, 0):.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" {extra}/>'


def ln(x1, y1, x2, y2, stroke=GRIS, w=1, dash=""):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{w}"{d}/>'


def svg(w, h, body, cls="gr"):
    return f'<svg class="{cls}" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" font-family="DM Sans, sans-serif">{body}</svg>'


def dona(cx, cy, r, pct, color, fondo=ARENA, grosor=26):
    c = 2 * math.pi * r
    return (
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{fondo}" stroke-width="{grosor}"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{color}" stroke-width="{grosor}" '
        f'stroke-dasharray="{c * pct / 100:.1f} {c:.1f}" transform="rotate(-90 {cx} {cy})" stroke-linecap="butt"/>'
    )


# ------------------------------------------------------------------ gráficas de las páginas
M, CAP, DI, PL, PR = D["mercado"], D["capacidad"], D["disco"], D["planes"], D["precio"]


def g_donde_estamos() -> str:
    cards = [
        (
            "Fases 0 y 1",
            "Base y panel del dueño",
            "hecha",
            VERDE,
            "Alta de un restaurante con dos cartas, cada una en menos de 10 min",
        ),
        (
            "Fase 2",
            "El comensal ve el menú",
            "en producción",
            VERDE,
            "Menú visible en 2.31 s (p75, 4G lenta); v0.1.0 desde el 13 de noviembre",
        ),
        (
            "Fase 3",
            "Orden en grupo y mesero",
            "por construir",
            DORADO,
            "19 tareas en 7 olas; empieza por el canal de eventos",
        ),
        (
            "Después",
            "Planes y precio",
            "propuesta",
            VINO,
            "Hoy la v1 no cobra; el piloto con 10 restaurantes mide el precio",
        ),
    ]
    b = []
    w, gap = 226, 21.3
    b.append(ln(20, 30, 948, 30, ARENA, 4))
    for i, (fase, nom, est, col, nota) in enumerate(cards):
        x = i * (w + gap)
        b.append(f'<circle cx="{x + 24}" cy="30" r="12" fill="{col}"/>')
        b.append(rc(x, 60, w, 290, "#fff", 20, 'filter="url(#sombra)"'))
        b.append(tx(x + 18, 94, fase.upper(), 12, TINTA2, weight=700, extra='letter-spacing="1.2"'))
        b.append(tx(x + 18, 132, nom, 18.5, VINO, serif=True))
        b.append(rc(x + 18, 150, 22 + len(est) * 7.8, 26, col, 13))
        b.append(tx(x + 29, 168, est, 12.5, "#fff", weight=700))
        for j, linea in enumerate(_envuelve(nota, 26)):
            b.append(tx(x + 18, 214 + j * 24, linea, 15.5, TINTA2))
    for i, (num, lab) in enumerate(
        [
            ("< 10 min", "alta de un restaurante (meta < 15)"),
            ("2.31 s", "menú visible, p75, 4G lenta"),
            ("100", "Lighthouse móvil"),
        ]
    ):
        x = i * 330
        b.append(tx(x + 8, 438, num, 58, VINO, serif=True))
        b.append(tx(x + 8, 472, lab, 15, TINTA2))
    return svg(
        968,
        490,
        '<defs><filter id="sombra" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#6B2D3E" flood-opacity=".14"/></filter></defs>'
        + "".join(b),
    )


def _envuelve(s: str, ancho: int) -> list[str]:
    out, cur = [], ""
    for p in s.split():
        if len(cur) + len(p) + 1 > ancho and cur:
            out.append(cur)
            cur = p
        else:
            cur = f"{cur} {p}".strip()
    if cur:
        out.append(cur)
    return out


def g_hueco() -> str:
    b = []
    s_pct = round(100 * M["nucleo_con_sitio"] / M["nucleo"], 1)
    b.append(tx(150, 40, "El comensal", 22, VINO, "middle", serif=True))
    b.append(dona(150, 180, 100, M["usa_internet_pct"], VINO, grosor=36))
    b.append(tx(150, 192, f"{M['usa_internet_pct']} %", 44, VINO, "middle", serif=True))
    b.append(tx(150, 342, "usa internet (6 años y más)", 14, TINTA2, "middle"))
    b.append(tx(150, 364, f"{M['celular_pct']} % de ellos, con celular", 14, TINTA2, "middle"))
    b.append(tx(818, 40, "El negocio", 22, DORADO, "middle", serif=True))
    b.append(dona(818, 180, 100, s_pct, DORADO, grosor=36))
    b.append(tx(818, 192, f"{s_pct} %", 44, DORADO, "middle", serif=True))
    b.append(tx(818, 342, "del núcleo declara sitio web", 14, TINTA2, "middle"))
    b.append(
        tx(
            818,
            364,
            f"{n(M['nucleo_sin_sitio'])} de {n(M['nucleo'])} no declaran ninguno",
            14,
            TINTA2,
            "middle",
        )
    )
    # el hueco
    b.append(rc(330, 120, 308, 140, ARENA2, 24))
    b.append(tx(484, 170, "EL HUECO", 12, TINTA2, "middle", 700, extra='letter-spacing="2"'))
    b.append(tx(484, 215, f"{round(100 - s_pct, 1)} %", 46, VINO_OSC, "middle", serif=True))
    b.append(tx(484, 243, "sin sitio propio", 14, TINTA2, "middle"))
    b.append(
        f'<path d="M262 190 L326 190 M638 190 L702 190" stroke="{GRIS}" stroke-width="2" stroke-dasharray="5 5"/>'
    )
    b.append(rc(80, 384, 808, 52, "#fff", 16))
    b.append(
        tx(
            484,
            407,
            "Ojo: el DENUE no ve Facebook, Instagram ni WhatsApp; «sin sitio» no es «sin presencia en línea».",
            13,
            TINTA2,
            "middle",
        )
    )
    b.append(
        tx(
            484,
            425,
            "Los micronegocios de hasta 5 personas: 0.8 % de 657,347 declara sitio.",
            13,
            TINTA2,
            "middle",
        )
    )
    return svg(968, 440, "".join(b))


def g_embudo() -> str:
    etapas = [
        (
            "Mercado total (TAM): restaurantes y bares",
            M["total"],
            f"{n(M['total'])}",
            ARENA,
            TINTA2,
        ),
        (
            "Restaurantes a la carta y bares",
            M["nucleo"],
            f"{n(M['nucleo'])}",
            GRIS,
            TINTA,
        ),
        (
            "Clientes potenciales (SAM): sin cadenas",
            M["servible"],
            f"≈ {n(M['servible'])}",
            VINO,
            "#fff",
        ),
        (
            "Primera ola: 17 zonas metropolitanas",
            M["zonas17"],
            f"{n(M['zonas17'])}",
            VINO_OSC,
            "#fff",
        ),
    ]
    b = []
    lo, hi = math.log10(50), math.log10(M["total"])
    ancho = 620

    def w(v):
        return 40 + ancho * (math.log10(v) - lo) / (hi - lo)

    for i, (nom, v, txt, col, tcol) in enumerate(etapas):
        y = 24 + i * 66
        ww = w(v)
        b.append(rc(0, y, ww, 48, col, 14))
        b.append(tx(14, y + 30, txt, 22, tcol, serif=True))
        b.append(tx(ww + 14, y + 30, nom, 14, TINTA2))
    y = 24 + 4 * 66
    lo12, hi12 = M["ganable_12m"]
    b.append(rc(w(lo12), y, w(hi12) - w(lo12), 48, DORADO, 14))
    b.append(tx(w(lo12) + 14, y + 30, f"{lo12} a {n(hi12)}", 22, "#fff", serif=True))
    b.append(tx(w(hi12) + 14, y + 30, "Meta a 12 meses (SOM): escenario", 14, TINTA2))
    b.append(rc(w(hi12) + 14, y + 38, 70, 20, "none", 10, f'stroke="{DORADO}" stroke-width="1.5"'))
    b.append(tx(w(hi12) + 49, y + 52, "supuesto", 11, DORADO, "middle", 700))
    # alcanzables por lectura del sitio
    m = M["muestra"]
    b.append(rc(0, 372, 968, 62, "#fff", 18))
    b.append(
        tx(
            18,
            396,
            f"Cartas que un lector puede leer del sitio: {n(m['con_sitio_universo'])} sitios × {m['tasa']:.3f} ≈ {n(m['alcanzables'])}",
            15,
            VINO,
            weight=700,
        )
    )
    b.append(
        tx(
            18,
            418,
            f"Muestra: {m['completas']} cartas completas de {m['intentos']} intentos; rango {n(m['rango'][0])} a {n(m['rango'][1])}. Aplicar esa tasa a todo el universo es un supuesto.",
            12.5,
            TINTA2,
        )
    )
    b.append(
        tx(960, 24, "escala logarítmica", 11.5, TINTA2, "end", 700, extra='letter-spacing="1"')
    )
    return svg(968, 440, "".join(b))


def g_a_quien_primero() -> str:
    est = M["estratos"]
    b = []
    nombres = ["0–5", "6–10", "11–30", "31–50", "51–100", "101–250", "251+"]
    mx = max(e["n"] for e in est)
    b.append(
        tx(0, 22, "Restaurantes a la carta y bares, por personal ocupado", 15, VINO, weight=700)
    )
    b.append(tx(500, 22, "Porcentaje que declara sitio web", 15, VINO, weight=700))
    for i, e in enumerate(est):
        y = 44 + i * 44
        dest = i >= 2
        b.append(tx(60, y + 22, nombres[i], 13.5, TINTA2, "end", 700 if dest else 400))
        w = 360 * e["n"] / mx
        b.append(rc(72, y, max(w, 3), 30, VINO if dest else GRIS, 8))
        b.append(tx(72 + max(w, 3) + 8, y + 21, n(e["n"]), 13.5, TINTA))
        wp = 330 * e["pct_sitio"] / 70
        b.append(tx(556, y + 22, nombres[i], 13.5, TINTA2, "end", 700 if dest else 400))
        b.append(rc(568, y, wp, 30, DORADO if dest else GRIS, 8))
        b.append(tx(568 + wp + 8, y + 21, f"{e['pct_sitio']:.1f} %", 13.5, TINTA))
    b.append(rc(40, 360, 888, 64, "#fff", 18))
    b.append(
        tx(
            60,
            386,
            f"{n(M['nucleo_11mas'])} negocios de 11 personas o más (13 % del núcleo); {n(M['nucleo_11mas_con_sitio'])} ya declaran sitio.",
            15,
            VINO,
            weight=700,
        )
    )
    b.append(
        tx(
            60,
            408,
            f"Dentro de las 17 zonas metropolitanas hay {n(M['zonas17_con_sitio'])} con sitio: la lista corta para el piloto.",
            13,
            TINTA2,
        )
    )
    return svg(968, 440, "".join(b))


def g_matriz() -> str:
    mt = D["matriz"]
    trab = mt["trabajos"]
    b = []
    cw, ch = 56, 25
    x0, y0 = 282, 112
    # Carta (futuro): menú QR hoy, pedir/grupo/comanda en Fase 3
    carta = ["hoy", "fut", "fut", "fut", "no", "no", "no", "no", "no", "no", "no", "no"]
    for j, t in enumerate(trab):
        cx = x0 + j * cw + cw / 2
        col = VINO_OSC if j == 2 else TINTA2
        b.append(
            f'<text transform="translate({cx:.1f} {y0 - 8}) rotate(-52)" font-size="12.5" fill="{col}" font-weight="{700 if j == 2 else 400}">{esc(t)}</text>'
        )
    b.append(
        rc(
            x0 + 2 * cw - 2,
            y0 - 4,
            cw + 4,
            ch * (len(mt["filas"]) + 1) + 18,
            "none",
            14,
            f'stroke="{DORADO}" stroke-width="2.4"',
        )
    )

    def celda(i, j, estado, y):
        x = x0 + j * cw + 5
        if estado == "si":
            return rc(x, y + 3, cw - 10, ch - 8, VINO, 8)
        if estado == "no":
            return rc(x, y + 3, cw - 10, ch - 8, ARENA, 8)
        if estado == "np":
            return rc(
                x,
                y + 3,
                cw - 10,
                ch - 8,
                "none",
                8,
                f'stroke="{GRIS}" stroke-width="1.4" stroke-dasharray="3 3"',
            )
        if estado == "hoy":
            return rc(x, y + 3, cw - 10, ch - 8, DORADO, 8)
        return rc(x, y + 3, cw - 10, ch - 8, "none", 8, f'stroke="{DORADO}" stroke-width="2.2"')

    for i, f in enumerate(mt["filas"]):
        y = y0 + i * ch
        b.append(tx(x0 - 12, y + 18, f["nombre"] + " " + f["plan"], 12.5, TINTA, "end", 700))
        b.append(tx(0, y + 18, f"{n(f['precio'])}" if f["precio"] else "0", 13, TINTA2, extra=""))
        for j, e in enumerate(f["celdas"]):
            b.append(celda(i, j, e, y))
    y = y0 + len(mt["filas"]) * ch + 6
    b.append(ln(0, y - 2, 940, y - 2, ARENA, 2))
    b.append(tx(x0 - 12, y + 20, "Carta", 14, DORADO, "end", 700))
    b.append(tx(0, y + 20, "249–349", 13, DORADO, weight=700))
    for j, e in enumerate(carta):
        b.append(celda(0, j, e, y + 2))
    # leyenda
    ly = 438
    for k, (txt, est) in enumerate(
        [
            ("lo incluye", "si"),
            ("la página dice que no", "no"),
            ("no publicado", "np"),
            ("Carta en producción", "hoy"),
            ("Carta, Fase 3 (aún no construida)", "fut"),
        ]
    ):
        lx = [0, 150, 340, 480, 690][k]
        b.append(celda(0, 0, est, ly - 22).replace(f'x="{x0 + 5:.1f}"', f'x="{lx:.1f}"', 1))
        b.append(tx(lx + 56, ly - 1, txt, 12, TINTA2))
    b.append(tx(0, y0 - 10, "MXN al mes", 11, TINTA2, weight=700))
    return svg(968, 440, "".join(b))


def g_capacidad() -> str:
    es = MV["capacidad"]
    b = []
    mx, base = 2300, 290
    for i, e in enumerate(es):
        x = 60 + i * 230
        h = 250 * e["caben"] / mx
        col = [GRIS, VINO, VINO, VINO_OSC][i]
        b.append(rc(x, base - h, 150, h, col, 14))
        b.append(tx(x + 75, base - h - 12, n(e["caben"]), 30, VINO, "middle", serif=True))
        b.append(tx(x + 75, base + 22, e["nombre"], 13.5, TINTA, "middle", 700))
        b.append(tx(x + 75, base + 42, f"hasta {e['usd']} USD al mes", 12.5, TINTA2, "middle"))
        b.append(rc(x - 4, base + 54, 158, 26, "none", 13, f'stroke="{DORADO}" stroke-width="1.6"'))
        muro = (
            "disco de 5 GB"
            if e["cuello"] == "disco"
            else "procesador y conexiones"
            if i == 3
            else e["cuello"]
        )
        b.append(
            tx(x + 75, base + 72, muro if i == 3 else f"muro: {muro}", 11.5, DORADO, "middle", 700)
        )
        if i >= 2:
            b.append(rc(x + 5, base - h + 10, 140, 20, "#fff", 10, 'opacity=".92"'))
            b.append(tx(x + 75, base - h + 24, "sin medir en Railway", 11, DORADO, "middle", 700))
        if i > 0:
            b.append(
                f'<path d="M{x - 52} {base - 40} L{x - 14} {base - 40}" stroke="{DORADO}" stroke-width="2" marker-end="url(#fl)"/>'
            )
    b.append(
        '<defs><marker id="fl" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#B8860B"/></marker></defs>'
    )
    b.append(
        tx(
            0,
            22,
            "Restaurantes registrados que caben (configuración recomendada, curva de pago media)",
            14.5,
            VINO,
            weight=700,
        )
    )
    b.append(tx(960, 22, "supuesto: modelo de escenarios", 11.5, DORADO, "end", 700))
    b.append(rc(0, 404, 968, 30, "#fff", 12))
    b.append(
        tx(
            484,
            424,
            "Qué lo levanta: Pro (disco) → más procesos (procesador) → otra vía de conexiones, que hoy no existe en el plan.",
            13,
            TINTA2,
            "middle",
        )
    )
    return svg(968, 440, "".join(b))


def g_disco() -> str:
    filas = MV["disco"]
    b = []
    mx = 460
    b.append(
        tx(
            0,
            22,
            "Restaurantes que caben en Hobby (5 GB), según cuánta analítica e historial viven en línea",
            14.5,
            VINO,
            weight=700,
        )
    )
    for i, d in enumerate(filas):
        y = 46 + i * 56
        w = 400 * d["caben"] / mx
        col = [GRIS, VINO, VINO, VINO_OSC, DORADO][i]
        b.append(rc(230, y, max(w, 4), 38, col, 12))
        b.append(tx(220, y + 25, d["nombre"], 13.5, TINTA, "end", 700 if i == 1 else 400))
        b.append(tx(230 + max(w, 4) + 10, y + 28, str(d["caben"]), 24, VINO, serif=True))
    for j, linea in enumerate(
        [
            "con reserva de 20 % del disco; las palancas se suman en este orden",
            "el análisis recomienda 12 meses de historial de paga en línea",
            "archivar lo viejo cuesta ≈ 0.4 pesos al año; falta construir el archivador",
        ]
    ):
        b.append(tx(230, 336 + j * 17, linea, 12, TINTA2))
    b.append(
        '<defs><filter id="sombra2" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#6B2D3E" flood-opacity=".14"/></filter></defs>'
    )
    b.append(rc(700, 40, 268, 330, "#fff", 22, 'filter="url(#sombra2)"'))
    b.append(
        tx(718, 72, "EL HISTORIAL, EN FRÍO", 11.5, TINTA2, weight=700, extra='letter-spacing="1.3"')
    )
    b.append(tx(718, 128, "0.88 MB", 40, VINO, serif=True))
    b.append(tx(718, 150, "al mes, por restaurante mediano", 13, TINTA2))
    b.append(tx(718, 218, "≈ 0.4 pesos", 40, VINO, serif=True))
    b.append(tx(718, 240, "al año por restaurante, a 10 años", 13, TINTA2))
    b.append(rc(718, 270, 232, 74, ARENA2, 14))
    b.append(tx(730, 296, "No se venden ni se comparten", 13, VINO_OSC, weight=700))
    b.append(tx(730, 316, "datos de usuarios ni de restaurantes.", 12.5, VINO_OSC, weight=700))
    b.append(tx(730, 335, "Se ofrece guardar el historial.", 13, TINTA2))
    b.append(rc(0, 400, 968, 34, "#fff", 12))
    b.append(
        tx(
            484,
            421,
            f"Una visita pesa {DI['bytes_visita'][0]} a {DI['bytes_visita'][1]} KB en la base; 43 a 51 % es analítica.",
            13,
            TINTA2,
            "middle",
        )
    )
    return svg(968, 440, "".join(b))


def g_planes() -> str:
    b = []
    b.append(
        '<defs><filter id="sombra3" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#6B2D3E" flood-opacity=".14"/></filter></defs>'
    )
    planes = [
        (
            "Chef",
            "≤ 10 mesas · ≤ 3 cuentas",
            "≤ 80 platillos",
            "0",
            GRIS,
            "ocupa el disco de 1 gratuito",
        ),
        (
            "Master Chef",
            "11–40 mesas · hasta 20 cuentas",
            "",
            "249 a 349",
            VINO,
            "ocupa el disco de 2.1 gratuitos",
        ),
        (
            "Chef Ejecutivo",
            "> 40 mesas · hasta 50 cuentas",
            "",
            "499 (hasta 599)",
            VINO_OSC,
            "ocupa el disco de 10.1 gratuitos",
        ),
    ]
    for i, (nom, a, c, pr, col, lug) in enumerate(planes):
        x = i * 330
        b.append(rc(x, 0, 308, 128, "#fff", 20, 'filter="url(#sombra3)"'))
        b.append(rc(x, 0, 308, 38, col, 20))
        b.append(rc(x, 20, 308, 18, col, 0))
        b.append(tx(x + 18, 26, nom, 18, "#fff", serif=True))
        b.append(tx(x + 290, 26, pr + (" MXN" if i else ""), 14, "#fff", "end", 700))
        b.append(tx(x + 18, 66, a, 13.5, TINTA))
        b.append(tx(x + 18, 86, c or "propuesta de precio", 12.5, TINTA2))
        b.append(tx(x + 18, 112, lug, 12.5, TINTA2, weight=700))
        if i == 2:
            b.append(rc(x + 18, 94, 150, 0, "none", 0))
    b.append(rc(654 + 168, 70, 130, 20, "none", 10, f'stroke="{DORADO}" stroke-width="1.6"'))
    b.append(tx(654 + 168 + 65, 84, "propuesta de cambio", 10.5, DORADO, "middle", 700))
    # fronteras
    b.append(
        tx(
            0,
            176,
            "Qué porcentaje de los negocios se pasa de cada límite del plan Chef",
            14.5,
            VINO,
            weight=700,
        )
    )
    filas = [
        ("10 mesas", PL["empuja"]["mesas"], True),
        ("3 cuentas de personal", PL["empuja"]["cuentas"], True),
        ("80 platillos", PL["empuja"]["platillos"], False),
    ]
    ax = 190
    for i, (nom, v, _sup) in enumerate(filas):
        y = 196 + i * 52
        b.append(tx(ax - 12, y + 26, nom, 14, TINTA, "end", 700))
        b.append(rc(ax, y + 6, 640, 28, ARENA2, 14))
        if "bajo" in v:
            b.append(
                rc(ax + 6.4 * v["bajo"], y + 6, 6.4 * (v["alto"] - v["bajo"]), 28, "#D9A9B6", 14)
            )
            b.append(f'<circle cx="{ax + 6.4 * v["pct"]}" cy="{y + 20}" r="11" fill="{VINO}"/>')
            b.append(
                tx(
                    ax + 6.4 * v["alto"] + 12,
                    y + 26,
                    f"{v['pct']} %  ({v['bajo']}–{v['alto']} %)",
                    14,
                    TINTA,
                )
            )
            b.append(tx(968, y + 26, "supuesto", 11.5, DORADO, "end", 700))
        else:
            b.append(f'<circle cx="{ax + 6.4 * v["pct"]}" cy="{y + 20}" r="11" fill="{VINO}"/>')
            b.append(tx(ax + 6.4 * v["pct"] + 18, y + 26, f"{v['pct']} %", 14, TINTA))
            b.append(tx(968, y + 26, "medida", 11.5, VERDE, "end", 700))
    for p in (0, 25, 50, 75, 100):
        b.append(tx(ax + 6.4 * p, 358, f"{p} %", 11, TINTA2, "middle"))
    b.append(rc(0, 380, 968, 54, "#fff", 16))
    cov = {c["tope"]: c["total_empuja_pct"] for c in PL["cobertura_platillos"]}
    b.append(
        tx(
            18,
            404,
            f"Con 80 platillos de tope empuja a {cov[80]} %; con 60, a {cov[60]} %; con 40, a {cov[40]} %.",
            14,
            VINO,
            weight=700,
        )
    )
    b.append(
        tx(
            18,
            424,
            f"≈ {n(PL['empujados'])} de los {n(PL['negocios_722511'])} negocios de la clase 722511 (entre ≈ 11,600 y ≈ 51,500).",
            12.5,
            TINTA2,
        )
    )
    return svg(968, 440, "".join(b))


# precio: la regla máx(3 × piso; K × S) con el piso que usa `…-planes-y-corredor.py`
def piso(precio: float, soporte: float = 60) -> float:
    f = PR["formula"]
    com = (f["stripe_pct"] * precio * (1 + f["iva"]) + f["stripe_fijo"]) * (1 + f["iva"])
    return f["costo_var_mediano"] + f["fijo"] + com + soporte


def precio_regla(S: float, K: float, soporte: float = 60) -> float:
    p = K * S
    for _ in range(40):
        p = max(3 * piso(p, soporte), K * S)
    return p


def redondea(p: float, soporte: float = 60) -> int:
    base = int(p // 50 * 50 - 1) if p >= 100 else round(p)
    if p >= 100:
        while base < 3 * piso(base, soporte):
            base += 50
    return base


def g_precio() -> str:
    b = []
    x0, x1 = 20, 600
    vmax = 800

    def X(v):
        return x0 + (x1 - x0) * v / vmax

    y = 130
    b.append(
        tx(
            0,
            22,
            "Precio de Master Chef al mes, sin IVA  (● = sustituto publicado)",
            14.5,
            VINO,
            weight=700,
        )
    )
    b.append(rc(X(0), y, X(vmax) - X(0), 14, ARENA2, 7))
    b.append(rc(X(249), y - 18, X(349) - X(249), 50, DORADO, 14, 'opacity=".9"'))
    b.append(
        rc(
            X(349),
            y - 10,
            X(556) - X(349),
            34,
            "none",
            12,
            f'stroke="{DORADO}" stroke-width="2" stroke-dasharray="5 4"',
        )
    )
    b.append(tx(X(299), y - 52, "corredor 249 a 349", 13.5, DORADO, "middle", 700))
    b.append(tx(X(452), y - 30, "hasta ≈ 556 con soporte de 150", 12, DORADO, "middle"))
    b.append(ln(X(240), y + 40, X(240), y + 66, VINO_OSC, 2))
    b.append(tx(X(240), y + 84, "piso × 3 = 240", 12, VINO_OSC, "middle", 700))
    sus = PR["sustitutos"]
    pos = {
        "Meniu": (y + 112, "end"),
        "Fudo Avanzado": (y + 84, "middle"),
        "Fudo + mesas": (y + 112, "middle"),
    }
    for nom, v in sus.items():
        b.append(f'<circle cx="{X(v):.1f}" cy="{y + 7}" r="9" fill="{AZUL}"/>')
        yy, an = pos[nom]
        b.append(ln(X(v), y + 16, X(v), yy - 14, AZUL, 1.2, "3 3"))
        b.append(
            tx(
                X(v) + (14 if nom == "Meniu" else 0),
                yy,
                f"{nom} {v}",
                12,
                AZUL,
                "end" if nom == "Fudo + mesas" else ("start" if nom == "Meniu" else "middle"),
                700,
            )
        )
    ev = PR["evaluacion"]
    b.append(tx(0, 282, "Candidatos, como parte de Fudo Avanzado (652)", 14.5, VINO, weight=700))
    cands = [
        ("249", "249", ""),
        ("299", "299", ""),
        ("349", "349", ""),
        ("399", "399", "Chef Ejecutivo"),
        ("2,000", None, ""),
    ]
    for i, (lab, key, suf) in enumerate(cands):
        x = 8 + i * 116
        pct = ev[key]["pct_de_Fudo Avanzado"] if key else 307
        dentro = pct <= 61
        b.append(rc(x, 298, 104, 118, "#fff" if dentro else "#F5E6E6", 16))
        b.append(
            tx(
                x + 52,
                400,
                f"{round(100 * (int(lab.replace(',', '')) / 225))} % de Meniu",
                11.5,
                "#9B2C2C" if int(lab.replace(",", "")) > 349 else TINTA2,
                "middle",
                700,
            )
        )
        b.append(tx(x + 52, 334, lab, 26, VINO if dentro else "#9B2C2C", "middle", serif=True))
        b.append(tx(x + 52, 360, f"{pct} %", 16, TINTA, "middle", 700))
        b.append(tx(x + 52, 380, (suf or "de Fudo") if dentro else "fuera", 12, TINTA2, "middle"))
    gx = 640
    b.append(tx(gx, 22, "Precio por K y sustituto", 14.5, VINO, weight=700))
    for j, k in enumerate([0.3, 0.4, 0.5, 0.6, 0.7]):
        b.append(tx(gx + 118 + j * 44, 54, f"{k}", 12, TINTA2, "middle", 700))
    b.append(tx(gx, 54, "K =", 12, TINTA2, weight=700))
    for i, nom in enumerate(["Meniu", "Fudo Avanzado", "Fudo + mesas"]):
        yy = 66 + i * 38
        b.append(tx(gx, yy + 22, nom, 12.5, TINTA, weight=700))
        for j, k in enumerate([0.3, 0.4, 0.5, 0.6, 0.7]):
            v = redondea(precio_regla(sus[nom], k))
            cen = k == 0.5
            b.append(rc(gx + 118 + j * 44 - 20, yy + 2, 40, 28, VINO if cen else ARENA2, 8))
            b.append(
                tx(
                    gx + 118 + j * 44,
                    yy + 22,
                    str(v),
                    12.5,
                    "#fff" if cen else TINTA,
                    "middle",
                    700,
                )
            )
    b.append(
        tx(
            gx,
            196,
            "Con Meniu manda el piso, no K. Chef Ejecutivo: 499 con la regla del análisis.",
            12,
            TINTA2,
        )
    )
    b.append(rc(gx, 214, 328, 184, "#fff", 18))
    b.append(tx(gx + 16, 240, "K lo decide Calvin:", 13.5, VINO, weight=700))
    b.append(tx(gx + 16, 260, "qué tan agresivo entrar.", 13.5, TINTA))
    b.append(
        tx(gx + 16, 292, "Soporte al mes (K = 0.5, contra Fudo Avanzado)", 12, TINTA2, weight=700)
    )
    s = PR["soporte"]["Fudo Avanzado"]
    for j, sp in enumerate(["30", "60", "150"]):
        b.append(rc(gx + 16 + j * 100, 304, 90, 56, ARENA2, 12))
        b.append(tx(gx + 61 + j * 100, 324, f"{sp} pesos", 11.5, TINTA2, "middle"))
        b.append(tx(gx + 61 + j * 100, 348, str(s[sp]["x49"]), 22, VINO, "middle", serif=True))
    b.append(tx(gx + 16, 380, "con 150, el piso × 3 manda: ≈ 556, redondeado a 599", 11.5, TINTA2))
    return svg(968, 440, "".join(b))


def g_equilibrio() -> str:
    sm = MV["sostiene"]
    b = []
    x0, y0, w, h = 70, 44, 520, 290
    vmin, vmax = -3000, 400000

    def sl(v):
        return math.asinh(v / 1500)

    def X(N):
        return x0 + w * N / 1000

    def Y(v):
        v = min(max(v, vmin), vmax)
        return y0 + h * (sl(vmax) - sl(v)) / (sl(vmax) - sl(vmin))

    b.append(
        tx(
            0,
            24,
            "Resultado al mes (pesos) según cuántos restaurantes se registran",
            14.5,
            VINO,
            weight=700,
        )
    )
    for v in (-3000, 0, 3000, 10000, 30000, 100000, 300000):
        b.append(ln(x0, Y(v), x0 + w, Y(v), TINTA2 if v == 0 else ARENA, 1.6 if v == 0 else 1))
        b.append(tx(x0 - 8, Y(v) + 4, ("−" if v < 0 else "") + n(abs(v)), 11, TINTA2, "end"))
    for N in (0, 250, 500, 750, 1000):
        b.append(tx(X(N), y0 + h + 22, str(N), 11.5, TINTA2, "middle"))
    b.append(
        tx(
            x0 + w / 2,
            y0 + h + 44,
            "restaurantes registrados · escala logarítmica en ambos sentidos",
            12,
            TINTA2,
            "middle",
        )
    )
    Ns = sm["N"]

    def lin(serie, col, wd):
        return f'<polyline points="{" ".join(f"{X(N):.1f},{Y(v):.1f}" for N, v in zip(Ns, serie))}" fill="none" stroke="{col}" stroke-width="{wd}"/>'

    def cruce(serie):
        for i in range(1, len(Ns)):
            if serie[i - 1] < 0 <= serie[i]:
                return Ns[i - 1] + (Ns[i] - Ns[i - 1]) * (-serie[i - 1]) / (serie[i] - serie[i - 1])
        return None

    banda = (
        " ".join(f"{X(N):.1f},{Y(v):.1f}" for N, v in zip(Ns, sm["pesimista"]))
        + " "
        + " ".join(f"{X(N):.1f},{Y(v):.1f}" for N, v in reversed(list(zip(Ns, sm["optimista"]))))
    )
    b.append(f'<polygon points="{banda}" fill="{VINO}" opacity=".16"/>')
    for serie, col, wd, dy, nom in [
        (sm["peor"], "#9B2C2C", 3, 42, "peor"),
        (sm["esperado"], VINO, 4, 22, "esperado"),
        (sm["mejor"], VERDE, 3, -12, "mejor"),
    ]:
        b.append(lin(serie, col, wd))
        c = cruce(serie)
        if c:
            b.append(
                f'<circle cx="{X(c):.1f}" cy="{Y(0):.1f}" r="7" fill="{col}" stroke="#fff" stroke-width="2"/>'
            )
            b.append(tx(X(c) + 10, Y(0) + dy, f"equilibrio: {c:.0f}", 11.5, col, weight=700))
    for i, (col, nom) in enumerate(
        [
            ("#9B2C2C", "Peor (firme): todos gratuitos, sin anuncios"),
            (VINO, "Esperado: curva media, con su rango"),
            (VERDE, "Mejor: todos pagan"),
        ]
    ):
        b.append(f'<circle cx="{x0 + 14}" cy="{y0 + 14 + i * 20}" r="6" fill="{col}"/>')
        b.append(tx(x0 + 28, y0 + 18 + i * 20, nom, 12, TINTA, weight=700))
    gx = 660
    b.append(tx(gx, 24, "Lo que falta medir", 14.5, VINO, weight=700))
    falta = [
        ("1", "Cuántos se pasan del plan Chef", "16 % a 71 %"),
        ("2", "Cuántos de ellos pagan", "15 a 60 % según la curva"),
        ("3", "Cuánto pagarían", "prueba del piloto"),
        ("4", "Cuánto cuesta el soporte", "$60 o $150 al mes"),
    ]
    for i, (nu, t1, t2) in enumerate(falta):
        yy = 40 + i * 58
        b.append(rc(gx, yy, 308, 50, "#fff", 14))
        b.append(f'<circle cx="{gx + 26}" cy="{yy + 25}" r="14" fill="{DORADO}"/>')
        b.append(tx(gx + 26, yy + 30, nu, 14, "#fff", "middle", 700))
        b.append(tx(gx + 52, yy + 22, t1, 13.5, TINTA, weight=700))
        b.append(tx(gx + 52, yy + 39, t2, 12.5, TINTA2))
    b.append(rc(gx, 280, 308, 150, ARENA2, 16))
    k = MV["kpis"]
    qs = [
        ("«¿Venden mis datos?»", "No. Se ofrece guardar el historial."),
        ("«¿Y si nadie paga?»", "Sin clientes de paga ni anuncios, pierde dinero."),
        (
            "«¿Cuántos caben?»",
            f"De {MV['capacidad'][0]['caben']} a {n(MV['capacidad'][-1]['caben'])}, según el servidor.",
        ),
    ]
    for i, (q, a_) in enumerate(qs):
        b.append(tx(gx + 14, 306 + i * 42, q, 12.5, VINO, weight=700))
        b.append(tx(gx + 14, 323 + i * 42, a_, 12, TINTA2))
    return svg(968, 440, "".join(b))


# ------------------------------------------------------------------ páginas de la historia
PAGINAS: list[dict] = []


def pagina(kick, titulo, viz, como, insight, claves, extra_notas=""):
    PAGINAS.append(
        {
            "kick": kick,
            "titulo": titulo,
            "viz": viz,
            "como": como,
            "insight": insight,
            "claves": claves,
            "notas": extra_notas,
        }
    )


def eq_peor() -> int:
    sm = MV["sostiene"]
    for i in range(1, len(sm["N"])):
        if sm["peor"][i - 1] < 0 <= sm["peor"][i]:
            return round(
                sm["N"][i - 1]
                + (sm["N"][i] - sm["N"][i - 1])
                * (-sm["peor"][i - 1])
                / (sm["peor"][i] - sm["peor"][i - 1])
            )
    return 0


def construir_paginas():
    pagina(
        "1 · Dónde estamos",
        "El comensal ya ve el menú; falta que la mesa pida junta.",
        g_donde_estamos(),
        "Cada tarjeta es una fase; el color dice si está hecha, en producción o por construir.",
        "La v1 no cobra: precio y planes son propuesta que el piloto debe confirmar.",
        ["carta_plan", "carta_ac011"],
    )
    pagina(
        "2 · El hueco",
        "El comensal está conectado; 94 de cada 100 restaurantes a la carta y bares no declara sitio web.",
        g_hueco(),
        "Cada anillo mide qué parte del grupo tiene lo que se pide; el centro es la brecha.",
        "Carta no le quita un cliente a nadie: sería el primer sitio propio de casi todo el núcleo.",
        ["inegi_endutih", "inegi_denue"],
    )
    pagina(
        "3 · El mercado",
        "Hay ≈ 100,000 clientes potenciales; ganar 100 a 1,000 en un año es un escenario.",
        g_embudo(),
        "Cada barra es una capa del mercado; la escala es logarítmica, así que cada tramo vale 10 veces lo anterior.",
        "El mercado sobra; lo que falta medir es cuántos dueños prueban y cuántos pagan.",
        ["inegi_denue", "carta_mercado", "carta_muestra"],
    )
    pagina(
        "4 · A quién primero",
        "Los negocios de 11 personas o más ya invirtieron en estar en línea.",
        g_a_quien_primero(),
        "Izquierda: cuántos negocios hay por tamaño. Derecha: qué parte declara sitio web.",
        "Son 13,834 negocios; 27 % ya tiene sitio. Son los primeros candidatos a pagar.",
        ["inegi_denue", "carta_mercado"],
    )
    pagina(
        "5 · Qué existe y a qué precio",
        "Ninguna página de precios leída publica el pedido en grupo; es el hueco que Carta quiere ocupar con la Fase 3.",
        g_matriz(),
        "Cada fila es un plan real; cada columna, un trabajo. Más color, más cubierto.",
        "Los planes leídos cuestan de 0 a 1,243 pesos al mes y ninguno publica pedir en grupo.",
        ["paginas_proveedores_14nov", "carta_precio"],
        "Leídas el 14 de noviembre. Hay un indicio de OlaClick sin comprobar (página borrada de «mesa virtual») y falta la prueba con dos teléfonos.",
    )
    pagina(
        "6 · Cuántos caben",
        f"Con eventos caben de {MV['capacidad'][0]['caben']} a {n(MV['capacidad'][-1]['caben'])} restaurantes, según el servidor.",
        g_capacidad(),
        "Cada barra es un escalón de servidor; el recuadro dorado es el muro que lo frena.",
        "El primer muro es el disco; pasar a Pro lo levanta. El último, procesador y conexiones, no se sube con réplicas.",
        ["carta_anuncios", "carta_capacidad", "railway_limites"],
        "En producción hoy aún corre el sondeo hasta que la Fase 3 construya los eventos; ver el archivo histórico.",
    )
    pagina(
        "7 · Qué llena el disco",
        f"Acortar la analítica a 30 días lleva de {MV['disco'][0]['caben']} a {MV['disco'][1]['caben']} los restaurantes que caben en Hobby.",
        g_disco(),
        "Cada barra suma una palanca a la anterior; más larga, más restaurantes caben en 5 GB.",
        "La palanca grande no es comprimir, es cuánta analítica vive en línea; guardar lo viejo en frío cuesta casi nada.",
        ["carta_disco", "cloudflare_r2_precios"],
    )
    pagina(
        "8 · Tres planes",
        "Los límites de mesas y cuentas sacan de Chef a ≈ 39 %; el de platillos, a 10.8 %.",
        g_planes(),
        "Arriba, los planes. Abajo, qué fracción de los negocios se pasa de cada límite; la barra rosa es el intervalo.",
        "Los límites sacan de Chef a ≈ 39 % de los negocios; ese modelo es supuesto.",
        ["carta_tres_planes", "carta_estadistica", "calvin_posturas"],
        "Propuesta de cambio frente a lo decidido: tercer plan sobre 40 mesas y lecturas de PDF con tope numérico.",
    )
    pagina(
        "9 · El precio",
        "A 249–349, Carta costaría más que Meniu, que ya ofrece caja, cocina y pedir desde la mesa por 225.",
        g_precio(),
        "La banda dorada es el corredor propuesto. Los puntos azules son lo que cobra cada sustituto, sin tope publicado.",
        "Carta sólo gana a ese precio si la mesa que pide junta y la sencillez valen la diferencia: lo mide el piloto.",
        ["carta_precio", "paginas_proveedores_14nov"],
    )
    pagina(
        "10 · Cómo se sostiene",
        f"Sin anuncios, el negocio se sostiene con ≈ {round(MV['kpis']['equilibrio_sin_anuncios'])} clientes de paga por cada 1,000 registrados.",
        g_equilibrio(),
        "Cada línea es un caso; donde cruza el cero, el negocio se sostiene. La franja es el rango de las tres curvas de pago.",
        "Todo depende de dos datos que hoy no existen: cuántos se pasan del plan Chef y cuántos de ellos pagan.",
        ["carta_tres_planes", "carta_planes"],
    )


def palabras(html_frag: str) -> int:
    t = re.sub(r"<[^>]+>", " ", html_frag)
    return len(t.split())


def html_pagina(i: int, p: dict) -> str:
    cuerpo = f'<p class="insight"><b>Insight clave.</b> {esc(p["insight"])}</p>'
    pal = palabras(cuerpo) - 2 + palabras(p["notas"])  # sin las dos etiquetas; la nota cuenta
    assert pal <= MAX_PALABRAS, f"página {i}: {pal} palabras de texto corrido (tope {MAX_PALABRAS})"
    p["palabras"] = pal
    fuentes = "; ".join(corta(c) for c in p["claves"])
    nota = f'<p class="nota">{esc(p["notas"])}</p>' if p["notas"] else ""
    return (
        f'<section class="pg"><header><div class="kick">{esc(p["kick"])}</div><h2>{esc(p["titulo"])}</h2></header>'
        f'<div class="viz">{p["viz"]}</div><div class="pie">{cuerpo}{nota}</div>'
        f'<footer><span class="cita">Fuentes: {esc(fuentes)}</span><span class="pgn">{i + 2}</span></footer></section>'
    )


# ------------------------------------------------------------------ página 1: todo en una vista
def mini_mercado():
    b = []
    lo, hi = math.log10(50), math.log10(M["total"])
    filas = [
        ("Total", M["total"], ARENA, "773,860"),
        ("A la carta", M["nucleo"], GRIS, "104,882"),
        ("SAM", M["servible"], VINO, "≈ 100,000"),
        ("17 zonas", M["zonas17"], VINO_OSC, "40,872"),
    ]
    for i, (nom, v, col, txt) in enumerate(filas):
        w = 30 + 170 * (math.log10(v) - lo) / (hi - lo)
        y = 6 + i * 36
        b.append(tx(0, y + 20, nom, 13, TINTA2, weight=700))
        b.append(rc(70, y, w, 28, col, 9))
        b.append(tx(70 + w + 7, y + 20, txt, 13.5, TINTA, weight=700))
    return svg(330, 150, "".join(b), "mini")


def _barras_v(vals, cols, etqs, fmt, mx):
    b = []
    for i, v in enumerate(vals):
        h = 92 * v / mx
        x = 10 + i * 80
        b.append(rc(x, 108 - h, 62, max(h, 4), cols[i], 10))
        b.append(tx(x + 31, 108 - h - 6, fmt(v), 15, VINO, "middle", 700))
        for j, linea in enumerate(etqs[i].split("|")):
            b.append(tx(x + 31, 126 + j * 12.5, linea, 10.5, TINTA2, "middle"))
    return svg(330, 162, "".join(b), "mini")


def mini_capacidad():
    es = MV["capacidad"]
    return _barras_v(
        [e["caben"] for e in es],
        [GRIS, VINO, VINO, VINO_OSC],
        [
            "muro: disco|",
            "procesador|",
            "procesador|sin medir|en Railway",
            "procesador|sin medir|en Railway",
        ],
        n,
        2300,
    )


def mini_disco():
    f = MV["disco"]
    return _barras_v(
        [f[0]["caben"], f[1]["caben"], f[2]["caben"], f[3]["caben"]],
        [GRIS, VINO, VINO, VINO_OSC],
        ["plan de datos|de hoy", "analítica|30 días", "historial|3 meses", "analítica|7 días"],
        str,
        460,
    )


def mini_planes():
    b = []
    for i, (nom, a, pr, col) in enumerate(
        [
            ("Chef", "≤ 10 mesas", "0", GRIS),
            ("Master Chef", "11–40 mesas", "249–349", VINO),
            ("Ejecutivo", "> 40 mesas", "499–599", VINO_OSC),
        ]
    ):
        x = i * 112
        b.append(rc(x, 4, 104, 138, "#fff", 16, f'stroke="{ARENA}" stroke-width="1.6"'))
        b.append(rc(x, 4, 104, 34, col, 16))
        b.append(rc(x, 22, 104, 16, col, 0))
        b.append(tx(x + 52, 27, nom, 14, "#fff", "middle", 700))
        b.append(tx(x + 52, 74, a, 12.5, TINTA, "middle"))
        b.append(tx(x + 52, 112, pr, 18, VINO, "middle", serif=True))
        b.append(tx(x + 52, 130, "MXN" if i else "sin costo", 10.5, TINTA2, "middle"))
    return svg(330, 150, "".join(b), "mini")


def mini_precio():
    b = []
    x0, x1, vmax = 6, 318, 800

    def X(v):
        return x0 + (x1 - x0) * v / vmax

    b.append(rc(X(0), 62, X(vmax) - X(0), 12, ARENA2, 6))
    b.append(rc(X(249), 46, X(349) - X(249), 44, DORADO, 12))
    b.append(tx(X(299), 34, "249 a 349", 15, DORADO, "middle", 700))
    for v, nom, dy in [(225, "Meniu 225", 0), (652, "Fudo 652", 0), (745, "+ mesas 745", 22)]:
        b.append(f'<circle cx="{X(v)}" cy="68" r="7" fill="{AZUL}"/>')
        b.append(
            tx(
                X(v) if v < 700 else 326,
                112 + dy,
                nom,
                12,
                AZUL,
                "end" if v > 700 else "middle",
                700,
            )
        )
    b.append(tx(X(0), 20, "sustitutos publicados ●", 11.5, TINTA2, weight=700))
    return svg(330, 150, "".join(b), "mini")


def html_p1() -> str:
    s_pct = round(100 * M["nucleo_con_sitio"] / M["nucleo"], 1)
    k = MV["kpis"]
    cap = MV["capacidad"]
    dis = MV["disco"]
    kpis = [
        (
            f"{round(100 - s_pct)} %",
            "del mercado de Carta no declara sitio web",
            cita("inegi_denue"),
        ),
        ("≈ 100,000", "clientes potenciales (SAM)", cita("carta_mercado")),
        (
            f"{n(cap[0]['caben'])} → {n(cap[-1]['caben'])}",
            "restaurantes caben, de Hobby a Pro 8",
            cita("carta_anuncios"),
        ),
        (
            f"{dis[0]['caben']} → {dis[1]['caben']}",
            "caben en Hobby con la analítica a 30 días",
            cita("carta_disco"),
        ),
        (
            f"≈ {round(100 * k['rebasan'])} %",
            "se pasa del plan Chef " + etiqueta("supuesto"),
            cita("carta_tres_planes"),
        ),
        (
            f"≈ {round(k['sostiene_sin_anuncios'])}",
            "gratuitos sostiene cada cliente de paga (sin anuncios)",
            cita("carta_tres_planes"),
        ),
    ]
    k_html = "".join(f'<div class="kpi"><b>{a}</b><span>{b}</span>{c}</div>' for a, b, c in kpis)
    dec = [
        "Master Chef a $299 frente a Fudo Avanzado",
        "Chef: 10 mesas, 3 cuentas y 80 platillos",
        "Historial: 12 meses en línea + archivo",
        "Soporte: $60 al mes (se mide en el piloto)",
        "Anuncios no personalizados en Chef",
    ]
    d_html = "".join(f"<li><i>{i + 1}</i>{esc(t)}</li>" for i, t in enumerate(dec))
    mos = [
        (
            "Mercado",
            "¿Cuántos negocios hay?",
            mini_mercado(),
            "94 % del mercado de Carta no declara sitio web.",
            "inegi_denue",
        ),
        (
            "Capacidad con eventos",
            "¿Cuántos caben?",
            mini_capacidad(),
            "Primero el disco; luego el procesador.",
            "carta_anuncios",
        ),
        (
            "Disco e historial",
            "¿Qué llena el disco?",
            mini_disco(),
            "La analítica a 30 días multiplica por 6 lo que cabe en Hobby.",
            "carta_disco",
        ),
        (
            "Tres planes",
            "¿A quién deja dentro?",
            mini_planes(),
            "Los límites empujan a ≈ 39 %; con 80 platillos, 10.8 %.",
            "carta_tres_planes",
        ),
        (
            "Precio",
            "¿Cuánto se cobra?",
            mini_precio(),
            "Corredor de 249 a 349, hasta ≈ 556 con soporte caro.",
            "carta_precio",
        ),
    ]
    m_html = "".join(
        f'<div class="mos"><div class="mq">{esc(t)}<small>{esc(q)}</small></div>{v}<p class="mc">{esc(c)}</p></div>'
        for t, q, v, c, _ in mos
    )
    m_html += f'<div class="mos dec"><div class="mq">Recomendaciones<small>las decides tú</small></div><ol>{d_html}</ol></div>'
    return f"""<section class="pg p1">
<div class="p1-top"><div><div class="kick">Planos de Carta · informe ejecutivo · 14 de noviembre de 2026 · versión 6</div>
<div class="hero">94 de cada 100 restaurantes a la carta y bares no declara sitio web.</div><p class="alcance">Carta les da, en minutos, un menú visual y una orden que la mesa arma junta. La v1 no cobra: planes y precios son propuesta.</p></div>
<div class="rotulo">{etiqueta("propuesta")}<span>supuestos marcados; sin venta de datos</span></div></div>
<div class="kpis">{k_html}</div>
<div class="mosaicos">{m_html}</div>
<footer><span class="cita">Detalle en las páginas siguientes · fuentes al final</span><span class="pgn">1</span></footer></section>"""


def html_refs() -> str:
    meses = "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()

    def fecha(f):
        y, m, d = f.split("-")
        return f"{int(d)} de {meses[int(m) - 1]} de {y}"

    items = []
    for c in sorted(
        USADAS, key=lambda k: (REFS[k]["autor"].lower(), anio(k), REFS[k]["titulo"].lower())
    ):
        r = REFS[c]
        autores = r.get("autores")
        quien = r["autor"] if not autores else r["autor"] + " (" + "; ".join(autores) + ")"
        lab = r.get("corta", f"{r['autor']}")
        items.append(
            f"<li><b>{esc(lab if r.get('corta') else quien)}</b> ({esc(r['año'] if r.get('corta') else anio(c))}). <i>{esc(r['titulo'])}</i>. "
            f"{esc(r['publica'])}. {esc(r['url'])}. Consultado el {esc(fecha(r['consulta']))}.</li>"
        )
    mitad = (len(items) + 1) // 2
    return (
        '<section class="pg refs"><header><div class="kick">Fuentes</div><h2>Referencias</h2></header>'
        f'<div class="cols"><ul>{"".join(items[:mitad])}</ul><ul>{"".join(items[mitad:])}</ul></div>'
        '<p class="nota">Cifras propias: medidas por el equipo o tomadas de un documento del repositorio, citadas como tales; '
        "lo etiquetado «supuesto» es juicio y está en la lista de datos por conseguir de cada estudio.</p>"
        f'<footer><span class="cita">{len(items)} referencias</span><span class="pgn">{len(PAGINAS) + 2}</span></footer></section>'
    )


def armar() -> str:
    PAGINAS.clear()
    construir_paginas()
    cuerpo_p1 = html_p1()
    paginas = "".join(html_pagina(i, p) for i, p in enumerate(PAGINAS))
    return cuerpo_p1, paginas, html_refs()


def main():
    global LETRAS
    armar()  # primera pasada: qué referencias se usan
    LETRAS = _letras(set(USADAS))
    cuerpo_p1, paginas, refs = armar()
    css = (AQUI / "estilos.css").read_text(encoding="utf-8")
    html = (
        '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Planos de Carta · versión 4</title>'
        f"<style>{css}</style></head><body>{cuerpo_p1}{paginas}{refs}</body></html>"
    )
    (AQUI / "informe.html").write_text(html, encoding="utf-8")
    print(
        "escrito informe.html;",
        len(PAGINAS) + 2,
        "páginas; palabras por página:",
        [p["palabras"] for p in PAGINAS],
    )


if __name__ == "__main__":
    main()
