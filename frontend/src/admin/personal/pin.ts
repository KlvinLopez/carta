export const PIN_VALIDO = /^[0-9]{4,6}$/;

/** Dígitos de cualquier escritura (１２３４, ١٢٣٤) → ASCII; todo lo demás se descarta. */
export function soloDigitosAscii(texto: string): string {
  let salida = '';
  for (const caracter of texto.normalize('NFKC')) {
    if (/[0-9]/.test(caracter)) {
      salida += caracter;
    } else if (/\p{Nd}/u.test(caracter)) {
      // Los dígitos Unicode vienen en tandas contiguas de diez que empiezan en el cero.
      let cero = caracter.codePointAt(0)!;
      while (/\p{Nd}/u.test(String.fromCodePoint(cero - 1))) cero -= 1;
      salida += String((caracter.codePointAt(0)! - cero) % 10);
    }
  }
  return salida;
}
