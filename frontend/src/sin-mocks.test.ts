import { describe, expect, it } from 'vitest';

import { sinMocksEnProduccion } from '../scripts/sin-mocks.mjs';

// B1: ningún módulo de src/mocks/ entra al build de producción, venga de donde venga el import.
type Contexto = { error: (m: string) => never };
const generar = (bundle: Record<string, unknown>) => {
  const plugin = sinMocksEnProduccion() as unknown as { generateBundle: (this: Contexto, o: object, b: Record<string, unknown>) => void };
  const ctx: Contexto = {
    error: (m) => {
      throw new Error(m);
    },
  };
  plugin.generateBundle.call(ctx, {}, bundle);
};
const trozo = (fileName: string, ids: string[]) => ({ type: 'chunk', fileName, modules: Object.fromEntries(ids.map((i) => [i, {}])) });

describe('sinMocksEnProduccion', () => {
  it('un bundle sin mocks pasa (también con rutas parecidas)', () => {
    expect(() =>
      generar({
        'assets/index-a.js': trozo('assets/index-a.js', ['/r/frontend/src/main.tsx', '/r/frontend/src/comensal/menu/mocksDeLaVista.ts', '/r/node_modules/mocks/x.js']),
        'a.css': { type: 'asset' },
      }),
    ).not.toThrow();
  });

  it.each([
    ['servicioMenuSimulado (un mock que la guarda por marcas no veía)', '/r/frontend/src/mocks/servicioMenuSimulado.ts'],
    ['el openapi.json de pruebas', '/r/frontend/src/mocks/openapi.json'],
    ['con separadores de Windows', 'C:\\r\\frontend\\src\\mocks\\menuSemilla.ts'],
  ])('falla si el bundle lleva %s', (_que, id) => {
    expect(() => generar({ 'assets/index-a.js': trozo('assets/index-a.js', ['/r/frontend/src/main.tsx', id]) })).toThrow(/Datos simulados en el build de producción/);
  });
});
