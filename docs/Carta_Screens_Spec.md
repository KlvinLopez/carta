# Carta — Especificación de Pantallas (16 pantallas core)

> Catálogo consolidado de las 16 pantallas iteradas con Google Stitch durante la fase de mockups (marzo–abril 2026). Cada pantalla incluye su propósito, audiencia, elementos clave y decisiones de producto que se tomaron durante la iteración.
>
> Este documento es la referencia para implementación en Flutter (frontend) y para el diseño de los endpoints del backend.

---

## Índice por audiencia

**Comensal (4):**
1. AR Landing — Cámara + dish detection
2. Dish Detail — Hero + 3D + ingredientes + reseñas
3. Full Menu — Categorías + filtros
4. Group Session — Coordinación de orden grupal

**Checkout (1):**
5. Pago + Propina + Invitar amigo

**Mesero (3):**
6. Mis Mesas — Vista de mesas asignadas
7. Detalle de Mesa — Estado + acciones
8. Mis Pedidos — Historial / cola del mesero

**Admin (8):**
9. Dashboard
10. Mi Menú
11. Pedidos (live + histórico)
12. Analytics
13. Configuración
14. Rendimiento del Equipo
15. Miembros del Equipo (onboarding mesero)
16. Dispositivos Autorizados

---

## COMENSAL

### Pantalla 1 — AR Landing
**Propósito:** primer contacto del comensal después de escanear el QR de la mesa. Muestra el feed de cámara con detección de platillo y CTA para abrir el menú.

**Elementos clave:**
- Cámara fullscreen con AR overlay (frosted glass).
- Pill flotante superior con nombre del restaurante + número de mesa.
- Dot indicator de detección ("Apunta a un platillo").
- CTA inferior: "Ver menú completo" (pill secundario) + icono cámara central.
- Estado anónimo (Capa 0) — sin login.

---

### Pantalla 2 — Dish Detail
**Propósito:** página estrella del platillo. El UI es marco, el platillo (3D + foto) es el arte.

**Elementos clave:**
- Hero con modelo 3D rotable que **rompe el contenedor** de la card.
- Nombre en `display-lg` Playfair Display.
- Precio en `title-md` Inter SemiBold (regla del precio).
- Chips de ingredientes con emojis (🌶️ 🌿 🧄).
- Sección de "Maridajes sugeridos" (cross-sell sutil).
- Reseñas con estrellas y comentarios cortos.
- Badge "Especialidad del Chef" en Dorado cuando aplica.
- CTA: "Agregar a mi orden" (pill primario gradiente Vino).

---

### Pantalla 3 — Full Menu
**Propósito:** menú completo navegable, alternativa al modo AR.

**Elementos clave:**
- Header con búsqueda y filtros (vegetariano, sin gluten, picante, precio).
- Categorías como secciones tonales (sin líneas).
- Cards de platillo con thumbnail 3D, nombre, precio, y micro-reseña.
- Badge "Nuevo" / "Chef's Special" en Dorado.
- Sticky bar inferior con resumen de orden actual.

---

### Pantalla 4 — Group Session
**Propósito:** **coordinación de orden grupal, NO bill splitting.** Cada comensal confirma su propia orden; cuando todos confirman, el sistema llama al mesero automáticamente.

**Elementos clave:**
- Avatares Discord-style apilados arriba (uno por comensal).
- Indicador de progreso: "3 de 4 listos".
- Lista de platillos con dueño visible — **otros comensales pueden tappear platillos para previsualizarlos en 3D**.
- Dos puntos de entrada:
  - Tap en avatar Discord → abre la orden de esa persona expandida.
  - Tap en barra inferior flotante → abre vista general sin nadie expandido.
- CTA contextual: "Confirmar mi orden" → cambia a "Esperando a Diego..." cuando ya confirmaste.
- **Sin botón de "dividir cuenta"** — la cuenta se gestiona en checkout.

---

## CHECKOUT

### Pantalla 5 — Pago + Propina + Invitar
**Propósito:** cierre de la experiencia. Pago, propina y feedback en una sola pantalla con scroll.

**Elementos clave:**
- Header con resumen de mesa y total.
- Sección "Tu orden" con cada platillo y su precio.
- Sección "Propina" con presets (10/15/20%) + custom — flujo tipo Uber/Rappi.
- **El comensal NO paga la comisión 1.8% — la paga el restaurante.** Esto debe ser transparente.
- Botón "Invitar a un amigo" (referral viral).
- Calificaciones por platillo (estrellas + comentario opcional).
- Calificación al mesero + tags rápidos (Atento, Eficiente, Conocedor) + caja de "Mensaje de agradecimiento".
- Botón warning/dispute discreto en esquina superior derecha.
- Pull-to-reload con física spring en el header.
- CTA primario: "Pagar $XXX MXN" gradiente Vino.

---

## MESERO

### Pantalla 6 — Mis Mesas
**Propósito:** vista principal del mesero — sus mesas asignadas en tiempo real.

**Elementos clave:**
- Grid de cards de mesa (compacto, densidad mayor permitida).
- Cada card: número de mesa, tiempo desde inicio, # comensales, estado (dot de color).
- Estados: Libre (gris), Activa (Dorado), Alerta/Demora (Vino).
- NFC/QR claim — el mesero puede "tomar" una mesa libre escaneando un tag.
- Reasignación dinámica — drag entre meseros (vista de admin).
- Header con nombre del mesero, turno actual, y mini KPIs (mesas activas / propinas hoy).

---

### Pantalla 7 — Detalle de Mesa
**Propósito:** todo lo que el mesero necesita saber sobre una mesa concreta.

**Elementos clave:**
- Header con # mesa, # comensales, tiempo de servicio.
- Lista de comensales con sus órdenes (estados: pidiendo, en cocina, servido).
- Acciones rápidas: marcar entregado, agregar extras, llamar a cocina.
- Botón "Solicitar limpieza" cuando la mesa se libera.
- CTA "Ir a checkout" cuando la mesa pide la cuenta.

---

### Pantalla 8 — Mis Pedidos
**Propósito:** historial / cola personal del mesero.

**Elementos clave:**
- Lista cronológica de pedidos del turno.
- Filtros: en curso, entregados, pagados.
- Métricas del turno: total servido, propinas acumuladas, tiempo promedio por mesa.
- Insights de performance (preview, expandido en Pantalla 14 para admin).

---

## ADMIN

### Pantalla 9 — Dashboard
**Propósito:** vista ejecutiva del restaurante.

**Elementos clave:**
- Header con nombre del restaurante + selector de fecha.
- Alertas críticas **directamente debajo de la fecha** (no al fondo).
- KPIs en `display-md` Playfair: ventas hoy, # órdenes, satisfacción promedio, **duración promedio de mesa** (no "tiempo promedio orden", no "scans").
- Quick actions más pequeñas y debajo del nombre del restaurante.
- Gráfica de ventas por hora (paleta Vino + Dorado).
- Top platillos del día.

---

### Pantalla 10 — Mi Menú
**Propósito:** gestión del menú — CRUD de platillos.

**Elementos clave:**
- Lista de categorías colapsables.
- Cards de platillo editables inline (precio, disponibilidad).
- Drag-to-reorder.
- Botón flotante: "Agregar platillo" → wizard con foto, descripción, ingredientes, captura 3D (fotogrametría móvil).
- Toggle de disponibilidad rápido (sold out → off).

---

### Pantalla 11 — Pedidos
**Propósito:** vista live + histórica de pedidos. **Dinámica:** cuando se entra desde "Mis Mesas" se filtra por esa mesa; cuando se entra directo se muestran todos.

**Elementos clave:**
- Header con tabs: En curso / Histórico.
- Cards de pedido con # mesa, comensales, items, tiempo, estado.
- Estados especiales:
  - Mesa 12 con "Demorada en cocina" (badge Vino).
  - Mesa 9 con "Pagada" + CTA "Marcar limpia" (no "Entregado").
- Filtros por fecha, mesa, mesero.
- Acción de agregar extras post-servicio.
- Integración con gateway de pago (1.8% comisión, paga el restaurante).
- Flujo de propina tipo Uber/Rappi.
- Feature de "invitar amigo" cross-promoción.

---

### Pantalla 12 — Analytics
**Propósito:** métricas profundas para el dueño / gerente.

**Elementos clave:**
- Tabs: Ventas / Platillos / Comensales / Equipo.
- Heatmap de horas pico.
- Cohort de comensales recurrentes (Capa 1 + Capa 2).
- Conversión de scan AR → orden.
- Comparativo vs período anterior.
- Export a CSV / PDF.

---

### Pantalla 13 — Configuración
**Propósito:** ajustes del restaurante.

**Elementos clave:**
- Información general (nombre, dirección, horarios, fotos).
- Mesas y áreas (salón, terraza).
- Métodos de pago aceptados.
- Branding (logo, colores secundarios — sin romper la paleta Carta).
- Integraciones (POS, contabilidad).
- Pull-to-reload con spring.

---

### Pantalla 14 — Rendimiento del Equipo
**Propósito:** insights para el admin sobre performance de meseros — para upskilling, bonos, reseñas.

**Elementos clave:**
- Lista de meseros con métricas: mesas atendidas, propina promedio, satisfacción, tiempo de respuesta.
- Tags de feedback de comensales agregados (Atento ⭐ x47, Eficiente ⭐ x32...).
- Comparativos del equipo.
- CTA: "Reconocer" (envía thank-you al mesero) o "Programa de mejora".

---

### Pantalla 15 — Miembros del Equipo (Onboarding Mesero)
**Propósito:** gestión de meseros del restaurante. **El mesero es dueño de su perfil (modelo Airbnb host)** — el admin no llena el formulario del mesero.

**Elementos clave:**
- **Meseros activos arriba** con avatar, nombre, estado (estrella ⭐ Dorado para top performer, dot Vino para activo, X gris para inactivo).
- **Sección QR abajo** — código QR para que el mesero escanee con su propio dispositivo.
- **Tres flujos del QR:**
  - **Enterprise (red de franquicias):** admin de tier superior asigna desde la red. No se hace aquí.
  - **Mesero existente:** escanea QR → su perfil Carta se vincula automáticamente al restaurante.
  - **Mesero nuevo:** escanea QR → abre formulario de registro en su dispositivo, crea su perfil Carta.
- **SMS fallback** (input de teléfono compacto, pequeño).
- **El admin nunca llena el form del mesero.**

---

### Pantalla 16 — Dispositivos Autorizados
**Propósito:** gestión de dispositivos donde se ejecuta la app de mesero. **Regla: un dispositivo activo por mesero a la vez.**

**Elementos clave:**
- Resumen superior: 3 activos / 1 bloqueado / 4 en turno.
- **Sección "Del Restaurante":**
  - iPad Air (Salón Principal) con sesión actual.
  - iPad Mini (Terraza) con sesión actual.
  - Tablets compartidas — meseros cambian con PIN.
- **Sección "Personales de Meseros":**
  - iPhone 14 Pro · Carlos R. (activo).
  - Samsung S24 · Mariana L. (activa).
  - iPhone 11 · Luis M. (bloqueado, border Vino).
  - Una persona = un dispositivo personal.
- **Card informativa al fondo:** "¿Cómo funciona el flujo PIN?" — explica que tablets compartidas usan PIN para switchear meseros.
- Acciones por dispositivo: bloquear, desautorizar, ver historial.

---

## Reglas transversales aplicadas en las 16 pantallas

1. **No-Line Rule** — sin bordes 1px para seccionar.
2. **Crema base + Vino + Dorado** — paleta consistente.
3. **Playfair Display + Inter** — siempre.
4. **Deep Charcoal #1A1A1A** — nunca negro puro.
5. **Radius mínimo 20px** — excepto botones pill.
6. **Spring animations** — sin slides iOS estándar.
7. **Bottom sheets** — no modales centrados.
8. **Comisión 1.8%** — siempre transparente, paga el restaurante.
9. **Modelo de mesero portable** — el mesero es Airbnb-host, dueño de su perfil.
10. **Un dispositivo personal por mesero** — tablets compartidas usan PIN.

---

*Última actualización: abril 2026 — tras completar las 16 iteraciones con Stitch.*
