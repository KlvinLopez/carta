# Respaldo de la base (`deploy/respaldo/`)

Imagen Alpine con `pg_dump` 16, `age` y `rclone`. Un arranque = un respaldo: `pg_dump -Fc` → cifrado con la llave **pública** de `age` → `respaldos/<ENTORNO>/<fecha>.dump.age` en el bucket privado de R2 → poda de lo que pase de `RESPALDO_DIAS` (30). Sale con código ≠ 0 si algo falla; corre como usuario sin privilegios.

- **Construir:** `docker build -t carta-respaldo deploy/respaldo`
- **Variables:** `DATABASE_URL`, `RESPALDO_CLAVE_AGE` (`age-keygen` una vez; la privada va al gestor de contraseñas, nunca al servidor), `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PRIVADO`, `ENTORNO`, `RESPALDO_DIAS`.
- **Probar a mano:** `docker run --rm --env-file .env carta-respaldo`
- **Horario:** en Railway, un servicio con *cron schedule* `0 4 * * *` sobre esta imagen (`deploy/railway/README.md`); en la VM, la línea de cron del host que instala `deploy/vps/cloud-init.yml`.
- **Restaurar:** `age -d -i llave.txt archivo.dump.age | pg_restore -d <base>`; `scripts/restaurar.sh` y la prueba mensual llegan con T-4.3 (04_Fases_y_Tareas §8).
