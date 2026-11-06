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
    /** Segundos que pide esperar el servidor (`Retry-After` de un 429/503); `null` si no lo dijo. */
    readonly reintentarEn: number | null = null,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

/** Sin respuesta (red caída, DNS, CORS): estado 0 para distinguirlo de un error de la API. */
export const ESTADO_SIN_RED = 0;
const MENSAJE_SIN_RED = 'No pudimos conectar con Carta. Revisa tu conexión e inténtalo de nuevo.';
const MENSAJE_GENERICO = 'Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento.';
const PREFIJO_API = '/api/v1/';

export interface OpcionesCliente {
  /** Token en memoria (nunca `localStorage`); `null` si no hay sesión. */
  token: () => string | null;
  /**
   * Pide un token fresco (p. ej. `getIdToken(true)`). Se usa una vez ante un 401, compartida entre
   * las peticiones que fallan a la vez. Devuelve `null` si la sesión ya no existe; si **lanza**
   * (red caída) la sesión se conserva y la petición falla con `SIN_RED`.
   */
  renovar?: () => Promise<string | null>;
  /** La sesión ya no vale (401 persistente o sin usuario al renovar): hay que volver al acceso. */
  alNoAutorizado?: () => void;
  fetch?: typeof fetch;
}

export interface OpcionesSolicitud {
  /** JSON por defecto; un `FormData` (multipart) viaja tal cual y el navegador pone el `boundary`. */
  cuerpo?: unknown;
  consulta?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export interface ClienteHttp {
  solicitar<T>(metodo: string, ruta: string, opciones?: OpcionesSolicitud): Promise<T>;
  obtener<T>(ruta: string, opciones?: OpcionesSolicitud): Promise<T>;
  /**
   * GET de un archivo (PDF de QR): con `Authorization` y la misma envoltura de error, devuelve el
   * `Blob`. Un enlace `<a href>` no llevaría la credencial.
   */
  descargar(ruta: string, opciones?: OpcionesSolicitud): Promise<Blob>;
}

function esDetalle(valor: unknown): valor is { error: Partial<DetalleError> } {
  return typeof valor === 'object' && valor !== null && 'error' in valor;
}

/** Segundos de un `Retry-After` (entero o fecha HTTP); `null` si falta o no se entiende. */
function segundosDeEspera(respuesta: Response): number | null {
  const valor = respuesta.headers.get('Retry-After');
  if (!valor) return null;
  if (/^\d+$/.test(valor.trim())) return Number(valor);
  const fecha = Date.parse(valor);
  return Number.isNaN(fecha) ? null : Math.max(0, Math.ceil((fecha - Date.now()) / 1000));
}

async function aErrorApi(respuesta: Response): Promise<ErrorApi> {
  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    // Cuerpo vacío o no JSON (un 502 del borde): se cae al mensaje genérico.
  }
  const espera = segundosDeEspera(respuesta);
  if (esDetalle(cuerpo) && typeof cuerpo.error.codigo === 'string') {
    const { codigo, mensaje, detalles, request_id } = cuerpo.error;
    return new ErrorApi(
      respuesta.status,
      codigo,
      typeof mensaje === 'string' && mensaje ? mensaje : MENSAJE_GENERICO,
      detalles ?? {},
      request_id ?? respuesta.headers.get('X-Request-ID'),
      espera,
    );
  }
  return new ErrorApi(
    respuesta.status,
    'ERROR_INTERNO',
    MENSAJE_GENERICO,
    {},
    respuesta.headers.get('X-Request-ID'),
    espera,
  );
}

/**
 * Cliente HTTP mínimo con `Authorization: Bearer`, un reintento tras renovar y la envoltura de error.
 * Sólo habla con la API del propio origen (`/api/v1/…`): el token no viaja a ningún otro sitio.
 */
export function crearCliente(opciones: OpcionesCliente): ClienteHttp {
  // Una sola renovación en vuelo: varios 401 a la vez comparten el mismo `getIdToken(true)`.
  let renovando: Promise<string | null> | null = null;
  let generacion = 0;
  let avisadaGeneracion = -1;

  function renovarCompartida(): Promise<{ fresco: string | null; generacion: number }> {
    if (!renovando) {
      generacion += 1;
      renovando = (opciones.renovar ? opciones.renovar() : Promise.resolve(null)).finally(() => {
        renovando = null;
      });
    }
    const esta = generacion;
    return renovando.then((fresco) => ({ fresco, generacion: esta }));
  }

  function avisarNoAutorizado(deGeneracion: number) {
    // Varias peticiones que fallan por la misma sesión avisan una sola vez.
    if (avisadaGeneracion === deGeneracion) return;
    avisadaGeneracion = deGeneracion;
    opciones.alNoAutorizado?.();
  }

  async function enviar(
    metodo: string,
    ruta: string,
    { cuerpo, consulta, signal }: OpcionesSolicitud,
    token: string | null,
    archivo = false,
  ): Promise<Response> {
    const url = new URL(PREFIJO_API.slice(0, -1) + ruta, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith(PREFIJO_API)) {
      throw new ErrorApi(ESTADO_SIN_RED, 'RUTA_INVALIDA', MENSAJE_GENERICO);
    }
    for (const [clave, valor] of Object.entries(consulta ?? {})) {
      if (valor !== undefined) url.searchParams.set(clave, String(valor));
    }
    const cabeceras: Record<string, string> = { Accept: archivo ? '*/*' : 'application/json' };
    if (token) cabeceras.Authorization = `Bearer ${token}`;
    const esFormulario = typeof FormData !== 'undefined' && cuerpo instanceof FormData;
    if (cuerpo !== undefined && !esFormulario) cabeceras['Content-Type'] = 'application/json';
    try {
      return await (opciones.fetch ?? fetch)(url, {
        method: metodo,
        headers: cabeceras,
        body: cuerpo === undefined ? undefined : esFormulario ? cuerpo : JSON.stringify(cuerpo),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ErrorApi(ESTADO_SIN_RED, 'SIN_RED', MENSAJE_SIN_RED);
    }
  }

  /** Envía, renueva una vez ante un 401 y devuelve una respuesta `ok`; lo demás lanza `ErrorApi`. */
  async function responder(
    metodo: string,
    ruta: string,
    op: OpcionesSolicitud,
    archivo: boolean,
  ): Promise<Response> {
    let respuesta = await enviar(metodo, ruta, op, opciones.token(), archivo);
    if (respuesta.status === 401) {
      let renovacion: { fresco: string | null; generacion: number };
      try {
        renovacion = await renovarCompartida();
      } catch {
        // No se pudo ni preguntar a Firebase (red móvil caída): el token puede seguir valiendo.
        throw new ErrorApi(ESTADO_SIN_RED, 'SIN_RED', MENSAJE_SIN_RED);
      }
      if (renovacion.fresco) respuesta = await enviar(metodo, ruta, op, renovacion.fresco, archivo);
      if (!renovacion.fresco || respuesta.status === 401) {
        avisarNoAutorizado(renovacion.generacion);
        throw await aErrorApi(respuesta);
      }
    }
    if (!respuesta.ok) throw await aErrorApi(respuesta);
    return respuesta;
  }

  async function solicitar<T>(metodo: string, ruta: string, op: OpcionesSolicitud = {}): Promise<T> {
    const respuesta = await responder(metodo, ruta, op, false);
    if (respuesta.status === 204) return undefined as T;
    try {
      return (await respuesta.json()) as T;
    } catch {
      // 200 con HTML (el fallback de la SPA) o vacío (el borde): no es una respuesta de la API.
      throw new ErrorApi(respuesta.status, 'RESPUESTA_INVALIDA', MENSAJE_GENERICO, {}, respuesta.headers.get('X-Request-ID'));
    }
  }

  async function descargar(ruta: string, op: OpcionesSolicitud = {}): Promise<Blob> {
    const respuesta = await responder('GET', ruta, op, true);
    try {
      return await respuesta.blob();
    } catch {
      throw new ErrorApi(respuesta.status, 'RESPUESTA_INVALIDA', MENSAJE_GENERICO, {}, respuesta.headers.get('X-Request-ID'));
    }
  }

  return { solicitar, obtener: (ruta, op) => solicitar('GET', ruta, op), descargar };
}
