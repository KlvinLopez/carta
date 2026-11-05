import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HojaInferior } from './HojaInferior';

describe('HojaInferior', () => {
  it('no renderiza nada cuando está cerrada', () => {
    render(
      <HojaInferior abierta={false} onCerrar={() => undefined} titulo="Mi orden">
        contenido
      </HojaInferior>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierta es un diálogo modal etiquetado por su título y bloquea el scroll del cuerpo', () => {
    render(
      <HojaInferior abierta onCerrar={() => undefined} titulo="Mi orden">
        <p>Todavía no hay platillos.</p>
      </HojaInferior>,
    );
    const dialogo = screen.getByRole('dialog', { name: 'Mi orden' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Todavía no hay platillos.')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('se cierra con el fondo, con el botón y con Escape', async () => {
    const onCerrar = vi.fn();
    render(
      <HojaInferior abierta onCerrar={onCerrar} titulo="Mi orden">
        contenido
      </HojaInferior>,
    );
    await userEvent.click(screen.getByTestId('fondo-hoja'));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await userEvent.keyboard('{Escape}');
    expect(onCerrar).toHaveBeenCalledTimes(3);
  });

  it('al cerrarse devuelve el scroll al cuerpo', () => {
    const { rerender } = render(
      <HojaInferior abierta onCerrar={() => undefined}>
        contenido
      </HojaInferior>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <HojaInferior abierta={false} onCerrar={() => undefined}>
        contenido
      </HojaInferior>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});
