import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { HojaInferior } from './HojaInferior';

/** Padre con botón disparador y una lambda `onCerrar` nueva en cada render, como en las pantallas reales. */
function Disparador({ hijos }: { hijos?: React.ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  const [, setContador] = useState(0);
  return (
    <div id="app">
      <button type="button" onClick={() => setAbierta(true)}>
        Abrir
      </button>
      <button type="button" onClick={() => setContador((n) => n + 1)}>
        Re-render
      </button>
      <HojaInferior abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Mi orden">
        {hijos ?? <p>contenido</p>}
      </HojaInferior>
    </div>
  );
}

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

  it('al abrirse recibe el foco y su botón de cierre es type=button', () => {
    render(
      <HojaInferior abierta onCerrar={() => undefined} titulo="Mi orden">
        contenido
      </HojaInferior>,
    );
    expect(screen.getByRole('dialog', { name: 'Mi orden' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveAttribute('type', 'button');
  });

  it('se cierra con el fondo', async () => {
    const onCerrar = vi.fn();
    render(
      <HojaInferior abierta onCerrar={onCerrar} titulo="Mi orden">
        contenido
      </HojaInferior>,
    );
    await userEvent.click(screen.getByTestId('fondo-hoja'));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('se cierra con el botón', async () => {
    const onCerrar = vi.fn();
    render(
      <HojaInferior abierta onCerrar={onCerrar} titulo="Mi orden">
        contenido
      </HojaInferior>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('se cierra con Escape', async () => {
    const onCerrar = vi.fn();
    render(
      <HojaInferior abierta onCerrar={onCerrar} titulo="Mi orden">
        contenido
      </HojaInferior>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('si cambia onCerrar mientras está abierta, Escape usa el nuevo', async () => {
    const viejo = vi.fn();
    const nuevo = vi.fn();
    const { rerender } = render(
      <HojaInferior abierta onCerrar={viejo}>
        contenido
      </HojaInferior>,
    );
    rerender(
      <HojaInferior abierta onCerrar={nuevo}>
        contenido
      </HojaInferior>,
    );
    await userEvent.keyboard('{Escape}');
    expect(nuevo).toHaveBeenCalledTimes(1);
    expect(viejo).not.toHaveBeenCalled();
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

  it('un input dentro conserva el foco aunque el padre vuelva a renderizar', async () => {
    render(<Disparador hijos={<input aria-label="Nota" />} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const nota = screen.getByRole('textbox', { name: 'Nota' });
    await userEvent.click(nota);
    await userEvent.keyboard('a');
    await userEvent.click(screen.getByRole('button', { name: 'Re-render' })); // ignorado: #app está inert
    nota.focus();
    await userEvent.keyboard('b');
    expect(nota).toHaveValue('ab');
    expect(nota).toHaveFocus();
  });

  it('mientras está abierta el resto de la página queda inert y al cerrar el foco vuelve al disparador', async () => {
    render(<Disparador />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(abrir);
    expect(document.getElementById('app')).toHaveAttribute('inert');
    expect(screen.getByRole('dialog')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.getElementById('app')).not.toHaveAttribute('inert');
    expect(abrir).toHaveFocus();
  });

  it('Tab y Shift+Tab circulan dentro del diálogo', async () => {
    render(
      <HojaInferior abierta onCerrar={() => undefined} titulo="Mi orden">
        <button type="button">Entendido</button>
      </HojaInferior>,
    );
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Entendido' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });
});
