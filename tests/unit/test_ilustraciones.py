"""T-1.4: la tabla de 20 ilustraciones por categoría (02 §8, `app/services/ilustraciones.py`)."""

import pytest

from app.services.ilustraciones import CLAVES, GENERAL, PALABRAS_POR_CLAVE, clave_para_categoria


def test_son_veinte_claves_validas_para_la_columna() -> None:
    assert len(CLAVES) == 20
    assert len(set(CLAVES)) == 20
    assert GENERAL in CLAVES
    for clave in CLAVES:
        assert clave.isascii() and clave.islower() and len(clave) <= 40  # VARCHAR(40)


def test_ninguna_palabra_elige_dos_claves() -> None:
    palabras = [p for lista in PALABRAS_POR_CLAVE.values() for p in lista]
    assert len(palabras) == len(set(palabras))


@pytest.mark.parametrize(
    ("nombre", "clave"),
    [
        ("Entradas", "entradas"),
        ("Sopas y cremas", "sopas"),
        ("Ensaladas", "ensaladas"),
        ("Tacos y quesadillas", "tacos"),
        ("Tamales", "antojitos"),
        ("Tortas", "tortas"),
        ("Hamburguesas", "hamburguesas"),
        ("Pizzas al horno", "pizzas"),
        ("Pastas", "pastas"),
        ("Lasaña", "pastas"),
        ("Cortes a la parrilla", "carnes"),
        ("Platos fuertes", "general"),
        ("Sin carne", "general"),
        ("Sin carne y con pollo", "aves"),
        ("No lácteos: postres", "postres"),
        ("Hot dogs", "hamburguesas"),
        ("Del mar", "mariscos"),
        ("Menú ejecutivo", "general"),
        ("Pollo", "aves"),
        ("Mariscos", "mariscos"),
        ("Cócteles de camarón", "mariscos"),
        ("Vegetariano", "vegetariano"),
        ("Desayunos", "desayunos"),
        ("Postres de la casa", "postres"),
        ("Pan dulce", "panaderia"),
        ("Aguas frescas", "bebidas"),
        ("Café y postres", "cafe"),
        ("Tés", "cafe"),
        ("Coctelería", "cocteles"),
        ("Especialidades", "general"),
        ("  CAFÉS  ", "cafe"),
        ("Qwerty", "general"),
        ("", "general"),
        (None, "general"),
        ("🌮🌮", "general"),
    ],
)
def test_la_primera_palabra_reconocida_decide(nombre: str | None, clave: str) -> None:
    assert clave_para_categoria(nombre) == clave


def test_toda_clave_se_alcanza_con_su_propio_nombre() -> None:
    for clave, palabras in PALABRAS_POR_CLAVE.items():
        assert clave_para_categoria(palabras[0]) == clave
