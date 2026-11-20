// Genera 2026-11-17-costo-de-platillo.{md,json}: lo que cuesta técnicamente un platillo del plan gratuito (ninguna cifra a mano).
// Uso: node 2026-11-17-costo-de-platillo.mjs   (las medidas salen de 2026-11-17-platillo-medir.py, vía parámetros)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const out = process.env.CARTA_SALIDA ?? aqui;
const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
const rec = M.configInicial();
const c = M.costoDePlatillo(rec, s);
const pl = s.platillo;
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US');
const n2 = (x) => (Math.round(x * 100) / 100).toLocaleString('en-US');
const pc = (x) => `${Math.round(x * 100)} %`;
const kb = (b) => n0(b / 1000);

const md = `# Cuánto cuesta un platillo del plan gratuito (generado; no editar a mano)

Generado por \`2026-11-17-costo-de-platillo.mjs\` desde \`2026-11-14-parametros.json\` (medidas de \`2026-11-17-platillo-medir.py\` en PostgreSQL local, con textos y fotos sintéticos del repositorio). Pregunta de Calvin (17-nov): «si aumento de 50 a 150, ¿el disco duro o el procesador no se acaban?».

## Conclusión

${c.conclusion}

## Qué es medido y qué es supuesto

| Concepto | Valor | Origen |
|---|---|---|
| Fila de \`platillo\` con sus índices | ${pl.bytes_en_la_base} bytes (rango del modelo ${n0(pl.rango_bytes_en_la_base[0])} a ${n0(pl.rango_bytes_en_la_base[1])}) | medido (marginal con 10,000 filas) |
| Foto procesada (miniatura + detalle) | ${kb(pl.foto_variantes_bytes_real)} KB (rango ${kb(pl.rango_foto_variantes_bytes_real[0])} a ${kb(pl.rango_foto_variantes_bytes_real[1])}) | supuesto: las fotos de prueba son pequeñas y sintéticas; medir con 10 fotos reales del piloto |
| Foto original (bucket privado, AC-17.2) | ${n1(pl.foto_original_bytes_tipico / 1e6)} MB (rango ${n1(pl.rango_foto_original_bytes[0] / 1e6)} a ${n1(pl.rango_foto_original_bytes[1] / 1e6)}) | supuesto: foto de teléfono; medir con las del piloto |
| Parte de platillos con foto | ${pc(pl.parte_con_foto)} | supuesto: medir en el piloto |
| JSON del menú por platillo | ${n0(pl.menu_json_bytes_por_platillo)} bytes | medido |
| Armar el menú | ${n1(pl.ms_armar_menu_base)} ms + ${n2(pl.ms_armar_menu_por_platillo)} ms por platillo | medido en un contenedor de nube, no en Railway |
| R2 gratis | ${n0(s.r2_gratis_gb)} GB | documento del repositorio (ADR-015) |

## Por tope

| Platillos | Base por restaurante | Fotos en R2 por restaurante | Gratuitos solos con foto que caben en R2 gratis (con la mezcla de paga: menos) | Menú (JSON) | Armar el menú | Disco (restaurantes, con avisos) | Procesador (con avisos / con sondeo) | Cuello |
|---|---|---|---|---|---|---|---|---|
${c.filas.map((f) => `| ${f.platillos} | ${n1(f.base_de_datos.bytes_por_restaurante / 1000)} KB | ${n2(f.fotos_en_r2.gb_por_restaurante)} GB (${n2(f.fotos_en_r2.rango_gb[0])} a ${n2(f.fotos_en_r2.rango_gb[1])}) | ${n0(f.fotos_en_r2.restaurantes_que_caben_en_lo_gratis)} (${n0(f.fotos_en_r2.rango_restaurantes[0])} a ${n0(f.fotos_en_r2.rango_restaurantes[1])}) | ${kb(f.menu.json_bytes)} KB | ${n1(f.menu.ms_armar_por_cada_30_segundos)} ms | ${n0(f.capacidad.con_avisos.disco)} | ${n0(f.capacidad.con_avisos.procesador)} / ${n0(f.capacidad.con_sondeo.procesador)} | ${f.capacidad.con_avisos.cuello} / ${f.capacidad.con_sondeo.cuello} |`).join('\n')}

Pasarse de lo gratis de R2 cuesta ${n2(c.filas[0].fotos_en_r2.pesos_al_mes_por_restaurante_si_se_pasa)} pesos al mes por restaurante con ${c.filas[0].platillos} platillos y ${n2(c.filas[c.filas.length - 1].fotos_en_r2.pesos_al_mes_por_restaurante_si_se_pasa)} con ${c.filas[c.filas.length - 1].platillos}.

## Cobertura y negocios de paga

| Platillos | Caben, cota baja | Caben, cota alta | De 0 a 5 personas dentro de Chef (baja a alta) | De paga por cada 1,000 |
|---|---|---|---|---|
${c.filas.map((f) => `| ${f.platillos} | ${pc(f.cobertura_de_platillos.baja)} | ${pc(f.cobertura_de_platillos.alta)} | ${pc(f.cobertura_de_0_a_5_dentro_de_chef.baja)} a ${pc(f.cobertura_de_0_a_5_dentro_de_chef.alta)} | ${n0(f.clientes_de_paga_por_1000_por_el_tope)} |`).join('\n')}

Las dos cotas son muestras de sesgo opuesto (sitios propios: 56 cartas largas; reparto: 148 cartas cortas) y no se sabe cuál es la real. La capacidad se calcula con la mezcla de gratuitos y de paga **fija** para aislar el efecto del tope; el efecto del tope sobre esa mezcla es la última columna.

## Supuestos del cálculo

- Procesador con avisos: cota alta, se supone que el menú se arma de nuevo cada ${pl.armado_cada_segundos} s en la hora pico.
- Fotos reales y originales: supuestos con rango; las fotos procesadas medidas son sintéticas.
`;
writeFileSync(join(out, '2026-11-17-costo-de-platillo.md'), md);
writeFileSync(join(out, '2026-11-17-costo-de-platillo.json'), JSON.stringify(c, null, 2) + '\n');
console.log('ok costo-de-platillo');
