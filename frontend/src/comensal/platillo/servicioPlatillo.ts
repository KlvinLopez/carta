import type { components } from '../../compartido/api';
import { ErrorApi } from '../../compartido/http';
import { crearPeticion } from '../entrada/servicio';
import { esPlatillo } from '../menu/servicioMenu';

export type PlatilloDetalle = components['schemas']['PlatilloDetalle'];

/** Lo que la pantalla del detalle necesita de la API del comensal. */
export interface ServicioPlatillo {
  /**
   * `GET /p/platillos/{id}`: con `ETag` y `Cache-Control: private, no-cache`; el navegador revalida solo
   * (sin `If-None-Match` a mano, la app ve siempre un 200). 404 si no existe, está de baja o es de otro
   * restaurante: el mismo para todos.
   */
  platillo(id: string, signal?: AbortSignal): Promise<PlatilloDetalle>;
}

/** Un UUID: lo que no lo es no puede ser un platillo y no llega a la API. */
export const ID_PLATILLO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Forma mínima que la pantalla usa: un 200 con otra cosa (el HTML de un borde) no se pinta. */
export function esPlatilloDetalle(v: unknown): v is PlatilloDetalle {
  if (!esPlatillo(v)) return false;
  const categoria = (v as { categoria_nombre?: unknown }).categoria_nombre;
  return categoria == null || typeof categoria === 'string';
}

export function crearServicioPlatillo(buscar: typeof fetch = (...args) => fetch(...args)): ServicioPlatillo {
  const pedir = crearPeticion(buscar);
  return {
    async platillo(id, signal) {
      const r = await pedir('GET', `/platillos/${encodeURIComponent(id)}`, esPlatilloDetalle, { signal });
      // Sin `If-None-Match` de la app no hay 304 posible; si llegara, no hay nada que pintar.
      if (r === null) throw new ErrorApi(304, 'RESPUESTA_INVALIDA', 'Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento.');
      return r.datos;
    },
  };
}

export const servicioPlatilloReal = crearServicioPlatillo();
