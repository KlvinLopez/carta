import type { ReactNode } from 'react';

import { estilosPantalla as e } from '../../compartido/pantalla/Pantalla';

/** Estado vacío de una lista: ilustración (inicial en serif) y una frase en el lenguaje de la marca. */
export function EstadoVacio({
  glifo,
  titulo,
  children,
  accion,
}: {
  glifo: string;
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <section className={e.centrado} aria-labelledby="titulo-vacio">
      <div className={e.ilustracion} aria-hidden="true">
        {glifo}
      </div>
      <h2 id="titulo-vacio" className={e.titulo}>
        {titulo}
      </h2>
      {children && <p className={e.texto}>{children}</p>}
      {accion}
    </section>
  );
}
