/** El PIN del servidor: de 4 a 6 dígitos ASCII (`^[0-9]{4,6}$`). Nada se normaliza ni se «arregla». */
export const PIN_VALIDO = /^[0-9]{4,6}$/;

/**
 * Error de cliente para un PIN (o `null` si vale). Mismo criterio que el servidor: cualquier carácter que
 * no sea un dígito ASCII —«١٢٣٤», «１２３４», espacios, letras— se rechaza en vez de convertirse.
 */
export function errorDePin(pin: string): string | null {
  if (PIN_VALIDO.test(pin)) return null;
  return /[^0-9]/.test(pin) ? 'El PIN sólo lleva números del 0 al 9.' : 'El PIN lleva de 4 a 6 números.';
}
