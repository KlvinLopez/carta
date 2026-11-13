# Carta v1 — Alcance

**Versión:** 1.1 · **Fecha:** 2 de noviembre de 2026 · **Actualizado:** 13 de noviembre de 2026 con la [Spec 001](../specs/001-ciclo-de-la-mesa/spec.md) (ADR-017) y la entrega por eventos (ADR-018)

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
| **Mesero** | Personal de piso | `/staff/<restaurante>`: elige su nombre y teclea su PIN, en su teléfono o en una tablet compartida (cambiar de persona = un toque y el PIN) | Ver mesas y su estado, ver y atender comandas y llamadas, marcar un platillo agotado y llevar el ciclo de la mesa (cerrar cuentas, validar pagos, mesa limpia, correcciones) según la tabla de permisos de la [Spec 001 §5](../specs/001-ciclo-de-la-mesa/spec.md) |
| **Capitán** | Un mesero con la bandera `capitan` | Igual que el mesero | Todo lo del mesero + ver el resumen del turno, cerrar o abrir la entrada de una mesa, pausar/activar platillos en bloque (tabla de permisos de la Spec 001 §5) |
| **Operador** | Dueño o gerente | `/admin`: cuenta con Google o enlace por correo | Dar de alta el restaurante, importar el menú desde PDF, editar menú y fotos, mesas y QR, personal y PINs, horario y zona horaria; **operar el piso desde su panel** con todas las acciones del personal (es el primer validador; liberar una mesa con cargos sin pagar y regenerar un QR son sólo suyos) |

El capitán **no tiene pantallas propias** (C01–C08 del prototipo): es la misma interfaz del mesero con opciones adicionales visibles. Ver [ADR-013](../mvp/adr/ADR-013-personal-con-pin.md) y su enmienda en [ADR-017](../mvp/adr/ADR-017-el-personal-lleva-el-ciclo.md).

**Carta exige al menos un validador:** el dueño, que es el primer y único mesero si no hay más personal. El personal lleva el ciclo de la mesa; ningún reloj la cierra (ADR-017).

---

## 3. Qué entra en la v1

### 3.1 Operador (restaurante)
- Alta self-service en un asistente: nombre, logo, subir PDF del menú → borrador extraído → revisar y corregir en una tabla → confirmar → cuántas mesas → PDF con los QR → personal con PIN → listo.
- Menú: categorías y platillos (crear, editar, reordenar, desactivar), fotos con guía de captura (miniatura y detalle generadas por el servidor), disponibilidad (agotado hoy).
- Mesas: crear, regenerar código, imprimir QR.
- Personal: nombres, rol mesero/capitán, PIN.
- Pedidos en vivo: la misma vista del personal, dentro del panel, **para ver y actuar** (US-36, AC-36.6).
- Horario por día y zona horaria del restaurante; fuera de horario, el escaneo deja una solicitud o se rechaza según su ajuste (US-38).
- Todo funciona desde el teléfono. El restaurante no necesita computadora; el panel también se usa en tablet y computadora (US-39).

### 3.2 Comensal
- Entrada por `/m/<codigo>`: nombre del restaurante, número de mesa, alias editable.
- Menú por categorías con foto o ilustración, búsqueda sin acentos, filtros por alérgeno y etiqueta (guardados sólo en el teléfono), aviso permanente de alérgenos, "Top 3 del chef".
- Detalle del platillo: foto grande, descripción, ingredientes, alérgenos, precio.
- Mi orden: cantidad, nota de 140 caracteres, subtotal; confirmar y deshacer.
- Sesión grupal: avatares, "3 de 4 listos", ver (no editar) la orden de otro.
- Estado tras confirmar: *enviada al mesero* → *en preparación* → *servida*.
- Llamar al mesero (1 por minuto).
- Pedir en rondas; cerrar su cuenta, ver su desglose con la propina que eligió (por defecto en sus ajustes, guardada en el teléfono) y avisar «ya pagué»; el personal valida (US-29, US-37).
- Entrada cerrada o fuera de horario: deja una solicitud; «ya estás en la mesa N» si ya está en otra (US-33, US-34, US-38).
- Los cambios de la mesa llegan solos, sin recargar (US-40, ADR-018).
- Funciona sin instalar nada, en teléfono y tablet, con pantallas de error (mesa inválida, sin conexión) en el lenguaje de la marca.

### 3.3 Personal
- Lista de mesas con estado (libre · armando · lista · atendida · cuenta cerrada · pagada), entrada cerrada, solicitudes pendientes, estatus de actividad (verde, amarillo, rojo) y tiempo desde la comanda.
- Detalle de mesa: comanda por comensal, botones *atender* y *servida*.
- Llamadas con alerta sonora y visual.
- Marcar un platillo agotado desde una búsqueda rápida (vuelve a disponible desde ahí mismo).
- Ciclo de la mesa: cerrar cuentas, validar pagos (con consumo, propina declarada y total a cobrar), mesa limpia, reabrir antes de «pagada»; correcciones (quitar a un comensal, cancelar lo que la cocina no empezó, pasar una cuenta, cuenta flotante); aprobar solicitudes de entrada (US-29, US-31, US-33).
- Teléfono y tablet compartida (US-39).
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
| Pagos o comisión; **propinas: se permite calcular y registrar la propina declarada (US-37); nunca cobro, custodia ni reparto** | PCI, contrato con procesador, facturación; la propina como dinero es un dato laboral y fintech (Spec 001, US-37) | v2 (pagos) |
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
| P05 / P05b Checkout y pago | Comensal | **Simplificado:** cuenta, desglose y propina declarada (US-29, US-37); sin pago en la app (v2) |
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

Se conservan del PRD, con sus criterios EARS: **US-01 a US-06** (entrada, sesión, alias, menú, filtros, búsqueda), **US-09** (ver, sin editar, lo que va a pedir otro comensal), **US-10 a US-14** (orden, confirmar, comanda, vista del personal, llamada), **US-15 a US-17** (operador, menú, fotos), **US-21** (mesas y QR), **US-24** (analítica, con los eventos de §7).

Se retiran: US-07, US-08 (3D/AR), US-18, US-19, US-20 (pipeline 3D), US-22, US-23 (cuenta del comensal). El criterio AC-05.4 (filtros preseleccionados desde el perfil) depende de la cuenta y no aplica en v1.

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

- **AC-28.1** — EL sistema DEBERÁ listar las mesas del restaurante con estado `libre`, `armando`, `lista` (comanda abierta), `atendida`, `cuenta cerrada` o `pagada`, si tienen la entrada cerrada, sus solicitudes pendientes y su estatus de actividad, y el tiempo desde la última comanda abierta (Spec 001: AC-29.x, AC-30.6, AC-33.8).
- **AC-28.2** — CUANDO el personal marque «mesa limpia» sobre una mesa pagada, o alguien con permiso la libere (AC-29.9, AC-29.12), EL sistema DEBERÁ cerrar su sesión; los comensales que sigan conectados verán "la mesa se cerró" y podrán volver a escanear.
- **AC-28.3** — MIENTRAS la vista esté abierta, EL sistema DEBERÁ reflejar cada cambio en ≤ 5 s sin intervención del usuario (por aviso, ADR-018; en el modo degradado, preguntando cada 5 s) y no mantener la línea ni preguntar cuando la pantalla no esté visible.

#### US-29 a US-39 — Ciclo de la mesa y del comensal (Spec 001)

El texto EARS vigente, con sus escenarios, está en [`docs/specs/001-ciclo-de-la-mesa/spec.md` §6](../specs/001-ciclo-de-la-mesa/spec.md) (aprobada por Calvin el 13 de noviembre de 2026; ADR-017). Aquí sólo se listan los criterios **de la v1**, uno por uno, para que la trazabilidad los cuente (`verificar_trazabilidad.py` expande rangos sólo en los briefs de 04, no en este documento ni en el PRD); los de la v1.1 (US-32, US-31b, US-36b, US-38b, en la sección 8 de la spec) no son vigentes. Si este índice y la spec no coinciden, manda la spec.

| Historia | Criterios de la v1 | De qué trata |
|---|---|---|
| US-29 — Ciclo de la mesa y candado | AC-29.1, AC-29.2, AC-29.3, AC-29.4, AC-29.5, AC-29.6, AC-29.7, AC-29.8, AC-29.9, AC-29.10, AC-29.11, AC-29.12 | Abrir con el primer escaneo, rondas, cuenta cerrada por comensal y de la mesa, candado, desglose, «ya pagué», validar pagos, mesa limpia, reabrir antes de «pagada», liberar con cargos sólo con permiso |
| US-30 — Pase y estatus | AC-30.1, AC-30.2, AC-30.3, AC-30.4, AC-30.5, AC-30.6, AC-30.7, AC-30.8, AC-30.9 | Sin vigencia fija de la mesa, ningún reloj cierra, pase que caduca tras 24 h sin usarse, estatus verde/amarillo/rojo, recordatorio de 30 min, aprobación tras 2 h en rojo |
| US-31 — El personal corrige la mesa | AC-31.1, AC-31.2, AC-31.3, AC-31.5, AC-31.7, AC-31.8, AC-31.9, AC-31.10 | Quitar a un comensal, cerrar su cuenta por él, cancelar lo que la cocina no empezó, pasar una cuenta, cuenta flotante, alias repetidos, otro restaurante → 404 |
| US-33 — La entrada de la mesa | AC-33.1, AC-33.2, AC-33.3, AC-33.4, AC-33.5, AC-33.6, AC-33.7, AC-33.8 | Cerrar y abrir la entrada, solicitudes con tope y caducidad, aprobar o rechazar, regenerar sin cerrar, mesa llena |
| US-34 — Una mesa a la vez | AC-34.1, AC-34.2, AC-34.3, AC-34.4, AC-34.5 | «Ya estás en la mesa N de <restaurante>», también entre restaurantes; salir de la mesa sin cargos |
| US-35 — Tiempos de la mesa | AC-35.1, AC-35.2, AC-35.3, AC-35.4, AC-35.5 | Marcas de tiempo sin sobrescribir y sin datos personales |
| US-36 — Permisos del personal | AC-36.3, AC-36.4, AC-36.6, AC-36.7 | Tabla fija en un solo punto del servidor; el dueño opera desde su panel |
| US-37 — Propina | AC-37.1, AC-37.2, AC-37.3, AC-37.4, AC-37.5, AC-37.6, AC-37.7, AC-37.8, AC-37.9, AC-37.10, AC-37.11 | Propina por defecto en el teléfono, declarada al cerrar la cuenta, total a cobrar, anotada a quien valida |
| US-38 — Horario | AC-38.1, AC-38.2, AC-38.3, AC-38.4, AC-38.5, AC-38.6, AC-38.7 | Horario y zona horaria, fuera de horario: solicitud o rechazo |
| US-39 — Pantallas | AC-39.1, AC-39.2, AC-39.3, AC-39.4 | Teléfono y tablet; computadora para el dueño; cambiar de persona en una tablet |

#### US-40 — Los cambios llegan solos (ADR-018)
> Como comensal y como mesero, quiero ver al instante lo que cambia en la mesa sin recargar, y que la app no gaste batería ni datos preguntando cuando nada cambia.

Criterios derivados del [ADR-018](../mvp/adr/ADR-018-entrega-por-eventos.md) (aceptado por Calvin el 13 de noviembre de 2026). Las cifras sin fuente medida son **criterios a verificar** en la tarea que los construye (T-3.20, T-3.21, T-3.4) o en staging (T-4.4).

- **AC-40.1** — CUANDO se confirme una escritura que cambia lo que ve una mesa o el personal de un restaurante, EL sistema DEBERÁ avisar a todas las líneas abiertas de esa mesa o de ese restaurante, también las atendidas por otro worker, sin que el aviso lleve datos del negocio.
- **AC-40.2** — CUANDO un teléfono abra la línea, EL sistema DEBERÁ mandarle primero la versión vigente de su estado, y el teléfono sólo DEBERÁ pedir el estado si esa versión no es la suya.
- **AC-40.3** — MIENTRAS la línea esté abierta, EL sistema DEBERÁ mandar un latido sólo tras 25 s sin ningún otro mensaje; cualquier mensaje reinicia la cuenta.
- **AC-40.4** — EL sistema DEBERÁ cerrar cada línea entre 8 y 12 min después de abrirla indicando al teléfono que vuelva, y el teléfono DEBERÁ reconectar solo; tras un corte masivo (error de red o 5xx), después de una espera al azar de 0 a 20 s.
- **AC-40.5** — SI la línea no conecta en 3 intentos, el navegador la deja cerrada o la ruta responde distinto de 200, ENTONCES el teléfono DEBERÁ seguir funcionando preguntando según la fase de la mesa (comensal: 3 s armando y con la cuenta cerrada, 12 s esperando la comanda, 45 s después de servida, nada con su cuenta pagada salvo al volver a primer plano) o cada 5 s (personal), y volver a la línea en cuanto conecte.
- **AC-40.6** — MIENTRAS la página esté oculta o el teléfono bloqueado, el teléfono NO DEBERÁ mantener la línea abierta ni preguntar; CUANDO vuelva a primer plano o a la red, DEBERÁ ponerse al día con el último estado en ≤ 3 s.
- **AC-40.7** — MIENTRAS la línea esté viva, el teléfono NO DEBERÁ pedir su estado más de una vez cada 60 s si no recibió un aviso, no reconectó y no volvió a primer plano.
- **AC-40.8** — CUANDO un worker recupere la escucha de la base tras perderla, EL sistema DEBERÁ repartir los avisos a sus líneas en ≈ 30 s en lugar de mandarlos de golpe, y `/ready` DEBERÁ responder 503 mientras la escucha lleve caída más de 15 s [supuesto: el plazo lo ajusta T-3.20].
- **AC-40.9** — EL sistema DEBERÁ entregar la hora de la última acción de cada mesa y calcular en el teléfono los minutos, el estatus por color y el recordatorio; ningún reloj del servidor DEBERÁ mandar avisos por tiempo.
- **AC-40.10** — En staging y a través de Cloudflare, EL sistema DEBERÁ hacer visible un cambio en p95 ≤ 1 s con 1 evento por minuto por mesa, mantener una línea 12 min sin error 524 y dejar todo reconectado en ≤ 30 s tras un despliegue con 2,000 líneas abiertas (verificaciones 1 a 4 del ADR-018).

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
