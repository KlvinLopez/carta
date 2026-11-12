import { beforeEach, describe, expect, it } from 'vitest';

import { avisoUnico, type AvisoSondeo } from './AvisoConexion';
import { espejoLocal, marcaDeMesa } from './espejo';

const CLAVE = 'carta:invitado:v1';
const poner = (v: unknown) => window.localStorage.setItem(CLAVE, JSON.stringify(v));
const base = { miembro: 'm-1', sesion: 's-1' };

beforeEach(() => window.localStorage.clear());

describe('espejo local (T-2.7: slug y huella de la mesa)', () => {
  it('lee el slug y la huella cuando tienen forma válida', () => {
    poner({ ...base, slug: 'la-ceiba', mesa: marcaDeMesa('x'.repeat(22)) });
    expect(espejoLocal.leer()).toEqual({ ...base, slug: 'la-ceiba', mesa: marcaDeMesa('x'.repeat(22)) });
  });

  it.each([
    ['slug con mayúsculas', { slug: 'La-Ceiba', mesa: 'abc' }],
    ['slug con una barra', { slug: 'la/ceiba', mesa: 'abc' }],
    ['slug demasiado largo', { slug: 'a'.repeat(81), mesa: 'abc' }],
    ['slug que no es texto', { slug: 7, mesa: 'abc' }],
    ['huella con forma inválida', { slug: 'la-ceiba', mesa: 'ZZ-no-hex' }],
    ['huella demasiado larga', { slug: 'la-ceiba', mesa: 'a'.repeat(15) }],
    ['huella que no es texto', { slug: 'la-ceiba', mesa: 12 }],
    ['sin huella', { slug: 'la-ceiba' }],
    ['sin slug', { mesa: 'abc' }],
  ])('%s: se ignora y queda sólo {miembro, sesion}', (_n, extra) => {
    poner({ ...base, ...extra });
    expect(espejoLocal.leer()).toEqual(base);
  });

  it('la huella no es el código de la mesa ni lo contiene', () => {
    const codigo = 'Jx3k9QwLmN2pR7sT4vY8zA';
    const marca = marcaDeMesa(codigo);
    expect(marca).not.toContain(codigo);
    expect(marca).toMatch(/^[0-9a-f]{1,14}$/);
    expect(marcaDeMesa(codigo)).toBe(marca); // estable
    expect(marcaDeMesa(codigo + 'x')).not.toBe(marca);
  });
});

describe('avisoUnico: un solo aviso, el más específico', () => {
  const combinaciones: [boolean, boolean, 'red' | 'servidor' | null, AvisoSondeo][] = [];
  for (const deCopia of [false, true]) {
    for (const sinRed of [false, true]) {
      for (const sondeo of [null, 'red'] as const) {
        combinaciones.push([deCopia, sinRed, sondeo, deCopia ? 'copia' : sinRed ? 'sin_conexion' : sondeo]);
      }
    }
  }
  it.each(combinaciones)('copia %s, sin red %s, sondeo %s → %s', (deCopia, sinRed, sondeo, esperado) => {
    expect(avisoUnico({ deCopia, sinRed, sondeo })).toBe(esperado);
  });
  it('el aviso del servidor pierde ante la falta de red y ante la copia', () => {
    expect(avisoUnico({ deCopia: false, sinRed: false, sondeo: 'servidor' })).toBe('servidor');
    expect(avisoUnico({ deCopia: false, sinRed: true, sondeo: 'servidor' })).toBe('sin_conexion');
    expect(avisoUnico({ deCopia: true, sinRed: true, sondeo: 'servidor' })).toBe('copia');
  });
});
