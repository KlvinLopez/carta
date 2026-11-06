import { ErrorApi, type ClienteHttp } from '../../compartido/http';
import type { Importacion, Mesa, Personal, Resultado, Restaurante, RolPersonal } from './tipos';

/**
 * Lo que el asistente necesita de la API. La implementación real habla con `ClienteHttp`; las
 * pruebas y las capturas usan `frontend/src/mocks/servicioSimulado.ts` (contrato primero, 04 §2).
 * El PIN del personal sólo pasa por `crearPersonal`: nada lo guarda ni lo devuelve.
 */
export interface ServicioAlta {
  crearRestaurante(datos: { nombre: string; logo_url?: string }, signal?: AbortSignal): Promise<Restaurante>;
  subirCarta(rid: string, archivo: File, signal?: AbortSignal): Promise<Importacion>;
  consultarImportacion(rid: string, id: string, signal?: AbortSignal): Promise<Importacion>;
  reintentarImportacion(rid: string, id: string, signal?: AbortSignal): Promise<Importacion>;
  confirmarImportacion(rid: string, id: string, resultado: Resultado, signal?: AbortSignal): Promise<Importacion>;
  crearMesas(rid: string, datos: { cantidad: number; capacidad: number }, signal?: AbortSignal): Promise<Mesa[]>;
  descargarQr(rid: string, signal?: AbortSignal): Promise<Blob>;
  crearPersonal(
    rid: string,
    datos: { nombre: string; rol: RolPersonal; pin: string },
    signal?: AbortSignal,
  ): Promise<Personal>;
}

export function crearServicioAlta(api: ClienteHttp): ServicioAlta {
  const base = (rid: string) => `/admin/restaurantes/${encodeURIComponent(rid)}`;
  const importacion = (rid: string, id: string) => `${base(rid)}/importaciones/${encodeURIComponent(id)}`;
  return {
    async crearRestaurante({ nombre, logo_url }, signal) {
      const creado = await api.solicitar<Restaurante>('POST', '/admin/restaurantes', { cuerpo: { nombre }, signal });
      if (!logo_url) return creado;
      // El alta no recibe el logo (RestauranteCrear): se pone con un PATCH. Si falla, el restaurante
      // ya existe y no se pierde el paso; el logo se puede cambiar luego en Ajustes.
      try {
        return await api.solicitar<Restaurante>('PATCH', base(creado.id), { cuerpo: { logo_url }, signal });
      } catch {
        return creado;
      }
    },
    subirCarta(rid, archivo, signal) {
      const formulario = new FormData();
      formulario.append('archivo', archivo, archivo.name);
      return api.solicitar<Importacion>('POST', `${base(rid)}/importaciones`, { cuerpo: formulario, signal });
    },
    consultarImportacion: (rid, id, signal) => api.obtener<Importacion>(importacion(rid, id), { signal }),
    reintentarImportacion: (rid, id, signal) =>
      api.solicitar<Importacion>('POST', `${importacion(rid, id)}/reintentar`, { signal }),
    confirmarImportacion: (rid, id, resultado, signal) =>
      api.solicitar<Importacion>('POST', `${importacion(rid, id)}/confirmar`, { cuerpo: resultado, signal }),
    crearMesas: (rid, datos, signal) => api.solicitar<Mesa[]>('POST', `${base(rid)}/mesas`, { cuerpo: datos, signal }),
    async descargarQr(rid, signal) {
      const pdf = await api.descargar(`${base(rid)}/mesas/qr.pdf`, { signal });
      if (!pdf.type.includes('pdf')) {
        throw new ErrorApi(200, 'RESPUESTA_INVALIDA', 'No pudimos preparar el PDF de tus QR. Inténtalo de nuevo.');
      }
      return pdf;
    },
    crearPersonal: (rid, datos, signal) =>
      api.solicitar<Personal>('POST', `${base(rid)}/personal`, { cuerpo: datos, signal }),
  };
}
