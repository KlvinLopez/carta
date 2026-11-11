import { useState } from 'react';

import { Avatar, AvatarGrupo, Boton, Tarjeta } from '../../compartido/componentes';
import { Pantalla, estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import estilos from './Entrada.module.css';
import { HojaAlias } from './HojaAlias';
import { useFocoEnTitulo } from './useFocoEnTitulo';
import type { DatosMesa, ResultadoAlias } from './useEntrada';

/** Sólo https: el logo lo escribe el operador y se pide desde el teléfono del comensal. */
function logoSeguro(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}

export function Logo({ nombre, url }: { nombre: string; url?: string | null }) {
  const [fallo, setFallo] = useState(false);
  const seguro = logoSeguro(url);
  if (seguro && !fallo) {
    return (
      <img className={estilos.logo} src={seguro} alt="" referrerPolicy="no-referrer" onError={() => setFallo(true)} />
    );
  }
  // Sin logo (o el borde lo bloqueó): la inicial del restaurante, como texto.
  return (
    <span className={estilos.logo} aria-hidden="true">
      {[...nombre.trim()][0]?.toLocaleUpperCase('es') ?? 'C'}
    </span>
  );
}

const VISIBLES = 5;

export interface PropsBienvenida {
  datos: DatosMesa;
  onCambiarAlias: (alias: string) => Promise<ResultadoAlias>;
  /** Abre el menú de la mesa. */
  onVerMenu: () => void;
}

/** Tarjeta de bienvenida: restaurante, mesa, alias editable y aviso de privacidad. */
export function Bienvenida({ datos, onCambiarAlias, onVerMenu }: PropsBienvenida) {
  const { sesion, yo, estado, regresa, aviso } = datos;
  const titulo = useFocoEnTitulo();
  const [editando, setEditando] = useState(false);
  const restaurante = sesion.restaurante;
  const total = estado?.total_miembros ?? 1;
  const otros = estado?.miembros ?? [];

  return (
    <Pantalla>
      <header className={e.encabezado}>
        <div className={estilos.marca}>
          <Logo nombre={restaurante.nombre} url={restaurante.logo_url} />
          <span className={estilos.restaurante}>{restaurante.nombre}</span>
        </div>
        <p className={e.sobretitulo}>{regresa ? 'Qué bueno verte de nuevo' : 'Te damos la bienvenida'}</p>
        <h1 ref={titulo} tabIndex={-1} className={`${e.titulo} ${estilos.titulo}`}>
          Estás en la mesa {sesion.mesa.numero}
        </h1>
      </header>

      {aviso && (
        <p className={estilos.aviso} role="status">
          {aviso === 'red'
            ? 'Perdimos la conexión un momento. Seguimos intentando.'
            : 'Estamos teniendo un problema de nuestro lado. Seguimos intentando.'}
        </p>
      )}

      <Tarjeta>
        <div className={estilos.yo}>
          <Avatar nombre={yo.alias} color={yo.color_avatar} tamano="grande" anillo />
          <div className={estilos.yoTexto}>
            <span className={estilos.etiqueta}>Así te ven en la mesa</span>
            <span className={estilos.alias}>{yo.alias}</span>
          </div>
          <Boton variante="secundario" compacto onClick={() => setEditando(true)} aria-label={`Cambiar mi nombre, ahora ${yo.alias}`}>
            Cambiar
          </Boton>
        </div>
      </Tarjeta>

      {total > 1 && (
        <Tarjeta tono="crema-baja">
          <div className={estilos.mesa}>
            <AvatarGrupo etiqueta="Comensales en la mesa">
              {otros.slice(0, VISIBLES).map((m) => (
                <Avatar key={m.id} nombre={m.alias} color={m.color_avatar} tamano="chico" />
              ))}
            </AvatarGrupo>
            <p className={e.texto}>{total} personas en la mesa</p>
          </div>
        </Tarjeta>
      )}

      <div className={e.acciones}>
        <Boton ancho onClick={onVerMenu}>
          Ver el menú
        </Boton>
      </div>

      <p className={e.pie}>
        Sin cuentas ni datos personales: sólo una cookie propia y una marca en tu teléfono que recuerdan tu lugar en esta mesa.
      </p>

      <HojaAlias abierta={editando} aliasActual={yo.alias} onCerrar={() => setEditando(false)} onGuardar={onCambiarAlias} />
    </Pantalla>
  );
}
