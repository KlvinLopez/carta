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
9. **Cada prueba de criterio lleva `@pytest.mark.ac("AC-x.y")`** (regla dura 15); `uv run python scripts/verificar_trazabilidad.py --tarea T-x.y --estricto` lo comprueba. Nada de `skip` ni `xfail`.
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

## 3b. Rutas crudas (`..`, `%ZZ`, `%2F`)

httpx normaliza la URL antes de enviarla (`/assets/../x` llega como `/x`, `/..` como `/`), así que un *path traversal* o un escape inválido no se pueden probar con `cliente.get(...)`. Llama a la aplicación con un `scope` ASGI escrito a mano (`_llamar_crudo` en `tests/integration/test_estaticos.py`): `asgi.spec_version = "2.4"` y un `receive` que devuelva `http.request` y después `http.disconnect`, o `FileResponse` se queda esperando la desconexión hasta el `timeout`.

## 3b'. Subidas: «no se leyó el cuerpo» y `Content-Length` mentiroso (T-1.4)

httpx siempre manda el `Content-Length` real. Para probar un 413/401/404 **sin leer el cuerpo** o un `Content-Length` que miente, llama a `app` con un `scope` a mano y un `receive` que cuente cuántos trozos le pidieron (`Cuerpo` y `_crudo` en `tests/integration/test_fotos.py`); con el fixture `cliente` activo, las sustituciones de base, token y almacén ya están puestas. Imágenes de prueba generadas al vuelo en `tests/imagenes_pruebas.py` (JPEG con EXIF, PNG, HEIC con `pillow-heif`, PDF, bomba de píxeles, AVIF disfrazado); nada binario en el repo.

## 3b''. R2 sin red

S3 falso = `moto.server.ThreadedMotoServer(ip_address="127.0.0.1", port=0)` (dependencia de desarrollo). Crea los buckets con un cliente `region_name="us-east-1"`: moto rechaza `CreateBucket` con la región `auto` que usa la aplicación (para R2), aunque acepta `auto` en `PutObject`/`HeadBucket`. Un `Settings(ENTORNO="staging"|"produccion")` válido exige las seis `R2_*` desde T-1.4: pásalas (`R2_COMPLETO` en `tests/unit/test_config.py`) o, si la prueba no es de configuración, `Settings.model_construct(...)`.

## 3c. API de Claude sin llave (importación, T-1.8)

- Cliente falso = **SDK real** sobre `httpx2.MockTransport`: `anthropic.AsyncAnthropic(api_key="sk-ant-prueba", max_retries=0, http_client=anthropic.DefaultAsyncHttpxClient(transport=httpx2.MockTransport(manejador)))`. Así se prueban el cuerpo enviado y el mapeo 429/400/5xx → excepciones del SDK; no simules `messages.create` a mano. Usa `httpx2` (el SDK 1.x+ lo exige), nunca `httpx`.
- El manejador responde en orden una lista de `httpx2.Response` o excepciones (`httpx2.ConnectError` = red caída) y guarda `json.loads(peticion.content)`. Respuestas en `tests/fixtures/menus/*.respuesta.json`; clase `ApiFalsa` en `tests/unit/test_importacion.py`.
- Las pausas de reintento se inyectan (`dormir=`): ninguna prueba duerme. Lo que cuesta dinero va en `tests/live/` con `@pytest.mark.live` (excluido por `addopts`, se corre con `-m live`).

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
(uv run pytest -q & uv run pytest -q & wait)              # dos corridas a la vez: la suite es reentrante
```

El CI (`.github/workflows/ci.yml`) corre lo mismo sobre PostgreSQL 16 en cada push a `master`, `agente/**` y `claude/**` y en cada PR.

## Probar un PDF con QR (T-1.5)

No hay rasterizador en el entorno: el QR se extrae como imagen incrustada (`PdfReader(...).pages[i].images`) y se decodifica con `zxingcpp.read_barcodes(imagen.image)`; se compara la URL **exacta**. Para buscar texto que no debe estar en el PDF, `qr_pdf.generar_pdf(..., comprimir=False)` deja los flujos legibles (comprimidos, un `not in` no prueba nada). Todo lo que descarga la red (`qr_pdf.descargar_logo`) se prueba con un `httpx.AsyncBaseTransport` falso; la fixture `sin_red` de `test_qr_pdf.py` anula la resolución DNS.

**Nunca parchees `socket.getaddrinfo` ni `socket.socket` globalmente** (T-1.5, segunda ronda): `loop.getaddrinfo` lo usa también asyncpg al conectar a la base por nombre, y en la CI `TEST_DATABASE_URL` lleva `localhost`; el parche mandó la conexión a una IP pública y 13 fixtures murieron por `pytest-timeout`. En local no se nota porque la URL lleva `127.0.0.1` y asyncio no resuelve una IP literal. Deja en el módulo un punto de inyección propio (`qr_pdf.resolver_host`) y sustitúyelo con `monkeypatch.setattr(modulo, …)`. Cuando una prueba toque DNS o sockets, corre la suite una vez con `localhost` en la URL: `TEST_DATABASE_URL=postgresql+asyncpg://carta:carta_dev_password@localhost:5432/carta_test uv run pytest -q --timeout 60`.
