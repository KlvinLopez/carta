"""Personal del restaurante y su PIN, visto por el operador (US-26, AC-26.3). Sin FastAPI.

- **PIN (regla dura 11, INV-7).** Sólo se guarda el hash Argon2id; el PIN no se devuelve, no se
  registra (este módulo no escribe en el log) ni se copia a los `detalles` de un error. Los
  parámetros son los de `TIEMPO_ARGON2`, `MEMORIA_ARGON2` y `PARALELISMO_ARGON2` (OWASP: Argon2id con 64 MiB, 3 pasadas,
  4 carriles). Un PIN de 4–6 dígitos es adivinable por fuerza bruta si alguien lee la tabla:
  el hash sólo protege lo que sale de la base, la defensa real es el límite de intentos de la
  Fase 3 (5/min, bloqueo progresivo; `intentos_fallidos` y `bloqueado_hasta` son suyos).
- **CPU fuera del bucle.** Hashear y verificar tardan ~100 ms y 64 MiB: van a un pool propio de
  `HILOS_ARGON2` hilos (no al ejecutor por defecto, que comparte con `getaddrinfo`, lección de
  T-1.5 A1) y, de paso, acotan la memoria: nunca hay más de `HILOS_ARGON2` hashes a la vez.
  Hashear ocurre **antes** de tomar candados: la conexión no espera a la CPU.
- **Aislamiento.** El restaurante llega validado contra el operador; el personal por id se
  resuelve con `personal_del_usuario`: ajeno = inexistente = 404 idéntico (regla dura 6).
- **Baja lógica (regla dura 9).** Desactivar es `activo = false`; reactivar (`activo = true`)
  está permitido y comprueba el nombre y el tope de nuevo. El nombre es único entre los
  activos (`uq_personal_activo_por_nombre`, sin mayúsculas ni espacios): 409 `CONFLICTO`.
- **Tope.** `MAX_PERSONAL_ACTIVO` activos por restaurante; alta y reactivación toman
  `FOR UPDATE` del restaurante para que dos a la vez no se pasen (422, como el tope de mesas).
- **Revocación (AC-26.3).** `sesiones_desde` se adelanta al desactivar, reactivar, reasignar
  el PIN o cambiar el rol. La cookie de 12 h de la Fase 3 vale sólo si `activo` y se emitió
  en o después de esa marca (`personal_por_id_activo` + `sesion_vigente`); sin la marca,
  reactivar a alguien resucitaría las cookies que tenía al darlo de baja. Se usa la hora de la
  aplicación, la misma con que la Fase 3 sella la cookie.
"""

from __future__ import annotations

import asyncio
from collections.abc import Sequence
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import UUID

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta, mensaje_por_http, restriccion_de
from app.db.models import PersonalRestaurante, Restaurante, RolPersonal
from app.schemas.personal import MAX_PERSONAL_ACTIVO
from app.services import operadores

# Argon2id, OWASP 2024: m = 64 MiB, t = 3, p = 4. Explícitos: no dependen del valor por
# defecto de la versión instalada, y `verificar_pin` los compara con el hash guardado.
TIEMPO_ARGON2 = 3  # pasadas
MEMORIA_ARGON2 = 64 * 1024  # KiB = 64 MiB
PARALELISMO_ARGON2 = 4
HILOS_ARGON2 = 2

_hasher = PasswordHasher(
    time_cost=TIEMPO_ARGON2,
    memory_cost=MEMORIA_ARGON2,
    parallelism=PARALELISMO_ARGON2,
    type=Type.ID,
)
_pool = ThreadPoolExecutor(max_workers=HILOS_ARGON2, thread_name_prefix="argon2")

RESTRICCION_NOMBRE = "uq_personal_activo_por_nombre"
MENSAJE_NOMBRE_REPETIDO = "Ya hay una persona activa con ese nombre."


def _no_encontrado() -> ErrorCarta:
    return ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)


def _tope() -> ErrorCarta:
    mensaje = f"Cada restaurante puede tener hasta {MAX_PERSONAL_ACTIVO} personas activas."
    return ErrorCarta(
        "PAYLOAD_INVALIDO",
        mensaje,
        422,
        {"errores": [{"campo": "body", "mensaje": mensaje, "tipo": "limite_de_personal"}]},
    )


# ---------------------------------------------------------------------------
# PIN
# ---------------------------------------------------------------------------


async def hashear_pin(pin: str) -> str:
    """Hash Argon2id (`$argon2id$…`) del PIN, fuera del bucle de eventos."""
    return await asyncio.get_running_loop().run_in_executor(_pool, _hasher.hash, pin)


def _verificar(hash_guardado: str, pin: str) -> bool:
    try:
        return _hasher.verify(hash_guardado, pin)
    except (VerificationError, InvalidHashError):
        return False


async def verificar_pin(hash_guardado: str, pin: str) -> bool:
    """`True` si `pin` corresponde al hash. Un hash que no es Argon2 válido es `False`, no
    una excepción. Lo usa la entrada con PIN de la Fase 3 (T-3.4)."""
    return await asyncio.get_running_loop().run_in_executor(_pool, _verificar, hash_guardado, pin)


# ---------------------------------------------------------------------------
# Lectura
# ---------------------------------------------------------------------------


async def personal_del_usuario(
    sesion: AsyncSession, usuario_id: UUID, personal_id: UUID
) -> PersonalRestaurante | None:
    """La persona si es de un restaurante visible para el operador; `None` si no."""
    persona = await sesion.get(PersonalRestaurante, personal_id)
    if persona is None:
        return None
    if await operadores.restaurante_del_usuario(sesion, usuario_id, persona.restaurante_id):
        return persona
    return None


async def personal_por_id_activo(
    sesion: AsyncSession, restaurante_id: UUID, personal_id: UUID
) -> PersonalRestaurante | None:
    """La persona **activa** de ese restaurante, o `None`. Es la comprobación por petición de
    la cookie del personal (Fase 3): otro restaurante, inexistente y desactivada dan lo
    mismo."""
    return await sesion.scalar(
        select(PersonalRestaurante).where(
            PersonalRestaurante.id == personal_id,
            PersonalRestaurante.restaurante_id == restaurante_id,
            PersonalRestaurante.activo.is_(True),
        )
    )


def sesion_vigente(persona: PersonalRestaurante, emitida_en: datetime) -> bool:
    """¿Sigue valiendo una cookie emitida en `emitida_en` (con zona horaria)? Exige que la
    persona esté activa y que la cookie no sea anterior al sello de revocación. Compara con
    toda la precisión: no truncar `iat` a segundos."""
    return persona.activo and emitida_en >= persona.sesiones_desde


async def listar_personal(
    sesion: AsyncSession, restaurante_id: UUID, activo: bool | None = None
) -> Sequence[PersonalRestaurante]:
    """Activos primero y por nombre; `activo` filtra (sin él, todos)."""
    consulta = select(PersonalRestaurante).where(
        PersonalRestaurante.restaurante_id == restaurante_id
    )
    if activo is not None:
        consulta = consulta.where(PersonalRestaurante.activo.is_(activo))
    consulta = consulta.order_by(
        PersonalRestaurante.activo.desc(),
        func.lower(PersonalRestaurante.nombre),
        PersonalRestaurante.id,
    )
    return (await sesion.scalars(consulta)).all()


# ---------------------------------------------------------------------------
# Escritura
# ---------------------------------------------------------------------------


async def _bloquear_restaurante(sesion: AsyncSession, restaurante_id: UUID) -> None:
    bloqueado = await sesion.scalar(
        select(Restaurante.id).where(Restaurante.id == restaurante_id).with_for_update()
    )
    if bloqueado is None:
        raise _no_encontrado()


async def _activos(sesion: AsyncSession, restaurante_id: UUID) -> int:
    total = await sesion.scalar(
        select(func.count())
        .select_from(PersonalRestaurante)
        .where(
            PersonalRestaurante.restaurante_id == restaurante_id,
            PersonalRestaurante.activo.is_(True),
        )
    )
    return total or 0


async def _confirmar(sesion: AsyncSession) -> None:
    """`commit()` que traduce el índice del nombre a 409. Cualquier otra violación sube tal
    cual: `manejar_integridad` la traduce y sólo registra el nombre de la restricción."""
    try:
        await sesion.commit()
    except IntegrityError as error:
        await sesion.rollback()
        if restriccion_de(error) == RESTRICCION_NOMBRE:
            raise ErrorCarta("CONFLICTO", MENSAJE_NOMBRE_REPETIDO, 409) from None
        raise


async def crear_personal(
    sesion: AsyncSession, restaurante_id: UUID, nombre: str, rol: RolPersonal, pin: str
) -> PersonalRestaurante:
    """Alta con el PIN que eligió el operador; sólo se guarda su hash (INV-7)."""
    pin_hash = await hashear_pin(pin)  # antes de los candados: la conexión no espera a la CPU
    await _bloquear_restaurante(sesion, restaurante_id)
    if await _activos(sesion, restaurante_id) >= MAX_PERSONAL_ACTIVO:
        raise _tope()
    persona = PersonalRestaurante(
        restaurante_id=restaurante_id,
        nombre=nombre,
        rol=rol,
        pin_hash=pin_hash,
        sesiones_desde=datetime.now(UTC),
    )
    sesion.add(persona)
    await _confirmar(sesion)
    return persona


async def _persona_bloqueada(
    sesion: AsyncSession, personal_id: UUID, restaurante_id: UUID
) -> PersonalRestaurante:
    persona = await sesion.scalar(
        select(PersonalRestaurante)
        .where(
            PersonalRestaurante.id == personal_id,
            PersonalRestaurante.restaurante_id == restaurante_id,
        )
        .with_for_update()
    )
    if persona is None:
        raise _no_encontrado()
    return persona


async def cambiar_personal(
    sesion: AsyncSession,
    personal_id: UUID,
    restaurante_id: UUID,
    *,
    nombre: str | None = None,
    rol: RolPersonal | None = None,
    activo: bool | None = None,
) -> PersonalRestaurante:
    """Edita nombre y rol, da de baja o reactiva. `restaurante_id` es el de la persona ya
    validada contra el operador; se vuelve a leer con `FOR UPDATE` (primero el restaurante,
    después la persona: siempre en ese orden)."""
    await _bloquear_restaurante(sesion, restaurante_id)
    persona = await _persona_bloqueada(sesion, personal_id, restaurante_id)
    revoca = False
    if activo is not None and activo != persona.activo:
        if activo and await _activos(sesion, restaurante_id) >= MAX_PERSONAL_ACTIVO:
            raise _tope()
        persona.activo = activo
        revoca = True
    if rol is not None and rol != persona.rol:
        persona.rol = rol
        revoca = True  # su cookie vigente lleva el rol anterior
    if nombre is not None:
        persona.nombre = nombre
    if revoca:
        persona.sesiones_desde = datetime.now(UTC)
    await _confirmar(sesion)
    return persona


async def reasignar_pin(
    sesion: AsyncSession, personal_id: UUID, restaurante_id: UUID, pin: str
) -> None:
    """PIN nuevo: revoca la sesión vigente y limpia el bloqueo por intentos (el operador
    resuelve a quien se quedó fuera). Sirve también para quien está dado de baja."""
    pin_hash = await hashear_pin(pin)
    persona = await _persona_bloqueada(sesion, personal_id, restaurante_id)
    persona.pin_hash = pin_hash
    persona.intentos_fallidos = 0
    persona.bloqueado_hasta = None
    persona.sesiones_desde = datetime.now(UTC)
    await _confirmar(sesion)
