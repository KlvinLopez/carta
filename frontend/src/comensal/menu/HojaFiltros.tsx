import { useEffect, useState } from 'react';

import { Boton, Chip, HojaInferior } from '../../compartido/componentes';
import { FILTROS_VACIOS, hayFiltros, nombreDeClave, type Filtros } from './filtros';
import estilos from './Menu.module.css';

export interface PropsHojaFiltros {
  abierta: boolean;
  filtros: Filtros;
  alergenos: string[];
  etiquetas: string[];
  /** Cuántos platillos quedarían con esta selección (la búsqueda de la pantalla sigue aplicada). */
  contar: (f: Filtros) => number;
  onAplicar: (f: Filtros) => void;
  onCerrar: () => void;
}

function alternar(lista: string[], clave: string): string[] {
  return lista.includes(clave) ? lista.filter((c) => c !== clave) : [...lista, clave];
}

/** Filtros por alérgeno y etiqueta, en hoja inferior (AC-05.1). Nada se aplica hasta tocar el botón. */
export function HojaFiltros({ abierta, filtros, alergenos, etiquetas, contar, onAplicar, onCerrar }: PropsHojaFiltros) {
  const [borrador, setBorrador] = useState<Filtros>(filtros);

  useEffect(() => {
    if (abierta) setBorrador(filtros);
    // Sólo al abrir: lo que la persona va marcando no se pisa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  const n = contar(borrador);
  return (
    <HojaInferior abierta={abierta} onCerrar={onCerrar} titulo="Filtrar el menú" descripcion="Se guardan sólo en tu teléfono.">
      <div className={estilos.hojaFiltros}>
        <section aria-labelledby="filtro-alergenos">
          <h3 id="filtro-alergenos" className={estilos.hojaSubtitulo}>
            Sin estos alérgenos
          </h3>
          <div className={estilos.chips} role="group" aria-labelledby="filtro-alergenos">
            {alergenos.map((a) => (
              <Chip key={a} className={estilos.chipFiltro} activo={borrador.alergenos.includes(a)} onClick={() => setBorrador((b) => ({ ...b, alergenos: alternar(b.alergenos, a) }))}>
                {nombreDeClave(a)}
              </Chip>
            ))}
          </div>
        </section>
        <section aria-labelledby="filtro-etiquetas">
          <h3 id="filtro-etiquetas" className={estilos.hojaSubtitulo}>
            Sólo platillos
          </h3>
          <div className={estilos.chips} role="group" aria-labelledby="filtro-etiquetas">
            {etiquetas.map((e) => (
              <Chip key={e} className={estilos.chipFiltro} activo={borrador.etiquetas.includes(e)} onClick={() => setBorrador((b) => ({ ...b, etiquetas: alternar(b.etiquetas, e) }))}>
                {nombreDeClave(e)}
              </Chip>
            ))}
          </div>
        </section>
        <p className={estilos.hojaAviso}>La información de alérgenos la declara el restaurante. Ante cualquier duda, pregunta al personal.</p>
        <div className={estilos.hojaAcciones}>
          <Boton ancho onClick={() => onAplicar(borrador)}>
            {n === 1 ? 'Ver 1 platillo' : `Ver ${n} platillos`}
          </Boton>
          {hayFiltros(borrador) && (
            <Boton ancho variante="fantasma" onClick={() => setBorrador(FILTROS_VACIOS)}>
              Quitar filtros
            </Boton>
          )}
        </div>
      </div>
    </HojaInferior>
  );
}
