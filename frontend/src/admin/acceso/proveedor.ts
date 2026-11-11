/**
 * Acceso del operador con Firebase Auth (Google y enlace por correo).
 *
 * Este es el ÚNICO archivo que importa `firebase/*`, siempre con `import()` dinámico: el SDK
 * viaja en el trozo del área `/admin` (o en uno propio), nunca en el bundle inicial.
 * El resto de la app habla con la interfaz `ProveedorAcceso`, que las pruebas sustituyen.
 *
 * Flujo: `signInWithPopup` para Google (con `signInWithRedirect` de respaldo si el navegador
 * bloquea la ventana) y `sendSignInLinkToEmail` para el correo. El redirect a secas no sirve
 * con el `authDomain` en `firebaseapp.com`: Safari y Chrome recientes particionan el
 * almacenamiento de terceros y el resultado no se puede leer al volver (staging, 11 de
 * noviembre de 2026). Dominios que exige: ver 04 §11, fila «T-1.10».
 */

export interface UsuarioAcceso {
  correo: string | null;
  nombre: string | null;
}

export type CodigoErrorAcceso =
  | 'sin-configurar'
  | 'sin-red'
  | 'enlace-invalido'
  | 'correo-invalido'
  | 'demasiados-intentos'
  | 'cuenta-deshabilitada'
  | 'cancelado'
  | 'otro';

export class ErrorAcceso extends Error {
  constructor(
    readonly codigo: CodigoErrorAcceso,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorAcceso';
  }
}

const MENSAJES: Record<CodigoErrorAcceso, string> = {
  'sin-configurar': 'El acceso todavía no está configurado en este entorno.',
  'sin-red': 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.',
  'enlace-invalido': 'Este enlace ya no sirve. Pide uno nuevo con tu correo.',
  'correo-invalido': 'Revisa tu correo: no parece una dirección válida.',
  'demasiados-intentos': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  'cuenta-deshabilitada': 'Esta cuenta está deshabilitada. Habla con quien administra tu restaurante.',
  cancelado: 'Cancelaste el acceso. Cuando quieras, vuelve a intentarlo.',
  otro: 'No pudimos darte acceso. Inténtalo de nuevo en un momento.',
};

export const mensajeDeAcceso = (codigo: CodigoErrorAcceso): string => MENSAJES[codigo];

/** Cambio de sesión: usuario y su ID token (o `null, null` si no hay sesión). */
export type AlCambiarSesion = (usuario: UsuarioAcceso | null, token: string | null) => void;

export interface ProveedorAcceso {
  /** Avisa de cada cambio (incluida la renovación del token). Devuelve la baja. */
  suscribir(alCambiar: AlCambiarSesion, alError: (error: ErrorAcceso) => void): () => void;
  entrarConGoogle(): Promise<void>;
  enviarEnlace(correo: string): Promise<void>;
  esEnlace(url: string): Promise<boolean>;
  completarEnlace(url: string, correo: string): Promise<void>;
  /**
   * Token fresco para reintentar tras un 401. `null` = la sesión ya no existe. Lanza `ErrorAcceso`
   * (`sin-red`) si no pudo preguntar: la sesión se conserva.
   */
  renovar(): Promise<string | null>;
  salir(): Promise<void>;
}

export interface ConfiguracionFirebase {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

/** Lee `VITE_FIREBASE_*`. Si falta algo no se inventa: el acceso queda «sin configurar». */
export function leerConfiguracion(
  env: Partial<Record<string, string | undefined>> = import.meta.env,
): ConfiguracionFirebase | null {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  return Object.values(config).every(Boolean) ? (config as ConfiguracionFirebase) : null;
}

function aErrorAcceso(error: unknown): ErrorAcceso {
  if (error instanceof ErrorAcceso) return error;
  const codigo = (error as { code?: unknown } | null)?.code;
  switch (codigo) {
    case 'auth/network-request-failed':
      return new ErrorAcceso('sin-red', MENSAJES['sin-red']);
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
    case 'auth/invalid-email':
      return new ErrorAcceso(
        codigo === 'auth/invalid-email' ? 'correo-invalido' : 'enlace-invalido',
        MENSAJES[codigo === 'auth/invalid-email' ? 'correo-invalido' : 'enlace-invalido'],
      );
    case 'auth/too-many-requests':
      return new ErrorAcceso('demasiados-intentos', MENSAJES['demasiados-intentos']);
    case 'auth/user-disabled':
      return new ErrorAcceso('cuenta-deshabilitada', MENSAJES['cuenta-deshabilitada']);
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new ErrorAcceso('cancelado', MENSAJES.cancelado);
    default:
      return new ErrorAcceso('otro', MENSAJES.otro);
  }
}

/** Carga el SDK bajo demanda y arma el proveedor real. */
export async function crearProveedorFirebase(
  config: ConfiguracionFirebase,
  origen: string = window.location.origin,
): Promise<ProveedorAcceso> {
  const [{ initializeApp, getApps, getApp }, auth] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps().length ? getApp() : initializeApp(config);
  // `initializeAuth` con lo mínimo (en vez de `getAuth`) para que el trozo sea lo más chico posible.
  // Persistencia: IndexedDB o, si no existe, memoria; NUNCA `localStorage` (el SDK guardaría ahí
  // el access y el refresh token en claro: `firebase:authUser:…`).
  let instancia: ReturnType<typeof auth.initializeAuth>;
  try {
    instancia = auth.initializeAuth(app, {
      persistence: [auth.indexedDBLocalPersistence, auth.inMemoryPersistence],
      popupRedirectResolver: auth.browserPopupRedirectResolver,
    });
  } catch {
    // Reintento tras «Reintentar» (otra carga del proveedor sobre la misma app): ya está inicializado.
    instancia = auth.getAuth(app);
  }

  return {
    suscribir(alCambiar, alError) {
      // Al volver de Google el resultado del redirect se consume una vez; `onIdTokenChanged`
      // dispara después con el usuario ya autenticado.
      auth.getRedirectResult(instancia).catch((e: unknown) => alError(aErrorAcceso(e)));
      return auth.onIdTokenChanged(
        instancia,
        (usuario) => {
          if (!usuario) return alCambiar(null, null);
          usuario
            .getIdToken()
            .then((token) =>
              alCambiar({ correo: usuario.email, nombre: usuario.displayName }, token),
            )
            .catch((e: unknown) => alError(aErrorAcceso(e)));
        },
        (e) => alError(aErrorAcceso(e)),
      );
    },
    async entrarConGoogle() {
      // Popup primero: la ventana devuelve el resultado por `postMessage` y no depende del
      // almacenamiento del dominio de Firebase. Si el navegador bloquea la ventana, el redirect
      // (navega fuera de la app; la promesa no vuelve a esta página) queda de respaldo.
      const google = new auth.GoogleAuthProvider();
      try {
        await auth.signInWithPopup(instancia, google);
      } catch (e) {
        const codigo = (e as { code?: unknown } | null)?.code;
        if (
          codigo === 'auth/popup-blocked' ||
          codigo === 'auth/operation-not-supported-in-this-environment'
        ) {
          try {
            await auth.signInWithRedirect(instancia, google);
          } catch (e2) {
            throw aErrorAcceso(e2);
          }
          return;
        }
        throw aErrorAcceso(e);
      }
    },
    async enviarEnlace(correo) {
      try {
        await auth.sendSignInLinkToEmail(instancia, correo, {
          url: `${origen}/admin/acceso`,
          handleCodeInApp: true,
        });
      } catch (e) {
        throw aErrorAcceso(e);
      }
    },
    async esEnlace(url) {
      return auth.isSignInWithEmailLink(instancia, url);
    },
    async completarEnlace(url, correo) {
      try {
        await auth.signInWithEmailLink(instancia, correo, url);
      } catch (e) {
        throw aErrorAcceso(e);
      }
    },
    async renovar() {
      try {
        return (await instancia.currentUser?.getIdToken(true)) ?? null;
      } catch (e) {
        const error = aErrorAcceso(e);
        // Sin red o con límite de intentos el token puede seguir valiendo: se avisa, no se cierra.
        if (error.codigo === 'sin-red' || error.codigo === 'demasiados-intentos') throw error;
        // Refresh token revocado, usuario borrado o deshabilitado: la sesión ya no existe.
        return null;
      }
    },
    async salir() {
      await auth.signOut(instancia);
    },
  };
}
