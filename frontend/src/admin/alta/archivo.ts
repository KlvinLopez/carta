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

const FIRMAS: { tipo: string; bytes: number[] }[] = [
  { tipo: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { tipo: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { tipo: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

/** Primeros bytes del archivo (FileReader si `Blob.arrayBuffer` no existe). */
export async function cabecera(archivo: Blob): Promise<Uint8Array> {
  const trozo = archivo.slice(0, 8);
  if (typeof trozo.arrayBuffer === 'function') return new Uint8Array(await trozo.arrayBuffer());
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(new Uint8Array(lector.result as ArrayBuffer));
    lector.onerror = () => rechazar(lector.error);
    lector.readAsArrayBuffer(trozo);
  });
}

/**
 * Comprueba que el contenido es de verdad un PDF, JPG o PNG (la extensión y el `type` los pone quien
 * sube). El servidor vuelve a validarlo (T-1.9): esto sólo evita subir 20 MB para un rechazo seguro.
 */
export async function validarFirma(archivo: Blob): Promise<string | null> {
  try {
    const inicio = await cabecera(archivo);
    const coincide = FIRMAS.some(({ bytes }) => bytes.every((b, i) => inicio[i] === b));
    return coincide ? null : 'Este archivo no parece ser un PDF, JPG o PNG. Elige otro.';
  } catch {
    return 'No pudimos leer este archivo. Elige otro.';
  }
}

/** ¿Empieza con `%PDF-`? (un QR servido como octet-stream). */
export async function empiezaConPdf(blob: Blob): Promise<boolean> {
  try {
    const inicio = await cabecera(blob);
    return FIRMAS[0]!.bytes.every((b, i) => inicio[i] === b);
  } catch {
    return false;
  }
}
