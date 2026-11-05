# Frontend de Carta

Una SPA (Vite + React 18 + TypeScript + React Router) con tres áreas que se cargan por separado:

| Ruta | Área | Carpeta | Fase |
|---|---|---|---|
| `/m/:codigo` | Comensal (anónimo, QR de la mesa) | `src/comensal/` | 2 |
| `/staff/:slug` | Personal (mesero y capitán, PIN) | `src/personal/` | 3 |
| `/admin` | Operador (dueño o gerente) | `src/admin/` | 1 |

`src/compartido/` tiene los tokens (`tokens.css`), las fuentes y el reinicio (`base.css`), los componentes base (`componentes/`: `Boton`, `Chip`, `Tarjeta`, `HojaInferior`, `Avatar`), el armazón de pantalla (`pantalla/`) y los tipos del contrato (`api.d.ts`, generado).

## Comandos

```bash
npm ci                     # dependencias exactas (package-lock.json)
npm run dev                # Vite en :5173; /api se redirige a la API en :8000
npm test                   # vitest + Testing Library (jsdom)
npm run build              # tsc -b && vite build → dist/
npm run presupuesto        # node scripts/presupuesto.mjs: bundle inicial ≤ 250 KB gzip
npm run tipos              # regenera src/compartido/api.d.ts desde http://localhost:8000/openapi.json
```

`npm run tipos` necesita la API levantada (`uv run uvicorn app.main:app --port 8000`). El archivo generado **se commitea** para que la build no dependa del backend; cuando cambie el contrato, vuelve a correrlo y commitea el resultado.

## Reglas de diseño

Todo lo visible sigue el skill `/diseno-visual` (`.claude/skills/diseno-visual/SKILL.md`): fondo Crema, DM Serif Display en títulos y DM Sans en el resto, regla "no-line" (sin bordes de 1 px para separar), radios ≥ 20 px, botones píldora, sombras cálidas, hojas inferiores en lugar de modales, áreas táctiles ≥ 44 px, teléfono primero (390 px).

- Las fuentes viven en `public/fonts/` con su licencia OFL y se declaran en `base.css`; nunca se cargan desde Google Fonts.
- CSS con variables y módulos (`*.module.css`). Sin Tailwind ni librerías de componentes.
- Sin estilos en línea (`style={{…}}`): la CSP de producción no permite `unsafe-inline` (02 §12). Los valores variables (color del avatar, tamaño) se expresan con clases.
- Las pantallas de T-0.5 son marcadores de posición que ejercitan los tokens; las reales llegan en las fases 1 a 3.

## Presupuesto del bundle

`scripts/presupuesto.mjs` suma lo que `dist/index.html` carga para la primera pantalla (scripts de módulo, `modulepreload` y hojas de estilo) y falla si supera **250 KB comprimidos con gzip nivel 9**. Brotli se imprime como referencia. Los trozos de cada área (`React.lazy`) no cuentan: se descargan al navegar.

## Versiones

Fijadas sin `^` en `package.json`; `package-lock.json` se commitea y el Verificar usa `npm ci`. Se eligió Vite 7 con `@vitejs/plugin-react` 5 y vitest 5 (que soporta Vite 7 y 8): la rama Vite 8 del plugin exige peers adicionales (`oxc-transform-react`, `@rolldown/plugin-babel`) que no aportan nada al esqueleto. React se queda en 18.3.1 como pide el plan (02 §3); React Router 7 funciona con React 18.
