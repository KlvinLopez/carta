"""Límites de tasa del comensal (T-2.3, 04_API_Spec §1.5) y la IP del cliente.

**Sin Redis** (02 §9): cada worker cuenta en su memoria. Con N workers el límite efectivo de
un cliente es hasta N veces el nominal (cada worker lleva su cuenta); una conexión *keep-alive*
del teléfono suele quedarse en un worker, así que en uso normal se parece al nominal. Es una
decisión del plan (fila T-2.3 de 04 §11), no un descuido: el borde de Cloudflare pone el techo
grueso (300 peticiones por 10 s por IP) y esto el fino.

| Quién | Cubo | Límite |
|---|---|---|
| `POST /p/sesion/entrar`, traiga o no cookie | la IP del cliente | 600 por minuto |
| Otra petición con cookie de invitado válida | el miembro (`sub` del token) | 120 por minuto |
| Otra petición sin cookie válida (menú, detalle, cookie vencida o falsa) | la IP | 600 por minuto |

Las peticiones con token (salvo `entrar`) no cuentan en el cubo de la IP: todo un restaurante
sale a internet por una sola IP y 40 comensales sondeando cada 3 s ya son 800 por minuto (fila
T-2.3 de 04 §11). `entrar` acuña identidades (un miembro nuevo en cualquier mesa cuyo código
se tenga), así que paga **siempre** en el cubo de la IP, aunque traiga una cookie válida.

La cuenta se hace en la clase de ruta (`app.api.publico.tope.RutaComensal`), **antes** de leer
el cuerpo: una petición limitada no gasta lectura ni validación, y un JSON roto o un cuerpo
de más también cuentan.

Ventana **móvil** de 60 s (no fija): la petición 121 dentro de cualquier minuto es 429, sin el
doble de ráfaga en el cambio de minuto de una ventana fija. Lo rechazado no cuenta. Entre leer
y anotar no hay `await`: dentro de un worker dos peticiones simultáneas no se cuelan.

**IP del cliente** (`ip_del_cliente`). `request.client.host` de uvicorn con
`FORWARDED_ALLOW_IPS=*` es el **primer** elemento de `X-Forwarded-For`, el que escribe el
cliente: no se usa. Se unen todas las líneas de `X-Forwarded-For` en orden y se recorren desde
la derecha saltando los saltos internos (privadas, loopback, link-local, CGNAT, ULA); el
primero público es la IP que se conectó al proxy de la plataforma. Si ese salto es de
Cloudflare (sus rangos publicados), la IP real es `CF-Connecting-IP`, que Cloudflare
sobrescribe siempre. Con la cabecera presente pero inservible (vacía o basura a la derecha) la
IP es `DESCONOCIDA` (un cubo compartido), nunca el par de la conexión. IPv6 se agrupa por `/64`
(un teléfono tiene un `/64` entero y cambiaría de cubo a voluntad).

**Supuesto sin verificar:** que el contenedor sólo sea alcanzable a través del proxy de la
plataforma y que ese proxy **añada** la IP que se le conectó al final de `X-Forwarded-For`
(la documentación de la plataforma sólo habla de `X-Real-IP`). Si lo pasara intacto, quien entre
directo al dominio de la plataforma elegiría su cubo. La maestra lo comprueba en staging con
este código desplegado (fila T-2.3 de 04 §11). Sin proxy delante (uvicorn a pelo en local)
`X-Forwarded-For` lo escribe el cliente: no es un despliegue soportado.
"""

from __future__ import annotations

import ipaddress
import math
import time
from collections import OrderedDict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request
from starlette.datastructures import Headers

from app.core.seguridad import invitado_opcional

VENTANA_SEGUNDOS = 60.0
LIMITE_POR_TOKEN = 120  # 04_API_Spec §1.5
LIMITE_POR_IP = 600  # 04_API_Spec §1.5, sólo peticiones sin token válido
# Eventos de analítica por miembro: el teléfono manda lotes de vez en cuando; lo que pase de
# esto se descarta en silencio (202 igual, 04_API_Spec §2.6) para que un cliente no llene la
# tabla (50 por lote × 120 lotes por minuto serían 6000 filas por minuto y teléfono).
LIMITE_EVENTOS_POR_TOKEN = 120
DESCONOCIDA = "desconocida"
MAX_CLAVES = 50_000  # por limitador y worker; al pasarlo se olvida la más vieja
_PURGA_POR_PETICION = 64

# https://www.cloudflare.com/ips-v4 y /ips-v6 (consultados el 11 de noviembre de 2026).
# Cambian muy rara vez; si Cloudflare añade un rango, sus peticiones caen en el cubo de la IP
# del borde (más estricto, nunca más laxo) hasta actualizar esta lista.
RANGOS_CLOUDFLARE = tuple(
    ipaddress.ip_network(rango)
    for rango in (
        "173.245.48.0/20",
        "103.21.244.0/22",
        "103.22.200.0/22",
        "103.31.4.0/22",
        "141.101.64.0/18",
        "108.162.192.0/18",
        "190.93.240.0/20",
        "188.114.96.0/20",
        "197.234.240.0/22",
        "198.41.128.0/17",
        "162.158.0.0/15",
        "104.16.0.0/13",
        "104.24.0.0/14",
        "172.64.0.0/13",
        "131.0.72.0/22",
        "2400:cb00::/32",
        "2606:4700::/32",
        "2803:f800::/32",
        "2405:b500::/32",
        "2405:8100::/32",
        "2a06:98c0::/29",
        "2c0f:f248::/32",
    )
)

Direccion = ipaddress.IPv4Address | ipaddress.IPv6Address


def _direccion(texto: str | None) -> Direccion | None:
    """La dirección de un elemento de `X-Forwarded-For` o de `CF-Connecting-IP`, o `None`.

    Acepta `1.2.3.4:5678` y `[2001:db8::1]:443`; descarta zonas (`fe80::1%eth0`) y basura."""
    if not texto:
        return None
    valor = texto.strip()
    if valor.startswith("[") and "]" in valor:
        valor = valor[1 : valor.index("]")]
    elif valor.count(":") == 1:
        valor = valor.split(":", 1)[0]
    if "%" in valor or len(valor) > 45:
        return None
    try:
        direccion = ipaddress.ip_address(valor)
    except ValueError:
        return None
    if isinstance(direccion, ipaddress.IPv6Address) and direccion.ipv4_mapped is not None:
        return direccion.ipv4_mapped
    return direccion


def _es_de_cloudflare(direccion: Direccion) -> bool:
    return any(direccion in rango for rango in RANGOS_CLOUDFLARE)


# Saltos internos de una plataforma: nunca la IP de un cliente que llega por internet. Lista
# explícita (no `not is_global`): Teredo, 6to4, NAT64 o 198.18/15 no son de la plataforma.
RANGOS_INTERNOS = tuple(
    ipaddress.ip_network(rango)
    for rango in (
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "127.0.0.0/8",
        "169.254.0.0/16",
        "100.64.0.0/10",
        "::1/128",
        "fe80::/10",
        "fc00::/7",
    )
)


def _es_interna(direccion: Direccion) -> bool:
    return any(direccion in rango for rango in RANGOS_INTERNOS)


def ip_del_cliente(cabeceras: Headers, par: str | None) -> str:
    """La IP del cliente como texto (IPv6 ya agrupada por `/64`), o `DESCONOCIDA`.

    `cabeceras` son las de la petición (`Headers` de Starlette: todas las líneas de
    `X-Forwarded-For` cuentan, unidas en orden); `par` es el `client.host` del `scope`, que
    sólo se usa **sin** `X-Forwarded-For` (pruebas, desarrollo)."""
    lineas = cabeceras.getlist("x-forwarded-for")
    if lineas:
        salto: Direccion | None = None
        for elemento in reversed(",".join(lineas).split(",")):
            direccion = _direccion(elemento)
            if direccion is None:
                break  # basura: lo de su izquierda ya no es de fiar
            salto = direccion
            if not _es_interna(direccion):
                break
        if salto is None:
            return DESCONOCIDA
    else:
        salto = _direccion(par)
        if salto is None:
            return DESCONOCIDA
    if _es_de_cloudflare(salto):
        real = _direccion(cabeceras.get("cf-connecting-ip"))
        if real is not None:
            salto = real
    return cubo_de(salto)


def cubo_de(direccion: Direccion) -> str:
    if isinstance(direccion, ipaddress.IPv6Address):
        return str(ipaddress.IPv6Network((direccion, 64), strict=False))
    return str(direccion)


def ip_de_peticion(request: Request) -> str:
    return ip_del_cliente(request.headers, request.client.host if request.client else None)


class VentanaMovil:
    """`limite` intentos por clave en cualquier ventana de `ventana` segundos, en memoria.

    Las claves se guardan por orden de su último intento aceptado: la primera es la que lleva
    más tiempo quieta, y se olvida en cuanto su ventana pasa (o si hay más de `max_claves`)."""

    def __init__(
        self,
        limite: int,
        ventana: float = VENTANA_SEGUNDOS,
        *,
        max_claves: int = MAX_CLAVES,
        reloj: Callable[[], float] = time.monotonic,
    ) -> None:
        self.limite = limite
        self.ventana = ventana
        self.max_claves = max_claves
        self.reloj = reloj
        self._marcas: OrderedDict[str, deque[float]] = OrderedDict()

    def __len__(self) -> int:
        return len(self._marcas)

    def vaciar(self) -> None:
        self._marcas.clear()

    def _purgar(self, ahora: float) -> None:
        for _ in range(_PURGA_POR_PETICION):
            if not self._marcas:
                return
            marcas = next(iter(self._marcas.values()))
            if marcas and marcas[-1] > ahora - self.ventana:
                return
            self._marcas.popitem(last=False)

    def intentar(self, clave: str, peso: int = 1) -> float | None:
        """`None` si caben `peso` intentos más (y los anota); si no, los segundos que faltan
        para que quepan (sin anotar nada)."""
        ahora = self.reloj()
        self._purgar(ahora)
        if peso > self.limite:
            return self.ventana
        marcas = self._marcas.get(clave)
        if marcas is None:
            marcas = deque()
        else:
            while marcas and marcas[0] <= ahora - self.ventana:
                marcas.popleft()
        exceso = len(marcas) + peso - self.limite
        if exceso > 0:
            # Cabrán cuando venzan las `exceso` marcas más viejas.
            return max(marcas[exceso - 1] + self.ventana - ahora, 0.001)
        marcas.extend([ahora] * peso)
        self._marcas[clave] = marcas
        self._marcas.move_to_end(clave)
        while len(self._marcas) > self.max_claves:
            self._marcas.popitem(last=False)
        return None


por_token = VentanaMovil(LIMITE_POR_TOKEN)
por_ip = VentanaMovil(LIMITE_POR_IP)
eventos_por_token = VentanaMovil(LIMITE_EVENTOS_POR_TOKEN)
# Un `scan` por miembro y minuto: recargar la bienvenida no escribe una fila cada vez.
scan_por_miembro = VentanaMovil(1)


def vaciar() -> None:
    """Olvida todas las cuentas de este worker (pruebas)."""
    por_token.vaciar()
    por_ip.vaciar()
    eventos_por_token.vaciar()
    scan_por_miembro.vaciar()


def demasiadas(espera: float) -> HTTPException:
    """429 `DEMASIADAS_PETICIONES` con la envoltura (`manejar_http_exception`) y `Retry-After`
    en segundos enteros, hacia arriba."""
    return HTTPException(429, headers={"Retry-After": str(max(1, math.ceil(espera)))})


def contar(request: Request, *, solo_ip: bool = False) -> None:
    """Cuenta la petición en el cubo del miembro (cookie válida) o en el de la IP (sin cookie
    válida, o siempre con `solo_ip`) y lanza 429 al pasarse. La llama `RutaComensal` antes
    de leer el cuerpo.

    Verifica la firma del token sin tocar la base (`invitado_opcional`); un token falso,
    vencido o de otra audiencia cuenta como anónimo."""
    invitado = None if solo_ip else invitado_opcional(request)
    if invitado is not None:
        espera = por_token.intentar(str(invitado.miembro_id))
    else:
        espera = por_ip.intentar(ip_de_peticion(request))
    if espera is not None:
        raise demasiadas(espera)
