#!/usr/bin/env node
// Regenera, desde el código del backend y sin levantar el servidor, lo que el frontend toma del contrato
// (T-2.7): `src/mocks/openapi.json` (lo que validan los simulados con Ajv) y `src/compartido/api.d.ts` (los
// tipos). La CI corre esto y falla si cambian (`git diff --exit-code`): un esquema del backend que cambió sin
// regenerar el frontend no llega a `master`.
//
//   npm --prefix frontend run sincronizar
//
// `api.d.ts` sale del mismo documento que sirve `/openapi.json` (`app.openapi()`, en el orden del código), así
// que es idéntico a lo que da `npm run tipos` contra una API en marcha; `openapi.json` va con las claves
// ordenadas (diffs estables), igual que `npm run contrato`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(frontend, '..');

const volcar = (ordenado) =>
  execFileSync('uv', ['run', 'python', '-c', `import json; from app.main import app; print(json.dumps(app.openapi()${ordenado ? ', sort_keys=True' : ''}))`], {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });

writeFileSync(join(frontend, 'src', 'mocks', 'openapi.json'), volcar(true));
const temporal = mkdtempSync(join(tmpdir(), 'contrato-'));
try {
  const entrada = join(temporal, 'openapi.json');
  writeFileSync(entrada, volcar(false));
  execFileSync(process.execPath, [join(frontend, 'node_modules', 'openapi-typescript', 'bin', 'cli.js'), entrada, '-o', join(frontend, 'src', 'compartido', 'api.d.ts')], { stdio: 'inherit' });
} finally {
  rmSync(temporal, { recursive: true, force: true });
}
console.log('Contrato sincronizado: src/mocks/openapi.json y src/compartido/api.d.ts.');
