import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { crearServicioPlatilloSimulado } from '../../mocks/servicioPlatilloSimulado';
import { crearColaAnalitica } from '../analitica/cola';
import { analiticaFalsa } from '../menu/utilesPrueba';
import { PlatilloVista } from './Platillo';
import { asentar, atrasDelNavegador, espiarDesplazamiento, ID_CON_LETRAS, idDe, menuConIdConLetras, montarSesion, rutaActual, rutaMenu, rutaPlatillo, vistas } from './utilesPrueba';

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

/** El detalle vive en una capa sobre el menú (que sigue montado, tapado): sus textos se buscan ahí. */
const enCapa = () => within(document.querySelector('.capa') as HTMLElement);
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
    expect(enCapa().getByText('Cerdo marinado en achiote, cebolla encurtida, tortillas hechas a mano')).toBeInTheDocument();
    expect(enCapa().getByText('$285.00')).toBeInTheDocument();
    expect(enCapa().queryByText('Preparando el platillo…')).toBeNull();
    expect(enCapa().getByText('Platos fuertes')).toBeInTheDocument(); // la categoría ya venía en el menú
    expect(rutaActual()).toBe(rutaPlatillo(idDe('Cochinita pibil')));
    soltar();
    await waitFor(() => expect(enCapa().getByText('Platos fuertes')).toBeInTheDocument());
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
    expect(await enCapa().findByText('Contiene: Lácteos, Gluten, Huevo')).toBeInTheDocument();
    expect(enCapa().getByText('Picante')).toBeInTheDocument();
    expect(await enCapa().findByText('420 kcal')).toBeInTheDocument(); // llega con el detalle del servidor
    expect(enCapa().getByText('$130.00')).toBeInTheDocument();
    expect(enCapa().getByText('Jalapeño relleno de queso Oaxaca, capeado')).toBeInTheDocument();
  });

  it('sin picante ni calorías no pinta esas líneas, y sin alérgenos lo dice sin afirmar que no los tiene', async () => {
    montarSesion(rutaPlatillo(idDe('Cochinita pibil')));
    await titulo('Cochinita pibil');
    expect(enCapa().queryByText(/kcal/)).toBeNull();
    expect(enCapa().queryByText(/Picante/)).toBeNull();
    expect(enCapa().getByText('El restaurante no declaró alérgenos en este platillo.')).toBeInTheDocument();
    expect(enCapa().queryByText(/sin alérgenos/i)).toBeNull();
  });

  it('las etiquetas salen como chips legibles', async () => {
    montarSesion(rutaPlatillo(idDe('Hongos al ajillo')));
    await titulo('Hongos al ajillo');
    expect(enCapa().getByText('Vegano')).toBeInTheDocument();
    expect(enCapa().getByText('Sin gluten')).toBeInTheDocument();
  });

  // @ac AC-05.3
  it('el aviso de que el restaurante declara los alérgenos está siempre y no se puede cerrar', async () => {
    montarSesion(rutaPlatillo(idDe('Enchiladas verdes')));
    await titulo('Enchiladas verdes');
    expect(enCapa().getByText('La información de alérgenos la declara el restaurante y no sustituye preguntar al personal.')).toBeInTheDocument();
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
    expect(enCapa().getByText('Agotado hoy')).toBeInTheDocument();
    expect(enCapa().getByText('Hoy no se puede pedir este platillo.')).toBeInTheDocument();
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
    expect(document.querySelector('.capa svg[data-clave]')).not.toBeNull();
  });

  it('sin foto, la ilustración que dice el servidor', async () => {
    montarSesion(rutaPlatillo(idDe('Churros con chocolate')));
    await titulo('Churros con chocolate');
    expect(screen.queryByRole('img', { name: /Foto de/ })).toBeNull();
    expect(document.querySelector('.capa svg[data-clave="postres"]')).not.toBeNull();
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
    const { soltarMenu, soltarDetalle } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { retener: ['menu', 'detalle'] });
    await asentar();
    expect(screen.getByRole('status')).toHaveTextContent('Preparando el platillo…');
    expect(document.querySelector('.capa [data-con-foto]')).toBeNull();
    soltarMenu();
    soltarDetalle();
    expect(await titulo('Mole poblano')).toBeInTheDocument();
  });

  it('si la mesa no existe, el mismo fallo de la entrada, sin pedir el platillo', async () => {
    const { detalle } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { entrada: { errores: { entrar: errorSimulado(404, 'MESA_NO_ENCONTRADA') } } });
    expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
    expect(detalle.llamadas).toHaveLength(0);
  });
});

describe('detalle: volver al menú (el menú no se desmonta bajo el detalle)', () => {
  async function abrirYVolver(como: 'pantalla' | 'navegador') {
    const t = montarSesion(rutaMenu);
    const { u } = t;
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    const campo = screen.getByRole('searchbox', { name: 'Buscar en el menú' });
    await u.type(campo, 'pastor');
    const tarjeta = screen.getByRole('button', { name: 'Ver Tacos de pastor' });
    await u.click(tarjeta);
    await titulo('Tacos de pastor');
    // El menú sigue montado bajo la capa, tapado: no se lee ni se toca mientras se ve el detalle.
    expect(campo.isConnected).toBe(true);
    expect(campo.closest('[inert]')).not.toBeNull();
    expect(campo.closest('[aria-hidden="true"]')).not.toBeNull();
    if (como === 'pantalla') await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    else await atrasDelNavegador(u);
    await waitFor(() => expect(rutaActual()).toBe(rutaMenu));
    return { ...t, campo, tarjeta };
  }

  for (const como of ['pantalla', 'navegador'] as const) {
    it(`con el botón ${como === 'pantalla' ? 'de la pantalla' : 'de atrás del navegador'}: el mismo menú, la misma búsqueda, sin esqueleto, un solo menu_view, sin tocar el desplazamiento y el foco en la tarjeta`, async () => {
      const { menu, cola, campo, tarjeta } = await abrirYVolver(como);
      // Los mismos nodos del DOM: nada se volvió a montar (por eso la posición y los tamaños medidos se conservan).
      expect(screen.getByRole('searchbox', { name: 'Buscar en el menú' })).toBe(campo);
      expect(screen.getByRole('button', { name: 'Ver Tacos de pastor' })).toBe(tarjeta);
      expect(campo).toHaveValue('pastor');
      expect(campo.closest('[inert]')).toBeNull();
      expect(campo.closest('[aria-hidden="true"]')).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Tacos de pastor', level: 1 })).toBeNull(); // la capa se fue
      expect(screen.queryByText('Preparando el menú…')).toBeNull();
      expect(menu.llamadas).toHaveLength(1);
      await waitFor(() => expect(vistas(cola.registrar, 'menu_view')).toHaveLength(1));
      expect(desplazamiento.scrollTo).not.toHaveBeenCalled();
      expect(desplazamiento.scrollBy).not.toHaveBeenCalled();
      await waitFor(() => expect(tarjeta).toHaveFocus());
    });
  }

  it('el foco vuelve a la copia que se tocó cuando el platillo está en el «Top 3» y en la lista', async () => {
    const { u } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    const copias = screen.getAllByRole('button', { name: 'Ver Cochinita pibil' });
    expect(copias).toHaveLength(2); // [0] Top 3, [1] la lista
    await u.click(copias[1]!);
    await titulo('Cochinita pibil');
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    await waitFor(() => expect(copias[1]).toHaveFocus());
    expect(copias[0]).not.toHaveFocus();
  });

  it('con el platillo tocado fuera de la ventana y otra copia a la vista, vuelve el foco a la que se tocó (la enfocada gana a la más visible)', async () => {
    const { u } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    const copias = screen.getAllByRole('button', { name: 'Ver Cochinita pibil' });
    // jsdom no mide: la copia del Top 3 «se ve» y la de la lista no; pero se toca la de la lista.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const arriba = this === copias[0] ? 100 : 5000;
      return { top: arriba, bottom: arriba + 120, left: 0, right: 0, width: 0, height: 120, x: 0, y: arriba, toJSON: () => ({}) };
    });
    await u.click(copias[1]!);
    await titulo('Cochinita pibil');
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    await waitFor(() => expect(copias[1]).toHaveFocus());
  });

  it('el foco devuelto no desplaza la página (preventScroll)', async () => {
    const { u } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    const tarjeta = screen.getByRole('button', { name: 'Ver Tacos de pastor' });
    await u.click(tarjeta);
    await titulo('Tacos de pastor');
    const foco = vi.spyOn(tarjeta, 'focus');
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    await waitFor(() => expect(foco).toHaveBeenCalledWith({ preventScroll: true }));
  });

  // B3: la posición sólo vale para volver de un detalle.
  it('al llegar al menú desde otro sitio (la bienvenida) abre arriba, con el foco en el título y sin mover el desplazamiento', async () => {
    const { u } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.click(screen.getByRole('button', { name: 'Ver Tacos de pastor' }));
    await titulo('Tacos de pastor');
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    await waitFor(() => expect(rutaActual()).toBe(rutaMenu));
    await atrasDelNavegador(u); // hasta donde alcance el historial: el menú era la primera entrada
    await u.click(screen.getByRole('button', { name: 'Mi mesa' }));
    await u.click(await screen.findByRole('button', { name: 'Ver el menú' }));
    const h1 = await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await waitFor(() => expect(h1).toHaveFocus());
    expect(document.activeElement?.getAttribute('data-platillo')).toBeNull();
    expect(desplazamiento.scrollTo).not.toHaveBeenCalled();
  });

  it('con un enlace directo, «Volver al menú» lleva al menú y no apila otra entrada: atrás no regresa al detalle', async () => {
    const { u } = montarSesion(rutaPlatillo(idDe('Mole poblano')));
    await titulo('Mole poblano');
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    expect(await screen.findByRole('heading', { name: 'La Ceiba', level: 1 })).toBeInTheDocument();
    expect(rutaActual()).toBe(rutaMenu);
    await atrasDelNavegador(u);
    await asentar();
    expect(rutaActual()).toBe(rutaMenu); // no había nada atrás: el detalle se sustituyó
    expect(screen.queryByRole('heading', { name: 'Mole poblano', level: 1 })).toBeNull();
  });

  it('desde el menú, «Volver» regresa en el historial: adelante vuelve a abrir el detalle', async () => {
    const { u } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.click(screen.getByRole('button', { name: 'Ver Tacos de pastor' }));
    await titulo('Tacos de pastor');
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    await waitFor(() => expect(rutaActual()).toBe(rutaMenu));
    await u.click(screen.getByRole('button', { name: 'adelante del navegador' }));
    expect(await titulo('Tacos de pastor')).toBeInTheDocument();
    expect(rutaActual()).toBe(rutaPlatillo(idDe('Tacos de pastor')));
  });

  it('mientras vive la sesión, el navegador no restaura el desplazamiento por su cuenta (manual) y al irse lo deja como estaba', async () => {
    Object.defineProperty(window.history, 'scrollRestoration', { value: 'auto', writable: true, configurable: true });
    const t = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    expect(window.history.scrollRestoration).toBe('manual');
    t.unmount();
    expect(window.history.scrollRestoration).toBe('auto');
  });
});

describe('detalle: un platillo que no es del menú de esta mesa', () => {
  const AJENO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  // B1
  it('con el menú cargado, un id válido que no está en él es «ya no está en el menú»: sin pedir el detalle y sin dish_view', async () => {
    const { detalle, cola } = montarSesion(rutaPlatillo(AJENO));
    expect(await screen.findByRole('heading', { name: 'Este platillo ya no está en el menú' })).toBeInTheDocument();
    await asentar();
    expect(detalle.llamadas).toHaveLength(0);
    expect(vistas(cola.registrar, 'dish_view')).toHaveLength(0);
    expect(document.querySelector('.capa img')).toBeNull(); // ninguna foto ajena se pide
  });

  it('mientras el menú carga, esqueleto y ninguna petición del detalle; si el menú falla, se pide el detalle (no hay con qué comparar)', async () => {
    const espera = montarSesion(rutaPlatillo(idDe('Mole poblano')), { retener: ['menu'] });
    await asentar();
    expect(screen.getByRole('status')).toHaveTextContent('Preparando el platillo…');
    expect(espera.detalle.llamadas).toHaveLength(0);
    espera.soltarMenu();
    expect(await titulo('Mole poblano')).toBeInTheDocument();
    expect(espera.detalle.llamadas).toHaveLength(1);
    espera.unmount();

    const roto = montarSesion(rutaPlatillo(idDe('Mole poblano')), { menu: { error: errorSimulado(500, 'ERROR_INTERNO') } });
    expect(await titulo('Mole poblano')).toBeInTheDocument();
    expect(roto.detalle.llamadas).toHaveLength(1);
  });

  // B5
  it('un UUID con letras en mayúsculas encuentra el platillo del menú: sin esqueleto ni «ya no está», y el detalle se pide en minúsculas', async () => {
    const menu = menuConIdConLetras();
    const { detalle, cola } = montarSesion(rutaPlatillo(ID_CON_LETRAS.toUpperCase()), { menu: { menu }, platillo: { menu } });
    expect(await titulo('Guacamole de la casa')).toBeInTheDocument();
    expect(enCapa().queryByText('Este platillo ya no está en el menú')).toBeNull();
    await waitFor(() => expect(detalle.llamadas).toEqual([{ id: ID_CON_LETRAS }]));
    await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toEqual([['dish_view', ID_CON_LETRAS]]));
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
    await asentar();
    expect(vistas(cola.registrar, 'dish_view')).toHaveLength(0); // todavía no se sabe que existe en el servidor
    soltar();
    await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toHaveLength(1));
    await asentar(10);
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
    await asentar();
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
    await asentar(10);
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
    const { detalle } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { menu: { error: errorSimulado(500, 'ERROR_INTERNO') } });
    detalle.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    expect(await screen.findByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver al menú' })).toBeInTheDocument();
    await asentar();
    await act(async () => {}); // deja correr el efecto que registra el oyente
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
    expect(await enCapa().findByText(/Sin conexión\. Te mostramos lo que ya teníamos/)).toBeInTheDocument();
    expect(enCapa().getByText('$175.00')).toBeInTheDocument();
    await act(async () => {}); // deja correr el efecto que registra el oyente
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(enCapa().queryByText(/Sin conexión\./)).toBeNull());
    expect(enCapa().getByText('Platos fuertes')).toBeInTheDocument();
  });

  it('un 429 con Retry-After: el botón espera esos segundos y no tapa el platillo', async () => {
    const { u, detalle } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    detalle.fallarUnaVez(errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 12));
    await u.click(screen.getAllByRole('button', { name: 'Ver Tacos de pastor' })[0]!);
    expect(await enCapa().findByText(/Vamos un poco rápido/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar (12 s)' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Tacos de pastor', level: 1 })).toBeInTheDocument();
  });

  it('un 429 sin nada en memoria: la pantalla de «Vamos un poco rápido» con su cuenta atrás', async () => {
    const { detalle } = montarSesion(rutaPlatillo(idDe('Mole poblano')), { menu: { error: errorSimulado(500, 'ERROR_INTERNO') } });
    detalle.fallarUnaVez(errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 7));
    expect(await screen.findByRole('heading', { name: 'Vamos un poco rápido' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar (7 s)' })).toBeDisabled();
  });

  it('el aviso de reintento es un status dentro del detalle', async () => {
    const { u, detalle } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    detalle.fallarUnaVez(errorSimulado(500, 'ERROR_INTERNO'));
    await u.click(screen.getAllByRole('button', { name: 'Ver Tacos de pastor' })[0]!);
    const aviso = await enCapa().findByText(/No pudimos actualizar el platillo/);
    expect(within(aviso.closest('[role="status"]') as HTMLElement).getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });
});
