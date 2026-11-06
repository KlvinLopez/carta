/** Entrega un `Blob` al navegador como descarga y libera la URL temporal. */
export function guardarComoArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const ancla = document.createElement('a');
  ancla.href = url;
  ancla.download = nombre;
  ancla.rel = 'noopener';
  document.body.appendChild(ancla);
  ancla.click();
  ancla.remove();
  // Margen para que el navegador termine de leer el blob antes de soltarlo.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
