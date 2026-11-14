// Corre el modelo con la configuración base y la recomendada y escribe 2026-11-14-modelo-de-escenarios-resultados.json
// Uso: node 2026-11-14-corre-escenarios.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const par = JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8'));
const s = M.valores(par);
const opt = M.optimizar(s);
const recomendada = opt.mejor.config;
const curvas = ['pesimista', 'media', 'optimista'];
const resumen = (e) => ({ n: e.n, gratuitos: e.clientes.gratuito, pagantes: e.clientes.de_paga, ingresos: e.ingresos.total, anuncios: e.ingresos.anuncios, suscripcion: e.ingresos.suscripcion, costos: e.costos.total, margen: e.margen.pesos, margen_pct: e.margen.porcentaje, escalon: e.capacidad.escalon, muro: e.capacidad.muro_que_manda, requiere_arquitectura: e.capacidad.requiere_arquitectura, instancias: e.capacidad.instancias, equilibrio_pagantes: e.equilibrio_pagantes, gratuitos_por_pagante: e.gratuitos_que_sostiene_un_pagante, gratuitos_por_pagante_solo_variable: e.gratuitos_que_sostiene_un_pagante_solo_variable, ingreso_por_gratuito: e.por_cliente.ingreso_gratuito, costo_por_gratuito: e.por_cliente.costo_gratuito, ingreso_por_pagante: e.por_cliente.ingreso_servicio, costo_por_pagante: e.por_cliente.costo_servicio });
const esc = (config) => M.escenarios(config, s).map((r) => ({
  n: r.n,
  peor_sin_anuncios: resumen(r.peor_sin_anuncios), peor_anuncios_tarifa_baja: resumen(r.peor_anuncios_tarifa_baja), peor_anuncios_tarifa_media: resumen(r.peor_anuncios_tarifa_media),
  mejor: resumen(r.mejor), esperado: Object.fromEntries(curvas.map((c) => [c, resumen(r.esperado[c])])),
}));
const proy = (config) => Object.fromEntries(curvas.map((c) => [c, M.proyectar(config, s, 36, { curva: c })]));
const salida = {
  version: M.VERSION,
  precio_optimo_por_curva: Object.fromEntries(curvas.map((c) => { const o = M.precioOptimo(c, s); return [c, { precio: o.precio, conversion: o.conversion, margen_por_elegible: o.margen_por_elegible, derivada_en_optimo: o.derivada_en_optimo, muestras: o.muestras }]; })),
  config_base: { config: M.configBase(), escenarios: esc(M.configBase()) },
  config_recomendada: { config: recomendada, escenarios: esc(recomendada), proyeccion: proy(recomendada) },
  optimizacion: { restricciones: opt.restricciones, evaluadas: opt.evaluadas, descartadas: opt.descartadas, top5: opt.top5.map((e) => ({ margen: e.margen, pagantes: e.pagantes, dentro: e.dentro, config: e.config })), frontera: opt.frontera, sensibilidad: opt.sensibilidad },
};
writeFileSync(join(aqui, '2026-11-14-modelo-de-escenarios-resultados.json'), JSON.stringify(salida, null, 1));
console.log('recomendada:', JSON.stringify({ precios: recomendada.precios, gratuito: recomendada.topes.gratuito, servicio: recomendada.topes.servicio, anuncios: recomendada.anuncios }));
console.log('sensibilidad:', JSON.stringify(opt.sensibilidad), 'margen', Math.round(opt.mejor.margen), 'pagantes', Math.round(opt.mejor.pagantes), 'dentro', opt.mejor.dentro);
console.log('frontera:', JSON.stringify(opt.frontera.map((f) => [f.dentro_del_gratuito, Math.round(f.margen), f.mesas, f.cuentas, f.platillos])));
