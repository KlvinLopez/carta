import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

import { entradasDelArmazon } from './scripts/armazon.mjs';

// Una SPA con tres áreas (/m, /staff, /admin). Cada área entra con React.lazy, así que Vite
// la deja en su propio trozo; el bundle inicial sólo lleva React, el router y lo compartido.
export default defineConfig({
  plugins: [
    react(),
    // Service worker (T-2.7): `src/sw.ts` con Workbox; el plugin sólo lo compila e inyecta la lista de
    // precarga. Sin registro automático (la CSP no admite scripts en línea; registra `src/pwa/registro.ts`),
    // sin manifest generado (el de `public/` ya existe) y apagado en `vite dev` y en vitest.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      manifest: false,
      devOptions: { enabled: false },
      injectManifest: {
        // Se filtra a mano (scripts/armazon.mjs): sólo lo que necesita el comensal, nada de /admin ni Firebase.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        manifestTransforms: [entradasDelArmazon],
        maximumFileSizeToCacheInBytes: 600 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Los tres trozos de área se llaman igual (`Area`): se distinguen por la carpeta para que el
        // armazón del service worker pueda precargar sólo el del comensal.
        chunkFileNames: (chunk) => {
          if (chunk.name !== 'Area') return 'assets/[name]-[hash].js';
          const modulos = chunk.moduleIds.map((m) => m.replaceAll('\\', '/'));
          const area = ['comensal', 'personal', 'admin'].find((a) => modulos.some((m) => m.endsWith(`/src/${a}/Area.tsx`)));
          return area ? `assets/Area-${area}-[hash].js` : 'assets/Area-[hash].js';
        },
      },
    },
  },
  server: {
    port: 5173,
    // En desarrollo la API corre aparte; en producción comparten dominio (ADR-010, ADR-015).
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
