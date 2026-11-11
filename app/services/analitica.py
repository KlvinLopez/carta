"""Analítica del piloto (T-2.3, US-24, 01 §7): `evento_analitica`.

- **Sin IP en claro** (AC-24.2, regla dura 10): sólo `ip_hash`, un HMAC-SHA256 de la IP con una
  sal que cambia cada día (UTC). La sal se deriva de `SECRET_KEY` y de la fecha: todos los
  workers y reinicios del mismo día dan el mismo hash (para contar escaneos únicos) y el de
  un día no se puede cruzar con el de otro sin la llave. Sin identificadores publicitarios.
- **Familia del navegador**, nunca el *user agent* completo: un valor de una lista cerrada
  (`FAMILIAS`), así ningún texto del cliente llega a la fila.
- **Un fallo de analítica nunca tumba la petición** (04_API_Spec §2.6): `registrar_scan` y
  `registrar_lote` atrapan cualquier error de la base, deshacen sólo lo suyo, lo anotan en el
  log (sin datos del comensal) y regresan. Se llaman **después** del `commit()` de la acción
  del comensal, así que el `rollback()` no le quita nada.
- **Ni por latencia ni por conexiones** (revisión de T-2.3, A1): cada escritura corre con
  `lock_timeout` de 1 s y `statement_timeout` de 1.5 s en su transacción (`SET LOCAL`), y
  como mucho `MAX_ESCRITURAS_SIMULTANEAS` a la vez por worker; si están ocupadas, lo nuevo se
  descarta sin esperar. Con la tabla bloqueada (una migración, un `VACUUM FULL`) la analítica
  nunca ocupa más que ese puñado de conexiones del pool ni retrasa `entrar` más de ~1 s.

El teléfono sólo manda `menu_view`, `dish_view`, `search` y `filter` (`app/schemas/eventos.py`);
el servidor registra `scan` al entrar y, en la Fase 3, los de la orden y el personal.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import re
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import EventoAnalitica, Platillo, SesionGrupal

log = logging.getLogger("carta.analitica")

# La hora del teléfono se acota a la del servidor: nunca en el futuro ni antes de lo que dura
# un token de invitado (6 h, `INVITADO_VIGENCIA_HORAS`).
ANTIGUEDAD_MAXIMA = timedelta(hours=6)
LARGO_MAXIMO_USER_AGENT = 512
MAX_ESCRITURAS_SIMULTANEAS = 2  # por worker
LOCK_TIMEOUT = "1s"
STATEMENT_TIMEOUT = "1500ms"

FAMILIAS = (
    "bot",
    "samsung",
    "ios-safari",
    "ios-chrome",
    "ios-firefox",
    "ios-otro",
    "android-chrome",
    "android-firefox",
    "android-edge",
    "android-otro",
    "edge",
    "firefox",
    "chrome",
    "safari",
    "otro",
)

_BOT = re.compile(r"bot|crawl|spider|slurp|curl|wget|python|httpx|headless|lighthouse|k6/", re.I)


@dataclass(frozen=True)
class Origen:
    """De dónde vino la petición. `ip` ya es el cubo de `ip_del_cliente` (IPv6 por `/64`)."""

    ip: str | None
    user_agent: str | None


@dataclass(frozen=True)
class EventoCliente:
    tipo: str
    platillo_id: UUID | None = None
    ocurrido_en: datetime | None = None


class _Turnos:
    """Cupo de escrituras de analítica en curso en este worker. Sin `await` entre mirar y
    tomar: dos corrutinas no se cuelan."""

    def __init__(self, maximo: int) -> None:
        self.maximo = maximo
        self.en_curso = 0

    def tomar(self) -> bool:
        if self.en_curso >= self.maximo:
            return False
        self.en_curso += 1
        return True

    def soltar(self) -> None:
        self.en_curso -= 1


turnos = _Turnos(MAX_ESCRITURAS_SIMULTANEAS)


async def _con_plazo(sesion: AsyncSession) -> None:
    """Plazos de la transacción que empieza (se van con su `commit()` o `rollback()`)."""
    await sesion.execute(text(f"SET LOCAL lock_timeout = '{LOCK_TIMEOUT}'"))
    await sesion.execute(text(f"SET LOCAL statement_timeout = '{STATEMENT_TIMEOUT}'"))


def _ahora() -> datetime:
    return datetime.now(UTC)


def sal_del_dia(dia: date) -> bytes:
    return hmac.new(
        settings.SECRET_KEY.encode(), f"carta:ip_hash:{dia.isoformat()}".encode(), hashlib.sha256
    ).digest()


def hash_ip(ip: str | None, *, dia: date) -> str | None:
    """64 caracteres hexadecimales; `None` sin IP."""
    if not ip:
        return None
    return hmac.new(sal_del_dia(dia), ip.encode(), hashlib.sha256).hexdigest()


def familia_user_agent(user_agent: str | None) -> str | None:
    """Una de `FAMILIAS`, o `None` sin cabecera."""
    if not user_agent:
        return None
    ua = user_agent[:LARGO_MAXIMO_USER_AGENT]
    if _BOT.search(ua):
        return "bot"
    if "SamsungBrowser" in ua:
        return "samsung"
    if re.search(r"iPhone|iPad|iPod", ua):
        if "CriOS" in ua:
            return "ios-chrome"
        if "FxiOS" in ua:
            return "ios-firefox"
        return "ios-safari" if "Safari/" in ua else "ios-otro"
    if "Android" in ua:
        if "Firefox/" in ua:
            return "android-firefox"
        if "EdgA/" in ua:
            return "android-edge"
        return "android-chrome" if "Chrome/" in ua else "android-otro"
    if "Edg/" in ua:
        return "edge"
    if "Firefox/" in ua:
        return "firefox"
    if "Chrome/" in ua:
        return "chrome"
    if "Safari/" in ua:
        return "safari"
    return "otro"


def acotar_hora(ocurrido_en: datetime | None, ahora: datetime) -> datetime:
    if ocurrido_en is None:
        return ahora
    if ocurrido_en.tzinfo is None:
        ocurrido_en = ocurrido_en.replace(tzinfo=UTC)
    return max(min(ocurrido_en, ahora), ahora - ANTIGUEDAD_MAXIMA)


def _comunes(origen: Origen, ahora: datetime) -> dict[str, Any]:
    return {
        "ip_hash": hash_ip(origen.ip, dia=ahora.astimezone(UTC).date()),
        "user_agent_fam": familia_user_agent(origen.user_agent),
    }


async def _fallo(sesion: AsyncSession, que: str, error: Exception) -> None:
    try:
        await sesion.rollback()
    except Exception:  # noqa: BLE001 — la conexión puede estar rota: no hay nada más que hacer
        pass
    # Sólo la clase del error: el mensaje de la base podría llevar valores de la fila.
    log.warning(
        "analítica: no se registró %s (%s)",
        que,
        type(error).__name__,
        extra={"codigo": "ANALITICA_FALLIDA"},
    )


async def registrar_scan(
    sesion: AsyncSession,
    *,
    restaurante_id: UUID,
    mesa_id: UUID,
    sesion_id: UUID,
    miembro_id: UUID,
    origen: Origen,
    ahora: datetime | None = None,
) -> bool:
    """Un `scan` de un `entrar` que respondió 200 (la ruta deja uno por miembro y minuto).
    `True` si quedó guardado; `False` si falló o el cupo estaba lleno. Nunca lanza."""
    momento = ahora or _ahora()
    if not turnos.tomar():
        return False
    try:
        await _con_plazo(sesion)
        await sesion.execute(
            insert(EventoAnalitica).values(
                restaurante_id=restaurante_id,
                mesa_id=mesa_id,
                sesion_id=sesion_id,
                miembro_id=miembro_id,
                tipo="scan",
                ocurrido_en=momento,
                **_comunes(origen, momento),
            )
        )
        await sesion.commit()
    except Exception as error:  # noqa: BLE001 — regla de 04_API_Spec §2.6
        await _fallo(sesion, "scan", error)
        return False
    finally:
        turnos.soltar()
    return True


async def registrar_lote(
    sesion: AsyncSession,
    *,
    restaurante_id: UUID,
    sesion_id: UUID,
    miembro_id: UUID,
    eventos: Sequence[EventoCliente],
    origen: Origen,
    ahora: datetime | None = None,
) -> int:
    """Guarda el lote del teléfono; regresa cuántos eventos quedaron (0 si falló). Nunca lanza.

    - La mesa sale de la sesión del token (nunca del cliente); una sesión que no es del
      restaurante del token no guarda nada.
    - `dish_view` sólo con un `platillo_id` del mismo restaurante (activo o no: el teléfono
      pudo abrirlo antes de la baja); si no, ese evento se descarta. Los demás tipos no
      llevan platillo.
    """
    momento = ahora or _ahora()
    if not turnos.tomar():
        return 0
    filas: list[dict[str, Any]] = []
    try:
        await _con_plazo(sesion)
        mesa_id = await sesion.scalar(
            select(SesionGrupal.mesa_id).where(
                SesionGrupal.id == sesion_id, SesionGrupal.restaurante_id == restaurante_id
            )
        )
        if mesa_id is None:
            await sesion.rollback()
            return 0
        pedidos = {e.platillo_id for e in eventos if e.tipo == "dish_view" and e.platillo_id}
        validos: set[UUID] = set()
        if pedidos:
            validos = set(
                await sesion.scalars(
                    select(Platillo.id).where(
                        Platillo.restaurante_id == restaurante_id, Platillo.id.in_(pedidos)
                    )
                )
            )
        comunes = _comunes(origen, momento)
        for evento in eventos:
            platillo_id = evento.platillo_id if evento.tipo == "dish_view" else None
            if evento.tipo == "dish_view" and platillo_id not in validos:
                continue
            filas.append(
                {
                    "restaurante_id": restaurante_id,
                    "mesa_id": mesa_id,
                    "sesion_id": sesion_id,
                    "miembro_id": miembro_id,
                    "platillo_id": platillo_id,
                    "tipo": evento.tipo,
                    "ocurrido_en": acotar_hora(evento.ocurrido_en, momento),
                    **comunes,
                }
            )
        if filas:
            await sesion.execute(insert(EventoAnalitica), filas)
        await sesion.commit()
    except Exception as error:  # noqa: BLE001 — regla de 04_API_Spec §2.6
        await _fallo(sesion, "un lote de eventos", error)
        return 0
    finally:
        turnos.soltar()
    return len(filas)
