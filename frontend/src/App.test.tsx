import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import { CODIGO_SEMILLA, crearServicioEntradaSimulado } from './mocks/servicioEntradaSimulado';

afterEach(() => vi.unstubAllGlobals());

const irA = (ruta: string) => window.history.replaceState({}, '', ruta);

describe('App', () => {
  it('/ muestra el inicio sin pasar por el estado de carga', () => {
    irA('/');
    render(<App />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Carta' })).toBeInTheDocument();
  });

  it.each([
    ['/staff/la-cocina', 'Personal · la-cocina', '¿Quién eres?', 'Preparando la mesa…'],
    ['/admin', 'Panel del operador', 'Tu restaurante, listo en minutos', 'Preparando tu panel…'],
  ])(
    '%s carga su área por separado: primero su estado de carga, luego la pantalla',
    async (ruta, sobretitulo, titulo, cargando) => {
      irA(ruta);
      render(<App />);
      // Si el área entrara con un import estático no habría estado de carga: esta es la guarda.
      expect(screen.getByRole('status')).toHaveTextContent(cargando);
      expect(await screen.findByText(sobretitulo)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
    },
  );

  it('/m/:codigo carga su área por separado y entra a la mesa con la API (T-2.4)', async () => {
    const sim = crearServicioEntradaSimulado();
    const fetchFalso = vi.fn(
      async () =>
        new Response(JSON.stringify(await sim.servicio.entrar(CODIGO_SEMILLA)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchFalso);
    irA(`/m/${CODIGO_SEMILLA}`);
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Preparando la mesa…');
    expect(await screen.findByRole('heading', { name: 'Estás en la mesa 7' })).toBeInTheDocument();
    expect((fetchFalso.mock.calls[0] as unknown as [string])[0]).toBe('/api/v1/p/sesion/entrar');
  });

  it('una ruta desconocida muestra el 404 en el lenguaje de la marca con un enlace-botón', () => {
    irA('/esto-no-existe');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'No encontramos esta página' })).toBeInTheDocument();
    const enlace = screen.getByRole('link', { name: 'Ir al inicio' });
    expect(enlace).toHaveAttribute('href', '/');
    expect(enlace).toHaveClass('boton', 'fantasma');
  });

  it.each(['/m/ABC123', '/m/%ZZ', '/m/%E0%A4%A', `/m/${'A'.repeat(101)}`, '/m/abc%00defghijklmnopqrstuvw'])(
    'un código que no puede ser de una mesa (%s) da la pantalla de mesa inválida sin llamar a la API',
    async (ruta) => {
      const fetchFalso = vi.fn();
      vi.stubGlobal('fetch', fetchFalso);
      irA(ruta);
      render(<App />);
      expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
      expect(fetchFalso).not.toHaveBeenCalled();
    },
  );
});
