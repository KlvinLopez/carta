"""Mide si la narradora susurra: busca en cada frase tramos con sonido y sin tono.

Uso (librosa no es dependencia del proyecto; se trae sólo para esta medición):
    uv run --no-project --with librosa --with numpy python mide_susurros.py [guion.json] [carpeta de frases]

Sin argumentos usa ../apoyo/voz/guion.json y ./lineas.

Un susurro es sonido sin tono: las cuerdas vocales no vibran. Por cada cuadro de 10 ms se decide si
hay sonido (energía por encima del 5 % del máximo de la frase) y si hay tono (`librosa.pyin` entre
110 y 500 Hz, el registro de esta voz). Un tramo sin tono es una racha de cuadros con sonido y sin
tono; un silencio de hasta 60 ms dentro de la racha (el cierre de una «p» o una «t») no la corta, un
cuadro con tono sí. En voz normal esas rachas son consonantes sordas y finales de palabra que se
quedan sin voz, y duran menos de UMBRAL segundos; una palabra susurrada dura más.

Sale con código 1 si alguna frase de la narradora, fuera de las de EXENTAS, tiene un tramo sin tono
de UMBRAL segundos o más. Imprime el tramo más largo de cada frase.
"""

import json
import sys
from pathlib import Path

import librosa
import numpy as np

AQUI = Path(__file__).resolve().parent
ARGS = sys.argv[1:]
GUION = Path(ARGS[0]) if len(ARGS) > 0 else AQUI.parent / "apoyo" / "voz" / "guion.json"
LINEAS = Path(ARGS[1]) if len(ARGS) > 1 else AQUI / "lineas"

UMBRAL = 0.40  # segundos: desde aquí un tramo sin tono cuenta como susurro
PUENTE = 6  # cuadros de silencio (60 ms) que no cortan una racha
EXENTAS = {
    "mesa-01": "el arranque: «Viernes en la noche…» va susurrado a propósito (decisión de Calvin)",
    "cumple-01": "el «Bueno… casi» del arranque (decisión de Calvin)",
}


def tramo_mas_largo(ruta: Path) -> tuple[float, float, float]:
    """(duración del tramo sin tono más largo, segundo en que empieza, parte de la frase que tiene tono)."""
    y, sr = librosa.load(str(ruta), sr=16000, mono=True)
    _, tono, _ = librosa.pyin(y, fmin=110, fmax=500, sr=sr, frame_length=1024, hop_length=160)
    energia = librosa.feature.rms(y=y, frame_length=1024, hop_length=160)[0][: len(tono)]
    sonido = energia > energia.max() * 0.05
    mejor, donde = 0, 0
    inicio, ultimo, silencio = -1, -1, 0
    for k in range(len(tono)):
        if sonido[k] and not tono[k]:
            if inicio < 0:
                inicio = k
            ultimo, silencio = k, 0
        elif not sonido[k] and inicio >= 0 and silencio < PUENTE:
            silencio += 1
        else:
            inicio, silencio = -1, 0
        if inicio >= 0 and ultimo - inicio + 1 > mejor:
            mejor, donde = ultimo - inicio + 1, inicio
    con_tono = float((tono & sonido).sum() / max(1, sonido.sum()))
    return mejor / 100, donde / 100, con_tono


def main() -> int:
    guion = json.loads(GUION.read_text(encoding="utf8"))
    filas = []
    for linea in guion:
        if linea["quien"] != "narrador":
            continue
        largo, donde, con_tono = tramo_mas_largo(LINEAS / (linea["id"] + ".mp3"))
        filas.append((largo, donde, con_tono, linea["id"], linea["texto"]))
    filas.sort(reverse=True)
    malas = []
    for largo, donde, con_tono, ident, texto in filas:
        marca = "exenta" if ident in EXENTAS else ("SUSURRO" if largo >= UMBRAL else "")
        if marca == "SUSURRO":
            malas.append(ident)
        print(
            f"{ident:12s} {largo:4.2f} s a los {donde:5.2f} s · con tono {con_tono:4.2f} · {marca:7s} {texto[:60]}"
        )
    resumen = {
        "frases_de_la_narradora": len(filas),
        "umbral_s": UMBRAL,
        "exentas": sorted(EXENTAS),
        "con_susurro": sorted(malas),
        "mas_largo_fuera_de_las_exentas_s": max(
            (f[0] for f in filas if f[3] not in EXENTAS), default=0.0
        ),
    }
    print(json.dumps(resumen, ensure_ascii=False))
    return 1 if malas else 0


if __name__ == "__main__":
    np.seterr(all="ignore")
    raise SystemExit(main())
