"""Aplicación FastAPI de Carta.

Sin middleware de CORS: la PWA se sirve desde el mismo dominio que la API (ADR-010, ADR-015);
la sirve esta misma aplicación (`app.core.estaticos`) con las cabeceras de seguridad de
`app.core.cabeceras`, así la imagen no necesita ningún proxy delante.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from app import __version__
from app.api import router as router_api_v1
from app.api.salud import router as router_salud
from app.core.cabeceras import RUTAS_DOCS, cabeceras_seguridad, registrar_cabeceras_seguridad
from app.core.config import settings
from app.core.errores import registrar_manejadores
from app.core.estaticos import EstaticosInmutables, montar_frontend
from app.core.peticion import MiddlewareRequestId
from app.core.registro import configurar_registro
from app.db import async_session, close_db
from app.services import procesador, sesion
from app.services.assets import obtener_almacen


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Arranque y apagado. El esquema lo crean las migraciones, no la aplicación.

    Arranca el procesador de importaciones de este worker (`app.services.procesador`, T-1.9):
    al arrancar y cada 10 s toma la cola con `SKIP LOCKED`, así que N workers son seguros. Si
    la tarea muere sola se relanza; al apagar se detiene y la importación en curso vuelve a
    `pendiente`.

    Arranca también el cierre de sesiones inactivas (`app.services.sesion`, T-2.1): cada 5 min
    cierra las sesiones de mesa sin actividad en 3 h; con N workers `SKIP LOCKED` las reparte.
    """
    trabajador = procesador.Procesador(async_session, obtener_almacen)
    procesador.instalar(trabajador)
    trabajador.iniciar()
    cierre = sesion.CierreInactivas(async_session)
    cierre.iniciar()
    try:
        yield
    finally:
        procesador.instalar(None)
        await cierre.detener()
        await trabajador.detener()
        await close_db()


def create_app() -> FastAPI:
    configurar_registro()

    # Swagger y ReDoc sólo en desarrollo: cargan desde un CDN con un script en línea y la CSP
    # los bloquea; en desarrollo sus rutas salen sin CSP. `/openapi.json` (lo que usa
    # `npm run tipos`) se publica siempre.
    con_docs = settings.ENTORNO == "desarrollo"
    app = FastAPI(
        title="Carta API",
        description="Menú visual por QR, orden compartida en la mesa y comanda directa al personal.",
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs" if con_docs else None,
        redoc_url="/redoc" if con_docs else None,
    )

    registrar_manejadores(app)
    # Orden: el de cabeceras primero y `MiddlewareRequestId` al final, para que éste quede el
    # más externo (regla de CLAUDE.md: uno por fuera que falle pierde cabecera y línea de acceso).
    registrar_cabeceras_seguridad(
        app, cabeceras_seguridad(settings), sin_csp=RUTAS_DOCS if con_docs else ()
    )
    app.add_middleware(MiddlewareRequestId)

    app.include_router(router_salud)
    app.include_router(router_api_v1, prefix="/api/v1")
    # Sólo en desarrollo con el almacén local: sus fotos (`AlmacenLocal`, URL `/almacen/…`)
    # se ven en el navegador. Fuera de desarrollo las sirve R2 y esta ruta no existe (404).
    if settings.ENTORNO == "desarrollo" and not settings.almacen_en_nube:
        publico = Path(settings.ALMACEN_LOCAL_RUTA) / "publico"
        app.mount("/almacen", EstaticosInmutables(directory=publico, check_dir=False), "almacen")
    # Al final: la SPA y los estáticos atienden sólo lo que ninguna ruta anterior reclamó.
    montar_frontend(app, Path(settings.FRONTEND_DIST))

    return app


app = create_app()
