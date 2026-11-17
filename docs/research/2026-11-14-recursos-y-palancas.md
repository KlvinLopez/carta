# Recursos y palancas: qué pagamos, cuánto aguanta cada pieza y cómo ensancharla

**Fecha:** 14 de noviembre de 2026 (ronda 6) · **Generado por `2026-11-14-recursos.mjs`** desde `recursos(config, s)` del modelo ([JSON](2026-11-14-recursos-y-palancas.json)); disco medido con [`2026-11-14-recursos-medir.py`](2026-11-14-recursos-medir.py) en PostgreSQL local, **con datos sintéticos** (el generador deja `miembro_id` y `platillo_id` nulos; se rellenaron con valores variados en la copia). **Las palancas son propuestas: no se tocó `app/` ni `migrations/`.**

**Qué es un «restaurante típico» (en toda cifra de capacidad):** un gratuito típico = 1800 visitas al mes y 113.9 comensales al día (SUPUESTO del simulador, rango 40–250), con la mezcla de tamaños del simulador (60 % chico, 25 % mediano, 5 % grande, 10 % formal). Con el **doble** de actividad lo que cabe se divide entre 2 (86 por procesador y 91 por disco con el historial a 30 días); con **todos en su hora pico a la vez**, el procesador de hoy baja de 173 a 108 (factor 0.63, supuesto).

## De qué se compone el disco promedio (y por qué ya no es 279)

- **Restaurantes que caben por disco con avisos e historial a 30 días: 182** (antes: 279).
- **Mezcla:** 115.9 de paga por cada 1,000 restaurantes registrados. Un gratuito guarda 1 mes (7.9 MB) y uno de paga 12 meses (129 MB); promedio 21.9 MB.
- **Quién llena el disco:** los gratuitos 32 %, los de paga 68 %.
- **Costo de ese disco:** 0.36 pesos al mes por restaurante de paga frente a 225 que paga (0.2 %); un gratuito cuesta 0.02 pesos.
- **Por qué no es la cifra de antes:** Antes la cifra era 279 restaurantes y ahora es 182, por dos cambios: (1) la unidad: antes se contaban restaurantes GRATUITOS típicos (1,800 visitas al mes y 14.3 MB cada uno con historial a 30 días); ahora se cuenta el restaurante REGISTRADO, con la mezcla de 116 de paga por cada 1,000, donde cada uno de paga guarda 12 meses y llena 129.0 MB (16.3 veces un gratuito); (2) la carga del gratuito sale de los topes (1,080 visitas al mes con 6 mesas, supuesto), así que un gratuito llena 7.9 MB y no 14.3. El promedio queda en 21.9 MB y caben menos. Si todos fueran gratuitos de los topes cabrían 505.
- **Hallazgo:** El disco lo llenan sobre todo los de paga (68 %), que son 11.6 % de los restaurantes: su disco cuesta 0.36 pesos al mes frente a 225 que pagan (0.2 %). Es una parte chica de lo que pagan: el disco no es el problema económico, sólo el tope técnico del volumen.

**Cuánto de cada parte es analítica y cuánto sesiones y órdenes (parte del disco promedio):**

| | Fijo (menú, catálogo) | Sesiones y órdenes | Analítica | Total |
|---|---|---|---|---|
| Gratuitos | 0.8 % | 15.1 % | 15.9 % | 31.8 % |
| De paga (12 meses) | 0.1 % | 63.4 % | 4.6 % | 68.2 % |
| **Todos** | 0.9 % | 78.5 % | 20.6 % | 100 % |

**Por qué «contar por día» pasó de +77 % (279 → 495, ronda 8) a +22 % (182 → 222) y por qué ahora la palanca que más da es archivar (347):** Contar por día sólo recorta la analítica, que hoy es 21 % del disco promedio; antes se medía sobre un gratuito típico de 1,800 visitas, donde la analítica pesaba más y la ganancia era +77 % (279 → 495); con la mezcla actual los restaurantes de paga (63 % del disco sólo en sesiones y órdenes de 12 meses) dominan, y contar por día da +22 % (182 → 222). Archivar las sesiones cerradas a los 3 meses recorta justo esa parte y da +91 % (182 → 347); por eso ahora es la palanca que más da.

## Conclusiones

1. **Cuello de botella hoy: procesador (173, de 86 a 346) o disco, según cuánto historial se guarde y cuánto rinda el servidor: con historial del gratuito a 30 días el disco aguanta 182 y manda el procesador; sin purga manda el disco desde el mes 2 de operación de un restaurante.** Hoy **nada purga el historial** (03 §7 pide 13 y 24 meses sin distinguir por plan); la cifra de disco depende de los meses acumulados: 1 mes: 182 · 3 meses: 112 · 6 meses: 71 · 12 meses: 41 · lo que dice 03 §7 (24 meses de sesiones y 13 de analítica): 28 restaurantes.
2. **El procesador es ±2× y no se ha medido en Railway:** 173 restaurantes hoy (de 86 a 346) y 880 con avisos (de 440 a 1,760); **880 frente a 182 (disco con 30 días) queda fuera de ese margen**: no se puede decir cuál manda sin medirlo.
3. **Con los avisos de la Fase 3 el procesador sube a 880 y manda el disco:** 41 restaurantes sin purga (12 meses acumulados) o 182 con el historial a 30 días. Las líneas abiertas aguantan 3,268: **es un tope de diseño supuesto (10,000 de Railway ÷ 4.7 líneas por restaurante), sin medir.**
4. **La palanca número uno es el historial del gratuito a 30 días:** 74.8 MB menos por restaurante (acumulados con el historial supuesto); caben +141 restaurantes en el mismo disco (de 41 a 182 por disco). **Contradice 03 §7 (13 y 24 meses) y la regla 9 si se borran sesiones y comandas: hay que cambiar el documento y escribir el ADR antes.** Las siguientes, evaluadas sobre esa base: Analítica agregada por día en vez de una fila por evento (38.2 MB menos por restaurante (acumulados con el historial supuesto); caben +27 restaurantes en el mismo disco; sobre la base con historial a 30 días: +40) · Guardar la analítica en bruto sólo 7 días (después, agregada) (32.9 MB menos por restaurante (acumulados con el historial supuesto); caben +21 restaurantes en el mismo disco; sobre la base con historial a 30 días: +34).
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
| **Procesador (el trabajo de la API)** | 173 | 880 | 173 | 880 | no / **🔴 SÍ** | no / no | medido en local (±2×); falta medir en Railway: no se sabe cuántos núcleos entrega Hobby |
| **Memoria de la API** | sin tope práctico | sin tope práctico | sin tope práctico | sin tope práctico | no / no | no / no | proceso y línea medidos; el resto supuesto |
| **Disco de la base de datos** | 41 | 41 | 182 | 182 | **🔴 SÍ** / no | **🔴 SÍ** / **🔴 SÍ** | medido con datos sintéticos en PostgreSQL local (10 restaurantes medianos, un mes); depende de los meses de historial que se guarden (hoy nada purga) |
| **Conexiones a la base de datos** | 3,850 | 19,574 | 3,850 | 19,574 | no / no | no / no | estimada: falta `SHOW max_connections` en Railway |
| **Líneas abiertas con los teléfonos** | no existe hoy | 3,268 | no existe hoy | 3,268 | no / no | no / no | TOPE DE DISEÑO SUPUESTO, sin medir: 10,000 conexiones de Railway (documentación, «subject to change») ÷ 4.7 líneas por restaurante (relación del simulador de capacidad); el consumo por línea sí se midió en local |
| **Almacenamiento de fotos y respaldos (R2)** | sin tope práctico | sin tope práctico | sin tope práctico | sin tope práctico | no / no | no / no | documento (mapa de procesos) y precio de Cloudflare |

### El disco según los meses de historial acumulado (hoy nada purga)

| Historial del gratuito | MB por restaurante | Restaurantes que caben por disco (Hobby, 5 GB, 20 % de reserva) | Cuello hoy | Cuello con avisos |
|---|---|---|---|---|
| 1 mes | 21.9 | **182** | procesador (173) | disco (182) |
| 3 meses | 35.5 | **112** | disco (112) | disco (112) |
| 6 meses | 55.9 | **71** | disco (71) | disco (71) |
| 12 meses | 96.7 | **41** | disco (41) | disco (41) |
| lo que dice 03 §7 (24 meses de sesiones y 13 de analítica) | 139.9 | **28** | disco (28) | disco (28) |

**El disco manda desde el mes 2 de operación de un restaurante con el sondeo** (y desde el mes 1 con avisos) si nada purga. MB por restaurante = «al mes» sólo para el historial de 1 mes; con más meses es lo acumulado.

### Sensibilidad a la actividad y al pico

| Actividad del restaurante típico | Procesador hoy | Procesador con avisos | Disco (sin purga) | Disco (historial 30 días) |
|---|---|---|---|---|
| ×0.5 | 346 | 1,760 | 82 | 364 |
| ×1 | 173 | 880 | 41 | 182 |
| ×2 | 86 | 440 | 20 | 91 |

**Todos en su hora pico a la vez:** procesador 108 hoy y 554 con avisos. **Margen de error del procesador (±2×):** 86–346 hoy y 440–1,760 con avisos. 600 peticiones por segundo medidas en local con 2 núcleos (rango 420–600); no se sabe cuántos núcleos entrega Hobby: ±2× hasta medir en Railway.

### 2.1 Procesador (el trabajo de la API)

**Cómo funciona hoy.** Cada teléfono con la app abierta le pregunta al servidor cada 3 segundos si algo cambió; casi siempre la respuesta es «nada nuevo», pero cada pregunta gasta procesador. Con los avisos de la Fase 3, el servidor sólo habla cuando hay un cambio. Ruta: `app/api/publico/sesion.py` (estado con ETag) y `app/services/sesion.py`.

**Consumo.** 1 gratuito típico = 1 unidad de carga; un cliente de paga pesa 2.3; con el sondeo un teléfono pregunta cada 3 s (≈ 4.1 peticiones/s por restaurante registrado, medido en el tope)

**Límite hoy:** 173 restaurantes (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 880 restaurantes. **No es el cuello sin purga.**


### 2.2 Memoria de la API

**Cómo funciona hoy.** Cada proceso de la API guarda en memoria el menú y el estado de las mesas por unos segundos, y (con avisos) una línea por cada teléfono conectado. Ruta: `app/services/{cache_menu,menu_publico,sesion}.py`.

**Consumo.** 160 MB fijos por proceso; 0.1 MB por restaurante con el sondeo (supuesto) y 0.2 MB con avisos (la línea abierta cuesta 23 KB [medido]).

**Límite hoy:** sin tope práctico (más de 100,000 restaurantes). **Con avisos:** sin tope práctico. **No es el cuello sin purga.**


### 2.3 Disco de la base de datos

**Cómo funciona hoy.** Cada visita deja filas en `sesion_grupal`, `miembro_sesion`, `orden_personal`, `item_orden`, `comanda`, `comanda_orden` y `llamada_mesero`, y **diez filas de analítica en `evento_analitica`**; las tablas y sus índices viven en el volumen de PostgreSQL. Ruta: `app/db/models.py`; analítica en `app/services/analitica.py`.

**Consumo.** 96.7 MB por restaurante gratuito típico con — meses de historial (1,800 visitas al mes), 7.5 KB por visita [medido con datos sintéticos].

**Límite hoy:** 41 restaurantes (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 41 restaurantes. **🔴 Es el cuello de botella de hoy (sin purga).**


### 2.4 Conexiones a la base de datos

**Cómo funciona hoy.** Cada petición pide prestada una conexión a la base del grupo de su proceso (`DB_POOL_SIZE` 10 y `DB_MAX_OVERFLOW` 10) y la devuelve en milisegundos. Con avisos, cada proceso mantiene además una conexión fija para escuchar a la base. Ruta: `app/db/database.py`.

**Consumo.** cada petición retiene una conexión ≈ 3 ms

**Límite hoy:** 3,850 restaurantes (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 19,574 restaurantes. **No es el cuello sin purga.**


### 2.5 Líneas abiertas con los teléfonos

**Cómo funciona hoy.** Con los avisos (ADR-018, Fase 3) cada teléfono mantiene una conexión abierta con el servidor; Railway permite unas 10,000 abiertas a la vez. Hoy no existen. Ruta futura: `/p/sesion/eventos` y `/op/eventos` (T-3.20 y T-3.21).

**Consumo.** 10000 ÷ 2116 restaurantes típicos (la relación del simulador de capacidad)

**Límite hoy:** no aplica (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 3,268 restaurantes. **No es el cuello sin purga.** **Es un tope de diseño supuesto, sin medir.**


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
| **Guardar estado en memoria 60 s** · El servidor recuerda el estado de cada mesa un minuto y sólo lo recalcula cuando la base avisa. | caben 173 | caben 306 | caben +133 restaurantes con el sondeo de hoy | medio | bajo-medio: cambia ADR-004 (vida máxima 2 s). EXTRAPOLA una medición por comensal (0.88 → 0.47 ms) a todo el procesador, y DEJA DE IMPORTAR cuando lleguen los avisos de la Fase 3 | ninguna; cambia un ADR | medida con datos sintéticos |

### Disco de la base de datos

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| **Guardar 30 días en el gratuito** · El plan gratuito conserva un mes de visitas y de analítica; lo anterior se descarga o se borra. | 96.7 MB por restaurante · caben 41 | 21.9 MB por restaurante · caben 182 | 74.8 MB menos por restaurante (acumulados con el historial supuesto); caben +141 restaurantes en el mismo disco · sobre la base con historial a 30 días: +0 restaurantes | medio | medio: un trabajo de purga; hay que avisar al dueño y ofrecer la descarga antes | CONTRADICE docs/plan/03_Datos_v1.md §7 (analítica 13 meses, sesiones y comandas 24 meses, sin distinguir por plan) y la regla 9 si se borran filas de entidades con historial (sesiones, comandas): hay que cambiar el documento y escribir el ADR ANTES (regla del repositorio); hoy NADA purga | medida con datos sintéticos |
| **Contar por día, no por evento** · En vez de una fila por cada toque, la base guarda un conteo por día, tipo y platillo. | 96.7 MB por restaurante · caben 41 | 58.5 MB por restaurante · caben 68 | 38.2 MB menos por restaurante (acumulados con el historial supuesto); caben +27 restaurantes en el mismo disco · sobre la base con historial a 30 días: +40 restaurantes | medio | medio: se pierde el detalle por sesión y por teléfono; sólo quedan conteos por día, tipo y platillo | ninguna dura (el evento no tiene datos personales: regla 10 se cumple mejor); pide ADR porque cambia el contrato de analítica | medida con datos sintéticos |
| **Borrar analítica cruda a 7 días** · Los eventos sueltos se conservan una semana y después sólo queda el conteo por día. | 96.7 MB por restaurante · caben 41 | 63.8 MB por restaurante · caben 62 | 32.9 MB menos por restaurante (acumulados con el historial supuesto); caben +21 restaurantes en el mismo disco · sobre la base con historial a 30 días: +34 restaurantes | chico | bajo: un trabajo diario que borra eventos viejos; la analítica no es una entidad con historial | CONTRADICE 03 §7 (analítica 13 meses con «agregación diaria y purga»): cambiar el documento antes; ninguna regla dura (el evento no es una entidad con historial) | estimada |
| **Guardar una fila por visita** · El teléfono arma una sola fila con cuántas veces entró y cuánto tiempo estuvo en el menú, el platillo, la búsqueda y los filtros, y la manda al terminar. | 96.7 MB por restaurante · caben 41 | 58.8 MB por restaurante · caben 67 | 37.9 MB menos por restaurante (acumulados con el historial supuesto); caben +26 restaurantes en el mismo disco · sobre la base con historial a 30 días: +40 restaurantes | medio | medio: se pierde el platillo visto y el orden de los toques; depende de que el teléfono mande la fila (si se cierra antes, se pierde); actualizar la fila duplica el tamaño de la tabla; sin ip_hash (no hace falta) | ninguna dura (sin datos personales: regla 10 se cumple mejor); pide ADR porque cambia el contrato de analítica | medida con datos sintéticos |
| **Guardar fila por visita y platillo** · Lo mismo, más un conteo diario de cuántas veces se vio cada platillo, para no perder qué platillos gustan. | 96.7 MB por restaurante · caben 41 | 61.6 MB por restaurante · caben 64 | 35.2 MB menos por restaurante (acumulados con el historial supuesto); caben +23 restaurantes en el mismo disco · sobre la base con historial a 30 días: +36 restaurantes | medio | medio: dos tablas y dos envíos; conserva el platillo visto (conteo por día) pero no cuál comensal lo vio | ninguna dura; pide ADR (contrato de analítica) | medida con datos sintéticos |
| **Archivar sesiones viejas en R2** · Las sesiones cerradas de hace más de tres meses se guardan en un archivo aparte y salen de la base. | 96.7 MB por restaurante · caben 41 | 56.6 MB por restaurante · caben 70 | 40.2 MB menos por restaurante (acumulados con el historial supuesto); caben +29 restaurantes en el mismo disco · sobre la base con historial a 30 días: +165 restaurantes | grande | alto: se vuelve a leer el historial del archivo; un error pierde datos | regla 9 (sin borrado físico de entidades con historial) y regla 8 (ninguna comanda se pierde): PIDE ADR antes | estimada |

### Líneas abiertas con los teléfonos

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| **Cerrar líneas sin movimiento** · La conexión abierta con el teléfono se cierra a los 2 minutos sin cambios y se reabre sola. | caben 3268 | caben 4669 | caben +1401 restaurantes antes de topar las 10,000 líneas | medio | bajo: el teléfono ya vuelve al sondeo si la línea falla | ninguna | estimada |

**Alternativas que no se suman.** Forma de guardar la analítica (se elige una; no se suman): Contar por día, la fila por visita y la fila por visita más platillo reemplazan la fila por evento; los índices mínimos, los tipos chicos y la retención a 7 días sólo mejoran la fila por evento, así que no suman con ninguna de las tres. El modelo aplica una sola (en orden de prioridad: analitica_agregada_por_dia, fila_por_visita_mas_platillo_por_dia, fila_por_visita_de_comensal, indices_de_evento_minimos + tipos_mas_chicos, retencion_analitica_7_dias); el tablero muestra la ganancia de cada una por separado, no la suma.

**Memoria y fotos:** ninguna palanca por ahora.

### Ajustes menores (fuera del tablero)

**Regla del tablero:** entra al tablero si sube al menos 15 % la capacidad del recurso que toca, en algún canal (sondeo o avisos), con el historial del gratuito a 30 días; la palanca del historial se mide sin purga (12 meses) porque es la decisión; umbral 15 % (un juicio: con 10 % entrarían también índices y tipos, +11 %; entre 12 % y 43 % la lista no cambia). Las demás palancas quedan aquí; siguen en el JSON.

| Ajuste menor | Qué es | Sube la capacidad del recurso que toca (máximo) |
|---|---|---|
| **Quitar índices que sobran** | La tabla de analítica deja sólo los dos índices que de verdad se usan. | 3.8 % |
| **Usar tipos de dato más chicos** | Los campos de la analítica pasan de texto largo a números y huellas cortas. | 3.8 % |
| **Purgar claves de reintento diario** | Las claves que evitan duplicar una orden al reintentar se borran al día siguiente. | 0 % |
| **Acotar conexiones a la base** | Cada proceso usa menos conexiones de la base para no pasar su tope con más procesos. | 0 % |


**Efecto en los números del modelo.** Las palancas entran en `config.palancas` y mueven `resumen`: «restaurantes gratuitos que caben **con el historial que dice `config` (30 días, propuesta)**» = 279; **sin purga (12 meses acumulados)** = 23; con la analítica agregada por día (sobre 30 días): 495.

## 5. La escalera: el tamaño del servidor que rentamos

| Tamaño del servidor | USD al mes (base a con carga) | Restaurantes que caben · recurso que obliga a subir (sin purga) | Con el historial a 30 días |
|---|---|---|---|
| Hobby (el que pagamos hoy): 2 procesos, 5 GB | 8.1 a 12 | 41 · **disco** | — |
| Pro, 2 procesos, 50 GB | 20 a 30 | 173 · **procesador** | — |
| Pro, 4 procesos, 50 GB | 23 a 44 | 311 · **procesador** | — |
| Pro, 8 procesos, 50 GB | 30 a 54 | 356 · **procesador** | — |
| Una segunda copia de toda la pila (extrapolación sin medir) | — | 712 · **procesador** | — |

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
