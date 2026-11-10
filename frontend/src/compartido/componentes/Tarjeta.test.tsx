import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Chip } from './Chip';
import { Tarjeta } from './Tarjeta';

describe('Tarjeta', () => {
  it('sin onClick es una sección con sombra de superficie, no un botón', () => {
    render(<Tarjeta aria-label="Resumen">contenido</Tarjeta>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const tarjeta = screen.getByText('contenido');
    expect(tarjeta.tagName).toBe('SECTION');
    expect(tarjeta).toHaveClass('tarjeta');
    expect(tarjeta).not.toHaveClass('cremaBaja', 'interactiva');
  });

  it('tono crema-baja, flotante y ajustada se reflejan como clases', () => {
    render(
      <Tarjeta tono="crema-baja" flotante ajustada>
        agrupado
      </Tarjeta>,
    );
    expect(screen.getByText('agrupado')).toHaveClass('cremaBaja', 'flotante', 'ajustada');
  });

  it('con onClick toda la tarjeta es un botón accesible: clic, Enter y Espacio', async () => {
    const alHacerClic = vi.fn();
    render(
      <Tarjeta onClick={alHacerClic} aria-label="Tacos al pastor">
        Tacos al pastor · $95
      </Tarjeta>,
    );
    const boton = screen.getByRole('button', { name: 'Tacos al pastor' });
    expect(boton).toHaveClass('interactiva');
    expect(boton).toHaveAttribute('tabindex', '0');
    await userEvent.click(boton);
    boton.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(alHacerClic).toHaveBeenCalledTimes(3);
  });

  it('un chip tocable dentro de una tarjeta tocable funciona sin disparar la tarjeta ni anidar botones', async () => {
    const alTocarTarjeta = vi.fn();
    const alTocarChip = vi.fn();
    const avisos = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <Tarjeta onClick={alTocarTarjeta} aria-label="Platillo">
        <Chip onClick={alTocarChip}>Picante</Chip>
      </Tarjeta>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Picante' }));
    expect(alTocarChip).toHaveBeenCalledTimes(1);
    expect(alTocarTarjeta).not.toHaveBeenCalled();
    expect(avisos).not.toHaveBeenCalled(); // sin "validateDOMNesting" de React
    avisos.mockRestore();
  });
});
