"""PROTOTIPO DESECHABLE: entrega por eventos (Server-Sent Events + `LISTEN/NOTIFY`).

Sólo para medir en local (docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md). No se monta
en `app/main.py` ni cambia nada de `app/`: envuelve la app real de Carta y añade una ruta.

    GET /api/v1/p/sesion/eventos     (cookie del comensal, como `GET /p/sesion`)

Al conectar: verifica la cookie con el mismo código que el sondeo, lee el estado de la mesa con
`servicio.estado` (memoria o base, como el sondeo) y manda `event: hola` con el ETag del
miembro: si el teléfono ya tiene ese ETag no pide nada (así una reconexión masiva no se
convierte en una ola de lecturas). Después:

- `event: cambio` cuando un `NOTIFY carta_mesa '<sesion_id>'` llega a este worker (una
  conexión de `asyncpg` por worker escucha). El aviso no lleva datos: el teléfono hace su
  `GET /p/sesion` con `If-None-Match` como hoy.
- `: l` (comentario de latido) cada `LATIDO` s para que ningún proxy corte por inactividad.
- La conexión se cierra sola a los `VIDA` s (±20 %) y el navegador reconecta tras `retry`:
  ningún proxy ve una conexión eterna y un despliegue no espera a nadie más de eso.

Si el oyente pierde su conexión a la base, al recuperarla avisa `cambio` a todas las conexiones
de su worker (pudo perder notificaciones). Además el `NOTIFY` invalida la memoria de estados de
**todos** los workers, así que la vida de esa memoria puede subir de 2 s a `VIDA_ESTADO`.

Variables (todas opcionales): CARTA_EV_LATIDO (25), CARTA_EV_VIDA (600), CARTA_EV_RETRY_MS
(3000), CARTA_EV_VIDA_ESTADO (2 = como hoy).

    uv run uvicorn pruebas.carga.local.eventos.app_eventos:app --workers 2 \
        --timeout-graceful-shutdown 5
"""

from __future__ import annotations

import asyncio
import logging
import os
import random
from collections import defaultdict
from typing import Any
from uuid import UUID

import asyncpg
from starlette.requests import Request

from app.core.config import settings
from app.core.errores import ErrorCarta
from app.core.seguridad import token_de_peticion, verificar_token_invitado
from app.db import async_session
from app.main import app as carta
from app.services import sesion as servicio

RUTA = "/api/v1/p/sesion/eventos"
LATIDO = float(os.environ.get("CARTA_EV_LATIDO", "25"))
VIDA = float(os.environ.get("CARTA_EV_VIDA", "600"))
RETRY_MS = int(os.environ.get("CARTA_EV_RETRY_MS", "3000"))
VIDA_ESTADO = float(os.environ.get("CARTA_EV_VIDA_ESTADO", "2"))

log = logging.getLogger("carta.proto_eventos")
servicio.cache_estados.vida = VIDA_ESTADO

# sesion_id -> eventos de las conexiones abiertas de esa mesa en este worker
suscriptores: dict[UUID, set[asyncio.Event]] = defaultdict(set)
contadores = {
    "abiertas": 0,
    "notificaciones": 0,
    "avisos": 0,
    "latidos": 0,
    "reconexiones_oyente": 0,
}


def _avisar(sesion_id: UUID) -> None:
    servicio.cache_estados.invalidar(sesion_id)
    for evento in suscriptores.get(sesion_id, ()):
        evento.set()


def _al_notificar(_con: Any, _pid: int, canal: str, carga: str) -> None:
    contadores["notificaciones"] += 1
    if canal != "carta_mesa":
        return  # canal del restaurante: el personal (Fase 3) no existe aún
    try:
        _avisar(UUID(carga))
    except ValueError:
        return


async def _oyente() -> None:
    """Una conexión dedicada por worker. Si cae, reintenta y avisa a todos al volver."""
    primera = True
    while True:
        try:
            con = await asyncpg.connect(settings.database_url_sync)
            await con.add_listener("carta_mesa", _al_notificar)
            await con.add_listener("carta_restaurante", _al_notificar)
            if not primera:
                contadores["reconexiones_oyente"] += 1
                for sid in list(suscriptores):
                    _avisar(sid)
            primera = False
            while not con.is_closed():
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 — prototipo: cualquier fallo, reintentar
            log.warning("oyente caído; reintento en 1 s")
        await asyncio.sleep(1)


async def _json(send: Any, estado: int, cuerpo: bytes) -> None:
    await send(
        {
            "type": "http.response.start",
            "status": estado,
            "headers": [(b"content-type", b"application/json"), (b"cache-control", b"no-store")],
        }
    )
    await send({"type": "http.response.body", "body": cuerpo})


async def _eventos(scope: Any, receive: Any, send: Any) -> None:
    peticion = Request(scope)
    try:
        invitado = verificar_token_invitado(token_de_peticion(peticion) or "")
        async with async_session() as db:
            foto = await servicio.estado(db, invitado)
    except ErrorCarta as e:
        await _json(send, e.http, f'{{"error":{{"codigo":"{e.codigo}"}}}}'.encode())
        return

    evento = asyncio.Event()
    suscriptores[invitado.sesion_id].add(evento)
    contadores["abiertas"] += 1
    cerrada = asyncio.Event()

    async def vigilar() -> None:
        while (await receive())["type"] != "http.disconnect":
            pass
        cerrada.set()
        evento.set()

    vigia = asyncio.create_task(vigilar())
    try:
        await send(
            {
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    (b"content-type", b"text/event-stream"),
                    (b"cache-control", b"no-store, no-transform"),
                    (b"x-accel-buffering", b"no"),
                ],
            }
        )
        hola = f"retry: {RETRY_MS}\nevent: hola\ndata: {foto.etag(invitado.miembro_id)}\n\n"
        await send({"type": "http.response.body", "body": hola.encode(), "more_body": True})
        fin = asyncio.get_running_loop().time() + VIDA * random.uniform(0.8, 1.2)
        while not cerrada.is_set():
            resta = fin - asyncio.get_running_loop().time()
            if resta <= 0:
                break
            try:
                await asyncio.wait_for(evento.wait(), timeout=min(LATIDO, resta))
            except TimeoutError:
                if asyncio.get_running_loop().time() < fin:
                    contadores["latidos"] += 1
                    await send(
                        {"type": "http.response.body", "body": b": l\n\n", "more_body": True}
                    )
                continue
            if cerrada.is_set():
                break
            evento.clear()
            contadores["avisos"] += 1
            await send(
                {
                    "type": "http.response.body",
                    "body": b"event: cambio\ndata:\n\n",
                    "more_body": True,
                }
            )
        if not cerrada.is_set():
            await send({"type": "http.response.body", "body": b"", "more_body": False})
    finally:
        vigia.cancel()
        contadores["abiertas"] -= 1
        conjunto = suscriptores.get(invitado.sesion_id)
        if conjunto is not None:
            conjunto.discard(evento)
            if not conjunto:
                del suscriptores[invitado.sesion_id]


async def _contadores(send: Any) -> None:
    import json

    cuerpo = {**contadores, "mesas": len(suscriptores), "pid": os.getpid()}
    await _json(send, 200, json.dumps(cuerpo).encode())


async def app(scope: Any, receive: Any, send: Any) -> None:
    if scope["type"] == "lifespan":
        tarea = asyncio.create_task(_oyente())
        try:
            await carta(scope, receive, send)
        finally:
            tarea.cancel()
        return
    if scope["type"] == "http" and scope["path"] == RUTA and scope["method"] == "GET":
        await _eventos(scope, receive, send)
        return
    if scope["type"] == "http" and scope["path"] == "/__proto/contadores":
        await _contadores(send)
        return
    await carta(scope, receive, send)
