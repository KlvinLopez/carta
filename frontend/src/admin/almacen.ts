/**
 * Lo poco que el panel recuerda en el navegador. El ID token propio NUNCA va aquí (vive en
 * memoria, ver `acceso/Sesion.tsx`); Firebase guarda su sesión en IndexedDB por su cuenta.
 * Todo se borra al cerrar sesión: el siguiente usuario del dispositivo no hereda nada.
 */

export const CLAVE_CORREO = 'carta.acceso.correo';
export const CLAVE_RESTAURANTE = 'carta.admin.restaurante';
/** Avance del asistente de alta (T-1.11): ids y paso, nunca el PIN ni el borrador. */
export const CLAVE_ALTA = 'carta.alta.progreso';

/** El correo a medio camino «envié el enlace» → «abrí el enlace» caduca a los 15 minutos. */
export const VIGENCIA_CORREO_MS = 15 * 60 * 1000;

/** Correo guardado para completar el enlace; vive en `sessionStorage` (sólo esta pestaña). */
export function leerCorreoPendiente(ahora: number = Date.now()): string {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE_CORREO);
    if (!crudo) return '';
    const { correo, hasta } = JSON.parse(crudo) as { correo?: unknown; hasta?: unknown };
    if (typeof correo === 'string' && typeof hasta === 'number' && hasta > ahora) return correo;
    window.sessionStorage.removeItem(CLAVE_CORREO);
  } catch {
    // Almacenamiento bloqueado o valor corrupto: se vuelve a pedir el correo.
  }
  return '';
}

export function guardarCorreoPendiente(correo: string | null, ahora: number = Date.now()): void {
  try {
    if (correo) {
      window.sessionStorage.setItem(
        CLAVE_CORREO,
        JSON.stringify({ correo, hasta: ahora + VIGENCIA_CORREO_MS }),
      );
    } else {
      window.sessionStorage.removeItem(CLAVE_CORREO);
    }
  } catch {
    // Ventana privada: se vuelve a pedir el correo.
  }
}

/** Restaurante que se miraba (comodidad por dispositivo; el servidor decide el acceso, AC-15.2). */
export function leerRestauranteElegido(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_RESTAURANTE);
  } catch {
    return null;
  }
}

export function guardarRestauranteElegido(id: string): void {
  try {
    window.localStorage.setItem(CLAVE_RESTAURANTE, id);
  } catch {
    // sin almacenamiento: se vuelve al primero al recargar
  }
}

/** Cierre de sesión: no sobrevive nada de la cuenta anterior. */
export function borrarAlmacenDelPanel(): void {
  try {
    window.sessionStorage.removeItem(CLAVE_CORREO);
    window.sessionStorage.removeItem(CLAVE_ALTA);
    window.localStorage.removeItem(CLAVE_CORREO); // versión anterior guardaba aquí
    window.localStorage.removeItem(CLAVE_RESTAURANTE);
  } catch {
    // nada que borrar si el almacenamiento está bloqueado
  }
}
