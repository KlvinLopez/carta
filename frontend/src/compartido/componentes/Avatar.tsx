import { useState, type CSSProperties, type ReactNode } from 'react';

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

/** Color de avatar que asigna el servidor (`#RRGGBB` en mayúsculas, hay CHECK en la base). */
const COLOR_AVATAR = /^#[0-9A-F]{6}$/;

/** Texto claro u oscuro según cuál contraste más con el color de fondo (luminancia WCAG). */
function textoOscuroSobre(color: string): boolean {
  const canales = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminancia = 0.2126 * canales[0]! + 0.7152 * canales[1]! + 0.0722 * canales[2]!;
  const contrasteConBlanco = 1.05 / (luminancia + 0.05);
  const contrasteConCarbon = (luminancia + 0.05) / (0.0103 + 0.05); // #1A1A1A ≈ 0.0103
  return contrasteConCarbon > contrasteConBlanco;
}

export interface PropsAvatar {
  nombre: string;
  /**
   * Color de fondo asignado por el servidor (AC-03.1: estable en toda la sesión, no cambia con el
   * alias). Opcional y aditivo: sin él, o si no es `#RRGGBB`, el color sale del nombre como siempre.
   */
  color?: string;
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
  color,
  foto,
  tamano = 'normal',
  anillo = false,
  atenuado = false,
  className,
}: PropsAvatar) {
  const [fotoFallo, setFotoFallo] = useState(false);
  const colorPropio = color !== undefined && COLOR_AVATAR.test(color) ? color : null;
  const tono = colorPropio
    ? `${estilos.colorPropio} ${textoOscuroSobre(colorPropio) ? estilos.textoOscuro : ''}`
    : estilos[`tono${tonoDeNombre(nombre)}`];
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
      {/* El color va como propiedad personalizada: React la pone por CSSOM, que la CSP permite. */}
      <span
        className={`${estilos.interior} ${mostrarFoto ? '' : tono}`}
        style={colorPropio && !mostrarFoto ? ({ '--color-avatar': colorPropio } as CSSProperties) : undefined}
      >
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
