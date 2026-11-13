# Modelo de capacidad de Carta (adelanto de T-4.4)

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/T-4.4-modelo-de-capacidad` · **Estado:** teoría + mediciones **locales**; nada se mandó a staging ni a producción. La T-4.4 completa (después de la Fase 3, con k6 contra staging) confirma o corrige este modelo.

Cada cifra lleva una marca: **[medida aquí]** (la midió esta tarea en un contenedor local de 4 vCPU Xeon 2.1 GHz), **[documento]** (la dice un documento del repositorio o una página del proveedor leída hoy) o **[estimada]** (cálculo o juicio, con su supuesto).

---

## Para Calvin: las cuatro respuestas

> **Una advertencia que cambia la lectura.** `02_Arquitectura` §10.1 estimaba que 2 workers aguantan «40–60 restaurantes en pico» con ~0.4 ms de CPU por sondeo. **Medido aquí, un sondeo cuesta 1.8–3.5 ms, no 0.4.** El tope real es unas **4–5 veces menor** que ese texto. El margen de error de lo que sigue es de **±2×** hasta que la T-4.4 mida en Railway.

**Qué es «pico» aquí:** un restaurante con 40 mesas ocupadas y 3 comensales por mesa, todos con la app abierta (120 teléfonos, cada uno preguntando «¿cambió algo?» cada 3 s) más 6 dispositivos del personal. Es el escenario de 02 §10.1; un restaurante normal está lejos de eso casi todo el día.

### 0. Sobre el video del reto de «cuántos usuarios aguanta un servidor de 12 dólares»

Dato de **reseña de terceros, no verificado en la fuente**: el reto cuenta *personas simuladas* con pausas entre acciones, y aprueba el mayor número que se sostiene 5 minutos con p95 < 500 ms, p99 < 1 s y errores < 1 % en 1 vCPU y 2 GB. Su primer lugar (≈ 310,000 usuarios, Rust con io_uring y SQLite, sin PostgreSQL ni Redis) **no se traslada a Carta**: aquello era leer un feed; Carta usa PostgreSQL con transacciones, escribe comandas y corre en Python (1.8–3.5 ms por sondeo). **Lo que sí se toma:** medir el tope como usuarios simulados sostenidos varios minutos. Por eso las tablas de abajo dan el tope también en **comensales simulados** (cada uno sondea cada 3 s: comensales ≈ 3 × peticiones/s), y el aprobado de la T-4.4 se define así (última sección).

### 1. ¿Cuál es el tope con lo que se paga hoy?

Hoy la API corre con **2 workers** (`WORKERS=2`), es decir, usa como mucho 2 núcleos aunque Railway permitiría más **[documento]**.

| | Restaurantes en pico a la vez | Comensales con la app abierta | Peticiones por segundo |
|---|---|---|---|
| **Tope «cómodo»** (respuestas rápidas: p95 ≤ 30 ms, el objetivo de 02 §10.2) | **≈ 5–7** | ≈ 600–850 | ≈ 240 |
| **Tope «con holgura»** (70 % de uso de CPU) | **≈ 10** | ≈ 1,200 | ≈ 420 |
| **Tope duro** (100 %: aparecen colas de segundos y errores 500) | **≈ 14** | ≈ 1,700 | ≈ 600 |

**[medida aquí]** el costo por petición y las curvas; **[estimada]** la traducción a restaurantes (140 ms de CPU por segundo por restaurante en pico = 0.14 núcleos). Si los comensales se reparten en más mesas con menos gente cada una la cifra baja; si el menú y las fotos los absorbe Cloudflare (ya lo hace), no cuentan aquí.

### 2. ¿Se puede pasar de 100 restaurantes? ¿Qué haría falta y cuánto costaría?

**Sí, con el mismo proveedor, sin Redis ni cambiar de arquitectura**, pero no con la configuración de hoy. Cien restaurantes *todos a la vez en pico* serían ≈ 4,000 peticiones por segundo; en la práctica no coinciden (cenan a horas distintas), pero se dimensiona para el pico.

| | Hoy sin cambios | Con las palancas 1–5 de abajo |
|---|---|---|
| Núcleos de pico para 100 restaurantes | ≈ 14 (≈ 20 con 70 % de holgura) | ≈ 5–6 (≈ 8 con holgura) |
| Qué hay que cambiar | `WORKERS` ≈ 20 y bajar el pool de conexiones por worker (Postgres de Railway admite ≈ 100 conexiones) | `WORKERS` ≈ 8, pool reducido, y cuatro cambios de código (palancas 2–5) |
| Costo mensual **[estimada]** (Railway: CPU 20 USD/vCPU-mes, RAM 10 USD/GB-mes, salida de red 0.05 USD/GB **[documento]**) | ≈ 180 USD | ≈ 90 USD |

Los 90 USD coinciden con lo que ya decía `06_Hosting.md` (60–90) **sólo con las palancas**; sin ellas la factura casi se duplica. Un detalle que 06 no contaba: cada `304` de sondeo sale con ≈ 580 bytes de cabeceras **[medida aquí]**; a 100 restaurantes son ≈ 1 TB al mes de salida de red (≈ 60 USD) sin palancas. Más allá de ~3 instancias de API (réplicas) sí haría falta Redis (disparador de 02 §11.3); con un solo servicio de muchos workers, no.

### 3. Tiempos de espera según qué tan lleno esté el servidor, y dónde se rompe primero

Tiempo que tarda el servidor en contestar un sondeo (no incluye la red del teléfono), con 2 workers y la mezcla realista (3 comensales por mesa). **[medida aquí]** donde dice «medido»; la columna «teoría» es una fila de cola sencilla (más abajo) que da el mejor caso.

| Uso de CPU | Peticiones/s | p50 | p95 | p99 | Lectura |
|---|---|---|---|---|---|
| 25 % (interpolado) | ≈ 150 | ≈ 3 ms | ≈ 15–25 ms | ≈ 40–60 ms | Sin sensación de espera |
| 50 % (medido: 300 rps) | ≈ 300 | 14 ms | **61 ms** | **106 ms** | Aún fluido; el objetivo de 30 ms ya no se cumple |
| 70 % (teoría ×3) | ≈ 420 | ≈ 25 ms | ≈ 100 ms | ≈ 150 ms | Cola visible pero tolerable |
| 85 % | ≈ 515 | cientos de ms | ≈ 0.7–1.5 s | ≈ 2 s | Los teléfonos reintentan y se amontonan |
| 95–100 % | ≈ 600 | segundos | ≈ 5 s | ≈ 6 s + errores 500 | Se cayó |

**La regla práctica:** hasta ~50 % de uso todo bien; entre 50 y 75 % la cola crece; **a partir de ~80 % se desploma** (en una prueba, pasar de 600 a 800 rps llevó el p95 de 63 ms a 730 ms). Por eso 70 % es el tope de diseño.

**Dónde se rompe primero, en orden:**

1. **La regla de Cloudflare de 300 peticiones por 10 s por IP** (`deploy/railway/README.md`). Un restaurante cuyos comensales usan el WiFi del local comparte *una* IP: 30 peticiones por segundo ÷ (1 sondeo / 3 s) = **90 teléfonos por IP** y empiezan los `429`, sin que el servidor esté cargado. **[estimada]**, no medida; se corrige en el panel de Cloudflare (palanca 0).
2. **El CPU de los workers**, a ≈ 6–10 restaurantes en pico con 2 workers (tabla anterior).
3. **Los workers no se reparten bien la carga** (conexiones persistentes pegadas a un worker): en una corrida un worker llegó a 81 % y el otro a 18 % **[medida aquí]**. Con el proxy de Railway delante puede pasar igual; se mide en la T-4.4.
4. **El pool de conexiones a la base:** ya saturado el CPU, las peticiones esperan una conexión 5 s y responden **500** (no 503; pendiente conocido de T-4.1). **[medida aquí]**
5. **No se rompe primero:** PostgreSQL (cada consulta del sondeo tarda 0.06 ms **[medida aquí]**), la memoria (≈ 160 MB por worker en reposo **[medida aquí]**) ni el menú (lo sirve Cloudflare; el origen cuesta 0.8 ms por petición **[medida aquí]**).

### 4. Cómo exprimir más el mismo servidor (ordenado por ganancia y costo)

| # | Palanca | Sube el tope | Costo / riesgo |
|---|---|---|---|
| 0 | Subir la regla de Cloudflare (p. ej. 1,500 por 10 s) o excluir `/api/v1/p/sesion` | evita cortar restaurantes grandes con WiFi propio | 5 min en el panel; sin riesgo |
| 1 | `WORKERS` 2 → 4 (y `DB_POOL_SIZE` 10 → 5, `DB_MAX_OVERFLOW` 10 → 5) | ×1.8–2 | Cero código; Railway cobra el CPU que se usa. Riesgo: más conexiones a Postgres |
| 2 | **Sondeo adaptativo**: 10 s cuando la mesa lleva 2 min sin cambios (02 §6 ya lo promete; el frontend no lo hace: `INTERVALO_SONDEO_MS = 3000` fijo) | ×1.5–2 (menos peticiones) | Una tarea pequeña de frontend; ver los cambios de otros tarda hasta 10 s |
| 3 | **Que el estado de la mesa dure en memoria más de 2 s** invalidándolo con `LISTEN/NOTIFY` de PostgreSQL (sin Redis) | ×1.5 (el sondeo sin cambios casi nunca toca la base) | Cambia el ADR-004/02 §6 («vida máxima 2 s»); código nuevo; una notificación perdida se acota con TTL de 10 s |
| 4 | Verificar la cookie de invitado una vez por token (caché acotada) y no parsear la IP en cada petición; registrar menos líneas de acceso de `304` | ×1.2–1.3 | Cambios locales; no toca documentos |
| 5 | Ruta ASGI «cruda» para `GET /p/sesion` (sin inyección de dependencias de FastAPI) | ×1.3–1.5 | Duplica algo de lógica; mantener el contrato OpenAPI |
| 6 | Menú desde Cloudflare / fotos desde R2 | ya hecho | — |
| 7 | VM más grande / réplicas | lineal | Réplicas multiplican límites de tasa y cachés por proceso; > 3 instancias pide Redis |

Las ganancias son **[estimadas]** a partir del perfil de CPU de esta tarea; combinadas (0–5) llevan el costo de un sondeo realista de 3.3 a ≈ 1.5–2 ms y reducen a la mitad el número de sondeos: **≈ 3–4 veces más restaurantes con los mismos núcleos**.

---

## Modelo detallado

### M1. Qué se modela

Una petición del camino caliente consume **tiempo de CPU del worker** (`s`, en milisegundos): uvicorn corre un solo hilo de Python por worker, así que cada worker es una *fila de un servidor* y `c` workers son `c` filas en paralelo. Las demás cosas (base, red, memoria) no limitan antes (§M5).

### M2. Fórmulas (recalcúlalas cambiando tres números: `s`, `c`, `λ`)

- **Capacidad:** `λ_max = 1000 · c / s` (peticiones/s con `s` en ms).
- **Utilización:** `ρ = λ · s / (1000 · c)`.
- **Tiempo de respuesta** (cola M/M/1 por worker, supuestos: llegadas al azar, tiempos de servicio variables, carga repartida por igual): `p50 ≈ 0.69·s/(1−ρ)`, `p95 ≈ 3.0·s/(1−ρ)`, `p99 ≈ 4.6·s/(1−ρ)`.
- **Restaurantes en pico:** `n ≈ λ / L`, donde `L = comensales/3 + 1.2 + 0.5 ≈ 41.7` peticiones/s por restaurante (02 §10.1), o por CPU: `0.14 núcleos` con `s = 3.3`.

Cómo leerlo en llano: cuando el uso (`ρ`) sube, el tiempo de espera crece como `1/(1−ρ)`: a 50 % la cola duplica el tiempo de servicio, a 90 % lo multiplica por 10, a 95 % por 20. El p99 siempre es ~1.5 veces el p95.

| ρ | λ (s=3.3, c=2) | p50 | p95 | p99 | λ (s=1.85, c=2) | p95 |
|---|---|---|---|---|---|---|
| 50 % | 303 | 4.6 ms | 19.8 | 30.4 | 541 | 11.1 |
| 70 % | 424 | 7.6 | 33.0 | 50.6 | 757 | 18.5 |
| 85 % | 515 | 15.2 | 66.0 | 101.2 | 919 | 37.0 |
| 95 % | 576 | 45.5 | 198 | 304 | 1,027 | 111 |

**Qué tan buena es la teoría.** Contra lo medido, M/M/1 es el *mejor caso*: a ρ ≈ 0.5 predice p95 ≈ 11 ms con `s = 1.85` y se midieron **63 ms**; a ρ ≈ 0.8 predice 25–35 ms y se midieron 730 ms. Las razones probables, no aisladas: carga desigual entre workers, pausas del recolector de basura y del registro, y el generador de carga (Node) al 60–80 % de su núcleo. **Para decidir se usa la columna medida**; la teoría sirve para saber cómo cambia el tope cuando cambia `s` o `c`.

### M3. Tiempos de servicio **[medida aquí]**

Método (§Mediciones): milisegundos de CPU de los workers por petición, de `/proc/<pid>/stat`.

| Camino | ms CPU de API por petición | Saturación con 2 workers |
|---|---|---|
| `GET /p/sesion` → `304`, **estado en memoria** (12 por mesa) | **1.8–2.0** | ≈ 1,020 rps |
| `GET /p/sesion` → `304`, **estado que hay que leer** (1 por mesa) | **2.5–3.6** | ≈ 700 rps |
| `GET /p/sesion` → `200` con cuerpo (1.7 KB) | 2.0–2.3 (memoria) / 2.7 (base) | ≈ 830 / 715 rps |
| Mezcla realista (3 por mesa, 93 % `304`, 5 % `200`, 2 % eventos) | **≈ 3.3** | ≈ 530–600 rps |
| `GET /p/menu/{slug}` (caché en proceso, `304` o `200`) | 0.65–0.9 | ≈ 2,700–3,100 rps |
| `POST /p/eventos` (1 evento, escritura) | 1.1–4.2 | ver abajo |
| `POST /p/sesion/entrar` (miembro nuevo) | 5.7–10 | ≈ 320 rps |

Notas que importan:

- **El `304` «gratis de memoria» es en parte un mito para mesas chicas.** El estado dura 2 s en memoria por worker. Con 3 comensales por mesa y sondeo de 3 s, ≈ 1/(1+2λ) de los sondeos (λ = sondeos por segundo de esa mesa en ese worker) encuentran la caché vencida y leen la base (3 consultas, 0.06 ms cada una en PostgreSQL; el costo está en Python/SQLAlchemy: +0.8–1.5 ms). Con mesas de 12 casi nunca; con 1–3, casi siempre.
- **`entrar` cuesta 3–5 sondeos**, pero llega a ~0.1 rps por restaurante: despreciable.
- **`eventos`:** el contador por teléfono (120/min) y el tope de 2 escrituras simultáneas por worker de `analitica.py` **descartan en silencio** lo que no cabe. En la corrida a 800 rps sólo se guardaron 16,611 de ≈ 50,000 eventos enviados en total. No es un fallo (el contrato lo permite), pero significa que **la analítica no es una cota de escritura de PostgreSQL**: la cota real de escrituras (confirmar comandas) se mide en la T-4.4.
- **Calibración a Railway:** el factor entre este Xeon a 2.1 GHz y un vCPU de Railway es desconocido; lo razonable es ×0.6–×1.5 sobre `s`. Por eso el margen de ±2×. Los vCPU de Railway son hilos compartidos de un host; la T-4.4 debe medir `s` ahí.

### M4. Qué cambia en la Fase 3 (Spec 001) **[estimada]**

| Cambio de la spec | Efecto en la carga |
|---|---|
| Sin cierre por inactividad ni pase de 6 h | Las sesiones se quedan abiertas hasta que el personal las cierra: más teléfonos «viejos» sondeando (hasta que el SO los duerme). Arriba el factor de 120 comensales por pico; la palanca 2 (sondeo adaptativo) pasa de «bueno» a **necesaria** |
| Estatus (verde/amarillo/rojo), recordatorio, «todo bien» | El personal ve una vista con más datos: cada `GET /op/mesas` calcula minutos sin acciones por mesa. Con 6 dispositivos / 5 s por restaurante son 1.2 rps: aun a 10 ms por petición son 12 ms/s por restaurante (< 10 % del total). Cuidar que la consulta de la vista del personal sea una sola |
| Solicitudes de entrada (5 por mesa, 10 min) | Un comensal «en espera» también sondea; ≈ +5 % de sondeos en el pico de aperturas. Ya pasan por el límite de tasa del comensal |
| Propina declarada, cuenta cerrada, pagada | Escrituras puntuales por comensal (1–3 más por visita): sin efecto en el modelo |
| Estados nuevos del ciclo en el ETag | Más invalidaciones del estado en memoria → peor tasa de aciertos de la caché de 2 s (§M3); otra razón para la palanca 3 |

### M5. Recursos por separado

| Recurso | Cota | Estado |
|---|---|---|
| CPU de workers | `1000·c/s` | **El límite.** Ver M2–M3 |
| Conexiones a PostgreSQL | `WORKERS × (DB_POOL_SIZE + DB_MAX_OVERFLOW)` = 2 × 20 = 40 hoy; Postgres de Railway ≈ 100 **[estimada]** (verificar `SHOW max_connections`) | Con `WORKERS` ≥ 5 sin tocar el pool se pasa de 100 y la API muere por «too many clients». Se baja el pool al subir los workers |
| PostgreSQL (CPU) | Consultas de 0.01–0.08 ms de ejecución **[medida aquí]** | Holgado: aun a 600 consultas/s sería < 5 % de un núcleo. Las escrituras de comanda faltan por medir |
| Memoria | ≈ 160 MB por worker en reposo **[medida aquí]**; hasta +360 MB si se llena la caché de 2,000 menús (02 notas de T-2.2) **[documento]** | 2 workers ≈ 0.4 GB; 8 workers ≈ 1.3–3 GB: dentro del plan |
| Salida de red | ≈ 580 B por `304`, 1.7 KB por `200` **[medida aquí]** | ≈ 0.5 TB/mes a 40 restaurantes sin palancas; pesa en la factura, no en el servidor |
| Cloudflare | Menú y fotos desde el borde; **los sondeos son `private, no-store`: Cloudflare no los absorbe** | La regla de 300/10 s por IP es la primera cota (arriba) |
| Límites de la propia API | 120/min por teléfono y 600/min por IP sin cookie (memoria de cada worker, N × con N workers) | Con `WORKERS=8` el límite efectivo es hasta 8 × el nominal **[documento]** |

### M6. Proveedor **[documento]** (páginas `docs.railway.com/reference/pricing/plans` y `.../scaling`, leídas el 13 de noviembre)

Hobby 5 USD/mes con 5 USD de uso incluidos; Pro 20 USD con 20 incluidos. Máximos por servicio incluyendo réplicas: Hobby 6 réplicas / 48 vCPU / 48 GB; Pro 42 réplicas / 1,000 vCPU. La página de escalado dice que con Pro cada réplica llega a 24 vCPU: las dos páginas no coinciden y no se aclara cuál manda. No encontré límites propios del Postgres de plantilla ni la cifra de `max_connections`. Conclusión: **el tope de hoy lo pone `WORKERS=2`, no el plan**.

---

## Mediciones locales y sus límites

**Montaje.** `uv run uvicorn app.main:app --workers 2` (build del frontend no necesario: sólo se miden rutas `/api`), fijado a los núcleos 0–1 con `taskset`; el generador de carga a otro núcleo (2); PostgreSQL 16 local en el cuarto núcleo (3). Base migrada y sembrada con `scripts/seed.py` («La Ceiba») + 2,500 mesas de prueba añadidas por SQL (`pruebas/carga/local/sembrar_mesas.sh`). Los límites de tasa propios se sortean **sin tocar el producto**: cada comensal tiene su cookie (límite por miembro: 1,200–3,600 miembros → hasta 2 rps cada uno) y las rutas sin cookie envían un `X-Forwarded-For` público distinto en cada petición (cubo de IP distinto). El generador es `pruebas/carga/local/medir.mjs` (Node, sin dependencias, llegadas de Poisson, latencia medida desde la hora programada para no esconder colas). Datos crudos: `2026-11-13-modelo-de-capacidad-datos.jsonl` (41 corridas).

**Resultados (resumen).**

| Escenario | Tasa | rps | p50 | p95 | p99 | CPU API ms/petición | Uso por worker |
|---|---|---|---|---|---|---|---|
| `sondeo304` memoria (12/mesa) | 200 | 198 | 1.5 | 9 | 14 | 1.93 | 23 / 15 % |
| | 400 | 392 | 1.8 | 31 | 78 | 1.96 | 58 / 18 % |
| | 600 | 598 | 1.6 | 64 | 169 | 1.76 | 45 / 60 % |
| | 800 | 821 | 18 | 732 | 1,252 | 2.00 | 82 / 82 % |
| | 1,000 | 1,018 | 30 | 1,626 | 2,634 | 1.77 | 90 / 90 % |
| | lazo cerrado 64 | 1,025 | 13.6 | 354 | 564 | 1.87 | 97 / 94 % |
| `sondeo304` base (1/mesa) | 400 | 400 | 8.8 | 73 | 398 | 3.44 | 75 / 63 % |
| | 600 | 608 | 44 | 781 | 1,549 | 2.74 | 82 / 85 % |
| | lazo cerrado | 762 | 61 | 266 | 409 | 2.51 | 94 / 97 % |
| `sondeo200` memoria | lazo cerrado | 827 | 23 | 372 | 598 | 2.27 | 93 / 94 % |
| Mezcla (3/mesa) | 300 | 301 | 13.6 | 61.5 | 106 | 3.29 | **81 / 18 %** |
| | 600 | 525 | 2,241 | 5,116 | 6,286 | 3.48 | 93 / 90 % + 226 errores 500 |
| `menu304` / `menu200` | lazo cerrado | 2,679 / 3,111 | 15 / 3 | 44 / 41 | 216 / 246 | 0.74 / 0.64 | 99 / 99 % |
| `eventos` | 100 | 100 | 6.8 | 10.9 | 13.7 | 4.2 | 18 / 24 % |
| `entrar` (nuevo) | 200 | 197 | 24 | 57 | 101 | 7.6 | 70 / 80 % |
| | lazo cerrado 32 | 318 | 94 | 201 | 314 | 6.2 | 99 / 98 % |

**Límites de la medición (dilo a quien use estos números):**

1. El generador, PostgreSQL y la API comparten un contenedor de 4 vCPU. Con el generador al 60–80 % de su núcleo, las latencias de la mitad alta de las curvas incluyen retraso del cliente; los ms de CPU por petición no.
2. El CPU de PostgreSQL por petición **no se midió con fiabilidad** (suma de los procesos `postgres`, que cambian durante la corrida; salieron valores negativos). Se sustituye por el tiempo de ejecución de las consultas (`EXPLAIN ANALYZE`, 0.01–0.08 ms).
3. Con pocas conexiones abiertas el núcleo reparte desigual entre workers (81/18 %); no es representativo del proxy de Railway, pero tampoco se puede descartar.
4. No hay red (loopback), ni TLS, ni Cloudflare, ni proxy de Railway.
5. Una sola base de 1,300–2,500 mesas y ≈ 7,000 miembros: más datos que un restaurante, menos que 100; las consultas son por índice y no cambian de orden.
6. No se midieron: las rutas del personal (`/op/*`, Fase 3), confirmar comanda, importación de PDF, ni la memoria con muchos menús.

### Perfil de CPU (cProfile, un worker, 120 rps de `304`) **[medida aquí; proporciones, no valores absolutos]**

Del total de una petición de sondeo: ≈ 15 % verificar el JWT (`PyJWT`), ≈ 10 % el límite de tasa (`ipaddress`, rangos de Cloudflare), ≈ 8 % emparejar la ruta de FastAPI, ≈ 12 % resolver dependencias, ≈ 4 % la línea de acceso JSON, ≈ 7 % `estado()`, y el resto (≈ 40 %) el armazón ASGI/middlewares/cabeceras de seguridad. Es la base de las palancas 4 y 5. Sin pruebas por palanca todavía: la T-4.4 las prueba una por una.

---

## Demostración formal y pruebas basadas en propiedades

**Qué partes se benefician.** El **ciclo de la mesa** de la Spec 001 (abierta → cuenta cerrada → pagada → mesa limpia, más solicitudes, relojes y reabrir) es una máquina de estados con muchas combinaciones y los invariantes del plan: una sola sesión viva por mesa (INV-1), una orden viva por miembro (INV-2), nada entra al menú sin confirmar (INV-9), consistencia entre restaurantes (INV-10), «ninguna comanda se pierde» y «lo que hay que cobrar nunca baja del consumo». Las pruebas de ejemplo (`pytest` actual) cubren los caminos que alguien pensó; lo que falla en una mesa real es la secuencia que nadie pensó (reintento tras cerrar la cuenta, dos meseros validando a la vez, un teléfono que reaparece). **No se benefician:** la capacidad (se mide, no se demuestra), la interfaz, ni nada que dependa del rendimiento de PostgreSQL o de Railway.

| Herramienta | Qué da | Costo | Cuándo |
|---|---|---|---|
| **Hypothesis con máquina de estados** (`RuleBasedStateMachine`) contra los servicios y la base de pruebas | Genera miles de secuencias de acciones (entrar, agregar, confirmar con reintento, cerrar cuenta, validar pago, limpiar, regenerar código, reloj) y comprueba los invariantes tras cada paso; reduce el fallo a la secuencia mínima | ≈ 2 días de una tarea; dependencia de desarrollo; < 2 min en la CI | **Recomendada.** Cuando exista el ciclo de la Fase 3 (T-3.x), como parte de T-4.9 o tarea propia |
| **TLA+ (modelo pequeño)** | Explora *todos* los entrelazados de unos pocos procesos: confirmar con `FOR UPDATE`, idempotencia, dos workers; prueba «ninguna comanda se pierde» en el modelo | 3–5 días (curva de aprendizaje) y el modelo puede divergir del código | Sólo si aparece un error de concurrencia que Hypothesis no encuentre |
| **Lean** | Demostración matemática de propiedades del modelo | Semanas, y no demuestra el código Python ni la base | No para v1 |

**Recomendación:** Hypothesis con estados (≈ 2 días). Es lo que el video logra a menor escala: «exprimir» el sistema buscando la secuencia que lo rompe.

## Usuarios simulados antes de la alfa (propuesta, sin construir)

**Tres capas, un mismo guion de personajes** (todo contra staging con restaurante de prueba, nunca producción):

1. **Carga (k6)** — perfiles con tiempos de espera humanos: *comensal tranquilo* (entra, mira, se queda sondeando 40 min, 3 acciones), *grupo ruidoso* (6 personas editando a la vez), *mesero* (PIN, sondea cada 5 s, atiende y marca servida), *dueño* (sube PDF grabado, confirma, edita). Se escalan por restaurante y se mide contra los SLOs de 02 §10.2.
2. **Navegador real (Playwright)** — 10–20 contextos simultáneos con iPhone y Android emulados: tres comensales en una mesa (escanean, ponen alias, filtran alérgenos, agregan, quitan, confirman, ven estatus), un mesero y un capitán (PIN, reciben la comanda, la atienden, validan el pago, limpian la mesa), y el dueño (alta de menú desde PDF, mesas, QR, personal). Casos adversos: sin red, recarga a medio flujo, cookie borrada, doble toque, dos teléfonos con el mismo alias, mesa llena, entrada cerrada.
3. **Agentes de QA exploratorios** — agentes con Playwright y una consigna de personaje («comensal con prisa», «mesero distraído», «dueño que no sabe de tecnología») que recorren la app sin guion rígido, anotan lo que les confunde o rompe y lo reportan como hallazgo con pasos, captura y gravedad. Con presupuesto de pasos, sólo staging, y revisión humana antes de convertir hallazgos en tareas.

**Se da por pasado si:** todos los recorridos de las capas 1 y 2 terminan; 0 comandas perdidas (consulta G1); 0 errores 5xx y SLOs en verde; sin errores de consola ni críticos de accesibilidad; los agentes QA no reportan nada grave abierto.

**Dónde encaja:** la capa 1 ya es la **T-4.4**. Las capas 2 y 3 son una **tarea nueva, T-4.10 «Usuarios simulados»** (depende de T-3.x y T-4.4; antes de T-4.7, el ensayo en restaurante real, para que éste no descubra lo que un script habría encontrado). Es propuesta: falta que Calvin la apruebe y entre al plan con `/especificar` o directamente en 04.

---

## Lo que la T-4.4 debe medir en staging para confirmar o corregir este modelo

**Definición de «aprobado» (a la manera del reto, con los objetivos propios de 02 §10.2):** el mayor número de **comensales simulados** (sondeo cada 3 s, acciones con pausas humanas, carga generada desde otra máquina) que se **sostiene al menos 5 minutos** (la prueba de sondeo de 02 §10.3 ya dura 10) con sondeo `304` p95 ≤ 30 ms y p99 ≤ 80 ms en el origen, lecturas con cuerpo p95 ≤ 150 ms, escrituras p95 ≤ 300 ms / p99 ≤ 800 ms y errores 5xx < 0.1 %. Ese número, en comensales y en restaurantes en pico (÷ 120), es el tope que se publica; con 70 % de CPU como margen de diseño.

1. **`s` real en Railway:** ms de CPU por petición de `GET /p/sesion` (`304` con y sin estado en memoria) y de la mezcla; confirma o corrige el factor ×0.6–×1.5.
2. **Cuántos vCPU recibe de verdad el servicio** con `WORKERS=2` y con 4; si el CPU es compartido o dedicado, y si el límite del plan aparece antes.
3. **El reparto entre workers** con el proxy de Railway delante: CPU por worker (no sólo del servicio).
4. **La curva de latencia p50/p95/p99 frente al uso** (50, 70, 85 %) y dónde está el desplome; contrastar con la columna «medida» de este informe.
5. **`SHOW max_connections`** del Postgres de Railway y el consumo de conexiones con `WORKERS` = 2, 4 y 8.
6. **La regla de 300/10 s de Cloudflare:** cuántos comensales por IP la disparan (prueba con muchos clientes desde una IP).
7. **Salida de red real** por `304` en el borde de Railway (bytes facturables) y el costo por hora de la prueba.
8. **Las rutas de la Fase 3:** `GET /op/mesas` con la vista de estatus, confirmar comanda con reintentos, cuenta/pago, solicitudes de entrada; las escrituras reales sobre PostgreSQL (la analítica descarta en silencio y no sirve de cota).
9. **La tasa real de aciertos de la caché de 2 s** de `estado` con mesas de 2–4 comensales y dos workers.
10. **`EXPLAIN ANALYZE`** de las consultas críticas con 10,000 platillos y 1,000 sesiones (ya en el brief).
11. **Memoria por worker** con el menú de muchos restaurantes en caché.
12. **El efecto de cada palanca (0–5)** una por una, antes y después.
