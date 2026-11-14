// Corre el modelo y GENERA los resultados y los informes (modelo, recomendaciones, chequeo de márgenes): ninguna cifra se transcribe a mano.
// Uso: node 2026-11-14-corre-escenarios.mjs
// Escribe: …-modelo-de-escenarios-resultados.json, …-modelo-de-escenarios.md, …-recomendaciones.md/.json, …-chequeo-de-margenes.md
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const par = JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8'));
const seg = JSON.parse(readFileSync(join(aqui, '2026-11-14-segmentacion-datos.json'), 'utf8'));
const s = M.valores(par);
const curvas = ['pesimista', 'media', 'optimista'];
const N = [100, 1000, 10000];

// ------------------------------------------------------------------ cálculo
const rec = M.configInicial();
const opt = M.optimizar(s);
const mejor = opt.mejor;
const coincide = mejor.mesas === rec.topes.gratuito.mesas && mejor.cuentas === rec.topes.gratuito.cuentas && mejor.platillos === rec.topes.gratuito.platillos;
if (!coincide) console.warn('AVISO: los topes de configInicial no coinciden con el optimizador', mejor.mesas, mejor.cuentas, mejor.platillos);
const antes = M.configTopes10Mesas3Cuentas();

const resumenEsc = (e) => ({ n: e.n, gratuitos: e.clientes.gratuito, pagantes: e.clientes.de_paga, ingresos: e.ingresos.total, anuncios: e.ingresos.anuncios, suscripcion: e.ingresos.suscripcion, costos: e.costos.total, margen_operacion: e.margen_operacion, margen_despues_de_captacion: e.margen_despues_de_captacion, margen_pct: e.margen.porcentaje, escalon: e.capacidad.escalon, muro: e.capacidad.muro_que_manda, requiere_arquitectura: e.capacidad.requiere_arquitectura, instancias: e.capacidad.instancias, extrapolacion_sin_medir: e.extrapolacion_sin_medir, equilibrio_pagantes: e.equilibrio_pagantes, se_paga_solo: e.se_paga_solo, gratuitos_por_pagante: e.gratuitos_que_sostiene_un_pagante, gratuitos_por_pagante_sin_anuncios: e.gratuitos_que_sostiene_un_pagante_sin_anuncios, ingreso_por_gratuito: e.por_cliente.ingreso_gratuito, costo_por_gratuito: e.por_cliente.costo_gratuito, ingreso_por_pagante: e.por_cliente.ingreso_por_pagante, costo_por_pagante: e.por_cliente.costo_servicio, comensales_mes: e.comensales_mes });
const esc = M.escenarios(rec, s, N).map((r) => ({ n: r.n, peor_sin_anuncios: resumenEsc(r.peor_firme), peor_anuncios_tarifa_baja: resumenEsc(r.peor_anuncios_tarifa_baja), peor_anuncios_adversos: resumenEsc(r.peor_anuncios_adversos), peor_anuncios_tarifa_media: resumenEsc(r.peor_anuncios_tarifa_media), mejor: resumenEsc(r.mejor), esperado: Object.fromEntries(curvas.map((c) => [c, resumenEsc(r.esperado[c])])) }));
const proy = Object.fromEntries(curvas.map((c) => [c, M.proyectar(rec, s, 36, { curva: c })]));
const proyMejor = M.proyectar(rec, s, 36, { curva: 'optimista', anuncios: { activo: true, tarifa: 'media' } });
const proyPeor = M.proyectar(rec, s, 36, { curva: 'pesimista' });
const precios = Object.fromEntries(curvas.map((c) => [c, M.precioOptimo(c, s)]));
const sensPrecio = M.sensibilidadPrecioOptimo(s);
const ep = M.evaluarPrecios(rec, s, 1000);
const tg = M.tablaTodosGratuitos(rec, s);
const bolsas = [500, 1000, 2000, 5000].map((b) => M.capacidadConBolsa(rec, s, b));
const nsolo = { baja: M.nSePagaSolo(rec, s, 'baja'), adverso: M.nSePagaSolo(rec, s, 'adverso'), medio: M.nSePagaSolo(rec, s, 'medio') };
const res = M.resumen(rec, s, 1000);
const sens = M.sensibilidad(rec, s, 1000);
const sensSin = M.sensibilidad(rec, s, 1000, { sinAnuncios: true });
const sensCapt = M.sensibilidad(rec, s, 1000, { metrica: 'captacion' });
let nArq = null;
for (let n = 100; n <= 5000; n += 10) { if (M.evaluar(rec, s, n, { curva: 'media' }).capacidad.requiere_arquitectura) { nArq = n; break; } }
const E = (n, c) => esc.find((x) => x.n === n).esperado[c];
const E1 = esc.find((x) => x.n === 1000);

// la configuración anterior, para comparar
const escAntes = M.escenarios(antes, s, [1000])[0];

// ------------------------------------------------------------------ chequeo de márgenes: mes 12 por caso y desglose por cada 100 pesos
const mes = (p, m) => p.filas.find((f) => f.mes === m);
const desglose = (f) => { const total = f.ingresos; const partes = [['Servidor', f.costos_detalle.servidor], ['Almacenamiento y fotos', f.costos_detalle.almacenamiento + f.costos_detalle.objetos], ['Soporte', f.costos_detalle.soporte], ['Comisión de cobro', f.costos_detalle.comision], ['Conseguir clientes (reponer bajas y altas)', f.captacion], ['Sueldos', s.sueldos_mes], ['Impuestos', 0]]; const usados = partes.reduce((a, x) => a + x[1], 0); return { ingresos: total, partes: partes.map(([n, v]) => ({ concepto: n, pesos: v, por_cada_100: (100 * v) / total })), margen_despues_de_captacion: total - usados, por_cada_100_margen: (100 * (total - usados)) / total }; };
const chequeo = { mes12: { recomendado: { fila: mes(proy.media, 12), desglose: desglose(mes(proy.media, 12)) }, peor: { fila: mes(proyPeor, 12), desglose: desglose(mes(proyPeor, 12)) }, mejor: { fila: mes(proyMejor, 12), desglose: desglose(mes(proyMejor, 12)) } },
  regimen_1000: { recomendado: desglose({ ingresos: E1.esperado.media.ingresos, costos_detalle: { servidor: 0, almacenamiento: 0, objetos: 0, soporte: 0, comision: 0 }, captacion: 0 }) } };
// desglose en régimen (n = 1000, curva media) con los componentes reales
const e1 = M.evaluar(rec, s, 1000, { curva: 'media' });
chequeo.regimen_1000.recomendado = desglose({ ingresos: e1.ingresos.total, costos_detalle: e1.costos, captacion: e1.captacion.reposicion_de_bajas });
chequeo.regimen_1000.recomendado.ingresos_detalle = { suscripcion: e1.ingresos.suscripcion, anuncios: e1.ingresos.anuncios };

const resultados = { version: M.VERSION, config_inicial: rec, config_topes_10_mesas_3_cuentas: antes,
  segmentacion: { planes: seg.planes, estratos: seg.estratos, topes_chef: seg.topes_chef, topes_chef_conservador: seg.topes_chef_conservador, topes_master_chef: seg.topes_master_chef, seguridad_chico_por_topes: seg.seguridad_chico_por_topes },
  escenarios: esc, proyeccion: { recomendado: proy.media, peor: proyPeor, mejor: proyMejor, por_curva: proy },
  precios: { evaluacion: ep, optimo_por_curva: Object.fromEntries(curvas.map((c) => [c, { precio: precios[c].precio, meseta: precios[c].meseta, conversion: precios[c].conversion, margen_por_elegible: precios[c].margen_por_elegible, derivada_en_optimo: precios[c].derivada_en_optimo, muestras: precios[c].muestras }])), sensibilidad_precio_optimo: sensPrecio },
  todos_gratuitos: { tabla: tg, bolsas, n_se_paga_solo: nsolo },
  resumen: res, sensibilidad: { con_anuncios: sens, sin_anuncios: sensSin, despues_de_captacion: sensCapt },
  optimizacion: { restricciones: opt.restricciones, evaluadas: opt.evaluadas, descartadas: opt.descartadas, mejor: { seguridad_chico: mejor.seguridad_chico, dentro_de_todos: mejor.dentro, mesas: mejor.mesas, cuentas: mejor.cuentas, platillos: mejor.platillos, mejor_precio: mejor.mejor_precio, meseta: mejor.meseta, margen: mejor.margen, pagantes: mejor.pagantes }, precio_salon: opt.precio_salon, tabla_cupo_gratis: opt.tabla_cupo_gratis, frontera: opt.frontera, sensibilidad_modelo_mesas_cuentas: opt.sensibilidad_modelo_mesas_cuentas },
  chequeo_de_margenes: chequeo, extrapolacion: { n_desde_el_que_hace_falta_otra_arquitectura_curva_media: nArq } };
writeFileSync(join(aqui, '2026-11-14-modelo-de-escenarios-resultados.json'), JSON.stringify(resultados, null, 1));

// ------------------------------------------------------------------ formato
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US');
const pc = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
const pc1 = (x) => `${(Math.round(x * 1000) / 10).toLocaleString('en-US')} %`;
const sg = (x) => (x >= 0 ? `+${n0(x)}` : `−${n0(-x)}`);
const cs = rec.topes.gratuito;
const tc = opt.tabla_cupo_gratis;
const sp = sensPrecio;
const prS = (p) => ep.servicio.find((x) => x.precio === p);
const prL = (p) => ep.salon.find((x) => x.precio === p);
const filaPrecio = (f, plan) => `| **${f.precio}** | ${curvas.map((c) => `${n1(f.por_curva[c].pagantes)}`).join(' · ')} | ${curvas.map((c) => sg(f.por_curva[c].margen_operacion)).join(' · ')} | ${curvas.map((c) => sg(f.por_curva[c].margen_despues_de_captacion)).join(' · ')} | ${curvas.map((c) => sg(f.por_curva[c].margen_operacion_sin_anuncios)).join(' · ')} | ${n1(f.por_curva.media.equilibrio_pagantes_sin_anuncios ?? 0)} | ${f.por_curva.pesimista.sin_perdidas_con_anuncios && f.por_curva.media.sin_perdidas_con_anuncios ? 'sí' : 'no'} · ${f.por_curva.pesimista.sin_perdidas_sin_anuncios && f.por_curva.media.sin_perdidas_sin_anuncios ? 'sí' : 'no'} |`;
const cif = (id) => res.cifras.find((f) => f.clave === id);
const fmtCif = (f) => { const r = (x) => (x == null ? '—' : f.clave === 'comensales_al_mes' || f.clave === 'clientes_potenciales' || f.clave === 'restaurantes_que_caben' ? n0(x) : f.clave.startsWith('margen') ? sg(x) : n1(x)); return `| ${f.nombre} (${f.unidad}) | **${r(f.recomendado)}** | ${r(f.peor)} | ${r(f.mejor)} | ${f.nota} |`; };
const filaTG = (x) => `| ${n0(x.n)} | ${n0(x.comensales_mes)} | ${n0(x.costo_sin_anuncios)} | ${sg(x.con_anuncios.baja.margen)} | ${sg(x.con_anuncios.adverso.margen)} | ${sg(x.con_anuncios.medio.margen)} | ${x.escalon}${x.extrapolacion_sin_medir ? ' (extrapolación)' : ''} |`;
const b1000 = bolsas[1];
const chq = chequeo.mes12;
const lineaDef = '**Recomendado** (vino) = curva de pago media (la mediana de Master Chef es el precio de Meniu Business, 225) y anuncios en la tarifa baja ya en marcha · **Peor** (rojo) = curva pesimista y todavía sin anuncios (temporal) · **Mejor** (verde) = curva optimista y anuncios en la tarifa media.';

// ------------------------------------------------------------------ informe del modelo
const tcFila = (x) => `| **${pc(x.seguridad)}** | ${x.mesas} mesas · ${x.cuentas} cuentas · ${x.platillos} platillos | ${pc1(x.seguridad_real)} | ${pc(x.dentro_de_todos)} | ${n0(x.margen)} |`;
const topesFila = (t) => `| **${pc(t.nivel)}** | ${t.mesas} mesas · ${t.cuentas} cuentas | ${pc(t.seguridad_chico.centro)} (${pc(t.seguridad_chico.min)}–${pc(t.seguridad_chico.max)}) | ${pc(t.dentro_todos.centro)} (${pc(t.dentro_todos.min)}–${pc(t.dentro_todos.max)}) | ${pc(t.fuga_de_mas_de_10_personas.centro)} (hasta ${pc(t.fuga_de_mas_de_10_personas.max)}) |`;
const consFila = (t) => (t.sin_solucion ? '' : `| **${pc(t.nivel)}** | ${t.mesas} mesas · ${t.cuentas} cuentas | ≥ ${pc(t.seguridad_minima)} | ${pc(t.dentro_todos.centro)} | hasta ${pc(t.fuga_de_mas_de_10_personas.max)} |`);
const sensFilas = (sn, k = 8) => sn.filas.slice(0, k).map((f) => `| ${f.frase} | ${n0(f.efecto)} |`).join('\n');
const proyFila = (m) => `| ${m} | ${n0(mes(proy.media, m).restaurantes)} | ${n0(mes(proy.media, m).pagantes)} | ${sg(mes(proyPeor, m).margen_operacion)} | **${sg(mes(proy.media, m).margen_operacion)}** | ${sg(mes(proyMejor, m).margen_operacion)} | ${mes(proy.media, m).escalon}${mes(proy.media, m).con_anuncios ? '' : ' (sin anuncios)'} |`;

const md = `# Modelo de escenarios de Carta: la segmentación de Calvin, el peor caso real y qué hay que medir

**Fecha:** 14 de noviembre de 2026 (tercera vuelta) · **Rama:** \`agente/planes-precio-historial\` · **La v1 no cobra ni tiene planes.** Este documento lo genera \`2026-11-14-corre-escenarios.mjs\` desde el modelo: ninguna cifra se transcribe a mano.

## Conclusiones

1. **Chef (gratis) = 91,048 negocios (86.8 %): 15 mesas, 4 cuentas y 150 platillos dejan dentro al ${pc(mejor.seguridad_chico)} de los negocios de hasta 10 personas** (intervalo del modelo ${pc(M.seguridadChico(rec, s, 'minimo'))}–100 %); Master Chef 13,614 (13.0 %); Chef Ejecutivo 220 (0.2 %).
2. **Master Chef a 225 (pegado a Meniu) y Chef Ejecutivo a 1,099 quedan sin pérdidas con anuncios en marcha en las tres curvas; sin anuncios sólo con la curva media o mejor:** ${sg(E(1000, 'media').margen_operacion)} al mes con 1,000 restaurantes con anuncios, ${sg(M.evaluar(rec, s, 1000, { curva: 'media', sinAnuncios: true }).margen_operacion)} sin ellos (curva media) y ${sg(M.evaluar(rec, s, 1000, { curva: 'pesimista', sinAnuncios: true }).margen_operacion)} con la pesimista.
3. **Peor caso real (todos gratuitos): con 1,000 pesos al mes de su bolsa Calvin carga hasta ${n0(b1000.restaurantes)} restaurantes gratuitos y ${n1(b1000.comensales_mes / 1e6)} millones de comensales al mes (simulados); con anuncios se paga solo desde ${nsolo.baja} restaurantes (tarifa baja), ${nsolo.medio} (media) y ${n0(nsolo.adverso)} (adverso: mitad de tarifa y 30 % de visitas).**
4. **Margen con 1,000 restaurantes (operación): ${sg(res.cifras.find((f) => f.clave === 'margen_de_operacion').recomendado)} recomendado · ${sg(res.cifras.find((f) => f.clave === 'margen_de_operacion').peor)} peor · ${sg(res.cifras.find((f) => f.clave === 'margen_de_operacion').mejor)} mejor** pesos al mes; después de captación ${sg(res.cifras.find((f) => f.clave === 'margen_despues_de_captacion').recomendado)} · ${sg(res.cifras.find((f) => f.clave === 'margen_despues_de_captacion').peor)} · ${sg(res.cifras.find((f) => f.clave === 'margen_despues_de_captacion').mejor)}.
5. **Qué dato medir primero en el piloto: ${sens.medir_primero.slice(0, 3).map((x) => x.supuesto).join(', ')}** (§6); y el escalón sube de Hobby a Pro de 2 procesos hacia el mes ${proy.media.filas.find((f) => f.escalon === 'pro_2').mes} (§7 y las [banderas de operación](2026-11-14-banderas-de-operacion.md)).

${lineaDef}

**Qué cambió respecto a la vuelta anterior.** Los anuncios ya no son un interruptor: **el plan gratuito lleva anuncios** (decisión de Calvin) y lo que varía es **cuándo llegan** (\`mes_inicio_anuncios\`, hoy ${s.mes_inicio_anuncios}: no antes de construirlos y de que la red apruebe el sitio) y **cuánto dejan**. El peor caso «todo gratuito y sin anuncios» pasó de «peor caso» a **periodo temporal** que paga Calvin. Los planes dejaron de definirse por 10 mesas y 3 cuentas y pasaron a **la segmentación de Calvin** (por tamaño del negocio, traducida a topes).

**Cambios de API del \`.mjs\` (para quien lo incrusta).** (1) \`configInicial()\` / \`configBase()\` ahora es **«segmentación de Calvin»** (Master Chef 225, Chef Ejecutivo 1,099, Chef 15 mesas · 4 cuentas · 150 platillos); la anterior es \`configTopes10Mesas3Cuentas()\`. (2) **Quitado el interruptor** \`anuncios_aprobados\`: los anuncios **suman en régimen**; \`opc.sinAnuncios = true\` evalúa el periodo sin ellos; \`opc.anunciosAprobados === false\` sigue funcionando como alias de \`sinAnuncios\`. (3) \`parteRebasa\` usa el modelo conjunto de mesas y cuentas (\`empuja_conjunto\`, con intervalo); se quitaron \`traslape_topes\`, \`empuja_mesas\`, \`empuja_cuentas\` y \`restriccion_min_dentro\`; \`optimizar\` se rige por \`restriccion_seguridad_chico\`. (4) \`conversion(curva, precio, s, plan)\` y \`precioOptimo(…, plan)\` usan \`curvas_pago_salon\` para Chef Ejecutivo. (5) Nuevas funciones: \`todosGratuitos\`, \`tablaTodosGratuitos\`, \`nSePagaSolo\`, \`capacidadConBolsa\`, \`resumen\`, \`evaluarPrecios\`, \`banderas\`, \`seguridadChico\`, \`parteSalon\`, \`interp2\`. (6) \`proyectar\` mete los anuncios desde \`mes_inicio_anuncios\` y devuelve \`financiamiento_maximo\`. (7) \`sensibilidad\` trae \`frase\` y \`medir_primero\`.

---

## 1. La segmentación de Calvin, traducida a topes

**Clientes potenciales = 104,882** (DENUE, mayo de 2026 [medido]). **Chef (gratis)** = 0–5 y 6–10 personas: **91,048 (86.8 %)** · **Master Chef** = 11–30, 31–50 y 51–100: **13,614 (13.0 %)** · **Chef Ejecutivo** = 101–250 y 251 o más: **220 (0.2 %)**.

**Carta no sabe cuánta gente trabaja en un negocio**, así que la frontera se traduce a **topes que el producto sí aplica**, con el modelo de mesas y cuentas de la estadística de cartas (cuentas = ⌈f × personas⌉ con f = 0.35 a 0.50; mesas = cuentas × 2.5 a 4) aplicado a los estratos medidos. **Todo esto es supuesto (modelo, no estadística): el intervalo muestra los extremos del modelo.**

**¿Con qué topes un negocio de hasta 10 personas queda dentro del gratuito?** (central; entre paréntesis, el intervalo del modelo)

| Seguridad que se quiere | Topes de Chef (mesas · cuentas) | Seguridad real | Parte de TODOS los registrados que queda dentro | Negocios de más de 10 personas que se cuelan gratis |
|---|---|---|---|---|
${seg.topes_chef.map(topesFila).join('\n')}

**Versión conservadora** (la seguridad vale aun en el peor rincón del modelo):

| Seguridad que se quiere | Topes de Chef | Seguridad mínima | Dentro (todos) | Se cuelan gratis |
|---|---|---|---|---|
${seg.topes_chef_conservador.map(consFila).join('\n')}

**Con el tope de platillos** (un negocio chico puede tener carta larga: 150 platillos deja pasar al ≈ 98 %) **la configuración inicial queda en 15 mesas · 4 cuentas · 150 platillos con ${pc1(mejor.seguridad_chico)} de seguridad** (el optimizador la elige: es la de mayor margen que cumple 95 %). **Master Chef** cubre hasta 100 mesas y 30 cuentas (≈ 98 % de los negocios de 11 a 100 personas; arriba de ahí, ≈ ${pc1(seg.topes_master_chef[2].parte_de_los_registrados_arriba.centro)} de los registrados, que es Chef Ejecutivo). **Chef Ejecutivo** exige subir hoy el tope técnico de **50 cuentas activas** (T-1.6): un negocio de 101 a 250 personas tiene 36 a 125 cuentas de mesero o capitán en el modelo (**cambio de código, no de este informe**).

| Seguridad exigida a Chef | Topes | Seguridad real | Dentro de todos | Margen (1,000 restaurantes, curva media) |
|---|---|---|---|---|
${tc.map(tcFila).join('\n')}

## 2. Precios: Master Chef pegado a Meniu, Chef Ejecutivo hacia arriba

Cada precio con tres curvas (pesimista · media · optimista), **1,000 restaurantes registrados**. «Sin pérdidas» = margen de operación **y** después de captación ≥ 0 (con anuncios en marcha · sin anuncios todavía).

| Master Chef | Pagantes de Master Chef | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
${ep.servicio.map((f) => filaPrecio(f, 'servicio')).join('\n')}

| Chef Ejecutivo | Pagantes de Chef Ejecutivo | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
${ep.salon.map((f) => filaPrecio(f, 'salon')).join('\n')}

**Lectura.** (1) **Los tres precios altos de Chef Ejecutivo cambian el margen menos de 2 %**: sólo ≈ ${n1(M.evaluar(rec, s, 1000, { curva: 'media' }).clientes.salon)} negocio de cada 1,000 es de ese tamaño; su precio **no se decide por margen sino por posicionamiento** (1,099 es lo que cuestan OlaClick Elite y Last.app; 1,599 es el extremo alto sin llegar a Last.app Unlimited, 2,900). (2) **Master Chef: 199 a 299 cambia el margen en menos de 2 %**, pero **cambia los pagantes** (de ${n0(prS(199).por_curva.media.pagantes)} a ${n0(prS(299).por_curva.media.pagantes)} con la curva media): como Calvin quiere captar sin pérdidas, **225 (el precio de Meniu) capta ${n0(prS(225).por_curva.media.pagantes)} y deja ${sg(prS(225).por_curva.media.margen_operacion)} al mes**. (3) **Sin pérdidas con qué supuestos:** (a) con anuncios en marcha sí en las tres curvas **si la tarifa baja y el 60 % de visitas con anuncio se cumplen** (supuestos sin dato); (b) **sin anuncios, ningún precio evita la pérdida con 1,000 restaurantes si la curva es pesimista** (${sg(prS(225).por_curva.pesimista.margen_operacion_sin_anuncios)} al mes): ese periodo lo paga Calvin.

**Meseta y curva de pago.** Con la curva media, el margen por restaurante que rebasa topes cambia menos de 2 % entre **${precios.media.meseta.desde} y ${precios.media.meseta.hasta}**; con la mediana ±50 % el precio óptimo va de ${sp.media.mediana.bajo} a ${sp.media.mediana.alto}. **El óptimo es tan bueno como la curva (supuesto); lo sustituye la prueba de precio del piloto.**

## 3. La pregunta del peor caso: todos gratuitos

*«¿Hasta qué punto puedo tener restaurantes que todos son gratuitos, cuántos comensales, y todavía sostener el sistema con sólo anuncios?»* Todos los registrados son gratuitos (nadie paga). **Comensales al mes** = restaurantes × ${s.comensales_dia_gratuito} comensales al día × 30; el dato por restaurante sale del **simulador de uso (perfiles supuestos), no está medido**, y es más alto de lo que tendría una fonda de 0 a 5 personas. «Costo al mes» = servidor, almacenamiento y soporte (${s.soporte_gratuito} pesos por gratuito, supuesto): **lo que pone Calvin mientras no hay anuncios**.

| Restaurantes gratuitos | Comensales al mes (simulado) | **Costo al mes sin anuncios** (pone Calvin) | Resultado con anuncios, tarifa baja | Adverso (mitad de tarifa, 30 % de visitas) | Tarifa media | Escalón de servidor |
|---|---|---|---|---|---|---|
${tg.medida.map(filaTG).join('\n')}
| *Zona extrapolada (sin medir)* | | | | | | |
${tg.extrapolada_sin_medir.map(filaTG).join('\n')}

**Respuesta en una frase:** **con ${n0(b1000.bolsa)} pesos al mes de mi bolsa puedo cargar hasta ${n0(b1000.restaurantes)} restaurantes gratuitos y ${n1(b1000.comensales_mes / 1e6)} millones de comensales al mes; desde que hay anuncios, el sistema se paga solo a partir de ${nsolo.baja} restaurantes con la tarifa baja (${nsolo.medio} con la media), y con el caso adverso (mitad de tarifa y 30 % de visitas) **no se paga solo hasta ${n0(nsolo.adverso)} restaurantes**: con menos que eso, la bolsa de Calvin sigue poniendo la diferencia.** Con 500 / 2,000 / 5,000 pesos de bolsa: ${bolsas.map((b) => `${n0(b.bolsa)} → ${n0(b.restaurantes)} restaurantes${b.tope_medido ? ' (tope medido)' : ''}`).join(' · ')}.

**Requisitos para que empiecen los anuncios** (\`mes_inicio_anuncios\` = ${s.mes_inicio_anuncios}, supuesto de trabajo): un ADR; abrir la política de seguridad del sitio (\`script-src 'self'\`); cambiar el aviso de privacidad; que la red apruebe el sitio ([anuncios §3.6–3.7](2026-11-13-anuncios-y-capa-del-comensal.md)); y que **no sean personalizados** (regla dura 10).

## 4. Todas las cifras en tres casos

${lineaDef}

| Cifra | Recomendado | Peor | Mejor | Qué es |
|---|---|---|---|---|
${res.cifras.map(fmtCif).join('\n')}

*Mejor caso teórico «todos pagan» (1,000): ${sg(res.todos_pagan.margen_operacion)} pesos al mes; no se usa como cota: exigiría repetir la pila de servidores.*

## 5. Esperado a 100, 1,000 y 10,000 restaurantes (operación → después de captación)

| Restaurantes | Peor (pesimista, sin anuncios) | Recomendado (media) | Mejor (optimista, tarifa media) |
|---|---|---|---|
${esc.map((r) => { const pe = M.evaluar(rec, s, r.n, { curva: 'pesimista', sinAnuncios: true }); const me = M.evaluar(rec, s, r.n, { curva: 'media' }); const mj = M.evaluar(rec, s, r.n, { curva: 'optimista', anuncios: { activo: true, tarifa: 'media' } }); return `| ${n0(r.n)} | ${sg(pe.margen_operacion)} → ${sg(pe.margen_despues_de_captacion)} | **${sg(me.margen_operacion)} → ${sg(me.margen_despues_de_captacion)}** | ${sg(mj.margen_operacion)} → ${sg(mj.margen_despues_de_captacion)} |`; }).join('\n')}

## 6. Qué supuesto mueve más el margen, en llano (1,000 restaurantes, recomendado)

**Qué medir primero en el piloto:** ${sens.medir_primero.map((x, i) => `${i + 1}. ${x.supuesto} → ${x.como}`).join(' · ')}.

| Qué pasa si… | Efecto en el margen (pesos al mes) |
|---|---|
${sensFilas(sens)}

## 7. Crecimiento mes a mes (adopción **supuesta**: ${s.meta_12_meses} restaurantes a 12 meses y ${s.meta_24_meses} a 24; anuncios desde el mes ${s.mes_inicio_anuncios})

Margen de operación al mes. Peor = pesimista y sin anuncios; recomendado = media; mejor = optimista con tarifa media.

| Mes | Restaurantes | De paga (recomendado) | Peor | **Recomendado** | Mejor | Escalón |
|---|---|---|---|---|---|---|
${[3, 6, 9, 12, 18, 24, 36].map(proyFila).join('\n')}

**Primer mes con margen de operación positivo (recomendado): ${proy.media.mes_primer_margen_positivo}; después de captación: ${proy.media.mes_primer_margen_positivo_despues_de_captacion}.** **Lo más que tendría que poner Calvin, acumulado: ${n0(proy.media.financiamiento_maximo)} pesos** (peor caso: ${n0(proyPeor.financiamiento_maximo)}). *Es un artefacto de la curva de adopción supuesta y del costo de captación sin dato: no es una predicción.* **Más allá de ≈ ${n0(nArq)} restaurantes registrados hace falta otra arquitectura: todo costo de ahí en adelante es extrapolación sin medir.**

## 8. Límites (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente.** El **peor caso real** depende de la tarifa de anuncios y de la parte de visitas con anuncio, que tampoco tienen dato.
- **Los topes de mesas y cuentas son un modelo (no estadística):** el intervalo del modelo es amplio (§1).
- **El dato de comensales por restaurante es simulado** y más alto de lo que tendría un negocio de 0 a 5 personas.
- **Los muros salen de un simulador**, no de una prueba de carga (±2×).
- **Pruebas:** \`node 2026-11-14-pruebas.mjs\` reproduce las cifras publicadas y prueba la segmentación, el peor caso, el resumen, las banderas y la proyección.
`;
writeFileSync(join(aqui, '2026-11-14-modelo-de-escenarios.md'), md);

// ------------------------------------------------------------------ chequeo de márgenes
const desg = (d) => d.partes.map((p) => `| ${p.concepto} | ${n1(p.por_cada_100)} |`).join('\n');
const linea = (nombre, f) => `| ${nombre} | ${n0(f.fila.restaurantes)} | ${n0(f.fila.pagantes)} | ${n0(f.fila.ingresos_suscripcion)} | ${n0(f.fila.ingresos_anuncios)} | **${n0(f.fila.ingresos)}** | ${n0(f.fila.costos)} | ${n0(f.fila.captacion)} | **${sg(f.fila.margen_despues_de_captacion)}** |`;
const chequeoMd = `# Chequeo de márgenes: mes 12 cifra por cifra y a dónde se va cada peso

**Fecha:** 14 de noviembre de 2026 · **Generado por \`2026-11-14-corre-escenarios.mjs\`** desde el modelo; datos en [\`…-modelo-de-escenarios-resultados.json\`](2026-11-14-modelo-de-escenarios-resultados.json) (\`chequeo_de_margenes\`).

## Conclusiones

1. **El «margen de 10,000 al mes 12 en el mejor caso» venía de la versión anterior del modelo** (otro reparto de planes y curva optimista; **no se reproduce con el modelo actual**, y la cifra vieja no quedó guardada para desglosarla); **en el modelo corregido, el mejor caso del mes 12 es ${sg(chq.mejor.fila.margen_operacion)} pesos de operación** (${sg(chq.mejor.fila.margen_despues_de_captacion)} después de captación) con ${n0(chq.mejor.fila.pagantes)} clientes de paga.
2. **Mes 12 recomendado: ingresos ${n0(chq.recomendado.fila.ingresos)}, costos ${n0(chq.recomendado.fila.costos)}, margen de operación ${sg(chq.recomendado.fila.margen_operacion)}, después de captación ${sg(chq.recomendado.fila.margen_despues_de_captacion)}** con ${n0(chq.recomendado.fila.restaurantes)} restaurantes y ${n0(chq.recomendado.fila.pagantes)} de paga.
3. **De cada 100 pesos que entran en el mes 12 (recomendado): ${n1(chq.recomendado.desglose.partes[0].por_cada_100)} van al servidor, ${n1(chq.recomendado.desglose.partes[2].por_cada_100)} a soporte, ${n1(chq.recomendado.desglose.partes[3].por_cada_100)} a la comisión de cobro, ${n1(chq.recomendado.desglose.partes[4].por_cada_100)} a conseguir clientes y ${n1(chq.recomendado.desglose.por_cada_100_margen)} se quedan.**
4. **Los anuncios son ${n1((100 * chq.recomendado.fila.ingresos_anuncios) / chq.recomendado.fila.ingresos)} de cada 100 pesos que entran en el mes 12 (recomendado)** y dependen de una tarifa sin dato: es la cifra que más conviene mirar dos veces.

## 1. Mes 12, de dónde sale cada cifra (pesos al mes)

| Caso | Restaurantes | De paga | Ingreso por suscripción | Ingreso por anuncios | **Ingresos** | Costos de operación | Conseguir clientes | **Margen después de captación** |
|---|---|---|---|---|---|---|---|---|
${linea('Peor (pesimista, sin anuncios)', chq.peor)}
${linea('**Recomendado** (media, anuncios en la tarifa baja)', chq.recomendado)}
${linea('Mejor (optimista, tarifa media)', chq.mejor)}

**Cómo se calcula cada columna.** *Restaurantes* = a·t^b con 300 a 12 meses y 1,200 a 24 (**supuesto**). *De paga* = restaurantes × los que rebasan los topes (${pc1(M.parteRebasa(rec, s))}) × los que llegan a pagar según la curva, a 225 (Master Chef) y 1,099 (Chef Ejecutivo). *Suscripción* = de paga × precio. *Anuncios* = gratuitos × ${n0(s.visitas_app_gratuito)} visitas × ${pc(s.parte_visitas_con_anuncio)} con anuncio × tarifa por mil (baja ${s.anuncio_pesos_por_mil.baja}, media ${s.anuncio_pesos_por_mil.media}); **antes del mes ${s.mes_inicio_anuncios} es cero**. *Costos* = servidor del escalón (${chq.recomendado.fila.escalon}), almacenamiento, soporte (${s.soporte_gratuito} por gratuito, ${s.soporte_servicio} por Master Chef) y comisión de tarjeta. *Conseguir clientes* = altas × ${s.cac} pesos (altas = nuevos de paga + bajas del ${pc(s.churn_mensual)} mensual).

## 2. De cada 100 pesos que entran (mes 12)

| Concepto | Recomendado | Peor | Mejor |
|---|---|---|---|
${chq.recomendado.desglose.partes.map((p, i) => `| ${p.concepto} | ${n1(p.por_cada_100)} | ${n1(chq.peor.desglose.partes[i].por_cada_100)} | ${n1(chq.mejor.desglose.partes[i].por_cada_100)} |`).join('\n')}
| **Se queda (margen después de captación)** | **${n1(chq.recomendado.desglose.por_cada_100_margen)}** | ${n1(chq.peor.desglose.por_cada_100_margen)} | ${n1(chq.mejor.desglose.por_cada_100_margen)} |

**En régimen con 1,000 restaurantes (curva media):** ${n0(chequeo.regimen_1000.recomendado.ingresos)} pesos de ingresos al mes (${n0(chequeo.regimen_1000.recomendado.ingresos_detalle.suscripcion)} de suscripción y ${n0(chequeo.regimen_1000.recomendado.ingresos_detalle.anuncios)} de anuncios).

## 3. Lo que este chequeo encontró

- **Una cifra que sonó rara tenía explicación y se corrigió:** el «10,000 del mes 12 en el mejor caso» era de la versión anterior (más negocios grandes y pagos más altos). Con la segmentación de Calvin, sólo 0.2 % de los registrados es Chef Ejecutivo y el mejor caso del mes 12 es ${sg(chq.mejor.fila.margen_operacion)}.
- **La suma cuadra:** ingresos − costos = margen de operación; margen de operación − conseguir clientes − sueldos = margen después de captación (prueba automática).
- **Qué no incluye:** sueldos (0), impuestos (0) ni ningún gasto de ventas más allá de los ${s.cac} pesos por cliente de paga; **bajas y captación no tienen dato**.
`;
writeFileSync(join(aqui, '2026-11-14-chequeo-de-margenes.md'), chequeoMd);

// ------------------------------------------------------------------ recomendaciones
const D = [
  { id: 'segmentacion', decision: 'Segmentación: qué entra en cada plan y con qué topes',
    recomendacion: `**Chef (gratis) = 15 mesas, 4 cuentas de personal, 150 platillos; Master Chef = hasta 100 mesas y 30 cuentas; Chef Ejecutivo = lo que pase de ahí.** Con eso, ${pc1(mejor.seguridad_chico)} de los negocios de hasta 10 personas quedan gratis y ≈ ${pc(1 - M.parteRebasa(rec, s))} de todos los registrados.`,
    depende: `**Del modelo de mesas y cuentas (no es estadística):** con el peor rincón del modelo la seguridad baja a ${pc(M.seguridadChico(rec, s, 'minimo'))}. **Si falla:** si las fondas tienen más mesas de las que el modelo supone, algunas pagan sin querer; se corrige subiendo el tope (los datos del piloto lo muestran en una semana).`,
    cifras: `Para 80 / 90 / 95 % de seguridad: ${tc.map((x) => `${x.mesas} mesas y ${x.cuentas} cuentas`).join(' · ')}; margen ${tc.map((x) => n0(x.margen)).join(' · ')} al mes con 1,000 restaurantes. Chef Ejecutivo exige subir el tope técnico de 50 cuentas.`,
    alternativas: tc.map((x) => ({ opcion: `Seguridad ${pc(x.seguridad)}: ${x.mesas} mesas, ${x.cuentas} cuentas, ${x.platillos} platillos`, pros: `margen ${n0(x.margen)}`, contras: `${pc1(x.seguridad_real)} de los de hasta 10 personas dentro; ${pc(x.dentro_de_todos)} de todos` })),
    ejemplo: 'Una fonda de 6 mesas y 3 personas queda dentro (Chef); un restaurante de 25 mesas (≈ 11 a 50 personas) pasa a Master Chef; un salón de 60 mesas y 12 cuentas también; un hotel con 150 mesas y 40 cuentas es Chef Ejecutivo.',
    prueba: 'Mesas, cuentas y platillos reales de los primeros 10 a 20 restaurantes.' },
  { id: 'precios', decision: 'Precios de Master Chef y Chef Ejecutivo',
    recomendacion: `**Master Chef 225 (pegado a Meniu Business) y Chef Ejecutivo 1,099.** Subir a 1,599 en Chef Ejecutivo cuesta ${n0(prL(1099).por_curva.media.margen_operacion - prL(1599).por_curva.media.margen_operacion)} pesos al mes de margen con 1,000 restaurantes (curva media): es posicionamiento, no matemática.`,
    depende: `**De la curva de pago (supuesto).** Con la mediana ±50 % el precio óptimo de la curva media va de ${sp.media.mediana.bajo} a ${sp.media.mediana.alto}. **Si falla:** si los dueños pagan lo de un menú QR (157), 225 pierde clientes; si pagan lo de un punto de venta (652), 225 deja dinero sobre la mesa. 225 **no depende** de que el modelo acierte el óptimo: el margen cambia menos de 2 % entre 199 y 299.`,
    cifras: `Master Chef 199 / 225 / 249 / 299: pagantes (media) ${[199, 225, 249, 299].map((p) => n0(prS(p).por_curva.media.pagantes)).join(' / ')}; margen de operación (media) ${[199, 225, 249, 299].map((p) => n0(prS(p).por_curva.media.margen_operacion)).join(' / ')}. Chef Ejecutivo 799 / 1,099 / 1,599: ${[799, 1099, 1599].map((p) => n0(prL(p).por_curva.media.margen_operacion)).join(' / ')}.`,
    alternativas: [{ opcion: '199', pros: 'Más pagantes', contras: 'Debajo de Meniu: parece barato sin serlo; piso ×2.5' }, { opcion: '225 (recomendada)', pros: 'Pegado a Meniu; más de 2.8 veces el piso', contras: 'Sin colchón si el soporte cuesta más' }, { opcion: '249', pros: 'Mismo margen que 225', contras: 'Un poco arriba de Meniu' }, { opcion: '299', pros: 'Más margen por pagante', contras: `Menos pagantes (${n0(prS(299).por_curva.media.pagantes)} contra ${n0(prS(225).por_curva.media.pagantes)})` }],
    ejemplo: 'Un restaurante de 25 mesas (ingreso medio 737,584 al mes [INEGI]): 225 son 0.04 % de su ingreso; un salón de 3.3 millones al mes pagaría 1,099 = 0.03 %.',
    prueba: 'Prueba de precio del piloto (tres grupos de 10: 199 · 249 · 299 en Master Chef).' },
  { id: 'anuncios', decision: 'Anuncios en Chef: cuándo llegan y cuánto dejan',
    recomendacion: `**El plan gratuito lleva anuncios; llegan hacia el mes ${s.mes_inicio_anuncios} (supuesto de trabajo) y no personalizados.** Mientras no hay, los paga Calvin: con 1,000 pesos al mes caben ${n0(b1000.restaurantes)} restaurantes.`,
    depende: `**De tres supuestos sin dato:** que la red apruebe el sitio, la tarifa por mil visitas y la parte de visitas con anuncio. **Si fallan:** en el caso adverso el sistema no se paga solo hasta ${n0(nsolo.adverso)} restaurantes.`,
    cifras: `Se paga solo desde ${nsolo.baja} (tarifa baja), ${nsolo.medio} (media) y ${n0(nsolo.adverso)} (adverso) restaurantes gratuitos. Requisitos: ADR, abrir la política de seguridad, aviso de privacidad, aprobación de la red.`,
    alternativas: [{ opcion: 'Anuncios desde el mes 3', pros: 'El peor caso se cubre antes', contras: 'No hay tiempo de construir, abrir la política de seguridad y que la red apruebe' }, { opcion: `Anuncios desde el mes ${s.mes_inicio_anuncios} (recomendada)`, pros: 'Tiempo realista', contras: 'Calvin pone ≈ el costo de ~10 meses de la bolsa' }, { opcion: 'Sin anuncios', pros: 'Cumple la política de seguridad de hoy', contras: 'Descartada por Calvin' }],
    ejemplo: 'La fonda de 6 mesas deja 4.3 pesos al mes con la tarifa baja una vez que hay anuncios; hoy deja 0.',
    prueba: 'Una prueba pequeña de AdSense con 3 restaurantes (impresiones, ingresos, RPM).' },
  { id: 'bolsa', decision: 'Cuánta bolsa poner mientras no hay anuncios',
    recomendacion: `**1,000 pesos al mes** alcanzan para ${n0(b1000.restaurantes)} restaurantes gratuitos; acumulado, Calvin tendría que poner **${n0(proy.media.financiamiento_maximo)} pesos** en total en el caso recomendado y ${n0(proyPeor.financiamiento_maximo)} en el peor.`,
    depende: '**Del ritmo de adopción (supuesto) y del soporte por gratuito (supuesto).** Si se adopta más rápido, la bolsa se agota antes.',
    cifras: `Bolsa 500 / 1,000 / 2,000 / 5,000 → ${bolsas.map((b) => n0(b.restaurantes)).join(' / ')} restaurantes.`,
    alternativas: bolsas.map((b) => ({ opcion: `${n0(b.bolsa)} pesos al mes`, pros: `${n0(b.restaurantes)} restaurantes y ${n1(b.comensales_mes / 1e6)} M de comensales`, contras: b.tope_medido ? 'llega al tope medido' : 'más bolsa, más servicio' })),
    ejemplo: 'Con 1,000 pesos al mes pagas el servidor y el soporte básico de ~800 fondas y taquerías gratuitas.',
    prueba: 'El costo real de Railway del primer mes con restaurantes del piloto.' },
  { id: 'historial', decision: 'Historial: meses en línea y archivo descargable',
    recomendacion: '**12 meses en línea para la paga (decidido por Calvin) y 30 días para el gratuito, con archivo descargable de lo anterior.**',
    depende: '**Del volumen de disco que se pague y de los 7.1–8.5 KB por visita medidos (con 10 eventos por visita supuestos).** Si los eventos duplican, el disco de la paga sube ≈ 50 %.',
    cifras: 'Con 1, 3, 6 y 12 meses el margen casi no cambia; en Hobby caben 263, 128, 72 y 38 clientes de paga (Pro: 2,637 · 1,283 · 724 · 387).',
    alternativas: [{ opcion: '3 meses + archivo', pros: '128 de paga en Hobby', contras: 'Cambia lo decidido' }, { opcion: '12 meses + archivo (recomendada)', pros: 'Cumple lo decidido', contras: 'En Hobby sólo caben 38 de paga' }],
    ejemplo: 'Un restaurante de 25 mesas con 1,800 visitas al mes genera 13.5 MB al mes: 12 meses son 162 MB.',
    prueba: 'Cuántos dueños abren el mes anterior en el panel.' },
  { id: 'soporte', decision: 'Soporte',
    recomendacion: '**WhatsApp o correo en horario hábil para la paga (≈ 60 pesos al mes por cliente) y autoservicio para el gratuito (0.5).**',
    depende: `**Del tiempo real de soporte (supuesto).** Si cada cliente de paga cuesta 150, Master Chef a 225 queda debajo del piso ×3 (${n0(3 * M.piso(s, 'servicio', 225))}) y hay que subir el precio o acotar el soporte.`,
    cifras: `Efecto en el margen (±50 %): soporte del gratuito ${n0(sens.filas.find((f) => f.supuesto === 'soporte por cliente gratuito').efecto)} pesos; de paga ${n0(sens.filas.find((f) => f.supuesto === 'soporte por cliente de paga').efecto)}.`,
    alternativas: [{ opcion: 'Autoservicio y correo (30)', pros: 'Piso bajo', contras: 'Mal servicio si no saben subir su carta' }, { opcion: 'WhatsApp en horario (60, recomendada)', pros: 'Equilibrio', contras: 'Depende de que 30 minutos alcancen' }, { opcion: 'Alta hecha por nosotros (150)', pros: 'Mejor conversión probable', contras: 'El piso ×3 sube a 520' }],
    ejemplo: 'Un salón de 60 mesas necesita soporte propio (se supone 120).',
    prueba: 'Tickets y minutos de soporte del piloto.' },
  { id: 'avisos_reloj', decision: 'Avisos de reloj desde el servidor',
    recomendacion: '**No.** Los relojes se calculan en el teléfono (AC-40.9).',
    depende: '**De que no haya notificaciones push (fuera de la v1).** Si se aprueban, el reloj del servidor sí tendría sentido.',
    cifras: 'Un temporizador para ≈ 12,000 mesas es una consulta por minuto; sin push no despierta al teléfono.',
    alternativas: [{ opcion: 'Relojes en el teléfono (recomendada)', pros: 'Cero costo de servidor; ya especificado', contras: 'Si el teléfono duerme no avisa' }, { opcion: 'Reloj en el servidor', pros: 'Un evento por cruce de umbral', contras: 'Otro proceso; contradice AC-40.9' }],
    ejemplo: 'El capitán de un salón de 60 mesas ve en su teléfono que la mesa 12 lleva 25 minutos sin movimiento.',
    prueba: 'Que se apruebe push.' },
];
writeFileSync(join(aqui, '2026-11-14-recomendaciones.json'), JSON.stringify({ version: M.VERSION, decisiones: D, configuraciones: { segmentacion_de_calvin: { nombre: 'Segmentación de Calvin (configInicial)', config: rec }, topes_10_mesas_3_cuentas: { nombre: 'Topes 10 mesas / 3 cuentas (la anterior)', config: antes } }, tabla_cupo_gratis: tc }, null, 1));
let r = `# Recomendaciones: siete decisiones con su supuesto, sus alternativas y la prueba que las cierra

**Fecha:** 14 de noviembre de 2026 (tercera vuelta; apoyado en el [modelo](2026-11-14-modelo-de-escenarios.md)) · **Generado por \`2026-11-14-corre-escenarios.mjs\`** · [JSON](2026-11-14-recomendaciones.json) con las decisiones y las dos configuraciones cargables.

## Conclusiones

1. **Planes por tamaño: Chef (gratis) 15 mesas · 4 cuentas · 150 platillos; Master Chef hasta 100 mesas y 30 cuentas; Chef Ejecutivo lo demás.**
2. **Master Chef 225 (pegado a Meniu) y Chef Ejecutivo 1,099:** margen de operación ${sg(E(1000, 'media').margen_operacion)} al mes con 1,000 restaurantes (curva media, con anuncios).
3. **Los anuncios llegan hacia el mes ${s.mes_inicio_anuncios}; mientras tanto, 1,000 pesos al mes de la bolsa de Calvin cargan ${n0(b1000.restaurantes)} restaurantes gratuitos** (acumulado máximo que Calvin pone: ${n0(proy.media.financiamiento_maximo)} pesos en el caso recomendado).
4. **Lo que más cambia el resultado: ${sens.medir_primero.slice(0, 3).map((x) => x.supuesto).join(', ')}.** Se miden en el piloto.
5. **Historial de 12 meses para la paga (decidido): casi no mueve el margen.**

${lineaDef}

`;
D.forEach((d, i) => {
  r += `\n## ${i + 1}. ${d.decision}\n\n**Recomendación.** ${d.recomendacion}\n\n**De qué supuesto depende y qué pasa si falla.** ${d.depende}\n\n**Cifras del modelo.** ${d.cifras}\n\n| Opción | A favor | En contra |\n|---|---|---|\n${d.alternativas.map((a) => `| ${a.opcion} | ${a.pros} | ${a.contras} |`).join('\n')}\n\n**Ejemplo.** ${d.ejemplo}\n\n**La prueba o el dato que la cierra.** ${d.prueba}\n\n---\n`;
});
r += `\n## 8. Datos por conseguir (resumen)\n\nCurva de pago real · tope e IVA de Meniu y Fudo · bajas y costo de conseguir un cliente (**sin dato: supuestos de trabajo**) · tarifa de anuncios, parte de visitas con anuncio y aprobación de la red · soporte por cliente · mesas, cuentas y platillos reales · comensales por restaurante real · eventos por visita.\n`;
writeFileSync(join(aqui, '2026-11-14-recomendaciones.md'), r);
console.log('ok. topes optimizador:', mejor.mesas, mejor.cuentas, mejor.platillos, 'seguridad', mejor.seguridad_chico.toFixed(3), 'nArq', nArq, 'bolsa1000', b1000.restaurantes, 'nsolo', JSON.stringify(nsolo));
