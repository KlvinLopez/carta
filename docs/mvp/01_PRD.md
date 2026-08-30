# Carta MVP — Product Requirements Document

**Versión:** 1.0 · **Fecha:** 30 de agosto de 2026 · **Autor:** Calvin · **Estado:** aprobado para construcción

---

## 1. Resumen ejecutivo

Carta convierte el menú de un restaurante en una experiencia de realidad aumentada: el comensal escanea el QR de su mesa, ve los platillos en 3D sobre su propia mesa, arma su orden, y cuando todos en la mesa confirman, el sistema avisa al mesero.

El MVP existe para responder **una sola pregunta**:

> ¿Ver el platillo en 3D antes de pedirlo cambia el comportamiento del comensal — y el restaurante lo nota?

Todo lo que no ayuda a responder esa pregunta está fuera de alcance.

---

## 2. Problema

### 2.1 Para el comensal
Pedir en un restaurante desconocido es una decisión a ciegas. La descripción textual ("Costilla braseada, reducción de tamarindo, puré de camote") no comunica porción, presentación ni si va a gustar. El resultado es que el comensal pide lo seguro, se arrepiente, o pregunta al mesero y recibe una recomendación sesgada por lo que conviene vender.

### 2.2 Para el restaurante
El menú es la herramienta de venta más importante del negocio y es estática. El restaurante no sabe qué platillos se miran y no se piden, no puede probar cambios de precio o descripción sin reimprimir, y depende del criterio del mesero para hacer upsell. Los platillos con más margen no son necesariamente los que más se venden.

### 2.3 Por qué ahora
- Penetración de smartphones con cámara AR-capable en México >70% en zonas urbanas.
- El QR en mesa se normalizó post-2020: el comensal ya escanea sin fricción cultural.
- La generación de modelos 3D a partir de fotos dejó de requerir un estudio: hoy corre en hardware local.

---

## 3. Objetivos y métricas de éxito

### 3.1 Objetivo del MVP
Validar con **5 a 10 restaurantes piloto** en CDMX que el menú AR (a) es usable sin instrucciones, (b) aumenta el ticket promedio o la exploración del menú, y (c) el restaurante lo quiere conservar.

### 3.2 Métricas primarias

| # | Métrica | Definición | Meta |
|---|---|---|---|
| M1 | **Tasa de escaneo** | Escaneos únicos ÷ mesas servidas | ≥ 40% |
| M2 | **Tasa de activación AR** | Sesiones que abren ≥1 modelo 3D ÷ sesiones totales | ≥ 60% |
| M3 | **Tasa de orden** | Sesiones que confirman orden ÷ sesiones que escanean | ≥ 25% |
| M4 | **Delta de ticket promedio** | Ticket de mesas con Carta vs. mesas sin Carta, mismo restaurante y franja horaria | ≥ +8% |
| M5 | **Retención de piloto** | Restaurantes que siguen activos a las 6 semanas | ≥ 70% |

### 3.3 Métricas de guardarraíl (no deben empeorar)

| # | Métrica | Umbral de alarma |
|---|---|---|
| G1 | Tiempo de carga hasta menú visible (p75, 4G) | > 3 s |
| G2 | Tasa de error de carga de modelo 3D | > 5% de aperturas |
| G3 | Órdenes confirmadas que el mesero no recibe | > 0 (cero tolerancia) |
| G4 | Quejas de personal por fricción operativa | > 2 por restaurante/semana |

### 3.4 Criterios de decisión post-piloto

- **Seguir e invertir** si M2 ≥ 60% y (M4 ≥ +8% o M5 ≥ 70%).
- **Pivotar la propuesta** si M1 ≥ 40% pero M2 < 40% — la gente entra pero el AR no engancha.
- **Detener** si M1 < 20% — el QR en mesa no convierte y el problema es de canal, no de producto.

---

## 4. Fuera de alcance (no-goals)

Lo siguiente **no se construye** en el MVP, con justificación explícita:

| Fuera de alcance | Por qué | Cuándo |
|---|---|---|
| Pagos en app y comisión 1.8% | Requiere PCI, contrato con PSP, y conciliación. No es necesario para responder la pregunta del MVP. | v2 |
| App de mesero (Mis Mesas, Detalle de Mesa) | El mesero del piloto ya tiene un flujo que funciona. Sustituirlo introduce riesgo operativo sin aprendizaje adicional. | v2 |
| Panel de analytics para el restaurante | Durante el piloto, el reporte lo entrega el equipo Carta a mano. Construir dashboards antes de saber qué métrica importa es desperdicio. | v2 |
| Perfil portable del mesero, reputación, invitaciones QR | Depende de la app de mesero. | v3 |
| Onboarding self-service de restaurante | Con 5–10 pilotos, dar de alta a mano es más rápido que construir el wizard. | v2 |
| Capa 2 Premium ($29 MXN/mes) | Monetizar al comensal antes de probar el valor es prematuro. | v3 |
| Fotogrametría en dispositivo del restaurante | Ver [ADR-005](adr/ADR-005-pipeline-3d.md). El MVP usa vía curada + generación asistida server-side. | v2 |
| Multi-idioma | Piloto en CDMX, español. La arquitectura no bloquea i18n pero no se implementa. | v2 |

---

## 5. Usuarios del MVP

### 5.1 Comensal anónimo (Capa 0) — usuario primario
**Quién:** cualquier persona sentada en una mesa del restaurante piloto.
**Contexto:** tiene hambre, está con acompañantes, la batería no está llena, la señal es de 4G irregular dentro del local.
**Necesita:** entender qué va a comer, rápido, sin instalar nada ni crear cuenta.
**Éxito para él:** pidió algo que le gustó y no tuvo que preguntar.

### 5.2 Comensal registrado (Capa 1) — secundario
Mismo perfil, pero acepta iniciar sesión con Google/Apple para guardar su perfil alimentario (alergias, preferencias) y su historial. En el MVP esto **sólo** habilita: filtros de alergia persistentes y "mis pedidos anteriores". No hay premium.

### 5.3 Personal de piso (mesero / capitán) — usuario operativo
**Quién:** el mesero asignado a la mesa.
**Contexto:** trae 6 mesas, las manos ocupadas, no va a aprender una app nueva a media hora pico.
**Necesita:** enterarse de que la mesa 7 ya está lista para ordenar, y ver qué pidieron.
**Interfaz en el MVP:** **Vista de Comandas** — una página web que corre en la tablet o pantalla que el restaurante ya tiene en la barra/pase. No hay app de mesero.

### 5.4 Operador de menú (equipo Carta o encargado del restaurante) — usuario de back-office
**Quién:** durante el piloto, principalmente el equipo Carta; secundariamente el gerente del restaurante.
**Necesita:** cargar platillos, subir fotos, generar y aprobar el modelo 3D, imprimir los QR de mesa.
**Interfaz en el MVP:** **Back-office mínimo** protegido por login.

---

## 6. Alcance funcional

### 6.1 Superficies del MVP

| Superficie | Usuario | Tecnología | Pantallas Stitch de referencia |
|---|---|---|---|
| **App del comensal** | Comensal | PWA (web) | P01, P02, P03, P04, P17a, P18a–c |
| **Vista de Comandas** | Personal de piso | Web (tablet del restaurante) | derivada de P11 |
| **Back-office** | Operador de menú | Web | P10 (simplificado), P21e (sólo mesas/QR) |
| **API** | — | FastAPI | — |
| **Pipeline 3D** | — | Worker + modelo local | — |

### 6.2 Flujo principal (happy path)

```
Comensal escanea QR de mesa
  → se crea/une a la sesión de la mesa (sin login)
  → ve el menú del restaurante
  → abre un platillo → ve el modelo 3D en AR sobre su mesa
  → agrega platillos a SU orden personal
  → ve el progreso de sus acompañantes ("3 de 4 listos")
  → confirma su orden
  → cuando todos confirman → la Vista de Comandas alerta al personal
  → el mesero se acerca, levanta/valida el pedido en su flujo normal
```

---

## 7. User stories con criterios de aceptación (EARS)

> **Notación EARS.** Los criterios usan patrones formales:
> **Ubicuo:** `EL sistema DEBERÁ …`
> **Evento:** `CUANDO <disparador>, EL sistema DEBERÁ …`
> **Estado:** `MIENTRAS <estado>, EL sistema DEBERÁ …`
> **Condicional indeseado:** `SI <condición>, ENTONCES EL sistema DEBERÁ …`
> **Opcional:** `DONDE <característica presente>, EL sistema DEBERÁ …`
>
> Cada criterio debe ser verificable por una prueba automatizada o por un paso manual descrito en [07_Test_Strategy](07_Test_Strategy.md).

---

### Épica A — Entrada y sesión

#### US-01 — Entrar escaneando el QR de la mesa
> Como comensal, quiero abrir el menú escaneando el QR de mi mesa, para no tener que instalar nada ni escribir una dirección.

- **AC-01.1** — CUANDO un dispositivo abre la URL `/m/{codigo_mesa}` con un código válido, EL sistema DEBERÁ responder la app del comensal con el menú del restaurante correspondiente en ≤ 3 s (p75, red 4G).
- **AC-01.2** — CUANDO un dispositivo abre `/m/{codigo_mesa}`, EL sistema DEBERÁ emitir un token de invitado firmado con vigencia de 6 h, sin solicitar datos personales.
- **AC-01.3** — SI el código de mesa no existe o la mesa está inactiva, ENTONCES EL sistema DEBERÁ mostrar una pantalla de error legible con el nombre del restaurante si se conoce, y no revelar si el código existe en otro restaurante.
- **AC-01.4** — CUANDO un dispositivo con token de invitado vigente vuelve a abrir la misma URL, EL sistema DEBERÁ reutilizar su identidad de invitado y restaurar su orden en curso.
- **AC-01.5** — EL sistema DEBERÁ funcionar sin cookies de terceros y sin ningún identificador publicitario.

#### US-02 — Unirse a la sesión de mesa junto con mis acompañantes
> Como comensal, quiero ver que mis acompañantes están en la misma sesión, para coordinar el pedido.

- **AC-02.1** — CUANDO un invitado abre una mesa que ya tiene una sesión `activa`, EL sistema DEBERÁ agregarlo como miembro de esa sesión.
- **AC-02.2** — CUANDO un invitado abre una mesa sin sesión activa, EL sistema DEBERÁ crear una sesión nueva y marcarlo como `host`.
- **AC-02.3** — MIENTRAS una sesión esté activa, EL sistema DEBERÁ mostrar a cada miembro el avatar y el estado (`armando` / `listo`) de todos los demás miembros, con una latencia de actualización ≤ 3 s.
- **AC-02.4** — CUANDO una sesión no registre actividad de ningún miembro durante 3 h, EL sistema DEBERÁ cerrarla automáticamente.
- **AC-02.5** — EL sistema DEBERÁ permitir un máximo de 12 miembros por sesión.

#### US-03 — Elegir un nombre para que me identifiquen
> Como comensal, quiero aparecer con un nombre reconocible para mis acompañantes.

- **AC-03.1** — CUANDO un invitado se une a una sesión, EL sistema DEBERÁ asignarle un alias generado (p. ej. "Comensal 2") y un color de avatar estable.
- **AC-03.2** — EL sistema DEBERÁ permitir editar el alias con un máximo de 24 caracteres, sin exigir datos reales.
- **AC-03.3** — SI el alias contiene contenido de una lista de bloqueo básica, ENTONCES EL sistema DEBERÁ rechazarlo y conservar el anterior.

---

### Épica B — Menú y descubrimiento

#### US-04 — Ver el menú completo organizado
> Como comensal, quiero recorrer el menú por categorías para saber qué hay.

- **AC-04.1** — EL sistema DEBERÁ mostrar únicamente platillos con `activo = true` del restaurante de la mesa, agrupados por categoría y respetando el campo `orden`.
- **AC-04.2** — EL sistema DEBERÁ mostrar por cada platillo: nombre, descripción, precio y foto; y un indicador visual cuando exista modelo 3D publicado.
- **AC-04.3** — CUANDO el menú tenga más de 20 platillos, EL sistema DEBERÁ cargar las imágenes de forma diferida y mantener el desplazamiento fluido (≥ 50 fps en gama media).
- **AC-04.4** — SI un platillo se marca como no disponible mientras la sesión está abierta, ENTONCES EL sistema DEBERÁ reflejarlo en ≤ 60 s y bloquear su adición a la orden.

#### US-05 — Filtrar por lo que puedo o quiero comer
> Como comensal con alergias o preferencias, quiero filtrar el menú para no perder tiempo.

- **AC-05.1** — EL sistema DEBERÁ ofrecer filtros por alérgeno (mínimo: nueces, lácteos, gluten, huevo, mariscos) y por etiqueta (vegetariano, vegano, picante).
- **AC-05.2** — CUANDO se aplique un filtro de alérgeno, EL sistema DEBERÁ ocultar los platillos que lo contengan y mostrar el conteo de resultados.
- **AC-05.3** — EL sistema DEBERÁ mostrar de forma persistente que la información de alérgenos es declarada por el restaurante y no sustituye a preguntar al personal.
- **AC-05.4** — DONDE el comensal haya iniciado sesión (Capa 1), EL sistema DEBERÁ preseleccionar los filtros de su perfil alimentario.

#### US-06 — Buscar un platillo por nombre
- **AC-06.1** — CUANDO el comensal escriba ≥ 2 caracteres, EL sistema DEBERÁ mostrar coincidencias por nombre o descripción en ≤ 300 ms, insensible a acentos y mayúsculas.

---

### Épica C — Experiencia AR (núcleo del producto)

#### US-07 — Ver el platillo en 3D
> Como comensal, quiero ver el platillo en tres dimensiones para saber cómo se ve realmente.

- **AC-07.1** — CUANDO el comensal abra el detalle de un platillo con modelo publicado, EL sistema DEBERÁ mostrar un visor 3D interactivo (rotación y zoom) con el modelo cargado en ≤ 2.5 s (p75, 4G).
- **AC-07.2** — MIENTRAS el modelo esté cargando, EL sistema DEBERÁ mostrar la foto del platillo como póster, nunca una pantalla vacía.
- **AC-07.3** — SI el modelo falla al cargar, ENTONCES EL sistema DEBERÁ mostrar la foto del platillo y registrar el error, sin bloquear el resto de la pantalla.
- **AC-07.4** — EL sistema DEBERÁ servir modelos en formato `.glb` para Android/escritorio y `.usdz` para iOS.
- **AC-07.5** — EL peso de cada modelo publicado DEBERÁ ser ≤ 4 MB para `.glb` y ≤ 6 MB para `.usdz`.

#### US-08 — Poner el platillo sobre mi mesa (AR)
> Como comensal, quiero ver el platillo a escala real sobre mi mesa.

- **AC-08.1** — DONDE el dispositivo soporte AR (ARCore en Android, AR Quick Look en iOS), EL sistema DEBERÁ ofrecer un botón "Ver en mi mesa" que abra el visor AR nativo del sistema operativo.
- **AC-08.2** — EL sistema DEBERÁ presentar el modelo a escala física real, usando las dimensiones declaradas del platillo.
- **AC-08.3** — SI el dispositivo no soporta AR, ENTONCES EL sistema DEBERÁ ocultar el botón AR y mantener el visor 3D, sin mostrar mensajes de error.
- **AC-08.4** — CUANDO el comensal abra el visor AR, EL sistema DEBERÁ registrar el evento de analítica `ar_open` con el id del platillo.

#### US-09 — Ver el platillo que va a pedir otro comensal
- **AC-09.1** — CUANDO un miembro toque un platillo en la orden de otro miembro, EL sistema DEBERÁ abrir el detalle de ese platillo en modo consulta.
- **AC-09.2** — EL sistema DEBERÁ impedir que un miembro modifique la orden de otro miembro.

---

### Épica D — Orden y coordinación

#### US-10 — Armar mi orden personal
- **AC-10.1** — EL sistema DEBERÁ permitir agregar un platillo a la orden personal con cantidad ≥ 1 y una nota de texto libre de máximo 140 caracteres.
- **AC-10.2** — CUANDO se agregue, modifique o elimine un ítem, EL sistema DEBERÁ recalcular el subtotal de la orden y reflejarlo en ≤ 300 ms en la interfaz.
- **AC-10.3** — EL sistema DEBERÁ persistir la orden en curso de forma que sobreviva a recargar la página o perder la conexión temporalmente.
- **AC-10.4** — SI el precio de un platillo cambia después de haberlo agregado, ENTONCES EL sistema DEBERÁ conservar el precio vigente al momento de confirmar y advertir el cambio.

#### US-11 — Confirmar mi orden
- **AC-11.1** — CUANDO el comensal confirme su orden, EL sistema DEBERÁ cambiar su estado a `confirmada`, congelar precios y cantidades, y marcar al miembro como `listo`.
- **AC-11.2** — SI la orden está vacía, ENTONCES EL sistema DEBERÁ impedir la confirmación con un mensaje explicativo.
- **AC-11.3** — EL sistema DEBERÁ permitir deshacer la confirmación mientras la sesión no haya sido enviada a comandas.
- **AC-11.4** — CUANDO se confirme una orden, EL sistema DEBERÁ actualizar el indicador de progreso de todos los miembros en ≤ 3 s.

#### US-12 — Que se avise al mesero cuando todos estemos listos
- **AC-12.1** — CUANDO todos los miembros activos de una sesión tengan su orden en estado `confirmada`, EL sistema DEBERÁ transicionar la sesión a `lista_para_enviar` y crear una comanda.
- **AC-12.2** — CUANDO se cree una comanda, EL sistema DEBERÁ mostrarla en la Vista de Comandas del restaurante en ≤ 5 s con alerta sonora y visual.
- **AC-12.3** — EL sistema DEBERÁ permitir a cualquier miembro llamar al mesero manualmente en cualquier momento, con un máximo de 1 llamada por minuto por sesión.
- **AC-12.4** — SI un miembro se une después de que la sesión pasó a `lista_para_enviar`, ENTONCES EL sistema DEBERÁ permitirle crear una orden adicional que aparece como comanda separada vinculada a la misma mesa.
- **AC-12.5** — EL sistema DEBERÁ garantizar que ninguna comanda creada se pierda: toda comanda persiste hasta ser marcada como atendida por el personal.

---

### Épica E — Vista de Comandas (personal de piso)

#### US-13 — Ver las mesas que están listas para ordenar
- **AC-13.1** — EL sistema DEBERÁ mostrar las comandas abiertas ordenadas por antigüedad, con número de mesa, hora, número de comensales e ítems por comensal.
- **AC-13.2** — CUANDO llegue una comanda nueva, EL sistema DEBERÁ emitir una alerta sonora y destacar visualmente la tarjeta durante 10 s.
- **AC-13.3** — EL sistema DEBERÁ permitir marcar una comanda como `atendida` con un solo toque y registrar quién y cuándo si hay usuario identificado.
- **AC-13.4** — MIENTRAS la vista esté abierta, EL sistema DEBERÁ refrescar el listado al menos cada 5 s sin intervención del usuario.
- **AC-13.5** — SI se pierde la conexión, ENTONCES EL sistema DEBERÁ mostrar un indicador visible de "sin conexión" y reintentar automáticamente.

#### US-14 — Ver una llamada de mesero
- **AC-14.1** — CUANDO un comensal llame al mesero, EL sistema DEBERÁ mostrar una alerta de tipo `llamada` en la Vista de Comandas, distinguible de una comanda, con la mesa y la hora.

---

### Épica F — Back-office de menú

#### US-15 — Iniciar sesión como operador
- **AC-15.1** — EL sistema DEBERÁ exigir autenticación para toda ruta de back-office.
- **AC-15.2** — EL sistema DEBERÁ restringir a cada operador a los restaurantes que tiene asignados.
- **AC-15.3** — SI un operador solicita un recurso de un restaurante que no tiene asignado, ENTONCES EL sistema DEBERÁ responder 404 (no 403), para no filtrar existencia.

#### US-16 — Administrar categorías y platillos
- **AC-16.1** — EL sistema DEBERÁ permitir crear, editar, reordenar y desactivar categorías y platillos.
- **AC-16.2** — EL sistema DEBERÁ validar: nombre obligatorio (≤ 200 caracteres), precio ≥ 0 con 2 decimales, nivel de picante entre 0 y 5.
- **AC-16.3** — EL sistema DEBERÁ usar desactivación lógica; nunca borrado físico de platillos con historial de órdenes.

#### US-17 — Subir la foto de un platillo
- **AC-17.1** — EL sistema DEBERÁ aceptar JPG, PNG y HEIC de hasta 15 MB.
- **AC-17.2** — CUANDO se suba una foto, EL sistema DEBERÁ generar variantes optimizadas (miniatura 400 px, detalle 1200 px) en formato WebP y conservar el original.
- **AC-17.3** — SI el archivo no es una imagen válida, ENTONCES EL sistema DEBERÁ rechazarlo con un mensaje claro y no almacenarlo.

#### US-18 — Generar el modelo 3D desde la foto
> Como operador, quiero pedir que se genere un modelo 3D a partir de la foto del platillo, para no depender de un estudio de modelado.

- **AC-18.1** — CUANDO el operador solicite generar un modelo, EL sistema DEBERÁ crear un trabajo de generación en estado `pendiente` y responder en ≤ 1 s sin bloquear la interfaz.
- **AC-18.2** — EL sistema DEBERÁ procesar los trabajos con el modelo local de imagen a 3D y actualizar el estado a `procesando`, `listo_para_revision` o `fallido`.
- **AC-18.3** — EL sistema DEBERÁ notificar al operador el resultado y mostrar una vista previa 3D del borrador.
- **AC-18.4** — SI la generación falla o excede 20 min, ENTONCES EL sistema DEBERÁ marcar el trabajo como `fallido` con la causa y permitir reintentar o subir un modelo manual.
- **AC-18.5** — EL sistema DEBERÁ conservar como máximo 3 borradores por platillo.

#### US-19 — Aprobar o rechazar el modelo antes de publicarlo
> Ningún modelo generado automáticamente llega al comensal sin que una persona lo apruebe.

- **AC-19.1** — EL sistema DEBERÁ impedir que un modelo en estado distinto de `publicado` sea visible para el comensal.
- **AC-19.2** — CUANDO un revisor apruebe un borrador, EL sistema DEBERÁ generar las variantes `.glb` y `.usdz` optimizadas, publicarlas y registrar quién aprobó y cuándo.
- **AC-19.3** — CUANDO un revisor rechace un borrador, EL sistema DEBERÁ conservarlo con el motivo del rechazo para mejorar el proceso, y no publicarlo.
- **AC-19.4** — EL sistema DEBERÁ permitir despublicar un modelo ya publicado; el comensal vuelve a ver sólo la foto.

#### US-20 — Cargar un modelo 3D hecho a mano
- **AC-20.1** — EL sistema DEBERÁ aceptar la carga directa de un `.glb` de hasta 50 MB, que entra al mismo flujo de revisión.

#### US-21 — Administrar mesas y generar sus QR
- **AC-21.1** — EL sistema DEBERÁ permitir crear mesas con número y capacidad, y generar para cada una un código único no adivinable (≥ 128 bits de entropía).
- **AC-21.2** — EL sistema DEBERÁ generar un PDF imprimible con los QR de todas las mesas del restaurante, incluyendo número de mesa legible.
- **AC-21.3** — EL sistema DEBERÁ permitir revocar y regenerar el código de una mesa; el código anterior deja de funcionar inmediatamente.

---

### Épica G — Registro opcional (Capa 1)

#### US-22 — Iniciar sesión para guardar mis preferencias
- **AC-22.1** — EL sistema DEBERÁ ofrecer inicio de sesión con Google y Apple, siempre como acción opcional.
- **AC-22.2** — CUANDO un invitado inicie sesión, EL sistema DEBERÁ vincular su sesión anónima en curso a la cuenta, sin perder la orden armada.
- **AC-22.3** — EL sistema DEBERÁ permitir usar toda la funcionalidad del MVP sin iniciar sesión jamás.

#### US-23 — Guardar mi perfil alimentario
- **AC-23.1** — EL sistema DEBERÁ permitir registrar alérgenos, dieta y nivel de picante tolerado.
- **AC-23.2** — EL sistema DEBERÁ almacenar el perfil alimentario cifrado en reposo y no usarlo para ningún fin distinto de filtrar el menú.
- **AC-23.3** — EL sistema DEBERÁ permitir al usuario descargar y eliminar todos sus datos desde la propia app.

---

### Épica H — Analítica del piloto

#### US-24 — Medir qué funciona
- **AC-24.1** — EL sistema DEBERÁ registrar los eventos: `scan`, `menu_view`, `dish_view`, `model_view`, `ar_open`, `item_add`, `order_confirm`, `session_ready`, `waiter_call`.
- **AC-24.2** — EL sistema DEBERÁ almacenar los eventos sin IP en claro (sólo hash con sal rotativa) y sin identificadores publicitarios.
- **AC-24.3** — EL sistema DEBERÁ exponer un endpoint interno que devuelva las métricas M1–M5 por restaurante y rango de fechas.

---

## 8. Supuestos y riesgos

### 8.1 Supuestos declarados
Si alguno resulta falso, el plan cambia. Se validan en el piloto.

| # | Supuesto | Cómo se valida |
|---|---|---|
| S1 | El comensal escanea sin que el mesero se lo pida | Comparar mesas con y sin mención del mesero |
| S2 | La conectividad dentro del local permite cargar 4 MB en <3 s | Medición en sitio antes de firmar cada piloto |
| S3 | Un modelo generado desde 1 foto es aceptable para el comensal | Encuesta rápida en sitio + tasa de rechazo en revisión |
| S4 | El restaurante acepta poner una tablet con la Vista de Comandas | Confirmar en el acuerdo de piloto |
| S5 | El personal no sabotea el flujo por percibirlo como amenaza | Entrevista con meseros antes y a las 2 semanas |

### 8.2 Riesgos principales

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Calidad del 3D generado por debajo de lo aceptable | Alto | Media | Gate de revisión humana obligatorio; vía curada como respaldo (US-20) |
| Orden confirmada que no llega al personal | Muy alto | Baja | Persistencia de comanda + alerta sonora + reconciliación (AC-12.5, G3) |
| Dispositivos iOS antiguos sin AR Quick Look | Medio | Media | Degradar a visor 3D sin AR (AC-08.3) |
| Restaurante abandona por fricción operativa | Alto | Media | Vista de Comandas sin login obligatorio, cero cambios al flujo de cocina |
| Costo de cómputo del pipeline 3D | Medio | Baja | Ejecución local batch fuera de horario pico; cuota por restaurante |

---

## 9. Trazabilidad

| Épica | User stories | Fase de implementación |
|---|---|---|
| A — Entrada y sesión | US-01 … US-03 | Fase 2 |
| B — Menú | US-04 … US-06 | Fase 2 |
| C — AR | US-07 … US-09 | Fase 4 |
| D — Orden | US-10 … US-12 | Fase 3 |
| E — Comandas | US-13, US-14 | Fase 3 |
| F — Back-office | US-15 … US-21 | Fase 1 y Fase 5 |
| G — Registro | US-22, US-23 | Fase 6 |
| H — Analítica | US-24 | Fase 6 |

Detalle en [06_Implementation_Plan.md](06_Implementation_Plan.md).
