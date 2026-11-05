import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Una SPA con tres áreas (/m, /staff, /admin). Cada área entra con React.lazy, así que Vite
// la deja en su propio trozo; el bundle inicial sólo lleva React, el router y lo compartido.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
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
