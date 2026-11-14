"""Mide el disco de las bases generadas por 2026-11-14-disco-e-historial-correr.sh.

Salida (JSON en stdout): por perfil y tabla, filas, bytes del heap, del TOAST, de los índices y
total (pg_total_relation_size), y el tamaño de cada índice. Sólo biblioteca estándar y `psql`.
Uso: python3 -I medir.py chico=carta_med_chico mediano=carta_med_mediano ...
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

ENV = {**os.environ, "PGPASSWORD": "carta_dev_password"}


def sql(db: str, consulta: str) -> list[list[str]]:
    r = subprocess.run(
        ["psql", "-h", "127.0.0.1", "-U", "carta", "-d", db, "-At", "-F", "|", "-c", consulta],
        capture_output=True,
        text=True,
        env=ENV,
        check=True,
    )
    return [fila.split("|") for fila in r.stdout.strip().splitlines()]


def medir(db: str) -> dict:
    tablas = {}
    for t, filas, heap, toast, idx, total in sql(
        db,
        """select c.relname, c.reltuples::bigint, pg_relation_size(c.oid),
                  coalesce(pg_relation_size(c.reltoastrelid), 0), pg_indexes_size(c.oid),
                  pg_total_relation_size(c.oid)
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' order by 6 desc""",
    ):
        tablas[t] = dict(
            filas=int(filas), heap=int(heap), toast=int(toast), indices=int(idx), total=int(total)
        )
    indices = {}
    for t, i, tam in sql(
        db,
        """select tablename, indexname, pg_relation_size(quote_ident(indexname)::regclass)
           from pg_indexes where schemaname = 'public' order by 3 desc""",
    ):
        indices.setdefault(t, {})[i] = int(tam)
    (bd,) = sql(db, "select pg_database_size(current_database())")
    return dict(tablas=tablas, indices=indices, base_total=int(bd[0]))


if __name__ == "__main__":
    salida = {}
    for arg in sys.argv[1:]:
        perfil, db = arg.split("=")
        salida[perfil] = medir(db)
    json.dump(salida, sys.stdout, ensure_ascii=False, indent=1)
