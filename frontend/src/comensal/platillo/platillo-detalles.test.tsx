/** Datos opcionales del detalle, la tarjeta que se abrió, un solo dish_view por minuto y rutas con caracteres de control. */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../App';
import { crearColaAnalitica, VENTANA_DISH_VIEW_MS } from '../analitica/cola';
import { tarjetaAbierta } from '../menu/posicion';
import { asentar, espiarDesplazamiento, idDe, montarSesion, rutaMenu, rutaPlatillo } from './utilesPrueba';

let desplazamiento: ReturnType<typeof espiarDesplazamiento>;
beforeEach(() => {
  window.localStorage.clear();
  desplazamiento = espiarDesplazamiento();
});
afterEach(() => {
  desplazamiento.restaurar();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

const capa = () => document.querySelector('.capa') as HTMLElement;

describe('detalle: datos opcionales', () => {
  async function ver(nombre: string, ajustes: Record<string, unknown> = {}) {
    const id = idDe(nombre);
    const { detalle } = montarSesion(rutaPlatillo(id), { platillo: { ajustes: { [id]: ajustes } } });
    await screen.findByRole('heading', { name: nombre, level: 1 });
    // Lo que cambian los ajustes sólo llega con la respuesta del detalle: se espera a que se aplique.
    await waitFor(() => expect(detalle.llamadas).toHaveLength(1));
    await asentar(10);
  }

  it('una descripción vacía no deja un párrafo vacío', async () => {
    await ver('Tacos de pastor', { descripcion: '' });
    expect([...capa().querySelectorAll('p')].filter((p) => p.textContent === '')).toHaveLength(0);
    expect(capa().querySelector('.descripcion')).toBeNull();
  });

  it('sin picante y con calorías: sólo las calorías', async () => {
    await ver('Tacos de pastor', { nivel_picante: 0, calorias: 320 });
    expect(capa()).toHaveTextContent('320 kcal');
    expect(capa()).not.toHaveTextContent(/Picante \d/);
  });

  it('con picante y sin calorías: sólo el picante, sin «kcal»', async () => {
    await ver('Tacos de pastor', { nivel_picante: 3, calorias: null });
    expect(capa()).toHaveTextContent('Picante 3 de 5');
    expect(capa()).not.toHaveTextContent('kcal');
    expect(capa().querySelectorAll('.puntoActivo')).toHaveLength(3);
  });

  it('el picante tiene tope de 5 y nunca baja de 0', async () => {
    await ver('Tacos de pastor', { nivel_picante: 9 });
    expect(capa()).toHaveTextContent('Picante 5 de 5');
    expect(capa().querySelectorAll('.puntoActivo')).toHaveLength(5);
  });

  it('un platillo que no es de tipo foto pinta la ilustración aunque traiga foto_detalle_url', async () => {
    await ver('Tacos de pastor', { imagen_tipo: 'ilustracion_categoria', ilustracion_clave: 'tacos', foto_detalle_url: 'https://fotos.carta.example/la-ceiba/11.jpg' });
    expect(capa().querySelector('img')).toBeNull();
    expect(capa().querySelector('svg[data-clave]')).not.toBeNull();
  });

  it('la foto lleva data-agotado según el platillo', async () => {
    await ver('Pescado a la veracruzana');
    expect(capa().querySelector('[data-con-foto]')).toHaveAttribute('data-agotado', 'si');
  });

  it('un platillo disponible no atenúa su foto', async () => {
    await ver('Tacos de pastor');
    expect(capa().querySelector('[data-con-foto]')).toHaveAttribute('data-agotado', 'no');
  });
});

describe('tarjetaAbierta: qué copia del platillo se tocó', () => {
  function montar(rects: Record<string, { top: number; bottom: number }>) {
    document.body.innerHTML = '';
    const copias = Object.keys(rects).map((nombre) => {
      const el = document.createElement('div');
      el.dataset.platillo = 'p1';
      el.tabIndex = 0;
      el.id = nombre;
      document.body.append(el);
      return el;
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const r = rects[this.id] ?? { top: 0, bottom: 0 };
      return { ...r, left: 0, right: 0, width: 0, height: r.bottom - r.top, x: 0, y: r.top, toJSON: () => ({}) };
    });
    return copias;
  }

  it('la enfocada gana, aunque otra copia esté más a la vista', () => {
    const [arriba, abajo] = montar({ arriba: { top: 100, bottom: 220 }, abajo: { top: 5000, bottom: 5120 } });
    abajo!.focus();
    expect(tarjetaAbierta('p1')).toBe(abajo);
    arriba!.focus();
    expect(tarjetaAbierta('p1')).toBe(arriba);
  });

  it('sin foco, gana la que más se ve en la ventana', () => {
    const [, abajo] = montar({ arriba: { top: -900, bottom: -780 }, abajo: { top: 200, bottom: 320 } });
    expect(tarjetaAbierta('p1')).toBe(abajo);
  });

  it('lo que cuenta es lo que cabe en la ventana: una copia enorme que se sale no le gana a una completa', () => {
    // innerHeight de jsdom = 768: la primera enseña 68 px (700→768) aunque mida 600; la segunda, 100.
    const [, completa] = montar({ grande: { top: 700, bottom: 1300 }, completa: { top: 0, bottom: 100 } });
    expect(tarjetaAbierta('p1')).toBe(completa);
  });

  it('un id que no está en la página no da tarjeta', () => {
    montar({ a: { top: 0, bottom: 10 } });
    expect(tarjetaAbierta('otro')).toBeNull();
  });
});

describe('dish_view: como mucho uno por platillo y minuto en la pestaña', () => {
  it('abrir A, volver, adelante, volver… cinco veces cuenta un solo dish_view de A (cola real)', async () => {
    const enviar = vi.fn(async () => undefined);
    const cola = crearColaAnalitica({ enviar, intervaloMs: 3_600_000, documento: undefined, ventana: undefined });
    const { u } = montarSesion(rutaMenu, { analitica: cola });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.click(screen.getByRole('button', { name: 'Ver Tacos de pastor' }));
    await screen.findByRole('heading', { name: 'Tacos de pastor', level: 1 });
    for (let i = 0; i < 5; i += 1) {
      await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
      await waitFor(() => expect(screen.queryByRole('heading', { name: 'Tacos de pastor', level: 1 })).toBeNull());
      await u.click(screen.getByRole('button', { name: 'adelante del navegador' }));
      await screen.findByRole('heading', { name: 'Tacos de pastor', level: 1 });
      await asentar();
    }
    cola.vaciar();
    const eventos = (enviar.mock.calls as unknown as [{ tipo: string; platillo_id?: string }[]][]).flatMap(([lote]) => lote).filter((e) => e.tipo === 'dish_view');
    expect(eventos).toEqual([expect.objectContaining({ platillo_id: idDe('Tacos de pastor') })]);
    cola.detener();
  });

  it('en la cola: mismo platillo dentro del minuto no cuenta; otro platillo sí; pasado el minuto vuelve a contar', () => {
    let ahora = new Date('2026-11-11T20:00:00Z');
    const enviar = vi.fn(async () => undefined);
    const cola = crearColaAnalitica({ enviar, ahora: () => ahora, intervaloMs: 3_600_000, documento: undefined, ventana: undefined });
    cola.registrar('dish_view', 'a');
    cola.registrar('dish_view', 'a');
    cola.registrar('dish_view', 'b');
    ahora = new Date(ahora.getTime() + VENTANA_DISH_VIEW_MS - 1);
    cola.registrar('dish_view', 'a');
    ahora = new Date(ahora.getTime() + 1);
    cola.registrar('dish_view', 'a');
    cola.vaciar();
    const lote = (enviar.mock.calls[0] as unknown as [{ tipo: string; platillo_id?: string }[]])[0];
    expect(lote.map((e) => e.platillo_id)).toEqual(['a', 'b', 'a']);
    // Los demás tipos no se filtran.
    cola.registrar('menu_view');
    cola.registrar('menu_view');
    cola.vaciar();
    expect((enviar.mock.calls[1] as unknown as [unknown[]])[0]).toHaveLength(2);
    cola.detener();
  });
});

describe('rutas con caracteres de control codificados', () => {
  function abrir(ruta: string) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { codigo: 'MESA_NO_ENCONTRADA', mensaje: 'x', detalles: {}, request_id: 'r' } }), { status: 404, headers: { 'Content-Type': 'application/json' } })),
    );
    window.history.replaceState(null, '', ruta);
    return render(<App />);
  }

  for (const sufijo of ['%0A', '%0a', '%0D', '%00', '%1F', '%7F']) {
    it(`/m/<codigo>/menu${sufijo} cae en la misma pantalla que /m/<codigo>/menu, no en blanco`, async () => {
      abrir(`/m/Jx3k9QwLmN2pR7sT4vY8zA/menu${sufijo}`);
      expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/m/Jx3k9QwLmN2pR7sT4vY8zA/menu');
    });
  }

  it('/m/<codigo>/platillo/<uuid>%0A también, y una ruta desconocida con %0A cae en «no encontrada»', async () => {
    abrir(`/m/Jx3k9QwLmN2pR7sT4vY8zA/platillo/${idDe('Tacos de pastor')}%0A`);
    expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/m/Jx3k9QwLmN2pR7sT4vY8zA/platillo/${idDe('Tacos de pastor')}`);
  });

  it('la raíz con un carácter de control cae en la raíz; la búsqueda y el ancla se conservan', async () => {
    abrir('/xyz%0A?a=1#b');
    await act(async () => {});
    await waitFor(() => expect(window.location.pathname).toBe('/xyz'));
    expect(window.location.search).toBe('?a=1');
    expect(window.location.hash).toBe('#b');
    expect(document.body.textContent).not.toBe('');
  });

  it('un carácter de control en medio de la ruta también se quita; el del código de la mesa no se toca (sigue siendo «mesa inválida»)', async () => {
    abrir('/m/Jx3k9QwLmN2pR7sT4vY8zA/me%0Anu');
    expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/m/Jx3k9QwLmN2pR7sT4vY8zA/menu');
    cleanup();
    abrir('/m/Jx3k9QwLmN2pR7sT4vY8%0AzA/menu');
    expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/m/Jx3k9QwLmN2pR7sT4vY8%0AzA/menu');
  });

  it('una ruta limpia no se toca', async () => {
    abrir('/m/Jx3k9QwLmN2pR7sT4vY8zA/menu');
    expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/m/Jx3k9QwLmN2pR7sT4vY8zA/menu');
  });
});
