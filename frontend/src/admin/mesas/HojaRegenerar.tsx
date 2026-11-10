import { useState } from 'react';

import { Boton } from '../../compartido/componentes';
import { HojaInferior } from '../../compartido/componentes/HojaInferior';
import { mensajeDe } from '../gestion/mensajes';
import c from '../gestion/Gestion.module.css';

/** Confirmación de «Regenerar código» (AC-21.3): el QR impreso deja de servir al instante. */
export function HojaRegenerar({
  numero,
  alConfirmar,
  alCerrar,
}: {
  numero: number;
  alConfirmar: () => Promise<unknown>;
  alCerrar: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      await alConfirmar();
      alCerrar();
    } catch (e) {
      setError(mensajeDe(e, 'No pudimos regenerar el código. Inténtalo de nuevo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <HojaInferior
      abierta
      onCerrar={alCerrar}
      titulo={`¿Regenerar el código de la mesa ${numero}?`}
      descripcion="El QR impreso de esta mesa dejará de servir. Descarga el PDF y pega el nuevo."
    >
      {error && (
        <p className={c.error} role="alert">
          {error}
        </p>
      )}
      <div className={c.accionesHoja}>
        <Boton ancho cargando={enviando} onClick={() => void confirmar()}>
          Regenerar código
        </Boton>
        <Boton variante="fantasma" ancho onClick={alCerrar} disabled={enviando}>
          Mejor no
        </Boton>
      </div>
    </HojaInferior>
  );
}
