"""Genera cartas de restaurante sintéticas en PDF para probar la importación (T-1.8).

Son nuestras (sin derechos de terceros) y reproducen a propósito lo que suele salir mal al leer
una carta real: dos columnas, precios con y sin "$", variantes "chico / grande", "M.P."
(precio de mercado), combos, una página de bebidas y notas de alérgenos.

Uso: uv run python scripts/generar_cartas_prueba.py
Salida: tests/fixtures/menus/la-ceiba.pdf y tests/fixtures/menus/taqueria-el-paso.pdf
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

DESTINO = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "menus"

# (categoría, [(nombre, descripción, precio o texto de precio)])
LA_CEIBA: list[tuple[str, list[tuple[str, str, str]]]] = [
    (
        "Para empezar",
        [
            ("Guacamole de la casa", "Aguacate, chile serrano, totopos de maíz azul", "$145"),
            (
                "Tostadas de atún",
                "Atún aleta amarilla, chipotle, aguacate, ajonjolí (3 pzas)",
                "$185",
            ),
            ("Esquites con tuétano", "Elote criollo, epazote, mayonesa de chile pasilla", "$120"),
            (
                "Sopa de tortilla",
                "Caldo de jitomate asado, queso panela, crema, chicharrón",
                "$110",
            ),
            ("Tuétanos a la leña", "Con salsa verde cruda y tortillas de maíz azul", "$210"),
        ],
    ),
    (
        "Platos fuertes",
        [
            (
                "Mole negro de Oaxaca",
                "Pierna de pato confitada, arroz blanco, plátano macho",
                "$385",
            ),
            (
                "Pescado zarandeado",
                "Robalo entero, adobo de chile guajillo, cebolla morada",
                "M.P.",
            ),
            (
                "Costilla braseada",
                "Reducción de tamarindo, puré de camote, cebollitas cambray",
                "$420",
            ),
            (
                "Chile en nogada",
                "Temporada · Picadillo de res y cerdo, nogada de Castilla, granada",
                "$360",
            ),
            ("Enchiladas suizas", "Pollo deshebrado, salsa verde cremosa, queso gratinado", "$215"),
            (
                "Pulpo a las brasas",
                "Papas cambray, pimentón de la Vera, alioli de chile de árbol",
                "$395",
            ),
            ("Milanesa de res", "Con frijoles refritos, arroz rojo y ensalada de nopales", "$245"),
        ],
    ),
    (
        "Postres",
        [
            ("Flan de cajeta", "Con nuez garapiñada", "$95"),
            ("Pastel de elote", "Helado de vainilla de Papantla", "$105"),
            ("Churros", "Chocolate de metate o cajeta (6 pzas)", "$90"),
        ],
    ),
    (
        "Bebidas",
        [
            ("Agua del día", "Jamaica, horchata o tamarindo", "chico 45 / grande 65"),
            ("Limonada", "Natural o mineral", "chico 55 / grande 75"),
            ("Café de olla", "Canela y piloncillo", "60"),
            ("Mezcal de la casa", "Espadín joven, Santiago Matatlán, 2 oz", "$140"),
            ("Cerveza artesanal", "Pregunte por la selección del mes", "95"),
        ],
    ),
]

TAQUERIA: list[tuple[str, list[tuple[str, str, str]]]] = [
    (
        "Tacos",
        [
            ("Pastor", "con piña, cebolla y cilantro", "22"),
            ("Suadero", "", "25"),
            ("Bistec", "", "28"),
            ("Campechano", "pastor + bistec", "30"),
            ("Costilla", "", "32"),
            ("Tripa", "doradita", "30"),
            ("Cecina enchilada", "", "35"),
        ],
    ),
    (
        "Especialidades",
        [
            ("Gringa", "tortilla de harina, queso, pastor", "65"),
            ("Alambre", "bistec, tocino, pimiento, cebolla, queso", "140"),
            ("Volcán", "tostada con queso gratinado y carne a elegir", "55"),
            ("Quesadilla", "maíz o harina; sencilla / con carne", "45 / 70"),
            ("Torta", "cualquier carne, frijol, aguacate, jitomate", "80"),
        ],
    ),
    (
        "Combos",
        [
            ("Combo 1", "5 tacos de pastor + refresco", "120"),
            ("Combo 2", "alambre para 2 + 2 refrescos", "220"),
        ],
    ),
    (
        "Bebidas",
        [
            ("Refresco", "600 ml", "35"),
            ("Agua fresca", "horchata, jamaica", "30"),
            ("Cerveza", "Victoria, Corona, Modelo", "45"),
        ],
    ),
]


def _encabezado(c: canvas.Canvas, titulo: str, subtitulo: str, ancho: float, alto: float) -> float:
    c.setFont("Times-Bold", 26)
    c.drawCentredString(ancho / 2, alto - 25 * mm, titulo)
    c.setFont("Helvetica", 10)
    c.drawCentredString(ancho / 2, alto - 32 * mm, subtitulo)
    return alto - 45 * mm


def _carta_dos_columnas(ruta: Path, titulo: str, subtitulo: str, secciones, pie: str) -> None:
    ancho, alto = letter
    c = canvas.Canvas(str(ruta), pagesize=letter)
    c.setTitle(titulo)
    margen = 18 * mm
    ancho_col = (ancho - 3 * margen) / 2
    y_inicial = _encabezado(c, titulo, subtitulo, ancho, alto)
    columnas = [margen, margen * 2 + ancho_col]
    col = 0
    y = y_inicial
    for categoria, platillos in secciones:
        alto_seccion = 12 * mm + len(platillos) * 13 * mm
        if y - alto_seccion < margen + 10 * mm:
            col += 1
            y = y_inicial
            if col > 1:
                c.setFont("Helvetica-Oblique", 8)
                c.drawCentredString(ancho / 2, margen, pie)
                c.showPage()
                y_inicial = _encabezado(c, titulo, subtitulo, ancho, alto)
                col, y = 0, y_inicial
        x = columnas[col]
        c.setFont("Times-Bold", 14)
        c.drawString(x, y, categoria.upper())
        y -= 8 * mm
        for nombre, descripcion, precio in platillos:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(x, y, nombre)
            c.setFont("Helvetica-Bold", 10)
            c.drawRightString(x + ancho_col, y, precio)
            if descripcion:
                c.setFont("Helvetica", 8)
                c.drawString(x, y - 4 * mm, descripcion[:70])
            y -= 13 * mm
        y -= 4 * mm
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(ancho / 2, margen, pie)
    c.showPage()
    c.save()


def _carta_una_columna(ruta: Path, titulo: str, subtitulo: str, secciones, pie: str) -> None:
    ancho, alto = letter
    c = canvas.Canvas(str(ruta), pagesize=letter)
    c.setTitle(titulo)
    margen = 22 * mm
    y = _encabezado(c, titulo, subtitulo, ancho, alto)
    for categoria, platillos in secciones:
        if y < margen + 40 * mm:
            c.showPage()
            y = _encabezado(c, titulo, subtitulo, ancho, alto)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(margen, y, categoria)
        y -= 9 * mm
        for nombre, descripcion, precio in platillos:
            c.setFont("Helvetica", 11)
            texto = nombre if not descripcion else f"{nombre} — {descripcion}"
            c.drawString(margen + 4 * mm, y, texto[:80])
            puntos = "." * 8
            c.drawRightString(ancho - margen, y, f"{puntos} {precio}")
            y -= 7 * mm
        y -= 5 * mm
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(ancho / 2, margen / 2, pie)
    c.showPage()
    c.save()


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    _carta_dos_columnas(
        DESTINO / "la-ceiba.pdf",
        "La Ceiba",
        "Cocina de origen · Roma Norte · Precios en pesos mexicanos, IVA incluido",
        LA_CEIBA,
        "Propina no incluida · Informe a su mesero sobre alergias: nuestros platillos pueden "
        "contener nuez, lácteos, gluten, huevo y mariscos.",
    )
    _carta_una_columna(
        DESTINO / "taqueria-el-paso.pdf",
        "Taquería El Paso",
        "Desde 1987 · Narvarte · Precios en pesos",
        TAQUERIA,
        "Precios sujetos a cambio sin previo aviso",
    )
    for archivo in ("la-ceiba.pdf", "taqueria-el-paso.pdf"):
        print(f"generado: {DESTINO / archivo}")


if __name__ == "__main__":
    main()
