# Carta v1 — Alcance

**Versión:** 1.0 · **Fecha:** 2 de noviembre de 2026

---

## 1. La pregunta de la v1 y cómo se mide

**Pregunta:** ¿un menú visual con orden compartida y comanda directa al personal mejora la experiencia de la mesa, y el restaurante lo adopta y lo conserva?

| # | Métrica | Definición | Meta | Fuente |
|---|---|---|---|---|
| M1 | Tasa de escaneo | Sesiones de mesa creadas ÷ mesas servidas (dato del restaurante) | ≥ 40 % | `evento_analitica` + reporte del restaurante |
| M2 | Exploración | Sesiones que abren ≥ 3 detalles de platillo ÷ sesiones | ≥ 50 % | `evento_analitica` |
| M3 | Tasa de orden | Sesiones que confirman orden ÷ sesiones | ≥ 25 % | `comanda` |
| M4 | Tiempo hasta comanda | Mediana desde el primer escaneo de la mesa hasta la comanda | medir, sin meta en v1 | `sesion_grupal`, `comanda` |
| M5 | Retención | Restaurantes activos a las 6 semanas | ≥ 70 % | manual |
| G1 | Comandas perdidas | Órdenes confirmadas que el personal no vio | 0 | `comanda` sin `atendida_en` > 10 min → alerta |
| G2 | Carga del menú | p75 hasta menú visible en 4G | ≤ 3 s | Lighthouse + campo |

El delta de ticket promedio (M4 del PRD) sale del alcance de la v1: sin pagos Carta no ve la cuenta, y pedirle al restaurante sus reportes de ventas es fricción para un piloto gratuito. Se retoma cuando haya cobro.

---

## 2. Roles de la v1

| Rol | Quién | Cómo entra | Qué puede hacer |
|---|---|---|---|
| **Comensal** | Cualquier persona en una mesa | Escanea el QR con la cámara; sin cuenta, sin instalar | Ver menú, filtrar, armar su orden, ver la de sus acompañantes, confirmar, llamar al mesero, ver el estado de su comanda |
| **Mesero** | Personal de piso | `/staff/<restaurante>`: elige su nombre y teclea su PIN | Ver mesas y su estado, ver y atender comandas y llamadas, marcar un platillo agotado, liberar una mesa |
| **Capitán** | Un mesero con la bandera `capitan` | Igual que el mesero | Todo lo del mesero + ver el resumen del turno, liberar cualquier mesa, pausar/activar platillos en bloque |
| **Operador** | Dueño o gerente | `/admin`: cuenta con Google o enlace por correo | Dar de alta el restaurante, importar el menú desde PDF, editar menú y fotos, mesas y QR, personal y PINs, ver pedidos en vivo |

El capitán **no tiene pantallas propias** (C01–C08 del prototipo): es la misma interfaz del mesero con opciones adicionales visibles. Ver [ADR-013](../mvp/adr/ADR-013-personal-con-pin.md).

---

## 3. Qué entra en la v1

### 3.1 Operador (restaurante)
- Alta self-service en un asistente: nombre, logo, subir PDF del menú → borrador extraído → revisar y corregir en una tabla → confirmar → cuántas mesas → PDF con los QR → personal con PIN → listo.
- Menú: categorías y platillos (crear, editar, reordenar, desactivar), fotos con guía de captura (miniatura y detalle generadas por el servidor), disponibilidad (agotado hoy).
- Mesas: crear, regenerar código, imprimir QR.
- Personal: nombres, rol mesero/capitán, PIN.
- Pedidos en vivo: la misma vista del personal, dentro del panel.
- Todo funciona desde el teléfono. El restaurante no necesita computadora.

### 3.2 Comensal
- Entrada por `/m/<codigo>`: nombre del restaurante, número de mesa, alias editable.
- Menú por categorías con foto o ilustración, búsqueda sin acentos, filtros por alérgeno y etiqueta (guardados sólo en el teléfono), aviso permanente de alérgenos, "Top 3 del chef".
- Detalle del platillo: foto grande, descripción, ingredientes, alérgenos, precio.
- Mi orden: cantidad, nota de 140 caracteres, subtotal; confirmar y deshacer.
- Sesión grupal: avatares, "3 de 4 listos", ver (no editar) la orden de otro.
- Estado tras confirmar: *enviada al mesero* → *en preparación* → *servida*.
- Llamar al mesero (1 por minuto).
- Funciona sin instalar nada, con pantallas de error (mesa inválida, sin conexión) en el lenguaje de la marca.

### 3.3 Personal
- Lista de mesas con estado (libre · armando · lista · atendida) y tiempo desde la comanda.
- Detalle de mesa: comanda por comensal, botones *atender* y *servida*.
- Llamadas con alerta sonora y visual.
- Marcar un platillo agotado desde una búsqueda rápida (vuelve a disponible desde ahí mismo).
- Liberar mesa (cierra la sesión).
- Indicador "sin conexión" y reintento automático.
- Capitán: resumen del turno (mesas atendidas, comandas, tiempo medio de atención).

### 3.4 Plataforma
- Dominio propio con HTTPS, página "Acerca de Carta" y aviso de privacidad desde el primer despliegue (lección de Alerta Roja MX: la confianza se construye el día uno).
- Analítica mínima para M1–M4 y G1, sin IP en claro.
- Respaldos diarios probados, monitoreo de disponibilidad y errores.

---

## 4. Qué NO entra en la v1 (y cuándo)

| Fuera | Por qué | Cuándo |
|---|---|---|
| Realidad aumentada y modelos 3D | Semanas de producción por restaurante y el AR en iPhone no permite nuestra interfaz. La foto responde el 80 % de "¿cómo se ve?". | v2: 3D desde fotos generado **localmente en el dispositivo** del operador (ADR-011) |
| Ilustración generada por IA cuando no hay foto | Primero hay que ver cuántos platillos quedan sin foto. La v1 usa ilustraciones de respaldo por categoría (sin costo). | v1.1 detrás de una bandera; primero en servidor, después experimento local |
| Pagos, propina, comisión | PCI, contrato con procesador, facturación | v2 |
| Cuenta del comensal, perfil alimentario en servidor, historial | Capa 1 del modelo de adopción; los filtros viven en el teléfono | v2 |
| Carta+ ($29) | Monetizar al comensal antes de probar el valor | v3 |
| Analytics del restaurante (P09, P12, P14) | Reporte semanal hecho con SQL durante el piloto | v2 |
| Perfil portable del mesero, reputación, invitaciones por QR (P19, P20) | El PIN cubre la v1 | v3 |
| Pantallas propias del capitán (C01–C08) | Misma interfaz del mesero con opciones extra | — |
| Asignación de mesas por mesero | Todos ven todas las mesas; en un local de 40 mesas no es un problema | v2 |
| Carta en PDF embebida (P03b) | El PDF se usa para importar, no para mostrar | — |
| Multi-idioma, multi-sucursal | Piloto en CDMX | v2 |
| Dispositivos autorizados (P16) | El PIN por persona lo sustituye | v2 |

---

## 5. El prototipo de Claude Design, pantalla por pantalla

| Pantalla | Rol | v1 |
|---|---|---|
| P17a Escaneo de QR | Comensal | No: la cámara del teléfono abre el enlace |
| P18a Bienvenida | Comensal | Simplificada: una tarjeta dentro de la entrada |
| P18b Preferencias | Comensal | Simplificada: filtros en el menú, guardados en el teléfono |
| P18c Carta+ | Comensal | No (v3) |
| P01 AR landing | Comensal | **Rediseñada:** inicio = "Top 3 del chef" + categorías, sin cámara |
| P02 Detalle | Comensal | Sí, con foto grande en lugar de visor 3D |
| P03 Menú | Comensal | Sí |
| P03b PDF | Comensal | No |
| P04 Sesión grupal | Comensal | Sí |
| P04b Seguimiento | Comensal | Simplificada a tres estados |
| P05 / P05b Checkout y pago | Comensal | No (v2) |
| P22 Perfil | Comensal | No (v2) |
| P19a / P19b Alta de mesero | Personal | Sustituidas por PIN |
| P06 Mis mesas | Personal | Sí, simplificada |
| P07 Detalle de mesa | Personal | Sí, simplificada |
| P20 Perfil portable | Personal | No (v3) |
| C01–C08 Capitán | Personal | Opciones extra dentro de P06/P07 |
| P21 Alta del restaurante | Operador | **Sí, rediseñada alrededor del PDF** |
| P10 Mi menú | Operador | Sí |
| P11 Pedidos | Operador | Sí: reutiliza la vista del personal |
| P13 Configuración | Operador | Simplificada: nombre, logo, mesas |
| P15 Miembros del equipo | Operador | Simplificada: nombre, rol, PIN |
| P09, P12, P14, P16 | Operador | No (v2) |

**Lo que se conserva entero** es el lenguaje visual. Los componentes del prototipo (`prototipo/js/shared.jsx`, `prototipo/carta-assets/colors_and_type.css`) están en React y se trasladan a la PWA.

---

## 6. Historias de usuario de la v1

Se conservan del PRD, con sus criterios EARS: **US-01 a US-06** (entrada, sesión, alias, menú, filtros, búsqueda), **US-10 a US-14** (orden, confirmar, comanda, vista del personal, llamada), **US-15 a US-17** (operador, menú, fotos), **US-21** (mesas y QR), **US-24** (analítica, con los eventos de §7).

Se retiran: US-07, US-08, US-09 (3D/AR), US-18, US-19, US-20 (pipeline 3D), US-22, US-23 (cuenta del comensal).

Se agregan:

#### US-25 — Importar el menú desde un PDF
> Como operador, quiero subir el PDF de mi carta y que Carta la convierta en mi menú digital, para no capturar platillo por platillo.

- **AC-25.1** — CUANDO el operador suba un PDF o una imagen de hasta 20 MB, EL sistema DEBERÁ crear una importación en estado `pendiente` y responder en ≤ 1 s.
- **AC-25.2** — EL sistema DEBERÁ producir un borrador con categorías, platillos, descripciones y precios, y alérgenos y etiquetas sugeridos, en ≤ 3 min para un menú de hasta 20 páginas.
- **AC-25.3** — EL sistema DEBERÁ mostrar el borrador en una tabla editable y **no crear ningún platillo hasta que el operador confirme**.
- **AC-25.4** — SI la extracción falla, ENTONCES EL sistema DEBERÁ explicar la causa y permitir reintentar o capturar a mano.
- **AC-25.5** — EL sistema DEBERÁ marcar con un aviso los precios que no pudo leer con confianza, para que el operador los revise.

#### US-26 — Entrar como personal con PIN
> Como mesero, quiero entrar con mi nombre y un PIN desde mi teléfono, sin crear una cuenta.

- **AC-26.1** — EL sistema DEBERÁ mostrar en `/staff/<restaurante>` la lista de personal activo y pedir un PIN de 4 a 6 dígitos.
- **AC-26.2** — EL sistema DEBERÁ limitar los intentos a 5 por minuto por restaurante y dirección, y nunca revelar si el nombre o el PIN fue el incorrecto.
- **AC-26.3** — EL sistema DEBERÁ emitir una sesión de 12 h limitada al restaurante del personal; un operador puede revocarla desactivando a la persona.
- **AC-26.4** — DONDE la persona tenga rol `capitan`, EL sistema DEBERÁ mostrar las opciones adicionales; a un mesero no se le muestran ni se le permiten por API.

#### US-27 — Marcar un platillo agotado desde el piso
> Como mesero, cuando se acaba un platillo a las 21:00, quiero marcarlo agotado en segundos para que nadie lo pida.

- **AC-27.1** — CUANDO el personal marque un platillo como no disponible, EL sistema DEBERÁ reflejarlo en el menú del comensal en ≤ 60 s y bloquear su adición a la orden (AC-04.4).
- **AC-27.2** — EL sistema DEBERÁ registrar quién lo marcó y cuándo, y permitir reactivarlo desde el mismo lugar.

#### US-28 — Ver el estado de las mesas
> Como mesero, quiero ver de un vistazo qué mesas están armando, cuáles ya están listas y hace cuánto.

- **AC-28.1** — EL sistema DEBERÁ listar las mesas del restaurante con estado `libre`, `armando`, `lista` (comanda abierta) o `atendida`, y el tiempo desde la última comanda abierta.
- **AC-28.2** — CUANDO el personal libere una mesa, EL sistema DEBERÁ cerrar su sesión; los comensales que sigan conectados verán "la mesa se cerró" y podrán volver a escanear.
- **AC-28.3** — MIENTRAS la vista esté abierta, EL sistema DEBERÁ refrescarse cada 5 s y pausar el sondeo cuando la pantalla no esté visible.

---

## 7. Eventos de analítica de la v1

`scan`, `menu_view`, `dish_view`, `search`, `filter`, `item_add`, `item_remove`, `order_confirm`, `order_unconfirm`, `session_ready`, `waiter_call`, `staff_attend`, `staff_serve`, `dish_sold_out`. Sin `model_view` ni `ar_open`.

---

## 8. Supuestos que el piloto valida

| # | Supuesto | Cómo se valida |
|---|---|---|
| S1 | El comensal escanea sin que el mesero lo pida | Mesas con y sin mención del mesero |
| S2 | La señal del local carga el menú en < 3 s | Medición en sitio antes de firmar |
| S3 | El restaurante acepta que la comanda llegue al teléfono del mesero | Acuerdo de piloto |
| S4 | El operador puede revisar el borrador del PDF en < 15 min | Cronometrar el alta de los primeros 3 restaurantes |
| S5 | Las fotos tomadas con el teléfono por el restaurante son suficientemente buenas | Revisar las fotos de los primeros 3 restaurantes |
| S6 | El personal no percibe Carta como carga extra | Entrevista antes y a las 2 semanas |
