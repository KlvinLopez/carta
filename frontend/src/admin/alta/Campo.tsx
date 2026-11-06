import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

import c from './Alta.module.css';

interface Base {
  etiqueta: string;
  ayuda?: ReactNode;
  error?: string | null;
}

/** Campo de texto con etiqueta visible, ayuda y error asociados (`aria-describedby`). */
export function Campo({
  etiqueta,
  ayuda,
  error,
  className,
  ...resto
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const idMensaje = `${id}-m`;
  return (
    <div className={c.campo}>
      <label htmlFor={id} className={c.etiqueta}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={[c.entrada, error ? c.conError : '', className ?? ''].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? idMensaje : undefined}
        {...resto}
      />
      {(error || ayuda) && (
        <p id={idMensaje} className={error ? c.mensajeError : c.ayuda} role={error ? 'alert' : undefined}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  );
}

export function AreaTexto({
  etiqueta,
  ayuda,
  error,
  className,
  ...resto
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const idMensaje = `${id}-m`;
  return (
    <div className={c.campo}>
      <label htmlFor={id} className={c.etiqueta}>
        {etiqueta}
      </label>
      <textarea
        id={id}
        className={[c.entrada, c.areaTexto, error ? c.conError : '', className ?? ''].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? idMensaje : undefined}
        {...resto}
      />
      {(error || ayuda) && (
        <p id={idMensaje} className={error ? c.mensajeError : c.ayuda} role={error ? 'alert' : undefined}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  );
}
