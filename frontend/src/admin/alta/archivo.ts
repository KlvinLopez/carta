/** Comprobaciones del archivo de la carta antes de subirlo (AC-25.1: PDF o imagen, ≤ 20 MB). */

export const TAMANO_MAXIMO = 20 * 1024 * 1024;
export const TIPOS_ACEPTADOS = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const EXTENSIONES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
/** Para el atributo `accept` del selector. */
export const ACEPTAR = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

/** Texto de error para el operador, o `null` si el archivo puede subirse. */
export function validarArchivo(archivo: Pick<File, 'name' | 'size' | 'type'>): string | null {
  if (archivo.size === 0) return 'Este archivo está vacío. Elige otro.';
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
  const tipo = archivo.type || EXTENSIONES[extension] || '';
  if (!(TIPOS_ACEPTADOS as readonly string[]).includes(tipo)) {
    return 'Sólo podemos leer cartas en PDF, JPG o PNG.';
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return 'El archivo pesa más de 20 MB. Comprímelo o sube sólo las páginas de la carta.';
  }
  return null;
}

export function pesoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
