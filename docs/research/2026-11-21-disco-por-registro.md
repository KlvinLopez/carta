# El disco por registro: una mesa de tres comensales (r16)

Archivo de datos: [`2026-11-21-disco-por-registro.json`](2026-11-21-disco-por-registro.json). Lo lee el generador del informe interactivo; no lleva cifras escritas a mano.

**Qué es.** Todo lo que escribe en la base UNA mesa concreta (Ana, Beto y Carla), fila por fila y columna por columna, con sus bytes medidos, y lo mismo para dos formas **propuestas** de guardar la analítica («contar por día» y «fila por visita»; más su combinación con un contador de platillos). Mismos tres comensales y mismos pasos, para comparar registro contra registro. Las formas propuestas **no existen en el modelo**: se crean como tablas en la base de medición.

**Método.**
1. Se crea una base nueva `carta_med_registro_<n>` (nunca se borra nada), se migra con `alembic upgrade head` (el esquema de `app/db/models.py` tal como lo dejan las migraciones) y se siembra con `scripts/seed.py`.
2. La mesa se escribe con `INSERT`, paso por paso (`pasos` del JSON), y cada fila se mide al escribirla con la extensión `pageinspect`:
   - bytes de cada columna: `pg_column_size(columna)`;
   - cabecera y largo de la tupla: `heap_page_items(get_raw_page(tabla, bloque))` → `t_hoff` y `lp_len` del `ctid` de la fila;
   - relleno de alineación: lo que falta entre la suma de las columnas y `lp_len − t_hoff` (se calcula con la alineación de cada tipo y el guion se detiene si no cuadra) más el relleno final hasta múltiplo de 8;
   - entradas de índice: `bt_page_items(índice, bloque)` → `itemlen` de la entrada cuyo `ctid` es el de la fila, redondeado a múltiplo de 8 más 4 del puntero de línea;
   - puntero de línea de la tupla: 4 bytes.
3. Bytes de datos de una fila = cabecera + columnas + relleno + 4 del puntero de línea. Bytes de índices = suma de sus entradas. Total de la fila = datos + índices.

**Qué no cuenta.** Las actualizaciones (estado de la orden, última actividad de la sesión, confirmación de la comanda) dejan versiones nuevas de fila hasta el vacuum; no se cuentan, igual que en el informe. Los datos son sintéticos: el tamaño de una fila no depende del valor salvo en texto y `jsonb`.

**Por qué no da 8,382.** Ver `diferencia_con_el_informe` en el JSON, con su conciliación tabla por tabla. En resumen: las siete tablas de la visita coinciden con el informe dentro de unas decenas de bytes por fila; la diferencia está en la analítica, donde un registro suelto paga siete entradas de índice sin deduplicar y la copia de 180,000 eventos, que usa el informe, deduplica las entradas iguales. Las dos cifras son ciertas y miden cosas distintas (costo de escribir esta mesa frente a lo que ocupa el disco a escala); no se corrigió ninguna.

**Cómo regenerarlo** (desde la raíz del repositorio; hace falta PostgreSQL local, `psql` y `uv`):

```bash
PGPASSWORD=<contraseña de la base local de desarrollo> python3 -I docs/research/2026-11-21-disco-por-registro.py
```

El guion sólo toca `127.0.0.1` y bases `carta_med_registro_*`, y la contraseña sólo se lee del entorno. Los números salen iguales en cada corrida.
