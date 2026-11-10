import type { ClienteHttp } from '../../compartido/http';
import type { Personal, RolPersonal } from '../alta/tipos';

export type { Personal, RolPersonal };

export const TOPES_PERSONAL = { nombre: 60, activos: 50 } as const;

export interface CambiosPersonal {
  nombre?: string;
  rol?: RolPersonal;
  activo?: boolean;
}

/**
 * Lo que la pantalla de personal necesita de la API (T-1.6). El PIN sólo pasa por `crear` y
 * `reasignarPin`: ninguna respuesta lo devuelve y nada del cliente lo guarda (regla dura 11).
 */
export interface ServicioPersonal {
  /** Todas las personas (activas y dadas de baja). */
  listar(rid: string, signal?: AbortSignal): Promise<Personal[]>;
  crear(rid: string, datos: { nombre: string; rol: RolPersonal; pin: string }, signal?: AbortSignal): Promise<Personal>;
  /** Sólo los campos enviados cambian. `activo: false` revoca la sesión de la persona (AC-26.3). */
  cambiar(id: string, cambios: CambiosPersonal, signal?: AbortSignal): Promise<Personal>;
  /** 204: reasigna el PIN, revoca la sesión vigente y limpia el bloqueo. */
  reasignarPin(id: string, pin: string, signal?: AbortSignal): Promise<void>;
}

export function crearServicioPersonal(api: ClienteHttp): ServicioPersonal {
  const base = (rid: string) => `/admin/restaurantes/${encodeURIComponent(rid)}/personal`;
  const persona = (id: string) => `/admin/personal/${encodeURIComponent(id)}`;
  return {
    listar: (rid, signal) => api.obtener<Personal[]>(base(rid), { signal }),
    crear: (rid, datos, signal) => api.solicitar<Personal>('POST', base(rid), { cuerpo: datos, signal }),
    cambiar: (id, cambios, signal) => api.solicitar<Personal>('PATCH', persona(id), { cuerpo: cambios, signal }),
    async reasignarPin(id, pin, signal) {
      await api.solicitar<void>('POST', `${persona(id)}/pin`, { cuerpo: { pin }, signal });
    },
  };
}
