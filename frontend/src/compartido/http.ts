import type { components } from './api';

/** Envoltura de error única del contrato (`ErrorRespuesta`, 04_API_Spec §1). */
export type DetalleError = components['schemas']['DetalleError'];

/** Error de la API ya normalizado: nunca se muestra `mensaje` técnico, sólo el de la envoltura. */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly detalles: Record<string, unknown> = {},
    readonly requestId: string | null = null,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

/** Sin respuesta (red caída, DNS, CORS): estado 0 para distinguirlo de un error de la API. */
export const ESTADO_SIN_RED = 0;
const MENSAJE_SIN_RED = 'No pudimos conectar con Carta. Revisa tu conexión e inténtalo de nuevo.';
const MENSAJE_GENERICO = 'Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento.';

export interface OpcionesCliente {
  /** Token en memoria (nunca `localStorage`); `null` si no hay sesión. */
  token: () => string | null;
  /** Pide un token fresco (p. ej. `getIdToken(true)`). Se usa una vez ante un 401. */
  renovar?: () => Promise<string | null>;
  /** El 401 persiste tras renovar: la sesión ya no vale, hay que volver al acceso. */
  alNoAutorizado?: () => void;
  base?: string;
  fetch?: typeof fetch;
}

export interface OpcionesSolicitud {
  cuerpo?: unknown;
  consulta?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export interface ClienteHttp {
  solicitar<T>(metodo: string, ruta: string, opciones?: OpcionesSolicitud): Promise<T>;
  obtener<T>(ruta: string, opciones?: OpcionesSolicitud): Promise<T>;
}

function esDetalle(valor: unknown): valor is { error: Partial<DetalleError> } {
  return typeof valor === 'object' && valor !== null && 'error' in valor;
}

async function aErrorApi(respuesta: Response): Promise<ErrorApi> {
  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    // Cuerpo vacío o no JSON (un 502 del borde): se cae al mensaje genérico.
  }
  if (esDetalle(cuerpo) && typeof cuerpo.error.codigo === 'string') {
    const { codigo, mensaje, detalles, request_id } = cuerpo.error;
    return new ErrorApi(
      respuesta.status,
      codigo,
      typeof mensaje === 'string' && mensaje ? mensaje : MENSAJE_GENERICO,
      detalles ?? {},
      request_id ?? respuesta.headers.get('X-Request-ID'),
    );
  }
  return new ErrorApi(
    respuesta.status,
    'ERROR_INTERNO',
    MENSAJE_GENERICO,
    {},
    respuesta.headers.get('X-Request-ID'),
  );
}

/** Cliente HTTP mínimo con `Authorization: Bearer`, un reintento tras renovar y la envoltura de error. */
export function crearCliente(opciones: OpcionesCliente): ClienteHttp {
  const base = opciones.base ?? '/api/v1';

  async function enviar(
    metodo: string,
    ruta: string,
    { cuerpo, consulta, signal }: OpcionesSolicitud,
    token: string | null,
  ): Promise<Response> {
    const url = new URL(base + ruta, window.location.origin);
    for (const [clave, valor] of Object.entries(consulta ?? {})) {
      if (valor !== undefined) url.searchParams.set(clave, String(valor));
    }
    const cabeceras: Record<string, string> = { Accept: 'application/json' };
    if (token) cabeceras.Authorization = `Bearer ${token}`;
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    try {
      return await (opciones.fetch ?? fetch)(url, {
        method: metodo,
        headers: cabeceras,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ErrorApi(ESTADO_SIN_RED, 'SIN_RED', MENSAJE_SIN_RED);
    }
  }

  async function solicitar<T>(metodo: string, ruta: string, op: OpcionesSolicitud = {}): Promise<T> {
    let respuesta = await enviar(metodo, ruta, op, opciones.token());
    if (respuesta.status === 401) {
      const fresco = opciones.renovar ? await opciones.renovar().catch(() => null) : null;
      if (fresco) respuesta = await enviar(metodo, ruta, op, fresco);
      if (respuesta.status === 401) {
        opciones.alNoAutorizado?.();
        throw await aErrorApi(respuesta);
      }
    }
    if (!respuesta.ok) throw await aErrorApi(respuesta);
    if (respuesta.status === 204) return undefined as T;
    return (await respuesta.json()) as T;
  }

  return { solicitar, obtener: (ruta, op) => solicitar('GET', ruta, op) };
}
