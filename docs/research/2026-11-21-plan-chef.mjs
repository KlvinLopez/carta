// Genera 2026-11-21-plan-chef.json y docs/historia/2026-11-21-plan-chef-antes-y-despues.md: el plan Chef que decidió Calvin el 21 de noviembre
// (6 mesas, el dueño y 3 cuentas de personal, 50 platillos) frente al de la ronda 15 (1 cuenta, 150 platillos). Ninguna cifra a mano.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const out = process.env.CARTA_SALIDA ?? aqui;
const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
const c = M.comparacionPlanChef(M.configInicial(), s);
const A = c.antes_plan_chef_ronda_15;
const D = c.despues_plan_chef_21_nov;
const n0 = (x) => (x == null ? '—' : Math.round(x).toLocaleString('en-US'));
const n1 = (x) => (x == null ? '—' : (Math.round(x * 10) / 10).toLocaleString('en-US'));
const n2 = (x) => (x == null ? '—' : (Math.round(x * 100) / 100).toLocaleString('en-US'));
const pc = (x) => `${n1(x * 100)} %`;
const sg = (x) => (x >= 0 ? `+${n0(x)}` : `−${n0(-x)}`);
const f = (nombre, a, d, fmt = n0) => `| ${nombre} | ${fmt(a)} | ${fmt(d)} |`;

const md = `# El plan Chef de Calvin (21 de noviembre): antes → después (archivado; generado, no editar a mano)

**Estado:** archivado el 21 de noviembre de 2026 (r16). Lo vigente está en \`docs/research/2026-11-14-modelo-de-escenarios.md\` y en los demás informes. Generado por \`2026-11-21-plan-chef.mjs\`.

**Decisión de Calvin:** ${c.decision}

*Antes* = Chef de la ronda 15 (${A.topes.mesas} mesas, ${A.topes.cuentas_de_personal} cuenta de personal, ${A.topes.platillos} platillos). *Después* = Chef decidido (${D.topes.mesas} mesas, ${D.topes.cuentas_de_personal} cuentas de personal además del dueño, ${D.topes.platillos} platillos). Historial del gratuito: la política vigente (03 §7); la propuesta de 30 días va al lado.

| Cifra | Antes | Después |
|---|---|---|
${f('Líneas abiertas por restaurante gratuito en la hora pico', A.carga_del_gratuito.lineas_abiertas_en_la_hora_pico, D.carga_del_gratuito.lineas_abiertas_en_la_hora_pico, n2)}
${f('Líneas abiertas por restaurante registrado (con la mezcla de paga)', A.carga_del_gratuito.lineas_por_restaurante_registrado, D.carga_del_gratuito.lineas_por_restaurante_registrado, n2)}
${f('GB de fotos por gratuito en R2 (supuesto)', A.carga_del_gratuito.gb_de_fotos, D.carga_del_gratuito.gb_de_fotos, n2)}
${f('Negocios de 0 a 5 personas que caben en Chef', A.quien_cae_en_chef.negocios_de_0_a_5_personas_dentro, D.quien_cae_en_chef.negocios_de_0_a_5_personas_dentro, pc)}
${f('Negocios de 6 a 10 personas que caben en Chef', A.quien_cae_en_chef.negocios_de_6_a_10_personas_dentro, D.quien_cae_en_chef.negocios_de_6_a_10_personas_dentro, pc)}
${f('Cobertura de platillos, cota baja (sitios propios)', A.quien_cae_en_chef.cobertura_de_platillos_cota_baja, D.quien_cae_en_chef.cobertura_de_platillos_cota_baja, pc)}
${f('Cobertura de platillos, cota alta (reparto)', A.quien_cae_en_chef.cobertura_de_platillos_cota_alta, D.quien_cae_en_chef.cobertura_de_platillos_cota_alta, pc)}
${f('De paga por cada 1,000 restaurantes', A.pagantes_por_1000, D.pagantes_por_1000)}
${f('Costo por restaurante gratuito (pesos al mes, con soporte)', A.costo_por_gratuito, D.costo_por_gratuito, n2)}
${f('Costo por cliente de paga (pesos al mes)', A.costo_por_cliente_de_paga, D.costo_por_cliente_de_paga, n2)}
${f('Gratuitos que sostiene un cliente de paga (sin anuncios)', A.gratuitos_que_sostiene_un_pagante_sin_anuncios, D.gratuitos_que_sostiene_un_pagante_sin_anuncios)}
${['recomendado', 'peor', 'mejor', 'piso_de_verdad'].map((e) => f(`Margen con 1,000 restaurantes, ${e === 'piso_de_verdad' ? 'estrés' : e} (política vigente)`, A.margen_operacion_1000[e], D.margen_operacion_1000[e], sg)).join('\n')}
${f('Margen recomendado con la propuesta de 30 días', A.con_la_propuesta_de_30_dias.margen_operacion_1000.recomendado, D.con_la_propuesta_de_30_dias.margen_operacion_1000.recomendado, sg)}
${f('Mes 12, 300 restaurantes: margen de operación', A.mes_12_con_300_restaurantes.margen_operacion, D.mes_12_con_300_restaurantes.margen_operacion, sg)}
${f('Sueldo de 1 salario mínimo: restaurantes en régimen', A.sueldo_de_1_salario_minimo.restaurantes_en_regimen, D.sueldo_de_1_salario_minimo.restaurantes_en_regimen)}
${f('Capacidad con lo que se paga hoy (política vigente), con avisos', A.capacidad.politica_vigente.con_avisos, D.capacidad.politica_vigente.con_avisos)}
${f('Capacidad con la propuesta de 30 días, con avisos / con sondeo (qué la mueve: ver «Qué mueve la capacidad»)', A.capacidad.propuesta_30_dias.con_avisos + ' / ' + A.capacidad.propuesta_30_dias.con_sondeo, D.capacidad.propuesta_30_dias.con_avisos + ' / ' + D.capacidad.propuesta_30_dias.con_sondeo, (x) => x)}
${f('Capacidad sin purga (12 meses)', A.capacidad.sin_purga_12_meses, D.capacidad.sin_purga_12_meses)}

## Supuestos nuevos
${c.supuestos_nuevos.map((x) => `- ${x}`).join('\n')}

## Qué mueve la capacidad (cada cambio por separado, con la propuesta de 30 días)

| Plan | Cuentas de personal | Platillos | De paga por 1,000 | Caben con avisos | Caben con sondeo |
|---|---|---|---|---|---|
${[['Plan de la ronda 15', 'plan_de_la_ronda_15'], ['Sólo cambian las cuentas', 'sólo_cambian_las_cuentas'], ['Sólo cambia el tope de platillos', 'sólo_cambia_el_tope_de_platillos'], ['Plan vigente (21-nov)', 'plan_vigente']].map(([n, k]) => { const v = c.descomposicion_de_la_capacidad[k]; return `| ${n} | ${v.cuentas_de_personal} | ${v.platillos} | ${n0(v.pagantes_por_1000)} | ${v.caben_con_avisos} | ${v.caben_con_sondeo} |`; }).join('\n')}

${c.descomposicion_de_la_capacidad.lectura}

## Lectura
- **Líneas abiertas:** con tres cuentas de personal en vez de una, un gratuito abre ${n2(D.carga_del_gratuito.lineas_abiertas_en_la_hora_pico)} líneas en la hora pico en vez de ${n2(A.carga_del_gratuito.lineas_abiertas_en_la_hora_pico)} (cota alta); el recurso de líneas no es el que limita.
- **Quién cae en Chef:** con 3 cuentas caben negocios de 6 a 10 personas (${pc(D.quien_cae_en_chef.negocios_de_6_a_10_personas_dentro)}), pero el tope de ${D.topes.platillos} platillos recorta la cobertura de platillos; el efecto neto en los negocios de 0 a 5 personas es ${pc(A.quien_cae_en_chef.negocios_de_0_a_5_personas_dentro)} → ${pc(D.quien_cae_en_chef.negocios_de_0_a_5_personas_dentro)}.
- **Quién paga:** ${n0(A.pagantes_por_1000)} → ${n0(D.pagantes_por_1000)} por cada 1,000 restaurantes (con la mezcla del modelo, sin dato de pago real).
`;
writeFileSync(process.env.CARTA_SALIDA ? join(out, '2026-11-21-plan-chef-antes-y-despues.md') : join(aqui, '..', 'historia', '2026-11-21-plan-chef-antes-y-despues.md'), md);
writeFileSync(join(out, '2026-11-21-plan-chef.json'), JSON.stringify(c, null, 2) + '\n');
console.log('ok plan-chef');
