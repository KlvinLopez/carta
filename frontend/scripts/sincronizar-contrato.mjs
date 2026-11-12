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
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(frontend, '..');

// Python **escribe el JSON en el archivo** cuya ruta recibe: nada de leer su stdout. Al importar `app.main` sin
// `frontend/dist` (la CI) la aplicación escribe un aviso de log en stdout, y eso acabó dentro del JSON.
const PROGRAMA = 'import json, sys; from app.main import app; open(sys.argv[1], "w", encoding="utf-8").write(json.dumps(app.openapi(), sort_keys=(sys.argv[2] == "1")) + "\\n")';
function volcar(destino, ordenado) {
  execFileSync('uv', ['run', 'python', '-c', PROGRAMA, destino, ordenado ? '1' : '0'], { cwd: repo, stdio: ['ignore', 'ignore', 'inherit'] });
}

volcar(join(frontend, 'src', 'mocks', 'openapi.json'), true);
const temporal = mkdtempSync(join(tmpdir(), 'contrato-'));
try {
  const entrada = join(temporal, 'openapi.json');
  volcar(entrada, false);
  execFileSync(process.execPath, [join(frontend, 'node_modules', 'openapi-typescript', 'bin', 'cli.js'), entrada, '-o', join(frontend, 'src', 'compartido', 'api.d.ts')], { stdio: 'inherit' });
} finally {
  rmSync(temporal, { recursive: true, force: true });
}
console.log('Contrato sincronizado: src/mocks/openapi.json y src/compartido/api.d.ts.');
