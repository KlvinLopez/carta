import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cumpleFiltros, CLAVE_FILTROS, almacenFiltrosLocal, leerFiltros, mismosFiltros, nombreDeClave } from './filtros';
import { crearMenuSemilla } from '../../mocks/servicioMenuComensalSimulado';
import { montarMenu, nombresEnLista } from './utilesPrueba';

const AVISO = /La información de alérgenos la declara el restaurante y no sustituye preguntar al personal/;
const nombres = nombresEnLista;

async function abrirHoja(u: ReturnType<typeof montarMenu>['u']) {
  await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
  await u.click(screen.getByRole('button', { name: /^Filtros/ }));
  return screen.getByRole('dialog', { name: 'Filtrar el menú' });
}

describe('filtros: lógica', () => {
  const lacteo = { alergenos: ['lacteos'], etiquetas: ['vegetariano'] };
  it('un alérgeno elegido oculta lo que lo contiene; una etiqueta exige tenerla', () => {
    expect(cumpleFiltros(lacteo, { alergenos: ['lacteos'], etiquetas: [] })).toBe(false);
    expect(cumpleFiltros(lacteo, { alergenos: ['gluten'], etiquetas: [] })).toBe(true);
    expect(cumpleFiltros(lacteo, { alergenos: [], etiquetas: ['vegano'] })).toBe(false);
    expect(cumpleFiltros(lacteo, { alergenos: [], etiquetas: ['vegetariano'] })).toBe(true);
    expect(cumpleFiltros(lacteo, { alergenos: [], etiquetas: [] })).toBe(true);
  });

  it('lo guardado se revisa: JSON roto, forma rara o claves raras no pasan', () => {
    expect(leerFiltros(null)).toEqual({ alergenos: [], etiquetas: [] });
    expect(leerFiltros('no es json')).toEqual({ alergenos: [], etiquetas: [] });
    expect(leerFiltros('[1,2]')).toEqual({ alergenos: [], etiquetas: [] });
    expect(leerFiltros(JSON.stringify({ alergenos: ['lacteos', '<img onerror=x>', 5, 'lacteos'], etiquetas: 'vegano' }))).toEqual({
      alergenos: ['lacteos'],
      etiquetas: [],
    });
  });

  it('el tope por lista es de 30 claves y la clave de almacenamiento es carta:filtros:v1', () => {
    const muchas = Array.from({ length: 40 }, (_, i) => `a${i}`);
    expect(leerFiltros(JSON.stringify({ alergenos: muchas, etiquetas: muchas })).alergenos).toHaveLength(30);
    expect(CLAVE_FILTROS).toBe('carta:filtros:v1');
  });

  it('compara selecciones sin importar el orden y nombra las claves', () => {
    expect(mismosFiltros({ alergenos: ['a', 'b'], etiquetas: [] }, { alergenos: ['b', 'a'], etiquetas: [] })).toBe(true);
    expect(mismosFiltros({ alergenos: ['a'], etiquetas: [] }, { alergenos: [], etiquetas: [] })).toBe(false);
    expect(nombreDeClave('sin_gluten')).toBe('Sin gluten');
    expect(nombreDeClave('hoja_santa')).toBe('Hoja santa');
    expect(typeof nombreDeClave('__proto__')).toBe('string');
  });
});

describe('filtros: pantalla', () => {
  // @ac AC-05.1
  it('ofrece los alérgenos mínimos (nueces, lácteos, gluten, huevo, mariscos) y las etiquetas (vegetariano, vegano, picante)', async () => {
    const { u } = montarMenu();
    const hoja = await abrirHoja(u);
    for (const nombre of ['Nueces y frutos secos', 'Lácteos', 'Gluten', 'Huevo', 'Mariscos']) {
      expect(within(hoja).getByRole('button', { name: nombre })).toBeInTheDocument();
    }
    for (const nombre of ['Vegetariano', 'Vegano', 'Picante']) {
      expect(within(hoja).getByRole('button', { name: nombre })).toBeInTheDocument();
    }
  });

  // @ac AC-05.1
  it('la lista mínima no depende de lo que traiga el menú: un menú sin alérgenos ni etiquetas ofrece los mínimos', async () => {
    const uno = crearMenuSemilla();
    const p = uno.categorias[0]!.platillos[0]!;
    uno.categorias = [{ ...uno.categorias[0]!, platillos: [{ ...p, alergenos: [], etiquetas: [] }] }];
    uno.destacados = [];
    const { u } = montarMenu({ menu: uno });
    const hoja = await abrirHoja(u);
    for (const nombre of ['Nueces y frutos secos', 'Lácteos', 'Gluten', 'Huevo', 'Mariscos', 'Vegetariano', 'Vegano', 'Picante']) {
      expect(within(hoja).getByRole('button', { name: nombre })).toBeInTheDocument();
    }
  });

  // @ac AC-05.1
  it('suma los alérgenos que trae el menú y no están en la lista base', async () => {
    const { u } = montarMenu();
    const hoja = await abrirHoja(u);
    expect(within(hoja).getByRole('button', { name: 'Ajonjolí' })).toBeInTheDocument();
  });

  // @ac AC-05.2
  it('un filtro de alérgeno oculta los platillos que lo contienen y muestra el conteo', async () => {
    const { u } = montarMenu();
    const hoja = await abrirHoja(u);
    const total = nombres().length;
    expect(nombres()).toContain('Sopa de tortilla');
    await u.click(within(hoja).getByRole('button', { name: 'Lácteos' }));
    await u.click(within(hoja).getByRole('button', { name: /^Ver \d+ platillos$/ }));
    expect(nombres()).not.toContain('Sopa de tortilla');
    expect(nombres()).not.toContain('Flan de cajeta');
    expect(nombres()).toContain('Guacamole de la casa');
    expect(screen.getByRole('status')).toHaveTextContent(`${nombres().length} platillos`);
    expect(nombres().length).toBeLessThan(total);
  });

  // @ac AC-05.2
  it('el botón de la hoja cuenta lo que quedaría antes de aplicar', async () => {
    const { u } = montarMenu();
    const hoja = await abrirHoja(u);
    const total = nombres().length;
    expect(within(hoja).getByRole('button', { name: `Ver ${total} platillos` })).toBeInTheDocument();
    await u.click(within(hoja).getByRole('button', { name: 'Vegano' }));
    const quedan = within(hoja).getByRole('button', { name: /^Ver \d+ platillos$/ });
    expect(quedan).not.toHaveTextContent(`Ver ${total} platillos`);
    // Nada se aplicó todavía: la lista de atrás sigue completa.
    expect(nombres()).toHaveLength(total);
  });

  // @ac AC-05.2
  it('con un filtro activo el Top 3 se esconde y el platillo descartado no aparece en ninguna parte', async () => {
    montarMenu({ filtros: { alergenos: ['lacteos'], etiquetas: [] } });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    expect(screen.queryByRole('region', { name: 'Top 3 del chef' })).toBeNull();
    expect(screen.queryAllByRole('heading', { name: 'Flan de cajeta' })).toHaveLength(0);
    // Lo permitido aparece una sola vez (en su categoría), no repetido arriba.
    expect(screen.getAllByRole('heading', { name: 'Guacamole de la casa' })).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toBe(`${nombres().length} platillos`);
  });

  it('sin filtros ni búsqueda el Top 3 está; al quitar los filtros vuelve', async () => {
    const { u } = montarMenu({ filtros: { alergenos: [], etiquetas: ['vegano'] } });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    expect(screen.queryByRole('region', { name: 'Top 3 del chef' })).toBeNull();
    await u.click(screen.getByRole('button', { name: /^Filtros/ }));
    await u.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    await u.click(screen.getByRole('button', { name: /^Ver \d+ platillos$/ }));
    expect(screen.getByRole('region', { name: 'Top 3 del chef' })).toBeInTheDocument();
  });

  // @ac AC-05.2
  it('varias etiquetas se piden todas a la vez', async () => {
    const { u } = montarMenu();
    const hoja = await abrirHoja(u);
    await u.click(within(hoja).getByRole('button', { name: 'Vegano' }));
    await u.click(within(hoja).getByRole('button', { name: 'Sin gluten' }));
    await u.click(within(hoja).getByRole('button', { name: /^Ver \d+ platillos$/ }));
    expect(nombres().sort()).toEqual(['Agua de jamaica', 'Café de olla', 'Hongos al ajillo', 'Nieve de limón'].sort());
  });

  // @ac AC-05.2
  it('sin resultados se explica y se puede salir de ahí', async () => {
    const { u } = montarMenu();
    const hoja = await abrirHoja(u);
    for (const n of ['Gluten', 'Lácteos', 'Huevo', 'Pescado', 'Nueces y frutos secos']) {
      await u.click(within(hoja).getByRole('button', { name: n }));
    }
    await u.click(within(hoja).getByRole('button', { name: 'Vegetariano' }));
    await u.click(within(hoja).getByRole('button', { name: 'Picante' }));
    await u.click(within(hoja).getByRole('button', { name: /^Ver \d+ platillos$|^Ver 1 platillo$/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Sin resultados');
    await u.click(screen.getByRole('button', { name: 'Quitar búsqueda y filtros' }));
    expect(nombres().length).toBeGreaterThan(20);
  });

  // @ac AC-05.3
  it.each([
    ['al cargar', async () => undefined],
    [
      'con la hoja de filtros abierta',
      async (u: ReturnType<typeof montarMenu>['u']) => {
        await abrirHoja(u);
      },
    ],
    [
      'sin resultados',
      async (u: ReturnType<typeof montarMenu>['u']) => {
        await u.type(screen.getByRole('searchbox', { name: 'Buscar en el menú' }), 'sushi');
      },
    ],
  ])('el aviso de alérgenos sigue a la vista %s', async (_caso, accion) => {
    const { u } = montarMenu();
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await accion(u);
    expect(screen.getAllByText(AVISO).length).toBeGreaterThan(0);
    // No se puede cerrar: no hay control para ocultarlo.
    expect(screen.queryByRole('button', { name: /entendido|cerrar aviso|ocultar/i })).toBeNull();
  });
});

describe('filtros: viven en el teléfono', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  // @ac AC-05.1
  it('se guardan en localStorage al aplicar y se restauran en la visita siguiente', async () => {
    const primero = montarMenu({ props: { almacen: almacenFiltrosLocal } });
    const hoja = await abrirHoja(primero.u);
    await primero.u.click(within(hoja).getByRole('button', { name: 'Gluten' }));
    await primero.u.click(within(hoja).getByRole('button', { name: /^Ver \d+ platillos$/ }));
    expect(JSON.parse(window.localStorage.getItem(CLAVE_FILTROS)!)).toEqual({ alergenos: ['gluten'], etiquetas: [] });
    primero.unmount();

    montarMenu({ props: { almacen: almacenFiltrosLocal } });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    expect(screen.getByRole('button', { name: 'Filtros, 1 activos' })).toBeInTheDocument();
    expect(nombres()).not.toContain('Churros con chocolate');
  });

  // @ac AC-05.1
  it('quitar los filtros borra lo guardado', async () => {
    window.localStorage.setItem(CLAVE_FILTROS, JSON.stringify({ alergenos: ['gluten'], etiquetas: [] }));
    const { u } = montarMenu({ props: { almacen: almacenFiltrosLocal } });
    const hoja = await abrirHoja(u);
    await u.click(within(hoja).getByRole('button', { name: 'Quitar filtros' }));
    await u.click(within(hoja).getByRole('button', { name: /^Ver \d+ platillos$/ }));
    expect(window.localStorage.getItem(CLAVE_FILTROS)).toBeNull();
  });

  // @ac AC-05.1
  it('un localStorage bloqueado o roto no tumba la pantalla', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('lleno', 'QuotaExceededError');
    });
    const { u } = montarMenu({ props: { almacen: almacenFiltrosLocal } });
    const hoja = await abrirHoja(u);
    await u.click(within(hoja).getByRole('button', { name: 'Gluten' }));
    await act(async () => {
      await u.click(within(hoja).getByRole('button', { name: /^Ver \d+ platillos$/ }));
    });
    expect(nombres()).not.toContain('Churros con chocolate');
  });

  // @ac AC-05.1
  it('los filtros no viajan al servidor de ninguna forma: ni en una petición ni en un evento', async () => {
    const llamadas: [string, RequestInit | undefined][] = [];
    const buscar = vi.fn((url: string, init?: RequestInit) => {
      llamadas.push([url, init]);
      return Promise.resolve(new Response('{}', { status: 202 }));
    });
    vi.stubGlobal('fetch', buscar);
    const { u, cola } = montarMenu();
    const hoja = await abrirHoja(u);
    await u.click(within(hoja).getByRole('button', { name: 'Mariscos' }));
    await u.click(within(hoja).getByRole('button', { name: /^Ver \d+ platillos$/ }));
    expect(llamadas).toHaveLength(0);
    // El único rastro es «hubo un filtro»: sin cuál.
    expect(cola.registrar).toHaveBeenCalledWith('filter');
    expect(cola.registrar.mock.calls.flat().join(' ')).not.toMatch(/mariscos/i);
    vi.unstubAllGlobals();
  });

  // @ac AC-05.1
  it('las etiquetas guardadas se restauran y filtran solas, sin alérgenos', async () => {
    window.localStorage.setItem('carta:filtros:v1', JSON.stringify({ alergenos: [], etiquetas: ['vegano'] }));
    montarMenu({ props: { almacen: almacenFiltrosLocal } });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    expect(nombres().sort()).toEqual(['Agua de jamaica', 'Café de olla', 'Hongos al ajillo', 'Nieve de limón', 'Piña colada sin alcohol'].sort());
    expect(screen.getByRole('button', { name: 'Filtros, 1 activos' })).toBeInTheDocument();
  });

  // @ac AC-05.2
  it('una categoría sin resultados no se pinta, ni su chip', async () => {
    const { u } = montarMenu();
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.type(screen.getByRole('searchbox', { name: 'Buscar en el menú' }), 'flan');
    expect(screen.queryByRole('heading', { name: 'Bebidas', level: 2 })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Platos fuertes', level: 2 })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Postres', level: 2 })).toBeInTheDocument();
  });

  // @ac AC-05.1
  it('aplicar, «Quitar búsqueda y filtros» y reabrir la hoja: nada marcado y nada guardado', async () => {
    window.localStorage.clear();
    const { u } = montarMenu({ props: { almacen: almacenFiltrosLocal } });
    let hoja = await abrirHoja(u);
    await u.click(within(hoja).getByRole('button', { name: 'Lácteos' }));
    await u.click(within(hoja).getByRole('button', { name: 'Vegano' }));
    await u.click(within(hoja).getByRole('button', { name: /^Ver \d+ platillos?$/ }));
    expect(window.localStorage.getItem('carta:filtros:v1')).not.toBeNull();
    await u.type(screen.getByRole('searchbox', { name: 'Buscar en el menú' }), 'zzzz');
    await u.click(screen.getByRole('button', { name: 'Quitar búsqueda y filtros' }));
    expect(window.localStorage.getItem('carta:filtros:v1')).toBeNull();
    hoja = await abrirHoja(u);
    expect(within(hoja).queryAllByRole('button', { pressed: true })).toHaveLength(0);
  });

  it('guardar con un almacenamiento que lanza no rompe', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('lleno', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    expect(() => almacenFiltrosLocal.guardar({ alergenos: ['gluten'], etiquetas: [] })).not.toThrow();
    expect(() => almacenFiltrosLocal.guardar({ alergenos: [], etiquetas: [] })).not.toThrow();
  });

  it('un menú sin platillos no ofrece buscador ni filtros y no dice «sin resultados»', async () => {
    const vacio = crearMenuSemilla();
    vacio.categorias = [];
    vacio.destacados = [];
    montarMenu({ menu: vacio });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Filtros/ })).toBeNull();
    expect(screen.queryByText(/Sin resultados|No hay platillos con/)).toBeNull();
    expect(screen.getByText(/todavía no tiene platillos/)).toBeInTheDocument();
    // El aviso de alérgenos no depende de que haya platillos.
    expect(screen.getByText(AVISO)).toBeInTheDocument();
  });
});
