"""T-0.6: `deploy/respaldo/respaldar.sh` sin Docker, con `pg_dump`, `age` y `rclone` de mentira.

Los sustitutos viven en `tmp_path/bin`, registran su `argv` y producen los archivos que el
script espera (`rclone copyto` copia a un «bucket» local y `rclone size --json` devuelve el
tamaño real). Así se comprueba el orden, los códigos de salida y que la contraseña nunca
viaja en la línea de comandos.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]
RESPALDAR = RAIZ / "deploy" / "respaldo" / "respaldar.sh"
CLAVE_PUBLICA = "age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpq8ykpqp"

ENTORNO_BASE = {
    "DATABASE_URL": "postgresql+asyncpg://carta:s%40cr3t%3Ao@postgres:5432/carta_db?ssl=require",
    "RESPALDO_CLAVE_AGE": CLAVE_PUBLICA,
    "R2_ENDPOINT": "https://0123.r2.cloudflarestorage.com",
    "R2_ACCESS_KEY_ID": "id-de-prueba",
    "R2_SECRET_ACCESS_KEY": "secreto-de-prueba",
    "R2_BUCKET_PRIVADO": "carta-privado",
    "ENTORNO": "staging",
}

STUB_PG_DUMP = """#!/bin/sh
printf 'pg_dump %s\\n' "$*" >> "$REGISTRO"
printf 'PGPASSWORD=%s PGHOST=%s PGPORT=%s PGUSER=%s PGDATABASE=%s PGSSLMODE=%s\\n' \\
  "${PGPASSWORD:-}" "${PGHOST:-}" "${PGPORT:-}" "${PGUSER:-}" "${PGDATABASE:-}" "${PGSSLMODE:-}" >> "$ENTORNO_VISTO"
[ "${PG_DUMP_FALLA:-}" = "1" ] && exit 3
salida=""
while [ $# -gt 0 ]; do case "$1" in --file=*) salida="${1#--file=}";; esac; shift; done
printf 'PGDMP volcado de mentira' > "$salida"
"""

STUB_AGE = """#!/bin/sh
printf 'age %s\\n' "$*" >> "$REGISTRO"
salida=""; entrada=""
while [ $# -gt 0 ]; do
  case "$1" in --output) salida="$2"; shift;; --recipient) shift;; *) entrada="$1";; esac
  shift
done
{ printf 'age-encryption.org/v1\\n'; cat "$entrada"; } > "$salida"
"""

STUB_RCLONE = """#!/bin/sh
printf 'rclone %s\\n' "$*" >> "$REGISTRO"
orden="$1"; shift
case "$orden" in
  copyto)
    while [ $# -gt 0 ]; do case "$1" in --retries) shift 2;; --*) shift;; *) break;; esac; done
    destino="$BUCKET/${2#r2:}"
    mkdir -p "$(dirname "$destino")"
    cp "$1" "$destino"
    ;;
  size)
    archivo="$BUCKET/${2#r2:}"
    bytes=$(wc -c < "$archivo" | tr -d ' ')
    [ -n "${TAMANO_REMOTO_FALSO:-}" ] && bytes="$TAMANO_REMOTO_FALSO"
    printf '{"count":1,"bytes":%s,"sizeless":0}\\n' "$bytes"
    ;;
  delete) ;;
  *) echo "rclone de mentira: orden desconocida $orden" >&2; exit 9;;
esac
"""


@pytest.fixture
def entorno(tmp_path: Path) -> dict[str, str]:
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    for nombre, cuerpo in (("pg_dump", STUB_PG_DUMP), ("age", STUB_AGE), ("rclone", STUB_RCLONE)):
        stub = bin_dir / nombre
        stub.write_text(cuerpo, encoding="utf-8")
        stub.chmod(0o755)
    (tmp_path / "bucket").mkdir()
    return {
        **ENTORNO_BASE,
        "PATH": f"{bin_dir}:{os.environ['PATH']}",
        "REGISTRO": str(tmp_path / "registro.txt"),
        "ENTORNO_VISTO": str(tmp_path / "entorno.txt"),
        "BUCKET": str(tmp_path / "bucket"),
        "TMPDIR": str(tmp_path),
    }


def correr(entorno: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["sh", str(RESPALDAR)], env=entorno, capture_output=True, text=True, timeout=30, check=False
    )


def registro(entorno: dict[str, str]) -> list[str]:
    ruta = Path(entorno["REGISTRO"])
    return ruta.read_text(encoding="utf-8").splitlines() if ruta.exists() else []


def test_respaldo_completo_en_orden_y_con_el_archivo_en_el_bucket(entorno: dict[str, str]) -> None:
    resultado = correr(entorno)
    assert resultado.returncode == 0, resultado.stderr
    ordenes = [linea.split(" ", 1)[0] for linea in registro(entorno)]
    assert ordenes == ["pg_dump", "age", "rclone", "rclone", "rclone"]
    lineas = registro(entorno)
    assert "--format=custom" in lineas[0] and "--no-password" in lineas[0]
    assert "--recipient " + CLAVE_PUBLICA in lineas[1]
    assert lineas[2].startswith("rclone copyto ")
    assert lineas[3].startswith("rclone size --json r2:carta-privado/respaldos/staging/")
    assert lineas[4] == "rclone delete --min-age 30d r2:carta-privado/respaldos/staging"
    subidos = list((Path(entorno["BUCKET"]) / "carta-privado" / "respaldos" / "staging").iterdir())
    assert len(subidos) == 1 and subidos[0].name.endswith(".dump.age")
    assert subidos[0].read_bytes().startswith(b"age-encryption.org/v1")
    assert "listo" in resultado.stdout


def test_la_contrasena_viaja_por_pgpassword_decodificada_y_nunca_en_argv(
    entorno: dict[str, str],
) -> None:
    assert correr(entorno).returncode == 0
    for linea in registro(entorno):
        assert "s%40cr3t" not in linea and "s@cr3t" not in linea and "postgres:5432" not in linea
    visto = Path(entorno["ENTORNO_VISTO"]).read_text(encoding="utf-8")
    assert "PGPASSWORD=s@cr3t:o " in visto  # %40 → @, %3A → :
    assert "PGHOST=postgres PGPORT=5432 PGUSER=carta PGDATABASE=carta_db PGSSLMODE=require" in visto


def test_respaldo_dias_cero_o_no_numerico_falla_antes_de_tocar_la_base(
    entorno: dict[str, str],
) -> None:
    for malo in ("0", "abc", "-1", "7d"):  # vacío = 30 por defecto, como el brief
        resultado = correr({**entorno, "RESPALDO_DIAS": malo})
        assert resultado.returncode == 2, malo
        assert "RESPALDO_DIAS" in resultado.stderr
        assert registro(entorno) == []


@pytest.mark.parametrize(
    "variable", ["ENTORNO", "DATABASE_URL", "RESPALDO_CLAVE_AGE", "R2_BUCKET_PRIVADO"]
)
def test_sin_una_variable_obligatoria_sale_con_2(entorno: dict[str, str], variable: str) -> None:
    sin = {k: v for k, v in entorno.items() if k != variable}
    resultado = correr(sin)
    assert resultado.returncode == 2
    assert variable in resultado.stderr
    assert registro(entorno) == []


def test_entorno_solo_staging_o_produccion(entorno: dict[str, str]) -> None:
    resultado = correr({**entorno, "ENTORNO": "desarrollo"})
    assert resultado.returncode == 2
    assert "ENTORNO" in resultado.stderr
    assert registro(entorno) == []


def test_una_llave_privada_de_age_se_rechaza(entorno: dict[str, str]) -> None:
    resultado = correr({**entorno, "RESPALDO_CLAVE_AGE": "AGE-SECRET-KEY-1QQQQQ"})
    assert resultado.returncode == 2
    assert "PÚBLICA" in resultado.stderr
    assert registro(entorno) == []


def test_parametros_de_url_que_libpq_no_entiende_se_rechazan(entorno: dict[str, str]) -> None:
    url = ENTORNO_BASE["DATABASE_URL"].split("?")[0] + "?application_name=x"
    resultado = correr({**entorno, "DATABASE_URL": url})
    assert resultado.returncode == 2
    assert "libpq" in resultado.stderr


def test_si_pg_dump_falla_el_script_falla_sin_subir_nada(entorno: dict[str, str]) -> None:
    resultado = correr({**entorno, "PG_DUMP_FALLA": "1"})
    assert resultado.returncode != 0
    assert [linea.split(" ", 1)[0] for linea in registro(entorno)] == ["pg_dump"]
    assert not any((Path(entorno["BUCKET"])).rglob("*.age"))


def test_tamano_remoto_distinto_falla_con_1_y_no_poda(entorno: dict[str, str]) -> None:
    resultado = correr({**entorno, "TAMANO_REMOTO_FALSO": "1"})
    assert resultado.returncode == 1
    assert "no coincide" in resultado.stderr
    assert not any(linea.startswith("rclone delete") for linea in registro(entorno))


def test_rclone_sin_archivo_de_configuracion(entorno: dict[str, str]) -> None:
    texto = RESPALDAR.read_text(encoding="utf-8")
    assert "rclone.conf" not in texto.replace("sin rclone.conf", "")
    assert "RCLONE_CONFIG_R2_TYPE=s3" in texto
    assert json.dumps(ENTORNO_BASE)  # las credenciales de prueba no son reales
