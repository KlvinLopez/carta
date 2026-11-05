"""Registro (logging) en JSON, una línea por evento, con el `request_id` de la petición.

`request_id_actual` es la variable de contexto que fija el middleware de `app.core.peticion`;
cualquier log emitido mientras se atiende la petición la lleva sin que el código que lo emite
tenga que pasarla.
"""

from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

request_id_actual: ContextVar[str | None] = ContextVar("request_id_actual", default=None)

NOMBRE_MANEJADOR = "carta_json"

# Campos `extra` que se copian a la línea cuando el registro los trae.
CAMPOS_EXTRA = ("metodo", "ruta", "estado", "latencia_ms", "codigo", "http")

# Atributos estándar de `LogRecord`; todo lo demás que traiga el registro es `extra`.
# `color_message` es el adorno con colores ANSI de uvicorn: no aporta nada a una línea JSON.
_ATRIBUTOS_ESTANDAR = frozenset(vars(logging.LogRecord("", 0, "", 0, "", (), None))) | {
    "message",
    "color_message",
}


class FormateadorJson(logging.Formatter):
    """Serializa cada registro como un objeto JSON en una sola línea."""

    def format(self, record: logging.LogRecord) -> str:
        datos: dict[str, Any] = {
            "ts": datetime.now(UTC).isoformat(timespec="milliseconds"),
            "nivel": record.levelname,
            "logger": record.name,
            "mensaje": record.getMessage(),
            "request_id": getattr(record, "request_id", None) or request_id_actual.get(),
        }
        for clave, valor in vars(record).items():
            if clave in CAMPOS_EXTRA or (clave not in _ATRIBUTOS_ESTANDAR and clave not in datos):
                datos[clave] = valor
        if record.exc_info:
            datos["excepcion"] = self.formatException(record.exc_info)
        return json.dumps(datos, ensure_ascii=False, default=str)


def configurar_registro(nivel: int = logging.INFO) -> None:
    """Deja el logger raíz escribiendo JSON a stdout. Idempotente.

    El log de acceso de uvicorn se apaga: la línea por petición la escribe el middleware
    de `request_id`, con ruta, estado y latencia. Los demás loggers de uvicorn se redirigen
    al raíz para que todo salga en el mismo formato.
    """
    raiz = logging.getLogger()
    raiz.setLevel(nivel)
    if not any(h.get_name() == NOMBRE_MANEJADOR for h in raiz.handlers):
        manejador = logging.StreamHandler(sys.stdout)
        manejador.set_name(NOMBRE_MANEJADOR)
        manejador.setFormatter(FormateadorJson())
        raiz.addHandler(manejador)

    logging.getLogger("uvicorn.access").disabled = True
    for nombre in ("uvicorn", "uvicorn.error"):
        logger = logging.getLogger(nombre)
        logger.handlers.clear()
        logger.propagate = True
