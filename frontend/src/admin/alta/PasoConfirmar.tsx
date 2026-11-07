import { useState } from 'react';

import { Boton } from '../../compartido/componentes';
import { ErrorApi } from '../../compartido/http';
import c from './Alta.module.css';
import { aResultado, categoriasConPlatillos, contarPlatillos, preciosPorRevisar, validar, type Borrador } from './borrador';
import type { ServicioAlta } from './servicio';
import type { Importacion, Restaurante } from './tipos';

/** Paso 4 · Confirmar: aquí, y sólo aquí, el borrador pasa a ser el menú (INV-9). */
export default function PasoConfirmar({
  servicio,
  restaurante,
  importacion,
  borrador,
  alVolver,
  alConfirmar,
}: {
  servicio: ServicioAlta;
  restaurante: Restaurante;
  importacion: Importacion;
  borrador: Borrador;
  alVolver: () => void;
  /** `yaConfirmada`: el 409 se resolvió porque otra pestaña (o un toque anterior) ya la había confirmado. */
  alConfirmar: (yaConfirmada: boolean) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const platillos = contarPlatillos(borrador);
  const porRevisar = preciosPorRevisar(borrador);
  const hayProblemas = validar(borrador).length > 0;

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      await servicio.confirmarImportacion(restaurante.id, importacion.id, aResultado(borrador));
      alConfirmar(false);
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 409) {
        // Un toque doble o una respuesta perdida: si ya quedó confirmada, seguimos.
        try {
          const actual = await servicio.consultarImportacion(restaurante.id, importacion.id);
          if (actual.estado === 'confirmado') {
            alConfirmar(true);
            return;
          }
        } catch {
          // se cae al mensaje del 409
        }
      }
      setError(e instanceof ErrorApi ? e.message : 'No pudimos crear tu menú. Inténtalo de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <section className={c.paso} aria-labelledby="titulo-confirmar">
      <header className={c.encabezadoPaso}>
        <h2 id="titulo-confirmar" className={c.tituloPaso}>
          ¿Todo listo para crear tu menú?
        </h2>
        <p className={c.textoPaso}>Al confirmar, esto es lo que verán tus comensales. Podrás editarlo cuando quieras.</p>
      </header>
      <dl className={c.resumen}>
        <div>
          <dt>Categorías</dt>
          <dd>{categoriasConPlatillos(borrador).length}</dd>
        </div>
        <div>
          <dt>Platillos</dt>
          <dd>{platillos}</dd>
        </div>
      </dl>
      {porRevisar > 0 && (
        <p className={c.aviso} role="note">
          Aún tienes {porRevisar} {porRevisar === 1 ? 'precio sin revisar' : 'precios sin revisar'}. Puedes confirmar y
          corregirlos después, pero conviene mirarlos ahora.
        </p>
      )}
      {error && (
        <p className={c.mensajeError} role="alert">
          {error}
        </p>
      )}
      <div className={c.acciones}>
        <Boton ancho cargando={enviando} disabled={hayProblemas} onClick={() => void confirmar()}>
          Confirmar y crear mi menú
        </Boton>
        <Boton ancho variante="fantasma" disabled={enviando} onClick={alVolver}>
          Seguir editando
        </Boton>
      </div>
    </section>
  );
}
