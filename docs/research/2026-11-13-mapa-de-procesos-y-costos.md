# Mapa de procesos, costo de alta y simulación de uso por plan

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/mapa-de-procesos-y-simulador` · **Estado:** investigación y modelo (**ronda 2 del 13 de noviembre: plan Hobby, dos entornos, eventos medidos, foto y 3D, auditoría de fuentes; ronda 3: memoria de PostgreSQL deducida de la factura real de Railway**); no toca código, contrato ni documentos de plan (salvo una fila en `04 §11`). No se mandó carga a staging ni a producción. El simulador es `2026-11-13-simulador-de-uso.py` (junto a este informe); todas las tablas de la sección 4 salen de él (`python3 docs/research/2026-11-13-simulador-de-uso.py`, ~20 s, semilla fija).

Cada cifra lleva su marca: **[medida aquí]** (la medí hoy en un contenedor local de 4 núcleos), **[documento]** (la dice un documento del repositorio; se nombra), **[fuente externa]** (página leída hoy, con enlace) o **[estimada]** (con su supuesto). **[PENDIENTE]** = lo medirá otra rama o la T-4.4; se usó un valor conservador. **Margen de error general: ±2×** en todo lo que depende del CPU de Railway (no medido allí) y en lo que depende de qué parte de los comensales abre la app y deja la pantalla encendida (nadie lo ha medido).

---

## 0. Para Calvin

**Es un modelo, no una prueba.** Predice hasta dónde llegan los servicios que pagas hoy: **Railway Hobby, dos entornos encendidos (staging y producción), Cloudflare gratuito y 25 USD al año del dominio.** Tu factura real llegó el 13 de noviembre (0.6422 USD acumulados; ronda 3) y con ella la sección 4.12 da la curva al revés: cuántos restaurantes caben si la factura no pasa de 5, 10, 15, 20 o 40 USD.

### Qué está medido o documentado y qué es supuesto

| **Medido o documentado** (tiene fuente) | **Supuesto** (juicio; va a «datos por conseguir», §7) |
|---|---|
| CPU por petición de sondeo, escritura y entrar (3.3 / 6 ms, medido local) | CPU real en Railway (±2×), CPU de la vista del personal (10 ms) |
| Costo de un PIN: 131 ms de CPU y 64 MiB (medido hoy con el servicio real) | Cuántos comensales abren la app (60 %) y cuántos tienen la pantalla encendida por fase |
| Eventos: respaldo 60 s, latido 25 s, 0.09 ms y 4.2 ms (medido, informe de eventos) | Tamaño de los restaurantes (mesas, comensales por mesa, visitas, horarios) y su coincidencia |
| Precios y límites de Railway Hobby, Cloudflare, R2, Firebase y la API de Claude (leídos el 13 de noviembre) | Reparto de la memoria entre servicios (la factura real da el total por entorno) y `max_connections` |
| Tamaño de fotos (medido) y presupuesto del `.glb` de 4 MB (documento) | Tamaño del original de una foto de teléfono (3 MB), bytes por visita en la base (12 KB) |
| Platillos por carta: 148 cartas, mediana 44, p90 82 (rama de estadística) | Personal y mesas por tamaño de negocio (modelo con supuestos) |
| Topes de plan, lecturas de PDF y retención (decididos por ti) | Cuántos restaurantes se registran y cuántos operan cada día (60 %) |

Cada parámetro del simulador, con su marca y su fuente, está en la **auditoría de la sección 7**.

### Cuántos restaurantes caben con lo que pagas hoy

Con Railway Hobby y **2 procesos** de la API, con 95 % de probabilidad de que la hora más cargada de cualquier día no pase de 70 % del CPU. Hay **dos muros que no dependen del dinero:** el procesador (2 procesos) y el **disco de 5 GB** de PostgreSQL en Hobby. Manda el que llega primero.

| Escenario | Muro CPU, sondeo de hoy | Muro CPU, por fase + palancas | Muro CPU, eventos medidos | **Muro de disco 5 GB** (sin importar la forma) | Comensales/día (mes) con la forma de hoy | Mesas | Platillos |
|---|---|---|---|---|---|---|---|
| **Peor caso:** gratuitos al tope (10 × 6) | **65** | 147 | 420 | 240 | 22,400 (673 mil) | 650 | 5,200 |
| Peor caso + todos coinciden a la vez | 41 | 89 | 249 | 146 | 23,300 | 410 | 3,300 |
| Todos gratuitos, típicos | **148** | 307 | 1,064 | 299 | 16,900 (506 mil) | 1,417 | 6,400 |
| Mezcla 90 % / 10 % de paga | 126 | 266 | 944 | 135 | 15,400 | 1,402 | 5,800 |
| Mezcla 80 % / 20 % de paga | 110 | 232 | 840 | **85** | 14,300 | 1,396 | 5,400 |
| **Caso base:** todos de paga, típicos | **55** | 119 | 450 | **17** | 10,500 (314 mil) | 1,410 | 4,000 |
| Todos de paga al tope (40 × 12) | **8** | 22 | 66 | 9 | 11,900 | 320 | 2,400 |

**Lo que de verdad cabe es el menor de las dos columnas:** con la forma de hoy, **65 en el peor caso, 148 gratuitos típicos y 17 de paga** (el caso base lo frena el disco, no el procesador, porque en paga se guardan 12 meses de historial). Con retención de 30 días también en paga el caso base subiría a ≈ 212 por el disco, y entonces manda el CPU (55).

**La factura (ronda 3, con el dato real de Railway):** la captura de «Usage» del 13 de noviembre (0.6422 USD acumulados) proyecta **≈ 8.5 USD al mes (7.6–9.5)** sin tráfico con los dos entornos, y deja deducir la memoria de PostgreSQL y el respaldo: **≈ 0.085 GB por entorno (0.045–0.135)**, que sustituye al supuesto (antes cota 0 o ilustrativo 0.5). El piso del simulador queda en **8.10 USD**. **El tráfico suma poco**: ≈ 0.08–0.24 USD por restaurante al mes con la forma de hoy y 0.01–0.07 con eventos. Con 10 USD de tope caben 8–23 con la forma de hoy y 17–145 con eventos; **con 20 USD caben casi todos los que el CPU y el disco dejan** (sección 4.12). Pasado el piso, el dinero no es el límite en Hobby; los muros son el CPU y el disco.

**Qué se rompe primero:** (1) el procesador de la API; (2) el disco de 5 GB en cuanto hay restaurantes de paga con 12 meses de historial; (3) la regla de Cloudflare sólo con el plan de paga al tope.

### Recuadro: «subir a 4 procesos» en llano

- **Un proceso de la API es un cajero.** Atiende las peticiones de una en una y sólo usa un núcleo del servidor. Hoy hay **2 cajeros** (`WORKERS=2`); cuando los dos están ocupados, la gente hace fila y las respuestas tardan segundos.
- **Subir a 4 es contratar 2 cajeros más** en la misma ventanilla: es una variable en Railway (`WORKERS=4`), no código. No cambia lo que hace la app, sólo cuántas peticiones atiende a la vez.
- **Cuánto sube el tope:** de ≈ 2 a ≈ 3.6 núcleos útiles, **+85 %** en el modelo (148 → 272 gratuitos típicos, 55 → 100 de paga). El 3.6 sale del ×1.8 del documento de capacidad, que **es estimado**: no se ha medido en Railway ni se sabe cuántos núcleos entrega Hobby a un servicio.
- **Cuánto sube la factura en Hobby:** sólo la memoria de los 2 procesos nuevos, 0.32 GB × 10 USD = **≈ 3.2 USD al mes** (el CPU se cobra por uso y el trabajo total es el mismo). Es parte del uso: mientras el uso no pase de 5 USD, Hobby no cobra de más; con dos entornos ya se pasa (piso 8.10 USD con la memoria deducida de la factura real).
- **Por qué no hace falta hoy:** sin restaurantes reales la carga es ≈ 0. **Sí antes del primer restaurante real,** porque cambiar procesos obliga a bajar el conjunto de conexiones a la base (de 10+10 a 5+5 por proceso, para no pasar de ≈ 100 conexiones, que además **no está verificado**) y conviene probarlo con tiempo, no el día que llega el tráfico.

### Costo de alta por actor (una vez; §3)

| Actor | CPU del servidor | Dólares | Pesos | Tiempo para la persona |
|---|---|---|---|---|
| Restaurante | ≈ 3–15 s (PDF de QR, fotos, PINs) | **0.11–0.64 por lectura de PDF** (Opus 5.5); típico ≈ 0.4 en 3 lecturas | 2–12 por lectura | < 10 min [documento] |
| Comensal | ≈ 1.5 s por visita (mediano) | ≈ 0.00003 por comensal-hora | ≈ 0.0006 | menú visible 2.3 s (Slow 4G) |
| Mesero o capitán | **131 ms de CPU y 64 MiB por PIN** [medida aquí] | ≈ 0.000001 | ≈ 0.00002 | PIN ≈ 45 ms de servidor |
| Dueño | ≈ 0 | 0 (Firebase gratis hasta 50,000 activos al mes) | 0 | segundos |

### Foto y modelo 3D por platillo (dimensionamiento; el 3D sigue fuera de la v1)

Con todos los platillos de cada plan en su tope (80 gratuito, 300 paga): **un restaurante gratuito guarda 0.24 GB con fotos y 0.56 GB con fotos y modelo 3D; uno de paga, 0.91 y 2.10 GB.** Los 10 GB gratis de R2 se acaban con **41 gratuitos o 11 de paga solo con fotos**, y con **18 gratuitos o 5 de paga con fotos y modelos**; después cuestan 0.015 USD/GB-mes (centavos). Un comensal que ve un modelo baja 4.08 MB y no los paga nadie: los sirve R2 (salida gratis) detrás de Cloudflare, no la API. Detalle en §4.13. Pendiente: diseñar el proceso que genera los modelos.

### Dinero (lo que cuesta sostener)

Con Hobby, sostener lo que cabe hoy es **la factura Hobby mínima más pocos dólares** (piso 8.10 USD con la memoria deducida de la factura real; con 148 gratuitos la factura llega a ≈ 20 USD). Sostener 500 o 1,000 requiere salir del disco de 5 GB (Pro, 20 USD) y más procesos (§4.9): 1,000 gratuitos típicos ≈ 29 USD de uso con eventos o ≈ 117 USD con el sondeo de hoy; 1,000 de paga ≈ 89 USD con eventos o ≈ 304 USD hoy (con PostgreSQL de 0.5 GB ilustrativo; con los 0.085 GB deducidos de la factura real son ≈ 8 USD menos). **Un restaurante de paga a 349 pesos (18.7 USD) cubre a ≈ 100 gratuitos.**

### Eventos (medidos)

Los cuatro valores del informe `eventos-frente-a-sondeo` sustituyen a los pendientes. El tope de CPU con eventos baja de lo que aquel informe estima para solo los avisos (8,000–10,000 comensales) a 420–1,064 restaurantes aquí, porque este modelo suma **la vista del personal y las escrituras**, que no desaparecen con eventos, y no cuenta las palancas de CPU (sin probar). **Limitación:** no incluye los avisos que reciben los dispositivos del personal; es optimista en ese punto.

### Decisiones que te tocan

1. **4 procesos antes del primer restaurante real** (recuadro): +85 % del tope por ≈ 3.2 USD al mes. *Recomendado: sí.*
2. **Medir primero** (datos por conseguir, §7): el plan de Railway que tienes, la memoria de PostgreSQL y `max_connections`, la factura real y la pantalla encendida. Son los supuestos con más efecto y cuestan ≈ 0 USD.
3. **Plan de paga al tope (40 × 12):** pesa 8 gratuitos y dispara la regla de Cloudflare; dejarlo, pero no ofrecerlo en masa hasta el sondeo por fase.
4. **Retención del historial:** aceptaste 30 días y 12 meses. Con 12 meses el disco de 5 GB se llena con 17 restaurantes de paga; entonces **pasar a Pro (20 USD)** o recortar la retención.
5. **Hard limit de gasto en Railway:** el mínimo que permite es 10 USD y al alcanzarlo **apaga todo**; conviene sólo un aviso suave (soft limit) por correo, no el límite duro [externa: docs.railway.com/reference/usage-limits].
6. **Lecturas de PDF en paga:** quedaste en «fila prioritaria sujeta a disponibilidad» sin número; el gasto lo acota la disponibilidad, no una cuota.

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
| **Su parte de la base fija** | — | — | con Hobby, el piso de 8.10 USD (RAM de API y PostgreSQL en 2 entornos, deducida de la factura real del 13 de noviembre) entre los restaurantes registrados: 0.08 USD con 100 (la planes §6.3 usaba Pro y 54 USD) | ≈ 1.2 | — | [dato de Calvin] + [externa: Railway Hobby]; desglose por servicio: **dato pendiente** |
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
3. **Tres formas de entrega:** *hoy* (sondeo de 3 s en todas las fases), *sondeo por fase* (5/3/10/20/3/5 s y detenido tras pagada) con las palancas de CPU del documento de capacidad (3.3 → 2.0 ms), y *eventos con respaldo* con los valores **medidos** del informe `eventos-frente-a-sondeo` (respaldo de 60 s, latido de 25 s a 0.09 ms, aviso de 4.2 ms, ≈ 1 aviso por minuto por teléfono al frente) y sin las palancas de CPU (que no están probadas).
4. «Cabe» = el **p95 de los núcleos necesarios en la hora más cargada ≤ 2 núcleos** (los 2 procesos de hoy), con 70 % de uso como margen de diseño.

**Qué no incluye** (decláralo al leer): no hay red, ni Cloudflare, ni cola real de PostgreSQL; el CPU de Railway no está calibrado (±2×); el supuesto de que la hora más cargada coincide en todos los restaurantes (mismas curvas de ocupación) es conservador; no hay crecimiento en el tiempo, sólo el régimen estable de N restaurantes.

### 4.1 Procesador de la API (2 procesos)

**Mayor N con 95 % de probabilidad (CPU a 70 %)** — salida del simulador:

| Escenario | Hoy (sondeo de 3 s) | Sondeo por fase + palancas | Eventos con respaldo, medidos (sin palancas) |
|---|---|---|---|
| Peor caso: gratuitos al tope (10 × 6) | **65** | 147 | 420 |
| Peor caso + todos coinciden a la vez (sin descansos) | 41 | 89 | 249 |
| Todos gratuitos, típicos | **148** | 307 | 1,064 |
| Mezcla 90 % / 10 % paga | 126 | 266 | 944 |
| Mezcla 80 % / 20 % paga | 110 | 232 | 840 |
| **Caso base: todos de paga, típicos** | **55** | 119 | 450 |
| Todos de paga al tope (40 × 12) | **8** | 22 | 66 |

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
| Volumen Hobby / Pro | **5 GB** (por defecto y máximo en la tabla de planes; la página de volúmenes dice que se redimensiona en planes de pago y que Pro puede llegar a 1 TB) / **50 GB por defecto, hasta 1 TB** | [fuente externa: docs.railway.com/reference/pricing/plans y /volumes, 13 nov 2026] |

Crecimiento del volumen en régimen (12 KB por visita [estimada ±2×], 1.1 KB por platillo [medida], retención 30 días gratuito / 365 paga **[propuesta, sin decidir]**):

| Escenario (N de «hoy») | Volumen en régimen | N que llenaría 5 GB (Hobby) |
|---|---|---|
| Peor caso (65) | 1.4 GB | 240 |
| Gratuitos típicos (148) | 2.5 GB | 299 |
| 90/10 (126) | 4.7 GB | 135 |
| 80/20 (110) | 6.5 GB | 85 |
| **Caso base (55)** | **15.7 GB** | **17** |
| Paga al tope (8) | 4.4 GB | 9 |

**Lectura:** en Hobby el disco de 5 GB es el **segundo muro** y llega antes que el procesador en cuanto hay paga con 12 meses de historial (85 con 80/20; 17 con todos de paga). **La retención es la palanca:** con 30 días también en paga, el muro sube a ≈ 274 (80/20), ≈ 212 (todos de paga) y ≈ 110 (paga al tope). Con Pro el disco deja de ser problema. Hay una ambigüedad en la documentación de Railway (¿se puede subir un volumen Hobby más allá de 5 GB?); confirmarlo antes de decidir Pro.

### 4.3 Límites del plan de Railway

| Límite | Valor | Marca | ¿Se alcanza? |
|---|---|---|---|
| **Hobby (el plan de Carta, dato de Calvin)** | 5 USD al mes que incluyen 5 USD de uso; el excedente se cobra («you will be charged the delta»); se paga la suscripción aunque no se use nada; 6 réplicas, 48 GB de RAM, 48 vCPU, 100 GB de almacenamiento efímero, 5 GB de volumen por servicio; imágenes 72 h | [fuente externa: docs.railway.com/reference/pricing/plans y /faqs, 13 nov 2026] | Sí: el uso incluido ya se pasa (piso 6.40 USD) |
| Pro (para comparar) | 20 USD que incluyen 20 USD de uso; 42 réplicas, 1,000 vCPU, volumen hasta 1 TB | ídem | Sólo si el disco de 5 GB no alcanza |
| **Límite de gasto** | existe en todos los planes: *soft* (aviso por correo) y *hard* (apaga **todas** las cargas); mínimo del hard: **10 USD**; avisos al 75, 90 y 100 % | [fuente externa: docs.railway.com/reference/usage-limits, 13 nov 2026] | Un hard limit apagaría producción: usar soft |
| Volúmenes por proyecto Hobby | 10 (uno por servicio) | [fuente externa: docs.railway.com/reference/volumes] | no |
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
| Regla actual de Carta | 300 peticiones / 10 s por IP y centro de datos → bloqueo 10 s; todas las rutas menos `/health` y `/ready` | confirmada hoy en el panel por la maestra (no la leí yo); el plan **Free Website** de Cloudflare lo confirmó la maestra por la API el 13 de noviembre |
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

R2 en régimen con el N de hoy (con fotos): peor caso 5.1 GB · gratuitos típicos 7.5 GB · caso base 6.6 GB → **dentro de los 10 GB gratis** (con el N de «optimizada» sube a ≈ 14 GB en las mezclas, en gratuitos típicos y en el caso base ⇒ ≈ 0.06 USD/mes de excedente). Operaciones: despreciables. **No limita.**

### 4.6 Proveedor de identidad (Firebase)

50,000 usuarios activos al mes gratis **[fuente externa: firebase.google.com/pricing, 13 nov 2026]** ⇒ **≈ 33,000 restaurantes** con 1.5 operadores cada uno: no limita nada de lo que viene. **Pendiente:** cuota diaria del enlace por correo (§3.4).

### 4.7 Gasto en la API de Claude

Del simulador (Opus 5.5, 6 páginas medias, ×1.3 por reintentos): lecturas **de alta** (una vez, por todos los N de «hoy»): peor caso **25 USD**, gratuitos típicos **43**, 80/20 **33**, caso base **19**; **mensual en régimen** (4 % de altas nuevas al mes, 0.5 lecturas/mes por restaurante de paga): 1–6 USD/mes. **Con Haiku** serían 40–50 veces menos. Cada restaurante gratuito más que se registra suma ≈ 0.4 USD (3 lecturas) una vez; **sin tope por dueño, un abusador crea restaurantes y se lleva 0.64 × 3 por cuenta** (decisión 3).

### 4.8 Red de salida

0.05 USD/GB **[fuente externa: Railway]**; ≈ 640 B por petición (93 % `304` de 580 B). Con el N de «hoy»: 95–130 GB al mes ⇒ **5–7 USD/mes**. Con la forma optimizada y el N mayor: 190–230 GB ⇒ 10–11 USD/mes. Quitar las 3 cabeceras sólo-HTML de `/api` (302 de 606 B) la bajaría a la mitad, ahorro < 6 USD. **No limita.**

### 4.9 Si se necesitaran 500 o 1,000 restaurantes (por forma de entrega)

Más allá de los muros de Hobby: 500 gratuitos típicos guardan ≈ 8 GB y los de paga con 12 meses de historial ≈ 143 GB por cada 500, así que **hay que pasar a Pro (volumen hasta 1 TB)**. Núcleos (p95) y **uso de Railway al mes** (staging se queda en 2 procesos; PostgreSQL de 0.5 GB por entorno, **ilustrativo**; ronda 3: la factura real da ≈ 0.085 GB sin tráfico, así que a escala la cifra útil es la de una base con datos, que sigue sin medirse); la factura Pro es 20 USD + el exceso sobre 20 USD de uso. Si el uso pasa de ≈ 24 vCPU habría que repartir en réplicas (la página de planes sólo da máximos por servicio que incluyen réplicas).

| N | Escenario | Hoy | Por fase + palancas | Eventos medidos |
|---|---|---|---|---|
| 500 | Gratuitos típicos | 6.5 núcleos · 65 USD | 3.2 · 48 | 0.9 · 23 |
| 500 | Caso base (paga) | 16.9 · 159 | 8.0 · 111 | 2.2 · 52 |
| 500 | Peor caso (10 × 6) | 14.5 · 120 | 6.6 · 78 | 2.4 · 32 |
| 1,000 | Gratuitos típicos | 13.1 · 117 | 6.5 · 82 | 1.9 · 29 |
| 1,000 | Caso base (paga) | 33.9 · 304 | 16.0 · 208 | 4.4 · 89 |
| 1,000 | Peor caso (10 × 6) | 29.2 · 228 | 13.3 · 143 | 4.8 · 50 |

Comensales por día con 1,000 gratuitos típicos ≈ 114,000 (3.4 millones al mes), 9,575 mesas, 40,000 platillos; con 1,000 de paga ≈ 190,000 (5.7 millones), 25,600 mesas, 72,000 platillos.

**¿Dan los números?** Ingreso del caso base: 349 pesos antes de IVA = 18.74 USD por restaurante. Con Hobby, lo que cabe hoy cuesta de 8.10 a ≈ 21 USD al mes en total. **Un restaurante de paga cubre a ≈ 100 gratuitos** (planes §6.4). El servidor de hoy aguanta un piloto serio (≈ 17–50 de paga o ≈ 65–148 gratuitos a la vez); para cientos hacen falta 4 procesos, Pro (disco) y el sondeo por fase o los eventos.

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

### 4.12 Curva inversa: cuántos caben si la factura no pasa de B USD al mes

Ronda 3 (13 de noviembre): la memoria de PostgreSQL ya no es supuesto libre; se deduce de la factura real (antes había dos versiones, cota 0 GB e ilustrativa 0.5 GB, que esta sustituye). Cada celda: N y el muro que manda (C = procesador, D = disco de 5 GB, $ = la factura).

**Memoria deducida de la factura real de Railway** (captura de Calvin, «Usage by Project», 13 de noviembre ≈ 04:35 UTC, acumulado 0.6422 USD) **[dato de Calvin + estimada]**:

Suma de las partidas: 0.6409 USD (la captura dice 0.6422 USD).

| Producción desde | Minutos-entorno | Memoria media por entorno GB | PostgreSQL + respaldo GB (menos la API medida) | Volumen medio GB | vCPU medio | Proyección USD/mes (2 entornos, 30 días) |
|---|---|---|---|---|---|---|
| 11-nov 00:00 | 7,260 | 0.365 | 0.045 | 0.263 | 0.0061 | 7.64 |
| 11-nov 12:00 (central) | 6,540 | 0.405 | 0.085 | 0.292 | 0.0067 | 8.48 |
| 11-nov 23:59 | 5,821 | 0.455 | 0.135 | 0.328 | 0.0076 | 9.53 |

Supuestos: el ciclo de cobro empezó antes del 10-nov (si empezó después, la ventana es más corta y la memoria por entorno sale mayor); los dos entornos pesan lo mismo sin tráfico; la API pesa en Railway lo que se midió en local (0.16 GB por proceso). **Dato por conseguir:** inicio del ciclo y costo por servicio (panel de Railway → Usage, desglose por servicio).

**A. Central (PostgreSQL y respaldo = 0.085 GB por entorno)**

Hobby: 5 USD de suscripción que incluyen 5 USD de uso; factura = 5 + exceso de uso sobre 5. 2 entornos encendidos. Memoria de PostgreSQL y respaldo en Railway = 0.085 GB por entorno (deducida de la factura real del 13-nov; ver la tabla anterior). Muros que no dependen del dinero: CPU de 2 procesos y disco de 5 GB.

Piso sin tráfico: uso 8.10 USD (RAM de 2 entornos: API y PostgreSQL) → factura 8.10 USD. Si B < piso, no cabe ninguno.

**Hoy (sondeo de 3 s)** — N (muro que manda: C = CPU, D = disco, $ = factura)

| Escenario | ≤ 5 USD | ≤ 10 USD | ≤ 15 USD | ≤ 20 USD | ≤ 40 USD | USD marginal por restaurante |
|---|---|---|---|---|---|---|
| Peor caso: todos gratuitos al tope (10 mesas × 6) | 0 ($) | 11 ($) | 41 ($) | 65 (C) | 65 (C) | 0.166 |
| Peor caso + todos coinciden a la vez | 0 ($) | 6 ($) | 24 ($) | 41 (C) | 41 (C) | 0.278 |
| Todos gratuitos, típicos | 0 ($) | 23 ($) | 84 ($) | 146 ($) | 148 (C) | 0.081 |
| Mezcla 90 % gratuitos / 10 % paga | 0 ($) | 19 ($) | 72 ($) | 124 ($) | 126 (C) | 0.096 |
| Mezcla 80 % gratuitos / 20 % paga | 0 ($) | 17 ($) | 62 ($) | 85 (D) | 85 (D) | 0.111 |
| Caso base: todos de paga, típicos | 0 ($) | 8 ($) | 17 (D) | 17 (D) | 17 (D) | 0.237 |
| Todos de paga al tope (40 mesas × 12) | 0 ($) | 1 ($) | 6 ($) | 8 (C) | 8 (C) | 1.143 |

**Sondeo por fase + palancas de CPU** — N (muro que manda: C = CPU, D = disco, $ = factura)

| Escenario | ≤ 5 USD | ≤ 10 USD | ≤ 15 USD | ≤ 20 USD | ≤ 40 USD | USD marginal por restaurante |
|---|---|---|---|---|---|---|
| Peor caso: todos gratuitos al tope (10 mesas × 6) | 0 ($) | 17 ($) | 64 ($) | 110 ($) | 147 (C) | 0.107 |
| Peor caso + todos coinciden a la vez | 0 ($) | 10 ($) | 38 ($) | 66 ($) | 89 (C) | 0.180 |
| Todos gratuitos, típicos | 0 ($) | 33 ($) | 120 ($) | 207 ($) | 299 (D) | 0.057 |
| Mezcla 90 % gratuitos / 10 % paga | 0 ($) | 28 ($) | 102 ($) | 135 (D) | 135 (D) | 0.067 |
| Mezcla 80 % gratuitos / 20 % paga | 0 ($) | 24 ($) | 85 (D) | 85 (D) | 85 (D) | 0.078 |
| Caso base: todos de paga, típicos | 0 ($) | 11 ($) | 17 (D) | 17 (D) | 17 (D) | 0.169 |
| Todos de paga al tope (40 mesas × 12) | 0 ($) | 2 ($) | 9 (D) | 9 (D) | 9 (D) | 0.708 |

**Eventos con respaldo (medidos, sin palancas)** — N (muro que manda: C = CPU, D = disco, $ = factura)

| Escenario | ≤ 5 USD | ≤ 10 USD | ≤ 15 USD | ≤ 20 USD | ≤ 40 USD | USD marginal por restaurante |
|---|---|---|---|---|---|---|
| Peor caso: todos gratuitos al tope (10 mesas × 6) | 0 ($) | 65 ($) | 239 ($) | 240 (D) | 240 (D) | 0.029 |
| Peor caso + todos coinciden a la vez | 0 ($) | 39 ($) | 144 ($) | 146 (D) | 146 (D) | 0.048 |
| Todos gratuitos, típicos | 0 ($) | 145 ($) | 299 (D) | 299 (D) | 299 (D) | 0.013 |
| Mezcla 90 % gratuitos / 10 % paga | 0 ($) | 108 ($) | 135 (D) | 135 (D) | 135 (D) | 0.018 |
| Mezcla 80 % gratuitos / 20 % paga | 0 ($) | 85 (D) | 85 (D) | 85 (D) | 85 (D) | 0.022 |
| Caso base: todos de paga, típicos | 0 ($) | 17 (D) | 17 (D) | 17 (D) | 17 (D) | 0.068 |
| Todos de paga al tope (40 mesas × 12) | 0 ($) | 8 ($) | 9 (D) | 9 (D) | 9 (D) | 0.237 |

**B. Alta (0.135 GB por entorno: producción desplegada al final del 11 de noviembre)**

Hobby: 5 USD de suscripción que incluyen 5 USD de uso; factura = 5 + exceso de uso sobre 5. 2 entornos encendidos. Memoria de PostgreSQL y respaldo en Railway = 0.135 GB por entorno (deducida de la factura real del 13-nov; ver la tabla anterior). Muros que no dependen del dinero: CPU de 2 procesos y disco de 5 GB.

Piso sin tráfico: uso 9.10 USD (RAM de 2 entornos: API y PostgreSQL) → factura 9.10 USD. Si B < piso, no cabe ninguno.

**Hoy (sondeo de 3 s)** — N (muro que manda: C = CPU, D = disco, $ = factura)

| Escenario | ≤ 5 USD | ≤ 10 USD | ≤ 15 USD | ≤ 20 USD | ≤ 40 USD | USD marginal por restaurante |
|---|---|---|---|---|---|---|
| Peor caso: todos gratuitos al tope (10 mesas × 6) | 0 ($) | 5 ($) | 35 ($) | 65 (C) | 65 (C) | 0.166 |
| Peor caso + todos coinciden a la vez | 0 ($) | 3 ($) | 21 ($) | 39 ($) | 41 (C) | 0.278 |
| Todos gratuitos, típicos | 0 ($) | 11 ($) | 72 ($) | 134 ($) | 148 (C) | 0.081 |
| Mezcla 90 % gratuitos / 10 % paga | 0 ($) | 9 ($) | 61 ($) | 113 ($) | 126 (C) | 0.096 |
| Mezcla 80 % gratuitos / 20 % paga | 0 ($) | 8 ($) | 53 ($) | 85 (D) | 85 (D) | 0.111 |
| Caso base: todos de paga, típicos | 0 ($) | 3 ($) | 17 (D) | 17 (D) | 17 (D) | 0.237 |
| Todos de paga al tope (40 mesas × 12) | 0 ($) | 0 ($) | 5 ($) | 8 (C) | 8 (C) | 1.143 |

**Sondeo por fase + palancas de CPU** — N (muro que manda: C = CPU, D = disco, $ = factura)

| Escenario | ≤ 5 USD | ≤ 10 USD | ≤ 15 USD | ≤ 20 USD | ≤ 40 USD | USD marginal por restaurante |
|---|---|---|---|---|---|---|
| Peor caso: todos gratuitos al tope (10 mesas × 6) | 0 ($) | 8 ($) | 54 ($) | 101 ($) | 147 (C) | 0.107 |
| Peor caso + todos coinciden a la vez | 0 ($) | 5 ($) | 32 ($) | 60 ($) | 89 (C) | 0.180 |
| Todos gratuitos, típicos | 0 ($) | 15 ($) | 103 ($) | 190 ($) | 299 (D) | 0.057 |
| Mezcla 90 % gratuitos / 10 % paga | 0 ($) | 13 ($) | 87 ($) | 135 (D) | 135 (D) | 0.067 |
| Mezcla 80 % gratuitos / 20 % paga | 0 ($) | 11 ($) | 75 ($) | 85 (D) | 85 (D) | 0.078 |
| Caso base: todos de paga, típicos | 0 ($) | 5 ($) | 17 (D) | 17 (D) | 17 (D) | 0.169 |
| Todos de paga al tope (40 mesas × 12) | 0 ($) | 1 ($) | 8 ($) | 9 (D) | 9 (D) | 0.708 |

**Eventos con respaldo (medidos, sin palancas)** — N (muro que manda: C = CPU, D = disco, $ = factura)

| Escenario | ≤ 5 USD | ≤ 10 USD | ≤ 15 USD | ≤ 20 USD | ≤ 40 USD | USD marginal por restaurante |
|---|---|---|---|---|---|---|
| Peor caso: todos gratuitos al tope (10 mesas × 6) | 0 ($) | 31 ($) | 204 ($) | 240 (D) | 240 (D) | 0.029 |
| Peor caso + todos coinciden a la vez | 0 ($) | 18 ($) | 123 ($) | 146 (D) | 146 (D) | 0.048 |
| Todos gratuitos, típicos | 0 ($) | 68 ($) | 299 (D) | 299 (D) | 299 (D) | 0.013 |
| Mezcla 90 % gratuitos / 10 % paga | 0 ($) | 51 ($) | 135 (D) | 135 (D) | 135 (D) | 0.018 |
| Mezcla 80 % gratuitos / 20 % paga | 0 ($) | 40 ($) | 85 (D) | 85 (D) | 85 (D) | 0.022 |
| Caso base: todos de paga, típicos | 0 ($) | 13 ($) | 17 (D) | 17 (D) | 17 (D) | 0.068 |
| Todos de paga al tope (40 mesas × 12) | 0 ($) | 3 ($) | 9 (D) | 9 (D) | 9 (D) | 0.237 |

**Cómo leerlo.** Con la factura sin tráfico F ≈ 8.1–9.1 USD (piso de arriba), caben N = (B − F + 5) / c restaurantes (c = la última columna, USD marginales por restaurante; el +5 es el uso que Hobby ya incluye si F > 5 por su suscripción), topado por las columnas C y D de la sección 0. Para llenarla: factura del mes (Calvin) y memoria de PostgreSQL (métricas de staging).

### 4.13 Foto y modelo 3D por platillo

Por platillo: foto = original 3.0 MB [estimada] + detalle 81 KB + miniatura 16 KB [medidas] = 3.09 MB; modelo 3D = .glb de 4.0 MB [documento: presupuesto duro de 05_3D_Pipeline.md] + póster 81 KB = 4.08 MB (el .usdz es para realidad aumentada y no cuenta).

| Plan | Platillos (tope) | GB por restaurante: sólo fotos | fotos + 3D | Restaurantes que llenan los 10 GB gratis (fotos / fotos+3D) | USD/mes de R2 por restaurante (fuera de la capa gratuita) |
|---|---|---|---|---|---|
| gratuito | 80 | 0.24 | 0.56 | 41 / 18 | 0.004 / 0.008 |
| paga | 300 | 0.91 | 2.10 | 11 / 5 | 0.014 / 0.032 |

| Escenario (N de «hoy») | R2 GB sólo fotos | R2 GB fotos + 3D | R2 USD/mes (fotos / fotos+3D) | N donde se acaba la capa gratuita (fotos+3D) |
|---|---|---|---|---|
| Peor caso: todos gratuitos al tope (10 mesas × 6) | 15.7 | 36.4 | 0.09 / 0.40 | 18 |
| Peor caso + todos coinciden a la vez | 9.9 | 23.0 | 0.00 / 0.19 | 18 |
| Todos gratuitos, típicos | 35.8 | 82.9 | 0.39 / 1.09 | 18 |
| Mezcla 90 % gratuitos / 10 % paga | 38.8 | 90.0 | 0.43 / 1.20 | 14 |
| Mezcla 80 % gratuitos / 20 % paga | 41.2 | 95.6 | 0.47 / 1.28 | 12 |
| Caso base: todos de paga, típicos | 49.9 | 115.6 | 0.60 / 1.58 | 5 |
| Todos de paga al tope (40 mesas × 12) | 7.3 | 16.8 | 0.00 / 0.10 | 5 |

Bytes que baja un comensal: ver un platillo = detalle 81 KB; ver un modelo 3D = 4.08 MB (2.7 s a 1.5 MB/s [documento: NFR-04]). Los sirven Cloudflare y R2, **no la API**: salida de R2 gratis [externa], la caché de Cloudflare Free los guarda; nada de eso entra en la factura de Railway. Lo único que cuenta son las operaciones clase B de R2 (10 millones gratis al mes, 0.36 USD por millón después): una vista que no encuentra la copia en el borde es una operación. **Pendiente: diseñar el proceso que genera los modelos.**


## 5. Ideas fuera de la v1 (decisión 6)

**Generación de imágenes o modelos 3D de platillos con un modelo alojado propio y una fila de espera.** *Fuera de la v1: ADR-011 descarta 3D y AR, y la Fase 5 es lo que viene después. No se construye ni se estima aquí con cifras de un proveedor. **Pendiente: diseñar ese proceso** (la fila para generar imágenes y modelos se evalúa después; el almacenamiento y la descarga ya están dimensionados en §4.13).*

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
4. **3 lecturas de PDF en gratuito, una sola vez, no por mes** (decisión 3): *buena regla.* Con 2 lecturas al mes un gratuito que las use todas gasta ≈ 24 × 0.2 = 4.8 USD al año; con 3 en total, ≈ 0.3–0.4 USD una vez. Para 148 gratuitos son 42 USD una vez (simulador) frente a ≈ 700 USD al año con 2 al mes. **Decidido por Calvin en la ronda 2: por dueño.** Por restaurante, crear otro restaurante da 3 lecturas más. *Recomiendo por dueño (correo de Firebase)*, y hasta decidir el cobro, 10 al mes en paga (no diste cifra).
5. **Eventos en dos grupos** (decisión 4): *sí*; compatible con la Spec 001. Espera a la medición de la otra rama para fijar el beneficio.
6. **Tope de platillos** (decisión 5): se decide con la estadística de cartas. En el simulador el tope de gratuito está en 60 y paga en 300 (propuesta anterior); casi no afecta (≈ 1.1 KB por platillo): lo fija el peso del menú público y el costo de leer el PDF.
7. **Retención del historial:** *30 días gratuito, 12 meses paga* (sin decidir). Sin esto la base de 55 restaurantes de paga llega a 15.7 GB y rebasa Hobby.
8. **Plan de Railway: Hobby (dato de Calvin).** El volumen de 5 GB se llena con ≈ 17–85 restaurantes de paga/mezcla con 12 meses de historial (30 días: ≈ 110–274). *Confirmar con Railway si un volumen Hobby se puede ampliar más allá de 5 GB* (la tabla de planes y la página de volúmenes no coinciden).
9. **Medir la pantalla encendida y el costo de `GET /op/mesas`** antes de fijar nada más: son los supuestos con más efecto no medidos.
10. **Abrir la Spec 002 «Planes»** después del ciclo de la mesa (T-3.x), como ya quedó escrito en el informe de planes §9.

---

### Decisiones de Calvin de la ronda 2 (13 de noviembre; registradas en `04 §11`)

Lecturas de PDF en gratuito: **3 en total por dueño**; en paga: **sin número al mes, fila prioritaria sujeta a disponibilidad**. Historial de **30 días** (gratuito) y **12 meses** (paga): aceptado. **Medir la pantalla encendida:** aceptado. **Plan Hobby** de Railway. **Logo y «caveman» descartados.** **Founder OS** en uso para la estrategia de precios. **Fila de imágenes y modelos 3D:** después.

---

## 7. Auditoría de fuentes y datos por conseguir

Regla de Calvin: **toda cifra con fuente.** Lo que sigue es el mismo contenido que imprime el simulador (`python3 docs/research/2026-11-13-simulador-de-uso.py`); si cambia un parámetro, se cambia allí y aquí.

### 7.1 Cada parámetro del simulador

| Parámetro | Valor | Marca | Fuente |
|---|---|---|---|
| S_MS | 3.3 ms | medida | docs/plan/perf/2026-11-13-modelo-de-capacidad.md M3 (mezcla realista, contenedor local de 4 vCPU) |
| S_MS_OPT | 2.0 ms | estimada | mismo documento, palancas 0-5: ganancia estimada sin probar por palanca |
| S_ESCRITURA_MS | 6 ms | medida | mismo documento: entrar 5.7-10 ms, evento 1.1-4.2 ms (6 es un punto dentro del rango) |
| S_PERSONAL_MS | 10 ms | estimada | mismo documento M4 lo usa como ejemplo («aun a 10 ms»); no hay medición: la vista no existe |
| BYTES_PETICION | 640 B | medida | mismo documento: 304 = 580 B, 200 = 1.7 KB, mezcla 93 % 304 |
| PETICIONES_POR_COMENSAL_VISITA | 14 | estimada | planes-y-costo §3.2, sin origen medido |
| NUCLEOS / WORKERS | 2 | documento | WORKERS=2 en deploy/railway/README.md; 3.6 núcleos con 4 workers es ×1.8 estimado (palanca 1) |
| UTILIZACION_MAX | 0.70 | documento | capacidad §3: tope de diseño |
| INTERVALO_HOY | 3 s | documento | frontend/src/comensal/entrada/useEntrada.ts:9 |
| INTERVALO_FASE | 5/3/10/20/3/5 s | propuesta | planes-y-costo §5, alternativa A: no está decidida ni construida |
| PERSONAL_INTERVALO_S | 5 s | documento | 02_Arquitectura §6 |
| EV_* (cinco valores) | 60 s, 25 s, 0.09 ms, 4.2 ms, 1/min | medida | docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md, primera página (rama medicion-eventos-frente-a-sondeo, commit 41b2608); avisos/min estimada de su mapa de eventos |
| PERSONAL_INTERVALO_EV_S | 60 s | supuesto | se asume el mismo respaldo que los teléfonos; el informe de eventos no lo mide para el personal |
| MESAS_POR_MESERO | 6 | estimada | sin origen |
| DUENO_PANEL | 0.3 | estimada | sin origen |
| USO_APP | 0.6 | estimada | sin origen; la analítica del piloto puede darlo (scan frente a mesas atendidas) |
| FASE_TIEMPO | 7 fracciones | estimada | sin origen; la Spec 001 (US-35) guarda las horas de cada paso: el piloto las dará |
| FASE_FRENTE | 7 fracciones | estimada | sin origen: es el supuesto más débil; el evento de visibilidad aceptado por Calvin lo medirá |
| ACTIVOS | 0.6 | estimada | sin origen |
| WIFI_COMPARTIDO | 0.7 | estimada | sin origen; ip_hash de la analítica ya permite contarlo |
| CF_REGLA_RPS | 30 rps | documento | 300 peticiones por 10 s por IP: deploy/railway/README.md; Cloudflare Free admite 1 regla, ventana 10 s, por IP [externa: developers.cloudflare.com/waf/rate-limiting-rules] |
| DIA_SEMANA, SIGMA_DIA | 0.8-1.35; 0.15 | estimada | sin origen |
| PERFILES: mesas, ppm, personal, minutos, visitas_dia, pico_ocup, con_foto | ver tabla | estimada | sin estadística de mesas ni comensales (planes-y-costo §1.1). Personal y mesas: rama agente/estadistica-de-cartas-y-personal (modelo con supuestos) |
| PERFILES: platillos | 15-140 | medida (parcial) | rama agente/estadistica-de-cartas-y-personal: 148 cartas, mediana 44, media 51, p90 82 (147 de 148 son de reparto) |
| PERFILES: picos de ocupación | 14:30 y 21:00 | externa (horas) | chilango.com/general/988-la-hora-de-la-comida (comida 14-16, cena 20-22), planes-y-costo §1.1; los pesos son estimados |
| MEZCLAS | ver tabla | estimada | 96 % microempresas [externa: INEGI-CANIRAC 2021]; el reparto por tamaño es juicio |
| TOPES | 10×6/80/3 · 40×12/300/20 | Calvin | decisiones del 13-nov (mesas, personal, 6 y 12 por mesa); platillos 80/300 son la propuesta de la rama de estadística, sin decidir |
| KB_VISITA | 12 KB | estimada | planes-y-costo §2.1; ±2×, sin medir |
| KB_PLATILLO | 1.1 KB | medida | planes-y-costo §2.1 (865 B medidos + URLs de R2) |
| RETENCION_DIAS | 30 / 365 | Calvin | aceptado en la ronda 2 (13-nov) |
| FOTO_ORIGINAL_MB | 3 MB | estimada | foto de teléfono de 12 MP; no hay originales reales de ningún restaurante |
| FOTO_DETALLE_KB / MINIATURA_KB | 81 / 16 KB | medida | planes-y-costo §2.1 (35-81 y 7-16 KB, material gráfico real) |
| GLB_MB / POSTER_KB | 4 MB / 81 KB | documento | docs/mvp/05_3D_Pipeline.md §4 (presupuesto duro del .glb); el póster se iguala a la foto de detalle |
| Precios Railway | 10 / 20 / 0.05 / 0.15 | externa | docs.railway.com/reference/pricing/plans, 13-nov-2026 |
| Hobby: 5 USD, 5 USD de uso incluido, volumen 5 GB |  | externa | docs.railway.com/reference/pricing/plans y /faqs y /reference/volumes, 13-nov-2026 |
| Hard limit de gasto | mínimo 10 USD | externa | docs.railway.com/reference/usage-limits (Cost Control), 13-nov-2026: al alcanzarlo, todo se apaga |
| RAM_API_GB_PROCESO | 0.16 GB | medida | capacidad M5 (≈160 MB por proceso en reposo, local) |
| PG_RAM_GB (y servicio de respaldo) | 0.085 GB por entorno (0.045–0.135) | Calvin + estimada | deducida de la factura real de Railway del 13-nov (2,649 GB-min de memoria): memoria media por entorno menos la API medida; falta el desglose por servicio y el inicio del ciclo |
| PG_MAX_CONEXIONES | 100 | sin dato | no figura en docs.railway.com/databases/postgresql; falta SHOW max_connections |
| DB_POOL | 20 por proceso | documento | app/core/config.py: DB_POOL_SIZE 10 + DB_MAX_OVERFLOW 10 |
| Precios R2 | 0.015 / 4.50 / 0.36 | externa | developers.cloudflare.com/r2/pricing, 13-nov-2026 (10 GB, 1 M clase A y 10 M clase B gratis; salida gratis) |
| Firebase | 50,000 MAU | externa | firebase.google.com/pricing, 13-nov-2026; cuota del enlace por correo: no figura |
| OPERADORES_POR_RESTAURANTE | 1.5 | estimada | sin origen |
| Precios Claude (Opus 5.5) | 4 / 20 USD por M | externa | platform.claude.com/docs/en/about-claude/pricing, 13-nov-2026 |
| TOKENS_PAGINA, TOKENS_BASE, TOKENS_SALIDA | 3,500 / 1,000 / 60 | estimada | ±30 %; la documentación de PDF da 1,500-3,000 tokens de texto por página más la imagen |
| REINTENTO_MEDIO | 1.3 | estimada | MAX_CORRIDAS = 3 [documento]; la media no está medida |
| LECTURAS_GRATIS_TOPE | 3 por dueño | Calvin | ronda 2 (13-nov) |
| LECTURAS_GRATIS_USO | 55/30/15 % | estimada | sin origen |
| LECTURAS_PAGA_MES_USO | 0.5 | estimada | Calvin: en paga, sin número, fila prioritaria sujeta a disponibilidad; el gasto sólo se acota por disponibilidad |
| ROTACION_MES | 4 % | estimada | sin origen |
| MXN_USD | 18.6188 | externa | FIX Banxico 12-nov-2026 (planes-y-costo) |
| Dominio | 25 USD al año | Calvin | dato de Calvin (ronda 2); fuera de la factura de Railway |

### 7.2 Datos por conseguir (lo que hoy es juicio)

| Dato | Cómo conseguirlo | Costo | Quién |
|---|---|---|---|
| **Inicio del ciclo de cobro y costo por servicio** (API, PostgreSQL, respaldo; la factura total ya llegó: 0.6422 USD al 13-nov) | Panel de Railway → Usage, desglose por servicio y fecha del ciclo | 0 USD; 10 min | Calvin |
| `max_connections` de PostgreSQL de Railway | `SHOW max_connections` en staging, sólo lectura | 0 USD; 5 min | sesión maestra |
| CPU real por petición en Railway (S_MS) y por palanca | T-4.4 contra staging con k6 | ≈ 0.3-0.5 USD de Railway; 1 sesión | sesión hija de la T-4.4 |
| Costo de `GET /op/mesas` (S_PERSONAL_MS) | Medición local cuando exista la vista (T-3.6), con 3, 10 y 20 mesas | 0 USD; media sesión | sesión de la T-3.6 |
| Parte que abre la app y parte con pantalla encendida por fase | Evento de visibilidad en la analítica del piloto (aceptado por Calvin) + scans frente a mesas atendidas | 0 USD; una tarea chica | sesión hija; datos del piloto |
| Mesas, comensales por mesa, visitas por día, duración y horarios reales | Datos de los primeros 10-20 restaurantes del piloto (la base ya los tiene: mesas, sesiones, miembros, horas de cada paso de la Spec 001); estadística de consumo fuera del hogar (INEGI ENIGH/DENUE) para el universo | 0 USD; 1 sesión | sesión hija con acceso de lectura a producción, tras el piloto |
| Cartas y personal por tamaño de negocio | Rama agente/estadistica-de-cartas-y-personal (148 cartas de reparto) + microdatos de INEGI (Censos Económicos 2024, SCIAN 722511/722412) + 30-40 cartas de salón | 0-? USD; lo de INEGI es gratuito | sesión hija; Calvin si se compra una fuente |
| Teléfonos por IP en un local (WIFI_COMPARTIDO) y simultáneos reales | Contar miembros por `ip_hash` y restaurante en la analítica (ya existe) | 0 USD; media sesión | sesión hija |
| Restaurantes activos por día, día de la semana, variación (ACTIVOS, DIA_SEMANA, SIGMA_DIA) | Scans por día del piloto durante ≥ 4 semanas | 0 USD | sesión hija tras el piloto |
| Bytes por visita en la base (KB_VISITA) | Medición local: crear una visita con el seed y medir `pg_total_relation_size` | 0 USD; media sesión | sesión hija |
| Tamaño real de las fotos originales | Mirar el bucket R2 privado del piloto | 0 USD | sesión maestra |
| Tokens reales de una lectura de PDF y reintentos medios | Prueba `live` con 2-3 cartas reales (`pytest -m live`) | ≈ 0.5-1 USD de la API de Claude | sesión hija; autoriza Calvin |
| Cuota diaria del enlace por correo de Firebase y plan de Resend | Leer la documentación de Auth y la cuenta de Resend | 0 USD | Calvin / sesión maestra |
| Tiempo y costo de generar un modelo 3D o una imagen (si algún día se hace) | Probar un modelo en una máquina de prueba y leer el precio por hora de la GPU el día de la decisión | pocos USD | sesión hija; fuera de la v1 |

---

## Fuentes y marcas

- **Repositorio:** `docs/plan/perf/2026-11-13-modelo-de-capacidad.md`; `docs/research/2026-11-13-planes-y-costo-por-restaurante.md` y su guion; `docs/specs/001-ciclo-de-la-mesa/spec.md` (ciclo, permisos §5, supuestos §3); `app/services/{personal,sesion,procesador,importaciones}.py`, `app/core/config.py`, `Dockerfile`, `frontend/src/comensal/entrada/useEntrada.ts`; `prototipo/js/{mesero,capitan,checkout-v2,admin-onboarding,admin-ops}.jsx` (P05 Checkout y propina, P06/P07 Mis mesas y Detalle de mesa, C01–C08 pantallas del capitán, P21 Alta del restaurante, P13 Configuración): **el prototipo se tomó sólo como referencia del flujo del ciclo; donde habla de pagos, AR y comisión (P05, P21) está fuera de la v1.**
- **Medido aquí hoy:** `app.services.personal.hashear_pin` y `verificar_pin` (20 repeticiones cada uno; 8 verificaciones simultáneas; memoria con `/proc/self/status`).
- **Páginas leídas el 13 de noviembre de 2026:** `firebase.google.com/pricing` (50,000 MAU; el resto de los límites de Auth no figura); `developers.cloudflare.com/waf/rate-limiting-rules/` y `/parameters/`; `developers.cloudflare.com/cache/concepts/default-cache-behavior/`; `developers.cloudflare.com/r2/pricing/`; `docs.railway.com/reference/pricing/plans`; `docs.railway.com/networking/public-networking/specs-and-limits` (`docs.railway.com/reference/limits` dio 404); `docs.railway.com/databases/postgresql` (sin `max_connections`); `platform.claude.com/docs/en/about-claude/pricing` (Opus 5.5 4/20, Sonnet 5.5 2/10, Haiku 5.5 0.10/0.50 por millón de tokens; Batch −50 %).
- **Ramas que ya existen (ronda 2):** `agente/medicion-eventos-frente-a-sondeo` (commit 41b2608, primera página: sus cuatro valores sustituyen a los pendientes) y `agente/estadistica-de-cartas-y-personal` (148 cartas; platillos mediana 44, p90 82; propone 80/300 de tope; personal y mesas son un modelo con supuestos). El simulador acepta distribuciones con `--distribuciones`; hasta que se integren usa los cuatro perfiles de planes §1.3 y 80/300 como tope de platillos.
- **Páginas leídas el 13 de noviembre (ronda 2):** `docs.railway.com/reference/pricing/plans` y `/faqs` (Hobby: 5 USD con 5 USD de uso incluido, excedente cobrado), `/reference/usage-limits` (límite de gasto, mínimo duro 10 USD), `/reference/volumes` (Hobby 5 GB por defecto), `docs/mvp/05_3D_Pipeline.md` §4 (presupuesto del `.glb`).
