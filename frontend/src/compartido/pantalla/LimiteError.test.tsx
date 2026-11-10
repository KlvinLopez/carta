import { render, screen } from '@testing-library/react';
import { lazy, Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LimiteError } from './LimiteError';

describe('LimiteError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('si un trozo lazy no llega muestra el mensaje y el botón de reintentar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const AreaRota = lazy(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
    render(
      <LimiteError>
        <Suspense fallback={<p>cargando</p>}>
          <AreaRota />
        </Suspense>
      </LimiteError>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar esta pantalla');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('reintentar recarga la página', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const recargar = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: recargar });
    const AreaRota = lazy(() => Promise.reject(new Error('fallo')));
    render(
      <LimiteError>
        <Suspense fallback={null}>
          <AreaRota />
        </Suspense>
      </LimiteError>,
    );
    (await screen.findByRole('button', { name: 'Reintentar' })).click();
    expect(recargar).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('sin error renderiza a sus hijos', () => {
    render(
      <LimiteError>
        <p>todo bien</p>
      </LimiteError>,
    );
    expect(screen.getByText('todo bien')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
