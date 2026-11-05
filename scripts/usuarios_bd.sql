-- Usuarios de base de datos de Carta (docs/plan/03_Datos_v1.md §6).
-- Se corre como superusuario, conectado a la base de la aplicación, con psql >= 15.
-- Es idempotente y se corre DOS veces en un servidor nuevo:
--   1. antes de la primera migración: crea los roles y hace a carta_migrador dueño de la base;
--   2. después de `alembic upgrade head`: aplica los permisos por tabla y por columna.
-- Las contraseñas llegan por variables de entorno (nunca por -v, que queda en `ps` y en el
-- historial; nunca en este archivo, regla dura 12):
--
--   PG_PASSWORD_MIGRADOR=... PG_PASSWORD_APP=... PG_PASSWORD_LECTOR=... \
--     psql "$DATABASE_URL_ADMIN" -f scripts/usuarios_bd.sql
--
-- Después, el despliegue corre `alembic upgrade head` como carta_migrador (dueño del esquema),
-- la API se conecta como carta_app y los reportes como carta_lector.
-- Una inyección SQL con carta_app puede leer o alterar filas, pero no destruir el esquema.

\set ON_ERROR_STOP on
\getenv pw_migrador PG_PASSWORD_MIGRADOR
\getenv pw_app PG_PASSWORD_APP
\getenv pw_lector PG_PASSWORD_LECTOR

-- Que `CREATE ROLE ... PASSWORD` no acabe en el log del servidor.
SET log_statement = 'none';
SET log_min_error_statement = 'panic';

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
-- carta_lector: reportes. Sólo SELECT, y sin las columnas sensibles (abajo).
SELECT format('GRANT CONNECT ON DATABASE %I TO carta_app, carta_lector', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO carta_app, carta_lector;
REVOKE CREATE ON SCHEMA public FROM carta_app, carta_lector, PUBLIC;

-- Sobre lo que ya existe...
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

-- Excepciones por tabla (sólo si la migración ya corrió; si no, las aplica la segunda pasada):
-- - carta_app no toca el historial de migraciones;
-- - carta_lector no lee hashes de PIN, identificadores de Firebase ni hashes de IP.
DO $$
BEGIN
    IF to_regclass('public.alembic_version') IS NOT NULL THEN
        REVOKE ALL ON public.alembic_version FROM carta_app, carta_lector;
    END IF;
    IF to_regclass('public.personal_restaurante') IS NOT NULL THEN
        REVOKE SELECT ON public.personal_restaurante FROM carta_lector;
        GRANT SELECT (id, restaurante_id, nombre, rol, activo, intentos_fallidos, bloqueado_hasta,
                      ultimo_acceso_en, creado_en, actualizado_en)
            ON public.personal_restaurante TO carta_lector;
    END IF;
    IF to_regclass('public.usuario') IS NOT NULL THEN
        REVOKE SELECT ON public.usuario FROM carta_lector;
        GRANT SELECT (id, provider, nombre_display, plan, creado_en, ultimo_login)
            ON public.usuario TO carta_lector;
    END IF;
    IF to_regclass('public.evento_analitica') IS NOT NULL THEN
        REVOKE SELECT ON public.evento_analitica FROM carta_lector;
        GRANT SELECT (id, restaurante_id, mesa_id, sesion_id, miembro_id, platillo_id, tipo,
                      propiedades, user_agent_fam, ocurrido_en)
            ON public.evento_analitica TO carta_lector;
    END IF;
END $$;
