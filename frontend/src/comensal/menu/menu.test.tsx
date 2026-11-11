import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { crearMenuGrande, crearMenuSemilla } from '../../mocks/servicioMenuComensalSimulado';
import { ImagenPlatillo, urlDeFotoSegura } from './ImagenPlatillo';
import { TarjetaPlatillo } from './TarjetaPlatillo';
import { montarMenu, nombresEnLista } from './utilesPrueba';
import { render } from '@testing-library/react';

const titulo = () => screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
/** La tarjeta de la lista por categorías (el Top 3 repite algunos platillos). */
const tarjeta = (nombre: string) => {
  const h = [...document.querySelectorAll('section[id^="categoria-"] h3')].find((x) => x.textContent === nombre);
  if (!h) throw new Error(`No hay «${nombre}» en la lista`);
  return h.closest('section')!;
};

describe('menú: lo que se ve', () => {
  it('mientras carga muestra un esqueleto con aviso para lectores de pantalla', () => {
    const { sim } = montarMenu();
    const soltar = sim.retener();
    expect(screen.getByRole('status')).toHaveTextContent('Preparando el menú…');
    soltar();
  });

  // @ac AC-04.2
  it('cada platillo muestra nombre, descripción, precio y foto', async () => {
    montarMenu();
    await titulo();
    const guacamole = tarjeta('Guacamole de la casa');
    expect(within(guacamole).getByText('Aguacate, chile serrano, totopos de maíz azul')).toBeInTheDocument();
    expect(within(guacamole).getByText('$145.00')).toBeInTheDocument();
    const foto = guacamole.querySelector('img')!;
    expect(foto).toHaveAttribute('src', expect.stringMatching(/^https:\/\/fotos\.carta\.example\//));
    expect(foto).toHaveAttribute('alt', '');
  });

  // @ac AC-04.2
  it('sin foto se ve la ilustración de la categoría, no un hueco ni un icono roto', async () => {
    montarMenu();
    await titulo();
    const hongos = tarjeta('Hongos al ajillo');
    expect(hongos.querySelector('img')).toBeNull();
    expect(hongos.querySelector('svg[data-clave="vegetariano"]')).not.toBeNull();
    expect(within(hongos).getByText('$190.00')).toBeInTheDocument();
  });

  // @ac AC-04.2
  it('si la foto no carga, cae a la ilustración', async () => {
    montarMenu();
    await titulo();
    const guacamole = tarjeta('Guacamole de la casa');
    fireEvent.error(guacamole.querySelector('img')!);
    expect(guacamole.querySelector('img')).toBeNull();
    expect(guacamole.querySelector('svg')).not.toBeNull();
  });

  it('sólo se piden fotos https o del propio origen', () => {
    expect(urlDeFotoSegura('https://r2.example/a.jpg')).toBe('https://r2.example/a.jpg');
    expect(urlDeFotoSegura('/almacen/a.jpg')).toBe('/almacen/a.jpg');
    for (const mala of ['http://x/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil/a.jpg', '', null, undefined]) {
      expect(urlDeFotoSegura(mala)).toBeNull();
    }
    const platillo = { ...crearMenuSemilla().categorias[0]!.platillos[0]!, foto_thumb_url: 'javascript:alert(1)' };
    const { container } = render(<ImagenPlatillo platillo={platillo} proporcion="cuadrada" />);
    expect(container.querySelector('img')).toBeNull();
  });

  // @ac AC-04.3
  it('con más de 20 platillos todas las imágenes cargan de forma diferida y con el tamaño reservado', async () => {
    const { sim } = montarMenu();
    const menu = sim.menu;
    await titulo();
    expect(nombresEnLista().length).toBeGreaterThan(20);
    expect(menu.categorias.flatMap((c) => c.platillos).length).toBeGreaterThan(20);
    const fotos = [...document.querySelectorAll('img')];
    expect(fotos.length).toBeGreaterThan(10);
    for (const foto of fotos) {
      expect(foto).toHaveAttribute('loading', 'lazy');
      expect(foto).toHaveAttribute('decoding', 'async');
      expect(foto).toHaveAttribute('width');
      expect(foto).toHaveAttribute('height');
    }
  });

  // @ac AC-04.3
  it('una lista de 200 platillos se pinta de una vez y las categorías se pintan bajo demanda', async () => {
    montarMenu({ menu: crearMenuGrande(200) });
    await screen.findByRole('heading', { name: 'Restaurante grande', level: 1 });
    expect(nombresEnLista()).toHaveLength(200);
    expect(document.querySelectorAll('img[loading="lazy"]')).toHaveLength(100);
    expect(document.querySelectorAll('section[id^="categoria-"]')).toHaveLength(10);
  });

  it('el Top 3 del chef muestra los destacados del servidor, en su orden', async () => {
    montarMenu();
    await titulo();
    const top = screen.getByRole('region', { name: 'Top 3 del chef' });
    expect(within(top).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Guacamole de la casa', 'Cochinita pibil', 'Flan de cajeta']);
  });

  it('sin destacados no hay Top 3', async () => {
    const menu = crearMenuSemilla();
    menu.destacados = [];
    montarMenu({ menu });
    await titulo();
    expect(screen.queryByRole('heading', { name: 'Top 3 del chef' })).toBeNull();
  });

  it('un destacado que ya no existe en el menú se ignora', async () => {
    const menu = crearMenuSemilla();
    menu.destacados = ['00000000-0000-4000-8000-00000000dead', menu.destacados[0]!];
    montarMenu({ menu });
    await titulo();
    expect(within(screen.getByRole('region', { name: 'Top 3 del chef' })).getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });

  it('las categorías van por orden y los chips llevan a su sección', async () => {
    const { u } = montarMenu();
    await titulo();
    const desplazar = vi.fn();
    Element.prototype.scrollIntoView = desplazar;
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Top 3 del chef', 'Para empezar', 'Platos fuertes', 'Postres', 'Bebidas']);
    await u.click(within(screen.getByRole('navigation', { name: 'Categorías' })).getByRole('button', { name: 'Postres' }));
    expect(desplazar).toHaveBeenCalledTimes(1);
  });

  it('los precios, en pesos con DM Sans: «$1,250.50»', () => {
    const base = crearMenuSemilla().categorias[0]!.platillos[0]!;
    render(<TarjetaPlatillo platillo={{ ...base, precio: 1250.5 }} />);
    expect(screen.getByText('$1,250.50')).toBeInTheDocument();
  });
});

describe('menú: platillo agotado', () => {
  // @ac AC-04.2
  it('se ve atenuado con «Agotado hoy» y no se puede abrir', async () => {
    const abrir = vi.fn();
    const { u } = montarMenu({ props: { onAbrir: abrir } });
    await titulo();
    const agotado = tarjeta('Pescado a la veracruzana');
    expect(within(agotado).getByText('Agotado hoy')).toBeInTheDocument();
    expect(within(agotado).getByText('$340.00')).toBeInTheDocument();
    expect(agotado).not.toHaveAttribute('role', 'button');
    await u.click(agotado);
    expect(abrir).not.toHaveBeenCalled();
  });

  it('un platillo disponible se abre con su id, por clic y por teclado (T-2.6 lo conectará)', async () => {
    const abrir = vi.fn();
    const { u, sim } = montarMenu({ props: { onAbrir: abrir } });
    const menu = sim.menu;
    await titulo();
    const guacamole = menu.categorias[0]!.platillos[0]!;
    const boton = screen.getAllByRole('button', { name: 'Ver Guacamole de la casa' })[0]!;
    await u.click(boton);
    boton.focus();
    await u.keyboard('{Enter}');
    expect(abrir).toHaveBeenNthCalledWith(1, guacamole.id);
    expect(abrir).toHaveBeenCalledTimes(2);
  });

  it('sin onAbrir las tarjetas son sólo lectura y no hay botón de agregar', async () => {
    montarMenu();
    await titulo();
    expect(screen.queryAllByRole('button', { name: /^Ver / })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /agregar|pedir|añadir/i })).toBeNull();
  });
});

describe('menú: fallos', () => {
  it('un 429 explica la espera con la pantalla de siempre y reintenta', async () => {
    const { u, sim } = montarMenu({ error: errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 3) });
    expect(await screen.findByRole('heading', { name: 'Vamos un poco rápido' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar (3 s)' })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled(), { timeout: 4500 });
    await u.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(sim.llamadas).toHaveLength(2);
  }, 10_000);

  it('sin conexión y error del servidor tienen su pantalla', async () => {
    const a = montarMenu({ error: errorSimulado(0, 'SIN_RED') });
    expect(await screen.findByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument();
    a.unmount();
    montarMenu({ error: errorSimulado(500, 'ERROR_INTERNO') });
    expect(await screen.findByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument();
  });

  it('un menú sin platillos lo dice', async () => {
    const menu = crearMenuSemilla();
    menu.categorias = [];
    menu.destacados = [];
    montarMenu({ menu });
    await titulo();
    expect(screen.getByText(/todavía no tiene platillos/)).toBeInTheDocument();
  });

  it('desmontar a mitad de la carga no pinta nada ni falla', async () => {
    const { sim, unmount } = montarMenu();
    const soltar = sim.retener();
    unmount();
    await act(async () => soltar());
  });
});

describe('menú: analítica sin texto libre', () => {
  it('menu_view una sola vez por carga', async () => {
    const { cola } = montarMenu();
    await titulo();
    expect(cola.registrar.mock.calls).toEqual([['menu_view']]);
  });

  it('una búsqueda asentada manda «search» sin el término; mientras se teclea no manda nada', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { cola, u } = montarMenu();
      await titulo();
      await waitFor(() => expect(cola.registrar).toHaveBeenCalledWith('menu_view'));
      cola.registrar.mockClear();
      const campo = screen.getByRole('searchbox', { name: 'Buscar en el menú' });
      await u.type(campo, 'pastor');
      expect(cola.registrar).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(900);
      });
      expect(cola.registrar.mock.calls).toEqual([['search']]);
      expect(JSON.stringify(cola.registrar.mock.calls)).not.toContain('pastor');
      // Una sola letra no es una búsqueda.
      await u.clear(campo);
      await u.type(campo, 'a');
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(cola.registrar).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('filter se manda al aplicar, no al marcar, y sin decir cuál', async () => {
    const { u, cola } = montarMenu();
    await titulo();
    cola.registrar.mockClear();
    await u.click(screen.getByRole('button', { name: 'Filtros' }));
    await u.click(screen.getByRole('button', { name: 'Huevo' }));
    expect(cola.registrar).not.toHaveBeenCalled();
    await u.click(screen.getByRole('button', { name: /^Ver \d+ platillos$/ }));
    expect(cola.registrar.mock.calls).toEqual([['filter']]);
    // Aplicar lo mismo otra vez no es un filtro nuevo.
    await u.click(screen.getByRole('button', { name: 'Filtros, 1 activos' }));
    await u.click(screen.getByRole('button', { name: /^Ver \d+ platillos$/ }));
    expect(cola.registrar).toHaveBeenCalledTimes(1);
  });
});
