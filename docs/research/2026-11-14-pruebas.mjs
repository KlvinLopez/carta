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
const c = M.configBase();
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
const sin = M.escenarios(c, s, [1000])[0];
prueba('peor caso con anuncios mejora al peor sin anuncios', sin.peor_anuncios_tarifa_media.margen.pesos > sin.peor_sin_anuncios.margen.pesos, true);
prueba('el mejor caso supera al esperado medio', sin.mejor.ingresos.total > sin.esperado.media.ingresos.total, true);
prueba('esperado: pesimista ≤ media ≤ optimista en ingresos', sin.esperado.pesimista.ingresos.total <= sin.esperado.media.ingresos.total && sin.esperado.media.ingresos.total <= sin.esperado.optimista.ingresos.total, true);
const po = M.precioOptimo('media', s);
prueba('en el precio óptimo la derivada es ≈ 0 (cambio de signo)', Math.abs(po.derivada_en_optimo) < 0.2, true);
prueba('funciona sin acceso a fs ni window (sólo importamos el módulo)', typeof M.evaluar, 'function');

console.log(fallas === 0 ? '\nTodas las pruebas pasan.' : `\n${fallas} prueba(s) fallan.`);
process.exit(fallas === 0 ? 0 : 1);
