import { memo, useEffect, useState } from 'react';

import { Ilustracion } from '../../compartido/componentes';
import estilos from './Menu.module.css';
import type { PlatilloPublico } from './servicioMenu';

/** Sólo rutas del propio origen o `https:`: nada de `javascript:`, `data:` ni `http:`. */
export function urlDeFotoSegura(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * La foto del platillo (miniatura, carga diferida, con el tamaño reservado por el contenedor: sin saltos
 * de diseño) o, sin ella, la ilustración de su categoría. Si la foto no carga, también la ilustración:
 * nunca un icono roto.
 */
export const ImagenPlatillo = memo(function ImagenPlatillo({ platillo, proporcion }: { platillo: PlatilloPublico; proporcion: 'cuadrada' | 'ancha' }) {
  const foto = platillo.imagen_tipo === 'foto' ? urlDeFotoSegura(platillo.foto_thumb_url) : null;
  const [rota, setRota] = useState(false);
  useEffect(() => setRota(false), [foto]);
  const conFoto = foto !== null && !rota;
  return (
    <span className={`${estilos.imagen} ${proporcion === 'ancha' ? estilos.imagenAncha : estilos.imagenCuadrada}`} data-con-foto={conFoto ? 'si' : 'no'}>
      {conFoto ? (
        <img src={foto} alt="" loading="lazy" decoding="async" width={proporcion === 'ancha' ? 240 : 96} height={proporcion === 'ancha' ? 180 : 96} className={estilos.foto} onError={() => setRota(true)} />
      ) : (
        <Ilustracion clave={platillo.ilustracion_clave} />
      )}
    </span>
  );
});
