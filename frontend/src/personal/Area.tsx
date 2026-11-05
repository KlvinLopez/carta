import { useParams } from 'react-router-dom';

import { Avatar, Boton, Chip, Tarjeta } from '../compartido/componentes';
import { Pantalla, estilosPantalla as e } from '../compartido/pantalla/Pantalla';

/**
 * Área del personal (`/staff/:slug`). Marcador de posición de T-0.5. El acceso con PIN y las
 * pantallas de mesas y comandas (P06, P07 simplificadas) llegan en la Fase 3.
 */
export default function AreaPersonal() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <Pantalla>
      <header className={e.encabezado}>
        <span className={e.marca}>Carta</span>
        <p className={e.sobretitulo}>Personal · {slug}</p>
        <h1 className={e.titulo}>¿Quién eres?</h1>
        <p className={e.texto}>Elige tu nombre y teclea tu PIN para ver las mesas.</p>
      </header>

      <div className={e.lista}>
        <Tarjeta onClick={() => undefined}>
          <div className={e.fila}>
            <Avatar nombre="Mariana López" />
            <div>
              <h3>Mariana López</h3>
              <Chip tono="dorado">Capitana</Chip>
            </div>
          </div>
        </Tarjeta>
        <Tarjeta onClick={() => undefined}>
          <div className={e.fila}>
            <Avatar nombre="Luis Mendoza" />
            <div>
              <h3>Luis Mendoza</h3>
              <Chip>Mesero</Chip>
            </div>
          </div>
        </Tarjeta>
      </div>

      <Boton ancho disabled>
        Entrar
      </Boton>
    </Pantalla>
  );
}
