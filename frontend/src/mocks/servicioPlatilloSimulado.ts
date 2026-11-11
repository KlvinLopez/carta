import { ErrorApi } from '../compartido/http';
import type { PlatilloDetalle, ServicioPlatillo } from '../comensal/platillo/servicioPlatillo';
import { crearMenuSemilla } from './servicioMenuComensalSimulado';
import type { MenuPublico } from '../comensal/menu/servicioMenu';

export interface OpcionesPlatilloSimulado {
  menu?: MenuPublico;
  /** Cambios por id sobre lo que dice el menú (calorías, picante…). */
  ajustes?: Record<string, Partial<PlatilloDetalle>>;
  /** Ids que el servidor ya no conoce (de baja): 404. */
  noExisten?: string[];
  /** Falla siempre con este error. */
  error?: ErrorApi;
}

/** `GET /p/platillos/{id}` en memoria, con la forma de `PlatilloDetalle` (el menú más `categoria_nombre`). */
export function crearServicioPlatilloSimulado(opciones: OpcionesPlatilloSimulado = {}) {
  const menu = opciones.menu ?? crearMenuSemilla();
  const llamadas: { id: string }[] = [];
  const senales: AbortSignal[] = [];
  const pendientes: ErrorApi[] = [];
  let espera: Promise<void> | null = null;
  const servicio: ServicioPlatillo = {
    async platillo(id, signal) {
      llamadas.push({ id });
      if (signal) senales.push(signal);
      if (espera) await espera;
      if (signal?.aborted) throw new DOMException('cancelado', 'AbortError');
      const unaVez = pendientes.shift();
      if (unaVez) throw unaVez;
      if (opciones.error) throw opciones.error;
      for (const c of menu.categorias) {
        const p = c.platillos.find((x) => x.id === id);
        if (p && !opciones.noExisten?.includes(id)) return structuredClone({ ...p, categoria_nombre: c.nombre, ...opciones.ajustes?.[id] });
      }
      throw new ErrorApi(404, 'PLATILLO_NO_ENCONTRADO', 'No encontramos ese platillo.', {}, 'req-simulado');
    },
  };
  return {
    servicio,
    llamadas,
    senales,
    menu,
    /** La próxima petición falla con este error; las siguientes responden bien. */
    fallarUnaVez(error: ErrorApi) {
      pendientes.push(error);
    },
    /** Deja la respuesta pendiente hasta llamar a lo que devuelve. */
    retener(): () => void {
      let soltar!: () => void;
      espera = new Promise<void>((r) => (soltar = r));
      return () => {
        soltar();
        espera = null;
      };
    },
  };
}
