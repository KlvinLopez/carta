/**
 * Ilustración de respaldo por categoría (02 §8): las 20 claves de `app/services/ilustraciones.py`
 * (`CLAVES`; `ilustraciones.test.ts` lee ese archivo y falla si dejan de coincidir). Cada clave tiene su
 * glifo (viewBox 48) y un tono: se distinguen por forma **y** por color, sin depender sólo del color.
 * Una clave desconocida cae en `general`.
 */
export type TonoIlustracion = 'vino' | 'dorado' | 'verde' | 'cafe' | 'carbon';

export interface Glifo {
  tono: TonoIlustracion;
  /** `suave` = relleno claro; `fuerte` = relleno tenue con trazo; `linea` = sólo trazo. */
  trazos: { d: string; estilo: 'suave' | 'fuerte' | 'linea' }[];
}

export const GLIFOS: Record<string, Glifo> = {
  entradas: { tono: 'dorado', trazos: [{ d: 'M6 32h36M10 32a14 10 0 0 1 28 0', estilo: 'suave' }, { d: 'M18 20v-2M24 18v-4M30 20v-2', estilo: 'linea' }] },
  sopas: { tono: 'cafe', trazos: [{ d: 'M8 22h32a16 16 0 0 1-32 0z', estilo: 'suave' }, { d: 'M17 16c-2-3 2-4 0-8M25 16c-2-3 2-4 0-8M33 16c-2-3 2-4 0-8', estilo: 'linea' }] },
  ensaladas: { tono: 'verde', trazos: [{ d: 'M8 24h32a16 14 0 0 1-32 0z', estilo: 'suave' }, { d: 'M14 24c0-8 8-12 14-10 0 8-6 12-14 10z', estilo: 'fuerte' }] },
  tacos: { tono: 'dorado', trazos: [{ d: 'M6 34a18 18 0 0 1 36 0z', estilo: 'suave' }, { d: 'M14 28c2-6 6-8 10-8s8 2 10 8', estilo: 'linea' }] },
  antojitos: { tono: 'cafe', trazos: [{ d: 'M6 28a18 9 0 1 0 36 0a18 9 0 1 0-36 0z', estilo: 'suave' }, { d: 'M18 26h.1M24 29h.1M30 26h.1', estilo: 'linea' }] },
  tortas: { tono: 'dorado', trazos: [{ d: 'M8 20a16 8 0 0 1 32 0z', estilo: 'suave' }, { d: 'M8 26h32M8 31h32', estilo: 'linea' }, { d: 'M10 36h28a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z', estilo: 'suave' }] },
  hamburguesas: { tono: 'cafe', trazos: [{ d: 'M8 22a16 12 0 0 1 32 0z', estilo: 'suave' }, { d: 'M8 28h32', estilo: 'linea' }, { d: 'M10 33h28a4 4 0 0 1-4 5H14a4 4 0 0 1-4-5z', estilo: 'suave' }] },
  pizzas: { tono: 'vino', trazos: [{ d: 'M24 42L8 12a28 28 0 0 1 32 0z', estilo: 'suave' }, { d: 'M20 20h.1M28 22h.1M24 30h.1', estilo: 'linea' }] },
  pastas: { tono: 'dorado', trazos: [{ d: 'M8 26h32a16 14 0 0 1-32 0z', estilo: 'suave' }, { d: 'M14 20c3-4 6 4 10 0s6 4 10 0', estilo: 'linea' }] },
  carnes: { tono: 'vino', trazos: [{ d: 'M10 28c0-10 10-16 20-14s10 12 4 18-24 6-24-4z', estilo: 'suave' }, { d: 'M26 24a3 3 0 1 0 0 .1', estilo: 'fuerte' }] },
  aves: { tono: 'cafe', trazos: [{ d: 'M26 8c8 0 12 8 8 14s-10 6-14 0 0-14 6-14z', estilo: 'suave' }, { d: 'M20 24L9 36M7 34l4 4M11 32l4 4', estilo: 'linea' }] },
  mariscos: { tono: 'verde', trazos: [{ d: 'M6 24c6-10 20-10 26 0-6 10-20 10-26 0z', estilo: 'suave' }, { d: 'M32 24l10-8v16z', estilo: 'fuerte' }, { d: 'M14 22h.1', estilo: 'linea' }] },
  vegetariano: { tono: 'verde', trazos: [{ d: 'M10 38C8 20 20 8 40 8c0 20-10 32-30 30z', estilo: 'suave' }, { d: 'M10 38L28 20', estilo: 'linea' }] },
  desayunos: { tono: 'dorado', trazos: [{ d: 'M8 22c0-10 12-14 22-12s10 12 6 18-18 12-26 4z', estilo: 'suave' }, { d: 'M22 22a5 5 0 1 0 0 .1', estilo: 'fuerte' }] },
  postres: { tono: 'carbon', trazos: [{ d: 'M10 28h28l-3 12H13z', estilo: 'suave' }, { d: 'M14 28c0-8 4-12 10-12s10 4 10 12', estilo: 'fuerte' }, { d: 'M24 12a3 3 0 1 0 0 .1', estilo: 'fuerte' }] },
  panaderia: { tono: 'cafe', trazos: [{ d: 'M8 30c-2-6 6-16 14-18s20 4 18 12-8 14-16 14-14 0-16-8z', estilo: 'suave' }, { d: 'M18 18l4 8M26 16l4 8M32 20l3 6', estilo: 'linea' }] },
  bebidas: { tono: 'vino', trazos: [{ d: 'M14 10h20l-3 28a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z', estilo: 'suave' }, { d: 'M16 20h16M27 6l-3 8', estilo: 'linea' }] },
  cafe: { tono: 'cafe', trazos: [{ d: 'M8 20h24v10a8 8 0 0 1-8 8h-8a8 8 0 0 1-8-8z', estilo: 'suave' }, { d: 'M32 22h4a4 4 0 0 1 0 10h-4', estilo: 'linea' }, { d: 'M14 14c-2-3 2-4 0-7M22 14c-2-3 2-4 0-7', estilo: 'linea' }] },
  cocteles: { tono: 'carbon', trazos: [{ d: 'M8 10h32L24 28z', estilo: 'suave' }, { d: 'M24 28v12M16 40h16', estilo: 'linea' }] },
  general: { tono: 'vino', trazos: [{ d: 'M9 26a15 15 0 1 0 30 0a15 15 0 1 0-30 0z', estilo: 'suave' }, { d: 'M15 26a9 9 0 1 0 18 0a9 9 0 1 0-18 0z', estilo: 'fuerte' }, { d: 'M8 8v10M12 8v10M16 8v10M12 18v8', estilo: 'linea' }] },
};

export const CLAVES_ILUSTRACION = Object.keys(GLIFOS);

/** El glifo de una clave; `general` si no se conoce o falta. */
export function glifoDeClave(clave: string | null | undefined): { clave: string; glifo: Glifo } {
  const k = (clave ?? '').toLowerCase();
  return Object.hasOwn(GLIFOS, k) ? { clave: k, glifo: GLIFOS[k]! } : { clave: 'general', glifo: GLIFOS.general! };
}
