"""T-0.4: fábricas, transacción por prueba y cliente sobre la aplicación real.

Comprueba la infraestructura de `tests/conftest.py` con la base de pruebas de verdad: lo que
crean las fábricas lo ve la petición HTTP, los `commit()` del código bajo prueba no salen de
la transacción de la prueba y nada sobrevive a la prueba siguiente.
"""

from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.db.models import Mesa, OperadorRestaurante, Restaurante, RolOperador, Usuario
from tests.conftest import Fabrica
from tests.fabricas import LARGO_CODIGO_MESA

SLUG_QUE_NO_DEBE_SOBREVIVIR = "aislamiento-t-0-4"


async def _restaurantes_con_slug(motor: AsyncEngine, slug: str) -> int:
    """Cuenta desde OTRA conexión: sólo ve lo que de verdad se confirmó en la base."""
    async with motor.connect() as otra_conexion:
        resultado = await otra_conexion.execute(
            text("SELECT count(*) FROM restaurante WHERE slug = :slug"), {"slug": slug}
        )
        return int(resultado.scalar_one())


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
    """Valores por defecto únicos: slugs, códigos y números de mesa no se repiten."""
    r1 = await fabrica_restaurante()
    r2 = await fabrica_restaurante(nombre="La Esquina", slug="la-esquina", tema="verde")
    m1 = await fabrica_mesa(r1)
    m2 = await fabrica_mesa(r1)
    gerente = await fabrica_operador(r2, rol=RolOperador.gerente)
    assert r1.slug != r2.slug and r2.tema == "verde"
    assert m1.codigo_publico != m2.codigo_publico and m1.numero != m2.numero
    assert gerente.rol is RolOperador.gerente


# --- cliente y transacción -------------------------------------------------------------


async def test_el_cliente_ve_lo_que_crean_las_fabricas(
    cliente: AsyncClient, restaurante: Restaurante
) -> None:
    respuesta = await cliente.get("/api/v1/admin/restaurantes")
    assert respuesta.status_code == 200
    assert restaurante.slug in {r["slug"] for r in respuesta.json()}


async def test_el_commit_de_la_aplicacion_no_sale_de_la_transaccion_de_la_prueba(
    cliente: AsyncClient, sesion: AsyncSession, motor_pruebas: AsyncEngine
) -> None:
    """`POST` hace `commit()`; con `create_savepoint` sólo libera un *savepoint*."""
    respuesta = await cliente.post(
        "/api/v1/admin/restaurantes",
        json={"nombre": "Aislamiento", "slug": SLUG_QUE_NO_DEBE_SOBREVIVIR},
    )
    assert respuesta.status_code == 201
    # Visible dentro de la transacción de la prueba...
    en_la_prueba = await sesion.scalar(
        select(func.count())
        .select_from(Restaurante)
        .where(Restaurante.slug == SLUG_QUE_NO_DEBE_SOBREVIVIR)
    )
    assert en_la_prueba == 1
    # ...e invisible desde cualquier otra conexión: nunca llegó a la base.
    assert await _restaurantes_con_slug(motor_pruebas, SLUG_QUE_NO_DEBE_SOBREVIVIR) == 0


async def test_nada_sobrevive_a_la_prueba_anterior(
    sesion: AsyncSession, motor_pruebas: AsyncEngine
) -> None:
    """Corre después de la anterior (orden del archivo): la transacción se revirtió."""
    assert await _restaurantes_con_slug(motor_pruebas, SLUG_QUE_NO_DEBE_SOBREVIVIR) == 0
    assert (
        await sesion.scalar(
            select(func.count())
            .select_from(Restaurante)
            .where(Restaurante.slug == SLUG_QUE_NO_DEBE_SOBREVIVIR)
        )
        == 0
    )


async def test_ready_usa_la_sesion_de_la_prueba(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/ready")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"db": "ok"}
