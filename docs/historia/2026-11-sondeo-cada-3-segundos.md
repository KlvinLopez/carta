# El sondeo cada 3 segundos (ADR-004, 2026-08-30 a 2026-11-13)

**Estado:** archivado. Sustituido por la entrega por eventos ([ADR-018](../mvp/adr/ADR-018-entrega-por-eventos.md), aceptado por Calvin el 13 de noviembre de 2026). **Dónde sigue vivo:** en producción corre el sondeo hasta que la Fase 3 construya los eventos (T-3.20 y T-3.21); después queda sólo como respaldo y modo degradado.

Marcas: **[medida]** en una sesión del repositorio · **[estimada]** con supuesto escrito en el documento citado · **[documento]** de un documento del repositorio. Aquí no se repiten las tablas: se apunta a ellas.

## Cómo funcionaba

Cada teléfono pedía el estado de la mesa cada 3 s (comensal) o 5 s (mesero) con `If-None-Match`; si nada cambió, el servidor contestaba `304` sin tocar la base. El ETag salía de `max(actualizado_en)` y se guardaba 2 s en la memoria de cada worker. Se eligió por sencillez y porque la red de un restaurante es irregular: sin WebSockets, sin Redis. Decisión original: [ADR-004](../mvp/adr/ADR-004-sondeo-vs-websockets.md).

## Lo que se midió

Todo está en [`docs/plan/perf/2026-11-13-modelo-de-capacidad.md`](../plan/perf/2026-11-13-modelo-de-capacidad.md) y [`2026-11-13-eventos-frente-a-sondeo.md`](../plan/perf/2026-11-13-eventos-frente-a-sondeo.md).

- **Costo por respuesta:** 1.8 a 3.5 ms de procesador por sondeo **[medida]**. La arquitectura (`02 §10.1`) suponía 0.4 ms **[documento]**: el tope real salió unas 4 a 5 veces menor.
- **Cuántos cabían:** con los 2 procesos de entonces, el tope cómodo era ≈ 1,200 a 1,600 comensales a la vez (10 a 13 restaurantes llenos) **[medida]**. En el simulador de uso, 148 restaurantes gratuitos típicos con 2 procesos y plan Hobby, frenados por el procesador **[estimada]** (`docs/informes/2026-11-13-planos-de-carta/datos/anuncios.json`).
- **Peticiones por visita:** ≈ 1,800 en una visita de 90 min **[estimada]**.
- **Factura:** lo que varía con el uso rondaba 140 USD al mes con 100 restaurantes y 680 con 500; lo fijo, ≈ 46 USD **[estimada, ±2×]**. Cada `304` salía con ≈ 580 bytes de cabeceras: a 100 restaurantes, ≈ 1 TB al mes de salida **[medida]**.
- **Un límite que no era de la API:** la regla de Cloudflare de 300 peticiones por 10 s por IP. Un restaurante con WiFi común comparte una IP: con 90 teléfonos empezaban los `429` sin que el servidor estuviera cargado **[documento]**.

## Por qué se pasó a eventos

Con eventos, el trabajo del servidor para 1,200 comensales baja de un núcleo entero a 0.23 y el cambio llega en 0.02 s en lugar de 1.5 s **[medida]**; el tope cómodo sube a ≈ 8,000 a 10,000 comensales **[medida]**. Calvin lo había pensado así desde el inicio y lo aceptó el 13 de noviembre. El nuevo muro es de Railway: ≈ 10,000 conexiones abiertas a la vez **[fuente externa, en el informe de eventos §6]**.

## Lecciones (qué no repetir)

1. **Medir antes de fijar un número en un documento.** El costo por sondeo estaba a un factor de 4 a 5 de la medición. Una cifra de capacidad sin medición es un supuesto: se rotula así.
2. **Contar los límites de afuera.** El primer tope fue la regla de Cloudflare, no el servidor. Al planear capacidad se listan los límites de cada pieza del camino.
3. **Estimar las peticiones por visita, no sólo por segundo.** 1,800 peticiones por visita a un restaurante no se ven en una prueba de un minuto.
4. **El estado en memoria por proceso no ve a los otros procesos.** Con varios workers, el ETag de 2 s hace que un recién llegado vea 401 en otro; hay que diseñar para N procesos desde el inicio.
5. **Un rango se queda rango.** El simulador y el modelo dan márgenes de ±2×; los informes los muestran así, no como un punto.
6. **Cuando la base de una decisión cambia, se escribe el ADR que la sustituye** y se archiva la anterior con fecha; no se borra.

## Dónde mirar

[ADR-004](../mvp/adr/ADR-004-sondeo-vs-websockets.md) · [ADR-018](../mvp/adr/ADR-018-entrega-por-eventos.md) · [modelo de capacidad](../plan/perf/2026-11-13-modelo-de-capacidad.md) · [eventos frente a sondeo](../plan/perf/2026-11-13-eventos-frente-a-sondeo.md) · informe v3 («Planos de Carta», 13 de noviembre; con la forma de hoy y con eventos), `docs/informes/2026-11-13-planos-de-carta.pdf`.
