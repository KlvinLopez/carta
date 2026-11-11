---
name: pruebas
description: Cómo se escribe una prueba en Carta con la infraestructura de tests/conftest.py (base PostgreSQL real migrada, transacción por prueba, cliente httpx sobre la app, fábricas restaurante/operador/mesa, marcador ac). Úsala antes de escribir o cambiar cualquier archivo en tests/, o cuando el usuario diga "/pruebas", "escribe la prueba de", "agrega una fixture".
---

# /pruebas — una prueba que corre igual aquí y en CI

> Lo que dejó T-0.4: la aplicación entera corre sobre la base de pruebas, cada prueba vive en una
> transacción que se revierte y todas comparten un solo bucle de eventos. Lo comprueban
> `tests/unit/test_bd_pruebas.py` y `tests/integration/test_infraestructura_pruebas.py`.

## 1. Qué te da `tests/conftest.py`

| Fixture | Qué es | Cuándo usarla |
|---|---|---|
| `sesion` | `AsyncSession` sobre la transacción de la prueba; `commit()` libera un *savepoint* y `rollback()` vuelve al último | Pruebas de servicios y consultas |
| `cliente` | `AsyncClient` de httpx sobre `app.main.app`; `get_db_session` da **una sesión nueva por petición** (`fabrica_sesion`) sobre la misma transacción | Pruebas de rutas: lo que creas con las fábricas lo ve la petición, y una petición que falla no contamina a la siguiente |
| `fabrica_sesion` | `async_sessionmaker` ligado a la conexión de la prueba (`create_savepoint`) | Cuando necesitas una segunda sesión «como otra petición» |
| `restaurante`, `operador`, `mesa` | Un restaurante, su dueño (`propietario` con `usuario`) y una mesa, coherentes con `app/db/models.py` | Casi todas las pruebas de Fase 1 en adelante |
| `fabrica_restaurante`, `fabrica_operador`, `fabrica_mesa` | Las mismas fábricas como funciones (`await fabrica_mesa(restaurante, numero=7)`) | Cuando necesitas varios o valores concretos |
| `categoria`, `platillo`, `fabrica_categoria`, `fabrica_platillo` | Una categoría y un platillo activos del `restaurante` (T-1.3); `await fabrica_platillo(restaurante, categoria, orden=3)` | Pruebas del menú. Para mirar purgas de Cloudflare, sustituye `cache_menu.purgador` por un `PurgadorCloudflare(..., cliente=httpx.AsyncClient(transport=MockTransport(...)))` y vacía la caché antes y después (fixture `cloudflare` en `tests/integration/test_admin_menu.py`) |
| `cabecera_operador` | `{"Authorization": "Bearer prueba:<uid>:google"}` del dueño de `restaurante` (T-1.2). `cliente` instala `VerificadorDePrueba` (`tests/auth_pruebas.py`); para otro usuario, `cabecera_de(usuario.firebase_uid)` | Toda petición a `/api/v1/admin`: sin ella es 401 |
| `almacen` | `AlmacenLocal` en una carpeta temporal que `cliente` instala en lugar de `obtener_almacen` (T-1.4): una subida nunca escribe en `./datos`. Mira lo subido en `almacen.raiz / "publico"` y `"privado"`; para R2, `app.dependency_overrides[obtener_almacen] = lambda: AlmacenS3(...)` contra moto (`s3_falso` en `tests/integration/test_fotos.py`) | Pruebas de fotos o de `/ready` con almacén |
| `motor_pruebas` | Motor de la sesión de pruebas (`NullPool`, `lock_timeout=5s`, `statement_timeout=30s`) | Sólo para mirar la base desde **otra** conexión (carreras, aislamiento) |
| `esquema_migrado`, `url_bd` | Base compartida migrada a `head` con la CLI de Alembic (sólo `upgrade head`) | Pruebas de esquema o que corren Alembic |
| `tests.bd_pruebas.base_desechable(url_bd, "sufijo")` | Base vacía propia del proceso, borrada al salir | Lo único que puede hacer `downgrade base` o destruir el esquema |
| `tests.dist_pruebas.construir_dist(tmp_path / "dist")` | Un `frontend/dist` mínimo (index, un asset, una fuente, manifest) | Pruebas que sirven la PWA: `monkeypatch.setattr(settings, "FRONTEND_DIST", str(dist))` y luego `create_app()` (ejemplo: `tests/integration/test_estaticos.py`) |

| `tests/invitado_pruebas.py` (T-2.1) | `entrar(cliente, codigo, token)` → `(respuesta, token)`, `estado(cliente, token, **cabeceras)`, `cambiar_alias(...)`, `con_token(token)`, `set_cookie_invitado(respuesta)`, `sin_request_id(cuerpo)` | Rutas del comensal (`/api/v1/p`). La cookie `carta_invitado` es `Secure` y el cliente va por `http://pruebas`: httpx **no** la reenvía sola, así que cada petición la manda en la cabecera `Cookie` (lo hacen los ayudantes) |

Las fábricas viven en `tests/fabricas.py` (una función `crear_<entidad>(sesion, ...)` por entidad; terminan en `commit()`, que con `create_savepoint` es un RELEASE SAVEPOINT: nada sale de la transacción de la prueba, pero lo creado sobrevive a un `rollback()` del código bajo prueba). Si una tarea necesita otra entidad (categoría, platillo, personal), **agrégala ahí** con el mismo patrón y su fixture en `conftest.py`.

## 2. Reglas

1. **Nunca crees el esquema desde los modelos ni toques `carta_db`.** La URL la decide `tests.bd_pruebas.url_de_pruebas()` (`TEST_DATABASE_URL`, o `carta_test` junto a `DATABASE_URL`); se niega si la base no se llama *test* o `ENTORNO` no es desarrollo/pruebas.
2. **No importes `app.db` ni `app.main` antes que `conftest.py`** en nada que pytest cargue antes (plugins, `conftest` de subcarpetas): el motor global nace de `settings.DATABASE_URL` al importar `app.db`, y `conftest.py` fija esa URL primero.
3. **No importes `tests.conftest` desde una prueba** salvo para constantes (`URL_PRUEBAS`, `Fabrica`); las funciones compartidas van en `tests/bd_pruebas.py` o `tests/fabricas.py`.
4. **No abras tu propio bucle ni cierres el pool** (`asyncio.run`, `close_db()`): todo corre en el bucle de sesión de pytest-asyncio (`asyncio_default_fixture_loop_scope` y `asyncio_default_test_loop_scope` en `pyproject.toml`).
5. **Lo que no debe sobrevivir, no sobrevive:** no limpies tablas a mano; si una prueba necesita que algo quede confirmado de verdad (otra conexión debe verlo), dilo en el docstring y borra lo que creaste en un `finally` (receta en §3).
6. **Un `rollback()` del código vuelve al último *savepoint*, no borra las fábricas.** Si tu servicio captura `IntegrityError` y hace `rollback()`, la prueba sigue viendo `restaurante`, `mesa`, etc. Lo verifica `test_un_rollback_del_codigo_no_borra_lo_confirmado_por_las_fabricas`.
7. **Cada petición del `cliente` tiene su sesión**, como en producción: un 409/500 en una petición y un 200 en la siguiente se prueba en la misma prueba sin trucos. Si una prueba necesita ver el estado de la sesión de una petición, usa `sesion` (misma transacción).
8. **Nunca `downgrade base` ni DDL destructivo sobre la base compartida:** varias corridas de pytest la usan a la vez. Usa `base_desechable` (ejemplo: `tests/unit/test_modelos.py::test_migracion_sube_baja_y_vuelve_a_subir`).
9. **Cada prueba de criterio lleva `@pytest.mark.ac("AC-x.y")`** (regla dura 15; en el frontend, un comentario `// @ac AC-x.y` justo encima del `it(`, `test(` o `describe(`: un `AC-x.y` en el título no cuenta, ni un marcador sobre `it.skip`); `uv run python scripts/verificar_trazabilidad.py --tarea T-x.y --estricto` lo comprueba. Nada de `skip` ni `xfail`.
10. **Variables de entorno:** una prueba que dependa de `ENTORNO` o `SECRET_KEY` los fija explícitamente (`monkeypatch` o `Settings(_env_file=None, ENTORNO=...)`); CI corre con `ENTORNO=pruebas`.
11. **El guard de Bash lee el texto de los comandos:** una prueba que mencione `create_all(`, `downgrade base` o `DROP TABLE` se escribe con Write/Edit, no con `cat <<EOF`.
12. **Cabeceras, cachés y políticas se comparan con literales** (`"public, max-age=31536000, immutable"`, la CSP de 02 §12), nunca con la constante del módulo: una constante cambiada a `max-age=60` pasaría la prueba que la importa (24 de 56 mutaciones sobrevivieron así en T-0.6).
13. **Recorrer «todas las rutas» se hace sobre `app.openapi()["paths"]`, no sobre `app.routes`:** esta versión de FastAPI registra los routers incluidos de forma perezosa (`_IncludedRouter`) y `app.routes` no trae ningún `APIRoute` de `/api/v1` (una prueba parametrizada sobre él corre cero casos). Ejemplo: `RUTAS_ADMIN` en `tests/integration/test_auth_admin.py`, con un `assert len(...) >= N` que impide que pase vacía.
14. **Ruta nueva de `/admin` por id de recurso (`/platillos/{id}`, `/mesas/{id}`…):** necesita su dependencia `*_del_operador` (como `platillo_del_operador` en `app/api/admin/dependencias.py`) y su caso en `test_un_recurso_ajeno_es_404_igual_que_uno_inexistente`; el token sólo prueba quién eres, no de qué restaurante es el recurso (AC-15.3).
15. **Timeouts:** cada prueba tiene 60 s (`pytest-timeout`) y cada sentencia de `motor_pruebas` 30 s, con 5 s de espera de candado. Si una prueba los necesita más largos, el diseño está mal (una espera de candado casi siempre es una fila sin confirmar de otra sesión).
16. **Un `{rid}` o id inventado da 404 antes de validar el cuerpo:** FastAPI resuelve `restaurante_del_operador` (y los `*_del_operador`) antes de mirar el JSON. Una prueba de 422 por cuerpo usa el `restaurante` propio, no `UUID_X` (T-1.3).
17. **Si sustituyes `httpx.AsyncClient` con `monkeypatch`, guarda antes la clase real** (`ClienteReal = httpx.AsyncClient`) y construye con ella: la lambda que llama a `httpx.AsyncClient(...)` se llama a sí misma, y un `except Exception` del código lo esconde como «purga fallida» (T-1.3).
18. **Un `max(...)`/`count(...)` después de asignar en el ORM ve el cambio** (autoflush): calcula antes de `setattr`. Lo protege `test_mover_un_platillo_de_categoria_lo_pone_al_final` (T-1.3).
19. **Nada de peticiones simultáneas con `cliente`** (`asyncio.gather(cliente.get(...), ...)`): todas las sesiones por petición viven sobre la **única** conexión de la prueba y asyncpg no admite dos operaciones a la vez (sale 503/500 de la base, no del código). Para probar concurrencia, llama al servicio directo con `gather` (ejemplos: `test_el_semaforo_nunca_deja_pasar_mas_procesos_de_los_debidos`, `test_ready_no_sondea_r2_en_cada_llamada`) o usa `motor_pruebas` con conexiones propias (§3) (T-1.4).
20. **Memoria pico en un subproceso: `VmHWM` de `/proc/self/status`, nunca `ru_maxrss`**: en Linux `ru_maxrss` sobrevive a `fork` + `exec` y el hijo hereda el pico de pytest (~500 MB). Genera el archivo en otro subproceso para que no cuente (`tests/unit/test_assets.py`, T-1.4).
21. **Un atributo ORM leído después de `rollback()` está expirado**: recargarlo es I/O implícita y en async sale `MissingGreenlet` → 500. Guarda en una variable lo que necesites (p. ej. `estado` para `detalles`) **antes** del `rollback()` y luego lanza el `ErrorCarta`. Lo protege `test_solo_se_confirma_una_importacion_lista` (T-1.9).

## 3. Receta de carreras (dos conexiones)

Una segunda conexión **no ve** las filas de la transacción de la prueba y, si choca con una clave única sin confirmar, espera hasta `lock_timeout`. Para una carrera real (INV-3 de T-1.1: una conexión bloquea la orden sin confirmar y otra inserta un ítem) los datos base tienen que estar confirmados de verdad:

```python
async def test_carrera_inv3(motor_pruebas: AsyncEngine) -> None:
    creados: list[UUID] = []
    async with motor_pruebas.connect() as c:                      # datos confirmados de verdad
        async with c.begin():
            ... INSERT ... RETURNING id -> creados.append(...)
    try:
        async def bloquea() -> None: ...                           # conexión 1: UPDATE ... bloqueada = true, sin commit, espera un poco
        async def inserta() -> None: ...                           # conexión 2: INSERT item_orden; debe esperar y recibir IntegrityError
        resultados = await asyncio.gather(bloquea(), inserta(), return_exceptions=True)
        assert sum(isinstance(r, IntegrityError) for r in resultados) == 1
    finally:                                                       # limpieza: 0 filas después
        async with motor_pruebas.connect() as c:
            async with c.begin():
                ... DELETE ... WHERE id = ANY(:ids)
```

Cada conexión sale de `motor_pruebas.connect()` (dos conexiones asyncpg distintas); el `lock_timeout` de 5 s convierte un cuelgue en un error con diagnóstico.

**Esperar a que la otra conexión de verdad esté bloqueada (T-2.1):** para una carrera con orden fijo («A cierra la sesión, B entra y espera el candado, A confirma»), toma el `pid` de B con `SELECT pg_backend_pid()` en su `AsyncSession` (la sesión retiene la conexión mientras dura la transacción), lanza B con `asyncio.create_task` y consulta desde una tercera conexión `pg_stat_activity.wait_event_type = 'Lock'` para ese `pid` antes de que A confirme (`_esperar_bloqueo` en `tests/integration/test_entrar.py`). Sin eso la prueba puede pasar sin que B haya llegado a esperar. Muta la condición o el tipo de candado y comprueba que la prueba falla.

**Datos confirmados y tareas de fondo reales:** el *lifespan* de la app arranca el cierre de sesiones inactivas (`CierreInactivas`, T-2.1) sobre la base de pruebas; si otra corrida lo arranca a la vez puede cerrar sesiones vencidas que tu prueba confirmó. Asevera el estado final (todas `cerrada`, ninguna dos veces), no quién cerró cada una. Una prueba del *lifespan* sustituye `correr` de **cada** tarea de fondo (`Procesador` y `CierreInactivas`).

## 3a. Caché del sondeo del comensal (T-2.1)

`app.services.sesion.cache_estados` guarda en memoria del proceso el estado de cada sesión 2 s y sólo lo invalidan las escrituras del servicio. Una prueba que cambia la sesión, sus miembros o sus órdenes **directamente en la base** llama a `servicio.cache_estados.invalidar(sesion_id)` después del `commit()` (o la fixture `autouse` que hace `vaciar()`); si no, el siguiente `GET /p/sesion` sale de la memoria y la prueba ve el estado viejo.

## 3a'. Caché del menú público (T-2.2)

`app.services.cache_menu.cache_menu` (30 s por `slug`, singleton) alimenta `GET /p/menu/{slug}`. Una prueba del menú necesita una fixture `autouse` que haga `cache_menu.vaciar()` y sustituya `cache_menu.reloj` por un reloj a mano (`Reloj` en `tests/integration/test_menu.py`): la edad de la copia decide `max-age`/`s-maxage` y los 30 s de vigencia. «Otro worker» = cambiar la base **sin** `cache_menu.invalidar` (el `PATCH` real sí invalida, y sólo la memoria de su worker). Para una escritura a mitad de una lectura, envuelve `menu_publico._armar` y haz `commit()` sobre la sesión que recibe (no sobre `sesion`: comparten conexión y chocan los *savepoints*).

## 3a''. Límites de tasa del comensal (T-2.3)

`app.api.publico.limites` cuenta en memoria del proceso (120/min por miembro, 600/min por IP sin cookie). `cliente` llama a `limites.vaciar()` al empezar y al terminar; una prueba que hace cientos de peticiones o mide la ventana sustituye `reloj` de **cada** limitador (`por_token`, `por_ip`, `eventos_por_token`) por un reloj a mano (fixture `reloj` en `tests/integration/test_rate_limit.py`) y avanza 0.25 s o 3 s (valores exactos en binario: con 0.45 un `Retry-After` esperado de 6 sale 7). Para un límite chico, `monkeypatch.setattr(limites, "por_ip", limites.VentanaMovil(5, reloj=reloj))`. La IP la decide `X-Forwarded-For`/`CF-Connecting-IP` (`limites.ip_del_cliente`), nunca `request.client.host`.

**Analítica después de la respuesta:** una escritura «que nunca debe tumbar la ruta» (analítica, `rollback()` en su `except`) va **después** de leer todo lo que la respuesta necesita de las filas ORM; si no, al fallar expira lo cargado y la ruta da 500 `MissingGreenlet` (regla 21). Pruébalo con un error real de la base (un valor que no cabe en la columna), no sólo con una excepción de Python: `test_si_la_base_rechaza_el_scan_entrar_responde_200_y_el_miembro_queda`.

## 3b. Rutas crudas (`..`, `%ZZ`, `%2F`)

httpx normaliza la URL antes de enviarla (`/assets/../x` llega como `/x`, `/..` como `/`), así que un *path traversal* o un escape inválido no se pueden probar con `cliente.get(...)`. Llama a la aplicación con un `scope` ASGI escrito a mano (`_llamar_crudo` en `tests/integration/test_estaticos.py`): `asgi.spec_version = "2.4"` y un `receive` que devuelva `http.request` y después `http.disconnect`, o `FileResponse` se queda esperando la desconexión hasta el `timeout`.

## 3b'. Subidas: «no se leyó el cuerpo» y `Content-Length` mentiroso (T-1.4)

httpx siempre manda el `Content-Length` real. Para probar un 413/401/404 **sin leer el cuerpo** o un `Content-Length` que miente, llama a `app` con un `scope` a mano y un `receive` que cuente cuántos trozos le pidieron (`Cuerpo` y `_crudo` en `tests/integration/test_fotos.py`); con el fixture `cliente` activo, las sustituciones de base, token y almacén ya están puestas. Imágenes de prueba generadas al vuelo en `tests/imagenes_pruebas.py` (JPEG con EXIF, PNG, HEIC con `pillow-heif`, PDF, bomba de píxeles, AVIF disfrazado); nada binario en el repo.

**Cuerpos JSON grandes (T-1.9, A2):** FastAPI lee y valida el cuerpo JSON **antes** de cualquier dependencia, así que una dependencia de `Content-Length` llega tarde; para acotar un `POST` JSON usa la clase de ruta `subidas.ruta_con_tope(maximo, plazo)` (corta por cabecera sin leer y el *chunked* al pasar el tope, sin el margen de 64 KB del multipart) y pruébalo con `_crudo` + `Cuerpo` (`pedidos == 0`). Una lista que se valida hijo por hijo se acota con un `model_validator(mode="before")` que cuente primero.

**Tareas asyncio en pruebas (T-1.9):** una tarea cancelada antes de su primer `await` **nunca ejecuta su cuerpo**: espera un `Event` que la tarea pone al arrancar antes de cancelarla, o la prueba se cuelga hasta el *timeout* de 60 s. Si un bucle espera un intervalo (10 s), despiértalo desde dentro del primer ciclo en lugar de esperarlo.

## 3b''. R2 sin red

S3 falso = `moto.server.ThreadedMotoServer(ip_address="127.0.0.1", port=0)` (dependencia de desarrollo). Crea los buckets con un cliente `region_name="us-east-1"`: moto rechaza `CreateBucket` con la región `auto` que usa la aplicación (para R2), aunque acepta `auto` en `PutObject`/`HeadBucket`. Un `Settings(ENTORNO="staging"|"produccion")` válido exige las seis `R2_*` desde T-1.4: pásalas (`R2_COMPLETO` en `tests/unit/test_config.py`) o, si la prueba no es de configuración, `Settings.model_construct(...)`.

## 3c. API de Claude sin llave (importación, T-1.8)

- Cliente falso = **SDK real** sobre `httpx2.MockTransport`: `anthropic.AsyncAnthropic(api_key="sk-ant-prueba", max_retries=0, http_client=anthropic.DefaultAsyncHttpxClient(transport=httpx2.MockTransport(manejador)))`. Así se prueban el cuerpo enviado y el mapeo 429/400/5xx → excepciones del SDK; no simules `messages.create` a mano. Usa `httpx2` (el SDK 1.x+ lo exige), nunca `httpx`.
- El manejador responde en orden una lista de `httpx2.Response` o excepciones (`httpx2.ConnectError` = red caída) y guarda `json.loads(peticion.content)`. Respuestas en `tests/fixtures/menus/*.respuesta.json`; clase `ApiFalsa` en `tests/unit/test_importacion.py`.
- Las pausas de reintento se inyectan (`dormir=`): ninguna prueba duerme.
- **Procesador en segundo plano (T-1.9):** nunca se arranca solo en pruebas (httpx no corre el *lifespan*). Construye `Procesador(fabrica_sesion, almacen, cliente=api.cliente, extraer=functools.partial(extraer_menu_detallado, dormir=api.dormir, reloj=api.reloj))` y llama a `ciclo()`/`procesar_una()`/`tomar()` a mano. Concurrencia con `asyncio.Event` (dos extractores que se esperan), nunca `sleep`; «sin conexión durante la llamada» se prueba con una fábrica que cuenta sesiones abiertas (`FabricaQueCuenta`); el *lifespan* con `app.router.lifespan_context(app)` y `Procesador.correr` sustituido. Ejemplos en `tests/integration/test_importaciones.py`. Lo que cuesta dinero va en `tests/live/` con `@pytest.mark.live` (excluido por `addopts`, se corre con `-m live`).

## 4. Esqueleto

```python
"""T-x.y: <qué protege>."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Mesa, Restaurante


@pytest.mark.ac("AC-x.y")
async def test_<criterio>(cliente: AsyncClient, sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa) -> None:
    respuesta = await cliente.get(f"/api/v1/p/mesas/{mesa.codigo_publico}")
    assert respuesta.status_code == 200
```

## 5. Verificar

```bash
uv run pytest -q                                     # todo en verde, local
ENTORNO=pruebas uv run pytest -q                     # como en CI
env -u TEST_DATABASE_URL uv run pytest -q            # sin variables: deriva carta_test
uv run python scripts/verificar_trazabilidad.py --tarea T-x.y --estricto
(uv run pytest -q & uv run pytest -q & wait)              # dos corridas a la vez (ver nota)
# Nota (T-2.1): la suite NO es del todo reentrante. Las fábricas ya llevan `SUFIJO_PROCESO`
# en `slug` y `firebase_uid` (antes las dos corridas creaban `restaurante-1` a la vez y una
# esperaba el candado UNIQUE de la otra), pero `test_seed.py` (siempre `la-ceiba`) y las
# carreras de `test_importaciones.py` (cola compartida confirmada de verdad) chocan entre dos
# corridas simultáneas con `lock timeout`. Si fallan sólo con dos corridas, repítelas solas;
# para la puerta, una corrida a la vez.
```

El CI (`.github/workflows/ci.yml`) corre lo mismo sobre PostgreSQL 16 en cada push a `master`, `agente/**` y `claude/**` y en cada PR.

## Probar un PDF con QR (T-1.5)

No hay rasterizador en el entorno: el QR se extrae como imagen incrustada (`PdfReader(...).pages[i].images`) y se decodifica con `zxingcpp.read_barcodes(imagen.image)`; se compara la URL **exacta**. Para buscar texto que no debe estar en el PDF, `qr_pdf.generar_pdf(..., comprimir=False)` deja los flujos legibles (comprimidos, un `not in` no prueba nada). Todo lo que descarga la red (`qr_pdf.descargar_logo`) se prueba con un `httpx.AsyncBaseTransport` falso; la fixture `sin_red` de `test_qr_pdf.py` anula la resolución DNS.

**Nunca parchees `socket.getaddrinfo` ni `socket.socket` globalmente** (T-1.5, segunda ronda): `loop.getaddrinfo` lo usa también asyncpg al conectar a la base por nombre, y en la CI `TEST_DATABASE_URL` lleva `localhost`; el parche mandó la conexión a una IP pública y 13 fixtures murieron por `pytest-timeout`. En local no se nota porque la URL lleva `127.0.0.1` y asyncio no resuelve una IP literal. Deja en el módulo un punto de inyección propio (`qr_pdf.resolver_host`) y sustitúyelo con `monkeypatch.setattr(modulo, …)`. Cuando una prueba toque DNS o sockets, corre la suite una vez con `localhost` en la URL: `TEST_DATABASE_URL=postgresql+asyncpg://carta:carta_dev_password@localhost:5432/carta_test uv run pytest -q --timeout 60`.

## Probar un script de `scripts/`

`scripts/__init__.py` existe (T-1.7): impórtalo como `from scripts import seed` y llama a sus funciones `async` con la fixture `sesion` y el `almacen` temporal; el `main()` de un script con guarda de entorno se prueba con `monkeypatch.setattr(settings, "ENTORNO", ...)`, nunca por subproceso (con `staging` o `produccion` `Settings` ni siquiera carga sin R2). `uv run mypy` (sin `app`) revisa también `scripts/`.
La CI corre con `ENTORNO=pruebas` y la sesión de agente con `desarrollo`: una prueba que dependa del entorno (p. ej. `seed.main()`) lo fija con `monkeypatch.setattr(settings, "ENTORNO", ...)`; si no, pasa local y falla en la CI. Compruébalo con `ENTORNO=pruebas uv run pytest <archivo>`.
