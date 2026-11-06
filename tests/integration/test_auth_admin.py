"""T-1.2: autenticación del operador y alta del restaurante (US-15).

- AC-15.1: toda ruta de `/api/v1/admin` exige el ID token; sin él, 401 con la envoltura única.
- AC-15.2: cada operador ve y toca sólo los restaurantes que tiene asignados.
- AC-15.3: un recurso de otro restaurante responde 404 (no 403), igual que uno inexistente.

El token lo verifica `VerificadorDePrueba` (`tests/auth_pruebas.py`), instalado por
`conftest.cliente`; el verificador real se prueba en `tests/unit/test_firebase.py`.
"""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Any
from uuid import UUID

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

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
from tests.auth_pruebas import cabecera_de
from tests.conftest import Fabrica

A = "/api/v1/admin"
UUID_X = "00000000-0000-4000-8000-0000000000aa"


def _rutas_admin() -> list[tuple[str, str]]:
    """(método, ruta con ids de relleno) de todo lo que `/openapi.json` publica bajo `/admin`.

    Del contrato y no de `app.routes`: FastAPI registra los routers incluidos de forma
    perezosa, y el contrato es lo que el frontend llama."""
    rutas = []
    for ruta, operaciones in app.openapi()["paths"].items():
        if ruta.startswith(A):
            concreta = re.sub(r"\{[^}]+\}", UUID_X, ruta)
            rutas += [(metodo.upper(), concreta) for metodo in sorted(operaciones)]
    return rutas


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
async def test_el_cuerpo_no_decide_plan_activo_ni_restaurante(
    cliente: AsyncClient, sesion: AsyncSession, restaurante: Restaurante
) -> None:
    creado = await cliente.post(
        f"{A}/restaurantes",
        json={
            "nombre": "Pícaro",
            "plan": "enterprise",
            "activo": False,
            "horarios": {"lunes": "nunca"},
            "id": str(restaurante.id),
            "restaurante_id": str(restaurante.id),
        },
        headers=cabecera_de("uid-picaro"),
    )
    assert creado.status_code == 201, creado.text
    assert creado.json()["id"] != str(restaurante.id)
    nuevo = await sesion.get(Restaurante, UUID(creado.json()["id"]))
    assert nuevo is not None
    await sesion.refresh(nuevo)
    assert (nuevo.plan, nuevo.activo, nuevo.horarios) == ("gratis", True, {})


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
]
RUTAS_POR_PLATILLO = [
    ("PATCH", "/platillos/{pid}", {"nombre": "Robado"}),
    ("DELETE", "/platillos/{pid}", None),
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
            json=cuerpo,
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
    """Regla dura 5: un `restaurante_id` en el cuerpo se ignora; manda la ruta validada."""
    creado = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"restaurante_id": str(ajeno.id), "nombre": "Tlayuda", "precio": 80},
        headers=cabecera_operador,
    )
    assert creado.status_code == 201, creado.text
    platillo = await sesion.get(Platillo, UUID(creado.json()["id"]))
    assert platillo is not None
    assert platillo.restaurante_id == restaurante.id
