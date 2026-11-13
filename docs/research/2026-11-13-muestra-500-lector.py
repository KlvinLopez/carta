"""Lector de cartas para la muestra de 500 (apoya docs/research/2026-11-13-muestra-500-cartas.md).

Sólo biblioteca estándar, más `pdftotext` y (de respaldo) el Chromium ya instalado vía `…-lector-chromium.mjs`.
NO lleva candidatos dentro: recibe un JSON con `[{"id": place_id, "web": url}, ...]` (que vive fuera del repositorio).

Qué hace con cada negocio, de uno en uno:
  1. Descarga directa de la página inicial (agente de usuario genérico, sin datos de contacto), respetando robots.txt.
  2. Si la página viene vacía de texto o no enlaza a la carta, una carga con Chromium (sin disfraces) para sacar texto y enlaces.
  3. Sigue enlaces del mismo dominio con palabras de carta (menú, carta, bebidas, desayunos…) y PDF enlazados, hasta
     20 subpáginas, ≥ 2 s entre peticiones al mismo dominio. PDF ≤ 10 MB: `pdftotext -layout`.
  4. Un 403, 429 o 503 se respeta (sin reintento ni evasión). PDF o página sólo-imagen: motivo `carta_en_imagen`.
Salida (en el directorio indicado, fuera del repositorio): `<id>/NN.txt` por página y `<id>/registro.json`.
Lo descargado es dato no confiable: sólo se escribe a archivos de texto; nunca se ejecuta ni se interpreta.

Uso:  python3 …-lector.py --candidatos cand.json --ids ID1 ID2 … --salida DIR
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser
from pathlib import Path

UA = "Mozilla/5.0 (X11; Linux x86_64) lector-de-cartas/1.0"
ESPERA_DOMINIO_S = 2.2
MAX_SUBPAGINAS = 20
MAX_PDF_BYTES = 10 * 1024 * 1024
MAX_HTML_BYTES = 3 * 1024 * 1024
PLAZO_S = 25
BLOQUEOS = (403, 429, 503)
CLAVES = (
    "menu", "carta", "alimentos", "bebidas", "desayuno", "comida", "cena", "postre", "entrada", "sopa",
    "antojito", "platillo", "ensalada", "tacos", "cafe", "bar", "cocteles", "vinos", "especialidad",
)  # fmt: skip
EXCLUIR = (
    "facebook",
    "instagram",
    "twitter",
    "tiktok",
    "whatsapp",
    "wa.me",
    "mailto:",
    "tel:",
    "javascript:",
)
MJS = Path(__file__).with_name("2026-11-13-muestra-500-lector-chromium.mjs")
_ultimo: dict[str, float] = {}
_robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}


def sin_acentos(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if not unicodedata.combining(c))


class _Texto(HTMLParser):
    BLOQUE = {
        "p",
        "div",
        "li",
        "tr",
        "br",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "section",
        "article",
        "td",
        "dd",
        "dt",
        "ul",
    }

    def __init__(self) -> None:
        super().__init__()
        self.partes: list[str] = []
        self.enlaces: list[tuple[str, str]] = []
        self._omitir = 0
        self._href: str | None = None
        self._txt: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self._omitir += 1
        if tag in self.BLOQUE:
            self.partes.append("\n")
        if tag == "a":
            self._href = dict(attrs).get("href")
            self._txt = []

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self._omitir = max(0, self._omitir - 1)
        if tag in self.BLOQUE:
            self.partes.append("\n")
        if tag == "a" and self._href:
            self.enlaces.append((self._href, " ".join("".join(self._txt).split())))
            self._href = None

    def handle_data(self, data):
        if self._omitir:
            return
        self.partes.append(data)
        if self._href is not None:
            self._txt.append(data)

    def texto(self) -> str:
        t = "".join(self.partes)
        return re.sub(r"\n\s*\n+", "\n", re.sub(r"[ \t\r\f\v]+", " ", t)).strip()


def esperar(dominio: str) -> None:
    falta = ESPERA_DOMINIO_S - (time.time() - _ultimo.get(dominio, 0))
    if falta > 0:
        time.sleep(falta)
    _ultimo[dominio] = time.time()


def permitido(url: str) -> bool:
    p = urllib.parse.urlparse(url)
    base = f"{p.scheme}://{p.netloc}"
    if base not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            esperar(p.netloc)
            req = urllib.request.Request(base + "/robots.txt", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=PLAZO_S) as r:
                rp.parse(r.read(200_000).decode("utf8", "ignore").splitlines())
            _robots[base] = rp
        except urllib.error.HTTPError as e:
            # 401/403 en robots.txt: se respeta como «no» (criterio de robotparser); 404 y demás: sin restricción
            _robots[base] = None if e.code not in (401, 403) else _cerrado()
        except Exception:
            _robots[base] = None
    rp = _robots[base]
    return True if rp is None else rp.can_fetch(UA, url)


def _cerrado() -> urllib.robotparser.RobotFileParser:
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(["User-agent: *", "Disallow: /"])
    return rp


def descargar(url: str, max_bytes: int) -> tuple[int, str, bytes]:
    """(código, tipo de contenido, cuerpo). Código 0 = error de red. No reintenta."""
    if not permitido(url):
        return (-1, "", b"")  # -1 = robots.txt lo prohíbe
    esperar(urllib.parse.urlparse(url).netloc)
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept-Language": "es-MX,es;q=0.9"}
    )
    try:
        with urllib.request.urlopen(req, timeout=PLAZO_S) as r:
            return (
                r.status,
                r.headers.get("Content-Type", ""),
                r.read(max_bytes + 1)[: max_bytes + 1],
            )
    except urllib.error.HTTPError as e:
        return (e.code, "", b"")
    except Exception:
        return (0, "", b"")


def chromium(url: str) -> dict | None:
    esperar(urllib.parse.urlparse(url).netloc)
    try:
        r = subprocess.run(["node", str(MJS), url], capture_output=True, text=True, timeout=90)
        return json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else None
    except Exception:
        return None


def pdf_a_texto(cuerpo: bytes, destino: Path) -> int:
    tmp = destino.with_suffix(".pdf.tmp")
    tmp.write_bytes(cuerpo)
    try:
        subprocess.run(
            ["pdftotext", "-layout", str(tmp), str(destino)], capture_output=True, timeout=60
        )
    finally:
        tmp.unlink(missing_ok=True)
    return len(destino.read_text(errors="ignore").strip()) if destino.exists() else 0


def puntaje(href: str, texto: str) -> int:
    s = sin_acentos(href + " " + texto)
    return sum(1 for c in CLAVES if c in s) + (
        2 if href.lower().split("?")[0].endswith(".pdf") else 0
    )


def enlaces_de_carta(base: str, enlaces: list[tuple[str, str]]) -> list[str]:
    dom = urllib.parse.urlparse(base).netloc.removeprefix("www.")
    vistos: dict[str, int] = {}
    for href, txt in enlaces:
        if any(x in href.lower() for x in EXCLUIR) or href.startswith("#"):
            continue
        u = urllib.parse.urldefrag(urllib.parse.urljoin(base, href))[0]
        p = urllib.parse.urlparse(u)
        if p.scheme not in ("http", "https"):
            continue
        es_pdf = p.path.lower().endswith(".pdf")
        if p.netloc.removeprefix("www.") != dom and not es_pdf:
            continue
        sc = puntaje(u, txt)
        if sc > 0:
            vistos[u] = max(vistos.get(u, 0), sc)
    return [u for u, _ in sorted(vistos.items(), key=lambda x: -x[1])]


def leer_negocio(nid: str, web: str, salida: Path) -> dict:
    d = salida / nid
    d.mkdir(parents=True, exist_ok=True)
    reg: dict = {"id": nid, "inicio": web, "paginas": [], "motivo": None, "chromium": False}
    n = 0
    cola: list[str] = []
    hechas: set[str] = set()

    def guardar(url: str, codigo: int, tipo: str, texto: str, via: str) -> None:
        nonlocal n
        n += 1
        (d / f"{n:02d}.txt").write_text(texto)
        reg["paginas"].append(
            {
                "n": n,
                "url": url,
                "codigo": codigo,
                "tipo": tipo,
                "via": via,
                "chars": len(texto),
                "precios": len(re.findall(r"\$\s?\d", texto)),
            }
        )

    def tratar(url: str, es_inicio: bool) -> list[tuple[str, str]]:
        hechas.add(url)
        codigo, tipo, cuerpo = descargar(url, MAX_PDF_BYTES)
        if codigo == -1:
            reg["motivo"] = reg["motivo"] or "robots_txt_lo_prohibe"
            return []
        if codigo in BLOQUEOS or codigo == 0 or codigo >= 400:
            reg["paginas"].append({"url": url, "codigo": codigo})
            if es_inicio:
                reg["motivo"] = (
                    f"bloqueo_{codigo}"
                    if codigo in BLOQUEOS
                    else (f"http_{codigo}" if codigo else "sitio_caido")
                )
            return []
        if url.lower().split("?")[0].endswith(".pdf") or "pdf" in tipo.lower():
            if len(cuerpo) > MAX_PDF_BYTES:
                reg["paginas"].append({"url": url, "codigo": codigo, "tipo": "pdf>10MB"})
                return []
            tmp = d / "tmp_pdf.txt"
            chars = pdf_a_texto(cuerpo, tmp)
            if chars < 200:
                tmp.unlink(missing_ok=True)
                reg["paginas"].append({"url": url, "codigo": codigo, "tipo": "pdf_sin_texto"})
                reg["motivo_pdf"] = "carta_en_imagen"
            else:
                texto = tmp.read_text(errors="ignore")
                tmp.unlink()
                guardar(url, codigo, "pdf", texto, "pdftotext")
            return []
        html = cuerpo[:MAX_HTML_BYTES].decode("utf8", "ignore")
        p = _Texto()
        p.feed(html)
        texto, enlaces = p.texto(), p.enlaces
        if es_inicio and (len(texto) < 300 or not enlaces_de_carta(url, enlaces)):
            c = chromium(url)
            if c and len(c.get("text", "")) > len(texto):
                reg["chromium"] = True
                texto = c["text"]
                enlaces = [(x["href"], x.get("text", "")) for x in c.get("links", [])]
        guardar(
            url, codigo, "html", texto, "chromium" if reg["chromium"] and es_inicio else "directo"
        )
        return enlaces

    enl = tratar(web, True)
    if reg["motivo"]:
        return _cerrar(d, reg)
    cola = enlaces_de_carta(web, enl)
    # categorías: se siguen los enlaces de las páginas de carta ya leídas, sin pasar de MAX_SUBPAGINAS
    sub = 0
    while cola and sub < MAX_SUBPAGINAS:
        u = cola.pop(0)
        if u in hechas:
            continue
        sub += 1
        nuevos = tratar(u, False)
        for v in enlaces_de_carta(u, nuevos):
            if v not in hechas and v not in cola and len(cola) + sub < MAX_SUBPAGINAS * 2:
                cola.append(v)
    reg["subpaginas"] = sub
    reg["precios_total"] = sum(p.get("precios", 0) for p in reg["paginas"])
    if reg["precios_total"] == 0:
        reg["motivo"] = reg.get("motivo_pdf") or ("sin_carta_en_sitio")
    return _cerrar(d, reg)


def _cerrar(d: Path, reg: dict) -> dict:
    (d / "registro.json").write_text(json.dumps(reg, ensure_ascii=False, indent=1))
    return reg


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidatos", required=True)
    ap.add_argument("--ids", nargs="+", required=True, help="place_id (o sufijo de 6 caracteres)")
    ap.add_argument("--salida", required=True)
    a = ap.parse_args()
    cand = json.loads(Path(a.candidatos).read_text())
    for i in a.ids:
        c = next((x for x in cand if x["id"] == i or x["id"].endswith(i)), None)
        if not c or not c.get("web"):
            print(f"{i}: sin sitio en los candidatos", file=sys.stderr)
            continue
        r = leer_negocio(c["id"], c["web"], Path(a.salida))
        print(
            json.dumps(
                {
                    "id": c["id"][-6:],
                    "paginas": len([p for p in r["paginas"] if p.get("chars")]),
                    "precios": r.get("precios_total"),
                    "chromium": r["chromium"],
                    "motivo": r["motivo"],
                },
                ensure_ascii=False,
            ),
            flush=True,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
