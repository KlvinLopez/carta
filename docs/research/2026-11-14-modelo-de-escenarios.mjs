// Modelo de escenarios de Carta (2026-11-14, revisado el mismo día). Módulo ES sin dependencias, funciones puras.
// Corre igual en `node` y en el navegador: no usa fs, process, window ni fetch.
// Todo parámetro entra por `supuestos` (use `valores(parametros.json)`), con su origen y rango en
// 2026-11-14-parametros.json. Moneda: pesos mexicanos, antes de IVA salvo que se diga lo contrario.
//
// Honestidad del modelo:
//  · La curva «cuántos pagan a qué precio» es SUPUESTO (no hay dato de disposición a pagar); el precio óptimo
//    es función directa de su mediana, sigma y techo. La sustituye la prueba del piloto.
//  · El plan gratuito LLEVA anuncios (decidido por Calvin). Lo que varía es CUÁNDO llegan (`mes_inicio_anuncios`: no antes
//    de construirlos y de que la red apruebe el sitio) y CUÁNTO dejan (tarifa y parte de visitas con anuncio: supuestos).
//    Mientras no hay anuncios, el costo lo pone Calvin (`todosGratuitos`).
//  · Los topes del plan gratuito son consecuencia de `restriccion_seguridad_chico` (con qué seguridad un negocio de hasta
//    10 personas queda dentro del gratuito), no un óptimo; mesas y cuentas son un MODELO, no estadística.
//  · Más allá de la capacidad medida (cap_conexiones gratuitos típicos) todo costo es EXTRAPOLACIÓN sin medir.

export const VERSION = '2026-11-17-r13';

// ---------------------------------------------------------------- utilidades
/** Aplana el JSON de parámetros {parametros:{clave:{valor}}} a {clave: valor}; `sobre` sustituye valores. */
export function valores(par, sobre = {}) {
  const out = {};
  const rangos = {};
  for (const [k, v] of Object.entries(par.parametros)) {
    out[k] = v.valor;
    if (typeof v.min === 'number' && typeof v.max === 'number') rangos[k] = [v.min, v.max];
  }
  return { ...out, rangos, ...sobre };
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const suma = (a) => a.reduce((s, x) => s + x, 0);

/** Interpolación lineal en ln(x) sobre una tabla [[x, y], ...] ordenada; se queda en los extremos. */
export function interp(tabla, x) {
  if (x <= tabla[0][0]) return tabla[0][1];
  const u = tabla[tabla.length - 1];
  if (x >= u[0]) return u[1];
  for (let i = 1; i < tabla.length; i++) {
    const [x1, y1] = tabla[i];
    const [x0, y0] = tabla[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (Math.log(x) - Math.log(x0))) / (Math.log(x1) - Math.log(x0));
  }
  return u[1];
}

/** Función de distribución normal estándar (aproximación de Abramowitz-Stegun 7.1.26). */
export function phi(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

// ---------------------------------------------------------------- configuración
/**
 * Configuración inicial = DOS PLANES (decisión de Calvin, 17 de noviembre de 2026): **Chef** (gratis) = negocios de 0 a 5 personas, con
 * 6 mesas y UNA cuenta de personal (el dueño con su PIN); **Master Chef** (225) = todo lo que pase de ahí, hasta los topes técnicos del
 * producto (500 mesas activas, 50 personas activas). **Chef Ejecutivo queda APAGADO** (`precios.salon = 0` y `planes.chef_ejecutivo.activo
 * = false`): es una futura escalación, no se borró. El tope de 150 platillos cuenta TODO, bebidas incluidas (decidido por Calvin el 17-nov); la banda de dos cotas de cobertura se conserva porque no se sabe cuál muestra tiene razón.
 * Los anuncios van en Chef; empiezan en `supuestos.mes_inicio_anuncios`. `configBase` es alias de esta función. La configuración anterior
 * de tres planes se conserva como `configTresPlanes25Mesas()` y la de la primera ronda como `configTopes10Mesas3Cuentas()`.
 */
export function configInicial() {
  return {
    nombre: 'dos planes: Chef y Master Chef',
    precios: { servicio: 225, salon: 0 },
    planes: { chef_ejecutivo: { activo: false, nota: 'futura escalación: precio y topes de configTresPlanes25Mesas()' } },
    topes: {
      gratuito: { platillos: 150, platillos_cuenta: 'todo', mesas: 6, cuentas: 1, lecturas_pdf: 3, meses_en_linea: 1 }, // el tope de 150 cuenta TODO, bebidas incluidas (decisión de Calvin, 17-nov)
      servicio: { platillos: 300, mesas: 500, cuentas: 50, lecturas_pdf_mes: 10, meses_en_linea: 12 },
      salon: { platillos: 300, mesas: 500, cuentas: 150, lecturas_pdf_mes: 20, meses_en_linea: 12 },
    },
    disco: { meses_analitica_en_linea: { gratuito: 1, servicio: 1, salon: 1 }, archivar: true },
    anuncios: { activo: true, tarifa: 'baja' }, // el plan gratuito lleva anuncios; llegan en s.mes_inicio_anuncios
    curva: 'media',
    competencia: { sustituto: 'Meniu Business', k: 1.0 }, // sólo para la sugerencia de precio
  };
}

/** La configuración de tres planes de las rondas 4 a 7 (Chef 25 mesas · 4 cuentas · 150 platillos; Master Chef 225; Chef Ejecutivo 1,099). */
export function configTresPlanes25Mesas() {
  return {
    nombre: 'tres planes: Chef 25 mesas',
    precios: { servicio: 225, salon: 1099 },
    planes: { chef_ejecutivo: { activo: true } },
    topes: {
      gratuito: { platillos: 150, mesas: 25, cuentas: 4, lecturas_pdf: 3, meses_en_linea: 1 },
      servicio: { platillos: 300, mesas: 100, cuentas: 30, lecturas_pdf_mes: 10, meses_en_linea: 12 },
      salon: { platillos: 300, mesas: 500, cuentas: 150, lecturas_pdf_mes: 20, meses_en_linea: 12 },
    },
    disco: { meses_analitica_en_linea: { gratuito: 1, servicio: 1, salon: 1 }, archivar: true },
    anuncios: { activo: true, tarifa: 'baja' },
    curva: 'media',
    competencia: { sustituto: 'Meniu Business', k: 1.0 },
  };
}

export const configBase = configInicial;

/** La configuración de la ronda anterior (10 mesas, 3 cuentas, Master Chef 299, Chef Ejecutivo 499), con nombre. */
export function configTopes10Mesas3Cuentas() {
  return {
    nombre: 'topes 10 mesas / 3 cuentas',
    precios: { servicio: 299, salon: 499 },
    topes: {
      gratuito: { platillos: 80, mesas: 10, cuentas: 3, lecturas_pdf: 3, meses_en_linea: 1 },
      servicio: { platillos: 300, mesas: 40, cuentas: 20, lecturas_pdf_mes: 10, meses_en_linea: 12 },
      salon: { platillos: 300, mesas: 100, cuentas: 50, lecturas_pdf_mes: 20, meses_en_linea: 12 },
    },
    disco: { meses_analitica_en_linea: { gratuito: 1, servicio: 1, salon: 1 }, archivar: true },
    anuncios: { activo: true, tarifa: 'baja' },
    curva: 'media',
    competencia: { sustituto: 'Fudo Avanzado', k: 0.5 },
  };
}

// ---------------------------------------------------------------- costos por cliente
/** Comisión de tarjeta por cliente de paga: se cobra sobre lo que paga el cliente, con IVA. */
export function comisionTarjeta(precio, s) {
  return (s.comision_pct * precio * (1 + s.iva) + s.comision_fija) * (1 + s.iva) * s.pago_con_tarjeta;
}

const COSTO_VAR = { gratuito: 'costo_var_gratuito', servicio: 'costo_var_servicio', salon: 'costo_var_salon' };
const SOPORTE = { servicio: 'soporte_servicio', salon: 'soporte_salon' };

/** Piso: lo que cuesta atender a un cliente de paga (variable + base fija + comisión + soporte). */
export function piso(s, plan, precio) {
  return s[COSTO_VAR[plan]] + s.base_fija_por_restaurante + comisionTarjeta(precio, s) + s[SOPORTE[plan]];
}

/** Pagantes necesarios para que el margen por pagante cubra un costo fijo mensual. */
export function puntoEquilibrio(costoFijo, precio, pisoPorCliente) {
  return costoFijo / (precio - pisoPorCliente);
}

/** Precio que da la regla: máx(3 × piso, K × sustituto). K es decisión de Calvin, no un cálculo. */
export function precioSugerido(sustituto, k, s, plan = 'servicio') {
  let p = k * sustituto;
  for (let i = 0; i < 30; i++) p = Math.max(3 * piso(s, plan, p), k * sustituto);
  return p;
}

/** Hacia abajo al x49 o x99 anterior, sin bajar de 3 × piso. */
export function redondea(p, s, plan = 'servicio') {
  if (p < 100) return Math.round(p);
  let base = Math.floor(p / 50) * 50 - 1;
  while (base < 3 * piso(s, plan, base)) base += 50;
  return base;
}

// ---------------------------------------------------------------- quién rebasa y quién paga
/** Interpolación bilineal (en ln de los topes) sobre una rejilla {mesas, cuentas, centro|minimo|maximo}; se queda en los bordes. */
export function interp2(g, mesas, cuentas, clave = 'centro') {
  const pos = (arr, x) => {
    const L = arr.length;
    if (x <= arr[0]) return [0, 0, 0];
    if (x >= arr[L - 1]) return [L - 1, L - 1, 0];
    for (let i = 1; i < L; i++) if (x <= arr[i]) return [i - 1, i, (Math.log(x) - Math.log(arr[i - 1])) / (Math.log(arr[i]) - Math.log(arr[i - 1]))];
    return [L - 1, L - 1, 0];
  };
  const [m0, m1, tm] = pos(g.mesas, mesas);
  const [c0, c1, tc] = pos(g.cuentas, cuentas);
  const v = g[clave];
  return (v[m0][c0] * (1 - tc) + v[m0][c1] * tc) * (1 - tm) + (v[m1][c0] * (1 - tc) + v[m1][c1] * tc) * tm;
}

/**
 * Parte de los registrados que rebasa los topes del gratuito: mesas o cuentas (modelo conjunto, `empuja_conjunto`) y
 * platillos y lecturas de PDF (independientes: los platillos casi no se parecen al tamaño del negocio). `clave`:
 * 'centro' | 'minimo' | 'maximo' (intervalo del modelo de mesas y cuentas).
 */
export function parteRebasa(config, s, clave = 'centro') {
  const g = config.topes.gratuito;
  const conj = clamp(interp2(s.empuja_conjunto, g.mesas, g.cuentas, clave), 0, 1);
  const plat = 1 - coberturaPlatillos(config, s);
  const pdf = s.empuja_pdf_gratuito ?? 0;
  return clamp(1 - (1 - conj) * (1 - plat) * (1 - pdf), 0, 1);
}

/**
 * Cobertura del tope de platillos del plan gratuito: parte de los negocios con carta ≤ tope. Es un RANGO con DOS COTAS de sesgo opuesto
 * (`s.cota_platillos`: 'alta' = 148 cartas de reparto, cortas y sin bebidas; 'baja' = 56 cartas completas de sitios propios, largas y
 * formales). **No se sabe cuál es la cobertura real.** El tope puede contar todo o sólo comida (`topes.gratuito.platillos_cuenta` =
 * 'todo' | 'comida'; las bebidas quedan sin tope); `platillos` Infinity o null = sin tope.
 */
export function coberturaPlatillos(config, s, opc = {}) {
  const g = config.topes.gratuito;
  const tope = opc.tope ?? g.platillos;
  if (tope == null || tope === Infinity) return 1;
  const cota = opc.cota ?? s.cota_platillos ?? 'alta';
  const cuenta = opc.cuenta ?? g.platillos_cuenta ?? 'todo';
  return interp(s.cobertura_platillos[cota][cuenta], tope);
}

/** Parte de los registrados que rebasa también los topes de Master Chef (es de tamaño Chef Ejecutivo). */
export function parteSalon(config, s) {
  const t = config.topes.servicio;
  return clamp(interp2(s.empuja_conjunto, t.mesas, t.cuentas, 'centro'), 0, 1);
}

/**
 * Probabilidad de que un negocio de hasta 10 personas quede dentro de los topes de Chef (gratis): dentro de mesas y cuentas
 * (modelo, con la dispersión supuesta de mesas por cuenta) y dentro del tope de platillos (independiente del tamaño).
 * `clave`: 'centro' | 'minimo' | 'maximo' (extremos de las 27 combinaciones del modelo: f, mesas por cuenta y dispersión).
 */
export function seguridadChico(config, s, clave = 'centro') {
  const g = config.topes.gratuito;
  const conj = clamp(interp2(s.seguridad_chico, g.mesas, g.cuentas, clave), 0, 1);
  return conj * coberturaPlatillos(config, s) * (1 - (s.empuja_pdf_gratuito ?? 0));
}

/**
 * Cobertura conjunta del plan Chef (negocios de hasta 10 personas dentro de mesas, cuentas, platillos y lecturas de PDF) con las DOS cotas
 * del tope de platillos, contando todo y contando sólo comida. `clave` = 'centro' | 'minimo' | 'maximo' (intervalo del modelo de mesas y
 * cuentas). Es una probabilidad bajo supuestos; no una medida.
 */
export function coberturaChef(config, s, clave = 'centro', tope = undefined) {
  const out = {};
  for (const cuenta of ['todo', 'comida']) {
    out[cuenta] = {};
    for (const cota of ['alta', 'baja']) {
      const c = tope === undefined ? config : { ...config, topes: { ...config.topes, gratuito: { ...config.topes.gratuito, platillos: tope } } };
      out[cuenta][cota] = seguridadChico({ ...c, topes: { ...c.topes, gratuito: { ...c.topes.gratuito, platillos_cuenta: cuenta } } }, { ...s, cota_platillos: cota }, clave);
    }
  }
  return out;
}

/**
 * Las opciones abiertas para el tope de platillos del plan Chef (decisión de Calvin): qué cuesta cada una en cobertura (con las dos
 * cotas) y en margen de operación con `n` restaurantes (curva media). Margen = más pagantes cuanto menos cobertura: una cobertura baja
 * «mejora» el margen porque obliga a más gente a pagar, a costa de cobrar a quien debía ser gratis.
 */
export function opcionesTopePlatillos(config, s, n = 1000) {
  const opciones = [
    { id: 'actual', nombre: 'Tope de 150 platillos, bebidas incluidas (la propuesta actual)', tope: 150, cuenta: 'todo' },
    { id: 'solo_comida', nombre: 'Tope de 150 que cuenta sólo comida (las bebidas no tienen tope)', tope: 150, cuenta: 'comida' },
    { id: 'subir_200', nombre: 'Subir el tope a 200 platillos (bebidas incluidas)', tope: 200, cuenta: 'todo' },
    { id: 'subir_300', nombre: 'Subir el tope a 300 platillos (bebidas incluidas)', tope: 300, cuenta: 'todo' },
    { id: 'sin_tope', nombre: 'Quitar el tope de platillos y limitar sólo por mesas y cuentas', tope: Infinity, cuenta: 'todo' },
  ];
  return opciones.map((o) => {
    const c = { ...config, topes: { ...config.topes, gratuito: { ...config.topes.gratuito, platillos: o.tope, platillos_cuenta: o.cuenta } } };
    const porCota = {};
    for (const cota of ['alta', 'baja']) {
      const ss = { ...s, cota_platillos: cota };
      const e = evaluar(c, ss, n, { curva: 'media' });
      porCota[cota] = { cobertura_platillos: coberturaPlatillos(c, ss), cobertura_chef: seguridadChico(c, ss, 'centro'), dentro_de_todos: 1 - parteRebasa(c, ss), pagantes: e.clientes.de_paga, margen_operacion: e.margen_operacion };
    }
    return { ...o, tope: o.tope === Infinity ? null : o.tope, por_cota: porCota };
  });
}

/**
 * Qué parte de los negocios de 0 a 5 personas cabe en Chef y qué parte de los de 6 a 10 TAMBIÉN cabe (y por tanto qué parte cae en Master
 * Chef), con el modelo de mesas y cuentas con dispersión (centro y extremos de las 27 combinaciones) y la cobertura de platillos de la
 * cota pedida. Es un modelo, no una medida: sólo los conteos por estrato son medidos. «Cuentas» = las que el negocio querría crear.
 */
export function coberturaEstratos(config, s, clave = 'centro', cota = undefined) {
  const g = config.topes.gratuito;
  const ss = cota ? { ...s, cota_platillos: cota } : s;
  const plat = coberturaPlatillos(config, ss);
  const f = (1 - (s.empuja_pdf_gratuito ?? 0)) * plat;
  const d05 = clamp(interp2(s.dentro_0_5, g.mesas, g.cuentas, clave), 0, 1) * f;
  const d610 = clamp(interp2(s.dentro_6_10, g.mesas, g.cuentas, clave), 0, 1) * f;
  return { dentro_0_5: d05, cae_en_master_0_5: 1 - d05, dentro_6_10: d610, cae_en_master_6_10: 1 - d610, platillos: plat };
}

/** Parte de los que rebasan que llega a pagar a ese precio, según la curva (lognormal con techo). Precio ≤ 0 = nadie «paga». */
export function conversion(curva, precio, s, plan = 'servicio') {
  const c = (plan === 'salon' ? s.curvas_pago_salon : s.curvas_pago)[curva];
  if (precio <= 0) return 0;
  return c.techo * (1 - phi((Math.log(precio) - Math.log(c.mediana)) / c.sigma));
}

const margenPorElegible = (curva, p, s, plan) => conversion(curva, p, s, plan) * (p - s[SOPORTE[plan]] - comisionTarjeta(p, s));

/** Precio que maximiza el margen por restaurante que rebasa topes, como MESETA: de A a B el margen cambia menos de `tol`. */
export function precioOptimo(curva, s, plan = 'servicio', paso = 1, tol = 0.02) {
  const f = (p) => margenPorElegible(curva, p, s, plan);
  let mejor = { precio: 0, valor: -Infinity };
  const muestras = [];
  for (let p = 50; p <= 1500; p += paso) {
    const v = f(p);
    if (p % 50 === 0) muestras.push({ precio: p, conversion: conversion(curva, p, s), margen_por_elegible: v });
    if (v > mejor.valor) mejor = { precio: p, valor: v };
  }
  let lo = mejor.precio;
  let hi = mejor.precio;
  while (lo - paso >= 50 && f(lo - paso) >= (1 - tol) * mejor.valor) lo -= paso;
  while (hi + paso <= 1500 && f(hi + paso) >= (1 - tol) * mejor.valor) hi += paso;
  const derivada = (f(mejor.precio + 1) - f(mejor.precio - 1)) / 2;
  return { curva, precio: mejor.precio, meseta: { desde: lo, hasta: hi, tolerancia: tol }, conversion: conversion(curva, mejor.precio, s), margen_por_elegible: mejor.valor, derivada_en_optimo: derivada, muestras };
}

/** Cuánto se mueve el precio óptimo si cambia la mediana (±50 %), sigma (±50 %), el techo y el soporte (0, 30, 150). */
export function sensibilidadPrecioOptimo(s, plan = 'servicio') {
  const out = {};
  for (const curva of Object.keys(s.curvas_pago)) {
    const c = s.curvas_pago[curva];
    const con = (cambio) => ({ ...s, curvas_pago: { ...s.curvas_pago, [curva]: { ...c, ...cambio } } });
    const opt = (ss) => precioOptimo(curva, ss, plan).precio;
    out[curva] = {
      base: opt(s),
      mediana: { bajo: opt(con({ mediana: c.mediana * 0.5 })), alto: opt(con({ mediana: c.mediana * 1.5 })) },
      sigma: { bajo: opt(con({ sigma: c.sigma * 0.5 })), alto: opt(con({ sigma: c.sigma * 1.5 })) },
      techo: { bajo: opt(con({ techo: c.techo * 0.5 })), alto: opt(con({ techo: Math.min(1, c.techo * 1.5) })) },
      soporte: Object.fromEntries([0, 30, 150].map((x) => [x, opt({ ...s, [SOPORTE[plan]]: x })])),
    };
  }
  return out;
}

// ---------------------------------------------------------------- disco
/** MB en línea por restaurante de un plan en régimen (con las palancas de `config.palancas`, si hay). */
export function mbPorRestaurante(plan, config, s) {
  const mezcla = plan === 'gratuito' ? s.mezcla_gratuito : plan === 'servicio' ? s.mezcla_paga : { grande: 1 };
  const ef = efectosPalancas(config, s);
  const hg = plan === 'gratuito' ? ef.historial_gratuito_meses : null;
  const mv = Math.min(plan === 'gratuito' ? (hg ?? config.topes[plan].meses_en_linea) : config.topes[plan].meses_en_linea, ef.meses_paga_en_linea ?? Infinity);
  const me = hg ?? config.disco.meses_analitica_en_linea[plan];
  let t = 0;
  for (const [perfil, w] of Object.entries(mezcla)) {
    const d = s.disco_perfiles[perfil];
    t += w * (d.mb_fijo + mv * d.mb_mes_visitas + me * d.mb_mes_eventos * ef.eventos_disco);
  }
  return t;
}

/** Lo mismo que `mbPorRestaurante`, separado en lo fijo (menú, fotos de la base, catálogo), las sesiones y órdenes (visitas) y la analítica. */
export function desglosePorRestaurante(plan, config, s) {
  const mezcla = plan === 'gratuito' ? s.mezcla_gratuito : plan === 'servicio' ? s.mezcla_paga : { grande: 1 };
  const ef = efectosPalancas(config, s);
  const hg = plan === 'gratuito' ? ef.historial_gratuito_meses : null;
  const mv = Math.min(plan === 'gratuito' ? (hg ?? config.topes[plan].meses_en_linea) : config.topes[plan].meses_en_linea, ef.meses_paga_en_linea ?? Infinity);
  const me = hg ?? config.disco.meses_analitica_en_linea[plan];
  const r = { fijo: 0, sesiones_y_ordenes: 0, analitica: 0 };
  for (const [perfil, w] of Object.entries(mezcla)) {
    const d = s.disco_perfiles[perfil];
    r.fijo += w * d.mb_fijo;
    r.sesiones_y_ordenes += w * mv * d.mb_mes_visitas;
    r.analitica += w * me * d.mb_mes_eventos * ef.eventos_disco;
  }
  return r;
}

/** Cuántos restaurantes de un plan caben en un volumen (GB) sin reserva (como en los informes). */
export function cabenEnVolumen(mbPorRest, s, volumenGb = 5) {
  return Math.floor((volumenGb * 1e9 - s.base_vacia_mb * 1e6) / (mbPorRest * 1e6));
}

// ---------------------------------------------------------------- palancas (propuestas: nada de esto está construido)
/**
 * Palancas por recurso. `config.palancas` es una lista de ids; cada una cambia lo que el modelo calcula (disco por restaurante, tope
 * del procesador con el sondeo, líneas abiertas por restaurante) y por tanto el margen y `resumen`. Son PROPUESTAS: no se toca `app/`
 * ni `migrations/`. `medido` = se midió en PostgreSQL local (2026-11-14-recursos-medir.py); si no, es estimada con su supuesto.
 */
export const PALANCAS = {
  historial_gratuito_30_dias: { recurso: 'disco', nombre: 'Historial del plan gratuito a 30 días (visitas y analítica), con archivo descargable', esfuerzo: 'medio', riesgo: 'medio: un trabajo de purga; hay que avisar al dueño y ofrecer la descarga antes', regla_que_toca: 'CONTRADICE docs/plan/03_Datos_v1.md §7 (analítica 13 meses, sesiones y comandas 24 meses, sin distinguir por plan) y la regla 9 si se borran filas de entidades con historial (sesiones, comandas): hay que cambiar el documento y escribir el ADR ANTES (regla del repositorio); hoy NADA purga', medido: true },
  analitica_agregada_por_dia: { grupo: 'forma_de_guardar_la_analitica', recurso: 'disco', nombre: 'Analítica agregada por día en vez de una fila por evento', esfuerzo: 'medio', riesgo: 'medio: se pierde el detalle por sesión y por teléfono; sólo quedan conteos por día, tipo y platillo', regla_que_toca: 'ninguna dura (el evento no tiene datos personales: regla 10 se cumple mejor); pide ADR porque cambia el contrato de analítica', medido: true },
  retencion_analitica_7_dias: { grupo: 'forma_de_guardar_la_analitica', recurso: 'disco', nombre: 'Guardar la analítica en bruto sólo 7 días (después, agregada)', esfuerzo: 'chico', riesgo: 'bajo: un trabajo diario que borra eventos viejos; la analítica no es una entidad con historial', regla_que_toca: 'CONTRADICE 03 §7 (analítica 13 meses con «agregación diaria y purga»): cambiar el documento antes; ninguna regla dura (el evento no es una entidad con historial)', medido: false },
  fila_por_visita_de_comensal: { grupo: 'forma_de_guardar_la_analitica', recurso: 'disco', nombre: 'Una fila de analítica por visita de comensal, armada en el teléfono (veces y segundos por lugar)', esfuerzo: 'medio', riesgo: 'medio: se pierde el platillo visto y el orden de los toques; depende de que el teléfono mande la fila (si se cierra antes, se pierde); actualizar la fila duplica el tamaño de la tabla; sin ip_hash (no hace falta)', regla_que_toca: 'ninguna dura (sin datos personales: regla 10 se cumple mejor); pide ADR porque cambia el contrato de analítica', medido: true },
  fila_por_visita_mas_platillo_por_dia: { grupo: 'forma_de_guardar_la_analitica', recurso: 'disco', nombre: 'Una fila por visita de comensal más un conteo diario por platillo', esfuerzo: 'medio', riesgo: 'medio: dos tablas y dos envíos; conserva el platillo visto (conteo por día) pero no cuál comensal lo vio', regla_que_toca: 'ninguna dura; pide ADR (contrato de analítica)', medido: true },
  indices_de_evento_minimos: { grupo: 'forma_de_guardar_la_analitica', recurso: 'disco', nombre: 'Dejar sólo dos índices en la analítica (llave y restaurante-fecha)', esfuerzo: 'chico', riesgo: 'medio: las llaves foráneas con SET NULL piden índice en esa columna (skill /migracion); habría que quitar esas llaves y guardar ids opacos', regla_que_toca: 'convención de /migracion (índice en toda FK con cascada); pide ADR', medido: true },
  tipos_mas_chicos: { grupo: 'forma_de_guardar_la_analitica', recurso: 'disco', nombre: 'Tipos más chicos en la analítica (tipo y navegador como número, huella de red de 8 bytes)', esfuerzo: 'medio', riesgo: 'bajo: migración con reescritura de la tabla', regla_que_toca: 'ninguna', medido: true },
  purga_claves_idempotencia: { recurso: 'disco', nombre: 'Purgar las claves de idempotencia a las 24 horas', esfuerzo: 'chico', riesgo: 'bajo si la ventana de reintento del teléfono es menor de 24 h', regla_que_toca: 'ninguna', medido: true },
  archivar_sesiones_cerradas: { recurso: 'disco', nombre: 'Archivar en R2 las sesiones cerradas con más de 3 meses y quitarlas de la base', esfuerzo: 'grande', riesgo: 'alto: se vuelve a leer el historial del archivo; un error pierde datos', regla_que_toca: 'regla 9 (sin borrado físico de entidades con historial) y regla 8 (ninguna comanda se pierde): PIDE ADR antes', medido: false },
  estado_en_memoria_60s: { recurso: 'procesador', nombre: 'Estado de la mesa en memoria 60 s, invalidado por aviso de la base (sólo con el sondeo)', esfuerzo: 'medio', riesgo: 'bajo-medio: cambia ADR-004 (vida máxima 2 s). EXTRAPOLA una medición por comensal (0.88 → 0.47 ms) a todo el procesador, y DEJA DE IMPORTAR cuando lleguen los avisos de la Fase 3', regla_que_toca: 'ninguna; cambia un ADR', medido: true },
  cerrar_lineas_ociosas: { recurso: 'lineas', nombre: 'Cerrar la línea abierta a los 2 minutos sin cambios y reabrirla al volver', esfuerzo: 'medio', riesgo: 'bajo: el teléfono ya vuelve al sondeo si la línea falla', regla_que_toca: 'ninguna', medido: false },
  pool_acotado: { recurso: 'conexiones_bd', nombre: 'Acotar el pool a 5 + 5 conexiones por proceso (con 8 procesos: 80 de las ≈ 100 que da la base)', esfuerzo: 'chico', riesgo: 'bajo; hay que verificar `SHOW max_connections` en Railway', regla_que_toca: 'ninguna', medido: false },
};

/**
 * Palancas que son ALTERNATIVAS y no se suman: son formas de guardar la analítica; el modelo aplica una sola (la primera de esta lista que esté
 * puesta) y el tablero no las apila. Elegir otra de las del grupo reemplaza a la anterior.
 */
export const GRUPOS_EXCLUYENTES = {
  forma_de_guardar_la_analitica: {
    nombre: 'Forma de guardar la analítica (se elige una; no se suman)',
    prioridad: ['analitica_agregada_por_dia', 'fila_por_visita_mas_platillo_por_dia', 'fila_por_visita_de_comensal', 'indices_de_evento_minimos + tipos_mas_chicos', 'retencion_analitica_7_dias'],
    nota: 'Contar por día, la fila por visita y la fila por visita más platillo reemplazan la fila por evento; los índices mínimos, los tipos chicos y la retención a 7 días sólo mejoran la fila por evento, así que no suman con ninguna de las tres.',
  },
};

/** Las palancas en llano para pintarlas: `accion` (qué hay que hacer, hasta 6 palabras, en infinitivo) y `que_es` (una frase). */
export const PALANCAS_EN_LLANO = {
  historial_gratuito_30_dias: { accion: 'Guardar 30 días en el gratuito', que_es: 'El plan gratuito conserva un mes de visitas y de analítica; lo anterior se descarga o se borra.' },
  analitica_agregada_por_dia: { accion: 'Contar por día, no por evento', que_es: 'En vez de una fila por cada toque, la base guarda un conteo por día, tipo y platillo.' },
  retencion_analitica_7_dias: { accion: 'Borrar analítica cruda a 7 días', que_es: 'Los eventos sueltos se conservan una semana y después sólo queda el conteo por día.' },
  fila_por_visita_de_comensal: { accion: 'Guardar una fila por visita', que_es: 'El teléfono arma una sola fila con cuántas veces entró y cuánto tiempo estuvo en el menú, el platillo, la búsqueda y los filtros, y la manda al terminar.' },
  fila_por_visita_mas_platillo_por_dia: { accion: 'Guardar fila por visita y platillo', que_es: 'Lo mismo, más un conteo diario de cuántas veces se vio cada platillo, para no perder qué platillos gustan.' },
  indices_de_evento_minimos: { accion: 'Quitar índices que sobran', que_es: 'La tabla de analítica deja sólo los dos índices que de verdad se usan.' },
  tipos_mas_chicos: { accion: 'Usar tipos de dato más chicos', que_es: 'Los campos de la analítica pasan de texto largo a números y huellas cortas.' },
  purga_claves_idempotencia: { accion: 'Purgar claves de reintento diario', que_es: 'Las claves que evitan duplicar una orden al reintentar se borran al día siguiente.' },
  archivar_sesiones_cerradas: { accion: 'Archivar sesiones viejas en R2', que_es: 'Las sesiones cerradas de hace más de tres meses se guardan en un archivo aparte y salen de la base.' },
  estado_en_memoria_60s: { accion: 'Guardar estado en memoria 60 s', que_es: 'El servidor recuerda el estado de cada mesa un minuto y sólo lo recalcula cuando la base avisa.' },
  cerrar_lineas_ociosas: { accion: 'Cerrar líneas sin movimiento', que_es: 'La conexión abierta con el teléfono se cierra a los 2 minutos sin cambios y se reabre sola.' },
  pool_acotado: { accion: 'Acotar conexiones a la base', que_es: 'Cada proceso usa menos conexiones de la base para no pasar su tope con más procesos.' },
};
for (const [id, v] of Object.entries(PALANCAS_EN_LLANO)) Object.assign(PALANCAS[id], v);

/** Definiciones de una frase para los textos emergentes (calculadas con los parámetros, no escritas con cifras a mano). */
export function definiciones(s) {
  const casos = CASOS_ANUNCIOS(s);
  const baja = s.cobertura_platillos.baja.todo.find((x) => x[0] === 150)[1];
  const alta = s.cobertura_platillos.alta.todo.find((x) => x[0] === 150)[1];
  return {
    adverso: `El caso de anuncios más pobre: ${casos.adverso.definicion}.`,
    estres: `La prueba de estrés (el «piso de verdad»): ${ESCENARIOS.piso_de_verdad.definicion}; lo peor que el modelo se atreve a decir.`,
    cota_baja: `Cota baja del tope de platillos: se mide con ${s.cobertura_platillos.n_baja} cartas completas de sitios propios (largas y de negocios formales); con 150 platillos caben ${Math.round(baja * 100)} % de esas cartas.`,
    cota_alta: `Cota alta del tope de platillos: se mide con 148 cartas de plataformas de reparto (cortas y sin bebidas); con 150 platillos cabrían ${Math.round(alta * 100)} % de ellas. La cobertura real está entre las dos cotas y no se sabe cuál es.`,
    bolsa: 'Lo que Calvin pone cada mes de su bolsillo para pagar el servidor mientras los anuncios no alcanzan a pagarlo.',
    cuello_de_botella: 'El recurso que se llena primero: el sistema no atiende más restaurantes que los que aguanta ése.',
  };
}

/** Efectos de `config.palancas` sobre lo que calcula el modelo. */
export function efectosPalancas(config, s) {
  const p = new Set(config.palancas ?? []);
  const f = s.factores_disco_eventos;
  let eventos = 1;
  if (p.has('analitica_agregada_por_dia')) eventos = f.agregada_por_dia_cota_alta;
  else if (p.has('fila_por_visita_mas_platillo_por_dia')) eventos = s.fila_por_visita.con_platillo_por_dia;
  else if (p.has('fila_por_visita_de_comensal')) eventos = s.fila_por_visita.sola;
  else {
    if (p.has('indices_de_evento_minimos') && p.has('tipos_mas_chicos')) eventos = f.ambos;
    else if (p.has('indices_de_evento_minimos')) eventos = f.un_indice;
    else if (p.has('tipos_mas_chicos')) eventos = f.tipos_chicos;
    if (p.has('retencion_analitica_7_dias')) eventos *= f.retencion_7_dias;
  }
  return {
    eventos_disco: eventos,
    meses_paga_en_linea: p.has('archivar_sesiones_cerradas') ? 3 : null,
    historial_gratuito_meses: p.has('historial_gratuito_30_dias') ? 1 : null,
    cap_cpu_sondeo: p.has('estado_en_memoria_60s') ? s.factor_estado_memoria_60s : 1,
    lineas_factor: p.has('cerrar_lineas_ociosas') ? s.factor_lineas_ociosas : 1,
    pool_por_worker: p.has('pool_acotado') ? 10 : s.db_pool_por_worker,
    purga_idempotencia: p.has('purga_claves_idempotencia'),
  };
}

// ---------------------------------------------------------------- servidor
function costoEscalonUsd(e, carga) {
  return e.base_usd + ((e.tope_usd - e.base_usd) * carga) / e.carga_ref;
}

/**
 * Escalón más barato que alcanza. Si ninguno alcanza (carga arriba de la capacidad medida), devuelve
 * `requiere_arquitectura: true` y `extrapolacion_sin_medir: true`: el costo es k instancias de la pila de 8 procesos
 * (`instancia_extra_usd` por cada instancia adicional) y NO es una medición ni una promesa de que esa arquitectura exista.
 */
export function escalonPara(carga, discoMb, s) {
  const orden = [...s.escalones].sort((a, b) => a.tope_usd - b.tope_usd);
  const usable = (e) => e.volumen_gb * 1000 * (1 - s.reserva_disco);
  const viola = (e) => {
    const v = [];
    if (carga > e.cap_cpu) v.push('procesador');
    if (discoMb > usable(e)) v.push('disco');
    if (carga > s.cap_conexiones) v.push('conexiones');
    return v;
  };
  const rechazos = [];
  for (const e of orden) {
    const v = viola(e);
    if (v.length === 0) {
      const ratios = { procesador: carga / e.cap_cpu, disco: discoMb / usable(e), conexiones: carga / s.cap_conexiones };
      const manda = rechazos.length ? rechazos[rechazos.length - 1].muros[0] : Object.entries(ratios).sort((a, b) => b[1] - a[1])[0][0];
      return { escalon: e.id, nombre: e.nombre, costo_usd: costoEscalonUsd(e, carga), muro_que_manda: manda, ratios, instancias: 1, requiere_arquitectura: false, extrapolacion_sin_medir: false, rechazados: rechazos.map((r) => `${r.id}: ${r.muros.join(', ')}`) };
    }
    rechazos.push({ id: e.id, muros: v });
  }
  const g = orden[orden.length - 1];
  const k = Math.max(Math.ceil(carga / s.cap_conexiones), Math.ceil(discoMb / usable(g)));
  const costo = g.tope_usd + (k - 1) * s.instancia_extra_usd;
  return { escalon: g.id, nombre: `${k} instancias de ${g.nombre} (extrapolación sin medir)`, costo_usd: costo, muro_que_manda: 'conexiones', ratios: { procesador: carga / (g.cap_cpu * k), disco: discoMb / (usable(g) * k), conexiones: carga / (s.cap_conexiones * k) }, instancias: k, requiere_arquitectura: true, extrapolacion_sin_medir: true, rechazados: rechazos.map((r) => `${r.id}: ${r.muros.join(', ')}`) };
}

// ---------------------------------------------------------------- evaluar
const sinPago = (s) => ({
  ...s,
  curvas_pago: Object.fromEntries(Object.entries(s.curvas_pago).map(([k, v]) => [k, { ...v, techo: 0 }])),
  curvas_pago_salon: Object.fromEntries(Object.entries(s.curvas_pago_salon).map(([k, v]) => [k, { ...v, techo: 0 }])),
});

/**
 * Evalúa una configuración con n restaurantes registrados (en régimen).
 * Los clientes son VALORES ESPERADOS (pueden ser fracciones; con `opc.redondear` salen enteros).
 * opc: { curva, todosPagan, anuncios, sinAnuncios, redondear }
 *  - Los anuncios van en el plan gratuito (decidido por Calvin) y en régimen SUMAN; `opc.sinAnuncios = true` evalúa el
 *    periodo en que todavía no empiezan (los pone Calvin de su bolsa). `opc.anunciosAprobados === false` es un alias antiguo
 *    de `sinAnuncios`.
 * Márgenes: `margen_operacion` (sin captación ni sueldos); `margen_despues_de_captacion` resta la reposición de bajas
 * (churn × pagantes × cac) y los sueldos; `margen_neto` resta además los impuestos sobre lo positivo. `margen.pesos` = operación.
 */
export function evaluar(config, s, n, opc = {}) {
  const curva = opc.curva ?? config.curva;
  const anuncios = opc.anuncios ?? config.anuncios;
  const sinAds = opc.sinAnuncios === true || opc.anunciosAprobados === false || anuncios.activo === false;
  const rebasa = parteRebasa(config, s);
  const ps = config.precios.servicio;
  const pl = config.precios.salon;
  const salonParte = pl > 0 ? Math.min(parteSalon(config, s), rebasa) : 0; // con Chef Ejecutivo apagado, Master Chef absorbe todo lo que pasa de Chef
  let pagS, pagL;
  if (opc.todosPagan) {
    pagL = pl > 0 ? n * salonParte : 0;
    pagS = ps > 0 ? n * (1 - salonParte) : 0;
    if (pl <= 0 && ps > 0) pagS = n;
  } else {
    pagL = pl > 0 ? n * salonParte * conversion(curva, pl, s, 'salon') : 0;
    pagS = ps > 0 ? n * (rebasa - salonParte) * conversion(curva, ps, s, 'servicio') : 0;
  }
  if (opc.redondear) { pagS = Math.round(pagS); pagL = Math.round(pagL); }
  const gratis = n - pagS - pagL;

  // carga y disco
  const carga = gratis + s.peso_servicio_cpu * pagS + s.peso_salon_cpu * pagL;
  const mbG = mbPorRestaurante('gratuito', config, s);
  const mbS = mbPorRestaurante('servicio', config, s);
  const mbL = mbPorRestaurante('salon', config, s);
  const discoMb = s.base_vacia_mb + gratis * mbG + pagS * mbS + pagL * mbL;
  const srv = escalonPara(carga, discoMb, s);

  // costos (pesos al mes)
  const fx = s.fx;
  const servidor = srv.costo_usd * fx + (s.dominio_usd_anio / 12) * fx;
  const almacenamiento = (discoMb / 1000) * s.volumen_usd_gb_mes * fx;
  const r2gb = gratis * s.r2_gb_gratuito + pagS * s.r2_gb_servicio + pagL * s.r2_gb_salon;
  const objetos = Math.max(0, r2gb - s.r2_gratis_gb) * s.r2_usd_gb_mes * fx;
  const soporte = pagS * s.soporte_servicio + pagL * s.soporte_salon + gratis * s.soporte_gratuito;
  const comision = pagS * comisionTarjeta(ps, s) + pagL * comisionTarjeta(pl, s);
  const costos = servidor + almacenamiento + objetos + soporte + comision;

  // ingresos
  const suscripcion = pagS * ps + pagL * pl;
  const tarifa = sinAds ? 0 : s.anuncio_pesos_por_mil[anuncios.tarifa];
  const parteAds = opc.parteVisitasConAnuncio ?? s.parte_visitas_con_anuncio;
  const ads = (gratis * s.visitas_app_gratuito * parteAds * tarifa) / 1000;
  const ingresos = suscripcion + ads;
  const margen = ingresos - costos;

  // captación, sueldos e impuestos (no son costos de operación)
  const captacion = s.churn_mensual * (pagS + pagL) * s.cac;
  const despuesCaptacion = margen - captacion - s.sueldos_mes;
  const neto = despuesCaptacion - Math.max(0, despuesCaptacion) * s.impuestos_tasa;

  // por cliente
  const infra = servidor + almacenamiento + objetos;
  const costoPorCarga = carga > 0 ? infra / carga : 0;
  const costoGratuito = costoPorCarga + s.soporte_gratuito;
  const adsGratuito = (s.visitas_app_gratuito * parteAds * tarifa) / 1000;
  const costoServicio = costoPorCarga * s.peso_servicio_cpu + s.soporte_servicio + comisionTarjeta(ps, s);
  const unidadServicio = ps - costoServicio;
  const netoGratuito = costoGratuito - adsGratuito;
  const sePagaSolo = netoGratuito <= 0;
  const sostiene = !sePagaSolo && ps > 0 ? unidadServicio / netoGratuito : null; // null = el gratuito se paga solo con anuncios (ver se_paga_solo)
  const sostieneSinAds = ps > 0 && costoGratuito > 0 ? unidadServicio / costoGratuito : null;
  const pagantes = pagS + pagL;
  const ingresoPorPagante = pagantes > 0 ? suscripcion / pagantes : ps;

  // punto de equilibrio con este n: pagantes que faltan para que el margen de operación sea 0
  const mbTodos = s.base_vacia_mb + n * mbG;
  const srv0 = escalonPara(n, mbTodos, s);
  const costo0 = srv0.costo_usd * fx + (s.dominio_usd_anio / 12) * fx + (mbTodos / 1000) * s.volumen_usd_gb_mes * fx + n * s.soporte_gratuito;
  const ads0 = (n * s.visitas_app_gratuito * parteAds * tarifa) / 1000;
  const equilibrio = unidadServicio > 0 ? Math.max(0, (costo0 - ads0) / unidadServicio) : null;
  const comensalesMes = (gratis * s.comensales_dia_gratuito + pagantes * s.comensales_dia_servicio) * 30;

  return {
    n, rebasan_topes: rebasa, curva, valores_esperados: !opc.redondear, anuncios_incluidos: !sinAds,
    clientes: { gratuito: gratis, servicio: pagS, salon: pagL, de_paga: pagantes },
    capacidad: { carga_en_gratuitos_tipicos: carga, disco_mb: discoMb, ...srv, mb_por_restaurante: { gratuito: mbG, servicio: mbS, salon: mbL } },
    extrapolacion_sin_medir: srv.extrapolacion_sin_medir,
    comensales_mes: comensalesMes,
    ingresos: { suscripcion, anuncios: ads, total: ingresos },
    costos: { servidor, almacenamiento, objetos, soporte, comision, total: costos },
    captacion: { reposicion_de_bajas: captacion, sueldos: s.sueldos_mes },
    margen: { pesos: margen, porcentaje: ingresos > 0 ? margen / ingresos : null },
    margen_operacion: margen, // sin captación ni sueldos
    margen_despues_de_captacion: despuesCaptacion,
    margen_neto: neto,
    por_cliente: { ingreso_gratuito: adsGratuito, costo_gratuito: costoGratuito, ingreso_servicio: ps, ingreso_por_pagante: ingresoPorPagante, costo_servicio: costoServicio, margen_servicio: unidadServicio },
    equilibrio_pagantes: equilibrio,
    se_paga_solo: sePagaSolo, // true = con anuncios cada gratuito deja más de lo que cuesta: gratuitos_que_sostiene_un_pagante es null
    gratuitos_que_sostiene_un_pagante: sostiene,
    gratuitos_que_sostiene_un_pagante_sin_anuncios: sostieneSinAds,
    gratuitos_que_sostiene_un_pagante_solo_variable: s.costo_var_gratuito + s.soporte_gratuito > 0 && ps > 0 ? unidadServicio / (s.costo_var_gratuito + s.soporte_gratuito) : null,
  };
}

// ---------------------------------------------------------------- precios candidatos: ¿cuál queda sin pérdidas?
/**
 * Evalúa los precios candidatos de Master Chef (`s.precios_candidatos.servicio`) y de Chef Ejecutivo (`.salon`), cada uno con
 * las tres curvas: pagantes esperados, margen de operación, margen después de captación y punto de equilibrio.
 * `sin_perdidas_con_anuncios` / `sin_perdidas_sin_anuncios` = el margen de operación y el de después de captación son ≥ 0 en la curva dada,
 * con los anuncios en marcha y todavía sin ellos (periodo en que el costo lo pone Calvin).
 */
export function evaluarPrecios(config, s, n = 1000) {
  const out = { n, servicio: [], salon: [] };
  for (const plan of ['servicio', 'salon']) {
    if (plan === 'salon' && !(config.precios.salon > 0)) continue; // Chef Ejecutivo apagado
    for (const p of s.precios_candidatos[plan]) {
      const c = JSON.parse(JSON.stringify(config));
      c.precios[plan] = p;
      const fila = { precio: p, por_curva: {} };
      for (const curva of Object.keys(s.curvas_pago)) {
        const e = evaluar(c, s, n, { curva });
        const sin = evaluar(c, s, n, { curva, sinAnuncios: true });
        fila.por_curva[curva] = { pagantes: plan === 'servicio' ? e.clientes.servicio : e.clientes.salon, pagantes_total: e.clientes.de_paga, margen_operacion: e.margen_operacion, margen_despues_de_captacion: e.margen_despues_de_captacion, equilibrio_pagantes: e.equilibrio_pagantes, sin_perdidas_con_anuncios: e.margen_operacion >= 0 && e.margen_despues_de_captacion >= 0, margen_operacion_sin_anuncios: sin.margen_operacion, margen_despues_de_captacion_sin_anuncios: sin.margen_despues_de_captacion, equilibrio_pagantes_sin_anuncios: sin.equilibrio_pagantes, sin_perdidas_sin_anuncios: sin.margen_operacion >= 0 && sin.margen_despues_de_captacion >= 0 };
      }
      out[plan].push(fila);
    }
  }
  return out;
}

// ---------------------------------------------------------------- la pregunta del peor caso: todos gratuitos
const CASOS_ANUNCIOS = (s) => ({
  baja: { tarifa: 'baja', parte: s.parte_visitas_con_anuncio, definicion: 'tarifa baja y la parte de visitas con anuncio del supuesto' },
  adverso: { tarifa: 'baja', parte: 0.3, mitad: true, definicion: 'la mitad de la tarifa baja y anuncio sólo en el 30 % de las visitas' },
  medio: { tarifa: 'media', parte: s.parte_visitas_con_anuncio, definicion: 'tarifa media y la parte de visitas con anuncio del supuesto' },
});

function evaluarTodosGratuitos(config, s, n, caso) {
  const s0 = sinPago(s);
  let ss = s0;
  if (caso && caso.mitad) ss = { ...s0, anuncio_pesos_por_mil: { ...s0.anuncio_pesos_por_mil, baja: s0.anuncio_pesos_por_mil.baja / 2 } };
  return evaluar(config, ss, n, caso ? { anuncios: { activo: true, tarifa: caso.tarifa }, parteVisitasConAnuncio: caso.parte } : { sinAnuncios: true });
}

/**
 * Peor caso REAL: n restaurantes, TODOS gratuitos. Devuelve los comensales al mes que traen (dato por restaurante del simulador:
 * SIMULADO, no medido), el costo al mes que pone Calvin MIENTRAS NO HAY ANUNCIOS, el resultado CON anuncios en tres casos
 * (baja, adverso, medio), el escalón de servidor que exige y si se paga solo.
 */
export function todosGratuitos(config, s, n) {
  const sin = evaluarTodosGratuitos(config, s, n, null);
  const casos = CASOS_ANUNCIOS(s);
  const con = Object.fromEntries(Object.entries(casos).map(([k, c]) => { const e = evaluarTodosGratuitos(config, s, n, c); return [k, { margen: e.margen_operacion, ingreso_anuncios: e.ingresos.anuncios, se_paga_solo: e.margen_operacion >= 0, definicion: c.definicion }]; }));
  return { n, comensales_mes: sin.comensales_mes, costo_sin_anuncios: sin.costos.total, resultado_sin_anuncios: sin.margen_operacion, con_anuncios: con, escalon: sin.capacidad.escalon, muro: sin.capacidad.muro_que_manda, requiere_arquitectura: sin.capacidad.requiere_arquitectura, extrapolacion_sin_medir: sin.extrapolacion_sin_medir, mb_por_restaurante: sin.capacidad.mb_por_restaurante.gratuito };
}

/** Tabla `todos_gratuitos(n)` para n de 10 a 2,000 (zona medida) y, aparte, la zona extrapolada. */
export function tablaTodosGratuitos(config, s, ns = [10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000], extrapoladas = [3000, 5000, 10000]) {
  return { medida: ns.map((n) => todosGratuitos(config, s, n)), extrapolada_sin_medir: extrapoladas.map((n) => todosGratuitos(config, s, n)) };
}

/** Menor n (hasta `tope`) desde el que, con anuncios en el caso dado, el margen de operación es ≥ 0 con todos gratuitos; null si no hay. */
export function nSePagaSolo(config, s, caso = 'baja', tope = 3000) {
  const c = CASOS_ANUNCIOS(s)[caso];
  for (let n = 1; n <= tope; n++) if (evaluarTodosGratuitos(config, s, n, c).margen_operacion >= 0) return n;
  return null;
}

/** Con `bolsa` pesos al mes de la bolsa de Calvin (sin anuncios): hasta cuántos restaurantes gratuitos y comensales se cargan (zona medida). */
export function capacidadConBolsa(config, s, bolsa) {
  let n = 0;
  for (let k = 1; k <= s.cap_conexiones; k++) { if (evaluarTodosGratuitos(config, s, k, null).costos.total <= bolsa) n = k; else break; }
  const e = n > 0 ? evaluarTodosGratuitos(config, s, n, null) : null;
  return { bolsa, restaurantes: n, comensales_mes: e ? e.comensales_mes : 0, escalon: e ? e.capacidad.escalon : null, tope_medido: n >= s.cap_conexiones, n_se_paga_solo: { baja: nSePagaSolo(config, s, 'baja'), adverso: nSePagaSolo(config, s, 'adverso'), medio: nSePagaSolo(config, s, 'medio') } };
}

// ---------------------------------------------------------------- UNA definición de cada escenario (la usan resumen, proyectar y los .md)
/**
 * Cada escenario mueve DOS ejes a la vez (curva de pago y anuncios) y, el piso, también el soporte. Se define aquí una sola vez.
 *  - recomendado: curva media, anuncios (tarifa baja) en marcha.
 *  - peor: curva pesimista y SIN anuncios en ningún mes (el periodo que paga Calvin); no es el piso.
 *  - mejor: curva optimista y anuncios en la tarifa media.
 *  - piso_de_verdad: curva pesimista, anuncios adversos (la mitad de la tarifa baja y anuncio en el 30 % de las visitas) y soporte
 *    al máximo de su rango (gratuito, Master Chef y Chef Ejecutivo): la combinación más mala de lo que el modelo se atreve a decir.
 */
export const ESCENARIOS = {
  recomendado: { curva: 'media', anuncios: 'baja', definicion: 'curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha' },
  peor: { curva: 'pesimista', anuncios: null, definicion: 'curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa)' },
  mejor: { curva: 'optimista', anuncios: 'media', definicion: 'curva de pago optimista y anuncios en la tarifa media' },
  piso_de_verdad: { curva: 'pesimista', anuncios: 'adverso', soporte: 'maximo', definicion: 'curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango' },
};

/** Lista de lo que el modelo NO modela (ingresos de anuncios y costos que quedan fuera). */
export const NO_MODELADO = ['moderación de anuncios (revisar y bloquear categorías)', 'tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado)', 'comisión de la red de anuncios', 'impuestos sobre los ingresos de anuncios y de suscripción'];

/** Supuestos y opciones de `evaluar` que corresponden a un escenario con nombre. */
function paramsEscenario(nombre, s) {
  const e = ESCENARIOS[nombre];
  if (!e) throw new Error(`escenario desconocido: ${nombre}`);
  let ss = s;
  let parte;
  if (e.soporte === 'maximo') ss = { ...ss, soporte_gratuito: s.rangos.soporte_gratuito[1], soporte_servicio: s.rangos.soporte_servicio[1], soporte_salon: s.rangos.soporte_salon[1] };
  if (e.anuncios === 'adverso') { ss = { ...ss, anuncio_pesos_por_mil: { ...ss.anuncio_pesos_por_mil, baja: ss.anuncio_pesos_por_mil.baja / 2 } }; parte = 0.3; }
  const opc = { curva: e.curva };
  if (e.anuncios === null) opc.sinAnuncios = true;
  else opc.anuncios = { activo: true, tarifa: e.anuncios === 'adverso' ? 'baja' : e.anuncios };
  if (parte !== undefined) opc.parteVisitasConAnuncio = parte;
  return { ss, opc };
}

/** Evalúa un escenario con nombre ('recomendado' | 'peor' | 'mejor' | 'piso_de_verdad') con n restaurantes en régimen. */
export function evaluarEscenario(nombre, config, s, n = 1000) {
  const { ss, opc } = paramsEscenario(nombre, s);
  return evaluar(config, ss, n, opc);
}

/** Proyección mes a mes de un escenario con nombre; el peor no lleva anuncios en ningún mes. */
export function proyectarEscenario(nombre, config, s, meses = 36) {
  const { ss, opc } = paramsEscenario(nombre, s);
  return proyectar(config, ss, meses, opc);
}

/** Matriz 3 × 3 (curva de pago × anuncios: sin · tarifa baja · tarifa media) del margen de operación, más el piso de verdad. */
export function matrizEscenarios(config, s, n = 1000) {
  const anuncios = [null, 'baja', 'media'];
  const filas = Object.keys(s.curvas_pago).map((curva) => ({
    curva,
    celdas: anuncios.map((a) => { const e = evaluar(config, s, n, a === null ? { curva, sinAnuncios: true } : { curva, anuncios: { activo: true, tarifa: a } }); return { anuncios: a ?? 'sin', margen_operacion: e.margen_operacion, margen_despues_de_captacion: e.margen_despues_de_captacion, ingresos_anuncios: e.ingresos.anuncios, pagantes: e.clientes.de_paga }; }),
  }));
  const piso = evaluarEscenario('piso_de_verdad', config, s, n);
  return { n, columnas: ['sin anuncios', 'tarifa baja', 'tarifa media'], filas, piso_de_verdad: { definicion: ESCENARIOS.piso_de_verdad.definicion, margen_operacion: piso.margen_operacion, margen_despues_de_captacion: piso.margen_despues_de_captacion, ingresos_anuncios: piso.ingresos.anuncios }, no_modelado: NO_MODELADO };
}

// ---------------------------------------------------------------- umbrales y bolsa como RANGOS
/** Variantes de supuestos que mueven los umbrales de anuncios y de bolsa: [nombre, cómo, valor bajo, valor alto]. */
function variantesAnuncios(s) {
  const tar = (f) => ({ ...s, anuncio_pesos_por_mil: Object.fromEntries(Object.entries(s.anuncio_pesos_por_mil).map(([k, v]) => [k, v * f])) });
  const [smin, smax] = s.rangos.soporte_gratuito;
  return [
    { supuesto: 'tarifa de anuncios', bajo: { etiqueta: 'la mitad', s: tar(0.5) }, alto: { etiqueta: 'el doble', s: tar(2) } },
    { supuesto: 'visitas con anuncio', bajo: { etiqueta: 'la mitad', s: { ...s, parte_visitas_con_anuncio: s.parte_visitas_con_anuncio * 0.5 } }, alto: { etiqueta: 'el doble', s: { ...s, parte_visitas_con_anuncio: Math.min(1, s.parte_visitas_con_anuncio * 2) } } },
    { supuesto: 'soporte por cliente gratuito', bajo: { etiqueta: `${smin} pesos`, s: { ...s, soporte_gratuito: smin } }, alto: { etiqueta: `${smax} pesos (el máximo de su rango)`, s: { ...s, soporte_gratuito: smax } } },
    { supuesto: 'visitas con la app por gratuito', bajo: { etiqueta: 'la mitad', s: { ...s, visitas_app_gratuito: s.visitas_app_gratuito * 0.5 } }, alto: { etiqueta: 'el doble', s: { ...s, visitas_app_gratuito: s.visitas_app_gratuito * 2 } } },
  ];
}

/**
 * `nSePagaSolo` como RANGO: el centro (supuestos de trabajo) y, por cada supuesto que lo mueve, el valor con ese supuesto en su
 * extremo bajo y alto (null = no se paga solo con ≤ `tope` restaurantes). `minimo` y `maximo` = los extremos entre variantes
 * (maximo null si alguna variante nunca se paga solo). Vale con el canal de eventos (ADR-018) construido: con el sondeo de hoy el
 * escalón de menor costo sólo cabe `cap_sondeo` restaurantes típicos.
 */
export function rangoSePagaSolo(config, s, caso = 'baja', tope = 3000) {
  const centro = nSePagaSolo(config, s, caso, tope);
  const por_supuesto = variantesAnuncios(s).map((v) => ({ supuesto: v.supuesto, bajo: { variante: v.bajo.etiqueta, n: nSePagaSolo(config, v.bajo.s, caso, tope) }, alto: { variante: v.alto.etiqueta, n: nSePagaSolo(config, v.alto.s, caso, tope) } }));
  const todos = por_supuesto.flatMap((x) => [x.bajo.n, x.alto.n]);
  const finitos = todos.filter((x) => x != null);
  return { caso, centro, minimo: Math.min(centro ?? Infinity, ...finitos), maximo: todos.some((x) => x == null) || centro == null ? null : Math.max(centro, ...finitos), por_supuesto, tope, vale_con_canal_de_eventos: true, cap_sondeo_hoy: s.escalones.find((e) => e.id === 'hobby_sondeo').cap_cpu };
}

/** `capacidadConBolsa` como RANGO según el soporte por gratuito (sin fuente) y el escalón con el sondeo de hoy. */
export function rangoBolsa(config, s, bolsa) {
  const centro = capacidadConBolsa(config, s, bolsa);
  const [smin, smax] = s.rangos.soporte_gratuito;
  const por_soporte = [smin, 1.0, s.soporte_gratuito, smax].filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => a - b).map((x) => { const c = capacidadConBolsa(config, { ...s, soporte_gratuito: x }, bolsa); return { soporte_gratuito: x, restaurantes: c.restaurantes, comensales_mes: c.comensales_mes }; });
  const rs = por_soporte.map((x) => x.restaurantes);
  return { bolsa, centro: { restaurantes: centro.restaurantes, comensales_mes: centro.comensales_mes, escalon: centro.escalon }, minimo: Math.min(...rs), maximo: Math.max(...rs), por_soporte, vale_con_canal_de_eventos: true, caben_con_el_sondeo_de_hoy: s.escalones.find((e) => e.id === 'hobby_sondeo').cap_cpu, no_modelado: NO_MODELADO };
}

// ---------------------------------------------------------------- el precio de Master Chef: qué decide y qué no
/**
 * Margen de operación al mes (n registrados, anuncios en marcha) de cada precio candidato de Master Chef bajo otra mediana o
 * sigma de la curva de pago `curva`, para ver QUÉ DECIDE el precio: la curva es supuesto, así que el modelo no puede elegir entre
 * 199, 225, 249 y 299; lo decide la prueba de precios del piloto. Devuelve filas por mediana y por sigma con el precio ganador
 * entre los candidatos, el margen y el óptimo continuo.
 */
export function sensibilidadPrecio(config, s, n = 1000, opc = {}) {
  const curva = opc.curva ?? 'media';
  const precios = opc.precios ?? s.precios_candidatos.servicio;
  const medianas = opc.medianas ?? [150, 225, 300, 450];
  const sigmas = opc.sigmas ?? [0.3, 0.45, s.curvas_pago[curva].sigma, 0.9];
  const con = (cambio) => ({ ...s, curvas_pago: { ...s.curvas_pago, [curva]: { ...s.curvas_pago[curva], ...cambio } } });
  const fila = (ss, etiqueta, valor) => {
    const margenes = precios.map((p) => { const c = JSON.parse(JSON.stringify(config)); c.precios.servicio = p; const e = evaluar(c, ss, n, { curva }); return { precio: p, margen_operacion: e.margen_operacion, pagantes: e.clientes.servicio }; });
    const g = margenes.reduce((a, b) => (b.margen_operacion > a.margen_operacion ? b : a));
    return { [etiqueta]: valor, margenes, precio_ganador: g.precio, optimo_continuo: precioOptimo(curva, ss).precio, ventaja_del_ganador_sobre_225: g.margen_operacion - margenes.find((x) => x.precio === config.precios.servicio).margen_operacion };
  };
  const base = s.curvas_pago[curva];
  return {
    n, curva, precios, base: { mediana: base.mediana, sigma: base.sigma, techo: base.techo },
    por_mediana: medianas.map((x) => fila(con({ mediana: x }), 'mediana', x)),
    por_sigma: sigmas.map((x) => fila(con({ sigma: x }), 'sigma', x)),
    lectura: 'con la mediana en 225 (el supuesto) el óptimo sale cerca de 225: el modelo devuelve su supuesto. Si la mediana real es otra, gana otro precio: lo decide la prueba de tres precios del piloto, no este modelo.',
  };
}

// ---------------------------------------------------------------- escenarios con nombre
/**
 * peor_firme = peor_sin_anuncios = todos gratuitos MIENTRAS NO HAY ANUNCIOS (temporal; lo pone Calvin). Los `peor_anuncios_*` son
 * el mismo caso con anuncios (tarifa baja · adverso: mitad de tarifa y 30 % de visitas · tarifa media). Se conservan los nombres antiguos.
 */
export function escenarios(config, s, ns = [100, 1000, 10000]) {
  const casos = CASOS_ANUNCIOS(s);
  return ns.map((n) => {
    const peor_firme = evaluarTodosGratuitos(config, s, n, null);
    return {
      n,
      peor_firme, peor_sin_anuncios: peor_firme,
      peor_anuncios_tarifa_baja: evaluarTodosGratuitos(config, s, n, casos.baja),
      peor_anuncios_tarifa_media: evaluarTodosGratuitos(config, s, n, casos.medio),
      peor_anuncios_adversos: evaluarTodosGratuitos(config, s, n, casos.adverso),
      mejor: evaluar(config, s, n, { todosPagan: true }),
      esperado: {
        pesimista: evaluar(config, s, n, { curva: 'pesimista' }),
        media: evaluar(config, s, n, { curva: 'media' }),
        optimista: evaluar(config, s, n, { curva: 'optimista' }),
      },
    };
  });
}

// ---------------------------------------------------------------- resumen: recomendado, peor y mejor en cada cifra
/**
 * Para CADA cifra del informe: el valor recomendado, el peor y el mejor, con la definición de cada caso en una línea.
 * Casos: recomendado = curva media, anuncios (tarifa baja) ya en marcha; peor = curva pesimista, todavía sin anuncios (temporal);
 * mejor = curva optimista y tarifa de anuncios media. `n` = restaurantes registrados.
 */
export function resumen(config, s, n = 1000) {
  const rec = evaluarEscenario('recomendado', config, s, n);
  const peor = evaluarEscenario('peor', config, s, n);
  const mejor = evaluarEscenario('mejor', config, s, n);
  const piso = evaluarEscenario('piso_de_verdad', config, s, n);
  // la misma cuenta que `recursos`: el menor de los recursos con la carga por topes (una sola fuente de la capacidad)
  const cap = (id, cfg = config) => { const canal = id === 'hobby_sondeo' ? 'sondeo' : 'eventos'; const tt = topesDeTamano(cfg, s, id, canal, 'topes'); return Math.min(...RECURSOS.filter((r) => r !== 'fotos').map((r) => tt[r]).filter((x) => typeof x === 'number')); };
  const fila = (clave, nombre, unidad, r, p, m, nota, pv) => ({ clave, nombre, unidad, recomendado: r, peor: p, mejor: m, piso_de_verdad: pv, nota });
  return {
    n,
    definiciones: { ...Object.fromEntries(Object.entries(ESCENARIOS).map(([k, v]) => [k, v.definicion])), nota: 'el techo teórico «todos pagan» va aparte, en `todos_pagan`' },
    cifras: [
      fila('clientes_potenciales', 'Clientes potenciales', 'negocios', s.sam_clientes_potenciales, s.sam_clientes_potenciales, s.sam_clientes_potenciales, 'dato medido (DENUE 05/2026): no varía con los escenarios', s.sam_clientes_potenciales),
      fila('restaurantes_que_caben', 'Restaurantes registrados que caben, con la mezcla de gratuitos y de paga (con historial del gratuito de ' + (efectosPalancas(config, s).historial_gratuito_meses ?? config.topes.gratuito.meses_en_linea) + ' mes: PROPUESTA, hoy nada purga)', 'restaurantes', cap('hobby_eventos'), cap('hobby_sondeo'), cap('pro_8'), 'con el historial del gratuito que dice `config` (30 días es una propuesta que contradice 03 §7); recomendado = Hobby con avisos; peor = Hobby con sondeo; mejor = Pro de 8 procesos; cada uno es el menor de los recursos con la carga por topes (la misma cuenta de `recursos`)', cap('hobby_sondeo')),
      fila('restaurantes_que_caben_sin_purga', 'Restaurantes registrados que caben SIN purga (12 meses de historial acumulado), con la mezcla de gratuitos y de paga', 'restaurantes', cap('hobby_eventos', conHistorialGratuito(config, s, 12)), cap('hobby_sondeo', conHistorialGratuito(config, s, 12)), cap('pro_8', conHistorialGratuito(config, s, 12)), 'lo que hay hoy: nada limpia; el disco manda desde el segundo mes de operación', cap('hobby_sondeo', conHistorialGratuito(config, s, 12))),
      fila('gratuitos_por_cliente_de_paga', 'Gratuitos que sostiene cada cliente de paga (sin anuncios)', 'restaurantes', rec.gratuitos_que_sostiene_un_pagante_sin_anuncios, peor.gratuitos_que_sostiene_un_pagante_sin_anuncios, mejor.gratuitos_que_sostiene_un_pagante_sin_anuncios, 'con anuncios en marcha cada gratuito se paga solo si deja más de lo que cuesta (`se_paga_solo`)', piso.gratuitos_que_sostiene_un_pagante_sin_anuncios),
      fila('ingreso_por_cliente_gratuito', 'Ingreso por cliente gratuito', 'pesos al mes', rec.por_cliente.ingreso_gratuito, peor.por_cliente.ingreso_gratuito, mejor.por_cliente.ingreso_gratuito, 'sólo anuncios', piso.por_cliente.ingreso_gratuito),
      fila('ingreso_por_cliente_de_paga', 'Ingreso por cliente de paga', 'pesos al mes', rec.por_cliente.ingreso_por_pagante, peor.por_cliente.ingreso_por_pagante, mejor.por_cliente.ingreso_por_pagante, 'promedio entre Master Chef y Chef Ejecutivo según cuántos hay de cada uno', piso.por_cliente.ingreso_por_pagante),
      fila('costo_por_cliente_gratuito', 'Costo por cliente gratuito', 'pesos al mes', rec.por_cliente.costo_gratuito, peor.por_cliente.costo_gratuito, mejor.por_cliente.costo_gratuito, 'servidor, almacenamiento y soporte', piso.por_cliente.costo_gratuito),
      fila('margen_de_operacion', 'Margen de operación', 'pesos al mes', rec.margen_operacion, peor.margen_operacion, mejor.margen_operacion, 'sin captación ni sueldos', piso.margen_operacion),
      fila('margen_despues_de_captacion', 'Margen después de captación', 'pesos al mes', rec.margen_despues_de_captacion, peor.margen_despues_de_captacion, mejor.margen_despues_de_captacion, 'resta reponer las bajas y los sueldos (parámetros sin dato)', piso.margen_despues_de_captacion),
      fila('punto_de_equilibrio', 'Punto de equilibrio', 'clientes de paga', rec.equilibrio_pagantes, peor.equilibrio_pagantes, mejor.equilibrio_pagantes, 'cuántos clientes de paga hacen falta para no perder (el peor caso lo calcula sin anuncios)', piso.equilibrio_pagantes),
      fila('comensales_al_mes', 'Comensales al mes', 'comensales', rec.comensales_mes, peor.comensales_mes, mejor.comensales_mes, 'dato por restaurante SIMULADO (perfiles del simulador), no medido', piso.comensales_mes),
    ],
    todos_pagan: { definicion: 'techo teórico: todos los registrados pagan su plan (muy improbable)', margen_operacion: evaluar(config, s, n, { todosPagan: true }).margen_operacion, ingresos: evaluar(config, s, n, { todosPagan: true }).ingresos.total },
  };
}

// ---------------------------------------------------------------- recursos y palancas (ronda 5)
const PROCESOS = { hobby_sondeo: 2, hobby_eventos: 2, pro_2: 2, pro_4: 4, pro_8: 8 };
const NOMBRE_TAMANO = { hobby_sondeo: 'Hoy: Hobby, 2 procesos, el teléfono pregunta cada 3 s', hobby_eventos: 'Hobby, 2 procesos, con avisos en vez de preguntas (Fase 3)', pro_2: 'Pro, 2 procesos, con avisos', pro_4: 'Pro, 4 procesos, con avisos', pro_8: 'Pro, 8 procesos, con avisos' };

/** Cuántos restaurantes (gratuitos típicos) aguanta cada recurso en un tamaño de servidor; null = no aplica. */
/**
 * La carga de un restaurante registrado, según `carga`:
 *  - 'tipica': el «gratuito típico» de las rondas anteriores (1,800 visitas al mes, la mezcla del simulador y 4.7 líneas abiertas);
 *  - 'topes' (por omisión): sale de `config.topes`. Visitas al mes = mesas × 180 [supuesto del simulador: 1,800 visitas con 10 mesas];
 *    el procesador crece en proporción a las visitas (SUPUESTO; el costo por petición es medido); líneas del personal = cuentas, y del
 *    comensal por mesa (calibradas para que 10 mesas y 3 cuentas den las 4.7 líneas típicas: supuesto); disco = el perfil chico escalado
 *    por las visitas + los platillos del tope × `bytes_en_la_base` (MEDIDO); y la mezcla de gratuitos y de paga sale de lo que rebasa los topes.
 */
export function perfilDeCarga(config, s, carga = 'topes') {
  const ef = efectosPalancas(config, s);
  const lineasTipicas = (s.lineas_max_railway / s.cap_conexiones) * ef.lineas_factor;
  if (carga === 'tipica') return { carga, visitas_mes: s.visitas_mes_gratuito, carga_cpu: 1, mb_por_restaurante: mbPorRestaurante('gratuito', config, s), lineas_por_restaurante: lineasTipicas, parte_de_paga: 0, platillos: null, gb_fotos_por_restaurante: null };
  const g = config.topes.gratuito;
  const pt = s.perfil_por_topes;
  const pl = s.platillo;
  const visitas = g.mesas * pt.visitas_por_mesa_mes;
  const ratio = visitas / s.visitas_mes_gratuito;
  const d = s.disco_perfiles.chico;
  const hg = ef.historial_gratuito_meses;
  const mv = Math.min(hg ?? g.meses_en_linea, ef.meses_paga_en_linea ?? Infinity);
  const me = hg ?? config.disco.meses_analitica_en_linea.gratuito;
  const bp = pl.bytes_en_la_base / 1e6;
  const mbFijo = d.mb_fijo - pl.platillos_del_perfil_chico * bp + (g.platillos ?? 0) * bp;
  const mbG = mbFijo + ratio * (mv * d.mb_mes_visitas + me * d.mb_mes_eventos * ef.eventos_disco);
  const lineasComensalPorMesa = (lineasTipicas / ef.lineas_factor - pt.cuentas_perfil_tipico * pt.lineas_staff_por_cuenta) / pt.mesas_perfil_tipico;
  const lineasG = (g.cuentas * pt.lineas_staff_por_cuenta + g.mesas * lineasComensalPorMesa) * ef.lineas_factor;
  const ev = evaluar(config, s, 1000, { curva: config.curva ?? 'media' });
  const q = config.parte_de_paga_fija ?? ev.clientes.de_paga / 1000; // `parte_de_paga_fija` fija la mezcla para aislar un efecto (costoDePlatillo)
  const mbP = mbPorRestaurante('servicio', config, s);
  const gbFoto = (platillos) => (platillos * pl.parte_con_foto * (pl.foto_original_bytes_tipico + pl.foto_variantes_bytes_real)) / 1e9;
  const gbG = gbFoto(g.platillos ?? 0);
  const gbP = gbFoto(config.topes.servicio.platillos ?? 0);
  return {
    carga, visitas_mes: visitas, razon_de_visitas: ratio, parte_de_paga: q, platillos: g.platillos,
    carga_cpu: (1 - q) * ratio + q * s.peso_servicio_cpu,
    mb_por_restaurante: (1 - q) * mbG + q * mbP, mb_gratuito: mbG, mb_paga: mbP,
    desglose_gratuito: { fijo: mbFijo, sesiones_y_ordenes: ratio * mv * d.mb_mes_visitas, analitica: ratio * me * d.mb_mes_eventos * ef.eventos_disco },
    desglose_paga: desglosePorRestaurante('servicio', config, s),
    lineas_por_restaurante: (1 - q) * lineasG + q * lineasTipicas * s.peso_servicio_cpu,
    lineas_gratuito: lineasG, lineas_comensal_por_mesa: lineasComensalPorMesa,
    gb_fotos_por_restaurante: (1 - q) * gbG + q * gbP, gb_fotos_gratuito: gbG,
  };
}

/** Cuántos restaurantes REGISTRADOS (con la carga que dicen los topes, o el gratuito típico) aguanta cada recurso en un tamaño de servidor; null = no aplica. */
export function topesDeTamano(config, s, id, canal = null, carga = 'topes') {
  canal = canal ?? (id === 'hobby_sondeo' ? 'sondeo' : 'eventos');
  if (canal === 'eventos' && id === 'hobby_sondeo') id = 'hobby_eventos';
  const e = s.escalones.find((x) => x.id === id);
  const eSondeo = s.escalones.find((x) => x.id === 'hobby_sondeo');
  const eEventos = s.escalones.find((x) => x.id === 'hobby_eventos');
  const ef = efectosPalancas(config, s);
  const sondeo = canal === 'sondeo';
  const procesos = PROCESOS[id];
  const pf = perfilDeCarga(config, s, carga);
  const mb = pf.mb_por_restaurante;
  const lineasPorRest = pf.lineas_por_restaurante;
  const razonSondeo = eSondeo.cap_cpu / eEventos.cap_cpu; // lo que rinde el mismo servidor preguntando cada 3 s frente a avisos (medido en local, ±2×)
  const capCpu = sondeo ? (id === 'hobby_eventos' || id === 'hobby_sondeo' ? eSondeo.cap_cpu : e.cap_cpu * razonSondeo) * ef.cap_cpu_sondeo : e.cap_cpu;
  // armar el menú (caché de 30 s) cuesta ms por platillo: en unidades de carga (un núcleo al 70 % rinde `capCpu` unidades por `procesos` núcleos)
  const msMenu = s.platillo.ms_armar_menu_base + s.platillo.ms_armar_menu_por_platillo * (config.topes.gratuito.platillos ?? 0);
  const menuUnidades = carga === 'tipica' ? 0 : ((msMenu / 1000 / s.platillo.armado_cada_segundos) * capCpu) / (procesos * (s.banderas.cpu.accion / 100));
  const cargaCpuTotal = pf.carga_cpu + menuUnidades;
  const procesador = Math.floor(capCpu / cargaCpuTotal);
  const disco = Math.floor((e.volumen_gb * 1000 * (1 - s.reserva_disco) - s.base_vacia_mb) / mb);
  const lineas = sondeo ? null : Math.floor(s.lineas_max_railway / lineasPorRest);
  const rpsPorRest = cargaCpuTotal * (s.peticiones_por_segundo_tope_sondeo / eSondeo.cap_cpu) * (sondeo ? 1 / ef.cap_cpu_sondeo : eSondeo.cap_cpu / eEventos.cap_cpu);
  const conexionesPorRest = (rpsPorRest * s.ms_conexion_por_peticion) / 1000;
  const piscina = procesos * ef.pool_por_worker;
  const usables = Math.min(piscina, s.pg_max_conexiones - 10);
  const conexiones_bd = Math.floor(usables / conexionesPorRest);
  const memPorRest = s.mb_por_restaurante_sondeo + (sondeo ? 0 : lineasPorRest * s.mb_por_linea_abierta);
  const memoria = Math.floor((s.ram_max_servicio_mb - procesos * s.rss_worker_mb) / memPorRest);
  const fotos_gratis = pf.gb_fotos_por_restaurante ? Math.floor(s.r2_gratis_gb / pf.gb_fotos_por_restaurante) : null; // R2 no es un tope: pasarse cuesta centavos
  return { id, procesos, carga, carga_cpu: pf.carga_cpu, carga_cpu_total: cargaCpuTotal, menu_en_unidades_de_carga: menuUnidades, parte_de_paga: pf.parte_de_paga, mb_por_restaurante: mb, lineas_por_restaurante: sondeo ? 0 : lineasPorRest, procesador, memoria, disco, conexiones_bd, lineas, fotos: null, fotos_gratis_en_r2: fotos_gratis, gb_fotos_por_restaurante: pf.gb_fotos_por_restaurante, conexiones_por_restaurante: conexionesPorRest, pool_total: piscina, supera_postgres: piscina > s.pg_max_conexiones, memoria_mb_a_tope: procesos * s.rss_worker_mb + Math.min(procesador, disco) * memPorRest };
}

/**
 * Copia de `config` con el historial del plan gratuito en `meses` (visitas y analítica en línea). `meses` = número o '03§7' (lo que dice
 * 03_Datos_v1 §7 sin distinguir por plan: 24 meses de sesiones y comandas y 13 de analítica). Si `config.palancas` trae
 * 'historial_gratuito_30_dias', la palanca manda (1 mes).
 */
export function conHistorialGratuito(config, s, meses) {
  if (efectosPalancas(config, s).historial_gratuito_meses != null) return config;
  const c = JSON.parse(JSON.stringify(config));
  if (meses === '03§7') { c.topes.gratuito.meses_en_linea = s.historial_03_7.visitas_meses; c.disco.meses_analitica_en_linea.gratuito = s.historial_03_7.analitica_meses; }
  else { c.topes.gratuito.meses_en_linea = meses; c.disco.meses_analitica_en_linea.gratuito = meses; }
  return c;
}

const RECURSOS = ['procesador', 'memoria', 'disco', 'conexiones_bd', 'lineas', 'fotos'];
const NOMBRE_RECURSO = { procesador: 'Procesador (el trabajo de la API)', memoria: 'Memoria de la API', disco: 'Disco de la base de datos', conexiones_bd: 'Conexiones a la base de datos', lineas: 'Líneas abiertas con los teléfonos', fotos: 'Almacenamiento de fotos y respaldos (R2)' };

const PRIORIDAD_EMPATE = ['lineas', 'disco', 'conexiones_bd', 'memoria', 'procesador'];
export const minimoDe = (t) => { const c = RECURSOS.filter((r) => t[r] != null).map((r) => [r, t[r]]); return c.sort((a, b) => a[1] - b[1] || PRIORIDAD_EMPATE.indexOf(a[0]) - PRIORIDAD_EMPATE.indexOf(b[0]))[0]; };

/**
 * Los seis recursos, qué pagamos hoy, el cuello de botella (hoy con el sondeo de 3 s y con eventos), las palancas y la escalera de
 * tamaños del servidor. `estado`: { tamano: 'hobby_sondeo' (el que se paga hoy), tamano_eventos: 'hobby_eventos' }. Las palancas de
 * `config.palancas` ya están aplicadas a lo que devuelve; cada palanca trae antes → después contra `config` sin ella.
 */
export function recursos(config, s, estado = {}) {
  const carga = estado.carga ?? 'topes'; // 'topes': la carga sale de config.topes; 'tipica': el gratuito típico de 1,800 visitas
  const idHoy = estado.tamano ?? 'hobby_sondeo';
  const idEv = estado.tamano_eventos ?? 'hobby_eventos';
  // «hoy» = lo que hay: NADA purga (planes-y-costo; 03 §7 da 13 y 24 meses sin distinguir por plan). El disco depende de cuántos meses de
  // historial haya acumulado el restaurante: por defecto 12 («un año de operación sin purga»); la curva completa va en `disco_por_historial`.
  const mesesH = estado.meses_historial ?? 12;
  const cfg0 = config;
  config = conHistorialGratuito(cfg0, s, mesesH);
  const hoy = topesDeTamano(config, s, idHoy, null, carga);
  const ev = topesDeTamano(config, s, idEv, null, carga);
  const cfg30 = conHistorialGratuito({ ...cfg0, palancas: [...new Set([...(cfg0.palancas ?? []), 'historial_gratuito_30_dias'])] }, s, mesesH);
  const hoy30 = topesDeTamano(cfg30, s, idHoy, null, carga);
  const ev30 = topesDeTamano(cfg30, s, idEv, null, carga);
  const [cuelloHoy] = minimoDe(hoy);
  const [cuelloEv] = minimoDe(ev);
  const mesEventos = s.comensales_dia_gratuito * 30;
  const eHoy = s.escalones.find((x) => x.id === idHoy);
  const eEv = s.escalones.find((x) => x.id === idEv);
  const mbG = hoy.mb_por_restaurante;
  const gb = (r) => r ?? null;
  const consumo = {
    procesador: { unidad: 'ms de CPU por visita', valor: null, nota: `1 gratuito típico = 1 unidad de carga; un cliente de paga pesa ${s.peso_servicio_cpu}; con el sondeo un teléfono pregunta cada 3 s (≈ ${n(s.peticiones_por_segundo_tope_sondeo / eHoy.cap_cpu, 1)} peticiones/s por restaurante registrado, medido en el tope)` },
    memoria: { unidad: 'MB por restaurante', sondeo: s.mb_por_restaurante_sondeo, eventos: s.mb_por_restaurante_sondeo + ev.lineas_por_restaurante * s.mb_por_linea_abierta, fijo_mb: `${s.rss_worker_mb} MB por proceso en reposo`, medido: 'el proceso y la línea abierta, medido; el resto, supuesto' },
    disco: { unidad: 'MB al mes por restaurante gratuito típico', valor: mbG, bytes_por_evento: s.bytes_por_evento.hoy, medido: true },
    conexiones_bd: { unidad: 'conexiones de la base a la vez por restaurante registrado', sondeo: hoy.conexiones_por_restaurante, eventos: ev.conexiones_por_restaurante, nota: `cada petición retiene una conexión ≈ ${s.ms_conexion_por_peticion} ms` },
    lineas: { unidad: 'líneas abiertas por restaurante en la hora pico', valor: ev.lineas_por_restaurante, nota: `${s.lineas_max_railway} ÷ ${s.cap_conexiones} restaurantes típicos (la relación del simulador de capacidad)` },
    fotos: { unidad: 'GB por restaurante', valor: s.r2_gb_gratuito, nota: `${s.r2_gratis_gb} GB gratis y luego ${s.r2_usd_gb_mes} USD por GB-mes` },
  };
  const comoFunciona = {
    procesador: 'Cada teléfono con la app abierta le pregunta al servidor cada 3 segundos si algo cambió; casi siempre la respuesta es «nada nuevo», pero cada pregunta gasta procesador. Con los avisos de la Fase 3, el servidor sólo habla cuando hay un cambio. Ruta: `app/api/publico/sesion.py` (estado con ETag) y `app/services/sesion.py`.',
    memoria: 'Cada proceso de la API guarda en memoria el menú y el estado de las mesas por unos segundos, y (con avisos) una línea por cada teléfono conectado. Ruta: `app/services/{cache_menu,menu_publico,sesion}.py`.',
    disco: 'Cada visita deja filas en `sesion_grupal`, `miembro_sesion`, `orden_personal`, `item_orden`, `comanda`, `comanda_orden` y `llamada_mesero`, y **diez filas de analítica en `evento_analitica`**; las tablas y sus índices viven en el volumen de PostgreSQL. Ruta: `app/db/models.py`; analítica en `app/services/analitica.py`.',
    conexiones_bd: 'Cada petición pide prestada una conexión a la base del grupo de su proceso (`DB_POOL_SIZE` 10 y `DB_MAX_OVERFLOW` 10) y la devuelve en milisegundos. Con avisos, cada proceso mantiene además una conexión fija para escuchar a la base. Ruta: `app/db/database.py`.',
    lineas: 'Con los avisos (ADR-018, Fase 3) cada teléfono mantiene una conexión abierta con el servidor; Railway permite unas 10,000 abiertas a la vez. Hoy no existen. Ruta futura: `/p/sesion/eventos` y `/op/eventos` (T-3.20 y T-3.21).',
    fotos: 'Las fotos de los platillos y los respaldos diarios de la base viven en R2 (almacenamiento tipo S3 de Cloudflare); la API sólo guarda la dirección. Ruta: `app/services/assets.py`.',
  };
  const tablero = palancasEnTablero(cfg0, s, s.umbral_tablero, carga);
  const evaluarPalanca = (id) => {
    const pl = PALANCAS[id];
    const r = pl.recurso;
    const quita = (c) => ({ ...c, palancas: (c.palancas ?? []).filter((x) => x !== id) });
    const pon = (c) => ({ ...c, palancas: [...new Set([...(c.palancas ?? []), id])] });
    const base = conHistorialGratuito(quita(cfg0), s, mesesH);
    const con = conHistorialGratuito(pon(cfg0), s, mesesH);
    const a = { h: topesDeTamano(base, s, idHoy, null, carga), e: topesDeTamano(base, s, idEv, null, carga) };
    const d = { h: topesDeTamano(con, s, idHoy, null, carga), e: topesDeTamano(con, s, idEv, null, carga) };
    // la misma palanca evaluada sobre la base «ya con el historial del gratuito a 30 días»
    const b30 = conHistorialGratuito({ ...quita(cfg0), palancas: [...(quita(cfg0).palancas ?? []), 'historial_gratuito_30_dias'] }, s, mesesH);
    const c30 = conHistorialGratuito({ ...pon(cfg0), palancas: [...(pon(cfg0).palancas ?? []), 'historial_gratuito_30_dias'] }, s, mesesH);
    const a30 = topesDeTamano(b30, s, idEv, null, carga);
    const d30 = topesDeTamano(c30, s, idEv, null, carga);
    const fila = { id, nombre: pl.nombre, en_tablero: tablero.palancas[id].en_tablero, ganancia_de_capacidad: tablero.palancas[id].ganancia_maxima, accion: pl.accion, que_es: pl.que_es, esfuerzo: pl.esfuerzo, riesgo: pl.riesgo, regla_que_toca: pl.regla_que_toca, medido: pl.medido };
    if (id === 'purga_claves_idempotencia') {
      const mbMes = (s.visitas_mes_gratuito * s.claves_idempotencia_por_visita * s.idempotencia_bytes_por_fila) / 1e6;
      return { ...fila, antes: `${n(mbMes, 1)} MB al mes por restaurante, sin tope (la tabla crece mientras nadie la purgue; hoy está vacía: ningún servicio la usa)`, despues: `${n(mbMes / 30, 2)} MB constantes (un día)`, ganancia: `evita ${n(mbMes * 12, 0)} MB por restaurante al año; no cambia los restaurantes que caben hoy porque la tabla está vacía hasta la Fase 3`, ganancia_restaurantes: 0, mb_antes: mbMes, mb_despues: mbMes / 30 };
    }
    const k = r === 'disco' ? 'disco' : r;
    const dif = (x, y) => (x == null || y == null ? null : y - x);
    const sig = { ...fila, mb_por_restaurante_antes: a.h.mb_por_restaurante, mb_por_restaurante_despues: d.h.mb_por_restaurante, restaurantes_antes: { hoy: a.h[k], con_eventos: a.e[k] }, restaurantes_despues: { hoy: d.h[k], con_eventos: d.e[k] }, ganancia_restaurantes: { hoy: dif(a.h[k], d.h[k]), con_eventos: dif(a.e[k], d.e[k]) } };
    sig.sobre_historial_30_dias = r === 'disco' ? { restaurantes_antes: a30.disco, restaurantes_despues: d30.disco, ganancia: d30.disco - a30.disco } : null;
    sig.antes = r === 'disco' ? `${n(a.h.mb_por_restaurante, 1)} MB por restaurante · caben ${a.e.disco}` : `caben ${a.h[k] ?? a.e[k]}`;
    sig.despues = r === 'disco' ? `${n(d.h.mb_por_restaurante, 1)} MB por restaurante · caben ${d.e.disco}` : `caben ${d.h[k] ?? d.e[k]}`;
    sig.ganancia = r === 'disco' ? `${n(a.h.mb_por_restaurante - d.h.mb_por_restaurante, 1)} MB menos por restaurante (acumulados con el historial supuesto); caben ${d.e.disco - a.e.disco >= 0 ? '+' : ''}${d.e.disco - a.e.disco} restaurantes en el mismo disco` : r === 'procesador' ? `caben +${d.h.procesador - a.h.procesador} restaurantes con el sondeo de hoy` : r === 'lineas' ? `caben +${d.e.lineas - a.e.lineas} restaurantes antes de topar las 10,000 líneas` : `evita pasarse de las ${s.pg_max_conexiones} conexiones de la base con más procesos (${d.h.supera_postgres ? 'aún las pasa' : 'ya no'})`;
    return sig;
  };
  const porRecurso = (r) => Object.keys(PALANCAS).filter((id) => PALANCAS[id].recurso === r).map(evaluarPalanca);
  const limiteTexto = (t, r, e) => (t[r] == null ? 'no aplica' : `${t[r].toLocaleString('en-US')} restaurantes`);
  const lista = RECURSOS.map((r) => ({
    recurso: r,
    nombre: NOMBRE_RECURSO[r],
    como_funciona: comoFunciona[r],
    consumo_por_restaurante: consumo[r],
    limite_hoy: { restaurantes: hoy[r], texto: r === 'fotos' ? `sin tope práctico: ${s.r2_gratis_gb} GB gratis (≈ ${Math.floor(s.r2_gratis_gb / s.r2_gb_gratuito)} gratuitos) y después ${n(s.r2_gb_gratuito * s.r2_usd_gb_mes * s.fx, 3)} pesos por restaurante al mes` : limiteTexto(hoy, r) + ` (${eHoy.nombre})` },
    restaurantes_hoy: hoy[r],
    restaurantes_con_eventos: ev[r],
    con_historial_30_dias: { restaurantes_hoy: hoy30[r], restaurantes_con_eventos: ev30[r], es_cuello_hoy: r === minimoDe(hoy30)[0], es_cuello_con_eventos: r === minimoDe(ev30)[0], nota: 'si el gratuito guarda sólo 30 días (PROPUESTA que contradice 03 §7: hoy nada purga)' },
    comensales_mes_hoy: hoy[r] == null ? null : hoy[r] * mesEventos,
    comensales_mes_con_eventos: ev[r] == null ? null : ev[r] * mesEventos,
    es_cuello_hoy: r === cuelloHoy,
    es_cuello_con_eventos: r === cuelloEv,
    medido: { procesador: 'medido en local (±2×); falta medir en Railway: no se sabe cuántos núcleos entrega Hobby', memoria: 'proceso y línea medidos; el resto supuesto', disco: 'medido con datos sintéticos en PostgreSQL local (10 restaurantes medianos, un mes); depende de los meses de historial que se guarden (hoy nada purga)', conexiones_bd: 'estimada: falta `SHOW max_connections` en Railway', lineas: 'TOPE DE DISEÑO SUPUESTO, sin medir: 10,000 conexiones de Railway (documentación, «subject to change») ÷ 4.7 líneas por restaurante (relación del simulador de capacidad); el consumo por línea sí se midió en local', fotos: 'documento (mapa de procesos) y precio de Cloudflare' }[r],
    palancas: porRecurso(r),
  }));
  const escalera = Object.keys(PROCESOS).map((id) => {
    const e = s.escalones.find((x) => x.id === id);
    const t = topesDeTamano(config, s, id, null, carga);
    const [muro, cabe] = minimoDe(t);
    const t30 = topesDeTamano(cfg30, s, id, null, carga);
    const [muro30, cabe30] = minimoDe(t30);
    return { restaurantes_con_historial_30_dias: cabe30, recurso_que_obliga_a_subir_con_historial_30_dias: muro30, id, tamano: NOMBRE_TAMANO[id], procesos: t.procesos, disco_gb: e.volumen_gb, costo_usd_base: e.base_usd, costo_usd_con_carga: e.tope_usd, costo_pesos_base: e.base_usd * s.fx, restaurantes_que_caben: cabe, recurso_que_obliga_a_subir: muro, por_recurso: Object.fromEntries(RECURSOS.map((r) => [r, t[r]])), supera_postgres: t.supera_postgres };
  });
  // escalera DINÁMICA para el estado elegido: canal ('sondeo' | 'eventos'), meses de historial del gratuito y palancas de config.palancas
  const canalE = estado.canal ?? 'sondeo';
  const ids = ['hobby_eventos', 'pro_2', 'pro_4', 'pro_8'];
  const nombresTam = { hobby_eventos: 'Hobby (el que pagamos hoy): 2 procesos, 5 GB', pro_2: 'Pro, 2 procesos, 50 GB', pro_4: 'Pro, 4 procesos, 50 GB', pro_8: 'Pro, 8 procesos, 50 GB' };
  const escaleraEstado = ids.map((id) => {
    const e = s.escalones.find((x) => x.id === id);
    const t = topesDeTamano(config, s, id, canalE, carga);
    const [muro, cabe] = minimoDe(t);
    return { id, tamano: nombresTam[id], procesos: t.procesos, disco_gb: e.volumen_gb, costo_usd_base: e.base_usd, costo_usd_con_carga: e.tope_usd, restaurantes_que_caben: cabe, recurso_que_obliga_a_subir: muro, por_recurso: Object.fromEntries(RECURSOS.map((r) => [r, t[r]])), supera_postgres: t.supera_postgres };
  });
  const ultimoE = escaleraEstado[escaleraEstado.length - 1];
  escaleraEstado.push({ id: 'otra_pila', tamano: 'Una segunda copia de toda la pila (extrapolación sin medir)', procesos: 16, costo_usd_base: null, costo_usd_con_carga: s.escalones.at(-1).tope_usd + s.instancia_extra_usd, restaurantes_que_caben: ultimoE.restaurantes_que_caben * 2, recurso_que_obliga_a_subir: ultimoE.recurso_que_obliga_a_subir, extrapolacion_sin_medir: true });
  const ultimo = escalera[escalera.length - 1];
  escalera.push({ id: 'otra_pila', tamano: 'Una segunda copia de toda la pila (extrapolación sin medir)', procesos: 16, costo_usd_base: null, costo_usd_con_carga: s.escalones.at(-1).tope_usd + s.instancia_extra_usd, restaurantes_que_caben: ultimo.restaurantes_que_caben * 2, recurso_que_obliga_a_subir: 'líneas abiertas', extrapolacion_sin_medir: true });
  const railway = 8.1;
  const dominio = s.dominio_usd_anio / 12;
  // la curva del disco según los meses de historial que acumule el gratuito, y desde qué mes manda el disco
  const meses = [1, 3, 6, 12, '03§7'];
  const procHoy = topesDeTamano(cfg0, s, idHoy, null, carga).procesador;
  const procEv = topesDeTamano(cfg0, s, idEv, null, carga).procesador;
  const curvaDisco = meses.map((mm) => {
    const c = conHistorialGratuito({ ...cfg0, palancas: (cfg0.palancas ?? []).filter((x) => x !== 'historial_gratuito_30_dias') }, s, mm);
    const th = topesDeTamano(c, s, idHoy, null, carga);
    const te = topesDeTamano(c, s, idEv, null, carga);
    return { meses_historial: mm, etiqueta: mm === '03§7' ? 'lo que dice 03 §7 (24 meses de sesiones y 13 de analítica)' : `${mm} ${mm === 1 ? 'mes' : 'meses'}`, mb_por_restaurante: th.mb_por_restaurante, restaurantes_por_disco: th.disco, cuello_hoy: minimoDe(th)[0], cuello_con_eventos: minimoDe(te)[0], restaurantes_cuello_hoy: minimoDe(th)[1], restaurantes_cuello_con_eventos: minimoDe(te)[1] };
  });
  const primerMesDisco = (cap) => { for (let mm = 1; mm <= 36; mm++) { const c = conHistorialGratuito({ ...cfg0, palancas: [] }, s, mm); if (topesDeTamano(c, s, idHoy, null, carga).disco < cap) return mm; } return null; };
  const caben30 = curvaDisco[0].restaurantes_por_disco;
  const actividad = [0.5, 1, 2].map((f) => ({ factor_de_actividad: f, procesador_hoy: Math.floor(procHoy / f), procesador_con_eventos: Math.floor(procEv / f), disco: Math.floor(hoy.disco / f), disco_con_historial_30_dias: Math.floor(caben30 / f), nota: 'el doble de visitas y de comensales por restaurante divide a la mitad lo que cabe (aproximado: el disco fijo por restaurante es despreciable)' }));
  const pico = { factor: s.factor_pico_simultaneo, procesador_hoy: Math.floor(procHoy * s.factor_pico_simultaneo), procesador_con_eventos: Math.floor(procEv * s.factor_pico_simultaneo), nota: 'si todos los restaurantes están en su hora pico a la vez; factor SUPUESTO (calculado en la revisión de la maestra para el peor caso, sin origen en un documento)' };
  const rango = { factor: s.incertidumbre_procesador, procesador_hoy: [Math.floor(procHoy / s.incertidumbre_procesador), Math.floor(procHoy * s.incertidumbre_procesador)], procesador_con_eventos: [Math.floor(procEv / s.incertidumbre_procesador), Math.floor(procEv * s.incertidumbre_procesador)], nota: '600 peticiones por segundo medidas en local con 2 núcleos (rango 420–600); no se sabe cuántos núcleos entrega Hobby: ±2× hasta medir en Railway' };
  const cond = `procesador (${procHoy}, de ${rango.procesador_hoy[0]} a ${rango.procesador_hoy[1]}) o disco, según cuánto historial se guarde y cuánto rinda el servidor: con historial del gratuito a 30 días el disco aguanta ${caben30} y manda el ${caben30 > procHoy ? 'procesador' : 'disco'}; sin purga manda el disco desde el mes ${primerMesDisco(procHoy)} de operación de un restaurante`;
  return {
    config_palancas: config.palancas ?? [],
    composicion_del_disco: composicionDelDisco(config, s),
    grupos_excluyentes: palancasEnTablero(config, s, s.umbral_tablero, carga).grupos_excluyentes,
    estado_elegido: { canal: canalE, carga, meses_historial: mesesH, palancas: config.palancas ?? [], nota: 'la escalera responde a este estado; ningún parámetro de entrada se modifica' },
    escalera: escaleraEstado,
    definicion_restaurante_tipico: `un gratuito típico = ${s.visitas_mes_gratuito} visitas al mes y ${s.comensales_dia_gratuito} comensales al día (SUPUESTO del simulador, rango ${s.rangos.comensales_dia_gratuito[0]}–${s.rangos.comensales_dia_gratuito[1]}), con la mezcla de tamaños del simulador (60 % chico, 25 % mediano, 5 % grande, 10 % formal)`,
    estado: { meses_historial: mesesH, nota: 'hoy NADA purga; por defecto se supone un restaurante con 12 meses de historial acumulado (sin purga)' },
    disco_por_historial: curvaDisco,
    mes_desde_el_que_manda_el_disco: { con_sondeo: primerMesDisco(procHoy), con_eventos: primerMesDisco(procEv) },
    sensibilidad_actividad: actividad,
    pico_simultaneo: pico,
    rango_procesador: rango,
    cuello_condicional: cond,
    cuello_hoy: { recurso: cuelloHoy, nombre: NOMBRE_RECURSO[cuelloHoy], restaurantes: hoy[cuelloHoy], comensales_mes: hoy[cuelloHoy] * mesEventos, con_historial_30_dias: { recurso: minimoDe(hoy30)[0], restaurantes: minimoDe(hoy30)[1] }, rango_si_es_procesador: rango.procesador_hoy },
    cuello_con_eventos: { recurso: cuelloEv, nombre: NOMBRE_RECURSO[cuelloEv], restaurantes: ev[cuelloEv], comensales_mes: ev[cuelloEv] * mesEventos, con_historial_30_dias: { recurso: minimoDe(ev30)[0], restaurantes: minimoDe(ev30)[1] }, rango_si_es_procesador: rango.procesador_con_eventos },
    hoy: {
      fecha: '2026-11-14',
      servicios: [
        { servicio: 'Railway · api (la aplicación)', plan: 'Hobby (5 USD al mes, incluye 5 USD de uso)', costo_usd_mes: railway, detalle: `factura real ≈ ${railway} USD con la memoria deducida de la factura [documento: anuncios-y-capa-del-comensal §0]; CPU a ${s.precios_railway_usd.cpu_vcpu_mes} USD por vCPU-mes y RAM a ${s.precios_railway_usd.ram_gb_mes} USD por GB-mes [fuente: docs.railway.com, leída 14-nov-2026]`, limites: { procesador: `${PROCESOS[idHoy]} procesos de la API (WORKERS=2); Railway permite hasta 48 vCPU por servicio`, memoria: `hasta ${s.ram_max_servicio_mb / 1000} GB por servicio; hoy ≈ ${PROCESOS[idHoy] * s.rss_worker_mb} MB`, conexiones: `${s.lineas_max_railway} conexiones abiertas a la vez (sin usar hoy)` } },
        { servicio: 'Railway · Postgres (la base de datos, versión 18)', plan: 'Hobby: volumen de 5 GB', costo_usd_mes: null, detalle: `incluido en los ${railway} USD; el volumen cuesta ${s.volumen_usd_gb_mes} USD por GB-mes; Pro sube el volumen a 50 GB (en este modelo)`, limites: { disco: '5 GB (4 GB útiles con la reserva del 20 % para WAL e hinchazón)', conexiones: `≈ ${s.pg_max_conexiones} conexiones [estimada; falta \`SHOW max_connections\`]` } },
        { servicio: 'Railway · respaldo (copia diaria con pg_dump)', plan: 'Hobby', costo_usd_mes: null, detalle: 'trabajo programado; corre unos minutos al día; incluido en la factura de Railway', limites: {} },
        { servicio: 'Cloudflare (DNS, HTTPS y caché del menú)', plan: 'Free', costo_usd_mes: 0, detalle: '[documento: deploy/railway/README.md §Cloudflare, plan Free]; el menú público lo absorbe la caché del borde', limites: { procesador: 'las reglas de tasa del plan Free' } },
        { servicio: 'Cloudflare R2 (fotos y respaldos)', plan: `${s.r2_gratis_gb} GB gratis, después ${s.r2_usd_gb_mes} USD por GB-mes`, costo_usd_mes: 0, detalle: `[fuente: developers.cloudflare.com/r2/pricing, 14-nov-2026]; ≈ ${s.r2_gb_gratuito} GB por gratuito típico: cubre ≈ ${Math.floor(s.r2_gratis_gb / s.r2_gb_gratuito)} gratuitos sin pagar`, limites: { fotos: 'sin tope práctico' } },
        { servicio: 'Dominio carta.cooking', plan: 'anual', costo_usd_mes: dominio, detalle: `${s.dominio_usd_anio} USD al año [documento: dato de Calvin, 13-nov]`, limites: {} },
      ],
      total_usd_mes: railway + dominio,
      total_pesos_mes: (railway + dominio) * s.fx,
      no_incluye: ['Firebase Authentication (plan sin costo hoy; sin dato de límites)', 'API de Claude para leer PDFs (≈ 0.11 a 0.64 USD por lectura [documento: planes-y-costo §0])'],
    },
    recursos: lista,
    escalera_comparada: escalera,
    glosario: {
      piso: `Lo que cuesta atender a un cliente de paga en un mes; es la suma de cuatro cosas: (1) lo que crece con su uso (${s.costo_var_servicio} pesos [documento]), (2) su parte de la base fija del servidor (${s.base_fija_por_restaurante} pesos [documento]), (3) la comisión de la tarjeta con IVA [documento] y (4) el soporte (${s.soporte_servicio} pesos [SUPUESTO]). El precio no debe bajar de 3 veces el piso.`,
      tamano_del_servidor: 'El tamaño del servidor que rentamos en Railway: cuántos procesos de la API corren, cuánta memoria y disco tiene y cuánto cuesta al mes. Sube por escalones (Hobby, Pro de 2, 4 y 8 procesos).',
      cuello_de_botella: 'El recurso que se llena primero. Aunque los demás estén sobrados, el sistema no puede atender más restaurantes que los que aguanta el cuello de botella; para crecer hay que ensanchar ése.',
      linea_abierta: 'Una conexión que el teléfono deja abierta con el servidor para que éste le avise al instante cuando algo cambia (en lugar de preguntar cada 3 segundos). Railway permite unas 10,000 abiertas a la vez.',
    },
  };
}

const n = (x, d = 0) => (x == null ? '—' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));

// ---------------------------------------------------------------- desgloses para pintar (sin texto)
/**
 * Los desgloses de cuatro cifras, para pintarlos como gráficas (n restaurantes registrados, un bloque por escenario con nombre):
 *  (a) `gratuitos_que_sostiene`: lo que deja un cliente de paga ÷ lo que cuesta un gratuito, con los componentes de cada lado;
 *  (b) `embudo_anuncios`: visitas al mes → abren la app → ven un anuncio → tarifa por mil visitas → pesos por gratuito;
 *  (c) `pesos_por_cliente_de_paga`: precio, comisión de tarjeta, soporte, servidor y lo que queda;
 *  (d) `cascada_margen`: ingresos por suscripción y por anuncios menos cada costo, hasta el margen de operación.
 * Todo sale de `evaluarEscenario`; ninguna cifra se escribe a mano.
 */
export function desgloses(config, s, n = 1000) {
  const porEscenario = Object.keys(ESCENARIOS).map((nombre) => {
    const { ss, opc } = paramsEscenario(nombre, s);
    const e = evaluar(config, ss, n, opc);
    const sinAds = opc.sinAnuncios === true;
    const tarifa = sinAds ? 0 : ss.anuncio_pesos_por_mil[opc.anuncios.tarifa];
    const parte = opc.parteVisitasConAnuncio ?? ss.parte_visitas_con_anuncio;
    const comensalesMes = ss.comensales_dia_gratuito * 30;
    const abren = ss.visitas_app_gratuito;
    const ven = abren * parte;
    const pesosAds = (ven * tarifa) / 1000;
    const ps = config.precios.servicio;
    const comision = comisionTarjeta(ps, ss);
    const pc = e.por_cliente;
    const infraPorCarga = e.capacidad.carga_en_gratuitos_tipicos > 0 ? (e.costos.servidor + e.costos.almacenamiento + e.costos.objetos) / e.capacidad.carga_en_gratuitos_tipicos : 0;
    const infraPagante = infraPorCarga * ss.peso_servicio_cpu;
    const sostiene = e.gratuitos_que_sostiene_un_pagante;
    return {
      escenario: nombre,
      definicion: ESCENARIOS[nombre].definicion,
      gratuitos_que_sostiene: {
        pagante: { precio: ps, comision_tarjeta: comision, soporte: ss.soporte_servicio, servidor_y_disco: infraPagante, deja: pc.margen_servicio },
        gratuito: { servidor_y_disco: pc.costo_gratuito - ss.soporte_gratuito, soporte: ss.soporte_gratuito, costo: pc.costo_gratuito, anuncios: pc.ingreso_gratuito, neto: pc.costo_gratuito - pc.ingreso_gratuito },
        sostiene_con_anuncios: sostiene, // null = con anuncios el gratuito se paga solo
        se_paga_solo: e.se_paga_solo,
        sostiene_sin_anuncios: e.gratuitos_que_sostiene_un_pagante_sin_anuncios,
      },
      embudo_anuncios: { comensales_al_mes: comensalesMes, abren_la_app: abren, ven_un_anuncio: ven, parte_que_abre: abren / comensalesMes, parte_que_ve_anuncio: parte, tarifa_por_mil_visitas: tarifa, pesos_por_gratuito: pesosAds, con_anuncios: !sinAds },
      pesos_por_cliente_de_paga: { precio: ps, comision_tarjeta: comision, soporte: ss.soporte_servicio, servidor_y_disco: infraPagante, queda: ps - comision - ss.soporte_servicio - infraPagante, ingreso_promedio_por_pagante: pc.ingreso_por_pagante },
      cascada_margen: { n, de_paga: e.clientes.de_paga, ingreso_suscripcion: e.ingresos.suscripcion, ingreso_anuncios: e.ingresos.anuncios, ingresos: e.ingresos.total, costo_servidor: e.costos.servidor, costo_almacenamiento: e.costos.almacenamiento + e.costos.objetos, costo_soporte: e.costos.soporte, costo_comision: e.costos.comision, costos: e.costos.total, margen_operacion: e.margen_operacion },
    };
  });
  return { n, escenarios: porEscenario };
}

// ---------------------------------------------------------------- dos mensajes en una frase, calculados por el modelo
/**
 * (a) Dónde está el valor: lo que cuesta Master Chef frente a lo que ya paga por su punto de venta un negocio de 11 a 50 personas y
 *     frente a su ingreso promedio (INEGI, Censos Económicos 2024, año de referencia 2023, SÓLO la clase 722511 y PROMEDIOS, no medianas).
 * (b) El precio: qué significa la sensibilidad para la decisión (el modelo no sabe cuánto pagaría el dueño típico; lo mide el piloto).
 */
export function mensajes(config, s, n = 1000) {
  const ps = config.precios.servicio;
  const pos = s.punto_de_venta.map((x) => ({ nombre: x.nombre, precio_mes: x.precio, parte: ps / x.precio }));
  const medio = pos.find((x) => x.nombre === 'Fudo Pro');
  const ingreso = s.inegi_11_50.ingreso_mes;
  const parteIngreso = ps / ingreso;
  const cuarta = Math.round(1 / medio.parte);
  const valor = {
    frase: `Para un negocio de 11 a 50 personas, Carta (${ps} pesos al mes) cuesta alrededor de la ${cuarta === 4 ? 'cuarta' : `1/${cuarta}`} parte de lo que ya paga por un punto de venta como ${medio.nombre} (${medio.precio_mes}), y ${(parteIngreso * 100).toFixed(2)} % de lo que vende en promedio al mes.`,
    calculo: { precio_master_chef: ps, comparaciones: pos, ingreso_promedio_mes: ingreso, parte_del_ingreso: parteIngreso },
    advertencia: s.inegi_11_50.advertencia,
  };
  const sp = sensibilidadPrecio(config, s, n);
  const filas = sp.por_mediana.map((f) => { const mx = Math.max(...f.margenes.map((x) => x.margen_operacion)); const emp = f.margenes.filter((x) => x.margen_operacion >= 0.99 * mx).map((x) => x.precio); return { si_el_dueno_pagaria_alrededor_de: f.mediana, conviene_cobrar: emp, optimo_continuo: f.optimo_continuo }; });
  const precio = {
    frase: `Si el dueño típico pagaría alrededor de ${filas[0].si_el_dueno_pagaria_alrededor_de}, conviene cobrar ${filas[0].conviene_cobrar.join(' o ')}; si pagaría ${filas[1].si_el_dueno_pagaria_alrededor_de}, ${filas[1].conviene_cobrar.join(' o ')}; si ${filas[2].si_el_dueno_pagaria_alrededor_de}, ${filas[2].conviene_cobrar.join(' o ')}; si ${filas[3].si_el_dueno_pagaria_alrededor_de} o más, ${filas[3].conviene_cobrar.join(' o ')}. No sabemos cuánto pagaría: lo mide la prueba de tres precios del piloto.`,
    por_mediana: filas,
    por_sigma: sp.por_sigma.map((f) => ({ sigma: f.sigma, precio_ganador: f.precio_ganador })),
  };
  // «margen» = margen de operación: antes de captación, sueldos e impuestos; a dónde se va cada 100 pesos que entran
  const d = desgloses(config, s, n).escenarios;
  const por100 = (e) => { const c = e.cascada_margen; const q = (x) => Math.round((100 * x) / c.ingresos * 10) / 10; const r = { servidor: q(c.costo_servidor), almacenamiento: q(c.costo_almacenamiento), soporte: q(c.costo_soporte), comision: q(c.costo_comision) }; r.margen = Math.round((100 - r.servidor - r.almacenamiento - r.soporte - r.comision) * 10) / 10; return { ingresos: c.ingresos, margen_operacion: c.margen_operacion, porcentaje: r.margen, por_cada_100: r, soporte_mas_comision_por_cada_100: Math.round((r.soporte + r.comision) * 10) / 10 }; };
  const E = Object.fromEntries(['recomendado', 'peor', 'mejor', 'piso_de_verdad'].map((k) => [k, por100(d.find((x) => x.escenario === k))]));
  const f0 = (x) => Math.round(x).toLocaleString('en-US');
  const margen = {
    nombre: 'margen de operación: antes de captación, sueldos e impuestos',
    por_escenario: E,
    frase: `El margen de operación no es la ganancia final (faltan la captación, los sueldos y los impuestos): de cada 100 pesos que entran, se quedan ${E.recomendado.porcentaje} en el recomendado, ${E.mejor.porcentaje} en el mejor y ${E.peor.porcentaje} en el peor. Del recomendado al mejor el porcentaje casi no cambia porque el soporte y la comisión crecen con cada cliente de paga (${E.recomendado.soporte_mas_comision_por_cada_100} → ${E.mejor.soporte_mas_comision_por_cada_100} de cada 100); lo que sube es el monto (${f0(E.recomendado.margen_operacion)} → ${f0(E.mejor.margen_operacion)} pesos al mes).`,
  };
  return { valor, precio, margen };
}

// ---------------------------------------------------------------- palancas que sí mueven algo (regla escrita)
/**
 * Qué palancas entran al tablero. REGLA: una palanca entra si sube al menos `umbral` (por omisión `s.umbral_tablero`, 15 %) la capacidad del
 * recurso que toca, en algún canal (sondeo o avisos), con el historial del gratuito a 30 días (el estado que se propone); la palanca
 * del historial a 30 días se mide sin purga (12 meses), porque es la decisión. Las demás son «ajustes menores». El umbral es un juicio.
 */
export function palancasEnTablero(config, s, umbral = s.umbral_tablero, carga = 'topes') {
  const clave = { disco: 'disco', procesador: 'procesador', lineas: 'lineas', conexiones_bd: 'conexiones_bd' };
  const out = {};
  for (const [id, pl] of Object.entries(PALANCAS)) {
    const base30 = id === 'historial_gratuito_30_dias' ? 12 : 1;
    let mejor = { ganancia: 0, canal: null, antes: null, despues: null };
    for (const canal of ['sondeo', 'eventos']) {
      const mk = (on) => {
        const ps = (config.palancas ?? []).filter((x) => x !== id);
        const cfg = { ...config, palancas: on ? [...ps, id] : ps };
        const cc = id === 'historial_gratuito_30_dias' ? conHistorialGratuito(cfg, s, base30) : conHistorialGratuito({ ...cfg, palancas: [...new Set([...(cfg.palancas ?? []), 'historial_gratuito_30_dias'])] }, s, 1);
        return topesDeTamano(cc, s, 'hobby_eventos', canal, carga)[clave[pl.recurso]];
      };
      const a = mk(false);
      const d = mk(true);
      if (a != null && d != null && a > 0 && d / a - 1 > mejor.ganancia) mejor = { ganancia: d / a - 1, canal, antes: a, despues: d };
    }
    out[id] = { en_tablero: mejor.ganancia >= umbral, ganancia_maxima: mejor.ganancia, canal: mejor.canal, capacidad_antes: mejor.antes, capacidad_despues: mejor.despues, recurso: pl.recurso, grupo: pl.grupo ?? null };
  }
  const ids = Object.keys(out);
  const grupos = Object.fromEntries(Object.entries(GRUPOS_EXCLUYENTES).map(([g, v]) => [g, { ...v, miembros: ids.filter((x) => out[x].grupo === g), en_tablero: ids.filter((x) => out[x].grupo === g && out[x].en_tablero), mejor: ids.filter((x) => out[x].grupo === g).sort((a, b) => out[b].ganancia_maxima - out[a].ganancia_maxima)[0] }]));
  return { grupos_excluyentes: grupos, umbral, regla: `entra al tablero si sube al menos ${Math.round(umbral * 100)} % la capacidad del recurso que toca, en algún canal (sondeo o avisos), con el historial del gratuito a 30 días; la palanca del historial se mide sin purga (12 meses) porque es la decisión`, palancas: out, en_tablero: ids.filter((i) => out[i].en_tablero), ajustes_menores: ids.filter((i) => !out[i].en_tablero) };
}

// ---------------------------------------------------------------- la meta de 12 meses, en dinero
/**
 * La meta de `s.meta_12_meses` restaurantes a 12 meses, en pesos, por escenario (recomendado, peor, mejor): el mes 12 (ingresos por
 * suscripción y por anuncios, costos y margen) y el acumulado de los 12 meses. Sale de `proyectarEscenario`.
 */
export function meta12Meses(config, s) {
  const out = { meta_restaurantes: s.meta_12_meses, escenarios: {} };
  for (const nombre of ['recomendado', 'peor', 'mejor']) {
    const p = proyectarEscenario(nombre, config, s, 12);
    const f = p.filas[11];
    const suma = (k) => p.filas.reduce((a, x) => a + x[k], 0);
    const sumaD = (k) => p.filas.reduce((a, x) => a + x.costos_detalle[k], 0);
    out.escenarios[nombre] = {
      mes_12: { restaurantes: f.restaurantes, de_paga: f.pagantes, ingreso_suscripcion: f.ingresos_suscripcion, ingreso_anuncios: f.ingresos_anuncios, ingresos: f.ingresos, costos: { servidor: f.costos_detalle.servidor, almacenamiento: f.costos_detalle.almacenamiento + f.costos_detalle.objetos, soporte: f.costos_detalle.soporte, comision: f.costos_detalle.comision, total: f.costos }, margen_operacion: f.margen_operacion, margen_despues_de_captacion: f.margen_despues_de_captacion },
      acumulado_12_meses: { ingreso_suscripcion: suma('ingresos_suscripcion'), ingreso_anuncios: suma('ingresos_anuncios'), ingresos: suma('ingresos'), costos: { servidor: sumaD('servidor'), almacenamiento: sumaD('almacenamiento') + sumaD('objetos'), soporte: sumaD('soporte'), comision: sumaD('comision'), total: suma('costos') }, captacion: suma('captacion'), margen_operacion: suma('margen_operacion'), margen_despues_de_captacion: suma('margen_despues_de_captacion') },
      financiamiento_maximo: p.financiamiento_maximo,
    };
  }
  return out;
}

// ---------------------------------------------------------------- el potencial del plan Chef, en dinero
/**
 * Si TODOS los negocios que caerían en Chef estuvieran en Carta, cuánto dejarían al mes en anuncios, con las tres tarifas (baja, media,
 * alta) y su rango, por tramo de tamaño y con la parte de cada tramo que cae en cada plan. SUPUESTOS: el modelo de mesas y cuentas (sólo los
 * conteos por estrato son medidos), que todos tienen las visitas con la app del gratuito típico (más de las que tendría una fonda de 0 a 5
 * personas), y que cada visita con anuncio paga la tarifa por mil. Es un techo teórico, no una proyección.
 */
export function potencialChef(config, s) {
  const e = coberturaEstratos(config, s, 'centro');
  const e1 = coberturaEstratos(config, s, 'minimo');
  const e2 = coberturaEstratos(config, s, 'maximo');
  const dentro = { '0 a 5': [e.dentro_0_5, e1.dentro_0_5, e2.dentro_0_5], '6 a 10': [e.dentro_6_10, e1.dentro_6_10, e2.dentro_6_10] };
  const tramos = s.estratos_negocios.map((x) => { const d = dentro[x.estrato] ?? [0, 0, 0]; return { tramo: x.estrato, negocios: x.negocios, parte_en_chef: d[0], parte_en_chef_rango: [Math.min(d[1], d[2]), Math.max(d[1], d[2])], parte_en_master_chef: 1 - d[0], negocios_en_chef: x.negocios * d[0], negocios_en_master_chef: x.negocios * (1 - d[0]) }; });
  const enChef = tramos.reduce((a, x) => a + x.negocios_en_chef, 0);
  const enMaster = tramos.reduce((a, x) => a + x.negocios_en_master_chef, 0);
  const pesosPorChef = (tarifa, visitas = s.visitas_app_gratuito, parte = s.parte_visitas_con_anuncio) => (visitas * parte * tarifa) / 1000;
  const [vmin, vmax] = s.rangos.visitas_app_gratuito;
  const [pmin, pmax] = s.rangos.parte_visitas_con_anuncio;
  const tarifas = s.anuncio_pesos_por_mil;
  const potencial = Object.fromEntries(['baja', 'media', 'alta'].map((k) => [k, { tarifa_por_mil: tarifas[k], pesos_por_negocio_al_mes: pesosPorChef(tarifas[k]), pesos_al_mes_de_todos_los_chef: enChef * pesosPorChef(tarifas[k]), rango_por_visitas_y_parte: [enChef * pesosPorChef(tarifas[k], vmin, pmin), enChef * pesosPorChef(tarifas[k], vmax, pmax)] }]));
  return { universo: tramos.reduce((a, x) => a + x.negocios, 0), tramos, negocios_en_chef: enChef, negocios_en_master_chef: enMaster, parte_en_chef: enChef / tramos.reduce((a, x) => a + x.negocios, 0), potencial_anuncios_mes: potencial, supuestos: 'sólo los conteos por estrato son medidos; el reparto entre Chef y Master Chef sale del modelo de mesas y cuentas con dispersión; todos con las visitas con la app del gratuito típico (supuesto, más altas que las de una fonda de 0 a 5 personas) y la parte de visitas con anuncio del modelo; la tarifa por mil visitas no tiene dato; techo teórico: no cuenta que no todos estarían en Carta', rango_de_los_parametros: { visitas_con_la_app: [vmin, vmax], parte_con_anuncio: [pmin, pmax] } };
}

// ---------------------------------------------------------------- sueldo del fundador
/**
 * ¿Cuándo le paga Carta a su fundador? Para un `monto` mensual de sueldo (pesos; `s.sueldo_fundador` si no se da; sin valor por omisión
 * inventado: 0 = todavía sin sueldo) y para cada escenario: cuántos restaurantes registrados y cuántos clientes de paga hacen falta para
 * que el margen después de captación lo cubra (en régimen), el mes de la proyección en que lo cubre y el margen después del sueldo
 * (a 1,000 restaurantes y en los meses 12 y 24). NO MODELADO: impuestos, contabilidad, seguridad social ni prestaciones.
 */
export function sueldo(config, s, monto = s.sueldo_fundador ?? 0) {
  const escenarios = {};
  for (const nombre of ['recomendado', 'peor', 'mejor', 'piso_de_verdad']) {
    const { ss, opc } = paramsEscenario(nombre, s);
    let nNecesario = null;
    let pagNecesarios = null;
    for (let n = 1; n <= 20000; n += n < 200 ? 1 : 10) {
      const e = evaluar(config, ss, n, opc);
      if (e.margen_despues_de_captacion >= monto && e.margen_despues_de_captacion > 0) { nNecesario = n; pagNecesarios = e.clientes.de_paga; break; }
    }
    const p = proyectar(config, ss, 60, opc);
    const mes = p.filas.find((f) => f.margen_despues_de_captacion >= monto && f.margen_despues_de_captacion > 0)?.mes ?? null;
    const e1k = evaluar(config, ss, 1000, opc);
    escenarios[nombre] = {
      restaurantes_necesarios: nNecesario,
      clientes_de_paga_necesarios: pagNecesarios,
      mes_en_que_el_margen_despues_de_captacion_lo_cubre: mes,
      requiere_otra_arquitectura: nNecesario != null && evaluar(config, ss, nNecesario, opc).capacidad.requiere_arquitectura,
      margen_despues_de_sueldo: { con_1000_restaurantes: e1k.margen_despues_de_captacion - monto, mes_12: p.filas[11].margen_despues_de_captacion - monto, mes_24: p.filas[23].margen_despues_de_captacion - monto },
    };
  }
  return { sueldo_mensual: monto, escenarios, no_modelado: ['impuestos (ISR e IVA)', 'contabilidad y trámites', 'seguridad social y prestaciones', 'costos de ventas más allá del costo de conseguir un cliente de paga'] };
}

/** Niveles de sueldo de referencia: múltiplos del salario mínimo general (fuente en `s.salario_minimo`); no son una recomendación. */
export function tablaSueldos(config, s, multiplos = [1, 3, 5, 10]) {
  const mensual = s.salario_minimo.zona_general_dia * 30.4;
  return multiplos.map((k) => ({ veces_el_salario_minimo: k, sueldo_mensual: Math.round(mensual * k), ...sueldo(config, s, Math.round(mensual * k)) }));
}

// ---------------------------------------------------------------- mapa de modelos de ingreso aplicados a Carta
/**
 * Los modelos de ingreso de las plataformas aplicados a Carta, cada uno con: a quién se le cobra, potencial en pesos por restaurante al
 * mes (con sus supuestos y rango), qué exige y cuándo cabría. Lo vigente (suscripción y anuncios) sale del modelo; lo demás es SUPUESTO sin
 * dato y lo fuera de la v1 va marcado. Nada de esto vende datos (decisión de Calvin, 14-nov) ni guarda datos personales del comensal (regla 10).
 */
export function modelosDeIngreso(config, s, n = 1000) {
  const e = evaluarEscenario('recomendado', config, s, n);
  const pes = evaluar(config, s, n, { curva: 'pesimista' });
  const opt = evaluar(config, s, n, { curva: 'optimista' });
  const ps = config.precios.servicio;
  const tarifas = s.anuncio_pesos_por_mil;
  const adsPor = (k) => (s.visitas_app_gratuito * s.parte_visitas_con_anuncio * tarifas[k]) / 1000;
  const vp = s.visibilidad_pagada;
  const cm = s.comision_por_transaccion;
  const pc = s.pago_del_comensal;
  const comensalesMes = s.comensales_dia_gratuito * 30;
  const redond = (x) => Math.round(x * 10) / 10;
  const modelos = [
    { id: 'suscripcion_del_restaurante', nombre: 'Suscripción del restaurante (Master Chef)', vigente: true, se_cobra_a: 'el restaurante que pasa de los topes de Chef', potencial_pesos_por_restaurante_al_mes: { por_restaurante_de_paga: ps, deja_por_restaurante_de_paga: e.por_cliente.margen_servicio, por_restaurante_registrado: { centro: e.ingresos.suscripcion / n, minimo: pes.ingresos.suscripcion / n, maximo: opt.ingresos.suscripcion / n } }, supuestos: 'curva de pago (mediana, sigma y techo) sin dato; parte que rebasa los topes de Chef (modelo de mesas y cuentas)', exige: 'nada nuevo: es la v1 (sin pagos del restaurante dentro de Carta si se cobra fuera)', cuando: 'piloto: se prueba el precio con tres grupos' },
    { id: 'anuncios_del_comensal', nombre: 'Anuncios al comensal del plan gratuito (no personalizados)', vigente: true, se_cobra_a: 'el anunciante, a través de una red de anuncios (hoy se supone AdSense); anunciantes típicos: marcas de bebidas y consumo, bancos y comercios locales (por definir)', potencial_pesos_por_restaurante_al_mes: { por_restaurante_gratuito: { baja: adsPor('baja'), media: adsPor('media'), alta: adsPor('alta') }, nota: 'visitas con la app y parte con anuncio del modelo; tarifa sin dato' }, supuestos: 'tarifa por mil visitas, visitas con la app, parte con anuncio y que la red apruebe el sitio', exige: 'ADR, abrir la política de seguridad del sitio, aviso de privacidad y aprobación de la red; sin anuncios personalizados (regla 10)', cuando: `hacia el mes ${s.mes_inicio_anuncios} (supuesto) o después de la Fase 3` },
    { id: 'visibilidad_pagada', nombre: 'Visibilidad pagada dentro de Carta (patrocinio de marca o proveedor en la carta, platillo destacado)', vigente: false, se_cobra_a: 'la marca o el proveedor (cerveza, refrescos, insumos) que patrocina un espacio en la carta del restaurante; o el restaurante que destaca un platillo', potencial_pesos_por_restaurante_al_mes: { por_restaurante_gratuito: { centro: vp.parte_que_compra * vp.cuota_mes, minimo: vp.rango_parte[0] * vp.rango_cuota[0], maximo: vp.rango_parte[1] * vp.rango_cuota[1] } }, supuestos: 'parte de restaurantes con patrocinio y cuota mensual: SUPUESTOS sin dato (referencia de forma: Booking cobra 2–8 % más por visibilidad, por verificar)', exige: 'spec nueva (alcance), regla de qué puede patrocinarse sin engañar al comensal; no toca la v1 ni guarda datos del comensal', cuando: 'después de la Fase 3, con restaurantes reales y una prueba de 3 patrocinadores' },
    { id: 'comision_por_transaccion', nombre: 'Comisión por transacción (FUERA de la v1)', vigente: false, fuera_de_la_v1: true, se_cobra_a: 'el restaurante, sobre lo que se pida o pague por Carta', potencial_pesos_por_restaurante_al_mes: { de_0_a_10_personas: { centro: cm.ventas_mes_0_a_10 * cm.parte_que_pasa_por_carta * cm.tasa, minimo: cm.ventas_mes_0_a_10 * cm.rango_parte[0] * cm.rango_tasa[0], maximo: cm.ventas_mes_0_a_10 * cm.rango_parte[1] * cm.rango_tasa[1] }, de_11_a_50_personas: { centro: cm.ventas_mes_11_a_50 * cm.parte_que_pasa_por_carta * cm.tasa, minimo: cm.ventas_mes_11_a_50 * cm.rango_parte[0] * cm.rango_tasa[0], maximo: cm.ventas_mes_11_a_50 * cm.rango_parte[1] * cm.rango_tasa[1] } }, supuestos: 'ventas promedio de la clase 722511 (INEGI 2023, promedios no medianas); parte que pasaría por Carta y tasa: supuestos sin dato', exige: 'cobrar o procesar pagos: contradice «Qué NO construir» y la v1; ADR nuevo y spec; puede exigir regulación financiera (por verificar con un abogado)', cuando: 'no antes de una v2; sólo se calcula para ver el tamaño' },
    { id: 'pago_del_comensal', nombre: 'Pago del comensal por quitar anuncios o por funciones propias (FUERA de la v1)', vigente: false, fuera_de_la_v1: true, se_cobra_a: 'el comensal (suscripción tipo «Carta+»)', potencial_pesos_por_restaurante_al_mes: { por_restaurante: { centro: (comensalesMes / pc.visitas_por_comensal_mes) * pc.conversion * pc.precio_mes, minimo: (comensalesMes / pc.rango_visitas[1]) * pc.rango_conversion[0] * pc.precio_mes, maximo: (comensalesMes / pc.rango_visitas[0]) * pc.rango_conversion[1] * pc.precio_mes }, nota: 'repartido entre los restaurantes que visita cada comensal: es un techo por restaurante' }, supuestos: 'comensales únicos al mes, conversión y precio (29 pesos del prototipo): supuestos sin dato', exige: 'cuenta o perfil del comensal: contradice «Qué NO construir» y la regla 10 (sin datos personales del comensal en el servidor); ADR y spec', cuando: 'no antes de una v2' },
  ];
  const rondea = (o) => (o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? redond(v) : rondea(v)])) : o);
  return { n, modelos: modelos.map((m) => ({ ...m, potencial_pesos_por_restaurante_al_mes: rondea(m.potencial_pesos_por_restaurante_al_mes) })), no_vende_datos: 'decisión de Calvin del 14 de noviembre de 2026: Carta no vende datos; y sin datos personales del comensal en el servidor (regla 10)' };
}

// ---------------------------------------------------------------- el modelo de negocio, para pintarlo
/**
 * (d) qué tipo de plataforma es Carta hoy y a dónde puede ir; (e) el hueco frente a Meniu; (f) cómo opera con datos, dinero y usuarios;
 * (g) el modelo de negocio en una página. Todo sale de las reglas y decisiones vigentes y del modelo; lo que es juicio va marcado «supuesto».
 * No da por buena la premisa «somos como BlaBlaCar, Airbnb o Uber»: la compara.
 */
export function modeloDeNegocio(config, s, n = 1000) {
  const rec = evaluarEscenario('recomendado', config, s, n);
  const chef = potencialChef(config, s);
  const est = coberturaEstratos(config, s, 'centro');
  const estMin = coberturaEstratos(config, s, 'minimo');
  const estMax = coberturaEstratos(config, s, 'maximo');
  const e05 = chef.tramos.find((x) => x.tramo === '0 a 5');
  const gratuitosPorPagante = rec.gratuitos_que_sostiene_un_pagante_sin_anuncios;
  const ps = config.precios.servicio;
  const adsBaja = (s.visitas_app_gratuito * s.parte_visitas_con_anuncio * s.anuncio_pesos_por_mil.baja) / 1000;
  const adsAlta = (s.visitas_app_gratuito * s.parte_visitas_con_anuncio * s.anuncio_pesos_por_mil.alta) / 1000;
  const meta = meta12Meses(config, s);
  const hoy = recursos(config, s, {});
  const tipo = {
    pregunta: '¿Carta es una plataforma como BlaBlaCar, Airbnb, Uber, Spotify o una red social?',
    respuesta: 'No: hoy Carta es una herramienta gratuita con anuncios más suscripción para el restaurante (como el modelo de Spotify del lado de la oferta), que sirve a un comensal que YA está sentado; no conecta oferta y demanda nuevas ni procesa una transacción.',
    comparacion: [
      { modelo: 'Comisión por transacción (Airbnb, Uber, BlaBlaCar)', quien_paga: 'el que gana con la transacción (anfitrión, conductor)', quien_usa_gratis: 'el lado que trae la demanda (huésped, pasajero) no paga o paga una cuota', conecta_oferta_y_demanda_nuevas: true, hay_transaccion_dentro: true, cifras_verificadas: 'Airbnb 15.5 % al anfitrión en el esquema único (3 % en el compartido); Uber: la tarifa al conductor varía por viaje y la meta es acercarse a 25 % [fuente primaria, 17-nov]; BlaBlaCar no verificada' },
      { modelo: 'Gratuito con anuncios más suscripción (Spotify, YouTube)', quien_paga: 'el anunciante y el usuario que quiere quitar anuncios', quien_usa_gratis: 'el usuario de masas', conecta_oferta_y_demanda_nuevas: false, hay_transaccion_dentro: false, cifras_verificadas: 'YouTube paga 55 % del ingreso neto de anuncios de la página de reproducción [fuente primaria]; Spotify: la fuente primaria dice «cerca de dos tercios» a titulares de derechos, no 70 %' },
      { modelo: 'Economía de la atención (redes sociales)', quien_paga: 'el anunciante', quien_usa_gratis: 'todos los usuarios; el producto es la audiencia y sus datos', conecta_oferta_y_demanda_nuevas: true, hay_transaccion_dentro: false, cifras_verificadas: 'Meta: 97.6 % de sus ingresos viene de publicidad (cálculo sobre el 10-K 2025)' },
      { modelo: 'Carta v1', quien_paga: 'el restaurante que pasa de los topes de Chef (suscripción) y, después, el anunciante', quien_usa_gratis: 'el comensal (anónimo) y el restaurante de 0 a 5 personas con 6 mesas y 1 cuenta', conecta_oferta_y_demanda_nuevas: false, hay_transaccion_dentro: false, cifras_verificadas: 'reglas vigentes: sin pagos, sin cuenta del comensal, sin datos personales ni venta de datos' },
    ],
    donde_cae_la_v1: ['Quién paga: el restaurante (suscripción) y, más adelante, un anunciante; el comensal no paga.', 'Quién usa gratis: el comensal y el negocio chico de Chef.', 'Oferta y demanda nuevas: no; el comensal ya está sentado en la mesa del restaurante.', 'Transacción dentro: no; la v1 no cobra ni procesa pagos.'],
    vision_v2_de_calvin: visionV2(config, s),
  };
  const meniu = s.meniu;
  const hueco = {
    meniu: { consulta: meniu.consulta, precio_mes: meniu.precio_mes, prueba_dias: meniu.prueba_dias, plan_gratuito: meniu.plan_gratuito, restaurantes_que_dice_tener: meniu.restaurantes_que_dice_tener, paginas: meniu.paginas, nota: 'los blogs de Meniu hablan de «alternativa gratis» pero el producto sólo ofrece una prueba de 7 días' },
    tabla: meniu.funciones,
    tamano_del_hueco: {
      clientes_potenciales: chef.universo,
      de_0_a_5_personas: e05.negocios,
      parte_de_0_a_5: e05.negocios / chef.universo,
      caben_en_chef: e05.negocios_en_chef,
      parte_que_cabe_en_chef: est.dentro_0_5,
      rango_parte_que_cabe: [estMin.dentro_0_5, estMax.dentro_0_5],
      parte_de_los_clientes_potenciales_que_cabe_en_chef: e05.negocios_en_chef / chef.universo,
      lectura: `Con un producto sin plan gratuito (Meniu: prueba de ${meniu.prueba_dias} días y ${meniu.precio_mes} pesos al mes), quedan sin servir los negocios de 0 a 5 personas: ${e05.negocios.toLocaleString('en-US')} de ${chef.universo.toLocaleString('en-US')} clientes potenciales [medido, DENUE]; con 6 mesas y 1 cuenta caben en Chef ${Math.round(e05.negocios_en_chef).toLocaleString('en-US')} (${(est.dentro_0_5 * 100).toFixed(1)} % de ellos; rango ${(estMin.dentro_0_5 * 100).toFixed(1)}–${(estMax.dentro_0_5 * 100).toFixed(1)} %), un juicio del modelo de mesas y cuentas.`,
      supuesto: 'sólo los conteos por estrato son medidos; el reparto entre Chef y Master Chef es el modelo de mesas y cuentas con dispersión',
    },
  };
  const opera = {
    datos: ['Sin datos personales del comensal en el servidor (regla 10): los filtros de alérgenos viven en el teléfono.', 'La analítica usa ids opacos, huella de red con sal diaria y una lista cerrada de eventos sin texto libre.', 'No se venden datos (decisión de Calvin, 14-nov) y los anuncios no son personalizados.'],
    dinero: ['La v1 no cobra ni procesa pagos; el precio nunca viene del cliente (regla 4) y la propina sólo se calcula y se registra.', 'Ingresan: suscripción del restaurante y, más adelante, anuncios; lo demás está fuera de la v1.', 'Los costos son servidor, disco, soporte y comisión de tarjeta del cobro de la suscripción; la bolsa de Calvin cubre lo que los anuncios todavía no.'],
    usuarios: ['Comensal anónimo, sin cuenta ni perfil: una cookie de invitado de 6 horas.', 'Personal (mesero y capitán) entra con PIN, guardado sólo como hash.', 'Operador (dueño o gerente) con cuenta; el dueño es el validador y el primer mesero (ADR-017); en Chef es una sola cuenta.'],
  };
  const pagina = {
    a_quien_sirve: 'Al restaurante y a la cafetería de México, desde la fonda de 0 a 5 personas hasta el negocio de 100, y al comensal que ya está sentado.',
    que_le_resuelve: 'Sube la carta en PDF y en minutos tiene un menú visual por QR; los comensales arman su orden juntos desde sus teléfonos y el mesero la recibe en el suyo.',
    quien_paga_y_cuanto: { restaurante: `Master Chef ${ps} pesos al mes (deja ${Math.round(rec.por_cliente.margen_servicio)} al restaurante de paga tras costos); Chef es gratis`, anunciante: `${adsBaja.toFixed(1)} a ${adsAlta.toFixed(1)} pesos al mes por restaurante gratuito (tarifa baja a alta, sin dato)`, comensal: 'nada' },
    fuentes_de_ingreso_por_etapa: [
      { etapa: 'Piloto', fuente: 'Suscripción de Master Chef (se prueba el precio con tres grupos)' },
      { etapa: `Con la Spec 002 «Planes», después del piloto (hacia el mes ${s.mes_inicio_anuncios}, supuesto)`, fuente: 'Anuncios en Chef; visibilidad pagada con spec nueva' },
      { etapa: 'Más adelante (v2)', fuente: 'Tarjetas de lealtad y otras funciones de Meniu, comisión o pago del comensal sólo con ADR y spec' },
    ],
    costos: { infraestructura_hoy_usd_mes: hoy.hoy.total_usd_mes, costo_por_restaurante_gratuito_pesos: rec.por_cliente.costo_gratuito, gratuitos_que_sostiene_un_cliente_de_paga_sin_anuncios: gratuitosPorPagante, soporte: 'el costo grande: el soporte de cada cliente de paga' },
    meta_12_meses: { restaurantes: meta.meta_restaurantes, margen_operacion_mes_12: meta.escenarios.recomendado.mes_12.margen_operacion },
    que_hay_que_medir: ['La curva de pago de Master Chef (prueba de tres precios).', 'Mesas y cuentas por negocio de 0 a 5 personas (cuántos caben en Chef).', 'La carta real del piloto (cuántos platillos).', 'La tarifa de anuncios y la parte de visitas con anuncio (prueba con 3 restaurantes).', 'CPU, memoria y conexiones en Railway.'],
  };
  return { n, tipo_de_plataforma: tipo, hueco_frente_a_meniu: hueco, como_opera: opera, una_pagina: pagina };
}

// ---------------------------------------------------------------- anuncios: genéricos frente a personalizados; la visión v2 de Calvin
/**
 * Ingreso de anuncios por restaurante gratuito con dos tarifas: genérica (la de la v1: el comensal es anónimo) y personalizada (sólo para
 * comensales registrados, que en la v1 no existen: parte 0). El restaurante de paga NO muestra anuncios, así que su ingreso de anuncios es 0:
 * cada gratuito que paga pierde ese ingreso y lo cambia por la suscripción. El factor de la tarifa personalizada y la parte de registrados
 * son SUPUESTOS con rango (parámetros `anuncio_personalizado_factor` y `parte_comensales_registrados_v2`).
 */
export function anunciosGenericoYPersonalizado(config, s) {
  const base = (s.visitas_app_gratuito * s.parte_visitas_con_anuncio) / 1000;
  const f = s.anuncio_personalizado_factor;
  const r = s.parte_comensales_registrados_v2;
  const [fmin, fmax] = s.rangos.anuncio_personalizado_factor;
  const [rmin, rmax] = s.rangos.parte_comensales_registrados_v2;
  const q = evaluar(config, s, 1000, { curva: config.curva ?? 'media' }).clientes.de_paga / 1000;
  const porTarifa = Object.fromEntries(['baja', 'media', 'alta'].map((k) => {
    const gen = base * s.anuncio_pesos_por_mil[k];
    const mezcla = (ff, rr) => gen * ((1 - rr) + rr * ff);
    return [k, {
      tarifa_generica_por_mil: s.anuncio_pesos_por_mil[k],
      tarifa_personalizada_por_mil: s.anuncio_pesos_por_mil[k] * f,
      pesos_por_gratuito_v1_todo_generico: gen,
      pesos_por_gratuito_v2_con_registrados: mezcla(f, r),
      cambio_por_gratuito_v2: mezcla(f, r) - gen,
      rango_v2: [mezcla(fmin, rmin), mezcla(fmax, rmax)],
      pesos_por_pagante: 0,
      pesos_por_1000_restaurantes_v1: gen * 1000 * (1 - q),
      pesos_por_1000_restaurantes_v2: mezcla(f, r) * 1000 * (1 - q),
    }];
  }));
  return { factor: f, rango_factor: [fmin, fmax], parte_registrados_v2: r, rango_parte: [rmin, rmax], parte_que_paga_por_1000: q, por_tarifa: porTarifa, nota: 'v1: comensal anónimo, todo genérico. El pagante no ve anuncios. Factor y parte de registrados son supuestos; la tarifa base también (anuncio_pesos_por_mil)' };
}

/**
 * Las tres rutas de Calvin para una versión 2, con lo que habría que cambiar antes (regla 10, «Qué NO construir», ADR-011 no aplica, aviso
 * de privacidad y consentimiento, regulación de pagos) y el orden sugerido. Lo legal que no se pudo leer en la fuente primaria queda «por
 * verificar con un abogado». Nada de esto entra en la v1: los anuncios (genéricos) llegan con la Spec 002 «Planes», después del piloto, no en la Fase 3.
 */
export function visionV2(config, s) {
  const a = anunciosGenericoYPersonalizado(config, s);
  const ley = { norma: 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares (nueva, DOF 20-mar-2025; reforma del 14-nov-2025 según el texto de la Cámara)', lo_que_dice: 'el aviso de privacidad debe distinguir las finalidades que requieren consentimiento y las que no (art. 15), y una finalidad nueva exige un consentimiento nuevo (art. 11); la autoridad pasó a la Secretaría Anticorrupción y Buen Gobierno', fuente: 'resúmenes de despachos (Garrigues, KPMG México, IAPP; consultados el 17-nov-2026), NO el texto del DOF', estado: 'por verificar con un abogado: no se leyó la fuente primaria ni el reglamento' };
  return {
    postura_de_calvin: 'Ingreso principal por anuncios (estilo AdSense): personalizados para el comensal registrado, genéricos para el anónimo; quien paga no ve anuncios. Visión de una versión 2 con tres rutas; Calvin reconoce que choca con reglas «escritas para esta versión» (v1).',
    en_la_v1: 'Anuncios genéricos (con la Spec 002 «Planes», después del piloto) al comensal anónimo del restaurante gratuito; el restaurante de paga no los lleva. Nada de perfil, cuenta ni pagos.',
    anuncios: a,
    rutas: [
      { ruta: 'Mercado con comisión, directorio, procesador de pagos y perfil del comensal', que_cambiar_antes: ['regla 10 (sin datos personales del comensal en el servidor)', '«Qué NO construir»: pagos o comisión, cuenta y perfil del comensal, directorio', 'ADR nuevo de pagos y spec de v2', 'aviso de privacidad y consentimiento para perfil e historial', 'regulación de pagos (si Carta custodia o procesa dinero): por verificar con un abogado'], riesgo: 'el mayor: cambia qué es el producto y las obligaciones legales' },
      { ruta: 'Economía de la atención (anuncios personalizados al comensal registrado)', que_cambiar_antes: ['regla 10 y «Qué NO construir» (cuenta y perfil del comensal)', 'aviso de privacidad con finalidades separadas y consentimiento para anuncios personalizados', 'los datos no se venden (decisión del 14-nov): hay que decidir si se comparten con la red de anuncios', 'cabecera de consentimiento en el teléfono antes de cargar el anuncio'], riesgo: 'medio: el cambio técnico es chico, el legal y de confianza no' },
      { ruta: 'Plan pagado del comensal sin anuncios (como Spotify)', que_cambiar_antes: ['regla 10 y «Qué NO construir» (cuenta del comensal y cobro)', 'procesar un pago pequeño recurrente: por verificar con un abogado', 'spec y ADR'], riesgo: 'medio: depende de que el comensal pague, sin dato de disposición a pagar' },
    ],
    orden_sugerido: ['1. Anuncios genéricos al comensal anónimo (con la Spec 002 «Planes», después del piloto; no están en las tareas de la Fase 3): no cambia ninguna regla dura.', '2. Cuenta voluntaria del comensal con consentimiento y anuncios personalizados (ruta 2): primero spec, ADR y revisión legal.', '3. Plan pagado del comensal sin anuncios (ruta 3): reutiliza la cuenta del paso 2.', '4. Directorio, pagos y comisión (ruta 1): al final; es lo que más cambia y lo más regulado.'],
    marco_legal: ley,
    conflicto_con_las_reglas: 'sí: reglas 10 y «Qué NO construir» de la v1; se levantan sólo con un ADR y una spec nuevos aprobados por Calvin',
  };
}

// ---------------------------------------------------------------- de qué se compone el disco promedio
/**
 * De qué se compone el disco por restaurante registrado que usa «¿Qué nos limita?»: cuánto llenan los gratuitos y cuánto los de paga (con sus
 * meses de historial), cuánto cuesta el disco de un restaurante de paga frente a lo que paga, y por qué la cifra no es la de antes (279 fue
 * «restaurantes gratuitos típicos»; ahora es el restaurante registrado con la mezcla de gratuitos y de paga, y el de paga guarda 12 meses).
 */
export function composicionDelDisco(config, s) {
  const cfg = conHistorialGratuito({ ...config, palancas: [...new Set([...(config.palancas ?? []), 'historial_gratuito_30_dias'])] }, s, 1);
  const pf = perfilDeCarga(cfg, s, 'topes');
  const q = pf.parte_de_paga;
  const mbProm = pf.mb_por_restaurante;
  const e = topesDeTamano(cfg, s, 'hobby_eventos', 'eventos', 'topes');
  const antes = topesDeTamano(cfg, s, 'hobby_eventos', 'eventos', 'tipica').disco;
  const mbAntes = perfilDeCarga(cfg, s, 'tipica').mb_por_restaurante;
  const precio = config.precios.servicio;
  const costoDiscoPaga = (pf.mb_paga / 1000) * s.volumen_usd_gb_mes * s.fx;
  const costoDiscoGratuito = (pf.mb_gratuito / 1000) * s.volumen_usd_gb_mes * s.fx;
  const parteGratuitos = ((1 - q) * pf.mb_gratuito) / mbProm;
  const parteDePaga = (q * pf.mb_paga) / mbProm;
  const mesesPaga = config.topes.servicio.meses_en_linea;
  const capPuros = Math.floor((e.disco * mbProm) / pf.mb_gratuito);
  const dg = pf.desglose_gratuito;
  const dp = pf.desglose_paga;
  const porte = (peso, d) => ({ fijo: peso * d.fijo, sesiones_y_ordenes: peso * d.sesiones_y_ordenes, analitica: peso * d.analitica });
  const aporteG = porte(1 - q, dg);
  const aporteP = porte(q, dp);
  const total = mbProm;
  const parte = (x) => x / total;
  const desgloseComposicion = {
    mb_por_restaurante_registrado: { gratuitos: aporteG, de_paga: aporteP },
    parte_del_disco: {
      gratuitos: { fijo: parte(aporteG.fijo), sesiones_y_ordenes: parte(aporteG.sesiones_y_ordenes), analitica: parte(aporteG.analitica) },
      de_paga: { fijo: parte(aporteP.fijo), sesiones_y_ordenes: parte(aporteP.sesiones_y_ordenes), analitica: parte(aporteP.analitica) },
    },
    parte_analitica_del_disco: parte(aporteG.analitica + aporteP.analitica),
    parte_sesiones_y_ordenes_del_disco: parte(aporteG.sesiones_y_ordenes + aporteP.sesiones_y_ordenes),
    parte_fija_del_disco: parte(aporteG.fijo + aporteP.fijo),
  };
  const sinPal = { ...cfg, palancas: (cfg.palancas ?? []).filter((x) => x !== 'analitica_agregada_por_dia' && x !== 'archivar_sesiones_cerradas') };
  const conPal = (id) => ({ ...sinPal, palancas: [...sinPal.palancas, id] });
  const capNueva = (c) => topesDeTamano(c, s, 'hobby_eventos', 'eventos', 'topes').disco;
  const capVieja = (c) => topesDeTamano(c, s, 'hobby_eventos', 'eventos', 'tipica').disco;
  const hoy2 = { nueva: capNueva(sinPal), vieja: capVieja(sinPal) };
  const dia2 = { nueva: capNueva(conPal('analitica_agregada_por_dia')), vieja: capVieja(conPal('analitica_agregada_por_dia')) };
  const arch2 = { nueva: capNueva(conPal('archivar_sesiones_cerradas')), vieja: capVieja(conPal('archivar_sesiones_cerradas')) };
  const porQueContarPorDia = {
    contar_por_dia: { cifra_de_antes: [hoy2.vieja, dia2.vieja], ganancia_de_antes: dia2.vieja / hoy2.vieja - 1, cifra_ahora: [hoy2.nueva, dia2.nueva], ganancia_ahora: dia2.nueva / hoy2.nueva - 1 },
    archivar: { cifra_ahora: [hoy2.nueva, arch2.nueva], ganancia_ahora: arch2.nueva / hoy2.nueva - 1, cifra_de_antes: [hoy2.vieja, arch2.vieja], ganancia_de_antes: arch2.vieja / hoy2.vieja - 1 },
    frase: `Contar por día sólo recorta la analítica, que hoy es ${n(desgloseComposicion.parte_analitica_del_disco * 100, 0)} % del disco promedio; antes se medía sobre un gratuito típico de ${n(s.visitas_mes_gratuito, 0)} visitas, donde la analítica pesaba más y la ganancia era +${n((dia2.vieja / hoy2.vieja - 1) * 100, 0)} % (${hoy2.vieja} → ${dia2.vieja}); con la mezcla actual los restaurantes de paga (${n(desgloseComposicion.parte_del_disco.de_paga.sesiones_y_ordenes * 100, 0)} % del disco sólo en sesiones y órdenes de 12 meses) dominan, y contar por día da +${n((dia2.nueva / hoy2.nueva - 1) * 100, 0)} % (${hoy2.nueva} → ${dia2.nueva}). Archivar las sesiones cerradas a los 3 meses recorta justo esa parte y da +${n((arch2.nueva / hoy2.nueva - 1) * 100, 0)} % (${hoy2.nueva} → ${arch2.nueva}); por eso ahora es la palanca que más da.`,
  };
  return {
    parte_que_paga: q,
    meses_de_historial: { gratuito: 1, paga: mesesPaga },
    cifra_de_antes: antes,
    mb_por_restaurante: { promedio: mbProm, gratuito: pf.mb_gratuito, paga: pf.mb_paga },
    parte_del_disco: { gratuitos: parteGratuitos, de_paga: parteDePaga },
    restaurantes_que_caben_por_disco: e.disco,
    si_todos_fueran_gratuitos: capPuros,
    costo_del_disco_pesos_al_mes: { gratuito: costoDiscoGratuito, paga: costoDiscoPaga, lo_que_paga_un_restaurante_de_paga: precio, parte_del_precio_que_se_va_en_disco: costoDiscoPaga / precio },
    por_que_no_es_la_cifra_de_antes: `Antes la cifra era ${antes} restaurantes y ahora es ${e.disco}, por dos cambios: (1) la unidad: antes se contaban restaurantes GRATUITOS típicos (${n(s.visitas_mes_gratuito, 0)} visitas al mes y ${n(mbAntes, 1)} MB cada uno con historial a 30 días); ahora se cuenta el restaurante REGISTRADO, con la mezcla de ${n(q * 1000, 0)} de paga por cada 1,000, donde cada uno de paga guarda ${mesesPaga} meses y llena ${n(pf.mb_paga, 1)} MB (${n(pf.mb_paga / pf.mb_gratuito, 1)} veces un gratuito); (2) la carga del gratuito sale de los topes (${n(pf.visitas_mes, 0)} visitas al mes con ${config.topes.gratuito.mesas} mesas, supuesto), así que un gratuito llena ${n(pf.mb_gratuito, 1)} MB y no ${n(mbAntes, 1)}. El promedio queda en ${n(mbProm, 1)} MB y caben menos. Si todos fueran gratuitos de los topes cabrían ${capPuros}.`,
    desglose: desgloseComposicion,
    por_que_contar_por_dia_ya_no_da_tanto: porQueContarPorDia,
    hallazgo: parteDePaga > 0.5 ? `El disco lo llenan sobre todo los de paga (${n(parteDePaga * 100, 0)} %), que son ${n(q * 100, 1)} % de los restaurantes: su disco cuesta ${n(costoDiscoPaga, 2)} pesos al mes frente a ${n(precio, 0)} que pagan (${n((costoDiscoPaga / precio) * 100, 1)} %). Es una parte chica de lo que pagan: el disco no es el problema económico, sólo el tope técnico del volumen.` : `Los gratuitos llenan ${n(parteGratuitos * 100, 0)} % del disco; los de paga, ${n(parteDePaga * 100, 0)} %.`,
  };
}


// ---------------------------------------------------------------- historia del disco con una mesa de tres comensales
/**
 * Paso a paso, qué fila entra en qué tabla cuando una mesa de tres comensales entra, ordena, llama y se va, con bytes de datos más índices
 * medidos en la copia (bytes por fila = tamaño total de la tabla entre sus filas). Los conteos por sesión salen de los cocientes de la
 * copia (medidos) y los eventos por sesión son un supuesto del generador de datos. Luego, cómo queda lo guardado con cada opción para
 * bajar el uso del disco y cuántos restaurantes caben con cada una (con la carga por topes y el historial del plan gratuito a 30 días).
 */
export function historiaDelDisco(config, s, comensales = 3) {
  const tv = s.tablas_de_una_visita;
  const fv = s.fila_por_visita;
  const f = tv.filas_por_tabla;
  const mps = fv.miembros_por_sesion;
  const porMiembro = (tabla) => f[tabla].filas / fv.visitas_de_comensal_en_la_copia;
  const porSesion = (tabla) => f[tabla].filas / fv.sesiones_en_la_copia;
  const evPorMiembro = tv.eventos_por_sesion / mps;
  const pasos = [
    { paso: 'Escanean el QR: entra el primero y se crea la sesión de la mesa', tabla: 'sesion_grupal', filas: 1, bytes_por_fila: f.sesion_grupal.bytes_por_fila },
    { paso: `Cada comensal entra y se vuelve miembro (${comensales})`, tabla: 'miembro_sesion', filas: comensales, bytes_por_fila: f.miembro_sesion.bytes_por_fila },
    { paso: 'Cada uno abre su orden personal', tabla: 'orden_personal', filas: comensales * porMiembro('orden_personal'), bytes_por_fila: f.orden_personal.bytes_por_fila },
    { paso: `Agregan platillos a su orden (${n1x(porMiembro('item_orden'))} por comensal en la copia)`, tabla: 'item_orden', filas: comensales * porMiembro('item_orden'), bytes_por_fila: f.item_orden.bytes_por_fila },
    { paso: 'La mesa envía la comanda al personal', tabla: 'comanda', filas: porSesion('comanda'), bytes_por_fila: f.comanda.bytes_por_fila },
    { paso: 'La comanda enlaza la orden de cada comensal', tabla: 'comanda_orden', filas: comensales * porMiembro('comanda_orden'), bytes_por_fila: f.comanda_orden.bytes_por_fila },
    { paso: 'Alguien llama al mesero (en la copia: una de cada 3.3 sesiones)', tabla: 'llamada_mesero', filas: porSesion('llamada_mesero'), bytes_por_fila: f.llamada_mesero.bytes_por_fila },
    { paso: `Mientras tanto, el teléfono de cada comensal manda sus eventos (${n1x(evPorMiembro)} por comensal: supuesto del generador)`, tabla: 'evento_analitica', filas: comensales * evPorMiembro, bytes_por_fila: tv.evento_bytes_por_fila },
  ];
  let acum = 0;
  for (const x of pasos) { x.bytes = x.filas * x.bytes_por_fila; acum += x.bytes; x.acumulado = acum; }
  const analitica = pasos[pasos.length - 1].bytes;
  const sinAnalitica = acum - analitica;
  // lo que guardan las opciones de la analítica por mesa de tres (la tabla de la visita no cambia)
  const base = { ...config, topes: { ...config.topes } };
  const caben = (palancas, historial) => {
    const c = { ...base, palancas };
    const cc = historial ? conHistorialGratuito(c, s, 1) : c;
    const r = recursos(cc, s, { canal: 'eventos', carga: 'topes' });
    const d = r.recursos.find((x) => x.recurso === 'disco');
    return historial ? d.con_historial_30_dias.restaurantes_con_eventos : d.restaurantes_con_eventos;
  };
  const mbPorRestMes = (factor) => (factor * tv.evento_bytes_por_fila * tv.eventos_por_sesion * fv.sesiones_en_la_copia) / fv.restaurantes_en_la_copia / 1e6;
  const opciones = [
    { id: 'hoy', nombre: 'Hoy: una fila por evento', palancas: [], factor: 1, que_queda: 'una fila por toque del comensal, con sesión, miembro, platillo, huella de red y navegador', se_pierde: 'nada' },
    { id: 'contar_por_dia', nombre: 'Contar por día', palancas: ['analitica_agregada_por_dia'], factor: s.factores_disco_eventos.agregada_por_dia_cota_alta, que_queda: 'un conteo por restaurante, día, tipo y platillo; crece con los días y los platillos, no con las visitas', se_pierde: 'el detalle por sesión y por teléfono' },
    { id: 'fila_por_visita', nombre: 'Fila por visita de comensal (propuesta de Calvin)', palancas: ['fila_por_visita_de_comensal'], factor: fv.sola, que_queda: 'una fila por comensal y día con veces y segundos en menú, platillo, búsqueda y filtros; crece con las visitas', se_pierde: 'qué platillo se vio y el orden de los toques' },
    { id: 'fila_mas_platillo', nombre: 'Fila por visita más conteo de platillo por día', palancas: ['fila_por_visita_mas_platillo_por_dia'], factor: fv.con_platillo_por_dia, que_queda: 'la fila por visita más un conteo diario por platillo', se_pierde: 'cuál comensal vio cuál platillo' },
    { id: 'adelgazar', nombre: 'Adelgazar la tabla (índices mínimos y tipos chicos)', palancas: ['indices_de_evento_minimos', 'tipos_mas_chicos'], factor: s.factores_disco_eventos.ambos, que_queda: 'una fila por evento, más angosta y con dos índices', se_pierde: 'índices de consulta; huella de red de 8 bytes' },
    { id: 'archivar', nombre: 'Archivar sesiones cerradas en R2', palancas: ['archivar_sesiones_cerradas'], factor: 1, que_queda: 'la base conserva sólo 3 meses de las sesiones del plan de paga; lo viejo sale a un archivo comprimido', se_pierde: 'consulta inmediata de lo viejo; hay que releer del archivo' },
  ];
  for (const o of opciones) {
    o.bytes_analitica_por_mesa_de_3 = analitica * o.factor;
    o.mb_analitica_por_restaurante_mes_en_la_copia = mbPorRestMes(o.factor);
    o.restaurantes_que_caben_sin_purga = caben(o.palancas, false);
    o.restaurantes_que_caben_con_historial_30_dias = caben(o.palancas, true);
  }
  return { comensales, pasos, bytes_de_la_mesa_sin_analitica: sinAnalitica, bytes_de_analitica: analitica, bytes_total: acum, opciones, comprar_disco: 'No cambia los datos guardados: sube el costo del escalón (ver la escalera en recursos y palancas).', supuestos: ['eventos por sesión: 10 (supuesto del generador de datos)', 'contadores de la fila por visita: sintéticos (el tamaño no depende del valor)', 'bytes por fila: con índices, de una copia con datos sintéticos; con tráfico real cambia'] };
}
function n1x(x) { return (Math.round(x * 10) / 10).toLocaleString('en-US'); }


// ---------------------------------------------------------------- lo que cuesta un platillo (el tope de platillos del plan Chef, reabierto)
/**
 * Para decidir el tope de platillos: qué cuesta técnicamente un platillo (bytes en la base, fotos en R2, peso del menú y procesador de
 * armarlo), cuántos restaurantes caben en lo gratuito de R2 con 50, 80, 100 y 150 platillos con foto, cuánto cuesta pasarse, la cobertura
 * con las dos cotas, el efecto en el disco y el procesador, y la conclusión en una frase. Medido con textos y fotos del repositorio
 * (sintéticos); las fotos reales y sus originales son SUPUESTOS marcados.
 */
export function costoDePlatillo(config, s, topes = [50, 80, 100, 150]) {
  const pl = s.platillo;
  const fotoVar = pl.foto_variantes_bytes_real;
  const fotoOrig = pl.foto_original_bytes_tipico;
  const qFija = evaluar(config, s, 1000, { curva: config.curva ?? 'media' }).clientes.de_paga / 1000;
  const filas = topes.map((N) => {
    const c = { ...config, parte_de_paga_fija: qFija, palancas: [...new Set([...(config.palancas ?? []), 'historial_gratuito_30_dias'])], topes: { ...config.topes, gratuito: { ...config.topes.gratuito, platillos: N } } };
    const r = recursos(c, s, { canal: 'eventos', carga: 'topes' });
    const rs = recursos(c, s, { canal: 'sondeo', carga: 'topes' });
    const t30 = (canal) => topesDeTamano(conHistorialGratuito(c, s, 1), s, 'hobby_eventos', canal, 'topes');
    const continuo = { avisos: t30('eventos'), sondeo: t30('sondeo') };
    const gb = (N * pl.parte_con_foto * (fotoOrig + fotoVar)) / 1e9;
    const gbMin = (N * pl.parte_con_foto * (pl.rango_foto_original_bytes[0] + pl.rango_foto_variantes_bytes_real[0])) / 1e9;
    const gbMax = (N * pl.parte_con_foto * (pl.rango_foto_original_bytes[1] + pl.rango_foto_variantes_bytes_real[1])) / 1e9;
    const jsonBytes = pl.menu_json_bytes_por_platillo * N;
    const msArmar = pl.ms_armar_menu_base + pl.ms_armar_menu_por_platillo * N;
    const cap = (res, id) => res.recursos.find((x) => x.recurso === id).con_historial_30_dias.restaurantes_con_eventos;
    const capS = (res, id) => res.recursos.find((x) => x.recurso === id).con_historial_30_dias.restaurantes_hoy;
    const mezcla = evaluar({ ...c, parte_de_paga_fija: undefined }, s, 1000, { curva: config.curva ?? 'media' }).clientes.de_paga;
    const cobertura = { baja: coberturaPlatillos(c, { ...s, cota_platillos: 'baja' }, { tope: N }), alta: coberturaPlatillos(c, { ...s, cota_platillos: 'alta' }, { tope: N }) };
    return {
      platillos: N,
      base_de_datos: { bytes_por_platillo: pl.bytes_en_la_base, bytes_por_restaurante: pl.bytes_en_la_base * N, rango_bytes_por_restaurante: [pl.rango_bytes_en_la_base[0] * N, pl.rango_bytes_en_la_base[1] * N] },
      fotos_en_r2: { gb_por_restaurante: gb, rango_gb: [gbMin, gbMax], restaurantes_que_caben_en_lo_gratis: Math.floor(s.r2_gratis_gb / gb), rango_restaurantes: [Math.floor(s.r2_gratis_gb / gbMax), Math.floor(s.r2_gratis_gb / gbMin)], pesos_al_mes_por_restaurante_si_se_pasa: gb * s.r2_usd_gb_mes * s.fx, con_foto: N * pl.parte_con_foto },
      menu: { json_bytes: jsonBytes, ms_armar_por_cada_30_segundos: msArmar, parte_de_un_nucleo: msArmar / 1000 / pl.armado_cada_segundos },
      cobertura_de_platillos: cobertura,
      clientes_de_paga_por_1000_por_el_tope: mezcla,
      cobertura_de_0_a_5_dentro_de_chef: { baja: coberturaEstratos(c, s, 'centro', 'baja').dentro_0_5, alta: coberturaEstratos(c, s, 'centro', 'alta').dentro_0_5 },
      continuo: { mb_por_restaurante: continuo.avisos.mb_por_restaurante, carga_cpu_total_con_avisos: continuo.avisos.carga_cpu_total, carga_cpu_total_con_sondeo: continuo.sondeo.carga_cpu_total, menu_en_unidades_de_carga_con_avisos: continuo.avisos.menu_en_unidades_de_carga },
      capacidad: { con_avisos: { disco: cap(r, 'disco'), procesador: cap(r, 'procesador'), cuello: r.cuello_con_eventos.con_historial_30_dias.recurso, restaurantes: r.cuello_con_eventos.con_historial_30_dias.restaurantes }, con_sondeo: { disco: capS(rs, 'disco'), procesador: capS(rs, 'procesador'), cuello: rs.cuello_hoy.con_historial_30_dias.recurso, restaurantes: rs.cuello_hoy.con_historial_30_dias.restaurantes } },
    };
  });
  const a = filas[0];
  const z = filas[filas.length - 1];
  const rel = (x, y) => (y - x) / x;
  // efecto por restaurante a mezcla fija: cuánto MENOS cabe por disco (más MB) y por procesador (más carga) al subir el tope
  const efecto = { disco_con_avisos: -rel(a.continuo.mb_por_restaurante, z.continuo.mb_por_restaurante) / (1 + rel(a.continuo.mb_por_restaurante, z.continuo.mb_por_restaurante)), procesador_con_avisos: -rel(a.continuo.carga_cpu_total_con_avisos, z.continuo.carga_cpu_total_con_avisos) / (1 + rel(a.continuo.carga_cpu_total_con_avisos, z.continuo.carga_cpu_total_con_avisos)), disco_con_sondeo: -rel(a.continuo.mb_por_restaurante, z.continuo.mb_por_restaurante) / (1 + rel(a.continuo.mb_por_restaurante, z.continuo.mb_por_restaurante)), procesador_con_sondeo: -rel(a.continuo.carga_cpu_total_con_sondeo, z.continuo.carga_cpu_total_con_sondeo) / (1 + rel(a.continuo.carga_cpu_total_con_sondeo, z.continuo.carga_cpu_total_con_sondeo)) };
  const pct = (x) => `${(Math.abs(x) * 100).toFixed(1)} %`;
  const conclusion = `De ${a.platillos} a ${z.platillos} platillos (con la mezcla de gratuitos y de paga fija): el disco de la base casi no se mueve (caben ${pct(efecto.disco_con_avisos)} menos restaurantes: ${pl.bytes_en_la_base} bytes por platillo); el procesador pierde ${pct(efecto.procesador_con_sondeo)} con el sondeo de hoy y hasta ${pct(efecto.procesador_con_avisos)} con avisos (cota alta: se supone que el menú se arma cada ${pl.armado_cada_segundos} s en la hora pico, de ${a.menu.ms_armar_por_cada_30_segundos.toFixed(0)} a ${z.menu.ms_armar_por_cada_30_segundos.toFixed(0)} ms); NINGUNO de los dos se acaba por el tope: el cuello de botella sigue siendo ${z.capacidad.con_avisos.cuello} (${z.capacidad.con_avisos.restaurantes} restaurantes con avisos y ${z.capacidad.con_sondeo.restaurantes} con el sondeo, con el historial a 30 días). Lo que sí crece es el almacenamiento de fotos en R2 (de ${a.fotos_en_r2.gb_por_restaurante.toFixed(2)} a ${z.fotos_en_r2.gb_por_restaurante.toFixed(2)} GB por restaurante, sobre todo por los originales, que son un supuesto; pasarse de lo gratis cuesta ${z.fotos_en_r2.pesos_al_mes_por_restaurante_si_se_pasa.toFixed(2)} pesos al mes por restaurante) y el menú que baja el teléfono (de ${Math.round(a.menu.json_bytes / 1000)} a ${Math.round(z.menu.json_bytes / 1000)} KB); y el tope cambia cuántos negocios pasan a pagar (de ${a.clientes_de_paga_por_1000_por_el_tope.toFixed(0)} a ${z.clientes_de_paga_por_1000_por_el_tope.toFixed(0)} de paga por cada 1,000).`;
  return { filas, efecto_de_subir_el_tope: { de: a.platillos, a: z.platillos, ...efecto }, conclusion, medido_con: 'textos y fotos del repositorio (sintéticos); fotos reales y originales: supuestos con rango', supuestos: { foto_variantes_bytes_real: fotoVar, foto_original_bytes_tipico: fotoOrig, parte_con_foto: pl.parte_con_foto } };
}

// ---------------------------------------------------------------- lo que deja cada tamaño de negocio
/**
 * Por tramo de personas: negocios que caen en Chef y en Master Chef, ingreso de anuncios de los primeros (tres tarifas) e ingreso de
 * suscripción de los segundos: si todos pagaran y con la curva de pago en los tres escenarios (pesimista, media, optimista). Es un techo
 * teórico, no una proyección: sólo los conteos por estrato son medidos; el reparto entre planes es el modelo de mesas y cuentas.
 */
export function potencialPorTramo(config, s) {
  const base = potencialChef(config, s);
  const ps = config.precios.servicio;
  const curvas = Object.keys(s.curvas_pago);
  const tramos = base.tramos.map((x) => {
    const anuncios = Object.fromEntries(['baja', 'media', 'alta'].map((k) => [k, x.negocios_en_chef * base.potencial_anuncios_mes[k].pesos_por_negocio_al_mes]));
    const suscripcion = {
      si_todos_pagaran: x.negocios_en_master_chef * ps,
      por_curva_de_pago: Object.fromEntries(curvas.map((c) => [c, x.negocios_en_master_chef * conversion(c, ps, s, 'servicio') * ps])),
      parte_que_paga: Object.fromEntries(curvas.map((c) => [c, conversion(c, ps, s, 'servicio')])),
    };
    return { tramo: x.tramo, negocios: x.negocios, en_chef: x.negocios_en_chef, en_master_chef: x.negocios_en_master_chef, parte_en_chef: x.parte_en_chef, ingreso_de_anuncios_al_mes: anuncios, ingreso_de_suscripcion_al_mes: suscripcion };
  });
  const suma = (f) => tramos.reduce((a, x) => a + f(x), 0);
  const nota_curva = 'SUPUESTO: la parte que paga es la misma para todos los tamaños (la curva de pago mira el precio, no el tramo); un negocio de 0 a 5 personas no paga igual de fácil que uno de 51 a 100. Los datos por estrato (2026-11-14-lo-que-paga-un-restaurante-por-estrato.csv) dan gasto en comunicación, publicidad y servicios profesionales, no disposición a pagar por un software, y sus estratos (0 a 10, 11 a 50, 51 a 250) no coinciden con los tramos: no alcanzan para diferenciar la curva. Datos por conseguir: la prueba de precio del piloto, repartida por tamaño del negocio (personas y mesas) y registrando quién acepta cada precio.';
  return { precio_master_chef: ps, nota_curva, tramos, total: { en_chef: suma((x) => x.en_chef), en_master_chef: suma((x) => x.en_master_chef), anuncios_al_mes: Object.fromEntries(['baja', 'media', 'alta'].map((k) => [k, suma((x) => x.ingreso_de_anuncios_al_mes[k])])), suscripcion_si_todos_pagaran: suma((x) => x.ingreso_de_suscripcion_al_mes.si_todos_pagaran), suscripcion_por_curva: Object.fromEntries(curvas.map((c) => [c, suma((x) => x.ingreso_de_suscripcion_al_mes.por_curva_de_pago[c])])) }, supuestos: base.supuestos };
}

// ---------------------------------------------------------------- banderas de operación
/**
 * Banderas ya en producción: dado lo que se mide (`medidas`), dice qué hacer. Umbrales de `s.banderas` (aviso y acción) y costo del paso
 * de `s.escalones`. medidas: { cpu_pct (p95 de la hora pico, % del procesador), disco_pct, conexiones_abiertas, memoria_pct,
 * costo_por_restaurante, ingresos_mes, costos_mes, escalon }. Todo lo que no se mide aún en Railway debe pasarse como `null`.
 */
export function banderas(medidas, s) {
  const u = s.banderas;
  const orden = [...s.escalones].sort((a, b) => a.tope_usd - b.tope_usd);
  const i = Math.max(0, orden.findIndex((e) => e.id === medidas.escalon));
  const sig = orden[i + 1] ?? null;
  const nivel = (v, aviso, accion) => (v == null ? 'sin_medir' : v >= accion ? 'accion' : v >= aviso ? 'aviso' : 'ok');
  const paso = sig ? { a: sig.nombre, cuesta_mas_usd_al_mes: sig.base_usd - orden[i].base_usd } : { a: 'repetir la pila o cambiar de nube (extrapolación sin medir)', cuesta_mas_usd_al_mes: s.instancia_extra_usd };
  const fila = (id, nombre, valor, aviso, accion, que) => ({ id, nombre, valor, nivel: nivel(valor, aviso, accion), umbral_aviso: aviso, umbral_accion: accion, que_hacer: que, paso });
  const out = [
    fila('procesador', 'Procesador (p95 de la hora pico)', medidas.cpu_pct, u.cpu.aviso, u.cpu.accion, 'más procesos o escalón mayor'),
    fila('disco', 'Disco del volumen', medidas.disco_pct, u.disco.aviso, u.disco.accion, 'archivar lo antiguo o pasar a Pro (50 GB)'),
    fila('conexiones', 'Conexiones abiertas (eventos)', medidas.conexiones_abiertas == null ? null : (100 * medidas.conexiones_abiertas) / s.cap_conexiones, u.conexiones.aviso, u.conexiones.accion, 'la pila de 8 procesos llega a 10,000: repetir la pila o cambiar de nube'),
    fila('memoria', 'Memoria', medidas.memoria_pct, u.memoria.aviso, u.memoria.accion, 'más memoria por proceso o menos procesos por servicio'),
    fila('costo_por_restaurante', 'Costo por restaurante (pesos al mes)', medidas.costo_por_restaurante, u.costo_por_restaurante.aviso, u.costo_por_restaurante.accion, 'revisar escalón, soporte y fotos'),
  ];
  const razon = medidas.ingresos_mes != null && medidas.costos_mes > 0 ? (100 * medidas.costos_mes) / medidas.ingresos_mes : null;
  out.push(fila('costos_sobre_ingresos', 'Costos sobre ingresos (%)', razon, u.costos_sobre_ingresos.aviso, u.costos_sobre_ingresos.accion, 'subir el precio, acotar el soporte o empezar los anuncios'));
  return out;
}

// ---------------------------------------------------------------- proyección en el tiempo
/**
 * Trayectoria mes a mes: restaurantes(t) = a·t^b con restaurantes(12) = meta12 y restaurantes(24) = meta24.
 * La adopción es una CURVA SUPUESTA (no una predicción). Los anuncios empiezan en `mes_inicio_anuncios` (antes, pone Calvin).
 * Altas del mes = Δpagantes + bajas; captación = altas × cac. `financiamiento_maximo` = lo más que Calvin tiene que poner acumulado.
 */
export function proyectar(config, s, meses = 24, opc = {}) {
  const b = Math.log(s.meta_24_meses / s.meta_12_meses) / Math.log(2);
  const a = s.meta_12_meses / Math.pow(12, b);
  const filas = [];
  let acum = 0;
  let acumCap = 0;
  let previo = 0;
  let mesOp = null;
  let mesCap = null;
  let minAcum = 0;
  for (let t = 1; t <= meses; t++) {
    const n = Math.max(1, Math.round(a * Math.pow(t, b)));
    const conAds = t >= s.mes_inicio_anuncios;
    const e = evaluar(config, s, n, { ...opc, sinAnuncios: opc.sinAnuncios === true || !conAds });
    const pag = e.clientes.de_paga;
    const bajas = s.churn_mensual * previo;
    const altas = Math.max(0, pag - previo + bajas);
    const captacion = altas * s.cac;
    const mOp = e.margen_operacion;
    const mCap = mOp - captacion - s.sueldos_mes;
    acum += mOp;
    acumCap += mCap;
    minAcum = Math.min(minAcum, acumCap);
    if (mesOp === null && mOp >= 0) mesOp = t;
    if (mesCap === null && mCap >= 0) mesCap = t;
    previo = pag;
    filas.push({ mes: t, restaurantes: n, pagantes: pag, altas, bajas, con_anuncios: conAds, comensales_mes: e.comensales_mes, ingresos: e.ingresos.total, ingresos_suscripcion: e.ingresos.suscripcion, ingresos_anuncios: e.ingresos.anuncios, costos: e.costos.total, costos_detalle: e.costos, captacion, margen: mOp, margen_operacion: mOp, margen_despues_de_captacion: mCap, margen_acumulado: acum, margen_acumulado_despues_de_captacion: acumCap, escalon: e.capacidad.escalon, muro: e.capacidad.muro_que_manda, requiere_arquitectura: e.capacidad.requiere_arquitectura, extrapolacion_sin_medir: e.extrapolacion_sin_medir });
  }
  return { parametros_curva: { a, b }, mes_inicio_anuncios: s.mes_inicio_anuncios, filas, mes_primer_margen_positivo: mesOp, mes_primer_margen_positivo_despues_de_captacion: mesCap, financiamiento_maximo: -minAcum, nota: 'adopción supuesta; sin dato de bajas ni de costo de captación' };
}

// ---------------------------------------------------------------- sensibilidad (en llano)
const PARAMS_SENS = [
  ['curva · mediana', 'cuánto está dispuesto a pagar el dueño promedio', 'prueba de precio del piloto (Van Westendorp y escalera)', (s, f, curva) => ({ ...s, curvas_pago: { ...s.curvas_pago, [curva]: { ...s.curvas_pago[curva], mediana: s.curvas_pago[curva].mediana * f } } })],
  ['curva · techo', 'qué parte de los que rebasan los topes llega a pagar', 'prueba de precio del piloto: cuántos de cada 10 aceptan', (s, f, curva) => ({ ...s, curvas_pago: { ...s.curvas_pago, [curva]: { ...s.curvas_pago[curva], techo: Math.min(1, s.curvas_pago[curva].techo * f) } } })],
  ['curva · sigma', 'qué tan distintos son los dueños en lo que pagarían', 'prueba de precio del piloto: dispersión de las respuestas', (s, f, curva) => ({ ...s, curvas_pago: { ...s.curvas_pago, [curva]: { ...s.curvas_pago[curva], sigma: s.curvas_pago[curva].sigma * f } } })],
  ['cuántos rebasan los topes', 'cuántos negocios pasan del tope de mesas o cuentas del plan gratuito', 'mesas y cuentas reales de los primeros 10 a 20 restaurantes', (s, f) => ({ ...s, empuja_conjunto: { ...s.empuja_conjunto, centro: s.empuja_conjunto.centro.map((r) => r.map((y) => Math.min(1, y * f))) } })],
  ['soporte por cliente de paga', 'cuánto tiempo de soporte requiere cada cliente de paga', 'tickets y minutos de soporte del piloto', (s, f) => ({ ...s, soporte_servicio: s.soporte_servicio * f, soporte_salon: s.soporte_salon * f })],
  ['soporte por cliente gratuito', 'cuánto tiempo de soporte requiere cada cliente gratuito', 'tickets y minutos de soporte del piloto', (s, f) => ({ ...s, soporte_gratuito: s.soporte_gratuito * f })],
  ['bajas mensuales', 'cuántos clientes de paga se dan de baja cada mes', 'permanencia de los clientes de paga del piloto', (s, f) => ({ ...s, churn_mensual: s.churn_mensual * f })],
  ['costo de conseguir un cliente', 'cuánto cuesta conseguir un cliente de paga', 'horas y gastos comerciales por restaurante registrado y por restaurante de paga', (s, f) => ({ ...s, cac: s.cac * f })],
  ['tarifa de anuncios', 'cuánto deja cada mil visitas con anuncio', 'prueba pequeña de AdSense con 3 restaurantes', (s, f) => ({ ...s, anuncio_pesos_por_mil: Object.fromEntries(Object.entries(s.anuncio_pesos_por_mil).map(([k, v]) => [k, v * f])) })],
  ['visitas con anuncio', 'en qué parte de las visitas se ve un anuncio', 'prueba pequeña de AdSense con 3 restaurantes', (s, f) => ({ ...s, parte_visitas_con_anuncio: Math.min(1, s.parte_visitas_con_anuncio * f) })],
  ['visitas con la app por gratuito', 'cuántas visitas con la app tiene cada restaurante gratuito', 'eventos scan del piloto', (s, f) => ({ ...s, visitas_app_gratuito: s.visitas_app_gratuito * f })],
  ['pago con tarjeta', 'qué parte de los clientes de paga paga con tarjeta (y sufre la comisión)', 'forma de pago elegida en el piloto', (s, f) => ({ ...s, pago_con_tarjeta: Math.min(1, s.pago_con_tarjeta * f) })],
  ['parte tamaño Chef Ejecutivo', 'cuántos negocios son de 101 o más personas', 'topes reales y estratos de los registrados', (s, f) => ({ ...s, parte_salon: s.parte_salon * f })],
  ['peso de un cliente de paga en el procesador', 'cuánto procesador gasta un cliente de paga frente a uno gratuito', 'prueba de carga (T-4.4)', (s, f) => ({ ...s, peso_servicio_cpu: s.peso_servicio_cpu * f })],
  ['reserva de disco', 'cuánto disco se pierde en bitácora e hinchazón', 'pgstattuple y pg_ls_waldir() en producción', (s, f) => ({ ...s, reserva_disco: Math.min(0.9, s.reserva_disco * f) })],
];

/**
 * Efecto de mover cada supuesto a la mitad y a 1.5 veces sobre el margen, ordenado de mayor a menor, con una FRASE EN LLANO por supuesto
 * («si … fuera la mitad de lo que supusimos, el margen baja de A a B») y qué dato medir primero.
 * opc: { curva, metrica: 'operacion' | 'captacion', sinAnuncios }
 */
export function sensibilidad(config, s, n, opc = {}) {
  const curva = opc.curva ?? config.curva;
  const m = (ss) => { const e = evaluar(config, ss, n, { curva, sinAnuncios: opc.sinAnuncios }); return opc.metrica === 'captacion' ? e.margen_despues_de_captacion : e.margen_operacion; };
  const base = m(s);
  const f0 = (x) => Math.round(x).toLocaleString('en-US');
  const filas = PARAMS_SENS.map(([nombre, que, medir, f]) => {
    const bajo = m(f(s, 0.5, curva));
    const alto = m(f(s, 1.5, curva));
    const verbo = (x) => (x >= base ? 'sube' : 'baja');
    return { supuesto: nombre, margen_con_mitad: bajo, margen_con_mitad_mas: alto, efecto: Math.abs(alto - bajo), rango: [Math.min(bajo, alto, base), Math.max(bajo, alto, base)], que_es: que, medir_en_el_piloto: medir, frase: `Si ${que} fuera la mitad de lo que supusimos, el margen ${verbo(bajo)} de ${f0(base)} a ${f0(bajo)}; si fuera una vez y media, ${verbo(alto)} a ${f0(alto)}.` };
  });
  filas.sort((a, b) => b.efecto - a.efecto);
  return { n, curva, base, filas, medir_primero: filas.slice(0, 5).map((f) => ({ supuesto: f.supuesto, como: f.medir_en_el_piloto, efecto: f.efecto })) };
}

// ---------------------------------------------------------------- optimizar
const REJILLA = {
  precio_servicio: Array.from({ length: 25 }, (_, i) => 100 + 25 * i), // 100 a 700 cada 25
  mesas: [8, 10, 12, 15, 16, 20, 25, 30, 40, 60],
  cuentas: [3, 4, 5, 6, 8, 10],
  platillos: [80, 100, 150, 300],
  precio_salon: [599, 799, 1099, 1599, 1999],
};

/**
 * Búsqueda en rejilla. Los topes del gratuito NO son un óptimo: son consecuencia de `restriccion_seguridad_chico` (con qué seguridad un
 * negocio de hasta 10 personas queda dentro del gratuito; decisión de Calvin) y del modelo de mesas y cuentas. Dentro de lo que cumple
 * la restricción se elige el mejor margen de operación.
 * restricciones: { n, curva, seguridad, clave: 'centro'|'minimo', minPlatillos, sinAnuncios }
 * Devuelve: mejor, meseta del precio de Master Chef (margen a menos de 2 %), precio de Chef Ejecutivo, frontera y `tabla_cupo_gratis`
 * (para seguridad 80, 90 y 95 %: topes, precio y margen).
 */
export function optimizar(s, restricciones = {}, base = configInicial()) {
  const r = { n: s.n_referencia, curva: 'media', seguridad: s.restriccion_seguridad_chico, clave: 'centro', minPlatillos: 80, sinAnuncios: false, ...restricciones };
  const evaluadas = [];
  let descartadas = 0;
  for (const mesas of REJILLA.mesas)
    for (const cuentas of REJILLA.cuentas)
      for (const platillos of REJILLA.platillos) {
        if (platillos < r.minPlatillos) { descartadas++; continue; }
        const c0 = JSON.parse(JSON.stringify(base));
        c0.topes.gratuito.mesas = mesas;
        c0.topes.gratuito.cuentas = cuentas;
        c0.topes.gratuito.platillos = platillos;
        const seg = seguridadChico(c0, s, r.clave);
        const dentro = 1 - parteRebasa(c0, s);
        const curvaPrecio = [];
        for (const ps of REJILLA.precio_servicio) {
          const c = JSON.parse(JSON.stringify(c0));
          c.precios.servicio = ps;
          const e = evaluar(c, s, r.n, { curva: r.curva, sinAnuncios: r.sinAnuncios });
          if (e.capacidad.requiere_arquitectura) { descartadas++; continue; }
          curvaPrecio.push({ precio: ps, margen: e.margen_operacion, pagantes: e.clientes.de_paga, config: c, escalon: e.capacidad.escalon, muro: e.capacidad.muro_que_manda });
        }
        if (!curvaPrecio.length) continue;
        const mejorP = curvaPrecio.reduce((a, b) => (b.margen > a.margen ? b : a));
        const meseta = curvaPrecio.filter((x) => x.margen >= 0.98 * mejorP.margen).map((x) => x.precio);
        evaluadas.push({ seguridad_chico: seg, dentro, mesas, cuentas, platillos, mejor_precio: mejorP.precio, margen: mejorP.margen, pagantes: mejorP.pagantes, meseta: [Math.min(...meseta), Math.max(...meseta)], escalon: mejorP.escalon, muro: mejorP.muro, config: mejorP.config, curva_de_precio: curvaPrecio.map((x) => [x.precio, x.margen]) });
      }
  const validas = evaluadas.filter((e) => e.seguridad_chico >= r.seguridad - 1e-9).sort((a, b) => b.margen - a.margen);
  const mejor = validas[0] ?? null;
  let salon = null;
  if (mejor) {
    const cs = REJILLA.precio_salon.map((p) => { const c = JSON.parse(JSON.stringify(mejor.config)); c.precios.salon = p; return [p, evaluar(c, s, r.n, { curva: r.curva, sinAnuncios: r.sinAnuncios }).margen_operacion]; });
    const mx = Math.max(...cs.map((x) => x[1]));
    const alto = cs.filter((x) => x[1] >= 0.98 * mx).map((x) => x[0]);
    salon = { curva_de_precio: cs, mejor_precio: cs.find((x) => x[1] === mx)[0], meseta: [Math.min(...alto), Math.max(...alto)], diferencia_max_min: mx - Math.min(...cs.map((x) => x[1])) };
  }
  // frontera: para cada nivel de seguridad (a 5 puntos), el mejor margen
  const nivelDe = (e) => Math.floor(e.seguridad_chico * 20) / 20;
  const porNivel = new Map();
  for (const e of evaluadas) { const k = nivelDe(e); const p = porNivel.get(k); if (!p || e.margen > p.margen) porNivel.set(k, e); }
  const frontera = [...porNivel.entries()].sort((a, b) => a[0] - b[0]).map(([nivel, e]) => ({ seguridad_chico_desde: nivel, seguridad_chico: e.seguridad_chico, dentro_de_todos: e.dentro, margen: e.margen, pagantes: e.pagantes, precio_servicio: e.mejor_precio, mesas: e.mesas, cuentas: e.cuentas, platillos: e.platillos }));
  const tabla = [0.8, 0.9, 0.95].map((x) => { const v = evaluadas.filter((e) => e.seguridad_chico >= x - 1e-9).sort((a, b) => b.margen - a.margen)[0]; const segBaja = v ? seguridadChico(v.config, { ...s, cota_platillos: 'baja' }, r.clave) : null; if (!v) return { seguridad: x, sin_solucion: true }; const cP = JSON.parse(JSON.stringify(v.config)); cP.precios.servicio = base.precios.servicio; const mP = evaluar(cP, s, r.n, { curva: r.curva, sinAnuncios: r.sinAnuncios }); return v ? { seguridad: x, seguridad_real: v.seguridad_chico, dentro_de_todos: v.dentro, mesas: v.mesas, cuentas: v.cuentas, platillos: v.platillos, precio_servicio: v.mejor_precio, meseta_precio: v.meseta, pagantes: v.pagantes, margen: v.margen, seguridad_con_cota_baja: segBaja, precio_de_la_config: base.precios.servicio, margen_al_precio_de_la_config: mP.margen_operacion } : { seguridad: x, sin_solucion: true }; });
  const claves = ['centro', 'minimo'];
  const sensibilidadClave = Object.fromEntries(claves.map((k) => [k, mejor ? { seguridad_chico: seguridadChico(mejor.config, s, k), dentro_de_todos: 1 - parteRebasa(mejor.config, s, k === 'minimo' ? 'maximo' : 'centro') } : null]));
  return { restricciones: r, mejor, meseta_precio_servicio: mejor ? mejor.meseta : null, precio_salon: salon, top5: validas.slice(0, 5), frontera, tabla_cupo_gratis: tabla, sensibilidad_modelo_mesas_cuentas: sensibilidadClave, evaluadas: evaluadas.length, descartadas };
}
