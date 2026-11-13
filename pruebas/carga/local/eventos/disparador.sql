-- PROTOTIPO DESECHABLE (medición de eventos frente a sondeo, 13 de noviembre de 2026).
-- Sólo para la base LOCAL de desarrollo; nunca como migración ni en staging o producción.
-- Avisa por `NOTIFY` a cada worker cuando cambia algo de una mesa. El aviso lleva sólo el id de
-- la sesión (canal de la mesa) o del restaurante (canal del personal): nunca datos.
-- PostgreSQL entrega la notificación al confirmar la transacción y pliega las repetidas
-- dentro de la misma transacción (mismo canal y mismo texto).
-- Quitar con quitar_disparador.sql.

create or replace function proto_avisar_mesa() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare
  fila record := coalesce(new, old);
begin
  if tg_table_name = 'sesion_grupal' then
    perform pg_notify('carta_mesa', fila.id::text);
    perform pg_notify('carta_restaurante', fila.restaurante_id::text);
  else
    perform pg_notify('carta_mesa', fila.sesion_id::text);
    if tg_table_name in ('comanda', 'llamada_mesero') then
      perform pg_notify('carta_restaurante', fila.restaurante_id::text);
    end if;
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['sesion_grupal', 'miembro_sesion', 'orden_personal', 'comanda', 'llamada_mesero'] loop
    execute format('drop trigger if exists proto_avisar on %I', t);
    execute format('create trigger proto_avisar after insert or update on %I
                    for each row execute function proto_avisar_mesa()', t);
  end loop;
end $$;
