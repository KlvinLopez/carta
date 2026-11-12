/**
 * Espejo local de la identidad de invitado (AC-01.4).
 *
 * La identidad real es la cookie `carta_invitado` (HttpOnly: la app no la ve). Esto es sólo un
 * recordatorio en el teléfono de **quién fue** el invitado en la última visita —ids opacos, sin
 * alias, sin el código de la mesa— para saber si el servidor nos reconoció o creó un comensal
 * nuevo. Nada de esto es un dato personal. Con `localStorage` bloqueado (modo privado de Safari)
 * todo sigue funcionando sin el espejo.
 */
const CLAVE = 'carta:invitado:v1';
const FORMA_ID = /^[0-9A-Za-z-]{1,64}$/;
/** Forma del `slug` público del restaurante (el mismo que lleva la URL del menú público). */
const FORMA_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface HuellaInvitado {
  miembro: string;
  sesion: string;
  /**
   * `slug` del restaurante de la última visita (T-2.7): no es un dato personal (es público, va en la URL del
   * menú) y permite mostrar la última copia del menú si la entrada falla por falta de red.
   */
  slug?: string;
  /**
   * Huella de la mesa de esa visita (`marcaDeMesa`): sólo se muestra la copia del menú si coincide con la
   * del código que se abrió ahora, para no ofrecer el menú de otro restaurante.
   */
  mesa?: string;
}

/**
 * Huella corta del código de mesa (cyrb53). El código es una credencial y **no** se guarda: esto es un
 * resumen de 53 bits de un valor de 128, que no permite recuperarlo ni entrar a la mesa.
 */
export function marcaDeMesa(codigo: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < codigo.length; i += 1) {
    const c = codigo.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
const FORMA_MARCA = /^[0-9a-f]{1,14}$/;

export interface Espejo {
  leer(): HuellaInvitado | null;
  guardar(huella: HuellaInvitado): void;
  olvidar(): void;
}

function almacenamiento(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // acceder a `localStorage` puede lanzar con el sitio bloqueado
  }
}

export const espejoLocal: Espejo = {
  leer() {
    try {
      const crudo = almacenamiento()?.getItem(CLAVE);
      if (!crudo) return null;
      const v: unknown = JSON.parse(crudo);
      if (typeof v !== 'object' || v === null) return null;
      const { miembro, sesion } = v as Record<string, unknown>;
      if (typeof miembro !== 'string' || typeof sesion !== 'string') return null;
      // Lo guardado puede estar manipulado o venir de otra versión: sólo ids con forma de id.
      if (!FORMA_ID.test(miembro) || !FORMA_ID.test(sesion)) return null;
      const { slug, mesa } = v as Record<string, unknown>;
      const conCopia = typeof slug === 'string' && slug.length <= 80 && FORMA_SLUG.test(slug) && typeof mesa === 'string' && FORMA_MARCA.test(mesa);
      return conCopia ? { miembro, sesion, slug, mesa } : { miembro, sesion };
    } catch {
      return null;
    }
  },
  guardar(huella) {
    try {
      almacenamiento()?.setItem(CLAVE, JSON.stringify({ miembro: huella.miembro, sesion: huella.sesion, slug: huella.slug, mesa: huella.mesa }));
    } catch {
      // Cuota llena o modo privado: se sigue sin espejo.
    }
  },
  olvidar() {
    try {
      almacenamiento()?.removeItem(CLAVE);
    } catch {
      // Igual.
    }
  },
};
