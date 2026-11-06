import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { crearCliente, type ClienteHttp } from '../../compartido/http';
import { borrarAlmacenDelPanel } from '../almacen';
import {
  crearProveedorFirebase,
  ErrorAcceso,
  leerConfiguracion,
  mensajeDeAcceso,
  type ProveedorAcceso,
  type UsuarioAcceso,
} from './proveedor';

/** Si Firebase no contesta en este tiempo (redirect colgado, red lenta) no dejamos «Cargando» eterno. */
export const TOPE_CARGA_MS = 15_000;

/** Pruebas y otras áreas pueden entregar su propio proveedor (el SDK simulado). */
export type FabricaProveedor = () => Promise<ProveedorAcceso>;

export type EstadoSesion =
  | { tipo: 'cargando' }
  | { tipo: 'sin-configurar' }
  | { tipo: 'sin-sesion' }
  | { tipo: 'con-sesion'; usuario: UsuarioAcceso };

export interface ContextoSesion {
  estado: EstadoSesion;
  /** Último error de acceso (cancelado, enlace vencido…) para mostrarlo en la pantalla de acceso. */
  error: ErrorAcceso | null;
  /** Hubo un 401 que no se pudo renovar: la pantalla de acceso lo explica una vez. */
  expirada: boolean;
  /**
   * El SDK no cargó (red móvil mala) o Firebase tardó más del tope: no hay proveedor con el que
   * entrar. Los botones de acceso se bloquean y `reintentarCarga` vuelve a pedirlo.
   */
  fallaCarga: boolean;
  reintentarCarga(): void;
  /** Cliente HTTP con `Authorization: Bearer` y manejo de 401. */
  api: ClienteHttp;
  proveedor: ProveedorAcceso | null;
  entrarConGoogle(): Promise<void>;
  enviarEnlace(correo: string): Promise<void>;
  completarEnlace(url: string, correo: string): Promise<void>;
  salir(): Promise<void>;
  limpiarError(): void;
}

const Contexto = createContext<ContextoSesion | null>(null);

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return contexto;
}

const porDefecto: FabricaProveedor = () => {
  const config = leerConfiguracion();
  if (!config) return Promise.reject(new ErrorAcceso('sin-configurar', 'sin configuración'));
  return crearProveedorFirebase(config);
};

export function SesionProvider({
  children,
  fabrica = porDefecto,
}: {
  children: ReactNode;
  fabrica?: FabricaProveedor;
}) {
  const [estado, setEstado] = useState<EstadoSesion>({ tipo: 'cargando' });
  const [error, setError] = useState<ErrorAcceso | null>(null);
  const [expirada, setExpirada] = useState(false);
  const [proveedor, setProveedor] = useState<ProveedorAcceso | null>(null);
  const [fallaCarga, setFallaCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  // El ID token propio vive sólo aquí, en memoria: nuestro código jamás lo escribe en el
  // almacenamiento. (El SDK de Firebase sí guarda su sesión —con el refresh token— en IndexedDB
  // para sobrevivir a una recarga; ver 04 §11, fila T-1.10.)
  const token = useRef<string | null>(null);
  const proveedorRef = useRef<ProveedorAcceso | null>(null);
  // ¿Hay una sesión que cerrar? Un 401 en vuelo que llega después de cerrar no la «expira».
  const activa = useRef(false);

  useEffect(() => {
    let vivo = true;
    let baja: (() => void) | undefined;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let emitido = false;
    setEstado({ tipo: 'cargando' });
    setFallaCarga(false);
    fabrica().then(
      (p) => {
        if (!vivo) return;
        proveedorRef.current = p;
        setProveedor(p);
        temporizador = setTimeout(() => {
          if (!vivo || emitido) return;
          emitido = true;
          setFallaCarga(true);
          setError(new ErrorAcceso('sin-red', mensajeDeAcceso('sin-red')));
          setEstado((actual) => (actual.tipo === 'cargando' ? { tipo: 'sin-sesion' } : actual));
        }, TOPE_CARGA_MS);
        baja = p.suscribir(
          (usuario, nuevoToken) => {
            emitido = true;
            clearTimeout(temporizador);
            token.current = nuevoToken;
            activa.current = usuario !== null;
            setFallaCarga(false);
            if (usuario) {
              // Entrar limpia los avisos viejos («Tu sesión terminó», «Cancelaste el acceso»).
              setExpirada(false);
              setError(null);
            }
            setEstado(usuario ? { tipo: 'con-sesion', usuario } : { tipo: 'sin-sesion' });
          },
          (e) => {
            emitido = true;
            clearTimeout(temporizador);
            setError(e);
            setEstado((actual) => (actual.tipo === 'cargando' ? { tipo: 'sin-sesion' } : actual));
          },
        );
      },
      (e: unknown) => {
        if (!vivo) return;
        proveedorRef.current = null;
        setProveedor(null);
        if (e instanceof ErrorAcceso && e.codigo === 'sin-configurar') {
          setEstado({ tipo: 'sin-configurar' });
        } else {
          // El trozo del SDK no llegó: sin proveedor no se puede entrar, y la pantalla lo dice.
          setFallaCarga(true);
          setError(new ErrorAcceso('sin-red', mensajeDeAcceso('sin-red')));
          setEstado({ tipo: 'sin-sesion' });
        }
      },
    );
    return () => {
      vivo = false;
      clearTimeout(temporizador);
      baja?.();
    };
  }, [fabrica, intento]);

  const reintentarCarga = useCallback(() => {
    setError(null);
    setIntento((n) => n + 1);
  }, []);

  /** Cierre voluntario: limpia todo lo de la cuenta y los avisos. Nunca rechaza. */
  const salir = useCallback(async () => {
    activa.current = false;
    token.current = null;
    borrarAlmacenDelPanel();
    setExpirada(false);
    setError(null);
    try {
      await proveedorRef.current?.salir();
    } catch {
      // `signOut` falló (IndexedDB bloqueado): la sesión sigue en pie, que vuelva a intentarlo.
      activa.current = true;
    }
  }, []);

  const api = useMemo(
    () =>
      crearCliente({
        token: () => token.current,
        renovar: async () => {
          // Si `renovar` lanza (red caída) la sesión se conserva: el cliente falla con SIN_RED.
          const fresco = (await proveedorRef.current?.renovar()) ?? null;
          if (fresco) token.current = fresco;
          return fresco;
        },
        alNoAutorizado: () => {
          // 401 tras renovar (o sin usuario): la sesión no vale. Se cierra y `onIdTokenChanged(null)`
          // manda a /admin/acceso con el aviso. Si ya no había sesión (cierre voluntario), se ignora.
          if (!activa.current) return;
          activa.current = false;
          token.current = null;
          setExpirada(true);
          (proveedorRef.current?.salir() ?? Promise.resolve()).catch(() => {
            setEstado({ tipo: 'sin-sesion' });
          });
        },
      }),
    [],
  );

  const sinProveedor = () => new ErrorAcceso('sin-red', mensajeDeAcceso('sin-red'));

  const valor = useMemo<ContextoSesion>(
    () => ({
      estado,
      error,
      expirada,
      api,
      proveedor,
      fallaCarga,
      reintentarCarga,
      limpiarError: () => setError(null),
      salir,
      entrarConGoogle: async () => {
        setError(null);
        try {
          if (!proveedorRef.current) throw sinProveedor();
          await proveedorRef.current.entrarConGoogle();
        } catch (e) {
          setError(e as ErrorAcceso);
        }
      },
      enviarEnlace: async (correo) => {
        setError(null);
        if (!proveedorRef.current) throw sinProveedor();
        await proveedorRef.current.enviarEnlace(correo);
      },
      completarEnlace: async (url, correo) => {
        setError(null);
        if (!proveedorRef.current) throw sinProveedor();
        await proveedorRef.current.completarEnlace(url, correo);
      },
    }),
    [estado, error, expirada, fallaCarga, reintentarCarga, api, proveedor, salir],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
