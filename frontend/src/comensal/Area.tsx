import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { Avatar, AvatarGrupo, Boton, Chip, HojaInferior, Tarjeta } from '../compartido/componentes';
import { Pantalla, estilosPantalla as e } from '../compartido/pantalla/Pantalla';

/**
 * Área del comensal (`/m/:codigo`). Marcador de posición de T-0.5: aplica los tokens y los
 * componentes base. Las pantallas reales (entrada, menú, detalle, mi orden) llegan en la Fase 2.
 */
export default function AreaComensal() {
  const { codigo } = useParams<{ codigo: string }>();
  const [hojaAbierta, setHojaAbierta] = useState(false);

  return (
    <Pantalla>
      <header className={e.encabezado}>
        <span className={e.marca}>Carta</span>
        <p className={e.sobretitulo}>Mesa {codigo}</p>
        <h1 className={e.titulo}>Bienvenido a la mesa</h1>
        <p className={e.texto}>
          Aquí verás el menú del restaurante y armarás tu orden con quienes te acompañan.
        </p>
      </header>

      <div className={e.fila}>
        <Chip tono="vino" activo onClick={() => undefined}>
          Para ti
        </Chip>
        <Chip onClick={() => undefined}>Entradas</Chip>
        <Chip onClick={() => undefined}>Platos fuertes</Chip>
        <Chip onClick={() => undefined}>Postres</Chip>
      </div>

      <div className={e.lista}>
        <Tarjeta onClick={() => setHojaAbierta(true)}>
          <div className={e.fila}>
            <Chip tono="dorado">Top 3 del chef</Chip>
          </div>
          <h3>Platillo de ejemplo</h3>
          <p className={e.texto}>Una descripción breve que invita a probarlo.</p>
          <p className={e.precio}>$ 185</p>
        </Tarjeta>
        <Tarjeta tono="crema-baja">
          <div className={e.fila}>
            <AvatarGrupo etiqueta="Comensales en la mesa">
              <Avatar nombre="Valeria Ruiz" anillo />
              <Avatar nombre="Carlos Ramírez" />
              <Avatar nombre="Ana López" atenuado />
            </AvatarGrupo>
            <p className={e.texto}>2 de 3 listos</p>
          </div>
        </Tarjeta>
      </div>

      <div className={e.acciones}>
        <Boton ancho onClick={() => setHojaAbierta(true)}>
          Ver mi orden
        </Boton>
        <Boton variante="secundario" ancho>
          Llamar al mesero
        </Boton>
      </div>

      <HojaInferior
        abierta={hojaAbierta}
        onCerrar={() => setHojaAbierta(false)}
        titulo="Mi orden"
        descripcion="Las pantallas del comensal se construyen en la Fase 2."
      >
        <div className={e.lista}>
          <p className={e.texto}>Todavía no hay platillos en tu orden.</p>
          <Boton ancho onClick={() => setHojaAbierta(false)}>
            Entendido
          </Boton>
        </div>
      </HojaInferior>
    </Pantalla>
  );
}
