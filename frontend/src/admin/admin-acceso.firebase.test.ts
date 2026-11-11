import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// El SDK simulado: nada de red ni de Firebase real.
const sdk = vi.hoisted(() => {
  const instancia = { currentUser: null as null | { getIdToken: (f?: boolean) => Promise<string> } };
  return {
    instancia,
    initializeApp: vi.fn(() => ({})),
    getApps: vi.fn(() => []),
    getApp: vi.fn(),
    initializeAuth: vi.fn(() => instancia),
    signInWithRedirect: vi.fn(async () => {}),
    signInWithPopup: vi.fn(async () => {}),
    getRedirectResult: vi.fn(async () => null),
    sendSignInLinkToEmail: vi.fn(async () => {}),
    isSignInWithEmailLink: vi.fn(() => true),
    signInWithEmailLink: vi.fn(async () => ({})),
    signOut: vi.fn(async () => {}),
    onIdTokenChanged: vi.fn(),
    GoogleAuthProvider: class {},
    indexedDBLocalPersistence: 'idb',
    inMemoryPersistence: 'memoria',
    getAuth: vi.fn(() => instancia),
    browserPopupRedirectResolver: 'resolver',
  };
});
vi.mock('firebase/app', () => ({
  initializeApp: sdk.initializeApp,
  getApps: sdk.getApps,
  getApp: sdk.getApp,
}));
vi.mock('firebase/auth', () => sdk);

import { crearProveedorFirebase, ErrorAcceso, type CodigoErrorAcceso } from './acceso/proveedor';

const CONFIG = { apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: 'a' };

beforeEach(() => vi.clearAllMocks());

describe('proveedor Firebase (SDK simulado)', () => {
  it('Google entra por popup (el redirect no sobrevive al particionado de terceros)', async () => {
    const p = await crearProveedorFirebase(CONFIG, 'https://carta.cooking');
    await p.entrarConGoogle();
    expect(sdk.signInWithPopup).toHaveBeenCalledOnce();
    expect(sdk.signInWithPopup).toHaveBeenCalledWith(sdk.instancia, expect.anything());
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
  });

  it.each(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'])(
    'si el navegador bloquea la ventana (%s) entra por redirección',
    async (code) => {
      const p = await crearProveedorFirebase(CONFIG, 'https://carta.cooking');
      sdk.signInWithPopup.mockRejectedValueOnce({ code });
      await p.entrarConGoogle();
      expect(sdk.signInWithRedirect).toHaveBeenCalledWith(sdk.instancia, expect.anything());
    },
  );

  it('cerrar la ventana de Google es «cancelado» y no cae al redirect', async () => {
    const p = await crearProveedorFirebase(CONFIG, 'https://carta.cooking');
    sdk.signInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    await expect(p.entrarConGoogle()).rejects.toMatchObject({ name: 'ErrorAcceso', codigo: 'cancelado' });
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
  });

  it('el enlace por correo vuelve a /admin/acceso y se completa en la app', async () => {
    const p = await crearProveedorFirebase(CONFIG, 'https://carta.cooking');
    await p.enviarEnlace('ana@ejemplo.mx');
    expect(sdk.sendSignInLinkToEmail).toHaveBeenCalledWith(sdk.instancia, 'ana@ejemplo.mx', {
      url: 'https://carta.cooking/admin/acceso',
      handleCodeInApp: true,
    });
  });

  it('entrega el ID token en cada cambio (alta y renovación) y avisa al cerrar sesión', async () => {
    let escucha: (u: unknown) => void = () => {};
    sdk.onIdTokenChanged.mockImplementation((_a: unknown, cb: (u: unknown) => void) => {
      escucha = cb;
      return () => {};
    });
    const p = await crearProveedorFirebase(CONFIG);
    const cambios: unknown[] = [];
    p.suscribir((u, t) => cambios.push([u, t]), () => {});
    escucha({ email: 'ana@ejemplo.mx', displayName: 'Ana', getIdToken: async () => 't1' });
    await vi.waitFor(() => expect(cambios).toHaveLength(1));
    escucha({ email: 'ana@ejemplo.mx', displayName: 'Ana', getIdToken: async () => 't2' });
    await vi.waitFor(() => expect(cambios).toHaveLength(2));
    escucha(null);
    await vi.waitFor(() => expect(cambios).toHaveLength(3));
    expect(cambios).toEqual([
      [{ correo: 'ana@ejemplo.mx', nombre: 'Ana' }, 't1'],
      [{ correo: 'ana@ejemplo.mx', nombre: 'Ana' }, 't2'],
      [null, null],
    ]);
  });

  it('traduce los códigos de Firebase a mensajes de la marca', async () => {
    const p = await crearProveedorFirebase(CONFIG);
    sdk.signInWithEmailLink.mockRejectedValueOnce({ code: 'auth/expired-action-code' });
    await expect(p.completarEnlace('u', 'a@b.c')).rejects.toMatchObject({ codigo: 'enlace-invalido' });
    sdk.sendSignInLinkToEmail.mockRejectedValueOnce({ code: 'auth/network-request-failed' });
    await expect(p.enviarEnlace('a@b.c')).rejects.toBeInstanceOf(ErrorAcceso);
    sdk.sendSignInLinkToEmail.mockRejectedValueOnce({ code: 'auth/too-many-requests' });
    await expect(p.enviarEnlace('a@b.c')).rejects.toMatchObject({ codigo: 'demasiados-intentos' });
  });

  it('B1: la persistencia es IndexedDB o memoria, nunca localStorage', async () => {
    await crearProveedorFirebase(CONFIG);
    const [, opciones] = sdk.initializeAuth.mock.calls[0] as unknown as [unknown, { persistence: unknown[] }];
    expect(opciones.persistence).toEqual(['idb', 'memoria']);
    expect(opciones.persistence).not.toContain('local');
  });

  it('una segunda carga del proveedor (Reintentar) reutiliza el auth ya inicializado', async () => {
    sdk.initializeAuth.mockImplementationOnce(() => {
      throw new Error('auth/already-initialized');
    });
    const p = await crearProveedorFirebase(CONFIG);
    expect(sdk.getAuth).toHaveBeenCalledOnce();
    await p.entrarConGoogle();
    expect(sdk.signInWithPopup).toHaveBeenCalledWith(sdk.instancia, expect.anything());
  });

  it.each([
    ['auth/invalid-email', 'correo-invalido'],
    ['auth/popup-closed-by-user', 'cancelado'],
    ['auth/cancelled-popup-request', 'cancelado'],
    ['auth/user-disabled', 'cuenta-deshabilitada'],
    ['auth/network-request-failed', 'sin-red'],
    ['auth/expired-action-code', 'enlace-invalido'],
    ['auth/invalid-action-code', 'enlace-invalido'],
    ['auth/too-many-requests', 'demasiados-intentos'],
    ['auth/algo-que-no-conocemos', 'otro'],
  ] satisfies [string, CodigoErrorAcceso][])('%s → ErrorAcceso %s', async (code, codigo) => {
    const p = await crearProveedorFirebase(CONFIG);
    sdk.sendSignInLinkToEmail.mockRejectedValueOnce({ code });
    await expect(p.enviarEnlace('a@b.c')).rejects.toMatchObject({ name: 'ErrorAcceso', codigo });
  });

  it('al volver de Google consume el resultado del redirect y un fallo llega como ErrorAcceso', async () => {
    sdk.onIdTokenChanged.mockImplementation(() => () => {});
    sdk.getRedirectResult.mockRejectedValueOnce({ code: 'auth/user-disabled' });
    const p = await crearProveedorFirebase(CONFIG);
    const errores: ErrorAcceso[] = [];
    p.suscribir(() => {}, (e) => errores.push(e));
    expect(sdk.getRedirectResult).toHaveBeenCalledWith(sdk.instancia);
    await vi.waitFor(() => expect(errores).toHaveLength(1));
    expect(errores[0]).toMatchObject({ codigo: 'cuenta-deshabilitada' });
  });

  it('renovar: sin red lanza (la sesión se conserva); token revocado devuelve null (ya no hay sesión)', async () => {
    const p = await crearProveedorFirebase(CONFIG);
    sdk.instancia.currentUser = {
      getIdToken: vi.fn().mockRejectedValueOnce({ code: 'auth/network-request-failed' }),
    };
    await expect(p.renovar()).rejects.toMatchObject({ codigo: 'sin-red' });
    sdk.instancia.currentUser = {
      getIdToken: vi.fn().mockRejectedValueOnce({ code: 'auth/user-token-expired' }),
    };
    expect(await p.renovar()).toBeNull();
    sdk.instancia.currentUser = null;
  });

  it('renovar pide un token nuevo; sin usuario devuelve null', async () => {
    const p = await crearProveedorFirebase(CONFIG);
    expect(await p.renovar()).toBeNull();
    const getIdToken = vi.fn(async () => 'fresco');
    sdk.instancia.currentUser = { getIdToken };
    expect(await p.renovar()).toBe('fresco');
    expect(getIdToken).toHaveBeenCalledWith(true);
  });
});

/** Formas de traer `firebase/*` al código; cualquiera fuera de `proveedor.ts` (o no literal) es infracción. */
export function infraccionesDeFirebase(fuente: string, esProveedor: boolean): string[] {
  // Los comentarios mencionan `import()` y `firebase/…` sin importar nada.
  const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const hallazgos: string[] = [];
  // import x from 'firebase/…' · import 'firebase/…' (efecto lateral) · export … from 'firebase/…'
  if (/\b(?:import|export)\b\s*(?:[^'"`;]*?\bfrom\s*)?['"`]firebase/.test(codigo)) {
    hallazgos.push('import/export estático');
  }
  // import('firebase/…') fuera del único archivo permitido
  if (!esProveedor && /\bimport\(\s*['"`]firebase/.test(codigo)) hallazgos.push('import() fuera de proveedor.ts');
  // import(variable) · import(`…${x}`) · cualquier especificador que no sea un literal simple
  if (/\bimport\(\s*(?!['"][^'"`$]*['"]\s*\))/.test(codigo)) hallazgos.push('import() no literal');
  if (/\brequire\(/.test(codigo)) hallazgos.push('require');
  return hallazgos;
}

describe('el SDK sólo vive en el área /admin', () => {
  function archivos(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const ruta = join(dir, n);
      return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
    });
  }

  it('ningún archivo fuera de admin/acceso/proveedor.ts importa firebase, y siempre con import() literal', () => {
    const raiz = join(__dirname, '..');
    const infractores: string[] = [];
    for (const ruta of archivos(raiz)) {
      if (!/\.(ts|tsx)$/.test(ruta) || /\.test\.tsx?$/.test(ruta)) continue;
      const rel = relative(raiz, ruta).split(sep).join('/');
      const hallazgos = infraccionesDeFirebase(readFileSync(ruta, 'utf8'), rel === 'admin/acceso/proveedor.ts');
      if (hallazgos.length > 0) infractores.push(`${rel}: ${hallazgos.join(', ')}`);
    }
    expect(infractores).toEqual([]);
  });

  it('proveedor.ts sí usa import() dinámico y literal (la guarda no es vacua)', () => {
    const codigo = readFileSync(join(__dirname, 'acceso/proveedor.ts'), 'utf8');
    expect(/\bimport\(\s*'firebase\/auth'\s*\)/.test(codigo)).toBe(true);
    expect(infraccionesDeFirebase(codigo, true)).toEqual([]);
  });

  it.each([
    ["import { getAuth } from 'firebase/auth';", true],
    ["import {\n  getAuth,\n  signOut,\n} from \"firebase/auth\";", true],
    ["import 'firebase/auth';", true],
    ["import * as fb from 'firebase/app'", true],
    ["export * from 'firebase/auth';", true],
    ["export { getAuth } from 'firebase/auth';", true],
    ["const m = 'firebase/auth'; await import(m);", true],
    ["await import(`firebase/${modulo}`);", true],
    ["const f = require('firebase/auth');", true],
    ["const x = await import('firebase/auth');", false], // legítimo sólo en proveedor.ts (ver abajo)
    ["const Area = lazy(() => import('./admin/Area'));", false],
    ["import { useState } from 'react';", false],
  ])('la guarda detecta %j → %s', (codigo, infraccion) => {
    expect(infraccionesDeFirebase(codigo, true).length > 0).toBe(infraccion);
  });

  it('un import() literal de firebase fuera de proveedor.ts es infracción', () => {
    expect(infraccionesDeFirebase("await import('firebase/auth')", false)).not.toEqual([]);
    expect(infraccionesDeFirebase("await import('firebase/auth')", true)).toEqual([]);
  });
});
