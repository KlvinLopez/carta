"""T-3.0: migración `0004_ciclo_de_la_mesa` (Spec 001, ADR-017; 03 §2.4).

- Sube, baja y vuelve a subir en una base propia, con datos de la Fase 2 dentro: es **sólo de
  expansión** (las filas viejas quedan igual y con los valores por defecto nuevos) y al bajar
  devuelve el texto exacto de lo que tenía 0003.
- AC-36.4: los restaurantes que ya existían y los que se crean después quedan con los ajustes
  del piloto y la tabla de permisos de la Spec 001 §5.
- INV-3 ajustada una sola vez (ADR-017 punto 8): un ítem confirmado sólo admite pasar a
  «cancelado por el personal», y sólo mientras la cocina no empezó su comanda (también con dos
  conexiones: un `atender` simultáneo gana o pierde, nunca los dos).
- AC-35.5 y AC-35.2: las marcas de tiempo no guardan nada del comensal y no se sobrescriben.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Any

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.db.models import Mesa, PersonalRestaurante, Restaurante
from tests.bd_pruebas import alembic, base_desechable

# Spec 001 §5, copiada a mano (regla 12 del skill `/pruebas`: literales, no la constante del
# módulo): permiso → (mesero, capitán).
TABLA_SPEC_001 = {
    "cerrar_cuenta_comensal": (True, True),
    "cerrar_cuentas_mesa": (True, True),
    "validar_pago": (True, True),
    "mesa_limpia": (True, True),
    "reabrir": (True, True),
    "cancelar_item": (True, True),
    "pasar_cuenta": (True, True),
    "quitar_comensal": (True, True),
    "resolver_solicitud": (True, True),
    "cambiar_entrada": (False, True),
    "liberar_con_cargos": (False, False),
    "regenerar_codigo": (False, False),
    "marcar_agotado": (True, True),
    "editar_orden": (True, True),
    "cambiar_permisos_meseros": (False, False),
}
# Spec 001 §3: valores del piloto.
AJUSTES_PILOTO = {
    "max_comensales": 12,
    "estatus_amarillo_min": 20,
    "estatus_rojo_min": 40,
    "recordatorio_min": 30,
    "rojo_aprobacion_min": 120,
    "solicitudes_por_mesa": 5,
    "solicitudes_por_restaurante": 20,
    "vigencia_solicitud_min": 10,
}
TABLAS_0004 = {
    "ajuste_restaurante",
    "permiso_rol",
    "solicitud_entrada",
    "marca_ciclo",
    "reparto_cargo",
    "movimiento_cargo",
}
FUNCIONES_0004 = {"fn_avisar_cambio", "fn_restaurante_siembra", "fn_marca_ciclo_inmutable"}
PIN_HASH = "$argon2id$v=19$m=65536,t=3,p=4$abc$def"


async def _permisos(conexion: Any, restaurante: object) -> dict[str, tuple[bool, bool]]:
    filas = (
        await conexion.execute(
            text("SELECT permiso, rol::text, permitido FROM permiso_rol WHERE restaurante_id = :r"),
            {"r": restaurante},
        )
    ).all()
    por_rol: dict[str, dict[str, bool]] = {}
    for permiso, rol, permitido in filas:
        por_rol.setdefault(permiso, {})[rol] = permitido
    assert len(filas) == 2 * len(por_rol)  # una fila por rol, nunca de más
    return {p: (r["mesero"], r["capitan"]) for p, r in por_rol.items()}


async def _ajustes(conexion: Any, restaurante: object) -> dict[str, int]:
    fila = (
        await conexion.execute(
            text(
                f"SELECT {', '.join(AJUSTES_PILOTO)} FROM ajuste_restaurante "
                "WHERE restaurante_id = :r"
            ),
            {"r": restaurante},
        )
    ).one()
    return dict(fila._mapping)


# ---------------------------------------------------------------------------
# Subir, bajar y volver a subir con datos de la Fase 2
# ---------------------------------------------------------------------------


async def _catalogo(conexion: AsyncConnection) -> dict[str, Any]:
    """Lo que 0004 toca de lo que ya existía, en texto exacto del catálogo."""
    restricciones = dict(
        (
            await conexion.execute(
                text(
                    "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint "
                    "WHERE conname IN ('ck_sesion_grupal_estado', 'ck_miembro_sesion_estado')"
                )
            )
        ).all()
    )
    indice = (
        await conexion.execute(
            text(
                "SELECT pg_get_indexdef(indexrelid) FROM pg_index i "
                "JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = 'uq_sesion_viva_por_mesa'"
            )
        )
    ).scalar_one()
    funcion = (
        await conexion.execute(
            text("SELECT prosrc FROM pg_proc WHERE proname = 'fn_item_orden_inmutable'")
        )
    ).scalar_one()
    columnas = {
        tabla: {
            fila[0]
            for fila in await conexion.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"),
                {"t": tabla},
            )
        }
        for tabla in ("restaurante", "sesion_grupal", "miembro_sesion", "item_orden")
    }
    tablas = {
        fila[0]
        for fila in await conexion.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
        )
    }
    funciones = {
        fila[0]
        for fila in await conexion.execute(
            text("SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace")
        )
    }
    return {
        "restricciones": restricciones,
        "indice": indice,
        "funcion": funcion,
        "columnas": columnas,
        "tablas": tablas,
        "funciones": funciones,
    }


async def _datos_fase_2(conexion: AsyncConnection) -> dict[str, Any]:
    """Lo que deja el código de `v0.1.0`: un restaurante, una mesa con su sesión abierta, un
    miembro y una orden con un ítem (todo con las columnas de 0003)."""
    uno = conexion.execute

    async def id_de(sql: str, **p: object) -> Any:
        return (await uno(text(sql), p)).scalar_one()

    r = await id_de(
        "INSERT INTO restaurante (nombre, slug) VALUES ('La Ceiba', 'la-ceiba') RETURNING id"
    )
    m = await id_de(
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:r, 7, :c) RETURNING id",
        r=r,
        c="c" * 22,
    )
    p = await id_de(
        "INSERT INTO platillo (restaurante_id, nombre, precio) VALUES (:r, 'Flan', 60) RETURNING id",
        r=r,
    )
    s = await id_de(
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id", m=m, r=r
    )
    mb = await id_de(
        "INSERT INTO miembro_sesion (sesion_id, alias) VALUES (:s, 'Ana') RETURNING id", s=s
    )
    o = await id_de(
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=s,
        mb=mb,
    )
    i = await id_de(
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p, 60, 60) RETURNING id",
        o=o,
        p=p,
    )
    return {"restaurante": r, "mesa": m, "sesion": s, "miembro": mb, "item": i}


@pytest.mark.ac("AC-36.4")
async def test_0004_expande_sin_tocar_lo_que_habia_y_baja_a_0003(url_bd: str) -> None:
    async with base_desechable(url_bd, "ciclo") as url:
        motor = create_async_engine(url, poolclass=NullPool)
        try:
            alembic("upgrade", "0003_personal_sesiones_desde", url=url)
            async with motor.begin() as conexion:
                antes = await _catalogo(conexion)
                datos = await _datos_fase_2(conexion)

            alembic("upgrade", "head", url=url)
            async with motor.begin() as conexion:
                despues = await _catalogo(conexion)
                assert TABLAS_0004 <= despues["tablas"]
                # Nada se borró ni se renombró: toda columna vieja sigue.
                for tabla, columnas in antes["columnas"].items():
                    assert columnas <= despues["columnas"][tabla], tabla
                # Las filas de la Fase 2 quedan igual, con los valores por defecto nuevos.
                fila = (
                    await conexion.execute(
                        text(
                            "SELECT s.estado, s.entrada_cerrada, s.liberada_sin_pago, "
                            "m.estado, m.alias, m.propina_centavos, i.estado, i.origen, "
                            "r.zona_horaria, r.fuera_de_horario, r.horarios "
                            "FROM sesion_grupal s JOIN miembro_sesion m ON m.sesion_id = s.id "
                            "JOIN item_orden i ON i.id = :i JOIN restaurante r ON r.id = s.restaurante_id "
                            "WHERE s.id = :s"
                        ),
                        {"s": datos["sesion"], "i": datos["item"]},
                    )
                ).one()
                assert tuple(fila) == (
                    "activa",
                    False,
                    False,
                    "activo",
                    "Ana",
                    None,
                    "vigente",
                    "comensal",
                    "America/Mexico_City",
                    "pedir_aprobacion",
                    {},
                )
                # AC-36.4: el restaurante que ya existía queda sembrado.
                assert await _permisos(conexion, datos["restaurante"]) == TABLA_SPEC_001
                assert await _ajustes(conexion, datos["restaurante"]) == AJUSTES_PILOTO
                # Una sesión con el ciclo avanzado, para ver qué hace la bajada con ella.
                await conexion.execute(
                    text(
                        "UPDATE sesion_grupal SET estado = 'cuenta_cerrada', "
                        "cuenta_cerrada_en = now(), entrada_cerrada = true WHERE id = :s"
                    ),
                    {"s": datos["sesion"]},
                )
                await conexion.execute(
                    text(
                        "UPDATE miembro_sesion SET estado = 'cuenta_cerrada', "
                        "cuenta_cerrada_en = now(), propina_centavos = 7200 WHERE id = :m"
                    ),
                    {"m": datos["miembro"]},
                )

            alembic("downgrade", "0003_personal_sesiones_desde", url=url)
            async with motor.begin() as conexion:
                restaurado = await _catalogo(conexion)
                assert restaurado == antes  # texto exacto de restricciones, índice y función
                assert not TABLAS_0004 & restaurado["tablas"]
                assert not FUNCIONES_0004 & restaurado["funciones"]
                # Lo vivo sigue vivo para el código de la Fase 2.
                estados = (
                    await conexion.execute(
                        text(
                            "SELECT s.estado, m.estado FROM sesion_grupal s "
                            "JOIN miembro_sesion m ON m.sesion_id = s.id WHERE s.id = :s"
                        ),
                        {"s": datos["sesion"]},
                    )
                ).one()
                assert tuple(estados) == ("activa", "activo")

            alembic("upgrade", "head", url=url)
            async with motor.connect() as conexion:
                assert await _catalogo(conexion) == despues
        finally:
            await motor.dispose()


# ---------------------------------------------------------------------------
# AC-36.4 · un restaurante nuevo nace con sus ajustes y permisos
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-36.4")
async def test_un_restaurante_nuevo_nace_con_los_permisos_de_la_spec_y_los_ajustes_del_piloto(
    sesion: AsyncSession, restaurante: Restaurante
) -> None:
    """Lo crea la fábrica con el ORM (como el alta del operador, T-1.2), sin saber de estas
    tablas: la siembra es de la base (`tr_restaurante_siembra`)."""
    assert await _permisos(sesion, restaurante.id) == TABLA_SPEC_001
    assert await _ajustes(sesion, restaurante.id) == AJUSTES_PILOTO


@pytest.mark.ac("AC-36.4")
async def test_marisol_mesera_puede_limpiar_la_mesa_sin_configurar_nada(
    sesion: AsyncSession, restaurante: Restaurante
) -> None:
    """Escenario de AC-36.4: «Marisol entra y puede marcar limpia la mesa 7»; la liberación
    con cargos sigue siendo sólo del dueño (no hay fila de dueño: puede todo)."""
    permisos = await _permisos(sesion, restaurante.id)
    assert permisos["mesa_limpia"][0] is True
    assert permisos["liberar_con_cargos"] == (False, False)
    roles = {
        fila[0]
        for fila in await sesion.execute(
            text("SELECT DISTINCT rol::text FROM permiso_rol WHERE restaurante_id = :r"),
            {"r": restaurante.id},
        )
    }
    assert roles == {"mesero", "capitan"}


# ---------------------------------------------------------------------------
# INV-3 ajustada (ADR-017 punto 8)
# ---------------------------------------------------------------------------


async def _uno(sesion: AsyncSession, sql: str, **p: object) -> Any:
    return (await sesion.execute(text(sql), p)).scalar_one()


async def _orden_confirmada(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> dict[str, Any]:
    p = await _uno(
        sesion,
        "INSERT INTO platillo (restaurante_id, nombre, precio) VALUES (:r, 'Ensalada', 90) RETURNING id",
        r=restaurante.id,
    )
    s = await _uno(
        sesion,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id",
        m=mesa.id,
        r=restaurante.id,
    )
    mb = await _uno(sesion, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=s)
    o = await _uno(
        sesion,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=s,
        mb=mb,
    )
    i = await _uno(
        sesion,
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal, "
        "pedido_por_miembro_id) VALUES (:o, :p, 90, 90, :mb) RETURNING id",
        o=o,
        p=p,
        mb=mb,
    )
    await sesion.execute(
        text(
            "UPDATE orden_personal SET estado = 'confirmada', bloqueada = true, "
            "confirmada_en = now() WHERE id = :o"
        ),
        {"o": o},
    )
    c = await _uno(
        sesion,
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m, :s) RETURNING id",
        r=restaurante.id,
        m=mesa.id,
        s=s,
    )
    await sesion.execute(
        text("INSERT INTO comanda_orden (comanda_id, orden_id) VALUES (:c, :o)"), {"c": c, "o": o}
    )
    return {"item": i, "comanda": c, "orden": o}


async def _falla(sesion: AsyncSession, sql: str, **p: object) -> None:
    with pytest.raises(IntegrityError):
        async with sesion.begin_nested():
            await sesion.execute(text(sql), p)


CANCELAR = (
    "UPDATE item_orden SET estado = 'cancelado_personal', cancelado_en = now(), "
    "cancelado_por_personal_id = :pr WHERE id = :i"
)


async def test_un_item_confirmado_solo_admite_pasar_a_cancelado_por_el_personal(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> None:
    datos = await _orden_confirmada(sesion, restaurante, mesa)
    persona = PersonalRestaurante(
        restaurante_id=restaurante.id, nombre="Marisol", pin_hash=PIN_HASH
    )
    sesion.add(persona)
    await sesion.flush()
    i, pr = datos["item"], persona.id

    # Cualquier otro cambio sigue prohibido (INV-3 de siempre).
    await _falla(sesion, "UPDATE item_orden SET cantidad = 2 WHERE id = :i", i=i)
    await _falla(sesion, "UPDATE item_orden SET pedido_por_miembro_id = NULL WHERE id = :i", i=i)
    await _falla(sesion, "DELETE FROM item_orden WHERE id = :i", i=i)
    # Cancelar y a la vez tocar otra columna, tampoco.
    await _falla(
        sesion,
        "UPDATE item_orden SET estado = 'cancelado_personal', cancelado_en = now(), "
        "subtotal = 0 WHERE id = :i",
        i=i,
    )
    # El paso legítimo: queda con autor y hora, no desaparece (regla dura 8).
    await sesion.execute(text(CANCELAR), {"i": i, "pr": pr})
    fila = (
        await sesion.execute(
            text(
                "SELECT estado, cancelado_por_personal_id, subtotal FROM item_orden WHERE id = :i"
            ),
            {"i": i},
        )
    ).one()
    assert (fila[0], fila[1], float(fila[2])) == ("cancelado_personal", pr, 90.0)
    # Y no hay vuelta atrás: una corrección es cancelar y agregar.
    await _falla(
        sesion,
        "UPDATE item_orden SET estado = 'vigente', cancelado_en = NULL, "
        "cancelado_por_personal_id = NULL WHERE id = :i",
        i=i,
    )


@pytest.mark.parametrize("estado", ["atendida", "servida"])
async def test_no_se_cancela_lo_que_la_cocina_ya_empezo(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa, estado: str
) -> None:
    datos = await _orden_confirmada(sesion, restaurante, mesa)
    servida = ", servida_en = now()" if estado == "servida" else ""
    await sesion.execute(
        text(f"UPDATE comanda SET estado = :e, atendida_en = now(){servida} WHERE id = :c"),
        {"e": estado, "c": datos["comanda"]},
    )
    await _falla(
        sesion,
        "UPDATE item_orden SET estado = 'cancelado_personal', cancelado_en = now() WHERE id = :i",
        i=datos["item"],
    )


async def test_cancelar_y_atender_a_la_vez_nunca_pasan_los_dos(motor_pruebas: AsyncEngine) -> None:
    """Dos conexiones reales: A atiende la comanda sin confirmar; B cancela el ítem y debe
    **esperar** (el trigger lee la comanda con `FOR SHARE`) y, al confirmar A, fallar."""
    sufijo = uuid.uuid4().hex[:12]
    async with motor_pruebas.begin() as c:
        r = (
            await c.execute(
                text("INSERT INTO restaurante (nombre, slug) VALUES ('R', :s) RETURNING id"),
                {"s": f"carrera-{sufijo}"},
            )
        ).scalar_one()
        m = (
            await c.execute(
                text(
                    "INSERT INTO mesa (restaurante_id, numero, codigo_publico) "
                    "VALUES (:r, 1, :c) RETURNING id"
                ),
                {"r": r, "c": f"carrera-{sufijo}-xxxxxxxxxx"},
            )
        ).scalar_one()
        pr = (
            await c.execute(
                text(
                    "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
                    "VALUES (:r, 'Marisol', :h) RETURNING id"
                ),
                {"r": r, "h": PIN_HASH},
            )
        ).scalar_one()

    async def preparar() -> dict[str, Any]:
        async with AsyncSession(motor_pruebas) as s:
            async with s.begin():
                restaurante = await s.get(Restaurante, r)
                mesa = await s.get(Mesa, m)
                assert restaurante is not None and mesa is not None
                return await _orden_confirmada(s, restaurante, mesa)

    datos = await preparar()
    try:
        async with motor_pruebas.connect() as a, motor_pruebas.connect() as b:
            await a.begin()
            await a.execute(
                text("UPDATE comanda SET estado = 'atendida', atendida_en = now() WHERE id = :c"),
                {"c": datos["comanda"]},
            )
            await b.begin()
            pid_b = (await b.execute(text("SELECT pg_backend_pid()"))).scalar_one()
            cancelacion = asyncio.create_task(
                b.execute(
                    text(CANCELAR),
                    {"i": datos["item"], "pr": pr},
                )
            )
            async with motor_pruebas.connect() as mira:
                for _ in range(100):
                    espera = (
                        await mira.execute(
                            text("SELECT wait_event_type FROM pg_stat_activity WHERE pid = :p"),
                            {"p": pid_b},
                        )
                    ).scalar_one_or_none()
                    if espera == "Lock":
                        break
                    await asyncio.sleep(0.02)
                assert espera == "Lock", "la cancelación no esperó a la comanda"
            await a.commit()
            with pytest.raises(IntegrityError):
                await cancelacion
            await b.rollback()
    finally:
        async with motor_pruebas.begin() as c:
            # Una orden confirmada no se borra (INV-3): se desbloquea antes de limpiar.
            await c.execute(
                text(
                    "UPDATE orden_personal SET estado = 'armando', bloqueada = false WHERE id = :o"
                ),
                {"o": datos["orden"]},
            )
            await c.execute(text("DELETE FROM sesion_grupal WHERE restaurante_id = :r"), {"r": r})
            await c.execute(text("DELETE FROM restaurante WHERE id = :r"), {"r": r})


# ---------------------------------------------------------------------------
# AC-35.5 y AC-35.2 · las marcas de tiempo
# ---------------------------------------------------------------------------

DATOS_DEL_COMENSAL = (
    "alias",
    "nombre",
    "ip",
    "cookie",
    "user_agent",
    "telefono",
    "correo",
    "email",
)


@pytest.mark.ac("AC-35.5")
async def test_las_marcas_de_tiempo_no_guardan_nada_del_comensal(sesion: AsyncSession) -> None:
    columnas = {
        fila[0]
        for fila in await sesion.execute(
            text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'marca_ciclo'"
            )
        )
    }
    assert columnas == {
        "id",
        "restaurante_id",
        "sesion_id",
        "miembro_id",
        "comanda_id",
        "paso",
        "autor",
        "autor_personal_id",
        "autor_usuario_id",
        "ocurrido_en",
    }
    assert not [c for c in columnas for dato in DATOS_DEL_COMENSAL if dato in c]


async def test_una_marca_de_tiempo_no_se_sobrescribe(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> None:
    s = await _uno(
        sesion,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id",
        m=mesa.id,
        r=restaurante.id,
    )
    persona = PersonalRestaurante(
        restaurante_id=restaurante.id, nombre="Marisol", pin_hash=PIN_HASH
    )
    sesion.add(persona)
    await sesion.flush()
    marca = await _uno(
        sesion,
        "INSERT INTO marca_ciclo (restaurante_id, sesion_id, paso, autor, autor_personal_id) "
        "VALUES (:r, :s, 'cuenta_cerrada_mesa', 'personal', :p) RETURNING id",
        r=restaurante.id,
        s=s,
        p=persona.id,
    )
    await _falla(
        sesion,
        "UPDATE marca_ciclo SET ocurrido_en = now() - interval '1 hour' WHERE id = :m",
        m=marca,
    )
    await _falla(sesion, "UPDATE marca_ciclo SET paso = 'mesa_limpia' WHERE id = :m", m=marca)
    # Ni borrar el autor ni la marca a mano (ronda de revisión de T-3.0, B2).
    await _falla(sesion, "UPDATE marca_ciclo SET autor_personal_id = NULL WHERE id = :m", m=marca)
    await _falla(sesion, "DELETE FROM marca_ciclo WHERE id = :m", m=marca)
    # Lo único admitido es la cascada: borrar a la persona deja la marca sin autor (FK
    # `SET NULL`) y purgar la sesión (03 §7) se lleva sus marcas.
    await sesion.execute(text("DELETE FROM personal_restaurante WHERE id = :p"), {"p": persona.id})
    autor = (
        await sesion.execute(
            text("SELECT autor, autor_personal_id FROM marca_ciclo WHERE id = :m"), {"m": marca}
        )
    ).one()
    assert tuple(autor) == ("personal", None)
    await sesion.execute(text("DELETE FROM sesion_grupal WHERE id = :s"), {"s": s})
    assert (
        await sesion.execute(text("SELECT count(*) FROM marca_ciclo WHERE id = :m"), {"m": marca})
    ).scalar_one() == 0


@pytest.mark.parametrize("autor", ["personal", "operador"])
async def test_una_marca_del_personal_o_del_operador_nace_con_autor(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa, autor: str
) -> None:
    """ADR-017 punto 11: «quién y cuándo» en toda transición (ronda de revisión, B2)."""
    s = await _uno(
        sesion,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id",
        m=mesa.id,
        r=restaurante.id,
    )
    await _falla(
        sesion,
        "INSERT INTO marca_ciclo (restaurante_id, sesion_id, paso, autor) "
        "VALUES (:r, :s, 'mesa_limpia', :a)",
        r=restaurante.id,
        s=s,
        a=autor,
    )
    # El comensal y el sistema no llevan autor.
    for anonimo in ("comensal", "sistema"):
        await sesion.execute(
            text(
                "INSERT INTO marca_ciclo (restaurante_id, sesion_id, paso, autor) "
                "VALUES (:r, :s, 'pago_avisado', :a)"
            ),
            {"r": restaurante.id, "s": s, "a": anonimo},
        )


async def test_cancelar_un_item_exige_quien_y_el_autor_solo_lo_borra_una_cascada(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> None:
    """ADR-017 punto 11 (ronda de revisión de T-3.0, B2): sin autor no hay cancelación, ni en
    una orden confirmada ni en una que se arma; el autor sólo desaparece si se borra la persona
    (la FK `SET NULL`, en cascada), nunca a mano."""
    datos = await _orden_confirmada(sesion, restaurante, mesa)
    persona = PersonalRestaurante(
        restaurante_id=restaurante.id, nombre="Marisol", pin_hash=PIN_HASH
    )
    sesion.add(persona)
    await sesion.flush()
    i = datos["item"]
    await _falla(
        sesion,
        "UPDATE item_orden SET estado = 'cancelado_personal', cancelado_en = now() WHERE id = :i",
        i=i,
    )
    await sesion.execute(text(CANCELAR), {"i": i, "pr": persona.id})
    await _falla(
        sesion, "UPDATE item_orden SET cancelado_por_personal_id = NULL WHERE id = :i", i=i
    )
    await sesion.execute(text("DELETE FROM personal_restaurante WHERE id = :p"), {"p": persona.id})
    fila = (
        await sesion.execute(
            text("SELECT estado, cancelado_por_personal_id FROM item_orden WHERE id = :i"),
            {"i": i},
        )
    ).one()
    assert tuple(fila) == ("cancelado_personal", None)

    # En una orden que se arma tampoco se cancela sin autor (ni se inserta ya cancelado).
    s = await _uno(
        sesion,
        "SELECT sesion_id FROM orden_personal WHERE id = :o",
        o=datos["orden"],
    )
    mb = await _uno(sesion, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=s)
    o = await _uno(
        sesion,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=s,
        mb=mb,
    )
    platillo = await _uno(sesion, "SELECT platillo_id FROM item_orden WHERE id = :i", i=i)
    libre = await _uno(
        sesion,
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p, 90, 90) RETURNING id",
        o=o,
        p=platillo,
    )
    await _falla(
        sesion,
        "UPDATE item_orden SET estado = 'cancelado_personal', cancelado_en = now() WHERE id = :i",
        i=libre,
    )
    await _falla(
        sesion,
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal, estado, "
        "cancelado_en) VALUES (:o, :p, 90, 90, 'cancelado_personal', now())",
        o=o,
        p=platillo,
    )


@pytest.mark.ac("AC-35.2")
async def test_una_marca_no_se_inventa_con_otra_hora(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> None:
    """B9: «sin sobrescribir» también es «sin inventar»: la hora de una marca es la de la
    transacción que la escribe, aunque quien la escribe traiga otra."""
    s = await _uno(
        sesion,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id",
        m=mesa.id,
        r=restaurante.id,
    )
    marca = await _uno(
        sesion,
        "INSERT INTO marca_ciclo (restaurante_id, sesion_id, paso, autor, ocurrido_en) "
        "VALUES (:r, :s, 'primer_escaneo', 'sistema', now() - interval '3 days') RETURNING id",
        r=restaurante.id,
        s=s,
    )
    igual = await _uno(sesion, "SELECT ocurrido_en = now() FROM marca_ciclo WHERE id = :m", m=marca)
    assert igual is True


async def test_borrar_al_usuario_que_cancelo_deja_el_item_sin_autor(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> None:
    """B7: la FK `SET NULL` del operador que canceló funciona en una orden confirmada."""
    datos = await _orden_confirmada(sesion, restaurante, mesa)
    usuario = await _uno(
        sesion,
        "INSERT INTO usuario (firebase_uid, provider) VALUES (:u, 'google') RETURNING id",
        u=f"cancela-{datos['item'].hex}",
    )
    await sesion.execute(
        text(
            "INSERT INTO operador_restaurante (usuario_id, restaurante_id, rol) "
            "VALUES (:u, :r, 'propietario')"
        ),
        {"u": usuario, "r": restaurante.id},
    )
    await sesion.execute(
        text(
            "UPDATE item_orden SET estado = 'cancelado_personal', cancelado_en = now(), "
            "cancelado_por_usuario_id = :u WHERE id = :i"
        ),
        {"u": usuario, "i": datos["item"]},
    )
    await _falla(
        sesion,
        "UPDATE item_orden SET cancelado_por_usuario_id = NULL WHERE id = :i",
        i=datos["item"],
    )
    await sesion.execute(text("DELETE FROM usuario WHERE id = :u"), {"u": usuario})
    autor = await _uno(
        sesion, "SELECT cancelado_por_usuario_id FROM item_orden WHERE id = :i", i=datos["item"]
    )
    assert autor is None


async def test_una_cancelacion_no_se_reescribe(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> None:
    """B12: un ítem ya cancelado no cambia de autor ni de hora (ADR-017 punto 11: quién y
    cuándo, sin sobrescribir). Ni cambiando ambos ni sólo la hora."""
    datos = await _orden_confirmada(sesion, restaurante, mesa)
    a = PersonalRestaurante(restaurante_id=restaurante.id, nombre="Marisol", pin_hash=PIN_HASH)
    b = PersonalRestaurante(restaurante_id=restaurante.id, nombre="Ernesto", pin_hash=PIN_HASH)
    sesion.add_all([a, b])
    await sesion.flush()
    await sesion.execute(text(CANCELAR), {"i": datos["item"], "pr": a.id})
    await _falla(
        sesion,
        "UPDATE item_orden SET cancelado_en = now() + interval '1 minute', "
        "cancelado_por_personal_id = :b WHERE id = :i",
        b=b.id,
        i=datos["item"],
    )
    await _falla(
        sesion,
        "UPDATE item_orden SET cancelado_en = now() - interval '1 hour' WHERE id = :i",
        i=datos["item"],
    )
    await _falla(sesion, CANCELAR, i=datos["item"], pr=b.id)
