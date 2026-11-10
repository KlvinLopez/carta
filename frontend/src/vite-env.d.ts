/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Configuración web de Firebase (no es secreta; ver frontend/.env.example). */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}
