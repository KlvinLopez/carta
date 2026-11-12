/**
 * Lo mismo que `index.html` pinta antes de que llegue el JS (`.arranque`, en base.css): el relevo entre el HTML y
 * React no cambia nada a la vista. Diferencias permitidas (y vigiladas por `esqueleto.test.ts`): aquí no está el
 * bloque de ayuda (sólo tiene sentido si el JS no llegó) y el contenedor es un `role="status"` legible: el HTML
 * oculta la marca a los lectores de pantalla, pero este es el estado de carga de `/m` y `/staff` y se anuncia.
 */
export function Arranque() {
  return (
    <div className="arranque" role="status" aria-live="polite">
      <p className="arranque-marca">Carta</p>
      <p className="arranque-texto">Un momento…</p>
    </div>
  );
}
