// Genera 2026-11-17-como-gana-dinero-carta.{md,json} desde el modelo (ninguna cifra a mano). Uso: node 2026-11-17-como-gana-dinero.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida_dir = process.env.CARTA_SALIDA ?? aqui;
const s = M.valores(JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8')));
const rec = M.configInicial();
const n0 = (x) => (x == null ? '—' : Math.round(x).toLocaleString('en-US'));
const n1 = (x) => (x == null ? '—' : (Math.round(x * 10) / 10).toLocaleString('en-US'));
const sg = (x) => (x >= 0 ? `+${n0(x)}` : `−${n0(-x)}`);
const mes = (x) => (x == null ? 'más de 60 meses' : `mes ${x}`);

const modelos = M.modelosDeIngreso(rec, s);

const tabla = M.tablaSueldos(rec, s);
const sueldoCero = M.sueldo(rec, s, 0);
const plat = s.plataformas_referencia;
const sm = s.salario_minimo;
const m = Object.fromEntries(modelos.modelos.map((x) => [x.id, x]));
const cuanto = (o) => (o && o.centro != null ? `${n1(o.centro)} (rango ${n1(o.minimo)} a ${n1(o.maximo)})` : '—');
const potencial = (x) => {
  const p = x.potencial_pesos_por_restaurante_al_mes;
  if (x.id === 'suscripcion_del_restaurante') return `${n0(p.por_restaurante_de_paga)} por restaurante de paga (deja ${n0(p.deja_por_restaurante_de_paga)}); por restaurante registrado ${cuanto(p.por_restaurante_registrado)}`;
  if (x.id === 'anuncios_del_comensal') return `por restaurante gratuito ${n1(p.por_restaurante_gratuito.baja)} (tarifa baja) · ${n1(p.por_restaurante_gratuito.media)} (media) · ${n1(p.por_restaurante_gratuito.alta)} (alta)`;
  if (x.id === 'visibilidad_pagada') return `por restaurante gratuito ${cuanto(p.por_restaurante_gratuito)}`;
  if (x.id === 'comision_por_transaccion') return `0 a 10 personas ${cuanto(p.de_0_a_10_personas)}; 11 a 50 personas ${cuanto(p.de_11_a_50_personas)}`;
  return `por restaurante ${cuanto(p.por_restaurante)} (techo, repartido entre los restaurantes que visita cada comensal)`;
};

const mn = M.modeloDeNegocio(rec, s);
const v2 = mn.tipo_de_plataforma.vision_v2_de_calvin;
const salida = { version: M.VERSION, fecha: '2026-11-17', sueldo_fundador: { por_omision: s.sueldo_fundador, nota: 'sin valor por omisión inventado: 0 = todavía sin sueldo; Calvin lo elige', salario_minimo: sm, tabla_de_niveles: tabla, sin_sueldo: sueldoCero }, modelos_de_ingreso: modelos, plataformas_de_referencia: plat, modelo_de_negocio: mn, secuencia: null };

const secuencia = [
  { modelo: 'Suscripción del restaurante (Master Chef)', cuando: 'Piloto', requisito: 'Nada nuevo: la v1', riesgo: 'La curva de pago no tiene dato: la prueba de tres precios del piloto la mide' },
  { modelo: 'Anuncios al comensal del plan gratuito', cuando: `Con la Spec 002 «Planes», después del piloto (hacia el mes ${s.mes_inicio_anuncios}, supuesto)`, requisito: 'ADR, abrir la política de seguridad, aviso de privacidad y aprobación de la red de anuncios; sin anuncios personalizados', riesgo: 'Tarifa, parte con anuncio y aprobación de la red sin dato: una prueba con 3 restaurantes' },
  { modelo: 'Visibilidad pagada dentro de Carta', cuando: 'Spec nueva, después de la Fase 3 y con restaurantes reales', requisito: 'Spec: qué se puede patrocinar y cómo se distingue de la carta; sin datos del comensal', riesgo: 'No hay dato de cuánto pagaría un patrocinador: prueba con 3 patrocinadores' },
  { modelo: 'Comisión por transacción', cuando: 'Spec nueva y ADR: no antes de una v2 (hoy fuera de la v1)', requisito: 'Cobrar o procesar pagos: contradice «Qué NO construir»; posible regulación financiera (verificar con un abogado)', riesgo: 'Cambia la naturaleza del producto y su regulación' },
  { modelo: 'Pago del comensal', cuando: 'Spec nueva y ADR: no antes de una v2 (hoy fuera de la v1)', requisito: 'Cuenta o perfil del comensal: contradice la regla 10 y «Qué NO construir»', riesgo: 'Rompe el principio de comensal anónimo' },
];
salida.secuencia = secuencia;
writeFileSync(join(salida_dir, '2026-11-17-como-gana-dinero-carta.json'), JSON.stringify(salida, null, 1));

const md = `# Cómo gana dinero Carta y cuándo le paga a su fundador

**Fecha:** 17 de noviembre de 2026 · **Generado por \`2026-11-17-como-gana-dinero.mjs\`** desde el modelo ([JSON](2026-11-17-como-gana-dinero-carta.json)). **La v1 no cobra ni tiene planes.** Lo que va marcado «fuera de la v1» sólo se calcula para ver el tamaño. **No se venden datos (decisión de Calvin, 14-nov) ni se guardan datos personales del comensal (regla 10).**

**Postura de Calvin (17-nov):** «no estamos considerando un salario para mí todavía, pero eventualmente buscaré ganar de esto… quiero que me ayudes a darle forma para poder ganar dinero de eso también». Su investigación (una conversación con un asistente, 17 de noviembre, sin versión ni enlaces) se trata como **secundaria**: toda cifra de plataformas se verificó o se marca «no verificada» (§4).

## Conclusiones

1. **Hoy Carta no le paga a su fundador: \`sueldo_fundador\` está en 0 y no hay valor por omisión inventado.** La tabla de §1 da niveles de referencia (múltiplos del salario mínimo general: ${sm.zona_general_dia} pesos por día en 2026 [fuente]) y, para cada uno, cuántos restaurantes y clientes de paga hacen falta.
2. **Con un sueldo de ${n0(tabla[1].sueldo_mensual)} pesos al mes (3 salarios mínimos), el margen después de captación lo cubre con ${n0(tabla[1].escenarios.recomendado.restaurantes_necesarios)} restaurantes registrados y ${n0(tabla[1].escenarios.recomendado.clientes_de_paga_necesarios)} de paga en el recomendado (${mes(tabla[1].escenarios.recomendado.mes_en_que_el_margen_despues_de_captacion_lo_cubre)} de la proyección); en el peor, ${n0(tabla[1].escenarios.peor.restaurantes_necesarios)}; en el mejor, ${n0(tabla[1].escenarios.mejor.restaurantes_necesarios)}.**
3. **Carta no es hoy una plataforma tipo Airbnb o Uber: es una herramienta gratuita con anuncios más suscripción, que sirve a un comensal que ya está sentado, sin transacción dentro (§3).** El hueco frente a Meniu (que no tiene plan gratuito) es el negocio de 0 a 5 personas: ${n0(mn.hueco_frente_a_meniu.tamano_del_hueco.de_0_a_5_personas)} de ${n0(mn.hueco_frente_a_meniu.tamano_del_hueco.clientes_potenciales)} clientes potenciales, de los que caben en Chef ${n0(mn.hueco_frente_a_meniu.tamano_del_hueco.caben_en_chef)} (supuesto) (§4).
4. **De los cinco modelos de ingreso, dos están en la v1 (suscripción y anuncios) y tres no:** visibilidad pagada (cabe con una spec nueva, después del piloto) y comisión y pago del comensal (fuera de la v1: exigen pagos o cuenta del comensal).
5. **El tamaño por restaurante al mes (supuestos y rango en §2):** suscripción ${n0(m.suscripcion_del_restaurante.potencial_pesos_por_restaurante_al_mes.por_restaurante_de_paga)} por restaurante de paga; anuncios ${n1(m.anuncios_del_comensal.potencial_pesos_por_restaurante_al_mes.por_restaurante_gratuito.baja)} a ${n1(m.anuncios_del_comensal.potencial_pesos_por_restaurante_al_mes.por_restaurante_gratuito.alta)} por restaurante gratuito; **comisión por transacción (fuera de la v1) ${n0(m.comision_por_transaccion.potencial_pesos_por_restaurante_al_mes.de_0_a_10_personas.centro)} por restaurante de 0 a 10 personas con supuestos**, que es el modelo de mayor tamaño y el que la v1 excluye.
6. **Secuencia recomendada:** piloto = suscripción; con la Spec 002 «Planes», después del piloto = anuncios y, con spec nueva, visibilidad pagada; comisión y pago del comensal sólo con ADR y spec de una v2 (§3).

## 1. Sueldo del fundador en el modelo

\`sueldo_fundador\` es un parámetro deslizable (pesos al mes): ${s.sueldo_fundador === 0 ? '**vale 0 por omisión y no se inventa un valor**; Calvin lo elige' : n0(s.sueldo_fundador)}. \`sueldo(config, s, monto)\` y \`tablaSueldos(config, s)\` lo calculan por escenario. **Niveles de referencia:** múltiplos del salario mínimo general de ${sm.zona_general_dia} pesos por día (${sm.fuente}; ${sm.cita}) × 30.4 días; no son una recomendación.

| Sueldo al mes | Veces el mínimo | Escenario | Restaurantes registrados necesarios | Clientes de paga | Mes en que el margen después de captación lo cubre | Margen después de sueldo: 1,000 restaurantes · mes 12 · mes 24 |
|---|---|---|---|---|---|---|
${tabla.flatMap((fila) => ['recomendado', 'peor', 'mejor'].map((k, i) => { const e = fila.escenarios[k]; return `| ${i === 0 ? n0(fila.sueldo_mensual) : ''} | ${i === 0 ? fila.veces_el_salario_minimo : ''} | ${k} | ${e.restaurantes_necesarios == null ? 'más de 20,000' : n0(e.restaurantes_necesarios)}${e.requiere_otra_arquitectura ? ' (exige otra arquitectura)' : ''} | ${n0(e.clientes_de_paga_necesarios)} | ${mes(e.mes_en_que_el_margen_despues_de_captacion_lo_cubre)} | ${sg(e.margen_despues_de_sueldo.con_1000_restaurantes)} · ${sg(e.margen_despues_de_sueldo.mes_12)} · ${sg(e.margen_despues_de_sueldo.mes_24)} |`; })).join('\n')}

**Sin sueldo** (referencia): margen después de captación con 1,000 restaurantes ${sg(sueldoCero.escenarios.recomendado.margen_despues_de_sueldo.con_1000_restaurantes)} (recomendado), ${sg(sueldoCero.escenarios.peor.margen_despues_de_sueldo.con_1000_restaurantes)} (peor), ${sg(sueldoCero.escenarios.mejor.margen_despues_de_sueldo.con_1000_restaurantes)} (mejor). El piso de verdad no cubre ningún sueldo.

**Sigue sin modelar:** ${sueldoCero.no_modelado.join('; ')}. El margen es antes de captación, sueldos e impuestos; un sueldo real cuesta más que el sueldo bruto.

## 2. Mapa de modelos de ingreso aplicados a Carta

Cada modelo con a quién se le cobra, el potencial en pesos al mes (con supuestos y rango), lo que exige y cuándo cabría. **Los potenciales de visibilidad, comisión y pago del comensal son supuestos sin dato** (parámetros con rango en \`2026-11-14-parametros.json\`): sirven para ver el tamaño, no como proyección.

${modelos.modelos.map((x, i) => `### 2.${i + 1} ${x.nombre}${x.vigente ? ' (vigente)' : ''}

- **A quién se le cobra:** ${x.se_cobra_a}.
- **Potencial (pesos al mes):** ${potencial(x)}.
- **Supuestos:** ${x.supuestos}.
- **Qué exige:** ${x.exige}.
- **Cuándo cabría:** ${x.cuando}.
`).join('\n')}
## 3. Qué tipo de plataforma es Carta, hoy y a dónde puede ir

**${mn.tipo_de_plataforma.pregunta}** ${mn.tipo_de_plataforma.respuesta} (La premisa «somos como BlaBlaCar, Airbnb o Uber» no se da por buena: se compara.)

| Modelo | Quién paga | Quién usa gratis | ¿Conecta oferta y demanda nuevas? | ¿Hay transacción dentro? | Cifras (fuente primaria el 17-nov, o marcada) |
|---|---|---|---|---|---|
${mn.tipo_de_plataforma.comparacion.map((x) => `| **${x.modelo}** | ${x.quien_paga} | ${x.quien_usa_gratis} | ${x.conecta_oferta_y_demanda_nuevas ? 'sí' : 'no'} | ${x.hay_transaccion_dentro ? 'sí' : 'no'} | ${x.cifras_verificadas} |`).join('\n')}

**Dónde cae la v1:** ${mn.tipo_de_plataforma.donde_cae_la_v1.join(' ')}

## 3a. Lo que deja cada tamaño de negocio (techo teórico, no proyección)

${(() => { const pt = M.potencialPorTramo(rec, s); return `| Personas | Negocios [medido, DENUE] | En Chef | En Master Chef | Anuncios de Chef al mes (tarifa baja / media / alta) | Suscripción de Master Chef si todos pagaran | Con la curva pesimista / media / optimista |
|---|---|---|---|---|---|---|
${pt.tramos.map((x) => `| ${x.tramo} | ${n0(x.negocios)} | ${n0(x.en_chef)} | ${n0(x.en_master_chef)} | ${n0(x.ingreso_de_anuncios_al_mes.baja)} / ${n0(x.ingreso_de_anuncios_al_mes.media)} / ${n0(x.ingreso_de_anuncios_al_mes.alta)} | ${n0(x.ingreso_de_suscripcion_al_mes.si_todos_pagaran)} | ${n0(x.ingreso_de_suscripcion_al_mes.por_curva_de_pago.pesimista)} / ${n0(x.ingreso_de_suscripcion_al_mes.por_curva_de_pago.media)} / ${n0(x.ingreso_de_suscripcion_al_mes.por_curva_de_pago.optimista)} |`).join('\n')}

**Aviso sobre la curva de pago:** ${pt.nota_curva}`; })()}

## 3b. Visión de Calvin para una versión 2 (NO es la v1 ni la Fase 3)

**Postura de Calvin (17-nov):** ${v2.postura_de_calvin}

**En la v1:** ${v2.en_la_v1}

**Conflicto con las reglas:** ${v2.conflicto_con_las_reglas}.

### Anuncios genéricos frente a personalizados (por restaurante gratuito al mes, en pesos)

El restaurante de paga **no muestra anuncios**: su ingreso de anuncios es ${n0(v2.anuncios.por_tarifa.media.pesos_por_pagante)} y cambia por la suscripción. Tarifa personalizada = genérica × ${n1(v2.anuncios.factor)} (**supuesto**, rango ${n1(v2.anuncios.rango_factor[0])} a ${n1(v2.anuncios.rango_factor[1])}: entre +4 % de un estudio independiente de 2019 y ×2.1 a ×2.8 del estudio de Google de 2019, que midió cookies y no consentimiento). Parte de comensales registrados en la v2: ${n1(v2.anuncios.parte_registrados_v2 * 100)} % (**supuesto**, rango ${n1(v2.anuncios.rango_parte[0] * 100)} a ${n1(v2.anuncios.rango_parte[1] * 100)} %; en la v1 es 0).

| Tarifa base | Genérica (por mil) | Personalizada (por mil) | Por gratuito en la v1 | Por gratuito en la v2 | Cambio | Rango v2 | Por 1,000 restaurantes v1 → v2 |
|---|---|---|---|---|---|---|---|
${['baja', 'media', 'alta'].map((k) => { const x = v2.anuncios.por_tarifa[k]; return `| ${k} | ${n1(x.tarifa_generica_por_mil)} | ${n1(x.tarifa_personalizada_por_mil)} | ${n1(x.pesos_por_gratuito_v1_todo_generico)} | ${n1(x.pesos_por_gratuito_v2_con_registrados)} | ${sg(x.cambio_por_gratuito_v2)} | ${n1(x.rango_v2[0])} a ${n1(x.rango_v2[1])} | ${n0(x.pesos_por_1000_restaurantes_v1)} → ${n0(x.pesos_por_1000_restaurantes_v2)} |`; }).join('\n')}

*La tarifa base y las visitas son supuestos (ver modelo); con ${n0(v2.anuncios.parte_que_paga_por_1000 * 1000)} de paga por cada 1,000 el ingreso de anuncios sale sólo de los gratuitos. Se mide con una prueba pequeña de AdSense con 3 restaurantes y, para la v2, con el registro voluntario.*

### Las tres rutas de la v2, lo que hay que cambiar antes y el orden sugerido

| Ruta | Qué habría que cambiar antes | Riesgo |
|---|---|---|
${v2.rutas.map((x) => `| ${x.ruta} | ${x.que_cambiar_antes.join('; ')} | ${x.riesgo} |`).join('\n')}

**Orden sugerido:**
${v2.orden_sugerido.map((x) => `- ${x}`).join('\n')}

**Marco legal (${v2.marco_legal.estado}):** ${v2.marco_legal.norma}. ${v2.marco_legal.lo_que_dice}. Fuente: ${v2.marco_legal.fuente}.

## 4. Dónde está el hueco frente a Meniu

**Meniu** (páginas leídas el ${mn.hueco_frente_a_meniu.meniu.consulta}: ${mn.hueco_frente_a_meniu.meniu.paginas.map((x) => `[${x.pagina}](${x.url})`).join(', ')}): ${mn.hueco_frente_a_meniu.meniu.precio_mes} pesos al mes, **prueba de ${mn.hueco_frente_a_meniu.meniu.prueba_dias} días y sin plan gratuito**; dice tener «+${n0(mn.hueco_frente_a_meniu.meniu.restaurantes_que_dice_tener)} restaurantes» (afirmación suya, no verificada). ${mn.hueco_frente_a_meniu.meniu.nota}.

| Función | Lo tiene Meniu | Lo tiene Carta (hoy / Fase 3) | Qué valdría rescatar después |
|---|---|---|---|
${mn.hueco_frente_a_meniu.tabla.map((x) => `| ${x.funcion} | ${x.meniu ? 'sí' : 'no'} | ${x.carta} | ${x.rescatar} |`).join('\n')}

**Tamaño del hueco:** ${mn.hueco_frente_a_meniu.tamano_del_hueco.lectura} **Supuesto:** ${mn.hueco_frente_a_meniu.tamano_del_hueco.supuesto}. **Lo que valdría rescatar primero (juicio, a decidir por spec):** las **tarjetas de lealtad** en Apple y Google Wallet, si se pueden hacer sin cuenta del comensal (regla 10); el programa de afiliados como canal de ventas barato; y, más adelante, pedidos por WhatsApp y reportes simples.

## 5. Cómo opera Carta con datos, con dinero y con usuarios

| | Renglón 1 | Renglón 2 | Renglón 3 |
|---|---|---|---|
| **Datos** | ${mn.como_opera.datos.join(' | ')} |
| **Dinero** | ${mn.como_opera.dinero.join(' | ')} |
| **Usuarios** | ${mn.como_opera.usuarios.join(' | ')} |

## 6. El modelo de negocio en una página

- **A quién sirve:** ${mn.una_pagina.a_quien_sirve}
- **Qué le resuelve:** ${mn.una_pagina.que_le_resuelve}
- **Quién paga y cuánto:** restaurante: ${mn.una_pagina.quien_paga_y_cuanto.restaurante}; anunciante: ${mn.una_pagina.quien_paga_y_cuanto.anunciante}; comensal: ${mn.una_pagina.quien_paga_y_cuanto.comensal}.
- **Fuentes de ingreso por etapa:** ${mn.una_pagina.fuentes_de_ingreso_por_etapa.map((x) => `**${x.etapa}:** ${x.fuente}`).join(' · ')}.
- **Costos:** infraestructura de hoy ≈ ${n1(mn.una_pagina.costos.infraestructura_hoy_usd_mes)} USD al mes; un gratuito cuesta ${n1(mn.una_pagina.costos.costo_por_restaurante_gratuito_pesos)} pesos al mes y un cliente de paga sostiene ${n0(mn.una_pagina.costos.gratuitos_que_sostiene_un_cliente_de_paga_sin_anuncios)} gratuitos sin anuncios; ${mn.una_pagina.costos.soporte}.
- **Meta de 12 meses:** ${mn.una_pagina.meta_12_meses.restaurantes} restaurantes, margen de operación del mes 12 ${sg(mn.una_pagina.meta_12_meses.margen_operacion_mes_12)} pesos (recomendado).
- **Qué hay que medir:** ${mn.una_pagina.que_hay_que_medir.join(' · ')}

## 7. Secuencia recomendada

| Modelo | Cuándo | Qué exige | Riesgo o dato que falta |
|---|---|---|---|
${secuencia.map((x) => `| ${x.modelo} | ${x.cuando} | ${x.requisito} | ${x.riesgo} |`).join('\n')}

**Sin vender datos y sin datos personales del comensal en el servidor** en ninguna fila.

## 8. Plataformas de referencia (verificadas en fuente primaria o marcadas)

${plat.map((x) => `- **${x.plataforma}:** ${x.cifra}. ${x.verificada ? `Fuente: ${x.url} (${x.fecha}; consultada el ${x.consulta}).` : `**No verificada** (${x.nota}).`}`).join('\n')}

**Lectura (de la investigación de Calvin, como hipótesis):** en servicios físicos y caros las plataformas cobran **comisión por transacción** al que gana; en servicios digitales masivos, **gratuito con anuncios más suscripción**; además cobran por **visibilidad** dentro de la plataforma. Carta v1 usa lo segundo (suscripción y anuncios); la comisión exigiría procesar pagos, que la v1 no hace.

## 9. Datos por conseguir
- **Curva de pago y precio de Master Chef:** prueba de tres precios del piloto.
- **Tarifa de anuncios, parte con anuncio y aprobación de la red:** prueba pequeña con 3 restaurantes.
- **Cuánto pagaría un patrocinador y qué parte de restaurantes aceptaría:** prueba con 3 patrocinadores después de la Fase 3.
- **Ventas, ticket y parte que pasaría por Carta:** carta y ventas reales de los negocios del piloto (el dato del INEGI es un promedio de la clase 722511).
- **Sueldo que Calvin quiere:** lo elige Calvin; el modelo lo resta del margen.
`;
writeFileSync(join(salida_dir, '2026-11-17-como-gana-dinero-carta.md'), md);
console.log('ok como-gana-dinero');
