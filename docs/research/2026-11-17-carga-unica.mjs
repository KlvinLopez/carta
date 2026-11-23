// Genera 2026-11-17-carga-unica.{md,json}: la carga de un restaurante gratuito tiene una sola definición (los topes); antes → después de las cifras
// que Calvin ya vio, por qué, y la sensibilidad a las visitas por mesa. Ninguna cifra a mano. Uso: node 2026-11-17-carga-unica.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const out = process.env.CARTA_SALIDA ?? aqui;
const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
const cfg = M.configR15(); // el archivo de la ronda 11: plan Chef de entonces (1 cuenta, 150 platillos)
const c = M.comparacionDeCarga(cfg, s);
const A = c.antes_tipica_no_vigente;
const D = c.despues_por_topes_vigente;
const n0 = (x) => (x == null ? '—' : Math.round(x).toLocaleString('en-US'));
const n1 = (x) => (x == null ? '—' : (Math.round(x * 10) / 10).toLocaleString('en-US'));
const n2 = (x) => (x == null ? '—' : (Math.round(x * 100) / 100).toLocaleString('en-US'));
const sg = (x) => (x >= 0 ? `+${n0(x)}` : `−${n0(-x)}`);
const fila = (nombre, a, d, fmt = n0) => `| ${nombre} | ${fmt(a)} | ${fmt(d)} |`;
const NOM = { recomendado: 'recomendado', peor: 'peor', mejor: 'mejor', piso_de_verdad: 'estrés (piso de verdad)' };

const md = `# Una sola carga para el gratuito: antes → después (archivado; generado, no editar a mano)

**Estado:** archivado el 20 de noviembre de 2026. No es un informe vigente: documenta el paso del «gratuito típico» a la carga por topes (ronda 11). Lo vigente está en \`docs/research/2026-11-14-recursos-y-palancas.md\` y en \`2026-11-14-modelo-de-escenarios.md\`.

Generado por \`2026-11-17-carga-unica.mjs\`. **Qué cambió (ronda 11):** un restaurante gratuito tiene UNA definición de carga, la de sus topes, y la usan por igual «¿Qué nos limita?», los costos, la bolsa de Calvin, los escalones, el margen, el sueldo y la meta de 12 meses. Antes, los costos usaban un «gratuito típico» de ${n0(A.carga_del_gratuito.visitas_al_mes)} visitas al mes y «¿Qué nos limita?» la carga de los topes. **No cambian precios, topes ni escenarios.**

**Definición:** ${c.definicion}

**¿Tope entero o distribución de mesas?** ${c.tope_entero_o_distribucion}

## 1. Antes → después

*Antes* = gratuito típico (comparación, ya no vigente). *Después* = gratuito por topes (vigente).

| Cifra | Antes (típico, ${n0(A.carga_del_gratuito.visitas_al_mes)} visitas) | Después (topes, ${n0(D.carga_del_gratuito.visitas_al_mes)} visitas) |
|---|---|---|
${['recomendado', 'peor', 'mejor', 'piso_de_verdad'].map((e) => fila(`Margen de operación con 1,000 restaurantes, ${NOM[e]} (pesos al mes)`, A.margen_operacion_1000[e], D.margen_operacion_1000[e], sg)).join('\n')}
${fila('Anuncios por restaurante gratuito, tarifa baja (escenario recomendado; pesos al mes)', A.ingreso_de_anuncios_por_gratuito_por_tarifa.baja, D.ingreso_de_anuncios_por_gratuito_por_tarifa.baja, n2)}
${fila('Anuncios por restaurante gratuito, tarifa media (pesos al mes)', A.ingreso_de_anuncios_por_gratuito_por_tarifa.media, D.ingreso_de_anuncios_por_gratuito_por_tarifa.media, n2)}
${fila('Anuncios por restaurante gratuito, tarifa alta (pesos al mes)', A.ingreso_de_anuncios_por_gratuito_por_tarifa.alta, D.ingreso_de_anuncios_por_gratuito_por_tarifa.alta, n2)}
${fila('Costo por restaurante gratuito con soporte (pesos al mes)', A.costo_por_gratuito, D.costo_por_gratuito, n2)}
${fila('Gratuitos que sostiene cada cliente de paga, sin anuncios', A.gratuitos_que_sostiene_un_pagante.sin_anuncios, D.gratuitos_que_sostiene_un_pagante.sin_anuncios)}
${fila('Mes 12 con 300 restaurantes: ingresos (pesos)', A.mes_12_con_300_restaurantes.ingresos, D.mes_12_con_300_restaurantes.ingresos)}
${fila('Mes 12 con 300 restaurantes: margen de operación (pesos)', A.mes_12_con_300_restaurantes.margen_operacion, D.mes_12_con_300_restaurantes.margen_operacion, sg)}
${fila('Mes 12 con 300 restaurantes: margen después de captación (pesos)', A.mes_12_con_300_restaurantes.margen_despues_de_captacion, D.mes_12_con_300_restaurantes.margen_despues_de_captacion, sg)}
${A.sueldo.map((x, i) => `| Sueldo de ${x.veces_el_salario_minimo} × salario mínimo (${n0(x.sueldo_mensual)}): restaurantes necesarios (recomendado) | ${n0(x.restaurantes_necesarios)} (mes ${x.mes}) | ${n0(D.sueldo[i].restaurantes_necesarios)} (mes ${D.sueldo[i].mes}) |`).join('\n')}
${A.bolsa.map((b, i) => `| Bolsa de ${n0(b.bolsa)} pesos al mes: restaurantes gratuitos que caben (centro; rango) | ${n0(b.centro)} (${n0(b.minimo)} a ${n0(b.maximo)}) | ${n0(D.bolsa[i].centro)} (${n0(D.bolsa[i].minimo)} a ${n0(D.bolsa[i].maximo)}) |`).join('\n')}
${fila('Gratuitos que caben con el sondeo de hoy, sólo gratuitos (bolsa)', A.bolsa_con_sondeo_de_hoy, D.bolsa_con_sondeo_de_hoy)}
${fila('Restaurantes registrados que caben, con avisos (historial 30 días)', A.capacidad.con_avisos, D.capacidad.con_avisos)}
${fila('Restaurantes registrados que caben, con sondeo (historial 30 días)', A.capacidad.con_sondeo, D.capacidad.con_sondeo)}
${fila('Restaurantes registrados que caben, sin purga', A.capacidad.sin_purga, D.capacidad.sin_purga)}

**Por qué:**
- **Margen:** ${c.por_que.margen}
- **Gratuitos que sostiene cada pagante:** ${c.por_que.gratuitos_que_sostiene}
- **Mes 12:** ${c.por_que.mes_12}
- **Sueldo:** ${c.por_que.sueldo}
- **Bolsa:** ${c.por_que.bolsa}
- **Capacidad:** ${c.por_que.capacidad}

## 2. Sensibilidad al supuesto que ahora mueve todo: visitas por mesa al mes

| Visitas por mesa al mes | Visitas del gratuito al mes | Margen recomendado, 1,000 restaurantes | Margen peor | Gratuitos que sostiene un pagante (sin anuncios) | Anuncios por gratuito (tarifa baja) | Caben con avisos / con sondeo / sin purga | Bolsa de 1,000 pesos |
|---|---|---|---|---|---|---|---|
${c.sensibilidad_visitas_por_mesa.map((x) => `| ${x.visitas_por_mesa_al_mes} | ${n0(x.visitas_del_gratuito_al_mes)} | ${sg(x.margen_operacion_recomendado_1000)} | ${sg(x.margen_operacion_peor_1000)} | ${n0(x.gratuitos_que_sostiene_sin_anuncios)} | ${n2(x.ingreso_de_anuncios_por_gratuito)} | ${n0(x.capacidad.con_avisos)} / ${n0(x.capacidad.con_sondeo)} / ${n0(x.capacidad.sin_purga)} | ${n0(x.bolsa_1000)} |`).join('\n')}

Más visitas por mesa dejan más anuncios y más margen, pero llenan antes el disco y el procesador (caben menos restaurantes).

## 3. Datos por conseguir
${c.datos_por_conseguir.map((x) => `- ${x}`).join('\n')}
`;
writeFileSync(process.env.CARTA_SALIDA ? join(out, '2026-11-17-carga-unica-antes-y-despues.md') : join(aqui, '..', 'historia', '2026-11-17-carga-unica-antes-y-despues.md'), md);
writeFileSync(join(out, '2026-11-17-carga-unica.json'), JSON.stringify(c, null, 2) + '\n');
console.log('ok carga-unica');
