# Carta — Design Brief para Google Stitch
**Versión:** 1.0
**Uso:** Pegar este documento completo como contexto en Google Stitch antes de pedir cada pantalla.

---

## 1. ¿Qué es Carta?

Carta es una plataforma de menú inteligente para restaurantes. Reemplaza el menú QR genérico con una experiencia de realidad aumentada donde los comensales pueden visualizar los platillos en 3D sobre su mesa antes de ordenar. Es la interfaz entre el comensal y la cocina.

**Audiencia primaria:** Comensales en restaurantes premium y modernos en México/LATAM, 20–45 años, familiarizados con apps como Airbnb, Uber Eats y TikTok.

**Propuesta de valor:** Escaneas el QR de la mesa → tu cámara se activa → ves los platillos en 3D flotando sobre la mesa → los pides directo desde tu teléfono.

---

## 2. Referentes de Diseño

| Referente | Qué tomamos de él |
|-----------|------------------|
| **Airbnb** | Estética general: limpio, minimalista, tipografía generosa, espaciado amplio, tarjetas con bordes redondeados, fotografía dominante |
| **Pokémon GO** | La experiencia AR: cámara como fondo, objetos 3D superpuestos, UI flotante sobre la cámara, sensación de "magia" al ver algo en tu mundo real |
| **iPhone / iOS 17** | Bordes muy redondeados, transiciones fluidas, bottom sheets con swipe, haptics implícitos, minimalismo de controles |
| **Discord** | Mini avatares circulares de los miembros de grupo, burbujas de presencia flotantes |
| **Duolingo** | Micro-animaciones celebratorias, personalidad cálida pero premium |

**NO queremos:** Diseño de menú de restaurante tradicional. Nada de listas con viñetas, tablas, o estética de PDF digital.

---

## 3. Paleta de Colores

### Tema Predeterminado: Vino + Crema
```
Fondo principal:     #F5F0E8  (Crema — warm beige)
Acento primario:     #6B2D3E  (Vino — deep burgundy)
Acento dorado:       #B8860B  (Dorado — gold)
Texto principal:     #1A1A1A  (Casi negro)
Texto secundario:    #7A7A7A  (Gris medio)
Blanco:              #FFFFFF
Superficie card:     #FFFFFF  con sombra muy suave
Overlay oscuro:      rgba(0,0,0,0.82)
```

### Temas adicionales del restaurante (el restaurante elige uno)
```
Verde:   #2D5A27 sobre #F0F5EE
Azul:    #1B3A6B sobre #EEF2F8
Ocre:    #8B6914 sobre #F5F2EA
Café:    #4A2C17 sobre #F5EDE8
```

> **Nota para Stitch:** Genera TODAS las pantallas usando el tema Vino + Crema como predeterminado. Menciona en las notas que el restaurante puede cambiar el acento a cualquiera de los 5 temas.

---

## 4. Tipografía

**Fuente principal (Headings):** Playfair Display — serif elegante, peso Regular (400) y Bold (700), serifs finos y definidos. Google Fonts, open source.
**Fuente secundaria (Body / UI):** Inter — sans-serif moderna, altamente legible, variable font (pesos 300–700). Google Fonts, open source.

**Jerarquía tipográfica:**
```
H1 / Nombre del platillo:  24–28px, peso bold, color Vino #6B2D3E
H2 / Nombre sección/categ: 18–20px, peso semibold, color #1A1A1A
Body / Descripción:        15–16px, peso regular, color #4A4A4A
Caption / Precio, calorías: 13–14px, peso medium, color Vino o Dorado
Label / Badges, tags:      11–12px, uppercase, tracking amplio
```

---

## 5. Principios de Diseño

1. **Bordes muy redondeados** — Todos los cards, modales, botones y overlays: `border-radius: 20–28px`. Nunca diseño cuadrado.
2. **Fotografía / 3D dominante** — Las imágenes de platillos ocupan al menos 60% del card. La foto manda.
3. **Espacio en blanco generoso** — No saturar. Cada elemento respira.
4. **Fondo crema, no blanco** — La app no se siente clínica, se siente acogedora y premium.
5. **Animaciones en todo** — Transiciones de pantalla suaves (slide up, fade). Cards que hacen spring al tocar. El 3D rota constantemente con easing suave.
6. **Bottom sheet universal** — Los menús secundarios, detalles de platillos y opciones aparecen como bottom sheets que sube desde abajo, nunca como páginas nuevas.
7. **Emojis como iconografía** — Los ingredientes y alérgenos se muestran con su emoji correspondiente (🌶 🥛 🐟 🌾) en lugar de bullets o texto plano.
8. **Sin listas con viñetas** — Las descripciones son texto corrido, fluido, casi poético. Los ingredientes son chips con emoji, no listas.

---

## 6. Componentes Globales

### Header (aparece en todas las pantallas)
```
Altura: 60px
Fondo: transparente sobre cámara / Crema en modo menú
Izquierda: ☰ (hamburger, 3 líneas) — abre panel de configuración/navegación
Centro: Logo del restaurante (si tiene plan Pro) O wordmark "carta" con isotipo propio
Derecha: Avatar circular del usuario (32px) — si no está logueado, ícono genérico
Bajo el logo: chip pequeño con nombre del restaurante en caption size
```

### Botón Principal (CTA)
```
Color: Vino #6B2D3E
Texto: Blanco, peso semibold
Border-radius: 50px (pill shape)
Padding: 16px 32px
Sombra: box-shadow suave en Vino con 20% opacity
Estado hover/press: escala a 0.96, color oscurece 10%
```

### Card de Platillo
```
Border-radius: 20px
Fondo: Blanco
Sombra: 0 4px 20px rgba(0,0,0,0.08)
Foto: ocupa 65% del card, border-radius en esquinas superiores
Info: Nombre (H1), descripción corta (2 líneas max, body), precio (caption Vino)
Badge: "Chef's Pick" o "Nuevo" — chip pequeño en esquina superior izquierda de la foto
```

### Chip de Ingrediente / Alérgeno
```
Fondo: #F5F0E8 (crema oscuro)
Borde: 1px solid rgba(107,45,62,0.15)
Border-radius: 50px
Contenido: emoji + texto corto  (🌶 Picante, 🥛 Lácteos)
Fuente: 12px, color #4A4A4A
```

### Avatar de Comensal (grupo)
```
Forma: círculo 36px
Borde: 2px solid blanco
Foto de perfil o iniciales sobre fondo Vino
Sombra: pequeña, suave
Animación: bounce al unirse a la sesión
```

---

## 7. Pantallas — COMENSAL

### PANTALLA 1: Splash de Entrada (post-escaneo QR)

**Contexto:** El usuario acaba de escanear el QR de la mesa. La web carga.

**Layout:**
- Fondo: Crema #F5F0E8
- Centro: Logo del restaurante (grande, ~140px) con animación de fade-in + scale up suave
- Abajo del logo: nombre del restaurante en H2 Vino
- Abajo: tagline pequeño en caption gris "Bienvenido a [Nombre Restaurante]"
- Loading indicator: dots animados en color Vino, muy sutiles
- Transición de salida: fade out + slide up hacia la siguiente pantalla

**Notas:** No hay botón. La transición es automática (1.5s) hacia la pantalla de permiso de cámara.

---

### PANTALLA 2: Solicitud de Permiso de Cámara

**Contexto:** El sistema pide acceso a la cámara para la experiencia AR.

**Layout:**
- Fondo: Crema
- Ilustración central: Ícono de cámara estilizado con destellos/estrellas alrededor, estética de ilustración vectorial premium, colores Vino y Dorado
- Título H1: "Ve tu menú cobrar vida"
- Descripción body: "Permite el acceso a tu cámara para ver los platillos en 3D sobre tu mesa, como si estuvieran ahí."
- Botón CTA principal: "Activar cámara" (pill, Vino)
- Link secundario debajo: "Prefiero ver el menú sin AR" (texto, color gris, subrayado)

**Notas:** El link de "sin AR" lleva a la Pantalla 5 (modo menú clásico).

---

### PANTALLA 3: Pantalla Principal — Modo AR (Core Experience)

**Contexto:** Pantalla principal de uso. La cámara está activa.

**Layout — Tres zonas:**

**Zona Superior (header flotante, ~60px):**
- Semitransparente con blur (glassmorphism suave sobre la cámara)
- Izquierda: ☰ blanco
- Centro: Logo del restaurante blanco o en Crema
- Derecha: Avatar del usuario circular (36px)
- Si hay sesión grupal activa: fila de mini-avatares circulares (Discord style) aparece justo debajo del header, flotando sobre la cámara. Máximo 4 visibles + "+N" si hay más.

**Zona Media (~75% de pantalla): Vista de cámara en vivo**
- La cámara ocupa todo el fondo
- Sobre la vista de cámara flotan los modelos 3D de los platillos del Top 3 (anchored a la superficie de la mesa via AR)
- Cada modelo 3D tiene:
  - Nombre del platillo en label pill blanco/crema flotando encima
  - Precio pequeño en chip Vino debajo del nombre
  - Animación: rotación lenta y constante (15rpm)
  - Al tocar el modelo: hace bounce + escala + abre el bottom sheet de detalle

**Zona Inferior — Bottom Sheet (25% visible, expandible):**
- Pill handle gris en la parte superior (indica que es expandible)
- Flecha ↑ centrada encima del handle
- Título: "Top del Chef" en H2
- 3 cards horizontales en scroll horizontal (o grid 1x3):
  - Para usuarios Capa 2 Premium: "Gemma sugiere para ti" badge sobre el card
  - Cada card: foto platillo + nombre + precio + chip de alérgenos
- Al hacer **swipe up** o tocar ↑: el bottom sheet sube y ocupa 100% → cámara se cierra → se muestra el menú completo (Pantalla 4)
- Fondo del bottom sheet: Crema #F5F0E8
- Borde superior: border-radius 28px 28px 0 0

---

### PANTALLA 4: Menú Completo (Bottom Sheet Expandido)

**Contexto:** El usuario hizo swipe up. Ya no hay cámara. Ve el menú completo.

**Layout:**
- Fondo: Crema
- Header: igual al global pero ahora sobre fondo crema
- Debajo del header: buscador pill (lupa + "Buscar en el menú...")
- Categorías: Tab bar horizontal con scroll, pastillas/chips con borde Vino. La activa: fondo Vino, texto blanco. Las inactivas: fondo transparente, borde Vino, texto Vino.
  - Ejemplo: [Todos] [Entradas] [Platos Fuertes] [Postres] [Bebidas]
- Cards de platillos: grid de 2 columnas, cards con foto grande (65% del card), nombre, precio, emojis de ingredientes principales
- Badge en esquina de card:
  - "Chef 👨‍🍳" para el Top 3
  - "🔥 Popular" si tiene muchas órdenes
  - "✨ Nuevo" si fue añadido recientemente
- Floating Action Button (FAB) abajo a la derecha: ícono de cámara con label "Ver en AR" — al tocar regresa a Pantalla 3
- Si hay ítems en la orden: bottom bar permanente con "Tu carta · 3 platillos · $485 MXN →"

---

### PANTALLA 5: Detalle de Platillo — Overlay (Modo AR)

**Contexto:** El usuario tocó un modelo 3D en AR, o un card del bottom sheet.

**Layout:**
- Fondo: la cámara en vivo, oscurecida con overlay rgba(0,0,0,0.75)
- Centro: el modelo 3D del platillo, grande (~280px), rotando lentamente
- Fondo del modelo: ninguno, flota sobre el overlay oscuro
- Debajo del modelo, bottom sheet redondeado (28px) en Crema que sube desde abajo con spring animation:
  - Nombre del platillo: H1 Vino
  - Precio: H2 Dorado
  - Chips de ingredientes: fila scrollable horizontal con emojis (🧅 Cebolla • 🫚 Aceite de oliva • 🌿 Albahaca)
  - Descripción: body text, máximo 3 líneas, estilo redacción elegante (no bullet points)
  - Alérgenos: chips rojos pequeños si aplica (🥛 Lácteos, 🌾 Gluten)
  - Calorías y nivel de picante: iconos pequeños en fila
  - Si usuario es Premium: badge "✓ Apto para ti" o "⚠ Contiene [alérgeno]" según su perfil
- Botón CTA: "Agregar a mi carta" (pill Vino, full width)
- Toque en overlay oscuro fuera del sheet: cierra el overlay, regresa a AR
- X en esquina superior derecha del sheet: igual, cierra

---

### PANTALLA 6: Detalle de Platillo — Modo Sin AR

**Contexto:** El usuario está en el menú clásico (Pantalla 4) y tocó un card.

**Layout:**
- Fondo: overlay oscuro rgba(0,0,0,0.82) sobre el menú
- El card se anima expandiéndose desde su posición hasta ocupar ~85% de pantalla (spring animation)
- Dentro del card expandido (border-radius 28px):
  - Parte superior: modelo 3D rotando sobre fondo muy oscuro/negro, altura ~45%
  - El modelo puede ser tocado para interactuar (rotate manually)
  - Flechas ← → en los lados del modelo (semitransparentes) para pasar al platillo anterior/siguiente
  - Abajo: nombre H1, descripción body, chips de ingredientes, alérgenos, calorías
  - Precio en H2 Dorado
  - Botón "Agregar a mi carta" full width Vino
- Al tocar afuera: card hace scale-down de regreso a su posición original y desaparece. Regresa al menú.

---

### PANTALLA 7: Mi Orden (La "Carta" personal)

**Contexto:** Resumen de lo que el usuario va a pedir.

**Layout:**
- Bottom sheet que sube a pantalla completa
- Título: "Mi carta 🍽" en H1
- Lista de ítems: cada ítem como row con foto pequeña (50px), nombre, cantidad +/- , precio
- Si hay sesión grupal: sección separada "Lo que piden en la mesa" mostrando el pedido de los otros comensales (avatares + sus ítems)
- Subtotal sticky en la parte inferior
- Botón: "Confirmar orden" pill Vino
- Nota para el mesero: campo de texto opcional

---

### PANTALLA 8: Login / Registro

**Contexto:** El usuario quiere crear perfil (para guardar preferencias, unirse a sesión grupal, o activar Premium).

**Layout:**
- Bottom sheet modal (no pantalla completa, ~70% de altura)
- Fondo: Crema
- Handle pill en la parte superior
- Logo de Carta centrado (pequeño, 48px)
- Título: "Únete a Carta"
- Subtítulo: "Guarda tus preferencias y pide con tu mesa"
- Botón Google: [G] Continuar con Google (borde gris, fondo blanco)
- Botón Apple: [🍎] Continuar con Apple (fondo negro, texto blanco)
- Divider "o" entre botones
- Caption abajo: "Al continuar aceptas los Términos de uso · Privacidad"
- Toque en overlay: cierra sin forzar registro

---

### PANTALLA 9: Upgrade Premium (Capa 2)

**Contexto:** El usuario quiere activar las features de AI y perfil alimentario.

**Layout:**
- Bottom sheet grande (~85%)
- Fondo: degradado sutil de Crema a Vino muy claro en la parte superior
- Ícono premium: estrella dorada animada con destellos
- Título: "Carta Premium ✨"
- Precio: "$29 MXN / mes" en grande, Vino
- Feature list (NO bullets, son rows con ícono emoji + descripción):
  - 🤖 Recomendaciones personalizadas con IA
  - 🚫 Filtros de alérgenos automáticos
  - 📊 Tu historial de platillos favoritos
  - 🎯 "Apto para ti" en cada platillo
- Botón CTA: "Activar Premium" pill Vino
- Link: "Ver qué incluye el plan gratuito" texto gris

---

## 8. Pantallas — RESTAURANTE (Admin Panel)

> Estas pantallas son para el dueño/gerente del restaurante. Se acceden desde un dispositivo de escritorio/tablet, no desde el QR del comensal.

### PANTALLA 10: Dashboard Principal

**Layout:**
- Sidebar izquierdo oscuro (~72px de ancho en estado colapsado): íconos de navegación en color Crema. Al expandir muestra labels. Secciones: Dashboard, Menú, Mesas, Promociones, Configuración.
- Área principal: fondo #F8F5F0 (crema más claro)
- Header área principal: "Buen día, [Nombre Restaurante] 👋" + fecha/hora
- Métricas en cards flotantes (4 en fila):
  - Escaneos hoy / Escaneos esta semana / Hora pico / % conversión
  - Cada card: valor grande en Vino, label pequeño en gris, micro-gráfico sparkline
- Gráfico: "Platillos más vistos vs. más pedidos" (bar chart horizontal, barras en Vino y Dorado)
- Tabla inferior: actividad de mesas en tiempo real

### PANTALLA 11: Gestión de Menú

**Layout:**
- Tabla de platillos con columnas: Foto (thumb 40px), Nombre, Precio, Estado (activo/pausado toggle), Vistas, Conversión, Acciones (editar/pausar)
- Botón "+" flotante en esquina inferior derecha: "Agregar platillo"
- Modal de importación PDF: 4 pasos visualizados con stepper horizontal (Subir → OCR → Revisar → Publicar)
- Filtros: categoría, estado, tiene modelo 3D (sí/no)

### PANTALLA 12: Vista de Mesas en Vivo

**Layout:**
- Grid de cards de mesas (6–12 cards)
- Cada card de mesa:
  - Número de mesa en grande
  - Estado con color de borde: vacía (gris), navegando (Dorado), ordenando (Verde), llamando mesero (Rojo pulsante)
  - Si activa: avatares de los comensales en fila, tiempo en mesa, total estimado
  - Botón "Atender" si está llamando al mesero (estado rojo)

### PANTALLA 13: Configuración / Branding

**Layout:**
- Sección "Apariencia":
  - Selector de tema: 5 círculos de color (Vino, Verde, Azul, Ocre, Café) — el seleccionado tiene borde y check mark
  - Upload de logo: drag & drop área con preview
  - Preview en vivo: mini mockup del celular mostrando cómo se ve el menú con el tema elegido
- Sección "Códigos QR":
  - Grid de QRs por mesa, botón descargar cada uno
- Sección "Plan actual":
  - Badge del plan, fecha de renovación, botón upgrade

---

## 9. Interacciones y Animaciones Clave

| Acción | Animación |
|--------|-----------|
| Escaneo QR → Splash | Fade in logo con spring scale |
| Splash → Cámara | Slide up + fade |
| Toque en modelo 3D AR | Bounce scale 1.0→1.15→1.0 + glow ring |
| Bottom sheet expand | Spring animation 350ms ease-out |
| Card de platillo en menú | Expand desde posición con spring 400ms |
| Avatar nuevo en grupo | Pop in con bounce desde arriba |
| Agregar a carta | Checkmark animado + confetti micro |
| Cambio de categoría | Slide horizontal del contenido |
| Cámara AR off/on | Fade cross-dissolve con la vista de menú |
| Login exitoso | Slide up del perfil + wave de color Vino |

---

## 10. Guía de Uso en Stitch

### Cómo pedirle cada pantalla a Stitch:

**Ejemplo de prompt por pantalla:**

> "Usando el brief de diseño de Carta que te compartí, genera la **Pantalla 3: Pantalla Principal en Modo AR**. Dispositivo: iPhone 15 Pro (390x844px). Muestra la vista de cámara activa con 3 modelos 3D de platillos flotando sobre una mesa de restaurante. El header tiene glassmorphism suave. Abajo, el bottom sheet en crema con el Top 3 del Chef. Una fila de 3 mini avatares flotantes bajo el header indica sesión grupal activa."

### Orden recomendado de generación:
1. Pantalla 3 (AR principal) — es el core, define el tono visual
2. Pantalla 4 (Menú expandido) — define el sistema de cards
3. Pantalla 5 (Detalle en AR)
4. Pantalla 6 (Detalle sin AR)
5. Pantalla 1 (Splash)
6. Pantalla 2 (Permiso cámara)
7. Pantalla 7 (Mi orden)
8. Pantalla 8 (Login)
9. Pantalla 9 (Premium upgrade)
10. Pantalla 10 (Dashboard admin)
11. Pantallas 11–13 (Admin: menú, mesas, config)

### Tokens a usar en todos los prompts:
> "Estilo: Airbnb + Pokémon GO. Paleta: fondo Crema #F5F0E8, acento Vino #6B2D3E, dorado #B8860B. Bordes muy redondeados (28px). Minimalista, premium, hogareño pero elegante. Mucha animación implícita. Sin listas con viñetas, sin diseño de menú tradicional."

---

## 11. Archivos a Adjuntar en Stitch

### OBLIGATORIOS (adjunta antes de empezar):
| Archivo | Por qué |
|---------|---------|
| Este documento (STITCH_BRIEF.md) | Contexto completo del diseño |
| `docs/Carta_Ideacion_v3.md` sección 2.1 (Branding) | Paleta de colores oficial + temas |
| Logo de Carta (cuando esté listo) | Para que use el logo real |
| Referencia de fuente tipográfica | **Playfair Display** (headings) + **Inter** (body) — Google Fonts |

### OPCIONALES (contexto adicional):
| Archivo | Por qué |
|---------|---------|
| `wireframes/wireframe_comensal.jsx` | Flujo y funcionalidad actual de referencia |
| `wireframes/wireframe_restaurante.jsx` | Admin panel actual de referencia |
| Screenshots de Airbnb y Pokémon GO | Referencias visuales directas |

### NO adjuntar:
- El código de FastAPI/backend (irrelevante para diseño)
- Los archivos de Terraform
- Versiones anteriores de ideación (v1, v2)

---

## 12. Checklist de Diseño — Revisión por Pantalla

Antes de aprobar cada pantalla de Stitch, verifica:

- [ ] ¿El fondo es Crema (#F5F0E8), no blanco puro?
- [ ] ¿Los bordes son muy redondeados (≥20px)?
- [ ] ¿El color de acento es Vino (#6B2D3E)?
- [ ] ¿No hay listas con viñetas en las descripciones?
- [ ] ¿Los ingredientes usan emojis, no bullets?
- [ ] ¿Hay espacio en blanco suficiente? ¿Respira el diseño?
- [ ] ¿Las fotos de platillos son dominantes (≥60% del card)?
- [ ] ¿El estilo se siente como Airbnb + algo mágico (AR)?
- [ ] ¿Los botones son pill shape (border-radius 50px)?
- [ ] ¿La tipografía de headings usa Playfair Display (serif, elegante)?
- [ ] ¿El body text usa Inter (sans-serif, limpia, legible)?
