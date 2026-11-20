// Corre el modelo y GENERA los resultados y los informes (modelo, recomendaciones, chequeo de márgenes): ninguna cifra se transcribe a mano.
// Uso: node 2026-11-14-corre-escenarios.mjs
// Escribe: …-modelo-de-escenarios-resultados.json, …-modelo-de-escenarios.md, …-recomendaciones.md/.json, …-chequeo-de-margenes.md
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida_dir = process.env.CARTA_SALIDA ?? aqui; // las pruebas regeneran en una carpeta temporal y comparan con lo commiteado
const par = JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8'));
const seg = JSON.parse(readFileSync(join(aqui, '2026-11-14-segmentacion-datos.json'), 'utf8'));
const s = M.valores(par);
const curvas = ['pesimista', 'media', 'optimista'];
const N = [100, 1000, 10000];

// ------------------------------------------------------------------ cálculo
const rec = M.configInicial();
const tres = { ...M.configTresPlanes25Mesas(), carga: 'tipica' }; // HISTÓRICO, con la carga típica (comparación rotulada: con la carga por topes 25 mesas × 180 visitas no cabe en la arquitectura de hoy) // la configuración de las rondas 4 a 7 (Chef 25 · 4 · 150, Master Chef, Chef Ejecutivo)
const opt = M.optimizar(s, {}, tres); // la restricción de ≥ 95 % de ≤ 10 personas era del plan anterior
const mejor = opt.mejor;
const antes = { ...M.configTopes10Mesas3Cuentas(), carga: 'tipica' }; // HISTÓRICO, con la carga típica

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
const bolsaSinPurga = M.capacidadConBolsa(M.conHistorialGratuito(rec, s, 12), s, 1000);
const margenSinPurga = M.evaluar(M.conHistorialGratuito(rec, s, 12), s, 1000, { curva: 'media' });
const bolsasR = [500, 1000, 2000, 5000].map((b) => M.rangoBolsa(rec, s, b));
const coberturaTipo = (k) => { const x = s.cobertura_platillos.por_tipo_baja[k]; return `${x.dentro_de_150_total} de ${x.n}`; };
const cobChef = M.coberturaChef(rec, s);
const cobChefMin = M.coberturaChef(rec, s, 'minimo');
const opcionesPlat = M.opcionesTopePlatillos(rec, s, 1000);
const segC = { centro: M.seguridadChico(rec, s, 'centro'), minimo: M.seguridadChico(rec, s, 'minimo'), maximo: M.seguridadChico(rec, s, 'maximo') };
const eTres = (nombre, n = 1000) => M.evaluarEscenario(nombre, tres, s, n);
const comp = {
  nota: 'la misma base con tres planes (Chef 25 mesas · 4 cuentas · 150 platillos; Master Chef 225; Chef Ejecutivo 1,099)',
  escenarios: Object.fromEntries(['recomendado', 'peor', 'mejor', 'piso_de_verdad'].map((k) => [k, { dos_planes: M.evaluarEscenario(k, rec, s, 1000).margen_operacion, tres_planes: eTres(k).margen_operacion }])),
  pagantes_por_1000: { dos_planes: M.evaluar(rec, s, 1000, { curva: 'media' }).clientes.de_paga, tres_planes: M.evaluar(tres, s, 1000, { curva: 'media' }).clientes.de_paga },
  ingreso_por_pagante: { dos_planes: M.evaluar(rec, s, 1000, { curva: 'media' }).por_cliente.ingreso_por_pagante, tres_planes: M.evaluar(tres, s, 1000, { curva: 'media' }).por_cliente.ingreso_por_pagante },
  gratuitos_que_sostiene_sin_anuncios: { dos_planes: M.evaluar(rec, s, 1000, { curva: 'media' }).gratuitos_que_sostiene_un_pagante_sin_anuncios, tres_planes: M.evaluar(tres, s, 1000, { curva: 'media' }).gratuitos_que_sostiene_un_pagante_sin_anuncios },
  rebasan_topes: { dos_planes: M.parteRebasa(rec, s), tres_planes: M.parteRebasa(tres, s) },
  se_paga_solo_baja: { dos_planes: M.nSePagaSolo(rec, s, 'baja'), tres_planes: M.nSePagaSolo(tres, s, 'baja') },
  bolsa_1000: { dos_planes: M.capacidadConBolsa(rec, s, 1000).restaurantes, tres_planes: M.capacidadConBolsa(tres, s, 1000).restaurantes },
  financiamiento_maximo: { dos_planes: M.proyectarEscenario('recomendado', rec, s, 36).financiamiento_maximo, tres_planes: M.proyectarEscenario('recomendado', tres, s, 36).financiamiento_maximo },
};
const estratos = ['centro', 'minimo', 'maximo'].map((k) => [k, M.coberturaEstratos(rec, s, k)]);
const estratosBaja = M.coberturaEstratos(rec, s, 'centro', 'baja');
const alternativas = [[5, 1], [6, 1], [6, 2], [8, 2], [10, 3]].map(([mesas, cuentas]) => { const c = { ...rec, topes: { ...rec.topes, gratuito: { ...rec.topes.gratuito, mesas, cuentas } } }; const e = M.coberturaEstratos(c, s, 'centro'); const m = M.evaluar(c, s, 1000, { curva: 'media' }); return { mesas, cuentas, dentro_0_5: e.dentro_0_5, cae_6_10: e.cae_en_master_6_10, pagantes: m.clientes.de_paga, margen_operacion: m.margen_operacion }; });
const res = M.resumen(rec, s, 1000);
const politicas = M.politicasDeHistorial(rec, s);
const cargaG = M.cargaGratuita(rec, s);
const msj = M.mensajes(rec, s);
const meta = M.meta12Meses(rec, s);
const chef = M.potencialChef(rec, s);
const tablero = M.palancasEnTablero(rec, s);
const costoPl = M.costoDePlatillo(rec, s);
const fpl = (N) => costoPl.filas.find((f) => f.platillos === N);
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
  cobertura_platillos: { tabla: s.cobertura_platillos, nota: 'DOS COTAS de sesgo opuesto; NO se sabe cuál es la cobertura real', por_tipo_baja: s.cobertura_platillos.por_tipo_baja },
  cobertura_chef_por_cota: { centro: cobChef, minimo_del_modelo_de_mesas: cobChefMin, topes: { mesas: rec.topes.gratuito.mesas, cuentas: rec.topes.gratuito.cuentas, platillos: rec.topes.gratuito.platillos } },
  opciones_tope_platillos: opcionesPlat,
  costo_de_platillo: costoPl,
  seguridad_chef: { con_dispersion: segC, topes: { mesas: rec.topes.gratuito.mesas, cuentas: rec.topes.gratuito.cuentas, platillos: rec.topes.gratuito.platillos }, sigma_mesas_por_cuenta: s.sigma_mesas_por_cuenta, rango_sigma: s.rangos.sigma_mesas_por_cuenta, nota: 'centro con sigma 0.5; mínimo y máximo sobre las 27 combinaciones (f, mesas por cuenta, sigma) del modelo' },
  definiciones: M.definiciones(s),
  meta_12_meses: meta,
  potencial_chef: chef,
  palancas_en_tablero: tablero,
  mensajes: M.mensajes(rec, s),
  desgloses: M.desgloses(rec, s, 1000),
  endutih_2024: s.endutih_2024,
  comparacion_con_tres_planes: comp,
  cobertura_por_estrato: { centro: estratos[0][1], minimo: estratos[1][1], maximo: estratos[2][1], con_cota_baja_de_platillos: estratosBaja, alternativas_de_topes: alternativas },
  precio_sensibilidad: sensP,
  umbrales: { se_paga_solo: rangos, bolsas: bolsasR, no_modelado: M.NO_MODELADO },
  extrapolacion: { n_desde_el_que_hace_falta_otra_arquitectura_curva_media: nArq } };
writeFileSync(join(salida_dir, '2026-11-14-modelo-de-escenarios-resultados.json'), JSON.stringify(resultados, null, 1));


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
const tcFila = (x) => `| **${pc(x.seguridad)}** | ${x.mesas} mesas · ${x.cuentas} cuentas · ${x.platillos} platillos | ${pc1(x.seguridad_real)} | ${pc(x.dentro_de_todos)} | ${n0(x.margen_al_precio_de_la_config)} |`;
const sensFilas = (sn, k = 8) => sn.filas.slice(0, k).map((f) => `| ${f.frase} | ${n0(f.efecto)} |`).join('\n');
const proyFila = (m) => `| ${m} | ${n0(mes(proy.media, m).restaurantes)} | ${n0(mes(proy.media, m).pagantes)} | ${sg(mes(proyPeor, m).margen_operacion)} | **${sg(mes(proy.media, m).margen_operacion)}** | ${sg(mes(proyMejor, m).margen_operacion)} | ${sg(mes(proyPiso, m).margen_operacion)} | ${mes(proy.media, m).escalon}${mes(proy.media, m).con_anuncios ? '' : ' (sin anuncios todavía)'} |`;
const cifra = (id) => res.cifras.find((f) => f.clave === id);
const mop = cifra('margen_de_operacion');
const mcap = cifra('margen_despues_de_captacion');
const mat = `| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |\n|---|---|---|---|\n${matriz.filas.map((f) => `| ${f.curva} | ${f.celdas.map((c) => sg(c.margen_operacion)).join(' | ')} |`).join('\n')}`;

const e1k = M.evaluar(rec, s, 1000, { curva: 'media' });
const e1kT = M.evaluar(tres, s, 1000, { curva: 'media' });
const pc1x = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US');
const cambia = (x, y, f = n0) => `${f(x)} (antes ${f(y)})`;
const md = `# Modelo de escenarios de Carta: dos planes (Chef y Master Chef), el peor caso real y qué hay que medir

**Fecha:** 17 de noviembre de 2026 (ronda 8, sobre la decisión de Calvin de dos planes) · **Rama:** \`agente/planes-precio-historial\` · **La v1 no cobra ni tiene planes.** Lo genera \`2026-11-14-corre-escenarios.mjs\` desde el modelo: ninguna cifra se transcribe a mano.

## Conclusiones

1. **Decisión de Calvin (17 de noviembre): dos planes, no tres.** «Quiero que Chef sea de 0 a 5 personas, … unas 6 mesas, … una sola cuenta … Chef Ejecutivo lo podemos dejar a una futura escalación.» **Chef (gratis) = ${cs.mesas} mesas y ${cs.cuentas} cuenta de personal; Master Chef (${rec.precios.servicio}) = todo lo que pase de ahí, hasta los topes técnicos (${rec.topes.servicio.mesas} mesas y ${rec.topes.servicio.cuentas} personas activas); Chef Ejecutivo queda apagado (no borrado).**
2. **Con el modelo de mesas y cuentas (supuesto; sólo los conteos por estrato son medidos), cabe en Chef el ${pc1(estratos[0][1].dentro_0_5)} de los negocios de 0 a 5 personas (rango ${pc1(estratos[1][1].dentro_0_5)}–${pc1(estratos[2][1].dentro_0_5)}); el ${pc1(estratos[0][1].cae_en_master_0_5)} cae en Master Chef porque querría más de una cuenta, y de los de 6 a 10 personas cae el ${pc1(estratos[0][1].cae_en_master_6_10)}.** Con la cota baja de platillos (sitios propios) cabe sólo el ${pc1(estratosBaja.dentro_0_5)}.
3. **Cifras de titular que cambian (1,000 restaurantes, curva media):** clientes de paga ${cambia(e1k.clientes.de_paga, e1kT.clientes.de_paga, n0)}; ingreso por cliente de paga ${cambia(e1k.por_cliente.ingreso_por_pagante, e1kT.por_cliente.ingreso_por_pagante, n0)} pesos (ya sin el plan de 1,099); parte que rebasa Chef ${cambia(M.parteRebasa(rec, s) * 100, M.parteRebasa(tres, s) * 100, pc1x)} %; **margen de operación al mes: recomendado ${cambia(comp.escenarios.recomendado.dos_planes, comp.escenarios.recomendado.tres_planes, sg)}, peor ${cambia(comp.escenarios.peor.dos_planes, comp.escenarios.peor.tres_planes, sg)}, mejor ${cambia(comp.escenarios.mejor.dos_planes, comp.escenarios.mejor.tres_planes, sg)}, piso de verdad ${cambia(comp.escenarios.piso_de_verdad.dos_planes, comp.escenarios.piso_de_verdad.tres_planes, sg)}.** La base es mucho más rica en pagantes **si** el supuesto de «una cuenta por negocio de 0 a 5 personas» se sostiene: lo mide el piloto.
4. **Una sola cuenta frente al ADR-017** (el dueño es el validador y el primer mesero): el plan gratuito es **operación de una persona con un PIN**; el dueño recibe y atiende las comandas en su propio teléfono, sin mesero aparte ni capitán.
5. **Peor caso real (todos gratuitos): con ${n0(b1000.bolsa)} pesos al mes de bolsa caben ${n0(b1000.centro.restaurantes)} restaurantes gratuitos (rango ${n0(b1000.minimo)} a ${n0(b1000.maximo)} según el soporte, sin fuente), con el canal de eventos construido; los anuncios pagan el sistema desde ${rg(rangos.baja)} restaurantes con la tarifa baja** (son rangos, no puntos). **Qué medir primero: ${sens.medir_primero.slice(0, 3).map((x) => x.supuesto).join(', ')}.**

**Supuesto de historial en TODAS las cifras de costo, bolsa, margen y escalón: la política VIGENTE (03 §7).** El plan gratuito conserva **${rec.topes.gratuito.meses_en_linea} meses de sesiones y ${rec.disco.meses_analitica_en_linea.gratuito} de analítica** (lo que dice 03 §7 para todos los planes; hoy nada purga). **Recortar el historial del gratuito a 30 días es una PROPUESTA, decisión pendiente de Calvin, que contradice 03 §7;** va al lado, rotulada:

| Historial del plan gratuito | Margen recomendado, 1,000 restaurantes | Peor | Mejor | Estrés | Gratuitos que sostiene un pagante (sin anuncios) | Mes 12 (300 restaurantes): margen de operación | Sueldo de 1 salario mínimo: restaurantes en régimen |
|---|---|---|---|---|---|---|---|
${politicas.map((x) => `| ${x.nombre} | ${sg(x.margen_operacion_1000.recomendado)} | ${sg(x.margen_operacion_1000.peor)} | ${sg(x.margen_operacion_1000.mejor)} | ${sg(x.margen_operacion_1000.piso_de_verdad)} | ${n0(x.gratuitos_que_sostiene_un_pagante_sin_anuncios)} | ${sg(x.mes_12_con_300_restaurantes.margen_operacion)} | ${n0(x.sueldo_de_1_salario_minimo.restaurantes_necesarios_en_regimen)} |`).join('\n')}

*Todo lo demás de este informe usa la primera fila.* La bolsa de ${n0(b1000.bolsa)} pesos carga ${n0(b1000.centro.restaurantes)} restaurantes con la política vigente.

${lineaDef}

**Qué cambió en la ronda 8 (API del \`.mjs\`, versión \`${M.VERSION}\`).** \`configInicial()\` pasa a **dos planes** (Chef ${cs.mesas} mesas · ${cs.cuentas} cuenta · ${cs.platillos} platillos; Master Chef ${rec.precios.servicio}; \`precios.salon = 0\`: Chef Ejecutivo apagado); la anterior es \`configTresPlanes25Mesas()\`. Nuevo: \`coberturaEstratos\`, \`desgloses\`, \`escalera\` dinámica en \`recursos(config, s, estado)\` (\`estado = {canal, meses_historial}\` y \`config.palancas\`; no modifica sus entradas). La rejilla de mesas y cuentas llega a 4 mesas y 1 cuenta.

---

## 1. Los dos planes, traducidos a topes

**Clientes potenciales = 104,882** (DENUE, mayo de 2026 [medido]): 0 a 5 personas **73,193** y 6 a 10 **17,855** (Chef antes: 91,048); 11 o más **13,834** (todos pasan a Master Chef). **Carta no sabe cuánta gente trabaja en un negocio**, así que la frontera de Calvin se traduce a topes con el modelo de mesas y cuentas (cuentas = ⌈f × personas⌉, f = 0.35 a 0.50; mesas = cuentas × m × exp(σ·z), m = 2.5 a 4, **σ = ${s.sigma_mesas_por_cuenta}, rango ${s.rangos.sigma_mesas_por_cuenta[0]} a ${s.rangos.sigma_mesas_por_cuenta[1]}: supuesto sin dato**). «Cuentas» = las que el negocio querría crear: con f ≥ 0.35 un negocio de 3 personas ya quiere 2. **Medido: sólo los conteos por estrato. El piloto debe medir mesas y cuentas por negocio.**

| Estrato | Dentro de Chef (${cs.mesas} mesas · ${cs.cuentas} cuenta): centro | Rango del modelo (mín – máx) | Cae en Master Chef |
|---|---|---|---|
| 0 a 5 personas | **${pc1(estratos[0][1].dentro_0_5)}** | ${pc1(estratos[1][1].dentro_0_5)} – ${pc1(estratos[2][1].dentro_0_5)} | ${pc1(estratos[0][1].cae_en_master_0_5)} |
| 6 a 10 personas | **${pc1(estratos[0][1].dentro_6_10)}** | ${pc1(estratos[1][1].dentro_6_10)} – ${pc1(estratos[2][1].dentro_6_10)} | ${pc1(estratos[0][1].cae_en_master_6_10)} |

(con 150 platillos y la cota alta, ${pc1(estratos[0][1].platillos)} de cobertura de platillos ya incluida; con la cota baja, 0 a 5 personas dentro: ${pc1(estratosBaja.dentro_0_5)}).

**Alternativas de topes para el gratuito** (centro; margen recomendado con 1,000 restaurantes):

| Mesas · cuentas | Negocios de 0 a 5 personas dentro | Negocios de 6 a 10 personas que caen en Master Chef | Pagantes por 1,000 | Margen de operación |
|---|---|---|---|---|
${alternativas.map((x) => `| ${x.mesas} · ${x.cuentas}${x.mesas === cs.mesas && x.cuentas === cs.cuentas ? ' **(decidido)**' : x.mesas === 5 ? ' (alternativa de 5 mesas)' : ''} | ${pc1(x.dentro_0_5)} | ${pc1(x.cae_6_10)} | ${n1(x.pagantes)} | ${sg(x.margen_operacion)} |`).join('\n')}

**Cobertura por platillos: DOS COTAS de sesgo opuesto (SUPUESTO; no se sabe la real).** Con 150 platillos contando todo: **${pc(s.cobertura_platillos.baja.todo.find((x) => x[0] === 150)[1])} (sitios propios, cota baja; 56 cartas) a ${pc(s.cobertura_platillos.alta.todo.find((x) => x[0] === 150)[1])} (reparto, cota alta; en esa muestra sólo 40 a 120 están medidos y el 150 es extrapolación)**; dentro de 150, por tipo: fondas y taquerías ${coberturaTipo('taqueria_fonda')}, cafeterías ${coberturaTipo('cafeteria')}, casuales ${coberturaTipo('casual')}, formales ${coberturaTipo('formal')}. Las dos muestras no cuentan «platillo» con la misma regla (148 cartas de reparto: cortas; sitios propios: largas y formales).

### Tope de platillos del plan Chef: «cuenta todo» DECIDIDO; el VALOR del tope REABIERTO (17 de noviembre de 2026)

**Decisión de Calvin:** «el tope de platillos incluye bebidas… considera que cuenta todo, bebidas incluidas». **Después la reabrió:** «según yo no quedamos en 150, se me hace demasiado. Quisiera saber si el tema de platillos mueve mucho nuestras gráficas». Lo que cuesta cada platillo, medido y supuesto, está en \`2026-11-17-costo-de-platillo.md\`. **${costoPl.conclusion}**

| Tope (cuenta todo) | Caben, cota baja (sitios propios) | Caben, cota alta (reparto) | De 0 a 5 personas dentro de Chef (baja a alta) | De paga por cada 1,000 | Restaurantes con foto que caben en R2 gratis |
|---|---|---|---|---|---|
${costoPl.filas.map((f) => `| ${f.platillos} | ${pc(f.cobertura_de_platillos.baja)} | ${pc(f.cobertura_de_platillos.alta)} | ${pc1(f.cobertura_de_0_a_5_dentro_de_chef.baja)} a ${pc1(f.cobertura_de_0_a_5_dentro_de_chef.alta)} | ${n0(f.clientes_de_paga_por_1000_por_el_tope)} | ${n0(f.fotos_en_r2.restaurantes_que_caben_en_lo_gratis)} (rango ${n0(f.fotos_en_r2.rango_restaurantes[0])} a ${n0(f.fotos_en_r2.rango_restaurantes[1])}) |`).join('\n')}

*Bajar el tope no ahorra disco ni procesador de forma apreciable: lo que mueve es cuántos negocios pagan (cobertura) y el peso de las fotos en R2. El valor del tope queda a decisión de Calvin.*

**Alternativas descartadas el 17 de noviembre de 2026** (sólo comida, 200, 300, sin tope; quedan como referencia, no como opciones abiertas). Menos cobertura = más gente obligada a pagar: el margen «sube» a costa de cobrar a quien debía ser gratis y de que acepten pagar (supuesto).

| Alternativa descartada | Dentro de Chef (0 a 5 personas), cota baja | Dentro de Chef (0 a 5 personas), cota alta | Margen con la cota baja | Margen con la cota alta |
|---|---|---|---|---|
${opcionesPlat.filter((o) => o.id !== 'actual').map((o) => { const c = { ...rec, topes: { ...rec.topes, gratuito: { ...rec.topes.gratuito, platillos: o.tope ?? Infinity, platillos_cuenta: o.cuenta } } }; return `| ${o.nombre} | ${pc1(M.coberturaEstratos(c, s, 'centro', 'baja').dentro_0_5)} | ${pc1(M.coberturaEstratos(c, s, 'centro', 'alta').dentro_0_5)} | ${sg(o.por_cota.baja.margen_operacion)} | ${sg(o.por_cota.alta.margen_operacion)} |`; }).join('\n')}

*«No se sabe la cobertura real»: el dato que sigue pendiente es la carta real de los negocios del piloto, contada con la instrucción de conteo de la muestra.*

## 2. Precio: Master Chef pegado a Meniu

**225 es una decisión de posicionamiento de Calvin (quedar pegado a Meniu Business), no un resultado del modelo**: la curva «media» se construyó con mediana 225 y por eso el óptimo sale cerca (${precios.media.precio}). Ver [precio de entrada](2026-11-14-precio-de-entrada.md). **Chef Ejecutivo queda apagado** (futura escalación: precio y topes en \`configTresPlanes25Mesas()\`).

Cada precio con tres curvas (pesimista · media · optimista), **1,000 restaurantes registrados**. «Sin pérdidas» = margen de operación **y** después de captación ≥ 0 (con anuncios en marcha · sin anuncios todavía).

| Master Chef | Pagantes de Master Chef | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
${ep.servicio.map(filaPrecio).join('\n')}

**Lectura.** (1) **Master Chef: 199 a 299 cambia los pagantes** (de ${n0(prS(199).por_curva.media.pagantes)} a ${n0(prS(299).por_curva.media.pagantes)} con la curva media) **y el margen** (de ${sg(prS(199).por_curva.media.margen_operacion)} a ${sg(prS(299).por_curva.media.margen_operacion)}): con la base de dos planes el precio pesa más que antes, porque ya no hay plan de 1,099 que lo diluya. (2) **Sin anuncios, con la curva pesimista y 1,000 restaurantes**, a 225 el margen es ${sg(prS(225).por_curva.pesimista.margen_operacion_sin_anuncios)} al mes: ese periodo lo paga Calvin.

## 2b. La meta de 300 restaurantes a 12 meses, en dinero

Meta supuesta: **${meta.meta_restaurantes} restaurantes a 12 meses** (adopción supuesta). Pesos al mes del mes 12 y acumulado de los 12 meses; peor = sin anuncios en ningún mes.

| | Recomendado | Peor | Mejor |
|---|---|---|---|
| De paga en el mes 12 | ${['recomendado', 'peor', 'mejor'].map((k) => n0(meta.escenarios[k].mes_12.de_paga)).join(' | ')} |
| Ingreso por suscripción, mes 12 | ${['recomendado', 'peor', 'mejor'].map((k) => n0(meta.escenarios[k].mes_12.ingreso_suscripcion)).join(' | ')} |
| Ingreso por anuncios, mes 12 | ${['recomendado', 'peor', 'mejor'].map((k) => n0(meta.escenarios[k].mes_12.ingreso_anuncios)).join(' | ')} |
| **Ingresos, mes 12** | ${['recomendado', 'peor', 'mejor'].map((k) => `**${n0(meta.escenarios[k].mes_12.ingresos)}**`).join(' | ')} |
| Costos, mes 12 (servidor · almacenamiento · soporte · comisión) | ${['recomendado', 'peor', 'mejor'].map((k) => { const c = meta.escenarios[k].mes_12.costos; return `${n0(c.total)} (${n0(c.servidor)} · ${n0(c.almacenamiento)} · ${n0(c.soporte)} · ${n0(c.comision)})`; }).join(' | ')} |
| **Margen de operación, mes 12** | ${['recomendado', 'peor', 'mejor'].map((k) => `**${sg(meta.escenarios[k].mes_12.margen_operacion)}**`).join(' | ')} |
| Margen después de captación, mes 12 | ${['recomendado', 'peor', 'mejor'].map((k) => sg(meta.escenarios[k].mes_12.margen_despues_de_captacion)).join(' | ')} |
| **Acumulado de 12 meses: ingresos** | ${['recomendado', 'peor', 'mejor'].map((k) => n0(meta.escenarios[k].acumulado_12_meses.ingresos)).join(' | ')} |
| Acumulado de 12 meses: costos | ${['recomendado', 'peor', 'mejor'].map((k) => n0(meta.escenarios[k].acumulado_12_meses.costos.total)).join(' | ')} |
| **Acumulado de 12 meses: margen de operación** | ${['recomendado', 'peor', 'mejor'].map((k) => sg(meta.escenarios[k].acumulado_12_meses.margen_operacion)).join(' | ')} |
| Acumulado de 12 meses: margen después de captación | ${['recomendado', 'peor', 'mejor'].map((k) => sg(meta.escenarios[k].acumulado_12_meses.margen_despues_de_captacion)).join(' | ')} |

## 2c. El potencial del plan Chef, en dinero (techo teórico)

**Si todos los negocios que caerían en Chef estuvieran en Carta**, dejarían en anuncios al mes (no todos estarían; es un techo): **${n0(chef.negocios_en_chef)} negocios en Chef** (de ${n0(chef.universo)} clientes potenciales) → **${n0(chef.potencial_anuncios_mes.baja.pesos_al_mes_de_todos_los_chef)} pesos con la tarifa baja, ${n0(chef.potencial_anuncios_mes.media.pesos_al_mes_de_todos_los_chef)} con la media y ${n0(chef.potencial_anuncios_mes.alta.pesos_al_mes_de_todos_los_chef)} con la alta** (${n1(chef.potencial_anuncios_mes.baja.pesos_por_negocio_al_mes)} · ${n1(chef.potencial_anuncios_mes.media.pesos_por_negocio_al_mes)} · ${n1(chef.potencial_anuncios_mes.alta.pesos_por_negocio_al_mes)} pesos por negocio al mes). Rango por visitas con la app y parte con anuncio dentro de sus rangos: ${n0(chef.potencial_anuncios_mes.baja.rango_por_visitas_y_parte[0])} a ${n0(chef.potencial_anuncios_mes.alta.rango_por_visitas_y_parte[1])}. **Supuestos:** ${chef.supuestos}.

| Tramo de tamaño (personas) | Negocios [medido] | En Chef (modelo) | En Master Chef | Negocios en Chef | Anuncios al mes con la tarifa baja |
|---|---|---|---|---|---|
${chef.tramos.map((x) => `| ${x.tramo} | ${n0(x.negocios)} | ${pc1(x.parte_en_chef)} | ${pc1(x.parte_en_master_chef)} | ${n0(x.negocios_en_chef)} | ${n0(x.negocios_en_chef * chef.potencial_anuncios_mes.baja.pesos_por_negocio_al_mes)} |`).join('\n')}

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

**La bolsa de Calvin, como rango** (restaurantes gratuitos que caben con la carga de sus topes: ${n0(cargaG.visitas_mes)} visitas al mes cada uno, la misma definición que usa «¿Qué nos limita?», según el soporte por gratuito):

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

## 8. Dos mensajes y un dato de contexto

- **Dónde está el valor** (calculado): ${msj.valor.frase} *Advertencia: ${msj.valor.advertencia}*
- **Qué significa el precio** (calculado): ${msj.precio.frase}
- **A dónde se va cada 100 pesos** (${msj.margen.nombre}): ${msj.margen.frase}

| De cada 100 pesos que entran | Recomendado | Peor | Mejor | Piso de verdad |
|---|---|---|---|---|
${['servidor', 'almacenamiento', 'soporte', 'comision', 'margen'].map((k) => `| ${k === 'comision' ? 'comisión de cobro' : k} | ${['recomendado', 'peor', 'mejor', 'piso_de_verdad'].map((e) => n1(msj.margen.por_escenario[e].por_cada_100[k])).join(' | ')} |`).join('\n')}

- **Internet y celular en México** (ENDUTIH 2024, INEGI, 6 de mayo de 2025, págs. 3, 6 y 17 del [reporte](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/endutih/ENDUTIH_24_RR.pdf), consultado el 17 de noviembre de 2026): **${s.endutih_2024.usuarios_internet_millones} millones de usuarios de internet (${pc1(s.endutih_2024.usuarios_internet_parte)} de la población de 6 años o más); ${pc1(s.endutih_2024.por_equipo_de_conexion.celular_inteligente)} de ellos se conectó con un celular inteligente** (otros equipos, respuestas múltiples: televisor ${pc1(s.endutih_2024.por_equipo_de_conexion.televisor_inteligente)}, computadora ${pc1(s.endutih_2024.por_equipo_de_conexion.computadora)}, consola ${pc1(s.endutih_2024.por_equipo_de_conexion.consola)}). **Tipo de conexión sólo existe para usuarios de celular inteligente:** ambas ${pc1(s.endutih_2024.tipo_de_conexion_de_usuarios_de_celular_inteligente.ambos)}, sólo wifi ${pc1(s.endutih_2024.tipo_de_conexion_de_usuarios_de_celular_inteligente.solo_wifi)}, sólo datos móviles ${pc1(s.endutih_2024.tipo_de_conexion_de_usuarios_de_celular_inteligente.solo_datos_moviles)}. Es la edición más reciente que pude leer (no verifiqué una edición 2025).

## 9. Límites (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente.** Los umbrales de anuncios dependen de la tarifa, la parte de visitas con anuncio y el soporte por gratuito, sin dato.
- **Los topes de mesas y cuentas son un modelo:** medido sólo el conteo por estrato; el piloto debe medir mesas y cuentas por negocio.
- **El dato de comensales por restaurante es simulado**; los muros salen de un simulador, no de una prueba de carga (±2×).
- **Ingresos de anuncios sin modelar:** ${M.NO_MODELADO.join('; ')}.
- **Pruebas:** \`node 2026-11-14-pruebas.mjs\` fija con tolerancia estrecha las cifras de titular y prueba que ningún escenario «sin anuncios» tenga ingresos por anuncios.
`;
writeFileSync(join(salida_dir, '2026-11-14-modelo-de-escenarios.md'), md);

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
writeFileSync(join(salida_dir, '2026-11-14-chequeo-de-margenes.md'), chequeoMd);

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

## 4. Si algún día se enciende Chef Ejecutivo
Un negocio de 101 a 250 personas tiene unas 36 a 125 cuentas de personal en el modelo y el tope técnico es de **50 cuentas activas por restaurante** (T-1.6): habría que subirlo antes de vender ese plan (cambio de código, no de este informe). Hoy está apagado por decisión de Calvin (17-nov).

## 5. Datos por conseguir
- La curva de pago real (prueba de precio del piloto, tres grupos).
- Si los que entraron más barato se van más al subir (mismo grupo medido a los 6 meses).
- Los artículos originales de Kanuri y Andrews y de Datta, Foubert y Van Heerde.
`;
function precios_pagantes() { return [199, 225, 249].map((p) => `${p}: ${n0(prS(p).por_curva.media.pagantes)}`).join(' · '); }
writeFileSync(join(salida_dir, '2026-11-14-precio-de-entrada.md'), entrada);

// ------------------------------------------------------------------ recomendaciones
const R = [
  { id: 'dos_planes', decision: 'Dos planes: Chef (gratis, 0 a 5 personas) y Master Chef (DECIDIDA por Calvin el 17-nov)',
    recomendacion: `**Chef = ${cs.mesas} mesas y ${cs.cuentas} cuenta de personal (una sola persona con PIN); Master Chef ${rec.precios.servicio} = todo lo que pase de ahí, hasta los topes técnicos (${rec.topes.servicio.mesas} mesas y ${rec.topes.servicio.cuentas} personas activas); Chef Ejecutivo apagado.** Con el modelo de mesas y cuentas cabe en Chef el ${pc1(estratos[0][1].dentro_0_5)} de los negocios de 0 a 5 personas (rango ${pc1(estratos[1][1].dentro_0_5)}–${pc1(estratos[2][1].dentro_0_5)}) y ninguno de 6 a 10.`,
    depende: `**Del modelo de mesas y cuentas y de su dispersión (σ = ${s.sigma_mesas_por_cuenta}, supuesto sin dato): «cuentas» = las que el negocio querría crear.** Si una fonda de 4 personas se arregla con una sola cuenta, cabría más que el ${pc1(estratos[0][1].dentro_0_5)}; con la alternativa de 2 cuentas cabría el ${pc1(alternativas.find((x) => x.mesas === 6 && x.cuentas === 2).dentro_0_5)}. **Sobre el ADR-017:** el dueño es el validador y el primer mesero; con una cuenta, el plan gratuito es operación de una sola persona con PIN.`,
    cifras: `Frente a tres planes (1,000 restaurantes, curva media): pagantes ${n0(comp.pagantes_por_1000.dos_planes)} (antes ${n0(comp.pagantes_por_1000.tres_planes)}); margen recomendado ${sg(comp.escenarios.recomendado.dos_planes)} (antes ${sg(comp.escenarios.recomendado.tres_planes)}); peor ${sg(comp.escenarios.peor.dos_planes)} (antes ${sg(comp.escenarios.peor.tres_planes)}).`,
    alternativas: alternativas.map((x) => ({ opcion: `${x.mesas} mesas · ${x.cuentas} ${x.cuentas === 1 ? 'cuenta' : 'cuentas'}`, pros: `${pc1(x.dentro_0_5)} de 0 a 5 personas dentro; margen ${sg(x.margen_operacion)}`, contras: `${pc1(x.cae_6_10)} de 6 a 10 personas cae en Master Chef` })),
    ejemplo: 'Una fonda de 2 personas y 4 mesas cabe en Chef (una cuenta); una taquería de 5 personas que quiere cuenta para el mesero y para el cocinero ya necesita Master Chef.',
    prueba: 'Mesas y cuentas por negocio en los primeros 10 a 20 restaurantes (`mesa` y `personal_restaurante` activos al alta, sin datos personales) y cuántos de 0 a 5 personas se arreglan con una cuenta.' },
  { id: 'tope_platillos', decision: 'Tope de platillos del plan Chef (cuenta todo, bebidas incluidas, decidido el 17-nov; el VALOR del tope, REABIERTO por Calvin el mismo día)',
    recomendacion: `**El tope cuenta TODO, bebidas incluidas (decisión de Calvin, 17 de noviembre de 2026); su valor (hoy ${cs.platillos}) quedó REABIERTO** («se me hace demasiado»): de 50 a 150 el disco casi no se mueve (${(Math.abs(costoPl.efecto_de_subir_el_tope.disco_con_avisos)*100).toFixed(1)} %) y el procesador tampoco se acaba; cambia la cobertura y los de paga (ver \`2026-11-17-costo-de-platillo.md\`). La banda de dos cotas se conserva porque no se sabe cuál muestra tiene razón: con 150 platillos caben ${pc(s.cobertura_platillos.baja.todo.find((x) => x[0] === 150)[1])} de las cartas de sitios propios (56; largas y formales) y ${pc(s.cobertura_platillos.alta.todo.find((x) => x[0] === 150)[1])} de las de reparto (148; cortas, sin bebidas; el 150 es extrapolación). Dentro de 150: fondas y taquerías ${coberturaTipo('taqueria_fonda')}, cafeterías ${coberturaTipo('cafeteria')}, formales ${coberturaTipo('formal')}.`,
    depende: '**De cómo se cuente «platillo»** (las dos muestras no usan la misma regla) y **de quién sea el negocio**. **Si falla:** con una cobertura baja se cobra a negocios que debían ser gratis; con una alta, se regalan negocios que podrían pagar.',
    cifras: `Alternativas descartadas el 17 de noviembre: ${opcionesPlat.filter((o) => o.id !== 'actual').map((o) => `${o.nombre}: dentro de Chef de 0 a 5 personas ${pc1(M.coberturaEstratos({ ...rec, topes: { ...rec.topes, gratuito: { ...rec.topes.gratuito, platillos: o.tope ?? Infinity, platillos_cuenta: o.cuenta } } }, s, 'centro', 'baja').dentro_0_5)} (cota baja)`).join(' · ')}.`,
    alternativas: opcionesPlat.filter((o) => o.id !== 'actual').map((o) => ({ opcion: `${o.nombre} (descartada el 17-nov)`, pros: o.id === 'sin_tope' ? 'Cobertura sólo por mesas y cuentas' : o.id === 'solo_comida' ? 'Casi no deja a nadie afuera' : 'Más cobertura con la cota baja', contras: o.id === 'sin_tope' ? 'Sin freno para cartas enormes' : o.id === 'solo_comida' ? 'Hay que clasificar comida y bebida' : 'Sigue dependiendo de una muestra sesgada' })),
    ejemplo: 'Una cafetería con 120 platillos (comida y bebidas) cabe en un tope de 150; una cena formal con 276 (la mediana de los formales de la muestra) no cabe.',
    prueba: 'Pendiente: la carta real de los negocios del piloto, contada con la instrucción de conteo de la muestra (comida y bebidas por separado) y la plataforma por la que llegaron.' },
  { id: 'precios', decision: 'Precio de Master Chef',
    recomendacion: `**Master Chef 225 es una decisión de posicionamiento de Calvin (pegado a Meniu Business), no un resultado del modelo.** El modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba de tres precios del piloto. Chef Ejecutivo queda apagado (futura escalación).`,
    depende: `**De la curva de pago (supuesto).** Con la mediana en ${sensP.por_mediana[0].mediana} gana ${sensP.por_mediana[0].precio_ganador}; en 225, ${sensP.por_mediana[1].precio_ganador}; en ${sensP.por_mediana[2].mediana}, ${sensP.por_mediana[2].precio_ganador}; en ${sensP.por_mediana[3].mediana}, ${sensP.por_mediana[3].precio_ganador}. Ver [precio de entrada](2026-11-14-precio-de-entrada.md). **Si falla:** si los dueños pagan lo de un menú QR (157), 225 pierde clientes; si pagan lo de un POS (652), 225 deja dinero sobre la mesa.`,
    cifras: `Master Chef 199 / 225 / 249 / 299: pagantes (media) ${[199, 225, 249, 299].map((p) => n0(prS(p).por_curva.media.pagantes)).join(' / ')}; margen de operación (media) ${[199, 225, 249, 299].map((p) => n0(prS(p).por_curva.media.margen_operacion)).join(' / ')}.`,
    alternativas: [{ opcion: '199', pros: 'Más pagantes', contras: 'Debajo de Meniu' }, { opcion: '225 (decisión de posicionamiento)', pros: 'Pegado a Meniu', contras: 'Sin colchón si el soporte cuesta más' }, { opcion: '249', pros: 'Mismo margen que 225 con la curva supuesta', contras: 'Un poco arriba de Meniu' }, { opcion: '299', pros: 'Más margen por pagante', contras: `Menos pagantes (${n0(prS(299).por_curva.media.pagantes)} contra ${n0(prS(225).por_curva.media.pagantes)})` }],
    ejemplo: 'Un restaurante de 25 mesas (ingreso medio 737,584 al mes [INEGI, promedio]): 225 son 0.03 % de su ingreso.',
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
    cifras: `Bolsa ${bolsasR.map((b) => n0(b.bolsa)).join(' / ')} → ${bolsasR.map((b) => `${n0(b.centro.restaurantes)} (${n0(b.minimo)}–${n0(b.maximo)})`).join(' / ')} restaurantes gratuitos (con la carga de sus topes; sólo gratuitos, sin la mezcla de paga que usa «¿Qué nos limita?»: ${n0(res.cifras.find((f) => f.clave === 'restaurantes_que_caben').recomendado)} registrados con avisos).`,
    alternativas: bolsasR.map((b) => ({ opcion: `${n0(b.bolsa)} pesos al mes`, pros: `${n0(b.centro.restaurantes)} restaurantes y ${comensalesMillones(b.centro.comensales_mes)} M de comensales`, contras: `rango ${n0(b.minimo)}–${n0(b.maximo)} según el soporte` })),
    ejemplo: `Con ${n0(b1000.bolsa)} pesos al mes pagas servidor y soporte básico de ≈ ${n0(b1000.centro.restaurantes)} fondas y taquerías gratuitas.`,
    prueba: 'El costo real de Railway del primer mes con restaurantes del piloto y los minutos reales de soporte.' },
  { id: 'historial', decision: 'Historial: meses en línea y archivo descargable',
    recomendacion: '**12 meses en línea para la paga (decidido por Calvin). Para el gratuito, la política vigente es la de 03 §7 (24 meses de sesiones y 13 de analítica); recortarlo a 30 días, con archivo descargable de lo anterior, es una PROPUESTA pendiente de decisión de Calvin.**',
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
writeFileSync(join(salida_dir, '2026-11-14-recomendaciones.json'), JSON.stringify({ version: M.VERSION, decisiones: R, configuraciones: { segmentacion_de_calvin: { nombre: 'Segmentación de Calvin (configInicial)', config: rec }, topes_10_mesas_3_cuentas: { nombre: 'Topes 10 mesas / 3 cuentas (la anterior)', config: antes } }, tabla_cupo_gratis: tc }, null, 1));
let r = `# Recomendaciones: ocho decisiones con su supuesto, sus alternativas y la prueba que las cierra

**Fecha:** 14 de noviembre de 2026 (ronda 4; apoyado en el [modelo](2026-11-14-modelo-de-escenarios.md)) · **Generado por \`2026-11-14-corre-escenarios.mjs\`** · [JSON](2026-11-14-recomendaciones.json).

## Conclusiones

1. **Dos planes (decisión de Calvin, 17-nov): Chef gratis con ${cs.mesas} mesas y ${cs.cuentas} cuenta; Master Chef ${rec.precios.servicio} para todo lo demás; Chef Ejecutivo apagado.** Con el modelo cabe el ${pc1(estratos[0][1].dentro_0_5)} de los negocios de 0 a 5 personas (${pc1(estratos[1][1].dentro_0_5)}–${pc1(estratos[2][1].dentro_0_5)}) y ninguno de 6 a 10; el tope de platillos **cuenta todo, bebidas incluidas** (decidido el 17-nov; decisión 2).
2. **Master Chef 225 es una decisión de posicionamiento de Calvin, no un resultado del modelo;** el modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba del piloto. Margen de operación con 1,000 restaurantes: ${sg(mop.recomendado)} recomendado, ${sg(mop.peor)} peor, ${sg(mop.mejor)} mejor, ${sg(mop.piso_de_verdad)} piso de verdad.
3. **Los anuncios llegan hacia el mes ${s.mes_inicio_anuncios} (supuesto); mientras tanto, ${n0(b1000.bolsa)} pesos al mes cargan ${n0(b1000.centro.restaurantes)} restaurantes gratuitos (rango ${n0(b1000.minimo)}–${n0(b1000.maximo)}), con el canal de eventos construido.**
4. **Lo que más cambia el resultado: ${sens.medir_primero.slice(0, 3).map((x) => x.supuesto).join(', ')}.** Se miden en el piloto.
5. **Historial de 12 meses para la paga (decidido): casi no mueve el margen.**

${lineaDef}

`;
R.forEach((d, i) => {
  r += `\n## ${i + 1}. ${d.decision}\n\n**Recomendación.** ${d.recomendacion}\n\n**De qué supuesto depende y qué pasa si falla.** ${d.depende}\n\n**Cifras del modelo.** ${d.cifras}\n\n| Opción | A favor | En contra |\n|---|---|---|\n${d.alternativas.map((a) => `| ${a.opcion} | ${a.pros} | ${a.contras} |`).join('\n')}\n\n**Ejemplo.** ${d.ejemplo}\n\n**La prueba o el dato que la cierra.** ${d.prueba}\n\n---\n`;
});
r += `\n## 8. Datos por conseguir (resumen)\n\nCurva de pago real · mesas, cuentas y platillos por negocio (para acotar el modelo y σ) · bajas y costo de conseguir un cliente (**sin dato**) · tarifa de anuncios, parte de visitas con anuncio, tasa de llenado y aprobación de la red · soporte por cliente (gratuito y de paga) · comensales por restaurante real · eventos por visita · costo real de Railway con el sondeo de hoy.\n`;
writeFileSync(join(salida_dir, '2026-11-14-recomendaciones.md'), r);
console.log('ok. topes optimizador:', mejor.mesas, mejor.cuentas, mejor.platillos, 'seguridad', mejor.seguridad_chico.toFixed(3), 'nArq', nArq, 'bolsa1000', b1000.centro.restaurantes, 'rangos', JSON.stringify({ b: rangos.baja.centro, a: rangos.adverso.centro, m: rangos.medio.centro }));
