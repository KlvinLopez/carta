import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CLAVES_ILUSTRACION } from '../../compartido/ilustraciones';
import { platilloDe } from '../../mocks/servicioMenuSimulado';
import { Miniatura, urlDeFotoSegura } from './Miniatura';

const montar = (parche: Parameters<typeof platilloDe>[1]) => render(<Miniatura platillo={platilloDe(1, parche)} />);

describe('miniatura del platillo (US-17)', () => {
  it('con foto muestra la foto', () => {
    const { container } = montar({ imagen_tipo: 'foto', foto_thumb_url: '/f/p.webp' });
    expect(container.querySelector('img')).toHaveAttribute('src', '/f/p.webp');
  });

  it('foto_sin_miniatura_cae_a_ilustracion: imagen_tipo foto pero sin URL no pinta <img src="null">', () => {
    const { container } = montar({ imagen_tipo: 'foto', foto_thumb_url: null, ilustracion_clave: 'sopas' });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('data-clave', 'sopas');
  });

  it('img_rota_cae_a_ilustracion: si la foto no carga (404) se muestra la ilustración, no un icono roto', () => {
    const { container } = montar({ imagen_tipo: 'foto', foto_thumb_url: '/f/borrada.webp', ilustracion_clave: 'postres' });
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('data-clave', 'postres');
  });

  it.each(['javascript:alert(1)', 'data:image/png;base64,AAAA', 'http://x.test/a.jpg', '//evil.test/a.jpg', 'ftp://x/y', 'no es una url'])(
    'url_con_esquema_raro_cae_a_ilustracion: %s',
    (url) => {
      expect(urlDeFotoSegura(url)).toBeNull();
      const { container } = montar({ imagen_tipo: 'foto', foto_thumb_url: url });
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('svg')).not.toBeNull();
    },
  );

  it('acepta rutas del propio origen y https', () => {
    expect(urlDeFotoSegura('/fotos/a.webp')).toBe('/fotos/a.webp');
    expect(urlDeFotoSegura('https://cdn.carta.test/a.webp')).toBe('https://cdn.carta.test/a.webp');
  });

  it('cada_clave_tiene_su_ilustracion: las 20 claves pintan su propio glifo y una desconocida pinta general', () => {
    for (const clave of CLAVES_ILUSTRACION) {
      const { container, unmount } = montar({ ilustracion_clave: clave });
      expect(container.querySelector('svg')).toHaveAttribute('data-clave', clave);
      expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
      unmount();
    }
    expect(CLAVES_ILUSTRACION).toHaveLength(20);
    const { container } = montar({ ilustracion_clave: 'clave-inventada' });
    expect(container.querySelector('svg')).toHaveAttribute('data-clave', 'general');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('una foto nueva (otra URL) vuelve a intentarse tras un fallo', () => {
    const { container, rerender } = montar({ imagen_tipo: 'foto', foto_thumb_url: '/f/a.webp' });
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    rerender(<Miniatura platillo={platilloDe(1, { imagen_tipo: 'foto', foto_thumb_url: '/f/b.webp' })} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/f/b.webp');
  });
});
