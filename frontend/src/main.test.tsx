// El cableado de `main.tsx` (T-2.7): la guardia de recarga recibe «liberar el worker» y el registro se invoca.
import { describe, expect, it, vi } from 'vitest';

const instalar = vi.fn();
const registrar = vi.fn();
const liberar = vi.fn().mockResolvedValue(undefined);

vi.mock('./App', () => ({ App: () => null }));
vi.mock('./pwa/registro', () => ({ registrarServiceWorker: () => registrar(), liberarServiceWorker: () => liberar() }));
vi.mock('./recarga', () => ({ instalarGuardiaDeRecarga: (...a: unknown[]) => instalar(...a) }));

describe('main.tsx', () => {
  it('instala la guardia con «liberar el worker» y registra el service worker', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await import('./main');
    expect(registrar).toHaveBeenCalledTimes(1);
    expect(instalar).toHaveBeenCalledTimes(1);
    expect(instalar.mock.calls[0]![0]).toBe(window);
    const alFallar = instalar.mock.calls[0]![1] as () => Promise<void>;
    await alFallar();
    expect(liberar).toHaveBeenCalledTimes(1);
  });
});
