# ADR-018 — Los cambios llegan por eventos (SSE + `LISTEN/NOTIFY`); el sondeo queda de respaldo

**Estado:** aceptada (Calvin, 2026-11-13) · **Fecha:** 2026-11-13 · **Sustituye a:** [ADR-004](ADR-004-sondeo-vs-websockets.md) · **Complementa:** [ADR-016](ADR-016-service-worker-red-primero.md) (el menú sigue igual) · **Tareas:** T-3.0 (disparador), T-3.20 (servidor), T-3.21 (teléfono), T-3.4 (canal del personal), T-4.4 (carga) · **Evidencia:** [`docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md`](../../plan/perf/2026-11-13-eventos-frente-a-sondeo.md) (en adelante, «el informe»)

> Cada cifra lleva su origen: **[medida local]** es del informe (§3), en un contenedor de 4 vCPU con la API en 2 núcleos, sin Cloudflare ni Railway; **[fuente externa]** es una página oficial leída el 13 de noviembre de 2026 y citada en el informe §6; **[supuesto]** es juicio y se verifica en la tarea que lo construye. Nada de lo de abajo se ha medido todavía en staging.

## Contexto

El ADR-004 eligió el sondeo con ETag suponiendo 200 sesiones y que un `304` costaba microsegundos. Las mediciones locales del 13 de noviembre dicen otra cosa:

- Preguntar cada 3 s cuesta 0.88 ms de CPU por comensal y segundo; con 2 workers el tope cómodo es ≈ 1,200–1,600 comensales con la app abierta (10–13 restaurantes llenos) [medida local, informe §3.2 y modelo de capacidad].
- Un cambio tarda en verse 1.5 s típico (p50) y 2.8 s en el peor caso habitual (p95) [medida local].
- La Spec 001 quita el cierre por inactividad: las sesiones viven más y los teléfonos abiertos preguntan más tiempo.

Calvin decidió el 13 de noviembre adoptar la entrega por eventos **antes de arrancar la Fase 3**: «quiero que sea así, porque así va a ser escalable; como lo tenemos es funcional, pero no es escalable». Siguen vigentes: sin Redis ni colas, una imagen, N workers, Cloudflare delante de Railway (ADR-012, ADR-015).

## Decisión

1. **El aviso nace en la base.** Un disparador de la migración de T-3.0 emite, en la misma transacción que la escritura, `NOTIFY carta_mesa '<sesion_id>'` por cada cambio que ve una mesa y `NOTIFY carta_restaurante '<restaurante_id>'` por cada cambio que ve el personal. El aviso no lleva datos del negocio. PostgreSQL lo entrega sólo al confirmar, en orden, y pliega los iguales de una transacción [fuente externa: PostgreSQL 16, `NOTIFY`]; ninguna escritura puede olvidarse de avisar.
2. **Una escucha por worker.** Cada worker mantiene una conexión que hace `LISTEN` en los dos canales. Al recibir un aviso invalida su memoria de estados y avisa a las líneas abiertas de esa mesa o de ese restaurante. Como todos los workers (y réplicas) invalidan, la memoria de estado pasa de 2 s a 60 s.
3. **Dos rutas de eventos** (`text/event-stream`, `Cache-Control: no-store, no-transform`, `X-Accel-Buffering: no`): `GET /api/v1/p/sesion/eventos` (comensal, con su cookie) y `GET /api/v1/op/eventos` (personal, con la suya).
   - Al conectar mandan `event: hola` con la versión vigente del estado de quien escucha (su ETag), **después** de suscribirse (así lo pide la documentación de `LISTEN` [fuente externa]).
   - Con cada aviso mandan `event: cambio`.
   - El teléfono sigue pidiendo su estado con `GET /p/sesion` o `GET /op/mesas` y su ETag; el contrato de esas rutas no cambia. Sólo pide si la versión que le llegó no es la suya.
4. **Lo que queda «por tiempo» es lo mínimo, y se guía por la actividad** (decisión de Calvin, punto 3):
   1. **Latido sólo tras silencio.** Cualquier mensaje por la línea (`hola`, `cambio` o latido) reinicia el temporizador; sólo hay latido tras 25 s sin ningún mensaje. Una mesa con actividad no recibe latidos.
   2. **El latido lleva la versión vigente del estado** (`event: latido` con el ETag de quien escucha) **si la medición lo confirma.** Con eso el teléfono detecta que se quedó atrás sin preguntar, y la pregunta fija de respaldo cada 60 s no hace falta mientras la línea está viva: queda sólo al reconectar, al volver a primer plano o si la línea cae. **Regla de decisión (T-3.20 y T-3.21):** se mide la CPU en reposo con 5,000 líneas en dos variantes, (a) latido con versión y sin respaldo, (b) latido de un byte con respaldo de 60 s; se adopta (a) si su CPU es igual o menor que la de (b) y ningún teléfono queda más de 60 s atrasado al tumbar la escucha de la base (verificación 5). Si no, se queda (b). No se afirma la ganancia antes de medirla: el informe sólo midió (b) (latido ≈ 0.09 ms, respaldo ≈ la mitad o más del costo en reposo [medida local, §3.3]).
   3. **Reconexión cada ~10 min.** Cada línea se cierra a los 10 min ± 20 % con `retry: 3000`, y el teléfono reconecta solo. Esto no se puede guiar por la actividad: Railway corta toda petición HTTP a los 15 min aunque fluyan datos [fuente externa]. Lo que sí se hace es que la reconexión sea barata: el `hola` lleva la versión, y un teléfono al día no pide nada.
   4. **Los relojes del ciclo viven en el teléfono.** Minutos en mesa, estatus verde, amarillo y rojo, recordatorio de 30 min y solicitudes vencidas se calculan en el teléfono con la hora de la última acción que entrega el servidor (AC-30.6, 30.7). El servidor no manda avisos por tiempo.
5. **Para qué sirven el latido y la reconexión, en llano.** No comprueban que la persona siga en la mesa (eso lo valida el personal al llevar el ciclo, Spec 001). Existen porque entre el teléfono y el servidor hay intermediarios que cortan en silencio una línea que no habla o que dura demasiado: Cloudflare corta a los 125 s sin datos del origen (error 524) [fuente externa: Cloudflare, límites de conexión]; Railway cierra a los 5 min sin datos y a los 15 min en todo caso [fuente externa: Railway, red pública]; WHATWG sugiere un comentario cada ≈ 15 s para proxies viejos y las redes móviles pueden delegar la conexión [fuente externa: WHATWG §9.2]. Sin latido, una mesa tranquila perdería la línea sin enterarse y dejaría de recibir avisos.
6. **El sondeo queda de respaldo y como modo degradado:**
   - Una pregunta al volver a primer plano o a la red, y al reconectar si la versión no coincide.
   - Mientras la línea está viva, como mucho una pregunta cada 60 s sin aviso (o ninguna, si se adopta 4.2).
   - **Modo degradado:** si la línea no conecta en 3 intentos, o el navegador la deja `CLOSED`, la app pasa a preguntar según la fase de la mesa: **3 s** al armar la orden y con la cuenta cerrada, **12 s** esperando la comanda, **45 s** después de servida y, con su cuenta pagada, sólo al volver a primer plano; el personal, cada **5 s**. Sigue intentando abrir la línea cada 60 s y vuelve a ella en cuanto conecta. Los intervalos son los de la opción A del informe (§2) [supuesto: el reparto por fase no se midió].
7. **Con el teléfono bloqueado o la app en segundo plano no llega nada, y está bien** (decisión de Calvin, punto 2). La app cierra la línea al ocultarse y, al volver, reconecta y se pone al día con el último estado (AC-30.3: el comensal no sale de la mesa por eso). El push para el mesero con la pantalla bloqueada **no entra ahora**; queda como posible spec futura (opción D del informe).
8. **Reglas de resiliencia:**
   - Tras un corte masivo (error de red o 5xx), el teléfono espera 0–20 s al azar antes de reconectar. Al desplegar, 5,000 líneas reconectando juntas tuvieron los 2 núcleos al ≈ 100 % ≈ 9 s [medida local, §3.4].
   - La app recrea el `EventSource` si queda `CLOSED`: un 502, 524 o 429 del borde lo cierra para siempre según WHATWG [fuente externa].
   - Al recuperar la escucha de la base, el worker reparte los avisos a sus líneas en ≈ 30 s en lugar de avisar a todas de golpe (avisar a 5,000 de golpe saturó los 2 núcleos ≈ 13 s y dio un 500 [medida local]).
   - `/ready` responde 503 si la escucha de un worker lleva caída más de 15 s [supuesto; T-3.20 lo ajusta con la medición].
   - Uvicorn con `--timeout-graceful-shutdown 3` (las líneas no terminan solas y uvicorn esperaba todo el plazo [medida local]); en Railway la gracia por defecto es 0 s [fuente externa].
   - `--limit-concurrency` no se fija (contaría cada línea abierta) [fuente externa: uvicorn].
   - Una *Configuration Rule* de Cloudflare con «Response Body Buffering: None» para las rutas de eventos si el borde guarda la respuesta en búfer; no se confirmó que exista en el plan gratuito [fuente externa] y se comprueba en staging.
9. **Excepciones explícitas** (siguen preguntando, con la misma lógica de respaldo):
   - **El panel del dueño** (`/admin/pedidos`, T-3.7) usa el modo degradado del personal (5 s): `EventSource` no puede mandar la cabecera `Authorization` del operador y el panel lo abren pocas personas por restaurante [supuesto: 1–2 dispositivos]. Si el costo medido en T-4.4 lo pide, se abre una ruta de eventos del operador con otra forma de autenticación en un ADR nuevo.
   - **La importación del PDF** sigue preguntando cada 3 s mientras el operador espera (T-1.11): es una espera corta de una sola persona.
   - **El menú** se sigue pidiendo cada 25 s mientras se ve (ADR-016): es público y cacheable en el borde; un aviso lo sacaría del borde.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Sondeo de 3 s con las palancas del modelo de capacidad (memoria invalidada por `NOTIFY`) | ≈ 2× de capacidad [medida local: 0.47 frente a 0.88 ms por comensal y segundo], pero sigue lejos de los eventos en capacidad y en rapidez, y cada teléfono sigue preguntando 20 veces por minuto |
| (A) Sondeo por fase de la mesa | Más simple, ≈ 3–5× de capacidad [estimada en el informe], pero los cambios tardan de 3 a 45 s según la fase y la fase la decide el teléfono. Queda como modo degradado |
| (C) WebSockets | Mismo costo que SSE [estimada], exentos del tope de 15 min de Railway [fuente externa], pero hay que escribir a mano reconexión, latido y protocolo, que `EventSource` ya trae, y Cloudflare los corta al publicar código [fuente externa] |
| (D) Push del navegador | No sustituye el canal: no sirve al comensal (no instala la app) y en iPhone exige la app en la pantalla de inicio (iOS 16.4+) [fuente externa]. Es complemento posible para el mesero con la pantalla bloqueada, en una spec aparte |
| Redis o un broker para repartir avisos | Prohibido por la regla dura de `CLAUDE.md` («sin Redis, colas ni Kubernetes»); `NOTIFY` cruza workers y réplicas sin pieza nueva |

## Consecuencias

- **Positivas** (todas [medida local] salvo donde se dice):
  - ≈ 5–7× más comensales por núcleo: el tope con 2 workers pasa de ≈ 1,200–1,600 a ≈ 8,000–10,000 comensales con la app abierta a 1 evento por minuto por mesa.
  - El cambio se ve en el servidor en 21 ms p50 y 32 ms p95 con 1,200 comensales, más la red del celular (≈ 0.1–0.3 s [estimada]).
  - ≈ 10× menos peticiones: ≈ 165 por comensal en una visita de 90 min frente a ≈ 1,800 [estimada en el informe §2].
  - La invalidación de la memoria de estados es coherente entre workers y réplicas; deja de depender de llamar a mano a `cache_estados.invalidar`.
- **Negativas:**
  - Conexiones largas: ≈ 20–26 KB cada una [medida local] y un tope de ≈ 10,000 conexiones simultáneas en Railway [fuente externa; no se aclara si por servicio o por dominio]. Pasado ese tope hacen falta réplicas, que `NOTIFY` ya soporta.
  - Un pico de reconexión en cada despliegue (≈ 4.2 ms de CPU por línea [medida local]); lo acotan el azar y el `hola` con versión.
  - Una escucha por worker que vigilar, más código en el teléfono (canal, respaldo, modo degradado) y una regla más en Cloudflare.
  - El teléfono bloqueado sigue sin enterarse, igual que con el sondeo.
- **Lo que vuelve innecesario:** la palanca 2 del modelo de capacidad (sondeo adaptativo) y el sondeo de 5 s del personal; la palanca 3 (memoria invalidada por `NOTIFY`) queda incluida.

## Verificación

**En las tareas** (pruebas automáticas): el aviso llega a una línea abierta en **otro** worker (uvicorn con dos workers reales); el `hola` trae la versión vigente; un mensaje reinicia el temporizador del latido; la línea se cierra sola entre 8 y 12 min; con la ruta de eventos respondiendo 403 la app pasa al modo degradado y la mesa funciona; al ocultar la página no queda línea abierta ni preguntas. Criterios AC-40.1–AC-40.9 de [`01_Alcance_v1.md` §6](../../plan/01_Alcance_v1.md).

**En staging, antes de darlo por bueno** (con el generador del informe desde fuera de Railway o con k6; nunca en producción; T-3.20, T-3.21 y T-4.4, registro en `docs/plan/perf/`):

1. **Búfer del borde de Cloudflare:** a través de Cloudflare, el `cambio` llega en ≤ 1 s, sin búfer, y una línea aguanta 12 min con latidos de 25 s sin 524. Si llega en bloque, se aplica la *Configuration Rule* y se repite.
2. **Corte de 15 min de Railway:** una línea se cierra sola a los 10 min ± 20 % y nunca la corta el proxy; una sin latido muere a los 5 min, lo que confirma la regla.
3. **Gracia de despliegue:** con 2,000 líneas abiertas, un despliegue deja todo reconectado en ≤ 30 s, con 0 errores 5xx en las lecturas posteriores y CPU ≤ 85 %.
4. **Carga sostenida:** con las líneas que permita el plan y 1 evento por minuto por mesa durante 10 min, el cambio se ve en p95 ≤ 1 s y la CPU queda ≤ 70 %.
5. **Pérdida de la escucha:** al matar la escucha de la base, la ola queda repartida (CPU ≤ 85 %, 0 errores 5xx) y ningún teléfono queda más de 60 s atrasado.
6. **Modo degradado:** con la ruta de eventos bloqueada (403 en Cloudflare), la app vuelve al sondeo por fase y la mesa funciona.
7. **iPhone en segundo plano:** Calvin en su iPhone y un Android: bloquear el teléfono 5 min y volver deja la pantalla al día en ≤ 3 s; un mesero con la app en primer plano oye la comanda en ≤ 1 s. No hay documentación oficial de Apple sobre `EventSource` en segundo plano [informe §6]: el supuesto de trabajo es que la línea muere y la app reconecta al volver.

Si alguna falla y no tiene remedio en el diseño, la app se queda en el modo degradado (que nunca es peor que el sondeo de hoy) y se escribe un ADR nuevo.
