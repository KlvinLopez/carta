"""Universo de establecimientos de alimentos y bebidas en México, según el DENUE del INEGI (apoya
docs/research/2026-11-13-muestra-500-cartas.md, «Paso 0»).

Sólo biblioteca estándar. Lee los CSV de la descarga masiva del sector 72 (DENUE 05_2026) y escribe SÓLO tablas
agregadas: nunca nombres, razones sociales, direcciones, teléfonos ni correos (hay razones sociales que son personas).

    python3 docs/research/2026-11-13-universo-denue.py RUTA/denue_inegi_72_1.csv RUTA/denue_inegi_72_2.csv

Fuente de los datos: INEGI, DENUE 05_2026 (modificado el 20 de mayo de 2026), descarga masiva
<https://www.inegi.org.mx/app/descarga/?ti=6>, bajo los Términos de Libre Uso del INEGI
<https://www.inegi.org.mx/inegi/terminos.html>: se pueden extraer, adaptar y explotar con crédito al INEGI.
«Fuente: INEGI, DENUE 05_2026.» Los cálculos y agrupaciones son nuestros y no representan una postura del INEGI.

Zonas metropolitanas: municipios de «Metrópolis de México 2020» (SEDATU, CONAPO, INEGI),
<https://www.gob.mx/cms/uploads/sedatu/MM2020_06022024.pdf>, cuadros de población por zona. La suma de población de los
municipios coincide con el total de la zona en todas menos Puebla-Tlaxcala, cuya lista está incompleta (ver informe).
"""

from __future__ import annotations

import csv
import json
import sys
from collections import Counter, defaultdict

ESTRATOS = (
    "0 a 5 personas",
    "6 a 10 personas",
    "11 a 30 personas",
    "31 a 50 personas",
    "51 a 100 personas",
    "101 a 250 personas",
    "251 y más personas",
)

ZONAS: dict[str, tuple[str, ...]] = {
    "Valle de México": (
        "09002",
        "09003",
        "09004",
        "09005",
        "09006",
        "09007",
        "09008",
        "09009",
        "09010",
        "09011",
        "09012",
        "09013",
        "09014",
        "09015",
        "09016",
        "09017",
        "13013",
        "13069",
        "15002",
        "15011",
        "15013",
        "15020",
        "15022",
        "15023",
        "15024",
        "15025",
        "15028",
        "15029",
        "15030",
        "15031",
        "15033",
        "15035",
        "15037",
        "15038",
        "15039",
        "15044",
        "15046",
        "15053",
        "15057",
        "15058",
        "15059",
        "15060",
        "15069",
        "15070",
        "15075",
        "15081",
        "15083",
        "15084",
        "15089",
        "15091",
        "15092",
        "15093",
        "15095",
        "15099",
        "15100",
        "15103",
        "15104",
        "15108",
        "15109",
        "15120",
        "15121",
        "15122",
        "15125",
    ),
    "Monterrey": (
        "19006",
        "19009",
        "19010",
        "19012",
        "19018",
        "19019",
        "19021",
        "19025",
        "19026",
        "19031",
        "19039",
        "19041",
        "19045",
        "19046",
        "19048",
        "19049",
    ),
    "Guadalajara": (
        "14039",
        "14051",
        "14070",
        "14097",
        "14098",
        "14101",
        "14120",
    ),
    "Puebla-Tlaxcala": (
        "21001",
        "21015",
        "21034",
        "21041",
        "21090",
        "21114",
        "21119",
        "21125",
        "21136",
        "21140",
        "21163",
        "21181",
        "29017",
        "29022",
        "29025",
        "29027",
        "29028",
        "29029",
        "29032",
        "29041",
        "29042",
        "29044",
        "29051",
        "29053",
        "29054",
        "29058",
        "29059",
    ),
    "Toluca": (
        "15005",
        "15018",
        "15027",
        "15051",
        "15054",
        "15055",
        "15062",
        "15067",
        "15072",
        "15073",
        "15076",
        "15087",
        "15090",
        "15106",
        "15115",
        "15118",
    ),
    "Tijuana": (
        "02004",
        "02005",
    ),
    "León": (
        "11020",
        "11025",
        "11031",
    ),
    "Querétaro": (
        "22006",
        "22008",
        "22011",
        "22014",
    ),
    "Mérida": (
        "31002",
        "31013",
        "31020",
        "31038",
        "31039",
        "31041",
        "31050",
        "31063",
        "31090",
        "31093",
        "31095",
        "31101",
    ),
    "San Luis Potosí": (
        "24028",
        "24035",
    ),
    "Aguascalientes": (
        "01001",
        "01005",
        "01011",
    ),
    "Morelia": (
        "16022",
        "16053",
        "16088",
    ),
    "Chihuahua": (
        "08002",
        "08004",
        "08019",
    ),
    "Cancún": (
        "23003",
        "23005",
    ),
    "Veracruz": (
        "30028",
        "30090",
        "30100",
        "30105",
        "30193",
    ),
    "Hermosillo": ("26030",),
    "Oaxaca": (
        "20023",
        "20045",
        "20063",
        "20067",
        "20083",
        "20087",
        "20091",
        "20107",
        "20115",
        "20157",
        "20174",
        "20227",
        "20293",
        "20338",
        "20342",
        "20350",
        "20375",
        "20385",
        "20390",
        "20399",
        "20403",
        "20409",
        "20519",
        "20539",
        "20553",
        "20565",
    ),
}

MUNICIPIO_A_ZONA = {c: z for z, cs in ZONAS.items() for c in cs}
RAMAS_INTERES = ("7224", "7225")


def pct(a: int, b: int) -> str:
    return f"{100 * a / b:.1f} %" if b else "—"


def main(rutas: list[str]) -> int:
    por_clase: Counter = Counter()
    nombre_clase: dict[str, str] = {}
    por_rama: Counter = Counter()
    clase_estrato: dict[str, Counter] = defaultdict(Counter)
    web_clase: Counter = Counter()
    web_clase_estrato: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    por_entidad: Counter = Counter()
    por_zona: dict[str, Counter] = defaultdict(Counter)
    total = 0
    for ruta in rutas:
        with open(ruta, encoding="latin-1", newline="") as f:
            for fila in csv.DictReader(f):
                total += 1
                clase = fila["codigo_act"].strip()
                rama = clase[:4]
                por_clase[clase] += 1
                por_rama[rama] += 1
                nombre_clase.setdefault(clase, fila["nombre_act"].strip())
                est = fila["per_ocu"].strip()
                clase_estrato[clase][est] += 1
                tiene_web = bool(fila["www"].strip())
                if tiene_web:
                    web_clase[clase] += 1
                web_clase_estrato[(clase, est)][1] += 1
                if tiene_web:
                    web_clase_estrato[(clase, est)][0] += 1
                if rama in RAMAS_INTERES:
                    por_entidad[(rama, fila["entidad"].strip())] += 1
                    z = MUNICIPIO_A_ZONA.get(fila["cve_ent"].strip() + fila["cve_mun"].strip())
                    if z:
                        por_zona[z][rama] += 1
                        if clase == "722511" or rama == "7225":
                            por_zona[z]["web_" + rama] += int(tiene_web)
    salida = {
        "fuente": "INEGI, DENUE 05_2026 (modificado 2026-05-20), sector 72; agregados nuestros",
        "total_sector_72": total,
        "por_rama": dict(sorted(por_rama.items())),
        "por_clase": {
            c: {"nombre": nombre_clase[c], "n": n, "con_sitio_web": web_clase[c]}
            for c, n in sorted(por_clase.items())
        },
        "por_clase_y_estrato": {
            c: {e: clase_estrato[c].get(e, 0) for e in ESTRATOS} for c in sorted(clase_estrato)
        },
        "sitio_web_por_clase_y_estrato": {
            f"{c}|{e}": v for (c, e), v in sorted(web_clase_estrato.items())
        },
        "por_entidad": {f"{r}|{e}": n for (r, e), n in sorted(por_entidad.items())},
        "por_zona": {z: dict(c) for z, c in por_zona.items()},
    }
    json.dump(salida, sys.stdout, ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
