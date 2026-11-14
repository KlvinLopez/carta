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

export const VERSION = '2026-11-14-r3';

// ---------------------------------------------------------------- utilidades
/** Aplana el JSON de parámetros {parametros:{clave:{valor}}} a {clave: valor}; `sobre` sustituye valores. */
export function valores(par, sobre = {}) {
  const out = {};
  for (const [k, v] of Object.entries(par.parametros)) out[k] = v.valor;
  return { ...out, ...sobre };
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
 * Configuración inicial = «segmentación de Calvin»: Chef (gratis) = negocios de 0 a 10 personas, Master Chef = 11 a 100,
 * Chef Ejecutivo = 101 o más, traducidos a topes que el producto sí aplica (mesas, cuentas de personal, platillos).
 * Los anuncios van en Chef; empiezan en `supuestos.mes_inicio_anuncios` (en régimen, `evaluar` los incluye).
 * `configBase` es alias de esta función. La configuración anterior se conserva como `configTopes10Mesas3Cuentas()`.
 */
export function configInicial() {
  return {
    nombre: 'segmentación de Calvin',
    precios: { servicio: 225, salon: 1099 },
    topes: {
      gratuito: { platillos: 150, mesas: 15, cuentas: 4, lecturas_pdf: 3, meses_en_linea: 1 },
      servicio: { platillos: 300, mesas: 100, cuentas: 30, lecturas_pdf_mes: 10, meses_en_linea: 12 },
      salon: { platillos: 300, mesas: 500, cuentas: 150, lecturas_pdf_mes: 20, meses_en_linea: 12 },
    },
    disco: { meses_analitica_en_linea: { gratuito: 1, servicio: 1, salon: 1 }, archivar: true },
    anuncios: { activo: true, tarifa: 'baja' }, // el plan gratuito lleva anuncios; llegan en s.mes_inicio_anuncios
    curva: 'media',
    competencia: { sustituto: 'Meniu Business', k: 1.0 }, // sólo para la sugerencia de precio
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
  const plat = interp(s.empuja_platillos, g.platillos);
  const pdf = s.empuja_pdf_gratuito ?? 0;
  return clamp(1 - (1 - conj) * (1 - plat) * (1 - pdf), 0, 1);
}

/** Parte de los registrados que rebasa también los topes de Master Chef (es de tamaño Chef Ejecutivo). */
export function parteSalon(config, s) {
  const t = config.topes.servicio;
  return clamp(interp2(s.empuja_conjunto, t.mesas, t.cuentas, 'centro'), 0, 1);
}

/**
 * Probabilidad de que un negocio de hasta 10 personas quede dentro de los topes de Chef (gratis): dentro de mesas y cuentas
 * (modelo) y dentro del tope de platillos (independiente del tamaño). `clave`: 'centro' | 'minimo'.
 */
export function seguridadChico(config, s, clave = 'centro') {
  const g = config.topes.gratuito;
  const conj = clamp(interp2(s.seguridad_chico, g.mesas, g.cuentas, clave), 0, 1);
  return conj * (1 - interp(s.empuja_platillos, g.platillos)) * (1 - (s.empuja_pdf_gratuito ?? 0));
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
/** MB en línea por restaurante de un plan en régimen. */
export function mbPorRestaurante(plan, config, s) {
  const mezcla = plan === 'gratuito' ? s.mezcla_gratuito : plan === 'servicio' ? s.mezcla_paga : { grande: 1 };
  const mv = config.topes[plan].meses_en_linea;
  const me = config.disco.meses_analitica_en_linea[plan];
  let t = 0;
  for (const [perfil, w] of Object.entries(mezcla)) {
    const d = s.disco_perfiles[perfil];
    t += w * (d.mb_fijo + mv * d.mb_mes_visitas + me * d.mb_mes_eventos);
  }
  return t;
}

/** Cuántos restaurantes de un plan caben en un volumen (GB) sin reserva (como en los informes). */
export function cabenEnVolumen(mbPorRest, s, volumenGb = 5) {
  return Math.floor((volumenGb * 1e9 - s.base_vacia_mb * 1e6) / (mbPorRest * 1e6));
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
  const salonParte = Math.min(parteSalon(config, s), rebasa);
  const ps = config.precios.servicio;
  const pl = config.precios.salon;
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
  const rec = evaluar(config, s, n, { curva: 'media' });
  const peor = evaluar(config, s, n, { curva: 'pesimista', sinAnuncios: true });
  const mejor = evaluar(config, s, n, { curva: 'optimista', anuncios: { activo: true, tarifa: 'media' } });
  const cap = (id) => { const e = s.escalones.find((x) => x.id === id); const mb = mbPorRestaurante('gratuito', config, s); return Math.min(e.cap_cpu, s.cap_conexiones, Math.floor((e.volumen_gb * 1000 * (1 - s.reserva_disco) - s.base_vacia_mb) / mb)); };
  const fila = (clave, nombre, unidad, r, p, m, nota) => ({ clave, nombre, unidad, recomendado: r, peor: p, mejor: m, nota });
  return {
    n,
    definiciones: {
      recomendado: 'curva de pago media (la mediana de Master Chef es el precio de Meniu Business, 225) y anuncios en la tarifa baja ya en marcha',
      peor: 'curva de pago pesimista y todavía sin anuncios (temporal: los pone Calvin de su bolsa)',
      mejor: 'curva de pago optimista y anuncios en la tarifa media (el techo teórico «todos pagan» va aparte, en `todos_pagan`)',
    },
    cifras: [
      fila('clientes_potenciales', 'Clientes potenciales', 'negocios', s.sam_clientes_potenciales, s.sam_clientes_potenciales, s.sam_clientes_potenciales, 'dato medido (DENUE 05/2026): no varía con los escenarios'),
      fila('restaurantes_que_caben', 'Restaurantes gratuitos que caben', 'restaurantes', cap('hobby_eventos'), cap('hobby_sondeo'), cap('pro_8'), 'recomendado = escalón Hobby con eventos (por disco); peor = Hobby con sondeo (por procesador); mejor = Pro de 8 procesos (10,000 conexiones)'),
      fila('gratuitos_por_cliente_de_paga', 'Gratuitos que sostiene cada cliente de paga (sin anuncios)', 'restaurantes', rec.gratuitos_que_sostiene_un_pagante_sin_anuncios, peor.gratuitos_que_sostiene_un_pagante_sin_anuncios, mejor.gratuitos_que_sostiene_un_pagante_sin_anuncios, 'con anuncios en marcha cada gratuito se paga solo si deja más de lo que cuesta (`se_paga_solo`)'),
      fila('ingreso_por_cliente_gratuito', 'Ingreso por cliente gratuito', 'pesos al mes', rec.por_cliente.ingreso_gratuito, peor.por_cliente.ingreso_gratuito, mejor.por_cliente.ingreso_gratuito, 'sólo anuncios'),
      fila('ingreso_por_cliente_de_paga', 'Ingreso por cliente de paga', 'pesos al mes', rec.por_cliente.ingreso_por_pagante, peor.por_cliente.ingreso_por_pagante, mejor.por_cliente.ingreso_por_pagante, 'promedio entre Master Chef y Chef Ejecutivo según cuántos hay de cada uno'),
      fila('costo_por_cliente_gratuito', 'Costo por cliente gratuito', 'pesos al mes', rec.por_cliente.costo_gratuito, peor.por_cliente.costo_gratuito, mejor.por_cliente.costo_gratuito, 'servidor, almacenamiento y soporte'),
      fila('margen_de_operacion', 'Margen de operación', 'pesos al mes', rec.margen_operacion, peor.margen_operacion, mejor.margen_operacion, 'sin captación ni sueldos'),
      fila('margen_despues_de_captacion', 'Margen después de captación', 'pesos al mes', rec.margen_despues_de_captacion, peor.margen_despues_de_captacion, mejor.margen_despues_de_captacion, 'resta reponer las bajas y los sueldos (parámetros sin dato)'),
      fila('punto_de_equilibrio', 'Punto de equilibrio', 'clientes de paga', rec.equilibrio_pagantes, peor.equilibrio_pagantes, mejor.equilibrio_pagantes, 'cuántos clientes de paga hacen falta para no perder (el peor caso lo calcula sin anuncios)'),
      fila('comensales_al_mes', 'Comensales al mes', 'comensales', rec.comensales_mes, peor.comensales_mes, mejor.comensales_mes, 'dato por restaurante SIMULADO (perfiles del simulador), no medido'),
    ],
    todos_pagan: { definicion: 'techo teórico: todos los registrados pagan su plan (muy improbable)', margen_operacion: evaluar(config, s, n, { todosPagan: true }).margen_operacion, ingresos: evaluar(config, s, n, { todosPagan: true }).ingresos.total },
  };
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
  mesas: [8, 10, 12, 15, 16, 20, 25],
  cuentas: [3, 4, 5, 6, 8],
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
  const tabla = [0.8, 0.9, 0.95].map((x) => { const v = evaluadas.filter((e) => e.seguridad_chico >= x - 1e-9).sort((a, b) => b.margen - a.margen)[0]; return v ? { seguridad: x, seguridad_real: v.seguridad_chico, dentro_de_todos: v.dentro, mesas: v.mesas, cuentas: v.cuentas, platillos: v.platillos, precio_servicio: v.mejor_precio, meseta_precio: v.meseta, pagantes: v.pagantes, margen: v.margen } : { seguridad: x, sin_solucion: true }; });
  const claves = ['centro', 'minimo'];
  const sensibilidadClave = Object.fromEntries(claves.map((k) => [k, mejor ? { seguridad_chico: seguridadChico(mejor.config, s, k), dentro_de_todos: 1 - parteRebasa(mejor.config, s, k === 'minimo' ? 'maximo' : 'centro') } : null]));
  return { restricciones: r, mejor, meseta_precio_servicio: mejor ? mejor.meseta : null, precio_salon: salon, top5: validas.slice(0, 5), frontera, tabla_cupo_gratis: tabla, sensibilidad_modelo_mesas_cuentas: sensibilidadClave, evaluadas: evaluadas.length, descartadas };
}
