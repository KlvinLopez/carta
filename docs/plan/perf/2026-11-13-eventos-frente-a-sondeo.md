# Entrega por eventos frente a sondeo (medición local y borrador de ADR)

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/medicion-eventos-frente-a-sondeo` · **Estado:** prototipo desechable y mediciones **locales**. Nada se mandó a staging ni a producción. El ADR-004 sigue vigente hasta que Calvin decida.

Cada cifra lleva su marca. **[medida aquí]** es de esta sesión, en un contenedor de 4 vCPU con la API fijada a 2 núcleos. **[documento]** sale del repositorio. **[fuente externa]** sale de una página oficial leída el 13 de noviembre de 2026, con su enlace en §6. **[estimada]** es un cálculo con el supuesto escrito al lado. El margen de error de todo lo que se traduce a Railway es de **±2×**, como en el modelo de capacidad (`2026-11-13-modelo-de-capacidad.md`), hasta medirlo allá.

---

## Para Calvin (una página)

**¿Abarata?** Sí, y mucho. Con 1,200 comensales con la app abierta y la misma actividad en las mesas:

| | Hoy (preguntar cada 3 s) | Por eventos |
|---|---|---|
| Trabajo del servidor | 1 núcleo entero | **un quinto de núcleo** (0.23) |
| Tiempo hasta que el cambio aparece en el teléfono | 1.5 s típico, 2.8 s en el peor caso habitual | **0.02 s** típico, 0.03 s en el peor caso habitual (más la red del celular, unas décimas) |
| Peticiones de un comensal en una visita de 90 min | ≈ 1,800 | **≈ 165** |

Las tres filas están [medidas aquí], salvo la última, que es [estimada].

- **Capacidad.** Con los 2 workers de hoy, el tope cómodo pasa de **≈ 1,200–1,600 comensales** (10–13 restaurantes llenos a la vez) a **≈ 8,000–10,000** (70–80 restaurantes) [medida aquí]. Un límite nuevo aparece antes que el del procesador: Railway admite unas 10,000 conexiones abiertas a la vez [fuente externa].
- **Dinero** [estimada, ±2×]. Lo que varía de la factura a 100 restaurantes baja de ≈ 140 a ≈ 25 USD al mes, y a 500 restaurantes de ≈ 680 a ≈ 110. Lo fijo (Postgres y plan, ≈ 46 USD) no cambia.
- **Rapidez.** El comensal ve al instante lo que hacen los demás, y el mesero ve la comanda al instante, no hasta 5 s después.

**Qué se queda «por tiempo» y por qué:**

1. **Un latido cada 25 s.** Es un byte que el servidor manda para que Cloudflare y Railway no corten la línea por silencio. Cuesta casi nada: 5,000 teléfonos quietos usan el 4 % de un núcleo [medida aquí].
2. **Una pregunta de respaldo cada 60 s.** Por si un aviso se pierde (el teléfono cambió de red, el servidor se reinició). Hoy es la mitad del costo en reposo, y se puede espaciar a 2 min.
3. **Reconectar cada ~10 min.** Railway corta toda conexión a los 15 min [fuente externa], así que el servidor la cierra antes y el teléfono reconecta solo.
4. **Los contadores** (minutos en mesa, verde/amarillo/rojo, recordatorio de 30 min) **viven en el teléfono.** El servidor sólo manda la hora de la última acción.

**Riesgos** (todos medidos o leídos, y todos con remedio en el diseño):

1. **Al desplegar se caen todas las conexiones a la vez** y vuelven juntas. Con 5,000 teléfonos el servidor estuvo ≈ 9 s al 100 % [medida aquí]. Remedio: que cada teléfono espere un tiempo al azar antes de volver, y que no pida nada si ya estaba al día.
2. **Si el servidor pierde su escucha de la base**, avisar a todos de golpe lo saturó 13 s y dio un error [medida aquí]. Remedio: repartir esos avisos en 30 s.
3. **Un error del borde** (un 502 o un 524 durante un despliegue) **apaga la conexión del navegador para siempre** [fuente externa]. La app debe volver a abrirla ella misma.
4. **Con el teléfono bloqueado no llega nada**, ni hoy ni con eventos. Para el mesero, la única solución es la notificación push con la app instalada (alternativa D), y es otra decisión.
5. **Más piezas que hoy:** una escucha por worker, un canal por mesa y otro por restaurante, y el respaldo. Son dos tareas nuevas en la Fase 3.

**Recomendación: B, eventos por conexión abierta (SSE) con escucha de PostgreSQL y una pregunta de respaldo cada 60 s.** Se construye en dos pasos:

1. La escucha de la base, que por sí sola ya duplica la capacidad del sondeo de hoy [medida aquí].
2. La conexión de eventos.

Si la conexión falla, la app vuelve sola al sondeo según la fase de la mesa (A), así que nunca queda peor que hoy. Es la única opción que da a la vez lo que pides (que nadie pregunte entre eventos), 5–8 veces más capacidad y cambios al instante, sin Redis ni colas.

**Para el simulador** `docs/research/2026-11-13-simulador-de-uso.py`: sus cuatro parámetros de eventos están marcados `[PENDIENTE]` con valores conservadores. Estas cifras los sustituyen:

| Parámetro | Valor | Origen |
|---|---|---|
| `EV_LATIDO_MS` (con `EV_LATIDO_S` = 25) | **0.09** | [medida aquí] |
| `EV_AVISOS_MIN` | **0.7–1** de promedio, **2–3** en el pico al armar la orden | [estimada a partir del mapa de eventos, §1] |
| `EV_AVISO_MS` | **≈ 4.2**: el aviso más la lectura `200` que provoca, sin la escritura, que el simulador ya cuenta en `escrituras_rps` | [medida aquí: 16.5 ms por evento en una mesa de 3, §3.3] |
| `EV_RESPALDO_S` | **60** | [medida aquí] |

**Lo que te toca decidir:**

1. **Si se adopta B** antes de arrancar la Fase 3, con el ADR-018 de §7 y dos tareas nuevas, **o si nos quedamos con el sondeo por fase** (A): más simple, ≈ 3–5 veces más capacidad, pero los cambios tardan de 3 a 45 s según la fase.
2. **Si aceptas que quedan el latido y el respaldo** como lo único «por tiempo».
3. **Si quieres evaluar aparte** el push para el mesero con el teléfono bloqueado. Es la decisión que más cambia la experiencia del mesero, y ninguna de las otras opciones la resuelve.

---

## 1. Mapa de eventos del ciclo de la mesa

Hay dos canales:

- **El de la mesa** (`carta_mesa`, por `sesion_id`): lo escuchan los comensales de esa mesa.
- **El del restaurante** (`carta_restaurante`, por `restaurante_id`): lo escuchan el personal y el panel del dueño.

El aviso no lleva datos. Cada teléfono pide después su estado con su ETag, igual que hoy.

Las citas usan estas abreviaturas:

- **P** es `prototipo/js/`, con el número de línea aproximado.
- **S** es `docs/specs/001-ciclo-de-la-mesa/spec.md`.
- **PRD** es `docs/mvp/01_PRD.md`.

| Evento | Lo dispara | Debe enterarse | Canal | Pantalla del prototipo | Spec / PRD |
|---|---|---|---|---|---|
| Escanea y entra (la mesa pasa a abierta) | comensal | comensales y personal | mesa + restaurante | P `comensal-flow.jsx` `GroupSession` ~L233 | AC-29.1 |
| Pide entrar y espera (entrada cerrada, rojo 2 h, fuera de horario) | comensal | personal («Mesa 7 · 2 solicitudes») | restaurante | no aparece | AC-33.2, 33.8, 38.3 |
| Aprueba o rechaza la solicitud | personal | el solicitante | mesa (el solicitante escucha su solicitud) | no aparece | AC-33.3 |
| Cambia alias | comensal | comensales | mesa | no aparece | AC-31.9 |
| Agrega o quita un platillo | comensal | comensales (el prototipo muestra la orden ajena, ítem por ítem) | mesa | P `GroupSession` ~L349–392 | AC-29.2; PRD AC-02.3 sólo pide «armando/listo» (ver nota) |
| Marca su orden lista o la desmarca | comensal | comensales («n de 4 listos») y personal | mesa + restaurante | P `GroupSession` ~L244, ~L308 | AC-11.4, AC-12.x |
| Sale la comanda (todos listos) | sistema | personal (con sonido) y comensales | restaurante + mesa | P `GroupSession` ~L248–256 | AC-12.2 (≤ 5 s), AC-29.2 |
| El mesero la acepta y la manda a cocina | personal | comensales | mesa (+ restaurante para los demás meseros) | P `GroupSession` ~L329; P `mesero.jsx` `FLOW_META` ~L695 | AC-12.x |
| Comanda servida | personal | comensales | mesa + restaurante | P `comensal-flow.jsx` `OrderTracking` ~L425–443 | AC-29.2 |
| Llamada al mesero y su atención | comensal y luego personal | personal y luego comensal | restaurante y luego mesa | P `comensal-flow.jsx` ~L565; P `mesero.jsx` ~L782 | US-14 |
| Cuenta cerrada (por comensal; la mesa pasa a cerrada) | comensal o personal | personal y comensales | restaurante + mesa | P `comensal-flow.jsx` ~L548; P `mesero.jsx` ~L563 | AC-29.3, 29.4, 31.3 |
| Propina declarada o cambiada | comensal | personal | restaurante | P `checkout-v2.jsx` ~L97–122 | AC-37.5, 37.8 |
| «Ya pagué» | comensal | personal | restaurante | P `comensal-flow.jsx` `Checkout` ~L698 | AC-29.7 |
| Pago validado y mesa pagada | personal | comensal y personal | mesa + restaurante | P `mesero.jsx` ~L530, ~L698 | AC-29.8, 37.7 |
| Mesa limpia (la sesión termina) | personal | comensales («la mesa se cerró») y personal | mesa + restaurante | P `mesero.jsx` `limpiar` ~L343 | AC-29.9, 30.4 |
| Reabrir cuenta o mesa | personal | comensales y personal | mesa + restaurante | P `mesero.jsx` ~L335–343 | AC-29.11 |
| Correcciones (quitar, cancelar, pasar la cuenta) | personal | el comensal afectado | mesa | no aparece | AC-31.x |
| Cerrar o abrir la entrada; regenerar código | capitán o dueño | personal | restaurante | no aparece | AC-33.1, 33.5, 33.6 |
| «Todo bien» (cuenta como acción) | personal | personal (reinicia el estatus) | restaurante | P `capitan.jsx` «Salón en vivo» ~L143–160 | AC-30.7 |

**No son eventos, son relojes en el teléfono.** El servidor sólo entrega la hora de la última acción:

- Estatus verde (< 20 min), amarillo (20–40) y rojo (> 40): S AC-30.6.
- Recordatorio a los 30 min: AC-30.7.
- «min en mesa», «DEMORADA · n MIN» y los minutos de la alerta: P `mesero.jsx` ~L257, ~L354, ~L384, ~L771; P `capitan.jsx` ~L90, ~L284.
- Solicitudes vencidas a los 10 min: el teléfono las oculta por reloj, y el servidor las rechaza si llegan tarde.

**Nota para Calvin.** El prototipo deja ver la orden de otro comensal, ítem por ítem. El PRD sólo pide su estado (armando o listo) y el plan (02 §5) no lo resuelve. Si se ve ítem por ítem, cada platillo que alguien agrega es un evento para toda la mesa. Ya está contado abajo. Por SSE no cuesta más que «armando/listo». Por sondeo, sí invalida el ETag más a menudo.

**Cuántos eventos tiene una visita** [estimada] (90 min, 4 comensales):

| Tipo | Eventos |
|---|---|
| Entradas | 4 |
| Alias | 1–2 |
| Ítems | 16–20 |
| Listo o deshacer | 5 |
| 2–3 rondas × (enviada, aceptada, servida) | 6–9 |
| Llamadas | 2–4 |
| Cuentas, mesa cerrada y propina | 7 |
| «Ya pagué» | 2–4 |
| Validaciones, pagada y limpia | 6 |
| **Total** | **50–65 (60–75 con reintentos y correcciones)** |

Repartidos por fase: ≈ 30 al armar, ≈ 10 en la espera, ≈ 4 después de servir y ≈ 20 en la cuenta.

Eso da **≈ 0.7 eventos por minuto por mesa en promedio**, y ≈ 2 por minuto mientras se arma la orden. Las mediciones usan **1 por minuto por mesa** como promedio con margen y **3 por minuto** como pico de toda la sala armando a la vez.

---

## 2. Tabla comparativa

Todas las opciones se miden con la misma vara:

- 2 workers.
- Mesas de 3 comensales.
- El tope es el número de comensales con la app abierta al 70 % de los 2 núcleos (1,400 ms de CPU por segundo), como en el modelo de capacidad.
- 120 comensales = un restaurante lleno.

| | Hoy: sondeo 3 s | **A** · sondeo por fase | **B** · SSE + `LISTEN/NOTIFY` + respaldo 60 s | **C** · WebSockets | **D** · push del navegador (personal) |
|---|---|---|---|---|---|
| Peticiones por comensal por visita de 90 min | ≈ 1,800 [estimada: 5,400 s ÷ 3] | ≈ 680 [estimada: 25 min a 3 s, 25 min a 12 s, 40 min a 45 s, nada al pagar] | ≈ 165: 65 lecturas por aviso + 90 de respaldo + 9 reconexiones; los latidos son bytes, no peticiones [estimada] | ≈ 160 si el aviso pide el estado; ≈ 100 si el estado viaja por el socket [estimada] | no aplica al comensal; 1 envío por aviso al personal |
| CPU por comensal (ms por segundo) | **0.88** [medida aquí] (0.47 con memoria de 60 s invalidada por `NOTIFY` [medida aquí]) | ≈ 0.33 (≈ 0.18 con memoria de 60 s) [estimada: 680 lecturas × 2.6 ms o × 1.4 ms ÷ 5,400 s] | **0.13–0.17** a 1 evento/min/mesa; 0.37 a 3/min con memoria de 2 s [medida aquí] | ≈ B [estimada: mismo trabajo por aviso; el socket cuesta parecido] | ≈ 0 en el servidor: cifrar y mandar un POST por aviso [estimada] |
| **Tope de comensales con 2 workers** | **≈ 1,200–1,600** (10–13 restaurantes) [medida aquí, 1,600; documento, 1,200] | ≈ 4,200 (≈ 7,900 con memoria) [estimada] | **≈ 8,000–10,000** (70–80 restaurantes) [medida aquí: 10,000 a 1/min = 67–80 % de los 2 núcleos]; en un pico de toda la sala ≈ 3,700; **tope de conexiones de Railway ≈ 10,000** [fuente externa] | ≈ B; WebSockets están exentos del tope de 15 min de Railway [fuente externa] | no cambia la capacidad |
| Tiempo hasta ver el cambio, p50 / p95 (servidor) | 1.5 s / 2.8 s [medida aquí] | 3 s en las fases rápidas; 6 s / 11 s en la espera; 22 s / 43 s después de servir [estimada: llegada uniforme] | **21 ms / 32 ms** (1,200); 22 / 47 ms (5,000); 0.14 / 0.94 s (10,000 al 80 %) [medida aquí]; más la red del celular, ≈ 0.1–0.3 s [estimada] | ≈ B [estimada] | segundos, sin garantía [no documentado en las páginas leídas] |
| Costo variable al mes, 10 / 100 / 500 restaurantes (CPU + RAM + salida de red) | ≈ 14 / 140 / 680 USD | ≈ 8 / 52 / 260 USD | **≈ 5 / 22 / 110 USD** (a 500 hacen falta ≥ 6 réplicas por el tope de conexiones) | ≈ B | ≈ 0 (los servicios de push de los navegadores no cobran según lo leído; ninguna página oficial lo dice explícitamente) |
| Complejidad | ya hecho | 1 tarea pequeña de frontend; cambia 02 §6 | ADR-018, 2 tareas nuevas (oyente y rutas; cliente compartido), cambios en T-3.0, T-3.4–T-3.7 y T-4.4, 02 §6 y §10, 04_API_Spec, `deploy/` (regla de Cloudflare) | lo de B más un protocolo propio de mensajes, ping/pong y reconexión a mano (el navegador no reconecta solo) | llaves VAPID (secreto por variable de entorno), suscripciones en la base, permiso del usuario, worker de servicio |
| Riesgos | tope bajo; la regla de Cloudflare de 300 por 10 s por IP | latencia alta en la espera; la fase la decide el teléfono | tormenta al desplegar; búfer de Cloudflare; tope de 10,000 conexiones; un no-200 cierra el `EventSource` | Cloudflare reinicia servidores y corta WebSockets al publicar código [fuente externa]; más código propio | iPhone sólo con la app en la pantalla de inicio (iOS 16.4+); Safari revoca el permiso si un push no muestra notificación [fuente externa] |

**Cómo salen los dólares** [estimada, ±2×]. Se usan los precios de Railway del modelo de capacidad:

- CPU a 20 USD por vCPU-mes.
- RAM a 10 USD por GB-mes.
- Salida de red a 0.05 USD por GB.

El pico se toma como 20 % del mes. Cada restaurante en pico tiene 120 comensales. Los workers son `⌈vCPU de pico⌉` (al menos 2), con 0.17 GB cada uno.

La salida de red es ≈ 10 GB por restaurante al mes con el sondeo de hoy, porque el modelo de capacidad da ≈ 1 TB a 100 restaurantes. Se reduce en proporción a las peticiones. B suma la memoria de las conexiones: ≈ 25 KB cada una, sólo en el pico.

Lo fijo no está en la tabla y es igual en todas las opciones: Postgres ≈ 26 USD y el plan 20 USD. Hoy, a 100 restaurantes, sale ≈ 140 + 46 ≈ 186 USD, lo mismo que daba el modelo de capacidad (≈ 180).

**Por qué no C:** WebSockets cuestan lo mismo que B y no dan nada que B no dé. Tienen dos ventajas reales: están exentos del tope de 15 min de Railway, y un solo socket sirve para avisar y para mandar. A cambio hay que escribir a mano la reconexión, el latido y el protocolo, que `EventSource` ya trae. Además, Cloudflare corta WebSockets cuando publica código.

**Por qué D no es alternativa sino complemento:** es lo único que llega con la pantalla del mesero bloqueada o la app cerrada. No sirve para el comensal, que no instala la app.

---

## 3. Mediciones

### 3.1 Montaje

La medición usa la misma máquina y el mismo método que el modelo de capacidad (`pruebas/carga/local/README.md`):

- La API en los núcleos 0–1, el generador en el 2 y PostgreSQL 16 en el 3.
- La base es «La Ceiba» más 7,000 mesas de prueba.
- Mesas de 3 comensales, cada uno con su cookie real.
- El CPU de los workers se lee de `/proc`.

**El prototipo** está en `pruebas/carga/local/eventos/`. `app_eventos.py` envuelve la app real sin tocarla y le añade una ruta:

- `GET /api/v1/p/sesion/eventos` verifica la cookie con el mismo código del sondeo y lee el estado con `servicio.estado`.
- Al conectar manda `event: hola` con el ETag del miembro.
- Manda `event: cambio` con cada `NOTIFY`.
- Manda un latido `: l` cada 25 s.
- Cierra la conexión a los 10 min ± 20 %, con `retry: 3000`.

Cada worker tiene una conexión de `asyncpg` que escucha `carta_mesa` y `carta_restaurante`. El `NOTIFY` también invalida la memoria de estados de **todos** los workers. El disparador (`disparador.sql`) se creó a mano en la base local y se quitó al terminar.

El generador `conexiones.mjs` abre una conexión SSE por comensal. Al recibir `cambio` pide `GET /p/sesion` con su ETag, y cada 60 s pregunta de respaldo. Las escrituras son reales: `PATCH /p/miembro` con un alias nuevo, a una tasa de Poisson por mesa. La latencia se mide desde que sale la escritura. **La misma herramienta mide el sondeo** con `--modo sondeo`, con los mismos comensales y las mismas escrituras.

Datos crudos: `2026-11-13-eventos-frente-a-sondeo-datos.jsonl` (215 líneas).

### 3.2 Resultados por ventana [medida aquí]

| Modo | Comensales | Eventos/min/mesa | Memoria de estado | rps al servidor | CPU de la API (% de un núcleo) | ms CPU por comensal·s | Aviso p50 / p95 / p99 | **Visible** p50 / p95 / p99 |
|---|---|---|---|---|---|---|---|---|
| Sondeo 3 s | 1,200 | 0 | 2 s | 399 | 95 | 0.79 | — | — |
| Sondeo 3 s | 1,200 | 1 | 2 s | 407 | **106** | **0.88** | — | 1,505 / 2,842 / 2,994 ms |
| Sondeo 3 s | 1,200 | 1 | 60 s + `NOTIFY` | ≈ 407 | 57 | 0.47 | — | ≈ igual |
| Eventos | 1,200 | 0 | 2 s | 20 | 11.6 | 0.097 | — | — |
| Eventos | 1,200 | 1 | 2 s | 47 | **23.4** | **0.195** | 10.7 / 17.4 / 31.4 ms | **20.9 / 32.3 / 46.2 ms** |
| Eventos | 1,200 | 3 | 2 s | 99 | 44.9 | 0.374 | 10.2 / 16.9 / 23.7 ms | 19.0 / 29.6 / 39.7 ms |
| Eventos | 5,000 | 0 | 2 s | 83 | 42.6 | 0.085 | — | — |
| Eventos | 5,000 | 1 | 2 s | 191 | 83.2 | 0.166 | 11.5 / 28.1 / 98 ms | 22.3 / 47.3 / 138 ms |
| Eventos | 10,000 | 0 | 2 s | 166 | 75.4 | 0.075 | — | — |
| Eventos | 10,000 | 1 | 2 s | 386 | 160.7 (80 % de 2) | 0.161 | 79 / 659 / 1,147 ms | 140 / 940 / 1,549 ms |
| Eventos | 10,000 | 0 | 60 s + `NOTIFY` | 165 | 33.6 | 0.034 | — | — |
| Eventos | 10,000 | 1 | 60 s + `NOTIFY` | 391 | 133.1 (67 % de 2) | 0.133 | 38 / 283 / 655 ms | 73 / 465 / 903 ms |

«Visible» es el tiempo desde que sale la escritura hasta que cada comensal de esa mesa tiene el estado nuevo (`200`). Una vez abiertas, ninguna corrida tuvo reconexiones ni errores.

### 3.3 Costos unitarios de sostener la conexión [medida aquí]

| Concepto | Valor | Cómo |
|---|---|---|
| Abrir una conexión (cookie + estado + `hola`) | **4.0–4.35 ms de CPU** | 1,200, 5,000 y 10,000 aperturas. 5,000 en 12.8 s y 10,000 en 23.6 s, porque el generador abre 500 por segundo |
| Memoria por conexión abierta (proceso) | **≈ 20–26 KB** | RSS de los workers: +98 MB con 5,000 y +258 MB con 10,000. El búfer del núcleo de Linux no se pudo leer en este contenedor (`/proc/net/sockstat` da cifras sin sentido) [estimada: +4–10 KB por socket quieto] |
| CPU en reposo, sólo latidos (5,000 conexiones, latido de 25 s, sin respaldo) | **3.8 % de un núcleo** | Incluye las tareas de fondo de la app |
| Un latido | **≈ 0.09 ms** | Con latido de 5 s subió a 10.8 %: 70 ms/s ÷ 801 latidos/s más |
| Un evento entregado (mesa de 3) | **≈ 16.5 ms en total, ≈ 5.5 ms por comensal avisado** | Diferencia entre 1 y 3 eventos/min/mesa con 1,200: escritura, `NOTIFY` a 2 workers, 3 avisos y 3 lecturas `200` |
| Reconexión periódica (cada 10 min) | ≈ 7 ms/s por cada 1,000 conexiones [estimada a partir de los 4.2 ms] | 1.7 aperturas/s × 4.2 ms |
| Respaldo de 60 s | **la mitad o más del costo en reposo** | 10,000 con memoria de 2 s: 166 rps × 4.5 ms. Con memoria de 60 s: ×2.2 más barato |

**Punto de equilibrio** [estimada a partir de lo medido]. Un comensal que pregunta cada 3 s cuesta 0.88 ms/s. Avisarle un cambio cuesta ≈ 5.5 ms. Los eventos salen más baratos mientras la mesa tenga **menos de ≈ 9–10 eventos por minuto**. El ciclo real tiene 0.7 de promedio y ≈ 2 en el pico.

### 3.4 Los momentos malos [medida aquí, 5,000 conexiones, 1 evento/min/mesa, memoria de 60 s]

| Situación | Qué pasó | Lectura |
|---|---|---|
| **Muere un worker** (`kill -9`) | Cayeron 2,383 conexiones. Uvicorn levantó otro worker en ≈ 1 s y las 5,000 estaban de vuelta en ≈ 6 s, con los 2 núcleos al 90–97 % durante 2–3 s. Fallaron 3 escrituras y 1 lectura (las que estaban en ese worker). Un comensal que estuvo desconectado cuando su mesa cambió se puso al día con el `hola` (ETag distinto → lectura) | Aguanta. El `hola` con ETag hace que una reconexión cueste sólo la apertura |
| **Se cae la escucha de la base** (`pg_terminate_backend` de los `LISTEN`) | El oyente volvió en 1 s y, como el prototipo «avisa a todos», 5,000 teléfonos pidieron su estado de golpe. Los 2 núcleos estuvieron al **≈ 96 % durante ≈ 13 s**, con 1 error 500 y escrituras de p95 5 s | **Defecto de diseño, no del canal.** Al recuperar la escucha hay que repartir los avisos en ≈ 30 s o mandar el ETag para que sólo pregunte quien está atrasado |
| **Despliegue o reinicio completo** | Al recibir `SIGTERM`, uvicorn esperó todo el plazo de apagado (5 s): las SSE nunca terminan solas. El servidor nuevo estuvo listo a los 8.2 s. Las 5,000 reconectaron en ≈ 7 s con los **2 núcleos al ≈ 100 % durante ≈ 9 s** (5,000 × 4.2 ms ≈ 21 s de CPU). En esa ventana, visible p95 1.6 s y p99 4.1 s. El sondeo no tiene este pico: cada petición es independiente | **El riesgo más grande.** Con 10,000 serían ≈ 20 s al 100 % [estimada]. Remedios: azar de 0–20 s antes de reconectar tras un corte, y abaratar la apertura |
| **Notificación perdida** | No se provocó aislada. `NOTIFY` no se pierde mientras el oyente está conectado: se entrega al confirmar, en orden [fuente externa]. Se pierde sólo si el oyente está caído (caso anterior) o si el teléfono está desconectado | El `hola` con ETag y el respaldo de 60 s acotan el retraso: como mucho 60 s |
| **Teléfono bloqueado y de vuelta** | No se puede medir aquí (loopback, sin sistema operativo móvil) | Ver §6: la página puede congelarse o descartarse. Al volver, la app reconecta y pide su estado (hoy ya lo hace al volver a primer plano) |

### 3.5 Límites de esta medición

1. Todo corre en un contenedor: el generador, PostgreSQL y la API. No hay TLS, ni Cloudflare, ni proxy de Railway, ni red móvil. La latencia «visible» es la del servidor.
2. Con 2 workers sobre loopback el reparto fue desigual en algunas corridas (por ejemplo 21 % frente a 2 %). Las cifras por comensal no dependen de eso; el tope sí podría.
3. El generador (Node) usó 4–15 % de su núcleo. No limitó.
4. Las escrituras son cambios de alias. Una confirmación de comanda escribe más filas, pero el aviso cuesta lo mismo. La escritura en sí no se midió (T-4.4).
5. El canal del personal (`carta_restaurante`) no se midió, porque sus rutas son de la Fase 3. Son 6 dispositivos por restaurante frente a 120 comensales: < 5 % de las conexiones [estimada].
6. La CPU de PostgreSQL por `NOTIFY` no se aisló. En el modelo de capacidad sus consultas cuestan 0.01–0.08 ms; un `pg_notify` por escritura es de ese orden [estimada].
7. El tope de conexiones del contenedor no se topó: 20,000 descriptores por proceso. 10,000 conexiones usan 20,000 sockets en total (los dos extremos en la misma máquina). El tope de esta prueba lo puso el procesador a 10,000.

---

## 4. Lo que cambia en el diseño de B respecto al prototipo

Son lecciones del prototipo; van al ADR:

1. **El aviso lleva el ETag.** En `hola` ya lo lleva. Para `cambio` es opcional, porque costaría leer el estado una vez por mesa y worker, pero hace que una ola de avisos sólo pida a quien está atrasado.
2. **Reconexión con azar.** `retry` base de 3 s más 0–20 s al azar cuando el corte es masivo: un error de red o un 5xx en la app.
3. **La app recrea el `EventSource` si queda `CLOSED`.** Pasa ante un 502, un 524 o un 429. La regla está en WHATWG.
4. **Al recuperar el oyente, los avisos se reparten en 30 s.**
5. **La conexión dura 10 min ± 20 %:** por debajo de los 15 min de Railway. El latido de 25 s queda por debajo de los 125 s de Cloudflare, de los 5 min sin datos de Railway y de los «≈ 15 s» que sugiere WHATWG para proxies viejos. El latido sale mucho más barato que bajarlo a 15 s.
6. **`--timeout-graceful-shutdown` explícito** (≈ 3 s). En Railway, además, la gracia por defecto es 0 [fuente externa]: el contenedor viejo muere con `SIGKILL`.
7. **El `NOTIFY` va en la misma transacción que la escritura**, con un disparador de la migración o un `pg_notify` explícito en el servicio. Es mejor el disparador: ninguna escritura se olvida de avisar, y la invalidación se vuelve automática en todos los workers. Hoy `cache_estados.invalidar` es manual y sólo en el worker que escribió.
8. **Respaldo de 60 s, y al volver a primer plano.** La app pausa el respaldo en segundo plano, como hoy pausa el sondeo.

---

## 5. Comparación de lo que queda «por tiempo»

| | Hoy | B |
|---|---|---|
| Preguntas periódicas del comensal | 1 cada 3 s (20 por minuto) | 1 cada 60 s (1 por minuto), sólo de respaldo |
| Latido | — | 1 byte cada 25 s, del servidor al teléfono |
| Reconexión | — | 1 cada ~10 min |
| Contadores de minutos | en el servidor (vista del personal) | en el teléfono, con la hora de la última acción |

---

## 6. Fuentes externas (leídas el 13 de noviembre de 2026)

**Cloudflare**

- [Límites de conexión](https://developers.cloudflare.com/fundamentals/reference/connection-limits/) (actualizada el 22 oct 2026). De Cloudflare al origen:
  - Proxy Read Timeout: **125 s** (error 524; sólo Enterprise lo sube).
  - Proxy Write Timeout: 30 s.
  - Proxy Idle Timeout: 900 s.
  - Del cliente a Cloudflare, HTTP/2 inactivo: 400 s.
  - La página no dice si el Read Timeout cuenta entre lecturas en una respuesta que ya está fluyendo. Con un latido cada 25 s y el `hola` inmediato, las dos lecturas quedan cubiertas.
- [Error 524](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/) (23 jul 2026): «before the default 125 seconds Proxy Read Timeout».
- [Inspección del cuerpo de la respuesta](https://developers.cloudflare.com/rules/configuration-rules/response-body-inspection/) (7 oct 2026):
  - «When no enabled feature needs response content, Cloudflare can send data to the client as it arrives».
  - No hay que servir streaming como `text/html` ni `text/plain`.
  - El remedio es una Configuration Rule por ruta con «Response Body Buffering: None».
  - Las [Configuration Rules](https://developers.cloudflare.com/rules/configuration-rules/) existen en Free. No se confirmó que el valor «None» esté en Free: **se verifica en staging**.
  - Según la [página de compresión](https://developers.cloudflare.com/speed/optimization/content/compression/) (17 abr 2026), `text/event-stream` no está en la lista de tipos que se comprimen.
- [WebSockets](https://developers.cloudflare.com/network/websockets/) (14 ago 2026): disponibles en todos los planes. «When Cloudflare releases new code … we may restart servers, which terminates WebSockets connections».

**Railway**

- [Especificaciones y límites de la red pública](https://docs.railway.com/networking/public-networking/specs-and-limits.md):
  - «HTTP requests can run for up to **15 minutes** if data keeps transferring … otherwise closed after **5 minutes** with no data».
  - Los WebSockets están exentos.
  - Máximo **≈ 10,000 conexiones simultáneas** y ≈ 11,000 rps, «subject to change». En lo leído no se aclara si es por servicio o por dominio.
- [SSE frente a WebSockets](https://docs.railway.com/guides/sse-vs-websockets.md): latido al menos cada 5 min y reconectar antes de 15 min; «No special configuration is needed».
- [Respuestas en streaming](https://docs.railway.com/guides/streaming-ai-responses.md): si todo llega de golpe, revisar la compresión o poner `X-Accel-Buffering: no` (el prototipo lo manda).
- [Despliegues](https://docs.railway.com/deployments/reference.md) y [variables](https://docs.railway.com/variables/reference.md):
  - Al quedar en línea el despliegue nuevo, el viejo recibe `SIGTERM` y, «by default, … 0 seconds» antes del `SIGKILL`.
  - Se ajusta con `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` y `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS` (ambos 0 por defecto).

**Navegadores**

- [WHATWG HTML §9.2, Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html):
  - La reconexión inicial es «implementation-defined … a few seconds», con posible retroceso exponencial.
  - Un estado distinto de 200 o un `Content-Type` distinto de `text/event-stream` provoca **«fail the connection»**: queda `CLOSED` y no reintenta.
  - El navegador manda `Last-Event-ID` al reconectar.
  - Sugiere un comentario de latido «every 15 seconds or so» para proxies viejos.
  - Los navegadores móviles pueden delegar la conexión en un *push proxy*.
- [MDN `EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource): 6 conexiones por dominio sin HTTP/2 («Won't fix»); con HTTP/2, ≈ 100 flujos. El comensal llega por Cloudflare con HTTP/2 o HTTP/3, así que no le afecta.
- [MDN, uso de SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events): `retry` va en milisegundos y los comentarios evitan que la conexión caduque.
- [Chrome, Page Lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) (16 oct 2026):
  - Una página congelada no ejecuta tareas y una descartada se descarga.
  - Al congelar recomienda «close any open Web Socket connections».
  - No menciona `EventSource` ni un plazo.
- [Chrome, temporizadores en segundo plano](https://developer.chrome.com/blog/timer-throttling-in-chrome-88/): tras 5 min oculta, los temporizadores encadenados se revisan una vez por minuto. Afecta al respaldo y al sondeo de hoy por igual.
- **Safari de iPhone:** no encontré una página oficial de Apple ni de WebKit sobre red o `EventSource` en segundo plano o con la pantalla bloqueada. Hay un commit de WebKit ([b0259bf](https://github.com/WebKit/WebKit/commit/b0259bf3dba0415fb969fba15169c1ec7646917a), 11 ene 2024, «allows background WebContent processes to suspend immediately»), pero no es documentación. **Supuesto de trabajo:** en segundo plano la conexión muere, y al volver la app reconecta y pide su estado. Lo prueba Calvin en su iPhone (§7, verificación).

**Servidor y base**

- [Uvicorn, ajustes](https://uvicorn.dev/settings/) (uvicorn.org no respondió):
  - `--limit-concurrency` responde 503 a lo que sobra; con SSE cuenta cada conexión abierta, así que hay que dejarlo sin poner o muy alto.
  - `--backlog` 2048.
  - `--timeout-graceful-shutdown`: pasado el plazo, termina las peticiones.
- [PostgreSQL 16, NOTIFY](https://www.postgresql.org/docs/16/sql-notify.html) y [LISTEN](https://www.postgresql.org/docs/16/sql-listen.html):
  - El payload debe ser menor de 8,000 bytes.
  - La cola es de 8 GB.
  - Se entrega sólo al confirmar la transacción, en orden de confirmación, y se pliegan los iguales dentro de una transacción.
  - «first execute (and commit!) [LISTEN], then … inspect the database state»: por eso el `hola` lee el estado después de suscribirse.

**Push**

- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API): llega aunque la app no esté cargada; requiere un worker de servicio; el endpoint es secreto.
- [WebKit, Web Push en iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) (16 feb 2023): iOS 16.4+, sólo con la app «added to the Home Screen» y el permiso pedido tras un toque.
- [Apple](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers): un push invisible hace que Safari revoque el permiso.
- Ninguna de las páginas leídas habla de precio.

---

## 7. Borrador del ADR-018 (no está en `docs/mvp/adr/`; el ADR-004 sigue vigente)

> **ADR-018 — Entrega de cambios por eventos (SSE + `LISTEN/NOTIFY`) con sondeo de respaldo**
>
> **Estado:** propuesta · **Sustituye a:** ADR-004 · **Fecha:** (la de la aprobación)
>
> **Contexto.** El ADR-004 eligió el sondeo con ETag porque suponía 200 sesiones y que un `304` costaba microsegundos. Las mediciones locales del 13 de noviembre de 2026 dicen otra cosa:
> - Un sondeo cuesta 1.8–3.5 ms de CPU y es más del 90 % de las peticiones. Con 2 workers el tope es ≈ 1,200–1,600 comensales con la app abierta.
> - El cambio tarda en verse 1.5 s típico y 2.8 s en el peor caso habitual.
>
> La Spec 001 quita el cierre por inactividad: las sesiones viven más y los teléfonos abiertos sondean más tiempo. Calvin pide que los cambios lleguen por eventos y que entre eventos nadie pregunte. Siguen vigentes las reglas de no usar Redis ni colas, una imagen, N workers y Cloudflare delante de Railway.
>
> **Decisión.**
> 1. Cada cambio de una mesa emite `NOTIFY carta_mesa '<sesion_id>'`, y cada cambio que ve el personal emite `NOTIFY carta_restaurante '<restaurante_id>'`. Lo emite un disparador de la migración, en la misma transacción que la escritura, y el aviso nunca lleva datos.
> 2. Cada worker mantiene una conexión que escucha esos dos canales. Al recibir un aviso, invalida su memoria de estados y avisa a las conexiones abiertas de esa mesa o de ese restaurante. Con la invalidación en todos los workers, la memoria de estado pasa de 2 s a 60 s.
> 3. Rutas `GET /api/v1/p/sesion/eventos` (comensal, con su cookie) y `GET /api/v1/op/eventos` (personal, con la suya), de tipo `text/event-stream` con `Cache-Control: no-store, no-transform`:
>    - Al conectar mandan `event: hola` con el ETag vigente.
>    - Con cada aviso mandan `event: cambio`.
>    - Mandan un comentario de latido cada 25 s.
>    - Cierran a los 10 min ± 20 %, con `retry: 3000`.
>
>    El teléfono sigue pidiendo el estado con `GET /p/sesion` o `GET /op/mesas` y su ETag. El contrato de esas rutas no cambia.
> 4. **El sondeo queda como respaldo:**
>    - Una pregunta cada 60 s mientras la página está visible.
>    - Una al volver a primer plano o a la red.
>    - Si el canal no conecta en 3 intentos, la app vuelve al sondeo según la fase de la mesa: 3 s al armar y en la cuenta, 12 s en la espera, 45 s después de servir y nada al pagar.
> 5. **Reglas de resiliencia:**
>    - Reconexión con azar de 0–20 s tras un corte masivo.
>    - La app recrea el `EventSource` si queda `CLOSED`.
>    - Al recuperar la escucha, los avisos se reparten en 30 s.
>    - `--timeout-graceful-shutdown 3`.
>    - Una Configuration Rule de Cloudflare para la ruta de eventos si el borde guarda la respuesta en búfer.
>
> **Alternativas.**
> - (A) Sondeo por fase de la mesa: más simple, ≈ 3–5× de capacidad, pero cambios en 3–45 s. Queda como modo degradado.
> - (C) WebSockets: mismo costo que B, más código propio, y Cloudflare los corta al publicar.
> - (D) Push del navegador: no sustituye el canal. Es un complemento posible para el personal con la pantalla bloqueada, en una spec aparte.
> - Mantener el sondeo de 3 s con las palancas del modelo de capacidad: ≈ 2× con la misma memoria invalidada por `NOTIFY`, pero sigue lejos de B en capacidad y en rapidez.
>
> **Consecuencias.**
> - **Positivas:**
>   - ≈ 5–7× más comensales por núcleo [medida local].
>   - Cambios visibles en decenas de milisegundos en el servidor.
>   - ≈ 10× menos peticiones y salida de red.
>   - Invalidación de cachés coherente entre workers y réplicas: `NOTIFY` cruza procesos sin Redis.
> - **Negativas:**
>   - Conexiones largas: ≈ 25 KB cada una y un tope de ≈ 10,000 por servicio en Railway. Pasado ese tope hacen falta réplicas, que `NOTIFY` ya soporta.
>   - Pico de reconexión en cada despliegue (≈ 4 ms de CPU por conexión).
>   - Una escucha por worker que vigilar (`/ready` debe fallar si cae más de N s).
>   - Más código en el cliente: canal, respaldo y modo degradado.
>   - Una configuración más en Cloudflare.
> - El teléfono bloqueado sigue sin enterarse, igual que con el sondeo.
>
> **Verificación en staging antes de adoptarlo** (con el script del prototipo desde fuera de Railway o con k6; nunca en producción):
> 1. A través de Cloudflare, el `cambio` llega en ≤ 1 s, sin búfer, y una conexión aguanta 12 min con latidos de 25 s sin 524.
> 2. A través de Railway, una conexión se cierra sola a los 10 min ± 20 % y nunca la corta el proxy. Una sin latido muere a los 5 min, lo que confirma la regla.
> 3. Con 2,000 conexiones abiertas, un despliegue deja todo reconectado en ≤ 30 s, con 0 errores 5xx en las lecturas posteriores y CPU ≤ 85 %.
> 4. Con N conexiones (las que permita el plan) y 1 evento por minuto por mesa durante 10 min, el cambio es visible en p95 ≤ 1 s y la CPU queda ≤ 70 %.
> 5. Al matar la escucha de la base, la ola queda repartida (CPU ≤ 85 %, 0 errores 5xx) y ningún teléfono queda más de 60 s atrasado.
> 6. Con la ruta de eventos bloqueada (403 en Cloudflare), la app vuelve al sondeo por fase y la mesa funciona.
> 7. Calvin, en su iPhone, y un Android: bloquear el teléfono 5 min y volver deja la pantalla al día en ≤ 3 s. Un mesero con la app en primer plano oye la comanda en ≤ 1 s.

**Qué cambia en la Fase 3 si se adopta antes de arrancarla:**

| Tarea o documento | Cambio |
|---|---|
| T-3.0 (modelo, contrato y ADR-017) | Añade los disparadores `NOTIFY` a la migración (skill `/migracion`), las dos rutas de eventos en el contrato y el ADR-018 |
| **Nueva · T-3.20 — Canal de eventos (backend)** · Carril F o G · depende de T-3.0 | Oyente por worker con su recuperación repartida, rutas SSE del comensal y del personal, memoria de estado de 60 s, `/ready` con el oyente, pruebas con dos workers reales |
| **Nueva · T-3.21 — Cliente del canal (frontend)** · Carril H · depende del contrato | Un módulo compartido que haga lo siguiente: `EventSource` con `hola`/`cambio`, recrear si queda `CLOSED`, azar al reconectar, respaldo de 60 s, modo degradado por fase y pausa en segundo plano. Sustituye el sondeo fijo de `comensal/entrada` (T-2.4) |
| T-3.4 y T-3.6 | `GET /op/mesas` se queda. El sondeo de 5 s del personal pasa a «al aviso» y la alerta sonora sale del aviso |
| T-3.5, T-3.7, T-3.12, T-3.15, T-3.16 | Usan T-3.21. Los relojes (estatus, recordatorio y minutos) se calculan en el teléfono, que ya era el plan de T-3.12 |
| T-3.8 | Nada propio: el disparador avisa por cualquier escritura |
| T-4.4 (carga) | Escenarios de conexiones sostenidas, de despliegue y de pérdida del oyente (§7, verificación) |
| Documentos | Hay que cambiar estos documentos: 02 §6 (tiempo real), §10 (capacidad) y §11.3 (cuándo hace falta Redis); 04_API_Spec (dos rutas); `deploy/README.md` y `deploy/railway/README.md` (regla de Cloudflare, `--timeout-graceful-shutdown`); y el ADR-004, que queda sustituido |

La Fase 3 pasaría de 17 a 19 tareas. A cambio, la palanca 2 del modelo de capacidad (sondeo adaptativo) se vuelve innecesaria y la palanca 3 queda incluida.
