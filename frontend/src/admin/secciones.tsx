import { Boton } from '../compartido/componentes';
import { estilosPantalla as e } from '../compartido/pantalla/Pantalla';
import { useSesion } from './acceso/Sesion';
import { EstadoVacio } from './armazon/EstadoVacio';
import { useRestauranteActivo } from './armazon/RestauranteActivo';

/** Las pantallas reales llegan en T-1.11 (alta), T-1.12 (menú) y T-1.13 (mesas, personal, ajustes). */
function Seccion({
  titulo,
  glifo,
  vacio,
  children,
}: {
  titulo: string;
  glifo: string;
  vacio: string;
  children: string;
}) {
  const { activo } = useRestauranteActivo();
  return (
    <>
      <header className={e.encabezado}>
        <p className={e.sobretitulo}>{activo?.nombre}</p>
        <h1 className={e.titulo}>{titulo}</h1>
      </header>
      <EstadoVacio glifo={glifo} titulo={vacio}>
        {children}
      </EstadoVacio>
    </>
  );
}

export const SeccionMenu = () => (
  <Seccion titulo="Menú" glifo="M" vacio="Tu carta aparecerá aquí">
    Sube tu carta en PDF y la convertimos en un menú visual. Nada entra sin que lo confirmes.
  </Seccion>
);
export const SeccionMesas = () => (
  <Seccion titulo="Mesas" glifo="Q" vacio="Aún no hay mesas">
    Crea tus mesas y descarga los QR listos para imprimir.
  </Seccion>
);
export const SeccionPersonal = () => (
  <Seccion titulo="Personal" glifo="P" vacio="Aún no hay personal">
    Da de alta a tu equipo con un PIN para que reciba las comandas.
  </Seccion>
);
export const SeccionPedidos = () => (
  <Seccion titulo="Pedidos" glifo="C" vacio="Todavía no hay pedidos">
    Cuando una mesa envíe su orden la verás aquí.
  </Seccion>
);
export function SeccionAjustes() {
  const { estado, salir } = useSesion();
  const correo = estado.tipo === 'con-sesion' ? estado.usuario.correo : null;
  return (
    <>
      <Seccion titulo="Ajustes" glifo="A" vacio="Ajustes del restaurante">
        Nombre, logo y enlaces públicos de tu restaurante.
      </Seccion>
      <section className={e.acciones} aria-label="Tu cuenta">
        {correo && <p className={e.texto}>Entraste como {correo}.</p>}
        <Boton variante="secundario" ancho onClick={() => void salir()}>
          Salir
        </Boton>
      </section>
    </>
  );
}
