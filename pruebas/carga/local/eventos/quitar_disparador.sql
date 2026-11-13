-- Deshace disparador.sql en la base LOCAL.
do $$
declare t text;
begin
  foreach t in array array['sesion_grupal', 'miembro_sesion', 'orden_personal', 'comanda', 'llamada_mesero'] loop
    execute format('drop trigger if exists proto_avisar on %I', t);
  end loop;
end $$;
drop function if exists proto_avisar_mesa();
