---
name: diseno-visual
description: Tokens, reglas y checklist del lenguaje visual de Carta ("The Digital Sommelier") para cualquier pantalla o componente del frontend. Úsala antes de escribir o revisar CSS/JSX en frontend/ o al evaluar una captura de pantalla de la app.
---

# /diseno-visual — The Digital Sommelier

La interfaz es el marco; la comida es el arte. Calidez de comedor fino con precisión digital. Fuente completa: `docs/Carta_Design_System.md` (con la tipografía corregida abajo) y el prototipo en `prototipo/` (`js/shared.jsx`, `carta-assets/colors_and_type.css`). Los componentes base ya viven en `frontend/src/compartido/componentes/` (`Boton`, `Chip`, `Tarjeta`, `HojaInferior`, `Avatar`) y el armazón de página en `frontend/src/compartido/pantalla/`: úsalos, no los reescribas.

## Tokens (`frontend/src/compartido/tokens.css`)

| Token | Valor | Uso |
|---|---|---|
| `--crema` | `#FEF9F1` | Fondo base. **Nunca blanco puro de fondo de página** |
| `--crema-baja` | `#F8F1E5` | Agrupaciones de contenido |
| `--superficie` | `#FFFFFF` | Tarjetas interactivas |
| `--vino` / `--vino-claro` | `#4F1728` / `#6B2D3E` | Primario; gradiente para el CTA principal |
| `--dorado` | `#B8860B` | Acento: destacados del chef, estados especiales. **Con mucha moderación** |
| `--carbon` | `#1A1A1A` | Texto principal. **Nunca `#000000`** |
| `--carbon-suave` | `#5B4A3D` | Texto secundario, etiquetas |
| `--radio` | `20px` mínimo; botones `9999px` | Todo contenedor |
| `--sombra` | `0 20px 40px rgba(29, 28, 23, 0.06)` | Sombra cálida, tintada |
| `--resorte` | rigidez 300, amortiguación 20 | Animaciones (p. ej. `cubic-bezier(.2,.9,.3,1.2)` o Framer Motion `spring`) |

## Tipografía

- **DM Serif Display** — títulos, nombres de platillo, cifras grandes. Archivos en `prototipo/carta-assets/fonts/` (ya corregidos: Regular es regular; la cursiva sólo donde se pide).
- **DM Sans** — cuerpo, interfaz, etiquetas. Precios en **DM Sans SemiBold**.
- Se sirven desde el propio dominio con `font-display: swap`; sin Google Fonts en producción.

## Reglas

1. **No-line:** prohibido usar bordes de 1 px para separar secciones. Se separa con cambio de tono (`--crema` → `--crema-baja`), espacio en blanco y sombra.
2. **Hojas inferiores** (estilo iOS 17) para acciones y detalles; no modales centrados.
3. **Transición** scale-fade (0.96 → 1.0, opacidad 0 → 1, ~250 ms) o resorte. Sin deslizamientos estándar.
4. **Teléfono primero.** Diseña a 390 px; escritorio sólo para el panel del operador. Áreas táctiles ≥ 44 px. Sin desplazamiento horizontal de página.
5. **Contraste AA** en texto e íconos de acción. Texto secundario `--carbon-suave` sobre `--crema` cumple; no uses grises más claros.
6. **El dorado es raro.** Un destacado por pantalla como máximo.
7. **Estados:** cada lista tiene estado vacío con ilustración y una frase; cada acción tiene estado de carga y de error en el lenguaje de la marca ("No encontramos esta mesa. Pide al personal que te comparta el QR.").
8. **Fotos:** proporción 4:3 en listas, 1:1 en miniaturas, `object-fit: cover`, carga diferida, *placeholder* con la ilustración de la categoría.
9. **Avatares** del grupo: círculos apilados con color estable por miembro, borde de 2 px `--crema` entre ellos (es la única excepción a no-line, porque separa figuras, no secciones).
10. **Sin estilos en línea** (`style={{…}}`): convención del proyecto para que todo lo visual viva en los módulos CSS (la CSP no restringe los estilos puestos por CSSOM, pero mezclar estilos en JSX rompe la trazabilidad de los tokens). Lo que varía (color del avatar, tamaño, tono) se expresa con clases del módulo CSS o atributos `data-*`.
11. **Chips tocables** miden 36 px visibles; el pseudo-elemento `::after` extiende el área táctil a 44 px sin engordar el chip. Un botón real siempre mide ≥ 44 px.
12. **Lo fijo va en un portal** (como `HojaInferior`) o fuera de cualquier elemento animado con `transform`: un `transform` residual (`animation-fill-mode: both`) convierte al ancestro en bloque contenedor y una barra `position: fixed; bottom: 0` queda fuera del viewport. `.pantalla` anima con `backwards`; no lo cambies a `both`.
13. **Hojas y foco:** al abrir, foco al diálogo sólo si no está ya dentro (deps `[abierta]`, nunca la lambda `onCerrar`); el resto de la página `inert`; Tab circula dentro; al cerrar el foco vuelve al disparador. `HojaInferior` ya lo hace: no reimplementes hojas.
14. **Dentro de una `Tarjeta` tocable** sí pueden ir chips o botones (es un `div role="button"`, no un `<button>`), pero un clic que nace en el control anidado no dispara la tarjeta. Nunca anides `<button>` dentro de `<button>`.

## Checklist antes de dar por terminada una pantalla

- [ ] Fondo `--crema`; ningún `#000` ni `#fff` como fondo de página
- [ ] DM Serif Display en títulos, DM Sans en el resto, precios SemiBold
- [ ] Ningún `border: 1px solid` separando secciones
- [ ] Ningún `style={{` en el JSX (`grep -rn "style={{" frontend/src` vacío)
- [ ] Texto sobre su fondo ≥ 4.5:1 (`esqueleto.test.ts` vigila los pares de los tokens; un color nuevo entra con su par)
- [ ] Ningún `position: fixed` dentro de `.pantalla`: barras al pie en un portal
- [ ] Radios ≥ 20 px; botones píldora
- [ ] Sombra cálida, no negra
- [ ] Estados vacío, cargando y error
- [ ] Probada a 390 px de ancho; áreas táctiles ≥ 44 px
- [ ] Contraste AA verificado (`axe` o Lighthouse accesibilidad ≥ 90)
- [ ] Captura de pantalla adjunta al PR

## Verificación

`npm --prefix frontend run build && node frontend/scripts/presupuesto.mjs` y Lighthouse móvil (rendimiento ≥ 85, accesibilidad ≥ 90) contra staging.

## Lecciones del panel del operador (T-1.10)

- Un `<Navigate replace>` y un `navigate()` propio disparados por el mismo cambio de estado se pisan (carrera: el árbol quedó vacío sólo cuando otra prueba corría antes). Deja que la redirección declarativa haga todo.
- Un estado de carga dentro de una pantalla que ya es `<main>` no usa `Cargando` (`<main>` anidado): usa el bloque `.centrado` con `role="status"`.
- Una pantalla que espera el primer estado de sesión no renderiza hasta que el proveedor emite: en pruebas, `await` la suscripción y emite (`iniciar`) antes de buscar elementos.
- Una sonda de pruebas que pinte la ruta (`useLocation`) no usa `<output>`: tiene rol `status` y rompe `getByRole('status')`; usa un `<span data-testid>`.
- Si el proveedor simulado completa el enlace y emite la sesión por su cuenta, no llames después a `iniciar(prov, null)`: su `emitir(null)` pisa la sesión recién llegada.
- Un guardia de presupuesto se prueba contra un `dist/` falso (`PRESUPUESTO_DIST`), no con una mutación manual: que la regex del código no vea una forma de import no basta, lo que vale es lo que acaba en el bundle inicial.

## Lecciones del asistente de alta (T-1.11)

- Pruebas de sondeo en vitest: `vi.useFakeTimers({ shouldAdvanceTime: true })` y `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`; sin `shouldAdvanceTime` los `findBy*` de Testing Library se cuelgan (no detecta los temporizadores falsos de vitest). Deja ±500 ms de margen en los límites de 3 s.
- Un hook de sondeo que conserva el último estado terminal (`fallido`) debe poder reiniciarse con la fila nueva (`reiniciar(nueva)`): sólo repetir el efecto dejaba la pantalla de error tras «Reintentar».
- Un `label` + `aria-label` con el mismo texto vuelve ambiguo `getByLabelText`: consulta por `getByRole('textbox' | 'spinbutton', { name })`.
- Capturas del asistente: página temporal de Vite fuera del repo (`captura.html` + `captura.tsx` con el servicio simulado), Playwright a 2x, y borrar el arnés antes del commit.
