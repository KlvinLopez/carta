import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, TONOS_AVATAR, inicialesDe, tonoDeNombre } from './Avatar';

describe('Avatar', () => {
  it('sin foto muestra las iniciales y expone el nombre como etiqueta', () => {
    render(<Avatar nombre="Valeria Ruiz" />);
    expect(screen.getByRole('img', { name: 'Valeria Ruiz' })).toBeInTheDocument();
    expect(screen.getByTestId('iniciales')).toHaveTextContent('VR');
  });

  it('calcula iniciales legibles por punto de código', () => {
    expect(inicialesDe('Ana María López')).toBe('AL');
    expect(inicialesDe('valeria')).toBe('V');
    expect(inicialesDe('🍕 Luis')).toBe('L');
    expect(inicialesDe('ß')).toBe('ß');
    expect(inicialesDe('   ')).toBe('?');
    expect(inicialesDe('​')).toBe('?');
    expect(inicialesDe('🍕')).toBe('?');
  });

  it('el tono ignora mayúsculas y espacios', () => {
    expect(tonoDeNombre('Carlos Ramírez')).toBe(tonoDeNombre('  carlos   ramírez '));
    expect(tonoDeNombre('Luis')).toBe(tonoDeNombre(' luis '));
    expect(tonoDeNombre('Mariana')).toBe(tonoDeNombre('MARIANA  '));
  });

  it('reparte los tonos: 12 nombres distintos usan al menos 5 tonos, todos dentro de la paleta', () => {
    const nombres = ['Ana', 'Luis', 'Mariana', 'Carlos', 'Valeria', 'Pedro', 'Sofía', 'Diego', 'María', 'José', 'Lucía', 'Andrés'];
    const tonos = nombres.map(tonoDeNombre);
    for (const tono of tonos) {
      expect(tono).toBeGreaterThanOrEqual(0);
      expect(tono).toBeLessThan(TONOS_AVATAR);
    }
    expect(new Set(tonos).size).toBeGreaterThanOrEqual(5);
  });

  it('el componente pinta exactamente el tono calculado para el nombre', () => {
    render(<Avatar nombre="Luis" />);
    const interior = screen.getByRole('img', { name: 'Luis' }).firstElementChild!;
    const clasesTono = [...interior.classList].filter((c) => /^tono\d$/.test(c));
    expect(clasesTono).toEqual([`tono${tonoDeNombre('Luis')}`]);
  });

  it('con foto renderiza la imagen decorativa y no las iniciales', () => {
    render(<Avatar nombre="Carlos Ramírez" foto="https://ejemplo.test/carlos.jpg" />);
    expect(screen.queryByTestId('iniciales')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Carlos Ramírez' }).querySelector('img')).toHaveAttribute(
      'src',
      'https://ejemplo.test/carlos.jpg',
    );
  });

  it('si la foto falla al cargar vuelve a las iniciales', () => {
    render(<Avatar nombre="Carlos Ramírez" foto="https://ejemplo.test/rota.jpg" />);
    fireEvent.error(screen.getByRole('img', { name: 'Carlos Ramírez' }).querySelector('img')!);
    expect(screen.getByTestId('iniciales')).toHaveTextContent('CR');
  });

  describe('color del servidor (AC-03.1)', () => {
    it('pinta el color recibido y no cambia al cambiar el nombre', () => {
      const { rerender } = render(<Avatar nombre="Ana" color="#4F1728" />);
      const interior = () => screen.getByTestId('iniciales').parentElement!;
      expect(interior().style.getPropertyValue('--color-avatar')).toBe('#4F1728');
      rerender(<Avatar nombre="Zoila Pérez" color="#4F1728" />);
      expect(interior().style.getPropertyValue('--color-avatar')).toBe('#4F1728');
    });

    it.each(['rojo', '#fff', '#4f1728', 'url(x)', '#4F1728; background:red', ''])('un color inválido (%s) se ignora y vale el del nombre', (color) => {
      render(<Avatar nombre="Ana" color={color} />);
      expect(screen.getByTestId('iniciales').parentElement!.style.getPropertyValue('--color-avatar')).toBe('');
    });

    it('sobre un color claro el texto es oscuro; sobre uno oscuro, claro', () => {
      const { rerender } = render(<Avatar nombre="Ana" color="#B8860B" />);
      expect(screen.getByTestId('iniciales').parentElement).toHaveClass('textoOscuro');
      rerender(<Avatar nombre="Ana" color="#4F1728" />);
      expect(screen.getByTestId('iniciales').parentElement).not.toHaveClass('textoOscuro');
    });

    it('sin la prop nada cambia para quien ya lo usa', () => {
      render(<Avatar nombre="Valeria Ruiz" />);
      expect(screen.getByTestId('iniciales').parentElement!.className).toMatch(/tono\d/);
    });
  });
});
