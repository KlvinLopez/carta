#!/usr/bin/env bash
# Crea una base NUEVA (nunca borra), aplica las migraciones y genera datos.
# Uso: correr.sh NOMBRE_BASE nrest visitas_mes meses ppm items eventos platillos
set -euo pipefail
DB=$1; NREST=$2; VIS=$3; MESES=$4; PPM=$5; ITEMS=$6; EV=$7; PLAT=$8
export PGPASSWORD=carta_dev_password
P="psql -h 127.0.0.1 -U carta -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "CREATE DATABASE $DB"
DATABASE_URL=postgresql+asyncpg://carta:carta_dev_password@127.0.0.1:5432/$DB uv run alembic upgrade head >/dev/null 2>&1
$P -d $DB -v nrest=$NREST -v visitas_mes=$VIS -v meses=$MESES -v ppm=$PPM -v items=$ITEMS -v eventos=$EV -v platillos=$PLAT \
   -f "$(dirname "$0")/2026-11-14-disco-e-historial-generador.sql" >/dev/null
$P -d $DB -c "VACUUM (ANALYZE)"
