"""Trazabilidad spec → pruebas: qué criterio de aceptación (AC-x.y) cubre qué prueba.

Lee los criterios de docs/plan/01_Alcance_v1.md y docs/mvp/01_PRD.md (sólo historias vigentes),
los briefs de docs/plan/04_Fases_y_Tareas.md (qué criterios cita cada tarea; acepta rangos como
"AC-02.1–AC-02.5") y los marcadores `@pytest.mark.ac("AC-x.y", ...)` en tests/. Los pasos
manuales de docs/piloto/ensayo.md cuentan como cobertura manual.

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

# Historias retiradas de la v1 (01_Alcance_v1.md §6): sus criterios no cuentan.
HISTORIAS_RETIRADAS = {7, 8, 18, 19, 20, 22, 23}
# Criterios de historias vigentes que dependen de algo pospuesto (cuenta del comensal).
CRITERIOS_NO_APLICABLES = {"AC-05.4"}

RE_AC = re.compile(r"\bAC-(\d{1,2})\.(\d{1,2})\b")
RE_RANGO = re.compile(r"\bAC-(\d{1,2})\.(\d{1,2})\s*[–-]\s*AC-(\d{1,2})\.(\d{1,2})\b")
RE_TAREA = re.compile(r"^###\s+(?:🔴\s+)?(T-\d+\.\d+)\s+—", re.MULTILINE)
RE_MARCADOR = re.compile(r"mark\.ac\(([^)]*)\)")


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
    """criterio -> [archivo::función] para cada @pytest.mark.ac(...)."""
    cobertura: dict[str, list[str]] = defaultdict(list)
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
