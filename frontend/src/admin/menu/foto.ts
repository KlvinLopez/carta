import { TOPES_MENU } from './tipos';

/** Una imagen ya decodificada por el navegador, lista para dibujarse en un `canvas`. */
export interface ImagenLeida {
  fuente: CanvasImageSource;
  ancho: number;
  alto: number;
  liberar(): void;
}

export interface Recorte {
  /** Esquina superior izquierda y lado (en píxeles de la imagen original) del cuadrado que se conserva. */
  x: number;
  y: number;
  lado: number;
  /** Lado del JPEG que se sube: nunca más que `TOPES_MENU.fotoLado` ni más que el recorte. */
  salida: number;
}

const TIPOS = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const EXTENSIONES = /\.(jpe?g|png|heic|heif)$/i;

/** ¿Es un JPG, PNG o HEIC? (iOS a veces entrega el HEIC sin tipo MIME, por eso también la extensión). */
export function esFotoValida(archivo: File): boolean {
  return TIPOS.includes(archivo.type.toLowerCase()) || (archivo.type === '' && EXTENSIONES.test(archivo.name));
}

/**
 * El cuadrado de la foto que se conserva. `posicion` (0–1) desplaza el recorte a lo largo del lado
 * largo: 0 = principio, 0.5 = centro, 1 = final. En una foto ya cuadrada no hay nada que mover.
 */
export function calcularRecorte(ancho: number, alto: number, posicion = 0.5): Recorte {
  const lado = Math.max(1, Math.min(ancho, alto));
  const p = Math.min(1, Math.max(0, Number.isFinite(posicion) ? posicion : 0.5));
  const x = ancho > alto ? Math.round((ancho - lado) * p) : 0;
  const y = alto > ancho ? Math.round((alto - lado) * p) : 0;
  return { x, y, lado, salida: Math.min(lado, TOPES_MENU.fotoLado) };
}

/** Dibuja el recorte en el lienzo (vista previa o archivo final). */
export function dibujarRecorte(lienzo: HTMLCanvasElement, imagen: ImagenLeida, posicion: number, lado: number): boolean {
  const ctx = lienzo.getContext('2d');
  if (!ctx) return false;
  const r = calcularRecorte(imagen.ancho, imagen.alto, posicion);
  lienzo.width = lado;
  lienzo.height = lado;
  ctx.drawImage(imagen.fuente, r.x, r.y, r.lado, r.lado, 0, 0, lado, lado);
  return true;
}

/** Decodifica con el navegador; `null` si no puede (p. ej. un HEIC en Chrome): se sube tal cual. */
export async function leerImagen(archivo: File): Promise<ImagenLeida | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      const mapa = await createImageBitmap(archivo);
      return { fuente: mapa, ancho: mapa.width, alto: mapa.height, liberar: () => mapa.close() };
    }
    const url = URL.createObjectURL(archivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, liberar: () => undefined };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

/** El JPEG cuadrado (≤ 2048 px) que se sube; `null` si el navegador no pudo producirlo. */
export function exportarRecorte(imagen: ImagenLeida, posicion: number): Promise<Blob | null> {
  const lienzo = document.createElement('canvas');
  const { salida } = calcularRecorte(imagen.ancho, imagen.alto, posicion);
  if (!dibujarRecorte(lienzo, imagen, posicion, salida)) return Promise.resolve(null);
  return new Promise((resolver) => lienzo.toBlob((b) => resolver(b), 'image/jpeg', 0.9));
}

/** Nombre del archivo que viaja: el original con extensión `.jpg` una vez recortado. */
export function nombreRecortado(archivo: File): string {
  const base = archivo.name.replace(/\.[^.]+$/, '') || 'platillo';
  return `${base}.jpg`;
}
