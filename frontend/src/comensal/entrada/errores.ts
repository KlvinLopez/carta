import { ErrorApi } from '../../compartido/http';

/** Cómo se le explica un fallo a quien está en la mesa; cada clase tiene su pantalla o su aviso. */
export type ClaseError =
  | 'mesa_invalida'
  | 'no_disponible'
  | 'llena'
  | 'cerrada'
  | 'credencial'
  | 'sin_conexion'
  | 'limite'
  | 'generico';

export function claseDeError(error: unknown): ClaseError {
  if (!(error instanceof ErrorApi)) return 'generico';
  if (error.estado === 0 || error.codigo === 'SIN_RED') return 'sin_conexion';
  if (error.estado === 404 && error.codigo === 'MESA_NO_ENCONTRADA') return 'mesa_invalida';
  // Otro 404 (el menú de un restaurante que dejó de estar activo): reintentar no lo arregla.
  if (error.estado === 404) return 'no_disponible';
  if (error.estado === 409 && error.codigo === 'SESION_LLENA') return 'llena';
  if (error.estado === 410) return 'cerrada';
  if (error.estado === 401) return 'credencial';
  if (error.estado === 429) return 'limite';
  // 408: la petición no terminó a tiempo (red lenta), se explica como conexión.
  if (error.estado === 408) return 'sin_conexion';
  return 'generico';
}

export const MAX_ALIAS = 24;
