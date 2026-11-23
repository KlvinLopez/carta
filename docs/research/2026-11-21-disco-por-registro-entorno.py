"""Funciones puras (sin red ni base) que arman el entorno de `2026-11-21-disco-por-registro.py`; viven aparte para poder probarlas sin correr la medición."""
import sys
from urllib.parse import quote

PREFIJOS_DE_LA_NUBE = ("R2_", "CLOUDFLARE_")


def entorno_psql(entorno):
    """El entorno de psql: se quitan todas las variables PG* (PGHOST, PGHOSTADDR, PGPORT, PGSERVICE, PGPASSFILE...) salvo PGPASSWORD, para que el guion siempre
    conecte al host y puerto que él mismo pasa."""
    return {k: v for k, v in entorno.items() if not k.startswith("PG") or k == "PGPASSWORD"}


def url_de_la_base(contrasena, base, host="127.0.0.1", puerto=5432):
    """La URL de la base con la contraseña escapada: una `@`, `/` o `:` en ella no puede cambiar el host."""
    return f"postgresql+asyncpg://carta:{quote(contrasena, safe='')}@{host}:{puerto}/{base}"


def entorno_de_la_app(entorno, url):
    """El entorno de alembic y de scripts/seed.py. Si hay alguna variable R2_* o CLOUDFLARE_* con valor, aborta: la siembra subiría fotos y el PDF a ese bucket y purgaría
    la zona de Cloudflare, y nada lo borra después."""
    nube = sorted(k for k, v in entorno.items() if k.startswith(PREFIJOS_DE_LA_NUBE) and v)
    if nube:
        sys.exit(f"Abortado: hay variables de la nube definidas ({', '.join(nube)}). Esta medición siembra datos de desarrollo y no debe tocar R2 ni Cloudflare; quítelas del entorno.")
    return {**entorno_psql(entorno), "DATABASE_URL": url, "ENTORNO": "desarrollo"}
