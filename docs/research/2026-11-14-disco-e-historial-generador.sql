-- Generador de datos para medir el disco de la base de Carta (2026-11-14).
-- Uso (base vacía con las migraciones aplicadas, p. ej. carta_medicion):
--   psql ... -v nrest=30 -v visitas_mes=1800 -v meses=1 -v ppm=2.6 -v items=2.5 \
--            -v eventos=10 -v platillos=45 -f este_archivo.sql
-- Todo con generate_series y random() con semilla fija: reproducible. Los textos tienen el largo
-- de los reales (nombre de platillo 20-30 caracteres, descripción 60-120, alias 6-10).
-- Una «visita» es una sesion_grupal cerrada (la unidad que usan el simulador y los informes).
SELECT setseed(0.20261114);

-- restaurantes ------------------------------------------------------------------------------
INSERT INTO restaurante (id, nombre, slug, direccion, telefono, email, logo_url, tema, plan, horarios, activo)
SELECT gen_random_uuid(), 'Restaurante ' || i, 'rest-' || i || '-' || substr(md5(random()::text), 1, 6),
       'Calle Ejemplo ' || i || ', Col. Centro, Ciudad de México', '5512345678', 'dueno' || i || '@ejemplo.mx',
       'https://ejemplo.r2.dev/logos/' || md5(i::text) || '.webp', 'vino', 'gratis',
       '{"lun":["09:00","21:00"],"mar":["09:00","21:00"],"mie":["09:00","21:00"],"jue":["09:00","21:00"],"vie":["09:00","23:00"],"sab":["09:00","23:00"],"dom":["09:00","18:00"]}'::jsonb, true
FROM generate_series(1, :nrest) i;

-- categorías (6 por restaurante), mesas (12), personal (4), operador ----------------------------
INSERT INTO categoria_menu (restaurante_id, nombre, orden)
SELECT r.id, (ARRAY['Entradas','Platos fuertes','Postres','Bebidas','Desayunos','Antojitos'])[c], c
FROM restaurante r, generate_series(1,6) c;

INSERT INTO mesa (restaurante_id, numero, codigo_publico, capacidad)
SELECT r.id, m, substr(translate(encode(decode(md5(random()::text),'hex'), 'base64'), '+/=', '-_'), 1, 22), 4
FROM restaurante r, generate_series(1,12) m;

INSERT INTO personal_restaurante (restaurante_id, nombre, rol, pin_hash)
SELECT r.id, 'Persona ' || p, CASE WHEN p = 1 THEN 'capitan'::rol_personal ELSE 'mesero'::rol_personal END,
       '$argon2id$v=19$m=65536,t=3,p=4$' || substr(md5(random()::text) || md5(random()::text), 1, 22) || '$' || substr(md5(random()::text) || md5(random()::text), 1, 43)
FROM restaurante r, generate_series(1,4) p;

INSERT INTO usuario (firebase_uid, provider, nombre_display)
SELECT 'fb' || md5(r.id::text), 'google', 'Dueño ' || substr(r.slug, 1, 8) FROM restaurante r;
INSERT INTO operador_restaurante (usuario_id, restaurante_id, rol)
SELECT u.id, r.id, 'propietario' FROM restaurante r JOIN usuario u ON u.firebase_uid = 'fb' || md5(r.id::text);

-- platillos ----------------------------------------------------------------------------------
INSERT INTO platillo (restaurante_id, categoria_id, nombre, descripcion, precio, foto_url, foto_thumb_url,
                      foto_detalle_url, foto_original_url, imagen_tipo, alergenos, etiquetas, calorias, orden)
SELECT c.restaurante_id, c.id,
       'Platillo ' || substr(md5(random()::text), 1, 14) || ' especial',
       'Descripción de ejemplo con el largo de una real: ingredientes, preparación y acompañamiento ' || md5(random()::text),
       (50 + random() * 250)::numeric(10,2),
       'https://ejemplo.r2.dev/r/' || c.restaurante_id || '/' || md5(random()::text) || '.webp',
       'https://ejemplo.r2.dev/r/' || c.restaurante_id || '/' || md5(random()::text) || '-t.webp',
       'https://ejemplo.r2.dev/r/' || c.restaurante_id || '/' || md5(random()::text) || '-d.webp',
       'https://ejemplo.r2.dev/r/' || c.restaurante_id || '/' || md5(random()::text) || '-o.jpg',
       'foto', '["gluten","lacteos"]'::jsonb, '["popular","picante"]'::jsonb, 450, p
FROM categoria_menu c, generate_series(1, ceil(:platillos / 6.0)::int) p;

-- una importación por restaurante: el JSON del borrador --------------------------------------
INSERT INTO importacion_menu (restaurante_id, solicitado_por, archivo_url, archivo_tipo, paginas, estado, modelo,
                              resultado, tokens_entrada, tokens_salida, intentos, iniciado_en, finalizado_en, confirmado_en)
SELECT r.id, o.usuario_id, 'https://ejemplo.r2.dev/pdf/' || md5(r.id::text) || '.pdf', 'application/pdf', 6,
       'confirmado', 'claude-ejemplo',
       jsonb_build_object('categorias', (SELECT jsonb_agg(jsonb_build_object('nombre', cm.nombre,
          'platillos', (SELECT jsonb_agg(jsonb_build_object('nombre', p.nombre, 'descripcion', p.descripcion, 'precio', p.precio))
                        FROM platillo p WHERE p.categoria_id = cm.id))) FROM categoria_menu cm WHERE cm.restaurante_id = r.id)),
       9000, 4000, 1, now(), now(), now()
FROM restaurante r JOIN operador_restaurante o ON o.restaurante_id = r.id;

-- visitas: una sesion_grupal cerrada por visita --------------------------------------------------
CREATE TEMP TABLE _v0 AS
SELECT gen_random_uuid() AS sid, r.id AS rid,
       1 + floor(random() * 12)::int AS nm, 1 + floor(random() * 4)::int AS np,
       now() - (random() * :meses * interval '30 days') AS t0,
       greatest(1, round(:ppm + (random() - 0.5) * 2))::int AS nmiembros,
       (random() < 0.3) AS dos_comandas
FROM restaurante r, generate_series(1, (:visitas_mes * :meses)::int) g;
CREATE TEMP TABLE _v AS
SELECT v0.sid, v0.rid, m.id AS mid, p.id AS pid, v0.t0, v0.nmiembros, v0.dos_comandas
FROM _v0 v0
JOIN mesa m ON m.restaurante_id = v0.rid AND m.numero = v0.nm
JOIN personal_restaurante p ON p.restaurante_id = v0.rid AND p.nombre = 'Persona ' || v0.np;

INSERT INTO sesion_grupal (id, mesa_id, restaurante_id, estado, inicio, fin, ultima_actividad_en, cerrada_por_personal_id)
SELECT sid, mid, rid, 'cerrada', t0, t0 + interval '50 minutes', t0 + interval '48 minutes', pid FROM _v;

CREATE TEMP TABLE _m AS
SELECT gen_random_uuid() AS mbid, v.sid, v.rid, v.t0, k, v.dos_comandas
FROM _v v, LATERAL generate_series(1, v.nmiembros) k;
INSERT INTO miembro_sesion (id, sesion_id, rol, estado, alias, color_avatar, unido_en)
SELECT mbid, sid, CASE WHEN k = 1 THEN 'host' ELSE 'miembro' END, 'desconectado',
       'Comensal' || (1 + (random()*98)::int), '#' || substr(md5(random()::text), 1, 6), t0 + interval '2 minutes' FROM _m;

CREATE TEMP TABLE _o AS SELECT gen_random_uuid() AS oid, m.* FROM _m m;
INSERT INTO orden_personal (id, sesion_id, miembro_id, estado, total, bloqueada, creada_en, confirmada_en)
SELECT oid, sid, mbid, 'cerrada', (:items * 90)::numeric(10,2), true, t0 + interval '5 minutes', t0 + interval '15 minutes' FROM _o;

-- ids de platillo por restaurante, para elegir rápido
CREATE TEMP TABLE _pl AS
SELECT restaurante_id AS rid, array_agg(id) AS ids FROM platillo GROUP BY restaurante_id;
-- el trigger INV-3 impide ítems en órdenes ya cerradas: se apaga sólo durante la carga
ALTER TABLE item_orden DISABLE TRIGGER tr_item_orden_inmutable;
INSERT INTO item_orden (orden_id, platillo_id, cantidad, notas, precio_unitario, subtotal)
SELECT o.oid, pl.ids[1 + (random() * (cardinality(pl.ids) - 1))::int],
       1 + (random() < 0.2)::int,
       CASE WHEN random() < 0.2 THEN 'sin cebolla, salsa aparte, por favor' END,
       120.00, 120.00
FROM _o o JOIN _pl pl ON pl.rid = o.rid,
     LATERAL generate_series(1, greatest(1, round(:items + (random()-0.5)*2))::int) i;

ALTER TABLE item_orden ENABLE TRIGGER tr_item_orden_inmutable;

-- comandas: 1 por visita, 2 en el 30 % (las órdenes se reparten por paridad del miembro) -----------
CREATE TEMP TABLE _c AS
SELECT gen_random_uuid() AS cid, v.sid, v.rid, v.mid, v.pid, v.t0, s AS sec
FROM _v v, LATERAL generate_series(1, CASE WHEN v.dos_comandas THEN 2 ELSE 1 END) s;
INSERT INTO comanda (id, restaurante_id, mesa_id, sesion_id, secuencia, estado, total_estimado, num_comensales,
                     creada_en, atendida_en, servida_en, atendida_por_personal_id)
SELECT cid, rid, mid, sid, sec, 'servida', 300, 3, t0 + interval '15 minutes', t0 + interval '17 minutes',
       t0 + interval '30 minutes', pid FROM _c;
INSERT INTO comanda_orden (comanda_id, orden_id)
SELECT c.cid, o.oid FROM _o o JOIN _c c ON c.sid = o.sid AND c.sec = CASE WHEN o.dos_comandas THEN 1 + (o.k % 2) ELSE 1 END;

INSERT INTO llamada_mesero (restaurante_id, mesa_id, sesion_id, motivo, atendida_en, atendida_por_personal_id, creada_en)
SELECT rid, mid, sid, 'atencion', t0 + interval '20 minutes', pid, t0 + interval '19 minutes' FROM _v WHERE random() < 0.3;

-- analítica: :eventos por visita ----------------------------------------------------------------
INSERT INTO evento_analitica (restaurante_id, mesa_id, sesion_id, miembro_id, platillo_id, tipo, propiedades,
                              ip_hash, user_agent_fam, ocurrido_en)
SELECT v.rid, v.mid, v.sid, NULL, NULL,
       (ARRAY['scan','menu_view','menu_view','dish_view','dish_view','dish_view','dish_view','search','filter','item_add'])[1 + (e % 10)],
       CASE WHEN e % 10 IN (7, 8) THEN '{"resultados":4}'::jsonb ELSE '{}'::jsonb END,
       md5(v.sid::text) || md5(v.rid::text), 'Chrome Mobile', v.t0 + (e * interval '20 seconds')
FROM _v v, LATERAL generate_series(0, (:eventos - 1)::int) e;
