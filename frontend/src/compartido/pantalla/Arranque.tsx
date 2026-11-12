/**
 * Lo mismo que `index.html` pinta antes de que llegue el JS (`.arranque`, en base.css): el relevo entre el HTML y
 * React no cambia nada a la vista. Va oculto a lectores de pantalla (cada área anuncia su propio estado de carga:
 * un anuncio doble sería ruido).
 */
export function Arranque() {
  return (
    <div className="arranque" aria-hidden="true">
      <p className="arranque-marca">Carta</p>
      <p className="arranque-texto">Un momento…</p>
    </div>
  );
}
