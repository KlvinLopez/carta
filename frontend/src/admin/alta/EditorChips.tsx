import { useId, useState, type KeyboardEvent } from 'react';

import c from './Alta.module.css';
import { etiquetaLegible, normalizarClave } from './borrador';
import { TOPES } from './tipos';

/** Alérgenos y etiquetas como chips: se quitan con la × y se agregan con Enter o «Agregar». */
export function EditorChips({
  etiqueta,
  valores,
  sugerencias,
  alCambiar,
  tono,
}: {
  etiqueta: string;
  valores: string[];
  sugerencias: string[];
  alCambiar: (valores: string[]) => void;
  tono: 'alergeno' | 'etiqueta';
}) {
  const id = useId();
  const [texto, setTexto] = useState('');
  // Las sugerencias sólo aparecen al trabajar en este campo: repetidas en cada platillo alargarían la tabla.
  const [enfocado, setEnfocado] = useState(false);
  const lleno = valores.length >= TOPES.sugeridos;
  const faltantes = sugerencias.filter((s) => !valores.includes(s));

  function agregar(crudo: string) {
    const clave = normalizarClave(crudo);
    if (!clave || valores.includes(clave) || lleno) {
      setTexto('');
      return;
    }
    alCambiar([...valores, clave]);
    setTexto('');
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Enter' || evento.key === ',') {
      evento.preventDefault();
      agregar(texto);
    }
  }

  return (
    <div
      className={c.chipsBloque}
      onFocus={() => setEnfocado(true)}
      onBlur={(ev) => {
        if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setEnfocado(false);
      }}
    >
      <label htmlFor={id} className={c.etiqueta}>
        {etiqueta}
      </label>
      <ul className={c.chips} aria-label={etiqueta}>
        {valores.map((valor) => (
          <li key={valor} className={[c.chip, tono === 'alergeno' ? c.chipAlergeno : c.chipEtiqueta].join(' ')}>
            <span>{etiquetaLegible(valor)}</span>
            <button
              type="button"
              className={c.quitarChip}
              aria-label={`Quitar ${etiquetaLegible(valor)} de ${etiqueta.toLowerCase()}`}
              onClick={() => alCambiar(valores.filter((v) => v !== valor))}
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={c.agregarChip}>
        <input
          id={id}
          className={c.entrada}
          value={texto}
          onChange={(ev) => setTexto(ev.target.value)}
          onKeyDown={alTeclear}
          maxLength={TOPES.claveLargo}
          placeholder="Escribe y presiona Enter"
          disabled={lleno}
          autoComplete="off"
        />
        <button
          type="button"
          className={c.botonSecundarioChico}
          onClick={() => agregar(texto)}
          disabled={!texto.trim() || lleno}
        >
          Agregar
        </button>
      </div>
      {enfocado && faltantes.length > 0 && !lleno && (
        <ul className={c.sugerencias} aria-label={`Sugerencias de ${etiqueta.toLowerCase()}`}>
          {faltantes.map((s) => (
            <li key={s}>
              <button type="button" className={c.sugerencia} onClick={() => agregar(s)}>
                + {etiquetaLegible(s)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
