#!/bin/sh
# Respaldo de la base de Carta (05_Operacion §4): pg_dump -Fc → cifrado con age (llave pública)
# → R2 por rclone → poda de los respaldos viejos. Sale con código ≠ 0 si cualquier paso falla.
#
# Variables (todas por entorno; ningún archivo de credenciales):
#   DATABASE_URL         la misma de la API (acepta postgresql+asyncpg://, se normaliza)
#   RESPALDO_CLAVE_AGE   llave PÚBLICA de age (age1...); la privada vive fuera del servidor
#   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_PRIVADO
#   ENTORNO              prefijo en el bucket: respaldos/<ENTORNO>/<fecha>.dump.age
#   RESPALDO_DIAS        días que se conservan (30 por defecto; el bucket tiene además su ciclo de vida)
set -eu

for variable in DATABASE_URL RESPALDO_CLAVE_AGE R2_ENDPOINT R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_PRIVADO; do
  eval "valor=\${$variable:-}"
  if [ -z "$valor" ]; then
    echo "respaldo: falta la variable $variable" >&2
    exit 2
  fi
done
ENTORNO="${ENTORNO:-produccion}"
RESPALDO_DIAS="${RESPALDO_DIAS:-30}"

# pg_dump no entiende el driver de SQLAlchemy ni el esquema corto postgres://.
URL_PG="$(printf '%s' "$DATABASE_URL" | sed -e 's#^postgresql+asyncpg://#postgresql://#' -e 's#^postgres://#postgresql://#')"
FECHA="$(date -u +%Y-%m-%dT%H%M%SZ)"
ARCHIVO="${FECHA}.dump.age"
DESTINO="r2:${R2_BUCKET_PRIVADO}/respaldos/${ENTORNO}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

# rclone configurado sólo por variables de entorno (remoto `r2`), sin rclone.conf.
export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT"
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_ACL=private
export RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true

# 1. Volcado (en dos pasos, no en tubería: así el código de salida de pg_dump no se pierde).
echo "respaldo: volcando la base ($ENTORNO)"
pg_dump --format=custom --no-password --dbname="$URL_PG" --file="$TMP/base.dump"
if [ ! -s "$TMP/base.dump" ]; then
  echo "respaldo: el volcado salió vacío" >&2
  exit 1
fi

# 2. Cifrado con la llave pública: nadie en el servidor puede leer el archivo resultante.
age --recipient "$RESPALDO_CLAVE_AGE" --output "$TMP/$ARCHIVO" "$TMP/base.dump"
rm -f "$TMP/base.dump"
TAMANO="$(wc -c < "$TMP/$ARCHIVO" | tr -d ' ')"

# 3. Subida y verificación del tamaño remoto.
echo "respaldo: subiendo $ARCHIVO ($TAMANO bytes) a $DESTINO"
rclone copyto --retries 3 "$TMP/$ARCHIVO" "$DESTINO/$ARCHIVO"
REMOTO="$(rclone size --json "$DESTINO/$ARCHIVO" | sed -e 's/.*"bytes":\([0-9]*\).*/\1/')"
if [ "$REMOTO" != "$TAMANO" ]; then
  echo "respaldo: el tamaño remoto ($REMOTO) no coincide con el local ($TAMANO)" >&2
  exit 1
fi

# 4. Poda: se conservan RESPALDO_DIAS días.
echo "respaldo: podando respaldos de más de $RESPALDO_DIAS días en $DESTINO"
rclone delete --min-age "${RESPALDO_DIAS}d" "$DESTINO"

echo "respaldo: listo $DESTINO/$ARCHIVO"
