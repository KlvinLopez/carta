// Pruebas del modelo de escenarios: reproduce las cifras ya publicadas. Uso: node 2026-11-14-pruebas.mjs
import { readFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const par = JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8'));
const s = M.valores(par);
let fallas = 0;
const prueba = (nombre, obtenido, esperado, tol = 0) => {
  const ok = typeof esperado === 'number' ? Math.abs(obtenido - esperado) <= tol : obtenido === esperado;
  if (!ok) fallas++;
  console.log(`${ok ? 'ok   ' : 'FALLA'} ${nombre}: ${obtenido} (esperado ${esperado}${tol ? ` ± ${tol}` : ''})`);
};

// 1) piso y punto de equilibrio publicados (tres-planes): 349, piso ≈ 85, equilibrio ≈ 9.7 con 2,569 de costo fijo
const pisoMediano = M.piso(s, 'servicio', 349);
prueba('piso a 349 (comisión sobre precio con IVA, soporte 60)', Math.round(pisoMediano * 10) / 10, 85.3, 0.1);
prueba('piso con la comisión sobre el precio sin IVA (primera versión, 83)', Math.round((M.piso({ ...s, comision_pct: s.comision_pct / (1 + s.iva) }, 'servicio', 349) - 0.0) * 10) / 10, 83.0, 2.5);
prueba('equilibrio a 349 con costo fijo 2,569 (138 USD × 18.6188)', Math.round(M.puntoEquilibrio(138 * s.fx, 349, pisoMediano) * 10) / 10, 9.7, 0.05);

// 2) restaurantes de paga que caben en 5 GB (todos de paga, mezcla de paga): 14, 22, 38 y 128
const c = M.configInicial();
const paga = (mv, me) => {
  const cc = JSON.parse(JSON.stringify(c));
  cc.topes.servicio.meses_en_linea = mv;
  cc.disco.meses_analitica_en_linea.servicio = me;
  return M.cabenEnVolumen(M.mbPorRestaurante('servicio', cc, s), s, 5);
};
prueba('03 §7 tal cual (24 meses de visitas, 13 de analítica)', paga(24, 13), 14);
prueba('propuesta anterior (12 meses todo)', paga(12, 12), 22);
prueba('analítica 30 días', paga(12, 1), 38);
prueba('analítica 30 días + historial 3 meses en línea', paga(3, 1), 128);

// 3) cifra HISTÓRICA del mapa de procesos (sin reserva de disco y con 16.7 MB estimados por gratuito): 299. Reemplazada por 279 (medido, con reserva del 20 %): se conserva sólo para reproducir lo publicado.
const sPub = { ...s, disco_gratuito_tipico_mb_publicado_activo: true };
const capDisco = Math.floor((5000 * 1 - s.base_vacia_mb) / sPub.disco_gratuito_tipico_mb_publicado);
prueba('cifra histórica publicada (reemplazada por 279): 5 GB ÷ 16.7 MB', capDisco, 299, 1);
const porId = Object.fromEntries(s.escalones.map((e) => [e.id, e]));
prueba('Pro, 2 procesos (procesador)', porId.pro_2.cap_cpu, 1064);
prueba('Pro, 4 procesos (procesador)', porId.pro_4.cap_cpu, 1896);
prueba('Pro, 8 procesos (10,000 conexiones)', Math.min(porId.pro_8.cap_cpu, s.cap_conexiones), 2116);
// el escalón más barato que alcanza para una carga dada
prueba('con 250 gratuitos típicos alcanza el escalón Hobby con eventos', M.escalonPara(250, 250 * 16.7, { ...s, reserva_disco: 0 }).escalon, 'hobby_eventos');
prueba('con 1,500 gratuitos típicos hace falta Pro de 4 procesos', M.escalonPara(1500, 1500 * 16.7, { ...s, reserva_disco: 0 }).escalon, 'pro_4');
prueba('con 2,500 gratuitos típicos ya hace falta repetir la pila', M.escalonPara(2500, 2500 * 16.7, { ...s, reserva_disco: 0 }).requiere_arquitectura, true);

// 4) corredor: 249 (Meniu, manda el piso ×3), 299 (Fudo Avanzado) y 349 (Fudo + mesas), K = 0.5, soporte 60
const red = (S) => M.redondea(M.precioSugerido(S, 0.5, s), s);
prueba('corredor con Meniu 225', red(s.sustitutos['Meniu Business']), 249);
prueba('corredor con Fudo Avanzado 652', red(s.sustitutos['Fudo Avanzado']), 299);
prueba('corredor con Fudo + mesas 745', red(s.sustitutos['Fudo Avanzado + módulo de mesas']), 349);

// 5) propiedades del modelo
const e1 = M.evaluar(c, s, 1000);
prueba('el margen es ingresos menos costos', Math.round(e1.ingresos.total - e1.costos.total), Math.round(e1.margen.pesos));
prueba('clientes suman n', Math.round(e1.clientes.gratuito + e1.clientes.servicio + e1.clientes.salon), 1000);
prueba('el plan gratuito lleva anuncios: en régimen suman', e1.ingresos.anuncios > 0, true);
prueba('sinAnuncios: los anuncios no suman (periodo temporal)', M.evaluar(c, s, 1000, { sinAnuncios: true }).ingresos.anuncios, 0);
const sin = M.escenarios(c, s, [1000])[0];
prueba('peor caso temporal (sin anuncios) pierde dinero a 1,000', sin.peor_firme.margen_operacion < 0, true);
prueba('peor caso con anuncios (tarifa media) mejora al temporal', sin.peor_anuncios_tarifa_media.margen_operacion > sin.peor_firme.margen_operacion, true);
prueba('peor con anuncios adversos < tarifa baja', sin.peor_anuncios_adversos.margen_operacion < sin.peor_anuncios_tarifa_baja.margen_operacion, true);
prueba('el mejor caso supera al esperado medio', sin.mejor.ingresos.total > sin.esperado.media.ingresos.total, true);
prueba('esperado: pesimista ≤ media ≤ optimista en ingresos', sin.esperado.pesimista.ingresos.total <= sin.esperado.media.ingresos.total && sin.esperado.media.ingresos.total <= sin.esperado.optimista.ingresos.total, true);
const po = M.precioOptimo('media', s);
prueba('en el precio óptimo la derivada es ≈ 0 (cambio de signo)', Math.abs(po.derivada_en_optimo) < 0.2, true);
prueba('la meseta contiene al óptimo', po.meseta.desde <= po.precio && po.precio <= po.meseta.hasta, true);
const cero = JSON.parse(JSON.stringify(c)); cero.precios.servicio = 0; cero.precios.salon = 0;
prueba('precio 0: no hay clientes de paga', M.evaluar(cero, s, 1000).clientes.de_paga, 0);
prueba('margen de operación ≥ margen después de captación', e1.margen_operacion >= e1.margen_despues_de_captacion, true);
const ex = M.evaluar(c, s, 5000, { todosPagan: true });
prueba('con 5,000 restaurantes de paga ya hay extrapolación sin medir', ex.extrapolacion_sin_medir && ex.capacidad.requiere_arquitectura, true);
prueba('con 100 restaurantes no hay extrapolación', M.evaluar(c, s, 100).extrapolacion_sin_medir, false);
const sens = M.sensibilidad(c, s, 1000);
prueba('sensibilidad ordenada de mayor a menor', sens.filas.every((f, i) => i === 0 || sens.filas[i - 1].efecto >= f.efecto), true);
prueba('la sensibilidad trae frases en llano', sens.filas[0].frase.startsWith('Si '), true);
const opt0 = M.optimizar(s);
prueba('la meseta del precio contiene al mejor precio', opt0.mejor.meseta[0] <= opt0.mejor.mejor_precio && opt0.mejor.mejor_precio <= opt0.mejor.meseta[1], true);
const t = opt0.tabla_cupo_gratis.filter((x) => !x.sin_solucion);
prueba('a más seguridad exigida al gratuito, menos margen', t.every((x, i) => i === 0 || t[i - 1].margen >= x.margen - 1e-6), true);
prueba('los topes del gratuito cambian con la seguridad exigida', new Set(t.map((x) => `${x.mesas}-${x.cuentas}-${x.platillos}`)).size > 1, true);

// 6) segmentación de Calvin
const seg = s.segmentacion_negocios;
prueba('la segmentación suma los 104,882 clientes potenciales', seg['Chef'] + seg['Master Chef'] + seg['Chef Ejecutivo'], 104882);
prueba('Chef = 86.8 % de los clientes potenciales', Math.round((1000 * seg['Chef']) / 104882) / 10, 86.8);
prueba('configInicial es la segmentación de Calvin', c.nombre, 'segmentación de Calvin');
prueba('configBase es alias de configInicial', M.configBase().nombre, c.nombre);
prueba('configTopes10Mesas3Cuentas conserva la anterior (299 y 10 mesas)', [M.configTopes10Mesas3Cuentas().precios.servicio, M.configTopes10Mesas3Cuentas().topes.gratuito.mesas].join('/'), '299/10');
prueba('con los topes de la configuración inicial, un negocio de hasta 10 personas queda dentro con ≥ 95 %', M.seguridadChico(c, s) >= 0.95, true);
prueba('el modelo de mesas y cuentas tiene intervalo: mínimo ≤ centro ≤ máximo', M.parteRebasa(c, s, 'minimo') <= M.parteRebasa(c, s, 'centro') && M.parteRebasa(c, s, 'centro') <= M.parteRebasa(c, s, 'maximo'), true);
const ep = M.evaluarPrecios(c, s, 1000);
prueba('se evalúan 4 precios de Master Chef y 3 de Chef Ejecutivo', `${ep.servicio.length}/${ep.salon.length}`, '4/3');
prueba('cada precio trae el margen sin anuncios y con anuncios', 'margen_operacion_sin_anuncios' in ep.servicio[0].por_curva.media && 'sin_perdidas_con_anuncios' in ep.servicio[0].por_curva.media, true);

// 7) la pregunta del peor caso: todos gratuitos
const tg = M.tablaTodosGratuitos(c, s);
prueba('la tabla cubre n de 10 a 2,000 y la zona extrapolada aparte', `${tg.medida[0].n}-${tg.medida[tg.medida.length - 1].n}/${tg.extrapolada_sin_medir[0].n}`, '10-2000/3000');
prueba('la zona extrapolada está marcada', tg.extrapolada_sin_medir.every((x) => x.extrapolacion_sin_medir), true);
prueba('la zona medida no está marcada', tg.medida.every((x) => !x.extrapolacion_sin_medir), true);
prueba('el costo sin anuncios crece con n', tg.medida.every((x, i) => i === 0 || x.costo_sin_anuncios >= tg.medida[i - 1].costo_sin_anuncios - 1e-6), true);
prueba('los comensales crecen con n', tg.medida.every((x, i) => i === 0 || x.comensales_mes > tg.medida[i - 1].comensales_mes), true);
const nb = M.nSePagaSolo(c, s, 'baja');
const na = M.nSePagaSolo(c, s, 'adverso');
prueba('con tarifa baja los anuncios se pagan solos desde pocos restaurantes (< 100)', nb > 0 && nb < 100, true);
prueba('el caso adverso exige más restaurantes que la tarifa baja', na > nb, true);
const cb = M.capacidadConBolsa(c, s, 1000);
prueba('con 1,000 pesos al mes de la bolsa caben entre 600 y 1,000 restaurantes gratuitos', cb.restaurantes >= 600 && cb.restaurantes <= 1000, true);
prueba('el costo con ese número de restaurantes no pasa de la bolsa', M.todosGratuitos(c, s, cb.restaurantes).costo_sin_anuncios <= 1000, true);

// 8) resumen en tres casos
const rs = M.resumen(c, s, 1000);
prueba('el resumen trae once cifras', rs.cifras.length, 11);
prueba('cada cifra trae recomendado, peor y mejor', rs.cifras.every((f) => 'recomendado' in f && 'peor' in f && 'mejor' in f), true);
const mo = rs.cifras.find((f) => f.clave === 'margen_de_operacion');
prueba('el margen de operación: peor ≤ recomendado ≤ mejor', mo.peor <= mo.recomendado && mo.recomendado <= mo.mejor, true);
prueba('el resumen define los cuatro escenarios y la nota', Object.keys(rs.definiciones).join(','), 'recomendado,peor,mejor,piso_de_verdad,nota');

// 9) banderas y proyección
const bd = M.banderas({ cpu_pct: 75, disco_pct: 40, conexiones_abiertas: null, memoria_pct: 60, costo_por_restaurante: 3, ingresos_mes: 10000, costos_mes: 3000, escalon: 'pro_2' }, s);
prueba('procesador a 75 % pide acción', bd.find((b) => b.id === 'procesador').nivel, 'accion');
prueba('disco a 40 % está bien', bd.find((b) => b.id === 'disco').nivel, 'ok');
prueba('lo que no se mide sale «sin_medir»', bd.find((b) => b.id === 'conexiones').nivel, 'sin_medir');
prueba('la bandera dice a qué escalón pasar', bd.find((b) => b.id === 'procesador').paso.a.includes('4 procesos'), true);
const pr = M.proyectar(c, s, 24);
const mi = s.mes_inicio_anuncios;
prueba('antes del mes de inicio no hay anuncios', pr.filas[mi - 2].ingresos_anuncios, 0);
prueba('desde el mes de inicio hay anuncios', pr.filas[mi - 1].ingresos_anuncios > 0, true);
prueba('el financiamiento máximo no es negativo', pr.financiamiento_maximo >= 0, true);

// 10) CIFRAS DE TITULAR (las que van a pantalla), con tolerancia estrecha (±1 peso, ±0.002 en proporciones)
{
  const cfg = M.configInicial();
  prueba('Chef: topes de configInicial (mesas · cuentas · platillos)', `${cfg.topes.gratuito.mesas}·${cfg.topes.gratuito.cuentas}·${cfg.topes.gratuito.platillos}`, '25·4·150');
  prueba('cobertura de Chef (centro, con dispersión σ = 0.5)', M.seguridadChico(cfg, s, 'centro'), 0.951, 0.002);
  prueba('cobertura de Chef (mínimo de las 27 combinaciones)', M.seguridadChico(cfg, s, 'minimo'), 0.867, 0.002);
  prueba('cobertura de Chef (máximo del modelo, no 100 %)', M.seguridadChico(cfg, s, 'maximo'), 0.98, 0.002);
  prueba('la dispersión es un parámetro con rango', `${s.sigma_mesas_por_cuenta}|${s.rangos.sigma_mesas_por_cuenta.join('-')}`, '0.5|0-0.75');
  const margen = (n) => M.evaluarEscenario(n, cfg, s, 1000).margen_operacion;
  prueba('margen de operación recomendado (1,000)', margen('recomendado'), 8719, 1);
  prueba('margen de operación peor (1,000)', margen('peor'), -47, 1);
  prueba('margen de operación mejor (1,000)', margen('mejor'), 32655, 1);
  prueba('margen de operación piso de verdad (1,000)', margen('piso_de_verdad'), -2031, 1);
  const mx = M.matrizEscenarios(cfg, s, 1000);
  const celdas = mx.filas.map((f) => f.celdas.map((x) => Math.round(x.margen_operacion))).flat().join(',');
  prueba('matriz 3 × 3 curva × anuncios (pesimista, media, optimista; sin, baja, media)', celdas, '-47,4231,17068,4545,8719,21241,17159,21033,32655');
  prueba('rango de la bolsa de 1,000 pesos (mín–centro–máx)', `${M.rangoBolsa(cfg, s, 1000).minimo}-${M.rangoBolsa(cfg, s, 1000).centro.restaurantes}-${M.rangoBolsa(cfg, s, 1000).maximo}`, '246-811-1896');
  prueba('con el sondeo de hoy caben 148', M.rangoBolsa(cfg, s, 1000).caben_con_el_sondeo_de_hoy, 148);
  const rb = M.rangoSePagaSolo(cfg, s, 'baja');
  const rm = M.rangoSePagaSolo(cfg, s, 'medio');
  const ra = M.rangoSePagaSolo(cfg, s, 'adverso');
  prueba('se paga solo, tarifa baja: centro, mínimo, máximo', `${rb.centro}-${rb.minimo}-${rb.maximo}`, '54-25-186');
  prueba('se paga solo, tarifa media: centro, mínimo, máximo', `${rm.centro}-${rm.minimo}-${rm.maximo}`, '12-6-25');
  prueba('se paga solo, adverso: centro, mínimo y máximo imposible', `${ra.centro}-${ra.minimo}-${ra.maximo}`, '1469-139-null');
  prueba('con la tarifa a la mitad, la tarifa baja pasa a 139', rb.por_supuesto.find((v) => v.supuesto === 'tarifa de anuncios').bajo.n, 139);
  const pr = M.proyectarEscenario('recomendado', cfg, s, 36);
  const m12 = pr.filas[11];
  prueba('mes 12 recomendado: ingresos', m12.ingresos, 3682, 1);
  prueba('mes 12 recomendado: margen de operación', m12.margen_operacion, 2330, 1);
  prueba('mes 12 recomendado: margen después de captación', m12.margen_despues_de_captacion, 1314, 1);
  prueba('mes 12 mejor: margen de operación', M.proyectarEscenario('mejor', cfg, s, 36).filas[11].margen_operacion, 9538, 1);
  prueba('mes 12 peor: margen de operación', M.proyectarEscenario('peor', cfg, s, 36).filas[11].margen_operacion, -300, 1);
  const sp = M.sensibilidadPrecio(cfg, s, 1000);
  prueba('precio ganador según la mediana de la curva (150, 225, 300, 450)', sp.por_mediana.map((f) => f.precio_ganador).join(','), '199,249,299,299');
  prueba('óptimo continuo según la mediana', sp.por_mediana.map((f) => f.optimo_continuo).join(','), '175,234,294,415');
  prueba('precio ganador según sigma (0.3, 0.45, 0.6, 0.9)', sp.por_sigma.map((f) => f.precio_ganador).join(','), '199,199,249,299');
  prueba('comensales al mes con 1,000 gratuitos', Math.round(M.todosGratuitos(cfg, s, 1000).comensales_mes / 1000), 3417, 1);
  prueba('costo al mes sin anuncios con 1,000 gratuitos', M.todosGratuitos(cfg, s, 1000).costo_sin_anuncios, 1137, 1);

  // un escenario «sin anuncios» NO puede traer ingresos por anuncios, en ninguna vía
  const sinAds = [
    ['evaluarEscenario(peor)', M.evaluarEscenario('peor', cfg, s, 1000).ingresos.anuncios],
    ['matriz, fila «sin anuncios»', Math.max(...mx.filas.map((f) => f.celdas.find((x) => x.anuncios === 'sin').ingresos_anuncios))],
    ['proyectarEscenario(peor), todos los meses', Math.max(...M.proyectarEscenario('peor', cfg, s, 36).filas.map((f) => f.ingresos_anuncios))],
    ['escenarios(): peor_sin_anuncios', M.escenarios(cfg, s, [1000])[0].peor_sin_anuncios.ingresos.anuncios],
    ['resumen: el peor lleva 0 de anuncios', M.evaluarEscenario('peor', cfg, s, 100).ingresos.anuncios],
  ];
  for (const [nombre, v] of sinAds) prueba(`sin anuncios no trae ingresos por anuncios: ${nombre}`, v, 0);
  prueba('el piso de verdad sí lleva anuncios (adversos)', M.evaluarEscenario('piso_de_verdad', cfg, s, 1000).ingresos.anuncios > 0, true);
  prueba('el piso de verdad es peor que el peor', margen('piso_de_verdad') < margen('peor'), true);
}

// 11) RECURSOS Y PALANCAS (rondas 5 y 6): el disco depende de los meses de historial; hoy NADA purga
{
  const cfg = M.configInicial();
  const R = M.recursos(cfg, s); // por defecto: 12 meses de historial acumulado, sin purga
  const rec = (id) => R.recursos.find((x) => x.recurso === id);
  const curva = R.disco_por_historial;
  prueba('curva del disco por meses de historial (1, 3, 6, 12, 03 §7)', curva.map((x) => x.restaurantes_por_disco).join(','), '279,93,47,23,15');
  prueba('el cuello hoy cambia con el historial: 1 mes procesador; desde 3 meses disco', curva.map((x) => x.cuello_hoy).join(','), 'procesador,disco,disco,disco,disco');
  prueba('el disco manda desde el mes 2 de operación con el sondeo y desde el mes 1 con avisos', `${R.mes_desde_el_que_manda_el_disco.con_sondeo}-${R.mes_desde_el_que_manda_el_disco.con_eventos}`, '2-1');
  prueba('cuello hoy sin purga (12 meses): recurso y restaurantes', `${R.cuello_hoy.recurso}-${R.cuello_hoy.restaurantes}`, 'disco-23');
  prueba('cuello hoy con historial a 30 días: recurso y restaurantes', `${R.cuello_hoy.con_historial_30_dias.recurso}-${R.cuello_hoy.con_historial_30_dias.restaurantes}`, 'procesador-148');
  prueba('cuello con avisos con historial a 30 días: recurso y restaurantes', `${R.cuello_con_eventos.con_historial_30_dias.recurso}-${R.cuello_con_eventos.con_historial_30_dias.restaurantes}`, 'disco-279');
  prueba('rango ±2× del procesador hoy y con avisos', `${R.rango_procesador.procesador_hoy.join('-')}|${R.rango_procesador.procesador_con_eventos.join('-')}`, '74-296|532-2128');
  prueba('148 frente a 279 está dentro del margen ±2× (no se puede afirmar quién manda)', R.rango_procesador.procesador_hoy[1] >= 279, true);
  prueba('sensibilidad: con el doble de actividad el procesador hoy baja a 74', R.sensibilidad_actividad[2].procesador_hoy, 74);
  prueba('sensibilidad: con todos en su hora pico a la vez el procesador hoy baja a 93', R.pico_simultaneo.procesador_hoy, 93);
  prueba('límite de cada recurso hoy sin purga (procesador, memoria, disco, conexiones BD)', [rec('procesador'), rec('memoria'), rec('disco'), rec('conexiones_bd')].map((x) => x.restaurantes_hoy).join(','), '148,476800,23,3288');
  prueba('límite de cada recurso hoy con historial a 30 días', [rec('procesador'), rec('disco')].map((x) => x.con_historial_30_dias.restaurantes_hoy).join(','), '148,279');
  prueba('límite con avisos (procesador, conexiones BD, líneas; tope de diseño supuesto)', [rec('procesador'), rec('conexiones_bd'), rec('lineas')].map((x) => x.restaurantes_con_eventos).join(','), '1064,23644,2116');
  prueba('las líneas abiertas no existen hoy', rec('lineas').restaurantes_hoy, null);
  prueba('sólo un recurso es cuello hoy y sólo uno con eventos', `${R.recursos.filter((x) => x.es_cuello_hoy).length}-${R.recursos.filter((x) => x.es_cuello_con_eventos).length}`, '1-1');
  prueba('escalera sin purga: restaurantes que caben por tamaño', R.escalera.slice(0, 5).map((e) => e.restaurantes_que_caben).join(','), '23,23,236,236,236');
  prueba('escalera con historial a 30 días: restaurantes que caben por tamaño', R.escalera.slice(0, 5).map((e) => e.restaurantes_con_historial_30_dias).join(','), '148,279,1064,1896,2116');
  prueba('escalera con historial a 30 días: recurso que obliga a subir', R.escalera.slice(0, 5).map((e) => e.recurso_que_obliga_a_subir_con_historial_30_dias).join(','), 'procesador,disco,procesador,procesador,lineas');
  prueba('lo que pagamos hoy: total en USD al mes', Math.round(R.hoy.total_usd_mes * 100) / 100, 10.18, 0.01);
  const pal = (id) => rec(M.PALANCAS[id].recurso).palancas.find((p) => p.id === id);
  prueba('palanca 1, historial del gratuito a 30 días: +restaurantes por disco (sin purga → 30 días)', pal('historial_gratuito_30_dias').ganancia_restaurantes.con_eventos, 256);
  prueba('palanca analítica agregada, sobre la base con historial a 30 días', pal('analitica_agregada_por_dia').sobre_historial_30_dias.ganancia, 216);
  prueba('palanca retención 7 días, sobre la base con historial a 30 días', pal('retencion_analitica_7_dias').sobre_historial_30_dias.ganancia, 168);
  prueba('palanca tipos más chicos, sobre la base con historial a 30 días', pal('tipos_mas_chicos').sobre_historial_30_dias.ganancia, 31);
  prueba('palanca índices mínimos, sobre la base con historial a 30 días', pal('indices_de_evento_minimos').sobre_historial_30_dias.ganancia, 31);
  prueba('palanca estado en memoria 60 s: +restaurantes con el sondeo', pal('estado_en_memoria_60s').ganancia_restaurantes.hoy, 128);
  prueba('palanca cerrar líneas ociosas: +restaurantes antes del tope de líneas', pal('cerrar_lineas_ociosas').ganancia_restaurantes.con_eventos, 906);
  const todasRegla = (id, re) => re.test(M.PALANCAS[id].regla_que_toca);
  prueba('el historial a 30 días contradice 03 §7 y toca la regla 9', todasRegla('historial_gratuito_30_dias', /03_Datos_v1.md §7/) && todasRegla('historial_gratuito_30_dias', /regla 9/), true);
  prueba('el archivo de sesiones toca las reglas 8 y 9', todasRegla('archivar_sesiones_cerradas', /regla 9/) && todasRegla('archivar_sesiones_cerradas', /regla 8/), true);
  prueba('toda palanca dice si es medida o estimada', Object.values(M.PALANCAS).every((p) => typeof p.medido === 'boolean'), true);
  // resumen: dice con qué retención
  const caben = (c, k = 'restaurantes_que_caben') => M.resumen(c, s, 1000).cifras.find((f) => f.clave === k).recomendado;
  prueba('resumen: restaurantes que caben (historial del gratuito a 1 mes: propuesta)', caben(cfg), 279);
  prueba('resumen: restaurantes que caben SIN purga (12 meses)', caben(cfg, 'restaurantes_que_caben_sin_purga'), 23);
  prueba('resumen: el nombre de la cifra dice la retención', /historial del gratuito de 1 mes: PROPUESTA/.test(M.resumen(cfg, s, 1000).cifras.find((f) => f.clave === 'restaurantes_que_caben').nombre), true);
  prueba('resumen: con la analítica agregada caben más', caben({ ...cfg, palancas: ['analitica_agregada_por_dia'] }) > 279, true);
  prueba('las palancas bajan los MB por restaurante gratuito', M.mbPorRestaurante('gratuito', { ...cfg, palancas: ['analitica_agregada_por_dia'] }, s) < M.mbPorRestaurante('gratuito', cfg, s), true);
  prueba('con Pro (50 GB) y historial a 30 días manda el procesador', M.recursos({ ...cfg, palancas: ['historial_gratuito_30_dias'] }, s, { tamano_eventos: 'pro_2' }).cuello_con_eventos.recurso, 'procesador');
  prueba('el procesador y los avisos del escenario están marcados como supuestos o medidos en local', /local/.test(rec('procesador').medido) && /SUPUESTO/.test(rec('lineas').medido), true);
}

// 12) cifras de titular de r4 que faltaba fijar (ronda 6): negocios por plan, 15 mesas, cobertura
{
  const cfg = M.configInicial();
  prueba('negocios por plan (Chef, Master Chef, Chef Ejecutivo)', `${s.segmentacion_negocios.Chef}/${s.segmentacion_negocios['Master Chef']}/${s.segmentacion_negocios['Chef Ejecutivo']}`, '91048/13614/220');
  const c15 = { ...cfg, topes: { ...cfg.topes, gratuito: { ...cfg.topes.gratuito, mesas: 15 } } };
  prueba('cobertura de Chef con 15 mesas (centro, con dispersión)', M.seguridadChico(c15, s, 'centro'), 0.894, 0.002);
  prueba('margen de operación recomendado con 15 mesas (1,000)', M.evaluar(c15, s, 1000, { curva: 'media' }).margen_operacion, 9996, 1);
}

// 12b) COBERTURA DEL TOPE DE PLATILLOS (ronda 7): dos cotas de sesgo opuesto, no se sabe la real
{
  const cfg = M.configInicial();
  const cp = (cuenta, cota, tope) => M.coberturaPlatillos(cfg, { ...s, cota_platillos: cota }, { tope, cuenta });
  prueba('muestra de sitios propios: cobertura de 80, 150, 200 y 300 platillos contando todo', [80, 150, 200, 300].map((x) => Math.round(cp('todo', 'baja', x) * 100)).join(','), '25,52,73,84');
  prueba('muestra de sitios propios, sólo comida: 80 → 75 % y 150 → 100 %', `${Math.round(cp('comida', 'baja', 80) * 100)}-${Math.round(cp('comida', 'baja', 150) * 100)}`, '75-100');
  prueba('cota alta (reparto) a 150 platillos: 98 %', Math.round(cp('todo', 'alta', 150) * 100), 98);
  prueba('dentro de 150 por tipo: fondas y taquerías, cafeterías y formales', ['taqueria_fonda', 'cafeteria', 'formal'].map((k) => `${s.cobertura_platillos.por_tipo_baja[k].dentro_de_150_total}/${s.cobertura_platillos.por_tipo_baja[k].n}`).join(','), '7/8,9/11,3/14');
  const cc = M.coberturaChef(cfg, s);
  prueba('cobertura del plan Chef contando todo: cota baja y cota alta', `${Math.round(cc.todo.baja * 1000) / 10}-${Math.round(cc.todo.alta * 1000) / 10}`, '50.3-95.1');
  prueba('cobertura del plan Chef contando sólo comida: cota baja y cota alta', `${Math.round(cc.comida.baja * 1000) / 10}-${Math.round(cc.comida.alta * 1000) / 10}`, '97.1-95.1');
  prueba('cobertura del plan Chef sin tope de platillos', Math.round(M.coberturaChef(cfg, s, 'centro', Infinity).todo.baja * 1000) / 10, 97.1);
  const op = Object.fromEntries(M.opcionesTopePlatillos(cfg, s, 1000).map((o) => [o.id, o]));
  prueba('opciones del tope: cobertura de Chef con la cota baja (actual, sólo comida, 200, 300, sin tope)', ['actual', 'solo_comida', 'subir_200', 'subir_300', 'sin_tope'].map((k) => Math.round(op[k].por_cota.baja.cobertura_chef * 1000) / 10).join(','), '50.3,97.1,71.1,81.5,97.1');
  prueba('opciones del tope: margen con la cota alta (actual, sólo comida, 200, 300, sin tope)', ['actual', 'solo_comida', 'subir_200', 'subir_300', 'sin_tope'].map((k) => Math.round(op[k].por_cota.alta.margen_operacion)).join(','), '8719,8719,8630,8504,8288');
  prueba('opciones del tope: margen con la cota baja del tope actual', Math.round(op.actual.por_cota.baja.margen_operacion), 18592, 1);
  prueba('la cota por omisión sigue siendo la alta (los números anteriores no cambian)', s.cota_platillos, 'alta');
}

// 13) los archivos generados y commiteados coinciden con la salida del modelo (si alguien cambia el modelo y no regenera, esto falla)
{
  const tmp = mkdtempSync(join(tmpdir(), 'carta-gen-'));
  const entorno = { ...process.env, CARTA_SALIDA: tmp };
  const gens = [['node', '2026-11-14-corre-escenarios.mjs', ['2026-11-14-modelo-de-escenarios-resultados.json', '2026-11-14-modelo-de-escenarios.md', '2026-11-14-chequeo-de-margenes.md', '2026-11-14-precio-de-entrada.md', '2026-11-14-recomendaciones.json', '2026-11-14-recomendaciones.md']],
    ['node', '2026-11-14-banderas.mjs', ['2026-11-14-banderas-de-operacion.json', '2026-11-14-banderas-de-operacion.md']],
    ['node', '2026-11-14-recursos.mjs', ['2026-11-14-recursos-y-palancas.json', '2026-11-14-recursos-y-palancas.md']],
    ['python3', '2026-11-16-cobertura-platillos.py', ['2026-11-16-cobertura-platillos-datos.json']],
    ['python3', '2026-11-14-parametros-generador.py', ['2026-11-14-parametros.json']]];
  for (const [cmd, script, salidas] of gens) {
    const args = cmd === 'python3' ? ['-I', join(aqui, script)] : [join(aqui, script)];
    execFileSync(cmd, args, { env: entorno, stdio: 'ignore' });
    for (const f of salidas) prueba(`el archivo commiteado coincide con la salida del generador: ${f}`, readFileSync(join(aqui, f), 'utf8') === readFileSync(join(tmp, f), 'utf8'), true);
  }
}

console.log(fallas === 0 ? '\nTodas las pruebas pasan.' : `\n${fallas} prueba(s) fallan.`);
process.exit(fallas === 0 ? 0 : 1);
