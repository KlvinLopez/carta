// Modelo de escenarios de Carta (2026-11-14, revisado el mismo día). Módulo ES sin dependencias, funciones puras.
// Corre igual en `node` y en el navegador: no usa fs, process, window ni fetch.
// Todo parámetro entra por `supuestos` (use `valores(parametros.json)`), con su origen y rango en
// 2026-11-14-parametros.json. Moneda: pesos mexicanos, antes de IVA salvo que se diga lo contrario.
//
// Honestidad del modelo:
//  · La curva «cuántos pagan a qué precio» es SUPUESTO (no hay dato de disposición a pagar); el precio óptimo
//    es función directa de su mediana, sigma y techo. La sustituye la prueba del piloto.
//  · Los anuncios NO están construidos ni aprobados (supuestos.anuncios_aprobados = false): sólo suman en los
//    escenarios marcados «condicional». El peor caso firme es sin anuncios.
//  · Los topes del plan gratuito son consecuencia de `restriccion_min_dentro` (cuánto quiere Calvin que quepa
//    gratis), no un óptimo.
//  · Más allá de la capacidad medida (cap_conexiones gratuitos típicos) todo costo es EXTRAPOLACIÓN sin medir.

export const VERSION = '2026-11-14-r2';

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
 * UNA sola configuración inicial con nombre claro: «recomendada, sin anuncios» (lo que existe hoy: los anuncios
 * no están aprobados ni construidos). `configBase` es un alias para no romper a quien ya la importa; antes
 * devolvía otra configuración (299/399, 3 meses, anuncios a tarifa media): ya no.
 */
export function configInicial() {
  return {
    nombre: 'recomendada sin anuncios',
    precios: { servicio: 299, salon: 499 },
    topes: {
      gratuito: { platillos: 80, mesas: 10, cuentas: 3, lecturas_pdf: 3, meses_en_linea: 1 },
      servicio: { platillos: 300, mesas: 40, cuentas: 20, lecturas_pdf_mes: 10, meses_en_linea: 12 },
      salon: { platillos: 300, mesas: 100, cuentas: 50, lecturas_pdf_mes: 20, meses_en_linea: 12 },
    },
    disco: { meses_analitica_en_linea: { gratuito: 1, servicio: 1, salon: 1 }, archivar: true },
    anuncios: { activo: false, tarifa: 'baja' }, // sólo suman si además supuestos.anuncios_aprobados = true
    curva: 'media',
    competencia: { sustituto: 'Fudo Avanzado', k: 0.5 }, // sólo para la sugerencia de precio
  };
}
export const configBase = configInicial;

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
/** Parte de los registrados que rebasa al menos un tope del gratuito (modelo de traslape ρ = supuestos.traslape_topes). */
export function parteRebasa(config, s) {
  const g = config.topes.gratuito;
  const p = [interp(s.empuja_mesas, g.mesas), interp(s.empuja_cuentas, g.cuentas), interp(s.empuja_platillos, g.platillos), s.empuja_pdf_gratuito];
  const mayor = Math.max(...p);
  return clamp(mayor + s.traslape_topes * (suma(p) - mayor), 0, 1);
}

/** Parte de los que rebasan que llega a pagar a ese precio, según la curva (lognormal con techo). Precio ≤ 0 = nadie «paga». */
export function conversion(curva, precio, s) {
  const c = s.curvas_pago[curva];
  if (precio <= 0) return 0;
  return c.techo * (1 - phi((Math.log(precio) - Math.log(c.mediana)) / c.sigma));
}

const margenPorElegible = (curva, p, s, plan) => conversion(curva, p, s) * (p - s[SOPORTE[plan]] - comisionTarjeta(p, s));

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
/**
 * Evalúa una configuración con n restaurantes registrados (en régimen).
 * Los clientes son VALORES ESPERADOS (pueden ser fracciones; con `opc.redondear` salen enteros).
 * opc: { curva, todosPagan, anuncios, anunciosAprobados, redondear }
 *  - anunciosAprobados: por defecto supuestos.anuncios_aprobados (false hoy). Con true se evalúa el caso CONDICIONAL.
 * Márgenes: `margen` = de operación (sin captación ni sueldos); `margen_despues_de_captacion` resta la reposición
 * de bajas (churn × pagantes × cac) y los sueldos; `margen_neto` resta además los impuestos sobre lo positivo.
 */
export function evaluar(config, s, n, opc = {}) {
  const curva = opc.curva ?? config.curva;
  const anuncios = opc.anuncios ?? config.anuncios;
  const aprobados = opc.anunciosAprobados ?? s.anuncios_aprobados;
  const rebasa = parteRebasa(config, s);
  const salonParte = Math.min(s.parte_salon, rebasa);
  const ps = config.precios.servicio;
  const pl = config.precios.salon;
  let pagS, pagL;
  if (opc.todosPagan) {
    pagL = pl > 0 ? n * s.parte_salon : 0;
    pagS = ps > 0 ? n - n * s.parte_salon : 0;
    if (pl <= 0 && ps > 0) pagS = n;
  } else {
    pagL = pl > 0 ? n * salonParte * conversion(curva, pl, s) : 0;
    pagS = ps > 0 ? n * (rebasa - salonParte) * conversion(curva, ps, s) : 0;
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
  const tarifa = anuncios.activo && aprobados ? s.anuncio_pesos_por_mil[anuncios.tarifa] : 0;
  const ads = (gratis * s.visitas_app_gratuito * s.parte_visitas_con_anuncio * tarifa) / 1000;
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
  const adsGratuito = (s.visitas_app_gratuito * s.parte_visitas_con_anuncio * tarifa) / 1000;
  const costoServicio = costoPorCarga * s.peso_servicio_cpu + s.soporte_servicio + comisionTarjeta(ps, s);
  const unidadServicio = ps - costoServicio;
  const netoGratuito = costoGratuito - adsGratuito;
  const sePagaSolo = netoGratuito <= 0;
  const sostiene = !sePagaSolo && ps > 0 ? unidadServicio / netoGratuito : null; // null = el gratuito se paga solo con anuncios (ver se_paga_solo)
  const sostieneSinAds = ps > 0 && costoGratuito > 0 ? unidadServicio / costoGratuito : null;

  // punto de equilibrio con este n: pagantes que faltan para que el margen de operación sea 0
  const mbTodos = s.base_vacia_mb + n * mbG;
  const srv0 = escalonPara(n, mbTodos, s);
  const costo0 = srv0.costo_usd * fx + (s.dominio_usd_anio / 12) * fx + (mbTodos / 1000) * s.volumen_usd_gb_mes * fx + n * s.soporte_gratuito;
  const ads0 = (n * s.visitas_app_gratuito * s.parte_visitas_con_anuncio * tarifa) / 1000;
  const equilibrio = unidadServicio > 0 ? Math.max(0, (costo0 - ads0) / unidadServicio) : null;

  return {
    n, rebasan_topes: rebasa, curva, valores_esperados: !opc.redondear, anuncios_aprobados: aprobados && anuncios.activo,
    clientes: { gratuito: gratis, servicio: pagS, salon: pagL, de_paga: pagS + pagL },
    capacidad: { carga_en_gratuitos_tipicos: carga, disco_mb: discoMb, ...srv, mb_por_restaurante: { gratuito: mbG, servicio: mbS, salon: mbL } },
    extrapolacion_sin_medir: srv.extrapolacion_sin_medir,
    ingresos: { suscripcion, anuncios: ads, total: ingresos },
    costos: { servidor, almacenamiento, objetos, soporte, comision, total: costos },
    captacion: { reposicion_de_bajas: captacion, sueldos: s.sueldos_mes },
    margen: { pesos: margen, porcentaje: ingresos > 0 ? margen / ingresos : null },
    margen_operacion: margen, // sin captación ni sueldos
    margen_despues_de_captacion: despuesCaptacion,
    margen_neto: neto,
    por_cliente: { ingreso_gratuito: adsGratuito, costo_gratuito: costoGratuito, ingreso_servicio: ps, costo_servicio: costoServicio, margen_servicio: unidadServicio },
    equilibrio_pagantes: equilibrio,
    se_paga_solo: sePagaSolo, // true = con anuncios cada gratuito deja más de lo que cuesta: gratuitos_que_sostiene_un_pagante es null
    gratuitos_que_sostiene_un_pagante: sostiene,
    gratuitos_que_sostiene_un_pagante_sin_anuncios: sostieneSinAds,
    gratuitos_que_sostiene_un_pagante_solo_variable: s.costo_var_gratuito + s.soporte_gratuito > 0 && ps > 0 ? unidadServicio / (s.costo_var_gratuito + s.soporte_gratuito) : null,
  };
}

// ---------------------------------------------------------------- escenarios con nombre
const sinPago = (s) => ({ ...s, curvas_pago: Object.fromEntries(Object.entries(s.curvas_pago).map(([k, v]) => [k, { ...v, techo: 0 }])) });

/**
 * peor_firme = todos gratuitos SIN anuncios (lo que existe hoy). Los `peor_anuncios_*` son CONDICIONALES a que los
 * anuncios se aprueben y se construyan; `peor_anuncios_adversos` = tarifa a la mitad y 30 % de las visitas con anuncio.
 * Los nombres antiguos (`peor_sin_anuncios`, `peor_anuncios_tarifa_baja`, `peor_anuncios_tarifa_media`) se conservan.
 */
export function escenarios(config, s, ns = [100, 1000, 10000]) {
  const s0 = sinPago(s);
  const adv = { ...s0, anuncio_pesos_por_mil: { ...s0.anuncio_pesos_por_mil, baja: s0.anuncio_pesos_por_mil.baja / 2 }, parte_visitas_con_anuncio: 0.3 };
  return ns.map((n) => {
    const peor_firme = evaluar(config, s0, n, { anuncios: { activo: false, tarifa: 'baja' }, anunciosAprobados: false });
    return {
      n,
      peor_firme, peor_sin_anuncios: peor_firme,
      peor_anuncios_tarifa_baja: evaluar(config, s0, n, { anuncios: { activo: true, tarifa: 'baja' }, anunciosAprobados: true }),
      peor_anuncios_tarifa_media: evaluar(config, s0, n, { anuncios: { activo: true, tarifa: 'media' }, anunciosAprobados: true }),
      peor_anuncios_adversos: evaluar(config, adv, n, { anuncios: { activo: true, tarifa: 'baja' }, anunciosAprobados: true }),
      mejor: evaluar(config, s, n, { todosPagan: true }),
      esperado: {
        pesimista: evaluar(config, s, n, { curva: 'pesimista' }),
        media: evaluar(config, s, n, { curva: 'media' }),
        optimista: evaluar(config, s, n, { curva: 'optimista' }),
      },
    };
  });
}

// ---------------------------------------------------------------- proyección en el tiempo
/**
 * Trayectoria mes a mes: restaurantes(t) = a·t^b con restaurantes(12) = meta12 y restaurantes(24) = meta24.
 * La adopción es una CURVA SUPUESTA (no una predicción). Con bajas y captación: altas del mes = Δpagantes + bajas;
 * captación = altas × cac. El «mes de equilibrio» depende por completo de esa curva y de CAC, que no tienen dato.
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
  for (let t = 1; t <= meses; t++) {
    const n = Math.max(1, Math.round(a * Math.pow(t, b)));
    const e = evaluar(config, s, n, opc);
    const pag = e.clientes.de_paga;
    const bajas = s.churn_mensual * previo;
    const altas = Math.max(0, pag - previo + bajas);
    const captacion = altas * s.cac;
    const mOp = e.margen_operacion;
    const mCap = mOp - captacion - s.sueldos_mes;
    acum += mOp;
    acumCap += mCap;
    if (mesOp === null && mOp >= 0) mesOp = t;
    if (mesCap === null && mCap >= 0) mesCap = t;
    previo = pag;
    const comensalesMes = (e.clientes.gratuito * s.comensales_dia_gratuito + pag * s.comensales_dia_servicio) * 30;
    filas.push({ mes: t, restaurantes: n, pagantes: pag, altas, bajas, comensales_mes: comensalesMes, ingresos: e.ingresos.total, costos: e.costos.total, margen: mOp, margen_operacion: mOp, margen_despues_de_captacion: mCap, margen_acumulado: acum, margen_acumulado_despues_de_captacion: acumCap, escalon: e.capacidad.escalon, muro: e.capacidad.muro_que_manda, requiere_arquitectura: e.capacidad.requiere_arquitectura, extrapolacion_sin_medir: e.extrapolacion_sin_medir });
  }
  return { parametros_curva: { a, b }, filas, mes_primer_margen_positivo: mesOp, mes_primer_margen_positivo_despues_de_captacion: mesCap, nota: 'adopción supuesta; sin dato de bajas ni de costo de captación' };
}

// ---------------------------------------------------------------- sensibilidad
const PARAMS_SENS = [
  ['curva · mediana', (s, f, curva) => ({ ...s, curvas_pago: { ...s.curvas_pago, [curva]: { ...s.curvas_pago[curva], mediana: s.curvas_pago[curva].mediana * f } } })],
  ['curva · sigma', (s, f, curva) => ({ ...s, curvas_pago: { ...s.curvas_pago, [curva]: { ...s.curvas_pago[curva], sigma: s.curvas_pago[curva].sigma * f } } })],
  ['curva · techo', (s, f, curva) => ({ ...s, curvas_pago: { ...s.curvas_pago, [curva]: { ...s.curvas_pago[curva], techo: Math.min(1, s.curvas_pago[curva].techo * f) } } })],
  ['quién rebasa el tope de mesas', (s, f) => ({ ...s, empuja_mesas: s.empuja_mesas.map(([x, y]) => [x, Math.min(1, y * f)]) })],
  ['soporte por cliente de paga', (s, f) => ({ ...s, soporte_servicio: s.soporte_servicio * f, soporte_salon: s.soporte_salon * f })],
  ['soporte por cliente gratuito', (s, f) => ({ ...s, soporte_gratuito: s.soporte_gratuito * f })],
  ['bajas mensuales (churn)', (s, f) => ({ ...s, churn_mensual: s.churn_mensual * f })],
  ['costo de conseguir un cliente (CAC)', (s, f) => ({ ...s, cac: s.cac * f })],
  ['tarifa de anuncios', (s, f) => ({ ...s, anuncio_pesos_por_mil: Object.fromEntries(Object.entries(s.anuncio_pesos_por_mil).map(([k, v]) => [k, v * f])) })],
  ['parte de visitas con anuncio', (s, f) => ({ ...s, parte_visitas_con_anuncio: Math.min(1, s.parte_visitas_con_anuncio * f) })],
  ['visitas con la app por gratuito', (s, f) => ({ ...s, visitas_app_gratuito: s.visitas_app_gratuito * f })],
  ['pago con tarjeta', (s, f) => ({ ...s, pago_con_tarjeta: Math.min(1, s.pago_con_tarjeta * f) })],
  ['parte que es tamaño Chef Ejecutivo', (s, f) => ({ ...s, parte_salon: s.parte_salon * f })],
  ['peso de un cliente de paga en el procesador', (s, f) => ({ ...s, peso_servicio_cpu: s.peso_servicio_cpu * f })],
  ['reserva de disco', (s, f) => ({ ...s, reserva_disco: Math.min(0.9, s.reserva_disco * f) })],
];

/**
 * Efecto de mover cada supuesto ±50 % sobre el margen (de operación o después de captación), ordenado de mayor a menor.
 * opc: { curva, anunciosAprobados, metrica: 'operacion' | 'captacion' }
 */
export function sensibilidad(config, s, n, opc = {}) {
  const curva = opc.curva ?? config.curva;
  const m = (ss) => { const e = evaluar(config, ss, n, { curva, anunciosAprobados: opc.anunciosAprobados }); return opc.metrica === 'captacion' ? e.margen_despues_de_captacion : e.margen_operacion; };
  const base = m(s);
  const filas = PARAMS_SENS.map(([nombre, f]) => {
    const bajo = m(f(s, 0.5, curva));
    const alto = m(f(s, 1.5, curva));
    return { supuesto: nombre, margen_con_mitad: bajo, margen_con_mitad_mas: alto, efecto: Math.abs(alto - bajo), rango: [Math.min(bajo, alto, base), Math.max(bajo, alto, base)] };
  });
  filas.sort((a, b) => b.efecto - a.efecto);
  return { n, curva, base, filas };
}

// ---------------------------------------------------------------- optimizar
const REJILLA = {
  precio_servicio: Array.from({ length: 25 }, (_, i) => 100 + 25 * i), // 100 a 700 cada 25
  mesas: [6, 8, 10, 12, 15, 20],
  cuentas: [2, 3, 4, 5],
  platillos: [60, 80, 100],
  precio_salon: [299, 399, 499, 599, 749, 999],
};

/**
 * Búsqueda en rejilla. Los topes del gratuito NO son un óptimo: son consecuencia de `minDentro` (qué parte del
 * mercado debe caber gratis, decisión de Calvin; por defecto supuestos.restriccion_min_dentro) y de `traslape_topes`.
 * restricciones: { n, curva, minDentro, minMesesEnLinea, minPlatillos, anunciosAprobados, exigirPeorCasoFirme }
 * Devuelve: mejor, meseta del precio (A a B con margen a menos de 2 %), precio de Chef Ejecutivo, frontera y
 * `tabla_cupo_gratis` (para 50, 60, 70 y 80 % que quepa gratis: topes, precio y margen).
 */
export function optimizar(s, restricciones = {}, base = configInicial()) {
  const r = { n: s.n_referencia, curva: 'media', minDentro: s.restriccion_min_dentro, minMesesEnLinea: base.topes.servicio.meses_en_linea, minPlatillos: 80, anunciosAprobados: false, exigirPeorCasoFirme: false, ...restricciones };
  const s0 = sinPago(s);
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
        c0.topes.servicio.meses_en_linea = r.minMesesEnLinea;
        c0.topes.salon.meses_en_linea = r.minMesesEnLinea;
        const dentro = 1 - parteRebasa(c0, s);
        const curvaPrecio = [];
        for (const ps of REJILLA.precio_servicio) {
          const c = JSON.parse(JSON.stringify(c0));
          c.precios.servicio = ps;
          const e = evaluar(c, s, r.n, { curva: r.curva, anunciosAprobados: r.anunciosAprobados });
          if (e.capacidad.requiere_arquitectura) { descartadas++; continue; }
          curvaPrecio.push({ precio: ps, margen: e.margen_operacion, pagantes: e.clientes.de_paga, config: c, escalon: e.capacidad.escalon, muro: e.capacidad.muro_que_manda });
        }
        if (!curvaPrecio.length) continue;
        const mejorP = curvaPrecio.reduce((a, b) => (b.margen > a.margen ? b : a));
        const meseta = curvaPrecio.filter((x) => x.margen >= 0.98 * mejorP.margen).map((x) => x.precio);
        const peorFirme = evaluar(mejorP.config, s0, r.n, { anuncios: { activo: false, tarifa: 'baja' }, anunciosAprobados: false }).margen_operacion;
        if (r.exigirPeorCasoFirme && peorFirme < 0) { descartadas++; continue; }
        evaluadas.push({ dentro, mesas, cuentas, platillos, mejor_precio: mejorP.precio, margen: mejorP.margen, pagantes: mejorP.pagantes, meseta: [Math.min(...meseta), Math.max(...meseta)], escalon: mejorP.escalon, muro: mejorP.muro, peor_caso_firme: peorFirme, config: mejorP.config, curva_de_precio: curvaPrecio.map((x) => [x.precio, x.margen]) });
      }
  // precio de Chef Ejecutivo: búsqueda propia con la mejor configuración (no sale del precio de Master Chef)
  const validas = evaluadas.filter((e) => e.dentro >= r.minDentro - 1e-9).sort((a, b) => b.margen - a.margen);
  const mejor = validas[0] ?? null;
  let salon = null;
  if (mejor) {
    const cs = REJILLA.precio_salon.map((p) => { const c = JSON.parse(JSON.stringify(mejor.config)); c.precios.salon = p; return [p, evaluar(c, s, r.n, { curva: r.curva, anunciosAprobados: r.anunciosAprobados }).margen_operacion]; });
    const mx = Math.max(...cs.map((x) => x[1]));
    const alto = cs.filter((x) => x[1] >= 0.98 * mx).map((x) => x[0]);
    salon = { curva_de_precio: cs, mejor_precio: cs.find((x) => x[1] === mx)[0], meseta: [Math.min(...alto), Math.max(...alto)], diferencia_max_min: mx - Math.min(...cs.map((x) => x[1])), nota: 'el precio de Chef Ejecutivo cambia el margen por menos del 2 % en todo el rango: no sale de la optimización, es «sugerido por regla»' };
  }
  // frontera y tabla de cupo gratis
  const nivelDe = (e) => Math.round(e.dentro * 20) / 20;
  const mejorPorNivel = new Map();
  for (const e of evaluadas) { const k = nivelDe(e); const p = mejorPorNivel.get(k); if (!p || e.margen > p.margen) mejorPorNivel.set(k, e); }
  const frontera = [...mejorPorNivel.entries()].sort((a, b) => a[0] - b[0]).map(([nivel, e]) => ({ dentro_del_gratuito: nivel, margen: e.margen, pagantes: e.pagantes, precio_servicio: e.mejor_precio, meseta_precio: e.meseta, mesas: e.mesas, cuentas: e.cuentas, platillos: e.platillos }));
  const tabla = [0.5, 0.6, 0.7, 0.8].map((x) => { const v = evaluadas.filter((e) => e.dentro >= x - 1e-9).sort((a, b) => b.margen - a.margen)[0]; return v ? { cupo_gratis_minimo: x, dentro_real: v.dentro, mesas: v.mesas, cuentas: v.cuentas, platillos: v.platillos, precio_servicio: v.mejor_precio, meseta_precio: v.meseta, pagantes: v.pagantes, margen: v.margen } : { cupo_gratis_minimo: x, sin_solucion: true }; });
  const sensibilidadTraslape = {};
  for (const rho of [0, 0.5, 1]) sensibilidadTraslape[rho] = { dentro_con_topes_recomendados: mejor ? 1 - parteRebasa(mejor.config, { ...s, traslape_topes: rho }) : null, margen_con_topes_recomendados: mejor ? evaluar(mejor.config, { ...s, traslape_topes: rho }, r.n, { curva: r.curva, anunciosAprobados: r.anunciosAprobados }).margen_operacion : null };
  return { restricciones: r, mejor, meseta_precio_servicio: mejor ? mejor.meseta : null, precio_salon: salon, top5: validas.slice(0, 5), frontera, tabla_cupo_gratis: tabla, sensibilidad_traslape: sensibilidadTraslape, evaluadas: evaluadas.length, descartadas };
}
