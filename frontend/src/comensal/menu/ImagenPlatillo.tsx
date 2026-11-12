import { memo, useState } from 'react';

import { Ilustracion } from '../../compartido/componentes';
import estilos from './Menu.module.css';
import type { PlatilloPublico } from './servicioMenu';

/**
 * Sólo `https:` o el propio origen con una ruta que no sea de la API: nada de `javascript:`, `data:`,
 * `http:` ajeno, barras invertidas (el navegador las lee como `/`), `//host` ni `/api/…` (se pediría como
 * imagen, con la cookie). Defensa en profundidad: hoy la URL la genera el servidor. `origen` es el de la
 * página (las pruebas lo fijan en `https:` porque jsdom sirve desde `http:`).
 */
export function urlDeFotoSegura(url: string | null | undefined, origen: string = window.location.origin): string | null {
  if (!url || url.includes('\\') || url.startsWith('//')) return null;
  try {
    const u = new URL(url, origen);
    if (u.username || u.password) return null;
    if (u.origin === origen) return u.pathname.startsWith('/api/') ? null : url;
    return u.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

// React 18 no conoce la prop `fetchPriority` (llegó en React 19) y avisa en consola; el atributo HTML en minúsculas sí lo lee el navegador.
const ATRIBUTOS_PRIORIDAD = { fetchpriority: 'high' };

/**
 * La foto del platillo (miniatura, carga diferida salvo las de la primera pantalla (`prioridad`: `eager` y
 * `fetchpriority="high"`, para que la LCP no espere al desplazamiento ni a la cola de imágenes), con el tamaño reservado por el contenedor: sin saltos
 * de diseño) o, sin ella, la ilustración de su categoría. Si la foto no carga, también la ilustración:
 * nunca un icono roto.
 */
export const ImagenPlatillo = memo(function ImagenPlatillo({ platillo, proporcion, prioridad = false }: { platillo: PlatilloPublico; proporcion: 'cuadrada' | 'ancha'; prioridad?: boolean }) {
  const foto = platillo.imagen_tipo === 'foto' ? urlDeFotoSegura(platillo.foto_thumb_url) : null;
  // Se recuerda cuál foto falló: otra URL merece otro intento, sin efectos que corran tarde.
  const [rota, setRota] = useState<string | null>(null);
  const conFoto = foto !== null && rota !== foto;
  return (
    <span className={`${estilos.imagen} ${proporcion === 'ancha' ? estilos.imagenAncha : estilos.imagenCuadrada}`} data-con-foto={conFoto ? 'si' : 'no'}>
      {conFoto ? (
        <img src={foto} alt="" loading={prioridad ? 'eager' : 'lazy'} {...(prioridad ? ATRIBUTOS_PRIORIDAD : {})} decoding="async" width={proporcion === 'ancha' ? 240 : 96} height={proporcion === 'ancha' ? 180 : 96} className={estilos.foto} referrerPolicy="no-referrer" onError={() => setRota(foto)} />
      ) : (
        <Ilustracion clave={platillo.ilustracion_clave} />
      )}
    </span>
  );
});
