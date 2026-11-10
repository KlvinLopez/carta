import { useState, type FormEvent } from 'react';

import { Boton } from '../../compartido/componentes';
import { HojaInferior } from '../../compartido/componentes/HojaInferior';
import { Campo } from '../alta/Campo';
import { errorDeCampo, mensajeDe, tipoDeError } from '../gestion/mensajes';
import c from '../gestion/Gestion.module.css';
import { TOPES_MESAS } from './servicio';

/** Entero estricto de un campo de texto: `''`, `1e2`, `3.5` o `-1` no valen. */
function entero(texto: string): number | null {
  return /^[0-9]{1,6}$/.test(texto.trim()) ? Number(texto.trim()) : null;
}

/** «Agregar mesas»: cuántas y de qué capacidad (AC-21.1). El tope se valida aquí y lo repite el servidor. */
export function HojaAgregarMesas({
  activas,
  alCrear,
  alCerrar,
}: {
  activas: number;
  alCrear: (datos: { cantidad: number; capacidad: number }) => Promise<unknown>;
  alCerrar: () => void;
}) {
  const [cantidad, setCantidad] = useState('4');
  const [capacidad, setCapacidad] = useState('4');
  const [errorCantidad, setErrorCantidad] = useState<string | null>(null);
  const [errorCapacidad, setErrorCapacidad] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const caben = Math.max(0, TOPES_MESAS.activas - activas);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const n = entero(cantidad);
    const p = entero(capacidad);
    const malN =
      n === null || n < 1 || n > TOPES_MESAS.porLlamada
        ? `Escribe un número de 1 a ${TOPES_MESAS.porLlamada}.`
        : n > caben
          ? `Puedes tener hasta ${TOPES_MESAS.activas} mesas activas; te caben ${caben} más.`
          : null;
    const malP = p === null || p < 1 || p > TOPES_MESAS.capacidad ? `Escribe un número de 1 a ${TOPES_MESAS.capacidad}.` : null;
    setErrorCantidad(malN);
    setErrorCapacidad(malP);
    setErrorEnvio(null);
    if (malN || malP || n === null || p === null) return;
    setEnviando(true);
    try {
      await alCrear({ cantidad: n, capacidad: p });
      alCerrar();
    } catch (e) {
      const deCampo = errorDeCampo(e, 'cantidad');
      if (tipoDeError(e) === 'limite_de_mesas' || deCampo) setErrorCantidad(deCampo ?? mensajeDe(e, 'No caben tantas mesas.'));
      else setErrorEnvio(mensajeDe(e, 'No pudimos crear tus mesas. Inténtalo de nuevo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <HojaInferior
      abierta
      onCerrar={alCerrar}
      titulo="Agregar mesas"
      descripcion="Creamos un QR por mesa, numeradas a continuación de las que ya tienes."
    >
      <form className={c.formulario} onSubmit={(e) => void enviar(e)} noValidate>
        <Campo
          etiqueta="Cuántas mesas"
          inputMode="numeric"
          autoComplete="off"
          value={cantidad}
          onChange={(ev) => setCantidad(ev.target.value)}
          error={errorCantidad}
          ayuda={`Hasta ${TOPES_MESAS.porLlamada} por vez.`}
        />
        <Campo
          etiqueta="Lugares por mesa"
          inputMode="numeric"
          autoComplete="off"
          value={capacidad}
          onChange={(ev) => setCapacidad(ev.target.value)}
          error={errorCapacidad}
        />
        {errorEnvio && (
          <p className={c.error} role="alert">
            {errorEnvio}
          </p>
        )}
        <div className={c.accionesHoja}>
          <Boton type="submit" ancho cargando={enviando}>
            Crear mesas
          </Boton>
          <Boton variante="fantasma" ancho onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Boton>
        </div>
      </form>
    </HojaInferior>
  );
}
