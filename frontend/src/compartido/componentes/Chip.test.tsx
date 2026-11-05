import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { Chip } from './Chip';

describe('Chip', () => {
  it('sin onClick es una etiqueta (span), no un botón', () => {
    render(<Chip tono="dorado">Del chef</Chip>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const chip = screen.getByText('Del chef');
    expect(chip.tagName).toBe('SPAN');
    expect(chip).toHaveClass('chip', 'dorado');
  });

  it('con onClick es un botón de filtro (type button, aria-pressed) que dispara el clic', async () => {
    const alHacerClic = vi.fn();
    render(<Chip onClick={alHacerClic}>Vegano</Chip>);
    const boton = screen.getByRole('button', { name: 'Vegano', pressed: false });
    expect(boton).toHaveAttribute('type', 'button');
    expect(boton).toHaveClass('tocable');
    await userEvent.click(boton);
    expect(alHacerClic).toHaveBeenCalledTimes(1);
  });

  it('activo se anuncia como presionado', () => {
    render(
      <Chip onClick={() => undefined} activo>
        Entradas
      </Chip>,
    );
    expect(screen.getByRole('button', { name: 'Entradas', pressed: true })).toHaveClass('activo');
  });

  it('el chip tocable extiende su área táctil a ≥ 44 px (36 px visibles + ::after por lado)', () => {
    // jsdom no calcula layout ni pseudo-elementos: se guarda la regla en el CSS hasta tener Playwright.
    const css = readFileSync(join(__dirname, 'Chip.module.css'), 'utf8');
    const visible = css.match(/\.tocable\s*\{[^}]*min-height:\s*(\d+)px/)?.[1];
    const extension = css.match(/\.tocable::after\s*\{[^}]*inset:\s*-(\d+)px 0/)?.[1];
    expect(visible).toBeDefined();
    expect(extension).toBeDefined();
    expect(Number(visible) + 2 * Number(extension)).toBeGreaterThanOrEqual(44);
  });
});
