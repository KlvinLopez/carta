import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

const irA = (ruta: string) => window.history.replaceState({}, '', ruta);
const CODIGO = 'ABCDEFGHJKLMNPQRSTUVWX'; // 22 caracteres, como mesa.codigo_publico

describe('App', () => {
  it('/ muestra el inicio sin pasar por el estado de carga', () => {
    irA('/');
    render(<App />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Carta' })).toBeInTheDocument();
  });

  it.each([
    [`/m/${CODIGO}`, `Mesa ${CODIGO}`, 'Bienvenido a la mesa'],
    ['/staff/la-cocina', 'Personal · la-cocina', '¿Quién eres?'],
    ['/admin', 'Panel del operador', 'Tu restaurante, listo en minutos'],
  ])(
    '%s carga su área por separado: primero "Preparando la mesa…", luego la pantalla',
    async (ruta, sobretitulo, titulo) => {
      irA(ruta);
      render(<App />);
      // Si el área entrara con un import estático no habría estado de carga: esta es la guarda.
      expect(screen.getByRole('status')).toHaveTextContent('Preparando la mesa…');
      expect(await screen.findByText(sobretitulo)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
    },
  );

  it('una ruta desconocida muestra el 404 en el lenguaje de la marca con un enlace-botón', () => {
    irA('/esto-no-existe');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'No encontramos esta página' })).toBeInTheDocument();
    const enlace = screen.getByRole('link', { name: 'Ir al inicio' });
    expect(enlace).toHaveAttribute('href', '/');
    expect(enlace).toHaveClass('boton', 'fantasma');
  });

  it('un código de mesa que no puede existir (corto o con símbolos) cae al 404', async () => {
    irA('/m/ABC123');
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'No encontramos esta página' }),
    ).toBeInTheDocument();
  });
});
