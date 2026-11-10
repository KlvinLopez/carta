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
  // iOS Safari suele abrir el PDF en una pestaña en lugar de descargarlo: revocar enseguida rompería esa
  // vista. Se suelta al salir de la página o, a más tardar, a los 60 s.
  const soltar = () => URL.revokeObjectURL(url);
  window.addEventListener('pagehide', soltar, { once: true });
  setTimeout(() => {
    window.removeEventListener('pagehide', soltar);
    soltar();
  }, 60_000);
}
