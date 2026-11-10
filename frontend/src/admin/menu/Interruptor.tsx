import c from './Menu.module.css';

/**
 * Interruptor de un toque (`role="switch"`). La pista mide 52 × 32 y el botón entero ≥ 44 px de alto;
 * el texto acompaña al color (no se comunica sólo con él). Mientras hay una escritura en vuelo el
 * interruptor queda ocupado (`aria-busy`) y no acepta otro toque.
 */
export function Interruptor({
  etiqueta,
  platillo,
  activo,
  ocupado,
  alCambiar,
}: {
  etiqueta: string;
  platillo: string;
  activo: boolean;
  ocupado: boolean;
  alCambiar: (valor: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={`${etiqueta}: ${platillo}`}
      aria-busy={ocupado || undefined}
      disabled={ocupado}
      className={c.interruptor}
      onClick={() => alCambiar(!activo)}
    >
      <span className={c.pista} aria-hidden="true" data-encendido={activo}>
        <span className={c.perilla} />
      </span>
      <span className={c.textoInterruptor} aria-hidden="true">
        {etiqueta}
      </span>
    </button>
  );
}
