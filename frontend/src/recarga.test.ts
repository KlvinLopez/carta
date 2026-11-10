import { describe, expect, it, vi } from 'vitest';

import { manejarPreloadError, type Ventana } from './recarga';

function ventanaFalsa(href = 'https://carta.test/m/ABC', almacen = new Map<string, string>()) {
  const ventana: Ventana = {
    location: { href, reload: vi.fn() },
    sessionStorage: {
      getItem: (clave) => almacen.get(clave) ?? null,
      setItem: (clave, valor) => void almacen.set(clave, valor),
    },
  };
  return { ventana, almacen, evento: new Event('vite:preloadError', { cancelable: true }) };
}

describe('guardia de recarga ante vite:preloadError', () => {
  it('la primera vez recarga y cancela el evento', () => {
    const { ventana, evento } = ventanaFalsa();
    expect(manejarPreloadError(evento, ventana)).toBe(true);
    expect(ventana.location.reload).toHaveBeenCalledTimes(1);
    expect(evento.defaultPrevented).toBe(true);
  });

  it('la segunda vez en la misma URL no recarga y deja pasar el error (LimiteError)', () => {
    const { ventana, almacen } = ventanaFalsa();
    manejarPreloadError(new Event('vite:preloadError', { cancelable: true }), ventana);
    const segundo = new Event('vite:preloadError', { cancelable: true });
    expect(manejarPreloadError(segundo, ventanaFalsa(ventana.location.href, almacen).ventana)).toBe(false);
    expect(segundo.defaultPrevented).toBe(false);
  });

  it('otra URL de la misma pestaña sí puede recargar una vez', () => {
    const almacen = new Map<string, string>();
    const primera = ventanaFalsa('https://carta.test/m/ABC', almacen);
    const segunda = ventanaFalsa('https://carta.test/admin', almacen);
    expect(manejarPreloadError(primera.evento, primera.ventana)).toBe(true);
    expect(manejarPreloadError(segunda.evento, segunda.ventana)).toBe(true);
  });

  it('sin sessionStorage no recarga (no se puede garantizar una sola vez)', () => {
    const { ventana, evento } = ventanaFalsa();
    ventana.sessionStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(manejarPreloadError(evento, ventana)).toBe(false);
    expect(ventana.location.reload).not.toHaveBeenCalled();
    expect(evento.defaultPrevented).toBe(false);
  });
});
