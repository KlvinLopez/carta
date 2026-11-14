// Genera 2026-11-14-banderas-de-operacion.{md,json} desde el modelo. Uso: node 2026-11-14-banderas.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';
const aqui = dirname(fileURLToPath(import.meta.url));
const par = JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8'));
const s = M.valores(par);
const rec = M.configInicial();
const ban = M.banderas(rec, s);
const esc = s.escalones;
const proy = M.proyectar(rec, s, 36, { curva: 'media' });
const primerMes = (id) => proy.filas.find((f) => f.escalon === id)?.mes ?? null;
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const medida = {
  procesador: 'p95 de CPU del servicio `api` en la hora pico (panel de Railway; hoy sin alerta)',
  disco: 'uso del volumen de PostgreSQL (`pg_database_size` + panel de Railway)',
  conexiones: 'conexiones SSE abiertas por worker (log de `/op/eventos` y `/p/sesion/eventos`; **aún no se cuentan**)',
  memoria: 'RSS por proceso (panel de Railway)',
  costo_por_restaurante: 'factura de Railway ÷ restaurantes activos del mes',
  costos_sobre_ingresos: 'factura + soporte ÷ ingresos del mes',
};
const estado = {
  procesador: 'no medido en Railway: el 98 % del modelo es simulador (±2×)',
  disco: 'no medido; 7.1–8.5 KB por visita salen de una medición local',
  conexiones: 'no medido; las 10,000 son un tope documentado, no una prueba',
  memoria: 'no medido',
  costo_por_restaurante: 'se puede medir desde el primer mes con restaurantes',
  costos_sobre_ingresos: 'se puede medir desde el primer mes con ingresos',
};
const pasos = esc.map((e, i) => ({ id: e.id, nombre: e.nombre, capacidad_restaurantes_tipicos: e.cap_cpu, volumen_gb: e.volumen_gb, costo_usd_base: e.base_usd, costo_usd_tope: e.tope_usd, mes_en_que_entra_recomendado: primerMes(e.id), sube_costo_usd_vs_anterior: i ? e.base_usd - esc[i - 1].base_usd : 0 }));
const filas = ban.map((b) => ({ id: b.id, nombre: b.nombre, que_se_mide: medida[b.id], umbral_aviso: b.umbral_aviso, umbral_accion: b.umbral_accion, que_hacer: b.que_hacer, estado_de_la_medicion: estado[b.id] }));
writeFileSync(join(aqui, '2026-11-14-banderas-de-operacion.json'), JSON.stringify({ version: M.VERSION, banderas: filas, escalones: pasos, nota: 'mes en que entra = primer mes de la proyección recomendada (adopción supuesta)' }, null, 1));
const md = `# Banderas de operación: qué se mira, cuándo se avisa y qué cuesta el siguiente paso

**Fecha:** 14 de noviembre de 2026 · generado por \`2026-11-14-banderas.mjs\` desde el modelo · [JSON](2026-11-14-banderas-de-operacion.json). **Nada de esto está medido en Railway todavía:** los umbrales son criterio de operación (supuesto) y las capacidades salen del simulador (±2×).

## Conclusiones

1. **Seis banderas bastan:** procesador, disco, conexiones, memoria, costo por restaurante y costos sobre ingresos.
2. **El primer muro es el procesador:** con 1,000 restaurantes y curva media el modelo lo pone al 98 % del escalón de 2 procesos (Pro); el escalón de hoy (Hobby, sondeo) cabe ≈ ${esc[0].cap_cpu} restaurantes típicos.
3. **Siguiente paso, costo:** de Hobby a Pro 2 procesos sube ${n0(pasos[2].sube_costo_usd_vs_anterior)} USD base por mes (${esc[1].base_usd} → ${esc[2].base_usd}); entra hacia el mes ${pasos[2].mes_en_que_entra_recomendado ?? '—'} de la proyección recomendada (adopción supuesta).
4. **Más de ≈ 2,030 restaurantes registrados exige otra arquitectura:** de ahí en adelante todo es extrapolación sin medir.
5. **Dos banderas ya se pueden medir con el primer cliente:** costo por restaurante y costos sobre ingresos.

## Banderas

| Bandera | Qué se mide y dónde | Aviso | Acción | Qué hacer | Estado de la medición |
|---|---|---|---|---|---|
${filas.map((f) => `| ${f.nombre} | ${f.que_se_mide} | ${f.umbral_aviso} % | ${f.umbral_accion} % | ${f.que_hacer} | ${f.estado_de_la_medicion} |`).join('\n')}

*El costo por restaurante se avisa/actúa en pesos al mes (8 y 15), no en porcentaje.*

## Escalones de servidor y costo del paso

| Escalón | Capacidad (restaurantes típicos, simulador) | Disco | USD base al mes | Sube vs el anterior | Entra en el mes (recomendado) |
|---|---|---|---|---|---|
${pasos.map((p) => `| ${p.nombre} | ${n0(p.capacidad_restaurantes_tipicos)} | ${p.volumen_gb} GB | ${p.costo_usd_base} | +${p.sube_costo_usd_vs_anterior} | ${p.mes_en_que_entra_recomendado ?? 'no entra en 36 meses'} |`).join('\n')}

**Datos por conseguir:** p95 real de CPU con tráfico de piloto, bytes por visita real, conexiones SSE por restaurante, y la factura real de Railway del primer mes.
`;
writeFileSync(join(aqui, '2026-11-14-banderas-de-operacion.md'), md);
console.log(pasos.map((p) => `${p.id}:${p.mes_en_que_entra_recomendado}`).join(' '));
