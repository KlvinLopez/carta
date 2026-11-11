/** El precio como lo lee un comensal: «$145.00». El menú viene en pesos (v1 es de un solo país). */
export function formatearPrecio(precio: number | string): string {
  const valor = Number(precio);
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number.isFinite(valor) ? valor : 0);
}
