// Pruebas del modelo de escenarios: reproduce las cifras ya publicadas. Uso: node 2026-11-14-pruebas.mjs
import { readFileSync } from 'node:fs';
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

// 3) escalera de capacidad en gratuitos típicos: 299 (disco, Hobby con eventos), 1,064, 1,896, 2,116
const sPub = { ...s, disco_gratuito_tipico_mb_publicado_activo: true };
const capDisco = Math.floor((5000 * 1 - s.base_vacia_mb) / sPub.disco_gratuito_tipico_mb_publicado);
prueba('Hobby con eventos: 5 GB ÷ 16.7 MB', capDisco, 299, 1);
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
prueba('el resumen trae diez cifras', rs.cifras.length, 10);
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

console.log(fallas === 0 ? '\nTodas las pruebas pasan.' : `\n${fallas} prueba(s) fallan.`);
process.exit(fallas === 0 ? 0 : 1);
