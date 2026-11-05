-- Lo ejecuta el contenedor de PostgreSQL de docker-compose.yml la primera vez que arranca
-- (docker-entrypoint-initdb.d). Crea la base de pruebas junto a la de desarrollo (carta_db).
CREATE DATABASE carta_test OWNER carta;
