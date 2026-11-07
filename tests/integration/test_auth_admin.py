"""T-1.2: autenticación del operador y alta del restaurante (US-15).

- AC-15.1: toda ruta de `/api/v1/admin` exige el ID token; sin él, 401 con la envoltura única.
- AC-15.2: cada operador ve y toca sólo los restaurantes que tiene asignados.
- AC-15.3: un recurso de otro restaurante responde 404 (no 403), igual que uno inexistente.

El token lo verifica `VerificadorDePrueba` (`tests/auth_pruebas.py`), instalado por
`conftest.cliente`; el verificador real se prueba en `tests/unit/test_firebase.py`.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterable, Iterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

import pytest
from fastapi.routing import APIRoute
from httpx import AsyncClient, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import ejemplos
from app.core.config import settings
from app.core.firebase import obtener_verificador
from app.db.models import (
    OperadorRestaurante,
    Platillo,
    Restaurante,
    RolOperador,
    Usuario,
)
from app.main import app
from app.schemas.comun import ErrorRespuesta
from tests.auth_pruebas import cabecera_de
from tests.conftest import Fabrica
from tests.llaves_pruebas import Google, token_firmado, verificador_real

A = "/api/v1/admin"
UUID_X = "00000000-0000-4000-8000-0000000000aa"


def rutas_api(
    rutas: Iterable[Any] | None = None, prefijo: str = "", deps: tuple[Any, ...] = ()
) -> Iterator[tuple[str, APIRoute, tuple[Any, ...]]]:
    """(ruta completa, `APIRoute`, dependencias heredadas de los `include_router`).

    FastAPI 0.16x guarda los routers incluidos como `_IncludedRouter` y construye las rutas
    efectivas de forma perezosa, así que `app.routes` no trae los `APIRoute` de `/api/v1`:
    aquí se recorren por `original_router` e `include_context`. Si FastAPI cambia esa forma,
    `test_el_recorrido_cubre_el_contrato` falla en lugar de dejar pruebas vacías."""
    for ruta in app.routes if rutas is None else rutas:
        original = getattr(ruta, "original_router", None)
        if original is not None:
            contexto = ruta.include_context
            yield from rutas_api(
                original.routes, prefijo + contexto.prefix, deps + tuple(contexto.dependencies)
            )
        elif isinstance(ruta, APIRoute):
            yield prefijo + ruta.path, ruta, deps


def _rutas_admin() -> list[tuple[str, str]]:
    """(método, ruta con ids de relleno) bajo `/admin`: lo que publica `/openapi.json` más lo
    que registra la aplicación (una ruta con `include_in_schema=False` también cuenta)."""
    vistas: set[tuple[str, str]] = set()
    for ruta, operaciones in app.openapi()["paths"].items():
        if ruta.startswith(A):
            vistas |= {(metodo.upper(), ruta) for metodo in operaciones}
    for ruta, api, _ in rutas_api():
        if ruta.startswith(A):
            vistas |= {(metodo, ruta) for metodo in api.methods}
    return sorted((m, re.sub(r"\{[^}]+\}", UUID_X, r)) for m, r in vistas)


RUTAS_ADMIN = _rutas_admin()


def _error(respuesta: Response) -> dict[str, Any]:
    error: dict[str, Any] = respuesta.json()["error"]
    return error


def _es_401(respuesta: Response, codigo: str = "SIN_CREDENCIAL") -> None:
    assert respuesta.status_code == 401, respuesta.text
    assert _error(respuesta)["codigo"] == codigo
    assert respuesta.headers["cache-control"] == "no-store"
    assert respuesta.headers["x-request-id"] == _error(respuesta)["request_id"]


def _es_404(respuesta: Response) -> None:
    assert respuesta.status_code == 404, respuesta.text
    assert _error(respuesta)["codigo"] == "RECURSO_NO_ENCONTRADO"
    assert _error(respuesta)["mensaje"] == "No encontramos lo que buscas."


async def _usuario_de(sesion: AsyncSession, operador: OperadorRestaurante) -> Usuario:
    usuario = await sesion.get(Usuario, operador.usuario_id)
    assert usuario is not None
    return usuario


async def _platillo(sesion: AsyncSession, restaurante: Restaurante, **valores: Any) -> Platillo:
    platillo = Platillo(
        restaurante_id=restaurante.id, nombre="Tostada", precio=Decimal("55.00"), **valores
    )
    sesion.add(platillo)
    await sesion.commit()
    return platillo


# ---------------------------------------------------------------------------
# AC-15.1 · Sin token no hay back-office
# ---------------------------------------------------------------------------


def test_hay_rutas_de_admin_que_revisar() -> None:
    assert len(RUTAS_ADMIN) >= 28  # las de `CONTRATO_FASE_1` (02 §5.3), publicadas desde T-1.1


@pytest.mark.ac("AC-15.1")
@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_ADMIN, ids=[f"{m} {r}" for m, r in RUTAS_ADMIN])
async def test_toda_ruta_del_operador_sin_token_es_401(
    cliente: AsyncClient, metodo: str, ruta: str
) -> None:
    _es_401(await cliente.request(metodo, ruta))


@pytest.mark.ac("AC-15.1")
@pytest.mark.parametrize(
    "autorizacion",
    [
        "Bearer",
        "Bearer    ",
        "Basic dXN1YXJpbzpjbGF2ZQ==",
        "prueba:uid-1:google",  # sin esquema
        "Bearer token-que-no-vale",
        "Bearer prueba::google",  # uid vacío
    ],
)
async def test_credenciales_mal_formadas_son_401(cliente: AsyncClient, autorizacion: str) -> None:
    _es_401(await cliente.get(f"{A}/restaurantes", headers={"Authorization": autorizacion}))


@pytest.mark.ac("AC-15.1")
async def test_el_401_va_antes_que_la_validacion(cliente: AsyncClient) -> None:
    """Sin token no se revela nada de la forma de la petición: ni 422 ni 404."""
    _es_401(await cliente.get(f"{A}/restaurantes/no-es-un-uuid"))
    _es_401(await cliente.post(f"{A}/restaurantes", json={"nombre": ""}))


@pytest.mark.ac("AC-15.1")
async def test_fuera_de_desarrollo_tambien_exige_token(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """`solo_desarrollo` ya no existe: en staging la ruta responde 401, no 404."""
    monkeypatch.setattr(settings, "ENTORNO", "staging")
    _es_401(await cliente.get(f"{A}/restaurantes"))


@pytest.mark.ac("AC-15.1")
async def test_con_el_verificador_real_y_sin_proyecto_nadie_entra(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Sin la sustitución de pruebas y sin `FIREBASE_PROJECT_ID`: cerrado, sin ir a Google."""
    monkeypatch.setattr(settings, "FIREBASE_PROJECT_ID", None)
    app.dependency_overrides.pop(obtener_verificador)
    _es_401(await cliente.get(f"{A}/restaurantes", headers=cabecera_de("uid-1")))


def test_el_contrato_declara_el_token_bearer() -> None:
    esquemas = app.openapi()["components"]["securitySchemes"]
    assert esquemas["FirebaseIdToken"] == {
        "type": "http",
        "scheme": "bearer",
        "description": "ID token de Firebase Auth del operador (Google o enlace por correo).",
    }


# ---------------------------------------------------------------------------
# Primer acceso: el usuario se crea; sin restaurantes, lista vacía
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-15.2")
async def test_token_valido_sin_restaurante_da_lista_vacia_y_crea_el_usuario(
    cliente: AsyncClient, sesion: AsyncSession, restaurante: Restaurante
) -> None:
    for _ in range(2):
        respuesta = await cliente.get(
            f"{A}/restaurantes", headers=cabecera_de("uid-nuevo", "email_link")
        )
        assert respuesta.status_code == 200, respuesta.text
        assert respuesta.json() == []
    usuarios = list(
        await sesion.scalars(select(Usuario).where(Usuario.firebase_uid == "uid-nuevo"))
    )
    assert len(usuarios) == 1
    assert usuarios[0].provider == "email_link"


# ---------------------------------------------------------------------------
# AC-15.2 · Alta y lista de mis restaurantes
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-15.2")
async def test_alta_crea_el_restaurante_y_al_operador_como_propietario(
    cliente: AsyncClient, sesion: AsyncSession
) -> None:
    cabecera = cabecera_de("uid-alta")
    creado = await cliente.post(
        f"{A}/restaurantes",
        json={"nombre": "Café La Querencia", "tema": "verde", "telefono": "5512345678"},
        headers=cabecera,
    )
    assert creado.status_code == 201, creado.text
    cuerpo = creado.json()
    assert cuerpo["slug"] == "cafe-la-querencia"
    assert cuerpo["tema"] == "verde"
    assert cuerpo["activo"] is True

    usuario = await sesion.scalar(select(Usuario).where(Usuario.firebase_uid == "uid-alta"))
    assert usuario is not None
    operador = await sesion.scalar(
        select(OperadorRestaurante).where(OperadorRestaurante.usuario_id == usuario.id)
    )
    assert operador is not None
    assert operador.restaurante_id == UUID(cuerpo["id"])
    assert operador.rol == RolOperador.propietario

    lista = await cliente.get(f"{A}/restaurantes", headers=cabecera)
    assert [r["id"] for r in lista.json()] == [cuerpo["id"]]
    detalle = await cliente.get(f"{A}/restaurantes/{cuerpo['id']}", headers=cabecera)
    assert detalle.json() == cuerpo


@pytest.mark.ac("AC-15.2")
async def test_el_slug_derivado_es_unico(cliente: AsyncClient) -> None:
    cabecera = cabecera_de("uid-slugs")
    slugs = []
    for _ in range(3):
        creado = await cliente.post(
            f"{A}/restaurantes", json={"nombre": "La Querencia"}, headers=cabecera
        )
        assert creado.status_code == 201, creado.text
        slugs.append(creado.json()["slug"])
    assert slugs == ["la-querencia", "la-querencia-2", "la-querencia-3"]
    raro = await cliente.post(f"{A}/restaurantes", json={"nombre": "¡!"}, headers=cabecera)
    assert raro.json()["slug"].startswith("restaurante")


@pytest.mark.ac("AC-15.2")
async def test_un_slug_pedido_que_ya_existe_es_409(
    cliente: AsyncClient, sesion: AsyncSession, restaurante: Restaurante
) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes",
        json={"nombre": "Otro", "slug": restaurante.slug},
        headers=cabecera_de("uid-409"),
    )
    assert respuesta.status_code == 409
    assert _error(respuesta)["codigo"] == "CONFLICTO"
    # Nada a medias: ni restaurante ni operador nuevos.
    assert await sesion.scalar(select(func.count()).select_from(OperadorRestaurante)) == 0


@pytest.mark.ac("AC-15.2")
@pytest.mark.parametrize(
    "cuerpo",
    [
        {"nombre": "  "},
        {"nombre": "x" * 201},
        {"nombre": "Ok", "slug": "Con Mayúsculas"},
        {"nombre": "Ok", "slug": "-guion"},
        {"nombre": "Ok", "slug": "a"},
        {"nombre": "Ok", "tema": "rosa"},
        {"nombre": "Ok", "telefono": "1" * 21},
    ],
)
async def test_alta_valida_el_cuerpo(cliente: AsyncClient, cuerpo: dict[str, Any]) -> None:
    respuesta = await cliente.post(f"{A}/restaurantes", json=cuerpo, headers=cabecera_de("uid-v"))
    assert respuesta.status_code == 422, respuesta.text
    assert _error(respuesta)["codigo"] == "PAYLOAD_INVALIDO"


@pytest.mark.ac("AC-15.2")
@pytest.mark.parametrize(
    "extra",
    [
        {"plan": "enterprise"},
        {"activo": False},
        {"horarios": {"lunes": "nunca"}},
        {"id": UUID_X},
        {"restaurante_id": UUID_X},
        {"zzz": 1},
    ],
)
async def test_el_cuerpo_no_decide_plan_activo_ni_restaurante(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    extra: dict[str, Any],
) -> None:
    """B2: un campo que el operador no decide es 422, no un 200 que lo ignora en silencio."""
    alta = await cliente.post(
        f"{A}/restaurantes", json={"nombre": "Pícaro", **extra}, headers=cabecera_operador
    )
    assert alta.status_code == 422, alta.text
    cambio = await cliente.patch(
        f"{A}/restaurantes/{restaurante.id}", json=extra, headers=cabecera_operador
    )
    assert cambio.status_code == 422, cambio.text
    await sesion.refresh(restaurante)
    assert (restaurante.plan, restaurante.activo) == ("gratis", True)


@pytest.mark.ac("AC-15.2")
async def test_cada_operador_ve_solo_sus_restaurantes(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_restaurante: Fabrica,
    fabrica_operador: Fabrica,
) -> None:
    mio = await fabrica_restaurante()
    ajeno = await fabrica_restaurante()
    await fabrica_restaurante()  # sin operador
    yo = await fabrica_operador(mio, rol=RolOperador.gerente)
    await fabrica_operador(ajeno)
    usuario = await _usuario_de(sesion, yo)
    # El mismo usuario en un segundo restaurante: lo ve también.
    otro_mio = await fabrica_restaurante()
    await fabrica_operador(otro_mio, usuario=usuario)

    respuesta = await cliente.get(f"{A}/restaurantes", headers=cabecera_de(usuario.firebase_uid))
    assert respuesta.status_code == 200
    assert {r["id"] for r in respuesta.json()} == {str(mio.id), str(otro_mio.id)}


@pytest.mark.ac("AC-15.2")
async def test_un_operador_desactivado_o_un_restaurante_inactivo_no_se_ven(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_restaurante: Fabrica,
    fabrica_operador: Fabrica,
) -> None:
    activo = await fabrica_restaurante()
    revocado = await fabrica_restaurante()
    cerrado = await fabrica_restaurante(activo=False)
    yo = await fabrica_operador(activo)
    usuario = await _usuario_de(sesion, yo)
    await fabrica_operador(revocado, usuario=usuario, activo=False)
    await fabrica_operador(cerrado, usuario=usuario)
    cabecera = cabecera_de(usuario.firebase_uid)

    lista = await cliente.get(f"{A}/restaurantes", headers=cabecera)
    assert {r["id"] for r in lista.json()} == {str(activo.id)}
    for rid in (revocado.id, cerrado.id):
        _es_404(await cliente.get(f"{A}/restaurantes/{rid}", headers=cabecera))


@pytest.mark.ac("AC-15.2")
async def test_cambiar_mi_restaurante(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_restaurante: Fabrica,
) -> None:
    ruta = f"{A}/restaurantes/{restaurante.id}"
    cambiado = await cliente.patch(
        ruta, json={"nombre": "Nuevo nombre", "slug": "nuevo-slug"}, headers=cabecera_operador
    )
    assert cambiado.status_code == 200, cambiado.text
    assert (cambiado.json()["nombre"], cambiado.json()["slug"]) == ("Nuevo nombre", "nuevo-slug")

    otro = await fabrica_restaurante()
    choque = await cliente.patch(ruta, json={"slug": otro.slug}, headers=cabecera_operador)
    assert choque.status_code == 409
    nulo = await cliente.patch(ruta, json={"nombre": None}, headers=cabecera_operador)
    assert nulo.status_code == 422
    sigue = await cliente.get(ruta, headers=cabecera_operador)
    assert sigue.json()["slug"] == "nuevo-slug"


# ---------------------------------------------------------------------------
# AC-15.3 · Lo ajeno no existe: 404, nunca 403
# ---------------------------------------------------------------------------


@pytest.fixture
async def ajeno(fabrica_restaurante: Fabrica, fabrica_operador: Fabrica) -> Restaurante:
    """Restaurante de otra persona, con su propio dueño."""
    restaurante: Restaurante = await fabrica_restaurante()
    await fabrica_operador(restaurante)
    return restaurante


RUTAS_POR_RESTAURANTE = [
    ("GET", "/restaurantes/{rid}", None),
    ("PATCH", "/restaurantes/{rid}", {"nombre": "Robado"}),
    ("GET", "/restaurantes/{rid}/platillos", None),
    ("POST", "/restaurantes/{rid}/platillos", {"nombre": "Intruso", "precio": 1}),
    # T-1.3 (revisión, A2)
    ("GET", "/restaurantes/{rid}/categorias", None),
    ("POST", "/restaurantes/{rid}/categorias", {"nombre": "Intruso"}),
    ("POST", "/restaurantes/{rid}/categorias/reordenar", {"ids": ["{pid}"]}),
    ("POST", "/restaurantes/{rid}/platillos/reordenar", {"ids": ["{pid}"]}),
]
RUTAS_POR_PLATILLO = [
    ("PATCH", "/platillos/{pid}", {"nombre": "Robado"}),
    ("DELETE", "/platillos/{pid}", None),
    ("DELETE", "/platillos/{pid}/foto", None),  # T-1.4; el POST multipart, en test_fotos.py
]


@pytest.mark.ac("AC-15.3")
@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS_POR_RESTAURANTE + RUTAS_POR_PLATILLO)
async def test_un_recurso_ajeno_es_404_igual_que_uno_inexistente(
    cliente: AsyncClient,
    sesion: AsyncSession,
    cabecera_operador: dict[str, str],
    ajeno: Restaurante,
    metodo: str,
    ruta: str,
    cuerpo: dict[str, Any] | None,
) -> None:
    platillo = await _platillo(sesion, ajeno)
    respuestas = []
    for rid, pid in ((ajeno.id, platillo.id), (UUID_X, UUID_X)):
        respuesta = await cliente.request(
            metodo,
            A + ruta.format(rid=rid, pid=pid),
            json=json.loads(json.dumps(cuerpo).replace("{pid}", str(pid))),
            headers=cabecera_operador,
        )
        _es_404(respuesta)
        respuestas.append({k: v for k, v in _error(respuesta).items() if k != "request_id"})
    assert respuestas[0] == respuestas[1]  # no se distingue «ajeno» de «no existe»

    await sesion.refresh(ajeno)
    await sesion.refresh(platillo)
    assert ajeno.nombre != "Robado"
    assert (platillo.nombre, platillo.activo) == ("Tostada", True)
    intrusos = await sesion.scalar(
        select(func.count()).select_from(Platillo).where(Platillo.nombre == "Intruso")
    )
    assert intrusos == 0


@pytest.mark.ac("AC-15.3")
async def test_mis_platillos_si_y_los_ajenos_no(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    ajeno: Restaurante,
) -> None:
    mio = await _platillo(sesion, restaurante)
    suyo = await _platillo(sesion, ajeno)
    lista = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/platillos", headers=cabecera_operador
    )
    assert {p["id"] for p in lista.json()} == {str(mio.id)}
    cambiado = await cliente.patch(
        f"{A}/platillos/{mio.id}", json={"nombre": "Sope"}, headers=cabecera_operador
    )
    assert cambiado.status_code == 200
    _es_404(
        await cliente.patch(
            f"{A}/platillos/{suyo.id}", json={"nombre": "Sope"}, headers=cabecera_operador
        )
    )


@pytest.mark.ac("AC-15.3")
async def test_el_restaurante_del_cuerpo_no_cuenta(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    ajeno: Restaurante,
) -> None:
    """Regla dura 5: un `restaurante_id` en el cuerpo es 422; manda la ruta validada."""
    rechazado = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"restaurante_id": str(ajeno.id), "nombre": "Tlayuda", "precio": 80},
        headers=cabecera_operador,
    )
    assert rechazado.status_code == 422, rechazado.text
    creado = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"nombre": "Tlayuda", "precio": 80},
        headers=cabecera_operador,
    )
    assert creado.status_code == 201, creado.text
    platillo = await sesion.get(Platillo, UUID(creado.json()["id"]))
    assert platillo is not None
    assert platillo.restaurante_id == restaurante.id


# ---------------------------------------------------------------------------
# Revisión de la maestra
# ---------------------------------------------------------------------------


def test_el_recorrido_cubre_el_contrato() -> None:
    contrato = {
        (m.upper(), r) for r, ops in app.openapi()["paths"].items() if r.startswith(A) for m in ops
    }
    recorridas = {(m, r) for r, api, _ in rutas_api() if r.startswith(A) for m in api.methods}
    assert contrato <= recorridas


# --- A1 · Las rutas de ejemplo no salen de desarrollo -------------------------------------

RUTAS_DE_EJEMPLO = [
    f"/restaurantes/{UUID_X}/personal",
    f"/restaurantes/{UUID_X}/mesas",
    f"/restaurantes/{UUID_X}/importaciones/{UUID_X}",
]


@pytest.mark.ac("AC-15.3")
@pytest.mark.parametrize("entorno", ["staging", "produccion"])
@pytest.mark.parametrize("ruta", RUTAS_DE_EJEMPLO)
async def test_las_rutas_de_ejemplo_con_token_son_404_fuera_de_desarrollo(
    cliente: AsyncClient,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
    entorno: str,
    ruta: str,
) -> None:
    monkeypatch.setattr(settings, "ENTORNO", entorno)
    _es_404(await cliente.get(A + ruta, headers=cabecera_operador))
    _es_401(await cliente.get(A + ruta))  # sin token sigue siendo 401
    subida = await cliente.post(
        f"{A}/restaurantes/{UUID_X}/importaciones",
        files={"archivo": ("x.pdf", b"%PDF-1.4", "application/pdf")},
        headers=cabecera_operador,
    )
    _es_404(subida)


async def test_las_rutas_de_ejemplo_responden_en_desarrollo(
    cliente: AsyncClient, cabecera_operador: dict[str, str]
) -> None:
    assert settings.es_desarrollo
    respuesta = await cliente.get(A + RUTAS_DE_EJEMPLO[0], headers=cabecera_operador)
    assert respuesta.status_code == 200


# --- A2 · Caracteres de control: 422 o 401, nunca 500 ------------------------------------


@pytest.mark.ac("AC-15.2")
@pytest.mark.parametrize("campo", ["nombre", "direccion", "telefono", "email"])
@pytest.mark.parametrize("valor", ["a\x00b", "a\x1bb", "a\u0085b"])
async def test_un_caracter_de_control_es_422_y_no_500(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    campo: str,
    valor: str,
) -> None:
    cuerpo = {"nombre": "Ok", campo: valor}
    alta = await cliente.post(f"{A}/restaurantes", json=cuerpo, headers=cabecera_operador)
    assert alta.status_code == 422, alta.text
    cambio = await cliente.patch(
        f"{A}/restaurantes/{restaurante.id}", json={campo: valor}, headers=cabecera_operador
    )
    assert cambio.status_code == 422, cambio.text


async def test_la_direccion_admite_saltos_de_linea(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    cambio = await cliente.patch(
        f"{A}/restaurantes/{restaurante.id}",
        json={"direccion": "Calle 1\nCol. Centro"},
        headers=cabecera_operador,
    )
    assert cambio.status_code == 200, cambio.text
    assert cambio.json()["direccion"] == "Calle 1\nCol. Centro"


@pytest.fixture
def con_verificador_real(cliente: AsyncClient) -> Google:
    """El verificador real (llaves propias, sin red) en lugar de `VerificadorDePrueba`."""
    google = Google()
    verificador = verificador_real(google)
    app.dependency_overrides[obtener_verificador] = lambda: verificador
    return google


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.ac("AC-15.1")
async def test_con_el_verificador_real_un_sub_con_nul_es_401(
    cliente: AsyncClient, con_verificador_real: Google
) -> None:
    respuesta = await cliente.get(f"{A}/restaurantes", headers=_bearer(token_firmado(sub="a\x00b")))
    _es_401(respuesta)


async def test_con_el_verificador_real_el_nombre_llega_limpio(
    cliente: AsyncClient, sesion: AsyncSession, con_verificador_real: Google
) -> None:
    token = token_firmado(sub="uid-nombre-sucio", name="Ana\x00 María\x07")
    respuesta = await cliente.get(f"{A}/restaurantes", headers=_bearer(token))
    assert respuesta.status_code == 200, respuesta.text
    usuario = await sesion.scalar(select(Usuario).where(Usuario.firebase_uid == "uid-nombre-sucio"))
    assert usuario is not None
    assert usuario.nombre_display == "Ana María"


# --- A3 · Dos operadores existentes no se confunden -------------------------------------


@pytest.mark.ac("AC-15.2")
@pytest.mark.ac("AC-15.3")
async def test_dos_operadores_existentes_no_se_confunden(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_restaurante: Fabrica,
    fabrica_operador: Fabrica,
) -> None:
    de_a = await fabrica_restaurante()
    de_b = await fabrica_restaurante()
    usuario_a = await _usuario_de(sesion, await fabrica_operador(de_a))
    usuario_b = await _usuario_de(sesion, await fabrica_operador(de_b))
    for yo, mio, suyo in ((usuario_a, de_a, de_b), (usuario_b, de_b, de_a)):
        cabecera = cabecera_de(yo.firebase_uid)
        lista = await cliente.get(f"{A}/restaurantes", headers=cabecera)
        assert [r["id"] for r in lista.json()] == [str(mio.id)]
        assert (
            await cliente.get(f"{A}/restaurantes/{mio.id}", headers=cabecera)
        ).status_code == 200
        _es_404(await cliente.get(f"{A}/restaurantes/{suyo.id}", headers=cabecera))
        _es_404(
            await cliente.patch(
                f"{A}/restaurantes/{suyo.id}", json={"nombre": "Mío"}, headers=cabecera
            )
        )
        cambio = await cliente.patch(
            f"{A}/restaurantes/{mio.id}", json={"nombre": f"De {yo.firebase_uid}"}, headers=cabecera
        )
        assert cambio.status_code == 200
    await sesion.refresh(de_a)
    await sesion.refresh(de_b)
    assert (de_a.nombre, de_b.nombre) == (
        f"De {usuario_a.firebase_uid}",
        f"De {usuario_b.firebase_uid}",
    )
    usuarios = await sesion.scalar(select(func.count()).select_from(Usuario))
    assert usuarios == 2


# --- A4 · Toda ruta real con id depende de una comprobación del operador ----------------

IDS_DE_RECURSO = {"rid", "platillo_id", "categoria_id", "mesa_id", "personal_id", "importacion_id"}
DEPENDENCIAS_DEL_OPERADOR = {
    "restaurante_del_operador",
    "platillo_del_operador",
    "categoria_del_operador",
}


def _dependencias(dependant: Any) -> set[str]:
    nombres: set[str] = set()
    for sub in dependant.dependencies:
        nombres.add(getattr(sub.call, "__name__", ""))
        nombres |= _dependencias(sub)
    return nombres


def _rutas_reales_con_id() -> list[tuple[str, APIRoute]]:
    de_ejemplo = {
        (r.path, frozenset(r.methods)) for r in ejemplos.router.routes if isinstance(r, APIRoute)
    }
    rutas = []
    for ruta, api, _ in rutas_api():
        if not ruta.startswith(A) or (api.path, frozenset(api.methods)) in de_ejemplo:
            continue
        if set(re.findall(r"\{([^}]+)\}", ruta)) & IDS_DE_RECURSO:
            rutas.append((ruta, api))
    return rutas


@pytest.mark.ac("AC-15.3")
def test_toda_ruta_admin_con_id_depende_del_operador() -> None:
    """Cuando T-1.3 a T-1.9 sustituyan los ejemplos, olvidar `*_del_operador` rompe esto."""
    rutas = _rutas_reales_con_id()
    # GET/PATCH restaurante, categorías y platillos (T-1.3): GET/POST, reordenar, PATCH/DELETE
    assert len(rutas) >= 12
    for ruta, api in rutas:
        nombres = _dependencias(api.dependant)
        assert nombres & DEPENDENCIAS_DEL_OPERADOR, (ruta, sorted(api.methods))
        assert all(n.endswith("_del_operador") for n in nombres & DEPENDENCIAS_DEL_OPERADOR)


# --- B1 · logo_url sólo https -----------------------------------------------------------


@pytest.mark.parametrize(
    "logo",
    [
        "javascript:alert(1)",
        "data:image/png;base64,AAAA",
        "http://img.carta.mx/logo.png",
        "//img.carta.mx/logo.png",
        "https://",
        "https://usuario:clave@img.carta.mx/logo.png",
    ],
)
async def test_el_logo_solo_acepta_https(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str], logo: str
) -> None:
    respuesta = await cliente.patch(
        f"{A}/restaurantes/{restaurante.id}", json={"logo_url": logo}, headers=cabecera_operador
    )
    assert respuesta.status_code == 422, respuesta.text


async def test_un_logo_https_se_guarda(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    logo = "https://img.carta.mx/logos/querencia.webp"
    respuesta = await cliente.patch(
        f"{A}/restaurantes/{restaurante.id}", json={"logo_url": logo}, headers=cabecera_operador
    )
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["logo_url"] == logo


# --- B3 · Slugs reservados -------------------------------------------------------------


@pytest.mark.parametrize(
    "slug", ["admin", "api", "staff", "assets", "fonts", "health", "ready", "static", "carta"]
)
async def test_un_slug_reservado_es_422(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str], slug: str
) -> None:
    alta = await cliente.post(
        f"{A}/restaurantes", json={"nombre": "Ok", "slug": slug}, headers=cabecera_operador
    )
    assert alta.status_code == 422, alta.text
    cambio = await cliente.patch(
        f"{A}/restaurantes/{restaurante.id}", json={"slug": slug}, headers=cabecera_operador
    )
    assert cambio.status_code == 422, cambio.text


async def test_un_nombre_que_da_un_slug_reservado_recibe_sufijo(
    cliente: AsyncClient, cabecera_operador: dict[str, str]
) -> None:
    alta = await cliente.post(
        f"{A}/restaurantes", json={"nombre": "Admin"}, headers=cabecera_operador
    )
    assert alta.status_code == 201, alta.text
    assert alta.json()["slug"] == "admin-2"


# --- B4 · Las respuestas autenticadas no se cachean --------------------------------------


async def test_las_respuestas_del_operador_son_privadas_y_sin_cache(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    lista = await cliente.get(f"{A}/restaurantes", headers=cabecera_operador)
    assert lista.status_code == 200
    assert lista.headers["cache-control"] == "private, no-store"
    error = await cliente.get(f"{A}/restaurantes/{UUID_X}", headers=cabecera_operador)
    assert error.headers["cache-control"] == "no-store"  # la envoltura conserva la suya
    salud = await cliente.get("/health")
    assert salud.headers.get("cache-control") != "private, no-store"


# --- B7 · Huecos de pruebas -------------------------------------------------------------


@pytest.mark.ac("AC-15.2")
async def test_borrar_mi_platillo_lo_desactiva(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    platillo = await _platillo(sesion, restaurante)
    respuesta = await cliente.delete(f"{A}/platillos/{platillo.id}", headers=cabecera_operador)
    assert respuesta.status_code == 204
    await sesion.refresh(platillo)
    assert platillo.activo is False  # regla dura 9: sin borrado físico


@pytest.mark.ac("AC-15.1")
async def test_los_401_reales_cumplen_el_esquema_publicado(
    cliente: AsyncClient, con_verificador_real: Google
) -> None:
    sin_token = await cliente.get(f"{A}/restaurantes")
    assert ErrorRespuesta.model_validate(sin_token.json()).error.codigo == "SIN_CREDENCIAL"
    ahora = int(datetime.now(UTC).timestamp())
    vencido = token_firmado(exp=ahora - 60, iat=ahora - 3700, auth_time=ahora - 3700)
    expirado = await cliente.get(f"{A}/restaurantes", headers=_bearer(vencido))
    _es_401(expirado, "TOKEN_EXPIRADO")
    assert ErrorRespuesta.model_validate(expirado.json()).error.codigo == "TOKEN_EXPIRADO"
    valido = await cliente.get(f"{A}/restaurantes", headers=_bearer(token_firmado()))
    assert valido.status_code == 200, valido.text


async def test_ultimo_login_se_renueva_pasada_la_hora(
    cliente: AsyncClient,
    sesion: AsyncSession,
    operador: OperadorRestaurante,
    cabecera_operador: dict[str, str],
) -> None:
    usuario = await _usuario_de(sesion, operador)
    reciente = datetime.now(UTC) - timedelta(minutes=10)
    usuario.ultimo_login = reciente
    await sesion.commit()
    await cliente.get(f"{A}/restaurantes", headers=cabecera_operador)
    await sesion.refresh(usuario)
    assert usuario.ultimo_login == reciente  # dentro de la hora no se escribe
    antiguo = datetime.now(UTC) - timedelta(hours=2)
    usuario.ultimo_login = antiguo
    await sesion.commit()
    await cliente.get(f"{A}/restaurantes", headers=cabecera_operador)
    await sesion.refresh(usuario)
    assert usuario.ultimo_login > datetime.now(UTC) - timedelta(minutes=1)
