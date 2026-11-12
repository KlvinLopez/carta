import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

// A5: el presupuesto vigila el contenido del grafo inicial, no sólo el tamaño. Se prueba el
// script real contra un `dist/` falso (PRESUPUESTO_DIST), sin construir nada.
const SCRIPT = resolve(__dirname, '..', 'scripts', 'presupuesto.mjs');
const creados: string[] = [];
const TROZOS_DE_PANTALLA = ['PantallaMenu-1.js', 'PantallaMesas-1.js', 'PantallaPersonal-1.js', 'PantallaAjustes-1.js'];

function dist(js: string, trozosExtra: string[] = TROZOS_DE_PANTALLA): string {
  const raiz = mkdtempSync(join(tmpdir(), 'presupuesto-'));
  creados.push(raiz);
  mkdirSync(join(raiz, 'assets'));
  writeFileSync(
    join(raiz, 'index.html'),
    '<!doctype html><html><head><script type="module" src="/assets/index-a.js"></script></head><body></body></html>',
  );
  writeFileSync(join(raiz, 'assets', 'index-a.js'), js);
  for (const n of ['Area-comensal-1.js', 'Area-personal-1.js', 'Area-admin-1.js', ...trozosExtra]) writeFileSync(join(raiz, 'assets', n), '//');
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

describe('presupuesto.mjs: Mesas, Personal y Ajustes son sus propios trozos (T-1.13)', () => {
  it.each(['PantallaMesas', 'PantallaPersonal', 'PantallaAjustes'])('sin dist/assets/%s-*.js falla', (nombre) => {
    const trozos = TROZOS_DE_PANTALLA.filter((n) => !n.startsWith(nombre));
    const { codigo, salida } = correr(dist('console.log("hola");', trozos));
    expect(codigo).toBe(1);
    expect(salida).toContain(`falta dist/assets/${nombre}-*.js`);
  });

  it.each(['PantallaMesas', 'PantallaPersonal', 'PantallaAjustes'])('si index.html carga %s de inicio falla', (nombre) => {
    const carpeta = dist('console.log("hola");');
    writeFileSync(
      join(carpeta, 'index.html'),
      `<!doctype html><html><head><script type="module" src="/assets/index-a.js"></script><link rel="modulepreload" href="/assets/${nombre}-1.js"></head><body></body></html>`,
    );
    const { codigo, salida } = correr(carpeta);
    expect(codigo).toBe(1);
    expect(salida).toContain(`index.html carga de inicio ${nombre}-1.js`);
  });
});

describe('presupuesto.mjs: el trozo del comensal no arrastra panel, Firebase ni datos simulados (T-2.7)', () => {
  /** Un dist falso cuyo `index-a.js` importa el trozo del comensal con la tabla de dependencias que escribe Vite. */
  function distConComensal(comensal: string, dependencias: string[] = [], extra: Record<string, string> = {}): string {
    const raiz = dist('console.log("hola");');
    const tabla = ['assets/Area-comensal-1.js', ...dependencias.map((d) => `assets/${d}`)];
    const indices = tabla.map((_, i) => i).join(',');
    writeFileSync(
      join(raiz, 'assets', 'index-a.js'),
      `const m=(i)=>{m.f||(m.f=[${tabla.map((t) => JSON.stringify(t)).join(',')}]);return i.map(j=>m.f[j])};a=()=>import("./Area-comensal-1.js"),__vite__mapDeps([${indices}]));`,
    );
    writeFileSync(join(raiz, 'assets', 'Area-comensal-1.js'), comensal);
    for (const [nombre, contenido] of Object.entries(extra)) writeFileSync(join(raiz, 'assets', nombre), contenido);
    return raiz;
  }

  it('un comensal limpio pasa y se imprime el peso de la precarga', () => {
    const { codigo, salida } = correr(distConComensal('export default 1;'));
    expect(codigo).toBe(0);
    expect(salida).toContain('Precarga del service worker');
  });

  it.each([
    ['el SDK de Firebase', 'fetch("https://identitytoolkit.googleapis.com/v1");', 'SDK de Firebase'],
    ['un dominio de Firebase', 'const a = "x.firebaseapp.com";', 'SDK de Firebase'],
    ['el código de mesa de los datos simulados', 'const c = "Jx3k9QwLmN2pR7sT4vY8zA";', 'datos simulados'],
    ['la huella de los errores simulados', 'const r = "req-simulado";', 'datos simulados'],
  ])('falla si el trozo del comensal lleva %s', (_que, js, etiqueta) => {
    const { codigo, salida } = correr(distConComensal(js));
    expect(codigo).toBe(1);
    expect(salida).toContain('El grafo del comensal arrastra lo que no es suyo');
    expect(salida).toContain(etiqueta);
  });

  it.each(['PantallaMenu-1.js', 'Area-admin-1.js', 'Area-personal-1.js', 'index.esm-1.js'])('falla si el comensal depende de %s', (panel) => {
    const { codigo, salida } = correr(distConComensal('export default 1;', [panel], { [panel]: '//' }));
    expect(codigo).toBe(1);
    expect(salida).toContain('trozo de otra área');
  });

  it('pasa sin trozo propio del comensal: va en la entrada (T-2.5, AC-01.1)', () => {
    const raiz = dist('console.log("hola");');
    rmSync(join(raiz, 'assets', 'Area-comensal-1.js'));
    const { codigo, salida } = correr(raiz);
    expect(salida).toContain('Presupuesto en verde');
    expect(codigo).toBe(0);
  });

  it('el SDK de Firebase o el panel dentro de la entrada (donde ahora vive el comensal) siguen fallando', () => {
    const raiz = dist('const a = "x.firebaseapp.com";');
    rmSync(join(raiz, 'assets', 'Area-comensal-1.js'));
    const { codigo, salida } = correr(raiz);
    expect(codigo).toBe(1);
    expect(salida).toContain('El SDK de Firebase está en la carga inicial');
  });

  it.each(['admin', 'personal'])('falla si falta el trozo propio de %s aunque haya otros trozos Area-* (B2)', (area) => {
    const raiz = dist('console.log("hola");');
    rmSync(join(raiz, 'assets', `Area-${area}-1.js`));
    writeFileSync(join(raiz, 'assets', 'Area-comensal-2.js'), '//'); // el conteo (≥ 2) sigue cumplido: lo que falta es el nombre
    const { codigo, salida } = correr(raiz);
    expect(codigo).toBe(1);
    expect(salida).toContain(`falta dist/assets/Area-${area}-*.js`);
  });

  it('falla si el panel y el personal dejan de ser trozos propios (menos de dos trozos de área)', () => {
    const raiz = dist('console.log("hola");');
    rmSync(join(raiz, 'assets', 'Area-comensal-1.js'));
    rmSync(join(raiz, 'assets', 'Area-personal-1.js'));
    const { codigo, salida } = correr(raiz);
    expect(codigo).toBe(1);
    expect(salida).toContain('Code splitting roto');
  });
});
