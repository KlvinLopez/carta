# Cartas de prueba para la importación de menús (T-1.8, ADR-014)

Dos clases de archivos:

| Clase | Dónde | ¿En git? | Para qué |
|---|---|---|---|
| **Sintéticas, nuestras** | `la-ceiba.pdf`, `taqueria-el-paso.pdf` (las genera `scripts/generar_cartas_prueba.py`) | Sí | Pruebas unitarias y de integración deterministas; la semilla de desarrollo |
| **Reales, de terceros** | `externas/` (las descarga `scripts/descargar_cartas.py`) | **No** (carpeta ignorada) | Prueba `live` con la API real y evaluación de precisión |

Las cartas reales son documentos públicos con derechos de autor de cada restaurante. Se usan sólo como datos de prueba locales; no se redistribuyen en este repositorio. Si un restaurante pide retirar la suya, se quita de la lista.

## Cartas reales (noviembre de 2026)

| Archivo | Restaurante | Qué prueba | Páginas | Texto extraíble |
|---|---|---|---|---|
| `externas/maximo-bistrot.pdf` | Máximo Bistrot, CDMX (abril 2026) | **Caso límite:** 50 páginas, un platillo por página, menú de degustación. Debe rechazarse por exceder 30 páginas (AC-25.1) o recortarse con aviso | 50 | parcial |
| `externas/mexico-lindo-orizaba.pdf` | México Lindo y Qué Rico, Orizaba (dic. 2024) | **Carta escaneada:** sin texto, el modelo debe leer las imágenes; precios en pesos | 6 | no |
| `externas/palacio-cantina.pdf` | La Cantina Palacio (Gastronomía Palacio de Hierro) | Diseño editorial con texto, varias secciones, página de presentación sin platillos (debe omitirse con aviso) | 9 | sí |

Pendientes de encontrar: dos cartas más de restaurantes de servicio completo en CDMX con layout a dos columnas y variantes de precio. Candidatas: las que aporten los primeros restaurantes piloto (con permiso).

## Cartas sintéticas

| Archivo | Qué prueba |
|---|---|
| `la-ceiba.pdf` | Dos columnas; precios `$145`, `60` (sin símbolo), `M.P.`, `chico 45 / grande 65`; platillo de temporada; nota de alérgenos en el pie; página de bebidas |
| `taqueria-el-paso.pdf` | Una columna con puntos guía; precios sin símbolo; `45 / 70` (sencilla / con carne); combos; descripciones vacías |

## Precisión esperada (T-1.8)

Para cada carta hay (o habrá) un `<nombre>.esperado.json` con los platillos y precios anotados a mano. La prueba `live` exige ≥ 90 % de precios con confianza `alta` y correctos en las cartas con texto; en la escaneada se mide y se registra, sin umbral todavía.
