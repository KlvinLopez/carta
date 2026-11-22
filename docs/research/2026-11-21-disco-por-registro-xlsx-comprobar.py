"""Comprueba que el libro 2026-11-21-disco-por-registro.xlsx dice lo mismo que 2026-11-21-disco-por-registro.json: las sumas de la hoja «Registros» por
forma (y la base) son los totales del JSON, el número de renglones de cada hoja es el esperado, y (si hay LibreOffice) las fórmulas de «Resumen»,
recalculadas, dan los totales del JSON. Uso: uv run --no-project --with openpyxl python docs/research/2026-11-21-disco-por-registro-xlsx-comprobar.py"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from openpyxl import load_workbook

AQUI = Path(__file__).resolve().parent
d = json.loads((AQUI / "2026-11-21-disco-por-registro.json").read_text())
wb = load_workbook(AQUI / "2026-11-21-disco-por-registro.xlsx")
fallas = 0


def prueba(nombre, obtenido, esperado):
    global fallas
    ok = obtenido == esperado
    fallas += 0 if ok else 1
    print(f"{'ok   ' if ok else 'FALLA'} {nombre}: {obtenido} (esperado {esperado})")


# 1) sumas de «Registros» por forma contra el JSON
suma = {}
for forma, _tabla, _id, _paso, datos, indices, *_ in wb["Registros"].iter_rows(min_row=2, values_only=True):
    suma[forma] = suma.get(forma, 0) + datos + indices
prueba("Registros: la mesa sin analítica (base) = total del JSON", suma["base"], d["bytes_de_la_mesa_sin_analitica"])
for f in d["formas"]:
    prueba(f"Registros: forma {f['id']} = bytes de analítica del JSON", suma[f["id"]], f["bytes_analitica"])
    prueba(f"Registros: base + forma {f['id']} = total de la mesa del JSON", suma["base"] + suma[f["id"]], f["bytes_total"])

# 2) renglones de cada hoja
registros = sum(len(t["filas"]) for t in d["tablas_de_la_mesa"]) + sum(len(t["filas"]) for f in d["formas"] for t in f["tablas"])
columnas = sum(len(x["columnas"]) for t in d["tablas_de_la_mesa"] for x in t["filas"]) + sum(len(x["columnas"]) for f in d["formas"] for t in f["tablas"] for x in t["filas"])
indices = sum(len(x["indices"]) for t in d["tablas_de_la_mesa"] for x in t["filas"]) + sum(len(x["indices"]) for f in d["formas"] for t in f["tablas"] for x in t["filas"])
pasos = sum(max(1, len(p["escribe"])) for p in d["pasos"])
renglones = {w.title: w.max_row - 1 for w in wb.worksheets}
prueba("renglones de Registros", renglones["Registros"], registros)
prueba("renglones de Columnas", renglones["Columnas"], columnas)
prueba("renglones de Índices", renglones["Índices"], indices)
prueba("renglones de Pasos", renglones["Pasos"], pasos)
prueba("hojas en orden", [w.title for w in wb.worksheets], ["Resumen", "Pasos", "Registros", "Columnas", "Índices", "Cómo se midió"])
prueba("Columnas: la suma de bytes de las columnas de la primera fila de la sesión es 71", sum(r[6] for r in wb["Columnas"].iter_rows(min_row=2, values_only=True) if r[2] == "sesion_grupal#1"), 71)
prueba("los códigos de evento están en el JSON y en la hoja", [c for c in d["codigos_de_evento"].values()] == ["scan", "menu_view", "dish_view", "search", "filter", "item_add"] and any(r[1] == "item_add" for r in wb["Cómo se midió"].iter_rows(values_only=True)), True)
prueba("primera fila congelada en las hojas de datos", all(wb[n].freeze_panes == "A2" for n in ("Pasos", "Registros", "Columnas", "Índices")), True)

# 3) fórmulas de «Resumen», recalculadas con LibreOffice (si existe)
soffice = shutil.which("soffice")
if soffice:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([soffice, "--headless", "--convert-to", "xlsx", "--outdir", tmp, str(AQUI / "2026-11-21-disco-por-registro.xlsx")], capture_output=True, check=True, timeout=180)
        r = load_workbook(Path(tmp) / "2026-11-21-disco-por-registro.xlsx", data_only=True)["Resumen"]
        prueba("Resumen (fórmulas recalculadas): mesa sin analítica", r["B6"].value, d["bytes_de_la_mesa_sin_analitica"])
        prueba("Resumen: analítica de hoy", r["B7"].value, d["formas"][0]["bytes_analitica"])
        prueba("Resumen: total de la mesa", r["B8"].value, d["formas"][0]["bytes_total"])
        prueba("Resumen: parte que es analítica", round(r["B9"].value, 6), round(d["formas"][0]["parte_analitica"], 6))
        for i, f in enumerate(d["formas"]):
            prueba(f"Resumen: forma {f['id']} (analítica y total)", (r.cell(12 + i, 2).value, r.cell(12 + i, 3).value), (f["bytes_analitica"], f["bytes_total"]))
        dif = next(fila[1].value for fila in r.iter_rows() if fila[0].value == "Diferencia")
        prueba("Resumen: diferencia con el informe (medido − informe)", dif, d["diferencia_con_el_informe"]["diferencia_bytes"])
else:
    print("(sin LibreOffice: no se recalcularon las fórmulas de Resumen)")
print(json.dumps(renglones, ensure_ascii=False))
print("Todas las comprobaciones pasan." if fallas == 0 else f"{fallas} comprobación(es) fallan.")
sys.exit(1 if fallas else 0)
