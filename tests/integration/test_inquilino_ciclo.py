"""T-3.0 (ronda de revisión, A1): INV-10 en las columnas y tablas de la migración 0004.

Ninguna fila mezcla restaurantes ni sesiones (03 §5). Cada caso es una escritura que la
maestra reprodujo pasando en la primera entrega; ahora la base la rechaza (FK compuesta o
trigger), y la escritura legítima del mismo tipo sigue pasando. Todo dentro de la transacción
de la prueba.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

PIN_HASH = "$argon2id$v=19$m=65536,t=3,p=4$abc$def"


@dataclass(frozen=True)
class Lado:
    restaurante: UUID
    mesa: UUID
    personal: UUID
    sesion: UUID
    miembro: UUID
    orden: UUID
    platillo: UUID
    item: UUID
    comanda: UUID
    operador: UUID  # `usuario` que es operador (propietario) de este restaurante
    confirmado: UUID  # ítem de una orden confirmada (sólo eso se cancela, ronda 3 B20)


async def _uno(sesion: AsyncSession, sql: str, **p: object) -> Any:
    return (await sesion.execute(text(sql), p)).scalar_one()


async def _lado(sesion: AsyncSession, nombre: str) -> Lado:
    r = await _uno(
        sesion,
        "INSERT INTO restaurante (nombre, slug) VALUES (:n, :s) RETURNING id",
        n=nombre,
        s=f"inq-{nombre.lower()}-{uuid4().hex[:12]}",
    )
    m = await _uno(
        sesion,
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:r, 1, :c) RETURNING id",
        r=r,
        c=f"{nombre}-{r.hex}"[:40],
    )
    pr = await _uno(
        sesion,
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:r, :n, :h) RETURNING id",
        r=r,
        n=f"Persona {nombre}",
        h=PIN_HASH,
    )
    s = await _uno(
        sesion,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id",
        m=m,
        r=r,
    )
    mb = await _uno(sesion, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=s)
    o = await _uno(
        sesion,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=s,
        mb=mb,
    )
    p = await _uno(
        sesion,
        "INSERT INTO platillo (restaurante_id, nombre, precio) VALUES (:r, 'Taco', 10) RETURNING id",
        r=r,
    )
    it = await _uno(
        sesion,
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p, 10, 10) RETURNING id",
        o=o,
        p=p,
    )
    c = await _uno(
        sesion,
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m, :s) RETURNING id",
        r=r,
        m=m,
        s=s,
    )
    u = await _uno(
        sesion,
        "INSERT INTO usuario (firebase_uid, provider) VALUES (:f, 'google') RETURNING id",
        f=f"inq-{r.hex}",
    )
    await sesion.execute(
        text(
            "INSERT INTO operador_restaurante (usuario_id, restaurante_id, rol) "
            "VALUES (:u, :r, 'propietario')"
        ),
        {"u": u, "r": r},
    )
    otro = await _uno(
        sesion, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=s
    )
    oc = await _uno(
        sesion,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :m) RETURNING id",
        s=s,
        m=otro,
    )
    confirmado = await _uno(
        sesion,
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p, 10, 10) RETURNING id",
        o=oc,
        p=p,
    )
    await sesion.execute(
        text(
            "UPDATE orden_personal SET estado = 'confirmada', bloqueada = true, "
            "confirmada_en = now() WHERE id = :o"
        ),
        {"o": oc},
    )
    return Lado(r, m, pr, s, mb, o, p, it, c, u, confirmado)


@pytest.fixture
async def dos(sesion: AsyncSession) -> tuple[Lado, Lado]:
    return await _lado(sesion, "A"), await _lado(sesion, "B")


async def _falla(sesion: AsyncSession, sql: str, **p: object) -> None:
    with pytest.raises((IntegrityError, DBAPIError)):
        async with sesion.begin_nested():
            await sesion.execute(text(sql), p)


async def _pasa(sesion: AsyncSession, sql: str, **p: object) -> None:
    async with sesion.begin_nested():
        await sesion.execute(text(sql), p)


def _casos(a: Lado, b: Lado) -> list[tuple[str, str, dict[str, object], dict[str, object]]]:
    """(caso, SQL, parámetros que mezclan A y B, parámetros legítimos de A)."""
    return [
        (
            "ítem de A pedido por un miembro de B",
            "UPDATE item_orden SET pedido_por_miembro_id = :x WHERE id = :i",
            {"x": b.miembro, "i": a.item},
            {"x": a.miembro, "i": a.item},
        ),
        (
            "ítem de A cancelado por una persona de B",
            "UPDATE item_orden SET estado = 'cancelado_personal', cancelado_en = now(), "
            "cancelado_por_personal_id = :x WHERE id = :i",
            {"x": b.personal, "i": a.confirmado},
            {"x": a.personal, "i": a.confirmado},
        ),
        (
            "cuenta de A cerrada y validada por una persona de B",
            "UPDATE miembro_sesion SET cuenta_cerrada_por_personal_id = :x, "
            "pago_validado_por_personal_id = :x WHERE id = :m",
            {"x": b.personal, "m": a.miembro},
            {"x": a.personal, "m": a.miembro},
        ),
        (
            "marca de A con una comanda de B",
            "INSERT INTO marca_ciclo (restaurante_id, sesion_id, comanda_id, paso, autor) "
            "VALUES (:r, :s, :x, 'comanda', 'sistema')",
            {"r": a.restaurante, "s": a.sesion, "x": b.comanda},
            {"r": a.restaurante, "s": a.sesion, "x": a.comanda},
        ),
        (
            "solicitud de A sin sesión con un miembro de B",
            "INSERT INTO solicitud_entrada (restaurante_id, mesa_id, alias, motivo, vence_en, "
            "miembro_id) VALUES (:r, :m, 'Luis', 'entrada_cerrada', "
            "now() + interval '10 minutes', :x)",
            {"r": a.restaurante, "m": a.mesa, "x": b.miembro},
            {"r": a.restaurante, "m": a.mesa, "x": None},
        ),
        (
            "solicitud de A con sesión y un miembro de B",
            "INSERT INTO solicitud_entrada (restaurante_id, mesa_id, sesion_id, alias, motivo, "
            "vence_en, miembro_id) VALUES (:r, :m, :s, 'Luis', 'entrada_cerrada', "
            "now() + interval '10 minutes', :x)",
            {"r": a.restaurante, "m": a.mesa, "s": a.sesion, "x": b.miembro},
            {"r": a.restaurante, "m": a.mesa, "s": a.sesion, "x": a.miembro},
        ),
        (
            "reparto de la sesión A sobre un cargo de B",
            "INSERT INTO reparto_cargo (item_id, sesion_id, miembro_id) VALUES (:x, :s, :m)",
            {"x": b.item, "s": a.sesion, "m": a.miembro},
            {"x": a.item, "s": a.sesion, "m": a.miembro},
        ),
        (
            "movimiento de A con un cargo de B",
            "INSERT INTO movimiento_cargo (sesion_id, item_id, tipo, de_miembro_id) "
            "VALUES (:s, :x, 'pasar_cuenta', :m)",
            {"s": a.sesion, "x": b.item, "m": a.miembro},
            {"s": a.sesion, "x": a.item, "m": a.miembro},
        ),
        (
            "movimiento de A propuesto por una persona de B",
            "INSERT INTO movimiento_cargo (sesion_id, tipo, de_miembro_id, "
            "propuesto_por_personal_id) VALUES (:s, 'pasar_cuenta', :m, :x)",
            {"s": a.sesion, "m": a.miembro, "x": b.personal},
            {"s": a.sesion, "m": a.miembro, "x": a.personal},
        ),
        (
            "movimiento de A propuesto y aceptado por un miembro de B",
            "INSERT INTO movimiento_cargo (sesion_id, tipo, de_miembro_id, "
            "propuesto_por_miembro_id, aceptado_por_miembro_id) "
            "VALUES (:s, 'pasar_cuenta', :m, :x, :x)",
            {"s": a.sesion, "m": a.miembro, "x": b.miembro},
            {"s": a.sesion, "m": a.miembro, "x": a.miembro},
        ),
    ]


NOMBRES = [
    "ítem de A pedido por un miembro de B",
    "ítem de A cancelado por una persona de B",
    "cuenta de A cerrada y validada por una persona de B",
    "marca de A con una comanda de B",
    "solicitud de A sin sesión con un miembro de B",
    "solicitud de A con sesión y un miembro de B",
    "reparto de la sesión A sobre un cargo de B",
    "movimiento de A con un cargo de B",
    "movimiento de A propuesto por una persona de B",
    "movimiento de A propuesto y aceptado por un miembro de B",
]


@pytest.mark.ac("AC-15.2")
@pytest.mark.parametrize("caso", NOMBRES)
async def test_ninguna_fila_de_0004_mezcla_restaurantes_ni_sesiones(
    sesion: AsyncSession, dos: tuple[Lado, Lado], caso: str
) -> None:
    a, b = dos
    casos = {nombre: (sql, malo, bueno) for nombre, sql, malo, bueno in _casos(a, b)}
    assert set(casos) == set(NOMBRES)
    sql, malo, bueno = casos[caso]
    await _falla(sesion, sql, **malo)
    await _pasa(sesion, sql, **bueno)


@pytest.mark.ac("AC-15.2")
async def test_un_reparto_o_un_movimiento_no_se_mudan_de_sesion(
    sesion: AsyncSession, dos: tuple[Lado, Lado]
) -> None:
    a, b = dos
    reparto = await _uno(
        sesion,
        "INSERT INTO reparto_cargo (item_id, sesion_id, miembro_id) VALUES (:i, :s, :m) "
        "RETURNING id",
        i=a.item,
        s=a.sesion,
        m=a.miembro,
    )
    await _falla(
        sesion,
        "UPDATE reparto_cargo SET sesion_id = :s, miembro_id = :m WHERE id = :r",
        s=b.sesion,
        m=b.miembro,
        r=reparto,
    )
    movimiento = await _uno(
        sesion,
        "INSERT INTO movimiento_cargo (sesion_id, tipo, de_miembro_id) "
        "VALUES (:s, 'flotante', :m) RETURNING id",
        s=a.sesion,
        m=a.miembro,
    )
    await _falla(
        sesion,
        "UPDATE movimiento_cargo SET sesion_id = :s, de_miembro_id = :m WHERE id = :x",
        s=b.sesion,
        m=b.miembro,
        x=movimiento,
    )


@pytest.mark.ac("AC-15.2")
async def test_una_solicitud_no_se_muda_de_mesa_ni_de_restaurante(
    sesion: AsyncSession, dos: tuple[Lado, Lado]
) -> None:
    a, b = dos
    otra_mesa = await _uno(
        sesion,
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:r, 2, :c) RETURNING id",
        r=a.restaurante,
        c=f"otra-{a.restaurante.hex}",
    )
    solicitud = await _uno(
        sesion,
        "INSERT INTO solicitud_entrada (restaurante_id, mesa_id, alias, motivo, vence_en) "
        "VALUES (:r, :m, 'Luis', 'fuera_de_horario', now() + interval '10 minutes') RETURNING id",
        r=a.restaurante,
        m=a.mesa,
    )
    await _falla(
        sesion,
        "UPDATE solicitud_entrada SET restaurante_id = :r, mesa_id = :m WHERE id = :x",
        r=b.restaurante,
        m=b.mesa,
        x=solicitud,
    )
    await _falla(
        sesion, "UPDATE solicitud_entrada SET mesa_id = :m WHERE id = :x", m=otra_mesa, x=solicitud
    )
    # Lo legítimo: al aprobarse, la solicitud toma la sesión y el miembro nuevos de su mesa.
    await _pasa(
        sesion,
        "UPDATE solicitud_entrada SET sesion_id = :s, miembro_id = :mb, estado = 'aprobada', "
        "resuelta_en = now(), resuelta_por_personal_id = :p WHERE id = :x",
        s=a.sesion,
        mb=a.miembro,
        p=a.personal,
        x=solicitud,
    )


@pytest.mark.ac("AC-15.2")
async def test_la_cascada_sigue_funcionando_con_los_controles_nuevos(
    sesion: AsyncSession, dos: tuple[Lado, Lado]
) -> None:
    """Borrar la sesión arrastra repartos, movimientos y marcas, y anula la sesión y el miembro
    de la solicitud sin chocar con `tr_solicitud_entrada_coherente`."""
    a, _ = dos
    await _pasa(
        sesion,
        "INSERT INTO reparto_cargo (item_id, sesion_id, miembro_id) VALUES (:i, :s, :m)",
        i=a.item,
        s=a.sesion,
        m=a.miembro,
    )
    await _pasa(
        sesion,
        "INSERT INTO movimiento_cargo (sesion_id, item_id, tipo, de_miembro_id, "
        "propuesto_por_miembro_id) VALUES (:s, :i, 'flotante', :m, :m)",
        s=a.sesion,
        i=a.item,
        m=a.miembro,
    )
    await _pasa(
        sesion,
        "INSERT INTO marca_ciclo (restaurante_id, sesion_id, comanda_id, paso, autor) "
        "VALUES (:r, :s, :c, 'comanda', 'sistema')",
        r=a.restaurante,
        s=a.sesion,
        c=a.comanda,
    )
    solicitud = await _uno(
        sesion,
        "INSERT INTO solicitud_entrada (restaurante_id, mesa_id, sesion_id, miembro_id, alias, "
        "motivo, vence_en, estado, resuelta_en) VALUES (:r, :m, :s, :mb, 'Luis', "
        "'entrada_cerrada', now() + interval '10 minutes', 'aprobada', now()) RETURNING id",
        r=a.restaurante,
        m=a.mesa,
        s=a.sesion,
        mb=a.miembro,
    )
    # Una orden confirmada no se borra (INV-3): se desbloquea antes de purgar la sesión.
    await sesion.execute(
        text(
            "UPDATE orden_personal SET estado = 'armando', bloqueada = false WHERE sesion_id = :s"
        ),
        {"s": a.sesion},
    )
    await sesion.execute(text("DELETE FROM sesion_grupal WHERE id = :s"), {"s": a.sesion})
    fila = (
        await sesion.execute(
            text("SELECT sesion_id, miembro_id FROM solicitud_entrada WHERE id = :x"),
            {"x": solicitud},
        )
    ).one()
    assert tuple(fila) == (None, None)
    for tabla in ("reparto_cargo", "movimiento_cargo", "marca_ciclo"):
        quedan = (
            await sesion.execute(
                text(f"SELECT count(*) FROM {tabla} WHERE sesion_id = :s"), {"s": a.sesion}
            )
        ).scalar_one()
        assert quedan == 0, tabla


# ---------------------------------------------------------------------------
# Ronda 2 de revisión (B15–B18)
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-15.2")
async def test_un_item_no_cambia_de_orden(sesion: AsyncSession, dos: tuple[Lado, Lado]) -> None:
    """B15 a): moverlo a la orden (y al platillo) de otro restaurante, o a otra orden de su
    misma sesión, dejaría su reparto y sus movimientos en una sesión y el cargo en otra. Una
    corrección es cancelar y agregar (ADR-017)."""
    a, b = dos
    await _falla(
        sesion,
        "UPDATE item_orden SET orden_id = :o, platillo_id = :p WHERE id = :i",
        o=b.orden,
        p=b.platillo,
        i=a.item,
    )
    otro = await _uno(
        sesion, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=a.sesion
    )
    otra_orden = await _uno(
        sesion,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :m) RETURNING id",
        s=a.sesion,
        m=otro,
    )
    await _falla(
        sesion, "UPDATE item_orden SET orden_id = :o WHERE id = :i", o=otra_orden, i=a.item
    )
    # Lo demás de una orden que se arma sigue cambiando.
    await _pasa(sesion, "UPDATE item_orden SET cantidad = 3, subtotal = 30 WHERE id = :i", i=a.item)


@pytest.mark.ac("AC-15.2")
async def test_una_persona_del_personal_no_cambia_de_restaurante(
    sesion: AsyncSession, dos: tuple[Lado, Lado]
) -> None:
    """B15 b): quien validó un pago de A (y a quien se anota la propina, AC-37.7) no se muda a
    B, ni con historial ni sin él."""
    a, b = dos
    await _pasa(
        sesion,
        "UPDATE miembro_sesion SET pago_validado_por_personal_id = :p WHERE id = :m",
        p=a.personal,
        m=a.miembro,
    )
    await _falla(
        sesion,
        "UPDATE personal_restaurante SET restaurante_id = :r WHERE id = :p",
        r=b.restaurante,
        p=a.personal,
    )
    nueva = await _uno(
        sesion,
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:r, 'Sin historial', :h) RETURNING id",
        r=a.restaurante,
        h=PIN_HASH,
    )
    await _falla(
        sesion,
        "UPDATE personal_restaurante SET restaurante_id = :r WHERE id = :p",
        r=b.restaurante,
        p=nueva,
    )


def _escrituras_de_operador(a: Lado) -> dict[str, tuple[str, dict[str, object]]]:
    """Cada columna `*_por_usuario_id` (y el autor de una marca): SQL con `:u` = el usuario."""
    return {
        "item cancelado": (
            "UPDATE item_orden SET estado = 'cancelado_personal', cancelado_en = now(), "
            "cancelado_por_usuario_id = :u WHERE id = :i",
            {"i": a.confirmado},
        ),
        "cuenta cerrada": (
            "UPDATE miembro_sesion SET cuenta_cerrada_por_usuario_id = :u WHERE id = :m",
            {"m": a.miembro},
        ),
        "pago validado": (
            "UPDATE miembro_sesion SET pago_validado_por_usuario_id = :u WHERE id = :m",
            {"m": a.miembro},
        ),
        "marca del operador": (
            "INSERT INTO marca_ciclo (restaurante_id, sesion_id, paso, autor, autor_usuario_id) "
            "VALUES (:r, :s, 'mesa_limpia', 'operador', :u)",
            {"r": a.restaurante, "s": a.sesion},
        ),
        "solicitud resuelta": (
            "INSERT INTO solicitud_entrada (restaurante_id, mesa_id, alias, motivo, vence_en, "
            "estado, resuelta_en, resuelta_por_usuario_id) VALUES (:r, :m, 'Luis', "
            "'fuera_de_horario', now() + interval '10 minutes', 'rechazada', now(), :u)",
            {"r": a.restaurante, "m": a.mesa},
        ),
        "movimiento propuesto": (
            "INSERT INTO movimiento_cargo (sesion_id, tipo, de_miembro_id, "
            "propuesto_por_usuario_id) VALUES (:s, 'flotante', :m, :u)",
            {"s": a.sesion, "m": a.miembro},
        ),
        "sesión cerrada": (
            "UPDATE sesion_grupal SET cerrada_por_usuario_id = :u WHERE id = :s",
            {"s": a.sesion},
        ),
    }


ESCRITURAS_DE_OPERADOR = [
    "item cancelado",
    "cuenta cerrada",
    "pago validado",
    "marca del operador",
    "solicitud resuelta",
    "movimiento propuesto",
    "sesión cerrada",
]


@pytest.mark.ac("AC-15.2")
@pytest.mark.parametrize("caso", ESCRITURAS_DE_OPERADOR)
async def test_el_operador_autor_es_del_restaurante(
    sesion: AsyncSession, dos: tuple[Lado, Lado], caso: str
) -> None:
    """B16: un usuario que sólo es operador de B no queda como autor de algo de A."""
    a, b = dos
    escrituras = _escrituras_de_operador(a)
    assert set(escrituras) == set(ESCRITURAS_DE_OPERADOR)
    sql, parametros = escrituras[caso]
    await _falla(sesion, sql, u=b.operador, **parametros)
    await _pasa(sesion, sql, u=a.operador, **parametros)


@pytest.mark.ac("AC-15.2")
async def test_quitarle_el_acceso_al_operador_no_rompe_lo_que_ya_firmo(
    sesion: AsyncSession, dos: tuple[Lado, Lado]
) -> None:
    """B16: la comprobación es al escribir la columna, no después."""
    a, _ = dos
    await _pasa(
        sesion,
        "UPDATE miembro_sesion SET pago_validado_por_usuario_id = :u WHERE id = :m",
        u=a.operador,
        m=a.miembro,
    )
    await _pasa(
        sesion,
        "UPDATE operador_restaurante SET activo = false WHERE usuario_id = :u",
        u=a.operador,
    )
    await _pasa(
        sesion,
        "UPDATE miembro_sesion SET cuenta_cerrada_por_personal_id = :p WHERE id = :m",
        p=a.personal,
        m=a.miembro,
    )
    # Y ya no puede firmar nada nuevo.
    await _falla(
        sesion,
        "UPDATE miembro_sesion SET cuenta_cerrada_por_usuario_id = :u, "
        "cuenta_cerrada_por_personal_id = NULL WHERE id = :m",
        u=a.operador,
        m=a.miembro,
    )


@pytest.mark.ac("AC-15.2")
async def test_la_sesion_de_una_solicitud_es_la_de_su_mesa(
    sesion: AsyncSession, dos: tuple[Lado, Lado]
) -> None:
    """B17: aprobar una solicitud de la mesa 1 atada a la sesión de la mesa 2 metería a la
    persona en el grupo equivocado."""
    a, _ = dos
    mesa_2 = await _uno(
        sesion,
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:r, 2, :c) RETURNING id",
        r=a.restaurante,
        c=f"mesa-2-{a.restaurante.hex}",
    )
    sesion_2 = await _uno(
        sesion,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id",
        m=mesa_2,
        r=a.restaurante,
    )
    miembro_2 = await _uno(
        sesion, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=sesion_2
    )
    sql = (
        "INSERT INTO solicitud_entrada (restaurante_id, mesa_id, sesion_id, miembro_id, alias, "
        "motivo, vence_en) VALUES (:r, :m, :s, :mb, 'Luis', 'entrada_cerrada', "
        "now() + interval '10 minutes')"
    )
    await _falla(sesion, sql, r=a.restaurante, m=a.mesa, s=sesion_2, mb=miembro_2)
    await _falla(sesion, sql, r=a.restaurante, m=a.mesa, s=sesion_2, mb=None)
    await _pasa(sesion, sql, r=a.restaurante, m=mesa_2, s=sesion_2, mb=miembro_2)


@pytest.mark.ac("AC-35.2")
async def test_borrar_una_comanda_o_un_miembro_no_se_lleva_sus_marcas(
    sesion: AsyncSession, dos: tuple[Lado, Lado]
) -> None:
    """B18: las marcas sólo se van con la purga de su sesión (03 §7)."""
    a, _ = dos
    for columna, valor in (("comanda_id", a.comanda), ("miembro_id", a.miembro)):
        await _pasa(
            sesion,
            f"INSERT INTO marca_ciclo (restaurante_id, sesion_id, {columna}, paso, autor) "
            "VALUES (:r, :s, :v, 'comanda', 'sistema')",
            r=a.restaurante,
            s=a.sesion,
            v=valor,
        )
    await _falla(sesion, "DELETE FROM comanda WHERE id = :c", c=a.comanda)
    # El miembro no tiene órdenes confirmadas: lo que retiene su borrado es su marca.
    await sesion.execute(text("DELETE FROM orden_personal WHERE miembro_id = :m"), {"m": a.miembro})
    await _falla(sesion, "DELETE FROM miembro_sesion WHERE id = :m", m=a.miembro)
    # Una orden confirmada no se borra (INV-3): se desbloquea antes de purgar la sesión.
    await sesion.execute(
        text(
            "UPDATE orden_personal SET estado = 'armando', bloqueada = false WHERE sesion_id = :s"
        ),
        {"s": a.sesion},
    )
    await sesion.execute(text("DELETE FROM sesion_grupal WHERE id = :s"), {"s": a.sesion})
    quedan = await _uno(sesion, "SELECT count(*) FROM marca_ciclo WHERE sesion_id = :s", s=a.sesion)
    assert quedan == 0


# ---------------------------------------------------------------------------
# Ronda 3 de revisión (B19)
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-15.2")
async def test_una_sesion_nace_o_se_cierra_con_un_operador_de_su_restaurante(
    sesion: AsyncSession, dos: tuple[Lado, Lado]
) -> None:
    """B19: al insertar, la fila de la sesión todavía no está en la tabla; el restaurante sale
    de la propia fila (antes, un operador de A fallaba al crear la sesión ya cerrada)."""
    a, b = dos
    mesa_2 = await _uno(
        sesion,
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:r, 3, :c) RETURNING id",
        r=a.restaurante,
        c=f"mesa-3-{a.restaurante.hex}",
    )
    sql = (
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id, estado, fin, "
        "cerrada_por_usuario_id) VALUES (:m, :r, 'cerrada', now(), :u)"
    )
    await _falla(sesion, sql, m=mesa_2, r=a.restaurante, u=b.operador)
    await _pasa(sesion, sql, m=mesa_2, r=a.restaurante, u=a.operador)
    actualizar = "UPDATE sesion_grupal SET cerrada_por_usuario_id = :u WHERE id = :s"
    await _falla(sesion, actualizar, u=b.operador, s=a.sesion)
    await _pasa(sesion, actualizar, u=a.operador, s=a.sesion)
