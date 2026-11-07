import { useId, useState, type KeyboardEvent } from 'react';

import c from './Alta.module.css';
import { etiquetaLegible, largo, normalizarClave } from './borrador';
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
  const [aviso, setAviso] = useState<string | null>(null);
  const lleno = valores.length >= TOPES.sugeridos;
  const faltantes = sugerencias.filter((s) => !valores.includes(s));

  function agregar(crudo: string) {
    // «Lácteos, huevo» pegado de una vez se parte en dos chips.
    const partes = crudo.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
    const nuevos = [...valores];
    const avisos: string[] = [];
    for (const parte of partes) {
      const clave = normalizarClave(parte);
      if (!clave) {
        avisos.push(`No pudimos usar «${parte}»: escribe con letras (a–z) o números.`);
      } else if (nuevos.includes(clave)) {
        // repetida: se ignora en silencio
      } else if (nuevos.length >= TOPES.sugeridos) {
        avisos.push(`Máximo ${TOPES.sugeridos} por platillo: «${parte}» no se agregó.`);
      } else {
        if (largo(parte) > TOPES.claveLargo) avisos.push(`«${parte.slice(0, 20)}…» se acortó a ${TOPES.claveLargo} letras.`);
        nuevos.push(clave);
      }
    }
    if (nuevos.length !== valores.length) alCambiar(nuevos);
    setAviso(avisos.join(' ') || null);
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
      {aviso && (
        <p className={c.ayuda} role="status">
          {aviso}
        </p>
      )}
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
