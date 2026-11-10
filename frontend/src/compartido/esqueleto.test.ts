import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = resolve(__dirname, '../..'); // frontend/
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8');
const tokens = Object.fromEntries(
  [...leer('src/compartido/tokens.css').matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [
    m[1],
    m[2]!.trim().toLowerCase(),
  ]),
) as Record<string, string>;

describe('tokens.css sigue el skill /diseno-visual', () => {
  it('declara la paleta con los valores del skill', () => {
    expect(tokens).toMatchObject({
      crema: '#fef9f1',
      'crema-baja': '#f8f1e5',
      superficie: '#ffffff',
      vino: '#4f1728',
      'vino-claro': '#6b2d3e',
      dorado: '#b8860b',
      carbon: '#1a1a1a',
      'carbon-suave': '#5b4a3d',
      sombra: '0 20px 40px rgba(29, 28, 23, 0.06)',
      tactil: '44px',
      'radio-pildora': '9999px',
    });
  });

  it('ningún radio de contenedor baja de 20 px', () => {
    for (const nombre of ['radio', 'radio-grande', 'radio-hoja']) {
      expect(parseInt(tokens[nombre]!, 10), nombre).toBeGreaterThanOrEqual(20);
    }
  });

  it('nunca negro ni blanco puro de fondo de página', () => {
    expect(Object.values(tokens)).not.toContain('#000000');
    expect(Object.values(tokens)).not.toContain('#000');
    expect(tokens.crema).not.toBe('#ffffff');
  });

  it('las familias tipográficas son DM Serif Display y DM Sans', () => {
    expect(tokens['fuente-titulo']).toContain("'dm serif display'");
    expect(tokens['fuente-cuerpo']).toContain("'dm sans'");
  });
});

// ── Contraste WCAG 2 ────────────────────────────────────────────────────────
type RGB = [number, number, number];

function colorDe(valor: string): RGB {
  const hex = valor.match(/^#([0-9a-f]{6})$/);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16)) as RGB;
  throw new Error(`color no reconocido: ${valor}`);
}

/** rgba(r, g, b, a) sobre un fondo opaco → color opaco resultante. */
function aplanar(valor: string, fondo: RGB): RGB {
  const m = valor.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (!m) return colorDe(valor);
  const alfa = Number(m[4]);
  return [1, 2, 3].map((i) => Math.round(Number(m[i]) * alfa + fondo[i - 1]! * (1 - alfa))) as RGB;
}

function luminancia([r, g, b]: RGB): number {
  const lineal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

function contraste(texto: RGB, fondo: RGB): number {
  const [claro, oscuro] = [luminancia(texto), luminancia(fondo)].sort((a, b) => b - a);
  return (claro! + 0.05) / (oscuro! + 0.05);
}

describe('contraste AA (≥ 4.5:1) de los pares texto/fondo que usan los componentes', () => {
  const crema = colorDe(tokens.crema!);
  const pares: [string, string, string][] = [
    ['carbon', 'crema', 'texto principal'],
    ['carbon-suave', 'crema', 'texto secundario'],
    ['carbon-suave', 'crema-baja', 'texto secundario sobre agrupación'],
    ['vino', 'crema', 'enlaces y botón fantasma'],
    ['vino', 'vino-tenue', 'Chip vino'],
    ['dorado-oscuro', 'dorado-tenue', 'Chip dorado'],
    ['exito', 'exito-tenue', 'Chip éxito'],
    ['error', 'error-tenue', 'Chip error'],
    ['aviso', 'aviso-tenue', 'aviso'],
    ['mesa-libre', 'crema', 'estado de mesa libre'],
    ['carbon-suave', 'crema-alta', 'Chip neutro'],
    ['carbon', 'dorado', 'Boton dorado (inicio del gradiente)'],
    ['sobre-vino', 'vino-claro', 'Boton primario (fin del gradiente)'],
  ];
  it.each(pares)('%s sobre %s (%s)', (texto, fondo, _uso) => {
    const fondoOpaco = aplanar(tokens[fondo]!, crema);
    expect(contraste(colorDe(tokens[texto]!), fondoOpaco)).toBeGreaterThanOrEqual(4.5);
  });

  it('Boton dorado: carbón sobre el fin del gradiente (#d4a017) también cumple', () => {
    expect(contraste(colorDe(tokens.carbon!), colorDe('#d4a017'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('fuentes propias (base.css)', () => {
  const base = leer('src/compartido/base.css');

  it('cada @font-face apunta a un archivo que existe en public/fonts con font-display: swap', () => {
    const urls = [...base.matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map((m) => m[1]!);
    expect(urls.length).toBeGreaterThanOrEqual(2);
    for (const url of urls) expect(existsSync(join(raiz, 'public', url)), url).toBe(true);
    expect(base.match(/@font-face/g)?.length).toBe(base.match(/font-display:\s*swap/g)?.length);
    expect(base).toMatch(/font-family:\s*'DM Serif Display'/);
    expect(base).toMatch(/font-family:\s*'DM Sans'/);
  });

  it('sin Google Fonts y con licencia OFL junto a cada familia', () => {
    expect(base).not.toContain('googleapis');
    expect(leer('index.html')).not.toContain('googleapis');
    expect(existsSync(join(raiz, 'public/fonts/OFL-DMSans.txt'))).toBe(true);
    expect(existsSync(join(raiz, 'public/fonts/OFL-DMSerifDisplay.txt'))).toBe(true);
  });

  it('la animación de pantalla no deja un transform residual (bloque contenedor de position: fixed)', () => {
    expect(base).toMatch(/\.pantalla\s*\{[^}]*animation:[^;]*\bbackwards\b/);
    expect(base).not.toMatch(/\.pantalla\s*\{[^}]*animation:[^;]*\bboth\b/);
  });

  it('bajo prefers-reduced-motion ninguna animación queda infinita', () => {
    expect(base).toMatch(/prefers-reduced-motion[\s\S]*animation-iteration-count:\s*1\s*!important/);
  });
});

describe('manifest.webmanifest e index.html', () => {
  it('el manifest es JSON válido con los campos obligatorios y sus íconos existen', () => {
    const manifest = JSON.parse(leer('public/manifest.webmanifest')) as Record<string, unknown>;
    expect(manifest).toMatchObject({
      name: 'Carta',
      short_name: 'Carta',
      start_url: '/',
      display: 'standalone',
      lang: 'es',
    });
    expect(manifest).not.toHaveProperty('orientation'); // el panel del operador se usa en escritorio
    expect((manifest.theme_color as string).toLowerCase()).toBe(tokens.vino);
    expect((manifest.background_color as string).toLowerCase()).toBe(tokens.crema);
    const iconos = manifest.icons as { src: string; purpose?: string; type?: string }[];
    expect(iconos.length).toBeGreaterThanOrEqual(2);
    for (const icono of iconos) expect(existsSync(join(raiz, 'public', icono.src)), icono.src).toBe(true);
    expect(iconos.some((i) => i.purpose === 'maskable')).toBe(true);
    expect(iconos.some((i) => i.type === 'image/png' && i.purpose === 'any')).toBe(true);
  });

  it('index.html enlaza el manifest, un apple-touch-icon PNG, noscript y precarga fuentes que existen', () => {
    const html = leer('index.html');
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/);
    expect(html).toContain('<div id="app">');
    expect(html).toContain('<noscript>');
    const apple = html.match(/rel="apple-touch-icon" href="([^"]+)"/)?.[1];
    expect(apple).toMatch(/\.png$/);
    expect(existsSync(join(raiz, 'public', apple!))).toBe(true);
    for (const [, href] of html.matchAll(/rel="preload" href="(\/fonts\/[^"]+)"/g)) {
      expect(existsSync(join(raiz, 'public', href!)), href).toBe(true);
    }
  });
});
