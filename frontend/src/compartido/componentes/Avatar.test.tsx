import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, TONOS_AVATAR, inicialesDe, tonoDeNombre } from './Avatar';

describe('Avatar', () => {
  it('sin foto muestra las iniciales y expone el nombre como etiqueta', () => {
    render(<Avatar nombre="Valeria Ruiz" />);
    expect(screen.getByRole('img', { name: 'Valeria Ruiz' })).toBeInTheDocument();
    expect(screen.getByTestId('iniciales')).toHaveTextContent('VR');
  });

  it('calcula iniciales legibles', () => {
    expect(inicialesDe('Ana María López')).toBe('AL');
    expect(inicialesDe('valeria')).toBe('V');
    expect(inicialesDe('   ')).toBe('?');
  });

  it('asigna un tono estable por nombre dentro de la paleta', () => {
    expect(tonoDeNombre('Carlos Ramírez')).toBe(tonoDeNombre('  carlos ramírez '));
    for (const nombre of ['Ana', 'Luis', 'Mariana', 'Chef Valeria Ruiz']) {
      const tono = tonoDeNombre(nombre);
      expect(tono).toBeGreaterThanOrEqual(0);
      expect(tono).toBeLessThan(TONOS_AVATAR);
    }
  });

  it('con foto renderiza la imagen decorativa y no las iniciales', () => {
    render(<Avatar nombre="Carlos Ramírez" foto="https://ejemplo.test/carlos.jpg" />);
    expect(screen.queryByTestId('iniciales')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Carlos Ramírez' }).querySelector('img')).toHaveAttribute(
      'src',
      'https://ejemplo.test/carlos.jpg',
    );
  });
});
