"""Escribe 2026-11-21-disco-por-registro.xlsx a partir de 2026-11-21-disco-por-registro.json (ninguna cifra a mano: todo sale del JSON; los totales
son fórmulas de Excel). Uso, desde la raíz del repositorio:
    uv run --no-project --with openpyxl python docs/research/2026-11-21-disco-por-registro-xlsx.py
Hojas: Resumen · Pasos · Registros · Columnas · Índices · Cómo se midió.
"""

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

AQUI = Path(__file__).resolve().parent
d = json.loads((AQUI / "2026-11-21-disco-por-registro.json").read_text())
FECHA = d["version"][:10]
NEGRITA = Font(bold=True)
ENCABEZADO = PatternFill("solid", fgColor="F3E9DC")
TITULO = Font(bold=True, size=14)

wb = Workbook()


def hoja(nombre, encabezados, anchos, primera=False):
    ws = wb.active if primera else wb.create_sheet()
    ws.title = nombre
    ws.append(encabezados)
    for c in ws[1]:
        c.font = NEGRITA
        c.fill = ENCABEZADO
        c.alignment = Alignment(vertical="top", wrap_text=True)
    for i, a in enumerate(anchos, start=1):
        ws.column_dimensions[get_column_letter(i)].width = a
    ws.freeze_panes = "A2"
    return ws


# ---- renglones (de todas las formas): la mesa «base» una vez y cada forma de guardar la analítica con sus filas
registros = []  # (forma, tabla, fila)
for t in d["tablas_de_la_mesa"]:
    for f in t["filas"]:
        registros.append(("base", t["tabla"], f))
for forma in d["formas"]:
    for t in forma["tablas"]:
        for f in t["filas"]:
            registros.append((forma["id"], t["tabla"], f))

# ---------------------------------------------------------------- Resumen (se llena al final: necesita las filas de «Registros»)
ws_res = hoja("Resumen", ["Concepto", "Valor", "Nota"], [58, 18, 90], primera=True)

# ---------------------------------------------------------------- Pasos
ws_pasos = hoja(
    "Pasos",
    ["Paso", "Quién", "Qué hace", "Forma", "Tabla", "Registro (id)"],
    [8, 14, 80, 36, 20, 26],
)
for p in d["pasos"]:
    for e in p["escribe"] or [{"forma": "", "tabla": "", "fila": ""}]:
        ws_pasos.append([p["id"], p["quien"], p["que_hace"], e["forma"], e["tabla"], e["fila"]])

# ---------------------------------------------------------------- Registros
ws_reg = hoja(
    "Registros",
    [
        "Forma",
        "Tabla",
        "Registro (id)",
        "Paso",
        "Bytes de datos",
        "Bytes de índices",
        "Total (bytes)",
        "Cabecera (bytes)",
        "Relleno (bytes)",
        "Puntero de línea (bytes)",
    ],
    [36, 20, 26, 8, 14, 16, 14, 16, 15, 20],
)
for i, (forma, tabla, f) in enumerate(registros, start=2):
    ws_reg.append(
        [
            forma,
            tabla,
            f["id"],
            f["paso"],
            f["bytes_datos"],
            f["bytes_indices"],
            f"=E{i}+F{i}",
            f["cabecera_bytes"],
            f["relleno_bytes"],
            f["puntero_de_linea_bytes"],
        ]
    )
ws_reg.auto_filter.ref = f"A1:J{len(registros) + 1}"
ULT = len(registros) + 1
REG = f"Registros!$A$2:$A${ULT}"
TOT = f"Registros!$G$2:$G${ULT}"

# ---------------------------------------------------------------- Columnas
ws_col = hoja(
    "Columnas",
    [
        "Forma",
        "Tabla",
        "Registro (id)",
        "Columna",
        "Tipo",
        "Valor de ejemplo",
        "Bytes",
        "Relleno antes (bytes)",
    ],
    [36, 20, 26, 22, 26, 40, 9, 20],
)
n_col = 0
for forma, tabla, f in registros:
    for c in f["columnas"]:
        ws_col.append(
            [
                forma,
                tabla,
                f["id"],
                c["nombre"],
                c["tipo"],
                c["valor"] if c["valor"] is not None else "(nulo)",
                c["bytes"],
                c["relleno_antes"],
            ]
        )
        n_col += 1
ws_col.auto_filter.ref = f"A1:H{n_col + 1}"

# ---------------------------------------------------------------- Índices
ws_idx = hoja(
    "Índices",
    [
        "Forma",
        "Tabla",
        "Registro (id)",
        "Índice",
        "Bytes de la entrada (con su puntero de línea)",
        "Tupla de índice (bytes)",
    ],
    [36, 20, 26, 40, 22, 18],
)
n_idx = 0
for forma, tabla, f in registros:
    for ix in f["indices"]:
        ws_idx.append([forma, tabla, f["id"], ix["nombre"], ix["bytes"], ix["tupla_de_indice"]])
        n_idx += 1
ws_idx.auto_filter.ref = f"A1:F{n_idx + 1}"

# ---------------------------------------------------------------- Cómo se midió
ws_met = hoja("Cómo se midió", ["Qué", "Consulta o método"], [48, 140])
ws_met.append(["Fecha", FECHA])
ws_met.append(["Versión del modelo", d["version"]])
ws_met.append(["Base de medición", d["medido_con"]["base"]])
ws_met.append(["Extensión", d["medido_con"]["extension"]])
ws_met.append(["Nota", d["medido_con"]["nota"]])
ws_met.append([])
ws_met.append(["Consultas", ""])
ws_met.cell(ws_met.max_row, 1).font = NEGRITA
for c in d["medido_con"]["consultas"]:
    ws_met.append([c["que"], c["sql"]])
ws_met.append([])
ws_met.append(
    ["Códigos de evento (tipo smallint de las tablas propuestas evento_dia y platillo_dia)", ""]
)
ws_met.cell(ws_met.max_row, 1).font = NEGRITA
for cod, nombre in sorted(d["codigos_de_evento"].items(), key=lambda x: int(x[0])):
    ws_met.append([int(cod), nombre])
ws_met.append([])
ws_met.append(["Formas propuestas (notas)", ""])
ws_met.cell(ws_met.max_row, 1).font = NEGRITA
for forma in d["formas"]:
    for nota in forma["notas"]:
        ws_met.append(
            [
                forma["id"]
                + (" (propuesta)" if forma["estado"] == "propuesta" else " (base actual)"),
                nota,
            ]
        )
for fila in ws_met.iter_rows(min_row=2):
    for c in fila:
        c.alignment = Alignment(vertical="top", wrap_text=True)

# ---------------------------------------------------------------- Resumen: contenido
ws = ws_res
ws["A1"] = "Disco por registro: una mesa de tres comensales (Ana, Beto y Carla)"
ws["B1"] = None
ws["C1"] = None
ws["A1"].font = TITULO
ws["A1"].fill = PatternFill()
ws["B1"].fill = PatternFill()
ws["C1"].fill = PatternFill()
ws.append([d["ejemplo"]["descripcion"], "", ""])
ws.append(
    [
        f"Restaurante: {d['ejemplo']['restaurante']}. Medido con PostgreSQL local y la extensión pageinspect ({d['version']}, {FECHA}). Datos sintéticos.",
        "",
        "",
    ]
)
ws.append([])
ws.append(["Totales de la mesa", "Bytes", ""])
for c in ws[5]:
    c.font = NEGRITA
    c.fill = ENCABEZADO
ws.append(
    [
        "Mesa sin analítica (sesión, miembros, órdenes, platillos, comanda y llamada)",
        f'=SUMIFS({TOT},{REG},"base")',
        "Igual en todas las formas de guardar la analítica.",
    ]
)
ws.append(
    [
        "Analítica de hoy (una fila por evento)",
        f'=SUMIFS({TOT},{REG},"hoy")',
        f"{len(d['formas'][0]['tablas'][0]['filas'])} eventos de ejemplo, 4 por comensal.",
    ]
)
ws.append(["Total de la mesa", "=B6+B7", ""])
ws.append(
    [
        "Parte que es analítica",
        "=B7/B8",
        "Parte de los bytes de la mesa que escribe la analítica de hoy.",
    ]
)
ws["B9"].number_format = "0.0%"
ws.append([])
ws.append(
    [
        "Comparación de las formas de guardar la analítica",
        "Bytes de analítica",
        "Total de la mesa (bytes)",
        "Analítica frente a hoy",
        "Mesa entera frente a hoy",
        "Estado",
    ]
)
for c in ws[11]:
    c.font = NEGRITA
    c.fill = ENCABEZADO
    c.alignment = Alignment(wrap_text=True, vertical="top")
fila0 = 12
for i, forma in enumerate(d["formas"]):
    r = fila0 + i
    ws.append(
        [
            forma["nombre"],
            f'=SUMIFS({TOT},{REG},"{forma["id"]}")',
            f"=$B$6+B{r}",
            f"=B{r}/$B${fila0}-1",
            f"=C{r}/$C${fila0}-1",
            "propuesta" if forma["estado"] == "propuesta" else "base actual",
        ]
    )
    ws[f"D{r}"].number_format = "0.0%"
    ws[f"E{r}"].number_format = "0.0%"
r = fila0 + len(d["formas"]) + 1
ws.append([])
ws.append(["Conciliación con el informe (historia del disco)", "Bytes", ""])
for c in ws[ws.max_row]:
    c.font = NEGRITA
    c.fill = ENCABEZADO
rc = ws.max_row + 1
ws.append(
    [
        "El informe da (valores esperados por mesa de tres)",
        d["diferencia_con_el_informe"]["informe_bytes"],
        "1.3 comandas, 0.3 llamadas y 11.56 eventos, con bytes por fila = tabla ÷ filas de una copia de 18,000 sesiones.",
    ]
)
ws.append(
    [
        "Esta medición da (una mesa concreta: total)",
        "=B8",
        "1 comanda, 1 llamada y 12 eventos, medidos registro por registro.",
    ]
)
ws.append(
    [
        "Diferencia",
        f"=B{rc + 1}-B{rc}",
        "La diferencia está en la analítica: ver las líneas siguientes.",
    ]
)
for texto in d["diferencia_con_el_informe"]["explicacion"]:
    ws.append([texto, "", ""])
    ws.cell(ws.max_row, 1).alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=3)
    ws.row_dimensions[ws.max_row].height = 62
ws.append([])
ws.append(
    [
        "Conciliación tabla por tabla",
        "Filas (informe)",
        "Bytes por fila (informe)",
        "Bytes (informe)",
        "Filas (medido)",
        "Bytes por fila (medido)",
        "Bytes (medido)",
    ]
)
for c in ws[ws.max_row]:
    c.font = NEGRITA
    c.fill = ENCABEZADO
    c.alignment = Alignment(wrap_text=True, vertical="top")
for t in d["diferencia_con_el_informe"]["conciliacion_por_tabla"]:
    ws.append(
        [
            t["tabla"],
            t["informe_filas"],
            t["informe_bytes_por_fila"],
            t["informe_bytes"],
            t["medido_filas"],
            t["medido_bytes_por_fila"],
            t["medido_bytes"],
        ]
    )
for col, a in zip("DEFG", (22, 22, 22, 18)):
    ws.column_dimensions[col].width = a
ws.column_dimensions["B"].width = 20
ws.column_dimensions["C"].width = 28
for fila in ws.iter_rows(min_row=1, max_row=4):
    for c in fila:
        c.alignment = Alignment(wrap_text=False, vertical="top")
for r_ in range(2, ws.max_row + 1):
    if (
        ws.cell(r_, 2).value is not None
        and ws.cell(r_, 2).number_format == "General"
        and isinstance(ws.cell(r_, 2).value, (int, float))
    ):
        ws.cell(r_, 2).number_format = "#,##0"

SALIDA = AQUI / "2026-11-21-disco-por-registro.xlsx"
wb.save(SALIDA)
# Con LibreOffice se recalcula el libro y se vuelve a guardar con los valores de las fórmulas a la vista (los visores que no calculan, como las vistas previas,
# mostrarían las celdas vacías); las fórmulas, los filtros y los anchos se conservan.
soffice = shutil.which("soffice")
if soffice:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([soffice, "--headless", "--convert-to", "xlsx", "--outdir", tmp, str(SALIDA)], capture_output=True, check=True, timeout=180)
        shutil.copyfile(Path(tmp) / SALIDA.name, SALIDA)
print(json.dumps({"hojas": {w.title: w.max_row - 1 for w in wb.worksheets}}, ensure_ascii=False))
