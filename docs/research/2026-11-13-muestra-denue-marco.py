"""Marco del DENUE con sitio web declarado, muestra estratificada por tamaño y orden aleatorio con semilla fija
(apoya docs/research/2026-11-13-muestra-500-cartas.md §12 y §13).

Sólo biblioteca estándar. Lee los CSV de la descarga masiva del sector 72 (DENUE 05_2026, INEGI; términos de libre uso:
<https://www.inegi.org.mx/inegi/terminos.html>). Fuente: INEGI, DENUE 05_2026; la selección es nuestra.

    python3 docs/research/2026-11-13-muestra-denue-marco.py CSV1 CSV2 --candidatos SALIDA.json --ids SALIDA_IDS.csv

- Universo: rama 7225, municipios de las 17 zonas metropolitanas (lista de `2026-11-13-universo-denue.py`), con el campo
  `www` no vacío (sitio web declarado).
- Estratos por personal ocupado: 0–5, 6–10, 11–30 y 31 o más.
- Primera tanda: 200 intentos, asignados a los estratos en proporción a su tamaño (mayor residuo), tomados del
  principio de una permutación aleatoria de cada estrato (semilla fija) y entremezclados en un solo orden aleatorio.
- `--candidatos` (JSON con identificador, sitio y metadatos) se escribe FUERA del repositorio; `--ids` (sólo identificador
  del DENUE, zona, estrato y orden) es lo único que se versiona. Nada de nombres, direcciones, teléfonos ni correos.
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
import json
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

SEMILLA = 20261116
TANDA = 200
ESTRATOS = {
    "0 a 5 personas": "0-5",
    "6 a 10 personas": "6-10",
    "11 a 30 personas": "11-30",
    "31 a 50 personas": "31+",
    "51 a 100 personas": "31+",
    "101 a 250 personas": "31+",
    "251 y más personas": "31+",
}
ORDEN_ESTRATOS = ("0-5", "6-10", "11-30", "31+")
REDES = re.compile(
    r"(facebook\.|fb\.com|instagram\.|tiktok\.|twitter\.|x\.com|wa\.me|whatsapp\.|linktr\.ee|youtube\.|youtu\.be|"
    r"google\.com/maps|goo\.gl|maps\.app|g\.page|business\.site|wixsite\.com|rappi\.|ubereats\.|didi-food)",
    re.I,
)


def cargar_zonas():
    ruta = Path(__file__).with_name("2026-11-13-universo-denue.py")
    spec = importlib.util.spec_from_file_location("universo", ruta)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m.MUNICIPIO_A_ZONA


def normalizar(www: str) -> str:
    w = www.strip().split()[0] if www.strip() else ""
    if not w:
        return ""
    return w if re.match(r"^https?://", w, re.I) else "http://" + w


def asignar(tamanos: dict[str, int], total: int) -> dict[str, int]:
    suma = sum(tamanos.values())
    exacto = {k: total * v / suma for k, v in tamanos.items()}
    base = {k: int(v) for k, v in exacto.items()}
    for k in sorted(exacto, key=lambda k: -(exacto[k] - base[k]))[: total - sum(base.values())]:
        base[k] += 1
    return base


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", nargs="+")
    ap.add_argument("--candidatos", required=True)
    ap.add_argument("--ids", required=True)
    ap.add_argument("--tanda", type=int, default=TANDA)
    a = ap.parse_args()
    zona_de = cargar_zonas()
    marco: dict[str, list[dict]] = defaultdict(list)
    for ruta in a.csv:
        with open(ruta, encoding="latin-1", newline="") as f:
            for fila in csv.DictReader(f):
                if not fila["codigo_act"].startswith("7225"):
                    continue
                zona = zona_de.get(fila["cve_ent"].strip() + fila["cve_mun"].strip())
                web = normalizar(fila["www"])
                if not zona or not web:
                    continue
                estrato = ESTRATOS.get(fila["per_ocu"].strip())
                if not estrato:
                    continue
                marco[estrato].append(
                    {
                        "id": "denue-" + fila["id"].strip(),
                        "web": web,
                        "zona": zona,
                        "estrato": estrato,
                        "per_ocu": fila["per_ocu"].strip(),
                        "clase": fila["codigo_act"].strip(),
                        "red_social": bool(REDES.search(web)),
                    }
                )
    tamanos = {e: len(marco[e]) for e in ORDEN_ESTRATOS}
    total = sum(tamanos.values())
    reparto = asignar(tamanos, a.tanda)
    print("Marco del DENUE con sitio web declarado en las 17 zonas (rama 7225):", total)
    print("Estratos:", tamanos, "| asignación de la tanda:", reparto)
    rng = random.Random(SEMILLA)
    elegidos: list[dict] = []
    for e in ORDEN_ESTRATOS:
        lista = sorted(
            marco[e], key=lambda r: r["id"]
        )  # orden canónico antes de barajar: reproducible
        rng.shuffle(lista)
        elegidos += lista[: reparto[e]]
    rng.shuffle(elegidos)  # un solo orden aleatorio, estratos entremezclados
    for i, r in enumerate(elegidos, 1):
        r["orden"] = i
    print("Zonas en la tanda:", dict(Counter(r["zona"] for r in elegidos)))
    print(
        "Sitios que son red social, ficha o plataforma (no se leen):",
        sum(r["red_social"] for r in elegidos),
    )
    Path(a.candidatos).write_text(json.dumps(elegidos, ensure_ascii=False))
    with open(a.ids, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["denue_id", "zona", "estrato", "clase_scian", "orden"])
        for r in elegidos:
            w.writerow(
                [r["id"].removeprefix("denue-"), r["zona"], r["estrato"], r["clase"], r["orden"]]
            )


if __name__ == "__main__":
    main()
