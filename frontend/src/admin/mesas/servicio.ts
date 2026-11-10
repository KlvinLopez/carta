import { ErrorApi, type ClienteHttp } from '../../compartido/http';
import { empiezaConPdf } from '../alta/archivo';
import type { Mesa } from '../alta/tipos';

export type { Mesa };

export const TOPES_MESAS = { porLlamada: 100, capacidad: 50, activas: 500 } as const;

/**
 * Lo que la pantalla de mesas necesita de la API (T-1.5). La real habla con `ClienteHttp`; las pruebas
 * y las capturas usan `frontend/src/mocks/servicioMesasSimulado.ts`. El `restaurante_id` va en la ruta.
 */
export interface ServicioMesas {
  /** Todas las mesas (activas y dadas de baja); `activa` filtra y `limite` acota (máx. 500). */
  listar(rid: string, opciones?: { activa?: boolean; limite?: number }, signal?: AbortSignal): Promise<Mesa[]>;
  crear(rid: string, datos: { cantidad: number; capacidad: number }, signal?: AbortSignal): Promise<Mesa[]>;
  /** Código nuevo: el QR impreso anterior deja de servir al instante (AC-21.3). */
  regenerar(id: string, signal?: AbortSignal): Promise<Mesa>;
  descargarQr(rid: string, signal?: AbortSignal): Promise<Blob>;
}

export function crearServicioMesas(api: ClienteHttp): ServicioMesas {
  const base = (rid: string) => `/admin/restaurantes/${encodeURIComponent(rid)}`;
  return {
    listar: (rid, { activa, limite = TOPES_MESAS.activas } = {}, signal) =>
      api.obtener<Mesa[]>(`${base(rid)}/mesas`, { consulta: { activa, limit: limite }, signal }),
    crear: (rid, datos, signal) => api.solicitar<Mesa[]>('POST', `${base(rid)}/mesas`, { cuerpo: datos, signal }),
    regenerar: (id, signal) =>
      api.solicitar<Mesa>('POST', `/admin/mesas/${encodeURIComponent(id)}/regenerar-codigo`, { signal }),
    async descargarQr(rid, signal) {
      const pdf = await api.descargar(`${base(rid)}/mesas/qr.pdf`, { signal });
      if (pdf.type.includes('octet-stream') && (await empiezaConPdf(pdf))) {
        // Algunos bordes sirven el PDF como octet-stream: si los bytes son de PDF, se acepta.
        return new Blob([pdf], { type: 'application/pdf' });
      }
      if (!pdf.type.includes('pdf')) {
        throw new ErrorApi(200, 'RESPUESTA_INVALIDA', 'No pudimos preparar el PDF de tus QR. Inténtalo de nuevo.');
      }
      return pdf;
    },
  };
}
