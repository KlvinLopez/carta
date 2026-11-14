// Genera 2026-11-14-recursos-y-palancas.{md,json} desde el modelo (ninguna cifra a mano). Uso: node 2026-11-14-recursos.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const lee = (f) => JSON.parse(readFileSync(join(aqui, f), 'utf8'));
const s = M.valores(lee('2026-11-14-parametros.json'));
const med = lee('2026-11-14-recursos-medicion.json');
const bruta = lee('2026-11-14-disco-e-historial-medicion-bruta.json').mediano;
const rec = M.configInicial();
const R = M.recursos(rec, s);
const todas = M.recursos({ ...rec, palancas: ['analitica_agregada_por_dia', 'estado_en_memoria_60s', 'cerrar_lineas_ociosas'] }, s);
const topes = (ids) => M.recursos({ ...rec, palancas: ids }, s);
const n0 = (x) => (x == null ? '—' : Math.round(x).toLocaleString('en-US'));
const n1 = (x) => (x == null ? '—' : (Math.round(x * 10) / 10).toLocaleString('en-US'));
const sg = (x) => (x >= 0 ? `+${n0(x)}` : `−${n0(-x)}`);
const rE = (id) => R.recursos.find((r) => r.recurso === id);
const disco = rE('disco');
const cuelloH = R.cuello_hoy;
const cuelloE = R.cuello_con_eventos;
const visitasMed = bruta.tablas.sesion_grupal.filas;

// ranking de palancas por restaurantes que se ganan en SU recurso (hoy o con eventos), sin sumar palancas que se pisan
const cuelloH0 = null;
const todasPal = R.recursos.flatMap((r) => r.palancas.map((p) => ({ ...p, recurso: r.recurso, suma: Math.max(p.ganancia_restaurantes?.con_eventos ?? 0, p.ganancia_restaurantes?.hoy ?? 0) })));
const top3 = [...todasPal].filter((p) => p.suma > 0 && [cuelloH.recurso, cuelloE.recurso].includes(p.recurso)).sort((a, b) => b.suma - a.suma).slice(0, 3);
// con la palanca más grande de disco, ¿quién pasa a ser el cuello con eventos?
const conAgregada = topes(['analitica_agregada_por_dia']);
const combo = topes(['indices_de_evento_minimos', 'tipos_mas_chicos', 'retencion_analitica_7_dias']);
const kpi = (c) => M.resumen(c, s, 1000).cifras.find((f) => f.clave === 'restaurantes_que_caben');
const kpiBase = kpi(rec);
const kpiAgregada = kpi({ ...rec, palancas: ['analitica_agregada_por_dia'] });

const porTabla = Object.entries(bruta.tablas).filter(([t]) => ['evento_analitica', 'item_orden', 'miembro_sesion', 'orden_personal', 'comanda', 'comanda_orden', 'sesion_grupal', 'llamada_mesero'].includes(t)).map(([t, v]) => ({ tabla: t, filas_por_visita: v.filas / visitasMed, heap_por_visita: v.heap / visitasMed, indices_por_visita: v.indices / visitasMed, total_por_visita: v.total / visitasMed }));
const totalVisita = porTabla.reduce((a, x) => a + x.total_por_visita, 0);
const colFila = med.columnas_bytes_medios;
const sumaCols = Object.values(colFila).reduce((a, x) => a + x, 0);
const idxEv = Object.entries(med.indices_bytes).map(([i, b]) => ({ indice: i, bytes_por_evento: b / med.base.filas })).sort((a, b) => b.bytes_por_evento - a.bytes_por_evento);
const bytesEvento = s.bytes_por_evento.hoy;
const parteEventos = (10 * bytesEvento) / totalVisita;

const salida = { version: M.VERSION, fecha: '2026-11-14', ...R, palancas_catalogo: Object.entries(M.PALANCAS).map(([id, p]) => ({ id, ...p })), top3_palancas: top3.map((p) => ({ id: p.id, nombre: p.nombre, ganancia: p.ganancia, recurso: p.recurso })),
  disco_a_fondo: { medido_en: med.base_de_trabajo, nota: med.nota, bytes_por_visita_por_tabla: porTabla, bytes_por_visita_total: totalVisita, parte_de_la_visita_que_es_analitica: parteEventos, bytes_por_evento: { total: bytesEvento, heap: s.bytes_por_evento.heap, indices: s.bytes_por_evento.indices }, columnas_bytes_medios: colFila, suma_columnas: sumaCols, indices_por_evento: idxEv, medicion_palancas: med },
  kpi_restaurantes_que_caben: { sin_palancas: kpiBase, con_agregada_por_dia: kpiAgregada } };
writeFileSync(join(aqui, '2026-11-14-recursos-y-palancas.json'), JSON.stringify(salida, null, 1));

const tope = (x, aus) => (x == null ? aus : x > 100000 ? 'sin tope práctico' : n0(x));
const fila = (r) => `| **${r.nombre}** | ${tope(r.restaurantes_hoy, r.recurso === 'fotos' ? 'sin tope práctico' : 'no existe hoy')} | ${tope(r.restaurantes_con_eventos, 'sin tope práctico')} | ${r.es_cuello_hoy ? '**🔴 SÍ**' : 'no'} | ${r.es_cuello_con_eventos ? '**🔴 SÍ**' : 'no'} | ${r.medido} |`;
const palRows = (r) => r.palancas.map((p) => `| ${p.nombre} | ${p.antes} | ${p.despues} | ${p.ganancia} | ${p.esfuerzo} | ${p.riesgo} | ${p.regla_que_toca} | ${p.medido ? 'medido' : 'estimada'} |`).join('\n');
const esc = R.escalera.map((e) => `| ${e.tamano} | ${e.costo_usd_base == null ? '—' : `${n1(e.costo_usd_base)} a ${n1(e.costo_usd_con_carga)}`} | ${n0(e.restaurantes_que_caben)} | **${e.recurso_que_obliga_a_subir}** |`).join('\n');
const srv = R.hoy.servicios.map((x) => `| ${x.servicio} | ${x.plan} | ${x.costo_usd_mes == null ? 'incluido' : n1(x.costo_usd_mes)} | ${x.detalle} |`).join('\n');

const md = `# Recursos y palancas: qué pagamos, cuánto aguanta cada pieza y cómo ensancharla

**Fecha:** 14 de noviembre de 2026 · **Generado por \`2026-11-14-recursos.mjs\`** desde la función \`recursos(config, s)\` del modelo ([JSON](2026-11-14-recursos-y-palancas.json)); medición de disco con [\`2026-11-14-recursos-medir.py\`](2026-11-14-recursos-medir.py) en PostgreSQL local. **Las palancas son propuestas: no se tocó \`app/\` ni \`migrations/\`.** «Restaurantes» = restaurantes gratuitos típicos registrados (con la mezcla del simulador); es ±2× en lo que depende del procesador de Railway, que aún no se mide allí.

## Conclusiones

1. **Cuello de botella hoy (el teléfono pregunta cada 3 s): el procesador, con ${n0(cuelloH.restaurantes)} restaurantes** (≈ ${n1(cuelloH.comensales_mes / 1e6)} M de comensales al mes, simulados). El disco aguanta ${n0(rE('disco').restaurantes_hoy)} y las conexiones a la base ${n0(rE('conexiones_bd').restaurantes_hoy)}.
2. **Con los avisos de la Fase 3 el cuello se mueve al disco: ${n0(cuelloE.restaurantes)} restaurantes** (≈ ${n1(cuelloE.comensales_mes / 1e6)} M de comensales al mes) en el mismo servidor Hobby; el procesador pasaría a aguantar ${n0(rE('procesador').restaurantes_con_eventos)} y las líneas abiertas ${n0(rE('lineas').restaurantes_con_eventos)}.
3. **Las tres palancas que más ganan:** ${top3.map((p, i) => `${i + 1}. ${p.nombre} (${p.ganancia})`).join(' · ')}.
4. **El disco pesa porque cada visita deja diez filas de analítica de ${bytesEvento} bytes y casi la mitad es índices:** la analítica es ${n1(parteEventos * 100)} % de lo que ocupa una visita (${n0(totalVisita)} bytes, medido).
5. **Con la analítica agregada por día el disco sube de ${n0(rE('disco').restaurantes_con_eventos)} a ${n0(conAgregada.recursos.find((r) => r.recurso === 'disco').restaurantes_con_eventos)} restaurantes y sigue siendo el cuello; deja de serlo sólo al pasar a Pro (50 GB de disco): entonces el cuello es el procesador (${n0(R.escalera.find((e) => e.id === 'pro_2').restaurantes_que_caben)}).**

## 1. Qué pagamos hoy

| Servicio | Plan | USD al mes | Detalle y fuente |
|---|---|---|---|
${srv}

**Total ≈ ${n1(R.hoy.total_usd_mes)} USD al mes (${n0(R.hoy.total_pesos_mes)} pesos).** No incluye: ${R.hoy.no_incluye.join('; ')}. **Dato por confirmar:** si los 8.1 USD cubren staging y producción juntos (hay un proyecto Railway con dos environments).

## 2. Cada recurso, de un vistazo

**Cuello de botella en rojo.** «Hoy» = servidor que se paga hoy (Hobby, 2 procesos, sondeo de 3 s). «Con avisos» = el mismo servidor con la Fase 3 (ADR-018, no construida).

| Recurso | Restaurantes hoy | Restaurantes con avisos (mismo servidor) | ¿Cuello hoy? | ¿Cuello con avisos? | Medido o estimado |
|---|---|---|---|---|---|
${R.recursos.map(fila).join('\n')}

${R.recursos.map((r, i) => `### 2.${i + 1} ${r.nombre}

**Cómo funciona hoy.** ${r.como_funciona}

**Consumo.** ${r.consumo_por_restaurante.nota ? r.consumo_por_restaurante.nota : ''}${r.recurso === 'disco' ? `${n1(r.consumo_por_restaurante.valor)} MB al mes por restaurante gratuito típico (con ${n0(s.visitas_mes_gratuito)} visitas al mes y la mezcla del simulador), ${n1(totalVisita / 1000)} KB por visita [medido].` : ''}${r.recurso === 'memoria' ? `${s.rss_worker_mb} MB fijos por proceso; ${n1(r.consumo_por_restaurante.sondeo)} MB por restaurante con el sondeo (supuesto) y ${n1(r.consumo_por_restaurante.eventos)} MB con avisos (la línea abierta cuesta ${s.mb_por_linea_abierta * 1000} KB [medido]).` : ''}

**Límite hoy:** ${r.restaurantes_hoy > 100000 ? 'sin tope práctico (más de 100,000 restaurantes)' : r.limite_hoy.texto}. **Con avisos:** ${r.restaurantes_con_eventos == null || r.restaurantes_con_eventos > 100000 ? 'sin tope práctico' : `${n0(r.restaurantes_con_eventos)} restaurantes`}${r.comensales_mes_con_eventos && r.restaurantes_con_eventos <= 100000 ? ` (${n1(r.comensales_mes_con_eventos / 1e6)} M de comensales al mes)` : ''}. **${r.es_cuello_hoy ? '🔴 Es el cuello de botella de hoy.' : r.es_cuello_con_eventos ? '🔴 Es el cuello de botella con avisos.' : 'No es el cuello.'}**

`).join('\n')}
## 3. El disco a fondo (medido en PostgreSQL local)

**Cómo se midió:** copia de una base con 10 restaurantes medianos, un mes de visitas (${n0(visitasMed)} visitas), 10 eventos de analítica por visita **[supuesto]**; \`pg_relation_size\` y \`pg_indexes_size\` por tabla ([guion](2026-11-14-recursos-medir.py) y [medición anterior](2026-11-14-disco-e-historial.md)). TOAST = 0 (las filas son chicas).

| Tabla | Filas por visita | Bytes por visita: tabla | Bytes por visita: índices | Total | % de la visita |
|---|---|---|---|---|---|
${porTabla.sort((a, b) => b.total_por_visita - a.total_por_visita).map((x) => `| \`${x.tabla}\` | ${n1(x.filas_por_visita)} | ${n0(x.heap_por_visita)} | ${n0(x.indices_por_visita)} | **${n0(x.total_por_visita)}** | ${n0((100 * x.total_por_visita) / totalVisita)} % |`).join('\n')}
| **Suma** | | | | **${n0(totalVisita)}** | 100 % |

**Por qué pesa la analítica (\`evento_analitica\`): ${bytesEvento} bytes por evento = ${s.bytes_por_evento.heap} en la tabla + ${s.bytes_por_evento.indices} en índices.** (1) **Una fila por evento:** diez por visita. (2) **\`ip_hash\` ocupa ${n0(colFila.ip_hash)} bytes** (64 caracteres de texto en hexadecimal; 8 bastarían) y es el ${n0((100 * colFila.ip_hash) / sumaCols)} % de los datos de la fila. (3) **Tres UUID de 16 bytes** (restaurante, mesa, sesión) más \`tipo\` en texto (${n1(colFila.tipo)} bytes), \`user_agent_fam\` en texto (${n0(colFila.user_agent_fam)}) y \`propiedades\` jsonb (${n1(colFila.propiedades)}); suma de columnas ${n0(sumaCols)} bytes más el encabezado de 23 de PostgreSQL por fila. (4) **Siete índices** (${n0(s.bytes_por_evento.indices)} bytes por evento): ${idxEv.map((x) => `\`${x.indice}\` ${n0(x.bytes_por_evento)}`).join(' · ')}.

**Qué parte es qué (por visita, bytes):** analítica ${n0(10 * bytesEvento)} (${n0(parteEventos * 100)} %); órdenes e ítems ${n0(porTabla.filter((x) => ['item_orden', 'orden_personal', 'comanda_orden'].includes(x.tabla)).reduce((a, x) => a + x.total_por_visita, 0))}; sesión y miembros ${n0(porTabla.filter((x) => ['sesion_grupal', 'miembro_sesion'].includes(x.tabla)).reduce((a, x) => a + x.total_por_visita, 0))}; comandas y llamadas ${n0(porTabla.filter((x) => ['comanda', 'llamada_mesero'].includes(x.tabla)).reduce((a, x) => a + x.total_por_visita, 0))}. **Claves de idempotencia:** la tabla está vacía hasta la Fase 3; medido, una fila pesa ${s.idempotencia_bytes_por_fila} bytes con su índice (respuesta de ≈ 340 bytes).

## 4. Palancas por recurso

Cada palanca se evalúa **sola** contra el estado actual; **no se suman** las que se pisan (la analítica agregada ya incluye la retención, los índices y los tipos). «Caben» = restaurantes por disco en el servidor Hobby con avisos (o por el recurso que corresponde).

${R.recursos.filter((r) => r.palancas.length).map((r) => `### ${r.nombre}\n\n| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |\n|---|---|---|---|---|---|---|---|\n${palRows(r)}\n`).join('\n')}
**Memoria y fotos:** ninguna palanca por ahora (la memoria no limita antes que los demás recursos y las fotos caben en el plan gratuito de R2 hasta ≈ ${n0(s.r2_gratis_gb / s.r2_gb_gratuito)} gratuitos).

**Efecto en los números del modelo.** Las palancas entran en \`config.palancas\` y mueven \`resumen\`: «restaurantes gratuitos que caben» pasa de ${n0(kpiBase.recomendado)} a ${n0(kpiAgregada.recomendado)} con la analítica agregada por día (los demás casos: ${n0(kpiAgregada.peor)} y ${n0(kpiAgregada.mejor)}).

## 5. La escalera: el tamaño del servidor que rentamos

| Tamaño del servidor | USD al mes (base a con carga) | Restaurantes que caben | Recurso que obliga a subir |
|---|---|---|---|
${esc}

**Lectura.** Cada tamaño se llena por **el recurso de la última columna**: es el que hay que ensanchar para pasar al siguiente. El salto de Hobby a Pro cuesta ≈ ${n0(R.escalera[2].costo_usd_base - R.escalera[1].costo_usd_base)} USD base más y trae 10 veces más disco (50 GB). **El de 8 procesos topa en las ${s.lineas_max_railway.toLocaleString('en-US')} líneas abiertas de Railway; más allá hay que repetir toda la pila (extrapolación sin medir).**

## 6. Glosario en llano

${Object.entries(R.glosario).map(([k, v]) => `- **${k.replace(/_/g, ' ')}.** ${v}`).join('\n')}

## 7. Qué no está medido

- **Procesador, memoria y conexiones en Railway:** todo sale de mediciones locales (±2×); falta \`SHOW max_connections\` y medir CPU real con tráfico del piloto.
- **Analítica agregada:** el generador no asigna platillo a los eventos; se usa la **cota alta** (todos los platillos con vistas cada día).
- **Retención de 7 días, archivo de sesiones y cierre de líneas ociosas:** estimadas con su supuesto; el archivo de sesiones **toca las reglas 8 y 9 y pide ADR**.
- **Claves de idempotencia por visita (${s.claves_idempotencia_por_visita}):** supuesto; la tabla se llena hasta la Fase 3.
`;
writeFileSync(join(aqui, '2026-11-14-recursos-y-palancas.md'), md);
console.log(top3.map((p) => `${p.id}:${p.suma}`).join(' '), '| cuello hoy', cuelloH.recurso, cuelloH.restaurantes, '| con eventos', cuelloE.recurso, cuelloE.restaurantes);
