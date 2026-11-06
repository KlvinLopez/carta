"""Comando previo al despliegue (T-0.7): migra la base, salvo que vaya por delante del código.

    uv run python scripts/predespliegue.py

Es el *Pre-deploy Command* del servicio `api` en Railway y el `command` del servicio
`migracion` de `deploy/vps/docker-compose.yml`.

- Base sin esquema, o en una revisión que `migrations/` conoce → `alembic upgrade head`.
- Base en una revisión que `migrations/` **no** conoce → la base va por delante del código:
  es un rollback por etiqueta a una versión anterior a una migración nueva. Las migraciones
  son compatibles hacia atrás (expandir → usar → contraer, 05_Operacion §3), así que el código
  viejo funciona con el esquema nuevo: se avisa en el registro y se sale con 0 sin migrar.
  `alembic upgrade head` a secas fallaría ahí («Can't locate revision») y Railway no
  desplegaría la versión anterior.
- Cualquier otro error (base inalcanzable, migración que falla) → código ≠ 0: no se despliega.

La URL sale de `settings.DATABASE_URL`, como en `migrations/env.py`.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:  # `python scripts/predespliegue.py` no pone la raíz en el path
    sys.path.insert(0, str(RAIZ))

from app.core.config import settings  # noqa: E402
from app.core.registro import configurar_registro  # noqa: E402

registro = logging.getLogger("carta.predespliegue")

CONEXION_TIMEOUT_SEGUNDOS = 10


def configuracion_alembic() -> Config:
    config = Config(str(RAIZ / "alembic.ini"))
    config.set_main_option("script_location", str(RAIZ / "migrations"))
    return config


async def revisiones_en_la_base(url: str) -> set[str]:
    """Revisiones de `alembic_version`; vacío si la tabla no existe (base sin esquema)."""
    motor = create_async_engine(
        url, poolclass=NullPool, connect_args={"timeout": CONEXION_TIMEOUT_SEGUNDOS}
    )
    try:
        async with motor.connect() as conexion:
            existe = await conexion.scalar(text("SELECT to_regclass('alembic_version')"))
            if existe is None:
                return set()
            filas = await conexion.execute(text("SELECT version_num FROM alembic_version"))
            return {str(fila[0]) for fila in filas}
    finally:
        await motor.dispose()


def main() -> int:
    configurar_registro()
    config = configuracion_alembic()
    conocidas = {
        revision.revision for revision in ScriptDirectory.from_config(config).walk_revisions()
    }
    actuales = asyncio.run(revisiones_en_la_base(settings.DATABASE_URL))
    desconocidas = sorted(actuales - conocidas)
    if desconocidas:
        registro.warning(
            "la base va por delante del código (rollback); no se migra: revisión %s, "
            "el código llega hasta %s",
            ", ".join(desconocidas),
            ", ".join(sorted(ScriptDirectory.from_config(config).get_heads())),
        )
        return 0
    registro.info("migrando: %s → head", ", ".join(sorted(actuales)) or "base vacía")
    command.upgrade(config, "head")
    # `migrations/env.py` reconfigura el registro con alembic.ini: se vuelve al JSON.
    configurar_registro()
    registro.info("migración terminada")
    return 0


if __name__ == "__main__":
    sys.exit(main())
