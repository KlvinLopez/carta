"""Mezcla un mp3 por toma de la película a partir de un mp3 por frase y del guion.

Uso:
    python3 mezcla_tomas.py [guion.json] [carpeta de frases] [carpeta de salida] [tiempos.json]

Sin argumentos usa ../apoyo/voz/guion.json (lo genera apoyo/cine/guion.mjs desde VOZ), ./lineas,
../apoyo/voz y ./tiempos.json. Necesita ffmpeg y ffprobe.

Cuándo entra cada frase, en segundos desde el inicio de su toma:
- la primera frase de la toma, en su `inicio` del guion;
- con `encima` e, e segundos antes de que termine la frase anterior;
- con `tras` t, t segundos después de que termina la anterior (0.2 si no dice nada);
- si en el guion la frase venía pegada a la anterior (plática), se queda pegada; si el guion la
  esperaba más tarde (algo tiene que pasar en pantalla), no se adelanta a su `inicio`;
- con `con` c, c segundos después de que EMPIEZA la frase anterior (hablan a la vez); la frase
  que sigue a un grupo así se mide contra el final de la que termine más tarde del grupo;
- la narradora nunca se encima con un personaje: entra al menos 0.3 s después.

Cada frase se recorta de silencios, se nivela a un volumen medio común y se mezcla en su segundo.
Salida: <toma>.mp3 por toma y tiempos.json con VOZ_AUDIO (duración de cada mp3) y VOZ_TIEMPOS
([inicio, fin] de cada frase), que son las dos tablas de js/e2_film.js.
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
ARGS = sys.argv[1:]
GUION = Path(ARGS[0]) if len(ARGS) > 0 else AQUI.parent / "apoyo" / "voz" / "guion.json"
LINEAS = Path(ARGS[1]) if len(ARGS) > 1 else AQUI / "lineas"
SALIDA = Path(ARGS[2]) if len(ARGS) > 2 else AQUI.parent / "apoyo" / "voz"
TIEMPOS = Path(ARGS[3]) if len(ARGS) > 3 else AQUI / "tiempos.json"

CPS = 15.0  # caracteres por segundo con que se estimó el guion
PLATICA = 1.0  # si el hueco nominal es menor, la frase va pegada a la anterior
OBJETIVO_DB = -23.0  # volumen medio por frase (la música de fondo se mide contra esto)
COLA = 0.15  # silencio al final de cada mp3 (la película añade su propio margen)


def corre(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def dur(p: Path) -> float:
    return float(
        corre(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]
        ).stdout
    )


def sin_marcas(t: str) -> str:
    return re.sub(r"\[[^\]]*\]", "", t).strip()


def prepara(linea: dict, tmp: Path) -> tuple[Path, float] | None:
    """Recorta silencios de los extremos y nivela el volumen. Devuelve (ruta, duración) o None."""
    src = LINEAS / (linea["id"] + ".mp3")
    if not src.exists():
        return None
    crudo = tmp / (linea["id"] + "_c.wav")
    quita = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02"
    base = ["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-ar", "48000", "-ac", "1"]
    corre([*base, "-af", f"{quita},areverse,{quita},areverse", str(crudo)])
    if dur(crudo) < 0.15:  # el recorte se comió todo (risa muy baja): usar el original
        corre([*base, str(crudo)])
    vd = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(crudo), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True,
        text=True,
    ).stderr
    m = re.search(r"mean_volume: (-?[0-9.]+) dB", vd)
    media = float(m.group(1)) if m else OBJETIVO_DB
    solo_risa = sin_marcas(linea["texto"]) == ""
    ganancia = max(-8.0, min(8.0, (OBJETIVO_DB - (3.0 if solo_risa else 0.0)) - media))
    listo = tmp / (linea["id"] + ".wav")
    filtro = f"volume={ganancia:.2f}dB,afade=t=in:d=0.01,alimiter=limit=0.95"
    corre(["ffmpeg", "-loglevel", "error", "-y", "-i", str(crudo), "-af", filtro, str(listo)])
    return listo, dur(listo)


def entrada(linea: dict, prev: dict, prev_ini: float, prev_fin: float) -> float:
    """El segundo en que entra una frase que no es la primera de su toma.

    `prev_ini` es cuando empezó la frase anterior; `prev_fin`, cuando termina la última de su
    grupo (ella misma, o la que acabe más tarde si venían encadenadas con `con`).
    """
    con_narrador = "narrador" in (prev["quien"], linea["quien"])
    if linea.get("con") is not None and not con_narrador:
        return prev_ini + float(linea["con"])
    fin_nominal_prev = float(prev["inicio"]) + len(sin_marcas(prev["texto"])) / CPS
    pegada = float(linea["inicio"]) - fin_nominal_prev <= PLATICA
    if con_narrador:
        cand = prev_fin + max(0.3, float(linea.get("tras", 0.3) or 0.3))
    elif linea.get("encima") is not None:
        cand = max(0.0, prev_fin - float(linea["encima"]))
    else:
        cand = prev_fin + float(linea.get("tras", 0.2))
    return cand if pegada else max(float(linea["inicio"]), cand)


def mezcla(nombre: str, filas: list[dict]) -> float:
    """Escribe <toma>.mp3 con cada frase en su segundo y devuelve su duración."""
    salida = SALIDA / (nombre + ".mp3")
    cmd = ["ffmpeg", "-loglevel", "error", "-y"]
    for f in filas:
        cmd += ["-i", str(f["ruta"])]
    fc = "".join(
        f"[{i}]adelay={int(round(f['ini'] * 1000))}:all=1[a{i}];" for i, f in enumerate(filas)
    )
    fc += "".join(f"[a{i}]" for i in range(len(filas)))
    fc += f"amix=inputs={len(filas)}:normalize=0:dropout_transition=0,"
    fc += f"alimiter=limit=0.95,apad=pad_dur={COLA}[m]"
    cmd += ["-filter_complex", fc, "-map", "[m]", "-ar", "48000", "-ac", "1", "-b:a", "112k"]
    corre([*cmd, str(salida)])
    return dur(salida)


def main() -> int:
    guion = json.loads(GUION.read_text(encoding="utf8"))
    SALIDA.mkdir(parents=True, exist_ok=True)
    por_toma: dict[str, list[dict]] = {}
    for linea in guion:
        por_toma.setdefault(linea["toma"], []).append(linea)
    voz_audio: dict[str, float] = {}
    voz_tiempos: dict[str, list] = {}
    faltan: list[str] = []
    with tempfile.TemporaryDirectory() as carpeta:
        tmp = Path(carpeta)
        for nombre, lineas in por_toma.items():
            filas: list[dict | None] = []
            prev, prev_ini, prev_fin = None, 0.0, 0.0
            for linea in lineas:
                p = prepara(linea, tmp)
                if p is None:
                    faltan.append(linea["id"])
                    filas.append(None)
                    continue
                ruta, d = p
                if prev is None:
                    ini = float(linea["inicio"])
                else:
                    ini = entrada(linea, prev, prev_ini, prev_fin)
                filas.append({"ruta": ruta, "ini": round(ini, 2), "fin": round(ini + d, 2)})
                en_grupo = prev is not None and linea.get("con") is not None
                prev_fin = max(prev_fin, ini + d) if en_grupo else ini + d
                prev, prev_ini = linea, ini
            vivas = [f for f in filas if f]
            if vivas:
                voz_audio[nombre] = round(mezcla(nombre, vivas), 2)
            voz_tiempos[nombre] = [[f["ini"], f["fin"]] if f else None for f in filas]
    TIEMPOS.write_text(
        json.dumps(
            {"VOZ_AUDIO": voz_audio, "VOZ_TIEMPOS": voz_tiempos}, ensure_ascii=False, indent=1
        )
        + "\n",
        encoding="utf8",
    )
    resumen = {
        "tomas_con_audio": len(voz_audio),
        "frases": sum(1 for v in voz_tiempos.values() for x in v if x),
        "faltan": faltan,
        "audio_total_s": round(sum(voz_audio.values()), 1),
    }
    print(json.dumps(resumen, ensure_ascii=False))
    return 1 if faltan else 0


if __name__ == "__main__":
    raise SystemExit(main())
