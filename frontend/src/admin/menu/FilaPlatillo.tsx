import { memo, type KeyboardEvent, type PointerEvent } from 'react';

import { Chip } from '../../compartido/componentes';
import { etiquetaLegible } from '../alta/borrador';
import { Interruptor } from './Interruptor';
import c from './Menu.module.css';
import { Miniatura } from './Miniatura';
import { formatearPrecio, type Platillo } from './tipos';

export interface AccionesFila {
  alEditar: (id: string) => void;
  alDisponible: (id: string, valor: boolean) => void;
  alActivo: (id: string, valor: boolean) => void;
  alIniciarArrastre: (evento: PointerEvent<HTMLButtonElement>, id: string) => void;
  alTeclearAsa: (evento: KeyboardEvent<HTMLButtonElement>, id: string) => void;
}

const MAX_ALERGENOS = 3;

/**
 * Una fila del menú. Está memoizada: con 400 platillos, tocar un interruptor sólo repinta su fila
 * (las acciones llegan estables y `ocupado`/`arrastrando` son booleanos, no objetos nuevos).
 */
export const FilaPlatillo = memo(function FilaPlatillo({
  platillo,
  ocupado,
  reordenable,
  arrastrando,
  acciones,
}: {
  platillo: Platillo;
  ocupado: boolean;
  reordenable: boolean;
  arrastrando: boolean;
  acciones: AccionesFila;
}) {
  const { id, nombre } = platillo;
  const alergenos = platillo.alergenos.slice(0, MAX_ALERGENOS);
  const restantes = platillo.alergenos.length - alergenos.length;
  const clases = [c.fila, arrastrando ? c.arrastrando : '', !platillo.disponible || !platillo.activo ? c.apagada : '']
    .filter(Boolean)
    .join(' ');
  return (
    <li className={clases} data-fila="" data-id={id}>
      <div className={c.principal}>
        {reordenable && (
          <button
            type="button"
            className={c.asa}
            data-asa={id}
            aria-label={`Reordenar ${nombre}`}
            aria-describedby="ayuda-reordenar"
            onPointerDown={(ev) => acciones.alIniciarArrastre(ev, id)}
            onKeyDown={(ev) => acciones.alTeclearAsa(ev, id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={c.iconoAsa}>
              <circle cx="9" cy="6" r="1.6" />
              <circle cx="15" cy="6" r="1.6" />
              <circle cx="9" cy="12" r="1.6" />
              <circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="18" r="1.6" />
              <circle cx="15" cy="18" r="1.6" />
            </svg>
          </button>
        )}
        <Miniatura platillo={platillo} />
        <button type="button" className={c.cuerpo} aria-label={`Editar ${nombre}`} onClick={() => acciones.alEditar(id)}>
          <span className={c.nombre}>{nombre}</span>
          <span className={c.precio}>{formatearPrecio(platillo.precio)}</span>
          {(alergenos.length > 0 || !platillo.disponible) && (
            <span className={c.etiquetas}>
              {!platillo.disponible && <Chip tono="error">Agotado</Chip>}
              {alergenos.map((a) => (
                <Chip key={a}>{etiquetaLegible(a)}</Chip>
              ))}
              {restantes > 0 && <Chip>+{restantes}</Chip>}
            </span>
          )}
        </button>
      </div>
      <div className={c.controles}>
        <Interruptor
          etiqueta="Disponible"
          platillo={nombre}
          activo={platillo.disponible}
          ocupado={ocupado}
          alCambiar={(valor) => acciones.alDisponible(id, valor)}
        />
        <Interruptor
          etiqueta="Activo"
          platillo={nombre}
          activo={platillo.activo}
          ocupado={ocupado}
          alCambiar={(valor) => acciones.alActivo(id, valor)}
        />
      </div>
    </li>
  );
});
