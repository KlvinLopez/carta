# Prototipo navegable de Carta

Exportado de Claude Design el 18 de septiembre de 2026. Se construyó en julio de 2026 a partir de las pantallas de Stitch.

Tiene **35 pantallas y 4 roles**: Comensal, Mesero, Capitán y Admin. El botón **Mapa**, arriba a la derecha, salta a cualquier pantalla.

## Cómo abrirlo

Con doble clic no carga, porque el navegador bloquea los archivos locales de `js/`. Hay que servirlo, por ejemplo con Node:

```bash
npx serve prototipo
```

y abrir `Prototipo Carta.html` en la dirección que aparezca. Necesita internet: React, Babel, los íconos y las fotos de Unsplash se cargan en línea.

## Qué contiene

| Archivo | Qué es |
|---|---|
| `Prototipo Carta.html` | Página de entrada |
| `js/` | Las pantallas, en React/JSX que el navegador compila al cargar |
| `carta-assets/` | Logo, colores y tipografías (DM Serif Display + DM Sans) |

## Diferencias con Stitch

- **Tipografía:** el prototipo usa DM Serif Display + DM Sans; Stitch y `docs/Carta_Design_System.md` usan Playfair Display + Inter.
- **Rol nuevo:** Capitán (pantallas C01–C08), que no existe en Stitch.
- **Espacios para fotos subidas** (logo del restaurante, foto del mesero): fuera de Claude Design se ven vacíos.

## Correcciones

- **Tipografía (septiembre 2026):** en la exportación de Claude Design, los archivos de DM Serif Display venían con los nombres intercambiados: el que decía "Regular" era la cursiva y viceversa. Por eso todos los títulos se veían en cursiva. Se renombraron `carta-assets/fonts/DMSerifDisplay-*.woff2` para que cada nombre coincida con su contenido. Ahora los títulos salen derechos y la cursiva solo aparece donde el código la pide.
