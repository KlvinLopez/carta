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

export interface HuellaInvitado {
  miembro: string;
  sesion: string;
}

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
      return FORMA_ID.test(miembro) && FORMA_ID.test(sesion) ? { miembro, sesion } : null;
    } catch {
      return null;
    }
  },
  guardar(huella) {
    try {
      almacenamiento()?.setItem(CLAVE, JSON.stringify({ miembro: huella.miembro, sesion: huella.sesion }));
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
