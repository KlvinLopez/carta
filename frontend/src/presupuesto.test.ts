import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

// A5: el presupuesto vigila el contenido del grafo inicial, no sólo el tamaño. Se prueba el
// script real contra un `dist/` falso (PRESUPUESTO_DIST), sin construir nada.
const SCRIPT = resolve(__dirname, '..', 'scripts', 'presupuesto.mjs');
const creados: string[] = [];

function dist(js: string, trozosExtra: string[] = ['PantallaMenu-1.js']): string {
  const raiz = mkdtempSync(join(tmpdir(), 'presupuesto-'));
  creados.push(raiz);
  mkdirSync(join(raiz, 'assets'));
  writeFileSync(
    join(raiz, 'index.html'),
    '<!doctype html><html><head><script type="module" src="/assets/index-a.js"></script></head><body></body></html>',
  );
  writeFileSync(join(raiz, 'assets', 'index-a.js'), js);
  for (const n of ['Area-1.js', 'Area-2.js', 'Area-3.js', ...trozosExtra]) writeFileSync(join(raiz, 'assets', n), '//');
  return raiz;
}

function correr(carpeta: string) {
  const r = spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, PRESUPUESTO_DIST: carpeta },
    encoding: 'utf8',
  });
  return { codigo: r.status, salida: `${r.stdout}${r.stderr}` };
}

afterEach(() => {
  for (const carpeta of creados.splice(0)) rmSync(carpeta, { recursive: true, force: true });
});

describe('presupuesto.mjs: el SDK de Firebase no entra a la carga inicial', () => {
  it('un grafo inicial limpio pasa', () => {
    const { codigo, salida } = correr(dist('console.log("hola");'));
    expect(salida).toContain('Presupuesto en verde');
    expect(codigo).toBe(0);
  });

  it.each([
    ['identitytoolkit', 'fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp");'],
    ['firebaseapp', 'const authDomain = "mi-proyecto.firebaseapp.com";'],
  ])('falla si el bundle inicial lleva la marca «%s» (import estático, de efecto lateral, etc.)', (_marca, js) => {
    const { codigo, salida } = correr(dist(js));
    expect(codigo).toBe(1);
    expect(salida).toContain('El SDK de Firebase está en la carga inicial');
    expect(salida).toContain('/assets/index-a.js');
  });
});

describe('presupuesto.mjs: la pantalla Menú es su propio trozo (T-1.12)', () => {
  it('sin dist/assets/PantallaMenu-*.js falla (alguien quitó el React.lazy)', () => {
    const { codigo, salida } = correr(dist('console.log("hola");', []));
    expect(codigo).toBe(1);
    expect(salida).toContain('falta dist/assets/PantallaMenu-*.js');
  });

  it('si index.html lo carga de inicio falla', () => {
    const carpeta = dist('console.log("hola");');
    writeFileSync(
      join(carpeta, 'index.html'),
      '<!doctype html><html><head><script type="module" src="/assets/index-a.js"></script><link rel="modulepreload" href="/assets/PantallaMenu-1.js"></head><body></body></html>',
    );
    const { codigo, salida } = correr(carpeta);
    expect(codigo).toBe(1);
    expect(salida).toContain('index.html carga de inicio PantallaMenu-1.js');
  });
});
