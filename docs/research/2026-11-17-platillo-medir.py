"""Mide lo que cuesta técnicamente un platillo del plan gratuito. Uso (desde la raíz del repositorio):
    uv run python docs/research/2026-11-17-platillo-medir.py
Crea una base NUEVA a partir de `carta_med_mediano` (nunca borra) y mide: (1) bytes por platillo en la base (fila e índices, marginal con
10,000 filas de textos realistas), (2) el peso de las fotos procesadas con `procesar_foto` sobre `tests/fixtures/fotos/`, (3) el tamaño
del menú que baja el teléfono (JSON y gzip) y (4) el procesador de armarlo con `menu_publico._armar` contra la base. Los textos y las
fotos son del repositorio (sintéticos, no de un restaurante real). Salida: 2026-11-17-platillo-datos.json."""
import asyncio
import gzip
import json
import os
import statistics
import subprocess
import sys
import time
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
AQUI = Path(__file__).resolve().parent
ENV = {**os.environ, "PGPASSWORD": "carta_dev_password"}


def psql(db, q, uno=False):
    r = subprocess.run(["psql", "-h", "127.0.0.1", "-U", "carta", "-d", db, "-At", "-F", "|", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True, env=ENV)
    if r.returncode:
        sys.exit(r.stderr)
    f = [x.split("|") for x in r.stdout.strip().splitlines()]
    return f[0][0] if uno else f


n = 1
while psql("postgres", f"select 1 from pg_database where datname='carta_med_platillo_{n}'"):
    n += 1
DB = f"carta_med_platillo_{n}"
psql("postgres", f"CREATE DATABASE {DB} TEMPLATE carta_med_mediano")
os.environ["DATABASE_URL"] = f"postgresql+asyncpg://carta:carta_dev_password@127.0.0.1:5432/{DB}"
sys.path.insert(0, str(RAIZ))
os.chdir(RAIZ)

# (2) fotos: el tamaño real que deja procesar_foto
from app.services.assets import procesar_foto  # noqa: E402

fotos = []
for ruta in sorted((RAIZ / "tests/fixtures/fotos").glob("*.jpg")):
    datos = ruta.read_bytes()
    r = procesar_foto(datos)
    v = {x.nombre: len(x.datos) for x in r.variantes}
    fotos.append(dict(archivo=ruta.name, original=len(datos), miniatura=v["miniatura"], detalle=v["detalle"], total=v["miniatura"] + v["detalle"]))
foto_media = statistics.mean(x["total"] for x in fotos)

# (1) bytes por platillo: marginal con 10,000 filas
rest, cat = psql(DB, "select r.id, c.id from restaurante r join categoria_menu c on c.restaurante_id = r.id limit 1")[0]
antes = int(psql(DB, "select pg_total_relation_size('platillo')", uno=True))
psql(DB, f"""insert into platillo (id, restaurante_id, categoria_id, nombre, descripcion, precio, orden, alergenos, etiquetas, calorias, nivel_picante, destacado, activo, disponible)
  select gen_random_uuid(), '{rest}', '{cat}', 'Platillo de prueba número ' || g || ' de la casa', 'Descripción de ejemplo de cerca de noventa caracteres para el platillo ' || g || ' del menú', (50 + g % 300)::numeric(10,2), g, '["lacteos"]', '["vegetariano"]', 450, 1, false, true, true
  from generate_series(1, 10000) g""")
psql(DB, "vacuum analyze platillo")
despues = int(psql(DB, "select pg_total_relation_size('platillo')", uno=True))
bytes_platillo = (despues - antes) / 10000
heap = int(psql(DB, "select pg_relation_size('platillo')", uno=True))
indices = int(psql(DB, "select pg_indexes_size('platillo')", uno=True))

# (3) y (4) el menú: tamaño del JSON y procesador de armarlo con N platillos de un restaurante
from sqlalchemy import text  # noqa: E402

from app.db.database import async_session as SesionLocal  # noqa: E402
from app.services import menu_publico  # noqa: E402


async def medir():
    sal = {}
    async with SesionLocal() as s:
        slug = (await s.execute(text("select slug from restaurante where id = :i"), {"i": rest})).scalar_one()
        for N in (50, 80, 100, 150):
            await s.execute(text("update platillo set activo = false where restaurante_id = :r"), {"r": rest})
            await s.execute(text("update platillo set activo = true, foto_thumb_url = 'https://fotos.carta.cooking/restaurantes/' || restaurante_id || '/' || id || '/miniatura.webp', foto_detalle_url = 'https://fotos.carta.cooking/restaurantes/' || restaurante_id || '/' || id || '/detalle.webp', imagen_tipo = 'foto' where id in (select id from platillo where restaurante_id = :r order by id limit :n)"), {"r": rest, "n": N})
            await s.commit()
            tiempos = []
            for _ in range(30):
                t0 = time.perf_counter()
                m = await menu_publico._armar(s, slug)
                cuerpo = m.model_dump_json().encode()
                tiempos.append((time.perf_counter() - t0) * 1000)
            sal[N] = dict(platillos=N, json_bytes=len(cuerpo), gzip_bytes=len(gzip.compress(cuerpo)), ms_armar_mediana=statistics.median(tiempos), ms_armar_p90=sorted(tiempos)[int(0.9 * len(tiempos))])
    return sal


menu = asyncio.run(medir())
salida = dict(base_de_trabajo=DB, nota="medido en PostgreSQL local con textos y fotos del repositorio (sintéticos); el procesador incluye la consulta a la base local y el armado del JSON, en un contenedor de nube, no en Railway",
              fotos=fotos, foto_bytes_por_platillo_media=foto_media,
              platillo_en_la_base=dict(bytes_marginales_por_platillo=bytes_platillo, heap=heap, indices=indices, filas=int(psql(DB, "select count(*) from platillo", uno=True))),
              menu=menu)
(AQUI / "2026-11-17-platillo-datos.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1))
print(json.dumps({"foto_media": foto_media, "bytes_platillo": bytes_platillo, "menu": menu}, indent=1))
