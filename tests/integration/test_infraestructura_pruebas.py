"""T-0.4: fábricas, transacción por prueba y cliente sobre la aplicación real.

Comprueba la infraestructura de `tests/conftest.py` con la base de pruebas de verdad: lo que
crean las fábricas lo ve la petición HTTP, los `commit()` del código bajo prueba no salen de
la transacción de la prueba, un `rollback()` del código no borra lo que confirmaron las
fábricas, cada petición tiene su propia sesión y nada sobrevive a la prueba siguiente.
"""

from __future__ import annotations

from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.db.models import Mesa, OperadorRestaurante, Restaurante, RolOperador, Usuario
from app.main import app
from tests.conftest import Fabrica
from tests.fabricas import LARGO_CODIGO_MESA

SLUG_QUE_NO_DEBE_SOBREVIVIR = "aislamiento-t-0-4"
# Lo que una prueba creó y la siguiente debe comprobar que ya no existe (ver abajo).
_creados_en_pruebas_anteriores: dict[str, UUID] = {}


async def _restaurantes_con_slug(motor: AsyncEngine, slug: str) -> int:
    """Cuenta desde OTRA conexión: sólo ve lo que de verdad se confirmó en la base."""
    async with motor.connect() as otra_conexion:
        resultado = await otra_conexion.execute(
            text("SELECT count(*) FROM restaurante WHERE slug = :slug"), {"slug": slug}
        )
        return int(resultado.scalar_one())


async def _en_la_sesion(sesion: AsyncSession, slug: str) -> int:
    return (
        await sesion.scalar(
            select(func.count()).select_from(Restaurante).where(Restaurante.slug == slug)
        )
        or 0
    )


# --- fábricas ----------------------------------------------------------------------------


async def test_fabricas_crean_un_restaurante_con_dueno_y_mesa(
    sesion: AsyncSession, restaurante: Restaurante, operador: OperadorRestaurante, mesa: Mesa
) -> None:
    assert restaurante.id is not None and restaurante.activo
    assert operador.restaurante_id == restaurante.id
    assert operador.rol is RolOperador.propietario
    assert (await sesion.get(Usuario, operador.usuario_id)) is not None
    assert mesa.restaurante_id == restaurante.id
    assert len(mesa.codigo_publico) == LARGO_CODIGO_MESA and mesa.activa


async def test_las_fabricas_conviven_sin_chocar_entre_si(
    fabrica_restaurante: Fabrica, fabrica_mesa: Fabrica, fabrica_operador: Fabrica
) -> None:
    """Valores por defecto únicos: slugs, usuarios, códigos y números de mesa no se repiten."""
    r1 = await fabrica_restaurante()
    r2 = await fabrica_restaurante(nombre="La Esquina", slug="la-esquina", tema="verde")
    r3 = await fabrica_restaurante()
    m1 = await fabrica_mesa(r1)
    m2 = await fabrica_mesa(r1)
    o1 = await fabrica_operador(r1)
    o2 = await fabrica_operador(r1)
    gerente = await fabrica_operador(r2, rol=RolOperador.gerente)
    assert len({r1.slug, r2.slug, r3.slug}) == 3 and r2.tema == "verde"
    assert m1.codigo_publico != m2.codigo_publico and m1.numero != m2.numero
    assert o1.usuario_id != o2.usuario_id
    assert gerente.rol is RolOperador.gerente


async def test_un_rollback_del_codigo_no_borra_lo_confirmado_por_las_fabricas(
    sesion: AsyncSession, fabrica_restaurante: Fabrica, motor_pruebas: AsyncEngine
) -> None:
    """Un servicio que captura `IntegrityError` hace `rollback()`: vuelve al último *savepoint*,
    no al principio de la prueba. Falla si `fabrica_sesion` pierde `create_savepoint`."""
    await fabrica_restaurante(slug="revision-commit")
    await sesion.commit()  # RELEASE SAVEPOINT; la transacción exterior sigue abierta
    await sesion.execute(text("SELECT 1"))
    await sesion.rollback()  # lo que haría el servicio ante un IntegrityError
    assert await _en_la_sesion(sesion, "revision-commit") == 1
    assert await _restaurantes_con_slug(motor_pruebas, "revision-commit") == 0


# --- cliente y transacción -------------------------------------------------------------


async def test_el_cliente_ve_lo_que_crean_las_fabricas(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    respuesta = await cliente.get("/api/v1/admin/restaurantes", headers=cabecera_operador)
    assert respuesta.status_code == 200
    assert restaurante.slug in {r["slug"] for r in respuesta.json()}


async def test_el_commit_de_la_aplicacion_no_sale_de_la_transaccion_de_la_prueba(
    cliente: AsyncClient,
    sesion: AsyncSession,
    motor_pruebas: AsyncEngine,
    cabecera_operador: dict[str, str],
) -> None:
    """`POST` hace `commit()`; con `create_savepoint` sólo libera un *savepoint*."""
    respuesta = await cliente.post(
        "/api/v1/admin/restaurantes",
        json={"nombre": "Aislamiento", "slug": SLUG_QUE_NO_DEBE_SOBREVIVIR},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 201
    _creados_en_pruebas_anteriores[SLUG_QUE_NO_DEBE_SOBREVIVIR] = UUID(respuesta.json()["id"])
    # Visible dentro de la transacción de la prueba...
    assert await _en_la_sesion(sesion, SLUG_QUE_NO_DEBE_SOBREVIVIR) == 1
    # ...e invisible desde cualquier otra conexión: nunca llegó a la base.
    assert await _restaurantes_con_slug(motor_pruebas, SLUG_QUE_NO_DEBE_SOBREVIVIR) == 0


async def test_nada_sobrevive_a_la_prueba_anterior(
    sesion: AsyncSession, motor_pruebas: AsyncEngine
) -> None:
    """Si la prueba anterior corrió (orden del archivo), lo que creó ya no existe; aislada
    (`-k`, `--lf`) sólo comprueba que la base no trae restos de corridas pasadas."""
    assert await _restaurantes_con_slug(motor_pruebas, SLUG_QUE_NO_DEBE_SOBREVIVIR) == 0
    assert await _en_la_sesion(sesion, SLUG_QUE_NO_DEBE_SOBREVIVIR) == 0
    if SLUG_QUE_NO_DEBE_SOBREVIVIR in _creados_en_pruebas_anteriores:
        id_anterior = _creados_en_pruebas_anteriores[SLUG_QUE_NO_DEBE_SOBREVIVIR]
        assert await sesion.get(Restaurante, id_anterior) is None


async def test_cada_peticion_tiene_su_propia_sesion(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    """Como en producción: una petición que revienta en la base no contamina a la siguiente.
    Con una sola sesión para toda la prueba, el GET daría 500 (`PendingRollbackError`)."""
    duplicado = await cliente.post(
        "/api/v1/admin/restaurantes",
        json={"nombre": "Duplicado", "slug": restaurante.slug},
        headers=cabecera_operador,
    )
    assert duplicado.status_code == 409
    siguiente = await cliente.get("/api/v1/admin/restaurantes", headers=cabecera_operador)
    assert siguiente.status_code == 200
    assert restaurante.slug in {r["slug"] for r in siguiente.json()}


# --- el pool de la aplicación ------------------------------------------------------------


@pytest.mark.parametrize("peticion", ["primera", "segunda"])
async def test_el_pool_de_la_aplicacion_sirve_pruebas_consecutivas(
    esquema_migrado: str, peticion: str
) -> None:
    """Sin la fixture `cliente`: `/ready` usa el `engine` global de la aplicación (QueuePool).
    La segunda prueba reutiliza la conexión de la primera: sólo funciona porque todas las
    pruebas comparten el bucle de eventos (con bucle por función daría 503)."""
    assert get_db_session_sin_sustituir()
    transporte = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as c:
        respuesta = await c.get("/ready")
    assert respuesta.status_code == 200, (peticion, respuesta.text)
    assert respuesta.json() == {"db": "ok"}


def get_db_session_sin_sustituir() -> bool:
    return not app.dependency_overrides
