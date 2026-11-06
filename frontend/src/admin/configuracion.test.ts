import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { leerConfiguracion } from './acceso/proveedor';

// A6: las variables VITE_FIREBASE_* viven en tres sitios (.env.example, vite-env.d.ts y
// leerConfiguracion). Renombrar una en un sitio y no en los otros dejaría el acceso «sin configurar»
// en producción sin que ninguna prueba lo notara.
const RAIZ = join(__dirname, '..', '..');

const delEjemplo = [
  ...readFileSync(join(RAIZ, '.env.example'), 'utf8')
    .split('\n')
    .filter((linea) => !linea.trimStart().startsWith('#'))
    .join('\n')
    .matchAll(/^(VITE_FIREBASE_[A-Z_]+)=/gm),
].map((m) => m[1]!);
const delTipo = [
  ...readFileSync(join(__dirname, '..', 'vite-env.d.ts'), 'utf8').matchAll(
    /readonly (VITE_FIREBASE_[A-Z_]+)\??:/g,
  ),
].map((m) => m[1]!);

/** Las claves que `leerConfiguracion` realmente pide a su entorno. */
function clavesLeidas(): string[] {
  const leidas = new Set<string>();
  const entorno = new Proxy(
    {},
    {
      get(_t, clave) {
        if (typeof clave === 'string') leidas.add(clave);
        return 'x';
      },
    },
  );
  leerConfiguracion(entorno as Record<string, string>);
  return [...leidas].filter((c) => c.startsWith('VITE_FIREBASE_'));
}

describe('variables VITE_FIREBASE_*', () => {
  it('.env.example, vite-env.d.ts y leerConfiguracion hablan de las mismas cuatro', () => {
    const esperadas = [...clavesLeidas()].sort();
    expect(esperadas).toHaveLength(4);
    expect([...delEjemplo].sort()).toEqual(esperadas);
    expect([...delTipo].sort()).toEqual(esperadas);
  });

  it.each(clavesLeidas())('con %s faltante (una sola) no hay configuración: null', (faltante) => {
    const completa = Object.fromEntries(clavesLeidas().map((c) => [c, 'valor']));
    expect(leerConfiguracion(completa)).not.toBeNull();
    expect(leerConfiguracion({ ...completa, [faltante]: undefined })).toBeNull();
    expect(leerConfiguracion({ ...completa, [faltante]: '' })).toBeNull();
  });

  it('el ejemplo sólo trae valores de ejemplo, no una configuración real', () => {
    const texto = readFileSync(join(RAIZ, '.env.example'), 'utf8');
    expect(texto).toContain('AIza-ejemplo');
    expect(texto).not.toMatch(/AIza[0-9A-Za-z_-]{30,}/);
  });
});
