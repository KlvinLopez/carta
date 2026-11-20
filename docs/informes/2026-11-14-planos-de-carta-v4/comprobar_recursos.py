"""Paso fijo antes de publicar el interactivo: los recursos relativos que el HTML y los módulos usan deben estar en la lista de archivos
que se publican. Probar desde el disco no prueba lo publicado: en local el navegador toma las imágenes de la carpeta y en la liga no existen
si no se pasan en `files`.

Uso:
    python3 comprobar_recursos.py                 # falla si falta algo; imprime la lista de `files` a publicar
    python3 comprobar_recursos.py --publicados f  # compara además contra un archivo con las rutas que quedaron publicadas (una por línea)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
EXCLUIDOS = {".mjs", ".py", ".md"}  # generadores y notas: no viajan


def a_publicar() -> list[str]:
    """Todo lo que hay bajo apoyo/ salvo los generadores."""
    return sorted(
        p.relative_to(AQUI).as_posix()
        for p in (AQUI / "apoyo").rglob("*")
        if p.is_file() and p.suffix not in EXCLUIDOS
    )


def referenciados() -> set[str]:
    """Rutas relativas que aparecen en el HTML y en los módulos: literales `apoyo/...`."""
    textos = [(AQUI / "interactivo.html").read_text(encoding="utf-8")] + [
        p.read_text(encoding="utf-8") for p in sorted((AQUI / "js").glob("*.js"))
    ]
    refs: set[str] = set()
    for t in textos:
        refs |= set(re.findall(r"apoyo/[A-Za-z0-9_./-]*\.(?:webp|png|jpg|svg|woff2|css|js|mp4)", t))
    return refs


def main() -> int:
    pub = a_publicar()
    refs = referenciados()
    faltan_en_disco = sorted(r for r in refs if not (AQUI / r).is_file())
    faltan_en_lista = sorted(r for r in refs if r not in pub)
    mal = 0
    if faltan_en_disco:
        print("FALLA: el código referencia archivos que no existen:", *faltan_en_disco, sep="\n  ")
        mal = 1
    if faltan_en_lista:
        print(
            "FALLA: referenciados y fuera de la lista de `files` a publicar:",
            *faltan_en_lista,
            sep="\n  ",
        )
        mal = 1
    if "--publicados" in sys.argv:
        ya = {
            ln.strip()
            for ln in Path(sys.argv[sys.argv.index("--publicados") + 1])
            .read_text(encoding="utf-8")
            .splitlines()
            if ln.strip()
        }
        sin = sorted(r for r in refs if r not in ya)
        if sin:
            print("FALLA: referenciados y no publicados en el artefacto:", *sin, sep="\n  ")
            mal = 1
    print(f"{len(refs)} rutas referenciadas · {len(pub)} archivos a publicar bajo apoyo/")
    if not mal:
        print("ok: nada referenciado queda fuera de la lista")
        print("\n".join(pub))
    return mal


if __name__ == "__main__":
    raise SystemExit(main())
