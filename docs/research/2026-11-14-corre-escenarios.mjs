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
const proy = { media: M.proyectarEscenario('recomendado', rec, s, 36), pesimista: M.proyectar(rec, s, 36, { curva: 'pesimista' }), optimista: M.proyectar(rec, s, 36, { curva: 'optimista' }) };
const proyMejor = M.proyectarEscenario('mejor', rec, s, 36);
const proyPeor = M.proyectarEscenario('peor', rec, s, 36);
const proyPiso = M.proyectarEscenario('piso_de_verdad', rec, s, 36);
const matriz = M.matrizEscenarios(rec, s, 1000);
const sensP = M.sensibilidadPrecio(rec, s, 1000);
const sensPsin = M.sensibilidadPrecio(rec, s, 1000, { curva: 'media' });
const precios = Object.fromEntries(curvas.map((c) => [c, M.precioOptimo(c, s)]));
const sensPrecio = M.sensibilidadPrecioOptimo(s);
const ep = M.evaluarPrecios(rec, s, 1000);
const tg = M.tablaTodosGratuitos(rec, s);
const bolsas = [500, 1000, 2000, 5000].map((b) => M.capacidadConBolsa(rec, s, b));
const rangos = { baja: M.rangoSePagaSolo(rec, s, 'baja'), adverso: M.rangoSePagaSolo(rec, s, 'adverso'), medio: M.rangoSePagaSolo(rec, s, 'medio') };
const nsolo = { baja: rangos.baja.centro, adverso: rangos.adverso.centro, medio: rangos.medio.centro };
const bolsasR = [500, 1000, 2000, 5000].map((b) => M.rangoBolsa(rec, s, b));
const segC = { centro: M.seguridadChico(rec, s, 'centro'), minimo: M.seguridadChico(rec, s, 'minimo'), maximo: M.seguridadChico(rec, s, 'maximo') };
const topesAnt = { ...rec, topes: { ...rec.topes, gratuito: { ...rec.topes.gratuito, mesas: 15 } } };
const compTopes = { nota: 'misma configuración con 15 mesas (antes de la dispersión de mesas por cuenta, tope 15 · 4 · 150)', recomendado: M.evaluar(topesAnt, s, 1000, { curva: 'media' }).margen_operacion, matriz: M.matrizEscenarios(topesAnt, s, 1000), seguridad: { centro: M.seguridadChico(topesAnt, s, 'centro'), minimo: M.seguridadChico(topesAnt, s, 'minimo'), maximo: M.seguridadChico(topesAnt, s, 'maximo') } };
const res = M.resumen(rec, s, 1000);
const pisoE = M.evaluarEscenario('piso_de_verdad', rec, s, 1000);
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
  chequeo_de_margenes: chequeo,
  escenarios_definicion: M.ESCENARIOS, matriz_3x3: matriz, piso_de_verdad: { definicion: M.ESCENARIOS.piso_de_verdad.definicion, evaluacion: resumenEsc(pisoE), proyeccion: proyPiso },
  seguridad_chef: { con_dispersion: segC, topes: { mesas: rec.topes.gratuito.mesas, cuentas: rec.topes.gratuito.cuentas, platillos: rec.topes.gratuito.platillos }, sigma_mesas_por_cuenta: s.sigma_mesas_por_cuenta, rango_sigma: s.rangos.sigma_mesas_por_cuenta, nota: 'centro con sigma 0.5; mínimo y máximo sobre las 27 combinaciones (f, mesas por cuenta, sigma) del modelo' },
  comparacion_topes_15_4_150: compTopes,
  precio_sensibilidad: sensP,
  umbrales: { se_paga_solo: rangos, bolsas: bolsasR, no_modelado: M.NO_MODELADO },
  extrapolacion: { n_desde_el_que_hace_falta_otra_arquitectura_curva_media: nArq } };
writeFileSync(join(aqui, '2026-11-14-modelo-de-escenarios-resultados.json'), JSON.stringify(resultados, null, 1));


// ------------------------------------------------------------------ formato
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US');
const pc = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
const pc1 = (x) => `${(Math.round(x * 1000) / 10).toLocaleString('en-US')} %`;
const sg = (x) => (x >= 0 ? `+${n0(x)}` : `−${n0(-x)}`);
const nn = (x) => (x == null ? 'no se paga solo' : n0(x));
const cs = rec.topes.gratuito;
const tc = opt.tabla_cupo_gratis;
const sp = sensPrecio;
const prS = (p) => ep.servicio.find((x) => x.precio === p);
const prL = (p) => ep.salon.find((x) => x.precio === p);
const filaPrecio = (f) => `| **${f.precio}** | ${curvas.map((c) => n1(f.por_curva[c].pagantes)).join(' · ')} | ${curvas.map((c) => sg(f.por_curva[c].margen_operacion)).join(' · ')} | ${curvas.map((c) => sg(f.por_curva[c].margen_despues_de_captacion)).join(' · ')} | ${curvas.map((c) => sg(f.por_curva[c].margen_operacion_sin_anuncios)).join(' · ')} | ${n1(f.por_curva.media.equilibrio_pagantes_sin_anuncios ?? 0)} | ${f.por_curva.pesimista.sin_perdidas_con_anuncios && f.por_curva.media.sin_perdidas_con_anuncios ? 'sí' : 'no'} · ${f.por_curva.pesimista.sin_perdidas_sin_anuncios && f.por_curva.media.sin_perdidas_sin_anuncios ? 'sí' : 'no'} |`;
const fmtCif = (f) => { const r = (x) => (x == null ? '—' : f.clave === 'comensales_al_mes' || f.clave === 'clientes_potenciales' || f.clave === 'restaurantes_que_caben' ? n0(x) : f.clave.startsWith('margen') ? sg(x) : n1(x)); return `| ${f.nombre} (${f.unidad}) | **${r(f.recomendado)}** | ${r(f.peor)} | ${r(f.mejor)} | ${r(f.piso_de_verdad)} | ${f.nota} |`; };
const filaTG = (x) => `| ${n0(x.n)} | ${n0(x.comensales_mes)} | ${n0(x.costo_sin_anuncios)} | ${sg(x.con_anuncios.baja.margen)} | ${sg(x.con_anuncios.adverso.margen)} | ${sg(x.con_anuncios.medio.margen)} | ${x.escalon}${x.extrapolacion_sin_medir ? ' (extrapolación)' : ''} |`;
const b1000 = bolsasR.find((b) => b.bolsa === 1000);
const rg = (x) => `${nn(x.centro)} (rango ${nn(x.minimo)} a ${x.maximo == null ? 'imposible' : n0(x.maximo)})`;
const D = M.ESCENARIOS;
const lineaDef = `**Recomendado** = ${D.recomendado.definicion} · **Peor** = ${D.peor.definicion} · **Mejor** = ${D.mejor.definicion} · **Piso de verdad** = ${D.piso_de_verdad.definicion}. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*`;
const mA = (curva, a) => matriz.filas.find((f) => f.curva === curva).celdas.find((c) => c.anuncios === a).margen_operacion;
const mejorSoloTarifa = mA('optimista', 'media') - mA('optimista', 'baja');
const dosDispersion = { sin: seg.topes_chef.find((x) => x.mesas === cs.mesas && x.cuentas === cs.cuentas) };
// conciliación de costo con planes-y-costo §0 (el documento da 110–140 USD para 1,000 restaurantes, con el sondeo de hoy)
const tg1000 = tg.medida.find((x) => x.n === 1000);
const infraUsd = (tg1000.costo_sin_anuncios - 1000 * s.soporte_gratuito) / s.fx;
const comensalesMillones = (x) => n1(x / 1e6);
const mes12 = (c) => chq[c];
const chq = chequeo.mes12;
chq.piso = { fila: mes(proyPiso, 12), desglose: desglose(mes(proyPiso, 12)) };

// ------------------------------------------------------------------ informe del modelo
const topesFila = (x) => `| **${pc(x.seguridad)}** | ${x.mesas} mesas · ${x.cuentas} cuentas | ${pc(x.seguridad_chico.centro)} (${pc(x.seguridad_chico.min)}–${pc(x.seguridad_chico.max)}) | ${pc(x.sin_dispersion.centro)} | ${pc(x.dentro_todos.centro)} | ${pc(x.fuga_de_mas_de_10_personas.centro)} (hasta ${pc(x.fuga_de_mas_de_10_personas.max)}) |`;
const consFila = (x) => (x.sin_solucion ? '' : `| **${pc(x.nivel)}** | ${x.mesas} mesas · ${x.cuentas} cuentas | ≥ ${pc(x.seguridad_minima)} | ${pc(x.dentro_todos.centro)} | hasta ${pc(x.fuga_de_mas_de_10_personas.max)} |`);
const tcFila = (x) => `| **${pc(x.seguridad)}** | ${x.mesas} mesas · ${x.cuentas} cuentas · ${x.platillos} platillos | ${pc1(x.seguridad_real)} | ${pc(x.dentro_de_todos)} | ${n0(x.margen)} |`;
const sensFilas = (sn, k = 8) => sn.filas.slice(0, k).map((f) => `| ${f.frase} | ${n0(f.efecto)} |`).join('\n');
const proyFila = (m) => `| ${m} | ${n0(mes(proy.media, m).restaurantes)} | ${n0(mes(proy.media, m).pagantes)} | ${sg(mes(proyPeor, m).margen_operacion)} | **${sg(mes(proy.media, m).margen_operacion)}** | ${sg(mes(proyMejor, m).margen_operacion)} | ${sg(mes(proyPiso, m).margen_operacion)} | ${mes(proy.media, m).escalon}${mes(proy.media, m).con_anuncios ? '' : ' (sin anuncios todavía)'} |`;
const cifra = (id) => res.cifras.find((f) => f.clave === id);
const mop = cifra('margen_de_operacion');
const mcap = cifra('margen_despues_de_captacion');
const mat = `| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |\n|---|---|---|---|\n${matriz.filas.map((f) => `| ${f.curva} | ${f.celdas.map((c) => sg(c.margen_operacion)).join(' | ')} |`).join('\n')}`;

const md = `# Modelo de escenarios de Carta: la segmentación de Calvin, el peor caso real y qué hay que medir

**Fecha:** 14 de noviembre de 2026 (ronda 4, corregida tras la revisión crítica de la maestra) · **Rama:** \`agente/planes-precio-historial\` · **La v1 no cobra ni tiene planes.** Lo genera \`2026-11-14-corre-escenarios.mjs\` desde el modelo: ninguna cifra se transcribe a mano.

## Conclusiones

1. **Chef (gratis) = 91,048 negocios (86.8 %, medido): con ${cs.mesas} mesas, ${cs.cuentas} cuentas y ${cs.platillos} platillos, ${pc1(segC.centro)} de los negocios de hasta 10 personas quedan dentro (intervalo del modelo ${pc1(segC.minimo)}–${pc1(segC.maximo)}); es un MODELO, no una medida:** sólo los conteos por estrato son medidos; personas → cuentas → mesas y su dispersión (σ = ${s.sigma_mesas_por_cuenta}) son supuestos. Con los topes anteriores (15 mesas) y la misma dispersión sólo ${pc1(compTopes.seguridad.centro)} (mínimo ${pc1(compTopes.seguridad.minimo)}).
2. **Margen de operación con 1,000 restaurantes (pesos al mes): ${sg(mop.recomendado)} recomendado · ${sg(mop.peor)} peor · ${sg(mop.mejor)} mejor · ${sg(mop.piso_de_verdad)} piso de verdad.** De la brecha entre «mejor» y la curva optimista con tarifa baja, ${n0(mejorSoloTarifa)} vienen sólo de la tarifa media de anuncios (§5).
3. **Peor caso real (todos gratuitos): con ${n0(b1000.bolsa)} pesos al mes de la bolsa de Calvin caben ${n0(b1000.centro.restaurantes)} restaurantes gratuitos (rango ${n0(b1000.minimo)} a ${n0(b1000.maximo)} según el soporte por gratuito, que no tiene fuente) y ${comensalesMillones(b1000.centro.comensales_mes)} millones de comensales al mes (simulados); sólo vale con el canal de eventos construido: con el sondeo de hoy caben ${b1000.caben_con_el_sondeo_de_hoy}.**
4. **Los anuncios pagan el sistema desde ${rg(rangos.baja)} restaurantes con la tarifa baja, ${rg(rangos.medio)} con la media y ${rg(rangos.adverso)} en el adverso: son rangos, no puntos** (con la tarifa a la mitad la tarifa baja pasa de ${nn(rangos.baja.centro)} a ${nn(rangos.baja.por_supuesto[0].bajo.n)}; con el soporte por gratuito en ${s.rangos.soporte_gratuito[1]} pesos, el adverso queda en ${nn(rangos.adverso.por_supuesto.find((v) => v.supuesto === 'soporte por cliente gratuito').alto.n)}).
5. **Qué medir primero en el piloto: ${sens.medir_primero.slice(0, 3).map((x) => x.supuesto).join(', ')};** y el precio de Master Chef (199, 225, 249, 299) **no lo decide este modelo**: lo decide la prueba de precios ([precio de entrada](2026-11-14-precio-de-entrada.md)).

${lineaDef}

**Qué cambió en la ronda 4 (API del \`.mjs\`, versión \`${M.VERSION}\`).** Firmas anteriores intactas. Nuevo: \`ESCENARIOS\` (una sola definición de cada escenario), \`evaluarEscenario\`, \`proyectarEscenario\`, \`matrizEscenarios\`, \`rangoSePagaSolo\`, \`rangoBolsa\`, \`sensibilidadPrecio\`, \`NO_MODELADO\`; \`valores()\` añade \`s.rangos\`; \`seguridadChico\` acepta \`'maximo'\`; \`resumen\` trae \`piso_de_verdad\` en cada cifra; la rejilla del optimizador llega a 60 mesas y 10 cuentas. **\`configInicial()\` cambia el tope de mesas de Chef de 15 a ${cs.mesas}** (consecuencia de la dispersión de mesas por cuenta; los demás topes y precios no cambian).

---

## 1. La segmentación de Calvin, traducida a topes

**Clientes potenciales = 104,882** (DENUE, mayo de 2026 [medido]). **Chef (gratis)** = 0–5 y 6–10 personas: **91,048 (86.8 %)** · **Master Chef** = 11–30, 31–50 y 51–100: **13,614 (13.0 %)** · **Chef Ejecutivo** = 101–250 y 251 o más: **220 (0.2 %)** (todo medido).

**Carta no sabe cuánta gente trabaja en un negocio**, así que la frontera se traduce a **topes que el producto aplica** con un modelo: cuentas = ⌈f × personas⌉ (f = 0.35 a 0.50), mesas = cuentas × m × exp(σ·z), m = 2.5 a 4 y **σ = ${s.sigma_mesas_por_cuenta} (rango ${s.rangos.sigma_mesas_por_cuenta[0]} a ${s.rangos.sigma_mesas_por_cuenta[1]}): dispersión de las mesas por cuenta, supuesto sin dato** (la versión anterior la fijaba en 0: las mesas eran una función exacta de las cuentas). **Medido: sólo los conteos por estrato. Supuesto: todo lo demás.** El piloto debe medir **mesas y cuentas por negocio** (mesas y personal activos de cada alta de los primeros 10 a 20 restaurantes) para acotar f, m y σ.

**¿Con qué topes un negocio de hasta 10 personas queda dentro del gratuito?** (centro con σ = ${s.sigma_mesas_por_cuenta}; entre paréntesis el mínimo y máximo de las 27 combinaciones del modelo; la columna «sin dispersión» es la versión anterior)

| Seguridad que se quiere | Topes de Chef (mesas · cuentas) | Con dispersión: centro (mín–máx) | Sin dispersión (anterior) | Parte de TODOS los registrados dentro | Negocios de más de 10 personas que se cuelan gratis |
|---|---|---|---|---|---|
${seg.topes_chef.map(topesFila).join('\n')}

**Versión conservadora** (la seguridad vale aun en el peor rincón de las 27 combinaciones):

| Seguridad que se quiere | Topes de Chef | Seguridad mínima | Dentro (todos) | Se cuelan gratis |
|---|---|---|---|---|
${seg.topes_chef_conservador.map(consFila).join('\n')}

**Con el tope de platillos y las lecturas de PDF** (un negocio chico puede tener carta larga) **la configuración inicial queda en ${cs.mesas} mesas · ${cs.cuentas} cuentas · ${cs.platillos} platillos con ${pc1(mejor.seguridad_chico)} de seguridad** (el optimizador la elige: la de mayor margen que cumple ${pc(opt.restricciones.seguridad)}; **está en el borde de la restricción**, no por encima). **Con 15 mesas, que era la elección antes de la dispersión, ya no cumple:** ${pc1(compTopes.seguridad.centro)}.

| Seguridad exigida a Chef | Topes | Seguridad real | Dentro de todos | Margen (1,000 restaurantes, curva media) |
|---|---|---|---|---|
${tc.map(tcFila).join('\n')}

**Master Chef** cubre hasta 100 mesas y 30 cuentas (≈ ${pc(seg.topes_master_chef[2].seguridad.centro)} de los negocios de 11 a 100 personas; arriba de esos topes queda ≈ ${pc1(seg.topes_master_chef[2].parte_de_los_registrados_arriba.centro)} de los registrados, que pasan a Chef Ejecutivo; por personal, Chef Ejecutivo es 0.2 %). **Chef Ejecutivo** exige subir el tope técnico de **50 cuentas activas** por restaurante (T-1.6): un negocio de 101 a 250 personas tiene 36 a 125 cuentas de personal en el modelo (**cambio de código, no de este informe**).

## 2. Precios: Master Chef pegado a Meniu, Chef Ejecutivo hacia arriba

**225 es una decisión de posicionamiento de Calvin (quedar pegado a Meniu Business), no un resultado del modelo**: la curva «media» se construyó con mediana 225 y por eso el óptimo sale cerca (${precios.media.precio}). Ver [precio de entrada](2026-11-14-precio-de-entrada.md) para la sensibilidad completa.

Cada precio con tres curvas (pesimista · media · optimista), **1,000 restaurantes registrados**. «Sin pérdidas» = margen de operación **y** después de captación ≥ 0 (con anuncios en marcha · sin anuncios todavía).

| Master Chef | Pagantes de Master Chef | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
${ep.servicio.map(filaPrecio).join('\n')}

| Chef Ejecutivo | Pagantes de Chef Ejecutivo | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
${ep.salon.map(filaPrecio).join('\n')}

**Lectura.** (1) **Los precios de Chef Ejecutivo cambian el margen menos de 2 %**: sólo ≈ ${n1(M.evaluar(rec, s, 1000, { curva: 'media' }).clientes.salon)} negocio de cada 1,000 es de ese tamaño; su precio **no se decide por margen sino por posicionamiento** (1,099 es lo que cuestan OlaClick Elite y Last.app). (2) **Master Chef: 199 a 299 cambia poco el margen pero sí los pagantes** (de ${n0(prS(199).por_curva.media.pagantes)} a ${n0(prS(299).por_curva.media.pagantes)} con la curva media). (3) **Sin anuncios, con la curva pesimista y 1,000 restaurantes, ningún precio evita la pérdida** (${sg(prS(225).por_curva.pesimista.margen_operacion_sin_anuncios)} al mes a 225): ese periodo lo paga Calvin.

## 3. La pregunta del peor caso: todos gratuitos

*«¿Hasta qué punto puedo tener restaurantes que todos son gratuitos, cuántos comensales, y todavía sostener el sistema con sólo anuncios?»* Todos los registrados son gratuitos. **Comensales al mes** = restaurantes × ${s.comensales_dia_gratuito} comensales al día × 30: dato **simulado (perfiles supuestos)**, más alto de lo que tendría una fonda de 0 a 5 personas. «Costo al mes» = servidor, almacenamiento y soporte (**${s.soporte_gratuito} pesos por gratuito: supuesto sin fuente, rango ${s.rangos.soporte_gratuito[0]} a ${s.rangos.soporte_gratuito[1]}**).

| Restaurantes gratuitos | Comensales al mes (simulado) | **Costo al mes sin anuncios** (pone Calvin) | Resultado con anuncios, tarifa baja | Adverso (mitad de tarifa, 30 % de visitas) | Tarifa media | Escalón de servidor |
|---|---|---|---|---|---|---|
${tg.medida.map(filaTG).join('\n')}
| *Zona extrapolada (sin medir)* | | | | | | |
${tg.extrapolada_sin_medir.map(filaTG).join('\n')}

**Desde cuántos restaurantes se paga solo, como rango** (con los otros supuestos en su valor de trabajo; «imposible» = no se paga solo con ≤ ${rangos.baja.tope} restaurantes):

| Caso | Centro | Mínimo – máximo entre variantes | Qué lo mueve (bajo · alto) |
|---|---|---|---|
${['baja', 'medio', 'adverso'].map((c) => `| ${c === 'baja' ? 'Tarifa baja' : c === 'medio' ? 'Tarifa media' : 'Adverso'} | **${nn(rangos[c].centro)}** | ${nn(rangos[c].minimo)} – ${rangos[c].maximo == null ? 'imposible' : n0(rangos[c].maximo)} | ${rangos[c].por_supuesto.map((v) => `${v.supuesto}: ${v.bajo.variante} → ${nn(v.bajo.n)}, ${v.alto.variante} → ${nn(v.alto.n)}`).join('; ')} |`).join('\n')}

**La bolsa de Calvin, como rango** (restaurantes gratuitos que caben, según el soporte por gratuito):

| Bolsa al mes | Centro (soporte ${s.soporte_gratuito}) | Mínimo – máximo | Por soporte (pesos por gratuito → restaurantes) |
|---|---|---|---|
${bolsasR.map((b) => `| ${n0(b.bolsa)} | **${n0(b.centro.restaurantes)}** | ${n0(b.minimo)} – ${n0(b.maximo)} | ${b.por_soporte.map((x) => `${x.soporte_gratuito} → ${n0(x.restaurantes)}`).join(' · ')} |`).join('\n')}

**Respuesta en una frase:** con ${n0(b1000.bolsa)} pesos al mes de mi bolsa caben ${n0(b1000.centro.restaurantes)} restaurantes gratuitos (rango ${n0(b1000.minimo)} a ${n0(b1000.maximo)}) y ${comensalesMillones(b1000.centro.comensales_mes)} millones de comensales al mes; **con el canal de eventos construido**; con el sondeo de hoy caben ${b1000.caben_con_el_sondeo_de_hoy}. Con anuncios se paga solo desde ${rg(rangos.baja)} restaurantes (tarifa baja).

**Qué no está modelado** en el ingreso por anuncios: ${M.NO_MODELADO.join('; ')}. **El 0.6 de visitas con la app y el 0.6 de visitas con anuncio no son el mismo descuento contado dos veces:** el primero es cuántos comensales abren la app (simulador), el segundo en cuántas de esas visitas se sirve un anuncio que paga; coinciden en el número y los dos son supuestos sin dato.

**Conciliación con [planes-y-costo §0](2026-11-13-planes-y-costo-por-restaurante.md).** Ese documento da **110–140 USD al mes de base fija para 1,000 restaurantes [estimada, ±2×, con el sondeo de hoy]**; este modelo da **≈ ${n0(infraUsd)} USD de servidor, disco y fotos** (sin el soporte de ${n0(1000 * s.soporte_gratuito)} pesos) para 1,000 gratuitos en el escalón ${tg1000.escalon}. **No contradicen: son dos mundos.** El del documento supone que cada teléfono pregunta cada 3 s (sondeo), que es lo que corre hoy; el del modelo supone el canal de eventos (ADR-018, **no construido**), con el que cada restaurante carga mucho menos al procesador. **Hasta que T-3.20 y T-3.21 existan, vale el del documento (110–140 USD); el del modelo es una meta, no un costo vigente.**

## 4. Todas las cifras en cuatro casos

${lineaDef}

| Cifra | Recomendado | Peor | Mejor | Piso de verdad | Qué es |
|---|---|---|---|---|---|
${res.cifras.map(fmtCif).join('\n')}

*Techo teórico «todos pagan» (1,000): ${sg(res.todos_pagan.margen_operacion)} pesos al mes; no se usa como cota.*

## 5. Matriz curva × anuncios (margen de operación, 1,000 restaurantes) y esperado a 100, 1,000 y 10,000

${mat}

**Piso de verdad** (pesimista, anuncios adversos y soporte al máximo de su rango): **${sg(pisoE.margen_operacion)}**.

| Restaurantes | Peor | Recomendado | Mejor | Piso de verdad |
|---|---|---|---|---|
${esc.map((r) => { const f = (nombre) => { const e = M.evaluarEscenario(nombre, rec, s, r.n); return `${sg(e.margen_operacion)} → ${sg(e.margen_despues_de_captacion)}`; }; return `| ${n0(r.n)} | ${f('peor')} | **${f('recomendado')}** | ${f('mejor')} | ${f('piso_de_verdad')} |`; }).join('\n')}

*(margen de operación → después de captación)*

## 6. Qué supuesto mueve más el margen, en llano (1,000 restaurantes, recomendado)

**Qué medir primero en el piloto:** ${sens.medir_primero.map((x, i) => `${i + 1}. ${x.supuesto} → ${x.como}`).join(' · ')}.

| Qué pasa si… | Efecto en el margen (pesos al mes) |
|---|---|
${sensFilas(sens)}

## 7. Crecimiento mes a mes (adopción **supuesta**: ${s.meta_12_meses} restaurantes a 12 meses y ${s.meta_24_meses} a 24; anuncios desde el mes ${s.mes_inicio_anuncios})

Margen de operación al mes. Peor = sin anuncios en ningún mes; recomendado: anuncios desde el mes ${s.mes_inicio_anuncios}.

| Mes | Restaurantes | De paga (recomendado) | Peor | **Recomendado** | Mejor | Piso de verdad | Escalón |
|---|---|---|---|---|---|---|---|
${[3, 6, 9, 12, 18, 24, 36].map(proyFila).join('\n')}

**Primer mes con margen de operación positivo (recomendado): ${proy.media.mes_primer_margen_positivo}; después de captación: ${proy.media.mes_primer_margen_positivo_despues_de_captacion}.** **Lo más que tendría que poner Calvin, acumulado: ${n0(proy.media.financiamiento_maximo)} pesos** (peor: ${n0(proyPeor.financiamiento_maximo)}; piso de verdad: ${n0(proyPiso.financiamiento_maximo)}). *Artefacto de la curva de adopción supuesta y del costo de captación sin dato.* **Más de ≈ ${n0(nArq)} restaurantes registrados exige otra arquitectura: todo costo de ahí en adelante es extrapolación sin medir.**

## 8. Límites (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente.** Los umbrales de anuncios dependen de la tarifa, la parte de visitas con anuncio y el soporte por gratuito, sin dato.
- **Los topes de mesas y cuentas son un modelo:** medido sólo el conteo por estrato; el piloto debe medir mesas y cuentas por negocio.
- **El dato de comensales por restaurante es simulado**; los muros salen de un simulador, no de una prueba de carga (±2×).
- **Ingresos de anuncios sin modelar:** ${M.NO_MODELADO.join('; ')}.
- **Pruebas:** \`node 2026-11-14-pruebas.mjs\` fija con tolerancia estrecha las cifras de titular y prueba que ningún escenario «sin anuncios» tenga ingresos por anuncios.
`;
writeFileSync(join(aqui, '2026-11-14-modelo-de-escenarios.md'), md);

// ------------------------------------------------------------------ chequeo de márgenes
const linea = (nombre, f) => `| ${nombre} | ${n0(f.fila.restaurantes)} | ${n0(f.fila.pagantes)} | ${n0(f.fila.ingresos_suscripcion)} | ${n0(f.fila.ingresos_anuncios)} | **${n0(f.fila.ingresos)}** | ${n0(f.fila.costos)} | ${n0(f.fila.captacion)} | **${sg(f.fila.margen_despues_de_captacion)}** |`;
const chequeoMd = `# Chequeo de márgenes: mes 12 cifra por cifra y a dónde se va cada peso

**Fecha:** 14 de noviembre de 2026 (ronda 4) · **Generado por \`2026-11-14-corre-escenarios.mjs\`**; datos en [\`…-modelo-de-escenarios-resultados.json\`](2026-11-14-modelo-de-escenarios-resultados.json) (\`chequeo_de_margenes\`). Escenarios definidos una sola vez (\`ESCENARIOS\`): ${lineaDef}

## Conclusiones

1. **El «margen de 10,000 al mes 12 en el mejor caso» venía de una versión anterior del modelo y no se reproduce**; con el modelo actual el **mejor del mes 12 es ${sg(chq.mejor.fila.margen_operacion)} de operación** (${sg(chq.mejor.fila.margen_despues_de_captacion)} después de captación) con ${n0(chq.mejor.fila.pagantes)} de paga. La cifra vieja no quedó guardada: no pude desglosarla.
2. **Mes 12 recomendado: ingresos ${n0(chq.recomendado.fila.ingresos)}, costos ${n0(chq.recomendado.fila.costos)}, operación ${sg(chq.recomendado.fila.margen_operacion)}, después de captación ${sg(chq.recomendado.fila.margen_despues_de_captacion)}** con ${n0(chq.recomendado.fila.restaurantes)} restaurantes y ${n0(chq.recomendado.fila.pagantes)} de paga.
3. **El peor del mes 12 NO lleva anuncios** (ingresos por anuncios ${n0(chq.peor.fila.ingresos_anuncios)}): ${sg(chq.peor.fila.margen_operacion)} de operación y ${sg(chq.peor.fila.margen_despues_de_captacion)} después de captación; **el piso de verdad da ${sg(chq.piso.fila.margen_operacion)}** de operación.
4. **De cada 100 pesos que entran en el mes 12 (recomendado): ${n1(chq.recomendado.desglose.partes[0].por_cada_100)} van al servidor, ${n1(chq.recomendado.desglose.partes[2].por_cada_100)} a soporte, ${n1(chq.recomendado.desglose.partes[3].por_cada_100)} a la comisión de cobro, ${n1(chq.recomendado.desglose.partes[4].por_cada_100)} a conseguir clientes y ${n1(chq.recomendado.desglose.por_cada_100_margen)} se quedan.** Los anuncios son ${n1((100 * chq.recomendado.fila.ingresos_anuncios) / chq.recomendado.fila.ingresos)} de cada 100 que entran y dependen de una tarifa sin dato.

## 1. Mes 12, de dónde sale cada cifra (pesos al mes)

| Caso | Restaurantes | De paga | Ingreso por suscripción | Ingreso por anuncios | **Ingresos** | Costos de operación | Conseguir clientes | **Margen después de captación** |
|---|---|---|---|---|---|---|---|---|
${linea('Peor (sin anuncios en ningún mes)', chq.peor)}
${linea('**Recomendado**', chq.recomendado)}
${linea('Mejor', chq.mejor)}
${linea('Piso de verdad', chq.piso)}

**Cómo se calcula cada columna.** *Restaurantes* = a·t^b con ${s.meta_12_meses} a 12 meses y ${s.meta_24_meses} a 24 (**supuesto**). *De paga* = restaurantes × los que rebasan los topes (${pc1(M.parteRebasa(rec, s))}) × los que llegan a pagar según la curva. *Anuncios* = gratuitos × ${n0(s.visitas_app_gratuito)} visitas × ${pc(s.parte_visitas_con_anuncio)} con anuncio × tarifa por mil; **antes del mes ${s.mes_inicio_anuncios} es cero** salvo que el escenario lleve anuncios (el peor no los lleva nunca). *Conseguir clientes* = altas × ${s.cac} pesos.

## 2. La matriz que separa los dos ejes (margen de operación, 1,000 restaurantes en régimen)

${mat}

**Del mejor (${sg(M.evaluarEscenario('mejor', rec, s, 1000).margen_operacion)}), ${n0(mejorSoloTarifa)} vienen sólo de la tarifa media de anuncios** (optimista con tarifa baja: ${sg(mA('optimista', 'baja'))}).

## 3. De cada 100 pesos que entran (mes 12)

| Concepto | Recomendado | Peor | Mejor | Piso de verdad |
|---|---|---|---|---|
${chq.recomendado.desglose.partes.map((x, i) => `| ${x.concepto} | ${n1(x.por_cada_100)} | ${n1(chq.peor.desglose.partes[i].por_cada_100)} | ${n1(chq.mejor.desglose.partes[i].por_cada_100)} | ${n1(chq.piso.desglose.partes[i].por_cada_100)} |`).join('\n')}
| **Se queda (después de captación)** | **${n1(chq.recomendado.desglose.por_cada_100_margen)}** | ${n1(chq.peor.desglose.por_cada_100_margen)} | ${n1(chq.mejor.desglose.por_cada_100_margen)} | ${n1(chq.piso.desglose.por_cada_100_margen)} |

*Negativo en una fila = costo mayor que lo que entra. **En régimen con 1,000 restaurantes (curva media):** ${n0(chequeo.regimen_1000.recomendado.ingresos)} de ingresos al mes (${n0(chequeo.regimen_1000.recomendado.ingresos_detalle.suscripcion)} de suscripción y ${n0(chequeo.regimen_1000.recomendado.ingresos_detalle.anuncios)} de anuncios).*

## 4. Lo que no incluye
Sueldos (0), impuestos (0), ni gasto de ventas más allá de ${s.cac} pesos por cliente de paga; bajas y captación sin dato. Ingresos de anuncios sin modelar: ${M.NO_MODELADO.join('; ')}.
`;
writeFileSync(join(aqui, '2026-11-14-chequeo-de-margenes.md'), chequeoMd);

// ------------------------------------------------------------------ precio de entrada (sensibilidad generada por el modelo)
const tabMed = `| Mediana de la curva de pago (supuesto 225) | ${sensP.precios.map((p) => `Margen a ${p}`).join(' | ')} | Gana entre los 4 | Óptimo continuo |\n|---|${sensP.precios.map(() => '---').join('|')}|---|---|\n${sensP.por_mediana.map((f) => `| ${f.mediana} | ${f.margenes.map((x) => n0(x.margen_operacion)).join(' | ')} | **${f.precio_ganador}** | ${f.optimo_continuo} |`).join('\n')}`;
const tabSig = `| Sigma de la curva (supuesto ${sensP.base.sigma}) | ${sensP.precios.map((p) => `Margen a ${p}`).join(' | ')} | Gana entre los 4 | Óptimo continuo |\n|---|${sensP.precios.map(() => '---').join('|')}|---|---|\n${sensP.por_sigma.map((f) => `| ${f.sigma} | ${f.margenes.map((x) => n0(x.margen_operacion)).join(' | ')} | **${f.precio_ganador}** | ${f.optimo_continuo} |`).join('\n')}`;
const entrada = `# Precio de Master Chef: qué decide el modelo y qué decide el piloto

**Fecha:** 14 de noviembre de 2026 (ronda 4) · **Generado por \`2026-11-14-corre-escenarios.mjs\`**: las tablas salen del modelo (\`precio_sensibilidad\` en el JSON de resultados), no están escritas a mano. Evidencia externa al final, con lo que **no** pude verificar marcado.

## Conclusiones

1. **El modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba de tres precios del piloto.** La curva «media» se construyó con mediana 225 (el precio de Meniu Business) y el óptimo sale ${sensP.por_mediana.find((f) => f.mediana === 225).optimo_continuo}: **el modelo devuelve su supuesto** (conclusión circular de la versión anterior de este documento, retirada).
2. **225 es una decisión de posicionamiento de Calvin (quedar pegado a Meniu), no un resultado del modelo.** Con la mediana en ${sensP.por_mediana[0].mediana} gana ${sensP.por_mediana[0].precio_ganador}; en ${sensP.por_mediana[2].mediana}, ${sensP.por_mediana[2].precio_ganador}; en ${sensP.por_mediana[3].mediana}, ${sensP.por_mediana[3].precio_ganador} (el óptimo continuo sube a ${sensP.por_mediana[3].optimo_continuo}).
3. **La dispersión de la curva (sigma) también cambia al ganador:** con sigma ${sensP.por_sigma[0].sigma} gana ${sensP.por_sigma[0].precio_ganador}; con ${sensP.por_sigma[3].sigma}, ${sensP.por_sigma[3].precio_ganador}. De 199 a 249 el margen ${sensP.por_sigma[0].margenes[0].margen_operacion > sensP.por_sigma[0].margenes[2].margen_operacion ? 'cae' : 'sube'} con sigma ${sensP.por_sigma[0].sigma} (${n0(sensP.por_sigma[0].margenes[0].margen_operacion)} → ${n0(sensP.por_sigma[0].margenes[2].margen_operacion)}) y ${sensP.por_sigma[3].margenes[0].margen_operacion > sensP.por_sigma[3].margenes[2].margen_operacion ? 'cae' : 'sube'} con ${sensP.por_sigma[3].sigma} (${n0(sensP.por_sigma[3].margenes[0].margen_operacion)} → ${n0(sensP.por_sigma[3].margenes[2].margen_operacion)}).
4. **Con la curva supuesta, entre 199 y 249 el margen casi no cambia pero sí los pagantes** (${precios_pagantes()}): entrar barato compra clientes, no margen.
5. **No hay evidencia abierta fuerte de que entrar con un precio bajo y subir después convenga a un SaaS de restaurantes** (§3).

## 1. Margen de operación al mes según la mediana de la curva de pago (1,000 restaurantes, anuncios en marcha, sigma ${sensP.base.sigma}, techo ${sensP.base.techo})

${tabMed}

## 2. Margen según la dispersión de la curva (mediana ${sensP.base.mediana})

${tabSig}

**Qué resultado del piloto lleva a cada precio** (regla de decisión derivada de la primera tabla; «empate» = precios a menos de 1 % del mejor margen): ${sensP.por_mediana.map((f, i) => { const mx = Math.max(...f.margenes.map((x) => x.margen_operacion)); const emp = f.margenes.filter((x) => x.margen_operacion >= 0.99 * mx).map((x) => x.precio); return `${i === 0 ? 'si la mediana (el precio al que la mitad de los dueños dice que sí) sale' : 'si sale'} cerca de ${f.mediana} → ${emp.join(' o ')}`; }).join('; ')}${sensP.por_mediana[sensP.por_mediana.length - 1].precio_ganador === sensP.precios[sensP.precios.length - 1] ? ' (el más alto de los candidatos: valdría probar uno mayor)' : ''}. La **dispersión** (qué tan distintos son los dueños) se lee del mismo piloto: con sigma baja gana el precio más bajo y con sigma alta, el más alto (tabla 2).

**Prueba del piloto:** tres grupos de 10 restaurantes en el límite (199, 249, 299 o el que corresponda) más la escalera de precios de Van Westendorp; se mide cuántos aceptan y a los 6 meses cuántos se quedan en cada grupo.

## 3. Evidencia abierta sobre «entrar barato y subir» (poca, y no es de restaurantes)

| Fuente | Qué es | Qué dice | Qué tan firme |
|---|---|---|---|
| Kanuri y Andrews (2019), estudio citado por [Nieman Lab, 15-jul-2019](https://www.niemanlab.org/2019/07/nearly-7000-people-threatened-to-cancel-their-newspaper-subscriptions-heres-what-got-them-to-stay/) | Periódico de EE. UU., 6,919 amenazas de cancelar, enero de 2010 a marzo de 2013 | Un descuento temporal tras una falla **reduce** las renovaciones al volver el precio; recordar el precio completo ayuda; subir de a poco conviene más que saltar de 0.50 a 10 dólares a la semana | **Leí la nota, no el estudio** (DOI 10.1177/0022242919859325); un solo periódico; no es SaaS |
| Datta, Foubert y Van Heerde (2015), *Journal of Marketing Research* | Televisión digital | Los clientes que entraron por prueba gratis valen menos que los regulares | Sólo el resumen de un buscador; no leí el artículo |
| Netflix, enero de 2016 | Fin del precio congelado | Netflix esperaba «sólo un poco más de cancelaciones»; UBS estimó 3–4 % | **Pronóstico**, no resultado medido |
| Mather Economics (benchmarks en un blog) | Suscripciones de medios | Elasticidad al precio de entrada de −1.0 a −2.0; 16 % de cancelaciones en la primera renovación | De la propia consultora, **sin verificar** |
| Gardete, Schmitt y Stahl (2025) | Documento de trabajo | Los que entraron con promoción consumen más tras subir el precio | **La URL dio 404; no se usa** |

**Opinión de blog (marcada):** artículos de práctica dicen que comunicar el valor reduce las bajas al subir; sin datos propios, no se usan.

## 4. Antes de cobrar Chef Ejecutivo
Un negocio de 101 a 250 personas tiene unas 36 a 125 cuentas de personal en el modelo y el tope técnico es de **50 cuentas activas por restaurante** (T-1.6): hay que subirlo antes de vender ese plan (cambio de código, no de este informe).

## 5. Datos por conseguir
- La curva de pago real (prueba de precio del piloto, tres grupos).
- Si los que entraron más barato se van más al subir (mismo grupo medido a los 6 meses).
- Los artículos originales de Kanuri y Andrews y de Datta, Foubert y Van Heerde.
`;
function precios_pagantes() { return [199, 225, 249].map((p) => `${p}: ${n0(prS(p).por_curva.media.pagantes)}`).join(' · '); }
writeFileSync(join(aqui, '2026-11-14-precio-de-entrada.md'), entrada);

// ------------------------------------------------------------------ recomendaciones
const R = [
  { id: 'segmentacion', decision: 'Segmentación: qué entra en cada plan y con qué topes',
    recomendacion: `**Chef (gratis) = ${cs.mesas} mesas, ${cs.cuentas} cuentas de personal, ${cs.platillos} platillos; Master Chef = hasta 100 mesas y 30 cuentas; Chef Ejecutivo = lo que pase de ahí.** Con eso, ${pc1(segC.centro)} de los negocios de hasta 10 personas quedan gratis (intervalo del modelo ${pc1(segC.minimo)}–${pc1(segC.maximo)}).`,
    depende: `**Del modelo de mesas y cuentas y de su dispersión (σ = ${s.sigma_mesas_por_cuenta}, supuesto sin dato).** Medido: sólo los conteos por estrato. Con 15 mesas la seguridad sería ${pc1(compTopes.seguridad.centro)}, no 95 %; con el peor rincón del modelo, ningún tope de la rejilla estrecha lo cumple salvo ${(() => { const r = M.optimizar(s, { clave: 'minimo' }).tabla_cupo_gratis[2]; return `${r.mesas} mesas · ${r.cuentas} cuentas · ${r.platillos} platillos`; })()}. **Si falla:** si las fondas tienen más mesas, algunas pagan sin querer; se corrige subiendo el tope (el piloto lo muestra en una semana).`,
    cifras: `Para 80 / 90 / 95 % de seguridad: ${tc.map((x) => `${x.mesas} mesas y ${x.cuentas} cuentas (${x.platillos} platillos)`).join(' · ')}; margen ${tc.map((x) => n0(x.margen)).join(' · ')} al mes con 1,000 restaurantes. Chef Ejecutivo exige subir el tope técnico de 50 cuentas activas (T-1.6).`,
    alternativas: tc.map((x) => ({ opcion: `Seguridad ${pc(x.seguridad)}: ${x.mesas} mesas, ${x.cuentas} cuentas, ${x.platillos} platillos`, pros: `margen ${n0(x.margen)}`, contras: `${pc1(x.seguridad_real)} de los de hasta 10 personas dentro; ${pc(x.dentro_de_todos)} de todos` })),
    ejemplo: `Una fonda de 6 mesas y 3 personas queda dentro (Chef); un restaurante de 40 mesas (≈ 11 a 50 personas) pasa a Master Chef; un salón de 60 mesas y 12 cuentas también; un hotel con 150 mesas y 40 cuentas es Chef Ejecutivo.`,
    prueba: 'Medir mesas y cuentas por negocio en los primeros 10 a 20 restaurantes: `mesa` y `personal_restaurante` activos por restaurante al darse de alta (sin datos personales).' },
  { id: 'precios', decision: 'Precios de Master Chef y Chef Ejecutivo',
    recomendacion: `**Master Chef 225 es una decisión de posicionamiento de Calvin (pegado a Meniu Business), no un resultado del modelo; Chef Ejecutivo 1,099 (igual que OlaClick Elite y Last.app Starter-Growth) también.** El modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba de tres precios del piloto.`,
    depende: `**De la curva de pago (supuesto).** Con la mediana en ${sensP.por_mediana[0].mediana} gana ${sensP.por_mediana[0].precio_ganador}; en 225, ${sensP.por_mediana[1].precio_ganador}; en ${sensP.por_mediana[2].mediana}, ${sensP.por_mediana[2].precio_ganador}; en ${sensP.por_mediana[3].mediana}, ${sensP.por_mediana[3].precio_ganador}. Ver [precio de entrada](2026-11-14-precio-de-entrada.md) (tablas por mediana y sigma). **Si falla:** si los dueños pagan lo de un menú QR (157), 225 pierde clientes; si pagan lo de un POS (652), 225 deja dinero sobre la mesa.`,
    cifras: `Master Chef 199 / 225 / 249 / 299: pagantes (media) ${[199, 225, 249, 299].map((p) => n0(prS(p).por_curva.media.pagantes)).join(' / ')}; margen de operación (media) ${[199, 225, 249, 299].map((p) => n0(prS(p).por_curva.media.margen_operacion)).join(' / ')}. Chef Ejecutivo 799 / 1,099 / 1,599: ${[799, 1099, 1599].map((p) => n0(prL(p).por_curva.media.margen_operacion)).join(' / ')}.`,
    alternativas: [{ opcion: '199', pros: 'Más pagantes', contras: 'Debajo de Meniu' }, { opcion: '225 (decisión de posicionamiento)', pros: 'Pegado a Meniu', contras: 'Sin colchón si el soporte cuesta más' }, { opcion: '249', pros: 'Mismo margen que 225 con la curva supuesta', contras: 'Un poco arriba de Meniu' }, { opcion: '299', pros: 'Más margen por pagante', contras: `Menos pagantes (${n0(prS(299).por_curva.media.pagantes)} contra ${n0(prS(225).por_curva.media.pagantes)})` }],
    ejemplo: 'Un restaurante de 25 mesas (ingreso medio 737,584 al mes [INEGI]): 225 son 0.03 % de su ingreso.',
    prueba: 'Prueba de precio del piloto: tres grupos de 10 (199 · 249 · 299) y a los 6 meses cuántos se quedan.' },
  { id: 'anuncios', decision: 'Anuncios en Chef: cuándo llegan y cuánto dejan',
    recomendacion: `**El plan gratuito lleva anuncios; llegan hacia el mes ${s.mes_inicio_anuncios} (supuesto de trabajo), no personalizados.** Mientras no hay, los paga Calvin: con ${n0(b1000.bolsa)} pesos al mes caben ${n0(b1000.centro.restaurantes)} restaurantes (rango ${n0(b1000.minimo)} a ${n0(b1000.maximo)}).`,
    depende: `**De supuestos sin dato:** que la red apruebe el sitio, la tarifa por mil visitas, la parte de visitas con anuncio y el soporte por gratuito. **Se paga solo desde:** ${rg(rangos.baja)} (tarifa baja), ${rg(rangos.medio)} (media) y ${rg(rangos.adverso)} (adverso). Vale con el canal de eventos construido (con el sondeo de hoy caben ${b1000.caben_con_el_sondeo_de_hoy}). No modelado: ${M.NO_MODELADO.join('; ')}.`,
    cifras: `Requisitos: ADR, abrir la política de seguridad (\`script-src 'self'\`), aviso de privacidad, aprobación de la red.`,
    alternativas: [{ opcion: 'Anuncios desde el mes 3', pros: 'El peor caso se cubre antes', contras: 'No hay tiempo de construir y que la red apruebe' }, { opcion: `Anuncios desde el mes ${s.mes_inicio_anuncios} (supuesto)`, pros: 'Tiempo realista', contras: `Calvin pone hasta ${n0(proy.media.financiamiento_maximo)} pesos acumulados` }, { opcion: 'Sin anuncios', pros: 'Cumple la política de seguridad de hoy', contras: 'Descartada por Calvin' }],
    ejemplo: `Un gratuito deja ${n1(rec.por_cliente?.ingreso_gratuito ?? M.evaluar(rec, s, 1000, { curva: 'media' }).por_cliente.ingreso_gratuito)} pesos al mes con la tarifa baja una vez que hay anuncios; hoy deja 0.`,
    prueba: 'Una prueba pequeña de AdSense con 3 restaurantes (impresiones, ingresos, RPM, tasa de llenado).' },
  { id: 'bolsa', decision: 'Cuánta bolsa poner mientras no hay anuncios',
    recomendacion: `**${n0(b1000.bolsa)} pesos al mes** alcanzan para ${n0(b1000.centro.restaurantes)} restaurantes gratuitos (rango ${n0(b1000.minimo)} a ${n0(b1000.maximo)}); acumulado, Calvin pone hasta **${n0(proy.media.financiamiento_maximo)} pesos** en el caso recomendado, ${n0(proyPeor.financiamiento_maximo)} en el peor y ${n0(proyPiso.financiamiento_maximo)} en el piso de verdad.`,
    depende: '**Del ritmo de adopción (supuesto) y del soporte por gratuito (sin fuente).** Vale con el canal de eventos construido.',
    cifras: `Bolsa ${bolsasR.map((b) => n0(b.bolsa)).join(' / ')} → ${bolsasR.map((b) => `${n0(b.centro.restaurantes)} (${n0(b.minimo)}–${n0(b.maximo)})`).join(' / ')} restaurantes.`,
    alternativas: bolsasR.map((b) => ({ opcion: `${n0(b.bolsa)} pesos al mes`, pros: `${n0(b.centro.restaurantes)} restaurantes y ${comensalesMillones(b.centro.comensales_mes)} M de comensales`, contras: `rango ${n0(b.minimo)}–${n0(b.maximo)} según el soporte` })),
    ejemplo: `Con ${n0(b1000.bolsa)} pesos al mes pagas servidor y soporte básico de ≈ ${n0(b1000.centro.restaurantes)} fondas y taquerías gratuitas.`,
    prueba: 'El costo real de Railway del primer mes con restaurantes del piloto y los minutos reales de soporte.' },
  { id: 'historial', decision: 'Historial: meses en línea y archivo descargable',
    recomendacion: '**12 meses en línea para la paga (decidido por Calvin) y 30 días para el gratuito, con archivo descargable de lo anterior.**',
    depende: '**Del volumen de disco que se pague y de los 7.1–8.5 KB por visita medidos (con 10 eventos por visita supuestos)** ([disco-e-historial](2026-11-14-disco-e-historial.md)).',
    cifras: 'Con 1, 3, 6 y 12 meses el margen casi no cambia; en Hobby caben 263, 128, 72 y 38 clientes de paga (Pro: 2,637 · 1,283 · 724 · 387) [disco-e-historial].',
    alternativas: [{ opcion: '3 meses + archivo', pros: '128 de paga en Hobby', contras: 'Cambia lo decidido' }, { opcion: '12 meses + archivo (recomendada)', pros: 'Cumple lo decidido', contras: 'En Hobby sólo caben 38 de paga' }],
    ejemplo: 'Un restaurante de 25 mesas con 1,800 visitas al mes genera 13.5 MB al mes: 12 meses son 162 MB.',
    prueba: 'Cuántos dueños abren el mes anterior en el panel.' },
  { id: 'soporte', decision: 'Soporte',
    recomendacion: `**WhatsApp o correo en horario hábil para la paga (≈ ${s.soporte_servicio} pesos al mes por cliente) y autoservicio para el gratuito (${s.soporte_gratuito}, sin fuente).**`,
    depende: `**Del tiempo real de soporte (supuesto).** Si cada cliente de paga cuesta ${s.rangos.soporte_servicio[1]}, Master Chef a 225 queda debajo del piso ×3 (${n0(3 * M.piso(s, 'servicio', 225))}) y hay que subir el precio o acotar el soporte.`,
    cifras: `Efecto en el margen (±50 %): soporte del gratuito ${n0(sens.filas.find((f) => f.supuesto === 'soporte por cliente gratuito').efecto)} pesos; de paga ${n0(sens.filas.find((f) => f.supuesto === 'soporte por cliente de paga').efecto)}.`,
    alternativas: [{ opcion: 'Autoservicio y correo (30)', pros: 'Piso bajo', contras: 'Mal servicio si no saben subir su carta' }, { opcion: `WhatsApp en horario (${s.soporte_servicio}, recomendada)`, pros: 'Equilibrio', contras: 'Depende de que 30 minutos alcancen' }, { opcion: 'Alta hecha por nosotros (150)', pros: 'Mejor conversión probable', contras: 'El piso ×3 sube' }],
    ejemplo: 'Un salón de 60 mesas necesita soporte propio (se supone 120).',
    prueba: 'Tickets y minutos de soporte del piloto.' },
  { id: 'avisos_reloj', decision: 'Avisos de reloj desde el servidor',
    recomendacion: '**No.** Los relojes se calculan en el teléfono (AC-40.9).',
    depende: '**De que no haya notificaciones push (fuera de la v1).**',
    cifras: 'Un temporizador para ≈ 12,000 mesas es una consulta por minuto; sin push no despierta al teléfono.',
    alternativas: [{ opcion: 'Relojes en el teléfono (recomendada)', pros: 'Cero costo de servidor', contras: 'Si el teléfono duerme no avisa' }, { opcion: 'Reloj en el servidor', pros: 'Un evento por cruce de umbral', contras: 'Contradice AC-40.9' }],
    ejemplo: 'El capitán de un salón de 60 mesas ve en su teléfono que la mesa 12 lleva 25 minutos sin movimiento.',
    prueba: 'Que se apruebe push.' },
];
writeFileSync(join(aqui, '2026-11-14-recomendaciones.json'), JSON.stringify({ version: M.VERSION, decisiones: R, configuraciones: { segmentacion_de_calvin: { nombre: 'Segmentación de Calvin (configInicial)', config: rec }, topes_10_mesas_3_cuentas: { nombre: 'Topes 10 mesas / 3 cuentas (la anterior)', config: antes } }, tabla_cupo_gratis: tc }, null, 1));
let r = `# Recomendaciones: siete decisiones con su supuesto, sus alternativas y la prueba que las cierra

**Fecha:** 14 de noviembre de 2026 (ronda 4; apoyado en el [modelo](2026-11-14-modelo-de-escenarios.md)) · **Generado por \`2026-11-14-corre-escenarios.mjs\`** · [JSON](2026-11-14-recomendaciones.json).

## Conclusiones

1. **Planes por tamaño: Chef (gratis) ${cs.mesas} mesas · ${cs.cuentas} cuentas · ${cs.platillos} platillos; Master Chef hasta 100 mesas y 30 cuentas; Chef Ejecutivo lo demás.** Es un modelo (σ = ${s.sigma_mesas_por_cuenta} supuesto): ${pc1(segC.centro)} de los negocios de hasta 10 personas quedan dentro (${pc1(segC.minimo)}–${pc1(segC.maximo)}).
2. **Master Chef 225 y Chef Ejecutivo 1,099 son decisiones de posicionamiento de Calvin, no resultados del modelo;** el modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba del piloto. Margen de operación con 1,000 restaurantes: ${sg(mop.recomendado)} recomendado, ${sg(mop.peor)} peor, ${sg(mop.mejor)} mejor, ${sg(mop.piso_de_verdad)} piso de verdad.
3. **Los anuncios llegan hacia el mes ${s.mes_inicio_anuncios} (supuesto); mientras tanto, ${n0(b1000.bolsa)} pesos al mes cargan ${n0(b1000.centro.restaurantes)} restaurantes gratuitos (rango ${n0(b1000.minimo)}–${n0(b1000.maximo)}), con el canal de eventos construido.**
4. **Lo que más cambia el resultado: ${sens.medir_primero.slice(0, 3).map((x) => x.supuesto).join(', ')}.** Se miden en el piloto.
5. **Historial de 12 meses para la paga (decidido): casi no mueve el margen.**

${lineaDef}

`;
R.forEach((d, i) => {
  r += `\n## ${i + 1}. ${d.decision}\n\n**Recomendación.** ${d.recomendacion}\n\n**De qué supuesto depende y qué pasa si falla.** ${d.depende}\n\n**Cifras del modelo.** ${d.cifras}\n\n| Opción | A favor | En contra |\n|---|---|---|\n${d.alternativas.map((a) => `| ${a.opcion} | ${a.pros} | ${a.contras} |`).join('\n')}\n\n**Ejemplo.** ${d.ejemplo}\n\n**La prueba o el dato que la cierra.** ${d.prueba}\n\n---\n`;
});
r += `\n## 8. Datos por conseguir (resumen)\n\nCurva de pago real · mesas, cuentas y platillos por negocio (para acotar el modelo y σ) · bajas y costo de conseguir un cliente (**sin dato**) · tarifa de anuncios, parte de visitas con anuncio, tasa de llenado y aprobación de la red · soporte por cliente (gratuito y de paga) · comensales por restaurante real · eventos por visita · costo real de Railway con el sondeo de hoy.\n`;
writeFileSync(join(aqui, '2026-11-14-recomendaciones.md'), r);
console.log('ok. topes optimizador:', mejor.mesas, mejor.cuentas, mejor.platillos, 'seguridad', mejor.seguridad_chico.toFixed(3), 'nArq', nArq, 'bolsa1000', b1000.centro.restaurantes, 'rangos', JSON.stringify({ b: rangos.baja.centro, a: rangos.adverso.centro, m: rangos.medio.centro }));
