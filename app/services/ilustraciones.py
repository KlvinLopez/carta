"""Ilustración de respaldo por categoría (02 §8, prioridad 2; T-1.4). Sin FastAPI.

Un platillo sin foto muestra la ilustración de su categoría: un juego fijo de 20 claves
(`CLAVES`) que el frontend resuelve a sus archivos estáticos. La clave se calcula del
**nombre** de la categoría (el operador escribe «Tacos al pastor», «Bebidas frías»,
«Postres de la casa»…) y se guarda en `platillo.ilustracion_clave` al crear el platillo, al
cambiarlo de categoría y al renombrar su categoría (`app.services.menu`).

Cómo se elige: el nombre se normaliza (minúsculas, sin acentos, sin signos), se parte en
palabras y gana **la primera palabra** que pertenece a alguna clave (singular o plural:
«sopas» y «sopa», «postres» y «postre»). «Tacos y quesadillas» → `tacos`; «Café y postres»
→ `cafe`; nada reconocible o sin categoría → `general`. Es determinista y no consulta nada.
"""

from __future__ import annotations

import re
import unicodedata

GENERAL = "general"

# Clave → palabras (en singular, sin acentos) que la eligen. El orden no importa: decide el
# orden de las palabras del nombre. Ninguna palabra aparece en dos claves. «Cóctel» no está:
# en una marisquería es de camarón y en un bar es un trago («Cócteles de camarón» se resuelve
# por «camarón»; «Coctelería», por su palabra).
PALABRAS_POR_CLAVE: dict[str, tuple[str, ...]] = {
    "entradas": ("entrada", "botana", "aperitivo", "entrante", "compartir", "starter"),
    "sopas": ("sopa", "caldo", "crema", "consome", "pozole", "menudo", "soup"),
    "ensaladas": ("ensalada", "salad", "bowl"),
    "tacos": ("taco", "taqueria", "quesadilla", "gringa", "burrito"),
    "antojitos": (
        "antojito",
        "tamal",
        "tamale",
        "sope",
        "gordita",
        "tlayuda",
        "enchilada",
        "chilaquil",
        "tostada",
        "garnacha",
        "empanada",
    ),
    "tortas": ("torta", "sandwich", "sandwiche", "baguette", "cemita", "panini", "wrap"),
    "hamburguesas": ("hamburguesa", "burger", "hotdog", "dogo"),
    "pizzas": ("pizza", "calzone", "pizzeta"),
    "pastas": ("pasta", "spaghetti", "espagueti", "lasana", "ravioli", "fettuccine", "risotto"),
    "carnes": (
        "carne",
        "corte",
        "parrilla",
        "asado",
        "res",
        "cerdo",
        "steak",
        "grill",
        "fuerte",
        "plato",
        "principal",
    ),
    "aves": ("ave", "pollo", "pechuga", "pavo", "pato", "alita", "wing", "chicken"),
    "mariscos": (
        "marisco",
        "pescado",
        "camaron",
        "ceviche",
        "aguachile",
        "pulpo",
        "sushi",
        "seafood",
        "fish",
    ),
    "vegetariano": ("vegetariano", "vegetariana", "vegano", "vegana", "veggie", "vegetal"),
    "desayunos": ("desayuno", "almuerzo", "huevo", "brunch", "breakfast"),
    "postres": ("postre", "dulce", "pastel", "helado", "nieve", "dessert", "reposteria"),
    "panaderia": ("pan", "panaderia", "bolleria", "concha", "croissant", "galleta"),
    "bebidas": ("bebida", "refresco", "agua", "jugo", "licuado", "malteada", "limonada", "drink"),
    "cafe": ("cafe", "cafeteria", "te", "infusion", "chocolate", "coffee", "espresso"),
    "cocteles": (
        "cocteleria",
        "cocktail",
        "trago",
        "bar",
        "cerveza",
        "vino",
        "mezcal",
        "tequila",
        "licor",
        "destilado",
        "mixologia",
    ),
    GENERAL: ("general", "otro", "varios", "especialidad", "casa"),
}

CLAVES: tuple[str, ...] = tuple(PALABRAS_POR_CLAVE)
"""Las 20 claves que el frontend sabe dibujar (02 §8)."""

_CLAVE_DE_PALABRA: dict[str, str] = {
    palabra: clave for clave, palabras in PALABRAS_POR_CLAVE.items() for palabra in palabras
}
_NO_PALABRA = re.compile(r"[^a-z0-9]+")


def _normalizar(texto: str) -> list[str]:
    """«Cafés & Tés» → `["cafes", "tes"]`: minúsculas, sin acentos ni signos."""
    sin_acentos = "".join(
        c for c in unicodedata.normalize("NFKD", texto.casefold()) if not unicodedata.combining(c)
    )
    return [p for p in _NO_PALABRA.split(sin_acentos) if p]


def _clave_de(palabra: str) -> str | None:
    """La palabra tal cual o sin su plural (`-es`, `-s`): «tamales», «postres», «tes»."""
    formas = [palabra]
    if palabra.endswith("es"):
        formas.append(palabra[:-2])
    if palabra.endswith("s"):
        formas.append(palabra[:-1])
    for forma in formas:
        if forma in _CLAVE_DE_PALABRA:
            return _CLAVE_DE_PALABRA[forma]
    return None


def clave_para_categoria(nombre: str | None) -> str:
    """La clave de ilustración para una categoría (o `general` si no hay o no se reconoce)."""
    if not nombre:
        return GENERAL
    for palabra in _normalizar(nombre):
        clave = _clave_de(palabra)
        if clave is not None:
            return clave
    return GENERAL
