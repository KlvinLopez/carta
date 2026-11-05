import { Boton, Chip, Tarjeta } from '../compartido/componentes';
import { Pantalla, estilosPantalla as e } from '../compartido/pantalla/Pantalla';

/**
 * Área del operador (`/admin`). Marcador de posición de T-0.5. El acceso con Firebase, el
 * asistente de alta con PDF y las pantallas del panel llegan en la Fase 1 (carril C).
 */
export default function AreaOperador() {
  return (
    <Pantalla escritorio>
      <header className={e.encabezado}>
        <span className={e.marca}>Carta</span>
        <p className={e.sobretitulo}>Panel del operador</p>
        <h1 className={e.titulo}>Tu restaurante, listo en minutos</h1>
        <p className={e.texto}>
          Sube tu carta en PDF y Carta la convierte en un menú visual con QR por mesa.
        </p>
      </header>

      <div className={e.lista}>
        <Tarjeta>
          <Chip tono="vino">Paso 1</Chip>
          <h3>Importa tu menú</h3>
          <p className={e.texto}>Nada entra al menú sin que lo confirmes.</p>
        </Tarjeta>
        <Tarjeta tono="crema-baja">
          <Chip>Paso 2</Chip>
          <h3>Imprime los QR de tus mesas</h3>
        </Tarjeta>
      </div>

      <div className={e.acciones}>
        <Boton disabled>Entrar con Google</Boton>
        <Boton variante="fantasma" disabled>
          Enlace por correo
        </Boton>
      </div>
    </Pantalla>
  );
}
