"""Marco de muestreo de la muestra de 500 cartas (apoya docs/research/2026-11-13-muestra-500-cartas.md).

Sólo biblioteca estándar. Usa Text Search (New) de Places API con una máscara de campos hasta el nivel Enterprise.
La llave NUNCA se ve aquí: se manda `X-Goog-Api-Key: dummy` y el proxy del entorno la sustituye.

Reglas de los términos de Google (ver el informe, §Términos):
- Sólo `place_id` puede guardarse sin límite. Nombre, calificación, número de reseñas, sitio web y nivel de precio
  NO se guardan en el repositorio ni en disco: viven en memoria durante esta ejecución y salen por la salida
  estándar de la sesión sólo para elegir candidatos.
- En disco sólo quedan: el contador de solicitudes (fuera del repositorio) y, con --salida, `place_id,ciudad`.

Uso:
    python3 docs/research/2026-11-13-muestra-500-marco.py --seco          # sin red, respuesta de ejemplo
    python3 docs/research/2026-11-13-muestra-500-marco.py --sonda         # 1 solicitud, pageSize 1, máscara places.id
    python3 docs/research/2026-11-13-muestra-500-marco.py --correr [--salida marco.csv]
    python3 docs/research/2026-11-13-muestra-500-marco.py --estado        # solicitudes gastadas
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import ssl
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

URL = "https://places.googleapis.com/v1/places:searchText"
MASCARA = (
    "places.id,places.displayName,places.primaryType,places.types,places.formattedAddress,"
    "places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.businessStatus,"
    "nextPageToken"
)
MASCARA_SONDA = "places.id"

PRESUPUESTO = 90  # tope duro de solicitudes (Calvin: 100 por día, 30 por minuto)
ESPERA_S = 3.2  # ≥ 3 s entre solicitudes
PAGINAS_MAX = 3  # 20 × 3 = 60, tope de Google por consulta
ESTADO = Path(os.environ.get("CARTA_MARCO_ESTADO", Path.home() / ".carta-marco" / "contador.json"))

# Reparto de los 500 [supuesto, ver informe §2: la regla de Calvin con peso a las tres zonas grandes; falta el número
# de hogares por entidad y los establecimientos 7225 por zona, datos #9 y #11 de «datos por conseguir»].
REPARTO = {
    "CDMX y Estado de México": 125,
    "Guadalajara y Zapopan": 75,
    "Monterrey": 65,
    "Puebla": 23,
    "Querétaro": 22,
    "León": 18,
    "Mérida": 18,
    "Tijuana": 18,
    "Cancún": 16,
    "Chihuahua": 15,
    "Hermosillo": 15,
    "San Luis Potosí": 15,
    "Toluca": 15,
    "Aguascalientes": 15,
    "Morelia": 15,
    "Veracruz": 15,
    "Oaxaca": 15,
}
assert sum(REPARTO.values()) == 500, sum(REPARTO.values())

# Tipos de consulta: (texto, páginas). Zonas grandes: varios tipos; el resto: una consulta general.
TIPOS_GRANDES = (
    "restaurantes",
    "taquería",
    "fonda cocina económica comida corrida",
    "cafetería",
    "mariscos",
)
CONSULTAS: list[tuple[str, str]] = []  # (ciudad del reparto, texto)
for ciudad, tipos in (
    ("CDMX y Estado de México", [(t, "Ciudad de México") for t in TIPOS_GRANDES]),
    ("Guadalajara y Zapopan", [(t, "Guadalajara Zapopan Jalisco") for t in TIPOS_GRANDES[:4]]),
    ("Monterrey", [(t, "Monterrey San Pedro Garza García Nuevo León") for t in TIPOS_GRANDES[:4]]),
):
    for tipo, lugar in tipos:
        CONSULTAS.append((ciudad, f"{tipo} en {lugar}"))
for ciudad in list(REPARTO)[3:]:
    CONSULTAS.append((ciudad, f"restaurantes en {ciudad}"))

FACTOR_HOLGURA = (
    1.8  # candidatos por plaza (la primera pasada midió ≈ 1.7 intentos por negocio contable)
)


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return re.sub(
        r"[^a-z0-9 ]+", " ", "".join(c for c in s if not unicodedata.combining(c))
    ).strip()


def marca(nombre: str) -> str:
    """Marca sin sucursal: corta en « - », « (», « sucursal » y «, ». Heurística; el informe reporta su error."""
    n = re.split(r"\s[-–|]\s|\s\(|,|\ssucursal\s", nombre, maxsplit=1)[0]
    return _norm(n)


def leer_estado() -> dict:
    try:
        return json.loads(ESTADO.read_text())
    except FileNotFoundError:
        return {"solicitudes": 0, "bitacora": []}


def anotar(estado: dict, detalle: str) -> None:
    ESTADO.parent.mkdir(parents=True, exist_ok=True)
    estado["solicitudes"] += 1
    estado["bitacora"].append(
        {"n": estado["solicitudes"], "t": int(time.time()), "detalle": detalle}
    )
    ESTADO.write_text(json.dumps(estado))


def contexto_tls() -> ssl.SSLContext:
    for ruta in (os.environ.get("SSL_CERT_FILE"), "/root/.ccr/ca-bundle.crt"):
        if ruta and Path(ruta).exists():
            return ssl.create_default_context(cafile=ruta)
    return ssl.create_default_context()


class Detenido(Exception):
    pass


def solicitar(cuerpo: dict, mascara: str, detalle: str) -> dict:
    """Una solicitud. Cuenta ANTES de enviar (más seguro); se niega a pasar del presupuesto; 429 detiene todo."""
    estado = leer_estado()
    if estado["solicitudes"] >= PRESUPUESTO:
        raise Detenido(f"presupuesto agotado ({estado['solicitudes']}/{PRESUPUESTO})")
    anotar(estado, detalle)
    req = urllib.request.Request(
        URL,
        data=json.dumps(cuerpo).encode(),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": "dummy",  # el proxy pone la llave real
            "X-Goog-FieldMask": mascara,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=contexto_tls()) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        texto = e.read().decode("utf8", "ignore")[:600]
        if e.code == 429:
            raise Detenido(f"429 de Google, no se reintenta: {texto}") from e
        raise Detenido(f"HTTP {e.code}: {texto}") from e


def consulta_completa(
    texto: str, etiqueta: str, pausa=time.sleep, paginas: int = PAGINAS_MAX
) -> list[dict]:
    lugares: list[dict] = []
    token = None
    for pagina in range(paginas):
        cuerpo = {"textQuery": texto, "languageCode": "es", "regionCode": "MX", "pageSize": 20}
        if token:
            cuerpo["pageToken"] = token
        resp = solicitar(cuerpo, MASCARA, f"{etiqueta} p{pagina + 1}")
        lugares += resp.get("places", [])
        token = resp.get("nextPageToken")
        pausa(ESPERA_S)
        if not token:
            break
    return lugares


def elegir(por_ciudad: dict[str, list[dict]]) -> dict[str, list[dict]]:
    """Filtra, dedupe por place_id, marca cadena y ordena por reseñas (todo en memoria)."""
    todos = [(c, p) for c, ls in por_ciudad.items() for p in ls]
    vistos: set[str] = set()
    unicos = []
    for c, p in todos:
        if p["id"] not in vistos:
            vistos.add(p["id"])
            unicos.append((c, p))
    abiertos = [
        (c, p)
        for c, p in unicos
        if p.get("businessStatus", "OPERATIONAL") == "OPERATIONAL"
        and p.get("priceLevel") != "PRICE_LEVEL_VERY_EXPENSIVE"
    ]
    cuenta = Counter(marca(p.get("displayName", {}).get("text", "")) for _, p in abiertos)
    salida: dict[str, list[dict]] = defaultdict(list)
    marcas_ciudad: set[tuple[str, str]] = set()
    for c, p in sorted(abiertos, key=lambda x: -x[1].get("userRatingCount", 0)):
        m = marca(p.get("displayName", {}).get("text", ""))
        if (
            (c, m) in marcas_ciudad
        ):  # una fila por marca por ciudad; la misma marca en otra ciudad se marca cadena
            continue
        marcas_ciudad.add((c, m))
        p = dict(p)
        p["_cadena"] = cuenta[m] > 1
        p["_caro"] = p.get("priceLevel") == "PRICE_LEVEL_EXPENSIVE"
        salida[c].append(p)
    return {c: ls[: int(REPARTO[c] * FACTOR_HOLGURA) + 1] for c, ls in salida.items()}


EJEMPLO = {  # respuesta inventada para la prueba en seco (negocios ficticios)
    "places": [
        {
            "id": "ChIJ_ejemplo_1",
            "displayName": {"text": "Taquería El Ejemplo - Centro", "languageCode": "es"},
            "primaryType": "restaurant",
            "formattedAddress": "Calle Falsa 1, Ciudad de México",
            "rating": 4.5,
            "userRatingCount": 1200,
            "priceLevel": "PRICE_LEVEL_INEXPENSIVE",
            "websiteUri": "https://ejemplo.invalid",
            "businessStatus": "OPERATIONAL",
        },
        {
            "id": "ChIJ_ejemplo_2",
            "displayName": {"text": "Taquería El Ejemplo (Sur)"},
            "userRatingCount": 300,
            "businessStatus": "OPERATIONAL",
        },
        {
            "id": "ChIJ_ejemplo_3",
            "displayName": {"text": "Cerrado SA"},
            "businessStatus": "CLOSED_PERMANENTLY",
        },
        {
            "id": "ChIJ_ejemplo_4",
            "displayName": {"text": "Lujo Total"},
            "priceLevel": "PRICE_LEVEL_VERY_EXPENSIVE",
            "userRatingCount": 9000,
        },
    ],
    "nextPageToken": "x",
}


def prueba_en_seco() -> None:
    respuestas = [EJEMPLO, {"places": [], "nextPageToken": None}]
    llamadas = []

    def falso(cuerpo, mascara, detalle):
        llamadas.append((cuerpo, mascara))
        return respuestas.pop(0)

    global solicitar
    real, solicitar = solicitar, falso
    try:
        lugares = consulta_completa("taquería en Ciudad de México", "seco", pausa=lambda s: None)
    finally:
        solicitar = real
    assert len(llamadas) == 2 and llamadas[1][0]["pageToken"] == "x", llamadas
    assert llamadas[0][0]["pageSize"] == 20 and llamadas[0][0]["regionCode"] == "MX"
    assert "places.rating" in llamadas[0][1] and "Atmosphere" not in llamadas[0][1]
    ele = elegir({"CDMX y Estado de México": lugares})
    ids = [p["id"] for p in ele["CDMX y Estado de México"]]
    assert ids == ["ChIJ_ejemplo_1"], (
        ids
    )  # cerrado y muy caro fuera; misma marca en la misma ciudad: una fila
    assert ele["CDMX y Estado de México"][0]["_cadena"] is True
    print(
        "prueba en seco: ok",
        f"· consultas planeadas: {len(CONSULTAS)} · solicitudes máx.: {len(CONSULTAS) * 3}",
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--seco", action="store_true")
    g.add_argument("--sonda", action="store_true")
    g.add_argument("--correr", action="store_true")
    g.add_argument("--estado", action="store_true")
    g.add_argument(
        "--extra",
        nargs="+",
        metavar="CIUDAD|TEXTO|PAGINAS",
        help="consultas adicionales (misma regla de presupuesto); nuevos candidatos a la salida de la sesión",
    )
    ap.add_argument("--ya", help="CSV place_id,ciudad con los ids ya vistos (se omiten)")
    ap.add_argument(
        "--salida", help="CSV con sólo place_id y ciudad (lo único que se puede guardar)"
    )
    a = ap.parse_args()
    if a.seco:
        prueba_en_seco()
        return 0
    if a.estado:
        e = leer_estado()
        print(f"solicitudes: {e['solicitudes']}/{PRESUPUESTO}")
        return 0
    try:
        if a.sonda:
            r = solicitar(
                {
                    "textQuery": "restaurantes en Ciudad de México",
                    "languageCode": "es",
                    "regionCode": "MX",
                    "pageSize": 1,
                },
                MASCARA_SONDA,
                "sonda",
            )
            print("sonda: ok,", len(r.get("places", [])), "resultado(s)")
            return 0
        por_ciudad: dict[str, list[dict]] = defaultdict(list)
        if a.extra:
            for item in a.extra:
                ciudad, texto, paginas = item.split("|")
                por_ciudad[ciudad] += consulta_completa(
                    texto, f"extra {ciudad}: {texto}", paginas=int(paginas)
                )
                print(f"[{leer_estado()['solicitudes']}/{PRESUPUESTO}] {texto}", flush=True)
            vistos = set()
            if a.ya:
                with open(a.ya) as f:
                    vistos = {r["place_id"] for r in csv.DictReader(f)}
            nuevos = {
                c: [p for p in ls if p["id"] not in vistos] for c, ls in por_ciudad.items()
            }
            for c, ls in elegir(nuevos).items():
                print(f"## {c}: {len(ls)} nuevos")
                for p in ls:
                    print(
                        json.dumps(
                            {
                                "id": p["id"],
                                "n": p.get("displayName", {}).get("text"),
                                "res": p.get("userRatingCount"),
                                "web": p.get("websiteUri"),
                                "cad": p["_cadena"],
                                "caro": p["_caro"],
                            },
                            ensure_ascii=False,
                        )
                    )
            return 0
        for ciudad, texto in CONSULTAS:
            por_ciudad[ciudad] += consulta_completa(texto, f"{ciudad}: {texto}")
            print(
                f"[{leer_estado()['solicitudes']}/{PRESUPUESTO}] {texto}: {len(por_ciudad[ciudad])} acumulados",
                flush=True,
            )
    except Detenido as e:
        print("DETENIDO:", e, file=sys.stderr)
        return 2
    ele = elegir(por_ciudad)
    if a.salida:
        with open(a.salida, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["place_id", "ciudad"])
            for c, ls in ele.items():
                w.writerows([(p["id"], c) for p in ls])
    for c, ls in ele.items():  # sólo a la salida de la sesión, nunca a disco
        print(f"## {c}: {len(ls)} candidatos (plazas {REPARTO[c]})")
        for p in ls:
            print(
                json.dumps(
                    {
                        "id": p["id"],
                        "n": p.get("displayName", {}).get("text"),
                        "res": p.get("userRatingCount"),
                        "web": p.get("websiteUri"),
                        "cad": p["_cadena"],
                        "caro": p["_caro"],
                        "tipo": p.get("primaryType"),
                    },
                    ensure_ascii=False,
                )
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
