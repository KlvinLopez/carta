"""`personal_restaurante.sesiones_desde`: sello de revocación de las sesiones del personal.

La cookie de 12 h del personal (`carta_personal`, Fase 3) lleva su hora de emisión (`iat`). La
verificación de cada petición exige `iat >= sesiones_desde`: el operador lo adelanta al
desactivar a la persona, reasignarle el PIN o cambiarle el rol (AC-26.3). Sin el sello,
reactivar a alguien resucitaría las cookies que tenía al darlo de baja, y una cookie con rol
`capitan` sobreviviría a su baja de capitán a mesero.

`ADD COLUMN ... DEFAULT now()` no reescribe la tabla (PostgreSQL 11+: el valor se evalúa una
vez). Las filas existentes quedan con la hora de la migración: ninguna sesión emitida antes
sigue valiendo, y no hay sesiones del personal anteriores a la Fase 3.

Revision ID: 0003_personal_sesiones_desde
Revises: 0002_consistencia_inquilino
Create Date: 2026-11-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0003_personal_sesiones_desde"
down_revision: str | None = "0002_consistencia_inquilino"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "personal_restaurante",
        sa.Column(
            "sesiones_desde",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("personal_restaurante", "sesiones_desde")
