import { CLAVE_ALTA } from '../almacen';
import type { Mesa, Restaurante } from './tipos';

export type Paso = 'restaurante' | 'carta' | 'revisa' | 'confirmar' | 'mesas' | 'personal' | 'listo';
const PASOS_VALIDOS: Paso[] = ['restaurante', 'carta', 'revisa', 'confirmar', 'mesas', 'personal', 'listo'];

export interface MiembroEquipo {
  id: string;
  nombre: string;
  rol: 'mesero' | 'capitan';
}

/**
 * Lo mínimo para reanudar el asistente tras recargar o perder la sesión: ids y paso. Vive en
 * `sessionStorage` (sólo esta pestaña) y **nunca** lleva el PIN ni el borrador editado: el borrador
 * se vuelve a leer de `GET …/importaciones/{id}`. Se borra al cerrar sesión y al terminar.
 */
export interface Progreso {
  paso: Paso;
  restaurante: Restaurante;
  importacionId: string | null;
  menuCreado: boolean;
  mesas: Mesa[];
  equipo: MiembroEquipo[];
}

export function leerProgreso(): Progreso | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE_ALTA);
    if (!crudo) return null;
    const v = JSON.parse(crudo) as Partial<Progreso>;
    if (
      !v ||
      !PASOS_VALIDOS.includes(v.paso as Paso) ||
      v.paso === 'restaurante' ||
      typeof v.restaurante?.id !== 'string' ||
      typeof v.restaurante.nombre !== 'string' ||
      typeof v.restaurante.slug !== 'string'
    ) {
      return null;
    }
    return {
      paso: v.paso as Paso,
      restaurante: v.restaurante,
      importacionId: typeof v.importacionId === 'string' ? v.importacionId : null,
      menuCreado: v.menuCreado === true,
      mesas: Array.isArray(v.mesas) ? v.mesas : [],
      equipo: Array.isArray(v.equipo) ? v.equipo : [],
    };
  } catch {
    return null;
  }
}

export function guardarProgreso(progreso: Progreso): void {
  try {
    window.sessionStorage.setItem(CLAVE_ALTA, JSON.stringify(progreso));
  } catch {
    // sin almacenamiento: el asistente sigue, sólo que no se podrá reanudar
  }
}

export function borrarProgreso(): void {
  try {
    window.sessionStorage.removeItem(CLAVE_ALTA);
  } catch {
    // nada que borrar
  }
}
