# Medición local del camino caliente (adelanto de T-4.4)

Sólo contra una API **local** (`uvicorn --workers 2` sobre una base sembrada con `scripts/seed.py`); nunca contra staging ni producción. Sin dependencias: Node 22.

1. `./sembrar_mesas.sh codigos.txt` añade mesas a «La Ceiba» y guarda sus códigos; `taskset -c 0,1 uv run uvicorn app.main:app --workers 2` levanta la API.
2. `node medir.mjs --codigos codigos.txt --padre <pid del uvicorn principal> --escenario sondeo304 --miembros 1200 --por-mesa 12 --tasa 500 --duracion 15` (escenarios: `sondeo304`, `sondeo200`, `menu304`, `menu200`, `eventos`, `entrar` o una mezcla `a=0.9,b=0.1`; `--tasa 0 --conc 64` = lazo cerrado).
3. Imprime una línea JSON (rps, p50/p95/p99, ms de CPU de la API por petición, utilización por worker). Método y resultados: `docs/plan/perf/2026-11-13-modelo-de-capacidad.md`.
4. Los códigos de mesa que guarda `sembrar_mesas.sh` (`codigos*.txt`) y sus archivos de miembros están en `.gitignore`: no los subas aunque sean locales.
