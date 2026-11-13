#!/bin/bash
# Añade mesas de prueba a «la-ceiba» (base LOCAL ya sembrada con scripts/seed.py) y escribe sus
# códigos, uno por línea, en el archivo $1. Uso: sembrar_mesas.sh codigos.txt [cuántas=2500]
set -euo pipefail
export PGPASSWORD="${PGPASSWORD:-carta_dev_password}"
P=(psql -h "${PGHOST:-localhost}" -U "${PGUSER:-carta}" "${PGDATABASE:-carta_db}" -qtA)
"${P[@]}" -c "insert into mesa (restaurante_id, numero, codigo_publico, capacidad)
 select r.id, g, replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''), 12
 from restaurante r, generate_series(100, 99 + ${2:-2500}) g where r.slug='la-ceiba' on conflict do nothing"
"${P[@]}" -c "select codigo_publico from mesa m join restaurante r on r.id=m.restaurante_id
 where r.slug='la-ceiba' and numero>=100 order by numero" > "$1"
