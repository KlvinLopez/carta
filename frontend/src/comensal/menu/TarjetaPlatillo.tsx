import { memo } from 'react';

import { Chip, Tarjeta } from '../../compartido/componentes';
import { nombreDeClave } from './filtros';
import { ImagenPlatillo } from './ImagenPlatillo';
import estilos from './Menu.module.css';
import { formatearPrecio } from './precio';
import type { PlatilloPublico } from './servicioMenu';

export interface PropsTarjetaPlatillo {
  platillo: PlatilloPublico;
  /** `fila` en la lista; `destacado` en el «Top 3 del chef». */
  variante?: 'fila' | 'destacado';
  /**
   * Abre el platillo (el detalle llega con T-2.6). Sin esta función la tarjeta es sólo lectura. Un
   * platillo agotado nunca se abre, aunque se pase.
   */
  onAbrir?: (id: string) => void;
}

/** Un platillo: foto o ilustración, nombre, descripción, precio (DM Sans SemiBold) y etiquetas. */
export const TarjetaPlatillo = memo(function TarjetaPlatillo({ platillo, variante = 'fila', onAbrir }: PropsTarjetaPlatillo) {
  const agotado = !platillo.disponible;
  const abrir = !agotado && onAbrir ? () => onAbrir(platillo.id) : undefined;
  const cuerpo = (
    <div className={`${estilos.platillo} ${variante === 'destacado' ? estilos.platilloDestacado : ''}`} data-agotado={agotado ? 'si' : 'no'}>
      <ImagenPlatillo platillo={platillo} proporcion={variante === 'destacado' ? 'ancha' : 'cuadrada'} />
      <div className={estilos.platilloTexto}>
        <h3 className={estilos.platilloNombre}>{platillo.nombre}</h3>
        {platillo.descripcion && <p className={estilos.platilloDescripcion}>{platillo.descripcion}</p>}
        <div className={estilos.platilloPie}>
          <span className={estilos.precio}>{formatearPrecio(platillo.precio)}</span>
          {agotado && <Chip>Agotado hoy</Chip>}
          {platillo.etiquetas.slice(0, 3).map((e) => (
            <Chip key={e} tono="exito">
              {nombreDeClave(e)}
            </Chip>
          ))}
        </div>
        {platillo.alergenos.length > 0 && variante === 'fila' && (
          <p className={estilos.alergenosDelPlatillo}>Contiene: {platillo.alergenos.map(nombreDeClave).join(', ')}</p>
        )}
      </div>
    </div>
  );
  return (
    <Tarjeta ajustada onClick={abrir} className={estilos.tarjetaPlatillo} aria-label={abrir ? `Ver ${platillo.nombre}` : undefined}>
      {cuerpo}
    </Tarjeta>
  );
});
