import { useEffect, useState } from 'react';

import { glifoDeClave } from '../../compartido/ilustraciones';
import c from './Menu.module.css';
import type { Platillo } from './tipos';

/** Sólo rutas del propio origen o `https:`: nada de `javascript:`, `data:` ni `http:` (defensa en profundidad). */
export function urlDeFotoSegura(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** La ilustración de la categoría (las 20 claves de T-1.4); sin una conocida, `general`. */
export function IlustracionCategoria({ clave }: { clave: string | null | undefined }) {
  const { clave: usada, glifo } = glifoDeClave(clave);
  return (
    <svg
      viewBox="0 0 48 48"
      className={c.ilustracion}
      data-tono={glifo.tono}
      data-clave={usada}
      aria-hidden="true"
      focusable="false"
    >
      {glifo.trazos.map((t, i) => (
        <path key={i} d={t.d} className={t.estilo === 'suave' ? c.trazoSuave : t.estilo === 'fuerte' ? c.trazoFuerte : c.linea} />
      ))}
    </svg>
  );
}

/**
 * Miniatura cuadrada: la foto del platillo o, sin ella, la ilustración de su categoría. Cae a la
 * ilustración si no hay URL, si el esquema es raro o si la imagen no carga (404, red): nunca un icono roto.
 */
export function Miniatura({ platillo, grande = false }: { platillo: Platillo; grande?: boolean }) {
  const bruta = platillo.imagen_tipo === 'foto' ? (grande ? (platillo.foto_detalle_url ?? platillo.foto_thumb_url) : platillo.foto_thumb_url) : null;
  const foto = urlDeFotoSegura(bruta);
  const [rota, setRota] = useState(false);
  // Una foto nueva (otra URL) merece otro intento.
  useEffect(() => setRota(false), [foto]);
  const mostrarFoto = foto !== null && !rota;
  return (
    <span className={[c.miniatura, grande ? c.miniaturaGrande : ''].filter(Boolean).join(' ')} data-con-foto={mostrarFoto ? 'si' : 'no'}>
      {mostrarFoto ? (
        <img src={foto} alt="" loading="lazy" decoding="async" className={c.fotoMiniatura} onError={() => setRota(true)} />
      ) : (
        <IlustracionCategoria clave={platillo.ilustracion_clave} />
      )}
    </span>
  );
}
