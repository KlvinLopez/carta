"""Genera 2026-11-14-parametros.json (parámetros del modelo, con origen, rango y si mueven el resultado).
Uso: python3 -I 2026-11-14-parametros-generador.py  (requiere 2026-11-14-segmentacion-datos.json y 2026-11-14-recursos-medicion.json en la misma carpeta)."""
import os
AQUI = os.path.dirname(os.path.abspath(__file__))
import json
P = {}
def p(k, v, mn=None, mx=None, origen="supuesto", fuente="", nota="", mueve=True):
    P[k] = dict(valor=v, min=mn, max=mx, origen=origen, fuente=fuente, nota=nota, mueve_resultado=mueve)

# --- mercado (INEGI DENUE 05/2026) ---
p("tam_negocios", 773860, origen="medido", fuente="DENUE 05/2026, rama 7225 + 7224 (mercado-de-carta §2.1)", nota="mercado total (TAM): todo lo que prepara alimentos y bebidas; informativo, no mueve el cálculo", mueve=False)
p("sam_clientes_potenciales", 104882, origen="medido", fuente="DENUE 05/2026, clases 722511 + 722412 + 722411 (mercado-de-carta §2.1)", nota="antes «núcleo» o «servible»; informativo, no mueve el cálculo", mueve=False)
# --- generales ---
p("fx", 18.6188, origen="documento", fuente="FIX de Banxico 12-nov-2026 (planes-y-costo §3.5)")
p("iva", 0.16, origen="documento", fuente="tasa general")
# --- costos ---
p("costo_var_gratuito", 1.0, 0.5, 2.0, "documento", "planes-y-costo §0 (chico)", "pesos por restaurante al mes; sólo para el piso y gratuitos_que_sostiene_..._solo_variable (el servidor ya cubre el costo por carga)", mueve=False)
p("costo_var_servicio", 1.9, 1.0, 4.0, "documento", "planes-y-costo §0 (mediano)", "sólo para el piso del corredor", mueve=False)
p("costo_var_salon", 7.5, 4.0, 15.0, "documento", "planes-y-costo §0 (grande)", "sólo para el piso del corredor", mueve=False)
p("base_fija_por_restaurante", 3.0, 2.6, 10.0, "documento", "planes-y-costo §0: 10 con 100, 3 con 500, 2.6 con 1,000", "sólo para el piso del corredor", mueve=False)
p("comision_pct", 0.036, origen="documento", fuente="planes-y-costo §7.2 (Stripe 3.6 % + 3 pesos, más IVA)", nota="se cobra sobre lo que paga el cliente, con IVA")
p("comision_fija", 3.0, origen="documento", fuente="planes-y-costo §7.2")
p("pago_con_tarjeta", 1.0, 0.0, 1.0, "supuesto", "", "fracción que paga con tarjeta; el resto, transferencia sin comisión")
p("soporte_servicio", 60.0, 30.0, 150.0, "supuesto", "", "pesos al mes por cliente de paga: 30 min a 120 la hora; se mide con tickets del piloto")
p("soporte_salon", 120.0, 60.0, 300.0, "supuesto", "", "pesos al mes; el doble de Servicio")
p("dominio_usd_anio", 25.0, origen="documento", fuente="dato de Calvin 13-nov (mapa-de-procesos)")
p("volumen_usd_gb_mes", 0.15, origen="fuente", fuente="docs.railway.com/reference/pricing/plans, 13-nov-2026")
p("r2_usd_gb_mes", 0.015, origen="fuente", fuente="developers.cloudflare.com/r2/pricing, leída 14-nov-2026")
p("r2_gratis_gb", 10.0, origen="fuente", fuente="idem")
p("r2_gb_gratuito", 0.05, 0.02, 0.24, "documento", "mapa-de-procesos §5: 7.5 GB con 148 gratuitos típicos")
p("r2_gb_servicio", 0.12, 0.06, 0.9, "documento", "mapa-de-procesos §5: 6.6 GB con 55 de paga típicos")
p("r2_gb_salon", 0.5, 0.2, 2.1, "supuesto", "mapa-de-procesos §5 (0.91 a 2.10 GB con el tope de platillos)")
p("ltv", None, origen="sin dato", mueve=False, nota="valor de un cliente en el tiempo: ingreso mensual de paga × meses que se queda; se mide con la permanencia del piloto")
# --- disco: medido el 14-nov-2026 (disco-e-historial) ---
perf = {"chico": (6.23, 6.59, 0.138), "mediano": (6.88, 6.63, 0.174), "grande": (19.08, 16.22, 0.206), "formal": (7.18, 5.56, 0.199)}
p("disco_perfiles", {k: dict(mb_mes_visitas=a, mb_mes_eventos=b, mb_fijo=c) for k, (a, b, c) in perf.items()}, origen="medido",
  fuente="2026-11-14-disco-e-historial-datos.json (PostgreSQL 16.15, migraciones 0001-0003, datos generados)",
  nota="MB por restaurante: visitas = 7 tablas de la mesa; eventos = analítica con 10 eventos por visita (supuesto); fijo = restaurante, platillos, mesas, personal")
p("mezcla_gratuito", {"chico": .6, "mediano": .25, "grande": .05, "formal": .10}, origen="documento", fuente="simulador-de-uso MEZCLAS")
p("mezcla_paga", {"mediano": .5, "grande": .25, "formal": .25}, origen="documento", fuente="simulador-de-uso MEZCLAS")
p("base_vacia_mb", 7.586319, origen="medido", fuente="pg_database_size de la base migrada y vacía")
p("reserva_disco", 0.2, 0.0, 0.3, "supuesto", "", "WAL, hinchazón y catálogo; se mide con pg_ls_waldir() y pgstattuple en producción")
p("disco_gratuito_tipico_mb_publicado", 16.7, origen="documento", fuente="mapa-de-procesos: 0.0167 GB por gratuito típico (12 KB por visita, estimada)", nota="sólo para reproducir las cifras publicadas (299)")
p("disco_paga_tipico_mb_publicado", 285.0, origen="documento", fuente="mapa-de-procesos: 0.285 GB por paga típico con 12 meses", nota="sólo para reproducir las cifras publicadas (17)")
# --- capacidad (mapa-de-procesos y anuncios-y-capa-del-comensal) ---
esc = [
 dict(id="hobby_sondeo", nombre="Hoy: sondeo, 2 procesos, Hobby", cap_cpu=148, volumen_gb=5, base_usd=8.1, tope_usd=20, carga_ref=148),
 dict(id="hobby_eventos", nombre="Con eventos, 2 procesos, Hobby", cap_cpu=1064, volumen_gb=5, base_usd=8.1, tope_usd=12, carga_ref=299),
 dict(id="pro_2", nombre="Con eventos, 2 procesos, Pro", cap_cpu=1064, volumen_gb=50, base_usd=20, tope_usd=30, carga_ref=1064),
 dict(id="pro_4", nombre="Con eventos, 4 procesos, Pro", cap_cpu=1896, volumen_gb=50, base_usd=23, tope_usd=44, carga_ref=1896),
 dict(id="pro_8", nombre="Con eventos, 8 procesos, Pro", cap_cpu=2116, volumen_gb=50, base_usd=30, tope_usd=54, carga_ref=2116),
]
p("escalones", esc, origen="documento", fuente="anuncios-y-capa-del-comensal §0 y mapa-de-procesos §3; base_usd: Hobby 8.1 (factura real) y Pro 20 + 1.7 por proceso de memoria (supuesto: interpolación lineal entre piso y costo al tope)",
  nota="cap_cpu = gratuitos típicos que caben por procesador (p95 de 364 días, CPU a 70 %); el muro de 10,000 conexiones abiertas de Railway sube a 2,116 con 8 procesos y ya no sube con réplicas")
p("cap_conexiones", 2116, origen="documento", fuente="anuncios-y-capa-del-comensal: 10,000 conexiones abiertas de Railway")
p("peso_servicio_cpu", 2.3, 1.5, 3.0, "documento", "anuncios-y-capa-del-comensal: un restaurante de paga pesa 2.3 gratuitos típicos con eventos")
p("peso_salon_cpu", 6.0, 3.0, 10.0, "supuesto", "mapa-de-procesos: un paga al tope (40 × 12) pesa 8 gratuitos al tope; aquí 6 gratuitos típicos")
p("instancia_extra_usd", 54.0, 30.0, 90.0, "supuesto", "anuncios-y-capa-del-comensal: réplicas 66 y 92 USD; arriba de 2,116 hay que repetir toda la pila", "costo de cada instancia adicional de 8 procesos")
# --- quién rebasa los topes (modelo, no estadística, salvo platillos) ---
p("empuja_platillos", [[40, .527], [60, .243], [80, .108], [100, .041], [150, .02], [300, .01]], origen="medido (muestra con sesgo)", fuente="2026-11-14-cobertura-platillos.csv: 148 cartas, 147 de reparto (sesgo hacia cartas de reparto, que subestiman a los formales)", nota="40 a 120 medidos; 150 y 300 son extrapolación (supuesto)")
# --- cuánto pagan los que rebasan (curvas) ---
p("curvas_pago", {
    "pesimista": dict(mediana=157, sigma=0.5, techo=0.15, nota="paga lo que el plan de menú QR más barato (Neolo 157); sólo 15 % de los que rebasan llega a pagar"),
    "media": dict(mediana=225, sigma=0.6, techo=0.35, nota="paga lo que Meniu Business (225), el competidor principal según Calvin; 35 % de los que rebasan llega a pagar"),
    "optimista": dict(mediana=652, sigma=0.6, techo=0.60, nota="paga lo que el sustituto con POS más barato (Fudo Avanzado 652); 60 % llega a pagar")},
  origen="supuesto", fuente="precios de planes comparables (comparativo del 13-nov y matriz del 14-nov) como aproximación de lo que el mercado ya paga",
  nota="Rangos: mediana ±50 %, sigma 0.3 a 0.9, techo 0.05 a 0.8. P(paga) = techo × P(W ≥ precio), W lognormal con esa mediana y σ. NO hay dato de disposición a pagar: la sustituye la prueba del piloto (Van Westendorp y escalera)")
# --- anuncios ---
p("anuncio_pesos_por_mil", {"baja": 3.5, "media": 14.0, "alta": 37.0}, origen="supuesto", fuente="anuncios-y-capa-del-comensal §2: 0.19 / 0.75 / 1.97 USD por mil visitas, cadena de tres eslabones de fiabilidad baja", nota="pesos por mil visitas con la app, anuncios no personalizados")
p("visitas_app_gratuito", 2050, 800, 3500, "supuesto", "salida del simulador de uso (113.9 comensales al día × 30 × 0.6 que abre la app); el 0.6 y el 113.9 son supuestos del simulador", "se mide con eventos scan del piloto")
p("visitas_app_servicio", 3429, 1500, 6000, "supuesto", "salida del simulador de uso (típico de paga)", "no mueve el resultado: la paga no lleva anuncios", mueve=False)
# --- adopción y comensales ---
p("meta_12_meses", 300, 50, 3000, "supuesto", "", "restaurantes registrados a los 12 meses (SOM, escenario); se fija con el plan comercial")
p("meta_24_meses", 1200, 200, 10000, "supuesto", "", "restaurantes registrados a los 24 meses")
p("comensales_dia_gratuito", 113.9, 40, 250, "supuesto", "salida del simulador de uso (perfiles supuestos con mesas y visitas)", "sólo para contar comensales en la proyección")
p("comensales_dia_servicio", 190.5, 80, 600, "supuesto", "salida del simulador de uso", "sólo para contar comensales en la proyección")
# --- sustitutos para sugerir precio ---
p("sustitutos", {"Meniu Business": 225, "Fudo Avanzado": 652, "Fudo Avanzado + módulo de mesas": 745, "Last.app Starter": 1000, "Poster Business": 819, "Fudo Avanzado + cocina": 838},
  origen="fuente", fuente="matriz de funciones 2026-11-14 (IVA no declarado salvo Last.app: + IVA)")

# --- agregados en la ronda de revisión del modelo (14-nov) ---
p("soporte_gratuito", 0.5, 0.0, 3.0, "supuesto", "supuesto de trabajo: 15 segundos de atención al mes por cliente gratuito a 120 pesos la hora", "pesos al mes por cliente gratuito (SUPUESTO sin fuente: 15 s al mes); rango 0–3 (el efecto en la bolsa y en los umbrales sale de `rangoBolsa` y `rangoSePagaSolo`, no de este texto); con 1 peso el peor caso con anuncios a 100 restaurantes pierde casi todo su margen")
p("churn_mensual", 0.03, 0.01, 0.08, "supuesto", "sin dato: supuesto de trabajo", "parte de los clientes de paga que se da de baja cada mes; se mide con la permanencia del piloto")
p("cac", 600.0, 0.0, 3000.0, "supuesto", "sin dato: supuesto de trabajo (≈ 5 horas de ventas y alta a 120 pesos la hora)", "costo de conseguir un cliente de paga, en pesos")
p("sueldos_mes", 0.0, 0.0, 60000.0, "supuesto", "no incluidos hoy", "sueldos del equipo (pesos al mes); 0 = el margen es antes de sueldos")
p("impuestos_tasa", 0.0, 0.0, 0.30, "supuesto", "no incluidos hoy", "tasa sobre el margen positivo; 0 = antes de impuestos")

# --- segmentación de Calvin (14-nov, tercera vuelta) ---
import json as _j
_seg = _j.load(open(__import__("os").path.join(AQUI, "2026-11-14-segmentacion-datos.json")))
p("segmentacion_negocios", {"Chef": 91048, "Master Chef": 13614, "Chef Ejecutivo": 220}, origen="medido", fuente="DENUE 05/2026 por estrato de personal (mercado-de-carta §2.1): Chef = 0–5 y 6–10 personas; Master Chef = 11–30, 31–50 y 51–100; Chef Ejecutivo = 101–250 y 251 o más", nota="86.8 % / 13.0 % / 0.2 % de los 104,882 clientes potenciales; Carta no sabe cuánta gente trabaja en el negocio: lo traduce a topes", mueve=False)
p("empuja_conjunto", {"mesas": _seg["empuja_conjunto"]["mesas"], "cuentas": _seg["empuja_conjunto"]["cuentas"], "centro": _seg["empuja_conjunto"]["centro"], "minimo": _seg["empuja_conjunto"]["minimo"], "maximo": _seg["empuja_conjunto"]["maximo"]}, origen="supuesto", fuente="2026-11-14-segmentacion.py: modelo de mesas y cuentas de la estadística de cartas §4.2 (cuentas = ⌈f × personas⌉, f 0.35–0.50; mesas = cuentas × 2.5–4) aplicado a los estratos medidos del DENUE; la forma dentro de cada estrato es supuesto", nota="parte de los registrados que rebasa mesas o cuentas del tope (tabla de rejilla; intervalo mínimo–máximo sobre las 27 combinaciones del modelo: f, mesas por cuenta y dispersión)")
p("seguridad_chico", {"mesas": _seg["seguridad_chico_grid"]["mesas"], "cuentas": _seg["seguridad_chico_grid"]["cuentas"], "centro": _seg["seguridad_chico_grid"]["centro"], "minimo": _seg["seguridad_chico_grid"]["minimo"], "maximo": _seg["seguridad_chico_grid"]["maximo"]}, origen="supuesto", fuente="2026-11-14-segmentacion.py (mismo modelo)", nota="probabilidad de que un negocio de hasta 10 personas quede dentro de esos topes (gratis); centro (σ = 0.5) y peor rincón de las 27 combinaciones")
p("sigma_mesas_por_cuenta", 0.5, 0.0, 0.75, "supuesto", "2026-11-14-segmentacion.py: dispersión lognormal (en ln) de las mesas por cuenta de personal; 0 = la versión anterior, determinista", "mesas de un negocio = cuentas × m × exp(σ·z); SIN dato: el piloto debe medir mesas y cuentas por negocio (alta de los primeros 10 a 20 restaurantes: `mesa` y `personal_restaurante` activos por restaurante, sin datos personales)")
# --- dos planes (17-nov): qué parte de 0 a 5 y de 6 a 10 personas cabe en Chef ---
for _nom in ("estrato_0_5", "estrato_6_10"):
    _g = _seg[_nom + "_grid"]
    p("dentro_" + _nom[8:], {"mesas": _g["mesas"], "cuentas": _g["cuentas"], "centro": _g["centro"], "minimo": _g["minimo"], "maximo": _g["maximo"]}, origen="supuesto", fuente="2026-11-14-segmentacion.py (mismo modelo de mesas y cuentas con dispersión; sólo los conteos por estrato son medidos)", nota="parte de los negocios del estrato (0 a 5 o 6 a 10 personas) que cabe dentro de los topes de mesas y cuentas; centro y extremos de las 27 combinaciones del modelo", mueve=False)
p("restriccion_seguridad_chico", 0.95, 0.80, 0.99, "decisión de Calvin", "«la fonda familiar o la taquería de barrio tiene que ser gratis»", "con qué seguridad un negocio de hasta 10 personas debe quedar dentro del gratuito; los topes de Chef son consecuencia de este número, no un óptimo")
p("parte_salon", 0.004, 0.002, 0.01, "supuesto", "2026-11-14-segmentacion.py: parte de los registrados que rebasa 100 mesas o 30 cuentas (0.4 %, intervalo 0.3–0.7 %); por tamaño, 101 o más personas es 0.2 %", "parte de los registrados que es tamaño Chef Ejecutivo")
p("parte_visitas_con_anuncio", 0.6, 0.1, 1.0, "supuesto", "", "parte de las visitas con la app en que se SIRVE un anuncio que paga (incluye tasa de llenado y bloqueadores; no se modelan por separado). No es el mismo descuento que el 0.6 de `visitas_app_gratuito` (comensales que abren la app): son dos supuestos distintos que coinciden en el número; sin dato")
p("mes_inicio_anuncios", 9, 1, 24, "supuesto", "supuesto de trabajo: no antes de construirlos y de que la red apruebe el sitio", "mes en que empiezan los anuncios (el plan gratuito LLEVA anuncios, decidido por Calvin; lo que varía es cuándo llegan y cuánto dejan). Requisitos: ADR, abrir la política de seguridad del sitio (script-src 'self'), cambiar el aviso de privacidad y que la red apruebe el sitio (anuncios-y-capa-del-comensal §3.6-3.7). Mientras no empiezan, el costo lo pone Calvin")
p("bolsa_calvin_mes", 1000.0, 200.0, 5000.0, "supuesto", "dato de Calvin: «tal vez ahorita lo costeo de mis recursos»; la cifra es supuesto", "pesos al mes que Calvin está dispuesto a poner mientras no hay anuncios")
p("curvas_pago_salon", {
    "pesimista": dict(mediana=700, sigma=0.5, techo=0.15, nota="paga lo de un POS básico (Soft Restaurant 799, Fudo Pro 838)"),
    "media": dict(mediana=1100, sigma=0.5, techo=0.35, nota="paga lo de OlaClick Elite (1,099) y Last.app Starter (1,000): un negocio de 51 a 250 personas vende ≈ 3.3 millones al mes [INEGI]"),
    "optimista": dict(mediana=2000, sigma=0.5, techo=0.60, nota="paga lo de Last.app Growth a Unlimited (1,700–2,900) o MenuTiger Premium (2,216)")},
  origen="supuesto", fuente="precios de planes de gama alta (matriz de funciones, 14-nov) como aproximación; a 101 o más personas un precio de 1,000 es 0.03 % del ingreso [INEGI]", nota="misma forma que curvas_pago; sin dato de disposición a pagar")
p("precios_candidatos", {"servicio": [199, 225, 249, 299], "salon": [799, 1099, 1599]}, origen="decisión de Calvin", fuente="«Master Chef pegado a Meniu Business (225)… Chef Ejecutivo hacia el extremo alto del mercado»", nota="precios a evaluar")
p("banderas", {"cpu": {"aviso": 50, "accion": 70}, "disco": {"aviso": 60, "accion": 80}, "conexiones": {"aviso": 60, "accion": 80}, "memoria": {"aviso": 70, "accion": 85}, "costo_por_restaurante": {"aviso": 8, "accion": 15}, "costos_sobre_ingresos": {"aviso": 70, "accion": 90}}, origen="supuesto", fuente="70 % del procesador es el tope de diseño [documento: capacidad §3]; los demás umbrales son supuestos de trabajo", nota="umbrales de aviso y de acción de las banderas de operación (porcentajes; el costo por restaurante en pesos al mes)")
p("n_referencia", 1000, 100, 10000, "supuesto", "", "restaurantes registrados con que se evalúa la configuración al optimizar")

# --- recursos y palancas (ronda 5): medido en local con 2026-11-14-recursos-medir.py ---
_m = _j.load(open(__import__("os").path.join(AQUI, "2026-11-14-recursos-medicion.json")))
_base = _m["base"]["total"]
_dia_bytes = _m["agregada_por_dia"]["total"] / _m["agregada_por_dia"]["filas"]
_mb_rest_mes_eventos = _base / _m["base"]["restaurantes"] / 1e6
_plat_copia = _m["platillos_en_la_copia"]
_f_dia = lambda plat: (31 * (5 + plat) * _dia_bytes / 1e6) / _mb_rest_mes_eventos
p("factores_disco_eventos", {
    "un_indice": round(_m["original_un_indice"]["total"] / _base, 4),
    "tipos_chicos": round(_m["compacta"]["total"] / _base, 4),
    "ambos": round(_m["compacta_un_indice"]["total"] / _base, 4),
    "agregada_por_dia_cota_alta": round(_f_dia(150), 4),
    "agregada_por_dia_con_platillos_de_la_copia": round(_f_dia(_plat_copia), 4),
    "platillos_cota": 150, "platillos_en_la_copia": _plat_copia,
    "retencion_7_dias": round(7 / 30, 4)},
  origen="medido", fuente="2026-11-14-recursos-medir.py: MEDIDO CON DATOS SINTÉTICOS sobre una copia de carta_med_mediano (10 restaurantes medianos, un mes, 10 eventos por visita [supuesto]) con miembro, platillo, ip_hash y navegador rellenados con valores variados; la agregada por día se calcula con %d bytes por fila y 31 días × (5 tipos + platillos): la cota usa los 150 platillos que permite el plan gratuito y 'con_platillos_de_la_copia' los %d de la copia" % (round(_dia_bytes), _plat_copia),
  nota="fracción de lo que ocupa hoy la analítica (tabla + índices) que quedaría con cada palanca; 1 = igual que hoy")
p("bytes_por_evento", {"hoy": round(_base / _m["base"]["filas"]), "heap": round(_m["base"]["heap"] / _m["base"]["filas"]), "indices": round(_m["base"]["indices"] / _m["base"]["filas"]), "columnas": _m["columnas_bytes_medios"], "indices_bytes_total": _m["indices_bytes"]}, origen="medido", fuente="2026-11-14-recursos-medicion.json (pg_column_size medio por columna; tamaño de cada índice)", mueve=False)
p("idempotencia_bytes_por_fila", round(_m["idempotencia"]["total"] / _m["idempotencia"]["filas"]), origen="medido", fuente="100,000 filas de clave_idempotencia con respuesta jsonb de ≈ %d bytes (con su índice de purga)" % round(_m["idempotencia"]["bytes_respuesta"]), nota="la tabla está vacía hasta la Fase 3 (hoy ningún servicio la usa)", mueve=False)
p("claves_idempotencia_por_visita", 3, 1, 8, "supuesto", "una por orden confirmada, una por comanda y una por llamada [supuesto]", "se mide al construir la Fase 3 (contar filas de clave_idempotencia por sesión)", mueve=False)
p("rss_worker_mb", 160, 120, 250, "medido", "modelo-de-capacidad: ≈ 160 MB por worker en reposo [medida aquí]", "memoria residente de un proceso de la API", mueve=False)
p("mb_por_linea_abierta", 0.023, 0.020, 0.026, "medido", "eventos-frente-a-sondeo: ≈ 20–26 KB por conexión abierta (RSS +98 MB con 5,000 y +258 MB con 10,000)", "memoria del proceso por teléfono conectado", mueve=False)
p("mb_por_restaurante_sondeo", 0.1, 0.02, 0.5, "supuesto", "cachés de menú y estado en memoria; sin dato", "memoria por restaurante registrado con el sondeo de hoy", mueve=False)
p("ram_max_servicio_mb", 48000, origen="fuente", fuente="docs.railway.com/reference/pricing/plans, leída el 14-nov-2026: Hobby 48 GB y 48 vCPU por servicio (con réplicas)", mueve=False)
p("workers_hoy", 2, origen="documento", fuente="modelo-de-capacidad §1: WORKERS=2", mueve=False)
p("db_pool_por_worker", 20, origen="documento", fuente="app/core/config.py: DB_POOL_SIZE 10 + DB_MAX_OVERFLOW 10", mueve=False)
p("pg_max_conexiones", 100, 100, 100, "supuesto", "Postgres de Railway ≈ 100 [estimada: falta `SHOW max_connections`, modelo-de-capacidad §5]", "conexiones máximas de la base", mueve=False)
p("ms_conexion_por_peticion", 3.0, 1.8, 3.5, "medido", "modelo-de-capacidad: 1.8–3.5 ms por petición (CPU), tiempo que una petición retiene su conexión [estimada: la retención real puede ser mayor]", "milisegundos que una petición usa una conexión de la base", mueve=False)
p("peticiones_por_segundo_tope_sondeo", 600, 420, 600, "medido", "modelo-de-capacidad §1: tope duro ≈ 600 peticiones/s con 2 workers (≈ 148 restaurantes registrados típicos)", "tope del procesador con el sondeo de hoy", mueve=False)
p("factor_estado_memoria_60s", 1.87, 1.0, 1.87, "medido", "eventos-frente-a-sondeo: 0.88 → 0.47 ms de CPU por comensal con estado en memoria 60 s invalidado por NOTIFY (÷ 0.47)", "cuánto sube el tope del procesador con esa palanca (sólo en el sondeo)", mueve=False)
p("factor_lineas_ociosas", 0.7, 0.5, 1.0, "supuesto", "sin dato: parte de las líneas abiertas que quedaría si se cierran a los 2 min de ociosidad; se mide contando líneas por restaurante", "palanca de líneas abiertas", mueve=False)
p("lineas_max_railway", 10000, origen="fuente", fuente="eventos-frente-a-sondeo: ≈ 10,000 conexiones abiertas simultáneas de Railway «subject to change»; no aclara si es por servicio o por dominio", mueve=False)
p("precios_railway_usd", {"ram_gb_mes": 10.0, "cpu_vcpu_mes": 20.0, "volumen_gb_mes": 0.15, "salida_gb": 0.05, "hobby_suscripcion": 5.0, "pro_suscripcion": 20.0}, origen="fuente", fuente="docs.railway.com/reference/pricing/plans, leída el 14-nov-2026", mueve=False)
p("historial_03_7", {"visitas_meses": 24, "analitica_meses": 13}, origen="documento", fuente="docs/plan/03_Datos_v1.md §7: analítica 13 meses, sesiones, órdenes y comandas 24 meses; NO distingue por plan; hoy nada lo limpia (planes-y-costo)", mueve=False)
p("factor_pico_simultaneo", 0.63, 0.5, 1.0, "supuesto", "cifra que la revisión de la sesión maestra calculó para el peor caso (148 → ≈ 93): no tiene origen en un documento del repositorio", "cuánto baja la capacidad de procesador si todos los restaurantes están en su hora pico a la vez", mueve=False)
p("incertidumbre_procesador", 2.0, 1.5, 2.5, "supuesto", "modelo-de-capacidad: ±2× hasta medir en Railway (600 peticiones/s medidas en local con 2 núcleos; rango 420–600; Hobby no dice cuántos núcleos entrega)", "factor ± sobre toda cifra que depende del procesador", mueve=False)
# --- cobertura del tope de platillos (ronda 7): DOS COTAS de sesgo opuesto, marcada como SUPUESTO ---
_cp = _j.load(open(__import__("os").path.join(AQUI, "2026-11-16-cobertura-platillos-datos.json")))
_alta = [[t, round(1 - f, 3)] for t, f in [(40, .527), (60, .243), (80, .108), (100, .041), (150, .02), (300, .01)]]
p("cobertura_platillos", {
    "alta": {"todo": _alta, "comida": _alta},
    "baja": {"todo": [[x["tope"], x["cobertura"]] for x in _cp["total"]], "comida": [[x["tope"], x["cobertura"]] for x in _cp["comida"]]},
    "n_baja": _cp["n"], "por_tipo_baja": _cp["por_tipo"], "maximo_comida_baja": _cp["maximo_comida"], "maximo_total_baja": _cp["maximo_total"]},
  origen="supuesto", fuente="ALTA: 148 cartas de plataformas de reparto (sesgo hacia cartas CORTAS y sin bebidas); sólo 40 a 120 están medidos, 150 y 300 son extrapolación. BAJA: 56 cartas completas de sitios propios (sesgo hacia cartas LARGAS y negocios formales; 2026-11-16-cobertura-platillos.py). Las dos muestras no cuentan «platillo» con la misma regla; NO se sabe cuál es la cobertura real",
  nota="porcentaje de negocios con carta ≤ tope; 'comida' = el tope cuenta sólo comida (bebidas sin tope); en la cota alta se usa la misma tabla (el reparto no trae bebidas)")
p("cota_platillos", "alta", origen="supuesto", fuente="cota que usan por omisión `seguridadChico` y `parteRebasa`; la otra cota se pide con `s.cota_platillos = 'baja'`", mueve=False)
# --- ronda 8: mensajes del modelo y ENDUTIH ---
p("punto_de_venta", [{"nombre": "Fudo Avanzado", "precio": 652}, {"nombre": "Fudo Pro", "precio": 838}, {"nombre": "Last.app Starter", "precio": 1000}], origen="fuente", fuente="2026-11-14-funciones-y-precios.csv (páginas de los proveedores leídas el 13 y 14 de noviembre de 2026; precios en pesos al mes, algunos más IVA)", nota="para negocios de 0 a 10 personas, que en su mayoría no tienen punto de venta, es «lo que costaría si lo contratara» (supuesto)", mueve=False)
p("inegi_11_50", {"ingreso_mes": 737584, "advertencia": "Promedio (total ÷ negocios), no mediana, de la clase 722511 (restaurantes con servicio completo) en los Censos Económicos 2024, año de referencia 2023: quedan fuera antojitos, tacos y cafeterías; un promedio lo jalan los grandes. Dato por conseguir: mediana y otras clases."}, origen="fuente", fuente="INEGI, Censos Económicos 2024 (SAIC), consultado el 14-nov-2026: docs/research/2026-11-14-lo-que-paga-un-restaurante.md", mueve=False)
p("endutih_2024", {"fecha_de_publicacion": "2025-05-06", "usuarios_internet_millones": 100.2, "usuarios_internet_parte": 0.831, "por_equipo_de_conexion": {"celular_inteligente": 0.972, "televisor_inteligente": 0.436, "computadora": 0.359, "consola": 0.081, "nota": "porcentaje de las personas usuarias de internet que se conectó con cada equipo; son respuestas múltiples y no suman 100 %"}, "tipo_de_conexion_de_usuarios_de_celular_inteligente": {"ambos": 0.728, "solo_wifi": 0.163, "solo_datos_moviles": 0.109}, "paginas": {"usuarios": 3, "equipo": 6, "tipo_de_conexion": 17}}, origen="fuente", fuente="INEGI, ENDUTIH 2024, reporte de resultados 9/25, 6 de mayo de 2025, https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/endutih/ENDUTIH_24_RR.pdf (consultado el 17-nov-2026; págs. 3, 6 y 17). Es la edición más reciente que se pudo leer; no se verificó una edición 2025", nota="el corte por TIPO DE CONEXIÓN existe sólo para usuarios de celular inteligente (no para todos los usuarios de internet)", mueve=False)
# --- ronda 9 ---
p("estratos_negocios", [{"estrato": e["estrato"], "negocios": e["negocios"]} for e in _seg["estratos"]], origen="medido", fuente="DENUE 05/2026 por estrato de personal (mercado-de-carta §2.1)", nota="clientes potenciales por tramo de tamaño: 104,882", mueve=False)
p("umbral_tablero", 0.15, 0.10, 0.20, "supuesto", "regla de la ronda 9: una palanca entra al tablero si sube al menos este porcentaje la capacidad del recurso que toca; con 0.10 pasan dos palancas más (índices y tipos, +11 %); entre 0.12 y 0.43 la lista no cambia", "umbral de impacto de una palanca", mueve=False)
p("visitas_mes_gratuito", 1800, 1500, 4500, "documento", "planes-y-costo §0 y disco-e-historial: 1,800 visitas al mes (chico y mediano; grande 4,500, formal 1,500)", "visitas (sesiones de mesa) al mes de un gratuito típico", mueve=False)
out = dict(version="2026-11-14", moneda="MXN",
           leyenda="origen: medido (lo medí con datos), documento (lo dice otro documento del repositorio), fuente (página o norma citada), supuesto (juicio mío, con rango y forma de medirlo), sin dato",
           parametros=P)
json.dump(out, open(os.path.join(os.environ.get("CARTA_SALIDA", AQUI), "2026-11-14-parametros.json"), "w"), ensure_ascii=False, indent=1)
print(len(P))
