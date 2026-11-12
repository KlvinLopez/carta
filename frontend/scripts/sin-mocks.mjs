// Ningún módulo de `src/mocks/` (contrato simulado, datos de ejemplo, el `openapi.json` de pruebas) puede entrar al
// build de producción: pesan, llevan códigos de mesa y errores de mentira, y no son del producto. Vale para cualquier
// forma de importarlos (`import *`, `import()`, efectos laterales); se mira el grafo de módulos del bundle, no el texto.
// `presupuesto.mjs` conserva además su guarda por marcas de contenido (defensa en profundidad).
const ES_MOCK = /[\\/]src[\\/]mocks[\\/]/;

/** Plugin de Vite: rechaza el build si algún trozo incluye un módulo de `src/mocks/`. */
export function sinMocksEnProduccion() {
  return {
    name: 'carta-sin-mocks-en-produccion',
    apply: 'build',
    generateBundle(_opciones, bundle) {
      const culpables = [];
      for (const trozo of Object.values(bundle)) {
        if (trozo.type !== 'chunk') continue;
        for (const id of Object.keys(trozo.modules ?? {})) {
          if (ES_MOCK.test(id)) culpables.push(`${trozo.fileName} ← ${id.split('/src/').pop()}`);
        }
      }
      if (culpables.length > 0) {
        this.error(`Datos simulados en el build de producción (src/mocks/ no puede importarse desde código del producto): ${culpables.join('; ')}`);
      }
    },
  };
}
