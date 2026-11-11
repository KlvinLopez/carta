import type { components } from '../../compartido/api';
import { ErrorApi, ESTADO_SIN_RED } from '../../compartido/http';

export type EntrarRespuesta = components['schemas']['EntrarRespuesta'];
export type SesionResumen = components['schemas']['SesionResumen'];
export type SesionEstado = components['schemas']['SesionEstado'];
export type MiembroRespuesta = components['schemas']['MiembroRespuesta'];
export type MiembroDeSesion = components['schemas']['MiembroDeSesion'];

/** Resultado de `GET /p/sesion`: el estado nuevo con su `ETag`, o «sin cambios» (304). */
export type RespuestaEstado = { sinCambios: true } | { sinCambios: false; estado: SesionEstado; etag: string | null };

/** Lo que la pantalla de entrada necesita de la API del comensal (la cookie viaja sola). */
export interface ServicioEntrada {
  entrar(codigo: string, signal?: AbortSignal): Promise<EntrarRespuesta>;
  /** `etag` es el de la última respuesta pintada; con 304 se conserva lo pintado. */
  estado(etag: string | null, signal?: AbortSignal): Promise<RespuestaEstado>;
  cambiarAlias(alias: string, signal?: AbortSignal): Promise<MiembroRespuesta>;
}

const PLAZO_MS = 15_000;
const MENSAJE_SIN_RED = 'No pudimos conectar con Carta. Revisa tu conexión e inténtalo de nuevo.';
const MENSAJE_GENERICO = 'Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento.';

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

const esTexto = (v: unknown): v is string => typeof v === 'string';

/** Forma mínima que la pantalla usa: un 200 con otra cosa (HTML de un borde) no se pinta. */
export function esEntrarRespuesta(v: unknown): v is EntrarRespuesta {
  if (!esObjeto(v) || !esObjeto(v.sesion) || !esObjeto(v.miembro)) return false;
  const { sesion, miembro } = v;
  return (
    esTexto(sesion.id) &&
    esObjeto(sesion.mesa) &&
    typeof sesion.mesa.numero === 'number' &&
    esObjeto(sesion.restaurante) &&
    esTexto(sesion.restaurante.nombre) &&
    esTexto(sesion.restaurante.slug) &&
    esTexto(miembro.id) &&
    esTexto(miembro.alias)
  );
}

export function esSesionEstado(v: unknown): v is SesionEstado {
  return (
    esObjeto(v) &&
    esTexto(v.id) &&
    esTexto(v.yo) &&
    typeof v.total_miembros === 'number' &&
    Array.isArray(v.miembros) &&
    v.miembros.every((m) => esObjeto(m) && esTexto(m.id) && esTexto(m.alias))
  );
}

export function esMiembroRespuesta(v: unknown): v is MiembroRespuesta {
  return esObjeto(v) && esTexto(v.id) && esTexto(v.alias);
}

async function aErrorApi(respuesta: Response): Promise<ErrorApi> {
  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    // Cuerpo vacío o HTML (un 502 del borde): se cae al mensaje genérico.
  }
  const id = respuesta.headers.get('X-Request-ID');
  const reintento = Number(respuesta.headers.get('Retry-After'));
  // Entero y al alza: «0.0001 s» no es algo que se le diga a nadie.
  const espera = Number.isFinite(reintento) && reintento > 0 ? Math.min(Math.ceil(reintento), 300) : null;
  const detalle = esObjeto(cuerpo) && esObjeto(cuerpo.error) ? cuerpo.error : null;
  if (detalle && esTexto(detalle.codigo)) {
    const detalles = esObjeto(detalle.detalles) ? detalle.detalles : {};
    return new ErrorApi(respuesta.status, detalle.codigo, esTexto(detalle.mensaje) ? detalle.mensaje : MENSAJE_GENERICO, detalles, esTexto(detalle.request_id) ? detalle.request_id : id, espera);
  }
  return new ErrorApi(respuesta.status, 'ERROR_INTERNO', MENSAJE_GENERICO, {}, id, espera);
}

/**
 * Cliente de `/api/v1/p/*` contra el propio origen. La cookie `carta_invitado` es `HttpOnly`: la
 * app nunca la lee ni la escribe, sólo deja que el navegador la mande (`same-origin`).
 */
export function crearServicioEntrada(buscar: typeof fetch = (...args) => fetch(...args)): ServicioEntrada {
  async function pedir<T>(
    metodo: string,
    ruta: string,
    valido: (v: unknown) => v is T,
    { cuerpo, etag, signal }: { cuerpo?: unknown; etag?: string | null; signal?: AbortSignal } = {},
  ): Promise<{ datos: T; etag: string | null } | null> {
    const control = new AbortController();
    let vencio = false;
    const plazo = setTimeout(() => {
      vencio = true;
      control.abort();
    }, PLAZO_MS);
    const cancelar = () => control.abort();
    signal?.addEventListener('abort', cancelar);
    const cabeceras: Record<string, string> = { Accept: 'application/json' };
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    if (etag) cabeceras['If-None-Match'] = etag;
    try {
      let respuesta: Response;
      try {
        respuesta = await buscar(`/api/v1/p${ruta}`, {
          method: metodo,
          headers: cabeceras,
          body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
          credentials: 'same-origin',
          signal: control.signal,
        });
      } catch (error) {
        if (signal?.aborted && !vencio) throw error;
        throw new ErrorApi(ESTADO_SIN_RED, 'SIN_RED', MENSAJE_SIN_RED);
      }
      if (respuesta.status === 304) return null;
      if (!respuesta.ok) throw await aErrorApi(respuesta);
      let datos: unknown;
      try {
        datos = await respuesta.json();
      } catch {
        // Un tropiezo a mitad del cuerpo es de red; un 200 que no es JSON es del borde.
        throw new ErrorApi(respuesta.status, 'RESPUESTA_INVALIDA', MENSAJE_GENERICO);
      }
      if (!valido(datos)) throw new ErrorApi(respuesta.status, 'RESPUESTA_INVALIDA', MENSAJE_GENERICO);
      return { datos, etag: respuesta.headers.get('ETag') };
    } finally {
      clearTimeout(plazo);
      signal?.removeEventListener('abort', cancelar);
    }
  }

  return {
    async entrar(codigo, signal) {
      const r = await pedir('POST', '/sesion/entrar', esEntrarRespuesta, { cuerpo: { codigo_mesa: codigo }, signal });
      return r!.datos;
    },
    async estado(etag, signal) {
      const r = await pedir('GET', '/sesion', esSesionEstado, { etag, signal });
      return r === null ? { sinCambios: true } : { sinCambios: false, estado: r.datos, etag: r.etag };
    },
    async cambiarAlias(alias, signal) {
      const r = await pedir('PATCH', '/miembro', esMiembroRespuesta, { cuerpo: { alias }, signal });
      return r!.datos;
    },
  };
}
