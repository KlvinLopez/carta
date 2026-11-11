import { glifoDeClave } from '../ilustraciones';
import estilos from './Ilustracion.module.css';

/**
 * La ilustración de la categoría (las 20 claves de `app/services/ilustraciones.py`): el respaldo de un
 * platillo sin foto. Decorativa (`aria-hidden`); una clave desconocida cae en `general`.
 */
export function Ilustracion({ clave }: { clave: string | null | undefined }) {
  const { clave: usada, glifo } = glifoDeClave(clave);
  return (
    <svg viewBox="0 0 48 48" className={estilos.ilustracion} data-tono={glifo.tono} data-clave={usada} aria-hidden="true" focusable="false">
      {glifo.trazos.map((t, i) => (
        <path key={i} d={t.d} className={t.estilo === 'suave' ? estilos.suave : t.estilo === 'fuerte' ? estilos.fuerte : estilos.linea} />
      ))}
    </svg>
  );
}
