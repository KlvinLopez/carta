import { useState, type ReactNode } from 'react';

import estilos from './Avatar.module.css';

export const TONOS_AVATAR = 8;

/** Nombre comparable: sin espacios sobrantes ni diferencias de mayúsculas. */
function normalizar(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

/** Índice de color estable para un nombre (FNV-1a): la misma persona siempre recibe el mismo tono. */
export function tonoDeNombre(nombre: string): number {
  let hash = 0x811c9dc5;
  for (const caracter of normalizar(nombre)) {
    hash ^= caracter.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % TONOS_AVATAR;
}

/** Primer carácter alfanumérico de una palabra, como punto de código entero (no corta emojis). */
function inicialDe(palabra: string): string {
  const letra = palabra.match(/[\p{L}\p{N}]/u)?.[0];
  if (!letra) return '';
  const mayuscula = letra.toLocaleUpperCase('es');
  // 'ß' → 'SS' y otros casos que crecen: se conserva el carácter original.
  return [...mayuscula].length === 1 ? mayuscula : letra;
}

/** Iniciales legibles: "Ana María López" → "AL"; "Valeria" → "V"; "🍕 Luis" → "L"; sin letras → "?". */
export function inicialesDe(nombre: string): string {
  const iniciales = nombre.split(/\s+/).map(inicialDe).filter(Boolean);
  if (iniciales.length === 0) return '?';
  const primera = iniciales[0]!;
  const ultima = iniciales.length > 1 ? iniciales[iniciales.length - 1]! : '';
  return primera + ultima;
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
