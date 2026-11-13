# Mapa de procesos, costo de alta y simulación de uso por plan

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/mapa-de-procesos-y-simulador` · **Estado:** investigación y modelo; no toca código, contrato ni documentos de plan (salvo una fila en `04 §11`). No se mandó carga a staging ni a producción. El simulador es `2026-11-13-simulador-de-uso.py` (junto a este informe); todas las tablas de la sección 4 salen de él (`python3 docs/research/2026-11-13-simulador-de-uso.py`, ~20 s, semilla fija).

Cada cifra lleva su marca: **[medida aquí]** (la medí hoy en un contenedor local de 4 núcleos), **[documento]** (la dice un documento del repositorio; se nombra), **[fuente externa]** (página leída hoy, con enlace) o **[estimada]** (con su supuesto). **[PENDIENTE]** = lo medirá otra rama o la T-4.4; se usó un valor conservador. **Margen de error general: ±2×** en todo lo que depende del CPU de Railway (no medido allí) y en lo que depende de qué parte de los comensales abre la app y deja la pantalla encendida (nadie lo ha medido).

---

## 0. Para Calvin

**Es un modelo, no una prueba.** Predice hasta dónde llegan los servicios que se pagan hoy. Una prueba de carga real (T-4.4) lo confirmaría o lo corregiría, y costaría **≈ 0.5 USD** de Railway (sección 4.9).

**Lo más importante**

1. **Con lo que se paga hoy (2 procesos de la API) caben ≈ 150 restaurantes gratuitos típicos, ≈ 55 de paga típicos, o ≈ 65 gratuitos si todos llenan su tope de 10 mesas × 6** (con 95 % de probabilidad de que la hora más cargada de cualquier día no pase de 70 % del CPU). **Lo que se agota primero es el CPU del servidor, no el dinero ni la base de datos.**
2. **Es 3–4 veces menos que lo que decía el informe de planes** (≈ 550 gratuitos, ≈ 170 de paga). Razón: aquel informe usaba la hora pico promedio y sólo restaurantes chicos; este usa el **p95 de 364 días** (con fines de semana), una mezcla de tamaños y cuenta además el **sondeo del personal y las escrituras**, que pesan casi tanto como los comensales en un restaurante chico (sección 4.1). Ambos están dentro del ±2×.
3. **Dinero: sí dan los números.** Sostener 1,000 restaurantes de paga a 349 pesos cuesta ≈ 150–370 USD/mes (según la forma) y deja ≈ 18,700 USD de ingreso; sostener 1,000 gratuitos cuesta ≈ 95–180 USD/mes (≈ 1.7–3.4 pesos por restaurante). **Lo que no da con la forma de hoy es el servidor**, y se arregla con cambios de bajo costo (abajo).
4. **El plan de paga al tope (40 mesas × 12) es el que rompe todo:** un solo restaurante así pesa **≈ 8 veces** un gratuito al tope y **≈ 18 veces** un gratuito típico, y con 288 teléfonos en un solo WiFi **dispara la regla de Cloudflare de 300 peticiones por 10 s** (en 11 % de sus horas con gente).

**Peor caso y caso base** (forma de hoy: sondeo de 3 s, 2 procesos; entre paréntesis, la forma optimizada: sondeo por fase + palancas de CPU)

| | Restaurantes que caben | Comensales/día (mes) | Mesas | Platillos | Costo/mes (USD) |
|---|---|---|---|---|---|
| **Peor caso:** todos gratuitos, cada uno al tope (10 × 6) | **65** (147) | 22,400 (673 mil) | 650 | 3,900 | 59 (79) |
| Peor caso + todos coinciden a la vez | 41 (89) | 23,300 | 410 | 2,460 | 60 |
| Todos gratuitos, típicos | **148** (307) | 16,900 (506 mil) | 1,417 | 5,900 | 75 (81) |
| Mezcla 90 % / 10 % de paga | 126 (266) | 15,400 | 1,402 | 5,500 | 75 |
| Mezcla 80 % / 20 % de paga | 110 (232) | 14,300 | 1,396 | 5,150 | 76 |
| **Caso base:** todos de paga, típicos | **55** (119) | 10,500 (314 mil) | 1,410 | 4,000 | 61 (84) |
| Todos de paga al tope (40 × 12) | 8 (22) | 11,900 | 320 | 2,400 | 58 |

Con **eventos con respaldo** (valores conservadores, **[PENDIENTE]** hasta que llegue la medición de la otra rama) caben ≈ 624 / 1,408 / 620 en los tres renglones en negrita.

**Qué se rompe primero, y a qué número**

1. **CPU de la API (2 procesos):** a **≈ 150 gratuitos / ≈ 55 de paga**. Palancas: 4 procesos (+85 %, ≈ 3 USD/mes de memoria), sondeo por fase (+110 %), eventos (+×4 o más, sin medir).
2. **Regla de Cloudflare (300/10 s por IP):** sólo con restaurantes de más de ≈ 90 teléfonos al frente en un WiFi; es el **paga al tope**. Se corrige subiendo el umbral en el panel (5 min).
3. **Volumen de PostgreSQL:** **plan Hobby = 5 GB**: se llena a ≈ 17 restaurantes de paga con 12 meses de historial; con Pro (1 TB) no es problema. Es un argumento para la retención.
4. Después, por mucho: red, R2, Firebase (33,000 restaurantes), conexiones a PostgreSQL (40 de ≈ 100, **sin verificar**).

**Costo de alta por actor** (una vez; detalle en §3)

| Actor | CPU del servidor | Dólares | Pesos | Tiempo para la persona |
|---|---|---|---|---|
| Restaurante | ≈ 3–15 s (PDF de QR, fotos, PINs) | **0.11–0.64 por lectura de PDF** (Opus 5.5); ≈ 0.2–0.4 típico | 2–12 por lectura | < 10 min [documento] |
| Comensal | ≈ 1.5 s por visita (mediano) | ≈ 0.00003 por comensal-hora | ≈ 0.0006 | menú visible 2.3 s (Slow 4G) |
| Mesero o capitán | **131 ms de CPU y 64 MiB por PIN** [medida aquí] | ≈ 0.000001 | ≈ 0.00002 | PIN ≈ 45 ms de servidor |
| Dueño | ≈ 0 | 0 (Firebase gratis hasta 50,000 activos al mes) | 0 | segundos |

**Decisiones que te tocan** (con mi recomendación; detalle en §6)

1. ¿**4 procesos** de la API antes del primer restaurante real? *Sí:* sube el tope 85 % por ≈ 3 USD/mes.
2. ¿El **plan de paga lleva 40 mesas × 12?** *Sí, pero sólo vendible en masa con el sondeo por fase y la regla de Cloudflare subida;* mientras tanto, un paga al tope cuesta 8 gratuitos.
3. ¿Las **3 lecturas de PDF del gratuito** son **por restaurante o por dueño**? *Por dueño (correo de Firebase):* si es por restaurante, quien quiera más lecturas crea otro restaurante.
4. ¿Cuántas **lecturas de PDF** en paga? *10 al mes* (propuesta; no dijiste cifra).
5. ¿**Retención del historial**? *30 días en gratuito, 12 meses en paga* (propuesta anterior): es lo que mantiene la base chica.
6. ¿Apruebas **medir** cuántos teléfonos quedan con pantalla encendida (es el supuesto más débil, ±44–61 % en el resultado)?
7. ¿Se **sondea al personal cada 5 s** en la vista nueva, o con la vista dividida/más lenta? Es 30–40 % del resultado y no está medido.

---

## 1. Mapa de procesos «como está hoy»

Leyenda de **Estado:** ✔ construido · ◐ construido y se sustituye en la Fase 3 · ○ sólo diseñado (Spec 001, `T-3.x`). **Cuándo:** `T` = por tiempo (reloj, aunque nadie haga nada), `E` = por evento (alguien hizo algo). Los números de CPU y bytes vienen de `docs/plan/perf/2026-11-13-modelo-de-capacidad.md` **[documento, medida allí]** y de `docs/research/2026-11-13-planes-y-costo-por-restaurante.md` **[documento]** salvo donde diga otra cosa; aquí no se volvieron a medir. Los dólares de la API de Claude son de Opus 5.5 a 4 / 20 USD por millón de tokens **[fuente externa: platform.claude.com/docs/en/about-claude/pricing, 13 nov 2026]**.

### 1.1 Alta del restaurante (la hace el dueño o gerente, una vez)

| # | Proceso | Pasos en llano | T/E | Tiempo para la persona | Qué gasta | Estado | Cómo se achica (ganancia estimada) |
|---|---|---|---|---|---|---|---|
| A1 | **Cuenta del dueño** | Toca «entrar con Google» (ventana emergente) o pide un enlace por correo; Firebase da el ID token; la API lo verifica sin SDK | E | segundos | ≈ 0 CPU (verifica una firma por petición); 0 USD (Firebase gratis hasta 50,000 activos/mes) | ✔ T-1.2, T-1.10 | Nada que achicar |
| A2 | **Leer el PDF de la carta** | Sube PDF (≤ 20 MB, ≤ 30 pág.) → el procesador lo toma (cada 10 s o al instante) → la API de Claude lo lee con salida estructurada → queda un borrador. El panel pregunta el estado cada 3 s hasta 10 min | E (la lectura) + T (el panel sondea) | hasta 170 s por corrida **[documento]**; el alta completa tomó < 10 min en staging **[documento: 04 §11]**; la espera real **no está medida** (la API real no se llamó) | **0.11–0.64 USD** por lectura (4–20 págs., 40–300 platillos); ≈ 200 peticiones de sondeo del panel (~0.7 s de CPU); 3 corridas como máximo por importación | ✔ T-1.8, T-1.9 | (a) Tope de lecturas (Calvin: 3 en gratuito): corta el gasto sin límite. (b) Haiku 5.5: 40–50× menos (0.003–0.016 USD) pero la precisión no está medida (ADR-014 pide ≥ 90 % de precios). (c) Sondeo del panel 3 s → 3/5/10 s: −40 % de ~200 peticiones (despreciable). (d) Batch API −50 % **no aplica**: la lectura es interactiva |
| A3 | **Revisar y confirmar** (INV-9) | Corrige categorías, precios, alérgenos; confirma → una transacción bajo `FOR UPDATE` del restaurante | E | 5–8 min **[estimada]** (< 10 min en total con A2 **[documento]**) | 1 transacción de hasta 1,000 platillos; sin IA | ✔ T-1.9 | Nada: es trabajo humano |
| A4 | **Fotos** | Elige foto, la recorta en el teléfono, sube; el servidor valida por contenido, reduce a 2 variantes y sube 3 archivos a R2 | E | ~1 s por foto + subida | 0.21 s de CPU (12 MP) a 0.6 s (48 MP); un original ≈ 3 MB en R2 + 7–16 KB de miniatura + 35–81 KB de detalle; R2 0.015 USD/GB-mes → 100 fotos ≈ 0.005 USD/mes **[fuente externa: developers.cloudflare.com/r2/pricing, 13 nov]** | ✔ T-1.4 | Reducir en el teléfono antes de subir ahorraría subida y CPU, pero el CPU es 0.2 s por foto y se hace una vez: **no vale la pena** salvo 100 fotos de golpe (21–60 s de un núcleo, que atiende sondeos más lento) |
| A5 | **Mesas y QR** | Crea N mesas (código de 128 bits, tope de 500 activas bajo `FOR UPDATE`); pide el PDF de tarjetas | E | segundos | PDF de QR: 46 ms (8 mesas) a 0.77 s (150); ≈ 5.3 KB por mesa; no se guarda | ✔ T-1.5 | Nada |
| A6 | **Personal y PIN** | Alta de la persona con PIN de 4–6 dígitos → Argon2id (t=3, m=64 MiB, p=4) en un pool propio de 2 hilos con cola acotada | E | segundos | **131 ms de CPU y 64 MiB transitorios por PIN** (mi medida, §3.3) | ✔ T-1.6 | Parámetros ya mínimos de OWASP; no tocar. La cola acotada protege |
| A7 | **Ajustes** (nombre, logo, horario) | PATCH parcial | E | segundos | ≈ 1 ms | ✔ T-1.13 (el horario: ○ T-3.x) | Nada |
| A8 | **Sembrar caché y menú público** | Al confirmar/editar, la API purga a Cloudflare en segundo plano | E | — | 1 llamada a la API de Cloudflare; el menú se arma una vez cada 30 s por restaurante (0.65–0.9 ms) | ✔ T-1.3, T-2.2 | Ya es mínimo |

### 1.2 Comensal (anónimo, en la mesa; las filas con ○ son la Fase 3 según la Spec 001)

| # | Proceso | Pasos en llano | T/E | Tiempo para la persona | Qué gasta (CPU de API · bytes · filas) | Estado | Cómo se achica |
|---|---|---|---|---|---|---|---|
| C1 | **Escanear y entrar** | Abre `/m/<código>` → `entrar` crea o reanuda la sesión (JWT de 6 h en cookie), pone alias y avatar | E | menú visible **2.31 s p75** en Slow 4G + CPU ×4, 1.55 s en Fast 4G **[documento: 04 §11]** | `entrar` 5.7–10 ms · ~1.7 KB · 2–3 filas (miembro, evento `scan`) | ✔ T-2.1, T-2.4 | Ya medido y mínimo; la carga del bundle la absorbe Cloudflare |
| C2 | **Ver el menú** | `GET /p/menu/{slug}` (caché del borde 30 s); relectura cada 25 s mientras se ve | T (relectura) | instantáneo después de la 1.ª carga | origen 0.65–0.9 ms, casi todo lo absorbe Cloudflare; 3–13 KB comprimido | ✔ T-2.2, T-2.5, T-2.7 | Relectura 25 s → solo al volver la pestaña + `ETag` ya la hace casi gratis; **no achicar** |
| C3 | **Buscar y filtrar** | Local en el teléfono; manda un `search`/`filter` sin texto en lote | E | instantáneo | 0 de servidor por búsqueda; un lote cada 5 s: 1.1–4.2 ms | ✔ T-2.5 | Lote cada 5 s → 15 s o solo al ocultarse: −60 % de lotes (≈ 3 % del total, no vale la pena) |
| C4 | **Ver un platillo** | Capa sobre el menú; `GET /p/platillos/{id}` si no está en memoria | E | instantáneo | 0.7 ms · 1–2 KB | ✔ T-2.6 | Ya local |
| C5 | **Sondeo de la mesa** («¿cambió algo?») | Cada teléfono con la app al frente pregunta con `ETag` cada **3 s**, en **todas** las fases; `304` casi siempre | **T** | invisible | **3.3 ms de CPU y ≈ 640 B por pregunta; ≈ 95 % de las peticiones y de la red** | ✔ T-2.4 (hoy fijo a 3 s) | **Sondeo por fase** (−35 % / −58 % si todos al frente), **eventos con respaldo** (§2 y simulador), palancas de CPU (−40 %) |
| C6 | **Armar la orden y confirmar** | Agrega/cambia ítems (el precio se lee de la base), confirma la ronda (`FOR UPDATE`, precio congelado) | E | segundos por ítem | ≈ 3 escrituras por comensal en la ronda + 1 confirmación; 6 ms c/u **[estimada]**; filas: orden, ítems, comanda | ○ T-3.x (la ronda); el sondeo del grupo ✔ | Nada: es la acción |
| C7 | **Llamar al mesero** | Un toque → fila `llamada_mesero` | E | 1 toque | 1 escritura + aviso al grupo del restaurante | ○ T-3.x | Nada |
| C8 | **Cerrar mi cuenta** (con propina declarada) | Elige propina (local), «cerrar mi cuenta» → dato `propina_declarada` | E | segundos | 1 escritura (propina como dato, no dinero) | ○ T-3.x | Nada |
| C9 | **«Ya pagué» → pago validado → mesa pagada → mesa limpia** | El comensal avisa (informativo); el personal valida; luego limpia la mesa y se liberan sesiones | E | el tiempo del restaurante (minutos) | 1–3 escrituras por cuenta; al limpiar, una transacción que libera sesión y mesa | ○ T-3.x | Cuidar que «mesa limpia» sea **una** transacción, no N |
| C10 | **Solicitud de entrada** (entrada cerrada, fuera de horario, 2 h en rojo) | Escanea → queda en espera → el personal aprueba o rechaza; vigencia 10 min | E + T (10 min) | hasta 10 min | ≈ +5 % de sondeos en el pico de aperturas; tope 5 por mesa y 20 por restaurante | ○ T-3.x | La vigencia se calcula al leer, **sin reloj** |
| C11 | **Cuenta cerrada vista por todos** | El estado de la mesa cambia; todos los teléfonos lo reciben en su siguiente sondeo | T→E | 0–3 s de retraso | invalida el estado en memoria (peor tasa de aciertos de la caché de 2 s) | ○ T-3.x | Eventos: el aviso llega en < 1 s sin sondear |

### 1.3 Personal (mesero y capitán; el capitán usa las mismas pantallas con opciones extra)

| # | Proceso | Pasos en llano | T/E | Tiempo para la persona | Qué gasta | Estado | Cómo se achica |
|---|---|---|---|---|---|---|---|
| P1 | **Entrar con PIN** | Elige su nombre, teclea el PIN → Argon2id → cookie de 12 h; en una tablet compartida, cambiar de persona = un toque + PIN | E | ≈ 1 s con red | **131 ms de CPU y 64 MiB por intento** (verificación = hash) [medida aquí]; una vez por turno por dispositivo | ○ T-3.4 | Límite de intentos por IP/persona **antes** de hashear (si no, 22 intentos/s por proceso saturan los 4 núcleos: DoS barato); no tocar los parámetros |
| P2 | **Ver las mesas** | La app del personal pregunta `GET /op/mesas` cada **5 s**; una vista por restaurante con estatus (verde/amarillo/rojo, minutos sin acciones) | **T** | invisible | **≈ 10 ms de CPU por petición [estimada]** (la vista calcula estatus de todas las mesas) × 3–6 dispositivos | ○ T-3.6 | Una sola consulta por vista; **cálculo del estatus al leer, sin reloj**; sondeo adaptativo (5 s con mesas activas, 15–30 s sin ninguna); eventos |
| P3 | **Atender una comanda** (`abierta` → `atendida` → `servida`) | Toca «atender» y luego «servida» | E | 1–2 toques | 1 escritura; aviso al grupo de la mesa | ○ T-3.5 | Nada |
| P4 | **Acciones de ciclo** (cerrar cuenta por alguien, cancelar lo que la cocina no empezó, validar pago, mesa limpia, aprobar solicitud, reabrir; capitán: cerrar/abrir la entrada) | Según la tabla de permisos de la Spec 001 §5 | E | 1–2 toques | 1 escritura cada una, comprobadas en un solo punto contra la tabla de permisos | ○ T-3.x | Nada |

### 1.4 Dueño (operación diaria)

| # | Proceso | Pasos | T/E | Tiempo | Qué gasta | Estado | Cómo se achica |
|---|---|---|---|---|---|---|---|
| D1 | **Editar el menú** | Cambia precio/nombre/orden → escritura → la API purga el menú en Cloudflare | E | segundos | ≈ 2 ms + 1 purga (ventana 0.2 s) | ✔ T-1.3, T-1.12 | Ya mínimo |
| D2 | **Agotar un platillo** | Interruptor optimista; los comensales lo ven en ≤ 60 s (refresco de 25 s + caché de 30 s) | E | 1 toque | igual que D1 | ✔ T-1.12 | Con eventos llegaría en < 5 s |
| D3 | **Panel con pedidos en vivo** | Sondea cada 5 s (como el personal) | **T** | invisible | ≈ 1 dispositivo × 10 ms × 0.2/s por hora abierta | ○ T-3.7 | Igual que P2 |

### 1.5 Sistema (nadie lo dispara)

| # | Proceso | Intervalo | Qué hace | Qué gasta | Estado | Cómo se achica |
|---|---|---|---|---|---|---|
| S1 | **Respaldo** | horario de Railway (no consta; lo ve Calvin) | `pg_dump` 18 → R2, 30 días | 1 contenedor aparte; pesa con el volumen (§4.6) | ✔ T-0.3/0.7 | Retención del historial achica el volcado |
| S2 | **Cierre por inactividad** | 300 s por proceso | 1 consulta con `SKIP LOCKED`, cierra sesiones con 3 h sin actividad | ≈ 0 (1 consulta cada 5 min por proceso) | ◐ **desaparece con T-3.12** (Spec 001: sin cierre por reloj) | Se elimina |
| S3 | **Procesador de importaciones** | 10 s (o al instante) | `FOR UPDATE SKIP LOCKED`; sin conexión durante la llamada a la API | 0.2 consultas/s con 2 procesos | ✔ T-1.9 | Con la cola vacía podría dormir 30 s: ganancia nula |
| S4 | **Purga de caché de Cloudflare** | ventana 0.2 s tras una escritura | agrupa purgas | 1 llamada por edición | ✔ T-1.3 | — |
| S5 | **Sonda de R2 en `/ready`** | ≤ 1 cada 20 s | `HEAD` | ≈ 130,000 al mes ≈ 0.05 USD | ✔ T-1.4 | — |
| S6 | **Estatus y recordatorio de mesa** (verde 20, amarillo 40, rojo 2 h; recordatorio a 30 min) | **por tiempo, pero debe calcularse al leer** | marca estatus; no cierra nada | si se implementa como tarea periódica por mesa: N mesas × reloj; si se calcula al leer: 0 | ○ T-3.x | **Calcular al leer** (diferencia de `ultima_actividad_en` con la hora) y mandar el recordatorio sólo cuando el personal ya está viendo; sin reloj |
| S7 | **Limpieza de historial** | no existe | borraría eventos/sesiones viejos según la retención del plan | evita crecer ≈ 20–50 MB/mes por restaurante | — (propuesta, Spec 002) | — |

---

## 2. Los dos grupos de eventos

**Idea de Calvin:** dos grupos, **comensales** (los de una mesa) y **restaurante** (meseros, capitanes y dueño). Cualquiera dispara un evento; el aviso se **publica una vez por grupo**; cada quien ve lo que su papel permite (tabla de permisos de la Spec 001 §5). Es compatible con la Spec 001 y con la forma actual; no la contradice.

**Qué ya es así hoy [documento: `app/services/sesion.py`, 02 §6]:** el estado de la mesa es **uno por mesa** (una entrada con `ETag` en memoria 2 s por sesión, invalidada tras cada escritura): doce teléfonos de la misma mesa comparten el mismo cálculo. **La vista del personal** (Fase 3) está diseñada como **una por restaurante**: todos los dispositivos del personal piden lo mismo y lo reciben filtrado por permisos.

**Qué cambiaría:** hoy cada teléfono *pregunta*; con eventos el servidor *publica una revisión* en cada grupo (un contador por mesa y uno por restaurante) y los demás se enteran. Cada grupo tendría una sola «revisión» (un número que sube al pasar algo); los teléfonos sólo piden el cuerpo cuando la revisión cambia. Esto es lo que mide la otra rama (`eventos-frente-a-sondeo`).

| Evento | Lo dispara | Grupo **comensales** (la mesa) lo recibe | Grupo **restaurante** lo recibe | Qué ve cada papel |
|---|---|---|---|---|
| Orden confirmada (ronda) | cualquier comensal | sí: «ronda N confirmada» | sí: nueva comanda | comensales: su cuenta y la de los demás; mesero/capitán/dueño: la comanda y los ítems |
| Comanda atendida / servida | mesero, capitán, dueño | sí | sí | comensales: «en camino», «servida»; personal: botón siguiente |
| Llamada al mesero | cualquier comensal | sí («avisado») | sí | personal: mesa y motivo; comensales: sólo que se avisó |
| Un comensal cierra su cuenta | el comensal o el personal por él | sí | sí | comensales: «Luis cerró su cuenta» (sin su propina); personal: consumo + propina declarada = a cobrar |
| Todas las cuentas cerradas → mesa en **cuenta cerrada** (candado) | sistema | sí (ya no se agrega) | sí | mismo cambio para todos; entrada cerrada |
| «Ya pagué» | el comensal | no | sí | personal: aviso informativo; comensales: nada |
| Pago validado / mesa pagada | mesero, capitán, dueño | sí (su cuenta) | sí | comensal: «pagada»; personal: mesa pagada (la propina se anota a quien valida) |
| Mesa limpia | personal | sí (se libera la sesión) | sí | el siguiente grupo puede escanear |
| Reabrir antes de «pagada» | personal | sí | sí | comensales vuelven a pedir |
| Cancelar ítem / quitar comensal / pasar cuenta / marcar flotante | personal | sí (al afectado y a la mesa) | sí | afectado ve «Marisol canceló una ensalada» |
| Solicitud de entrada | un recién llegado | sólo al solicitante (su estado) | sí | personal: aprobar/rechazar (todos); dueño igual; sólo capitán y dueño cierran la entrada |
| Cerrar/abrir la entrada de la mesa | capitán, dueño | sí (candado) | sí | el mesero ve el estado pero no puede cambiarlo |
| Estatus verde/amarillo/rojo y recordatorio | sistema (al leer) | no | sí | personal ve el color; los comensales nunca |
| Platillo agotado | personal o dueño | sí (menú) | sí | comensales: platillo atenuado; mesero: confirmación |
| Liberación forzada con cargos | sólo dueño | sí | sí | el dueño ve la confirmación |

**Ahorro estimado del esquema de dos grupos:** el publicado «una vez por grupo» evita N avisos por mesa (hasta 12 teléfonos + 3–6 dispositivos del personal comparten una sola revisión). Es el modelo de `eq_eventos` del simulador (§4); su valor real depende de la medición pendiente.

---

## 3. Costo de alta por tipo de usuario

Convertido a pesos con 18.6188 MXN por USD (FIX Banxico del 12 de noviembre **[documento: planes §3.5]**). CPU de Railway a 20 USD por vCPU-mes **[fuente externa: docs.railway.com/reference/pricing/plans, 13 nov 2026]** = 0.0000077 USD por vCPU-segundo.

### 3.1 Restaurante (una vez, y su parte de lo fijo)

| Concepto | Procesador | Bytes / filas | Dólares | Pesos | Tiempo para la persona | Marca |
|---|---|---|---|---|---|---|
| **Leer el PDF** (4 pág., 40 platillos) | ≈ 0 (espera de la API) | PDF ≤ 20 MB en R2 privado + 1 fila `importacion_menu` | **0.108** (Opus) / 0.003 (Haiku) | 2.0 / 0.05 | hasta 170 s por corrida (no medido) | [documento: planes §3.5], [estimada] ±30 % |
| Leer el PDF (8 pág., 100 platillos) | ≈ 0 | ídem | **0.236** / 0.006 | 4.4 / 0.11 | ídem | ídem |
| Leer el PDF (20 pág., 300 platillos) | ≈ 0 | ídem | **0.644** / 0.016 | 12.0 / 0.30 | ídem | ídem |
| Con reintentos (hasta 3 corridas) | ídem | ídem | hasta ×3 | | | [documento: `MAX_CORRIDAS = 3`] |
| **3 lecturas** (gratuito, Calvin) | | | **0.3–1.9** (típico ≈ 0.4: 1.6 lecturas medias × 0.2) | 6–36 (típico 7) | | [estimada]; el simulador usa 55 % 1 lectura, 30 % 2, 15 % 3 |
| Fotos (30–90 platillos, 20–70 % con foto) | 0.2 s por foto de 12 MP → 1–11 s en total | 3 MB + 0.1 MB por foto | ≈ 0.0001 | ≈ 0.002 | ~1 s por foto | [medida] ±2× / [estimada] |
| Platillos en la base | — | ≈ 1.1 KB por platillo (30–90 → 33–99 KB) | ≈ 0 | ≈ 0 | — | [medida aquí] (planes §2.1) |
| **PDF de QR** | 46 ms (8 mesas) a 0.77 s (150) | 5.3 KB por mesa; no se guarda | ≈ 0 | ≈ 0 | segundos | [medida] |
| Personal (3 en gratuito, 20 en paga) | **0.4 s (3) a 2.6 s (20)** de CPU: 131 ms por PIN | 1 fila por persona | ≈ 0.000003–0.00002 | ≈ 0 | segundos por persona | [medida aquí] |
| Almacenamiento inicial (base + fotos) | — | ≈ 18 MB (chico) a ≈ 170 MB (grande/formal) | 0.0003–0.003 /mes en R2 | ≈ 0.005–0.05 | — | [documento: planes §2.2] |
| **Su parte de la base fija** | — | — | 0.54 con 100 restaurantes, 0.14 con 1,000 (gratuito) | 10.1 / 2.6 | — | [documento: planes §6.3] |
| **Total de alta típico (gratuito)** | ≈ 3–15 s | ≈ 20–100 MB | **≈ 0.4–0.5** | **≈ 8–10** | **< 10 min** [documento] | |

Casi todo el costo de alta es **una cosa: la lectura del PDF con IA** (≥ 95 % del dólar). El resto es centavos de milésima.

### 3.2 Comensal (cada visita)

| Concepto | Procesador | Bytes | Filas | Dólares | Pesos | Tiempo para la persona |
|---|---|---|---|---|---|---|
| **Primera carga** (HTML + JS + CSS + fuentes + menú + ≈ 10 miniaturas) | casi 0 en el origen (Cloudflare absorbe estáticos y fotos); menú 0.65–0.9 ms | ≈ 90 KB gzip de JS/CSS (35 % del presupuesto de 250 KB **[documento: 04 §11]**) + 3–13 KB de menú + 7–16 KB × ~10 miniaturas ≈ 200–300 KB | 0 | ≈ 0 | ≈ 0 | **2.31 s p75** (Slow 4G, CPU ×4) **[documento]** |
| **Entrar** | 5.7–10 ms | ~1.7 KB | miembro + evento `scan` (2–3) | ≈ 0.00000008 | ≈ 0 | incluido |
| **Una visita completa** (comensal con app, mediana de 50 min) | **1.54 s** | **300 KB** | ≈ 4 KB (12 KB por mesa de 3) | **≈ 0.00003 por comensal-hora** (1.85 s de CPU + 0.36 MB) | ≈ 0.0006 | — |
| **Mil visitas medianas** | | | | ≈ 0.046 USD | ≈ 0.9 | |

Marca: [documento: planes §3.1–3.2], [medida allí] ±2× en CPU. El costo del comensal es **casi cero en dinero**; lo que pesa es el **espacio en el servidor** mientras tiene la pantalla encendida (§4).

### 3.3 Mesero o capitán: lo que cuesta un PIN (medido aquí)

Medición con el servicio real (`app.services.personal.hashear_pin` y `verificar_pin`, 20 repeticiones, contenedor de 4 núcleos Xeon a 2.1 GHz, Argon2id t=3 m=64 MiB p=4, pool de 2 hilos) **[medida aquí]**:

| Operación | Tiempo de pared (mediana · máx) | CPU total | Memoria | Concurrencia |
|---|---|---|---|---|
| Crear un PIN (hash) | **42 ms** · 49 ms | **131 ms** (4 hilos × ≈ 33 ms) | **+64 MiB** transitorios (VmHWM de 70 → 136 MB) | 2 hilos: hasta **+128 MiB** si coinciden |
| Verificar un PIN | **46 ms** · 57 ms | **135 ms** | igual | 8 simultáneas en 352 ms (≈ 44 ms efectivos cada una: el hash de 4 carriles usa todos los núcleos) |
| Memoria después | vuelve a la línea base (≈ 70 MB RSS del proceso) | | | |

- **Con qué frecuencia ocurre:** una vez al crear o reasignar el PIN (el dueño), y **una verificación por dispositivo por turno** (la cookie vale 12 h; el cambio de persona en una tablet compartida es una verificación más). Para un restaurante con 3 personas y 2 cambios de turno: ≈ 6–10 verificaciones al día, ≈ 1 s de CPU **[estimada]**.
- **En dinero:** 0.131 s × 0.0000077 USD = **≈ 0.000001 USD** (≈ 0.00002 pesos) por verificación.
- **Riesgo que sí importa (no dinero, CPU):** un intento de PIN ocupa **los 4 núcleos 42 ms**, así que ≈ 22 intentos por segundo por proceso saturan el servidor. El límite de intentos de T-3.4 debe actuar **antes** de hashear; la cola de 2 hilos con espera máxima de 10 s (503 `SERVICIO_OCUPADO`) ya acota el daño, pero a costa de lentitud para los demás. No se midió con el generador de carga; en Railway (compartido) el hash tardará más de 42 ms (×0.6–×1.5 es el factor de calibración del documento de capacidad).
- **Memoria en Railway:** si dos hashes coinciden son +128 MiB sobre los ≈ 170 MB de un proceso en reposo; a 10 USD/GB-mes sólo cuesta lo que dure.

### 3.4 Dueño (cuenta con Firebase)

| Concepto | Valor | Marca |
|---|---|---|
| Usuarios activos al mes gratis (Authentication con Identity Platform) | **50,000** | [fuente externa: firebase.google.com/pricing, 13 nov 2026] |
| Operadores por restaurante | 1–2 (supuesto 1.5) → el límite lo alcanzaría ≈ **33,000 restaurantes** | [estimada] |
| Inicio de sesión (ventana de Google o enlace) | 0 CPU propio, 0 USD | [documento: T-1.2] |
| Cuota diaria del **enlace por correo** y límites por día del plan Spark | **no figuran en la página leída;** hay que leerlos en la documentación de Firebase Auth (otra página) antes del primer restaurante | [PENDIENTE] |
| Envío del correo (Resend) | el repositorio usa Resend; **su plan no consta** (lo ve Calvin) | [documento] |

---

## 4. Hasta dónde llegan los servicios de hoy, recurso por recurso

### 4.0 Cómo funciona la simulación (en llano)

1. Por cada hora del día se sortean 1,500 restaurantes-hora: tamaño (mesas, comensales por mesa, platillos, personal) según el perfil del plan (chico, mediano, grande, formal; los cuatro de `planes-y-costo §1.3`), **curva de ocupación por hora** (comida 14:30, cena 21:00, desayuno 9:00 según el perfil), cuántas mesas están ocupadas, cuántas personas, cuántas abren la app (60 %), en qué **fase** de la Spec 001 está cada una (tiempos de la tabla de supuestos) y si tiene la pantalla encendida (según la fase).
2. Para N restaurantes se suman N sorteos (aproximación normal con corrección de asimetría) y se multiplica por el factor del día (día de la semana y azar). Se repite **364 días** y se lee el p95 del máximo del día.
3. **Tres formas de entrega:** *hoy* (sondeo de 3 s en todas las fases), *sondeo por fase* (5/3/10/20/3/5 s y detenido tras pagada) con las palancas de CPU del documento de capacidad (3.3 → 2.0 ms), y *eventos con respaldo* (sondeo de respaldo de 30 s, latido de 20 s, un aviso por minuto; todo **[PENDIENTE]**).
4. «Cabe» = el **p95 de los núcleos necesarios en la hora más cargada ≤ 2 núcleos** (los 2 procesos de hoy), con 70 % de uso como margen de diseño.

**Qué no incluye** (decláralo al leer): no hay red, ni Cloudflare, ni cola real de PostgreSQL; el CPU de Railway no está calibrado (±2×); el supuesto de que la hora más cargada coincide en todos los restaurantes (mismas curvas de ocupación) es conservador; no hay crecimiento en el tiempo, sólo el régimen estable de N restaurantes.

### 4.1 Procesador de la API (2 procesos)

**Mayor N con 95 % de probabilidad (CPU a 70 %)** — salida del simulador:

| Escenario | Hoy (sondeo de 3 s) | Sondeo por fase + palancas | Eventos con respaldo + palancas **[PENDIENTE]** |
|---|---|---|---|
| Peor caso: gratuitos al tope (10 × 6) | **65** | 147 | 624 |
| Peor caso + todos coinciden a la vez (sin descansos) | 41 | 89 | 370 |
| Todos gratuitos, típicos | **148** | 307 | 1,408 |
| Mezcla 90 % / 10 % paga | 126 | 266 | 1,260 |
| Mezcla 80 % / 20 % paga | 110 | 232 | 1,128 |
| **Caso base: todos de paga, típicos** | **55** | 119 | 620 |
| Todos de paga al tope (40 × 12) | **8** | 22 | 105 |

**Comensales simultáneos en la hora más cargada** (con la pantalla encendida; p50 / p95 / p99 entre los 364 días simulados) y núcleos que piden, con el N máximo de «hoy»:

| Escenario (N) | Frente p50 / p95 / p99 | Núcleos p95 (tope 2) |
|---|---|---|
| Peor caso (65) | 587 / 936 / 1,043 | 1.99 |
| Gratuitos típicos (148) | 447 / 715 / 802 | 1.99 |
| 80/20 (110) | 480 / 771 / 865 | 1.99 |
| Caso base (55) | 533 / 855 / 964 | 1.98 |
| Paga al tope (8) | 620 / 1,016 / 1,248 | 1.82 |

Contraste con el documento de capacidad: «≈ 1,200 comensales con la app abierta» a 70 % es el tope para una mezcla de sondeos; aquí el tope en teléfonos con pantalla encendida sale en 715–1,016 (p95) porque el sondeo del personal y las escrituras ocupan ≈ 25–50 % del CPU (§1.3 P2 y §4.9 de sensibilidad).

**Por qué el simulador da 3–4× menos que el informe de planes** (reconciliación hecha con el mismo simulador, mezcla sólo de chicos, 200 días): base 154 → sin variación entre días ni fines de semana y con la mediana en vez del p95: **232** → sin sondeo del personal ni escrituras: **438**. El informe de planes daba 553 («según fase», que sí incluía el 0.7 de la hora pico propia). Las diferencias son: (a) **p95 de los días y fines de semana** en vez de la hora típica (−34 %), (b) el sondeo del personal y las escrituras, que ese informe no contaba como carga (−47 %), (c) mezcla de tamaños (gratuito típico incluye 40 % de mediano/grande/formal).

**Qué se concluye:** el simulador, y no el informe de planes, es la cifra a tomar si Calvin acepta que (b) es real: **el sondeo del personal pesa tanto como el de los comensales en un restaurante chico**. Es el supuesto que más hay que medir (S_PERSONAL_MS = 10 ms es una cifra del documento de capacidad M4 dicha como «aun a 10 ms», no medida).

### 4.2 Conexiones y volumen de PostgreSQL

| | Valor | Marca |
|---|---|---|
| Conexiones a la base por proceso | 10 + 10 de reserva = 20 → **2 procesos = 40** | [documento: `Settings.DB_POOL_SIZE`, `DB_MAX_OVERFLOW`] |
| `max_connections` del PostgreSQL de Railway | **no figura** en la página de la plantilla (`docs.railway.com/databases/postgresql`, 13 nov); se supone ≈ 100 | [fuente externa: la página no lo dice] → [estimada, **sin verificar**: `SHOW max_connections`] |
| Con 4 procesos y 8 procesos | hay que bajar el pool a 5+5 y 3+2 (40 conexiones) | [documento: planes §6.1] |
| Memoria compartida por defecto (SHM) | 64 MB | [fuente externa: docs.railway.com/databases/postgresql] |
| Volumen máximo Hobby / Pro | **5 GB / 1 TB** | [fuente externa: docs.railway.com/reference/pricing/plans, 13 nov 2026] |

Crecimiento del volumen en régimen (12 KB por visita [estimada ±2×], 1.1 KB por platillo [medida], retención 30 días gratuito / 365 paga **[propuesta, sin decidir]**):

| Escenario (N de «hoy») | Volumen en régimen | N que llenaría 5 GB (Hobby) |
|---|---|---|
| Peor caso (65) | 1.4 GB | 240 |
| Gratuitos típicos (148) | 2.5 GB | 299 |
| 90/10 (126) | 4.7 GB | 135 |
| 80/20 (110) | 6.5 GB | 85 |
| **Caso base (55)** | **15.7 GB** | **17** |
| Paga al tope (8) | 4.4 GB | 9 |

**Lectura:** con paga (12 meses de historial) el plan Hobby se acaba rápido; con Pro (1 TB) el volumen **no** es el cuello de botella hasta cientos de miles de GB. **La retención es la palanca:** con 30 días en todos, el caso base bajaría de 15.7 a ≈ 1.3 GB.

### 4.3 Límites del plan de Railway

| Límite | Valor | Marca | ¿Se alcanza? |
|---|---|---|---|
| Suscripción / uso incluido (Hobby, Pro) | 5 USD / 5 USD · 20 USD / 20 USD | [fuente externa: docs.railway.com/reference/pricing/plans, 13 nov 2026] | — (qué plan tiene Carta lo ve Calvin) |
| Máximos por servicio (con réplicas) | Hobby 6 réplicas / 48 vCPU / 48 GB; Pro 42 réplicas / 1,000 vCPU / 1 TB | ídem | Nunca con estos números |
| Conexiones simultáneas por dominio | **10,000** | [fuente externa: docs.railway.com/networking/public-networking/specs-and-limits, 13 nov 2026] | Con eventos (una conexión por teléfono al frente) 1,000 teléfonos = 1,000 conexiones: ≪ 10,000 |
| Peticiones por segundo por dominio | **≈ 11,000** | ídem | Nuestro pico ≈ 400–600 rps: 5 % |
| Duración de una petición / reposo HTTP/1.1 | 15 min con datos / 5 min sin datos / 60 s de reposo; **websockets exentos** | ídem | No limita sondeo; para SSE hay que revisar el reposo de 60 s |
| CPU | se cobra el que se usa (20 USD/vCPU-mes); sin límite propio hasta los máximos | ídem | no |

### 4.4 Cloudflare plan gratuito

| Límite | Valor | Marca |
|---|---|---|
| Reglas de límite de tasa | **1** | [fuente externa: developers.cloudflare.com/waf/rate-limiting-rules, 13 nov 2026] |
| Periodo de conteo / de bloqueo | **10 s** / **10 s** (únicas) | ídem |
| Característica de conteo | **IP** (única) | ídem |
| Regla actual de Carta | 300 peticiones / 10 s por IP y centro de datos → bloqueo 10 s; todas las rutas menos `/health` y `/ready` | confirmada hoy en el panel por la maestra (**[PENDIENTE de ver en el panel]**; no la leí yo) |
| Tamaño máximo de archivo cacheable en Free | 512 MB | [fuente externa: developers.cloudflare.com/cache/concepts/default-cache-behavior] |
| Límite de peticiones o ancho de banda en Free | **no figura** en lo leído | [fuente externa] |

**Cuándo se dispara la regla:** 300 / 10 s = **30 peticiones por segundo por IP**. Con sondeo de 3 s (0.33 rps), un restaurante con **más de ≈ 90 teléfonos al frente en su WiFi** (el 70 % de los que se conectan al WiFi del local, supuesto) la excede. El simulador cuenta las restaurante-hora que la rebasan:

| Escenario | restaurante-hora que dispararían la regla |
|---|---|
| Gratuitos (al tope o típicos), caso base (típico) | **0.0 %** |
| **Paga al tope (40 × 12)** | **11.3 %** |

El umbral más sensato es subir la regla a 1,500 por 10 s (el documento de capacidad lo propone, palanca 0); Free permite una sola regla y su duración es de 10 s, así que sólo se ajusta el número.

### 4.5 R2 (fotos y respaldos)

| | Valor | Marca |
|---|---|---|
| Almacenamiento gratis / precio | 10 GB-mes / 0.015 USD por GB-mes | [fuente externa: developers.cloudflare.com/r2/pricing, 13 nov 2026] |
| Operaciones gratis / precio clase A / clase B | 1 M y 10 M al mes / 4.50 y 0.36 USD por millón | ídem |
| Salida a internet | gratis | ídem |

R2 en régimen con el N de hoy: peor caso 3.8 GB · gratuitos típicos 6.6 GB · caso base 6.6 GB → **dentro de los 10 GB gratis** (con el N de «optimizada» sube a ≈ 14 GB en las mezclas, en gratuitos típicos y en el caso base ⇒ ≈ 0.06 USD/mes de excedente). Operaciones: despreciables. **No limita.**

### 4.6 Proveedor de identidad (Firebase)

50,000 usuarios activos al mes gratis **[fuente externa: firebase.google.com/pricing, 13 nov 2026]** ⇒ **≈ 33,000 restaurantes** con 1.5 operadores cada uno: no limita nada de lo que viene. **Pendiente:** cuota diaria del enlace por correo (§3.4).

### 4.7 Gasto en la API de Claude

Del simulador (Opus 5.5, 6 páginas medias, ×1.3 por reintentos): lecturas **de alta** (una vez, por todos los N de «hoy»): peor caso **22 USD**, gratuitos típicos **42**, 80/20 **33**, caso base **19**; **mensual en régimen** (4 % de altas nuevas al mes, 0.5 lecturas/mes por restaurante de paga): 1–6 USD/mes. **Con Haiku** serían 40–50 veces menos. Cada restaurante gratuito más que se registra suma ≈ 0.4 USD (3 lecturas) una vez; **sin tope por dueño, un abusador crea restaurantes y se lleva 0.64 × 3 por cuenta** (decisión 3).

### 4.8 Red de salida

0.05 USD/GB **[fuente externa: Railway]**; ≈ 640 B por petición (93 % `304` de 580 B). Con el N de «hoy»: 95–130 GB al mes ⇒ **5–7 USD/mes**. Con la forma optimizada y el N mayor: 190–230 GB ⇒ 10–11 USD/mes. Quitar las 3 cabeceras sólo-HTML de `/api` (302 de 606 B) la bajaría a la mitad, ahorro < 6 USD. **No limita.**

### 4.9 Si se necesitaran 500 o 1,000 restaurantes (por forma de entrega)

Núcleos necesarios (p95) y costo mensual si se subiera `WORKERS` a lo necesario (Railway cobra el CPU usado; 20 USD de suscripción incluidos; las conexiones a PostgreSQL exigen bajar el pool por proceso, y más allá de ≈ 24 vCPU habría que repartir en réplicas: la página de planes sólo da máximos por servicio que incluyen réplicas, y el documento de capacidad ya anotó que otra página habla de 24 vCPU por réplica).

| N | Escenario | Hoy | Por fase + palancas | Eventos **[PENDIENTE]** |
|---|---|---|---|---|
| 500 | Gratuitos típicos | 6.5 núcleos · 113 USD | 3.2 · 96 | 0.7 · 71 |
| 500 | Caso base (paga) | 16.9 · 208 | 8.0 · 159 | 1.6 · 98 |
| 1,000 | Gratuitos típicos | 13.1 · 181 | 6.5 · 145 | 1.4 · 93 |
| 1,000 | Caso base (paga) | 33.9 · 371 | 16.0 · 273 | 3.2 · 151 |
| 1,000 | Peor caso (10 × 6) | 29.2 · 293 | 13.3 · 207 | 3.2 · 110 |
| 1,000 | Paga al tope | 193.9 · 1,555 | 83.6 · 932 | 18.4 · 333 |

Comensales por día / mes con 1,000 típicos gratuitos: ≈ 114,000 / 3.4 millones; 9,575 mesas; 40,000 platillos. Con 1,000 de paga: ≈ 190,000 / 5.7 millones; 25,600 mesas; 72,000 platillos. Con 1,000 de paga al tope: ≈ 1.5 millones/día. **Los dólares dan en todos los casos menos el último con la forma de hoy (1,555 USD/mes frente a 18,700 de ingreso: sigue dando, pero requiere ≈ 190 núcleos).**

**¿Dan los números?** Ingreso del caso base: 349 pesos antes de IVA = 18.74 USD por restaurante. Costo por restaurante en el N que cabe hoy: 1.12 USD (caso base), 0.51 (gratuitos típicos). **Un restaurante de paga cubre los costos de ≈ 100 gratuitos** (planes §6.4). **Conclusión:** el servidor de hoy aguanta un piloto serio (≈ 50 restaurantes de paga a la vez, ≈ 150 gratuitos); para pasar de ahí a cientos se necesitan 4 procesos y el sondeo por fase, y para miles los eventos o más núcleos.

### 4.10 Sensibilidad: qué supuesto mueve más el resultado

N máximo («hoy») al mover cada supuesto entre un valor bajo y uno alto; ordenado por efecto (gratuitos típicos, base N = 147; caso base de paga, base N = 54):

| Supuesto | Gratuitos típicos (bajo / alto) | Efecto | Caso base paga (bajo / alto) | Efecto |
|---|---|---|---|---|
| **Núcleos 2 → 4 (3.6 útiles)** | 272 / 147 | **85 %** | 100 / 54 | **85 %** |
| **Percentil 0.50 / 0.99** | 233 / 131 | 59 % | 88 / 48 | 63 % |
| **Pantalla encendida** (×0.5 / todas al frente) | 211 / 90 | 44 % | 87 / 29 | **61 %** |
| **CPU por petición** (S_MS ×0.5 / ×2) | 209 / 92 | 42 % | 84 / 31 | 56 % |
| **Restaurantes activos** (0.4 / 0.8 de los registrados) | 217 / 113 | 48 % | 80 / 42 | 48 % |
| **Sondeo del personal** (3 / 20 ms) | 206 / 104 | 40 % | 70 / 41 | 30 % |
| Uso de la app (0.4 / 0.8) | 189 / 123 | 29 % | 73 / 44 | 35 % |
| Ocupación en pico (×0.8 / ×1.2) | 187 / 128 | 27 % | 70 / 46 | 30 % |
| Utilización máxima (0.6 / 0.8) | 125 / 170 | 16 % | 46 / 63 | 17 % |
| Variación entre días (σ 0.05 / 0.30) | 160 / 130 | 12 % | 59 / 47 | 13 % |
| Duración de la visita (×0.7 / ×1.4) | 144 / 149 | 2 % | 54 / 55 | 2 % |

**Lectura:** lo que más mueve el resultado (descontando el número de núcleos y el percentil, que son decisiones) son **cuántos teléfonos tienen la pantalla encendida**, **el costo real por petición en Railway**, **qué parte de los registrados está activa** y **el sondeo del personal**; ninguno está medido. La duración de la visita casi no influye porque la ocupación se fija directamente (sólo cambia las llegadas y las escrituras).

### 4.11 Qué confirmaría una prueba de carga real (T-4.4) y cuánto costaría

La T-4.4 confirmaría, en orden de efecto sobre el resultado: (1) `S_MS` real en Railway (CPU por petición) y cuántos vCPU recibe de verdad el servicio con `WORKERS` = 2 y 4; (2) el costo de `GET /op/mesas` con la vista de estatus (S_PERSONAL_MS); (3) la tasa de pantalla encendida (con un evento de visibilidad en la analítica, no en la prueba); (4) la regla de Cloudflare con muchos clientes desde una IP; (5) `max_connections` de PostgreSQL; (6) la curva latencia-uso y el reparto entre procesos; (7) las escrituras reales (confirmar comanda, validar pago, mesa limpia); (8) el efecto de cada palanca por separado. **Nada de esto se puede obtener de un modelo.**

**Costo de una prueba de ≈ 2 horas contra staging** (rampa, 70 % de uso sostenido varios minutos, búsqueda del tope) **[estimada]**: CPU: 2 vCPU × 70 % × 2 h = 2.8 vCPU-h × 0.0278 USD/vCPU-h = **0.08 USD**; salida de red: 420 rps × 640 B × 7,200 s = 1.9 GB × 0.05 = **0.10 USD**; RAM de la API y PostgreSQL de staging encendidos ya se pagan; el generador (k6) corre en otra máquina (la del ensayo o una VM de ≈ 0.05 USD/h) ⇒ **≈ 0.3–0.5 USD en total**, más el tiempo de la sesión. **La prueba es barata en dinero; lo que cuesta es no mandar carga a producción:** va a staging con restaurante de prueba, como dice `/carga`.

---

## 5. Ideas fuera de la v1 (decisión 6)

**Generación de imágenes o modelos 3D de platillos con un modelo alojado propio y una fila de espera.** *Fuera de la v1: ADR-011 descarta 3D y AR, y la Fase 5 es lo que viene después. No se construye ni se estima aquí con cifras de un proveedor.*

La idea de Calvin: una cola donde los gratuitos esperan y tienen cuota, los de paga pasan primero, y la capacidad del mes se reparte 80/20 o 70/30 entre gratuitos y paga.

**Cómo se dimensionaría (la cuenta que falta, qué datos faltan):**

1. **Capacidad mensual de la máquina** = horas útiles al mes × modelos por hora. Si el reparto es 80/20: gratuitos reciben 80 % de esa capacidad y paga 20 % pero **con prioridad** (pasan primero); con 70/30 al revés. La **cuota por restaurante** sale de dividir la parte de cada plan entre los restaurantes de ese plan: `cuota_gratuita = 0.8 × M / N_gratuitos`, `cuota_paga = 0.2 × M / N_paga` (M = modelos por mes).
2. **Datos que faltan** (no se inventan aquí):
   - **Tiempo por modelo** (segundos de GPU por imagen o por 3D) del modelo elegido: se mide una vez con el modelo en una máquina de prueba.
   - **Costo de la máquina:** el precio por hora de una GPU en la página de un proveedor, leído el día de la decisión (los precios de GPU cambian). Railway no ofrece GPU en lo leído; el documento de modelo de negocio calcula ≈ 10.5 pesos por platillo en la nube (Meshy) **[documento: `2026-09-19-modelo-de-negocio-y-pagos.md`]** como referencia de costo por modelo con un proveedor externo.
   - **Cuántos platillos genera un restaurante** (los 30–90 de la carta × la parte que quiere modelo).
   - **Máquina encendida siempre o por demanda** (la cola exige una cola persistente: en la v1 hay `FOR UPDATE SKIP LOCKED` en PostgreSQL, que ya sirve de cola sin Redis, ADR-012).
3. **Fórmula para decidir:** `horas_GPU_al_mes = M × segundos_por_modelo / 3600`; `costo = horas_GPU × USD_por_hora` (a demanda) o `730 × USD_por_hora` (siempre encendida); `precio_mínimo_del_plan_paga = costo × 0.2 (o 0.3) / N_paga`. Con tiempos de espera: una cola M/M/1 sencilla da la espera media de un gratuito = `ρ/(μ(1-ρ))` con ρ = carga de la cola.
4. **Qué decide el reparto 80/20 o 70/30:** cuántos gratuitos esperan días. Con N_gratuitos grande y cuotas pequeñas, la espera media sube; se fija con una cuota por restaurante por mes y un límite de platillos con modelo en gratuito (propuesta: 5).
5. **Dónde cabe sin romper la arquitectura:** una tabla `trabajo_generacion` con estado y prioridad (paga > gratuito), un procesador igual al de importaciones (`FOR UPDATE SKIP LOCKED`) y el modelo detrás de una URL propia. **Sin SDK propietario de nube** (regla 13) y sin 3D en la v1 (regla 14): requeriría un ADR que sustituya al 011.

---

## 6. Qué te toca decidir (completo)

Cada una con mi recomendación en primer lugar; las 7 de la sección 0 se amplían aquí.

1. **¿4 procesos de la API antes del primer restaurante real?** *Sí.* Sube el tope ≈ 85 % (272 gratuitos típicos / 100 de paga) por ≈ 3 USD/mes de memoria. Es una variable de Railway (`WORKERS=4`, pool 5+5), no código.
2. **Planes: 10 mesas gratis / 40 en paga** (decisión 1). *Se quedan.* **Por qué 10:** cubre al perfil chico (fonda, taquería: moda de 10 mesas; el 96 % de las unidades son microempresas **[fuente externa: INEGI-CANIRAC 2021]**) y acota el pico de teléfonos de un gratuito a 60 × 0.6 = 36. **Consecuencias en capacidad:** un gratuito al tope pesa 0.031 núcleos (2/65) en la hora pico, 2.3× un gratuito típico (0.0135); un paga típico, 0.036; **un paga al tope (40 × 12), 0.25 núcleos: 8 veces un gratuito al tope y 18 veces uno típico, y dispara la regla de Cloudflare.** Recomendación: dejar 40 × 12 pero no ofrecerlo a muchos hasta tener el sondeo por fase y subir la regla (o poner el máximo de 12 por mesa sólo para mesas grandes, no las 40).
3. **Personal 3 en gratuito y 20 en paga** (decisión 2): el costo de CPU de los PINs es nulo (0.4 s y 2.6 s una vez); lo que pesa es el **sondeo del personal** (cada dispositivo en servicio pregunta cada 5 s a ≈ 10 ms **[estimada]**; en el simulador, los dispositivos activos dependen de las mesas ocupadas, hasta 3 en gratuito y hasta 20 en paga). La justificación estadística va en la otra rama.
4. **3 lecturas de PDF en gratuito, una sola vez, no por mes** (decisión 3): *buena regla.* Con 2 lecturas al mes un gratuito que las use todas gasta ≈ 24 × 0.2 = 4.8 USD al año; con 3 en total, ≈ 0.3–0.4 USD una vez. Para 148 gratuitos son 42 USD una vez (simulador) frente a ≈ 700 USD al año con 2 al mes. **Abierto:** ¿por restaurante o por dueño? Por restaurante, crear otro restaurante da 3 lecturas más. *Recomiendo por dueño (correo de Firebase)*, y hasta decidir el cobro, 10 al mes en paga (no diste cifra).
5. **Eventos en dos grupos** (decisión 4): *sí*; compatible con la Spec 001. Espera a la medición de la otra rama para fijar el beneficio.
6. **Tope de platillos** (decisión 5): se decide con la estadística de cartas. En el simulador el tope de gratuito está en 60 y paga en 300 (propuesta anterior); casi no afecta (≈ 1.1 KB por platillo): lo fija el peso del menú público y el costo de leer el PDF.
7. **Retención del historial:** *30 días gratuito, 12 meses paga* (sin decidir). Sin esto la base de 55 restaurantes de paga llega a 15.7 GB y rebasa Hobby.
8. **Plan de Railway:** si Carta está en Hobby, el volumen de 5 GB se llena con ≈ 17–85 restaurantes de paga/mezcla; con Pro no. *Confirmar qué plan tiene Carta* (lo ve Calvin).
9. **Medir la pantalla encendida y el costo de `GET /op/mesas`** antes de fijar nada más: son los supuestos con más efecto no medidos.
10. **Abrir la Spec 002 «Planes»** después del ciclo de la mesa (T-3.x), como ya quedó escrito en el informe de planes §9.

---

## Fuentes y marcas

- **Repositorio:** `docs/plan/perf/2026-11-13-modelo-de-capacidad.md`; `docs/research/2026-11-13-planes-y-costo-por-restaurante.md` y su guion; `docs/specs/001-ciclo-de-la-mesa/spec.md` (ciclo, permisos §5, supuestos §3); `app/services/{personal,sesion,procesador,importaciones}.py`, `app/core/config.py`, `Dockerfile`, `frontend/src/comensal/entrada/useEntrada.ts`; `prototipo/js/{mesero,capitan,checkout-v2,admin-onboarding,admin-ops}.jsx` (P05 Checkout y propina, P06/P07 Mis mesas y Detalle de mesa, C01–C08 pantallas del capitán, P21 Alta del restaurante, P13 Configuración): **el prototipo se tomó sólo como referencia del flujo del ciclo; donde habla de pagos, AR y comisión (P05, P21) está fuera de la v1.**
- **Medido aquí hoy:** `app.services.personal.hashear_pin` y `verificar_pin` (20 repeticiones cada uno; 8 verificaciones simultáneas; memoria con `/proc/self/status`).
- **Páginas leídas el 13 de noviembre de 2026:** `firebase.google.com/pricing` (50,000 MAU; el resto de los límites de Auth no figura); `developers.cloudflare.com/waf/rate-limiting-rules/` y `/parameters/`; `developers.cloudflare.com/cache/concepts/default-cache-behavior/`; `developers.cloudflare.com/r2/pricing/`; `docs.railway.com/reference/pricing/plans`; `docs.railway.com/networking/public-networking/specs-and-limits` (`docs.railway.com/reference/limits` dio 404); `docs.railway.com/databases/postgresql` (sin `max_connections`); `platform.claude.com/docs/en/about-claude/pricing` (Opus 5.5 4/20, Sonnet 5.5 2/10, Haiku 5.5 0.10/0.50 por millón de tokens; Batch −50 %).
- **Pendientes en otras ramas (no existían en `origin` al empezar):** `agente/medicion-eventos-frente-a-sondeo` (parámetros de «eventos») y `agente/estadistica-de-cartas-y-personal` (distribuciones). El simulador acepta las segundas con `--distribuciones`; hasta entonces usa los cuatro perfiles de planes §1.3.
