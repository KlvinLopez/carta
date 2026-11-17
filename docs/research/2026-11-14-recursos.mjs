// Genera 2026-11-14-recursos-y-palancas.{md,json} desde el modelo (ninguna cifra a mano). Uso: node 2026-11-14-recursos.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida_dir = process.env.CARTA_SALIDA ?? aqui;
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
// con la palanca más grande de disco, ¿quién pasa a ser el cuello con eventos?
const kpi = (c) => M.resumen(c, s, 1000).cifras.find((f) => f.clave === 'restaurantes_que_caben');
const kpiBase = kpi(rec);
const kpiAgregada = kpi({ ...rec, palancas: ['historial_gratuito_30_dias', 'analitica_agregada_por_dia'] });

const porTabla = Object.entries(bruta.tablas).filter(([t]) => ['evento_analitica', 'item_orden', 'miembro_sesion', 'orden_personal', 'comanda', 'comanda_orden', 'sesion_grupal', 'llamada_mesero'].includes(t)).map(([t, v]) => ({ tabla: t, filas_por_visita: v.filas / visitasMed, heap_por_visita: v.heap / visitasMed, indices_por_visita: v.indices / visitasMed, total_por_visita: v.total / visitasMed }));
const totalVisita = porTabla.reduce((a, x) => a + x.total_por_visita, 0);
const colFila = med.columnas_bytes_medios;
const sumaCols = Object.values(colFila).reduce((a, x) => a + x, 0);
const idxEv = Object.entries(med.indices_bytes).map(([i, b]) => ({ indice: i, bytes_por_evento: b / med.base.filas })).sort((a, b) => b.bytes_por_evento - a.bytes_por_evento);
const bytesEvento = s.bytes_por_evento.hoy;
const parteEventos = (10 * bytesEvento) / totalVisita;

const hist30 = rE('disco').palancas.find((p) => p.id === 'historial_gratuito_30_dias');
const tableroR = M.palancasEnTablero(rec, s);
const top3 = [{ nombre: hist30.nombre, ganancia: `${hist30.ganancia} (de ${n0(rE('disco').restaurantes_hoy)} a ${n0(rE('disco').con_historial_30_dias.restaurantes_hoy)} por disco)` }, ...rE('disco').palancas.filter((p) => ['analitica_agregada_por_dia', 'retencion_analitica_7_dias'].includes(p.id)).map((p) => ({ nombre: p.nombre, ganancia: `${p.ganancia}; sobre la base con historial a 30 días: +${p.sobre_historial_30_dias.ganancia}` }))];
const salida = { version: M.VERSION, fecha: '2026-11-14', ...R, palancas_catalogo: Object.entries(M.PALANCAS).map(([id, p]) => ({ id, ...p })), top3_palancas: top3.map((p) => ({ id: p.id, nombre: p.nombre, ganancia: p.ganancia, recurso: p.recurso })),
  disco_a_fondo: { medido_en: med.base_de_trabajo, nota: med.nota, bytes_por_visita_por_tabla: porTabla, bytes_por_visita_total: totalVisita, parte_de_la_visita_que_es_analitica: parteEventos, bytes_por_evento: { total: bytesEvento, heap: s.bytes_por_evento.heap, indices: s.bytes_por_evento.indices }, columnas_bytes_medios: colFila, suma_columnas: sumaCols, indices_por_evento: idxEv, medicion_palancas: med },
  kpi_restaurantes_que_caben: { sin_palancas: kpiBase, con_agregada_por_dia: kpiAgregada } };
writeFileSync(join(salida_dir, '2026-11-14-recursos-y-palancas.json'), JSON.stringify(salida, null, 1));

const tope = (x, aus) => (x == null ? aus : x > 100000 ? 'sin tope práctico' : n0(x));
const fila = (r) => `| **${r.nombre}** | ${tope(r.restaurantes_hoy, r.recurso === 'fotos' ? 'sin tope práctico' : 'no existe hoy')} | ${tope(r.restaurantes_con_eventos, 'sin tope práctico')} | ${tope(r.con_historial_30_dias.restaurantes_hoy, r.recurso === 'fotos' ? 'sin tope práctico' : 'no existe hoy')} | ${tope(r.con_historial_30_dias.restaurantes_con_eventos, 'sin tope práctico')} | ${r.es_cuello_hoy ? '**🔴 SÍ**' : 'no'} / ${r.con_historial_30_dias.es_cuello_hoy ? '**🔴 SÍ**' : 'no'} | ${r.es_cuello_con_eventos ? '**🔴 SÍ**' : 'no'} / ${r.con_historial_30_dias.es_cuello_con_eventos ? '**🔴 SÍ**' : 'no'} | ${r.medido} |`;
const palRows = (r) => r.palancas.filter((p) => p.en_tablero).map((p) => `| **${p.accion}** · ${p.que_es} | ${p.antes} | ${p.despues} | ${p.ganancia}${p.sobre_historial_30_dias ? ` · sobre la base con historial a 30 días: ${p.sobre_historial_30_dias.ganancia >= 0 ? '+' : ''}${p.sobre_historial_30_dias.ganancia} restaurantes` : ''} | ${p.esfuerzo} | ${p.riesgo} | ${p.regla_que_toca} | ${p.medido ? 'medida con datos sintéticos' : 'estimada'} |`).join('\n');
const esc = R.escalera.map((e) => `| ${e.tamano} | ${e.costo_usd_base == null ? '—' : `${n1(e.costo_usd_base)} a ${n1(e.costo_usd_con_carga)}`} | ${n0(e.restaurantes_que_caben)} · **${e.recurso_que_obliga_a_subir}** | ${e.restaurantes_con_historial_30_dias == null ? '—' : `${n0(e.restaurantes_con_historial_30_dias)} · **${e.recurso_que_obliga_a_subir_con_historial_30_dias}**`} |`).join('\n');
const srv = R.hoy.servicios.map((x) => `| ${x.servicio} | ${x.plan} | ${x.costo_usd_mes == null ? 'incluido' : n1(x.costo_usd_mes)} | ${x.detalle} |`).join('\n');
const dh = R.disco_por_historial;
const ac = R.sensibilidad_actividad;
const rg = R.rango_procesador;
const tip = R.definicion_restaurante_tipico;

const md = `# Recursos y palancas: qué pagamos, cuánto aguanta cada pieza y cómo ensancharla

**Fecha:** 14 de noviembre de 2026 (ronda 6) · **Generado por \`2026-11-14-recursos.mjs\`** desde \`recursos(config, s)\` del modelo ([JSON](2026-11-14-recursos-y-palancas.json)); disco medido con [\`2026-11-14-recursos-medir.py\`](2026-11-14-recursos-medir.py) en PostgreSQL local, **con datos sintéticos** (el generador deja \`miembro_id\` y \`platillo_id\` nulos; se rellenaron con valores variados en la copia). **Las palancas son propuestas: no se tocó \`app/\` ni \`migrations/\`.**

**Qué es un «restaurante típico» (en toda cifra de capacidad):** ${tip}. Con el **doble** de actividad lo que cabe se divide entre 2 (${n0(ac[2].procesador_hoy)} por procesador y ${n0(ac[2].disco_con_historial_30_dias)} por disco con el historial a 30 días); con **todos en su hora pico a la vez**, el procesador de hoy baja de ${n0(rE('procesador').restaurantes_hoy)} a ${n0(R.pico_simultaneo.procesador_hoy)} (factor ${R.pico_simultaneo.factor}, supuesto).

## Conclusiones

1. **Cuello de botella hoy: ${R.cuello_condicional}.** Hoy **nada purga el historial** (03 §7 pide 13 y 24 meses sin distinguir por plan); la cifra de disco depende de los meses acumulados: ${dh.map((x) => `${x.etiqueta}: ${n0(x.restaurantes_por_disco)}`).join(' · ')} restaurantes.
2. **El procesador es ±2× y no se ha medido en Railway:** ${n0(rE('procesador').restaurantes_hoy)} restaurantes hoy (de ${n0(rg.procesador_hoy[0])} a ${n0(rg.procesador_hoy[1])}) y ${n0(rE('procesador').restaurantes_con_eventos)} con avisos (de ${n0(rg.procesador_con_eventos[0])} a ${n0(rg.procesador_con_eventos[1])}); **${n0(rE('procesador').restaurantes_con_eventos)} frente a ${n0(rE('disco').con_historial_30_dias.restaurantes_con_eventos)} (disco con 30 días) ${rE('procesador').restaurantes_con_eventos / rE('disco').con_historial_30_dias.restaurantes_con_eventos > 0.5 && rE('procesador').restaurantes_con_eventos / rE('disco').con_historial_30_dias.restaurantes_con_eventos < 2 ? 'está dentro de ese margen' : 'queda fuera de ese margen'}**: no se puede decir cuál manda sin medirlo.
3. **Con los avisos de la Fase 3 el procesador sube a ${n0(rE('procesador').restaurantes_con_eventos)} y manda el disco:** ${n0(rE('disco').restaurantes_con_eventos)} restaurantes sin purga (12 meses acumulados) o ${n0(rE('disco').con_historial_30_dias.restaurantes_con_eventos)} con el historial a 30 días. Las líneas abiertas aguantan ${n0(rE('lineas').restaurantes_con_eventos)}: **es un tope de diseño supuesto (10,000 de Railway ÷ 4.7 líneas por restaurante), sin medir.**
4. **La palanca número uno es el historial del gratuito a 30 días:** ${top3[0].ganancia}. **Contradice 03 §7 (13 y 24 meses) y la regla 9 si se borran sesiones y comandas: hay que cambiar el documento y escribir el ADR antes.** Las siguientes, evaluadas sobre esa base: ${top3.slice(1).map((p) => `${p.nombre} (${p.ganancia})`).join(' · ')}.
5. **Lo que pagamos hoy: ≈ ${n1(R.hoy.total_usd_mes)} USD al mes.** El disco pesa porque cada visita deja diez filas de analítica de ${bytesEvento} bytes y la analítica es ${n1(parteEventos * 100)} % de lo que ocupa una visita (${n0(totalVisita)} bytes, medido con datos sintéticos).

## 1. Qué pagamos hoy

| Servicio | Plan | USD al mes | Detalle y fuente |
|---|---|---|---|
${srv}

**Total ≈ ${n1(R.hoy.total_usd_mes)} USD al mes (${n0(R.hoy.total_pesos_mes)} pesos).** No incluye: ${R.hoy.no_incluye.join('; ')}. **Dato por confirmar:** si los 8.1 USD cubren staging y producción juntos.

## 2. Cada recurso, de un vistazo

**Cuello de botella en rojo.** «Hoy» = Hobby, 2 procesos, el teléfono pregunta cada 3 s. «Con avisos» = el mismo servidor con la Fase 3 (ADR-018, no construida). **«Sin purga»** = 12 meses de historial acumulado (lo que hay hoy: nada limpia); **«historial 30 días»** = la palanca número uno. Cada cifra es de un restaurante típico (definido arriba).

| Recurso | Hoy, sin purga | Con avisos, sin purga | Hoy, historial 30 días | Con avisos, historial 30 días | ¿Cuello hoy? (sin purga / 30 días) | ¿Cuello con avisos? (sin purga / 30 días) | Medido o estimado |
|---|---|---|---|---|---|---|---|
${R.recursos.map(fila).join('\n')}

### El disco según los meses de historial acumulado (hoy nada purga)

| Historial del gratuito | MB por restaurante | Restaurantes que caben por disco (Hobby, 5 GB, 20 % de reserva) | Cuello hoy | Cuello con avisos |
|---|---|---|---|---|
${dh.map((x) => `| ${x.etiqueta} | ${n1(x.mb_por_restaurante)} | **${n0(x.restaurantes_por_disco)}** | ${x.cuello_hoy} (${n0(x.restaurantes_cuello_hoy)}) | ${x.cuello_con_eventos} (${n0(x.restaurantes_cuello_con_eventos)}) |`).join('\n')}

**El disco manda desde el mes ${R.mes_desde_el_que_manda_el_disco.con_sondeo} de operación de un restaurante con el sondeo** (y desde el mes ${R.mes_desde_el_que_manda_el_disco.con_eventos} con avisos) si nada purga. MB por restaurante = «al mes» sólo para el historial de 1 mes; con más meses es lo acumulado.

### Sensibilidad a la actividad y al pico

| Actividad del restaurante típico | Procesador hoy | Procesador con avisos | Disco (sin purga) | Disco (historial 30 días) |
|---|---|---|---|---|
${ac.map((x) => `| ×${x.factor_de_actividad} | ${n0(x.procesador_hoy)} | ${n0(x.procesador_con_eventos)} | ${n0(x.disco)} | ${n0(x.disco_con_historial_30_dias)} |`).join('\n')}

**Todos en su hora pico a la vez:** procesador ${n0(R.pico_simultaneo.procesador_hoy)} hoy y ${n0(R.pico_simultaneo.procesador_con_eventos)} con avisos. **Margen de error del procesador (±${rg.factor}×):** ${n0(rg.procesador_hoy[0])}–${n0(rg.procesador_hoy[1])} hoy y ${n0(rg.procesador_con_eventos[0])}–${n0(rg.procesador_con_eventos[1])} con avisos. ${rg.nota}.

${R.recursos.map((r, i) => `### 2.${i + 1} ${r.nombre}

**Cómo funciona hoy.** ${r.como_funciona}

**Consumo.** ${r.consumo_por_restaurante.nota ? r.consumo_por_restaurante.nota : ''}${r.recurso === 'disco' ? `${n1(r.consumo_por_restaurante.valor)} MB por restaurante gratuito típico con ${n0(r.consumo_por_restaurante.meses_historial)} meses de historial (${n0(s.visitas_mes_gratuito)} visitas al mes), ${n1(totalVisita / 1000)} KB por visita [medido con datos sintéticos].` : ''}${r.recurso === 'memoria' ? `${s.rss_worker_mb} MB fijos por proceso; ${n1(r.consumo_por_restaurante.sondeo)} MB por restaurante con el sondeo (supuesto) y ${n1(r.consumo_por_restaurante.eventos)} MB con avisos (la línea abierta cuesta ${s.mb_por_linea_abierta * 1000} KB [medido]).` : ''}

**Límite hoy:** ${r.restaurantes_hoy > 100000 ? 'sin tope práctico (más de 100,000 restaurantes)' : r.limite_hoy.texto}. **Con avisos:** ${r.restaurantes_con_eventos == null || r.restaurantes_con_eventos > 100000 ? 'sin tope práctico' : `${n0(r.restaurantes_con_eventos)} restaurantes`}. **${r.es_cuello_hoy ? '🔴 Es el cuello de botella de hoy (sin purga).' : r.es_cuello_con_eventos ? '🔴 Es el cuello de botella con avisos (sin purga).' : 'No es el cuello sin purga.'}**${r.recurso === 'lineas' ? ' **Es un tope de diseño supuesto, sin medir.**' : ''}

`).join('\n')}
## 3. El disco a fondo (medido con datos sintéticos en PostgreSQL local)

**Cómo se midió:** copia de una base con 10 restaurantes medianos, un mes de visitas (${n0(visitasMed)} visitas), 10 eventos de analítica por visita **[supuesto]**; \`pg_relation_size\` y \`pg_indexes_size\` por tabla ([guion](2026-11-14-recursos-medir.py)). **Sesgo conocido:** el generador deja \`miembro_id\`, \`platillo_id\`, \`ip_hash\` y el navegador sin variación; en la copia se rellenaron con valores variados (miembro de la sesión, platillo del restaurante, 64 caracteres hexadecimales distintos por sesión y día, 8 navegadores). Con tráfico real pesaría distinto. TOAST = 0.

| Tabla | Filas por visita | Bytes por visita: tabla | Bytes por visita: índices | Total | % de la visita |
|---|---|---|---|---|---|
${porTabla.sort((a, b) => b.total_por_visita - a.total_por_visita).map((x) => `| \`${x.tabla}\` | ${n1(x.filas_por_visita)} | ${n0(x.heap_por_visita)} | ${n0(x.indices_por_visita)} | **${n0(x.total_por_visita)}** | ${n0((100 * x.total_por_visita) / totalVisita)} % |`).join('\n')}
| **Suma** | | | | **${n0(totalVisita)}** | 100 % |

*(las tablas de la visita salen de la medición anterior con el generador original; la analítica, de la copia con valores variados.)*

**Por qué pesa la analítica (\`evento_analitica\`): ${bytesEvento} bytes por evento = ${s.bytes_por_evento.heap} en la tabla + ${s.bytes_por_evento.indices} en índices.** (1) **Una fila por evento:** diez por visita. (2) **\`ip_hash\` ocupa ${n0(colFila.ip_hash)} bytes** (64 caracteres de texto; 8 bastarían) y es el ${n0((100 * colFila.ip_hash) / sumaCols)} % de los datos de la fila. (3) **Tres o más UUID de 16 bytes** (restaurante, mesa, sesión, miembro, platillo), \`tipo\` en texto (${n1(colFila.tipo)}), \`user_agent_fam\` en texto (${n0(colFila.user_agent_fam)}) y \`propiedades\` jsonb (${n1(colFila.propiedades)}); suma de columnas ${n0(sumaCols)} bytes más el encabezado de 23 de PostgreSQL. (4) **Siete índices** (${n0(s.bytes_por_evento.indices)} bytes por evento): ${idxEv.map((x) => `\`${x.indice}\` ${n0(x.bytes_por_evento)}`).join(' · ')}.

**Claves de idempotencia:** vacía hasta la Fase 3; medido, una fila pesa ${s.idempotencia_bytes_por_fila} bytes con su índice.

## 4. Palancas por recurso

Cada palanca se evalúa **sola** sobre la base **sin purga (12 meses acumulados)** y, para el disco, también sobre la base **con el historial del gratuito a 30 días**; no se suman las que se pisan. «Caben» = restaurantes típicos por el recurso, en Hobby con avisos. **La analítica agregada por día usa la cota de ${s.factores_disco_eventos.platillos_cota} platillos** (el gratuito permite 150; la copia tiene ${s.factores_disco_eventos.platillos_en_la_copia}: con ellos el factor es ${s.factores_disco_eventos.agregada_por_dia_con_platillos_de_la_copia} en vez de ${s.factores_disco_eventos.agregada_por_dia_cota_alta}). **Las palancas «índices mínimos» y «tipos» salen de datos sintéticos y pueden quedar optimistas** (con tráfico real el índice pesa más). Dos muestras de cartas con sesgos opuestos (148 cartas de reparto: cortas; sitios propios: largas y formales) respaldan el tope de 150 platillos: ver [tres-planes](2026-11-14-tres-planes.md).

${R.recursos.filter((r) => r.palancas.some((p) => p.en_tablero)).map((r) => `### ${r.nombre}\n\n| Palanca | Antes | Después | Ganancia | Esfuerzo | Riesgo | Regla dura o ADR | Cifra |\n|---|---|---|---|---|---|---|---|\n${palRows(r)}\n`).join('\n')}
**Memoria y fotos:** ninguna palanca por ahora.

### Ajustes menores (fuera del tablero)

**Regla del tablero:** ${tableroR.regla}; umbral ${Math.round(tableroR.umbral * 100)} % (un juicio: con 10 % entrarían también índices y tipos, +11 %; entre 12 % y 43 % la lista no cambia). Las demás palancas quedan aquí; siguen en el JSON.

| Ajuste menor | Qué es | Sube la capacidad del recurso que toca (máximo) |
|---|---|---|
${tableroR.ajustes_menores.map((id) => `| **${M.PALANCAS[id].accion}** | ${M.PALANCAS[id].que_es} | ${n1(tableroR.palancas[id].ganancia_maxima * 100)} % |`).join('\n')}


**Efecto en los números del modelo.** Las palancas entran en \`config.palancas\` y mueven \`resumen\`: «restaurantes gratuitos que caben **con el historial que dice \`config\` (30 días, propuesta)**» = ${n0(kpiBase.recomendado)}; **sin purga (12 meses acumulados)** = ${n0(M.resumen(rec, s, 1000).cifras.find((f) => f.clave === 'restaurantes_que_caben_sin_purga').recomendado)}; con la analítica agregada por día (sobre 30 días): ${n0(kpiAgregada.recomendado)}.

## 5. La escalera: el tamaño del servidor que rentamos

| Tamaño del servidor | USD al mes (base a con carga) | Restaurantes que caben · recurso que obliga a subir (sin purga) | Con el historial a 30 días |
|---|---|---|---|
${esc}

**Lectura.** Cada tamaño se llena por **el recurso en negritas**. Sin purga el disco manda en todos los tamaños de Hobby y Pro (50 GB tampoco alcanza con 12 meses); con 30 días de historial el procesador manda a partir del servidor Pro. **El de 8 procesos topa en las ${s.lineas_max_railway.toLocaleString('en-US')} líneas abiertas de Railway (tope de diseño supuesto, sin medir); más allá hay que repetir toda la pila (extrapolación sin medir).**

## 6. Glosario en llano

${Object.entries(R.glosario).map(([k, v]) => `- **${k.replace(/_/g, ' ')}.** ${v}`).join('\n')}

## 7. Qué no está medido

- **Procesador, memoria y conexiones en Railway:** todo sale de mediciones locales (±2×); falta \`SHOW max_connections\`, cuántos núcleos entrega Hobby y la CPU real con tráfico del piloto.
- **Disco:** medido con datos sintéticos; con tráfico real, otra distribución de \`ip_hash\`, navegador y platillos.
- **Estado en memoria 60 s:** extrapola una medición por comensal (0.88 → 0.47 ms) a todo el procesador y **deja de importar al llegar los avisos**.
- **Retención de 7 días, archivo de sesiones y cierre de líneas ociosas:** estimadas con su supuesto; el archivo de sesiones **toca las reglas 8 y 9 y pide ADR**; el historial a 30 días y la retención de 7 días **contradicen 03 §7**.
- **Claves de idempotencia por visita (${s.claves_idempotencia_por_visita}):** supuesto; la tabla se llena hasta la Fase 3.
`;
writeFileSync(join(salida_dir, '2026-11-14-recursos-y-palancas.md'), md);
console.log('ok recursos:', R.cuello_hoy.recurso, R.cuello_hoy.restaurantes, R.cuello_con_eventos.recurso, R.cuello_con_eventos.restaurantes);
