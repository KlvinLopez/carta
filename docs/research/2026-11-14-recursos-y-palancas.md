# Recursos y palancas: qué pagamos, cuánto aguanta cada pieza y cómo ensancharla

**Fecha:** 14 de noviembre de 2026 · **Generado por `2026-11-14-recursos.mjs`** desde la función `recursos(config, s)` del modelo ([JSON](2026-11-14-recursos-y-palancas.json)); medición de disco con [`2026-11-14-recursos-medir.py`](2026-11-14-recursos-medir.py) en PostgreSQL local. **Las palancas son propuestas: no se tocó `app/` ni `migrations/`.** «Restaurantes» = restaurantes gratuitos típicos registrados (con la mezcla del simulador); es ±2× en lo que depende del procesador de Railway, que aún no se mide allí.

## Conclusiones

1. **Cuello de botella hoy (el teléfono pregunta cada 3 s): el procesador, con 148 restaurantes** (≈ 0.5 M de comensales al mes, simulados). El disco aguanta 279 y las conexiones a la base 3,288.
2. **Con los avisos de la Fase 3 el cuello se mueve al disco: 279 restaurantes** (≈ 1 M de comensales al mes) en el mismo servidor Hobby; el procesador pasaría a aguantar 1,064 y las líneas abiertas 2,116.
3. **Las tres palancas que más ganan:** 1. Analítica agregada por día en vez de una fila por evento (6.6 MB menos por restaurante al mes; caben +239 restaurantes en el mismo disco) · 2. Guardar la analítica en bruto sólo 7 días (después, agregada) (5.4 MB menos por restaurante al mes; caben +168 restaurantes en el mismo disco) · 3. Estado de la mesa en memoria 60 s, invalidado por aviso de la base (sólo con el sondeo) (caben +128 restaurantes con el sondeo de hoy).
4. **El disco pesa porque cada visita deja diez filas de analítica de 368 bytes y casi la mitad es índices:** la analítica es 49 % de lo que ocupa una visita (7,506 bytes, medido).
5. **Con la analítica agregada por día el disco sube de 279 a 518 restaurantes y sigue siendo el cuello; deja de serlo sólo al pasar a Pro (50 GB de disco): entonces el cuello es el procesador (1,064).**

## 1. Qué pagamos hoy

| Servicio | Plan | USD al mes | Detalle y fuente |
|---|---|---|---|
| Railway · api (la aplicación) | Hobby (5 USD al mes, incluye 5 USD de uso) | 8.1 | factura real ≈ 8.1 USD con la memoria deducida de la factura [documento: anuncios-y-capa-del-comensal §0]; CPU a 20 USD por vCPU-mes y RAM a 10 USD por GB-mes [fuente: docs.railway.com, leída 14-nov-2026] |
| Railway · Postgres (la base de datos, versión 18) | Hobby: volumen de 5 GB | incluido | incluido en los 8.1 USD; el volumen cuesta 0.15 USD por GB-mes; Pro sube el volumen a 50 GB (en este modelo) |
| Railway · respaldo (copia diaria con pg_dump) | Hobby | incluido | trabajo programado; corre unos minutos al día; incluido en la factura de Railway |
| Cloudflare (DNS, HTTPS y caché del menú) | Free | 0 | [documento: deploy/railway/README.md §Cloudflare, plan Free]; el menú público lo absorbe la caché del borde |
| Cloudflare R2 (fotos y respaldos) | 10 GB gratis, después 0.015 USD por GB-mes | 0 | [fuente: developers.cloudflare.com/r2/pricing, 14-nov-2026]; ≈ 0.05 GB por gratuito típico: cubre ≈ 200 gratuitos sin pagar |
| Dominio carta.cooking | anual | 2.1 | 25 USD al año [documento: dato de Calvin, 13-nov] |

**Total ≈ 10.2 USD al mes (190 pesos).** No incluye: Firebase Authentication (plan sin costo hoy; sin dato de límites); API de Claude para leer PDFs (≈ 0.11 a 0.64 USD por lectura [documento: planes-y-costo §0]). **Dato por confirmar:** si los 8.1 USD cubren staging y producción juntos (hay un proyecto Railway con dos environments).

## 2. Cada recurso, de un vistazo

**Cuello de botella en rojo.** «Hoy» = servidor que se paga hoy (Hobby, 2 procesos, sondeo de 3 s). «Con avisos» = el mismo servidor con la Fase 3 (ADR-018, no construida).

| Recurso | Restaurantes hoy | Restaurantes con avisos (mismo servidor) | ¿Cuello hoy? | ¿Cuello con avisos? | Medido o estimado |
|---|---|---|---|---|---|
| **Procesador (el trabajo de la API)** | 148 | 1,064 | **🔴 SÍ** | no | medido en local (±2×); falta medir en Railway |
| **Memoria de la API** | sin tope práctico | sin tope práctico | no | no | proceso y línea medidos; el resto supuesto |
| **Disco de la base de datos** | 279 | 279 | no | **🔴 SÍ** | medido en PostgreSQL local (10 restaurantes medianos, un mes) |
| **Conexiones a la base de datos** | 3,288 | 23,644 | no | no | estimada: falta `SHOW max_connections` en Railway |
| **Líneas abiertas con los teléfonos** | no existe hoy | 2,116 | no | no | tope de Railway leído en su documentación; consumo medido en local |
| **Almacenamiento de fotos y respaldos (R2)** | sin tope práctico | sin tope práctico | no | no | documento (mapa de procesos) y precio de Cloudflare |

### 2.1 Procesador (el trabajo de la API)

**Cómo funciona hoy.** Cada teléfono con la app abierta le pregunta al servidor cada 3 segundos si algo cambió; casi siempre la respuesta es «nada nuevo», pero cada pregunta gasta procesador. Con los avisos de la Fase 3, el servidor sólo habla cuando hay un cambio. Ruta: `app/api/publico/sesion.py` (estado con ETag) y `app/services/sesion.py`.

**Consumo.** 1 gratuito típico = 1 unidad de carga; un cliente de paga pesa 2.3; con el sondeo un teléfono pregunta cada 3 s (≈ 4.1 peticiones/s por restaurante registrado, medido en el tope)

**Límite hoy:** 148 restaurantes (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 1,064 restaurantes (3.6 M de comensales al mes). **🔴 Es el cuello de botella de hoy.**


### 2.2 Memoria de la API

**Cómo funciona hoy.** Cada proceso de la API guarda en memoria el menú y el estado de las mesas por unos segundos, y (con avisos) una línea por cada teléfono conectado. Ruta: `app/services/{cache_menu,menu_publico,sesion}.py`.

**Consumo.** 160 MB fijos por proceso; 0.1 MB por restaurante con el sondeo (supuesto) y 0.2 MB con avisos (la línea abierta cuesta 23 KB [medido]).

**Límite hoy:** sin tope práctico (más de 100,000 restaurantes). **Con avisos:** sin tope práctico. **No es el cuello.**


### 2.3 Disco de la base de datos

**Cómo funciona hoy.** Cada visita deja filas en `sesion_grupal`, `miembro_sesion`, `orden_personal`, `item_orden`, `comanda`, `comanda_orden` y `llamada_mesero`, y **diez filas de analítica en `evento_analitica`**; las tablas y sus índices viven en el volumen de PostgreSQL. Ruta: `app/db/models.py`; analítica en `app/services/analitica.py`.

**Consumo.** 14.3 MB al mes por restaurante gratuito típico (con 1,800 visitas al mes y la mezcla del simulador), 7.5 KB por visita [medido].

**Límite hoy:** 279 restaurantes (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 279 restaurantes (1 M de comensales al mes). **🔴 Es el cuello de botella con avisos.**


### 2.4 Conexiones a la base de datos

**Cómo funciona hoy.** Cada petición pide prestada una conexión a la base del grupo de su proceso (`DB_POOL_SIZE` 10 y `DB_MAX_OVERFLOW` 10) y la devuelve en milisegundos. Con avisos, cada proceso mantiene además una conexión fija para escuchar a la base. Ruta: `app/db/database.py`.

**Consumo.** cada petición retiene una conexión ≈ 3 ms

**Límite hoy:** 3,288 restaurantes (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 23,644 restaurantes (80.8 M de comensales al mes). **No es el cuello.**


### 2.5 Líneas abiertas con los teléfonos

**Cómo funciona hoy.** Con los avisos (ADR-018, Fase 3) cada teléfono mantiene una conexión abierta con el servidor; Railway permite unas 10,000 abiertas a la vez. Hoy no existen. Ruta futura: `/p/sesion/eventos` y `/op/eventos` (T-3.20 y T-3.21).

**Consumo.** 10000 ÷ 2116 restaurantes típicos (la relación del simulador de capacidad)

**Límite hoy:** no aplica (Hoy: sondeo, 2 procesos, Hobby). **Con avisos:** 2,116 restaurantes (7.2 M de comensales al mes). **No es el cuello.**


### 2.6 Almacenamiento de fotos y respaldos (R2)

**Cómo funciona hoy.** Las fotos de los platillos y los respaldos diarios de la base viven en R2 (almacenamiento tipo S3 de Cloudflare); la API sólo guarda la dirección. Ruta: `app/services/assets.py`.

**Consumo.** 10 GB gratis y luego 0.015 USD por GB-mes

**Límite hoy:** sin tope práctico: 10 GB gratis (≈ 200 gratuitos) y después 0.014 pesos por restaurante al mes. **Con avisos:** sin tope práctico. **No es el cuello.**


## 3. El disco a fondo (medido en PostgreSQL local)

**Cómo se midió:** copia de una base con 10 restaurantes medianos, un mes de visitas (18,000 visitas), 10 eventos de analítica por visita **[supuesto]**; `pg_relation_size` y `pg_indexes_size` por tabla ([guion](2026-11-14-recursos-medir.py) y [medición anterior](2026-11-14-disco-e-historial.md)). TOAST = 0 (las filas son chicas).

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

**Por qué pesa la analítica (`evento_analitica`): 368 bytes por evento = 204 en la tabla + 164 en índices.** (1) **Una fila por evento:** diez por visita. (2) **`ip_hash` ocupa 65 bytes** (64 caracteres de texto en hexadecimal; 8 bastarían) y es el 40 % de los datos de la fila. (3) **Tres UUID de 16 bytes** (restaurante, mesa, sesión) más `tipo` en texto (8.8 bytes), `user_agent_fam` en texto (14) y `propiedades` jsonb (10.6); suma de columnas 162 bytes más el encabezado de 23 de PostgreSQL por fila. (4) **Siete índices** (164 bytes por evento): `idx_evento_restaurante_fecha` 53 · `idx_evento_tipo` 51 · `pk_evento_analitica` 23 · `idx_evento_sesion` 14 · `idx_evento_mesa` 11 · `idx_evento_miembro` 7 · `idx_evento_platillo` 7.

**Qué parte es qué (por visita, bytes):** analítica 3,680 (49 %); órdenes e ítems 2,384; sesión y miembros 912; comandas y llamadas 526. **Claves de idempotencia:** la tabla está vacía hasta la Fase 3; medido, una fila pesa 530 bytes con su índice (respuesta de ≈ 340 bytes).

## 4. Palancas por recurso

Cada palanca se evalúa **sola** contra el estado actual; **no se suman** las que se pisan (la analítica agregada ya incluye la retención, los índices y los tipos). «Caben» = restaurantes por disco en el servidor Hobby con avisos (o por el recurso que corresponde).

### Procesador (el trabajo de la API)

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| Estado de la mesa en memoria 60 s, invalidado por aviso de la base (sólo con el sondeo) | caben 148 | caben 276 | caben +128 restaurantes con el sondeo de hoy | medio | bajo-medio: cambia ADR-004 (vida máxima 2 s) | ninguna; cambia un ADR | medido |

### Disco de la base de datos

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| Analítica agregada por día en vez de una fila por evento | 14.3 MB al mes por restaurante · caben 279 | 7.7 MB al mes por restaurante · caben 518 | 6.6 MB menos por restaurante al mes; caben +239 restaurantes en el mismo disco | medio | medio: se pierde el detalle por sesión y por teléfono; sólo quedan conteos por día, tipo y platillo | ninguna dura (el evento no tiene datos personales: regla 10 se cumple mejor); pide ADR porque cambia el contrato de analítica | medido |
| Guardar la analítica en bruto sólo 7 días (después, agregada) | 14.3 MB al mes por restaurante · caben 279 | 8.9 MB al mes por restaurante · caben 447 | 5.4 MB menos por restaurante al mes; caben +168 restaurantes en el mismo disco | chico | bajo: un trabajo diario que borra eventos viejos; la analítica no es una entidad con historial | ninguna dura (regla 9 habla de entidades con historial; el evento no lo es) | estimada |
| Dejar sólo dos índices en la analítica (llave y restaurante-fecha) | 14.3 MB al mes por restaurante · caben 279 | 12.4 MB al mes por restaurante · caben 321 | 1.9 MB menos por restaurante al mes; caben +42 restaurantes en el mismo disco | chico | medio: las llaves foráneas con SET NULL piden índice en esa columna (skill /migracion); habría que quitar esas llaves y guardar ids opacos | convención de /migracion (índice en toda FK con cascada); pide ADR | medido |
| Tipos más chicos en la analítica (tipo y navegador como número, huella de red de 8 bytes) | 14.3 MB al mes por restaurante · caben 279 | 12.2 MB al mes por restaurante · caben 327 | 2.1 MB menos por restaurante al mes; caben +48 restaurantes en el mismo disco | medio | bajo: migración con reescritura de la tabla | ninguna | medido |
| Purgar las claves de idempotencia a las 24 horas | 2.9 MB al mes por restaurante, sin tope (la tabla crece mientras nadie la purgue; hoy está vacía: ningún servicio la usa) | 0.10 MB constantes (un día) | evita 34 MB por restaurante al año; no cambia los restaurantes que caben hoy porque la tabla está vacía hasta la Fase 3 | chico | bajo si la ventana de reintento del teléfono es menor de 24 h | ninguna | medido |
| Archivar en R2 las sesiones cerradas con más de 3 meses y quitarlas de la base | 14.3 MB al mes por restaurante · caben 279 | 14.3 MB al mes por restaurante · caben 279 | 0.0 MB menos por restaurante al mes; caben +0 restaurantes en el mismo disco | grande | alto: se vuelve a leer el historial del archivo; un error pierde datos | regla 9 (sin borrado físico de entidades con historial) y regla 8 (ninguna comanda se pierde): PIDE ADR antes | estimada |

### Conexiones a la base de datos

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| Acotar el pool a 5 + 5 conexiones por proceso (con 8 procesos: 80 de las ≈ 100 que da la base) | caben 3288 | caben 1644 | evita pasarse de las 100 conexiones de la base con más procesos (ya no) | chico | bajo; hay que verificar `SHOW max_connections` en Railway | ninguna | estimada |

### Líneas abiertas con los teléfonos

| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |
|---|---|---|---|---|---|---|---|
| Cerrar la línea abierta a los 2 minutos sin cambios y reabrirla al volver | caben 2116 | caben 3022 | caben +906 restaurantes antes de topar las 10,000 líneas | medio | bajo: el teléfono ya vuelve al sondeo si la línea falla | ninguna | estimada |

**Memoria y fotos:** ninguna palanca por ahora (la memoria no limita antes que los demás recursos y las fotos caben en el plan gratuito de R2 hasta ≈ 200 gratuitos).

**Efecto en los números del modelo.** Las palancas entran en `config.palancas` y mueven `resumen`: «restaurantes gratuitos que caben» pasa de 279 a 518 con la analítica agregada por día (los demás casos: 148 y 2,116).

## 5. La escalera: el tamaño del servidor que rentamos

| Tamaño del servidor | USD al mes (base a con carga) | Restaurantes que caben | Recurso que obliga a subir |
|---|---|---|---|
| Hoy: Hobby, 2 procesos, el teléfono pregunta cada 3 s | 8.1 a 20 | 148 | **procesador** |
| Hobby, 2 procesos, con avisos en vez de preguntas (Fase 3) | 8.1 a 12 | 279 | **disco** |
| Pro, 2 procesos, con avisos | 20 a 30 | 1,064 | **procesador** |
| Pro, 4 procesos, con avisos | 23 a 44 | 1,896 | **procesador** |
| Pro, 8 procesos, con avisos | 30 a 54 | 2,116 | **lineas** |
| Una segunda copia de toda la pila (extrapolación sin medir) | — | 4,232 | **líneas abiertas** |

**Lectura.** Cada tamaño se llena por **el recurso de la última columna**: es el que hay que ensanchar para pasar al siguiente. El salto de Hobby a Pro cuesta ≈ 12 USD base más y trae 10 veces más disco (50 GB). **El de 8 procesos topa en las 10,000 líneas abiertas de Railway; más allá hay que repetir toda la pila (extrapolación sin medir).**

## 6. Glosario en llano

- **piso.** Lo que cuesta atender a un cliente de paga en un mes; es la suma de cuatro cosas: (1) lo que crece con su uso (1.9 pesos [documento]), (2) su parte de la base fija del servidor (3 pesos [documento]), (3) la comisión de la tarjeta con IVA [documento] y (4) el soporte (60 pesos [SUPUESTO]). El precio no debe bajar de 3 veces el piso.
- **tamano del servidor.** El tamaño del servidor que rentamos en Railway: cuántos procesos de la API corren, cuánta memoria y disco tiene y cuánto cuesta al mes. Sube por escalones (Hobby, Pro de 2, 4 y 8 procesos).
- **cuello de botella.** El recurso que se llena primero. Aunque los demás estén sobrados, el sistema no puede atender más restaurantes que los que aguanta el cuello de botella; para crecer hay que ensanchar ése.
- **linea abierta.** Una conexión que el teléfono deja abierta con el servidor para que éste le avise al instante cuando algo cambia (en lugar de preguntar cada 3 segundos). Railway permite unas 10,000 abiertas a la vez.

## 7. Qué no está medido

- **Procesador, memoria y conexiones en Railway:** todo sale de mediciones locales (±2×); falta `SHOW max_connections` y medir CPU real con tráfico del piloto.
- **Analítica agregada:** el generador no asigna platillo a los eventos; se usa la **cota alta** (todos los platillos con vistas cada día).
- **Retención de 7 días, archivo de sesiones y cierre de líneas ociosas:** estimadas con su supuesto; el archivo de sesiones **toca las reglas 8 y 9 y pide ADR**.
- **Claves de idempotencia por visita (3):** supuesto; la tabla se llena hasta la Fase 3.
