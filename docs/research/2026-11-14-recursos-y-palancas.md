# Recursos y palancas: qué pagamos, cuánto aguanta cada pieza y cómo ensancharla

**Fecha:** 14 de noviembre de 2026 (ronda 6) · **Generado por `2026-11-14-recursos.mjs`** desde `recursos(config, s)` del modelo ([JSON](2026-11-14-recursos-y-palancas.json)); disco medido con [`2026-11-14-recursos-medir.py`](2026-11-14-recursos-medir.py) en PostgreSQL local, **con datos sintéticos** (el generador deja `miembro_id` y `platillo_id` nulos; se rellenaron con valores variados en la copia). **Las palancas son propuestas: no se tocó `app/` ni `migrations/`.**

**Qué es un «restaurante típico» (en toda cifra de capacidad):** un gratuito típico = 1800 visitas al mes y 113.9 comensales al día (SUPUESTO del simulador, rango 40–250), con la mezcla de tamaños del simulador (60 % chico, 25 % mediano, 5 % grande, 10 % formal). Con el **doble** de actividad lo que cabe se divide entre 2 (74 por procesador y 139 por disco con el historial a 30 días); con **todos en su hora pico a la vez**, el procesador de hoy baja de 148 a 93 (factor 0.63, supuesto).

## Conclusiones

1. **Cuello de botella hoy: procesador (148, de 74 a 296) o disco, según cuánto historial se guarde y cuánto rinda el servidor: con historial del gratuito a 30 días el disco aguanta 279 y manda el procesador; sin purga manda el disco desde el mes 2 de operación de un restaurante.** Hoy **nada purga el historial** (03 §7 pide 13 y 24 meses sin distinguir por plan); la cifra de disco depende de los meses acumulados: 1 mes: 279 · 3 meses: 93 · 6 meses: 47 · 12 meses: 23 · lo que dice 03 §7 (24 meses de sesiones y 13 de analítica): 15 restaurantes.
2. **El procesador es ±2× y no se ha medido en Railway:** 148 restaurantes hoy (de 74 a 296) y 1,064 con avisos (de 532 a 2,128); **148 frente a 279 (disco con 30 días) está dentro de ese margen**: no se puede decir cuál manda sin medirlo.
3. **Con los avisos de la Fase 3 el procesador sube a 1,064 y manda el disco:** 23 restaurantes sin purga (12 meses acumulados) o 279 con el historial a 30 días. Las líneas abiertas aguantan 2,116: **es un tope de diseño supuesto (10,000 de Railway ÷ 4.7 líneas por restaurante), sin medir.**
4. **La palanca número uno es el historial del gratuito a 30 días:** 155.2 MB menos por restaurante (acumulados con el historial supuesto); caben +256 restaurantes en el mismo disco (de 23 a 279 por disco). **Contradice 03 §7 (13 y 24 meses) y la regla 9 si se borran sesiones y comandas: hay que cambiar el documento y escribir el ADR antes.** Las siguientes, evaluadas sobre esa base: Analítica agregada por día en vez de una fila por evento (74.5 MB menos por restaurante (acumulados con el historial supuesto); caben +19 restaurantes en el mismo disco; sobre la base con historial a 30 días: +216) · Guardar la analítica en bruto sólo 7 días (después, agregada) (64.2 MB menos por restaurante (acumulados con el historial supuesto); caben +14 restaurantes en el mismo disco; sobre la base con historial a 30 días: +168).
5. **Lo que pagamos hoy: ≈ 10.2 USD al mes.** El disco pesa porque cada visita deja diez filas de analítica de 353 bytes y la analítica es 47 % de lo que ocupa una visita (7,506 bytes, medido con datos sintéticos).

## 1. Qué pagamos hoy

| Servicio | Plan | USD al mes | Detalle y fuente |
|---|---|---|---|
| Railway · api (la aplicación) | Hobby (5 USD al mes, incluye 5 USD de uso) | 8.1 | factura real ≈ 8.1 USD con la memoria deducida de la factura [documento: anuncios-y-capa-del-comensal §0]; CPU a 20 USD por vCPU-mes y RAM a 10 USD por GB-mes [fuente: docs.railway.com, leída 14-nov-2026] |
| Railway · Postgres (la base de datos, versión 18) | Hobby: volumen de 5 GB | incluido | incluido en los 8.1 USD; el volumen cuesta 0.15 USD por GB-mes; Pro sube el volumen a 50 GB (en este modelo) |
| Railway · respaldo (copia diaria con pg_dump) | Hobby | incluido | trabajo programado; corre unos minutos al día; incluido en la factura de Railway |
| Cloudflare (DNS, HTTPS y caché del menú) | Free | 0 | [documento: deploy/railway/README.md §Cloudflare, plan Free]; el menú público lo absorbe la caché del borde |
| Cloudflare R2 (fotos y respaldos) | 10 GB gratis, después 0.015 USD por GB-mes | 0 | [fuente: developers.cloudflare.com/r2/pricing, 14-nov-2026]; ≈ 0.05 GB por gratuito típico: cubre ≈ 200 gratuitos sin pagar |
| Dominio carta.cooking | anual | 2.1 | 25 USD al año [documento: dato de Calvin, 13-nov] |

**Total ≈ 10.2 USD al mes (190 pesos).** No incluye: Firebase Authentication (plan sin costo hoy; sin dato de límites); API de Claude para leer PDFs (≈ 0.11 a 0.64 USD por lectura [documento: planes-y-costo §0]). **Dato por confirmar:** si los 8.1 USD cubren staging y producción juntos.

## 2. Cada recurso, de un vistazo

**Cuello de botella en rojo.** «Hoy» = Hobby, 2 procesos, el teléfono pregunta cada 3 s. «Con avisos» = el mismo servidor con la Fase 3 (ADR-018, no construida). **«Sin purga»** = 12 meses de historial acumulado (lo que hay hoy: nada limpia); **«historial 30 días»** = la palanca número uno. Cada cifra es de un restaurante típico (definido arriba).

| Recurso | Hoy, sin purga | Con avisos, sin purga | Hoy, historial 30 días | Con avisos, historial 30 días | ¿Cuello hoy? (sin purga / 30 días) | ¿Cuello con avisos? (sin purga / 30 días) | Medido o estimado |
|---|---|---|---|---|---|---|---|
| **Procesador (el trabajo de la API)** | 148 | 1,064 | 148 | 1,064 | no / **🔴 SÍ** | no / no | medido en local (±2×); falta medir en Railway: no se sabe cuántos núcleos entrega Hobby |
| **Memoria de la API** | sin tope práctico | sin tope práctico | sin tope práctico | sin tope práctico | no / no | no / no | proceso y línea medidos; el resto supuesto |
| **Disco de la base de datos** | 23 | 23 | 279 | 279 | **🔴 SÍ** / no | **🔴 SÍ** / **🔴 SÍ** | medido con datos sintéticos en PostgreSQL local (10 restaurantes medianos, un mes); depende de los meses de historial que se guarden (hoy nada purga) |
| **Conexiones a la base de datos** | 3,288 | 23,644 | 3,288 | 23,644 | no / no | no / no | estimada: falta `SHOW max_connections` en Railway |
| **Líneas abiertas con los teléfonos** | no existe hoy | 2,116 | no existe hoy | 2,116 | no / no | no / no | TOPE DE DISEÑO SUPUESTO, sin medir: 10,000 conexiones de Railway (documentación, «subject to change») ÷ 4.7 líneas por restaurante (relación del simulador de capacidad); el consumo por línea sí se midió en local |
| **Almacenamiento de fotos y respaldos (R2)** | sin tope práctico | sin tope práctico | sin tope práctico | sin tope práctico | no / no | no / no | documento (mapa de procesos) y precio de Cloudflare |

### El disco según los meses de historial acumulado (hoy nada purga)

| Historial del gratuito | MB por restaurante | Restaurantes que caben por disco (Hobby, 5 GB, 20 % de reserva) | Cuello hoy | Cuello con avisos |
|---|---|---|---|---|
| 1 mes | 14.3 | **279** | procesador (148) | disco (279) |
| 3 meses | 42.5 | **93** | disco (93) | disco (93) |
| 6 meses | 84.8 | **47** | disco (47) | disco (47) |
| 12 meses | 169.5 | **23** | disco (23) | disco (23) |
| lo que dice 03 §7 (24 meses de sesiones y 13 de analítica) | 262 | **15** | disco (15) | disco (15) |

**El disco manda desde el mes 2 de operación de un restaurante con el sondeo** (y desde el mes 1 con avisos) si nada purga. MB por restaurante = «al mes» sólo para el historial de 1 mes; con más meses es lo acumulado.

### Sensibilidad a la actividad y al pico

| Actividad del restaurante típico | Procesador hoy | Procesador con avisos | Disco (sin purga) | Disco (historial 30 días) |
|---|---|---|---|---|
| ×0.5 | 296 | 2,128 | 46 | 558 |
| ×1 | 148 | 1,064 | 23 | 279 |
| ×2 | 74 | 532 | 11 | 139 |

**Todos en su hora pico a la vez:** procesador 93 hoy y 670 con avisos. **Margen de error del procesador (±2×):** 74–296 hoy y 532–2,128 con avisos. 600 peticiones por segundo medidas en local con 2 núcleos (rango 420–600); no se sabe cuántos núcleos entrega Hobby: ±2× hasta medir en Railway.

### 2.1 Procesador (el trabajo de la API)

**Cómo funciona hoy.** Cada teléfono con la app abierta le pregunta al servidor cada 3 segundos si algo cambió; casi siempre la respuesta es «nada nuevo», pero cada pregunta gasta procesador. Con los avisos de la Fase 3, el servidor sólo habla cuando hay un cambio. Ruta: `app/api/publico/sesion.py` (estado con ETag) y `app/services/sesion.py`.

**Consumo.** 1 gratuito típico = 1 unidad de carga; un cliente de paga pesa 2.3; con el sondeo un teléfono pregunta cada 3 s (≈ 4.1 peticiones/s por restaurante registrado, medido en el tope)

**Límite hoy:** 148 restaurantes (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 1,064 restaurantes. **No es el cuello sin purga.**


### 2.2 Memoria de la API

**Cómo funciona hoy.** Cada proceso de la API guarda en memoria el menú y el estado de las mesas por unos segundos, y (con avisos) una línea por cada teléfono conectado. Ruta: `app/services/{cache_menu,menu_publico,sesion}.py`.

**Consumo.** 160 MB fijos por proceso; 0.1 MB por restaurante con el sondeo (supuesto) y 0.2 MB con avisos (la línea abierta cuesta 23 KB [medido]).

**Límite hoy:** sin tope práctico (más de 100,000 restaurantes). **Con avisos:** sin tope práctico. **No es el cuello sin purga.**


### 2.3 Disco de la base de datos

**Cómo funciona hoy.** Cada visita deja filas en `sesion_grupal`, `miembro_sesion`, `orden_personal`, `item_orden`, `comanda`, `comanda_orden` y `llamada_mesero`, y **diez filas de analítica en `evento_analitica`**; las tablas y sus índices viven en el volumen de PostgreSQL. Ruta: `app/db/models.py`; analítica en `app/services/analitica.py`.

**Consumo.** 169.5 MB por restaurante gratuito típico con — meses de historial (1,800 visitas al mes), 7.5 KB por visita [medido con datos sintéticos].

**Límite hoy:** 23 restaurantes (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 23 restaurantes. **🔴 Es el cuello de botella de hoy (sin purga).**


### 2.4 Conexiones a la base de datos

**Cómo funciona hoy.** Cada petición pide prestada una conexión a la base del grupo de su proceso (`DB_POOL_SIZE` 10 y `DB_MAX_OVERFLOW` 10) y la devuelve en milisegundos. Con avisos, cada proceso mantiene además una conexión fija para escuchar a la base. Ruta: `app/db/database.py`.

**Consumo.** cada petición retiene una conexión ≈ 3 ms

**Límite hoy:** 3,288 restaurantes (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 23,644 restaurantes. **No es el cuello sin purga.**


### 2.5 Líneas abiertas con los teléfonos

**Cómo funciona hoy.** Con los avisos (ADR-018, Fase 3) cada teléfono mantiene una conexión abierta con el servidor; Railway permite unas 10,000 abiertas a la vez. Hoy no existen. Ruta futura: `/p/sesion/eventos` y `/op/eventos` (T-3.20 y T-3.21).

**Consumo.** 10000 ÷ 2116 restaurantes típicos (la relación del simulador de capacidad)

**Límite hoy:** no aplica (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 2,116 restaurantes. **No es el cuello sin purga.** **Es un tope de diseño supuesto, sin medir.**


### 2.6 Almacenamiento de fotos y respaldos (R2)

**Cómo funciona hoy.** Las fotos de los platillos y los respaldos diarios de la base viven en R2 (almacenamiento tipo S3 de Cloudflare); la API sólo guarda la dirección. Ruta: `app/services/assets.py`.

**Consumo.** 10 GB gratis y luego 0.015 USD por GB-mes

**Límite hoy:** sin tope práctico: 10 GB gratis (≈ 200 gratuitos) y después 0.014 pesos por restaurante al mes. **Con avisos:** sin tope práctico. **No es el cuello sin purga.**


## 3. El disco a fondo (medido con datos sintéticos en PostgreSQL local)

**Cómo se midió:** copia de una base con 10 restaurantes medianos, un mes de visitas (18,000 visitas), 10 eventos de analítica por visita **[supuesto]**; `pg_relation_size` y `pg_indexes_size` por tabla ([guion](2026-11-14-recursos-medir.py)). **Sesgo conocido:** el generador deja `miembro_id`, `platillo_id`, `ip_hash` y el navegador sin variación; en la copia se rellenaron con valores variados (miembro de la sesión, platillo del restaurante, 64 caracteres hexadecimales distintos por sesión y día, 8 navegadores). Con tráfico real pesaría distinto. TOAST = 0.

| Tabla | Filas por visita | Bytes por visita: tabla | Bytes por visita: índices | Total | % de la visita |
|---|---|---|---|---|---|
| `evento_analitica` | 10 | 2,042 | 1,639 | **3,683** | 49 % |
| `item_orden` | 7.8 | 786 | 566 | **1,354** | 18 % |
| `miembro_sesion` | 2.6 | 284 | 363 | **649** | 9 % |
| `orden_personal` | 2.6 | 284 | 308 | **593** | 8 % |
| `comanda_orden` | 2.6 | 157 | 279 | **438** | 6 % |
| `comanda` | 1.3 | 218 | 214 | **434** | 6 % |
| `sesion_grupal` | 1 | 126 | 136 | **264** | 4 % |
| `llamada_mesero` | 0.3 | 45 | 45 | **91** | 1 % |
| **Suma** | | | | **7,506** | 100 % |

*(las tablas de la visita salen de la medición anterior con el generador original; la analítica, de la copia con valores variados.)*

**Por qué pesa la analítica (`evento_analitica`): 353 bytes por evento = 216 en la tabla + 137 en índices.** (1) **Una fila por evento:** diez por visita. (2) **`ip_hash` ocupa 65 bytes** (64 caracteres de texto; 8 bastarían) y es el 35 % de los datos de la fila. (3) **Tres o más UUID de 16 bytes** (restaurante, mesa, sesión, miembro, platillo), `tipo` en texto (8.8), `user_agent_fam` en texto (7) y `propiedades` jsonb (10.6); suma de columnas 187 bytes más el encabezado de 23 de PostgreSQL. (4) **Siete índices** (137 bytes por evento): `idx_evento_restaurante_fecha` 41 · `idx_evento_tipo` 38 · `pk_evento_analitica` 23 · `idx_evento_sesion` 10 · `idx_evento_miembro` 10 · `idx_evento_mesa` 7 · `idx_evento_platillo` 7.

**Claves de idempotencia:** vacía hasta la Fase 3; medido, una fila pesa 530 bytes con su índice.

## 4. Palancas por recurso

Cada palanca se evalúa **sola** sobre la base **sin purga (12 meses acumulados)** y, para el disco, también sobre la base **con el historial del gratuito a 30 días**; no se suman las que se pisan. «Caben» = restaurantes típicos por el recurso, en Hobby con avisos. **La analítica agregada por día usa la cota de 150 platillos** (el gratuito permite 150; la copia tiene 60: con ellos el factor es 0.0462 en vez de 0.1101). **Las palancas «índices mínimos» y «tipos» salen de datos sintéticos y pueden quedar optimistas** (con tráfico real el índice pesa más). Dos muestras de cartas con sesgos opuestos (148 cartas de reparto: cortas; sitios propios: largas y formales) respaldan el tope de 150 platillos: ver [tres-planes](2026-11-14-tres-planes.md).

### Procesador (el trabajo de la API)

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| **Guardar estado en memoria 60 s** · El servidor recuerda el estado de cada mesa un minuto y sólo lo recalcula cuando la base avisa. | caben 148 | caben 276 | caben +128 restaurantes con el sondeo de hoy | medio | bajo-medio: cambia ADR-004 (vida máxima 2 s). EXTRAPOLA una medición por comensal (0.88 → 0.47 ms) a todo el procesador, y DEJA DE IMPORTAR cuando lleguen los avisos de la Fase 3 | ninguna; cambia un ADR | medida con datos sintéticos |

### Disco de la base de datos

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| **Guardar 30 días en el gratuito** · El plan gratuito conserva un mes de visitas y de analítica; lo anterior se descarga o se borra. | 169.5 MB por restaurante · caben 23 | 14.3 MB por restaurante · caben 279 | 155.2 MB menos por restaurante (acumulados con el historial supuesto); caben +256 restaurantes en el mismo disco · sobre la base con historial a 30 días: +0 restaurantes | medio | medio: un trabajo de purga; hay que avisar al dueño y ofrecer la descarga antes | CONTRADICE docs/plan/03_Datos_v1.md §7 (analítica 13 meses, sesiones y comandas 24 meses, sin distinguir por plan) y la regla 9 si se borran filas de entidades con historial (sesiones, comandas): hay que cambiar el documento y escribir el ADR ANTES (regla del repositorio); hoy NADA purga | medida con datos sintéticos |
| **Contar por día, no por evento** · En vez de una fila por cada toque, la base guarda un conteo por día, tipo y platillo. | 169.5 MB por restaurante · caben 23 | 94.9 MB por restaurante · caben 42 | 74.5 MB menos por restaurante (acumulados con el historial supuesto); caben +19 restaurantes en el mismo disco · sobre la base con historial a 30 días: +216 restaurantes | medio | medio: se pierde el detalle por sesión y por teléfono; sólo quedan conteos por día, tipo y platillo | ninguna dura (el evento no tiene datos personales: regla 10 se cumple mejor); pide ADR porque cambia el contrato de analítica | medida con datos sintéticos |
| **Borrar analítica cruda a 7 días** · Los eventos sueltos se conservan una semana y después sólo queda el conteo por día. | 169.5 MB por restaurante · caben 23 | 105.3 MB por restaurante · caben 37 | 64.2 MB menos por restaurante (acumulados con el historial supuesto); caben +14 restaurantes en el mismo disco · sobre la base con historial a 30 días: +168 restaurantes | chico | bajo: un trabajo diario que borra eventos viejos; la analítica no es una entidad con historial | CONTRADICE 03 §7 (analítica 13 meses con «agregación diaria y purga»): cambiar el documento antes; ninguna regla dura (el evento no es una entidad con historial) | estimada |
| **Quitar índices que sobran** · La tabla de analítica deja sólo los dos índices que de verdad se usan. | 169.5 MB por restaurante · caben 23 | 152.6 MB por restaurante · caben 26 | 16.8 MB menos por restaurante (acumulados con el historial supuesto); caben +3 restaurantes en el mismo disco · sobre la base con historial a 30 días: +31 restaurantes | chico | medio: las llaves foráneas con SET NULL piden índice en esa columna (skill /migracion); habría que quitar esas llaves y guardar ids opacos | convención de /migracion (índice en toda FK con cascada); pide ADR | medida con datos sintéticos |
| **Usar tipos de dato más chicos** · Los campos de la analítica pasan de texto largo a números y huellas cortas. | 169.5 MB por restaurante · caben 23 | 152.6 MB por restaurante · caben 26 | 16.8 MB menos por restaurante (acumulados con el historial supuesto); caben +3 restaurantes en el mismo disco · sobre la base con historial a 30 días: +31 restaurantes | medio | bajo: migración con reescritura de la tabla | ninguna | medida con datos sintéticos |
| **Purgar claves de reintento diario** · Las claves que evitan duplicar una orden al reintentar se borran al día siguiente. | 2.9 MB al mes por restaurante, sin tope (la tabla crece mientras nadie la purgue; hoy está vacía: ningún servicio la usa) | 0.10 MB constantes (un día) | evita 34 MB por restaurante al año; no cambia los restaurantes que caben hoy porque la tabla está vacía hasta la Fase 3 | chico | bajo si la ventana de reintento del teléfono es menor de 24 h | ninguna | medida con datos sintéticos |
| **Archivar sesiones viejas en R2** · Las sesiones cerradas de hace más de tres meses se guardan en un archivo aparte y salen de la base. | 169.5 MB por restaurante · caben 23 | 105.3 MB por restaurante · caben 37 | 64.2 MB menos por restaurante (acumulados con el historial supuesto); caben +14 restaurantes en el mismo disco · sobre la base con historial a 30 días: +0 restaurantes | grande | alto: se vuelve a leer el historial del archivo; un error pierde datos | regla 9 (sin borrado físico de entidades con historial) y regla 8 (ninguna comanda se pierde): PIDE ADR antes | estimada |

### Conexiones a la base de datos

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| **Acotar conexiones a la base** · Cada proceso usa menos conexiones de la base para no pasar su tope con más procesos. | caben 3288 | caben 1644 | evita pasarse de las 100 conexiones de la base con más procesos (ya no) | chico | bajo; hay que verificar `SHOW max_connections` en Railway | ninguna | estimada |

### Líneas abiertas con los teléfonos

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| **Cerrar líneas sin movimiento** · La conexión abierta con el teléfono se cierra a los 2 minutos sin cambios y se reabre sola. | caben 2116 | caben 3022 | caben +906 restaurantes antes de topar las 10,000 líneas | medio | bajo: el teléfono ya vuelve al sondeo si la línea falla | ninguna | estimada |

**Memoria y fotos:** ninguna palanca por ahora.

**Efecto en los números del modelo.** Las palancas entran en `config.palancas` y mueven `resumen`: «restaurantes gratuitos que caben **con el historial que dice `config` (30 días, propuesta)**» = 279; **sin purga (12 meses acumulados)** = 23; con la analítica agregada por día (sobre 30 días): 495.

## 5. La escalera: el tamaño del servidor que rentamos

| Tamaño del servidor | USD al mes (base a con carga) | Restaurantes que caben · recurso que obliga a subir (sin purga) | Con el historial a 30 días |
|---|---|---|---|
| Hobby (el que pagamos hoy): 2 procesos, 5 GB | 8.1 a 12 | 23 · **disco** | — |
| Pro, 2 procesos, 50 GB | 20 a 30 | 148 · **procesador** | — |
| Pro, 4 procesos, 50 GB | 23 a 44 | 236 · **disco** | — |
| Pro, 8 procesos, 50 GB | 30 a 54 | 236 · **disco** | — |
| Una segunda copia de toda la pila (extrapolación sin medir) | — | 472 · **disco** | — |

**Lectura.** Cada tamaño se llena por **el recurso en negritas**. Sin purga el disco manda en todos los tamaños de Hobby y Pro (50 GB tampoco alcanza con 12 meses); con 30 días de historial el procesador manda a partir del servidor Pro. **El de 8 procesos topa en las 10,000 líneas abiertas de Railway (tope de diseño supuesto, sin medir); más allá hay que repetir toda la pila (extrapolación sin medir).**

## 6. Glosario en llano

- **piso.** Lo que cuesta atender a un cliente de paga en un mes; es la suma de cuatro cosas: (1) lo que crece con su uso (1.9 pesos [documento]), (2) su parte de la base fija del servidor (3 pesos [documento]), (3) la comisión de la tarjeta con IVA [documento] y (4) el soporte (60 pesos [SUPUESTO]). El precio no debe bajar de 3 veces el piso.
- **tamano del servidor.** El tamaño del servidor que rentamos en Railway: cuántos procesos de la API corren, cuánta memoria y disco tiene y cuánto cuesta al mes. Sube por escalones (Hobby, Pro de 2, 4 y 8 procesos).
- **cuello de botella.** El recurso que se llena primero. Aunque los demás estén sobrados, el sistema no puede atender más restaurantes que los que aguanta el cuello de botella; para crecer hay que ensanchar ése.
- **linea abierta.** Una conexión que el teléfono deja abierta con el servidor para que éste le avise al instante cuando algo cambia (en lugar de preguntar cada 3 segundos). Railway permite unas 10,000 abiertas a la vez.

## 7. Qué no está medido

- **Procesador, memoria y conexiones en Railway:** todo sale de mediciones locales (±2×); falta `SHOW max_connections`, cuántos núcleos entrega Hobby y la CPU real con tráfico del piloto.
- **Disco:** medido con datos sintéticos; con tráfico real, otra distribución de `ip_hash`, navegador y platillos.
- **Estado en memoria 60 s:** extrapola una medición por comensal (0.88 → 0.47 ms) a todo el procesador y **deja de importar al llegar los avisos**.
- **Retención de 7 días, archivo de sesiones y cierre de líneas ociosas:** estimadas con su supuesto; el archivo de sesiones **toca las reglas 8 y 9 y pide ADR**; el historial a 30 días y la retención de 7 días **contradicen 03 §7**.
- **Claves de idempotencia por visita (3):** supuesto; la tabla se llena hasta la Fase 3.
