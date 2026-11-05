import { useState, type ReactNode } from 'react';

import estilos from './Avatar.module.css';

export const TONOS_AVATAR = 8;

/** Índice de color estable para un nombre: la misma persona siempre recibe el mismo tono. */
export function tonoDeNombre(nombre: string): number {
  let hash = 0;
  for (const caracter of nombre.trim().toLowerCase()) {
    hash = (hash * 31 + caracter.codePointAt(0)!) >>> 0;
  }
  return hash % TONOS_AVATAR;
}

/** Iniciales legibles: "Ana María López" → "AL"; "Valeria" → "V". */
export function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primera = partes[0]!.charAt(0);
  const ultima = partes.length > 1 ? partes[partes.length - 1]!.charAt(0) : '';
  return (primera + ultima).toUpperCase();
}

export interface PropsAvatar {
  nombre: string;
  foto?: string;
  tamano?: 'chico' | 'normal' | 'grande';
  /** Anillo Vino → Dorado: quien ya confirmó o está activo. */
  anillo?: boolean;
  /** Atenuado: miembro que aún no está listo. */
  atenuado?: boolean;
  className?: string;
}

/**
 * Avatar del comensal o del personal. Migrado de `Avatar` en prototipo/js/shared.jsx.
 * Sin foto muestra iniciales sobre un color estable por nombre; el borde Crema de 2 px
 * separa figuras apiladas (única excepción a la regla no-line).
 */
export function Avatar({
  nombre,
  foto,
  tamano = 'normal',
  anillo = false,
  atenuado = false,
  className,
}: PropsAvatar) {
  const [fotoFallo, setFotoFallo] = useState(false);
  const tono = estilos[`tono${tonoDeNombre(nombre)}`];
  const clases = [
    estilos.avatar,
    estilos[tamano],
    anillo ? estilos.anillo : '',
    atenuado ? estilos.atenuado : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const mostrarFoto = Boolean(foto) && !fotoFallo;

  return (
    <span className={clases} role="img" aria-label={nombre} title={nombre}>
      <span className={`${estilos.interior} ${mostrarFoto ? '' : tono}`}>
        {mostrarFoto ? (
          <img
            className={estilos.foto}
            src={foto}
            alt=""
            loading="lazy"
            onError={() => setFotoFallo(true)}
          />
        ) : (
          <span aria-hidden="true" data-testid="iniciales">
            {inicialesDe(nombre)}
          </span>
        )}
      </span>
    </span>
  );
}

export interface PropsAvatarGrupo {
  children: ReactNode;
  etiqueta?: string;
  className?: string;
}

/** Fila de avatares apilados ("3 de 4 listos"). */
export function AvatarGrupo({ children, etiqueta, className }: PropsAvatarGrupo) {
  return (
    <span className={`${estilos.grupo} ${className ?? ''}`} role="group" aria-label={etiqueta}>
      {children}
    </span>
  );
}
