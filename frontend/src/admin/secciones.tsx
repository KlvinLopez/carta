import { estilosPantalla as e } from '../compartido/pantalla/Pantalla';
import { EstadoVacio } from './armazon/EstadoVacio';
import { useRestauranteActivo } from './armazon/RestauranteActivo';

/** Mesas, Personal y Ajustes viven en sus carpetas (T-1.13); Pedidos llega con la Fase 4. */
export const SeccionPedidos = () => {
  const { activo } = useRestauranteActivo();
  return (
    <>
      <header className={e.encabezado}>
        <p className={e.sobretitulo}>{activo?.nombre}</p>
        <h1 className={e.titulo}>Pedidos</h1>
      </header>
      <EstadoVacio glifo="C" titulo="Todavía no hay pedidos">
        Cuando una mesa envíe su orden la verás aquí.
      </EstadoVacio>
    </>
  );
};
