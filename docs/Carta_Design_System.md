# Carta — Design System: "The Digital Sommelier"

> Sistema de diseño oficial de Carta. Esta es la fuente de verdad visual para todas las pantallas (comensal, mesero, admin) y para cualquier mockup generado en Stitch, Figma o implementado en código (Flutter / web).
>
> Este documento se construyó iterativamente con Stitch durante la fase de mockups (16 pantallas) y consolida las decisiones que tomamos respecto a color, tipografía, jerarquía, profundidad y componentes.

---

## 1. North Star Creativo
**"The Digital Sommelier"** — un sistema que tiende un puente entre la calidez táctil de un comedor con estrella Michelin y la precisión etérea de la realidad aumentada.

Nos alejamos del estética "utility app" y nos movemos hacia una experiencia de **Curador Digital**. Para lograrlo, rechazamos las cuadrículas rígidas y boxy de los grids móviles tradicionales y abrazamos el **Editorialismo Orgánico**: una filosofía de layout caracterizada por white space generoso, asimetría intencional y elementos "flotantes" que parecen descansar sobre una superficie líquida.

Mezclando la limpieza de plataformas de viajes premium (Airbnb) con la magia inmersiva de AR (Pokémon GO), nos aseguramos de que la interfaz nunca compita con la comida — la **enmarca**.

---

## 2. Color & Filosofía de Superficies

La paleta está enraizada en herencia y lujo. Usamos una base "Crema" para evitar la frialdad estéril del blanco puro, en pareja con "Vino" para una elegancia autoritativa, y "Dorado" como acento de prestigio.

### Tokens base
| Token | Hex | Uso |
|---|---|---|
| `surface` (Crema) | `#FEF9F1` | El "mantel" de la app — fondo base |
| `surface-container-low` | `#F8F1E5` | Agrupaciones de contenido (categorías de menú) |
| `surface-container-lowest` | `#FFFFFF` | Cards primarias interactivas (Featured Dish) |
| `surface-container-high` | `#F1E8D7` | Chips, badges, fondos secundarios |
| `primary` (Vino) | `#4F1728` | CTA principal, hero headers |
| `primary-container` | `#6B2D3E` | Gradiente con `primary`, estados activos |
| `tertiary` (Dorado) | `#B8860B` | Highlights — Chef's Specials, rewards, estados activos |
| `on-surface` (Deep Charcoal) | `#1A1A1A` | Texto principal — **nunca usar `#000000`** |
| `on-surface-variant` | `#5B4A3D` | Texto secundario, labels |
| `outline-variant` | `rgba(91,74,61,0.15)` | Ghost border (a 15% opacidad) cuando se requiere por accesibilidad |

### La regla "No-Line"
**Mandato estricto:** los borders sólidos de 1px están **prohibidos** para seccionar o contener.

Las fronteras se definen mediante:
1. **Tonal Shifts:** colocando una card `surface-container-low` sobre un piso `surface`.
2. **Negative Space:** usando la escala de spacing para crear "contenedores invisibles".
3. **Depth:** usando sombras suaves y ambientales para implicar un borde sin dibujarlo.

### Jerarquía & Anidamiento de Superficies
Trata el UI como una pila física de papel fino y vidrio esmerilado:

- **Capa base:** `surface` — el "mantel" de la app.
- **Capa secundaria:** `surface-container-low` — para contenido agrupado (categorías de menú).
- **Capa flotante:** `surface-container-lowest` — reservada para cards interactivas primarias (e.g., Featured Dish).
- **The Glass Rule:** para cualquier UI que se superponga al feed de cámara AR, usar `surface` semi-transparente (60–80% opacidad) con `backdrop-blur` de 20–40px. Esto crea un efecto "frosted glass" que mantiene el foco en el modelo 3D pero asegura legibilidad.

### Texturas de firma
Los CTA principales y headers hero deben usar un **gradiente lineal sutil** desde `primary` (#4F1728) a `primary-container` (#6B2D3E). Esto agrega "alma" y previene que los tonos profundos del Vino se sientan planos o "muddy" en pantallas OLED.

---

## 3. Tipografía

Escala tipográfica de alto contraste para crear una sensación editorial. La interacción entre serif (Playfair Display) y sans-serif (Inter) crea un diálogo entre tradición y tecnología.

### Familias
- **Display & Headlines — Playfair Display** (serif elegante; pesos 400 Regular y 700 Bold)
  - Tracking: **-1% a -2%** para un look editorial premium más apretado.
  - Usar `display-lg` para nombres de platillos, `headline-md` para títulos de sección.
- **Body & UI — Inter** (sans-serif moderna, variable font 300–700)
  - Para descripciones, precios, labels funcionales.
  - `body-lg` es el workhorse.

### Escala
| Token | Familia | Tamaño / Peso | Uso |
|---|---|---|---|
| `display-lg` | Playfair Display Bold | 48 / 56 | Hero — nombre de platillo |
| `display-md` | Playfair Display Bold | 36 / 44 | Títulos hero secundarios |
| `headline-md` | Playfair Display Bold | 28 / 36 | Títulos de sección |
| `headline-sm` | Playfair Display Regular | 22 / 30 | Subtítulos editoriales |
| `title-md` | Inter SemiBold | 18 / 26 | **Precios**, títulos de card |
| `body-lg` | Inter Regular | 16 / 24 | Body principal |
| `body-md` | Inter Regular | 14 / 22 | Body secundario |
| `label-md` | Inter Medium | 13 / 18 | Chips, etiquetas |

### Regla del Precio
Los precios siempre se renderizan en `title-md` (Inter) con peso ligeramente más pesado que el body circundante para asegurar escaneabilidad instantánea sin romper el flujo elegante.

---

## 4. Elevación & Profundidad

La profundidad se logra mediante **Tonal Layering**, no líneas estructurales.

### Principio de Layering
Coloca una card `surface-container-lowest` sobre un fondo `surface-container-low`. El sutil shift en "cremosidad" provee suficiente contraste para que el ojo humano perciba jerarquía sin necesidad de un stroke.

### Sombras Ambientales
Para elementos "flotantes" (FAB, modal AR expandido), usa una sombra ultra-difusa:

```
0px 20px 40px rgba(29, 28, 23, 0.06)
```

Notar el uso de una **sombra tintada** (con el color `on-surface`) en vez de negro neutro. Esto imita la luz natural reflejándose en una superficie cálida.

### The Ghost Border
Si una frontera es requerida por accesibilidad (e.g., un input field), usa el token `outline-variant` a 15% de opacidad. Debe **sentirse, no verse**.

---

## 5. Componentes

### Botones
- **Primary:** pill-shaped (`rounded-full`), gradiente Vino. Texto `on-primary` (blanco), centrado.
- **Secondary:** pill-shaped, fondo `surface-container-highest` con texto `on-surface`. Sin border.
- **Interacción:** "Spring" animations (stiffness 300, damping 20) para todas las pulsaciones — emulando la sensación táctil "bouncy" de Pokémon GO.

### Ingredient Chips
- **Visual:** `radius-md`. Background: `surface-container-high`.
- **Contenido:** en vez de bullets, usa un emoji de cabeza (🌶️ 🌿 🧄) seguido por `label-md`. Esto agrega magia juguetona moderna a una lista que de otra forma sería seca.

### AR Glass Overlays
- Usado específicamente cuando el usuario está viendo modelos 3D de comida.
- **Estilo:** `surface` color a 70% opacidad + `backdrop-filter: blur(24px)`.
- **Edges:** `radius-xl` (32px) para que los elementos digitales se sientan suaves y aproximables.

### Cards & Lists
- **Regla estricta:** **sin líneas divisorias**. Separa items usando 16px o 24px de white space vertical.
- **Image Focus:** las fotos de comida y modelos 3D deben "romper el contenedor". Permitir que los modelos 3D se superpongan al borde de una card para crear sensación de espacio tridimensional.

### Bottom Sheets (iOS 17 style)
- Drag handle pequeño y centrado en la parte superior.
- Esquinas superiores con `radius-xl` (32px).
- Backdrop oscurecido con blur — no opaco, para mantener contexto del fondo.

### Group Avatars (Discord-style)
- Para sesiones grupales (Pantalla 4): círculos pequeños (32px), con stroke `surface-container-lowest` de 2px para separación visual contra el fondo. Tap → expandir el order de esa persona.

---

## 6. Animación & Movimiento

- **Spring physics** (stiffness 300, damping 20) para pulsaciones de botón y aparición de elementos.
- **Scale-fade** para transiciones de pantalla — escala 0.96 → 1.0 con opacidad 0 → 1, ~250ms.
- **Micro-celebraciones (Duolingo-style):** confetti suave + spring scale para confirmaciones (orden enviada, pago exitoso).
- **AR loading:** wireframe shimmer del modelo 3D mientras carga, no spinners genéricos.
- **Pull-to-reload con física:** stretch del header cuando el usuario hace swipe down (Pantalla 13).

**Don't:** transiciones slide estándar de iOS. Usa scale-fade y spring transforms para mantener la magia.

---

## 7. Do's & Don'ts

### Do
- **Do** usar márgenes asimétricos. Una descripción de platillo puede estar más indentada que el título para crear un look editorial "ragged".
- **Do** priorizar assets 3D de alta calidad. El UI es el marco; la comida es el arte.
- **Do** usar Dorado (`#B8860B`) como highlight **muy esporádicamente** — solo para rewards, "Chef's Specials", o estados activos.
- **Do** dejar respirar las pantallas. Si dudas, agrega más white space.

### Don't
- **Don't** usar 100% negro (`#000000`). Siempre usar Deep Charcoal `#1A1A1A` para texto.
- **Don't** usar esquinas afiladas. Todo debe tener un radius mínimo de 20px excepto botones pill.
- **Don't** apretar información. Si una pantalla se siente cargada, aumenta la ratio background-a-componente. **El silencio es lujo.**
- **Don't** usar transiciones slide estándar. Usa scale-fade y springs.
- **Don't** dibujar bordes 1px para seccionar.

---

## 8. Aplicación por Audiencia

### Comensal (Capa 0/1/2)
- Editorialismo orgánico al máximo, mucho white space.
- Hero del platillo manda; AR siempre a un tap.
- Bottom sheets para acciones, NO modales centrados.

### Mesero (operativo)
- Mantener la estética pero **densidad mayor permitida** — un mesero necesita ver 8 mesas a la vez.
- Cards más compactas, pero la regla No-Line sigue aplicando.
- Estados de mesa con dot de color (Dorado para activa, Vino para alerta, gris para libre).

### Admin (gestión)
- Dashboard editorial pero con datos densos.
- KPIs en `display-md` Playfair, valores en Inter SemiBold.
- Gráficas con paleta de marca (Vino + Dorado + neutros cálidos), nunca colores sintéticos.

---

## 9. Referencias visuales

| Inspiración | Qué tomamos |
|---|---|
| **Airbnb** | Editorial layouts, fotografía hero, white space, asymmetric grids |
| **Pokémon GO** | Spring animations, AR overlays, "magic" tactile feedback |
| **iOS 17** | Bottom sheets, rounded corners, blur surfaces |
| **Discord** | Group avatars apilados, presence dots |
| **Duolingo** | Micro-celebraciones, dopamina suave |
| **The Infatuation / NYT Cooking** | Tipografía editorial serif + sans pairing |

---

*Última actualización: abril 2026 — consolidado tras 16 pantallas iteradas con Stitch.*
