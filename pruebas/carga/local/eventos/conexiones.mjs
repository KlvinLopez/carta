// PROTOTIPO DESECHABLE: N comensales con la app abierta, por eventos (SSE) o por sondeo, con
// escrituras reales a una tasa por mesa. Sin dependencias: Node 22. Sólo contra una API LOCAL.
// Informe: docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md
//
//   node conexiones.mjs --codigos ../codigos.txt --padre <pid uvicorn> --modo eventos \
//        --miembros 1200 --por-mesa 3 --eventos-min-mesa 1 --respaldo 60 --reposo 30 --carga 60
//   node conexiones.mjs ... --modo sondeo --intervalo 3
//
// Fases: prepara miembros (cookie de cada uno, caché en disco junto a --codigos, ignorada por
// git) → abre conexiones (sólo eventos, --rampa por segundo) → «reposo» sin escrituras →
// «carga» con escrituras de Poisson (PATCH /p/miembro con un alias nuevo: una escritura real
// que cambia el estado de la mesa). Imprime una línea JSON por fase. Con --serie imprime cada
// segundo conexiones abiertas, reconexiones y CPU (para matar o reiniciar workers a mano).
import http from "node:http";
import fs from "node:fs";

const a = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith("--")) acc.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "1"]);
    return acc;
  }, []),
);
const BASE = new URL(a.base ?? "http://127.0.0.1:8000");
const MODO = a.modo ?? "eventos";
const MIEMBROS = Number(a.miembros ?? 1200);
const POR_MESA = Number(a["por-mesa"] ?? 3);
const MESA_DESDE = Number(a["mesa-desde"] ?? 0);
const EV_MIN_MESA = Number(a["eventos-min-mesa"] ?? 1);
const RESPALDO = Number(a.respaldo ?? 60); // s, sondeo lento de respaldo en modo eventos (0 = sin)
const INTERVALO = Number(a.intervalo ?? 3); // s, modo sondeo
const RAMPA = Number(a.rampa ?? 500); // conexiones nuevas por segundo al abrir
const REPOSO = Number(a.reposo ?? 30);
const CARGA = Number(a.carga ?? 60);
const SERIE = Boolean(a.serie);
const SOSTENER = Number(a.sostener ?? 0); // s extra con --serie para provocar fallos a mano
const codigos = fs.readFileSync(a.codigos, "utf8").split("\n").filter(Boolean);
const agente = new http.Agent({ keepAlive: true, maxSockets: 256 });
const ahora = () => performance.now();
const ipAleatoria = () => `${45 + Math.floor(Math.random() * 150)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 253)}`;

function pedir(metodo, ruta, { cabeceras = {}, cuerpo = null } = {}) {
  return new Promise((resolve) => {
    const req = http.request({ host: BASE.hostname, port: BASE.port, path: ruta, method: metodo, agent: agente, headers: cabeceras }, (res) => {
      const trozos = [];
      res.on("data", (t) => trozos.push(t));
      res.on("end", () => resolve({ estado: res.statusCode, cabeceras: res.headers, cuerpo: Buffer.concat(trozos) }));
    });
    req.on("error", () => resolve({ estado: 0, cabeceras: {}, cuerpo: Buffer.alloc(0) }));
    req.setTimeout(30000, () => req.destroy());
    if (cuerpo) req.write(cuerpo);
    req.end();
  });
}

// ---- Miembros (mismo formato de caché que medir.mjs) ----
async function preparar() {
  const archivo = `${a.codigos}.miembros.${MIEMBROS}x${POR_MESA}@${MESA_DESDE}.json`;
  if (fs.existsSync(archivo)) return JSON.parse(fs.readFileSync(archivo, "utf8"));
  const miembros = [];
  const cola = [];
  for (let i = 0; i < MIEMBROS; i++) cola.push({ i, codigo: codigos[MESA_DESDE + Math.floor(i / POR_MESA)] });
  if (!cola.at(-1).codigo) throw new Error("faltan mesas: corre sembrar_mesas.sh con más");
  let sig = 0;
  await Promise.all(Array.from({ length: 32 }, async () => {
    for (;;) {
      const t = cola[sig++];
      if (!t) return;
      const r = await pedir("POST", "/api/v1/p/sesion/entrar", { cabeceras: { "content-type": "application/json", "x-forwarded-for": ipAleatoria() }, cuerpo: JSON.stringify({ codigo_mesa: t.codigo }) });
      if (r.estado !== 200) throw new Error(`entrar ${r.estado} ${r.cuerpo}`);
      miembros[t.i] = { cookie: r.cabeceras["set-cookie"][0].split(";")[0], codigo: t.codigo };
    }
  }));
  fs.writeFileSync(archivo, JSON.stringify(miembros));
  return miembros;
}

// ---- CPU y memoria de los workers por /proc ----
function stat(pid) {
  try {
    const s = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    return s.slice(s.lastIndexOf(")") + 2).split(" ");
  } catch { return null; }
}
const cpuDe = (pid) => { const f = stat(pid); return f ? (Number(f[11]) + Number(f[12])) / 100 : 0; };
function rssMB(pid) {
  try { return Number(/VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${pid}/status`, "utf8"))[1]) / 1024; } catch { return 0; }
}
function workers() {
  if (!a.padre) return [];
  return fs.readdirSync("/proc").filter((p) => /^\d+$/.test(p)).filter((p) => {
    const f = stat(p);
    try { return f && f[1] === String(a.padre) && fs.readFileSync(`/proc/${p}/cmdline`, "utf8").includes("spawn_main"); } catch { return false; }
  });
}
function tcpMemKB() {
  const m = /TCP: inuse (\d+) orphan \d+ tw \d+ alloc \d+ mem (\d+)/.exec(fs.readFileSync("/proc/net/sockstat", "utf8"));
  return m ? { inuse: Number(m[1]), mem_kb: Number(m[2]) * 4 } : {};
}
const pct = (v, p) => (v.length ? +v[Math.min(v.length - 1, Math.floor((p / 100) * v.length))].toFixed(1) : null);

// ---- Estado de la medición ----
const m = { get: {}, latidos: 0, avisos: 0, holas: 0, reconexiones: 0, fallos_conexion: {}, escrituras: 0, escrituras_err: 0, entrega: [], visible: [], escritura_ms: [] };
const reiniciar = () => { m.get = {}; m.latidos = 0; m.avisos = 0; m.holas = 0; m.reconexiones = 0; m.fallos_conexion = {}; m.escrituras = 0; m.escrituras_err = 0; m.entrega = []; m.visible = []; m.escritura_ms = []; };
const mesas = new Map(); // codigo -> { seq, t, miembros: [] }
let abiertas = 0;
let detener = false;

async function leerEstado(mb) {
  if (mb.enVuelo) { mb.otra = true; return; }
  mb.enVuelo = true;
  do {
    mb.otra = false;
    const mesa = mesas.get(mb.codigo);
    const seqAntes = mesa.seq;
    const r = await pedir("GET", "/api/v1/p/sesion", { cabeceras: { cookie: mb.cookie, ...(mb.etag ? { "if-none-match": mb.etag } : {}) } });
    m.get[r.estado] = (m.get[r.estado] ?? 0) + 1;
    if (r.estado === 200) {
      mb.etag = r.cabeceras.etag;
      if (seqAntes > mb.visto && mesa.t) { m.visible.push(ahora() - mesa.t); mb.visto = seqAntes; }
    }
  } while (mb.otra);
  mb.enVuelo = false;
}

function abrir(mb) {
  if (detener) return;
  const req = http.request({ host: BASE.hostname, port: BASE.port, path: "/api/v1/p/sesion/eventos", method: "GET", agent: false, headers: { cookie: mb.cookie, accept: "text/event-stream" } }, (res) => {
    if (res.statusCode !== 200) {
      m.fallos_conexion[res.statusCode] = (m.fallos_conexion[res.statusCode] ?? 0) + 1;
      res.resume();
      // Un EventSource real se rinde ante un estado ≠ 200: la app debe recrearlo (con azar).
      setTimeout(() => abrir(mb), mb.retry + Math.random() * 5000);
      return;
    }
    abiertas++;
    mb.abierta = true;
    let bufer = "";
    res.setEncoding("utf8");
    res.on("data", (t) => {
      bufer += t;
      let i;
      while ((i = bufer.indexOf("\n\n")) >= 0) {
        const bloque = bufer.slice(0, i);
        bufer = bufer.slice(i + 2);
        let evento = null, datos = "";
        for (const linea of bloque.split("\n")) {
          if (linea.startsWith(":")) m.latidos++;
          else if (linea.startsWith("retry:")) mb.retry = Number(linea.slice(6));
          else if (linea.startsWith("event:")) evento = linea.slice(6).trim();
          else if (linea.startsWith("data:")) datos = linea.slice(5).trim();
        }
        if (evento === "hola") { m.holas++; if (datos !== mb.etag) leerEstado(mb); }
        else if (evento === "cambio") {
          m.avisos++;
          const mesa = mesas.get(mb.codigo);
          if (mesa.t && mesa.seq > mb.avisado) { m.entrega.push(ahora() - mesa.t); mb.avisado = mesa.seq; }
          leerEstado(mb);
        }
      }
    });
    res.on("close", () => {
      if (mb.abierta) { abiertas--; mb.abierta = false; }
      if (!detener) { m.reconexiones++; setTimeout(() => abrir(mb), mb.retry); }
    });
  });
  req.on("error", (e) => {
    m.fallos_conexion[e.code ?? "error"] = (m.fallos_conexion[e.code ?? "error"] ?? 0) + 1;
    if (mb.abierta) { abiertas--; mb.abierta = false; }
    if (!detener) setTimeout(() => abrir(mb), mb.retry); // error de red: EventSource reintenta
  });
  req.end();
}

async function escribir(mesa) {
  const mb = mesa.miembros[Math.floor(Math.random() * mesa.miembros.length)];
  mesa.seq++;
  mesa.t = ahora();
  const t0 = mesa.t;
  const r = await pedir("PATCH", "/api/v1/p/miembro", { cabeceras: { cookie: mb.cookie, "content-type": "application/json" }, cuerpo: JSON.stringify({ alias: `Ana ${Math.floor(Math.random() * 100000)}` }) });
  if (r.estado === 200) { m.escrituras++; m.escritura_ms.push(ahora() - t0); } else m.escrituras_err++;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function ventana(nombre, segundos, conEscrituras, lista) {
  reiniciar();
  const pids = workers();
  const cpu0 = pids.map(cpuDe);
  const cli0 = process.cpuUsage();
  const t0 = ahora();
  const tasa = conEscrituras ? (mesas.size * EV_MIN_MESA) / 60 : 0;
  const mesasArr = [...mesas.values()];
  let proxima = ahora();
  while (ahora() - t0 < segundos * 1000) {
    if (tasa > 0 && ahora() >= proxima) {
      escribir(mesasArr[Math.floor(Math.random() * mesasArr.length)]);
      proxima += -Math.log(1 - Math.random()) * (1000 / tasa);
      continue;
    }
    await espera(Math.max(1, Math.min(50, proxima - ahora())));
  }
  await espera(1500); // que terminen las lecturas en vuelo
  const seg = (ahora() - t0) / 1000;
  const cpu = pids.map((p, i) => cpuDe(p) - cpu0[i]);
  const cpuTotal = cpu.reduce((s, x) => s + x, 0);
  const cli = process.cpuUsage(cli0);
  m.entrega.sort((x, y) => x - y); m.visible.sort((x, y) => x - y); m.escritura_ms.sort((x, y) => x - y);
  const gets = Object.values(m.get).reduce((s, x) => s + x, 0);
  const salida = {
    fase: nombre, modo: MODO, miembros: lista.length, por_mesa: POR_MESA, mesas: mesas.size,
    respaldo_s: MODO === "eventos" ? RESPALDO : undefined, intervalo_s: MODO === "sondeo" ? INTERVALO : undefined,
    eventos_min_mesa: conEscrituras ? EV_MIN_MESA : 0, duracion_s: +seg.toFixed(1), abiertas,
    escrituras: m.escrituras, escrituras_err: m.escrituras_err, escritura_p50: pct(m.escritura_ms, 50), escritura_p95: pct(m.escritura_ms, 95),
    gets: m.get, gets_por_s: +(gets / seg).toFixed(1), peticiones_por_s: +((gets + m.escrituras) / seg).toFixed(1),
    avisos: m.avisos, latidos: m.latidos, holas: m.holas, reconexiones: m.reconexiones, fallos_conexion: m.fallos_conexion,
    entrega_ms: { p50: pct(m.entrega, 50), p95: pct(m.entrega, 95), p99: pct(m.entrega, 99), n: m.entrega.length },
    visible_ms: { p50: pct(m.visible, 50), p95: pct(m.visible, 95), p99: pct(m.visible, 99), n: m.visible.length },
    cpu_api_pct_total: +((cpuTotal / seg) * 100).toFixed(1),
    cpu_api_pct_por_worker: cpu.map((c) => +((c / seg) * 100).toFixed(1)),
    cpu_ms_por_peticion: gets + m.escrituras ? +((cpuTotal * 1000) / (gets + m.escrituras)).toFixed(3) : null,
    cpu_ms_por_comensal_s: +((cpuTotal * 1000) / seg / lista.length).toFixed(4),
    rss_mb_por_worker: pids.map((p) => +rssMB(p).toFixed(1)), tcp: tcpMemKB(),
    cpu_cliente_pct: +((((cli.user + cli.system) / 1e6) / seg) * 100).toFixed(0),
  };
  console.log(JSON.stringify(salida));
}

async function main() {
  const lista = await preparar();
  for (const mb of lista) {
    Object.assign(mb, { etag: null, visto: 0, avisado: 0, retry: 3000, enVuelo: false, otra: false, abierta: false });
    if (!mesas.has(mb.codigo)) mesas.set(mb.codigo, { seq: 0, t: 0, miembros: [] });
    mesas.get(mb.codigo).miembros.push(mb);
  }
  const pids = workers();
  const base = { fase: "antes", rss_mb_por_worker: pids.map((p) => +rssMB(p).toFixed(1)), tcp: tcpMemKB() };
  console.log(JSON.stringify(base));

  if (MODO === "eventos") {
    const t0 = ahora();
    const cpu0 = pids.map(cpuDe);
    for (let i = 0; i < lista.length; i++) {
      abrir(lista[i]);
      if (i % Math.max(1, Math.floor(RAMPA / 20)) === 0) await espera(50);
    }
    while (abiertas < lista.length && ahora() - t0 < 120000) await espera(100);
    await espera(2000);
    const cpu = pids.map((p, i) => cpuDe(p) - cpu0[i]);
    console.log(JSON.stringify({ fase: "apertura", abiertas, segundos: +((ahora() - t0) / 1000).toFixed(1), cpu_api_ms_por_conexion: +((cpu.reduce((s, x) => s + x, 0) * 1000) / lista.length).toFixed(2), gets: m.get, fallos_conexion: m.fallos_conexion, rss_mb_por_worker: pids.map((p) => +rssMB(p).toFixed(1)), tcp: tcpMemKB() }));
    if (RESPALDO > 0) for (const mb of lista) setTimeout(function sondeoLento() { if (detener) return; leerEstado(mb); setTimeout(sondeoLento, RESPALDO * 1000); }, Math.random() * RESPALDO * 1000);
  } else {
    for (const mb of lista) setTimeout(function sondear() { if (detener) return; leerEstado(mb); setTimeout(sondear, INTERVALO * 1000); }, Math.random() * INTERVALO * 1000);
    await espera(INTERVALO * 1000 + 1000);
  }

  if (SERIE) {
    let anteriorCpu = new Map(), t = 0;
    const reloj = setInterval(() => {
      const ps = workers();
      const util = ps.map((p) => { const c = cpuDe(p); const u = anteriorCpu.has(p) ? (c - anteriorCpu.get(p)) * 100 : null; anteriorCpu.set(p, c); return u === null ? null : +u.toFixed(0); });
      console.log(JSON.stringify({ t: t++, abiertas, reconexiones: m.reconexiones, fallos: m.fallos_conexion, gets: m.get, workers: ps, cpu_pct: util }));
    }, 1000);
    if (REPOSO) await ventana("reposo", REPOSO, false, lista);
    if (SOSTENER) await ventana("sostener", SOSTENER, true, lista);
    clearInterval(reloj);
  } else {
    if (REPOSO) await ventana("reposo", REPOSO, false, lista);
    if (CARGA) await ventana("carga", CARGA, true, lista);
  }
  detener = true;
  agente.destroy();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
