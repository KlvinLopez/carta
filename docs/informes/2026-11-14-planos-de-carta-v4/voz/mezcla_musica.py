"""Arma la música de fondo de la película: un solo mp3 continuo, con el volumen ya puesto.

Uso:
    python3 mezcla_musica.py [linea_de_tiempo.json] [tiempos.json] [música fuente] [salida.mp3] [carpeta de voces]

Sin argumentos usa ./linea_de_tiempo.json (lo escribe apoyo/cine/guion.mjs), ./tiempos.json (lo
escribe mezcla_tomas.py), ./musica/<PIEZA>, ../apoyo/musica/fondo.mp3 y las voces de ../apoyo/voz.
Necesita ffmpeg.

Qué hace:
- La música baja cuando alguien habla y sube un poco cuando nadie habla; entre dos frases
  separadas por menos de HUECO_MINIMO segundos se queda abajo, para que no suba y baje.
- Suena desde el principio, se apaga en la toma `pivote`, vuelve a empezar en `ofrece` y otra
  vez en `prepara`; al final se funde. Si falta alguna de esas tomas, suena de corrido.
- Si un tramo dura más que la pieza, la pieza vuelve a empezar al terminar; si lo que falta del
  tramo es menos de REPETIR_DESDE segundos, se queda en silencio hasta el tramo siguiente.
- El volumen va horneado en el archivo: en un teléfono el navegador no deja cambiarlo por código.

El ritmo: linea_de_tiempo.json y tiempos.json van en segundos «de guion»; si la película corre a
otro ritmo (`ritmo` en linea_de_tiempo.json), aquí todo se pasa a segundos de reloj dividiendo entre
el ritmo. La música no se acelera: suena a su velocidad y dura lo que dura la película en el reloj.

Los niveles se miden contra la voz: BAJO_LA_VOZ y ENTRE_FRASES son cuántas unidades de sonoridad
(LU) queda la música por debajo de la voz ya mezclada en apoyo/voz.

Si un tiempo de voz cae fuera de su toma, se detiene con un error: la música bajaría donde nadie habla.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

PIEZA = "swing-has-swung.mp3"  # la pieza de ./musica que suena

AQUI = Path(__file__).resolve().parent
ARGS = sys.argv[1:]
LINEA = Path(ARGS[0]) if len(ARGS) > 0 else AQUI / "linea_de_tiempo.json"
TIEMPOS = Path(ARGS[1]) if len(ARGS) > 1 else AQUI / "tiempos.json"
FUENTE = Path(ARGS[2]) if len(ARGS) > 2 else AQUI / "musica" / PIEZA
SALIDA = Path(ARGS[3]) if len(ARGS) > 3 else AQUI.parent / "apoyo" / "musica" / "fondo.mp3"
VOCES = Path(ARGS[4]) if len(ARGS) > 4 else AQUI.parent / "apoyo" / "voz"

BAJO_LA_VOZ = 13.0  # LU por debajo de la voz mientras alguien habla
ENTRE_FRASES = 9.0  # LU por debajo de la voz cuando nadie habla
HUECO_MINIMO = 1.5  # con menos silencio que esto entre dos frases, la música no sube
ANTES = 0.3  # segundos que tarda en bajar; termina de bajar justo cuando empieza la frase
ESPERA = 0.3  # segundos que espera tras la frase antes de subir
SUBIDA = 0.8  # segundos que tarda en subir
FUNDIDO_PIVOTE = 1.5  # la música se apaga al empezar la toma `pivote`
FUNDIDO_TRAMO = 2.0  # fundido con que se corta la pieza al acabar el tramo de en medio
FUNDIDO_FINAL = 2.5
ENTRADA = 0.6  # fundido de entrada de cada vuelta a empezar
REPETIR_DESDE = 12.0  # la pieza sólo vuelve a empezar si quedan al menos estos segundos de tramo
MARGEN_TOMA = 0.05  # cuánto puede pasarse un tiempo de voz del final de su toma (redondeos)


def corre(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def dur(p: Path) -> float:
    campos = ["-show_entries", "format=duration", "-of", "csv=p=0"]
    return float(corre(["ffprobe", "-v", "error", *campos, str(p)]).stdout)


def sonoridad(entradas: list[Path], filtro: str = "") -> float:
    """Sonoridad integrada (LUFS, EBU R128) de uno o varios archivos seguidos."""
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    for p in entradas:
        cmd += ["-i", str(p)]
    n = len(entradas)
    union = "".join(f"[{i}:a]" for i in range(n)) + f"concat=n={n}:v=0:a=1"
    cadena = union + (f",{filtro}" if filtro else "") + ",ebur128=framelog=quiet"
    r = subprocess.run(
        [*cmd, "-filter_complex", cadena, "-f", "null", "-"], capture_output=True, text=True
    )
    m = re.findall(r"I:\s+(-?[0-9.]+) LUFS", r.stderr)
    if not m:
        raise SystemExit("no pude medir la sonoridad:\n" + r.stderr[-400:])
    return float(m[-1])


def en_reloj(linea: dict) -> dict:
    """La línea de tiempo en segundos de reloj: los de guion entre el ritmo."""
    ritmo = float(linea.get("ritmo", 1.0))
    if not 0.8 <= ritmo <= 1.5:
        raise SystemExit(f"ritmo {ritmo} fuera de 0.8 a 1.5 en {LINEA}")
    tomas = [
        {"toma": t["toma"], "inicio": t["inicio"] / ritmo, "duracion": t["duracion"] / ritmo}
        for t in linea["tomas"]
    ]
    return {"ritmo": ritmo, "total": float(linea["total"]) / ritmo, "tomas": tomas}


def tramos_de_habla(linea: dict, tiempos: dict, ritmo: float) -> list[list[float]]:
    """Intervalos, en segundos de reloj, en que alguien habla; juntos si el hueco es corto.

    `linea` ya viene en segundos de reloj; `tiempos`, en segundos de guion.
    """
    sueltos = []
    for t in linea["tomas"]:
        for k, par in enumerate(tiempos["VOZ_TIEMPOS"].get(t["toma"], [])):
            if not par:
                continue
            a, b = par[0] / ritmo, par[1] / ritmo
            if not 0 <= a <= b <= t["duracion"] + MARGEN_TOMA:
                raise SystemExit(
                    f"la frase {k + 1} de `{t['toma']}` habla de {par[0]} a {par[1]} s y la toma dura "
                    f"{t['duracion'] * ritmo:.2f} s: corre antes apoyo/cine/guion.mjs y mezcla_tomas.py"
                )
            sueltos.append([t["inicio"] + a, t["inicio"] + b])
    sueltos.sort()
    juntos: list[list[float]] = []
    for a, b in sueltos:
        if juntos and a - juntos[-1][1] < HUECO_MINIMO:
            juntos[-1][1] = max(juntos[-1][1], b)
        else:
            juntos.append([a, b])
    return juntos


def repite(desde: float, hasta: float, largo: float, entra: float, sale: float) -> list[dict]:
    """Las vueltas de la pieza que llenan el tramo [desde, hasta]: la primera entra con `entra`;
    la última se corta con el fundido `sale` si no cabe entera."""
    out: list[dict] = []
    ini = desde
    while hasta - ini > 0.5 and (not out or hasta - ini >= REPETIR_DESDE):
        dura = min(largo, hasta - ini)
        out.append({"inicio": ini, "dura": dura, "entra": entra if not out else 0.0, "sale": 0.0})
        ini += largo
    if out and out[-1]["dura"] < largo:
        out[-1]["sale"] = min(sale, out[-1]["dura"] / 2)
    return out


def vueltas(linea: dict, largo: float) -> list[dict]:
    """Los tramos de música: cuándo empieza cada vuelta, cuánto dura y con qué fundidos."""
    total = float(linea["total"])
    t0 = {t["toma"]: float(t["inicio"]) for t in linea["tomas"]}
    if not {"pivote", "ofrece", "prepara"} <= set(t0):
        return repite(0.0, total, largo, 0.0, FUNDIDO_FINAL)
    acto1 = repite(0.0, t0["pivote"] + FUNDIDO_PIVOTE, largo, 0.0, FUNDIDO_PIVOTE)
    hasta = max(t0["ofrece"] + 1.0, t0["prepara"])
    acto2 = repite(t0["ofrece"], hasta, largo, ENTRADA, FUNDIDO_TRAMO)
    cierre = repite(t0["prepara"], total, largo, ENTRADA, FUNDIDO_FINAL)
    return [*acto1, *acto2, *cierre]


def main() -> int:
    linea = en_reloj(json.loads(LINEA.read_text(encoding="utf8")))
    tiempos = json.loads(TIEMPOS.read_text(encoding="utf8"))
    ritmo = linea["ritmo"]
    if abs(float(tiempos.get("RITMO", 1.0)) - ritmo) > 1e-9:
        raise SystemExit(
            f"tiempos.json se mezcló a ritmo {tiempos.get('RITMO', 1.0)} y la película va a {ritmo}: "
            "corre antes mezcla_tomas.py"
        )
    total = linea["total"]
    largo = dur(FUENTE)
    habla = tramos_de_habla(linea, tiempos, ritmo)
    pistas = [
        VOCES / f"{t['toma']}.mp3" for t in linea["tomas"] if (VOCES / f"{t['toma']}.mp3").exists()
    ]
    if not pistas:
        raise SystemExit(f"no hay voces en {VOCES}: corre antes mezcla_tomas.py")
    voz = sonoridad(pistas)
    fuente = sonoridad([FUENTE])
    alto = (voz - ENTRE_FRASES) - fuente  # ganancia en dB cuando nadie habla
    hondo = BAJO_LA_VOZ - ENTRE_FRASES  # cuánto baja cuando alguien habla

    # cuánto está «abajo» la música en cada instante, de 0 (nadie habla) a 1 (alguien habla)
    partes = []
    for a, b in habla:
        partes.append(
            f"clip((t-{a - ANTES:.3f})/{ANTES},0,1)-clip((t-{b + ESPERA:.3f})/{SUBIDA},0,1)"
        )
    abajo = "+".join(partes) if partes else "0"
    volumen = f"pow(10,({alto:.3f}-{hondo:.3f}*clip({abajo},0,1))/20)"

    vs = vueltas(linea, largo)
    cmd = ["ffmpeg", "-loglevel", "error", "-y"]
    grafo = ""
    for i, v in enumerate(vs):
        cmd += ["-i", str(FUENTE)]
        f = f"[{i}:a]atrim=0:{v['dura']:.3f},asetpts=PTS-STARTPTS"
        if v["entra"]:
            f += f",afade=t=in:st=0:d={v['entra']}"
        if v["sale"]:
            f += f",afade=t=out:st={max(0.0, v['dura'] - v['sale']):.3f}:d={v['sale']}"
        f += f",adelay={int(round(v['inicio'] * 1000))}:all=1[m{i}];"
        grafo += f
    grafo += "".join(f"[m{i}]" for i in range(len(vs)))
    grafo += f"amix=inputs={len(vs)}:normalize=0:dropout_transition=0,apad,atrim=0:{total:.3f},"
    grafo += f"asetnsamples=n=256,volume=volume='{volumen}':eval=frame,alimiter=limit=0.95[m]"
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    salida = ["-map", "[m]", "-ar", "44100", "-ac", "2", "-b:a", "112k", str(SALIDA)]
    corre([*cmd, "-filter_complex", grafo, *salida])

    resumen = {
        "pieza": FUENTE.name,
        "ritmo": ritmo,
        "duracion": round(dur(SALIDA), 2),
        "pelicula_en_reloj": round(total, 2),
        "voz_lufs": voz,
        "musica_fuente_lufs": fuente,
        "musica_bajo_la_voz_lufs": round(voz - BAJO_LA_VOZ, 1),
        "musica_entre_frases_lufs": round(voz - ENTRE_FRASES, 1),
        "tramos_de_habla": len(habla),
        "segundos_con_habla": round(sum(b - a for a, b in habla), 1),
        "vueltas": [{"inicio": round(v["inicio"], 2), "dura": round(v["dura"], 2)} for v in vs],
    }
    print(json.dumps(resumen, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
