#!/bin/sh
# Respaldo de la base de Carta (05_Operacion §4): pg_dump -Fc → cifrado con age (llave pública)
# → R2 por rclone → poda de los respaldos viejos. Sale con código ≠ 0 si cualquier paso falla.
#
# Variables (todas por entorno; ningún archivo de credenciales):
#   DATABASE_URL         la misma de la API (acepta postgresql+asyncpg://; `?ssl=require` de asyncpg
#                        se traduce a `sslmode=require` de libpq). La contraseña viaja por PGPASSWORD,
#                        nunca en la línea de comandos (sería visible en /proc/<pid>/cmdline).
#   RESPALDO_CLAVE_AGE   llave PÚBLICA de age (age1...); la privada vive fuera del servidor
#   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_PRIVADO
#   ENTORNO              staging | produccion: prefijo en el bucket, respaldos/<ENTORNO>/<fecha>.dump.age
#   RESPALDO_DIAS        entero ≥ 1, días que se conservan (30 por defecto; el bucket tiene además
#                        su ciclo de vida). Con 0 la poda borraría el respaldo recién subido.
set -eu
# busybox ash lo soporta; dash no (y aquí no hay tuberías críticas). Se prueba en un subshell:
# un `set` que falla es un error de builtin especial y abortaría el script aunque lleve `|| true`.
if (set -o pipefail) 2>/dev/null; then set -o pipefail; fi

fallo() {
  echo "respaldo: $1" >&2
  exit "${2:-1}"
}

# %XX → carácter, en sh puro (printf de dash no entiende \x; el octal sí es POSIX).
decodificar_porcentaje() {
  resto="$1"
  salida=""
  while :; do
    case "$resto" in
      *%[0-9A-Fa-f][0-9A-Fa-f]*)
        antes="${resto%%\%[0-9A-Fa-f][0-9A-Fa-f]*}"
        hex="${resto#"$antes"%}"
        hex="${hex%"${hex#??}"}"
        resto="${resto#"$antes"%??}"
        # shellcheck disable=SC2059
        salida="$salida$antes$(printf "\\$(printf '%03o' "$((0x$hex))")")"
        ;;
      *)
        salida="$salida$resto"
        break
        ;;
    esac
  done
  printf '%s' "$salida"
}

# --- 0. Variables: todo se valida ANTES de tocar la base. ---------------------------------
for variable in DATABASE_URL RESPALDO_CLAVE_AGE R2_ENDPOINT R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_PRIVADO ENTORNO; do
  eval "valor=\${$variable:-}"
  [ -n "$valor" ] || fallo "falta la variable $variable" 2
done
case "$ENTORNO" in
  staging | produccion) ;;
  *) fallo "ENTORNO debe ser staging o produccion, no '$ENTORNO'" 2 ;;
esac
RESPALDO_DIAS="${RESPALDO_DIAS:-30}"
case "$RESPALDO_DIAS" in
  '' | *[!0-9]* | 0) fallo "RESPALDO_DIAS debe ser un entero >= 1, no '$RESPALDO_DIAS'" 2 ;;
esac
case "$RESPALDO_CLAVE_AGE" in
  age1*) ;;
  *) fallo "RESPALDO_CLAVE_AGE debe ser la llave PÚBLICA de age (empieza por age1)" 2 ;;
esac

# --- 1. DATABASE_URL → PG* (libpq). Forma: esquema://usuario:clave@host[:puerto]/base[?consulta]
sin_esquema="${DATABASE_URL#*://}"
case "$sin_esquema" in
  *@*) credenciales="${sin_esquema%%@*}"; resto="${sin_esquema#*@}" ;;
  *) credenciales=""; resto="$sin_esquema" ;;
esac
case "$resto" in
  */*) host_puerto="${resto%%/*}"; base_consulta="${resto#*/}" ;;
  *) fallo "DATABASE_URL sin nombre de base" 2 ;;
esac
case "$base_consulta" in
  *\?*) PGDATABASE="${base_consulta%%\?*}"; consulta="${base_consulta#*\?}" ;;
  *) PGDATABASE="$base_consulta"; consulta="" ;;
esac
case "$credenciales" in
  *:*) PGUSER="${credenciales%%:*}"; clave="${credenciales#*:}" ;;
  *) PGUSER="$credenciales"; clave="" ;;
esac
case "$host_puerto" in
  *:*) PGHOST="${host_puerto%%:*}"; PGPORT="${host_puerto#*:}" ;;
  *) PGHOST="$host_puerto"; PGPORT=5432 ;;
esac
[ -n "$PGDATABASE" ] && [ -n "$PGHOST" ] && [ -n "$PGUSER" ] || fallo "DATABASE_URL incompleta (usuario, host o base)" 2
# La contraseña puede venir codificada en la URL (%40 por @): se decodifica para PGPASSWORD.
PGPASSWORD="$(decodificar_porcentaje "$clave")"
PGSSLMODE=""
if [ -n "$consulta" ]; then
  # Sólo se entiende el ssl de asyncpg; cualquier otro parámetro es un error, no se ignora.
  case "$consulta" in
    ssl=require | sslmode=require) PGSSLMODE=require ;;
    ssl=disable | sslmode=disable) PGSSLMODE=disable ;;
    *) fallo "DATABASE_URL con parámetros que no se traducen a libpq: '$consulta'" 2 ;;
  esac
fi
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
[ -n "$PGSSLMODE" ] && export PGSSLMODE

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

# --- 2. Volcado (sin tubería: el código de salida de pg_dump manda). -----------------------
echo "respaldo: volcando $PGDATABASE@$PGHOST ($ENTORNO)"
pg_dump --format=custom --no-password --file="$TMP/base.dump"
[ -s "$TMP/base.dump" ] || fallo "el volcado salió vacío"

# --- 3. Cifrado con la llave pública: nadie en el servidor puede leer el resultado. --------
age --recipient "$RESPALDO_CLAVE_AGE" --output "$TMP/$ARCHIVO" "$TMP/base.dump"
rm -f "$TMP/base.dump"
TAMANO="$(wc -c < "$TMP/$ARCHIVO" | tr -d ' ')"
[ "$TAMANO" -gt 0 ] || fallo "el archivo cifrado salió vacío"

# --- 4. Subida y verificación del tamaño remoto. ------------------------------------------
echo "respaldo: subiendo $ARCHIVO ($TAMANO bytes) a $DESTINO"
rclone copyto --retries 3 "$TMP/$ARCHIVO" "$DESTINO/$ARCHIVO"
REMOTO="$(rclone size --json "$DESTINO/$ARCHIVO" | sed -e 's/.*"bytes":[[:space:]]*\([0-9]*\).*/\1/')"
[ "$REMOTO" = "$TAMANO" ] || fallo "el tamaño remoto ($REMOTO) no coincide con el local ($TAMANO)"

# --- 5. Poda: se conservan RESPALDO_DIAS días (≥ 1, validado arriba). ---------------------
echo "respaldo: podando respaldos de más de $RESPALDO_DIAS días en $DESTINO"
rclone delete --min-age "${RESPALDO_DIAS}d" "$DESTINO"

echo "respaldo: listo $DESTINO/$ARCHIVO"
