// Modelo de escenarios de Carta (2026-11-14). Módulo ES sin dependencias, funciones puras.
// Corre igual en `node` y en el navegador: no usa fs, process, window ni fetch.
// Todo parámetro entra por `supuestos` (use `valores(parametros.json)`), con su origen y rango en
// 2026-11-14-parametros.json. Moneda: pesos mexicanos, antes de IVA salvo que se diga lo contrario.
//
// Honestidad del modelo: la curva «cuántos pagan a qué precio» es SUPUESTO (no hay dato de disposición
// a pagar); el óptimo es tan bueno como la curva. Lo sustituye la prueba del piloto (Van Westendorp y
// escalera de precios, precio-con-fundamento §6).

export const VERSION = '2026-11-14';

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
/** Configuración con la que parte el modelo (la recomendada la entrega `optimizar`). */
export function configBase() {
  return {
    precios: { servicio: 299, salon: 399 },
    topes: {
      gratuito: { platillos: 80, mesas: 10, cuentas: 3, lecturas_pdf: 3, meses_en_linea: 1 },
      servicio: { platillos: 300, mesas: 40, cuentas: 20, lecturas_pdf_mes: 10, meses_en_linea: 3 },
      salon: { platillos: 300, mesas: 100, cuentas: 50, lecturas_pdf_mes: 20, meses_en_linea: 6 },
    },
    disco: { meses_analitica_en_linea: { gratuito: 1, servicio: 1, salon: 1 }, archivar: true },
    anuncios: { activo: true, tarifa: 'media' },
    curva: 'media',
    competencia: { sustituto: 'Fudo Avanzado', k: 0.5 }, // sólo para la sugerencia de precio
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
/** Parte de los registrados que rebasa al menos un tope del gratuito (modelo de traslape ρ). */
export function parteRebasa(config, s) {
  const g = config.topes.gratuito;
  const p = [interp(s.empuja_mesas, g.mesas), interp(s.empuja_cuentas, g.cuentas), interp(s.empuja_platillos, g.platillos), s.empuja_pdf_gratuito];
  const mayor = Math.max(...p);
  return clamp(mayor + s.traslape_topes * (suma(p) - mayor), 0, 1);
}

/** Parte de los que rebasan que llega a pagar a ese precio, según la curva (lognormal con techo). */
export function conversion(curva, precio, s) {
  const c = s.curvas_pago[curva];
  if (precio <= 0) return c.techo;
  return c.techo * (1 - phi((Math.log(precio) - Math.log(c.mediana)) / c.sigma));
}

/** Precio que maximiza el margen por cliente que rebasa (rejilla; muestra la derivada en el óptimo). */
export function precioOptimo(curva, s, plan = 'servicio', paso = 1) {
  const f = (p) => conversion(curva, p, s) * (p - s[SOPORTE[plan]] - comisionTarjeta(p, s));
  let mejor = { precio: 0, valor: -Infinity };
  const muestras = [];
  for (let p = 50; p <= 1500; p += paso) {
    const v = f(p);
    if (p % 50 === 0) muestras.push({ precio: p, conversion: conversion(curva, p, s), margen_por_elegible: v });
    if (v > mejor.valor) mejor = { precio: p, valor: v };
  }
  const h = 1;
  const derivada = (f(mejor.precio + h) - f(mejor.precio - h)) / (2 * h);
  return { curva, precio: mejor.precio, conversion: conversion(curva, mejor.precio, s), margen_por_elegible: mejor.valor, derivada_en_optimo: derivada, muestras };
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

/** Escalón más barato que alcanza; si ninguno, repetir la pila (requiere cambio de arquitectura). */
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
      return { escalon: e.id, nombre: e.nombre, costo_usd: costoEscalonUsd(e, carga), muro_que_manda: manda, ratios, instancias: 1, requiere_arquitectura: false, rechazados: rechazos.map((r) => `${r.id}: ${r.muros.join(', ')}`) };
    }
    rechazos.push({ id: e.id, muros: v });
  }
  const g = orden[orden.length - 1];
  const k = Math.max(Math.ceil(carga / s.cap_conexiones), Math.ceil(discoMb / usable(g)));
  const costo = costoEscalonUsd(g, carga / k) * k + (k - 1) * 0; // cada instancia lleva su parte de la carga
  return { escalon: g.id, nombre: `${k} instancias de ${g.nombre}`, costo_usd: costo, muro_que_manda: 'conexiones', ratios: { procesador: carga / (g.cap_cpu * k), disco: discoMb / (usable(g) * k), conexiones: carga / (s.cap_conexiones * k) }, instancias: k, requiere_arquitectura: true, rechazados: rechazos.map((r) => `${r.id}: ${r.muros.join(', ')}`) };
}

// ---------------------------------------------------------------- evaluar
/**
 * Evalúa una configuración con n restaurantes registrados (en régimen).
 * opc: { curva, todosPagan, anuncios }  (para los escenarios; por defecto sale de la configuración)
 */
export function evaluar(config, s, n, opc = {}) {
  const curva = opc.curva ?? config.curva;
  const anuncios = opc.anuncios ?? config.anuncios;
  const rebasa = parteRebasa(config, s);
  const salonParte = Math.min(s.parte_salon, rebasa);
  const ps = config.precios.servicio;
  const pl = config.precios.salon;
  let pagS, pagL;
  if (opc.todosPagan) {
    pagL = n * s.parte_salon;
    pagS = n - pagL;
  } else {
    pagL = n * salonParte * conversion(curva, pl, s);
    pagS = n * (rebasa - salonParte) * conversion(curva, ps, s);
  }
  const gratis = n - pagS - pagL;

  // carga y disco
  const carga = gratis + s.peso_servicio_cpu * pagS + s.peso_salon_cpu * pagL;
  const mbG = s.disco_gratuito_tipico_mb_publicado_activo ? s.disco_gratuito_tipico_mb_publicado : mbPorRestaurante('gratuito', config, s);
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
  const soporte = pagS * s.soporte_servicio + pagL * s.soporte_salon;
  const comision = pagS * comisionTarjeta(ps, s) + pagL * comisionTarjeta(pl, s);
  const costos = servidor + almacenamiento + objetos + soporte + comision;

  // ingresos
  const suscripcion = pagS * ps + pagL * pl;
  const tarifa = anuncios.activo ? s.anuncio_pesos_por_mil[anuncios.tarifa] : 0;
  const ads = (gratis * s.visitas_app_gratuito * tarifa) / 1000;
  const ingresos = suscripcion + ads;
  const margen = ingresos - costos;

  // por cliente
  const infra = servidor + almacenamiento + objetos;
  const costoPorCarga = carga > 0 ? infra / carga : 0;
  const costoGratuito = costoPorCarga;
  const adsGratuito = gratis > 0 ? ads / gratis : tarifa * s.visitas_app_gratuito / 1000;
  const unidadServicio = ps - s.soporte_servicio - comisionTarjeta(ps, s) - costoPorCarga * s.peso_servicio_cpu;
  const netoGratuito = costoGratuito - adsGratuito;
  const sostiene = netoGratuito > 0 ? unidadServicio / netoGratuito : null; // null = el gratuito se paga solo
  const sostieneVariable = s.costo_var_gratuito - adsGratuito > 0 ? unidadServicio / (s.costo_var_gratuito - adsGratuito) : null;

  // punto de equilibrio con este n: pagantes que faltan para que el margen sea 0
  const base0 = n * 0; // sin pagantes: todo gratuito
  const cargaTodos = n;
  const srv0 = escalonPara(cargaTodos, s.base_vacia_mb + n * mbG, s);
  const costo0 = srv0.costo_usd * fx + (s.dominio_usd_anio / 12) * fx + ((s.base_vacia_mb + n * mbG) / 1000) * s.volumen_usd_gb_mes * fx;
  const ads0 = (n * s.visitas_app_gratuito * tarifa) / 1000;
  const equilibrio = Math.max(0, (costo0 - ads0 + base0) / unidadServicio);

  return {
    n, rebasan_topes: rebasa, curva,
    clientes: { gratuito: gratis, servicio: pagS, salon: pagL, de_paga: pagS + pagL },
    capacidad: { carga_en_gratuitos_tipicos: carga, disco_mb: discoMb, ...srv, mb_por_restaurante: { gratuito: mbG, servicio: mbS, salon: mbL } },
    ingresos: { suscripcion, anuncios: ads, total: ingresos },
    costos: { servidor, almacenamiento, objetos, soporte, comision, total: costos },
    margen: { pesos: margen, porcentaje: ingresos > 0 ? margen / ingresos : null },
    por_cliente: {
      ingreso_gratuito: adsGratuito, costo_gratuito: costoGratuito,
      ingreso_servicio: ps, costo_servicio: costoPorCarga * s.peso_servicio_cpu + s.soporte_servicio + comisionTarjeta(ps, s),
      margen_servicio: unidadServicio,
    },
    equilibrio_pagantes: equilibrio, gratuitos_que_sostiene_un_pagante: sostiene, gratuitos_que_sostiene_un_pagante_solo_variable: sostieneVariable,
  };
}

// ---------------------------------------------------------------- escenarios con nombre
export function escenarios(config, s, ns = [100, 1000, 10000]) {
  // «todos gratuitos»: techo de conversión 0 (nadie paga aunque rebase topes)
  const s0 = { ...s, curvas_pago: Object.fromEntries(Object.entries(s.curvas_pago).map(([k, v]) => [k, { ...v, techo: 0 }])) };
  return ns.map((n) => ({
    n,
    peor_sin_anuncios: evaluar(config, s0, n, { anuncios: { activo: false, tarifa: 'baja' } }),
    peor_anuncios_tarifa_baja: evaluar(config, s0, n, { anuncios: { activo: true, tarifa: 'baja' } }),
    peor_anuncios_tarifa_media: evaluar(config, s0, n, { anuncios: { activo: true, tarifa: 'media' } }),
    mejor: evaluar(config, s, n, { todosPagan: true }),
    esperado: {
      pesimista: evaluar(config, s, n, { curva: 'pesimista' }),
      media: evaluar(config, s, n, { curva: 'media' }),
      optimista: evaluar(config, s, n, { curva: 'optimista' }),
    },
  }));
}

// ---------------------------------------------------------------- proyección en el tiempo
/** Trayectoria mes a mes: restaurantes(t) = a·t^b con restaurantes(12) = meta12 y restaurantes(24) = meta24. */
export function proyectar(config, s, meses = 24, opc = {}) {
  const b = Math.log(s.meta_24_meses / s.meta_12_meses) / Math.log(2);
  const a = s.meta_12_meses / Math.pow(12, b);
  const filas = [];
  let acum = 0;
  let mesEquilibrio = null;
  for (let t = 1; t <= meses; t++) {
    const n = Math.max(1, Math.round(a * Math.pow(t, b)));
    const e = evaluar(config, s, n, opc);
    acum += e.margen.pesos;
    if (mesEquilibrio === null && e.margen.pesos >= 0) mesEquilibrio = t;
    const comensalesMes = (e.clientes.gratuito * s.comensales_dia_gratuito + e.clientes.de_paga * s.comensales_dia_servicio) * 30;
    filas.push({ mes: t, restaurantes: n, pagantes: e.clientes.de_paga, comensales_mes: comensalesMes, ingresos: e.ingresos.total, costos: e.costos.total, margen: e.margen.pesos, margen_acumulado: acum, escalon: e.capacidad.escalon, muro: e.capacidad.muro_que_manda, requiere_arquitectura: e.capacidad.requiere_arquitectura });
  }
  return { parametros_curva: { a, b }, filas, mes_primer_margen_positivo: mesEquilibrio };
}

// ---------------------------------------------------------------- optimizar
const REJILLA = {
  precio_servicio: [149, 199, 249, 299, 349, 399, 449, 499, 599, 699],
  mesas: [8, 10, 12, 15, 20],
  cuentas: [2, 3, 4, 5],
  platillos: [60, 80, 100],
  meses_en_linea_servicio: [1, 3, 6, 12],
  anuncios: [false, true],
};

/**
 * Búsqueda en rejilla de la mejor configuración y frontera margen contra parte del mercado que queda dentro del gratuito.
 * restricciones: { n, curva, tarifaPeorCaso, tarifaObjetivo, minDentro, minMesesEnLinea, minPlatillos }
 */
export function optimizar(s, restricciones = {}, base = configBase()) {
  // tarifaObjetivo: con qué tarifa de anuncios se mide el margen al elegir (por defecto la baja: no depender de una tarifa sin fuente)
  const r = { n: s.n_referencia, curva: 'media', tarifaPeorCaso: 'baja', tarifaObjetivo: 'baja', minDentro: 0.6, minMesesEnLinea: 3, minPlatillos: 80, ...restricciones };
  const s0 = { ...s, curvas_pago: Object.fromEntries(Object.entries(s.curvas_pago).map(([k, v]) => [k, { ...v, techo: 0 }])) };
  const evaluadas = [];
  let descartadas = 0;
  for (const ps of REJILLA.precio_servicio)
    for (const mesas of REJILLA.mesas)
      for (const cuentas of REJILLA.cuentas)
        for (const platillos of REJILLA.platillos)
          for (const meses of REJILLA.meses_en_linea_servicio)
            for (const ads of REJILLA.anuncios) {
              if (meses < r.minMesesEnLinea || platillos < r.minPlatillos) { descartadas++; continue; } // piso de servicio al usuario
              const c = JSON.parse(JSON.stringify(base));
              c.precios.servicio = ps;
              c.precios.salon = Math.max(ps, redondea(precioSugerido(s.sustitutos['Fudo Avanzado + cocina'], 0.5, s, 'salon'), s, 'salon'));
              c.topes.gratuito.mesas = mesas;
              c.topes.gratuito.cuentas = cuentas;
              c.topes.gratuito.platillos = platillos;
              c.topes.servicio.meses_en_linea = meses;
              c.topes.salon.meses_en_linea = Math.min(meses, 6);
              c.anuncios = { activo: ads, tarifa: r.tarifaObjetivo };
              const dentro = 1 - parteRebasa(c, s);
              const peor = evaluar(c, s0, r.n, { anuncios: { activo: ads, tarifa: r.tarifaPeorCaso } });
              if (peor.margen.pesos < 0) { descartadas++; continue; } // el peor caso (todos gratuitos) debe ser sostenible
              const e = evaluar(c, s, r.n, { curva: r.curva });
              if (e.capacidad.requiere_arquitectura) { descartadas++; continue; } // ningún muro rebasado
              evaluadas.push({ config: c, dentro, margen: e.margen.pesos, margen_pct: e.margen.porcentaje, pagantes: e.clientes.de_paga, escalon: e.capacidad.escalon, muro: e.capacidad.muro_que_manda, peor_caso_margen: peor.margen.pesos });
            }
  // frontera: para cada nivel de «parte dentro del gratuito» (a 5 puntos), el mayor margen (sin la restricción minDentro)
  const mejorPorNivel = new Map();
  for (const e of evaluadas) {
    const nivel = Math.round(e.dentro * 20) / 20;
    const previo = mejorPorNivel.get(nivel);
    if (!previo || e.margen > previo.margen) mejorPorNivel.set(nivel, e);
  }
  const frontera = [...mejorPorNivel.entries()].sort((a, b) => a[0] - b[0]).map(([nivel, e]) => ({ dentro_del_gratuito: nivel, margen: e.margen, margen_pct: e.margen_pct, pagantes: e.pagantes, precio_servicio: e.config.precios.servicio, mesas: e.config.topes.gratuito.mesas, cuentas: e.config.topes.gratuito.cuentas, platillos: e.config.topes.gratuito.platillos, meses_en_linea_servicio: e.config.topes.servicio.meses_en_linea, anuncios: e.config.anuncios.activo }));
  const validas = evaluadas.filter((e) => e.dentro >= r.minDentro - 1e-9).sort((a, b) => b.margen - a.margen);
  const mejor = validas[0] ?? null;
  // sensibilidad de la mejor: tarifa de anuncios y curva de pago
  let sensibilidad = null;
  if (mejor) {
    sensibilidad = { por_tarifa: {}, por_curva: {} };
    for (const t of ['baja', 'media', 'alta']) sensibilidad.por_tarifa[t] = evaluar({ ...mejor.config, anuncios: { ...mejor.config.anuncios, tarifa: t } }, s, r.n, { curva: r.curva }).margen.pesos;
    for (const c of ['pesimista', 'media', 'optimista']) sensibilidad.por_curva[c] = evaluar(mejor.config, s, r.n, { curva: c }).margen.pesos;
  }
  return { restricciones: r, mejor, top5: validas.slice(0, 5), frontera, sensibilidad, evaluadas: evaluadas.length, descartadas };
}
