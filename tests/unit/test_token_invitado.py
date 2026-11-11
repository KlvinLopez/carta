"""T-2.1: token de invitado (AC-01.2). JWT HS256 de 6 h en la cookie `carta_invitado`; nada
personal dentro; cualquier manipulación es 401 con la envoltura y sin pistas."""

from __future__ import annotations

import base64
import json
import warnings
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
import pytest
from fastapi import Response

from app.core.config import settings
from app.core.errores import ErrorCarta
from app.core.seguridad import (
    Invitado,
    emitir_token_invitado,
    poner_cookie_invitado,
    verificar_token_invitado,
)

INVITADO = Invitado(miembro_id=uuid4(), sesion_id=uuid4(), restaurante_id=uuid4())


def _carga(token: str) -> dict[str, object]:
    return jwt.decode(token, options={"verify_signature": False})


def _codigo(token: str) -> str:
    with pytest.raises(ErrorCarta) as error:
        verificar_token_invitado(token)
    assert error.value.http == 401
    return error.value.codigo


@pytest.mark.ac("AC-01.2")
def test_el_token_identifica_al_invitado_y_dura_seis_horas() -> None:
    ahora = datetime.now(UTC)
    token = emitir_token_invitado(INVITADO, ahora=ahora)
    assert verificar_token_invitado(token) == INVITADO
    carga = _carga(token)
    assert carga["exp"] - carga["iat"] == 6 * 3600  # type: ignore[operator]
    assert jwt.get_unverified_header(token)["alg"] == "HS256"


@pytest.mark.ac("AC-01.2")
def test_el_token_no_lleva_datos_personales() -> None:
    """Sólo ids opacos, emisor, audiencia y vigencia (regla dura 10)."""
    assert set(_carga(emitir_token_invitado(INVITADO))) == {
        "iss",
        "aud",
        "sub",
        "sid",
        "rid",
        "iat",
        "exp",
    }


@pytest.mark.ac("AC-01.2")
def test_un_token_vencido_es_token_expirado() -> None:
    hace_siete_horas = datetime.now(UTC) - timedelta(hours=7)
    assert _codigo(emitir_token_invitado(INVITADO, ahora=hace_siete_horas)) == "TOKEN_EXPIRADO"


@pytest.mark.ac("AC-01.2")
def test_un_token_de_hace_cinco_horas_sigue_valiendo() -> None:
    hace_cinco_horas = datetime.now(UTC) - timedelta(hours=5, minutes=59)
    token = emitir_token_invitado(INVITADO, ahora=hace_cinco_horas)
    assert verificar_token_invitado(token) == INVITADO


def _con_carga(token: str, **cambios: object) -> str:
    """El mismo token con la carga cambiada y la firma original (manipulación)."""
    cabecera, carga, firma = token.split(".")
    datos = json.loads(base64.urlsafe_b64decode(carga + "=" * (-len(carga) % 4)))
    datos.update(cambios)
    nueva = base64.urlsafe_b64encode(json.dumps(datos).encode()).rstrip(b"=").decode()
    return f"{cabecera}.{nueva}.{firma}"


@pytest.mark.ac("AC-01.2")
def test_un_token_manipulado_es_401() -> None:
    token = emitir_token_invitado(INVITADO)
    assert _codigo(_con_carga(token, sid=str(uuid4()))) == "TOKEN_INVALIDO"
    assert _codigo(_con_carga(token, rid=str(uuid4()))) == "TOKEN_INVALIDO"
    cabecera, carga, firma = token.split(".")
    otra_firma = ("A" if firma[0] != "A" else "B") + firma[1:]
    assert _codigo(f"{cabecera}.{carga}.{otra_firma}") == "TOKEN_INVALIDO"


@pytest.mark.parametrize(
    "token",
    ["", "basura", "a.b.c", "x" * 2000, "eyJhbGciOiJIUzI1NiJ9.e30."],
    ids=["vacio", "basura", "tres-partes", "enorme", "sin-firma"],
)
def test_un_token_mal_formado_es_401(token: str) -> None:
    assert _codigo(token) == "TOKEN_INVALIDO"


def _firmar(carga: dict[str, object], llave: str | None = None, alg: str = "HS256") -> str:
    return jwt.encode(carga, llave or settings.SECRET_KEY, algorithm=alg)


def _carga_valida(**cambios: object) -> dict[str, object]:
    ahora = int(datetime.now(UTC).timestamp())
    carga: dict[str, object] = {
        "iss": "carta",
        "aud": "carta:invitado",
        "sub": str(INVITADO.miembro_id),
        "sid": str(INVITADO.sesion_id),
        "rid": str(INVITADO.restaurante_id),
        "iat": ahora,
        "exp": ahora + 3600,
    }
    carga.update(cambios)
    return {k: v for k, v in carga.items() if v is not None}


def test_la_carga_de_referencia_es_valida() -> None:
    """Contraprueba: las variantes de abajo fallan por su cambio, no por la carga base."""
    assert verificar_token_invitado(_firmar(_carga_valida())) == INVITADO


@pytest.mark.parametrize(
    "cambios",
    [
        {"aud": "carta:personal"},
        {"aud": None},
        {"iss": "otro"},
        {"sub": None},
        {"sid": None},
        {"rid": None},
        {"exp": None},
        {"iat": None},
        {"sub": "no-es-uuid"},
        {"rid": 7},
    ],
    ids=lambda c: ",".join(f"{k}={v}" for k, v in c.items()),
)
def test_un_token_de_otra_audiencia_o_incompleto_es_401(cambios: dict[str, object]) -> None:
    assert _codigo(_firmar(_carga_valida(**cambios))) == "TOKEN_INVALIDO"


def test_un_token_firmado_con_otra_llave_es_401() -> None:
    otra = "otra-llave-de-al-menos-treinta-y-dos-caracteres"
    assert _codigo(_firmar(_carga_valida(), llave=otra)) == "TOKEN_INVALIDO"


def test_alg_none_u_otro_algoritmo_es_401() -> None:
    sin_firma = jwt.encode(_carga_valida(), key=None, algorithm="none")
    assert _codigo(sin_firma) == "TOKEN_INVALIDO"
    with warnings.catch_warnings():  # la llave de pruebas es corta para HS512; da igual aquí
        warnings.simplefilter("ignore")
        otro_algoritmo = _firmar(_carga_valida(), alg="HS512")
    assert _codigo(otro_algoritmo) == "TOKEN_INVALIDO"


@pytest.mark.ac("AC-01.2", "AC-01.5")
def test_la_cookie_es_httponly_secure_lax_de_seis_horas() -> None:
    respuesta = Response()
    poner_cookie_invitado(respuesta, "tok")
    cookie = respuesta.headers["set-cookie"]
    partes = {p.strip().split("=")[0].lower(): p.strip() for p in cookie.split(";")}
    assert partes["carta_invitado"] == "carta_invitado=tok"
    assert partes["max-age"] == "Max-Age=21600"
    assert partes["path"] == "Path=/api/v1/p"
    assert partes["samesite"].lower() == "samesite=lax"
    assert "httponly" in partes
    assert "secure" in partes
    assert "domain" not in partes  # de primera parte, sólo este host (AC-01.5)


def test_el_invitado_es_inmutable() -> None:
    with pytest.raises(AttributeError):
        INVITADO.sesion_id = UUID(int=0)  # type: ignore[misc]
