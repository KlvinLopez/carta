import type { components } from '../../compartido/api';
import type { ClienteHttp } from '../../compartido/http';
import type { Mesa, Restaurante } from '../alta/tipos';

export type CambiosRestaurante = Partial<
  Pick<components['schemas']['RestauranteCambios'], 'nombre' | 'direccion' | 'telefono' | 'email' | 'logo_url'>
>;

/** Topes de `RestauranteCambios` (app/schemas/restaurante.py); una prueba los ata al contrato. */
export const TOPES_AJUSTES = { nombre: 200, direccion: 500, telefono: 20, email: 200, logo: 500 } as const;

/** Lo que Ajustes necesita de la API (T-1.2 y T-1.5). */
export interface ServicioAjustes {
  /** `PATCH /admin/restaurantes/{rid}`: sólo los campos enviados cambian; `null` borra los opcionales. */
  cambiar(rid: string, cambios: CambiosRestaurante, signal?: AbortSignal): Promise<Restaurante>;
  /** La primera mesa activa, de donde sale el enlace de ejemplo del menú; `null` si aún no hay mesas. */
  primeraMesa(rid: string, signal?: AbortSignal): Promise<Mesa | null>;
}

export function crearServicioAjustes(api: ClienteHttp): ServicioAjustes {
  const base = (rid: string) => `/admin/restaurantes/${encodeURIComponent(rid)}`;
  return {
    cambiar: (rid, cambios, signal) => api.solicitar<Restaurante>('PATCH', base(rid), { cuerpo: cambios, signal }),
    async primeraMesa(rid, signal) {
      const mesas = await api.obtener<Mesa[]>(`${base(rid)}/mesas`, { consulta: { activa: true, limit: 1 }, signal });
      return Array.isArray(mesas) ? (mesas[0] ?? null) : null;
    },
  };
}

/** Misma regla que `_url_https` del servidor: `https://host/...`, sin credenciales en la dirección. */
export function esUrlHttps(texto: string): boolean {
  try {
    const url = new URL(texto);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password && !texto.includes('@');
  } catch {
    return false;
  }
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const esCorreo = (texto: string): boolean => CORREO.test(texto);
