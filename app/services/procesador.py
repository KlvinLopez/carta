"""Procesador de importaciones en proceso (T-1.9, 02 §7, ADR-014). Sin FastAPI.

Una tarea asyncio por worker de uvicorn (`app.main`, en el *lifespan*) que al arrancar y
cada `INTERVALO_SEGUNDOS` —o en cuanto una subida la despierta (`despertar`)— vacía la cola de
`importacion_menu`, de una en una. Con N workers corren N procesadores sobre la misma tabla.

**Tomar** (`tomar`): `SELECT … FOR UPDATE SKIP LOCKED` de la importación `pendiente` más
antigua (índice `idx_importacion_cola`); si no hay, una `procesando` cuyo `iniciado_en` pasó
de `PLAZO_RECUPERACION` (su proceso murió: reinicio, despliegue, OOM; ninguna importación se
pierde, regla dura 8 en espíritu). Dos procesadores nunca toman la misma fila: el segundo la
salta. Se marca `procesando`, `intentos + 1` e `iniciado_en = now()` y se **confirma**: la
conexión vuelve al pool antes de llamar a la API de Claude (hasta 170 s).

**Corridas** (`intentos`, 0–3 por `ck_importacion_intentos`): cada vez que un procesador
toma la importación. Una que ya se tomó `MAX_CORRIDAS` veces y vuelve a quedar atascada
(un archivo que tumba el proceso) pasa a `fallido` en vez de tomarse otra vez. Una corrida
que falla sin culpa del archivo (almacén caído, sin llave, llave rechazada, API no
disponible: `CAUSAS_QUE_NO_CUENTAN`) no cuenta (revisión B4). Los intentos contra la API
dentro de una corrida (`Extraccion.intentos`, reintentos de T-1.8) van al log.

**Plazo de recuperación**: `PLAZO_RECUPERACION` = `PLAZO_CORRIDA_SEGUNDOS` (180 s: leer el
archivo y la extracción, que tiene plazo total de 170 s) + 60 s = 4 min. Así una importación
viva nunca se recupera por error, y tras un `kill -9` o un despliegue la recupera el primer
ciclo (al arrancar) pasados 4 min: caída, recuperación y corrida caben en los 10 min que
espera el asistente (revisión A3).

**Guardar** (`_terminar`): otra transacción, con un `UPDATE … WHERE estado = 'procesando'
AND iniciado_en = <el mío>`: si otro procesador la recuperó entretanto (este se colgó más
del plazo), la escritura tardía no pisa la suya. `listo` con el borrador, modelo, tokens y
páginas, o `fallido` con un `error_mensaje` legible para el operador (AC-25.4) y la causa en
el log. El procesador **nunca** escribe `confirmado` (INV-9): eso sólo lo hace `confirmar`.

**Apagado y vigilancia** (revisión A4): `detener()` marca el apagado y cancela; si la tarea se
cancela a media corrida, la importación vuelve a `pendiente` (y la corrida no cuenta) con una
escritura corta y protegida; si ni eso alcanza, la recupera otro procesador pasado el plazo.
Si la tarea muere sin apagado, `iniciar` la relanza a los 5 s con un `log.error`; un
`CancelledError` espurio dentro del ciclo se registra y el bucle sigue. `estado()` da a
`/ready` el latido: 503 `PROCESADOR_DETENIDO` si el bucle no da señales en
`LATIDO_MAXIMO_SEGUNDOS` (30 s) fuera de una corrida en marcha.

Las pruebas no duermen: llaman a `ciclo()` o a `procesar_una()` a mano.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import anthropic
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import EstadoImportacion, ImportacionMenu
from app.services import assets
from app.services.assets import Almacen, ErrorAlmacen
from app.services.importacion_menu import (
    ArchivoNoValido,
    ErrorExtraccion,
    Extraccion,
    TipoArchivoNoPermitido,
    extraer_menu_detallado,
)
from app.services.importaciones import MAX_BYTES, MAX_CORRIDAS

log = logging.getLogger("carta.procesador")

INTERVALO_SEGUNDOS = 10.0
# Una corrida (leer el archivo y la extracción, que tiene plazo total de 170 s) nunca pasa de
# esto; el guardado viene después y tarda milisegundos.
PLAZO_CORRIDA_SEGUNDOS = 180.0
# Una `procesando` más vieja que esto es de un proceso que murió (`kill -9`, despliegue sin
# apagado limpio). 4 min: caída + recuperación + corrida caben en los 10 min que espera el
# asistente (T-1.11). Revisión de T-1.9, A3; un latido en la fila sería más fino (0003).
PLAZO_RECUPERACION = timedelta(seconds=PLAZO_CORRIDA_SEGUNDOS + 60)
PLAZO_DEVOLVER_SEGUNDOS = 3.0
PAUSA_REINICIO_SEGUNDOS = 5.0
# `/ready` responde 503 `PROCESADOR_DETENIDO` si el bucle no da señales en este tiempo (fuera
# de una corrida en marcha, que puede durar `PLAZO_CORRIDA_SEGUNDOS`).
LATIDO_MAXIMO_SEGUNDOS = 3 * INTERVALO_SEGUNDOS
# Causas que no son del archivo: la corrida no cuenta (revisión B4). El operador puede volver a
# intentar tras una caída de la API sin agotar sus tres corridas.
CAUSAS_QUE_NO_CUENTAN = frozenset({"no_configurada", "api_configuracion", "api_no_disponible"})

MENSAJE_ATASCADA = (
    "No pudimos terminar de leer tu carta después de varios intentos. "
    "Sube otro archivo o captura el menú a mano."
)
MENSAJE_SIN_ARCHIVO = "No pudimos abrir el archivo que subiste. Inténtalo de nuevo en un momento."
MENSAJE_ERROR = "Algo salió mal al leer tu carta. Intenta de nuevo o captura el menú a mano."

Extraer = Callable[..., Awaitable[Extraccion]]
Reloj = Callable[[], datetime]


def _ahora() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True)
class Tomada:
    """Lo que el procesador necesita de la fila, para trabajar sin conexión."""

    id: UUID
    clave: str
    tipo: str
    iniciado_en: datetime
    intentos: int


class Procesador:
    """Vacía la cola de importaciones. `fabrica` da sesiones de la base (una por paso);
    `almacen` lee el archivo; `cliente`, `extraer` y `reloj` se inyectan en las pruebas."""

    def __init__(
        self,
        fabrica: async_sessionmaker[AsyncSession],
        almacen: Almacen | Callable[[], Almacen],
        *,
        cliente: anthropic.AsyncAnthropic | None = None,
        extraer: Extraer = extraer_menu_detallado,
        reloj: Reloj = _ahora,
    ) -> None:
        self.fabrica = fabrica
        self._almacen = almacen
        self.cliente = cliente
        self.extraer = extraer
        self.reloj = reloj
        self._aviso = asyncio.Event()
        self._apagando = False
        self._tarea: asyncio.Task[None] | None = None
        self._latido = time.monotonic()
        self._corrida_desde: float | None = None

    @property
    def almacen(self) -> Almacen:
        return self._almacen if isinstance(self._almacen, Almacen) else self._almacen()

    # --- Bucle -------------------------------------------------------------------------------

    def despertar(self) -> None:
        """Una subida nueva: el siguiente ciclo empieza ya, sin esperar los 10 s."""
        self._aviso.set()

    def iniciar(self) -> asyncio.Task[None]:
        """Arranca `correr` en una tarea vigilada: si muere sin que se esté apagando (una
        excepción que se escapó, una cancelación ajena), se registra y se relanza a los
        `PAUSA_REINICIO_SEGUNDOS` (revisión A4: antes moría en silencio y la cola de ese
        worker se congelaba)."""
        self._latido = time.monotonic()
        self._tarea = asyncio.create_task(self.correr(), name="procesador-importaciones")
        self._tarea.add_done_callback(self._al_terminar)
        return self._tarea

    def _al_terminar(self, tarea: asyncio.Task[None]) -> None:
        if self._apagando:
            return
        motivo = "cancelada" if tarea.cancelled() else repr(tarea.exception())
        log.error("procesador: la tarea terminó sin apagado (%s); se relanza", motivo)
        asyncio.get_running_loop().call_later(PAUSA_REINICIO_SEGUNDOS, self._relanzar)

    def _relanzar(self) -> None:
        if not self._apagando:
            self.iniciar()

    async def detener(self) -> None:
        """Apagado del *lifespan*: la única cancelación que no se relanza."""
        self._apagando = True
        if self._tarea is not None:
            self._tarea.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._tarea

    def estado(self) -> dict[str, Any]:
        """Para `/ready`: `vivo` y hace cuánto dio señales el bucle."""
        ahora = time.monotonic()
        hace = ahora - self._latido
        en_corrida = self._corrida_desde is not None
        if en_corrida:
            assert self._corrida_desde is not None
            vivo = ahora - self._corrida_desde <= PLAZO_CORRIDA_SEGUNDOS + 60
        else:
            vivo = hace <= LATIDO_MAXIMO_SEGUNDOS
        return {"vivo": vivo, "ultimo_ciclo_hace_s": int(hace), "en_corrida": en_corrida}

    async def correr(self) -> None:
        """Bucle de la tarea de fondo. Un error (base caída) se registra y se reintenta en el
        siguiente ciclo. Un `CancelledError` que no es una cancelación de esta tarea (un
        futuro interno cancelado) se registra y el bucle sigue; uno de verdad la termina."""
        log.info("procesador de importaciones en marcha")
        while True:
            self._aviso.clear()  # antes del ciclo: un aviso durante el ciclo no se pierde (B5)
            try:
                await self.ciclo()
            except asyncio.CancelledError:
                tarea = asyncio.current_task()
                if self._apagando or (tarea is not None and tarea.cancelling()):
                    raise
                log.error("procesador: cancelación espuria en el ciclo; sigue")
            except Exception:
                log.exception("procesador: el ciclo falló; se reintenta en el siguiente")
            self._latido = time.monotonic()
            with contextlib.suppress(TimeoutError):
                async with asyncio.timeout(INTERVALO_SEGUNDOS):
                    await self._aviso.wait()

    async def ciclo(self) -> int:
        """Procesa importaciones hasta que no quede ninguna que tomar. Regresa cuántas."""
        procesadas = 0
        while await self.procesar_una():
            procesadas += 1
            self._latido = time.monotonic()
        self._latido = time.monotonic()
        return procesadas

    async def procesar_una(self) -> bool:
        """Toma una importación y la lleva a `listo` o `fallido`. `False` si no había."""
        tomada = await self.tomar()
        if tomada is None:
            return False
        self._corrida_desde = time.monotonic()
        try:
            async with asyncio.timeout(PLAZO_CORRIDA_SEGUNDOS):
                await self._procesar(tomada)
        except asyncio.CancelledError:
            await asyncio.shield(self._devolver(tomada))
            raise
        except TimeoutError:
            log.error("procesador: %s pasó el plazo de la corrida", tomada.id)
            await self._terminar(tomada, fallido=MENSAJE_ERROR)
        finally:
            self._corrida_desde = None
        return True

    # --- Pasos ---------------------------------------------------------------------------------

    async def tomar(self) -> Tomada | None:
        """La siguiente importación, ya marcada `procesando` y confirmada (sin conexión
        retenida después). `None` si no hay ninguna libre."""
        ahora = self.reloj()
        async with self.fabrica() as sesion:
            fila = await sesion.scalar(
                select(ImportacionMenu)
                .where(ImportacionMenu.estado == EstadoImportacion.pendiente)
                .order_by(ImportacionMenu.creado_en, ImportacionMenu.id)
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            if fila is None:
                fila = await sesion.scalar(
                    select(ImportacionMenu)
                    .where(
                        ImportacionMenu.estado == EstadoImportacion.procesando,
                        ImportacionMenu.iniciado_en < ahora - PLAZO_RECUPERACION,
                    )
                    .order_by(ImportacionMenu.iniciado_en, ImportacionMenu.id)
                    .limit(1)
                    .with_for_update(skip_locked=True)
                )
                if fila is not None:
                    log.warning("procesador: se recupera %s, atascada en procesando", fila.id)
            if fila is None:
                await sesion.rollback()
                return None
            if fila.intentos >= MAX_CORRIDAS:
                # Se tomó ya todas las veces que cabe y su proceso volvió a morir.
                log.error("procesador: %s agotó sus corridas atascada", fila.id)
                fila.estado = EstadoImportacion.fallido
                fila.error_mensaje = MENSAJE_ATASCADA
                fila.finalizado_en = ahora
                await sesion.commit()
                return await self.tomar()
            fila.estado = EstadoImportacion.procesando
            fila.intentos += 1
            fila.iniciado_en = ahora
            fila.finalizado_en = None
            fila.error_mensaje = None
            tomada = Tomada(fila.id, fila.archivo_url, fila.archivo_tipo, ahora, fila.intentos)
            await sesion.commit()
        log.info("procesador: toma %s (corrida %d)", tomada.id, tomada.intentos)
        return tomada

    async def _procesar(self, tomada: Tomada) -> None:
        try:
            async with asyncio.timeout(assets.PLAZO_ALMACEN_SEGUNDOS):
                datos = await self.almacen.leer_privado(tomada.clave, MAX_BYTES)
        except (ErrorAlmacen, TimeoutError) as error:
            log.error("procesador: sin archivo para %s: %s", tomada.id, type(error).__name__)
            await self._terminar(tomada, fallido=MENSAJE_SIN_ARCHIVO, cuenta=False)
            return
        try:
            extraccion = await self.extraer(datos, tomada.tipo, cliente=self.cliente)
        except ErrorExtraccion as error:
            log.warning("procesador: %s falló (causa=%s)", tomada.id, error.causa)
            cuenta = error.causa not in CAUSAS_QUE_NO_CUENTAN
            await self._terminar(tomada, fallido=error.mensaje, cuenta=cuenta)
            return
        except (ArchivoNoValido, TipoArchivoNoPermitido) as error:
            # La subida ya lo validó; si aun así llega aquí, el mensaje es para el operador.
            log.warning("procesador: %s archivo rechazado (%s)", tomada.id, type(error).__name__)
            await self._terminar(tomada, fallido=str(error))
            return
        except Exception:
            log.exception("procesador: error inesperado con %s", tomada.id)
            await self._terminar(tomada, fallido=MENSAJE_ERROR)
            return
        log.info(
            "procesador: %s listo (modelo=%s tokens_entrada=%d tokens_salida=%d "
            "intentos_api=%d paginas=%d)",
            tomada.id,
            extraccion.modelo,
            extraccion.tokens_entrada,
            extraccion.tokens_salida,
            extraccion.intentos,
            extraccion.paginas,
        )
        await self._terminar(tomada, extraccion=extraccion)

    async def _terminar(
        self,
        tomada: Tomada,
        *,
        extraccion: Extraccion | None = None,
        fallido: str | None = None,
        cuenta: bool = True,
    ) -> bool:
        """Escribe el resultado si la fila sigue siendo de esta corrida. `cuenta=False`
        devuelve la corrida (la falla no fue del archivo: almacén, llave o API caídos)."""
        valores: dict[str, Any] = {"finalizado_en": self.reloj()}
        if not cuenta:
            valores["intentos"] = tomada.intentos - 1
        if extraccion is not None:
            valores |= {
                "estado": EstadoImportacion.listo,
                "resultado": extraccion.resultado.model_dump(mode="json"),
                "modelo": extraccion.modelo[:60],
                "tokens_entrada": extraccion.tokens_entrada,
                "tokens_salida": extraccion.tokens_salida,
                "paginas": extraccion.paginas,
                "error_mensaje": None,
            }
        else:
            valores |= {"estado": EstadoImportacion.fallido, "error_mensaje": fallido}
        return await self._escribir_si_es_mia(tomada, valores)

    async def _devolver(self, tomada: Tomada) -> None:
        """Apagado a media corrida: vuelve a `pendiente` y la corrida no cuenta."""
        try:
            async with asyncio.timeout(PLAZO_DEVOLVER_SEGUNDOS):
                await self._escribir_si_es_mia(
                    tomada,
                    {
                        "estado": EstadoImportacion.pendiente,
                        "intentos": tomada.intentos - 1,
                        "iniciado_en": None,
                    },
                )
            log.info("procesador: %s vuelve a la cola (apagado)", tomada.id)
        except Exception as error:
            log.warning("procesador: no se pudo devolver %s: %s", tomada.id, type(error).__name__)

    async def _escribir_si_es_mia(self, tomada: Tomada, valores: dict[str, Any]) -> bool:
        async with self.fabrica() as sesion:
            resultado = await sesion.execute(
                update(ImportacionMenu)
                .where(
                    ImportacionMenu.id == tomada.id,
                    ImportacionMenu.estado == EstadoImportacion.procesando,
                    ImportacionMenu.iniciado_en == tomada.iniciado_en,
                )
                .values(**valores)
                .execution_options(synchronize_session=False)
            )
            await sesion.commit()
        escrita = bool(getattr(resultado, "rowcount", 0))
        if not escrita:
            log.warning("procesador: %s ya no es de esta corrida; no se escribe", tomada.id)
        return escrita


# ---------------------------------------------------------------------------
# Instancia del proceso (la arranca `app.main`)
# ---------------------------------------------------------------------------

_procesador: Procesador | None = None


def instalar(procesador: Procesador | None) -> None:
    global _procesador
    _procesador = procesador


def despertar() -> None:
    """Para la ruta de subida: avisa al procesador de este worker, si corre."""
    if _procesador is not None:
        _procesador.despertar()


def estado() -> dict[str, Any] | None:
    """Para `/ready`: el estado del procesador de este worker, o `None` si no corre aquí."""
    return _procesador.estado() if _procesador is not None else None
