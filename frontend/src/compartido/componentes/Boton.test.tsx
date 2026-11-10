import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Boton, clasesBoton } from './Boton';

describe('Boton', () => {
  it('es un botón de tipo button por defecto y dispara onClick', async () => {
    const alHacerClic = vi.fn();
    render(<Boton onClick={alHacerClic}>Ver mi orden</Boton>);
    const boton = screen.getByRole('button', { name: 'Ver mi orden' });
    expect(boton).toHaveAttribute('type', 'button');
    await userEvent.click(boton);
    expect(alHacerClic).toHaveBeenCalledTimes(1);
  });

  it('aplica la variante como clase y la primaria por defecto', () => {
    const { rerender } = render(<Boton>Primario</Boton>);
    expect(screen.getByRole('button')).toHaveClass('boton', 'primario');
    rerender(<Boton variante="dorado">Acento</Boton>);
    expect(screen.getByRole('button')).toHaveClass('dorado');
    expect(screen.getByRole('button')).not.toHaveClass('primario');
  });

  it('deshabilitado no dispara onClick', async () => {
    const alHacerClic = vi.fn();
    render(
      <Boton disabled onClick={alHacerClic}>
        Confirmar
      </Boton>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(alHacerClic).not.toHaveBeenCalled();
  });

  it('cargando bloquea el clic y anuncia aria-busy', async () => {
    const alHacerClic = vi.fn();
    render(
      <Boton cargando onClick={alHacerClic}>
        Enviando
      </Boton>,
    );
    const boton = screen.getByRole('button');
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(boton);
    expect(alHacerClic).not.toHaveBeenCalled();
  });
});

describe('Boton · indicador de espera y enlaces', () => {
  it('cargando muestra el indicador de espera (decorativo) y marca la clase cargando', () => {
    render(<Boton cargando>Enviando</Boton>);
    const boton = screen.getByRole('button');
    expect(boton.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(boton).toHaveClass('cargando');
  });

  it('sin cargando no hay indicador de espera', () => {
    render(<Boton>Enviar</Boton>);
    expect(screen.getByRole('button').querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('clasesBoton da las mismas clases para un enlace que se ve como botón', () => {
    render(
      <a href="/" className={clasesBoton({ variante: 'fantasma', ancho: true })}>
        Ir al inicio
      </a>,
    );
    expect(screen.getByRole('link')).toHaveClass('boton', 'fantasma', 'ancho');
  });
});
