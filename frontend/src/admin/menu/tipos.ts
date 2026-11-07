import type { components } from '../../compartido/api';

export type Categoria = components['schemas']['CategoriaRespuesta'];
export type Platillo = components['schemas']['PlatilloRespuesta'];
export type CambiosPlatillo = components['schemas']['PlatilloCambios'];
type Crear = components['schemas']['PlatilloCrear'];
/** El generador marca como obligatorios los campos con valor por defecto; el servidor los completa. */
export type PlatilloNuevo = Omit<Crear, 'nivel_picante' | 'destacado' | 'disponible'> &
  Partial<Pick<Crear, 'nivel_picante' | 'destacado' | 'disponible'>>;

/** Topes del contrato (`app/schemas/menu.py`); el servidor repite todas estas validaciones. */
export const TOPES_MENU = {
  nombre: 200,
  descripcion: 1000,
  /** `limit` máximo de las listas del operador (`Limit` en `app/api/admin/menu.py`). */
  pagina: 100,
  /** Tope de páginas que se piden de corrido (2 000 platillos): una guarda contra un bucle infinito. */
  paginasMaximas: 20,
  /** Lo que acepta `POST …/foto` (T-1.4): se reduce en el navegador antes de subir. */
  fotoMaxBytes: 15 * 1024 * 1024,
  fotoLado: 2048,
} as const;

/** Un platillo se identifica en pantalla por su nombre sin acentos ni mayúsculas (búsqueda). */
export function claveBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function formatearPrecio(precio: number | string): string {
  const valor = Number(precio);
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    Number.isFinite(valor) ? valor : 0,
  );
}
