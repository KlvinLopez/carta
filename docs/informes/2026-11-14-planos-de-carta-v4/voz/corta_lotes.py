"""Corta cada bloque grabado (varias frases de un mismo personaje) en un mp3 por frase.

Sirve para grabar varias frases de una voz en una sola generación (unidas con « [pause] ») y
separarlas después: así se gastan menos generaciones por minuto. No hace falta para mezclar.

Uso (no necesita el entorno del proyecto):
    uv run --no-project --with faster-whisper --with numpy python -I corta_lotes.py \
        <lotes.json> <guion.json> <carpeta de bloques> <carpeta de frases>

`lotes.json` es {"N1": {"ids": ["b3-01", "b2-09", …]}, …}: el nombre del bloque (su mp3 es
<carpeta de bloques>/N1.mp3) y los `id` de guion.json de sus frases, en el orden en que se dijeron.

Transcribe el bloque con tiempos por palabra, alinea las palabras con el texto de cada frase
y corta poco después de la última palabra de cada una, de modo que una risa o un suspiro
que precede a la frase siguiente se quede con ella. Vuelve a transcribir cada corte, escribe
<carpeta de bloques>/cortes.json y avisa de los que no se parecen a su texto (parecido < 0.8):
ésos se escuchan o se regraban sueltos.
"""

import difflib
import json
import os
import re
import subprocess
import sys
import unicodedata
import wave

import numpy as np
from faster_whisper import WhisperModel

lotes_p, guion_p, lotes_dir, out_dir = sys.argv[1:5]
lotes = json.load(open(lotes_p, encoding="utf8"))
guion = {x["id"]: x for x in json.load(open(guion_p, encoding="utf8"))}
modelo = WhisperModel("small", device="cpu", compute_type="int8")
tmp = os.path.join(lotes_dir, "_wav")
os.makedirs(tmp, exist_ok=True)


def norma(t):
    t = re.sub(r"\[[^\]]*\]", " ", t)
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9ñ]+", t)


def lee(p):
    w = wave.open(p, "rb")
    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0


def a_wav(src, dst):
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-ar", "16000", "-ac", "1", dst],
        check=True,
    )


def palabras(p):
    segs, _ = modelo.transcribe(lee(p), language="es", word_timestamps=True)
    out = []
    for s in segs:
        for w in s.words or []:
            for tok in norma(w.word):
                out.append((tok, float(w.start), float(w.end)))
    return out


def texto_de(p):
    segs, _ = modelo.transcribe(lee(p), language="es")
    return " ".join(s.text.strip() for s in segs)


informe = []
for nombre, lote in lotes.items():
    src = os.path.join(lotes_dir, nombre + ".mp3")
    if not os.path.exists(src) or len(lote["ids"]) == 0:
        continue
    wav = os.path.join(tmp, nombre + ".wav")
    a_wav(src, wav)
    dur = len(lee(wav)) / 16000
    pal = palabras(wav)
    trans = [p[0] for p in pal]
    objetivo, dueno = [], []
    for k, i in enumerate(lote["ids"]):
        for tok in norma(guion[i]["texto"]):
            objetivo.append(tok)
            dueno.append(k)
    mapa = {}
    for a, b, n in difflib.SequenceMatcher(
        None, objetivo, trans, autojunk=False
    ).get_matching_blocks():
        for j in range(n):
            mapa[a + j] = b + j
    n_lineas = len(lote["ids"])
    primero, ultimo = [None] * n_lineas, [None] * n_lineas
    for idx, k in enumerate(dueno):
        if idx in mapa:
            if primero[k] is None:
                primero[k] = mapa[idx]
            ultimo[k] = mapa[idx]
    for k in range(n_lineas):  # líneas sin ninguna palabra reconocida: se interpola
        if primero[k] is None:
            antes = max([u for u in ultimo[:k] if u is not None], default=-1)
            primero[k] = ultimo[k] = min(antes + 1, len(pal) - 1)
    cortes = []
    for k in range(n_lineas - 1):
        fin_k = pal[ultimo[k]][2]
        ini_sig = pal[primero[k + 1]][1]
        hueco = max(0.0, ini_sig - fin_k)
        cortes.append(fin_k + min(0.35, hueco * 0.45))
    bordes = [0.0] + cortes + [dur]
    for k, i in enumerate(lote["ids"]):
        a, b = bordes[k], bordes[k + 1]
        dst = os.path.join(out_dir, i + ".mp3")
        subprocess.run(
            [
                "ffmpeg",
                "-loglevel",
                "error",
                "-y",
                "-i",
                src,
                "-ss",
                f"{a:.3f}",
                "-to",
                f"{b:.3f}",
                "-ar",
                "48000",
                "-ac",
                "1",
                "-b:a",
                "128k",
                dst,
            ],
            check=True,
        )
        chk = os.path.join(tmp, i + ".wav")
        a_wav(dst, chk)
        oido = texto_de(chk)
        esperado = " ".join(norma(guion[i]["texto"]))
        r = difflib.SequenceMatcher(None, esperado, " ".join(norma(oido))).ratio()
        informe.append(
            dict(id=i, lote=nombre, de=round(a, 2), a=round(b, 2), parecido=round(r, 2), oido=oido)
        )

json.dump(
    informe,
    open(os.path.join(lotes_dir, "cortes.json"), "w", encoding="utf8"),
    ensure_ascii=False,
    indent=1,
)
malas = [x for x in informe if x["parecido"] < 0.8]
print(len(informe), "líneas cortadas;", len(malas), "con parecido menor a 0.8")
for x in malas:
    print(
        f"  {x['id']:13s} {x['parecido']:.2f} [{x['de']}-{x['a']}] esperado: {' '.join(norma(guion[x['id']]['texto']))[:60]} | oído: {x['oido'][:70]}"
    )
