"""Comprueba los dos mezcladores (mezcla_tomas.py y mezcla_musica.py) sobre copias, sin tocar el repositorio.

Uso:
    python3 comprueba_mezcladores.py

Qué comprueba:
- mezcla_tomas.py rechaza con código 1, y sin escribir nada, un guion que pide algo que no se puede
  mezclar: `con` en la primera frase de una toma, `con` junto a la narradora, `encima` mayor que la
  frase anterior, `inicio`, `con`, `tras` o `encima` negativos, un nombre de toma que no puede ser
  un archivo, un guion vacío y un ritmo que no es un número o cae fuera de 0.8 a 1.5;
- la narradora espera a que calle el último que siga hablando, aunque la frase anterior sea corta;
- con el guion del repositorio, mezcla_tomas.py vuelve a dar los tiempos de voz/tiempos.json;
- mezcla_musica.py se detiene si tiempos.json se mezcló a otro ritmo o no trae frases, si una frase
  habla fuera de su toma, si el ritmo no sirve o si `prepara` va antes que `ofrece`; con una pieza
  más corta que un tramo la repite hasta el final y la pista dura lo que la película; y en el tramo
  de en medio sólo vuelve a empezar si quedan REPETIR_DESDE segundos o más.

Necesita ffmpeg y ffprobe. Sale con código 1 si algo falla.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
GUION = AQUI.parent / "apoyo" / "voz" / "guion.json"
LINEAS = AQUI / "lineas"
VOCES = AQUI.parent / "apoyo" / "voz"
LINEA = AQUI / "linea_de_tiempo.json"
TIEMPOS = AQUI / "tiempos.json"
TOMAS = AQUI / "mezcla_tomas.py"
MUSICA = AQUI / "mezcla_musica.py"

fallos: list[str] = []


def anota(bien: bool, texto: str) -> None:
    print(("ok   " if bien else "FALLA ") + texto)
    if not bien:
        fallos.append(texto)


def lee(p: Path):
    return json.loads(p.read_text(encoding="utf8"))


def corre_tomas(trabajo: Path, nombre: str, guion: list[dict], linea: Path | dict | None = None):
    """Mezcla un guion en una carpeta nueva. Devuelve (código, última línea de error, tiempos, mp3 escritos).

    `linea` es la línea de tiempo: una ruta, su contenido (para probar ritmos raros) o nada (ritmo 1).
    """
    d = trabajo / nombre
    (d / "salida").mkdir(parents=True)
    (d / "guion.json").write_text(json.dumps(guion, ensure_ascii=False), encoding="utf8")
    args = [str(d / "guion.json"), str(LINEAS), str(d / "salida"), str(d / "tiempos.json")]
    if isinstance(linea, dict):
        (d / "linea.json").write_text(json.dumps(linea), encoding="utf8")
        linea = d / "linea.json"
    args.append(str(linea if linea else d / "sin_linea_de_tiempo.json"))
    r = subprocess.run([sys.executable, str(TOMAS), *args], capture_output=True, text=True)
    tiempos = lee(d / "tiempos.json") if (d / "tiempos.json").exists() else None
    escritos = sorted(
        p.name for p in trabajo.rglob("*.mp3") if d in p.parents or p.parent == trabajo
    )
    error = (r.stderr.strip().splitlines() or [""])[-1].strip()
    return r.returncode, error, tiempos, escritos


def rechaza(
    trabajo: Path, nombre: str, guion: list[dict], que: str, linea: dict | None = None
) -> None:
    cod, error, tiempos, escritos = corre_tomas(trabajo, nombre, guion, linea)
    bien = cod == 1 and tiempos is None and not escritos
    anota(
        bien,
        f"mezcla_tomas rechaza {que} (código {cod}, mp3 escritos {len(escritos)}): {error[:90]}",
    )


def comprueba_tomas(trabajo: Path) -> None:
    guion = lee(GUION)

    def toma(n: str) -> list[dict]:
        return [dict(x) for x in guion if x["toma"] == n]

    g = toma("cumple")
    g[0]["con"] = 0.3
    rechaza(trabajo, "con_en_la_primera", g, "`con` en la primera frase de una toma")
    g = toma("filtra")
    g[1]["con"] = 0.5
    rechaza(trabajo, "narradora_con_con", g, "`con` entre dos frases de la narradora")
    g = toma("cumple")
    g[1]["con"] = 0.5
    rechaza(trabajo, "personaje_con_narradora", g, "`con` de un personaje sobre la narradora")
    g = toma("b3")
    g[2]["encima"] = 60.0
    rechaza(trabajo, "encima_mayor", g, "`encima` mayor que la frase anterior")
    g = toma("juntos")
    g[2]["con"] = -3.0
    rechaza(trabajo, "con_negativo", g, "`con` negativo")
    g = toma("juntos")
    g[2]["tras"] = -9.0
    rechaza(trabajo, "tras_negativo", g, "`tras` negativo")
    g = toma("b3")
    g[2]["encima"] = -0.2
    rechaza(trabajo, "encima_negativo", g, "`encima` negativo")
    g = toma("cumple")
    g[0]["inicio"] = -1.0
    rechaza(trabajo, "inicio_negativo", g, "`inicio` negativo")
    g = toma("cumple")
    for x in g:
        x["toma"] = "../fuera"
    rechaza(trabajo, "nombre_con_ruta", g, "una toma cuyo nombre sale de la carpeta")
    rechaza(trabajo, "guion_vacio", [], "un guion vacío")
    for k, raro in enumerate(("rápido", True, None, 0.5, 2)):
        que = f"un ritmo que no sirve ({raro!r})"
        rechaza(trabajo, f"ritmo_raro_{k}", toma("cumple"), que, {"ritmo": raro})

    # una frase larga, una corta encimada sobre ella y la narradora: debe esperar a que calle la larga
    personajes = [x for x in toma("b1") if x["quien"] != "narrador"]
    narradora = next(x for x in toma("espera") if x["quien"] == "narrador")
    g = [
        dict(personajes[2], toma="x", inicio=0.5),
        dict(personajes[3], toma="x", inicio=3.0, encima=3.0),
        dict(narradora, toma="x", inicio=4.5),
    ]
    cod, _, tiempos, _ = corre_tomas(trabajo, "narradora_espera", g)
    v = tiempos["VOZ_TIEMPOS"]["x"] if tiempos else None
    bien = bool(cod == 0 and v and v[1][1] < v[0][1] and v[2][0] >= v[0][1] + 0.29)
    anota(bien, f"la narradora espera al último que sigue hablando (tiempos {v})")

    # el guion del repositorio vuelve a dar los tiempos commiteados
    cod, error, tiempos, _ = corre_tomas(trabajo, "repositorio", guion, LINEA)
    base = lee(TIEMPOS)
    iguales = bool(tiempos) and all(
        tiempos[k] == base[k] for k in ("RITMO", "VOZ_AUDIO", "VOZ_TIEMPOS")
    )
    anota(
        cod == 0 and iguales, f"mezcla_tomas reproduce voz/tiempos.json (código {cod}) {error[:60]}"
    )


def corre_musica(trabajo: Path, nombre: str, linea: dict, tiempos: dict, fuente: Path):
    d = trabajo / nombre
    d.mkdir(parents=True)
    (d / "linea.json").write_text(json.dumps(linea), encoding="utf8")
    (d / "tiempos.json").write_text(json.dumps(tiempos), encoding="utf8")
    args = [
        str(d / "linea.json"),
        str(d / "tiempos.json"),
        str(fuente),
        str(d / "fondo.mp3"),
        str(VOCES),
    ]
    r = subprocess.run([sys.executable, str(MUSICA), *args], capture_output=True, text=True)
    resumen = (
        json.loads(r.stdout.strip().splitlines()[-1])
        if r.returncode == 0 and r.stdout.strip()
        else None
    )
    error = (r.stderr.strip().splitlines() or [""])[-1].strip()
    return r.returncode, error, resumen, (d / "fondo.mp3").exists()


def comprueba_musica(trabajo: Path) -> None:
    linea, tiempos = lee(LINEA), lee(TIEMPOS)
    pieza = next(iter(sorted((AQUI / "musica").glob("*.mp3"))))
    corta = trabajo / "pieza_de_20_s.mp3"
    recorte = ["ffmpeg", "-loglevel", "error", "-y", "-i", str(pieza), "-t", "20", str(corta)]
    subprocess.run(recorte, check=True)

    otro = dict(tiempos, RITMO=float(tiempos.get("RITMO", 1.0)) + 0.05)
    cod, error, _, escrito = corre_musica(trabajo, "otro_ritmo", linea, otro, corta)
    anota(
        cod != 0 and not escrito,
        f"mezcla_musica se detiene si tiempos.json es de otro ritmo: {error[:80]}",
    )

    fuera = json.loads(json.dumps(tiempos))
    primera = linea["tomas"][0]["toma"]
    fuera["VOZ_TIEMPOS"][primera][0] = [0.5, float(linea["tomas"][0]["duracion"]) + 30.0]
    cod, error, _, escrito = corre_musica(trabajo, "fuera_de_su_toma", linea, fuera, corta)
    anota(
        cod != 0 and not escrito,
        f"mezcla_musica se detiene si una frase habla fuera de su toma: {error[:80]}",
    )

    for k, raro in enumerate(("rápido", True, None, 0.5, 2)):
        rara = dict(linea, ritmo=raro)
        cod, error, _, escrito = corre_musica(trabajo, f"ritmo_raro_{k}", rara, tiempos, corta)
        anota(
            cod != 0 and not escrito and "Traceback" not in error,
            f"mezcla_musica se detiene con un ritmo que no sirve ({raro!r}): {error[:70]}",
        )

    sin_frases = dict(tiempos, VOZ_TIEMPOS={})
    cod, error, _, escrito = corre_musica(trabajo, "sin_frases", linea, sin_frases, corta)
    anota(
        cod != 0 and not escrito,
        f"mezcla_musica se detiene si tiempos.json no trae frases: {error[:80]}",
    )

    # una película de juguete, a ritmo 1, para mover de sitio las tomas que gobiernan la música
    def juguete(orden: list[str], larga: float) -> tuple[dict, dict]:
        tomas, ini = [], 0.0
        for t in orden:
            d = larga if t == "ofrece" else 5.0
            tomas.append({"toma": t, "inicio": ini, "duracion": d})
            ini += d
        primera = orden[0]
        voz = {"RITMO": 1.0, "VOZ_AUDIO": {}, "VOZ_TIEMPOS": {primera: [[0.5, 2.0]]}}
        return {"ritmo": 1.0, "total": ini, "tomas": tomas}, voz

    al_reves, voz = juguete(["mesa", "pivote", "prepara", "ofrece", "fin"], 30.0)
    cod, error, _, escrito = corre_musica(trabajo, "prepara_antes", al_reves, voz, corta)
    anota(
        cod != 0 and not escrito,
        f"mezcla_musica se detiene si `prepara` va antes que `ofrece`: {error[:80]}",
    )

    # el tramo de en medio: la pieza vuelve a empezar sólo si quedan REPETIR_DESDE segundos o más
    sys.path.insert(0, str(AQUI))
    from mezcla_musica import REPETIR_DESDE, suena_hasta  # noqa: PLC0415

    util = suena_hasta(corta)
    cuenta = {}
    for sobra in (REPETIR_DESDE - 0.5, REPETIR_DESDE + 0.5):
        peli, voz = juguete(["mesa", "pivote", "ofrece", "prepara", "fin"], util + sobra)
        cod, error, resumen, _ = corre_musica(trabajo, f"sobra_{sobra}", peli, voz, corta)
        desde, hasta = peli["tomas"][2]["inicio"], peli["tomas"][3]["inicio"]
        vueltas = [v for v in (resumen or {}).get("vueltas", []) if desde <= v["inicio"] < hasta]
        cuenta[sobra] = len(vueltas) if cod == 0 else None
    bien = list(cuenta.values()) == [1, 2]
    anota(
        bien,
        f"en el tramo de en medio la pieza se repite sólo si quedan {REPETIR_DESDE} s o más: {cuenta}",
    )

    cod, error, resumen, _ = corre_musica(trabajo, "pieza_corta", linea, tiempos, corta)
    ritmo = float(linea.get("ritmo", 1.0))
    reloj = float(linea["total"]) / ritmo
    bien = bool(
        cod == 0
        and resumen
        and len(resumen["vueltas"]) > 3
        and abs(resumen["duracion"] - reloj) < 0.2
        and all(v["dura"] <= 20.1 for v in resumen["vueltas"])
        and resumen["vueltas"][-1]["inicio"] + resumen["vueltas"][-1]["dura"] >= reloj - 0.6
    )
    vueltas = len(resumen["vueltas"]) if resumen else 0
    dura = resumen["duracion"] if resumen else None
    anota(
        bien,
        f"con una pieza de 20 s la repite ({vueltas} vueltas), llega al final y la pista dura {dura} s de {reloj:.2f} {error[:40]}",
    )


def main() -> int:
    with tempfile.TemporaryDirectory() as carpeta:
        trabajo = Path(carpeta)
        for parte in ("tomas", "musica"):
            (trabajo / parte).mkdir()
        comprueba_tomas(trabajo / "tomas")
        comprueba_musica(trabajo / "musica")
    print(f"fallas: {len(fallos)}")
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
