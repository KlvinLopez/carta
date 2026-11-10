import { ErrorApi } from '../../compartido/http';

/** Texto de un error de la API para mostrarlo al operador: el mensaje de la envoltura, nunca `detail`. */
export function mensajeDe(error: unknown, porDefecto: string): string {
  return error instanceof ErrorApi && error.message ? error.message : porDefecto;
}

/** `true` si el error es un aborto de la petición (la pantalla se cerró): no hay nada que mostrar. */
export function fueAbortado(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Lo que el servidor dice de un campo concreto (`detalles.errores[]`), si lo dijo. */
export function errorDeCampo(error: unknown, campo: string): string | null {
  if (!(error instanceof ErrorApi)) return null;
  const errores = error.detalles['errores'];
  if (!Array.isArray(errores)) return null;
  for (const item of errores as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const { campo: ruta, mensaje } = item as { campo?: unknown; mensaje?: unknown };
    if (typeof ruta === 'string' && typeof mensaje === 'string' && ruta.split('.').includes(campo)) return mensaje;
  }
  return null;
}

/** El `tipo` del primer error de `detalles.errores[]` (p. ej. `limite_de_mesas`). */
export function tipoDeError(error: unknown): string | null {
  if (!(error instanceof ErrorApi)) return null;
  const errores = error.detalles['errores'];
  if (!Array.isArray(errores)) return null;
  const primero = (errores as unknown[])[0];
  const tipo = typeof primero === 'object' && primero !== null ? (primero as { tipo?: unknown }).tipo : null;
  return typeof tipo === 'string' ? tipo : null;
}
