/** Mínimo de caracteres para buscar (AC-06.1). */
export const MINIMO_BUSQUEDA = 2;

/** Sin acentos ni mayúsculas ni espacios de más: «Piña  Colada» y «pina colada» son lo mismo. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** La consulta lista para comparar, o `null` si todavía es demasiado corta para buscar. */
export function consultaEfectiva(escrito: string): string | null {
  const q = normalizar(escrito);
  return [...q].length >= MINIMO_BUSQUEDA ? q : null;
}

/** Cada palabra de la consulta debe aparecer (en cualquier orden) en el nombre o la descripción. */
export function coincide(pajar: string, consulta: string): boolean {
  return consulta.split(' ').every((palabra) => pajar.includes(palabra));
}

/** Lo que se busca de un platillo, normalizado una sola vez al cargar el menú. */
export function pajarDe(nombre: string, descripcion: string | null | undefined): string {
  return normalizar(`${nombre} ${descripcion ?? ''}`);
}
