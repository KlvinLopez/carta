"""Control de «sitio caído» (apoya docs/research/2026-11-13-muestra-500-cartas.md §14).

Pide SOLO la portada de cada sitio por la vía del proxy de salida (que resuelve los nombres por su cuenta), por si la
resolución local del contenedor fallara. Respeta `robots.txt` (si prohíbe la portada, no se pide), NO sigue redirecciones
(una redirección se informa como tal) y NO guarda contenido: sólo imprime una línea por sitio con el código o la clase de
error. Agente de usuario genérico y honesto, el mismo del lector.

Dos límites que conviene saber: (1) si la petición de `robots.txt` falla por red (tiempo agotado, error de TLS, proxy que no
conecta), **no se pide la portada** y se informa como `robots_txt_no_se_pudo_leer`; sólo un 404 u otro código HTTP sin
reglas cuenta como «sin restricciones»; (2) este script **no valida que el destino sea público**: esa validación la hace el
proxy de salida del entorno (el lector del marco sí la hace por su cuenta, en `…-lector.py`).

    python3 docs/research/2026-11-13-muestra-denue-control.py --candidatos CAND.json --ids-archivo IDS.txt
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from pathlib import Path

UA = "lector-automatico-de-cartas/1.0 (lectura de paginas publicas; respeta robots.txt)"
PLAZO_S = 25
ESPERA_S = 2.2


class _SinRedireccion(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # no se sigue: la respuesta 3xx llega como HTTPError


_PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
if not _PROXY:
    raise SystemExit("sin proxy de salida en el entorno: no hay segunda vía que probar")
# el mismo proxy para http y https: así el nombre lo resuelve el proxy y no el contenedor
ABRIDOR = urllib.request.build_opener(
    urllib.request.ProxyHandler({"http": _PROXY, "https": _PROXY}), _SinRedireccion
)


def clase_error(e: BaseException) -> str:
    r = getattr(e, "reason", e)
    if isinstance(r, ssl.SSLCertVerificationError) or "CERTIFICATE" in str(r).upper():
        return "error_de_certificado"
    if isinstance(r, ssl.SSLError):
        return "error_tls"
    if isinstance(r, TimeoutError) or "timed out" in str(r).lower():
        return "sin_respuesta_tiempo_agotado"
    if isinstance(r, ConnectionRefusedError):
        return "conexion_rechazada"
    texto = str(r)
    if "Tunnel connection failed" in texto:
        return "proxy_no_pudo_conectar: " + texto.split(":", 1)[-1].strip()[:60]
    return "error_de_red: " + type(r).__name__


def pedir(url: str, metodo: str = "GET"):
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method=metodo)
    try:
        with ABRIDOR.open(req, timeout=PLAZO_S) as r:
            return r.status, r.read(200_000 if metodo == "GET" else 0)
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception as e:  # noqa: BLE001 - se clasifica, no se oculta
        return clase_error(e), b""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidatos", required=True)
    ap.add_argument("--ids-archivo", required=True)
    a = ap.parse_args()
    cand = {r["id"]: r for r in json.loads(Path(a.candidatos).read_text())}
    ids = [x.strip() for x in Path(a.ids_archivo).read_text().splitlines() if x.strip()]
    for i in ids:
        url = cand[i]["web"]
        p = urllib.parse.urlparse(url)
        # el proxy de salida sólo admite túneles (CONNECT): se prueba por https, también si el sitio declara http
        base = f"https://{p.netloc}"
        url = base + (p.path or "/")
        time.sleep(ESPERA_S)
        codigo_r, cuerpo_r = pedir(base + "/robots.txt")
        permitido = True
        if isinstance(codigo_r, int) and codigo_r == 200:
            rp = urllib.robotparser.RobotFileParser()
            rp.parse(cuerpo_r.decode("utf8", "ignore").splitlines())
            permitido = rp.can_fetch(UA, url)
        elif codigo_r in (401, 403):
            permitido = False
        elif isinstance(
            codigo_r, str
        ):  # error de red al pedir robots.txt: en la duda, no se pide la portada
            print(
                json.dumps({"id": i, "portada": "robots_txt_no_se_pudo_leer", "robots": codigo_r}),
                flush=True,
            )
            continue
        if not permitido:
            print(
                json.dumps({"id": i, "portada": "robots_txt_lo_prohibe", "robots": codigo_r}),
                flush=True,
            )
            continue
        time.sleep(ESPERA_S)
        codigo, _ = pedir(url)
        print(json.dumps({"id": i, "portada": codigo, "robots": codigo_r}), flush=True)


if __name__ == "__main__":
    main()
