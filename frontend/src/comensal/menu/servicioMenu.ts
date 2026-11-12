import type { components } from '../../compartido/api';
import { ErrorApi } from '../../compartido/http';
import { crearPeticion, esObjetoJson as esObjeto, esTextoJson as esTexto } from '../entrada/servicio';

export type MenuPublico = components['schemas']['MenuPublico'];
export type CategoriaPublica = components['schemas']['CategoriaPublica'];
export type PlatilloPublico = components['schemas']['PlatilloPublico'];
/** El menú leído; `deCopia` sólo viene (y vale `true`) cuando el service worker lo sirvió de su copia porque la red falló. */
export type MenuLeido = MenuPublico & { deCopia?: true };

/** Lo que la pantalla del menú necesita de la API del comensal. */
export interface ServicioMenu {
  /**
   * `GET /p/menu/{slug}`: público, con `ETag` y `Cache-Control: public, max-age=30`. No se manda
   * `If-None-Match` a mano: el navegador revalida solo y la app ve siempre un 200.
   */
  menu(slug: string, signal?: AbortSignal): Promise<MenuLeido>;
}

const esLista = (v: unknown): v is unknown[] => Array.isArray(v);
const esListaDeTextos = (v: unknown): v is string[] => esLista(v) && v.every(esTexto);

export function esPlatillo(v: unknown): v is PlatilloPublico {
  return (
    esObjeto(v) &&
    esTexto(v.id) &&
    esTexto(v.nombre) &&
    (typeof v.precio === 'number' || esTexto(v.precio)) &&
    typeof v.disponible === 'boolean' &&
    esListaDeTextos(v.alergenos) &&
    esListaDeTextos(v.etiquetas)
  );
}

/** Forma mínima que la pantalla usa: un 200 con otra cosa (el HTML de un borde) no se pinta. */
export function esMenuPublico(v: unknown): v is MenuPublico {
  return (
    esObjeto(v) &&
    esObjeto(v.restaurante) &&
    esTexto(v.restaurante.nombre) &&
    esLista(v.categorias) &&
    v.categorias.every((c) => esObjeto(c) && esTexto(c.id) && esTexto(c.nombre) && esLista(c.platillos) && c.platillos.every(esPlatillo)) &&
    esListaDeTextos(v.destacados)
  );
}

export function crearServicioMenu(buscar: typeof fetch = (...args) => fetch(...args)): ServicioMenu {
  const pedir = crearPeticion(buscar);
  return {
    async menu(slug, signal) {
      const r = await pedir('GET', `/menu/${encodeURIComponent(slug)}`, esMenuPublico, { signal });
      // Sin `If-None-Match` de la app no hay 304 posible; si llegara, no hay nada que pintar.
      if (r === null) throw new ErrorApi(304, 'RESPUESTA_INVALIDA', 'Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento.');
      return r.copia ? { ...r.datos, deCopia: true } : r.datos;
    },
  };
}

export const servicioMenuReal = crearServicioMenu();
