// Genera 2026-11-17-historia-del-disco.{md,json}: qué se guarda con una mesa de tres comensales y cómo queda con cada opción para ahorrar disco,
// incluida la propuesta de Calvin (una fila por visita de comensal). Ninguna cifra a mano. Uso: node 2026-11-17-historia-del-disco.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const out = process.env.CARTA_SALIDA ?? aqui;
const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
const rec = M.configInicial();
const h = M.historiaDelDisco(rec, s);
const fv = s.fila_por_visita;
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US');
const n2 = (x) => (Math.round(x * 100) / 100).toLocaleString('en-US');
const pc = (x) => `${n0(x * 100)} %`;
const o = Object.fromEntries(h.opciones.map((x) => [x.id, x]));
const upd = fv.actualizando_2_veces;
const upd70 = fv.actualizando_2_veces_fillfactor_70;

const md = `# Historia del disco: una mesa de tres comensales (generado; no editar a mano)

Generado por \`2026-11-17-historia-del-disco.mjs\` desde \`2026-11-14-parametros.json\`. Datos: bytes por fila (con índices) de una copia de medición en PostgreSQL local con **datos sintéticos** (\`2026-11-17-fila-por-visita-medir.py\` y \`2026-11-14-recursos-medir.py\`); con tráfico real cambia.

## 1. Paso a paso: qué se guarda cuando entra una mesa de ${h.comensales}

| Paso | Tabla | Filas | Bytes por fila | Bytes | Acumulado |
|---|---|---|---|---|---|
${h.pasos.map((x) => `| ${x.paso} | \`${x.tabla}\` | ${n1(x.filas)} | ${n0(x.bytes_por_fila)} | ${n0(x.bytes)} | ${n0(x.acumulado)} |`).join('\n')}

**Una mesa de ${h.comensales} deja ${n1(h.bytes_total / 1000)} KB en la base: ${n1(h.bytes_de_la_mesa_sin_analitica / 1000)} KB de la mesa y ${n1(h.bytes_de_analitica / 1000)} KB (${pc(h.bytes_de_analitica / h.bytes_total)}) de analítica.** La analítica es la mitad de lo que deja la visita, y es la parte que se puede cambiar sin tocar la orden ni la comanda. Los conteos por sesión salen de los cocientes de la copia; los eventos por sesión (${s.tablas_de_una_visita.eventos_por_sesion}) son un supuesto del generador de datos.

## 2. Cómo queda lo guardado con cada opción

Por mesa de ${h.comensales}, lo que ocupa la analítica; y cuántos restaurantes caben por disco (con avisos, carga por topes) sin purga y con el historial del plan gratuito a 30 días.

| Opción | Qué queda en la base | Qué se pierde | Analítica por mesa de ${h.comensales} (bytes) | Analítica por restaurante al mes (MB, en la copia) | Caben sin purga | Caben con historial a 30 días |
|---|---|---|---|---|---|---|
${h.opciones.map((x) => `| ${x.nombre} | ${x.que_queda} | ${x.se_pierde} | ${n0(x.bytes_analitica_por_mesa_de_3)} | ${n2(x.mb_analitica_por_restaurante_mes_en_la_copia)} | ${n0(x.restaurantes_que_caben_sin_purga)} | ${n0(x.restaurantes_que_caben_con_historial_30_dias)} |`).join('\n')}

Comprar disco: ${h.comprar_disco} «Archivar» no baja la analítica (mueve las sesiones viejas); las bajas de «contar por día» y «fila por visita» son a **el volumen de la copia** (${n0(fv.sesiones_en_la_copia / fv.restaurantes_en_la_copia)} sesiones por restaurante-mes, ${n0((fv.sesiones_en_la_copia / fv.restaurantes_en_la_copia) * s.tablas_de_una_visita.eventos_por_sesion)} eventos): contar por día crece con los días y los platillos, no con las visitas, así que con más visitas gana más.

## 3. La propuesta de Calvin, medida

**Qué es:** una fila por comensal y visita, armada en el teléfono, con los pares «veces que entró / segundos totales» para menú, platillo, búsqueda y filtros (ocho enteros chicos), que el teléfono manda al terminar.

| Medida (PostgreSQL local, ${n0(fv.visitas_de_comensal_en_la_copia)} visitas de comensal) | Valor |
|---|---|
| Bytes por visita de comensal, llave (restaurante, día, miembro) | **${n0(fv.bytes_por_visita_de_comensal)}** |
| …con un índice más por miembro | ${n0(fv.bytes_con_indice_por_miembro)} |
| …sin la columna del restaurante | ${n0(fv.bytes_sin_restaurante)} |
| Analítica de hoy por visita de comensal | ${n0(h.opciones[0].bytes_analitica_por_mesa_de_3 / h.comensales)} (por mesa de ${h.comensales}: ${n0(h.opciones[0].bytes_analitica_por_mesa_de_3)}) |
| Tamaño total frente a la analítica de hoy | ${pc(fv.sola)} (con el conteo por platillo: ${pc(fv.con_platillo_por_dia)}) |
| Actualizar la fila 2 veces (la manda 3 veces): tabla antes → después | ${n1(upd.antes / 1e6)} MB → ${n1(upd.despues / 1e6)} MB; sólo ${n0(upd.hot)} de ${n0(upd.de)} actualizaciones son HOT |
| …con \`fillfactor\` 70 | ${n1(upd70.antes / 1e6)} MB → ${n1(upd70.despues / 1e6)} MB; ${n0(upd70.hot)} de ${n0(upd70.de)} HOT (${pc(upd70.hot / upd70.de)}) |

### Qué se gana
- **${pc(1 - fv.sola)} menos disco que hoy** por visita (${n0(fv.bytes_por_visita_de_comensal)} frente a ${n0(h.opciones[0].bytes_analitica_por_mesa_de_3 / h.comensales)} bytes por comensal) y, a diferencia de «contar por día», conserva **qué hizo cada comensal** (tiempo en cada lugar), útil para saber si buscan o sólo miran.
- **No necesita \`ip_hash\`** ni navegador por evento; la huella de red deja de guardarse y la regla 10 se cumple mejor.
- Menos peticiones del teléfono (una al terminar frente a lotes cada 5 s) y menos escrituras: un INSERT por visita.

### Qué se pierde o cuesta
- **El platillo visto**: la fila no dice qué platillo; se recupera con un conteo diario por platillo (la combinación: ${pc(fv.con_platillo_por_dia)} del disco de hoy, ${n0(o.fila_mas_platillo.restaurantes_que_caben_con_historial_30_dias)} restaurantes con historial a 30 días frente a ${n0(o.fila_por_visita.restaurantes_que_caben_con_historial_30_dias)} con la fila sola).
- **Depende de que el teléfono mande la fila**: si se cierra el navegador o se apaga el teléfono antes, esa visita no queda; se puede mandar también al ocultarse la página, pero no es garantía.
- **Actualizar cuesta**: cada actualización deja una versión muerta; con 2 actualizaciones la tabla pasa de ${n1(upd.antes / 1e6)} a ${n1(upd.despues / 1e6)} MB aun con vacuum. Conviene **un solo INSERT al terminar** (idempotente por la llave) y no actualizar.
- **Contar por día sigue siendo más chico a más visitas** (crece con días y platillos): con la copia ${n2(o.contar_por_dia.mb_analitica_por_restaurante_mes_en_la_copia)} MB frente a ${n2(o.fila_por_visita.mb_analitica_por_restaurante_mes_en_la_copia)} MB por restaurante al mes.

## 4. Supuestos y datos por conseguir
${h.supuestos.map((x) => `- ${x}`).join('\n')}
- **Por conseguir:** con el piloto, medir los eventos reales por comensal, las visitas por restaurante al mes y qué parte de los teléfonos alcanza a mandar la fila al terminar (comparar con los \`scan\`).
`;
writeFileSync(join(out, '2026-11-17-historia-del-disco.md'), md);
writeFileSync(join(out, '2026-11-17-historia-del-disco.json'), JSON.stringify(h, null, 2) + '\n');
console.log('ok historia-del-disco');
