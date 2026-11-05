-- Usuarios de base de datos de Carta (docs/plan/03_Datos_v1.md §6).
-- Se corre UNA vez por servidor, como superusuario, conectado a la base de la aplicación.
-- Las contraseñas llegan por variables de psql; nunca se escriben aquí (regla dura 12):
--
--   psql "$DATABASE_URL_ADMIN" \
--     -v pw_migrador="$PG_PASSWORD_MIGRADOR" \
--     -v pw_app="$PG_PASSWORD_APP" \
--     -v pw_lector="$PG_PASSWORD_LECTOR" \
--     -f scripts/usuarios_bd.sql
--
-- Después, el despliegue corre `alembic upgrade head` como carta_migrador (dueño del esquema),
-- la API se conecta como carta_app y los reportes como carta_lector.
-- Una inyección SQL con carta_app puede leer o alterar filas, pero no destruir el esquema.

\set ON_ERROR_STOP on

-- Roles (globales al servidor; idempotente).
SELECT format('CREATE ROLE carta_migrador LOGIN PASSWORD %L', :'pw_migrador')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carta_migrador') \gexec
SELECT format('CREATE ROLE carta_app LOGIN PASSWORD %L', :'pw_app')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carta_app') \gexec
SELECT format('CREATE ROLE carta_lector LOGIN PASSWORD %L', :'pw_lector')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carta_lector') \gexec

-- carta_migrador: dueño de la base y del esquema. Sólo lo usa el paso de migraciones.
SELECT format('ALTER DATABASE %I OWNER TO carta_migrador', current_database()) \gexec
ALTER SCHEMA public OWNER TO carta_migrador;

-- carta_app: la API. Sólo datos (SELECT, INSERT, UPDATE, DELETE); sin CREATE ni ALTER.
-- carta_lector: reportes. Sólo SELECT.
SELECT format('GRANT CONNECT ON DATABASE %I TO carta_app, carta_lector', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO carta_app, carta_lector;
REVOKE CREATE ON SCHEMA public FROM carta_app, carta_lector, PUBLIC;

-- Sobre lo que ya existe (si el script se corre después de las migraciones)...
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO carta_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carta_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO carta_lector;

-- ...y sobre lo que carta_migrador cree en futuras migraciones.
ALTER DEFAULT PRIVILEGES FOR ROLE carta_migrador IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO carta_app;
ALTER DEFAULT PRIVILEGES FOR ROLE carta_migrador IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO carta_app;
ALTER DEFAULT PRIVILEGES FOR ROLE carta_migrador IN SCHEMA public
    GRANT SELECT ON TABLES TO carta_lector;
