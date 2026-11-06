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
import {
  crearProveedorFirebase,
  ErrorAcceso,
  leerConfiguracion,
  type ProveedorAcceso,
  type UsuarioAcceso,
} from './proveedor';

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
  // El ID token vive sólo aquí, en memoria. Firebase guarda su propia sesión (IndexedDB) para
  // sobrevivir a una recarga; nosotros nunca escribimos el token en el almacenamiento.
  const token = useRef<string | null>(null);
  const proveedorRef = useRef<ProveedorAcceso | null>(null);

  useEffect(() => {
    let vivo = true;
    let baja: (() => void) | undefined;
    fabrica().then(
      (p) => {
        if (!vivo) return;
        proveedorRef.current = p;
        setProveedor(p);
        baja = p.suscribir(
          (usuario, nuevoToken) => {
            token.current = nuevoToken;
            setEstado(usuario ? { tipo: 'con-sesion', usuario } : { tipo: 'sin-sesion' });
            if (usuario) setExpirada(false);
          },
          (e) => {
            setError(e);
            setEstado((actual) => (actual.tipo === 'cargando' ? { tipo: 'sin-sesion' } : actual));
          },
        );
      },
      (e: unknown) => {
        if (!vivo) return;
        if (e instanceof ErrorAcceso && e.codigo === 'sin-configurar') {
          setEstado({ tipo: 'sin-configurar' });
        } else {
          setError(new ErrorAcceso('otro', 'No pudimos cargar el acceso.'));
          setEstado({ tipo: 'sin-sesion' });
        }
      },
    );
    return () => {
      vivo = false;
      baja?.();
    };
  }, [fabrica]);

  const salir = useCallback(async () => {
    token.current = null;
    await proveedorRef.current?.salir();
  }, []);

  const api = useMemo(
    () =>
      crearCliente({
        token: () => token.current,
        renovar: async () => {
          const fresco = (await proveedorRef.current?.renovar()) ?? null;
          token.current = fresco;
          return fresco;
        },
        alNoAutorizado: () => {
          // 401 tras renovar: la sesión no vale. `salir` dispara `onIdTokenChanged(null)` y la
          // ruta protegida manda a /admin/acceso.
          setExpirada(true);
          void salir();
        },
      }),
    [salir],
  );

  const valor = useMemo<ContextoSesion>(
    () => ({
      estado,
      error,
      expirada,
      api,
      proveedor,
      limpiarError: () => setError(null),
      salir,
      entrarConGoogle: async () => {
        setError(null);
        try {
          await proveedorRef.current?.entrarConGoogle();
        } catch (e) {
          setError(e as ErrorAcceso);
        }
      },
      enviarEnlace: async (correo) => {
        setError(null);
        await proveedorRef.current?.enviarEnlace(correo);
      },
      completarEnlace: async (url, correo) => {
        setError(null);
        await proveedorRef.current?.completarEnlace(url, correo);
      },
    }),
    [estado, error, expirada, api, proveedor, salir],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
