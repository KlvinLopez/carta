import c from './Menu.module.css';
import type { Platillo } from './tipos';

type Glifo = 'plato' | 'vaso' | 'postre';

/** La ilustración de la categoría (T-1.4 sirve la clave); sin una conocida, el plato. */
function glifoDe(clave: string | null | undefined): Glifo {
  const k = (clave ?? '').toLowerCase();
  if (/beb|jugo|agua|cerv|vino|cafe|licuado|coctel/.test(k)) return 'vaso';
  if (/postre|dulce|helado|pastel|flan/.test(k)) return 'postre';
  return 'plato';
}

function Ilustracion({ glifo }: { glifo: Glifo }) {
  return (
    <svg viewBox="0 0 48 48" className={c.ilustracion} aria-hidden="true" focusable="false">
      {glifo === 'plato' && (
        <>
          <circle cx="24" cy="26" r="15" className={c.trazoSuave} />
          <circle cx="24" cy="26" r="9" className={c.trazoFuerte} />
          <path d="M8 8v10M12 8v10M16 8v10M12 18v8" className={c.linea} />
        </>
      )}
      {glifo === 'vaso' && (
        <>
          <path d="M14 10h20l-3 28a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" className={c.trazoSuave} />
          <path d="M16 20h16" className={c.linea} />
          <path d="M27 6l-3 8" className={c.linea} />
        </>
      )}
      {glifo === 'postre' && (
        <>
          <path d="M10 28h28l-3 12H13z" className={c.trazoSuave} />
          <path d="M14 28c0-8 4-12 10-12s10 4 10 12" className={c.trazoFuerte} />
          <circle cx="24" cy="12" r="3" className={c.trazoFuerte} />
        </>
      )}
    </svg>
  );
}

/** Miniatura cuadrada: la foto del platillo o, sin ella, la ilustración de su categoría. */
export function Miniatura({ platillo, grande = false }: { platillo: Platillo; grande?: boolean }) {
  const foto = platillo.imagen_tipo === 'foto' ? (grande ? platillo.foto_detalle_url ?? platillo.foto_thumb_url : platillo.foto_thumb_url) : null;
  return (
    <span className={[c.miniatura, grande ? c.miniaturaGrande : ''].filter(Boolean).join(' ')} data-con-foto={foto ? 'si' : 'no'}>
      {foto ? (
        <img src={foto} alt="" loading="lazy" decoding="async" className={c.fotoMiniatura} />
      ) : (
        <Ilustracion glifo={glifoDe(platillo.ilustracion_clave)} />
      )}
    </span>
  );
}
