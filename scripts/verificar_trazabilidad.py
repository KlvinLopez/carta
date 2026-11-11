"""Trazabilidad spec → pruebas: qué criterio de aceptación (AC-x.y) cubre qué prueba.

Lee los criterios de docs/plan/01_Alcance_v1.md y docs/mvp/01_PRD.md (sólo historias vigentes),
los briefs de docs/plan/04_Fases_y_Tareas.md (qué criterios cita cada tarea; acepta rangos como
"AC-02.1–AC-02.5") y los marcadores de las pruebas: `@pytest.mark.ac("AC-x.y", ...)` en tests/ y,
en el frontend, un comentario `// @ac AC-x.y` en la línea de arriba de un `it(`, `test(` o
`describe(` de frontend/src/**/*.test.ts(x) (un criterio que sólo vive en la pantalla, como la
búsqueda o los filtros, no tiene prueba de backend). Un `AC-x.y` en el título de una prueba no
cuenta, ni un marcador sobre `it.skip`/`it.todo`. Los pasos manuales de docs/piloto/ensayo.md
cuentan como cobertura manual.

Uso:
  uv run python scripts/verificar_trazabilidad.py                 # resumen global
  uv run python scripts/verificar_trazabilidad.py --tarea T-1.9   # criterios de una tarea
  uv run python scripts/verificar_trazabilidad.py --fase 1        # todas las tareas de la fase
  ... --estricto                                                  # sale con 1 si falta cobertura
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ALCANCE = RAIZ / "docs" / "plan" / "01_Alcance_v1.md"
PRD = RAIZ / "docs" / "mvp" / "01_PRD.md"
TAREAS = RAIZ / "docs" / "plan" / "04_Fases_y_Tareas.md"
ENSAYO = RAIZ / "docs" / "piloto" / "ensayo.md"
PRUEBAS = RAIZ / "tests"
FRONTEND = RAIZ / "frontend" / "src"

# Historias retiradas de la v1 (01_Alcance_v1.md §6): sus criterios no cuentan.
HISTORIAS_RETIRADAS = {7, 8, 18, 19, 20, 22, 23}
# Criterios de historias vigentes que dependen de algo pospuesto (cuenta del comensal).
CRITERIOS_NO_APLICABLES = {"AC-05.4"}

RE_AC = re.compile(r"\bAC-(\d{1,2})\.(\d{1,2})\b")
RE_RANGO = re.compile(r"\bAC-(\d{1,2})\.(\d{1,2})\s*[–-]\s*AC-(\d{1,2})\.(\d{1,2})\b")
RE_TAREA = re.compile(r"^###\s+(?:🔴\s+)?(T-\d+\.\d+)\s+—", re.MULTILINE)
RE_MARCADOR = re.compile(r"mark\.ac\(([^)]*)\)")
RE_MARCADOR_TS = re.compile(r"^\s*//\s*@ac\s+(.+)$")
# Inicio de una prueba o de un bloque: `it(`, `test.only(`, `describe.skip(`, `it.each(…)(` o
# `it.each\`…\`(`. El título de un `.each` va después de la tabla, quizá líneas más abajo.
RE_PRUEBA_TS = re.compile(r"^(\s*)(it|test|describe)((?:\.\w+)*)\s*[(`]")
RE_TITULO_TS = re.compile(r"""^\s*(?:it|test|describe)(?:\.\w+)*\(\s*(['"`])(.+?)\1""")
RE_TITULO_EACH_TS = re.compile(r"""[)`]\s*\(\s*(['"`])(.+?)\1""")
LINEAS_DE_TABLA_EACH = 60


def _id(mayor: str | int, menor: str | int) -> str:
    return f"AC-{int(mayor):02d}.{int(menor)}"


def expandir(texto: str) -> set[str]:
    """IDs citados en un texto, expandiendo rangos dentro de la misma historia."""
    ids: set[str] = set()
    for a, b, c, d in RE_RANGO.findall(texto):
        if a == c:
            ids.update(_id(a, n) for n in range(int(b), int(d) + 1))
    for a, b in RE_AC.findall(texto):
        ids.add(_id(a, b))
    return ids


def criterios_vigentes() -> set[str]:
    ids: set[str] = set()
    for archivo in (ALCANCE, PRD):
        if archivo.exists():
            for mayor, menor in RE_AC.findall(archivo.read_text(encoding="utf-8")):
                if int(mayor) not in HISTORIAS_RETIRADAS:
                    ids.add(_id(mayor, menor))
    return ids - CRITERIOS_NO_APLICABLES


def criterios_por_tarea() -> dict[str, list[str]]:
    """Para cada brief de 04, los criterios citados en su línea **Criterios:**."""
    bloques = RE_TAREA.split(TAREAS.read_text(encoding="utf-8"))
    resultado: dict[str, list[str]] = {}
    # split devuelve [preámbulo, id1, cuerpo1, id2, cuerpo2, ...]
    for i in range(1, len(bloques) - 1, 2):
        tarea, cuerpo = bloques[i], bloques[i + 1]
        linea = next((ln for ln in cuerpo.splitlines() if ln.startswith("**Criterios:**")), "")
        resultado[tarea] = sorted(expandir(linea) - CRITERIOS_NO_APLICABLES)
    return resultado


def cobertura_en_pruebas() -> dict[str, list[str]]:
    """criterio -> [archivo::prueba] para cada marcador, de backend y de frontend."""
    cobertura: dict[str, list[str]] = defaultdict(list)
    for ac, pruebas in cobertura_en_frontend().items():
        cobertura[ac].extend(pruebas)
    for archivo in sorted(PRUEBAS.rglob("test_*.py")):
        lineas = archivo.read_text(encoding="utf-8").splitlines()
        for numero, linea in enumerate(lineas):
            m = RE_MARCADOR.search(linea)
            if not m:
                continue
            nombre = "?"
            for siguiente in lineas[numero + 1 : numero + 6]:
                d = re.match(r"\s*(?:async\s+)?def\s+(\w+)", siguiente)
                if d:
                    nombre = d.group(1)
                    break
            for ac in expandir(m.group(1)):
                cobertura[ac].append(f"{archivo.relative_to(RAIZ)}::{nombre}")
    return cobertura


def _pruebas_de_vitest(lineas: list[str]) -> dict[int, str]:
    """número de línea -> título de cada `it`, `test` o `describe` que de verdad corre.

    No cuentan `.skip` ni `.todo`, ni lo que está dentro de un `describe.skip` (se sigue la
    sangría: los archivos pasan por prettier). Un `it.each(tabla)('título')` cuenta con su
    título, aunque la tabla ocupe varias líneas."""
    pruebas: dict[int, str] = {}
    bloques: list[tuple[int, bool]] = []  # (sangría, saltado) de cada `describe` abierto
    for numero, linea in enumerate(lineas):
        inicio = RE_PRUEBA_TS.match(linea)
        if not inicio:
            continue
        sangria = len(inicio.group(1).expandtabs(2))
        while bloques and bloques[-1][0] >= sangria:
            bloques.pop()
        modificadores = inicio.group(3)
        saltada = re.search(r"\.(skip|todo)\b", modificadores) is not None
        bajo_saltado = any(saltado for _, saltado in bloques)
        if inicio.group(2) == "describe":
            bloques.append((sangria, saltada))
        if saltada or bajo_saltado:
            continue
        if ".each" in modificadores:
            tabla = "\n".join(lineas[numero : numero + LINEAS_DE_TABLA_EACH])
            titulo = RE_TITULO_EACH_TS.search(tabla, inicio.end() - 1)
        else:
            titulo = RE_TITULO_TS.match(linea)
        if titulo:
            pruebas[numero] = titulo.group(2)
    return pruebas


def cobertura_en_frontend() -> dict[str, list[str]]:
    """criterio -> [archivo::título] para cada `// @ac AC-x.y` puesto justo encima de un `it(`,
    `test(` o `describe(` (se admiten varias líneas `// @ac` seguidas, y `it.each`). No cuenta
    un marcador suelto ni uno sobre una prueba que no corre (`.skip`, `.todo` o dentro de un
    `describe.skip`)."""
    cobertura: dict[str, list[str]] = defaultdict(list)
    if not FRONTEND.exists():
        return cobertura
    archivos = sorted([*FRONTEND.rglob("*.test.ts"), *FRONTEND.rglob("*.test.tsx")])
    for archivo in archivos:
        lineas = archivo.read_text(encoding="utf-8").splitlines()
        pruebas = _pruebas_de_vitest(lineas)
        for numero, linea in enumerate(lineas):
            marcador = RE_MARCADOR_TS.match(linea)
            if not marcador:
                continue
            siguiente = numero + 1
            while siguiente < len(lineas) and RE_MARCADOR_TS.match(lineas[siguiente]):
                siguiente += 1
            titulo = pruebas.get(siguiente)
            if titulo is None:
                continue
            for ac in expandir(marcador.group(1)):
                cobertura[ac].append(f"{archivo.relative_to(RAIZ)}::{titulo}")
    return cobertura


def cobertura_manual() -> set[str]:
    return expandir(ENSAYO.read_text(encoding="utf-8")) if ENSAYO.exists() else set()


def main() -> int:
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    p.add_argument("--tarea", action="append", help="T-x.y (repetible)")
    p.add_argument("--fase", action="append", type=int, help="fase N (repetible)")
    p.add_argument("--estricto", action="store_true", help="salir con 1 si falta cobertura")
    args = p.parse_args()

    vigentes = criterios_vigentes()
    por_tarea = criterios_por_tarea()
    pruebas = cobertura_en_pruebas()
    manual = cobertura_manual()

    if args.tarea or args.fase:
        fases = {f"T-{f}." for f in (args.fase or [])}
        seleccion = {
            t: acs
            for t, acs in por_tarea.items()
            if (args.tarea and t in args.tarea) or any(t.startswith(f) for f in fases)
        }
        if not seleccion:
            print("ninguna tarea coincide; revisa el ID o la fase", file=sys.stderr)
            return 2
        faltan = 0
        for tarea, acs in sorted(seleccion.items()):
            print(f"\n{tarea}: {len(acs)} criterio(s)")
            if not acs:
                print(
                    "  (el brief no cita criterios AC; se verifica sólo con su comando de Verificar)"
                )
            for ac in acs:
                if ac in pruebas:
                    print(f"  ok      {ac}  ←  {', '.join(pruebas[ac])}")
                elif ac in manual:
                    print(f"  manual  {ac}  ←  docs/piloto/ensayo.md")
                else:
                    faltan += 1
                    aviso = "" if ac in vigentes else "  (¡no existe en 01/PRD vigentes!)"
                    print(f"  FALTA   {ac}{aviso}")
        print(f"\ncriterios sin cobertura: {faltan}")
        return 1 if (args.estricto and faltan) else 0

    cubiertos = {ac for ac in vigentes if ac in pruebas or ac in manual}
    citados = {ac for acs in por_tarea.values() for ac in acs}
    huerfanos = sorted(vigentes - citados)
    desconocidos = sorted(set(pruebas) - vigentes)
    porcentaje = 100 * len(cubiertos) // max(len(vigentes), 1)
    print(f"criterios vigentes: {len(vigentes)}")
    print(f"citados por alguna tarea: {len(citados & vigentes)}")
    print(f"cubiertos por prueba o paso manual: {len(cubiertos)} ({porcentaje} %)")
    if huerfanos:
        print(f"vigentes que ninguna tarea cita ({len(huerfanos)}): {', '.join(huerfanos)}")
    if desconocidos:
        print(
            f"marcadores que no corresponden a ningún criterio vigente: {', '.join(desconocidos)}"
        )
    incompleto = len(cubiertos) < len(vigentes) or bool(desconocidos) or bool(huerfanos)
    return 1 if (args.estricto and incompleto) else 0


if __name__ == "__main__":
    raise SystemExit(main())
