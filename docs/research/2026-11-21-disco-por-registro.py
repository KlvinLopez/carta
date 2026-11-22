"""Mide, registro por registro, todo lo que escribe en la base UNA mesa de tres comensales (A, B y C) y lo compara con dos formas propuestas de
guardar la analítica («contar por día» y «fila por visita»). Salida: 2026-11-21-disco-por-registro.json (ver 2026-11-21-disco-por-registro.md).

Uso (desde la raíz del repositorio; psql, uv y PostgreSQL local deben existir):
    PGPASSWORD=<contraseña de la base local de desarrollo> python3 -I docs/research/2026-11-21-disco-por-registro.py

Crea una base NUEVA `carta_med_registro_<n>` (nunca borra nada), la migra con `alembic upgrade head` (el esquema es el de app/db/models.py tal como
lo dejan las migraciones), la siembra con `scripts/seed.py` (restaurante, mesas y platillos reales de desarrollo), escribe la mesa con INSERT y
mide cada fila con la extensión `pageinspect`:
  · bytes de cada columna: pg_column_size(columna);
  · cabecera de la fila y largo de la tupla: heap_page_items(get_raw_page(tabla, bloque)) → t_hoff y lp_len de ese ctid;
  · relleno de alineación: lo que falta entre la suma de las columnas y lp_len − t_hoff (se calcula con la alineación de cada tipo y se verifica);
  · entradas de índice: bt_page_items(índice, bloque) → itemlen de la entrada cuyo ctid es el de la fila (+ 4 bytes de su puntero de línea).
Datos sintéticos (alias, colores y huellas inventados); el tamaño no depende del valor salvo en texto y jsonb.
"""

import json
import os
import subprocess
import sys
from datetime import date
from pathlib import Path

if "PGPASSWORD" not in os.environ:
    sys.exit(
        "Defina PGPASSWORD (la contraseña de la base LOCAL de desarrollo) en el entorno: no se guarda en el repositorio."
    )
RAIZ = Path(__file__).resolve().parents[2]
AQUI = Path(__file__).resolve().parent
ENV = dict(os.environ)  # el host es siempre 127.0.0.1 y la base de trabajo es carta_med_registro_*
VERSION = "2026-11-21-r16"
MAXALIGN = 8
PUNTERO_DE_LINEA = 4


def psql(db, q, uno=False, filas=False):
    if db != "postgres" and not db.startswith("carta_med_registro_"):
        sys.exit(f"Base {db!r} rechazada: este guion sólo toca bases carta_med_registro_* locales")
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
            "\x1f",
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
    f = [x.split("\x1f") for x in r.stdout.strip().splitlines()]
    if uno:
        return f[0][0]
    return f if filas else r.stdout.strip()


def alinear(x, a):
    return (x + a - 1) // a * a


n = 1
while psql("postgres", f"select 1 from pg_database where datname='carta_med_registro_{n}'"):
    n += 1
DB = f"carta_med_registro_{n}"
psql("postgres", f"create database {DB}")
url = f"postgresql+asyncpg://carta:{os.environ['PGPASSWORD']}@127.0.0.1:5432/{DB}"
entorno_app = {**os.environ, "DATABASE_URL": url, "ENTORNO": "desarrollo"}
for cmd in (
    ["uv", "run", "alembic", "upgrade", "head"],
    ["uv", "run", "python", "scripts/seed.py"],
):
    r = subprocess.run(cmd, cwd=RAIZ, env=entorno_app, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stdout + r.stderr)
psql(DB, "create extension if not exists pageinspect")

REST = psql(DB, "select id from restaurante where slug = 'la-ceiba'", uno=True)
MESA = psql(
    DB,
    f"select id from mesa where restaurante_id = '{REST}' and activa order by numero limit 1",
    uno=True,
)
PLATILLOS = [
    x[0]
    for x in psql(
        DB,
        f"select id from platillo where restaurante_id = '{REST}' and activo and disponible order by orden limit 3",
        filas=True,
    )
]
HOY = date.today().isoformat()


def q1(q):
    return psql(DB, q, uno=True)


# ---------------------------------------------------------------- medición de una fila
def medir(tabla, donde, paso, id_fila, forma="base"):
    """Mide la fila de `tabla` que cumple `donde` (una sola)."""
    cols = psql(
        DB,
        f"""select a.attname, format_type(a.atttypid, a.atttypmod), t.typalign, t.typlen
        from pg_attribute a join pg_type t on t.oid = a.atttypid
        where a.attrelid = '{tabla}'::regclass and a.attnum > 0 and not a.attisdropped order by a.attnum""",
        filas=True,
    )
    sel = ", ".join(f'"{c[0]}"::text, coalesce(pg_column_size("{c[0]}"), -1)' for c in cols)
    vals = psql(DB, f"select ctid::text, {sel} from {tabla} where {donde}", filas=True)
    if len(vals) != 1:
        sys.exit(f"{tabla} / {donde}: se esperaba una fila y hay {len(vals)}")
    v = vals[0]
    ctid = v[0]
    bloque, off = (int(x) for x in ctid.strip("()").split(","))
    lp_len, t_hoff = (
        int(x)
        for x in psql(
            DB,
            f"select lp_len, t_hoff from heap_page_items(get_raw_page('{tabla}', {bloque})) where lp = {off}",
            filas=True,
        )[0]
    )
    columnas = []
    pos = 0  # desplazamiento dentro de los datos (después de la cabecera)
    rellenos_entre = 0
    for i, c in enumerate(cols):
        texto, tam = v[1 + 2 * i], int(v[2 + 2 * i])
        nulo = tam == -1
        relleno_antes = 0
        if not nulo:
            alin = {"c": 1, "s": 2, "i": 4, "d": 8}[c[2]]
            es_varlena = c[3] == "-1"
            # las varlena cortas (1 byte de cabecera) no se alinean; las largas sí
            if not (es_varlena and tam <= 127):
                relleno_antes = alinear(pos, alin) - pos
            pos += relleno_antes + tam
            rellenos_entre += relleno_antes
        columnas.append(
            {
                "nombre": c[0],
                "tipo": c[1],
                "valor": None if nulo else (texto if len(texto) <= 70 else texto[:67] + "..."),
                "bytes": 0 if nulo else tam,
                "relleno_antes": relleno_antes,
            }
        )
    datos = lp_len - t_hoff
    suma_cols = sum(c["bytes"] for c in columnas)
    if datos != suma_cols + rellenos_entre:
        sys.exit(
            f"{tabla}: la tupla mide {datos} bytes de datos y las columnas con su alineación suman {suma_cols + rellenos_entre}"
        )
    relleno_final = alinear(lp_len, MAXALIGN) - lp_len
    relleno = rellenos_entre + relleno_final
    # índices
    indices = []
    for (idx,) in psql(
        DB,
        f"select indexrelid::regclass::text from pg_index where indrelid = '{tabla}'::regclass order by 1",
        filas=True,
    ):
        bloques = int(q1(f"select pg_relation_size('{idx}') / 8192"))
        tam = None
        for b in range(1, bloques):
            r = psql(
                DB,
                f"select itemlen from bt_page_items('{idx}', {b}) where ctid = '{ctid}'::tid",
                filas=True,
            )
            if r:
                tam = int(r[0][0])
                break
        if tam is None:
            sys.exit(f"{tabla}: no se encontró la entrada de {idx} para {ctid}")
        indices.append(
            {
                "nombre": idx,
                "bytes": alinear(tam, MAXALIGN) + PUNTERO_DE_LINEA,
                "tupla_de_indice": tam,
            }
        )
    cabecera = t_hoff
    bytes_datos = cabecera + suma_cols + relleno + PUNTERO_DE_LINEA
    bytes_indices = sum(i["bytes"] for i in indices)
    return {
        "id": id_fila,
        "paso": paso,
        "forma": forma,
        "ctid": ctid,
        "columnas": columnas,
        "cabecera_bytes": cabecera,
        "relleno_bytes": relleno,
        "puntero_de_linea_bytes": PUNTERO_DE_LINEA,
        "indices": indices,
        "bytes_datos": bytes_datos,
        "bytes_indices": bytes_indices,
        "bytes_total": bytes_datos + bytes_indices,
    }


# ---------------------------------------------------------------- la mesa: A, B y C
pasos = []
filas_por_tabla = {}  # tabla -> [fila medida]


def paso(id_, quien, que):
    p = {"id": id_, "quien": quien, "que_hace": que, "escribe": []}
    pasos.append(p)
    return p


def escribe(p, tabla, sql_insert, donde, forma="base", etiqueta=None):
    psql(DB, sql_insert)
    k = len(filas_por_tabla.setdefault((forma, tabla), [])) + 1
    id_fila = etiqueta or f"{tabla}#{k}"
    fila = medir(tabla, donde, p["id"], id_fila, forma)
    filas_por_tabla[(forma, tabla)].append(fila)
    p["escribe"].append({"forma": forma, "tabla": tabla, "fila": id_fila})
    return fila


NOMBRES = {"A": ("Ana", "#4F1728"), "B": ("Beto", "#B8860B"), "C": ("Carla", "#6B2D3E")}
ids = {}
HASH = {"A": "9f2c" * 16, "B": "4b7e" * 16, "C": "c13a" * 16}
AGENTE = {"A": "Safari", "B": "Chrome", "C": "Safari"}

# p1: A entra
p = paso(
    "p1", "A", "Ana escanea el QR: se crea la sesión de la mesa y ella entra como primera comensal"
)
ids["sesion"] = q1(
    f"insert into sesion_grupal (mesa_id, restaurante_id) values ('{MESA}', '{REST}') returning id"
)
fila = medir("sesion_grupal", f"id = '{ids['sesion']}'", "p1", "sesion_grupal#1")
filas_por_tabla[("base", "sesion_grupal")] = [fila]
p["escribe"].append({"forma": "base", "tabla": "sesion_grupal", "fila": "sesion_grupal#1"})


def miembro(p, quien):
    alias, color = NOMBRES[quien]
    ids[f"miembro_{quien}"] = q1(
        f"insert into miembro_sesion (sesion_id, alias, color_avatar) values ('{ids['sesion']}', '{alias}', '{color}') returning id"
    )
    k = len(filas_por_tabla.setdefault(("base", "miembro_sesion"), [])) + 1
    fila = medir(
        "miembro_sesion", f"id = '{ids[f'miembro_{quien}']}'", p["id"], f"miembro_sesion#{k}"
    )
    filas_por_tabla[("base", "miembro_sesion")].append(fila)
    p["escribe"].append({"forma": "base", "tabla": "miembro_sesion", "fila": fila["id"]})
    ids[f"orden_{quien}"] = q1(
        f"insert into orden_personal (sesion_id, miembro_id) values ('{ids['sesion']}', '{ids[f'miembro_{quien}']}') returning id"
    )
    k = len(filas_por_tabla.setdefault(("base", "orden_personal"), [])) + 1
    fila = medir(
        "orden_personal", f"id = '{ids[f'orden_{quien}']}'", p["id"], f"orden_personal#{k}"
    )
    filas_por_tabla[("base", "orden_personal")].append(fila)
    p["escribe"].append({"forma": "base", "tabla": "orden_personal", "fila": fila["id"]})


miembro(p, "A")
p2 = paso("p2", "B", "Beto escanea el mismo QR y entra a la sesión; se le abre su orden personal")
miembro(p2, "B")
p3 = paso("p3", "C", "Carla escanea el mismo QR y entra a la sesión; se le abre su orden personal")
miembro(p3, "C")

# eventos de analítica (hoy: una fila por evento); 12 en total, 4 por comensal
EVENTOS = {
    "A": [("scan", None), ("menu_view", None), ("dish_view", 0), ("search", None)],
    "B": [("scan", None), ("menu_view", None), ("dish_view", 1), ("filter", None)],
    "C": [("scan", None), ("menu_view", None), ("dish_view", 2), ("item_add", 2)],
}
todos_los_eventos = []  # (quien, tipo, platillo_idx, paso, id_fila)


def eventos(p, quien, tipos):
    for tipo, pl in EVENTOS[quien]:
        if tipo not in tipos:
            continue
        platillo = f"'{PLATILLOS[pl]}'" if pl is not None else "null"
        psql(
            DB,
            f"""insert into evento_analitica (restaurante_id, mesa_id, sesion_id, miembro_id, platillo_id, tipo, ip_hash, user_agent_fam)
            values ('{REST}', '{MESA}', '{ids["sesion"]}', '{ids[f"miembro_{quien}"]}', {platillo}, '{tipo}', '{HASH[quien]}', '{AGENTE[quien]}')""",
        )
        k = len(filas_por_tabla.setdefault(("hoy", "evento_analitica"), [])) + 1
        eid = f"evento_analitica#{k}"
        fila = medir(
            "evento_analitica", "id = (select max(id) from evento_analitica)", p["id"], eid, "hoy"
        )
        filas_por_tabla[("hoy", "evento_analitica")].append(fila)
        p["escribe"].append({"forma": "hoy", "tabla": "evento_analitica", "fila": eid})
        todos_los_eventos.append((quien, tipo, pl))


eventos(p, "A", ("scan", "menu_view"))
eventos(p2, "B", ("scan", "menu_view"))
eventos(p3, "C", ("scan", "menu_view"))

# p4: cada uno mira un platillo y agrega los suyos (3 platillos por comensal)
PRECIOS = [185.0, 95.0, 210.0]
p4 = paso(
    "p4",
    "A, B y C",
    "Cada comensal mira un platillo, busca o filtra, y agrega tres platillos a su orden personal",
)
for quien in "ABC":
    eventos(p4, quien, ("dish_view", "search", "filter", "item_add"))
    for j in range(3):
        pl = PLATILLOS[j]
        precio = PRECIOS[j]
        psql(
            DB,
            f"insert into item_orden (orden_id, platillo_id, cantidad, precio_unitario, subtotal) values ('{ids[f'orden_{quien}']}', '{pl}', 1, {precio}, {precio})",
        )
        k = len(filas_por_tabla.setdefault(("base", "item_orden"), [])) + 1
        fila = medir(
            "item_orden",
            f"orden_id = '{ids[f'orden_{quien}']}' and platillo_id = '{pl}'",
            "p4",
            f"item_orden#{k}",
        )
        filas_por_tabla[("base", "item_orden")].append(fila)
        p4["escribe"].append({"forma": "base", "tabla": "item_orden", "fila": fila["id"]})

# p5: la mesa envía la comanda
p5 = paso(
    "p5", "A", "Ana envía la comanda de la mesa al personal; cada orden queda enlazada a ella"
)
ids["comanda"] = q1(
    f"""insert into comanda (restaurante_id, mesa_id, sesion_id, total_estimado, num_comensales) values ('{REST}', '{MESA}', '{ids["sesion"]}', {sum(PRECIOS) * 3}, 3) returning id"""
)
fila = medir("comanda", f"id = '{ids['comanda']}'", "p5", "comanda#1")
filas_por_tabla[("base", "comanda")] = [fila]
p5["escribe"].append({"forma": "base", "tabla": "comanda", "fila": "comanda#1"})
for quien in "ABC":
    psql(
        DB,
        f"insert into comanda_orden (comanda_id, orden_id) values ('{ids['comanda']}', '{ids[f'orden_{quien}']}')",
    )
    k = len(filas_por_tabla.setdefault(("base", "comanda_orden"), [])) + 1
    fila = medir(
        "comanda_orden",
        f"comanda_id = '{ids['comanda']}' and orden_id = '{ids[f'orden_{quien}']}'",
        "p5",
        f"comanda_orden#{k}",
    )
    filas_por_tabla[("base", "comanda_orden")].append(fila)
    p5["escribe"].append({"forma": "base", "tabla": "comanda_orden", "fila": fila["id"]})

# p6: llamada al mesero
p6 = paso("p6", "B", "Beto llama al mesero")
psql(
    DB,
    f"insert into llamada_mesero (restaurante_id, mesa_id, sesion_id, miembro_id) values ('{REST}', '{MESA}', '{ids['sesion']}', '{ids['miembro_B']}')",
)
fila = medir("llamada_mesero", f"sesion_id = '{ids['sesion']}'", "p6", "llamada_mesero#1")
filas_por_tabla[("base", "llamada_mesero")] = [fila]
p6["escribe"].append({"forma": "base", "tabla": "llamada_mesero", "fila": "llamada_mesero#1"})

# ---------------------------------------------------------------- las dos formas propuestas (tablas de la base de medición; NO existen en el modelo)
psql(
    DB,
    """create table evento_dia (restaurante_id uuid not null, dia date not null, tipo smallint not null, platillo_id uuid not null, n integer not null,
    primary key (restaurante_id, dia, tipo, platillo_id))""",
)
psql(
    DB,
    """create table visita_comensal (restaurante_id uuid not null, dia date not null, miembro_id uuid not null,
    menu_n smallint not null, menu_seg smallint not null, platillo_n smallint not null, platillo_seg smallint not null, busqueda_n smallint not null, busqueda_seg smallint not null,
    primary key (restaurante_id, dia, miembro_id))""",
)
CODIGO = {"scan": 1, "menu_view": 2, "dish_view": 3, "search": 4, "filter": 5, "item_add": 6}
CERO = "00000000-0000-0000-0000-000000000000"

# contar por día: una fila por (restaurante, día, tipo, platillo) distinta; la mesa es la primera del día (cota alta de filas nuevas)
claves = {}
for quien, tipo, pl in todos_los_eventos:
    k = (CODIGO[tipo], PLATILLOS[pl] if pl is not None else CERO)
    claves.setdefault(
        k,
        {
            "n": 0,
            "paso": "p4"
            if tipo not in ("scan", "menu_view")
            else {"A": "p1", "B": "p2", "C": "p3"}[quien],
        },
    )
    claves[k]["n"] += 1
pcd = paso(
    "pcd",
    "teléfonos",
    "(propuesta) Cada evento suma 1 a su contador del día; la mesa es la primera del día, así que cada contador distinto es una fila nueva",
)
for i, ((tipo, platillo), d) in enumerate(sorted(claves.items()), start=1):
    psql(
        DB,
        f"insert into evento_dia (restaurante_id, dia, tipo, platillo_id, n) values ('{REST}', '{HOY}', {tipo}, '{platillo}', {d['n']})",
    )
    fila = medir(
        "evento_dia",
        f"tipo = {tipo} and platillo_id = '{platillo}'",
        "pcd",
        f"evento_dia#{i}",
        "contar_por_dia",
    )
    filas_por_tabla.setdefault(("contar_por_dia", "evento_dia"), []).append(fila)
    pcd["escribe"].append({"forma": "contar_por_dia", "tabla": "evento_dia", "fila": fila["id"]})
eventos_totales = len(todos_los_eventos)
filas_evento_dia = len(claves)
actualizaciones_evento_dia = (
    eventos_totales - filas_evento_dia
)  # versiones nuevas de fila (UPSERT) que quedan como tuplas muertas hasta el vacuum

# fila por visita: una fila por comensal con veces y segundos por lugar (menú, platillo, búsqueda); se manda al terminar
pfv = paso(
    "pfv",
    "teléfonos",
    "(propuesta) Al terminar, cada teléfono manda UNA fila con las veces que entró y los segundos en el menú, el platillo y la búsqueda",
)
FV = {"A": (1, 140, 1, 95, 1, 20), "B": (1, 160, 1, 80, 0, 0), "C": (1, 180, 1, 120, 0, 0)}
for i, quien in enumerate("ABC", start=1):
    psql(
        DB,
        f"insert into visita_comensal values ('{REST}', '{HOY}', '{ids[f'miembro_{quien}']}', {', '.join(str(x) for x in FV[quien])})",
    )
    fila = medir(
        "visita_comensal",
        f"miembro_id = '{ids[f'miembro_{quien}']}'",
        "pfv",
        f"visita_comensal#{i}",
        "fila_por_visita",
    )
    filas_por_tabla.setdefault(("fila_por_visita", "visita_comensal"), []).append(fila)
    pfv["escribe"].append(
        {"forma": "fila_por_visita", "tabla": "visita_comensal", "fila": fila["id"]}
    )

# tercera forma, la combinación: la fila por visita más un contador diario por platillo y por filtros (la fila no dice qué platillo se vio)
pcb = paso(
    "pcb",
    "teléfonos",
    "(propuesta) Además de la fila por visita, un contador del día por platillo visto o agregado y por uso de filtros",
)
psql(
    DB,
    """create table platillo_dia (restaurante_id uuid not null, dia date not null, tipo smallint not null, platillo_id uuid not null, n integer not null,
    primary key (restaurante_id, dia, tipo, platillo_id))""",
)
combinadas = {k: d for k, d in claves.items() if k[0] in (3, 5, 6)}
for i, ((tipo, platillo), d) in enumerate(sorted(combinadas.items()), start=1):
    psql(
        DB,
        f"insert into platillo_dia (restaurante_id, dia, tipo, platillo_id, n) values ('{REST}', '{HOY}', {tipo}, '{platillo}', {d['n']})",
    )
    fila = medir(
        "platillo_dia",
        f"tipo = {tipo} and platillo_id = '{platillo}'",
        "pcb",
        f"platillo_dia#{i}",
        "fila_mas_platillo_y_filtros_por_dia",
    )
    filas_por_tabla.setdefault(("fila_mas_platillo_y_filtros_por_dia", "platillo_dia"), []).append(
        fila
    )
    pcb["escribe"].append(
        {
            "forma": "fila_mas_platillo_y_filtros_por_dia",
            "tabla": "platillo_dia",
            "fila": fila["id"],
        }
    )

# ---------------------------------------------------------------- armado del JSON
QUE_GUARDA = {
    "sesion_grupal": "La mesa de la visita: qué mesa, cuándo empezó y cuándo hubo la última actividad.",
    "miembro_sesion": "Cada comensal que entró a la mesa: alias, color y cuándo se unió.",
    "orden_personal": "Lo que pide cada comensal: estado, total y si está bloqueada.",
    "item_orden": "Cada platillo que un comensal agregó a su orden, con su precio congelado.",
    "comanda": "El pedido de la mesa enviado al personal: estado, total y número de comensales.",
    "comanda_orden": "Enlaza cada orden personal con la comanda de la mesa.",
    "llamada_mesero": "Una solicitud de atención de un comensal.",
    "evento_analitica": "Hoy: una fila por cada toque del comensal (escaneo, menú, platillo, búsqueda, filtro, agregar), con huella de red y navegador.",
    "evento_dia": "(propuesta) Un contador por restaurante, día, tipo de evento y platillo.",
    "visita_comensal": "(propuesta) Una fila por comensal y día: veces y segundos en menú, platillo y búsqueda; los filtros no van por comensal.",
    "platillo_dia": "(propuesta) Un contador por día de platillos vistos, agregados y de uso de filtros, sin dato de qué comensal.",
}


def tabla_json(forma, tabla):
    filas = filas_por_tabla[(forma, tabla)]
    return {
        "tabla": tabla,
        "que_guarda": QUE_GUARDA[tabla],
        "filas": filas,
        "total_bytes": sum(f["bytes_total"] for f in filas),
        "total_bytes_de_datos": sum(f["bytes_datos"] for f in filas),
        "total_bytes_de_indices": sum(f["bytes_indices"] for f in filas),
    }


ORDEN_BASE = [
    "sesion_grupal",
    "miembro_sesion",
    "orden_personal",
    "item_orden",
    "comanda",
    "comanda_orden",
    "llamada_mesero",
]
tablas_de_la_mesa = [tabla_json("base", t) for t in ORDEN_BASE]
bytes_mesa = sum(t["total_bytes"] for t in tablas_de_la_mesa)
FORMAS = [
    (
        "hoy",
        "Hoy: una fila por evento",
        "base_actual",
        ["evento_analitica"],
        [
            "La tabla evento_analitica existe hoy en el modelo (app/db/models.py); 12 eventos de ejemplo, 4 por comensal."
        ],
    ),
    (
        "contar_por_dia",
        "Contar por día",
        "propuesta",
        ["evento_dia"],
        [
            "PROPUESTA: la tabla evento_dia no existe en el modelo; se creó en la base de medición. Esquema: (restaurante_id uuid, dia date, tipo smallint, platillo_id uuid, n integer), llave (restaurante_id, dia, tipo, platillo_id), sin llaves foráneas.",
            f"La mesa es la primera del día: los {filas_evento_dia} contadores distintos son filas nuevas. En un día con tráfico esos contadores ya existen y cada evento los actualiza (UPSERT): no suma filas, pero cada actualización deja una versión muerta de la fila hasta el vacuum ({actualizaciones_evento_dia} en este ejemplo).",
        ],
    ),
    (
        "fila_por_visita",
        "Fila por visita de comensal",
        "propuesta",
        ["visita_comensal"],
        [
            "PROPUESTA: la tabla visita_comensal no existe en el modelo; se creó en la base de medición. Esquema: (restaurante_id uuid, dia date, miembro_id uuid, menu_n, menu_seg, platillo_n, platillo_seg, busqueda_n, busqueda_seg smallint), llave (restaurante_id, dia, miembro_id), sin llaves foráneas.",
            "El teléfono manda la fila UNA vez al terminar (un INSERT); si se cierra antes, esa visita no queda. Actualizarla duplicaría la tabla. No lleva filtros por comensal (regla 10) ni platillo visto.",
        ],
    ),
    (
        "fila_mas_platillo_y_filtros_por_dia",
        "Fila por visita más un contador diario de platillos y filtros",
        "propuesta",
        ["visita_comensal", "platillo_dia"],
        [
            "PROPUESTA: la fila por visita más platillo_dia (restaurante, día, tipo, platillo; n) sólo para dish_view, item_add y filter. Los filtros se cuentan por restaurante y día, sin comensal."
        ],
    ),
]
formas = []
for fid, nombre, estado, tablas, notas in FORMAS:
    ts = []
    for t in tablas:
        k = (fid, t) if (fid, t) in filas_por_tabla else None
        if t == "visita_comensal" and fid == "fila_mas_platillo_y_filtros_por_dia":
            filas_por_tabla[(fid, t)] = filas_por_tabla[("fila_por_visita", t)]
        ts.append(tabla_json(fid, t))
    bytes_an = sum(t["total_bytes"] for t in ts)
    formas.append(
        {
            "id": fid,
            "nombre": nombre,
            "estado": estado,
            "tablas": ts,
            "bytes_analitica": bytes_an,
            "bytes_mesa_sin_analitica": bytes_mesa,
            "bytes_total": bytes_mesa + bytes_an,
            "parte_analitica": bytes_an / (bytes_mesa + bytes_an),
            "notas": notas,
        }
    )
hoy = formas[0]
comparacion = [
    {
        "forma": f["id"],
        "bytes_analitica": f["bytes_analitica"],
        "bytes_total": f["bytes_total"],
        "frente_a_hoy": f["bytes_analitica"] / hoy["bytes_analitica"] - 1,
    }
    for f in formas
]

# ---------------------------------------------------------------- diferencia con el informe (historia del disco)
hist = json.loads((AQUI / "2026-11-17-historia-del-disco.json").read_text())
copia = json.loads((AQUI / "2026-11-14-recursos-medicion.json").read_text())["base"]  # evento_analitica de la copia de 180,000 eventos: filas, heap, índices
informe_por_tabla = {p["tabla"]: p for p in hist["pasos"]}
medido_por_tabla = {t["tabla"]: t for t in tablas_de_la_mesa}
medido_por_tabla["evento_analitica"] = hoy["tablas"][0]
conciliacion = []
for tabla, pinf in informe_por_tabla.items():
    t = medido_por_tabla[tabla]
    conciliacion.append(
        {
            "tabla": tabla,
            "informe_filas": round(pinf["filas"], 2),
            "informe_bytes_por_fila": pinf["bytes_por_fila"],
            "informe_bytes": round(pinf["bytes"]),
            "medido_filas": len(t["filas"]),
            "medido_bytes_por_fila": round(t["total_bytes"] / len(t["filas"])),
            "medido_bytes": t["total_bytes"],
        }
    )
medido_total = hoy["bytes_total"]
diferencia = {
    "informe_bytes": round(hist["bytes_total"]),
    "medido_bytes": medido_total,
    "diferencia_bytes": medido_total - round(hist["bytes_total"]),
    "conciliacion_por_tabla": conciliacion,
    "explicacion": [
        "El informe (2026-11-17-historia-del-disco) usa valores ESPERADOS por mesa de tres (1.3 comandas, 0.3 llamadas, 11.56 eventos) y bytes por fila = tamaño total de la tabla (con sus índices) ÷ sus filas, medido en una copia de 18,000 sesiones. Esta medición escribe UNA mesa concreta (1 comanda, 1 llamada, 12 eventos) y mide cada registro contra el esquema real.",
        "El promedio de la copia (tamaño de la tabla con sus índices ÷ sus filas) mezcla efectos que un registro suelto no ve: huecos de las páginas de 8 KB, páginas internas de los índices y la deduplicación de entradas de índice iguales; según la tabla empujan el promedio hacia arriba o hacia abajo de la suma exacta de la tupla y sus entradas.",
        "El informe cuenta en el ejemplo un comensal por comanda_orden y fracciones de comanda y de llamada porque promedia 18,000 mesas; esta mesa escribe filas enteras. No se corrigió la cifra del informe: se añadió esta vista por registro y se explica la diferencia fila por fila en `conciliacion_por_tabla`.",
        f"Dónde está la diferencia: el informe da {round(hist['bytes_total'])} bytes por mesa; esta medición da {medido_total}. En las seis tablas de la visita coinciden dentro de unas decenas de bytes por fila (264 contra {round(medido_por_tabla['sesion_grupal']['total_bytes'])} la sesión: 100 de tupla más 176 de seis entradas de índice). La diferencia grande es la analítica: {round(hoy['bytes_analitica'] / len(hoy['tablas'][0]['filas']))} bytes por evento medidos contra {hist['pasos'][-1]['bytes_por_fila']} del informe. Un evento real escribe 7 entradas de índice ({sum(i['bytes'] for i in hoy['tablas'][0]['filas'][0]['indices'])} bytes la primera) y en la copia de 180,000 eventos los índices pesan {round(copia['indices'] / copia['filas'])} bytes por evento (la tupla, {round(copia['heap'] / copia['filas'])}): al repetirse miembro, sesión, mesa, tipo y restaurante, PostgreSQL deduplica las entradas de índice iguales (btree con deduplicación) y cada una cuesta menos que el registro suelto, que no puede deduplicar contra nadie.",
        "Por eso las dos cifras son ciertas y miden cosas distintas: el registro suelto es el costo de escribir ESTA mesa (cota alta de índices); el promedio de la copia es lo que ocupa el disco a escala. La capacidad del informe usa el promedio de la copia. No se corrigió ninguna de las dos; la corrección pendiente es medir con tráfico real cuánto deduplican los índices.",
        "No se cuentan las ACTUALIZACIONES (estado de la orden, ultima_actividad_en de la sesión, confirmación de la comanda): cada una deja una versión nueva de la fila hasta el vacuum. El informe tampoco las cuenta; es una subestimación común, pendiente de medir cuando exista la Fase 3.",
    ],
}

consultas = [
    {
        "que": "bytes de cada columna",
        "sql": 'select pg_column_size("columna") from tabla where <fila>',
    },
    {
        "que": "tipo y alineación de cada columna",
        "sql": "select a.attname, format_type(a.atttypid, a.atttypmod), t.typalign, t.typlen from pg_attribute a join pg_type t on t.oid = a.atttypid where a.attrelid = 'tabla'::regclass and a.attnum > 0 and not a.attisdropped",
    },
    {
        "que": "posición de la fila (ctid) y su tupla: lp_len (largo) y t_hoff (cabecera con mapa de nulos)",
        "sql": "select ctid from tabla where <fila>; select lp_len, t_hoff from heap_page_items(get_raw_page('tabla', <bloque>)) where lp = <posición>",
    },
    {
        "que": "relleno de alineación",
        "sql": "lp_len − t_hoff − suma de pg_column_size de las columnas = relleno entre columnas (verificado con la alineación de cada tipo) + relleno final hasta múltiplo de 8",
    },
    {
        "que": "entrada de índice de la fila",
        "sql": "select itemlen from bt_page_items('índice', <bloque>) where ctid = '<ctid de la fila>'::tid; bytes = itemlen redondeado a múltiplo de 8 + 4 del puntero de línea",
    },
    {
        "que": "puntero de línea de la fila",
        "sql": "4 bytes por tupla en la página de la tabla (ItemIdData)",
    },
]
salida = {
    "version": VERSION,
    "ejemplo": {
        "comensales": ["A", "B", "C"],
        "descripcion": "Una mesa de tres comensales (Ana, Beto y Carla): entran a la misma sesión, cada uno agrega tres platillos, la mesa envía la comanda y Beto llama al mesero. 12 eventos de analítica (4 por comensal).",
        "restaurante": "La Ceiba (datos de desarrollo), plan Chef",
        "base_de_medicion": DB,
    },
    "medido_con": {
        "base": f"{DB} (PostgreSQL local, esquema de las migraciones)",
        "extension": "pageinspect",
        "consultas": consultas,
        "nota": "Datos sintéticos; el tamaño de una fila no depende del valor salvo en texto y jsonb. Los bytes de datos de una fila = cabecera + columnas + relleno + 4 del puntero de línea; los de índices = entradas de índice (con su puntero de línea).",
    },
    "codigos_de_evento": {str(v): k for k, v in CODIGO.items()},  # tipo smallint de las tablas propuestas (evento_dia, platillo_dia) → nombre del tipo de evento
    "pasos": pasos,
    "tablas_de_la_mesa": tablas_de_la_mesa,
    "bytes_de_la_mesa_sin_analitica": bytes_mesa,
    "formas": formas,
    "comparacion": comparacion,
    "diferencia_con_el_informe": diferencia,
}
(AQUI / "2026-11-21-disco-por-registro.json").write_text(
    json.dumps(salida, ensure_ascii=False, indent=1) + "\n"
)
print(
    json.dumps(
        {
            "base": DB,
            "mesa_sin_analitica": bytes_mesa,
            **{f["id"]: f["bytes_analitica"] for f in formas},
        }
    )
)
