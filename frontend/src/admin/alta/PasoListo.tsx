import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Boton, clasesBoton } from '../../compartido/componentes/Boton';
import c from './Alta.module.css';
import type { Mesa, Restaurante } from './tipos';

function EnlaceCopiable({ etiqueta, url }: { etiqueta: string; url: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible para copiarlo a mano.
    }
  }
  return (
    <li className={c.enlace}>
      <span className={c.etiqueta}>{etiqueta}</span>
      <a className={c.url} href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
      <Boton variante="secundario" compacto onClick={() => void copiar()}>
        {copiado ? 'Copiado' : 'Copiar enlace'}
      </Boton>
    </li>
  );
}

/** Paso 7 · Listo: enlaces del menú (vía una mesa) y del acceso del personal. */
export default function PasoListo({
  restaurante,
  menuCreado,
  mesas,
  hayPersonal,
}: {
  restaurante: Restaurante;
  menuCreado: boolean;
  mesas: Mesa[];
  hayPersonal: boolean;
}) {
  const origen = window.location.origin;
  const primeraMesa = mesas[0];
  return (
    <section className={c.paso} aria-labelledby="titulo-listo">
      <header className={c.encabezadoPaso}>
        <h2 id="titulo-listo" className={c.tituloPaso}>
          ¡{restaurante.nombre} está listo!
        </h2>
        <p className={c.textoPaso}>
          {menuCreado
            ? 'Tu menú ya está publicado. Estos son los enlaces que necesitas.'
            : 'Tu restaurante está creado. Captura tus platillos a mano desde la sección Menú cuando quieras.'}
        </p>
      </header>
      <ul className={c.enlaces}>
        {primeraMesa && (
          <EnlaceCopiable etiqueta="Tu menú, como lo ve un comensal (mesa 1)" url={primeraMesa.url_publica} />
        )}
        <EnlaceCopiable
          etiqueta={hayPersonal ? 'Acceso de tu personal' : 'Acceso del personal (aún sin personal)'}
          url={`${origen}/staff/${restaurante.slug}`}
        />
      </ul>
      <div className={c.acciones}>
        <Link to="/admin/menu" className={clasesBoton({ ancho: true })}>
          Ir a mi panel
        </Link>
      </div>
    </section>
  );
}
