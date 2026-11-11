import { useEffect, useState } from 'react';

import { Boton } from '../../compartido/componentes';
import { Pantalla, estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import type { ClaseError } from './errores';

interface Copia {
  simbolo: string;
  titulo: string;
  texto: string;
  boton?: string;
}

function copiaDe(clase: ClaseError, restaurante: string | null): Copia {
  switch (clase) {
    case 'mesa_invalida':
      // Misma pantalla para un código desconocido, revocado o de otro restaurante (AC-01.3).
      return {
        simbolo: '?',
        titulo: 'No encontramos esta mesa',
        texto: 'Pide al personal que te comparta el QR de la mesa y vuelve a escanearlo.',
      };
    case 'cerrada':
      return {
        simbolo: '✓',
        titulo: 'La mesa se cerró',
        texto: `${restaurante ? `Gracias por visitar ${restaurante}. ` : 'Gracias por la visita. '}Si sigues en la mesa, ábrela de nuevo y empieza otra ronda.`,
        boton: 'Abrir la mesa de nuevo',
      };
    case 'llena':
      return {
        simbolo: '12',
        titulo: 'Esta mesa ya está completa',
        texto: 'Todos los lugares de la mesa están ocupados. Pide al mesero que te ayude a sumarte.',
        boton: 'Intentar de nuevo',
      };
    case 'sin_conexion':
      return {
        simbolo: '…',
        titulo: 'Sin conexión',
        texto: 'No pudimos conectar con Carta. Revisa tu señal; lo intentamos de nuevo en cuanto vuelva.',
        boton: 'Reintentar',
      };
    case 'limite':
      return {
        simbolo: '⏳',
        titulo: 'Vamos un poco rápido',
        texto: 'Hubo muchos intentos seguidos. Espera unos segundos y vuelve a probar.',
        boton: 'Reintentar',
      };
    case 'credencial':
      return {
        simbolo: '!',
        titulo: 'No pudimos guardar tu lugar',
        texto: 'Tu navegador no nos dejó recordarte en esta mesa. Revisa que no bloquee las cookies de este sitio e inténtalo de nuevo.',
        boton: 'Intentar de nuevo',
      };
    default:
      return {
        simbolo: '!',
        titulo: 'Algo salió mal',
        texto: 'Fue de nuestro lado, no tuyo. Inténtalo de nuevo en un momento.',
        boton: 'Reintentar',
      };
  }
}

export interface PropsPantallaError {
  clase: ClaseError;
  restaurante?: string | null;
  /** Segundos que pidió esperar el servidor (429); el botón se activa al terminar. */
  reintentarEn?: number | null;
  onReintentar: () => void;
}

/** Pantalla de fallo de la entrada, en el lenguaje de la marca. */
export function PantallaError({ clase, restaurante = null, reintentarEn = null, onReintentar }: PropsPantallaError) {
  const copia = copiaDe(clase, restaurante);
  const [falta, setFalta] = useState(clase === 'limite' ? Math.min(reintentarEn ?? 5, 60) : 0);
  const [reintentando, setReintentando] = useState(false);

  useEffect(() => {
    if (falta <= 0) return;
    const t = setTimeout(() => setFalta((f) => f - 1), 1000);
    return () => clearTimeout(t);
  }, [falta]);

  return (
    <Pantalla>
      <div className={e.centrado} role={clase === 'mesa_invalida' ? undefined : 'alert'}>
        <div className={e.ilustracion} aria-hidden="true">
          {copia.simbolo}
        </div>
        <h1 className={e.titulo}>{copia.titulo}</h1>
        <p className={e.texto}>{copia.texto}</p>
        {copia.boton && (
          <Boton
            disabled={falta > 0}
            cargando={reintentando}
            onClick={() => {
              if (reintentando) return; // un segundo toque no lanza otra entrada
              setReintentando(true);
              onReintentar();
            }}
          >
            {falta > 0 ? `${copia.boton} (${falta} s)` : copia.boton}
          </Boton>
        )}
      </div>
    </Pantalla>
  );
}
