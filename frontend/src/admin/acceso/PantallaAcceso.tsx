import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Boton } from '../../compartido/componentes';
import { Pantalla, estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { Cargando } from '../../compartido/pantalla/Cargando';
import { mensajeDeAcceso } from './proveedor';
import { useSesion } from './Sesion';
import estilos from './PantallaAcceso.module.css';

const CLAVE_CORREO = 'carta.acceso.correo';

// Sólo un correo a medio camino entre «envié el enlace» y «abrí el enlace»; se borra al usarlo.
function leerCorreoPendiente(): string {
  try {
    return window.localStorage.getItem(CLAVE_CORREO) ?? '';
  } catch {
    return '';
  }
}
function guardarCorreoPendiente(correo: string | null) {
  try {
    if (correo) window.localStorage.setItem(CLAVE_CORREO, correo);
    else window.localStorage.removeItem(CLAVE_CORREO);
  } catch {
    // Almacenamiento bloqueado (ventana privada): se vuelve a pedir el correo.
  }
}

type Paso = 'inicio' | 'enviando' | 'enviado' | 'confirmar-correo' | 'terminando';

export default function PantallaAcceso() {
  const { estado, error, expirada, proveedor, entrarConGoogle, enviarEnlace, completarEnlace } =
    useSesion();
  const ubicacion = useLocation();
  const [paso, setPaso] = useState<Paso>('inicio');
  const [correo, setCorreo] = useState(leerCorreoPendiente);
  const [fallo, setFallo] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const revisado = useRef(false);

  // ¿Llegamos desde el enlace del correo? Si el correo está guardado, se completa solo.
  useEffect(() => {
    if (!proveedor || revisado.current) return;
    revisado.current = true;
    const url = window.location.href;
    void proveedor.esEnlace(url).then(async (esEnlace) => {
      if (!esEnlace) return;
      const guardado = leerCorreoPendiente();
      if (!guardado) return setPaso('confirmar-correo');
      await terminar(url, guardado);
    });
  }, [proveedor]);

  async function terminar(url: string, direccion: string) {
    setPaso('terminando');
    setFallo(null);
    try {
      await completarEnlace(url, direccion);
      guardarCorreoPendiente(null);
      // Sin `navigate` aquí: al llegar la sesión, <Navigate replace> a /admin/menu ya quita el
      // código de la URL, y un navigate propio pisaba esa redirección (carrera).
    } catch (err) {
      setFallo((err as Error).message);
      setPaso('confirmar-correo');
    }
  }

  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'con-sesion') {
    const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/admin/menu';
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
    if (correo.trim()) await terminar(window.location.href, correo.trim());
  }

  async function alGoogle() {
    setEntrando(true);
    await entrarConGoogle();
    setEntrando(false);
  }

  const sinConfigurar = estado.tipo === 'sin-configurar';
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
          <div className={e.acciones}>
            <Boton ancho disabled={sinConfigurar} cargando={entrando} onClick={alGoogle}>
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
              disabled={sinConfigurar}
              value={correo}
              onChange={(ev) => setCorreo(ev.target.value)}
            />
            <Boton
              type="submit"
              variante="fantasma"
              ancho
              disabled={sinConfigurar}
              cargando={paso === 'enviando'}
            >
              Enviar enlace
            </Boton>
          </form>
        </>
      )}
    </Pantalla>
  );
}
