import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Boton } from '../../compartido/componentes';
import { HojaInferior } from '../../compartido/componentes/HojaInferior';
import { ErrorApi } from '../../compartido/http';
import { Pantalla, estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { useSesion } from '../acceso/Sesion';
import c from './Alta.module.css';
import { aBorrador, type Borrador } from './borrador';
import PasoCarta from './PasoCarta';
import PasoConfirmar from './PasoConfirmar';
import PasoListo from './PasoListo';
import PasoMesas from './PasoMesas';
import PasoPersonal from './PasoPersonal';
import PasoRestaurante from './PasoRestaurante';
import { borrarProgreso, guardarProgreso, leerProgreso, type MiembroEquipo, type Paso, type Progreso } from './progreso';
import { crearServicioAlta, type ServicioAlta } from './servicio';
import type { Importacion, Mesa, Restaurante } from './tipos';

// La tabla de revisión es lo más pesado del asistente: su trozo sólo se descarga al llegar a ella.
const PasoRevision = lazy(() => import('./PasoRevision'));

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

type Hidratacion = 'lista' | 'cargando' | { error: string };

/**
 * Asistente de alta (US-25, US-21, US-26): siete pasos desde el nombre hasta los enlaces finales.
 * El estado vive aquí; cada paso es una pieza que recibe lo que necesita. Recibe el `servicio`
 * para que las pruebas y las capturas usen el contrato simulado de `frontend/src/mocks/`.
 *
 * El avance (ids y paso, nunca el PIN ni el borrador) se guarda en `sessionStorage`: recargar, perder
 * la sesión o volver con «atrás» no obliga a repetir el paso 1 (que crearía otro restaurante). El
 * borrador se vuelve a leer de la importación; las ediciones sin confirmar no se conservan.
 */
export function AsistenteConServicio({ servicio }: { servicio: ServicioAlta }) {
  const navegar = useNavigate();
  const [inicial] = useState<Progreso | null>(leerProgreso);

  const [paso, setPaso] = useState<Paso>(inicial?.paso ?? 'restaurante');
  const [restaurante, setRestaurante] = useState<Restaurante | null>(inicial?.restaurante ?? null);
  const [importacion, setImportacion] = useState<Importacion | null>(null);
  const [importacionId, setImportacionId] = useState<string | null>(inicial?.importacionId ?? null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [menuCreado, setMenuCreado] = useState(inicial?.menuCreado ?? false);
  const [mesas, setMesas] = useState<Mesa[]>(inicial?.mesas ?? []);
  const [equipo, setEquipo] = useState<MiembroEquipo[]>(inicial?.equipo ?? []);
  const [avisoMesas, setAvisoMesas] = useState<string | null>(null);
  const [pideSalir, setPideSalir] = useState(false);
  // Al reanudar en un paso que depende de la importación hay que volver a leerla.
  const necesitaImportacion =
    !!inicial && !!inicial.importacionId && (inicial.paso === 'carta' || inicial.paso === 'revisa' || inicial.paso === 'confirmar');
  const [hidratacion, setHidratacion] = useState<Hidratacion>(necesitaImportacion ? 'cargando' : 'lista');
  const [intentoHidratar, setIntentoHidratar] = useState(0);

  useEffect(() => {
    if (!necesitaImportacion || hidratacion === 'lista' || !inicial || !inicial.importacionId) return;
    let vivo = true;
    setHidratacion('cargando');
    servicio
      .consultarImportacion(inicial.restaurante.id, inicial.importacionId)
      .then((actual) => {
        if (!vivo) return;
        setImportacion(actual);
        if (actual.estado === 'confirmado') {
          setMenuCreado(true);
          setPaso('mesas');
        } else if (actual.estado === 'listo' && actual.resultado && (inicial.paso === 'revisa' || inicial.paso === 'confirmar')) {
          setBorrador(aBorrador(actual.resultado));
          setPaso(inicial.paso === 'confirmar' ? 'revisa' : inicial.paso);
        } else {
          setPaso('carta');
        }
        setHidratacion('lista');
      })
      .catch((error: unknown) => {
        if (!vivo) return;
        setHidratacion({
          error: error instanceof ErrorApi ? error.message : 'No pudimos retomar tu carta. Inténtalo de nuevo.',
        });
      });
    return () => {
      vivo = false;
    };
    // `inicial` es constante; sólo reintentar vuelve a correr la lectura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentoHidratar]);

  // Guarda el avance en cada cambio relevante (nunca el PIN: `equipo` sólo lleva id, nombre y rol).
  useEffect(() => {
    if (!restaurante || paso === 'restaurante' || hidratacion !== 'lista') return;
    guardarProgreso({ paso, restaurante, importacionId, menuCreado, mesas, equipo });
  }, [paso, restaurante, importacionId, menuCreado, mesas, equipo, hidratacion]);

  const cambiarImportacion = useCallback((i: Importacion | null) => {
    setImportacion(i);
    setImportacionId(i?.id ?? null);
  }, []);
  const actualizarBorrador = useCallback((cambio: (b: Borrador) => Borrador) => setBorrador((b) => (b ? cambio(b) : b)), []);

  // Mientras haya algo que perder, recargar o cerrar la pestaña pide confirmar (todos los pasos desde el 2).
  const enCurso = paso !== 'restaurante' && paso !== 'listo';
  useEffect(() => {
    if (!enCurso) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [enCurso]);

  // «Atrás» del navegador: una entrada de historial centinela y una hoja para confirmar la salida.
  // (BrowserRouter no admite `useBlocker`; el avance ya está guardado, así que salir no destruye nada.)
  useEffect(() => {
    if (!enCurso) return;
    window.history.pushState({ asistenteAlta: true }, '');
    const alAtras = () => {
      window.history.pushState({ asistenteAlta: true }, '');
      setPideSalir(true);
    };
    window.addEventListener('popstate', alAtras);
    return () => window.removeEventListener('popstate', alAtras);
  }, [enCurso]);

  // Cada paso nuevo empieza arriba de la página.
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [paso]);

  const reiniciarCarta = () => {
    cambiarImportacion(null);
    setBorrador(null);
    setHidratacion('lista');
    setPaso('carta');
  };

  let contenido;
  if (hidratacion === 'cargando') {
    contenido = (
      <div className={e.centrado} role="status">
        <div className={e.espera} aria-hidden="true" />
        <p className={e.texto}>Retomando tu carta…</p>
      </div>
    );
  } else if (typeof hidratacion === 'object') {
    contenido = (
      <section className={c.paso} aria-labelledby="titulo-retomar">
        <h2 id="titulo-retomar" className={c.tituloPaso}>
          No pudimos retomar tu carta
        </h2>
        <p className={c.mensajeError} role="alert">
          {hidratacion.error}
        </p>
        <div className={c.acciones}>
          <Boton ancho onClick={() => setIntentoHidratar((n) => n + 1)}>
            Reintentar
          </Boton>
          <Boton ancho variante="secundario" onClick={reiniciarCarta}>
            Subir mi carta otra vez
          </Boton>
        </div>
      </section>
    );
  } else {
    contenido = (
      <>
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
            alCambiarImportacion={cambiarImportacion}
            alTenerBorrador={(b, i) => {
              setBorrador(b);
              cambiarImportacion(i);
              setPaso('revisa');
            }}
            alCapturarAMano={() => setPaso('mesas')}
            alYaConfirmada={() => {
              setMenuCreado(true);
              setPaso('mesas');
            }}
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
            <PasoRevision borrador={borrador} alCambiar={actualizarBorrador} alContinuar={() => setPaso('confirmar')} />
          </Suspense>
        )}
        {paso === 'confirmar' && restaurante && importacion && borrador && (
          <PasoConfirmar
            servicio={servicio}
            restaurante={restaurante}
            importacion={importacion}
            borrador={borrador}
            alVolver={() => setPaso('revisa')}
            alConfirmar={(yaConfirmada) => {
              setMenuCreado(true);
              if (yaConfirmada) {
                setAvisoMesas('Esta carta ya se había confirmado (quizá desde otra pestaña). Seguimos con tus mesas.');
              }
              setPaso('mesas');
            }}
          />
        )}
        {restaurante && paso === 'mesas' && (
          <>
            {avisoMesas && (
              <p className={c.aviso} role="status">
                {avisoMesas}
              </p>
            )}
            <PasoMesas
              servicio={servicio}
              restaurante={restaurante}
              mesas={mesas}
              alCrear={setMesas}
              alContinuar={() => setPaso('personal')}
            />
          </>
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
          <PasoListo
            restaurante={restaurante}
            menuCreado={menuCreado}
            mesas={mesas}
            hayPersonal={equipo.length > 0}
            alTerminar={borrarProgreso}
          />
        )}
      </>
    );
  }

  return (
    <Pantalla escritorio className={c.asistente}>
      <header className={e.encabezado}>
        <p className={e.sobretitulo}>Carta · Nuevo restaurante</p>
      </header>
      <Indicador paso={paso} />
      {contenido}
      <HojaInferior
        abierta={pideSalir}
        onCerrar={() => setPideSalir(false)}
        titulo="¿Salir del asistente?"
        descripcion="Guardamos tu avance en este navegador. Si vuelves, retomas donde ibas; las ediciones sin confirmar de la revisión no se conservan."
      >
        <div className={c.acciones}>
          <Boton ancho onClick={() => setPideSalir(false)}>
            Seguir aquí
          </Boton>
          <Boton
            ancho
            variante="fantasma"
            onClick={() => {
              setPideSalir(false);
              navegar('/admin/menu');
            }}
          >
            Salir
          </Boton>
        </div>
      </HojaInferior>
    </Pantalla>
  );
}

/** La ruta `/admin/alta`: el asistente contra la API real, con el token de la sesión del operador. */
export default function AsistenteAlta() {
  const { api } = useSesion();
  const servicio = useMemo(() => crearServicioAlta(api), [api]);
  return <AsistenteConServicio servicio={servicio} />;
}
