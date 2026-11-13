# Prototipo desechable: entrega por eventos (SSE + `LISTEN/NOTIFY`)

Sólo para medir en **local** (informe: `docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md`). No es código del producto: no se monta en `app/main.py`, no toca `app/`, `frontend/src/` ni `migrations/`, y el disparador se crea a mano en la base local y se quita al terminar.

1. Base local sembrada (`scripts/seed.py`) y mesas de prueba: `../sembrar_mesas.sh ../codigos.txt 7000` (los códigos y las cachés de miembros, `codigos*`, están en `.gitignore`).
2. `psql … -f disparador.sql` (avisa `NOTIFY carta_mesa '<sesion_id>'` al cambiar una mesa).
3. `taskset -c 0,1 uv run uvicorn pruebas.carga.local.eventos.app_eventos:app --workers 2 --timeout-graceful-shutdown 5` (variables `CARTA_EV_LATIDO`, `CARTA_EV_VIDA`, `CARTA_EV_RETRY_MS`, `CARTA_EV_VIDA_ESTADO`; ver la cabecera de `app_eventos.py`).
4. `taskset -c 2 node conexiones.mjs --codigos ../codigos.txt --padre <pid de bin/uvicorn> --modo eventos --miembros 5000 --por-mesa 3 --eventos-min-mesa 1 --respaldo 60 --reposo 40 --carga 60` (o `--modo sondeo --intervalo 3` con los mismos comensales; `--serie --sostener 75` imprime cada segundo para matar o reiniciar workers a mano).
5. `psql … -f quitar_disparador.sql` al terminar.
