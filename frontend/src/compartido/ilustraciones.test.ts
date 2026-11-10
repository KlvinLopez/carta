import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLAVES_ILUSTRACION, GLIFOS, glifoDeClave } from './ilustraciones';

describe('ilustraciones por categoría', () => {
  it('cada_clave_tiene_su_ilustracion: las 20 claves de app/services/ilustraciones.py, ni más ni menos', () => {
    // vitest corre con `frontend/` como directorio de trabajo (npm --prefix frontend).
    const ruta = resolve(process.cwd(), '../app/services/ilustraciones.py');
    const fuente = readFileSync(ruta, 'utf8');
    // Claves del diccionario PALABRAS_POR_CLAVE (`"tacos": (` o `GENERAL: (`), más `general`.
    const bloque = fuente.slice(fuente.indexOf('PALABRAS_POR_CLAVE'));
    const delServidor = new Set([...bloque.matchAll(/^ {4}"([a-z]+)": \(/gm)].map((m) => m[1]!));
    delServidor.add('general');
    expect(delServidor.size).toBe(20);
    expect([...CLAVES_ILUSTRACION].sort()).toEqual([...delServidor].sort());
  });

  it('cada clave se distingue: glifo propio (no hay dos iguales) y trazos que no están vacíos', () => {
    const formas = new Set(Object.values(GLIFOS).map((g) => g.trazos.map((t) => t.d).join('|')));
    expect(formas.size).toBe(CLAVES_ILUSTRACION.length);
    for (const g of Object.values(GLIFOS)) expect(g.trazos.length).toBeGreaterThan(0);
  });

  it('una clave desconocida, vacía o con forma rara cae en general', () => {
    for (const clave of ['', null, undefined, 'sushi-bar', '__proto__', 'constructor']) {
      expect(glifoDeClave(clave).clave).toBe('general');
    }
    expect(glifoDeClave('TACOS').clave).toBe('tacos');
  });
});
