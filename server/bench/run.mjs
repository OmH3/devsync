// DevSync benchmark runner.  Usage: node bench/run.mjs <label>   (e.g. baseline, after-redis)
// Starts the real server as a child process, seeds a user + whiteboard through the real API,
// then measures HTTP and Socket.IO whiteboard performance.
import { fork, spawn, execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import autocannon from 'autocannon';
import { io as ioc } from 'socket.io-client';
import pidusage from 'pidusage';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..');
const label = process.argv[2] || 'baseline';

const P = {
  httpConnections: +(process.env.HTTP_CONNECTIONS || 50),
  httpSeconds: +(process.env.HTTP_SECONDS || 15),
  socketLevels: (process.env.SOCKET_LEVELS || '5,10,20,40').split(',').map(Number),
  sendHz: +(process.env.SEND_HZ || 60),
  socketSeconds: +(process.env.SOCKET_SECONDS || 15),
  joinClients: +(process.env.JOIN_CLIENTS || 100),
};

const env = { ...process.env, ...dotenv.parse(fs.readFileSync(path.join(HERE, 'bench.env'))) };
const BASE = `http://localhost:${env.PORT}`;
const API = `${BASE}${env.BASE_PATH}`;
const FWD = { 'x-forwarded-proto': 'https' }; // app sets secure cookies + trust proxy
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowUs = () => Math.round(performance.now() * 1000);

// ---------- server process + sampling ----------
function startServer() {
  const child = fork(path.join(SERVER_DIR, 'src/server.js'), [], {
    cwd: SERVER_DIR,
    env,
    execArgv: ['--import', pathToFileURL(path.join(HERE, 'instrument.mjs')).href],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  child.stdout.resume(); // drain (the app console.logs a lot; that cost is part of the baseline)
  child.stderr.resume();
  return child;
}

function ipc(child, type, reply) {
  return new Promise((resolve) => {
    if (!reply) return resolve(child.send({ type }));
    const on = (m) => { if (m?.type === reply) { child.off('message', on); resolve(m); } };
    child.on('message', on);
    child.send({ type });
  });
}

async function measured(child, fn) {
  await ipc(child, 'lag-reset');
  const samples = [];
  const timer = setInterval(async () => {
    try { const s = await pidusage(child.pid); samples.push(s); } catch {}
  }, 500);
  const cpu0 = process.cpuUsage(); const t0 = performance.now();
  const result = await fn();
  const wallMs = performance.now() - t0; const cpu = process.cpuUsage(cpu0);
  clearInterval(timer);
  const lag = await ipc(child, 'lag-get', 'lag');
  const cpus = samples.map((s) => s.cpu);
  return {
    result,
    server: {
      cpuAvgPct: +(cpus.reduce((a, b) => a + b, 0) / (cpus.length || 1)).toFixed(1),
      cpuMaxPct: +Math.max(0, ...cpus).toFixed(1),
      rssMaxMB: +(Math.max(0, ...samples.map((s) => s.memory)) / 1048576).toFixed(1),
      eventLoopLagMs: { mean: lag.mean, p50: lag.p50, p99: lag.p99, max: lag.max },
    },
    generatorCpuPct: +(((cpu.user + cpu.system) / 1000 / wallMs) * 100).toFixed(1),
  };
}

// ---------- setup via real API ----------
async function waitHealthy() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${API}/health`); if (r.ok) return; } catch {}
    await sleep(500);
  }
  throw new Error('Server did not become healthy (is MongoDB up? see bench/README.md)');
}

async function seedRoles() {
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['src/seeders/role.seeder.js'], { cwd: SERVER_DIR, env, stdio: 'ignore' });
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`role seeder exited ${c}`))));
  });
}

async function setupUser() {
  const creds = { email: 'bench@devsync.test', password: 'benchmark-pass-1', name: 'Bench User' };
  const post = (url, body, headers = {}) =>
    fetch(`${API}${url}`, { method: 'POST', headers: { 'content-type': 'application/json', ...FWD, ...headers }, body: JSON.stringify(body) });
  await post('/auth/register', creds); // 400 "already exists" on reruns is fine
  const login = await post('/auth/login', { email: creds.email, password: creds.password });
  if (!login.ok) throw new Error(`login failed: ${login.status} ${await login.text()}`);
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('no session cookie returned');
  const wb = await post('/whiteboard/create', { boardTitle: `bench-${Date.now()}` }, { cookie });
  const body = await wb.json();
  const whiteboardId = body.whiteboard?._id ?? body.whiteboard?.id;
  if (!whiteboardId) throw new Error(`whiteboard create failed: ${wb.status} ${JSON.stringify(body)}`);
  return { cookie, whiteboardId };
}

// ---------- HTTP phase ----------
async function httpPhase(child, name, urlPath, cookie) {
  const { result, server, generatorCpuPct } = await measured(child, () =>
    autocannon({
      url: `${API}${urlPath}`,
      connections: P.httpConnections,
      duration: P.httpSeconds,
      headers: { ...FWD, ...(cookie ? { cookie } : {}) },
    }));
  return {
    name, path: urlPath,
    reqPerSec: Math.round(result.requests.average),
    latencyMs: { avg: result.latency.average, p50: result.latency.p50, p97_5: result.latency.p97_5, p99: result.latency.p99, max: result.latency.max },
    non2xx: result.non2xx, errors: result.errors, timeouts: result.timeouts,
    server, generatorCpuPct,
  };
}

// ---------- socket helpers ----------
function connectClient(cookie) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const s = ioc(BASE, { transports: ['websocket'], extraHeaders: { cookie, ...FWD }, reconnection: false, forceNew: true, timeout: 20000 });
    s.once('connect', () => resolve({ s, connectMs: performance.now() - t0 }));
    s.once('connect_error', (e) => reject(new Error(`connect_error: ${e.message}`)));
  });
}
function joinBoard(s, whiteboardId) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const to = setTimeout(() => reject(new Error('join timeout')), 20000);
    s.once('whiteboard-joined', () => { clearTimeout(to); resolve(performance.now() - t0); });
    s.once('error', (e) => { clearTimeout(to); reject(new Error(`join error: ${e?.message}`)); });
    s.emit('join-whiteboard', whiteboardId);
  });
}
const pct = (arr, p) => { if (!arr.length) return null; const a = [...arr].sort((x, y) => x - y); return +a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))].toFixed(1); };

async function joinStorm(child, { cookie, whiteboardId }) {
  const n = P.joinClients; let failures = 0;
  const { result, server } = await measured(child, async () => {
    const t0 = performance.now();
    const res = await Promise.allSettled(Array.from({ length: n }, async () => {
      const { s, connectMs } = await connectClient(cookie);
      const joinMs = await joinBoard(s, whiteboardId);
      return { s, connectMs, joinMs, totalMs: connectMs + joinMs };
    }));
    const ok = res.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    failures = n - ok.length;
    const wall = performance.now() - t0;
    ok.forEach((c) => c.s.disconnect());
    return { ok, wall };
  });
  const tot = result.ok.map((c) => c.totalMs);
  return {
    name: 'join-storm', clients: n, failures, wallMs: +result.wall.toFixed(0),
    connectMs: { p50: pct(result.ok.map((c) => c.connectMs), 50), p95: pct(result.ok.map((c) => c.connectMs), 95) },
    joinMs: { p50: pct(result.ok.map((c) => c.joinMs), 50), p95: pct(result.ok.map((c) => c.joinMs), 95) },
    totalMs: { p50: pct(tot, 50), p95: pct(tot, 95), p99: pct(tot, 99), max: pct(tot, 100) },
    server,
  };
}

async function drawLoad(child, { cookie, whiteboardId }, C) {
  const BUCKET_US = 100, NB = 30000; // 100us buckets up to 3s
  const hist = new Uint32Array(NB); let overflow = 0;
  let sent = 0, recv = 0, measuring = false;
  const clients = [];
  for (let i = 0; i < C; i++) clients.push((await connectClient(cookie)).s);
  await Promise.all(clients.map((s) => joinBoard(s, whiteboardId)));
  clients.forEach((s) => s.on('draw-move', (d) => {
    if (d.offsetY !== 1) return;
    const lat = nowUs() - d.offsetX; recv++;
    const b = Math.floor(lat / BUCKET_US); if (b < NB) hist[b]++; else overflow++;
  }));

  const out = await measured(child, async () => {
    const timers = clients.map((s) => setInterval(() => {
      if (measuring) sent++;
      s.emit('draw-move', { whiteboardId, offsetX: nowUs(), offsetY: measuring ? 1 : 0 });
    }, 1000 / P.sendHz));
    await sleep(2000); measuring = true;           // warmup
    await sleep(P.socketSeconds * 1000); measuring = false;
    timers.forEach(clearInterval);
    await sleep(2000);                              // drain in-flight messages
    return null;
  });
  clients.forEach((s) => s.disconnect()); await sleep(500);

  const expected = sent * (C - 1);
  const q = (p) => { const target = (p / 100) * recv; let acc = 0; for (let b = 0; b < NB; b++) { acc += hist[b]; if (acc >= target) return +(((b + 1) * BUCKET_US) / 1000).toFixed(1); } return '>3000'; };
  return {
    name: 'whiteboard-draw-fanout', clientsInRoom: C, sendHzPerClient: P.sendHz, seconds: P.socketSeconds,
    inboundMsgPerSec: Math.round(sent / P.socketSeconds),
    deliveredMsgPerSec: Math.round(recv / P.socketSeconds),
    deliveredRatio: expected ? +(recv / expected).toFixed(4) : null,
    latencyMs: { p50: q(50), p95: q(95), p99: q(99) },
    server: out.server, generatorCpuPct: out.generatorCpuPct,
    generatorBound: out.generatorCpuPct > 85,
  };
}

// ---------- main ----------
const gitSha = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: SERVER_DIR }).toString().trim(); } catch { return 'unknown'; } })();
console.log(`[bench] label=${label} commit=${gitSha}`);
await seedRoles();
const child = startServer();
let exitCode = 0;
try {
  await waitHealthy();
  const state = await setupUser();
  const results = [];
  const log = (r) => { results.push(r); console.log('[bench]', r.name, JSON.stringify(r).slice(0, 220)); };

  await sleep(1000);
  log(await httpPhase(child, 'http-health', '/health', null));
  log(await httpPhase(child, 'http-authenticated-read', '/workspace/all', state.cookie));
  log(await joinStorm(child, state));
  for (const c of P.socketLevels) { log(await drawLoad(child, state, c)); await sleep(1000); }

  const out = {
    label, commit: gitSha, timestamp: new Date().toISOString(),
    machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: +(os.totalmem() / 2 ** 30).toFixed(1), node: process.version },
    params: P, results,
  };
  const file = path.join(HERE, 'results', `${label}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`[bench] wrote ${file}`);
} catch (e) {
  console.error('[bench] FAILED:', e);
  exitCode = 1;
} finally {
  child.kill('SIGTERM');
  setTimeout(() => process.exit(exitCode), 500);
}
