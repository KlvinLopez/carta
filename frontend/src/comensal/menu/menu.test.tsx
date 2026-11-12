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
    await waitFor(() => expect(guacamole.querySelector('img')).not.toBeNull());
    fireEvent.error(guacamole.querySelector('img')!);
    await waitFor(() => expect(guacamole.querySelector('img')).toBeNull());
    expect(guacamole.querySelector('svg')).not.toBeNull();
  });

  it('sólo se piden fotos https o del propio origen', () => {
    expect(urlDeFotoSegura('https://r2.example/a.jpg')).toBe('https://r2.example/a.jpg');
    expect(urlDeFotoSegura('/almacen/a.jpg')).toBe('/almacen/a.jpg');
    for (const mala of ['http://x/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil/a.jpg', '/\\evil.example/x', '\\\\evil', '/api/v1/p/sesion', 'https://u:p@x/a.jpg', '', null, undefined]) {
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
    const eager = fotos.filter((f) => f.getAttribute('loading') === 'eager');
    // Sólo las de la primera pantalla (ver la prueba de prioridad): el resto es perezoso.
    expect(eager.length).toBeGreaterThan(0);
    expect(eager.length).toBeLessThanOrEqual(4);
    for (const foto of fotos.filter((f) => !eager.includes(f))) {
      expect(foto).toHaveAttribute('loading', 'lazy');
    }
    for (const foto of fotos) {
      expect(foto).toHaveAttribute('decoding', 'async');
      expect(foto).toHaveAttribute('width');
      expect(foto).toHaveAttribute('height');
    }
  });

  const conPrioridad = () => [...document.querySelectorAll('img[fetchpriority]')];
  const eagers = () => [...document.querySelectorAll('img[loading="eager"]')];

  it('con el «Top 3» a la vista sólo sus fotos llevan prioridad alta y carga inmediata; la lista, ninguna', async () => {
    montarMenu();
    await titulo();
    const enTop = [...screen.getByRole('region', { name: 'Top 3 del chef' }).querySelectorAll('img')];
    expect(enTop.length).toBeGreaterThan(0);
    for (const f of enTop) {
      expect(f).toHaveAttribute('loading', 'eager');
      expect(f).toHaveAttribute('fetchpriority', 'high');
    }
    const enLista = [...document.querySelectorAll('section[id^="categoria-"] img')];
    expect(enLista.length).toBeGreaterThan(0);
    for (const f of enLista) {
      expect(f).toHaveAttribute('loading', 'lazy');
      expect(f).not.toHaveAttribute('fetchpriority');
    }
    expect(conPrioridad()).toHaveLength(enTop.length);
  });

  it('con una búsqueda activa (sin «Top 3») sólo la primera foto visible lleva prioridad; ningún otro img', async () => {
    const { u } = montarMenu({ menu: crearMenuGrande(40) });
    await screen.findByRole('heading', { name: 'Restaurante grande', level: 1 });
    await u.type(screen.getByRole('searchbox', { name: 'Buscar en el menú' }), 'Platillo 1');
    await waitFor(() => expect(nombresEnLista()[0]).toBe('Platillo 1'));
    expect(eagers()).toHaveLength(1);
    expect(conPrioridad()).toHaveLength(1);
    expect(conPrioridad()[0]).toBe(eagers()[0]);
    expect(conPrioridad()[0]).toBe(document.querySelector('section[id^="categoria-"] img'));
  });

  it('sin «Top 3» (carta sin destacados) la primera foto va con prioridad si está entre las primeras 4 tarjetas', async () => {
    montarMenu({ menu: crearMenuGrande(40) });
    await screen.findByRole('heading', { name: 'Restaurante grande', level: 1 });
    expect(screen.queryByRole('region', { name: 'Top 3 del chef' })).toBeNull();
    expect(conPrioridad()).toHaveLength(1);
    expect(conPrioridad()[0]).toBe(document.querySelector('section[id^="categoria-"] img'));
  });

  it('una primera foto lejos del pliegue (la 5.ª tarjeta o más) no lleva prioridad: ninguna en la lista', async () => {
    const menu = crearMenuGrande(40);
    // Las cuatro primeras tarjetas sin foto (ilustración); la primera foto cae en la 5.ª.
    for (const p of menu.categorias[0]!.platillos.slice(0, 4)) Object.assign(p, { imagen_tipo: 'ilustracion', foto_thumb_url: null, foto_url: null });
    montarMenu({ menu });
    await screen.findByRole('heading', { name: 'Restaurante grande', level: 1 });
    expect(document.querySelectorAll('section[id^="categoria-"] img').length).toBeGreaterThan(0);
    expect(conPrioridad()).toHaveLength(0);
    expect(eagers()).toHaveLength(0);
  });

  it('una primera foto en una categoría lejana (las primeras tarjetas sin foto) tampoco lleva prioridad', async () => {
    const menu = crearMenuGrande(60);
    for (const p of menu.categorias[0]!.platillos) Object.assign(p, { imagen_tipo: 'ilustracion', foto_thumb_url: null, foto_url: null });
    montarMenu({ menu });
    await screen.findByRole('heading', { name: 'Restaurante grande', level: 1 });
    expect(conPrioridad()).toHaveLength(0);
  });

  it('si la foto con prioridad falla pasa a ilustración y no queda ningún img con fetchpriority huérfano', async () => {
    montarMenu({ menu: crearMenuGrande(40) });
    await screen.findByRole('heading', { name: 'Restaurante grande', level: 1 });
    const foto = conPrioridad()[0] as HTMLImageElement;
    expect(foto).toBeDefined();
    fireEvent.error(foto);
    await waitFor(() => expect(foto.isConnected).toBe(false));
    expect(conPrioridad()).toHaveLength(0);
  });

  it('una carta sin ninguna foto no pone ningún img ni prioridad', async () => {
    const menu = crearMenuGrande(40);
    for (const c of menu.categorias) for (const p of c.platillos) Object.assign(p, { imagen_tipo: 'ilustracion', foto_thumb_url: null, foto_url: null });
    montarMenu({ menu });
    await screen.findByRole('heading', { name: 'Restaurante grande', level: 1 });
    expect(document.querySelectorAll('img')).toHaveLength(0);
    expect(conPrioridad()).toHaveLength(0);
  });

  // @ac AC-04.3
  it('una lista de 200 platillos se pinta de una vez y las categorías se pintan bajo demanda', async () => {
    montarMenu({ menu: crearMenuGrande(200) });
    await screen.findByRole('heading', { name: 'Restaurante grande', level: 1 });
    expect(nombresEnLista()).toHaveLength(200);
    // La primera tarjeta con foto es de la primera pantalla (eager); las demás, perezosas.
    expect(document.querySelectorAll('img[loading="lazy"]')).toHaveLength(99);
    expect(document.querySelectorAll('img[loading="eager"]')).toHaveLength(1);
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

describe('menú: tarjeta', () => {
  it('muestra las etiquetas como chips y los alérgenos como «Contiene: …»', async () => {
    montarMenu();
    await titulo();
    const chiles = tarjeta('Chiles rellenos de queso');
    expect(within(chiles).getByText('Picante')).toBeInTheDocument();
    expect(within(chiles).getByText('Contiene: Lácteos, Gluten, Huevo')).toBeInTheDocument();
    expect(within(tarjeta('Guacamole de la casa')).queryByText(/^Contiene:/)).toBeNull();
    expect(within(tarjeta('Guacamole de la casa')).getByText('Vegetariano')).toBeInTheDocument();
  });

  it('una foto sólo se usa si imagen_tipo es foto; si no, la ilustración aunque haya URL', () => {
    const base = crearMenuSemilla().categorias[0]!.platillos[0]!;
    const { container } = render(<ImagenPlatillo platillo={{ ...base, imagen_tipo: 'ilustracion_categoria', ilustracion_clave: 'tacos' }} proporcion="cuadrada" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg[data-clave="tacos"]')).not.toBeNull();
  });

  it('las fotos no mandan Referer, y una foto rota se reintenta si cambia la URL', async () => {
    const base = crearMenuSemilla().categorias[0]!.platillos[0]!;
    const { container, rerender } = render(<ImagenPlatillo platillo={base} proporcion="cuadrada" />);
    const foto = container.querySelector('img')!;
    expect(foto).toHaveAttribute('referrerpolicy', 'no-referrer');
    fireEvent.error(foto);
    await waitFor(() => expect(container.querySelector('img')).toBeNull());
    rerender(<ImagenPlatillo platillo={{ ...base, foto_thumb_url: 'https://fotos.carta.example/otra.jpg' }} proporcion="cuadrada" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://fotos.carta.example/otra.jpg');
  });
});

describe('menú: platillo agotado', () => {
  // @ac AC-04.2
  it('se ve atenuado con «Agotado hoy» y no se puede abrir; uno disponible, sí (control positivo)', async () => {
    const abrir = vi.fn();
    const { u } = montarMenu({ props: { onAbrir: abrir } });
    await titulo();
    expect(screen.queryByRole('button', { name: 'Ver Pescado a la veracruzana' })).toBeNull();
    const agotado = tarjeta('Pescado a la veracruzana').querySelector('[data-agotado]')!;
    expect(agotado).toHaveAttribute('data-agotado', 'si');
    expect(within(agotado as HTMLElement).getByText('Agotado hoy')).toBeInTheDocument();
    expect(within(agotado as HTMLElement).getByText('$340.00')).toBeInTheDocument();
    await u.click(agotado);
    expect(abrir).not.toHaveBeenCalled();
    // Control positivo: el mismo clic sobre uno disponible sí abre.
    const disponible = tarjeta('Cochinita pibil').querySelector('[data-agotado]')!;
    expect(disponible).toHaveAttribute('data-agotado', 'no');
    expect(screen.getAllByRole('button', { name: 'Ver Cochinita pibil' }).length).toBeGreaterThan(0);
    await u.click(disponible);
    expect(abrir).toHaveBeenCalledTimes(1);
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
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { sim } = montarMenu({ error: errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 3) });
      expect(await screen.findByRole('heading', { name: 'Vamos un poco rápido' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reintentar (3 s)' })).toBeDisabled();
      for (let i = 0; i < 3; i += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
      }
      const boton = screen.getByRole('button', { name: 'Reintentar' });
      expect(boton).toBeEnabled();
      fireEvent.click(boton);
      await waitFor(() => expect(sim.llamadas).toHaveLength(2));
    } finally {
      vi.useRealTimers();
    }
  });

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

  it('desmontar a mitad de la carga aborta la petición y soltar la respuesta después no escribe nada', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { sim, unmount } = montarMenu();
    const soltar = sim.retener();
    await waitFor(() => expect(sim.llamadas).toHaveLength(1));
    const senal = sim.senales[0]!;
    expect(senal.aborted).toBe(false);
    unmount();
    expect(senal.aborted).toBe(true);
    await act(async () => soltar());
    expect(consola).not.toHaveBeenCalled();
    consola.mockRestore();
  });
});

describe('menú: analítica sin texto libre', () => {
  it('menu_view una sola vez por carga', async () => {
    const { cola } = montarMenu();
    await titulo();
    await waitFor(() => expect(cola.registrar).toHaveBeenCalledWith('menu_view'));
    expect(cola.registrar.mock.calls).toEqual([['menu_view']]);
  });

  it('una búsqueda asentada manda «search» a los 800 ms exactos, sin el término; una letra no es una búsqueda', async () => {
    const { cola } = montarMenu();
    await titulo();
    await waitFor(() => expect(cola.registrar).toHaveBeenCalledWith('menu_view'));
    cola.registrar.mockClear();
    // Los temporizadores falsos se activan después de montar: waitFor no avanza el reloj de vitest.
    vi.useFakeTimers();
    try {
      const campo = screen.getByRole('searchbox', { name: 'Buscar en el menú' });
      fireEvent.change(campo, { target: { value: 'pastor' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(799);
      });
      expect(cola.registrar).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(cola.registrar.mock.calls).toEqual([['search']]);
      expect(JSON.stringify(cola.registrar.mock.calls)).not.toContain('pastor');
      // Seguir tecleando reinicia la espera: sólo cuenta la búsqueda asentada.
      fireEvent.change(campo, { target: { value: 'pastor c' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      fireEvent.change(campo, { target: { value: 'pastor ce' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(799);
      });
      expect(cola.registrar).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(cola.registrar).toHaveBeenCalledTimes(2);
      // Una sola letra no es una búsqueda.
      fireEvent.change(campo, { target: { value: 'a' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(cola.registrar).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('filter se manda al aplicar, no al marcar, y sin decir cuál', async () => {
    const { u, cola } = montarMenu();
    await titulo();
    await waitFor(() => expect(cola.registrar).toHaveBeenCalledWith('menu_view'));
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
