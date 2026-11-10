import { useEffect, useRef, useState } from 'react';

import { Boton } from '../../compartido/componentes';
import c from './Gestion.module.css';

/** Sólo https se vuelve enlace (http sólo en desarrollo): nada que venga de la API puede ser un `javascript:`, `data:` o `http:`. */
export function esUrlWeb(url: string): boolean {
  try {
    const { protocol } = new URL(url, window.location.origin);
    return protocol === 'https:' || (import.meta.env.DEV && protocol === 'http:');
  } catch {
    return false;
  }
}

/** Un enlace público con su botón «Copiar»; si el navegador no deja copiar, el texto sigue visible. */
export function CopiarEnlace({ etiqueta, url }: { etiqueta: string; url: string }) {
  const [estado, setEstado] = useState<'reposo' | 'copiado' | 'fallo'>('reposo');
  const reloj = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(reloj.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setEstado('copiado');
    } catch {
      setEstado('fallo');
    }
    clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setEstado('reposo'), 2500);
  }

  return (
    <li className={c.enlace}>
      <span className={c.etiqueta}>{etiqueta}</span>
      {esUrlWeb(url) ? (
        <a className={c.url} href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      ) : (
        <span className={c.url}>{url}</span>
      )}
      <Boton variante="secundario" compacto onClick={() => void copiar()} aria-label={`Copiar ${etiqueta.toLowerCase()}`}>
        {estado === 'copiado' ? 'Copiado' : 'Copiar'}
      </Boton>
      {estado === 'fallo' && (
        <p className={c.error} role="status">
          No pudimos copiar. Selecciona el enlace y cópialo a mano.
        </p>
      )}
    </li>
  );
}
