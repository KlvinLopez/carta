import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Boton } from '../../compartido/componentes';
import { Pantalla, estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { Cargando } from '../../compartido/pantalla/Cargando';
import { guardarCorreoPendiente, leerCorreoPendiente } from '../almacen';
import { mensajeDeAcceso } from './proveedor';
import { useSesion } from './Sesion';
import estilos from './PantallaAcceso.module.css';

type Paso = 'inicio' | 'enviando' | 'enviado' | 'confirmar-correo' | 'terminando';

/** Sólo se vuelve a una ruta del propio panel (nada de `//otro-sitio` ni de esquemas). */
function destinoSeguro(desde: unknown): string {
  return typeof desde === 'string' && /^\/admin(\/|$|\?|#)/.test(desde) && !desde.startsWith('//')
    ? desde
    : '/admin/menu';
}

export default function PantallaAcceso() {
  const {
    estado,
    error,
    expirada,
    proveedor,
    fallaCarga,
    reintentarCarga,
    entrarConGoogle,
    enviarEnlace,
    completarEnlace,
  } = useSesion();
  const ubicacion = useLocation();
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>('inicio');
  // El correo guardado se precarga sólo cuando la URL trae el enlace (ver efecto): otro usuario
  // del mismo dispositivo no debe heredar el de la sesión anterior.
  const [correo, setCorreo] = useState('');
  const [fallo, setFallo] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [enlaceCaducado, setEnlaceCaducado] = useState(false);
  const revisado = useRef(false);
  // El enlace del correo (con su `oobCode`, de un solo uso) se guarda aquí y se quita de la barra.
  const urlEnlace = useRef<string | null>(null);

  // Al volver de Google desde el historial (bfcache) la página se restaura con `entrando` pegado.
  useEffect(() => {
    const alMostrar = (evento: Event) => {
      if ((evento as PageTransitionEvent).persisted) setEntrando(false);
    };
    window.addEventListener('pageshow', alMostrar);
    return () => window.removeEventListener('pageshow', alMostrar);
  }, []);

  // ¿Llegamos desde el enlace del correo? Si el correo está guardado, se completa solo.
  useEffect(() => {
    if (!proveedor || revisado.current) return;
    revisado.current = true;
    const url = `${window.location.origin}${ubicacion.pathname}${ubicacion.search}${ubicacion.hash}`;
    proveedor
      .esEnlace(url)
      .then(async (esEnlace) => {
        if (!esEnlace) return;
        urlEnlace.current = url;
        // El código es de un solo uso: fuera de la barra, así recargar no repite un fallo.
        navigate(ubicacion.pathname, { replace: true, state: ubicacion.state });
        const guardado = leerCorreoPendiente();
        if (!guardado) return setPaso('confirmar-correo');
        setCorreo(guardado);
        await terminar(guardado);
      })
      .catch(() => {});
  }, [proveedor]);

  async function terminar(direccion: string) {
    const url = urlEnlace.current;
    if (!url) return;
    setPaso('terminando');
    setFallo(null);
    try {
      await completarEnlace(url, direccion);
      guardarCorreoPendiente(null);
      urlEnlace.current = null;
      // Sin `navigate` aquí: al llegar la sesión, <Navigate replace> ya lleva al panel, y un
      // navigate propio pisaba esa redirección (carrera).
    } catch (err) {
      setFallo((err as Error).message);
      if ((err as { codigo?: string }).codigo === 'enlace-invalido') {
        // Vencido o ya usado: no hay nada que reintentar con ese enlace. Se vuelve al inicio con
        // el correo a mano para pedir otro.
        urlEnlace.current = null;
        guardarCorreoPendiente(null);
        setEnlaceCaducado(true);
        setPaso('inicio');
      } else {
        setPaso('confirmar-correo');
      }
    }
  }

  if (estado.tipo === 'cargando') return <Cargando texto="Preparando tu panel…" />;
  if (estado.tipo === 'con-sesion') {
    const destino = destinoSeguro((ubicacion.state as { desde?: unknown } | null)?.desde);
    return <Navigate to={destino} replace />;
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    const direccion = correo.trim();
    if (!direccion) return;
    setPaso('enviando');
    setFallo(null);
    try {
      await enviarEnlace(direccion);
      guardarCorreoPendiente(direccion);
      setPaso('enviado');
    } catch (err) {
      setFallo((err as Error).message);
      setPaso('inicio');
    }
  }

  async function alConfirmar(evento: FormEvent) {
    evento.preventDefault();
    if (correo.trim()) await terminar(correo.trim());
  }

  async function alGoogle() {
    setEntrando(true);
    await entrarConGoogle();
    setEntrando(false);
  }

  const sinConfigurar = estado.tipo === 'sin-configurar';
  const bloqueado = sinConfigurar || fallaCarga;
  const mensajeError = fallo ?? (error ? mensajeDeAcceso(error.codigo) : null);

  return (
    <Pantalla>
      <header className={e.encabezado}>
        <span className={e.marca}>Carta</span>
        <p className={e.sobretitulo}>Panel del operador</p>
        <h1 className={e.titulo}>Tu restaurante, listo en minutos</h1>
        <p className={e.texto}>
          Entra para subir tu carta, imprimir los QR de tus mesas y recibir los pedidos.
        </p>
      </header>

      {expirada && (
        <p className={estilos.aviso} role="status">
          Tu sesión terminó. Vuelve a entrar para continuar.
        </p>
      )}
      {sinConfigurar && (
        <p className={`${estilos.aviso} ${estilos.error}`} role="alert">
          {mensajeDeAcceso('sin-configurar')}
        </p>
      )}
      {mensajeError && !sinConfigurar && (
        <p className={`${estilos.aviso} ${estilos.error}`} role="alert">
          {mensajeError}
        </p>
      )}

      {paso === 'enviado' ? (
        <p className={estilos.aviso} role="status">
          Te enviamos un enlace a <strong>{correo}</strong>. Ábrelo en este dispositivo para entrar.
        </p>
      ) : paso === 'confirmar-correo' || paso === 'terminando' ? (
        <form className={estilos.formulario} onSubmit={alConfirmar}>
          <p className={e.texto}>Confirma el correo al que llegó el enlace para terminar de entrar.</p>
          <label className={estilos.etiqueta} htmlFor="correo-confirmar">
            Tu correo
          </label>
          <input
            id="correo-confirmar"
            className={estilos.campo}
            type="email"
            autoComplete="email"
            required
            value={correo}
            onChange={(ev) => setCorreo(ev.target.value)}
          />
          <Boton type="submit" ancho cargando={paso === 'terminando'}>
            Terminar de entrar
          </Boton>
        </form>
      ) : (
        <>
          {enlaceCaducado && (
            <p className={e.texto}>Pide otro enlace con tu correo y ábrelo en este dispositivo.</p>
          )}
          <div className={e.acciones}>
            <Boton ancho disabled={bloqueado} cargando={entrando} onClick={alGoogle}>
              Entrar con Google
            </Boton>
          </div>
          <p className={estilos.separador}>o con un enlace en tu correo</p>
          <form className={estilos.formulario} onSubmit={alEnviar}>
            <label className={estilos.etiqueta} htmlFor="correo-acceso">
              Tu correo
            </label>
            <input
              id="correo-acceso"
              className={estilos.campo}
              type="email"
              autoComplete="email"
              required
              disabled={bloqueado}
              value={correo}
              onChange={(ev) => setCorreo(ev.target.value)}
            />
            <Boton
              type="submit"
              variante="secundario"
              ancho
              disabled={bloqueado}
              cargando={paso === 'enviando'}
            >
              Enviar enlace
            </Boton>
          </form>
          {fallaCarga && (
            <Boton variante="fantasma" ancho onClick={reintentarCarga}>
              Reintentar
            </Boton>
          )}
        </>
      )}
    </Pantalla>
  );
}
