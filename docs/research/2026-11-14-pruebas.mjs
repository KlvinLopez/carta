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
const CT = (c = M.configR15()) => ({ ...c, carga: 'tipica', topes: { ...c.topes, gratuito: { ...c.topes.gratuito, meses_en_linea: 1 } }, disco: { ...c.disco, meses_analitica_en_linea: { ...c.disco.meses_analitica_en_linea, gratuito: 1 } } }); // las rondas 4 a 9 miden el gratuito típico (comparación rotulada, no vigente)
const RT = (c, ss, st = {}) => M.recursos(c, ss, { carga: 'tipica', meses_historial: 12, ...st }); // las rondas 5 a 9 miden el gratuito típico de 1,800 visitas
const TB = (c, ss, u, carga = 'tipica') => M.palancasEnTablero(c, ss, u ?? ss.umbral_tablero, carga);
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
const c = CT();
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
const opt0 = M.optimizar(s, {}, CT(M.configTresPlanes25Mesas()));
prueba('la meseta del precio contiene al mejor precio', opt0.mejor.meseta[0] <= opt0.mejor.mejor_precio && opt0.mejor.mejor_precio <= opt0.mejor.meseta[1], true);
const t = opt0.tabla_cupo_gratis.filter((x) => !x.sin_solucion);
prueba('a más seguridad exigida al gratuito, menos margen', t.every((x, i) => i === 0 || t[i - 1].margen >= x.margen - 1e-6), true);
prueba('los topes del gratuito cambian con la seguridad exigida', new Set(t.map((x) => `${x.mesas}-${x.cuentas}-${x.platillos}`)).size > 1, true);

// 6) segmentación de Calvin
const seg = s.segmentacion_negocios;
prueba('la segmentación suma los 104,882 clientes potenciales', seg['Chef'] + seg['Master Chef'] + seg['Chef Ejecutivo'], 104882);
prueba('Chef = 86.8 % de los clientes potenciales', Math.round((1000 * seg['Chef']) / 104882) / 10, 86.8);
prueba('configInicial son los dos planes de Calvin', c.nombre, 'dos planes: Chef y Master Chef');
prueba('configBase es alias de configInicial', M.configBase().nombre, c.nombre);
prueba('configTopes10Mesas3Cuentas conserva la anterior (299 y 10 mesas)', [CT(M.configTopes10Mesas3Cuentas()).precios.servicio, CT(M.configTopes10Mesas3Cuentas()).topes.gratuito.mesas].join('/'), '299/10');
prueba('con los topes de TRES planes (25 · 4 · 150), un negocio de hasta 10 personas queda dentro con ≥ 95 %', M.seguridadChico(CT(M.configTresPlanes25Mesas()), s) >= 0.95, true);
prueba('el modelo de mesas y cuentas tiene intervalo: mínimo ≤ centro ≤ máximo', M.parteRebasa(c, s, 'minimo') <= M.parteRebasa(c, s, 'centro') && M.parteRebasa(c, s, 'centro') <= M.parteRebasa(c, s, 'maximo'), true);
const ep = M.evaluarPrecios(c, s, 1000);
prueba('se evalúan 4 precios de Master Chef y ninguno de Chef Ejecutivo (apagado)', `${ep.servicio.length}/${ep.salon.length}`, '4/0');
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
prueba('el resumen trae doce cifras (con la propuesta de 30 días aparte)', rs.cifras.length, 12);
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
  const cfg = CT(M.configTresPlanes25Mesas());
  // HISTÓRICO: cifras de las rondas 4 a 7 (config de tres planes con 25 mesas y la carga típica); no son las vigentes
  prueba('HISTÓRICO (tres planes, 25 mesas) Chef: topes de configInicial (mesas · cuentas · platillos)', `${cfg.topes.gratuito.mesas}·${cfg.topes.gratuito.cuentas}·${cfg.topes.gratuito.platillos}`, '25·4·150');
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
  const cfg = CT();
  const R = RT(cfg, s); // por defecto: 12 meses de historial acumulado, sin purga
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
  prueba('escalera sin purga: restaurantes que caben por tamaño', R.escalera_comparada.slice(0, 5).map((e) => e.restaurantes_que_caben).join(','), '23,23,236,236,236');
  prueba('escalera con historial a 30 días: restaurantes que caben por tamaño', R.escalera_comparada.slice(0, 5).map((e) => e.restaurantes_con_historial_30_dias).join(','), '148,279,1064,1896,2116');
  prueba('escalera con historial a 30 días: recurso que obliga a subir', R.escalera_comparada.slice(0, 5).map((e) => e.recurso_que_obliga_a_subir_con_historial_30_dias).join(','), 'procesador,disco,procesador,procesador,lineas');
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
  prueba('el archivo de sesiones (de paga y de todos) toca las reglas 8 y 9', ['archivar_sesiones_de_paga', 'archivar_sesiones_de_todos_los_planes'].every((id) => todasRegla(id, /regla 9/) && todasRegla(id, /regla 8/)), true);
  prueba('toda palanca dice si es medida o estimada', Object.values(M.PALANCAS).every((p) => typeof p.medido === 'boolean'), true);
  // resumen: dice con qué retención
  const caben = (c, k = 'restaurantes_que_caben') => M.resumen(c, s, 1000).cifras.find((f) => f.clave === k).recomendado;
  prueba('resumen con la carga típica (comparación de las rondas 4 a 9): restaurantes que caben (historial del gratuito a 1 mes: propuesta)', caben(cfg), 279);
  prueba('resumen: restaurantes que caben SIN purga (12 meses)', caben(cfg, 'restaurantes_que_caben_sin_purga'), 23);
  prueba('resumen: el nombre de la cifra dice la política (03 §7) y la otra, la propuesta', /03 §7: el gratuito guarda 1 meses/.test(M.resumen(cfg, s, 1000).cifras.find((f) => f.clave === 'restaurantes_que_caben').nombre) && /PROPUESTA/.test(M.resumen(cfg, s, 1000).cifras.find((f) => f.clave === 'restaurantes_que_caben_propuesta_30_dias').nombre), true);
  prueba('resumen: con la analítica agregada caben más', caben({ ...cfg, palancas: ['analitica_agregada_por_dia'] }) > 279, true);
  prueba('las palancas bajan los MB por restaurante gratuito', M.mbPorRestaurante('gratuito', { ...cfg, palancas: ['analitica_agregada_por_dia'] }, s) < M.mbPorRestaurante('gratuito', cfg, s), true);
  prueba('con Pro (50 GB) y historial a 30 días manda el procesador', RT({ ...cfg, palancas: ['historial_gratuito_30_dias'] }, s, { tamano_eventos: 'pro_2' }).cuello_con_eventos.recurso, 'procesador');
  prueba('el procesador y los avisos del escenario están marcados como supuestos o medidos en local', /local/.test(rec('procesador').medido) && /SUPUESTO/.test(rec('lineas').medido), true);
}

// 12) cifras de titular de r4 que faltaba fijar (ronda 6): negocios por plan, 15 mesas, cobertura
{
  const cfg = CT(M.configTresPlanes25Mesas());
  prueba('negocios por plan (Chef, Master Chef, Chef Ejecutivo)', `${s.segmentacion_negocios.Chef}/${s.segmentacion_negocios['Master Chef']}/${s.segmentacion_negocios['Chef Ejecutivo']}`, '91048/13614/220');
  const c15 = { ...cfg, topes: { ...cfg.topes, gratuito: { ...cfg.topes.gratuito, mesas: 15 } } };
  prueba('cobertura de Chef con 15 mesas (centro, con dispersión)', M.seguridadChico(c15, s, 'centro'), 0.894, 0.002);
  prueba('margen de operación recomendado con 15 mesas (1,000)', M.evaluar(c15, s, 1000, { curva: 'media' }).margen_operacion, 9996, 1);
}

// 12b) COBERTURA DEL TOPE DE PLATILLOS (ronda 7): dos cotas de sesgo opuesto, no se sabe la real
{
  const cfg = CT(M.configTresPlanes25Mesas());
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

// 14) DOS PLANES (decisión de Calvin, 17-nov): Chef 6 mesas y 1 cuenta, Master Chef 225, Chef Ejecutivo apagado
{
  const cfg = CT();
  const tres = CT(M.configTresPlanes25Mesas());
  prueba('Chef: topes de configInicial (mesas · cuentas · platillos)', `${cfg.topes.gratuito.mesas}·${cfg.topes.gratuito.cuentas}·${cfg.topes.gratuito.platillos}`, '6·1·150');
  prueba('Master Chef hasta los topes técnicos (mesas y personas activas)', `${cfg.topes.servicio.mesas}·${cfg.topes.servicio.cuentas}`, '500·50');
  prueba('Chef Ejecutivo apagado (no borrado): precio 0 y planes.chef_ejecutivo.activo falso', `${cfg.precios.salon}-${cfg.planes.chef_ejecutivo.activo}`, '0-false');
  prueba('la configuración de tres planes se conserva con su nombre', `${tres.precios.salon}-${tres.topes.gratuito.mesas}`, '1099-25');
  const ev = M.evaluar(cfg, s, 1000, { curva: 'media' });
  prueba('sin Chef Ejecutivo no hay clientes de ese plan', ev.clientes.salon, 0);
  const c = (k) => M.coberturaEstratos(cfg, s, k);
  prueba('0 a 5 personas dentro de Chef: centro, mínimo y máximo del modelo', ['centro', 'minimo', 'maximo'].map((k) => Math.round(c(k).dentro_0_5 * 1000) / 10).join('-'), '48.4-42.4-54.5');
  prueba('6 a 10 personas dentro de Chef (el modelo da 0): caen todas en Master Chef', c('centro').cae_en_master_6_10, 1);
  prueba('0 a 5 personas dentro con la cota baja de platillos', Math.round(M.coberturaEstratos(cfg, s, 'centro', 'baja').dentro_0_5 * 1000) / 10, 25.6);
  prueba('parte de los registrados que rebasa Chef (dos planes frente a tres)', `${Math.round(M.parteRebasa(cfg, s) * 1000) / 10}-${Math.round(M.parteRebasa(tres, s) * 1000) / 10}`, '66.2-17.4');
  prueba('clientes de paga por 1,000 (dos planes frente a tres)', `${Math.round(ev.clientes.de_paga)}-${Math.round(M.evaluar(tres, s, 1000, { curva: 'media' }).clientes.de_paga)}`, '116-30');
  prueba('ingreso por cliente de paga sin el plan de 1,099', Math.round(ev.por_cliente.ingreso_por_pagante), 225);
  const m = (n) => Math.round(M.evaluarEscenario(n, cfg, s, 1000).margen_operacion);
  prueba('margen de operación por escenario con dos planes (recomendado, peor, mejor, piso)', ['recomendado', 'peor', 'mejor', 'piso_de_verdad'].map(m).join(','), '20024,2390,65664,-1109');
  const mx = M.matrizEscenarios(cfg, s, 1000).filas.map((f) => f.celdas.map((x) => Math.round(x.margen_operacion))).flat().join(',');
  prueba('matriz curva × anuncios con dos planes', mx, '2390,6594,19206,16218,20024,31442,55025,57685,65664');
  prueba('gratuitos que sostiene un cliente de paga (sin anuncios) con dos planes', Math.round(ev.gratuitos_que_sostiene_un_pagante_sin_anuncios), 125);
  const pr = M.proyectarEscenario('recomendado', cfg, s, 36);
  prueba('mes 12 con dos planes: ingresos y margen de operación', `${Math.round(pr.filas[11].ingresos)}-${Math.round(pr.filas[11].margen_operacion)}`, '8964-5749');
  prueba('umbral de anuncios (tarifa baja): no depende del plan', M.rangoSePagaSolo(cfg, s, 'baja').centro, 54);
  prueba('la bolsa de 1,000 pesos: no depende del plan', M.rangoBolsa(cfg, s, 1000).centro.restaurantes, 811);
  // desgloses: cuatro cifras para pintar
  const d = M.desgloses(cfg, s, 1000).escenarios;
  const dr = d.find((x) => x.escenario === 'recomendado');
  prueba('desgloses: un bloque por escenario', d.map((x) => x.escenario).join(','), 'recomendado,peor,mejor,piso_de_verdad');
  prueba('desglose (a): lo que deja un cliente de paga', Math.round(dr.gratuitos_que_sostiene.pagante.deja), 149);
  prueba('desglose (b): embudo de anuncios (visitas → abren → ven → pesos)', `${Math.round(dr.embudo_anuncios.comensales_al_mes)}-${Math.round(dr.embudo_anuncios.abren_la_app)}-${Math.round(dr.embudo_anuncios.ven_un_anuncio)}-${Math.round(dr.embudo_anuncios.pesos_por_gratuito * 10) / 10}`, '3417-2050-1230-4.3');
  prueba('desglose (c): pesos por cliente de paga cuadran (precio − comisión − soporte − servidor)', Math.abs(dr.pesos_por_cliente_de_paga.precio - dr.pesos_por_cliente_de_paga.comision_tarjeta - dr.pesos_por_cliente_de_paga.soporte - dr.pesos_por_cliente_de_paga.servidor_y_disco - dr.pesos_por_cliente_de_paga.queda) < 1e-9, true);
  const cm = dr.cascada_margen;
  prueba('desglose (d): la cascada cuadra con el margen de operación', Math.abs(cm.ingreso_suscripcion + cm.ingreso_anuncios - cm.costo_servidor - cm.costo_almacenamiento - cm.costo_soporte - cm.costo_comision - cm.margen_operacion) < 1e-6, true);
  prueba('desglose (d): el peor no lleva ingresos por anuncios', d.find((x) => x.escenario === 'peor').cascada_margen.ingreso_anuncios, 0);
  // la escalera dinámica responde al estado y no modifica sus entradas
  const antes = JSON.stringify([cfg, s]);
  const E = (estado, palancas = []) => RT({ ...cfg, palancas }, s, estado).escalera.slice(0, 4).map((e) => `${e.restaurantes_que_caben}:${e.recurso_que_obliga_a_subir}`).join(' ');
  prueba('escalera con el sondeo y 12 meses de historial', E({ canal: 'sondeo', meses_historial: 12 }), '23:disco 148:procesador 236:disco 236:disco');
  prueba('escalera con avisos y 1 mes de historial', E({ canal: 'eventos', meses_historial: 1 }), '279:disco 1064:procesador 1896:procesador 2116:lineas');
  prueba('escalera con sondeo y 1 mes de historial', E({ canal: 'sondeo', meses_historial: 1 }), '148:procesador 148:procesador 263:procesador 294:procesador');
  prueba('la palanca del historial a 30 días mueve la escalera', E({ canal: 'eventos', meses_historial: 12 }, ['historial_gratuito_30_dias']), '279:disco 1064:procesador 1896:procesador 2116:lineas');
  prueba('recursos y desgloses no modifican sus parámetros de entrada', JSON.stringify([cfg, s]) === antes, true);
}

// 15) RONDA 8, segunda parte: palancas en llano, definiciones, mensajes y ENDUTIH
{
  const cfg = CT();
  const todas = Object.entries(M.PALANCAS);
  prueba('toda palanca trae acción (hasta 6 palabras, en infinitivo) y qué es (una frase)', todas.every(([, p]) => typeof p.accion === 'string' && p.accion.split(/\s+/).length <= 6 && /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+(ar|er|ir)\s/.test(p.accion) && typeof p.que_es === 'string' && p.que_es.length > 20 && p.que_es.split('. ').length <= 2), true);
  prueba('las palancas siguen trayendo medido, esfuerzo, riesgo y regla (para el JSON y el .md)', todas.every(([, p]) => typeof p.medido === 'boolean' && p.esfuerzo && p.riesgo && p.regla_que_toca), true);
  const R = RT(cfg, s, {});
  prueba('recursos() entrega la acción y qué es de cada palanca', R.recursos.flatMap((r) => r.palancas).every((p) => p.accion && p.que_es), true);
  const df = M.definiciones(s);
  prueba('definiciones de una frase: adverso, estrés, cota baja, cota alta, bolsa', ['adverso', 'estres', 'cota_baja', 'cota_alta', 'bolsa'].every((k) => typeof df[k] === 'string' && df[k].length > 20), true);
  prueba('la definición de adverso sale del parámetro (mitad de la tarifa baja y 30 % de las visitas)', /mitad de la tarifa baja/.test(df.adverso) && /30 %/.test(df.adverso), true);
  prueba('la definición de cota baja trae 52 % y la de cota alta 98 %', /52 %/.test(df.cota_baja) && /98 %/.test(df.cota_alta), true);
  const ms = M.mensajes(cfg, s);
  prueba('mensaje de valor: cuarta parte del punto de venta y 0.03 % del ingreso', /cuarta parte/.test(ms.valor.frase) && /0\.03 %/.test(ms.valor.frase) && /Fudo Pro \(838\)/.test(ms.valor.frase), true);
  prueba('mensaje de valor: parte frente a Fudo Avanzado, Fudo Pro y Last.app Starter', ms.valor.calculo.comparaciones.map((x) => Math.round(x.parte * 100)).join(','), '35,27,23');
  prueba('el mensaje de valor lleva la advertencia de promedios y de la clase 722511', /Promedio/.test(ms.valor.advertencia) && /722511/.test(ms.valor.advertencia), true);
  prueba('mensaje de precio: 150 → 199; 225 → 225 o 249; 300 → 299; 450 → 299', ms.precio.por_mediana.map((x) => `${x.si_el_dueno_pagaria_alrededor_de}:${x.conviene_cobrar.join('/')}`).join(' '), '150:199 225:225/249 300:299 450:299');
  prueba('el mensaje de precio dice que no se sabe y que lo mide la prueba', /No sabemos/.test(ms.precio.frase) && /prueba de tres precios/.test(ms.precio.frase), true);
  const en = s.endutih_2024;
  prueba('ENDUTIH 2024: usuarios de internet (millones y parte)', `${en.usuarios_internet_millones}-${en.usuarios_internet_parte}`, '100.2-0.831');
  prueba('ENDUTIH 2024: parte de los usuarios que usa celular inteligente', en.por_equipo_de_conexion.celular_inteligente, 0.972);
  prueba('ENDUTIH 2024: tipo de conexión de usuarios de celular inteligente (ambos, sólo wifi, sólo datos)', Object.values(en.tipo_de_conexion_de_usuarios_de_celular_inteligente).map((x) => Math.round(x * 1000) / 10).join(','), '72.8,16.3,10.9');
  prueba('ENDUTIH 2024: el tipo de conexión suma 100 %', Math.round(Object.values(en.tipo_de_conexion_de_usuarios_de_celular_inteligente).reduce((a, b) => a + b, 0) * 1000), 1000);
}

// 16) RONDA 9 (puntos 1 a 5): tope de platillos decidido, meta de 12 meses, potencial de Chef, tablero de palancas, a dónde se va cada 100
{
  const cfg = CT();
  prueba('el tope de 150 platillos cuenta TODO, bebidas incluidas (decidido)', `${cfg.topes.gratuito.platillos}-${cfg.topes.gratuito.platillos_cuenta}`, '150-todo');
  const mt = M.meta12Meses(cfg, s);
  const r = mt.escenarios.recomendado.mes_12;
  prueba('meta de 12 meses (recomendado): restaurantes, de paga, ingresos por suscripción y por anuncios', `${r.restaurantes}-${Math.round(r.de_paga)}-${Math.round(r.ingreso_suscripcion)}-${Math.round(r.ingreso_anuncios)}`, '300-35-7822-1142');
  prueba('meta de 12 meses (recomendado): ingresos y margen de operación del mes 12', `${Math.round(r.ingresos)}-${Math.round(r.margen_operacion)}`, '8964-5749');
  prueba('meta de 12 meses: margen del mes 12 del peor y del mejor', `${Math.round(mt.escenarios.peor.mes_12.margen_operacion)}-${Math.round(mt.escenarios.mejor.mes_12.margen_operacion)}`, '431-19826');
  prueba('meta de 12 meses: el peor no lleva ingresos por anuncios en ningún mes', mt.escenarios.peor.acumulado_12_meses.ingreso_anuncios, 0);
  prueba('meta de 12 meses (recomendado): acumulado de ingresos y de margen de operación', `${Math.round(mt.escenarios.recomendado.acumulado_12_meses.ingresos)}-${Math.round(mt.escenarios.recomendado.acumulado_12_meses.margen_operacion)}`, '38814-22978');
  const a = mt.escenarios.recomendado.acumulado_12_meses;
  prueba('meta de 12 meses: ingresos − costos = margen de operación (acumulado)', Math.abs(a.ingresos - a.costos.total - a.margen_operacion) < 1e-6, true);
  const ch = M.potencialChef(cfg, s);
  prueba('potencial de Chef: universo y negocios en Chef', `${ch.universo}-${Math.round(ch.negocios_en_chef)}`, '104882-35427');
  prueba('potencial de Chef: parte de cada tramo en Chef (0 a 5, 6 a 10, el resto)', ch.tramos.map((x) => Math.round(x.parte_en_chef * 1000) / 10).join(','), '48.4,0,0,0,0,0,0');
  prueba('potencial de Chef en anuncios al mes: tarifa baja, media y alta', ['baja', 'media', 'alta'].map((k) => Math.round(ch.potencial_anuncios_mes[k].pesos_al_mes_de_todos_los_chef)).join(','), '152513,610053,1612284');
  prueba('potencial de Chef por negocio al mes (baja)', Math.round(ch.potencial_anuncios_mes.baja.pesos_por_negocio_al_mes * 100) / 100, 4.3, 0.01);
  prueba('potencial de Chef: el rango abarca los tres escenarios de tarifa', ch.potencial_anuncios_mes.baja.rango_por_visitas_y_parte[0] < ch.potencial_anuncios_mes.baja.pesos_al_mes_de_todos_los_chef && ch.potencial_anuncios_mes.alta.rango_por_visitas_y_parte[1] > ch.potencial_anuncios_mes.alta.pesos_al_mes_de_todos_los_chef, true);
  const tb = TB(cfg, s);
  prueba('palancas en el tablero (regla ≥ 15 % del recurso que tocan)', tb.en_tablero.join(','), 'historial_gratuito_30_dias,analitica_agregada_por_dia,retencion_analitica_7_dias,fila_por_visita_de_comensal,fila_por_visita_mas_platillo_por_dia,estado_en_memoria_60s,cerrar_lineas_ociosas');
  prueba('ajustes menores (fuera del tablero)', tb.ajustes_menores.join(','), 'indices_de_evento_minimos,tipos_mas_chicos,purga_claves_idempotencia,archivar_sesiones_de_paga,archivar_sesiones_de_todos_los_planes,pool_acotado');
  prueba('ganancia de índices y tipos: 11 % (debajo del umbral); con 10 % entrarían', `${Math.round(tb.palancas.indices_de_evento_minimos.ganancia_maxima * 100)}-${TB(cfg, s, 0.10).en_tablero.includes('indices_de_evento_minimos')}`, '11-true');
  prueba('cada palanca de recursos() trae en_tablero', RT(cfg, s, {}).recursos.flatMap((x) => x.palancas).every((p) => typeof p.en_tablero === 'boolean'), true);
  const mg = M.mensajes(cfg, s).margen;
  prueba('nombre exacto del margen', mg.nombre, 'margen de operación: antes de captación, sueldos e impuestos');
  prueba('de cada 100 pesos: se quedan (recomendado, mejor, peor)', ['recomendado', 'mejor', 'peor'].map((k) => mg.por_escenario[k].porcentaje).join(','), '67,67.9,45.4');
  prueba('el reparto por cada 100 suma 100 (los cuatro escenarios)', Object.values(mg.por_escenario).every((e) => Math.abs(Object.values(e.por_cada_100).reduce((x, y) => x + y, 0) - 100) < 0.05), true);
  prueba('soporte más comisión por cada 100 (recomendado y mejor): casi igual', `${mg.por_escenario.recomendado.soporte_mas_comision_por_cada_100}-${mg.por_escenario.mejor.soporte_mas_comision_por_cada_100}`, '30.3-29.8');
  prueba('la frase del margen dice que no es la ganancia final y por qué el porcentaje casi no sube', /no es la ganancia final/.test(mg.frase) && /soporte y la comisión crecen con cada cliente de paga/.test(mg.frase), true);
}

// 17) RONDA 9, punto 6: sueldo del fundador, modelos de ingreso, plataformas de referencia
{
  const cfg = CT();
  prueba('sueldo_fundador no tiene valor por omisión inventado (0)', s.sueldo_fundador, 0);
  prueba('salario mínimo general 2026 (DOF 9-dic-2025): zona general y frontera norte', `${s.salario_minimo.zona_general_dia}-${s.salario_minimo.zona_frontera_norte_dia}`, '315.04-440.87');
  const tb = M.tablaSueldos(cfg, s);
  prueba('niveles de sueldo (1, 3, 5 y 10 salarios mínimos al mes)', tb.map((f) => f.sueldo_mensual).join(','), '9577,28732,47886,95772');
  const rn = (k) => tb.map((f) => f.escenarios[k].restaurantes_necesarios).join(',');
  prueba('restaurantes necesarios para cubrir cada sueldo (recomendado)', rn('recomendado'), '550,1660,2680,5360');
  prueba('restaurantes necesarios para cubrir cada sueldo (mejor)', rn('mejor'), '165,490,830,1630');
  prueba('restaurantes necesarios para cubrir el sueldo de 1 salario mínimo (peor)', tb[0].escenarios.peor.restaurantes_necesarios, 4940);
  prueba('clientes de paga necesarios con 3 salarios mínimos (recomendado)', Math.round(tb[1].escenarios.recomendado.clientes_de_paga_necesarios), 192);
  prueba('mes en que el margen después de captación cubre 1 y 3 salarios mínimos (recomendado)', `${tb[0].escenarios.recomendado.mes_en_que_el_margen_despues_de_captacion_lo_cubre}-${tb[1].escenarios.recomendado.mes_en_que_el_margen_despues_de_captacion_lo_cubre}`, '21-32');
  prueba('el piso de verdad no cubre ningún sueldo', tb.every((f) => f.escenarios.piso_de_verdad.restaurantes_necesarios == null), true);
  const z = M.sueldo(cfg, s, 0);
  prueba('margen después de sueldo con sueldo 0 y 1,000 restaurantes (recomendado, peor, mejor)', ['recomendado', 'peor', 'mejor'].map((k) => Math.round(z.escenarios[k].margen_despues_de_sueldo.con_1000_restaurantes)).join(','), '17938,1968,58784');
  prueba('lo no modelado del sueldo: impuestos, contabilidad y seguridad social', ['impuestos', 'contabilidad', 'seguridad social'].every((x) => z.no_modelado.join(' ').includes(x)), true);
  const mi = M.modelosDeIngreso(cfg, s);
  prueba('cinco modelos de ingreso: dos vigentes y dos fuera de la v1', `${mi.modelos.length}-${mi.modelos.filter((x) => x.vigente).length}-${mi.modelos.filter((x) => x.fuera_de_la_v1).length}`, '5-2-2');
  const pm = (id) => mi.modelos.find((x) => x.id === id).potencial_pesos_por_restaurante_al_mes;
  prueba('suscripción: pesos por restaurante de paga y lo que deja', `${pm('suscripcion_del_restaurante').por_restaurante_de_paga}-${Math.round(pm('suscripcion_del_restaurante').deja_por_restaurante_de_paga)}`, '225-149');
  prueba('anuncios: pesos por restaurante gratuito con la tarifa baja, media y alta', ['baja', 'media', 'alta'].map((k) => pm('anuncios_del_comensal').por_restaurante_gratuito[k]).join(','), '4.3,17.2,45.5');
  prueba('comisión por transacción (fuera de la v1): 0 a 10 personas, centro y rango', `${pm('comision_por_transaccion').de_0_a_10_personas.centro}-${pm('comision_por_transaccion').de_0_a_10_personas.minimo}-${pm('comision_por_transaccion').de_0_a_10_personas.maximo}`, '322.4-53.7-967.1');
  prueba('visibilidad pagada: centro y rango por restaurante gratuito', `${pm('visibilidad_pagada').por_restaurante_gratuito.centro}-${pm('visibilidad_pagada').por_restaurante_gratuito.minimo}-${pm('visibilidad_pagada').por_restaurante_gratuito.maximo}`, '7.5-1-75');
  prueba('toda cifra de modelo no vigente dice que es supuesto', mi.modelos.filter((x) => !x.vigente).every((x) => /sin dato|SUPUESTO|supuestos/i.test(x.supuestos)), true);
  prueba('comisión y pago del comensal exigen ADR y mencionan «Qué NO construir» o la regla 10', mi.modelos.filter((x) => x.fuera_de_la_v1).every((x) => /Qué NO construir|regla 10/.test(x.exige) && /ADR/.test(x.exige)), true);
  prueba('no se venden datos y no hay datos personales del comensal', /no vende|Carta no vende datos/i.test(mi.no_vende_datos) && /regla 10/.test(mi.no_vende_datos), true);
  const pl = s.plataformas_referencia;
  prueba('plataformas verificadas en fuente primaria: Airbnb, YouTube, Meta y Uber', pl.filter((x) => x.verificada).map((x) => x.plataforma).join(','), 'Airbnb,YouTube,Meta,Uber');
  prueba('plataformas no verificadas se marcan: BlaBlaCar, Booking.com, Spotify y DiDi', pl.filter((x) => !x.verificada).map((x) => x.plataforma).join(','), 'BlaBlaCar,Booking.com,Spotify,DiDi');
  prueba('toda plataforma verificada trae enlace y fecha de consulta', pl.filter((x) => x.verificada).every((x) => /^https:\/\//.test(x.url) && x.consulta === '2026-11-17'), true);
}

// 18) RONDA 9, ampliación del punto 6: modelo de negocio, tipo de plataforma, hueco frente a Meniu
{
  const cfg = CT();
  const mn = M.modeloDeNegocio(cfg, s);
  const tp = mn.tipo_de_plataforma;
  prueba('se comparan cuatro modelos: comisión, anuncios más suscripción, atención y Carta v1', tp.comparacion.length, 4);
  const v1 = tp.comparacion.find((x) => /Carta v1/.test(x.modelo));
  prueba('la v1 no conecta oferta y demanda nuevas ni tiene transacción dentro', `${v1.conecta_oferta_y_demanda_nuevas}-${v1.hay_transaccion_dentro}`, 'false-false');
  prueba('la respuesta no da por buena la premisa', /^No:/.test(tp.respuesta), true);
  const v2 = tp.vision_v2_de_calvin;
  prueba('visión v2: tres rutas y cada una exige tocar la regla 10 o «Qué NO construir»', v2.rutas.length === 3 && v2.rutas.every((x) => x.que_cambiar_antes.some((y) => /regla 10/.test(y))), true);
  prueba('visión v2: lo legal sin fuente primaria queda por verificar con un abogado', /por verificar con un abogado/.test(v2.marco_legal.estado), true);
  prueba('anuncios: el pagante no ve anuncios', v2.anuncios.por_tarifa.media.pesos_por_pagante, 0);
  prueba('anuncios v2: por gratuito 17.2 → 18.9 pesos con la tarifa media', `${v2.anuncios.por_tarifa.media.pesos_por_gratuito_v1_todo_generico.toFixed(1)}-${v2.anuncios.por_tarifa.media.pesos_por_gratuito_v2_con_registrados.toFixed(1)}`, '17.2-18.9');
  prueba('anuncios v2: la tarifa personalizada es la genérica por 1.5', v2.anuncios.por_tarifa.media.tarifa_personalizada_por_mil, 21);
  const hz = mn.hueco_frente_a_meniu;
  prueba('Meniu: 225 pesos, prueba de 7 días y sin plan gratuito', `${hz.meniu.precio_mes}-${hz.meniu.prueba_dias}-${hz.meniu.plan_gratuito}`, '225-7-false');
  prueba('todas las páginas de Meniu traen enlace y consulta del 17-nov', hz.meniu.paginas.length === 7 && hz.meniu.paginas.every((x) => /^https:\/\/meniuapp\.com\//.test(x.url)) && hz.meniu.consulta === '2026-11-17', true);
  prueba('tabla de funciones: 13 filas, con tarjetas de lealtad y plan gratuito', `${hz.tabla.length}-${hz.tabla.some((x) => /lealtad/.test(x.funcion))}-${hz.tabla.some((x) => /gratuito/.test(x.funcion) && !x.meniu)}`, '13-true-true');
  prueba('hueco: negocios de 0 a 5 personas y clientes potenciales', `${hz.tamano_del_hueco.de_0_a_5_personas}-${hz.tamano_del_hueco.clientes_potenciales}`, '73193-104882');
  prueba('hueco: cuántos caben en Chef con 6 mesas y 1 cuenta (modelo) y su rango', `${Math.round(hz.tamano_del_hueco.caben_en_chef)}-${Math.round(hz.tamano_del_hueco.parte_que_cabe_en_chef * 1000) / 10}-${hz.tamano_del_hueco.rango_parte_que_cabe.map((x) => Math.round(x * 1000) / 10).join('/')}`, '35427-48.4-42.4/54.5');
  prueba('hueco: lo que es juicio se marca como supuesto', /sólo los conteos por estrato son medidos/.test(hz.tamano_del_hueco.supuesto), true);
  prueba('cómo opera: tres renglones por datos, dinero y usuarios', ['datos', 'dinero', 'usuarios'].every((k) => mn.como_opera[k].length === 3), true);
  prueba('datos: sin datos personales, sin venta de datos', /regla 10/.test(mn.como_opera.datos[0]) && /No se venden datos/.test(mn.como_opera.datos[2]), true);
  prueba('dinero: la v1 no cobra ni procesa pagos', /no cobra ni procesa pagos/.test(mn.como_opera.dinero[0]), true);
  const up = mn.una_pagina;
  prueba('una página: Master Chef 225 y anuncios de 4.3 a 45.5 pesos', /Master Chef 225 pesos/.test(up.quien_paga_y_cuanto.restaurante) && /4\.3 a 45\.5/.test(up.quien_paga_y_cuanto.anunciante), true);
  prueba('una página: tres etapas de ingreso (piloto, después de la Fase 3, más adelante)', up.fuentes_de_ingreso_por_etapa.length, 3);
  prueba('una página: costos (infraestructura de hoy en USD y gratuitos que sostiene un cliente de paga)', `${Math.round(up.costos.infraestructura_hoy_usd_mes * 10) / 10}-${Math.round(up.costos.gratuitos_que_sostiene_un_cliente_de_paga_sin_anuncios)}`, '10.2-125');
  prueba('una página: lo que hay que medir incluye la curva de pago y mesas y cuentas', up.que_hay_que_medir.some((x) => /curva de pago/.test(x)) && up.que_hay_que_medir.some((x) => /Mesas y cuentas/.test(x)), true);
  prueba('BlaBlaCar queda como no verificada', s.plataformas_referencia.filter((x) => !x.verificada).map((x) => x.plataforma).join(','), 'BlaBlaCar,Booking.com,Spotify,DiDi');
}

// 12b) ronda 10: costo de un platillo, carga por topes y potencial por tramo
{
  const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
  const cfg = M.configR15();
  const cp = M.costoDePlatillo(cfg, s);
  const f = (N) => cp.filas.find((x) => x.platillos === N);
  prueba('platillo: 557 bytes en la base (medido)', f(50).base_de_datos.bytes_por_platillo, 557);
  prueba('platillo: con 50 platillos caben 80 restaurantes con foto en R2 gratis', f(50).fotos_en_r2.restaurantes_que_caben_en_lo_gratis, 80);
  prueba('platillo: el disco con avisos es 182 con 50 y con 150 (casi no se mueve)', `${f(50).capacidad.con_avisos.disco}-${f(150).capacidad.con_avisos.disco}`, '182-182');
  prueba('platillo: el procesador con sondeo pierde menos de 5 % de 50 a 150', Math.abs(cp.efecto_de_subir_el_tope.procesador_con_sondeo) < 0.05, true);
  prueba('platillo: de paga por 1,000 baja de 137 a 116 al subir el tope', `${Math.round(f(50).clientes_de_paga_por_1000_por_el_tope)}-${Math.round(f(150).clientes_de_paga_por_1000_por_el_tope)}`, '137-116');
  prueba('platillo: el cuello con avisos sigue siendo el disco', f(150).capacidad.con_avisos.cuello, 'disco');
  const pt = M.potencialPorTramo(cfg, s);
  prueba('potencial por tramo: 73,193 negocios de 0 a 5 personas', Math.round(pt.tramos[0].negocios), 73193);
  prueba('potencial por tramo: sólo el primer tramo deja ingreso de anuncios', pt.tramos.filter((x) => x.ingreso_de_anuncios_al_mes.media > 0).length, 1);
  const r1 = M.recursos(cfg, s, { canal: 'eventos' });
  const r2 = M.recursos({ ...cfg, topes: { ...cfg.topes, gratuito: { ...cfg.topes.gratuito, mesas: 3 } } }, s, { canal: 'eventos' });
  prueba('los topes mueven «¿Qué nos limita?»: con 3 mesas cambia la capacidad', JSON.stringify(r1.recursos.map((x) => x.restaurantes_con_eventos)) !== JSON.stringify(r2.recursos.map((x) => x.restaurantes_con_eventos)), true);
}

// 12c) ronda 10: historia del disco y fila por visita de comensal
{
  const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
  const h = M.historiaDelDisco(M.configR15(), s);
  const o = Object.fromEntries(h.opciones.map((x) => [x.id, x]));
  prueba('fila por visita: 153 bytes por visita de comensal (medido, sin los filtros por comensal)', s.fila_por_visita.bytes_por_visita_de_comensal, 153);
  prueba('fila por visita: pesa el 11 % de la analítica de hoy; con el platillo y los filtros por día, 18 %', `${Math.round(s.fila_por_visita.sola * 100)}-${Math.round(s.fila_por_visita.con_platillo_por_dia * 100)}`, '11-18');
  prueba('fila por visita: actualizarla casi nunca es HOT con el fillfactor por omisión', s.fila_por_visita.actualizando_2_veces.hot < 0.01 * s.fila_por_visita.actualizando_2_veces.de, true);
  prueba('fila por visita: actualizarla 2 veces más que duplica la tabla', s.fila_por_visita.actualizando_2_veces.despues > 2 * s.fila_por_visita.actualizando_2_veces.antes, true);
  prueba('historia: ocho tablas en una mesa de tres', h.pasos.length, 8);
  prueba('historia: una mesa de tres deja 8.4 KB y la analítica es la mitad', `${(h.bytes_total / 1000).toFixed(1)}-${Math.round((h.bytes_de_analitica / h.bytes_total) * 100)}`, '8.4-49');
  prueba('historia: hoy caben 41 sin purga y 182 con historial a 30 días', `${o.hoy.restaurantes_que_caben_sin_purga}-${o.hoy.restaurantes_que_caben_con_historial_30_dias}`, '41-182');
  prueba('historia: la fila por visita sola deja caber 222 con historial a 30 días', o.fila_por_visita.restaurantes_que_caben_con_historial_30_dias, 222);
  prueba('historia: archivar no baja la analítica', o.archivar_paga.bytes_analitica_por_mesa_de_3, o.hoy.bytes_analitica_por_mesa_de_3);
}

// 12d) correcciones de la maestra: versión con fecha real, nota de la curva por tamaño y composición del disco
{
  const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
  const cfg = M.configR15();
  prueba('la versión lleva la fecha real (21 de noviembre, r16)', M.VERSION, '2026-11-21-r16');
  const pt = M.potencialPorTramo(cfg, s);
  prueba('potencial por tramo: nota de que la curva no distingue por tamaño', /no paga igual de fácil/.test(pt.nota_curva) && /prueba de precio del piloto/.test(pt.nota_curva), true);
  const c = M.composicionDelDisco(cfg, s);
  prueba('disco: 182 caben ahora y 279 antes', `${c.restaurantes_que_caben_por_disco}-${c.cifra_de_antes}`, '182-279');
  prueba('disco: los de paga llenan 68 % y los gratuitos 32 %', `${Math.round(c.parte_del_disco.de_paga * 100)}-${Math.round(c.parte_del_disco.gratuitos * 100)}`, '68-32');
  prueba('disco: el disco de un restaurante de paga es menos del 1 % de lo que paga', c.costo_del_disco_pesos_al_mes.parte_del_precio_que_se_va_en_disco < 0.01, true);
  prueba('disco: el resumen de recursos trae la composición', M.recursos(cfg, s, {}).composicion_del_disco.restaurantes_que_caben_por_disco, 182);
}

// 12e) segunda tanda de correcciones de la maestra: desglose del disco, +77 % frente a +22 %, grupo excluyente y rótulos
{
  const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
  const cfg = M.configR15();
  const c = M.composicionDelDisco(cfg, s);
  const d = c.desglose.parte_del_disco;
  prueba('desglose: los de paga son 63 % sesiones y órdenes; la analítica total, 21 %', `${Math.round(d.de_paga.sesiones_y_ordenes * 100)}-${Math.round(c.desglose.parte_analitica_del_disco * 100)}`, '63-21');
  const p = c.por_que_contar_por_dia_ya_no_da_tanto;
  prueba('contar por día: +77 % antes (279 → 495) y +22 % ahora (182 → 222)', `${p.contar_por_dia.cifra_de_antes.join('>')}-${Math.round(p.contar_por_dia.ganancia_de_antes * 100)}-${p.contar_por_dia.cifra_ahora.join('>')}-${Math.round(p.contar_por_dia.ganancia_ahora * 100)}`, '279>495-77-182>222-22');
  prueba('archivar: 182 → 347 (+91 %)', `${p.archivar.cifra_ahora.join('>')}-${Math.round(p.archivar.ganancia_ahora * 100)}`, '182>347-91');
  const g = M.palancasEnTablero(cfg, s).grupos_excluyentes.forma_de_guardar_la_analitica;
  prueba('grupo excluyente: contar por día, fila por visita y fila más platillo están en el mismo grupo', ['analitica_agregada_por_dia', 'fila_por_visita_de_comensal', 'fila_por_visita_mas_platillo_por_dia'].every((x) => g.miembros.includes(x)), true);
  prueba('el modelo no apila: contar por día con fila por visita da lo mismo que contar por día solo', M.efectosPalancas({ ...cfg, palancas: ['analitica_agregada_por_dia', 'fila_por_visita_de_comensal'] }, s).eventos_disco, M.efectosPalancas({ ...cfg, palancas: ['analitica_agregada_por_dia'] }, s).eventos_disco);
  prueba('recursos devuelve los grupos excluyentes', Object.keys(M.recursos(cfg, s, {}).grupos_excluyentes).includes('forma_de_guardar_la_analitica'), true);
  const v2 = M.modeloDeNegocio(cfg, s).tipo_de_plataforma.vision_v2_de_calvin;
  prueba('visión v2: los anuncios van con la Spec 002 y no en la Fase 3', /Spec 002/.test(v2.orden_sugerido[0]) && /no están en las tareas de la Fase 3/.test(v2.orden_sugerido[0]), true);
}

// 12f) `resumen` y `recursos` dan la misma capacidad (una sola cuenta con la carga por topes)
{
  const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
  const cfg = M.configR15();
  const rs = M.resumen(cfg, s);
  const R = M.recursos(cfg, s, {});
  const f = (k) => rs.cifras.find((x) => x.clave === k);
  prueba('resumen = recursos: con avisos y la propuesta de 30 días', f('restaurantes_que_caben_propuesta_30_dias').recomendado, R.cuello_con_eventos.con_historial_30_dias.restaurantes);
  prueba('resumen = recursos: con sondeo y la propuesta de 30 días', f('restaurantes_que_caben_propuesta_30_dias').peor, R.cuello_hoy.con_historial_30_dias.restaurantes);
  prueba('resumen = recursos: con la política vigente (03 §7) y avisos', f('restaurantes_que_caben').recomendado, R.disco_por_historial.find((x) => x.meses_historial === '03§7').restaurantes_por_disco);
  prueba('recursos() sin argumentos = la primera fila de capacidad de resumen (política vigente, 03 §7)', `${R.cuello_con_eventos.restaurantes}-${R.cuello_hoy.restaurantes}`, `${f('restaurantes_que_caben').recomendado}-${f('restaurantes_que_caben').peor}`);
  const R12 = M.recursos(cfg, s, { meses_historial: 12 });
  prueba('resumen = recursos con el estado con nombre «sin purga a 12 meses»', f('restaurantes_que_caben_sin_purga').recomendado, R12.cuello_con_eventos.restaurantes);
  prueba('el estado por omisión de recursos es la política vigente y lo dice', /03 §7/.test(R.estado.nota) && R.estado.meses_historial === '03§7', true);
  prueba('resumen: política vigente 28, propuesta 182 / 173 y sin purga 41 (ya no 279 / 148 / 23)', `${f('restaurantes_que_caben').recomendado}-${f('restaurantes_que_caben_propuesta_30_dias').recomendado}-${f('restaurantes_que_caben_propuesta_30_dias').peor}-${f('restaurantes_que_caben_sin_purga').recomendado}`, '28-182-173-41');
}

// 12g) ronda 11: una sola definición de carga para el gratuito en todo el modelo
{
  const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
  const cfg = M.configR15();
  const c30 = M.conHistorialGratuito({ ...cfg, palancas: [...(cfg.palancas ?? []), 'historial_gratuito_30_dias'] }, s, 1);
  const R = M.recursos(cfg, s, {});
  const capDisco = R.recursos.find((x) => x.recurso === 'disco').con_historial_30_dias.restaurantes_con_eventos;
  prueba('evaluar y recursos: con el disco lleno de recursos el escalón sigue en Hobby (182)', M.evaluar(c30, s, capDisco, { curva: 'media' }).capacidad.escalon, 'hobby_eventos');
  prueba('evaluar y recursos: con uno más ya pide Pro (183)', M.evaluar(c30, s, capDisco + 1, { curva: 'media' }).capacidad.escalon, 'pro_2');
  const pf = M.perfilDeCarga(cfg, s);
  prueba('el MB del gratuito es el mismo en evaluar y en perfilDeCarga', M.evaluar(cfg, s, 1000, { curva: 'media' }).capacidad.mb_por_restaurante.gratuito, pf.mb_gratuito, 1e-9);
  prueba('la bolsa usa la misma carga: con el sondeo de hoy caben los de cabenGratuitosEnEscalon', M.rangoBolsa(cfg, s, 1000).caben_con_el_sondeo_de_hoy, M.cabenGratuitosEnEscalon(cfg, s, 'hobby_sondeo'));
  prueba('el gratuito por topes carga 1,080 visitas (6 mesas × 180) y 60 % del típico', `${M.cargaGratuita(cfg, s).visitas_mes}-${M.cargaGratuita(cfg, s).razon}`, '1080-0.6');
  prueba('la carga típica sólo existe como comparación: configInicial no la usa', cfg.carga ?? 'topes', 'topes');
  const cc = M.comparacionDeCarga(cfg, s);
  const A = cc.antes_tipica_no_vigente, D = cc.despues_por_topes_vigente;
  prueba('antes → después: margen recomendado con 1,000 restaurantes 20,024 → 18,591', `${Math.round(A.margen_operacion_1000.recomendado)}-${Math.round(D.margen_operacion_1000.recomendado)}`, '20024-18591');
  prueba('antes → después: margen peor 2,390 → 2,388 y estrés −1,109 → −1,532', `${Math.round(A.margen_operacion_1000.peor)}-${Math.round(D.margen_operacion_1000.peor)}-${Math.round(A.margen_operacion_1000.piso_de_verdad)}-${Math.round(D.margen_operacion_1000.piso_de_verdad)}`, '2390-2388--1109--1532');
  prueba('antes → después: gratuitos que sostiene un pagante sin anuncios 125 → 144', `${Math.round(A.gratuitos_que_sostiene_un_pagante.sin_anuncios)}-${Math.round(D.gratuitos_que_sostiene_un_pagante.sin_anuncios)}`, '125-144');
  prueba('antes → después: sueldo de 1 salario mínimo, 550 → 600 restaurantes', `${A.sueldo[0].restaurantes_necesarios}-${D.sueldo[0].restaurantes_necesarios}`, '550-600');
  prueba('antes → después: bolsa de 500 pesos, 279 → 405', `${A.bolsa[0].centro}-${D.bolsa[0].centro}`, '279-405');
  prueba('una página con la carga por topes: anuncios de 2.6 a 27.3 pesos por gratuito', /2\.6 a 27\.3/.test(M.modeloDeNegocio(cfg, s).una_pagina.quien_paga_y_cuanto.anunciante), true);
  prueba('anuncios por gratuito, tarifa baja y media: 4.31 → 2.58 y 17.22 → 10.33', [A, D].flatMap((x) => [x.ingreso_de_anuncios_por_gratuito_por_tarifa.baja, x.ingreso_de_anuncios_por_gratuito_por_tarifa.media]).map((x) => Math.round(x * 100) / 100).join('-'), '4.31-17.22-2.58-10.33');
  const an = M.anunciosGenericoYPersonalizado(cfg, s).por_tarifa.media;
  prueba('anuncios v1 y v2 con la carga por topes (tarifa media): 10.33 → 11.37, rango 10.35 a 21.49', `${an.pesos_por_gratuito_v1_todo_generico.toFixed(2)}-${an.pesos_por_gratuito_v2_con_registrados.toFixed(2)}-${an.rango_v2[0].toFixed(2)}-${an.rango_v2[1].toFixed(2)}`, '10.33-11.37-10.35-21.49');
  prueba('antes → después: capacidad con avisos 279 → 182', `${A.capacidad.con_avisos}-${D.capacidad.con_avisos}`, '279-182');
  prueba('sensibilidad 90, 180 y 360 visitas por mesa: capacidad con avisos 215, 182 y 138', cc.sensibilidad_visitas_por_mesa.map((x) => x.capacidad.con_avisos).join(','), '215,182,138');
  prueba('sensibilidad: el margen recomendado sube con las visitas (anuncios)', cc.sensibilidad_visitas_por_mesa.map((x) => Math.round(x.margen_operacion_recomendado_1000)).join(','), '17505,18591,20666');
  prueba('la respuesta dice que no hay datos para la distribución de mesas', /No hay datos para usar la distribución de mesas/.test(cc.tope_entero_o_distribucion), true);
  // ningún informe generado cita las cifras de la carga típica como vigentes
  const informes = ['2026-11-14-modelo-de-escenarios.md', '2026-11-14-recomendaciones.md', '2026-11-14-chequeo-de-margenes.md', '2026-11-14-precio-de-entrada.md', '2026-11-14-banderas-de-operacion.md', '2026-11-17-como-gana-dinero-carta.md', '2026-11-17-costo-de-platillo.md', '2026-11-17-historia-del-disco.md'];
  const viejas = /(?<![\d,])279(?![\d,])|(?<![\d,])148(?![\d,])(?! cartas)(?!;)|\b23 restaurantes/;
  for (const f of informes) {
    const texto = readFileSync(join(aqui, f), 'utf8').split('\n').filter((l) => !(f === '2026-11-14-banderas-de-operacion.md' && /^\| .*(Hobby|Pro) \|/.test(l)));
    prueba(`el informe ${f} no cita 279, 148 ni 23 como vigentes`, texto.filter((l) => viejas.test(l)).length, 0);
  }
}

// 12h) ronda 12, commit 1: archivar con alcances, política de historial, dos cuentas del sueldo, redacción y fila sin filtros
{
  const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
  const cfg = M.configR15();
  const h = M.historiaDelDisco(cfg, s);
  const comb = (a, n) => h.combinaciones.find((x) => x.archivo === a && x.analitica === n);
  prueba('archivar sólo las de paga, sin recortar al gratuito (12 meses): 46 sin la fila y 82 con la fila', `${comb('archivar sólo las de paga', 'una fila por evento (hoy)').caben_con_el_gratuito_a_12_meses_sin_purga}-${comb('archivar sólo las de paga', 'fila por visita').caben_con_el_gratuito_a_12_meses_sin_purga}`, '46-82');
  prueba('archivar las de todos los planes con la fila: 216 sin purga con la fila (el gratuito también queda en 3 meses)', comb('archivar las de todos los planes', 'fila por visita').caben_con_el_gratuito_a_12_meses_sin_purga, 216);
  prueba('archivar sólo las de paga no recorta al gratuito: su MB no cambia', M.cargaGratuita(M.conHistorialGratuito({ ...cfg, palancas: ['archivar_sesiones_de_paga'] }, s, 12), s).mb, M.cargaGratuita(M.conHistorialGratuito(cfg, s, 12), s).mb, 1e-9);
  prueba('archivar las de todos los planes sí recorta al gratuito', M.cargaGratuita(M.conHistorialGratuito({ ...cfg, palancas: ['archivar_sesiones_de_todos_los_planes'] }, s, 12), s).mb < M.cargaGratuita(M.conHistorialGratuito(cfg, s, 12), s).mb, true);
  prueba('los dos alcances del archivo son un grupo excluyente', M.palancasEnTablero(cfg, s).grupos_excluyentes.alcance_del_archivo.miembros.join(','), 'archivar_sesiones_de_paga,archivar_sesiones_de_todos_los_planes');
  const pol = M.politicasDeHistorial(cfg, s);
  prueba('el dinero según el historial: 14,752 (03 §7) · 15,878 (12 meses) · 18,591 (30 días, propuesta)', pol.map((x) => Math.round(x.margen_operacion_1000.recomendado)).join(' · '), '14752 · 15878 · 18591');
  prueba('sueldo de 1 salario mínimo en régimen: 760 · 700 · 600 restaurantes', pol.map((x) => x.sueldo_de_1_salario_minimo.restaurantes_necesarios_en_regimen).join(' · '), '760 · 700 · 600');
  prueba('la base del modelo es la política vigente: 24 meses de sesiones y 13 de analítica', `${cfg.topes.gratuito.meses_en_linea}-${cfg.disco.meses_analitica_en_linea.gratuito}`, '24-13');
  prueba('resumen, meta de 12 meses y sueldo traen la política y la propuesta aparte', /03 §7/.test(M.meta12Meses(cfg, s).politica_de_historial) && M.meta12Meses(cfg, s).con_la_propuesta_de_30_dias != null && M.sueldo(cfg, s, 9577).con_la_propuesta_de_30_dias != null, true);
  const su = M.sueldo(cfg, s, 9577).con_la_propuesta_de_30_dias.recomendado;
  prueba('sueldo de 1 salario mínimo con la propuesta: 600 restaurantes en régimen, los alcanza el mes 17, el margen lo cubre el mes 22 con 1,008', `${su.restaurantes_necesarios_en_regimen}-${su.mes_en_que_la_proyeccion_llega_a_esos_restaurantes}-${su.mes_en_que_el_margen_despues_de_captacion_lo_cubre}-${su.restaurantes_ese_mes_de_la_proyeccion}`, '600-17-22-1008');
  prueba('la curva de crecimiento se rotula como ajuste a dos metas', /extrapolación/.test(M.sueldo(cfg, s, 9577).curva_de_crecimiento), true);
  prueba('la fila por visita no lleva filtros por comensal', M.PALANCAS.fila_por_visita_de_comensal.que_es.includes('no van por comensal') && !/filtros_n|filtros_seg/.test(readFileSync(join(aqui, '2026-11-17-fila-por-visita-medir.py'), 'utf8').replace(/#.*|"""[\s\S]*?"""/g, '')), true);
  prueba('el informe de recursos no cita «antes: 279» ni «279 → 495»', !/antes: 279|279 → 495/.test(readFileSync(join(aqui, '2026-11-14-recursos-y-palancas.md'), 'utf8')), true);
  prueba('los guiones de medición piden PGPASSWORD y no guardan contraseña', ['2026-11-17-fila-por-visita-medir.py', '2026-11-17-platillo-medir.py', '2026-11-14-recursos-medir.py', '2026-11-14-disco-e-historial-medir.py'].every((f) => { const x = readFileSync(join(aqui, f), 'utf8'); return /PGPASSWORD/.test(x) && !/carta_dev_password/.test(x); }), true);
}

// 12i) ronda 12, commit 2: sensibilidades y pruebas más duras
{
  const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
  const cfg = M.configR15();
  const sc = M.sensibilidadDeLaCapacidad(cfg, s);
  prueba('G: con la parte de paga de peor / recomendado / mejor (2.3 / 11.6 / 38.2 %) el procesador con sondeo da 212 / 173 / 113', sc.parte_que_paga.map((x) => x.procesador_con_sondeo).join('/'), '212/173/113');
  prueba('G: y el disco con la propuesta de 30 días 371 / 182 / 73', sc.parte_que_paga.map((x) => x.disco).join('/'), '371/182/73');
  prueba('G: la parte que paga es 2.3 / 11.6 / 38.2 %', sc.parte_que_paga.map((x) => (x.parte_que_paga * 100).toFixed(1)).join('/'), '2.3/11.6/38.2');
  prueba('G: con todos los pagantes medianos el disco da 230; con los tamaños del modelo de estratos, 229', `${sc.mezcla_de_paga.find((x) => x.id === 'todos_medianos').disco}/${sc.mezcla_de_paga.find((x) => x.id === 'segun_el_modelo_de_estratos').disco}`, '230/229');
  prueba('G: 54 % de los pagantes del modelo son negocios de 0 a 5 personas', Math.round(sc.parte_de_los_pagantes_de_0_a_5_personas * 100), 54);
  const ej = Object.fromEntries(M.escenariosPorEje(cfg, s).map((x) => [x.id, x]));
  prueba('H: piso con cero anuncios −2,162 (propuesta) y estrés −1,532', `${Math.round(ej.piso_sin_anuncios.margen_con_la_propuesta_de_30_dias)}/${Math.round(ej.estres.margen_con_la_propuesta_de_30_dias)}`, '-2162/-1532');
  prueba('H: el soporte de la paga a 150 baja el recomendado a 8,162 (propuesta)', Math.round(ej.soporte_150.margen_con_la_propuesta_de_30_dias), 8162);
  prueba('H: «peor» +2,388 no es lo peor', ej.peor.margen_con_la_propuesta_de_30_dias > ej.piso_sin_anuncios.margen_con_la_propuesta_de_30_dias, true);
  const md = M.sensibilidadDeLaMediana(cfg, s).filas.filter((f) => f.techo === 0.35 && f.historial.startsWith('propuesta'));
  prueba('I: con la mediana real en 150 / 225 / 300 el margen es 10,003 / 18,591 / 24,908 (propuesta)', md.map((f) => Math.round(f.margen_operacion)).join('/'), '10003/18591/24908');
  prueba('I: y los pagantes 58 / 116 / 159 por 1,000', md.map((f) => Math.round(f.pagantes_por_1000)).join('/'), '58/116/159');
  const cp = M.costoDePlatillo(cfg, s);
  const v = (N, cota) => cp.filas.find((x) => x.platillos === N).con_la_mezcla_de_paga_variable[cota];
  prueba('J: tope 50 con la cota baja: 166 pagantes y 142 restaurantes por disco', `${Math.round(v(50, 'baja').pagantes_por_1000)}/${v(50, 'baja').disco_con_avisos}`, '166/142');
  prueba('J: tope 150 con la cota alta: 116 pagantes y 182 por disco', `${Math.round(v(150, 'alta').pagantes_por_1000)}/${v(150, 'alta').disco_con_avisos}`, '116/182');
  const f80 = cp.filas.find((x) => x.platillos === 80), f100 = cp.filas.find((x) => x.platillos === 100);
  prueba('costoDePlatillo en 80 y 100: fotos que caben en R2 (50 y 40), JSON del menú 60 y 75 KB, 44,560 y 55,700 bytes por restaurante', `${f80.fotos_en_r2.restaurantes_que_caben_en_lo_gratis}/${f100.fotos_en_r2.restaurantes_que_caben_en_lo_gratis}/${Math.round(f80.menu.json_bytes / 1000)}/${Math.round(f100.menu.json_bytes / 1000)}/${f80.base_de_datos.bytes_por_restaurante}/${f100.base_de_datos.bytes_por_restaurante}`, '50/40/60/75/44560/55700');
  prueba('costoDePlatillo en 80 y 100: de paga por 1,000 con la cota alta 121 y 117', `${Math.round(f80.clientes_de_paga_por_1000_por_el_tope)}/${Math.round(f100.clientes_de_paga_por_1000_por_el_tope)}`, '121/117');
  // una cuenta a mano desde los parámetros (no contra perfilDeCarga, que usa el mismo código)
  const d = s.disco_perfiles.chico, pl = s.platillo, g = cfg.topes.gratuito;
  const ratio = (g.mesas * s.perfil_por_topes.visitas_por_mesa_mes) / s.visitas_mes_gratuito;
  const aMano = (d.mb_fijo - pl.platillos_del_perfil_chico * (pl.bytes_en_la_base / 1e6) + g.platillos * (pl.bytes_en_la_base / 1e6)) + ratio * (g.meses_en_linea * d.mb_mes_visitas + cfg.disco.meses_analitica_en_linea.gratuito * d.mb_mes_eventos);
  prueba('la carga del gratuito (MB) a mano desde los parámetros coincide con el modelo', M.cargaGratuita(cfg, s).mb, aMano, 1e-9);
  prueba('y con las visitas a mano: 6 mesas × 180 = 1,080; razón 0.6', `${g.mesas * s.perfil_por_topes.visitas_por_mesa_mes}/${ratio}`, '1080/0.6');
  // no apilar: dos formas de guardar la analítica juntas dan lo mismo que la primera de la prioridad
  const grp = M.GRUPOS_EXCLUYENTES.forma_de_guardar_la_analitica.prioridad.filter((x) => M.PALANCAS[x]);
  let apiladas = 0;
  for (let i = 0; i < grp.length; i++) for (let j = i + 1; j < grp.length; j++) { const ambas = M.efectosPalancas({ ...cfg, palancas: [grp[i], grp[j]] }, s).eventos_disco; const primera = M.efectosPalancas({ ...cfg, palancas: [grp[i]] }, s).eventos_disco; if (Math.abs(ambas - primera) > 1e-12) apiladas++; }
  prueba('ninguna pareja del grupo de formas de guardar la analítica se apila (la de mayor prioridad manda)', apiladas, 0);
  prueba('fila por visita + fila más platillo no se apilan', M.efectosPalancas({ ...cfg, palancas: ['fila_por_visita_de_comensal', 'fila_por_visita_mas_platillo_por_dia'] }, s).eventos_disco, s.fila_por_visita.con_platillo_por_dia);
  const cc = M.comparacionDeCarga(cfg, s);
  prueba('el margen de «mejor» con la carga por topes es 61,364 (literal)', Math.round(cc.despues_por_topes_vigente.margen_operacion_1000.mejor), 61364);
}

// 12j) ronda 13 (r16): el plan Chef que decidió Calvin el 21 de noviembre
{
  const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
  const cfg = M.configInicial();
  const g = cfg.topes.gratuito;
  prueba('Chef (21-nov): 6 mesas · 3 cuentas de personal · 50 platillos', `${g.mesas}·${g.cuentas}·${g.platillos}`, '6·3·50');
  prueba('el plan Chef de la ronda 15 sigue disponible para comparar: 6·1·150', `${M.configR15().topes.gratuito.mesas}·${M.configR15().topes.gratuito.cuentas}·${M.configR15().topes.gratuito.platillos}`, '6·1·150');
  const c = M.comparacionPlanChef(cfg, s);
  const A = c.antes_plan_chef_ronda_15, D = c.despues_plan_chef_21_nov;
  const r = (x) => Math.round(x);
  prueba('líneas abiertas por gratuito en la hora pico: 2.04 → 4.04 (una línea por cuenta de personal y 1.02 de los comensales)', `${A.carga_del_gratuito.lineas_abiertas_en_la_hora_pico.toFixed(2)}→${D.carga_del_gratuito.lineas_abiertas_en_la_hora_pico.toFixed(2)}`, '2.04→4.04');
  prueba('la diferencia de líneas es exactamente 2 (dos cuentas de personal más)', Math.abs(D.carga_del_gratuito.lineas_abiertas_en_la_hora_pico - A.carga_del_gratuito.lineas_abiertas_en_la_hora_pico - 2) < 1e-9, true);
  prueba('quién cae en Chef: 0 a 5 personas 48.4 → 44.3 %, 6 a 10 personas 0 → 7.8 %', `${(A.quien_cae_en_chef.negocios_de_0_a_5_personas_dentro * 100).toFixed(1)}→${(D.quien_cae_en_chef.negocios_de_0_a_5_personas_dentro * 100).toFixed(1)}/${(A.quien_cae_en_chef.negocios_de_6_a_10_personas_dentro * 100).toFixed(1)}→${(D.quien_cae_en_chef.negocios_de_6_a_10_personas_dentro * 100).toFixed(1)}`, '48.4→44.3/0.0→7.8');
  prueba('cobertura de platillos con tope 50: 14.7 % (cota baja) a 62.9 % (cota alta)', `${(D.quien_cae_en_chef.cobertura_de_platillos_cota_baja * 100).toFixed(1)}-${(D.quien_cae_en_chef.cobertura_de_platillos_cota_alta * 100).toFixed(1)}`, '14.7-62.9');
  prueba('de paga por 1,000: 116 → 119', `${r(A.pagantes_por_1000)}→${r(D.pagantes_por_1000)}`, '116→119');
  prueba('margen recomendado con 1,000 restaurantes 14,752 → 15,221 (política vigente) y 18,591 → 19,058 (propuesta)', `${r(A.margen_operacion_1000.recomendado)}→${r(D.margen_operacion_1000.recomendado)}/${r(A.con_la_propuesta_de_30_dias.margen_operacion_1000.recomendado)}→${r(D.con_la_propuesta_de_30_dias.margen_operacion_1000.recomendado)}`, '14752→15221/18591→19058');
  prueba('margen peor / mejor / estrés: −1,362 · 60,439 · −5,330', `${r(D.margen_operacion_1000.peor)}·${r(D.margen_operacion_1000.mejor)}·${r(D.margen_operacion_1000.piso_de_verdad)}`, '-1362·60439·-5330');
  prueba('gratuitos que sostiene un pagante 35 → 36; costo por gratuito 3.92 → 3.85; costo por pagante 87.49 → 87.24', `${r(A.gratuitos_que_sostiene_un_pagante_sin_anuncios)}→${r(D.gratuitos_que_sostiene_un_pagante_sin_anuncios)}/${A.costo_por_gratuito.toFixed(2)}→${D.costo_por_gratuito.toFixed(2)}/${A.costo_por_cliente_de_paga.toFixed(2)}→${D.costo_por_cliente_de_paga.toFixed(2)}`, '35→36/3.92→3.85/87.49→87.24');
  prueba('capacidad: política vigente 28 → 28; propuesta 182/173 → 179/179; sin purga 41 → 41', `${A.capacidad.politica_vigente.con_avisos}→${D.capacidad.politica_vigente.con_avisos}/${A.capacidad.propuesta_30_dias.con_avisos}/${A.capacidad.propuesta_30_dias.con_sondeo}→${D.capacidad.propuesta_30_dias.con_avisos}/${D.capacidad.propuesta_30_dias.con_sondeo}/${A.capacidad.sin_purga_12_meses}→${D.capacidad.sin_purga_12_meses}`, '28→28/182/173→179/179/41→41');
  prueba('las líneas abiertas no son el recurso que limita con tres cuentas', M.recursos(cfg, s, {}).recursos.find((x) => x.recurso === 'lineas').restaurantes_con_eventos > 1000, true);
  prueba('los supuestos nuevos incluyen la línea por cuenta de personal en la hora pico', c.supuestos_nuevos.some((x) => /una por teléfono del personal/.test(x)), true);
  prueba('el sueldo de 1 salario mínimo: 760 → 740 restaurantes en régimen', `${A.sueldo_de_1_salario_minimo.restaurantes_en_regimen}→${D.sueldo_de_1_salario_minimo.restaurantes_en_regimen}`, '760→740');
}

// 12k) bloque B: el disco por registro (archivo de datos medido con pageinspect; lo lee el informe interactivo)
{
  const d = JSON.parse(readFileSync(join(aqui, '2026-11-21-disco-por-registro.json'), 'utf8'));
  const todasFilas = [...d.tablas_de_la_mesa.flatMap((t) => t.filas), ...d.formas.flatMap((f) => f.tablas.flatMap((t) => t.filas))];
  const suma = (a) => a.reduce((x, y) => x + y, 0);
  prueba('cada fila: bytes de datos = cabecera + columnas + relleno + puntero de línea', todasFilas.every((f) => f.bytes_datos === f.cabecera_bytes + suma(f.columnas.map((c) => c.bytes)) + f.relleno_bytes + f.puntero_de_linea_bytes), true);
  prueba('cada fila: total = datos + índices', todasFilas.every((f) => f.bytes_total === f.bytes_datos + f.bytes_indices && f.bytes_indices === suma(f.indices.map((i) => i.bytes))), true);
  prueba('cada tabla suma sus filas', [...d.tablas_de_la_mesa, ...d.formas.flatMap((f) => f.tablas)].every((t) => t.total_bytes === suma(t.filas.map((f) => f.bytes_total))), true);
  prueba('la mesa sin analítica: 4,204 bytes', d.bytes_de_la_mesa_sin_analitica, 4204);
  prueba('la mesa tiene 1 sesión, 3 miembros, 3 órdenes, 9 platillos, 1 comanda, 3 enlaces y 1 llamada', d.tablas_de_la_mesa.map((t) => t.filas.length).join(','), '1,3,3,9,1,3,1');
  const f = Object.fromEntries(d.formas.map((x) => [x.id, x]));
  prueba('analítica de hoy: 12 eventos, 4,824 bytes, 53 % de la mesa', `${f.hoy.tablas[0].filas.length}-${f.hoy.bytes_analitica}-${Math.round(f.hoy.parte_analitica * 100)}`, '12-4824-53');
  prueba('contar por día 1,024 · fila por visita 384 · combinación 1,024 bytes', `${f.contar_por_dia.bytes_analitica}-${f.fila_por_visita.bytes_analitica}-${f.fila_mas_platillo_y_filtros_por_dia.bytes_analitica}`, '1024-384-1024');
  prueba('las tres formas propuestas están marcadas como propuesta y la actual como base', `${f.hoy.estado}/${f.contar_por_dia.estado}/${f.fila_por_visita.estado}`, 'base_actual/propuesta/propuesta');
  prueba('la fila de la sesión: 100 de tupla (24 de cabecera) y seis entradas de índice (176)', `${d.tablas_de_la_mesa[0].filas[0].bytes_datos}-${d.tablas_de_la_mesa[0].filas[0].cabecera_bytes}-${d.tablas_de_la_mesa[0].filas[0].bytes_indices}`, '100-24-176');
  const ids = new Set(todasFilas.map((x) => x.id));
  prueba('todo lo que un paso escribe existe como fila', d.pasos.every((p) => p.escribe.every((e) => ids.has(e.fila))), true);
  prueba('la fila por visita no lleva filtros por comensal', !f.fila_por_visita.tablas[0].filas[0].columnas.some((c) => /filtro/.test(c.nombre)), true);
  prueba('la diferencia con el informe se explica y se concilia tabla por tabla', d.diferencia_con_el_informe.explicacion.length >= 4 && d.diferencia_con_el_informe.conciliacion_por_tabla.length === 8, true);
}

// 13) los archivos generados y commiteados coinciden con la salida del modelo (si alguien cambia el modelo y no regenera, esto falla)
{
  const tmp = mkdtempSync(join(tmpdir(), 'carta-gen-'));
  const entorno = { ...process.env, CARTA_SALIDA: tmp };
  const gens = [['node', '2026-11-14-corre-escenarios.mjs', ['2026-11-14-modelo-de-escenarios-resultados.json', '2026-11-14-modelo-de-escenarios.md', '2026-11-14-chequeo-de-margenes.md', '2026-11-14-precio-de-entrada.md', '2026-11-14-recomendaciones.json', '2026-11-14-recomendaciones.md']],
    ['node', '2026-11-14-banderas.mjs', ['2026-11-14-banderas-de-operacion.json', '2026-11-14-banderas-de-operacion.md']],
    ['node', '2026-11-14-recursos.mjs', ['2026-11-14-recursos-y-palancas.json', '2026-11-14-recursos-y-palancas.md']],
    ['node', '2026-11-17-como-gana-dinero.mjs', ['2026-11-17-como-gana-dinero-carta.json', '2026-11-17-como-gana-dinero-carta.md']],
    ['node', '2026-11-21-plan-chef.mjs', ['2026-11-21-plan-chef.json', '../historia/2026-11-21-plan-chef-antes-y-despues.md']],
    ['node', '2026-11-17-carga-unica.mjs', ['2026-11-17-carga-unica.json', '../historia/2026-11-17-carga-unica-antes-y-despues.md']],
    ['node', '2026-11-17-historia-del-disco.mjs', ['2026-11-17-historia-del-disco.json', '2026-11-17-historia-del-disco.md']],
    ['node', '2026-11-17-costo-de-platillo.mjs', ['2026-11-17-costo-de-platillo.json', '2026-11-17-costo-de-platillo.md']],
    ['python3', '2026-11-16-cobertura-platillos.py', ['2026-11-16-cobertura-platillos-datos.json']],
    ['python3', '2026-11-14-parametros-generador.py', ['2026-11-14-parametros.json']]];
  for (const [cmd, script, salidas] of gens) {
    const args = cmd === 'python3' ? ['-I', join(aqui, script)] : [join(aqui, script)];
    execFileSync(cmd, args, { env: entorno, stdio: 'ignore' });
    for (const f of salidas) prueba(`el archivo commiteado coincide con la salida del generador: ${f}`, readFileSync(join(aqui, f), 'utf8') === readFileSync(join(tmp, f.split('/').pop()), 'utf8'), true);
  }
}

console.log(fallas === 0 ? '\nTodas las pruebas pasan.' : `\n${fallas} prueba(s) fallan.`);
process.exit(fallas === 0 ? 0 : 1);
