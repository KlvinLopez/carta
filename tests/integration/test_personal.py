"""T-1.6: personal y PIN del operador (US-26, INV-7, AC-26.1, AC-26.3).

Rutas reales de `/api/v1/admin`: alta con PIN de 4 a 6 dígitos (sólo se guarda su hash
Argon2id), listar, editar, dar de baja / reactivar y reasignar el PIN. La baja revoca la
sesión de la persona (AC-26.3): la cookie de la Fase 3 (T-3.4) todavía no existe, así que se
prueba la base sobre la que se apoyará: `personal_por_id_activo`, `sesion_vigente` y el sello
`sesiones_desde`. Marcadores: INV-7 → AC-26.1 (T-1.1), baja y revocación → AC-26.3.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PersonalRestaurante, Restaurante, RolPersonal, Usuario
from app.schemas.comun import ErrorRespuesta
from app.schemas.personal import PersonalCrear, PinNuevo
from app.services import personal as servicio
from tests.auth_pruebas import cabecera_de
from tests.conftest import Fabrica

A = "/api/v1/admin"
UUID_X = "00000000-0000-4000-8000-0000000000aa"
PIN = "739518"  # distinto de cualquier otro dato de la prueba: se busca en filas, logs y cuerpos
CLAVES_RESPUESTA = {"id", "nombre", "rol", "activo", "ultimo_acceso_en", "creado_en"}


def _codigo(respuesta: httpx.Response) -> str:
    codigo: str = ErrorRespuesta.model_validate(respuesta.json()).error.codigo
    return codigo


def _sin_id(respuesta: httpx.Response) -> dict[str, Any]:
    cuerpo: dict[str, Any] = respuesta.json()
    cuerpo["error"].pop("request_id", None)
    return cuerpo


async def _alta(
    cliente: AsyncClient, rid: UUID, cabecera: dict[str, str], **cuerpo: Any
) -> httpx.Response:
    datos = {"nombre": "Ana", "pin": PIN} | cuerpo
    return await cliente.post(f"{A}/restaurantes/{rid}/personal", json=datos, headers=cabecera)


@pytest.fixture
async def ajeno(fabrica_restaurante: Fabrica, fabrica_operador: Fabrica) -> Restaurante:
    restaurante: Restaurante = await fabrica_restaurante()
    await fabrica_operador(restaurante)
    return restaurante


# ===========================================================================
# INV-7 · el PIN nunca se guarda, se devuelve ni se registra
# ===========================================================================


@pytest.mark.ac("AC-26.1")
async def test_el_alta_guarda_solo_el_hash_argon2id_y_no_devuelve_el_pin(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
) -> None:
    respuesta = await _alta(cliente, restaurante.id, cabecera_operador, rol="capitan")
    assert respuesta.status_code == 201, respuesta.text
    cuerpo = respuesta.json()
    assert set(cuerpo) == CLAVES_RESPUESTA
    assert (cuerpo["nombre"], cuerpo["rol"], cuerpo["activo"]) == ("Ana", "capitan", True)
    assert PIN not in respuesta.text

    fila = await sesion.get(PersonalRestaurante, UUID(cuerpo["id"]))
    assert fila is not None
    await sesion.refresh(fila)
    assert fila.restaurante_id == restaurante.id
    # Argon2id con los parámetros documentados (m = 64 MiB, t = 3, p = 4) y sal propia.
    assert fila.pin_hash.startswith("$argon2id$v=19$m=65536,t=3,p=4$")
    assert PIN not in fila.pin_hash
    assert (fila.intentos_fallidos, fila.bloqueado_hasta, fila.ultimo_acceso_en) == (0, None, None)
    # Ningún campo de texto de la fila contiene el PIN.
    assert PIN not in repr(fila)
    assert PIN not in " ".join(str(v) for v in vars(fila).values() if not str(v).startswith("<"))
    assert await servicio.verificar_pin(fila.pin_hash, PIN) is True
    assert await servicio.verificar_pin(fila.pin_hash, "000000") is False
    assert await servicio.verificar_pin("no-es-un-hash", PIN) is False


@pytest.mark.ac("AC-26.1")
async def test_el_mismo_pin_de_dos_personas_da_hashes_distintos(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
) -> None:
    for nombre in ("Ana", "Luis"):
        assert (
            await _alta(cliente, restaurante.id, cabecera_operador, nombre=nombre)
        ).status_code == 201
    hashes = (await sesion.scalars(select(PersonalRestaurante.pin_hash))).all()
    assert len(hashes) == len(set(hashes)) == 2


@pytest.mark.ac("AC-26.1")
async def test_ni_el_log_ni_los_errores_ni_el_repr_contienen_el_pin(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG)
    cuerpos: list[str] = []
    alta = await _alta(cliente, restaurante.id, cabecera_operador)
    repetida = await _alta(cliente, restaurante.id, cabecera_operador)  # 409
    corto = await _alta(cliente, restaurante.id, cabecera_operador, nombre="Eva", pin="73")  # 422
    largo = await _alta(cliente, restaurante.id, cabecera_operador, nombre="Eva", pin=PIN + "99")
    nuevo = await cliente.post(
        f"{A}/personal/{alta.json()['id']}/pin", json={"pin": PIN[::-1]}, headers=cabecera_operador
    )
    malo = await cliente.post(
        f"{A}/personal/{alta.json()['id']}/pin", json={"pin": "x" + PIN}, headers=cabecera_operador
    )
    assert [r.status_code for r in (alta, repetida, corto, largo, nuevo, malo)] == [
        201,
        409,
        422,
        422,
        204,
        422,
    ]
    cuerpos = [r.text for r in (alta, repetida, corto, largo, nuevo, malo)]
    assert caplog.records, "la captura de logs no funcionó"
    for texto in (*cuerpos, caplog.text):
        assert PIN not in texto
        assert PIN[::-1] not in texto
    assert PIN not in repr(PersonalCrear(nombre="Ana", pin=PIN))
    assert PIN not in str(PinNuevo(pin=PIN))
    assert PIN not in repr(PersonalCrear(nombre="Ana", pin=PIN).model_dump_json(exclude={"pin"}))


# ===========================================================================
# AC-26.1 · PIN de 4 a 6 dígitos
# ===========================================================================


@pytest.mark.ac("AC-26.1")
@pytest.mark.parametrize("pin", ["0123", "0000", "123456", "000000", "98765"])
async def test_pin_de_4_a_6_digitos_vale_aunque_empiece_en_cero(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str], pin: str
) -> None:
    respuesta = await _alta(cliente, restaurante.id, cabecera_operador, pin=pin)
    assert respuesta.status_code == 201, respuesta.text


@pytest.mark.ac("AC-26.1")
@pytest.mark.parametrize(
    "pin",
    ["123", "1234567", "", "12a4", " 1234", "1234 ", "1234\n", "12.4", "-123", "١٢٣٤", "１２３４"]
    + [1234, None, ["1234"]],
)
async def test_pin_mal_formado_es_422_con_el_campo_y_sin_repetirlo(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
    pin: Any,
) -> None:
    respuesta = await _alta(cliente, restaurante.id, cabecera_operador, pin=pin)
    assert respuesta.status_code == 422, (pin, respuesta.text)
    assert _codigo(respuesta) == "PAYLOAD_INVALIDO"
    assert respuesta.json()["error"]["detalles"]["errores"][0]["campo"] == "body.pin"
    assert "input" not in respuesta.text
    assert await sesion.scalar(select(func.count()).select_from(PersonalRestaurante)) == 0


@pytest.mark.ac("AC-26.1")
async def test_pin_nuevo_mal_formado_es_422_y_no_cambia_nada(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    sesion: AsyncSession,
) -> None:
    persona = await fabrica_personal(restaurante)
    antes = persona.pin_hash
    for pin in ("123", "1234567", "abcd"):
        respuesta = await cliente.post(
            f"{A}/personal/{persona.id}/pin", json={"pin": pin}, headers=cabecera_operador
        )
        assert respuesta.status_code == 422
    await sesion.refresh(persona)
    assert persona.pin_hash == antes


@pytest.mark.ac("AC-26.1")
async def test_el_cuerpo_no_admite_campos_desconocidos(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    ajeno: Restaurante,
) -> None:
    """`restaurante_id`, `pin_hash` o `activo` en el alta son 422, no se ignoran (B2 de T-1.2)."""
    for extra in (
        {"restaurante_id": str(ajeno.id)},
        {"pin_hash": "$argon2id$x"},
        {"activo": False},
    ):
        respuesta = await _alta(cliente, restaurante.id, cabecera_operador, **extra)
        assert respuesta.status_code == 422, extra
    persona = await fabrica_personal(restaurante)
    for ruta, cuerpo in (
        (f"{A}/personal/{persona.id}", {"restaurante_id": str(ajeno.id)}),
        (f"{A}/personal/{persona.id}", {"pin": PIN}),
        (f"{A}/personal/{persona.id}/pin", {"pin": PIN, "activo": True}),
    ):
        enviar = cliente.patch if ruta.endswith(str(persona.id)) else cliente.post
        assert (await enviar(ruta, json=cuerpo, headers=cabecera_operador)).status_code == 422


# ===========================================================================
# Listar
# ===========================================================================


@pytest.mark.ac("AC-26.1")
async def test_listar_activos_primero_por_nombre_sin_pin_ni_intentos(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    ajeno: Restaurante,
) -> None:
    await fabrica_personal(restaurante, nombre="Zoe")
    await fabrica_personal(restaurante, nombre="beto", rol=RolPersonal.capitan)
    await fabrica_personal(restaurante, nombre="Ana", activo=False)
    await fabrica_personal(ajeno, nombre="Ajena")
    respuesta = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/personal", headers=cabecera_operador
    )
    assert respuesta.status_code == 200
    assert [p["nombre"] for p in respuesta.json()] == ["beto", "Zoe", "Ana"]
    assert all(set(p) == CLAVES_RESPUESTA for p in respuesta.json())
    assert "pin" not in respuesta.text and "argon2" not in respuesta.text
    activos = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/personal?activo=true", headers=cabecera_operador
    )
    assert [p["nombre"] for p in activos.json()] == ["beto", "Zoe"]
    bajas = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/personal?activo=false", headers=cabecera_operador
    )
    assert [p["nombre"] for p in bajas.json()] == ["Ana"]


# ===========================================================================
# Nombre único entre los activos
# ===========================================================================


@pytest.mark.ac("AC-26.1")
async def test_nombre_repetido_entre_activos_es_409_sin_importar_mayusculas_ni_espacios(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
) -> None:
    assert (
        await _alta(cliente, restaurante.id, cabecera_operador, nombre="Ana")
    ).status_code == 201
    for nombre in ("Ana", "  ana  ", "ANA"):
        repetida = await _alta(cliente, restaurante.id, cabecera_operador, nombre=nombre)
        assert repetida.status_code == 409, nombre
        assert _codigo(repetida) == "CONFLICTO"
        assert repetida.json()["error"]["mensaje"] == servicio.MENSAJE_NOMBRE_REPETIDO
    assert await sesion.scalar(select(func.count()).select_from(PersonalRestaurante)) == 1
    # El mismo nombre en otro restaurante no choca.
    otro = await _alta(cliente, restaurante.id, cabecera_operador, nombre="Ana Luisa")
    assert otro.status_code == 201


@pytest.mark.ac("AC-26.3")
async def test_se_puede_recontratar_el_nombre_de_una_baja_y_reactivar_la_vieja_choca(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
) -> None:
    vieja = await fabrica_personal(restaurante, nombre="Ana", activo=False)
    nueva = await _alta(cliente, restaurante.id, cabecera_operador, nombre="Ana")
    assert nueva.status_code == 201  # regla dura 9: la baja no ocupa el nombre
    reactivar = await cliente.patch(
        f"{A}/personal/{vieja.id}", json={"activo": True}, headers=cabecera_operador
    )
    assert reactivar.status_code == 409
    assert _codigo(reactivar) == "CONFLICTO"


@pytest.mark.ac("AC-26.1")
async def test_renombrar_a_un_nombre_ocupado_es_409_y_no_cambia_nada(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    sesion: AsyncSession,
) -> None:
    await fabrica_personal(restaurante, nombre="Ana")
    luis = await fabrica_personal(restaurante, nombre="Luis")
    respuesta = await cliente.patch(
        f"{A}/personal/{luis.id}",
        json={"nombre": " ana", "rol": "capitan"},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 409
    await sesion.refresh(luis)
    assert (luis.nombre, luis.rol) == ("Luis", RolPersonal.mesero)


# ===========================================================================
# Editar
# ===========================================================================


@pytest.mark.ac("AC-26.1")
async def test_editar_nombre_y_rol(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
) -> None:
    persona = await fabrica_personal(restaurante, nombre="Ana")
    respuesta = await cliente.patch(
        f"{A}/personal/{persona.id}",
        json={"nombre": "  Ana María ", "rol": "capitan"},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 200, respuesta.text
    assert (respuesta.json()["nombre"], respuesta.json()["rol"]) == ("Ana María", "capitan")
    assert set(respuesta.json()) == CLAVES_RESPUESTA
    vacio = await cliente.patch(f"{A}/personal/{persona.id}", json={}, headers=cabecera_operador)
    assert vacio.status_code == 200
    assert vacio.json()["nombre"] == "Ana María"


@pytest.mark.ac("AC-26.1")
@pytest.mark.parametrize("nombre", ["", "   ", "x" * 61, "Ana\x00", "​"])
async def test_nombre_invalido_es_422(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    nombre: str,
) -> None:
    persona = await fabrica_personal(restaurante)
    assert (
        await _alta(cliente, restaurante.id, cabecera_operador, nombre=nombre)
    ).status_code == 422
    cambio = await cliente.patch(
        f"{A}/personal/{persona.id}", json={"nombre": nombre}, headers=cabecera_operador
    )
    assert cambio.status_code == 422


# ===========================================================================
# AC-26.3 · desactivar revoca
# ===========================================================================


@pytest.mark.ac("AC-26.3")
async def test_desactivar_es_baja_logica_y_revoca_la_sesion_al_instante(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    sesion: AsyncSession,
) -> None:
    persona = await fabrica_personal(restaurante)
    emitida = datetime.now(UTC)  # una cookie de 12 h emitida antes de la baja
    assert await servicio.personal_por_id_activo(sesion, restaurante.id, persona.id) is not None
    await sesion.refresh(persona)
    assert servicio.sesion_vigente(persona, emitida) is True

    respuesta = await cliente.patch(
        f"{A}/personal/{persona.id}", json={"activo": False}, headers=cabecera_operador
    )
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["activo"] is False
    await sesion.refresh(persona)
    assert persona.activo is False  # la fila sigue: sin borrado físico (regla dura 9)
    assert await servicio.personal_por_id_activo(sesion, restaurante.id, persona.id) is None
    assert servicio.sesion_vigente(persona, emitida) is False
    assert persona.sesiones_desde > emitida


@pytest.mark.ac("AC-26.3")
async def test_reactivar_no_resucita_las_sesiones_anteriores(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    sesion: AsyncSession,
) -> None:
    persona = await fabrica_personal(restaurante)
    emitida = datetime.now(UTC)
    ruta = f"{A}/personal/{persona.id}"
    assert (
        await cliente.patch(ruta, json={"activo": False}, headers=cabecera_operador)
    ).status_code == 200
    assert (await cliente.patch(ruta, json={"activo": True}, headers=cabecera_operador)).json()[
        "activo"
    ] is True
    await sesion.refresh(persona)
    assert await servicio.personal_por_id_activo(sesion, restaurante.id, persona.id) is not None
    assert servicio.sesion_vigente(persona, emitida) is False  # la cookie vieja sigue muerta
    # Una cookie emitida en o después del sello vale; un microsegundo antes, no.
    assert servicio.sesion_vigente(persona, persona.sesiones_desde) is True
    assert (
        servicio.sesion_vigente(persona, persona.sesiones_desde - timedelta(microseconds=1))
        is False
    )


@pytest.mark.ac("AC-26.3")
async def test_cambiar_el_rol_revoca_pero_renombrar_o_repetir_el_estado_no(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    sesion: AsyncSession,
) -> None:
    persona = await fabrica_personal(restaurante, rol=RolPersonal.capitan)
    ruta = f"{A}/personal/{persona.id}"
    sello = persona.sesiones_desde
    for cambio in ({"nombre": "Otra"}, {"rol": "capitan"}, {"activo": True}):
        assert (
            await cliente.patch(ruta, json=cambio, headers=cabecera_operador)
        ).status_code == 200
        await sesion.refresh(persona)
        assert persona.sesiones_desde == sello, cambio
    # Capitán → mesero: la cookie vigente lleva el rol anterior, así que se revoca.
    assert (
        await cliente.patch(ruta, json={"rol": "mesero"}, headers=cabecera_operador)
    ).status_code == 200
    await sesion.refresh(persona)
    assert persona.sesiones_desde > sello


# ===========================================================================
# Reasignar el PIN
# ===========================================================================


@pytest.mark.ac("AC-26.3")
async def test_reasignar_el_pin_cambia_el_hash_revoca_y_limpia_el_bloqueo(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    sesion: AsyncSession,
) -> None:
    persona = await fabrica_personal(
        restaurante,
        intentos_fallidos=5,
        bloqueado_hasta=datetime.now(UTC) + timedelta(minutes=30),
    )
    antes, sello, emitida = persona.pin_hash, persona.sesiones_desde, datetime.now(UTC)
    respuesta = await cliente.post(
        f"{A}/personal/{persona.id}/pin", json={"pin": PIN}, headers=cabecera_operador
    )
    assert respuesta.status_code == 204
    assert respuesta.content == b""
    await sesion.refresh(persona)
    assert persona.pin_hash != antes and PIN not in persona.pin_hash
    assert persona.pin_hash.startswith("$argon2id$")
    assert await servicio.verificar_pin(persona.pin_hash, PIN) is True
    assert await servicio.verificar_pin(persona.pin_hash, "1234") is False
    assert (persona.intentos_fallidos, persona.bloqueado_hasta) == (0, None)
    assert persona.sesiones_desde > sello
    assert servicio.sesion_vigente(persona, emitida) is False
    assert persona.activo is True


@pytest.mark.ac("AC-26.3")
async def test_reasignar_el_pin_de_una_baja_no_la_reactiva(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    sesion: AsyncSession,
) -> None:
    persona = await fabrica_personal(restaurante, activo=False)
    respuesta = await cliente.post(
        f"{A}/personal/{persona.id}/pin", json={"pin": PIN}, headers=cabecera_operador
    )
    assert respuesta.status_code == 204
    await sesion.refresh(persona)
    assert persona.activo is False
    assert await servicio.personal_por_id_activo(sesion, restaurante.id, persona.id) is None


# ===========================================================================
# Tope de personal activo
# ===========================================================================


@pytest.mark.ac("AC-26.1")
async def test_tope_de_personal_activo_en_alta_y_reactivacion(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(servicio, "MAX_PERSONAL_ACTIVO", 2)
    baja = await fabrica_personal(restaurante, activo=False)  # las bajas no cuentan
    assert (
        await _alta(cliente, restaurante.id, cabecera_operador, nombre="Uno")
    ).status_code == 201
    assert (
        await _alta(cliente, restaurante.id, cabecera_operador, nombre="Dos")
    ).status_code == 201
    lleno = await _alta(cliente, restaurante.id, cabecera_operador, nombre="Tres")
    assert lleno.status_code == 422
    assert lleno.json()["error"]["detalles"]["errores"][0]["tipo"] == "limite_de_personal"
    reactivar = await cliente.patch(
        f"{A}/personal/{baja.id}", json={"activo": True}, headers=cabecera_operador
    )
    assert reactivar.status_code == 422
    # Editar a alguien activo con el tope lleno sí se puede.
    persona = (
        await cliente.get(f"{A}/restaurantes/{restaurante.id}/personal", headers=cabecera_operador)
    ).json()[0]
    editar = await cliente.patch(
        f"{A}/personal/{persona['id']}", json={"rol": "capitan"}, headers=cabecera_operador
    )
    assert editar.status_code == 200


# ===========================================================================
# Aislamiento entre restaurantes (regla dura 6, AC-15.3)
# ===========================================================================


@pytest.mark.ac("AC-15.3")
async def test_personal_ajeno_e_inexistente_dan_el_mismo_404_y_no_se_toca(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    ajeno: Restaurante,
    sesion: AsyncSession,
) -> None:
    de_otro = await fabrica_personal(ajeno, nombre="Ajena")
    antes = (de_otro.nombre, de_otro.rol, de_otro.activo, de_otro.pin_hash, de_otro.sesiones_desde)
    intentos = [
        ("patch", "{}/personal/{}", {"activo": False}),
        ("patch", "{}/personal/{}", {"nombre": "Robada"}),
        ("post", "{}/personal/{}/pin", {"pin": PIN}),
    ]
    for metodo, plantilla, cuerpo in intentos:
        pedir = getattr(cliente, metodo)
        ajena = await pedir(plantilla.format(A, de_otro.id), json=cuerpo, headers=cabecera_operador)
        nula = await pedir(plantilla.format(A, UUID_X), json=cuerpo, headers=cabecera_operador)
        assert ajena.status_code == nula.status_code == 404, (metodo, cuerpo)
        assert _sin_id(ajena) == _sin_id(nula)
        assert _codigo(ajena) == "RECURSO_NO_ENCONTRADO"
    ruta_otro = f"{A}/restaurantes/{ajeno.id}/personal"
    ruta_nula = f"{A}/restaurantes/{UUID_X}/personal"
    assert _sin_id(await cliente.get(ruta_otro, headers=cabecera_operador)) == _sin_id(
        await cliente.get(ruta_nula, headers=cabecera_operador)
    )
    alta_ajena = await cliente.post(
        ruta_otro, json={"nombre": "Intrusa", "pin": PIN}, headers=cabecera_operador
    )
    alta_nula = await cliente.post(
        ruta_nula, json={"nombre": "Intrusa", "pin": PIN}, headers=cabecera_operador
    )
    assert alta_ajena.status_code == alta_nula.status_code == 404
    assert _sin_id(alta_ajena) == _sin_id(alta_nula)
    await sesion.refresh(de_otro)
    assert (
        de_otro.nombre,
        de_otro.rol,
        de_otro.activo,
        de_otro.pin_hash,
        de_otro.sesiones_desde,
    ) == antes
    assert await sesion.scalar(select(func.count()).select_from(PersonalRestaurante)) == 1


@pytest.mark.ac("AC-15.3")
async def test_dos_operadores_cada_uno_ve_solo_a_su_personal(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_personal: Fabrica,
    fabrica_restaurante: Fabrica,
    fabrica_operador: Fabrica,
    sesion: AsyncSession,
) -> None:
    """Un segundo operador existente tampoco ve ni toca el personal del primero."""
    propia = await fabrica_personal(restaurante, nombre="Mía")
    otro_restaurante: Restaurante = await fabrica_restaurante()
    operador_b = await fabrica_operador(otro_restaurante)
    usuario_b = await sesion.get(Usuario, operador_b.usuario_id)
    assert usuario_b is not None
    cabecera_b = cabecera_de(usuario_b.firebase_uid)
    mia = await cliente.patch(
        f"{A}/personal/{propia.id}", json={"activo": False}, headers=cabecera_b
    )
    assert mia.status_code == 404
    lista = await cliente.get(f"{A}/restaurantes/{restaurante.id}/personal", headers=cabecera_b)
    assert lista.status_code == 404
    propia_a = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/personal", headers=cabecera_operador
    )
    assert [p["nombre"] for p in propia_a.json()] == ["Mía"]


@pytest.mark.ac("AC-15.1")
async def test_sin_token_las_cuatro_rutas_son_401(cliente: AsyncClient) -> None:
    r = f"{A}/restaurantes/{UUID_X}/personal"
    p = f"{A}/personal/{UUID_X}"
    respuestas = [
        await cliente.get(r),
        await cliente.post(r, json={"nombre": "A", "pin": PIN}),
        await cliente.patch(p, json={"activo": False}),
        await cliente.post(f"{p}/pin", json={"pin": PIN}),
    ]
    assert [x.status_code for x in respuestas] == [401] * 4
    assert PIN not in "".join(x.text for x in respuestas)
