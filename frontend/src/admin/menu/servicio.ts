import type { ClienteHttp } from '../../compartido/http';
import { TOPES_MENU, type CambiosPlatillo, type Categoria, type Platillo, type PlatilloNuevo } from './tipos';

/**
 * Lo que la pantalla de menú necesita de la API (T-1.3 y T-1.4). La implementación real habla con
 * `ClienteHttp` (token, 401 y envoltura de error); las pruebas y las capturas usan
 * `frontend/src/mocks/servicioMenuSimulado.ts`. El `restaurante_id` va en la ruta, nunca en el
 * cuerpo (regla dura 5); el precio lo escribe el operador y el servidor lo valida.
 */
export interface ServicioMenu {
  listarCategorias(rid: string, signal?: AbortSignal): Promise<Categoria[]>;
  /** Una página (`skip`/`limit` ≤ 100). `activo` = `false` lista las bajas. */
  listarPlatillos(
    rid: string,
    opciones: { activo: boolean; skip: number; limit: number },
    signal?: AbortSignal,
  ): Promise<Platillo[]>;
  crearPlatillo(rid: string, datos: PlatilloNuevo, signal?: AbortSignal): Promise<Platillo>;
  cambiarPlatillo(id: string, cambios: CambiosPlatillo, signal?: AbortSignal): Promise<Platillo>;
  /** Baja lógica (`activo = false`): nunca se borra nada (regla dura 9). */
  darDeBaja(id: string, signal?: AbortSignal): Promise<void>;
  /** Los ids de **una** categoría en el orden nuevo. */
  reordenarPlatillos(rid: string, ids: string[], signal?: AbortSignal): Promise<void>;
  /** `POST /admin/platillos/{id}/foto`, multipart con el campo `archivo` (T-1.4). */
  subirFoto(id: string, archivo: Blob, nombre: string, signal?: AbortSignal): Promise<Platillo>;
  quitarFoto(id: string, signal?: AbortSignal): Promise<Platillo>;
}

export function crearServicioMenu(api: ClienteHttp): ServicioMenu {
  const base = (rid: string) => `/admin/restaurantes/${encodeURIComponent(rid)}`;
  const platillo = (id: string) => `/admin/platillos/${encodeURIComponent(id)}`;
  return {
    listarCategorias: (rid, signal) =>
      api.obtener<Categoria[]>(`${base(rid)}/categorias`, { consulta: { limit: TOPES_MENU.pagina }, signal }),
    listarPlatillos: (rid, { activo, skip, limit }, signal) =>
      api.obtener<Platillo[]>(`${base(rid)}/platillos`, { consulta: { activo, skip, limit }, signal }),
    crearPlatillo: (rid, datos, signal) =>
      api.solicitar<Platillo>('POST', `${base(rid)}/platillos`, { cuerpo: datos, signal }),
    cambiarPlatillo: (id, cambios, signal) =>
      api.solicitar<Platillo>('PATCH', platillo(id), { cuerpo: cambios, signal }),
    async darDeBaja(id, signal) {
      await api.solicitar<void>('DELETE', platillo(id), { signal });
    },
    async reordenarPlatillos(rid, ids, signal) {
      await api.solicitar<unknown>('POST', `${base(rid)}/platillos/reordenar`, { cuerpo: { ids }, signal });
    },
    subirFoto(id, archivo, nombre, signal) {
      const formulario = new FormData();
      formulario.append('archivo', archivo, nombre);
      return api.solicitar<Platillo>('POST', `${platillo(id)}/foto`, { cuerpo: formulario, signal });
    },
    quitarFoto: (id, signal) => api.solicitar<Platillo>('DELETE', `${platillo(id)}/foto`, { signal }),
  };
}

/** Todas las páginas de una lista de platillos (`skip`/`limit` de 100 en 100) hasta que una venga corta. */
export async function listarTodosLosPlatillos(
  servicio: ServicioMenu,
  rid: string,
  activo: boolean,
  signal?: AbortSignal,
): Promise<Platillo[]> {
  const todos: Platillo[] = [];
  for (let pagina = 0; pagina < TOPES_MENU.paginasMaximas; pagina += 1) {
    const lote = await servicio.listarPlatillos(
      rid,
      { activo, skip: pagina * TOPES_MENU.pagina, limit: TOPES_MENU.pagina },
      signal,
    );
    todos.push(...lote);
    if (lote.length < TOPES_MENU.pagina) break;
  }
  return todos;
}
