// Carga una página con el Chromium instalado y devuelve JSON {status, text, links}. Sin disfraces de agente ni complementos.
// Uso: node 2026-11-13-muestra-500-lector-chromium.mjs <url>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => null);
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body ? document.body.innerText : '');
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map((a) => ({ href: a.href, text: (a.innerText || '').trim() })),
    );
    process.stdout.write(JSON.stringify({ status: resp ? resp.status() : 0, text, links }));
  } finally {
    await browser.close();
  }
})().catch(() => process.exit(1));
