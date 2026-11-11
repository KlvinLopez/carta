"""Sesión de mesa del comensal (T-2.1, US-01, US-02, US-03). Sin FastAPI (regla dura 2).

**Entrar** (`entrar`): el código del QR se resuelve con `mesas.mesa_por_codigo` (sólo mesas
activas de restaurantes activos con el código vigente; revocado, dado de baja y desconocido
son el mismo 404, AC-01.3 y AC-21.3). Después:

1. Se busca la sesión viva de la mesa (`activa` o `lista_para_enviar`, INV-1). Si no hay, se
   crea dentro de un *savepoint*; si otra petición la creó a la vez, el índice único parcial
   `uq_sesion_viva_por_mesa` lo rechaza, se vuelve al *savepoint* y se relee: se une a la que
   ganó.
2. Se bloquea la sesión con `SELECT … FOR NO KEY UPDATE` **volviendo a comprobar que sigue
   viva** (INV-11). Si entretanto se cerró (inactividad, personal), se vuelve al paso 1: el
   comensal nunca queda en una sesión cerrada (`unirse` da 410 `SESION_CERRADA`).
   `FOR NO KEY UPDATE` y no el `FOR SHARE` que pide INV-11 porque el tope de 12 necesita
   serializar las uniones: con `FOR SHARE` dos uniones simultáneas verían 11 miembros y
   entrarían las dos. No choca con el `FOR KEY SHARE` que toman las llaves foráneas de los
   miembros y las órdenes que se insertan en la sesión (fila T-2.1 de 04 §11).
3. Si la cookie ya es de un miembro de esa sesión, se reanuda (AC-01.4: misma identidad, sin
   miembro nuevo, aunque la sesión esté llena). Si no, miembro nuevo: «Comensal N», color N
   de `COLORES` (estable: no cambia en toda la sesión), `host` el primero, 409
   `SESION_LLENA` con 12 (AC-02.5).

Entrar, cambiar el alias (y en la Fase 3, pedir) es **actividad**: mueve
`ultima_actividad_en`. El sondeo no lo es: un teléfono olvidado en la mesa no la mantiene
abierta.

**Regenerar el código con una sesión abierta** (decisión de T-2.1, AC-21.3): la sesión y sus
miembros siguen; el código viejo deja de abrir la mesa (404) y el nuevo entra en la misma
sesión viva. El token del comensal está atado a su sesión, no al código: regenerar sirve para
que nadie **más** entre con un QR filtrado; para sacar a quien ya está, el personal libera la
mesa (T-3.4), que cierra la sesión. Así ningún comensal pierde su orden a media comida por un
cambio de tarjeta. Fila T-2.1 de 04 §11.

**Estado** (`leer_estado`): lo que pinta el sondeo de 3 s (AC-02.3), con un `ETag` que es el
hash del contenido. `CacheEstados` lo guarda en memoria por `sesion_id` a lo más
`VIDA_ESTADO_SEGUNDOS` (2 s, 02 §6) y cada escritura de este servicio lo invalida: con la
foto fresca el 304 no toca la base. Con N workers otro worker puede servir hasta 2 s de estado
viejo. La generación por sesión impide guardar una lectura anterior a una escritura.

**Cierre por inactividad** (`cerrar_inactivas`, AC-02.4): una sola sentencia cierra las
sesiones vivas sin actividad en `INACTIVIDAD_MAXIMA` (3 h). Toma las filas con
`FOR NO KEY UPDATE SKIP LOCKED`: dos workers a la vez se reparten las filas sin esperarse ni
cerrar dos veces, y una sesión que alguien está usando en ese instante se salta (está viva).
Las comandas de la sesión no se tocan (regla dura 8). `CierreInactivas` la corre cada
`INTERVALO_CIERRE_SEGUNDOS` en cada worker, con el patrón de `app.services.procesador`.
"""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import logging
import re
import time
import unicodedata
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.errores import ErrorCarta, restriccion_de
from app.core.seguridad import Invitado
from app.db.models import Mesa, MiembroSesion, OrdenPersonal, Restaurante, SesionGrupal
from app.services import mesas

log = logging.getLogger("carta.sesion")

ESTADOS_VIVOS = ("activa", "lista_para_enviar")
MAX_MIEMBROS = 12  # AC-02.5
INACTIVIDAD_MAXIMA = timedelta(hours=3)  # AC-02.4
VIDA_ESTADO_SEGUNDOS = 2.0  # 02 §6
INTERVALO_CIERRE_SEGUNDOS = 300.0
LOTE_CIERRE = 500
PAUSA_REINICIO_SEGUNDOS = 5.0
# Vueltas de `entrar` si la sesión se cierra o la crea otro mientras tanto. Cada vuelta exige
# que alguien haya cerrado o creado una sesión en esa mesa en ese mismo instante.
MAX_VUELTAS_ENTRAR = 5
# Alfabeto de `secrets.token_urlsafe` (T-1.5). Lo que no tiene esta forma no se consulta: un NUL
# llegaba a asyncpg y daba 500 en una ruta anónima (revisión de T-2.1, A2); sale el mismo 404.
FORMA_CODIGO = re.compile(r"[A-Za-z0-9_-]{1,100}")

# Un color por comensal, del más al menos de la marca (`/diseno-visual`); con 12 miembros
# como máximo nadie repite. Mayúsculas: el contrato publica `^#[0-9A-F]{6}$`.
COLORES = (
    "#4F1728",  # vino
    "#B8860B",  # dorado
    "#2F5D50",  # verde botella
    "#C2562E",  # terracota
    "#3B4A7A",  # índigo
    "#8A5A83",  # ciruela
    "#5E7D3A",  # olivo
    "#A63D40",  # granada
    "#2D6E8E",  # petróleo
    "#7A5230",  # nuez
    "#6B2D3E",  # vino claro
    "#4E5D6C",  # pizarra
)


def _no_encontrada() -> ErrorCarta:
    return ErrorCarta("MESA_NO_ENCONTRADA", "No encontramos esta mesa.", 404)


def sesion_cerrada() -> ErrorCarta:
    return ErrorCarta(
        "SESION_CERRADA", "La mesa se cerró. Escanea el QR otra vez para empezar.", 410
    )


def _credencial_ajena() -> ErrorCarta:
    return ErrorCarta("TOKEN_INVALIDO", "Tu acceso a la mesa no es válido; vuelve a escanear.", 401)


def _ahora() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Alias: lista de bloqueo básica (AC-03.3)
# ---------------------------------------------------------------------------

# Insultos y odio comunes en México y en inglés, ya normalizados (minúsculas, sin acentos,
# «ñ» como «ny» para que «coño» no choque con «cono»). Se decide **por palabra** (revisión de
# T-2.1, B1): cada palabra del alias, y el alias entero sin separadores («p u t o», «P.U.T.O»),
# se pliega (dígitos finales, *leet*, letras repetidas, plural, aumentativo) y se compara con
# la lista. Una subcadena sólo bloquea con `RAICES`, raíces que no forman parte de nombres ni
# de palabras comunes: «Maricarmen», «Therapist», «Vergara» o «Computadora» pasan. Sin
# nombres propios en la lista («Dick», «Pito»). Es básica a propósito (AC-03.3): el alias no
# sale de la mesa; los homoglifos (cirílico) quedan fuera (T-4.1).
BLOQUEADAS = frozenset(
    {
        "puto", "puta", "pendejo", "pendeja", "verga", "chinga", "chingada", "chingado",
        "chingar", "chingadera", "culero", "culera", "cabron", "cabrona", "mamon", "mamona",
        "mamada", "joto", "maricon", "marica", "pinche", "ojete", "zorra", "perra", "mierda",
        "culo", "panocha", "conyo", "polla", "gilipollas", "imbecil", "estupido", "estupida",
        "idiota", "naco", "naca", "nazi", "hitler", "violador", "pedofilo", "punyal",
        "malparido", "hijueputa", "fuck", "fucker", "fucking", "shit", "bitch", "cunt",
        "pussy", "whore", "slut", "asshole", "bastard", "retard", "nigger", "nigga",
        "faggot", "rape", "rapist",
    }
)  # fmt: skip
RAICES = frozenset(
    {
        "pendej", "chingad", "chingar", "hijueput", "hijodeput", "putamadre", "malparid",
        "gilipoll", "pedofil", "maricon", "culer", "nigger", "nigga", "faggot", "fuck",
    }
)  # fmt: skip
# «putote», «putazo»: el aumentativo de una palabra bloqueada también. Sin diminutivos
# («Perrito») ni «-on» («Pitón»).
AUMENTATIVOS = ("otes", "otas", "ote", "ota", "azos", "azas", "azo", "aza")
_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a",
                       "$": "s", "!": "i", "|": "i", "8": "b"})  # fmt: skip


def _normalizar(texto: str) -> str:
    """Minúsculas, «ñ» → «ny» y sin acentos; los dígitos y `@$!|` se quedan (para el *leet*)."""
    texto = texto.casefold().replace("ñ", "ny")
    return "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))


def _formas(palabra: str) -> set[str]:
    """Las formas plegadas de una palabra: con y sin dígitos finales, *leet*, letras
    repetidas a una o a dos, y sin plural."""
    bases = {palabra.translate(_LEET), palabra.rstrip("0123456789").translate(_LEET)}
    formas: set[str] = set()
    for base in bases:
        base = re.sub(r"[^a-z]", "", base)
        for forma in (base, re.sub(r"(.)\1+", r"\1", base), re.sub(r"(.)\1{2,}", r"\1\1", base)):
            formas.add(forma)
            for plural in ("es", "s"):
                if forma.endswith(plural) and len(forma) > len(plural) + 2:
                    formas.add(forma[: -len(plural)])
    return formas


def _bloqueada(forma: str) -> bool:
    if forma in BLOQUEADAS:
        return True
    for sufijo in AUMENTATIVOS:
        raiz = forma.removesuffix(sufijo)
        if (
            raiz != forma
            and len(raiz) >= 3
            and (raiz + "o" in BLOQUEADAS or raiz + "a" in BLOQUEADAS)
        ):
            return True
    return any(raiz in forma for raiz in RAICES)


def alias_permitido(alias: str) -> bool:
    palabras = re.findall(r"[a-z0-9@$!|]+", _normalizar(alias))
    candidatas = [*palabras, "".join(palabras)]
    return not any(_bloqueada(forma) for palabra in candidatas for forma in _formas(palabra))


# ---------------------------------------------------------------------------
# Entrar (AC-01.2–AC-01.4, AC-02.1, AC-02.2, AC-02.5, AC-03.1)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Entrada:
    """Resultado de `entrar`: lo que pinta la bienvenida y lo que firma el token."""

    sesion: SesionGrupal
    miembro: MiembroSesion
    mesa: Mesa
    restaurante: Restaurante
    reanudada: bool

    @property
    def invitado(self) -> Invitado:
        return Invitado(self.miembro.id, self.sesion.id, self.restaurante.id)


async def _id_sesion_viva(sesion: AsyncSession, mesa_id: UUID) -> UUID | None:
    return await sesion.scalar(
        select(SesionGrupal.id).where(
            SesionGrupal.mesa_id == mesa_id, SesionGrupal.estado.in_(ESTADOS_VIVOS)
        )
    )


async def _crear_sesion(sesion: AsyncSession, mesa: Mesa, ahora: datetime) -> UUID | None:
    """La sesión nueva de la mesa, o `None` si otra petición creó una a la vez (INV-1)."""
    nueva = SesionGrupal(
        mesa_id=mesa.id,
        restaurante_id=mesa.restaurante_id,
        estado="activa",
        inicio=ahora,
        ultima_actividad_en=ahora,
    )
    try:
        async with sesion.begin_nested():
            sesion.add(nueva)
            await sesion.flush()
    except IntegrityError as error:
        if restriccion_de(error) != "uq_sesion_viva_por_mesa":
            raise
        log.info("entrar: otra petición abrió la sesión de la mesa a la vez; se relee")
        return None
    return nueva.id


async def unirse(sesion: AsyncSession, sesion_id: UUID) -> SesionGrupal:
    """Bloquea la sesión para unirse o escribir en ella (INV-11). 410 si ya no está viva:
    la condición se vuelve a evaluar después de esperar el candado, así que una sesión que
    otro cerró mientras esperábamos tampoco pasa. Una sesión de una mesa dada de baja o de un
    restaurante inactivo cuenta como cerrada (revisión de T-2.1, B2). Sólo se bloquea la fila
    de la sesión (`OF sesion_grupal`)."""
    grupal = await sesion.scalar(
        select(SesionGrupal)
        .join(Mesa, Mesa.id == SesionGrupal.mesa_id)
        .join(Restaurante, Restaurante.id == SesionGrupal.restaurante_id)
        .where(
            SesionGrupal.id == sesion_id,
            SesionGrupal.estado.in_(ESTADOS_VIVOS),
            Mesa.activa.is_(True),
            Restaurante.activo.is_(True),
        )
        .with_for_update(key_share=True, of=SesionGrupal)
        .execution_options(populate_existing=True)
    )
    if grupal is None:
        raise sesion_cerrada()
    return grupal


async def _miembros(sesion: AsyncSession, sesion_id: UUID) -> Sequence[MiembroSesion]:
    return (
        await sesion.scalars(
            select(MiembroSesion)
            .where(MiembroSesion.sesion_id == sesion_id)
            .order_by(MiembroSesion.unido_en, MiembroSesion.id)
        )
    ).all()


async def _nuevo_miembro(
    sesion: AsyncSession, grupal: SesionGrupal, ahora: datetime
) -> MiembroSesion:
    cuantos = await sesion.scalar(
        select(func.count()).select_from(MiembroSesion).where(MiembroSesion.sesion_id == grupal.id)
    )
    n = int(cuantos or 0) + 1
    if n > MAX_MIEMBROS:
        raise ErrorCarta(
            "SESION_LLENA", f"Esta mesa ya tiene {MAX_MIEMBROS} comensales conectados.", 409
        )
    miembro = MiembroSesion(
        sesion_id=grupal.id,
        rol="host" if n == 1 else "miembro",
        estado="activo",
        alias=f"Comensal {n}",
        color_avatar=COLORES[(n - 1) % len(COLORES)],
        unido_en=ahora,
    )
    sesion.add(miembro)
    return miembro


async def entrar(
    sesion: AsyncSession,
    codigo: str,
    invitado: Invitado | None = None,
    *,
    ahora: datetime | None = None,
) -> Entrada:
    """Crea o reanuda la sesión de la mesa y el miembro del comensal. Confirma."""
    momento = ahora or _ahora()
    if not FORMA_CODIGO.fullmatch(codigo):
        raise _no_encontrada()
    mesa = await mesas.mesa_por_codigo(sesion, codigo)
    if mesa is None:
        raise _no_encontrada()
    restaurante = await sesion.get(Restaurante, mesa.restaurante_id)
    if restaurante is None:  # la FK lo impide; por si acaso, el mismo 404
        raise _no_encontrada()
    for _ in range(MAX_VUELTAS_ENTRAR):
        sesion_id = await _id_sesion_viva(sesion, mesa.id)
        if sesion_id is None:
            sesion_id = await _crear_sesion(sesion, mesa, momento)
            if sesion_id is None:
                continue
        try:
            grupal = await unirse(sesion, sesion_id)
        except ErrorCarta:
            log.info("entrar: la sesión %s se cerró mientras entraba; se busca otra", sesion_id)
            continue
        miembro = None
        if invitado is not None and invitado.sesion_id == grupal.id:
            miembro = await sesion.scalar(
                select(MiembroSesion).where(
                    MiembroSesion.id == invitado.miembro_id,
                    MiembroSesion.sesion_id == grupal.id,
                )
            )
        reanudada = miembro is not None
        if miembro is None:
            miembro = await _nuevo_miembro(sesion, grupal, momento)
        grupal.ultima_actividad_en = momento
        await sesion.commit()
        cache_estados.invalidar(grupal.id)
        return Entrada(grupal, miembro, mesa, restaurante, reanudada)
    raise sesion_cerrada()


# ---------------------------------------------------------------------------
# Alias (AC-03.2, AC-03.3)
# ---------------------------------------------------------------------------


async def cambiar_alias(
    sesion: AsyncSession, invitado: Invitado, alias: str, *, ahora: datetime | None = None
) -> MiembroSesion:
    """El alias nuevo; 422 `ALIAS_NO_PERMITIDO` (y el anterior se queda) si está en la lista
    de bloqueo; 410 si la sesión ya se cerró."""
    if not alias_permitido(alias):
        raise ErrorCarta("ALIAS_NO_PERMITIDO", "Ese alias no está permitido; prueba con otro.", 422)
    grupal = await unirse(sesion, invitado.sesion_id)
    if grupal.restaurante_id != invitado.restaurante_id:
        raise _credencial_ajena()
    miembro = await sesion.scalar(
        select(MiembroSesion).where(
            MiembroSesion.id == invitado.miembro_id, MiembroSesion.sesion_id == grupal.id
        )
    )
    if miembro is None:
        raise _credencial_ajena()
    miembro.alias = alias
    grupal.ultima_actividad_en = ahora or _ahora()
    await sesion.commit()
    cache_estados.invalidar(grupal.id)
    return miembro


# ---------------------------------------------------------------------------
# Estado para el sondeo (AC-02.3) con ETag en memoria (02 §6)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FotoEstado:
    """El estado de la mesa, igual para todos sus miembros. `contenido` es el JSON de
    `SesionEstado` sin `yo`; `huella`, su hash."""

    sesion_id: UUID
    restaurante_id: UUID
    contenido: dict[str, Any]
    huella: str
    miembros: frozenset[UUID]

    def etag(self, miembro_id: UUID) -> str:
        """`ETag` fuerte del cuerpo que ve `miembro_id` (lleva `yo`)."""
        digesto = hashlib.sha256(f"{self.huella}:{miembro_id}".encode()).hexdigest()
        return f'"{digesto[:32]}"'

    def cuerpo(self, miembro_id: UUID) -> dict[str, Any]:
        return {**self.contenido, "yo": str(miembro_id)}


@dataclass
class _Entrada:
    foto: FotoEstado
    expira: float


@dataclass
class CacheEstados:
    """`sesion_id` → foto del estado, viva `vida` segundos. Por worker, sin Redis."""

    vida: float = VIDA_ESTADO_SEGUNDOS
    reloj: Callable[[], float] = time.monotonic
    maximo: int = 5000
    _fotos: dict[UUID, _Entrada] = field(default_factory=dict)
    _generaciones: dict[UUID, int] = field(default_factory=dict)

    def obtener(self, sesion_id: UUID) -> FotoEstado | None:
        entrada = self._fotos.get(sesion_id)
        if entrada is None or entrada.expira <= self.reloj():
            return None
        return entrada.foto

    def generacion(self, sesion_id: UUID) -> int:
        return self._generaciones.get(sesion_id, 0)

    def guardar(self, foto: FotoEstado, generacion: int) -> None:
        """Descarta la foto si hubo una escritura desde que se tomó `generacion`."""
        if generacion != self.generacion(foto.sesion_id):
            return
        if len(self._fotos) >= self.maximo:
            ahora = self.reloj()
            for clave in [k for k, v in self._fotos.items() if v.expira <= ahora]:
                del self._fotos[clave]
            if len(self._fotos) >= self.maximo:
                self._fotos.clear()
        self._fotos[foto.sesion_id] = _Entrada(foto, self.reloj() + self.vida)

    def invalidar(self, sesion_id: UUID) -> None:
        self._fotos.pop(sesion_id, None)
        self._generaciones[sesion_id] = self.generacion(sesion_id) + 1
        if len(self._generaciones) > self.maximo:
            # Una generación vieja sólo protege una lectura en curso de hace milisegundos.
            self._generaciones.clear()

    def vaciar(self) -> None:
        self._fotos.clear()
        self._generaciones.clear()


cache_estados = CacheEstados()


async def leer_estado(sesion: AsyncSession, sesion_id: UUID) -> FotoEstado:
    """La foto del estado desde la base (tres consultas por índice). 410 si no está viva, o
    si su mesa está dada de baja o su restaurante inactivo (revisión de T-2.1, B2)."""
    fila = (
        await sesion.execute(
            select(SesionGrupal, Mesa, Restaurante.activo)
            .join(Mesa, Mesa.id == SesionGrupal.mesa_id)
            .join(Restaurante, Restaurante.id == SesionGrupal.restaurante_id)
            .where(SesionGrupal.id == sesion_id)
        )
    ).first()
    if fila is None or fila[0].estado not in ESTADOS_VIVOS or not fila[1].activa or not fila[2]:
        raise sesion_cerrada()
    grupal, mesa, _ = fila
    miembros = await _miembros(sesion, sesion_id)
    # `listo` = confirmó su orden viva (Fase 3; INV-2: una orden viva por miembro).
    listos = set(
        (
            await sesion.scalars(
                select(OrdenPersonal.miembro_id).where(
                    OrdenPersonal.sesion_id == sesion_id, OrdenPersonal.estado == "confirmada"
                )
            )
        ).all()
    )
    contenido: dict[str, Any] = {
        "id": str(grupal.id),
        "estado": grupal.estado,
        "mesa": {"numero": mesa.numero, "capacidad": mesa.capacidad},
        "listos": sum(1 for m in miembros if m.id in listos),
        "total_miembros": len(miembros),
        "miembros": [
            {
                "id": str(m.id),
                "alias": m.alias or "Comensal",
                "color_avatar": (m.color_avatar or COLORES[0]).upper(),
                "rol": m.rol,
                "estado": "listo" if m.id in listos else "armando",
            }
            for m in miembros
        ],
    }
    huella = hashlib.sha256(
        json.dumps(contenido, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    return FotoEstado(
        sesion_id=grupal.id,
        restaurante_id=grupal.restaurante_id,
        contenido=contenido,
        huella=huella,
        miembros=frozenset(m.id for m in miembros),
    )


async def estado(sesion: AsyncSession, invitado: Invitado) -> FotoEstado:
    """La foto de la sesión del invitado: de la memoria si tiene menos de 2 s (sin tocar la
    base), si no de la base. 401 si el miembro no es de esa sesión; 410 si se cerró.

    Sólo una foto **recién leída** puede dar 401 (revisión de T-2.1, A1): con N workers, el
    que tiene la foto en memoria no ve a quien acaba de entrar por otro worker; si el miembro
    no está en la foto de memoria se relee la base una vez y se decide con esa."""

    def es_suya(foto: FotoEstado) -> bool:
        return (
            foto.restaurante_id == invitado.restaurante_id and invitado.miembro_id in foto.miembros
        )

    async def de_la_base() -> FotoEstado:
        generacion = cache_estados.generacion(invitado.sesion_id)
        fresca = await leer_estado(sesion, invitado.sesion_id)
        cache_estados.guardar(fresca, generacion)
        return fresca

    foto = cache_estados.obtener(invitado.sesion_id)
    if foto is None:
        foto = await de_la_base()
    elif not es_suya(foto):
        foto = await de_la_base()
    if not es_suya(foto):
        raise _credencial_ajena()
    return foto


def coincide_etag(si_no_coincide: str | None, etag: str) -> bool:
    """`If-None-Match` (RFC 9110 §13.1.2): lista separada por comas, comparación débil."""
    if not si_no_coincide:
        return False
    valor = si_no_coincide.strip()
    if valor == "*":
        return True
    propio = etag.removeprefix("W/")
    return any(parte.strip().removeprefix("W/") == propio for parte in valor.split(","))


# ---------------------------------------------------------------------------
# Cierre por inactividad (AC-02.4)
# ---------------------------------------------------------------------------


async def cerrar_inactivas(
    sesion: AsyncSession, *, ahora: datetime | None = None, lote: int = LOTE_CIERRE
) -> list[UUID]:
    """Cierra hasta `lote` sesiones vivas sin actividad en 3 h. Confirma. Regresa sus ids."""
    momento = ahora or _ahora()
    # CTE materializado: se evalúa una sola vez. Como subconsulta de `IN (…)`, PostgreSQL
    # podía volver a ejecutarla y, con empates en `ultima_actividad_en`, el `LIMIT` daba filas
    # distintas en cada vuelta: con `lote=2` se cerraban 5 (revisión de T-2.1, B3e).
    candidatas = (
        select(SesionGrupal.id)
        .where(
            SesionGrupal.estado.in_(ESTADOS_VIVOS),
            SesionGrupal.ultima_actividad_en < momento - INACTIVIDAD_MAXIMA,
        )
        .order_by(SesionGrupal.ultima_actividad_en, SesionGrupal.id)
        .limit(lote)
        .with_for_update(key_share=True, skip_locked=True)
        .cte("candidatas")
        .prefix_with("MATERIALIZED")
    )
    cerradas = list(
        (
            await sesion.scalars(
                update(SesionGrupal)
                .where(SesionGrupal.id.in_(select(candidatas.c.id)))
                .values(estado="cerrada", fin=momento)
                .returning(SesionGrupal.id)
                .execution_options(synchronize_session=False)
            )
        ).all()
    )
    await sesion.commit()
    for sesion_id in cerradas:
        cache_estados.invalidar(sesion_id)
    if cerradas:
        log.info("cierre por inactividad: %d sesiones", len(cerradas))
    return cerradas


Reloj = Callable[[], datetime]


class CierreInactivas:
    """Tarea de fondo de cada worker (la arranca el *lifespan* de `app.main`): al arrancar y
    cada `INTERVALO_CIERRE_SEGUNDOS` corre `cerrar_inactivas` con una sesión nueva que suelta
    al terminar (sin conexión retenida entre ciclos). Si muere sin apagado se relanza a los
    `PAUSA_REINICIO_SEGUNDOS`, como `app.services.procesador.Procesador`. Segura con N
    workers: `SKIP LOCKED` reparte las filas."""

    def __init__(
        self,
        fabrica: async_sessionmaker[AsyncSession],
        *,
        intervalo: float = INTERVALO_CIERRE_SEGUNDOS,
        lote: int = LOTE_CIERRE,
        reloj: Reloj = _ahora,
    ) -> None:
        self.fabrica = fabrica
        self.intervalo = intervalo
        self.lote = lote
        self.reloj = reloj
        self._apagando = False
        self._tarea: asyncio.Task[None] | None = None

    def iniciar(self) -> asyncio.Task[None]:
        self._tarea = asyncio.create_task(self.correr(), name="cierre-sesiones-inactivas")
        self._tarea.add_done_callback(self._al_terminar)
        return self._tarea

    def _al_terminar(self, tarea: asyncio.Task[None]) -> None:
        if self._apagando:
            return
        motivo = "cancelada" if tarea.cancelled() else repr(tarea.exception())
        log.error("cierre de sesiones: la tarea terminó sin apagado (%s); se relanza", motivo)
        asyncio.get_running_loop().call_later(PAUSA_REINICIO_SEGUNDOS, self._relanzar)

    def _relanzar(self) -> None:
        if not self._apagando:
            self.iniciar()

    async def detener(self) -> None:
        self._apagando = True
        if self._tarea is not None:
            self._tarea.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._tarea

    async def ciclo(self) -> int:
        """Cierra lotes hasta que no quede ninguna; regresa cuántas cerró."""
        total = 0
        while True:
            async with self.fabrica() as sesion:
                cerradas = await cerrar_inactivas(sesion, ahora=self.reloj(), lote=self.lote)
            total += len(cerradas)
            if len(cerradas) < self.lote:
                return total

    async def correr(self) -> None:
        log.info("cierre de sesiones inactivas en marcha")
        while True:
            try:
                await self.ciclo()
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("cierre de sesiones: el ciclo falló; se reintenta en el siguiente")
            await asyncio.sleep(self.intervalo)
