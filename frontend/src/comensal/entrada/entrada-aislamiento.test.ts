import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function fuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return fuentes(ruta);
    return /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) && n !== 'utilesPrueba.tsx' ? [ruta] : [];
  });
}

describe('el trozo del comensal es el camino crítico', () => {
  it('no importa nada del panel del operador ni de Firebase, ni los datos simulados', () => {
    const raiz = join(__dirname, '..');
    for (const archivo of fuentes(raiz)) {
      const codigo = readFileSync(archivo, 'utf8');
      const importes = [...codigo.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);
      for (const origen of importes) {
        expect(origen, `${archivo} importa ${origen}`).not.toMatch(/firebase|\/admin\/|\/mocks\/|\/personal\//);
      }
    }
  });
});
