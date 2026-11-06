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
    browserLocalPersistence: 'local',
    browserPopupRedirectResolver: 'resolver',
  };
});
vi.mock('firebase/app', () => ({
  initializeApp: sdk.initializeApp,
  getApps: sdk.getApps,
  getApp: sdk.getApp,
}));
vi.mock('firebase/auth', () => sdk);

import { crearProveedorFirebase, ErrorAcceso } from './acceso/proveedor';

const CONFIG = { apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: 'a' };

beforeEach(() => vi.clearAllMocks());

describe('proveedor Firebase (SDK simulado)', () => {
  it('Google entra por redirección, nunca por popup', async () => {
    const p = await crearProveedorFirebase(CONFIG, 'https://carta.cooking');
    await p.entrarConGoogle();
    expect(sdk.signInWithRedirect).toHaveBeenCalledOnce();
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
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

  it('renovar pide un token nuevo; sin usuario devuelve null', async () => {
    const p = await crearProveedorFirebase(CONFIG);
    expect(await p.renovar()).toBeNull();
    const getIdToken = vi.fn(async () => 'fresco');
    sdk.instancia.currentUser = { getIdToken };
    expect(await p.renovar()).toBe('fresco');
    expect(getIdToken).toHaveBeenCalledWith(true);
  });
});

describe('el SDK sólo vive en el área /admin', () => {
  function archivos(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const ruta = join(dir, n);
      return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
    });
  }

  it('ningún archivo fuera de admin/acceso/proveedor.ts importa firebase, y siempre con import()', () => {
    const raiz = join(__dirname, '..');
    const infractores: string[] = [];
    for (const ruta of archivos(raiz)) {
      if (!/\.(ts|tsx)$/.test(ruta) || /\.test\.tsx?$/.test(ruta)) continue;
      const rel = relative(raiz, ruta).split(sep).join('/');
      const codigo = readFileSync(ruta, 'utf8');
      const estatico = /^\s*import\s[^;]*from\s+['"]firebase/m.test(codigo);
      const dinamico = /import\(\s*['"]firebase/.test(codigo);
      if (estatico || (dinamico && rel !== 'admin/acceso/proveedor.ts')) infractores.push(rel);
    }
    expect(infractores).toEqual([]);
  });
});
