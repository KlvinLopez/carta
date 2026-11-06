---
name: carga
description: Cómo correr las pruebas de carga de Carta con k6 contra staging (escenarios de 02 §10.3, registro en docs/plan/perf/). Úsala cuando el usuario diga "/carga", "prueba de carga", "corre k6" o antes de abrir el primer restaurante.
---

# /carga — k6 contra staging, nunca contra producción

> Fuente de verdad: [`docs/plan/05_Operacion.md`](../../../docs/plan/05_Operacion.md) §7 (procedimiento) y
> [`docs/plan/02_Arquitectura_v1.md`](../../../docs/plan/02_Arquitectura_v1.md) §10.3 (escenarios y objetivos). Esta skill no los duplica.
> Los escenarios (`pruebas/carga/*.js`) y `scripts/sembrar_carga.py` los crea **T-4.4**; mientras no existan, di que faltan y no los inventes aquí.

## Reglas

1. **Sólo contra staging** (`https://staging.carta.cooking`). Nunca contra `carta.cooking`: sembraría restaurantes falsos y gastaría cuota real. Si la `BASE` que te pasan no es staging, detente.
2. **No instales nada en los servidores** (ni k6 ni herramientas en Railway o en la VM). k6 corre en la máquina de quien lanza la prueba (o en un contenedor efímero local); el servidor sólo se mide por fuera.
3. Avisa a Calvin antes de correrla: 1,000 clientes durante 10 min pueden disparar CPU y alertas, y el límite de tasa de Cloudflare puede cortar la prueba.
4. Lo que siembre `sembrar_carga.py` va sólo a la base de staging; no toques restaurantes reales.

## Procedimiento (05 §7)

```bash
uv run python scripts/sembrar_carga.py --restaurantes 10 --mesas 40      # contra la base de staging
k6 run pruebas/carga/<escenario>.js -e BASE=https://staging.carta.cooking
```

Escenarios de 02 §10.3: ráfaga de escaneos, sondeo sostenido, confirmaciones (idempotencia), personal, mixto realista.

Registrar en `docs/plan/perf/AAAA-MM-DD.md`: p50/p95/p99, tasa de error, CPU y memoria de la VM (`docker stats`) y el commit probado. Si un objetivo falla, aplicar las palancas **en el orden de 02 §10.3** y repetir; **no se pasa a producción con un objetivo en rojo**.

## Cuándo repetirla

Antes del primer restaurante y cada vez que cambie algo del camino crítico (sesión, sondeo, confirmación, ETags, pool de conexiones).
