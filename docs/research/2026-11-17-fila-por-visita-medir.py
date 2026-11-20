"""Mide en PostgreSQL LOCAL la propuesta de Calvin (17-nov): UNA fila de analítica por visita de comensal, armada en el teléfono, con pares
«veces que entró / segundos totales» por lugar (menú, platillo y búsqueda; los filtros NO van por comensal: revelarían quién usa filtros, indicio indirecto de una restricción alimentaria, regla 10; se cuentan por restaurante y día), frente a «contar por día» y la combinación de ambas.
Crea una base NUEVA `carta_med_fila_<n>` a partir de `carta_med_mediano` (nunca borra nada). Datos SINTÉTICOS: los contadores se generan
con funciones de hash (los bytes de una fila de enteros chicos no dependen del valor). Salida: 2026-11-17-fila-por-visita-datos.json.
Uso: python3 -I 2026-11-17-fila-por-visita-medir.py   (psql y `carta_med_mediano` deben existir)"""

import json
import os
import subprocess
import sys

if "PGPASSWORD" not in os.environ:
    sys.exit("Defina PGPASSWORD (la contraseña de la base LOCAL de desarrollo) en el entorno: no se guarda en el repositorio.")
ENV = dict(os.environ)  # el host es siempre 127.0.0.1 y las bases de trabajo son carta_med_*
AQUI = os.path.dirname(os.path.abspath(__file__))


def sql(db, q, uno=False):
    if db != "postgres" and not db.startswith("carta_med_"):
        sys.exit(f"Base {db!r} rechazada: estos guiones sólo tocan bases carta_med_* locales")
    r = subprocess.run(
        [
            "psql",
            "-h",
            "127.0.0.1",
            "-U",
            "carta",
            "-d",
            db,
            "-At",
            "-F",
            "|",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            q,
        ],
        capture_output=True,
        text=True,
        env=ENV,
    )
    if r.returncode:
        sys.exit(r.stderr)
    f = [x.split("|") for x in r.stdout.strip().splitlines()]
    return f[0][0] if uno else f


n = 1
while sql("postgres", f"select 1 from pg_database where datname='carta_med_fila_{n}'"):
    n += 1
DB = f"carta_med_fila_{n}"
sql("postgres", f"CREATE DATABASE {DB} TEMPLATE carta_med_mediano")


def t(q):
    return int(sql(DB, q, uno=True))


visitas_comensal = t("select count(*) from miembro_sesion")
sesiones = t("select count(*) from sesion_grupal")
restaurantes = t("select count(*) from restaurante")

# columnas: par (veces, segundos) por lugar. smallint alcanza: 21,600 s = 6 h de cookie de invitado
PARES = "menu_n smallint not null, menu_seg smallint not null, platillo_n smallint not null, platillo_seg smallint not null, busqueda_n smallint not null, busqueda_seg smallint not null"
RELLENO = """(1 + abs(hashtext(m.id::text || 'a')) % 4)::smallint, (10 + abs(hashtext(m.id::text || 'b')) % 600)::smallint,
             (abs(hashtext(m.id::text || 'c')) % 8)::smallint, (abs(hashtext(m.id::text || 'd')) % 900)::smallint,
             (abs(hashtext(m.id::text || 'e')) % 3)::smallint, (abs(hashtext(m.id::text || 'f')) % 120)::smallint"""
ORIGEN = "from miembro_sesion m join sesion_grupal s on s.id = m.sesion_id"
COLS = "restaurante_id, dia, miembro_id, menu_n, menu_seg, platillo_n, platillo_seg, busqueda_n, busqueda_seg"


def medida(tabla):
    return dict(
        filas=t(f"select count(*) from {tabla}"),
        heap=t(f"select pg_relation_size('{tabla}')"),
        indices=t(f"select pg_indexes_size('{tabla}')"),
        total=t(f"select pg_total_relation_size('{tabla}')"),
    )


# F1: una fila por visita de comensal, llave (restaurante, día, miembro) y nada más
sql(
    DB,
    f"create table visita_f1 (restaurante_id uuid not null, dia date not null, miembro_id uuid not null, {PARES}, primary key (restaurante_id, dia, miembro_id))",
)
sql(
    DB,
    f"insert into visita_f1 ({COLS}) select s.restaurante_id, (s.inicio at time zone 'UTC')::date, m.id, {RELLENO} {ORIGEN}",
)
sql(DB, "vacuum analyze visita_f1")
f1 = medida("visita_f1")

# F2: igual, con un índice más por miembro (para reanudar o borrar por miembro)
sql(DB, "create table visita_f2 (like visita_f1 including all)")
sql(DB, "insert into visita_f2 select * from visita_f1")
sql(DB, "create unique index visita_f2_miembro on visita_f2 (miembro_id)")
sql(DB, "vacuum analyze visita_f2")
f2 = medida("visita_f2")

# F3: sin la columna restaurante (el miembro ya lo implica): llave (día, miembro); más chica pero obliga a unir para agrupar por restaurante
sql(
    DB,
    f"create table visita_f3 (dia date not null, miembro_id uuid not null, {PARES}, primary key (dia, miembro_id))",
)
sql(
    DB,
    f"insert into visita_f3 select (s.inicio at time zone 'UTC')::date, m.id, {RELLENO} {ORIGEN}",
)
sql(DB, "vacuum analyze visita_f3")
f3 = medida("visita_f3")

# Actualizaciones: el teléfono manda la fila 3 veces (al entrar, a media visita y al ocultarse): 2 UPDATE por fila, medido antes y después de vacuum
sql(DB, "create table visita_u (like visita_f1 including all)")
sql(DB, "insert into visita_u select * from visita_f1")
sql(DB, "vacuum analyze visita_u")
u0 = medida("visita_u")
for _ in range(2):
    sql(DB, "update visita_u set menu_seg = menu_seg + 1, platillo_seg = platillo_seg + 1")
u_antes_vacuum = medida("visita_u")
sql(DB, "select pg_stat_force_next_flush()")
hot = sql(DB, "select n_tup_upd, n_tup_hot_upd from pg_stat_user_tables where relname='visita_u'")[
    0
]
sql(DB, "vacuum visita_u")
u_despues_vacuum = medida("visita_u")
actualizaciones = dict(
    filas=u0["filas"],
    sin_actualizar=u0,
    tras_2_actualizaciones_antes_de_vacuum=u_antes_vacuum,
    tras_vacuum=u_despues_vacuum,
    actualizaciones_totales=int(hot[0]),
    actualizaciones_hot=int(hot[1]),
)
# Con la llave (restaurante, día, miembro) los contadores no están en ningún índice: el UPDATE puede ser HOT (misma página, sin tocar el índice)

# Misma prueba con fillfactor 70 (deja hueco en cada página para que el UPDATE sea HOT y no toque el índice)
sql(DB, "create table visita_u70 (like visita_f1 including all) with (fillfactor = 70)")
sql(DB, "insert into visita_u70 select * from visita_f1")
sql(DB, "vacuum analyze visita_u70")
v0 = medida("visita_u70")
for _ in range(2):
    sql(DB, "update visita_u70 set menu_seg = menu_seg + 1, platillo_seg = platillo_seg + 1")
sql(DB, "select pg_stat_force_next_flush()")
hot70 = sql(DB, "select n_tup_upd, n_tup_hot_upd from pg_stat_user_tables where relname='visita_u70'")[0]
sql(DB, "vacuum visita_u70")
v_final = medida("visita_u70")
actualizaciones_ff70 = dict(sin_actualizar=v0, tras_2_actualizaciones_y_vacuum=v_final, actualizaciones_totales=int(hot70[0]), actualizaciones_hot=int(hot70[1]))

# Complemento de la combinación: contar por día SÓLO el platillo (dish_view e item_add), porque la fila por visita no dice qué platillo se vio.
# platillo_id viene NULL en la copia benigna: se rellena con un platillo del restaurante, como en el otro guion de medición
sql(
    DB,
    """create table evento_dia_platillo as
  select e.restaurante_id, (e.ocurrido_en at time zone 'UTC')::date dia, (case e.tipo when 'dish_view' then 3 when 'filter' then 5 else 6 end)::smallint tipo,
         (case when e.tipo = 'filter' then '00000000-0000-0000-0000-000000000000'::uuid else (select p.id from platillo p where p.restaurante_id = e.restaurante_id order by md5(p.id::text || e.id::text) limit 1) end) platillo_id
  from evento_analitica e where e.tipo in ('dish_view', 'item_add', 'filter')""",
)
sql(
    DB,
    "create table evento_dia_p as select restaurante_id, dia, tipo, platillo_id, count(*)::int n from evento_dia_platillo group by 1,2,3,4",
)
sql(DB, "alter table evento_dia_p add primary key (restaurante_id, dia, tipo, platillo_id)")
sql(DB, "vacuum analyze evento_dia_p")
dp = medida("evento_dia_p")

TABLAS = ["sesion_grupal", "miembro_sesion", "orden_personal", "item_orden", "comanda", "comanda_orden", "llamada_mesero", "evento_analitica"]
tablas_de_la_visita = {tb: dict(filas=t(f"select count(*) from {tb}"), total_bytes=t(f"select pg_total_relation_size('{tb}')")) for tb in TABLAS}

salida = dict(
    base_de_trabajo=DB,
    nota="MEDIDO CON DATOS SINTÉTICOS en PostgreSQL local sobre una copia de carta_med_mediano (10 restaurantes, un mes); los contadores son valores de hash; con tráfico real el tamaño de la fila no cambia (enteros de ancho fijo) pero cambia cuántas visitas hay",
    visitas_de_comensal=visitas_comensal,
    sesiones=sesiones,
    restaurantes=restaurantes,
    f1_llave_restaurante_dia_miembro=f1,
    f2_con_indice_por_miembro=f2,
    f3_sin_restaurante=f3,
    actualizaciones=actualizaciones,
    tablas_de_la_visita=tablas_de_la_visita,
    actualizaciones_fillfactor_70=actualizaciones_ff70,
    platillo_por_dia=dp,
)
with open(os.path.join(AQUI, "2026-11-17-fila-por-visita-datos.json"), "w") as f:
    json.dump(salida, f, ensure_ascii=False, indent=1)
print(
    json.dumps({k: v["total"] for k, v in salida.items() if isinstance(v, dict) and "total" in v})
)
