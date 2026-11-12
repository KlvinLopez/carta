# Respaldo de la base (`deploy/respaldo/`)

Imagen Alpine 3.23 con `pg_dump` 18, `age` y `rclone`. Un arranque = un respaldo: `pg_dump -Fc` → cifrado con la llave **pública** de `age` → `respaldos/<ENTORNO>/<fecha>.dump.age` en el bucket privado de R2 → poda de lo que pase de `RESPALDO_DIAS` (30). Sale con código ≠ 0 si algo falla; corre como usuario sin privilegios.

- **Por qué 18:** la base que crea la plantilla de PostgreSQL de Railway es la 18 y `pg_dump` se niega a volcar un servidor más nuevo que él («server version mismatch»), así que el cliente debe ser de la **misma versión mayor** que el servidor. La construcción falla si el `pg_dump` del PATH no es el 18, y la CI lo afirma. Si el servidor sube de versión mayor, sube también `postgresqlNN-client` (y la base de Alpine si hace falta). La variante de VM (`deploy/vps/`, PostgreSQL 16) tendría que subir su servidor a 18 para usar esta imagen.
- **Construir:** `docker build -t carta-respaldo deploy/respaldo`
- **Variables:** `DATABASE_URL`, `RESPALDO_CLAVE_AGE` (`age-keygen` una vez; la privada va al gestor de contraseñas, nunca al servidor), `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PRIVADO`, `ENTORNO`, `RESPALDO_DIAS`.
- **Probar a mano:** `docker run --rm --env-file .env carta-respaldo`
- **Horario:** en Railway, un servicio con *cron schedule* `0 4 * * *` sobre esta imagen (`deploy/railway/README.md`); en la VM, la línea de cron del host que instala `deploy/vps/cloud-init.yml`.
- **Restaurar:** `age -d -i llave.txt archivo.dump.age | pg_restore -d <base>`, con el `pg_restore` de **esta misma imagen** (un `pg_restore` más viejo no lee un volcado de 18); `scripts/restaurar.sh` y la prueba mensual llegan con T-4.3 (04_Fases_y_Tareas §8).
