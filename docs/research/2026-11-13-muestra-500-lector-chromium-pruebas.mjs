// Pruebas (sin red) de las reglas de destino del lector con Chromium: node docs/research/2026-11-13-muestra-500-lector-chromium-pruebas.mjs
import assert from 'node:assert/strict';
import { destinoPermitido, ipEsPublica } from './2026-11-13-muestra-500-lector-chromium.mjs';

for (const ip of ['93.184.216.34', '104.20.23.154', '2606:4700::6810:1']) assert.equal(ipEsPublica(ip), true, ip);
for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.9', '172.31.255.1', '192.168.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', 'fe80::1', 'fd00::1', '::ffff:10.0.0.1'])
  assert.equal(ipEsPublica(ip), false, ip);

const dns = { 'publico.example': ['93.184.216.34'], 'interno.example': ['10.0.0.5'], 'mixto.example': ['93.184.216.34', '192.168.1.1'] };
const resolver = async (h) => {
  if (!dns[h]) throw new Error('no resuelve');
  return dns[h].map((address) => ({ address }));
};
for (const u of ['https://publico.example/menu', 'http://publico.example:80/', 'data:text/plain,hola'])
  assert.equal(await destinoPermitido(u, resolver), true, u);
for (const u of ['file:///etc/passwd', 'ftp://publico.example/', 'http://interno.example/', 'http://169.254.169.254/latest', 'http://127.0.0.1:8080/', 'http://mixto.example/', 'https://publico.example:8443/', 'http://[::1]/', 'http://nada.example/'])
  assert.equal(await destinoPermitido(u, resolver), false, u);
console.log('pruebas del lector con Chromium: ok');
