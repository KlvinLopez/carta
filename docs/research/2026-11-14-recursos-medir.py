"""Mide en PostgreSQL LOCAL las palancas de disco de `2026-11-14-recursos-y-palancas.md` sobre una COPIA de la base de medición
`carta_med_mediano` (10 restaurantes medianos, un mes de visitas, 10 eventos por visita [supuesto]). Nunca borra: crea una base
nueva `carta_med_palancas_<n>` con TEMPLATE y trabaja ahí. Salida: `2026-11-14-recursos-medicion.json`.
Uso: python3 -I 2026-11-14-recursos-medir.py   (psql y la base `carta_med_mediano` deben existir; ver disco-e-historial-correr.sh)
"""
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
    r = subprocess.run(["psql", "-h", "127.0.0.1", "-U", "carta", "-d", db, "-At", "-F", "|", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True, env=ENV)
    if r.returncode:
        sys.exit(r.stderr)
    filas = [f.split("|") for f in r.stdout.strip().splitlines()]
    return filas[0][0] if uno else filas


def existe(n):
    return sql("postgres", f"select 1 from pg_database where datname='{n}'") != []


n = 1
while existe(f"carta_med_palancas_{n}"):
    n += 1
DB = f"carta_med_palancas_{n}"
sql("postgres", f"CREATE DATABASE {DB} TEMPLATE carta_med_mediano")
t = lambda q: int(sql(DB, q, uno=True))  # noqa: E731

# El generador de datos es BENIGNO: deja miembro_id y platillo_id en NULL y deja ip_hash y navegador constantes, así que sus índices sólo
# indexan NULL o un valor repetido. Se rellenan en la COPIA con valores variados (datos SINTÉTICOS, no medidos en producción):
#  · miembro_id: un miembro de la misma sesión · platillo_id (dish_view e item_add): un platillo cualquiera del restaurante
#  · ip_hash: 64 caracteres hexadecimales distintos por sesión y día · user_agent_fam: una de 8 familias
sql(DB, """update evento_analitica e set miembro_id = (select m.id from miembro_sesion m where m.sesion_id = e.sesion_id order by m.id limit 1)""")
sql(DB, """update evento_analitica e set platillo_id = (select p.id from platillo p where p.restaurante_id = e.restaurante_id order by md5(p.id::text || e.id::text) limit 1) where e.tipo in ('dish_view', 'item_add')""")
sql(DB, """update evento_analitica set ip_hash = md5(coalesce(sesion_id::text, '') || ocurrido_en::date::text) || md5(coalesce(sesion_id::text, '') || 'sal'),
           user_agent_fam = (array['Chrome','Safari','Firefox','Edge','Samsung','Opera','WebView','Otro'])[1 + (abs(hashtext(coalesce(sesion_id::text, ''))) % 8)]""")
sql(DB, "vacuum full analyze evento_analitica")

filas = t("select count(*) from evento_analitica")
visitas = t("select count(*) from sesion_grupal")
rest = t("select count(*) from restaurante")
base = dict(filas=filas, visitas=visitas, restaurantes=rest,
            heap=t("select pg_relation_size('evento_analitica')"), indices=t("select pg_indexes_size('evento_analitica')"),
            total=t("select pg_total_relation_size('evento_analitica')"))

# por qué pesa: bytes medios por columna del heap (pg_column_size) y por índice
cols = {}
for c in ["id", "restaurante_id", "mesa_id", "sesion_id", "miembro_id", "platillo_id", "tipo", "propiedades", "ip_hash", "user_agent_fam", "ocurrido_en"]:
    cols[c] = float(sql(DB, f"select coalesce(avg(pg_column_size({c})),0) from evento_analitica", uno=True))
indices = {i: t(f"select pg_relation_size('{i}'::regclass)") for (i,) in sql(DB, "select indexname from pg_indexes where tablename='evento_analitica'")}

# A) analítica agregada por día (sin fila por evento): restaurante, día, tipo (smallint), platillo (o nulo → cero), cuenta
sql(DB, """create table evento_dia as
  select restaurante_id, (ocurrido_en at time zone 'UTC')::date dia,
         (case tipo when 'scan' then 1 when 'menu_view' then 2 when 'dish_view' then 3 when 'search' then 4 when 'filter' then 5 else 6 end)::smallint tipo,
         coalesce(platillo_id, '00000000-0000-0000-0000-000000000000'::uuid) platillo_id, count(*)::int n
  from evento_analitica group by 1,2,3,4""")
sql(DB, "alter table evento_dia add primary key (restaurante_id, dia, tipo, platillo_id)")
dia = dict(filas=t("select count(*) from evento_dia"), total=t("select pg_total_relation_size('evento_dia')"), dias=t("select count(distinct dia) from evento_dia"))

# B) misma fila por evento con tipos más chicos (tipo y agente smallint, ip_hash 8 bytes), con los mismos índices
sql(DB, """create table evento_c as select id, restaurante_id, mesa_id, sesion_id, miembro_id, platillo_id,
  (case tipo when 'scan' then 1 when 'menu_view' then 2 when 'dish_view' then 3 when 'search' then 4 when 'filter' then 5 else 6 end)::smallint tipo,
  propiedades, decode(substr(ip_hash,1,16),'hex') ip_hash, (abs(hashtext(coalesce(user_agent_fam,'')))%100)::smallint user_agent_fam, ocurrido_en
  from evento_analitica""")
sql(DB, "alter table evento_c add primary key (id)")
for ix, cs in [("restaurante_fecha", "restaurante_id, ocurrido_en"), ("tipo", "tipo, ocurrido_en"), ("sesion", "sesion_id"), ("mesa", "mesa_id"), ("platillo", "platillo_id"), ("miembro", "miembro_id")]:
    sql(DB, f"create index idx_c_{ix} on evento_c ({cs})")
compacta = dict(heap=t("select pg_relation_size('evento_c')"), indices=t("select pg_indexes_size('evento_c')"), total=t("select pg_total_relation_size('evento_c')"))
# B2) compacta y con un solo índice (restaurante, fecha)
for ix in ["tipo", "sesion", "mesa", "platillo", "miembro"]:
    sql(DB, f"drop index idx_c_{ix}")
compacta_un_indice = dict(heap=t("select pg_relation_size('evento_c')"), indices=t("select pg_indexes_size('evento_c')"), total=t("select pg_total_relation_size('evento_c')"))

# C) la tabla original sin los cinco índices de columnas sueltas (queda la llave y (restaurante, fecha))
sql(DB, "create table evento_o as select * from evento_analitica")
sql(DB, "alter table evento_o add primary key (id)")
sql(DB, "create index idx_o_rf on evento_o (restaurante_id, ocurrido_en)")
un_indice = dict(heap=t("select pg_relation_size('evento_o')"), indices=t("select pg_indexes_size('evento_o')"), total=t("select pg_total_relation_size('evento_o')"))

# D) claves de idempotencia: bytes por fila (respuesta jsonb de ≈ 300 bytes, clave de 36, ámbito de 20) con su índice de purga
sql(DB, """insert into clave_idempotencia (ambito, clave, estado_http, respuesta, creada_en)
  select 'comanda:' || (g % 50), gen_random_uuid()::text, 200,
         jsonb_build_object('id', gen_random_uuid(), 'estado', 'abierta', 'items', jsonb_build_array(jsonb_build_object('platillo_id', gen_random_uuid(), 'cantidad', 2, 'precio', 120), jsonb_build_object('platillo_id', gen_random_uuid(), 'cantidad', 1, 'precio', 95)), 'total', 335),
         now() - (g % 30) * interval '1 day'
  from generate_series(1, 100000) g""")
sql(DB, "vacuum analyze clave_idempotencia")
idem = dict(filas=100000, total=t("select pg_total_relation_size('clave_idempotencia')"), bytes_respuesta=float(sql(DB, "select avg(pg_column_size(respuesta)) from clave_idempotencia", uno=True)))

# E) las tablas de la visita (sin analítica) por visita, para el archivo de sesiones cerradas
visita_tablas = {}
for tb in ["sesion_grupal", "miembro_sesion", "orden_personal", "item_orden", "comanda", "comanda_orden", "llamada_mesero"]:
    visita_tablas[tb] = t(f"select pg_total_relation_size('{tb}')")
# archivo comprimido de una sesión cerrada: se exportan las filas de la visita como JSON líneas y se comprime con gzip (medido en el cliente)
sesiones_json = sql(DB, """select row_to_json(s)::text from sesion_grupal s limit 3000""")
import gzip
crudo = "\n".join(f[0] for f in sesiones_json).encode()
sal = dict(base=base, columnas_bytes_medios=cols, indices_bytes=indices, agregada_por_dia=dia, compacta=compacta, compacta_un_indice=compacta_un_indice, original_un_indice=un_indice,
           idempotencia=idem, visita_tablas_bytes=visita_tablas, gzip_sesion_json=dict(crudo=len(crudo), comprimido=len(gzip.compress(crudo)), filas=len(sesiones_json)),
           base_de_trabajo=DB, nota="MEDIDO CON DATOS SINTÉTICOS en PostgreSQL local sobre una copia de carta_med_mediano (10 restaurantes medianos, un mes, 10 eventos por visita [supuesto]); miembro, platillo, ip_hash y navegador rellenados con valores variados (ver el guion); con tráfico real pesaría distinto",
           platillos_en_la_copia=t("select count(*) from platillo") // rest, platillos_distintos_en_eventos=t("select count(distinct platillo_id) from evento_analitica"))
json.dump(sal, open(os.path.join(AQUI, "2026-11-14-recursos-medicion.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: sal[k] for k in ("base", "agregada_por_dia", "compacta", "compacta_un_indice", "original_un_indice", "idempotencia")}, indent=1))
