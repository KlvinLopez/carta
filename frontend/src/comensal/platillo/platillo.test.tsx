import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { crearServicioPlatilloSimulado } from '../../mocks/servicioPlatilloSimulado';
import { crearColaAnalitica } from '../analitica/cola';
import { analiticaFalsa } from '../menu/utilesPrueba';
import { PlatilloVista } from './Platillo';
import { atrasDelNavegador, dejarPasar, espiarDesplazamiento, idDe, montarSesion, rutaActual, rutaMenu, rutaPlatillo, vistas } from './utilesPrueba';

let desplazamiento: ReturnType<typeof espiarDesplazamiento>;
beforeEach(() => {
  window.localStorage.clear();
  desplazamiento = espiarDesplazamiento();
});
afterEach(() => {
  desplazamiento.restaurar();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const titulo = (nombre: string) => screen.findByRole('heading', { name: nombre, level: 1 });
/** Abre un platillo desde la lista del menú. */
async function abrirDesdeElMenu(u: ReturnType<typeof montarSesion>['u'], nombre: string) {
  await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
  await u.click(screen.getByRole('button', { name: `Ver ${nombre}`, hidden: false }));
}

describe('detalle: lo que se ve', () => {
  // @ac AC-04.2
  it('desde el menú pinta al instante lo que ya tenía y completa con el detalle del servidor', async () => {
    const { u, detalle, menu } = montarSesion(rutaMenu);
    const soltar = detalle.retener();
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.click(screen.getAllByRole('button', { name: 'Ver Cochinita pibil' })[0]!);
    // Con la respuesta del detalle retenida: nombre, descripción y precio ya están; sin esqueleto.
    expect(await titulo('Cochinita pibil')).toBeInTheDocument();
    expect(screen.getByText('Cerdo marinado en achiote, cebolla encurtida, tortillas hechas a mano')).toBeInTheDocument();
    expect(screen.getByText('$285.00')).toBeInTheDocument();
    expect(screen.queryByText('Preparando el platillo…')).toBeNull();
    expect(screen.getByText('Platos fuertes')).toBeInTheDocument(); // la categoría ya venía en el menú
    expect(rutaActual()).toBe(rutaPlatillo(idDe('Cochinita pibil')));
    soltar();
    await waitFor(() => expect(screen.getByText('Platos fuertes')).toBeInTheDocument());
    expect(detalle.llamadas).toEqual([{ id: idDe('Cochinita pibil') }]);
    expect(menu.llamadas).toHaveLength(1); // abrir el detalle no vuelve a pedir el menú
  });

  it('el foco va al título al abrir', async () => {
    const { u } = montarSesion(rutaMenu);
    await abrirDesdeElMenu(u, 'Tacos de pastor');
    const h1 = await titulo('Tacos de pastor');
    await waitFor(() => expect(h1).toHaveFocus());
  });

  // @ac AC-04.2
  it('muestra descripción, precio, alérgenos «Contiene: …», etiquetas, calorías y picante cuando existen', async () => {
    const id = idDe('Chiles rellenos de queso');
    montarSesion(rutaPlatillo(id), { platillo: { ajustes: { [id]: { calorias: 420 } } } });
    await titulo('Chiles rellenos de queso');
    expect(await screen.findByText('Contiene: Lácteos, Gluten, Huevo')).toBeInTheDocument();
    expect(screen.getByText('Picante')).toBeInTheDocument();
    expect(screen.getByText('420 kcal')).toBeInTheDocument();
    expect(screen.getByText('$130.00')).toBeInTheDocument();
    expect(screen.getByText('Jalapeño relleno de queso Oaxaca, capeado')).toBeInTheDocument();
  });

  it('sin picante ni calorías no pinta esas líneas, y sin alérgenos lo dice sin afirmar que no los tiene', async () => {
    montarSesion(rutaPlatillo(idDe('Cochinita pibil')));
    await titulo('Cochinita pibil');
    expect(screen.queryByText(/kcal/)).toBeNull();
    expect(screen.queryByText(/Picante/)).toBeNull();
    expect(screen.getByText('El restaurante no declaró alérgenos en este platillo.')).toBeInTheDocument();
    expect(screen.queryByText(/sin alérgenos/i)).toBeNull();
  });

  it('las etiquetas salen como chips legibles', async () => {
    montarSesion(rutaPlatillo(idDe('Hongos al ajillo')));
    await titulo('Hongos al ajillo');
    expect(screen.getByText('Vegano')).toBeInTheDocument();
    expect(screen.getByText('Sin gluten')).toBeInTheDocument();
  });

  // @ac AC-05.3
  it('el aviso de que el restaurante declara los alérgenos está siempre y no se puede cerrar', async () => {
    montarSesion(rutaPlatillo(idDe('Enchiladas verdes')));
    await titulo('Enchiladas verdes');
    expect(screen.getByText('La información de alérgenos la declara el restaurante y no sustituye preguntar al personal.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cerrar|entendido|ocultar/i })).toBeNull();
  });

  it('«Agregar a mi orden» está deshabilitado con «Pronto» y no hay cantidades ni notas', async () => {
    montarSesion(rutaPlatillo(idDe('Enchiladas verdes')));
    await titulo('Enchiladas verdes');
    const agregar = screen.getByRole('button', { name: /Agregar a mi orden/ });
    expect(agregar).toBeDisabled();
    expect(agregar).toHaveTextContent('Pronto');
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  // @ac AC-04.4
  it('un platillo agotado se puede ver por enlace directo: «Agotado hoy», sin botón de agregar', async () => {
    montarSesion(rutaPlatillo(idDe('Pescado a la veracruzana')));
    await titulo('Pescado a la veracruzana');
    expect(screen.getByText('Agotado hoy')).toBeInTheDocument();
    expect(screen.getByText('Hoy no se puede pedir este platillo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agregar a mi orden/ })).toBeNull();
  });

  it('sin estilos en línea (la CSP no los admite) y con la animación apagada si se pide menos movimiento', async () => {
    montarSesion(rutaPlatillo(idDe('Tacos de pastor')));
    await titulo('Tacos de pastor');
    expect(document.querySelectorAll('main [style]')).toHaveLength(0);
    const css = readFileSync(resolve(__dirname, 'Platillo.module.css'), 'utf8');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*{[^}]*\.contenido[^}]*animation: none/s);
    expect(css).not.toMatch(/\bborder:\s*1px/);
  });
});

describe('detalle: la foto', () => {
  it('con foto usa foto_detalle_url, sin referrer y con el tamaño reservado', async () => {
    montarSesion(rutaPlatillo(idDe('Tacos de pastor')));
    await titulo('Tacos de pastor');
    const foto = screen.getByRole('img', { name: 'Foto de Tacos de pastor' });
    expect(foto).toHaveAttribute('src', expect.stringMatching(/^https:\/\/fotos\.carta\.example\/la-ceiba\/11\.jpg$/));
    expect(foto).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(foto).toHaveAttribute('width', '800');
    expect(foto).toHaveAttribute('height', '600');
  });

  it('si la foto no carga, la ilustración de la categoría', async () => {
    montarSesion(rutaPlatillo(idDe('Tacos de pastor')));
    await titulo('Tacos de pastor');
    fireEvent.error(screen.getByRole('img', { name: 'Foto de Tacos de pastor' }));
    expect(screen.queryByRole('img', { name: /Foto de/ })).toBeNull();
    expect(document.querySelector('svg[data-clave]')).not.toBeNull();
  });

  it('sin foto, la ilustración que dice el servidor', async () => {
    montarSesion(rutaPlatillo(idDe('Churros con chocolate')));
    await titulo('Churros con chocolate');
    expect(screen.queryByRole('img', { name: /Foto de/ })).toBeNull();
    expect(document.querySelector('svg[data-clave="postres"]')).not.toBeNull();
  });

  it('una URL que no es segura nunca se pide: se pinta la ilustración', async () => {
    const id = idDe('Tacos de pastor');
    montarSesion(rutaPlatillo(id), { platillo: { ajustes: { [id]: { foto_detalle_url: 'http://otro.sitio/foto.jpg' } } } });
    await titulo('Tacos de pastor');
    await waitFor(() => expect(screen.queryByRole('img', { name: /Foto de/ })).toBeNull());
  });
});

describe('detalle: enlace directo y recarga', () => {
  it('espera la entrada (esqueleto con el tamaño reservado) y luego muestra el platillo', async () => {
    const { sim, menu, detalle } = montarSesion(rutaPlatillo(idDe('Mole poblano')));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await titulo('Mole poblano')).toBeInTheDocument();
    expect(sim.llamadas.filter((l) => l.metodo === 'entrar')).toHaveLength(1);
    expect(menu.llamadas).toHaveLength(1);
    expect(detalle.llamadas).toEqual([{ id: idDe('Mole poblano') }]);
  });

  it('con el detalle y el menú en camino (nada en memoria): esqueleto que avisa a lectores de pantalla', async () => {
    const { detalle, soltarMenu, soltarDetalle } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { retener: ['menu', 'detalle'] });
    await waitFor(() => expect(detalle.llamadas).toHaveLength(1));
    expect(screen.getByRole('status')).toHaveTextContent('Preparando el platillo…');
    expect(document.querySelector('[data-con-foto]')).toBeNull();
    soltarDetalle();
    expect(await titulo('Mole poblano')).toBeInTheDocument();
    soltarMenu();
  });

  it('si la mesa no existe, el mismo fallo de la entrada, sin pedir el platillo', async () => {
    const { detalle } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { entrada: { errores: { entrar: errorSimulado(404, 'MESA_NO_ENCONTRADA') } } });
    expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
    expect(detalle.llamadas).toHaveLength(0);
  });
});

describe('detalle: volver al menú', () => {
  async function abrirYVolver(como: 'pantalla' | 'navegador') {
    const t = montarSesion(rutaMenu);
    const { u } = t;
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.type(screen.getByRole('searchbox', { name: 'Buscar en el menú' }), 'pastor');
    desplazamiento.fijarScrollY(640);
    let top = 300;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return { top: this.hasAttribute('data-platillo') ? top : 0, bottom: this.hasAttribute('data-platillo') ? top + 120 : 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) };
    });
    await u.click(screen.getByRole('button', { name: 'Ver Tacos de pastor' }));
    await titulo('Tacos de pastor');
    expect(desplazamiento.scrollTo).toHaveBeenLastCalledWith(0, 0); // el detalle empieza arriba
    desplazamiento.scrollTo.mockClear();
    top = 340; // al volver la lista mide distinto (content-visibility): se corrige con la tarjeta
    if (como === 'pantalla') await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    else await atrasDelNavegador(u);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    return t;
  }

  for (const como of ['pantalla', 'navegador'] as const) {
    it(`con el botón ${como === 'pantalla' ? 'de la pantalla' : 'de atrás del navegador'}: misma búsqueda, misma posición, sin esqueleto, un solo menu_view y el foco en la tarjeta`, async () => {
      const { menu, cola } = await abrirYVolver(como);
      expect(rutaActual()).toBe(rutaMenu);
      expect(screen.getByRole('searchbox', { name: 'Buscar en el menú' })).toHaveValue('pastor');
      expect(screen.queryByText('Preparando el menú…')).toBeNull();
      expect(menu.llamadas).toHaveLength(1);
      expect(vistas(cola.registrar, 'menu_view')).toHaveLength(1);
      expect(desplazamiento.scrollTo).toHaveBeenCalledWith(0, 640);
      expect(desplazamiento.scrollBy).toHaveBeenCalledWith(0, 40);
      const tarjeta = screen.getByRole('button', { name: 'Ver Tacos de pastor' });
      await waitFor(() => expect(tarjeta).toHaveFocus());
    });
  }

  it('«Mi mesa» olvida la posición: al volver al menú ya no se mueve ni se enfoca una tarjeta', async () => {
    const { u } = await abrirYVolver('pantalla');
    await u.click(screen.getByRole('button', { name: 'Mi mesa' }));
    await u.click(await screen.findByRole('button', { name: 'Ver el menú' }));
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    desplazamiento.scrollTo.mockClear();
    await u.click(screen.getByRole('button', { name: 'Mi mesa' }));
    await u.click(await screen.findByRole('button', { name: 'Ver el menú' }));
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    expect(desplazamiento.scrollTo).not.toHaveBeenCalled();
  });

  it('con un enlace directo, «Volver al menú» lleva al menú', async () => {
    const { u } = montarSesion(rutaPlatillo(idDe('Mole poblano')));
    await titulo('Mole poblano');
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    expect(await screen.findByRole('heading', { name: 'La Ceiba', level: 1 })).toBeInTheDocument();
    expect(rutaActual()).toBe(rutaMenu);
  });
});

describe('detalle: dish_view', () => {
  // @ac AC-24.1
  it('uno por apertura, aunque el árbol se renderice varias veces y StrictMode repita los efectos', async () => {
    const { u, cola, detalle } = montarSesion(rutaMenu, { estricto: true });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    const soltar = detalle.retener();
    await u.click(screen.getAllByRole('button', { name: 'Ver Tacos de pastor' })[0]!);
    await titulo('Tacos de pastor');
    await dejarPasar();
    expect(vistas(cola.registrar, 'dish_view')).toHaveLength(0); // todavía no se sabe que existe en el servidor
    soltar();
    await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toHaveLength(1));
    await dejarPasar(50);
    expect(vistas(cola.registrar, 'dish_view')).toEqual([['dish_view', idDe('Tacos de pastor')]]);
  });

  it('abrir el mismo platillo otra vez es otra apertura', async () => {
    const { u, cola } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    for (let i = 0; i < 2; i += 1) {
      await u.click(screen.getAllByRole('button', { name: 'Ver Tacos de pastor' })[0]!);
      await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toHaveLength(i + 1));
      await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
      await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    }
    expect(vistas(cola.registrar, 'dish_view')).toHaveLength(2);
  });

  it('un platillo que no existe no cuenta', async () => {
    const { cola } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { platillo: { noExisten: [idDe('Mole poblano')] } });
    await screen.findByRole('heading', { name: 'Este platillo ya no está en el menú' });
    await dejarPasar();
    expect(vistas(cola.registrar, 'dish_view')).toHaveLength(0);
  });

  it('un platillo agotado visto por enlace directo sí cuenta', async () => {
    const { cola } = montarSesion(rutaPlatillo(idDe('Pescado a la veracruzana')));
    await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toEqual([['dish_view', idDe('Pescado a la veracruzana')]]));
  });

  it('sin red pero con el platillo en memoria cuenta una vez (existe: lo trajo el menú)', async () => {
    const { u, cola, detalle } = montarSesion(rutaMenu);
    detalle.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.click(screen.getAllByRole('button', { name: 'Ver Tacos de pastor' })[0]!);
    await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toHaveLength(1));
  });

  it('pasar de un platillo a otro (mismo componente de ruta, otro :id) es otra apertura con su propio dish_view', async () => {
    const { u, cola } = montarSesion(rutaPlatillo(idDe('Tacos de pastor')));
    await titulo('Tacos de pastor');
    await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toHaveLength(1));
    await u.click(screen.getByRole('button', { name: 'ir a otro platillo' }));
    await titulo('Mole poblano');
    await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toHaveLength(2));
    expect(vistas(cola.registrar, 'dish_view').map(([, id]) => id)).toEqual([idDe('Tacos de pastor'), idDe('Mole poblano')]);
  });

  it('volver a renderizar el detalle (aunque cambie la cola) no cuenta otra vista', async () => {
    const servicio = crearServicioPlatilloSimulado().servicio;
    const uno = analiticaFalsa();
    const dos = analiticaFalsa();
    const id = idDe('Tacos de pastor');
    const props = { id, servicio, onVolver: () => undefined };
    const vista = render(<PlatilloVista {...props} analitica={uno.analitica} />);
    await titulo('Tacos de pastor');
    await waitFor(() => expect(uno.registrar).toHaveBeenCalledTimes(1));
    vista.rerender(<PlatilloVista {...props} analitica={dos.analitica} />);
    vista.rerender(<PlatilloVista {...props} analitica={dos.analitica} onVolver={() => undefined} />);
    await dejarPasar(30);
    expect(uno.registrar).toHaveBeenCalledTimes(1);
    expect(dos.registrar).not.toHaveBeenCalled();
  });

  // @ac AC-24.1
  it('lo único que viaja es el tipo, el id del platillo y la hora', () => {
    const enviar = vi.fn(async () => undefined);
    const cola = crearColaAnalitica({ enviar });
    cola.registrar('dish_view', idDe('Tacos de pastor'));
    cola.vaciar();
    cola.detener();
    const [lote] = enviar.mock.calls[0] as unknown as [{ tipo: string; platillo_id: string; ocurrido_en: string }[]];
    expect(lote).toHaveLength(1);
    expect(Object.keys(lote![0]!).sort()).toEqual(['ocurrido_en', 'platillo_id', 'tipo']);
  });
});

describe('detalle: estados', () => {
  it('un platillo dado de baja (404): mensaje claro y vuelta al menú, sin «Reintentar»', async () => {
    const { u } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { platillo: { noExisten: [idDe('Mole poblano')] } });
    expect(await screen.findByRole('heading', { name: 'Este platillo ya no está en el menú' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reintentar/ })).toBeNull();
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    expect(await screen.findByRole('heading', { name: 'La Ceiba', level: 1 })).toBeInTheDocument();
  });

  it('un 404 cuando se abrió desde el menú reemplaza lo que ya se veía', async () => {
    const { u, detalle } = montarSesion(rutaMenu);
    const soltar = detalle.retener();
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    detalle.fallarUnaVez(errorSimulado(404, 'PLATILLO_NO_ENCONTRADO'));
    await u.click(screen.getAllByRole('button', { name: 'Ver Tacos de pastor' })[0]!);
    await titulo('Tacos de pastor');
    soltar();
    expect(await screen.findByRole('heading', { name: 'Este platillo ya no está en el menú' })).toBeInTheDocument();
  });

  it('un id que no es un UUID da el mismo mensaje sin llamar a la API', async () => {
    const { detalle } = montarSesion(`/m/Jx3k9QwLmN2pR7sT4vY8zA/platillo/no-es-un-id`);
    expect(await screen.findByRole('heading', { name: 'Este platillo ya no está en el menú' })).toBeInTheDocument();
    expect(detalle.llamadas).toHaveLength(0);
  });

  it('sin red y sin nada en memoria: pantalla de sin conexión con «Reintentar» y «Volver al menú»; se reintenta sola al volver la red', async () => {
    const { detalle } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { retener: ['menu'] });
    detalle.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    expect(await screen.findByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver al menú' })).toBeInTheDocument();
    await dejarPasar();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(await titulo('Mole poblano')).toBeInTheDocument();
    expect(detalle.llamadas).toHaveLength(2);
  });

  it('sin red pero con el platillo en memoria: se ve y se avisa; vuelve la red y el aviso se va', async () => {
    const { u, detalle } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    detalle.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    await u.click(screen.getAllByRole('button', { name: 'Ver Tacos de pastor' })[0]!);
    expect(await titulo('Tacos de pastor')).toBeInTheDocument();
    expect(await screen.findByText(/Sin conexión\. Te mostramos lo que ya teníamos/)).toBeInTheDocument();
    expect(screen.getByText('$175.00')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(screen.queryByText(/Sin conexión\./)).toBeNull());
    expect(screen.getByText('Platos fuertes')).toBeInTheDocument();
  });

  it('un 429 con Retry-After: el botón espera esos segundos y no tapa el platillo', async () => {
    const { u, detalle } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    detalle.fallarUnaVez(errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 12));
    await u.click(screen.getAllByRole('button', { name: 'Ver Tacos de pastor' })[0]!);
    expect(await screen.findByText(/Vamos un poco rápido/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar (12 s)' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Tacos de pastor', level: 1 })).toBeInTheDocument();
  });

  it('un 429 sin nada en memoria: la pantalla de «Vamos un poco rápido» con su cuenta atrás', async () => {
    const { detalle } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { retener: ['menu'] });
    detalle.fallarUnaVez(errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 7));
    expect(await screen.findByRole('heading', { name: 'Vamos un poco rápido' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar (7 s)' })).toBeDisabled();
  });

  it('el aviso de reintento es un status dentro del detalle', async () => {
    const { u, detalle } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    detalle.fallarUnaVez(errorSimulado(500, 'ERROR_INTERNO'));
    await u.click(screen.getAllByRole('button', { name: 'Ver Tacos de pastor' })[0]!);
    const aviso = await screen.findByText(/No pudimos actualizar el platillo/);
    expect(within(aviso.closest('[role="status"]') as HTMLElement).getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });
});
