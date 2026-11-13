// Medición local del camino caliente de Carta (adelanto de T-4.4; ver
// docs/plan/perf/2026-11-13-modelo-de-capacidad.md). Sin dependencias: sólo Node 22.
// Lazo abierto (llegadas de Poisson): la latencia cuenta desde la hora en que la petición
// debió salir, así que una cola en el servidor (o en este cliente) se ve y no se esconde.
//
//   node medir.mjs --codigos codigos.txt --padre <pid de uvicorn> --escenario sondeo304 \
//        --miembros 1200 --por-mesa 12 --tasa 1000 --duracion 20
//
// Escenarios: sondeo304, sondeo200, menu304, menu200, eventos, entrar, o una mezcla
// «sondeo304=0.9,sondeo200=0.07,eventos=0.03». --tasa 0 = lazo cerrado con --conc conexiones.
import http from "node:http";
import fs from "node:fs";

const a = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith("--")) acc.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "1"]);
    return acc;
  }, []),
);
const BASE = new URL(a.base ?? "http://127.0.0.1:8000");
const ESC = a.escenario ?? "sondeo304";
const MIEMBROS = Number(a.miembros ?? 1200);
const POR_MESA = Number(a["por-mesa"] ?? 12);
const TASA = Number(a.tasa ?? 500);
const DURACION = Number(a.duracion ?? 20);
const CALENTAR = Number(a.calentar ?? 3);
const CONC = Number(a.conc ?? 64);
const MAX_VUELO = Number(a["max-vuelo"] ?? 4000);
const SLUG = a.slug ?? "la-ceiba";
const MESA_DESDE = Number(a["mesa-desde"] ?? 0);
const codigos = fs.readFileSync(a.codigos, "utf8").split("\n").filter(Boolean);
const agente = new http.Agent({ keepAlive: true, maxSockets: Math.max(CONC, 512) });

const ipAleatoria = () => `${45 + Math.floor(Math.random() * 150)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 253)}`;

function pedir(metodo, ruta, { cabeceras = {}, cuerpo = null } = {}) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: BASE.hostname, port: BASE.port, path: ruta, method: metodo, agent: agente, headers: cabeceras },
      (res) => {
        const trozos = [];
        res.on("data", (t) => trozos.push(t));
        res.on("end", () => resolve({ estado: res.statusCode, cabeceras: res.headers, cuerpo: Buffer.concat(trozos) }));
      },
    );
    req.on("error", () => resolve({ estado: 0, cabeceras: {}, cuerpo: Buffer.alloc(0) }));
    req.setTimeout(30000, () => req.destroy());
    if (cuerpo) req.write(cuerpo);
    req.end();
  });
}

const JSON_H = { "content-type": "application/json" };
async function entrar(codigo, cookie) {
  const h = { ...JSON_H, "x-forwarded-for": ipAleatoria() };
  if (cookie) h.cookie = cookie;
  return pedir("POST", "/api/v1/p/sesion/entrar", { cabeceras: h, cuerpo: JSON.stringify({ codigo_mesa: codigo }) });
}

// ---- Preparación: miembros con cookie y ETag (se guardan para reutilizarlos) ----
async function preparar() {
  const archivo = a.cache ?? `${a.codigos}.miembros.${MIEMBROS}x${POR_MESA}@${MESA_DESDE}.json`;
  if (fs.existsSync(archivo)) return JSON.parse(fs.readFileSync(archivo, "utf8"));
  const miembros = [];
  const cola = [];
  for (let i = 0; i < MIEMBROS; i++) cola.push({ i, codigo: codigos[MESA_DESDE + Math.floor(i / POR_MESA)] });
  let sig = 0;
  await Promise.all(
    Array.from({ length: 32 }, async () => {
      for (;;) {
        const t = cola[sig++];
        if (!t) return;
        const r = await entrar(t.codigo, null);
        if (r.estado !== 200) throw new Error(`entrar ${r.estado} ${r.cuerpo}`);
        const cookie = r.cabeceras["set-cookie"][0].split(";")[0];
        miembros[t.i] = { cookie, codigo: t.codigo };
      }
    }),
  );
  sig = 0;
  await Promise.all(
    Array.from({ length: 32 }, async () => {
      for (;;) {
        const m = miembros[sig++];
        if (!m) return;
        const r = await pedir("GET", "/api/v1/p/sesion", { cabeceras: { cookie: m.cookie } });
        if (r.estado !== 200) throw new Error(`sesion ${r.estado}`);
        m.etag = r.cabeceras.etag;
      }
    }),
  );
  fs.writeFileSync(archivo, JSON.stringify(miembros));
  return miembros;
}

// ---- Escenarios: cada uno arma la petición para el miembro i ----
let menuEtag = null;
let contadorEntrar = 0;
const ESCENARIOS = {
  sondeo304: (m) => ["GET", "/api/v1/p/sesion", { cabeceras: { cookie: m.cookie, "if-none-match": m.etag } }, 304],
  sondeo200: (m) => ["GET", "/api/v1/p/sesion", { cabeceras: { cookie: m.cookie } }, 200],
  menu304: () => ["GET", `/api/v1/p/menu/${SLUG}`, { cabeceras: { "x-forwarded-for": ipAleatoria(), "if-none-match": menuEtag } }, 304],
  menu200: () => ["GET", `/api/v1/p/menu/${SLUG}`, { cabeceras: { "x-forwarded-for": ipAleatoria() } }, 200],
  eventos: (m) => [
    "POST",
    "/api/v1/p/eventos",
    { cabeceras: { ...JSON_H, cookie: m.cookie, "x-forwarded-for": ipAleatoria() }, cuerpo: JSON.stringify({ eventos: [{ tipo: "menu_view" }] }) },
    202,
  ],
  entrar: () => {
    const k = contadorEntrar++;
    const codigo = codigos[MESA_DESDE + (k % (codigos.length - MESA_DESDE))];
    return ["POST", "/api/v1/p/sesion/entrar", { cabeceras: { ...JSON_H, "x-forwarded-for": ipAleatoria() }, cuerpo: JSON.stringify({ codigo_mesa: codigo }) }, 200];
  },
};
function elegir() {
  if (ESCENARIOS[ESC]) return () => ESC;
  const partes = ESC.split(",").map((p) => p.split("="));
  const total = partes.reduce((s, [, w]) => s + Number(w), 0);
  return () => {
    let r = Math.random() * total;
    for (const [n, w] of partes) if ((r -= Number(w)) <= 0) return n;
    return partes[0][0];
  };
}

// ---- CPU por /proc ----
const TICKS = 100;
function cpuDe(pid) {
  try {
    const s = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const f = s.slice(s.lastIndexOf(")") + 2).split(" ");
    return (Number(f[11]) + Number(f[12])) / TICKS;
  } catch {
    return 0;
  }
}
function hijos(padre) {
  return fs.readdirSync("/proc").filter((p) => /^\d+$/.test(p)).filter((p) => {
    try {
      const s = fs.readFileSync(`/proc/${p}/stat`, "utf8");
      const ppid = s.slice(s.lastIndexOf(")") + 2).split(" ")[1];
      return ppid === String(padre) && fs.readFileSync(`/proc/${p}/cmdline`, "utf8").includes("spawn_main");
    } catch {
      return false;
    }
  });
}
function pidsPostgres() {
  return fs.readdirSync("/proc").filter((p) => /^\d+$/.test(p)).filter((p) => {
    try {
      return fs.readFileSync(`/proc/${p}/cmdline`, "utf8").startsWith("postgres");
    } catch {
      return false;
    }
  });
}
const sumar = (pids) => pids.reduce((s, p) => s + cpuDe(p), 0);

const pct = (v, p) => v[Math.min(v.length - 1, Math.floor((p / 100) * v.length))];

async function main() {
  const cliente0 = process.cpuUsage();
  let miembros = [];
  if (ESC !== "entrar" && ESC !== "menu200" && ESC !== "menu304") miembros = await preparar();
  if (ESC.includes("menu304")) {
    const r = await pedir("GET", `/api/v1/p/menu/${SLUG}`, { cabeceras: { "x-forwarded-for": ipAleatoria() } });
    menuEtag = r.cabeceras.etag;
  }
  const trabajadores = a.padre ? hijos(a.padre) : (a.pids ?? "").split(",").filter(Boolean);
  const pg = pidsPostgres();
  const eligeEsc = elegir();
  const lat = [];
  const codigosEstado = {};
  let enVuelo = 0, enviadas = 0, descartadas = 0, medir = false, completadas = 0;
  let sig = 0;

  async function una(horaProgramada) {
    const nombre = eligeEsc();
    const m = miembros.length ? miembros[sig++ % miembros.length] : null;
    const [metodo, ruta, op, esperado] = ESCENARIOS[nombre](m);
    enVuelo++;
    const r = await pedir(metodo, ruta, op);
    enVuelo--;
    if (!medir) return;
    completadas++;
    const ms = performance.now() - horaProgramada;
    const clave = `${nombre}:${r.estado === esperado ? "ok" : r.estado}`;
    codigosEstado[clave] = (codigosEstado[clave] ?? 0) + 1;
    lat.push(ms);
  }

  let cpuIni, pgIni, t0, cliIni;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  if (TASA > 0) {
    const fin = performance.now() + (CALENTAR + DURACION) * 1000;
    let proxima = performance.now();
    const tMedir = performance.now() + CALENTAR * 1000;
    while (performance.now() < fin) {
      if (!medir && performance.now() >= tMedir) {
        medir = true; t0 = performance.now(); cpuIni = trabajadores.map(cpuDe); pgIni = sumar(pg); cliIni = process.cpuUsage();
      }
      const ahora = performance.now();
      if (proxima <= ahora) {
        if (enVuelo >= MAX_VUELO) { if (medir) descartadas++; }
        else { enviadas += medir ? 1 : 0; una(proxima); }
        proxima += -Math.log(1 - Math.random()) * (1000 / TASA);
        if (proxima < ahora - 50) proxima = ahora; // el cliente no logra el ritmo: no acumular deuda
        continue;
      }
      if (proxima - ahora > 2) await espera(1); else await new Promise((r) => setImmediate(r));
    }
    while (enVuelo > 0) await espera(10);
  } else {
    medir = false;
    let corriendo = true;
    const obreros = Array.from({ length: CONC }, async () => {
      while (corriendo) { await una(performance.now()); }
    });
    await espera(CALENTAR * 1000);
    medir = true; t0 = performance.now(); cpuIni = trabajadores.map(cpuDe); pgIni = sumar(pg); cliIni = process.cpuUsage();
    await espera(DURACION * 1000);
    medir = false; corriendo = false; enviadas = completadas;
    await Promise.all(obreros);
  }
  const seg = (performance.now() - t0) / 1000;
  // En lazo abierto «medir» sigue verdadero hasta vaciar; CPU se lee ya: aproximación válida.
  const cpuFin = trabajadores.map(cpuDe);
  const pgFin = sumar(pg);
  const cli = process.cpuUsage(cliIni);
  lat.sort((x, y) => x - y);
  const n = lat.length;
  const cpuApi = cpuFin.map((c, i) => c - cpuIni[i]);
  const cpuApiTotal = cpuApi.reduce((s, x) => s + x, 0);
  const salida = {
    escenario: ESC, miembros: miembros.length || undefined, por_mesa: POR_MESA, tasa_objetivo: TASA || `cerrado:${CONC}`,
    duracion_s: +seg.toFixed(1), n, rps: +(n / seg).toFixed(0), descartadas_por_cliente: descartadas,
    p50: +pct(lat, 50)?.toFixed(2), p95: +pct(lat, 95)?.toFixed(2), p99: +pct(lat, 99)?.toFixed(2), max: +lat[n - 1]?.toFixed(1),
    estados: codigosEstado,
    cpu_api_ms_por_peticion: +((cpuApiTotal * 1000) / n).toFixed(3),
    util_por_worker: cpuApi.map((c) => +((c / seg) * 100).toFixed(0)),
    cpu_pg_ms_por_peticion: +(((pgFin - pgIni) * 1000) / n).toFixed(3),
    cpu_cliente_pct: +((((cli.user + cli.system) / 1e6) / seg) * 100).toFixed(0),
  };
  console.log(JSON.stringify(salida));
  agente.destroy();
  void cliente0;
}
main().catch((e) => { console.error(e); process.exit(1); });
