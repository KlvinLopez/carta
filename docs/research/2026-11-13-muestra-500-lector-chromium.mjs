// Carga una página con el Chromium instalado y devuelve JSON {status, final_url, text, links}. Sin disfraces de agente ni
// complementos. Aborta toda petición (la página, sus redirecciones, imágenes, scripts…) cuyo destino no resuelva sólo a
// direcciones IP públicas, y las que no sean http/https en los puertos 80/443.
// Uso: node 2026-11-13-muestra-500-lector-chromium.mjs <url>
import { createRequire } from 'node:module';
import dns from 'node:dns/promises';
import net from 'node:net';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// ¿Es una dirección IP pública (global)? Espejo de ipaddress.is_global de Python para los rangos que importan.
export function ipEsPublica(ip) {
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    const mapeada = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapeada) return ipEsPublica(mapeada[1]);
    if (l === '::' || l === '::1') return false;
    if (/^f[cd]/.test(l)) return false; // fc00::/7 única local
    if (/^fe[89ab]/.test(l)) return false; // fe80::/10 enlace local
    if (/^ff/.test(l)) return false; // multidifusión
    if (l.startsWith('2001:db8')) return false; // documentación
    return true;
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !(n >= 0 && n <= 255))) return false;
  const [a, b, c] = p;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false; // enlace local (metadatos de la nube)
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64/10 compartida
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a >= 224) return false; // multidifusión y reservadas
  return true;
}

export async function destinoPermitido(urlTexto, resolver = dns.lookup) {
  let u;
  try {
    u = new URL(urlTexto);
  } catch {
    return false;
  }
  if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') return true; // sin red
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.port && u.port !== '80' && u.port !== '443') return false;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return ipEsPublica(host);
  try {
    const dirs = await resolver(host, { all: true });
    return dirs.length > 0 && dirs.every((d) => ipEsPublica(d.address));
  } catch {
    return false;
  }
}

async function main() {
  const url = process.argv[2];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route('**/*', async (route) => {
      if (await destinoPermitido(route.request().url())) return route.continue();
      return route.abort('blockedbyclient');
    });
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => null);
    await page.waitForTimeout(1500);
    const final_url = page.url();
    if (!(await destinoPermitido(final_url))) {
      process.stdout.write(JSON.stringify({ status: 0, final_url, text: '', links: [] }));
      return;
    }
    const text = await page.evaluate(() => (document.body ? document.body.innerText : ''));
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map((a) => ({ href: a.href, text: (a.innerText || '').trim() })),
    );
    process.stdout.write(JSON.stringify({ status: resp ? resp.status() : 0, final_url, text, links }));
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => process.exit(1));
}
