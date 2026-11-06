import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { Pantalla, estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { useSesion } from '../acceso/Sesion';
import c from './Alta.module.css';
import { contarPlatillos, type Borrador } from './borrador';
import PasoCarta from './PasoCarta';
import PasoConfirmar from './PasoConfirmar';
import PasoListo from './PasoListo';
import PasoMesas from './PasoMesas';
import PasoPersonal, { type MiembroEquipo } from './PasoPersonal';
import PasoRestaurante from './PasoRestaurante';
import { crearServicioAlta, type ServicioAlta } from './servicio';
import type { Importacion, Mesa, Restaurante } from './tipos';

// La tabla de revisión es lo más pesado del asistente: su trozo sólo se descarga al llegar a ella.
const PasoRevision = lazy(() => import('./PasoRevision'));

type Paso = 'restaurante' | 'carta' | 'revisa' | 'confirmar' | 'mesas' | 'personal' | 'listo';

const PASOS: { id: Paso; titulo: string }[] = [
  { id: 'restaurante', titulo: 'Tu restaurante' },
  { id: 'carta', titulo: 'Tu carta' },
  { id: 'revisa', titulo: 'Revisa' },
  { id: 'confirmar', titulo: 'Confirmar' },
  { id: 'mesas', titulo: 'Mesas' },
  { id: 'personal', titulo: 'Personal' },
  { id: 'listo', titulo: 'Listo' },
];

function Indicador({ paso }: { paso: Paso }) {
  const indice = PASOS.findIndex((p) => p.id === paso);
  return (
    <nav aria-label="Pasos del asistente" className={c.indicador}>
      <p className={c.pasoActual}>
        Paso {indice + 1} de {PASOS.length} · <strong>{PASOS[indice]!.titulo}</strong>
      </p>
      <ol className={c.pildoras}>
        {PASOS.map((p, i) => (
          <li
            key={p.id}
            className={[c.pildora, i < indice ? c.hecha : '', i === indice ? c.actual : ''].filter(Boolean).join(' ')}
            aria-current={i === indice ? 'step' : undefined}
          >
            <span className={c.srSolo}>{p.titulo}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Asistente de alta (US-25, US-21, US-26): siete pasos desde el nombre hasta los enlaces finales.
 * El estado vive aquí; cada paso es una pieza que recibe lo que necesita. Recibe el `servicio`
 * para que las pruebas y las capturas usen el contrato simulado de `frontend/src/mocks/`.
 */
export function AsistenteConServicio({ servicio }: { servicio: ServicioAlta }) {
  const [paso, setPaso] = useState<Paso>('restaurante');
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [importacion, setImportacion] = useState<Importacion | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [menuCreado, setMenuCreado] = useState(false);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [equipo, setEquipo] = useState<MiembroEquipo[]>([]);

  // Mientras hay un borrador sin confirmar, recargar o cerrar la pestaña perdería la revisión.
  const sinConfirmar = borrador !== null && !menuCreado && (paso === 'revisa' || paso === 'confirmar');
  useEffect(() => {
    if (!sinConfirmar) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sinConfirmar]);

  // Cada paso nuevo empieza arriba de la página.
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [paso]);

  return (
    <Pantalla escritorio className={c.asistente}>
      <header className={e.encabezado}>
        <p className={e.sobretitulo}>Carta · Nuevo restaurante</p>
      </header>
      <Indicador paso={paso} />
      {paso === 'restaurante' && (
        <PasoRestaurante
          servicio={servicio}
          alCrear={(r) => {
            setRestaurante(r);
            setPaso('carta');
          }}
        />
      )}
      {restaurante && paso === 'carta' && (
        <PasoCarta
          servicio={servicio}
          restaurante={restaurante}
          importacionInicial={importacion}
          alCambiarImportacion={setImportacion}
          alTenerBorrador={(b, i) => {
            setBorrador(b);
            setImportacion(i);
            setPaso('revisa');
          }}
          alCapturarAMano={() => setPaso('mesas')}
        />
      )}
      {paso === 'revisa' && borrador && (
        <Suspense
          fallback={
            <div className={e.centrado} role="status">
              <div className={e.espera} aria-hidden="true" />
              <p className={e.texto}>Preparando tu carta…</p>
            </div>
          }
        >
          <PasoRevision borrador={borrador} alCambiar={setBorrador} alContinuar={() => setPaso('confirmar')} />
        </Suspense>
      )}
      {paso === 'confirmar' && restaurante && importacion && borrador && (
        <PasoConfirmar
          servicio={servicio}
          restaurante={restaurante}
          importacion={importacion}
          borrador={borrador}
          alVolver={() => setPaso('revisa')}
          alConfirmar={() => {
            setMenuCreado(contarPlatillos(borrador) > 0);
            setPaso('mesas');
          }}
        />
      )}
      {restaurante && paso === 'mesas' && (
        <PasoMesas
          servicio={servicio}
          restaurante={restaurante}
          mesas={mesas}
          alCrear={setMesas}
          alContinuar={() => setPaso('personal')}
        />
      )}
      {restaurante && paso === 'personal' && (
        <PasoPersonal
          servicio={servicio}
          restaurante={restaurante}
          equipo={equipo}
          alAgregar={(m) => setEquipo((actual) => [...actual, m])}
          alContinuar={() => setPaso('listo')}
        />
      )}
      {restaurante && paso === 'listo' && (
        <PasoListo restaurante={restaurante} menuCreado={menuCreado} mesas={mesas} hayPersonal={equipo.length > 0} />
      )}
    </Pantalla>
  );
}

/** La ruta `/admin/alta`: el asistente contra la API real, con el token de la sesión del operador. */
export default function AsistenteAlta() {
  const { api } = useSesion();
  const servicio = useMemo(() => crearServicioAlta(api), [api]);
  return <AsistenteConServicio servicio={servicio} />;
}
