// DevSync benchmark runner.  Usage: node bench/run.mjs <label>   (e.g. baseline, after-redis)
// Starts the real server as a child process, seeds a user + whiteboard through the real API,
// then measures HTTP and Socket.IO whiteboard performance.
import { fork, spawn, execSync } from 'node:child_process';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import autocannon from 'autocannon';
import { io as ioc } from 'socket.io-client';
import { DeliveryTracker, nextDeadline } from './metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..');
const label = process.argv[2] || 'baseline';
if (!/^[a-zA-Z0-9_-]+$/.test(label)) throw new Error('Use a plain alphanumeric result label');
const resultFile = path.join(HERE, 'results', `${label}.json`);
if (fs.existsSync(resultFile)) throw new Error(`Refusing to overwrite ${resultFile}`);
const phases = (process.env.BENCH_PHASES || 'http-health,http-authenticated-read,join-storm,draw').split(',');

const P = {
  httpConnections: +(process.env.HTTP_CONNECTIONS || 50),
  httpSeconds: +(process.env.HTTP_SECONDS || 15),
  socketLevels: (process.env.SOCKET_LEVELS || '5,10,20,40').split(',').map(Number),
  sendHz: +(process.env.SEND_HZ || 60),
  socketSeconds: +(process.env.SOCKET_SECONDS || 15),
  joinClients: +(process.env.JOIN_CLIENTS || 100),
  warmupSeconds: 2,
  drainTimeoutSeconds: 5,
};
for (const value of [P.httpConnections, P.httpSeconds, P.sendHz, P.socketSeconds, P.joinClients, ...P.socketLevels]) {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Benchmark parameters must be positive numbers');
}

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

let requestId = 0;
function ipc(child, type, extra = {}) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const cleanup = () => { clearTimeout(timeout); child.off('message', on); child.off('exit', exited); };
    const on = m => { if (m?.id === id) { cleanup(); m.error ? reject(new Error(m.error)) : resolve(m.result); } };
    const exited = () => { cleanup(); reject(new Error('Server exited during measurement')); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error(`IPC timeout: ${type}`)); }, 90000);
    child.on('message', on); child.once('exit', exited);
    child.send({ id, type, ...extra }, err => { if (err) { cleanup(); reject(err); } });
  });
}

async function measured(child, name, fn) {
  await ipc(child, 'measure-start');
  const lag = monitorEventLoopDelay({ resolution: 10 }); lag.enable();
  const cpu0 = process.cpuUsage(), t0 = performance.now();
  let result;
  try { result = await fn(); } finally { lag.disable(); }
  const wallMs = performance.now() - t0, cpu = process.cpuUsage(cpu0);
  const profileFile = path.join(HERE, 'results', `${label}-${name}.cpuprofile`);
  const server = await ipc(child, 'measure-stop', { profileFile });
  return {
    result, server,
    generatorCpuPct: +((cpu.user + cpu.system) / 10 / wallMs).toFixed(2),
    generatorEventLoopLagMs: { p99: +(lag.percentile(99) / 1e6).toFixed(3), max: +(lag.max / 1e6).toFixed(3) },
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
    const p = spawn(process.execPath, ['bench/seed-roles.mjs'], { cwd: SERVER_DIR, env, stdio: 'inherit', timeout: 30000 });
    p.on('error', reject);
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`role seeder exited ${c}`))));
  });
}

async function setupUser() {
  const creds = { email: 'bench@devsync.test', password: 'benchmark-pass-1', name: 'Bench User' };
  const post = (url, body, headers = {}) =>
    fetch(`${API}${url}`, { method: 'POST', headers: { 'content-type': 'application/json', ...FWD, ...headers }, body: JSON.stringify(body) });
  const registration = await post('/auth/register', creds);
  if (!registration.ok) {
    const detail = await registration.text();
    if (registration.status !== 400 || !detail.includes('Email already exists')) {
      throw new Error(`registration failed: ${registration.status} ${detail}`);
    }
  }
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
  const options = {
      url: `${API}${urlPath}`,
      connections: P.httpConnections,
      duration: P.httpSeconds,
      headers: { ...FWD, ...(cookie ? { cookie } : {}) },
  };
  await autocannon({ ...options, duration: P.warmupSeconds });
  const { result, server, generatorCpuPct, generatorEventLoopLagMs } = await measured(child, name, () => autocannon(options));
  return {
    name, path: urlPath,
    reqPerSec: Math.round(result.requests.average),
    latencyMs: { avg: result.latency.average, p50: result.latency.p50, p97_5: result.latency.p97_5, p99: result.latency.p99, max: result.latency.max },
    non2xx: result.non2xx, errors: result.errors, timeouts: result.timeouts,
    completedRequests: result.requests.total, elapsedSeconds: result.duration,
    server, generatorCpuPct, generatorEventLoopLagMs,
    generatorBound: generatorCpuPct > 85,
  };
}

// ---------- socket helpers ----------
function connectClient(cookie) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const s = ioc(BASE, { transports: ['websocket'], extraHeaders: { cookie, ...FWD }, reconnection: false, forceNew: true, timeout: 20000 });
    s.once('connect', () => resolve({ s, connectMs: performance.now() - t0 }));
    s.once('connect_error', (e) => { s.disconnect(); reject(new Error(`connect_error: ${e.message}`)); });
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
  const { result, server } = await measured(child, 'join-storm', async () => {
    const t0 = performance.now();
    const res = await Promise.allSettled(Array.from({ length: n }, async () => {
      const { s, connectMs } = await connectClient(cookie);
      try {
        const joinMs = await joinBoard(s, whiteboardId);
        return { s, connectMs, joinMs, totalMs: connectMs + joinMs };
      } catch (e) { s.disconnect(); throw e; }
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
  const tracker = new DeliveryTracker(C), clients = [];
  let tickTimer;
  try {
    for (let i = 0; i < C; i++) clients.push((await connectClient(cookie)).s);
    await Promise.all(clients.map(s => joinBoard(s, whiteboardId)));
    clients.forEach((s, i) => s.on('draw-move', d => tracker.receive(i, d.offsetY, d.offsetX, nowUs())));
    const sendFor = async (seconds, track) => {
      const start = performance.now(), end = start + seconds * 1000, cpu0 = process.cpuUsage();
      let deadline = start;
      await new Promise(resolve => {
        const tick = () => {
          const now = performance.now();
          if (now >= end) { if (track) tracker.close(); resolve(); return; }
          if (now >= deadline) {
            clients.forEach((s, i) => {
              const stamp = nowUs(), sequence = track ? tracker.sent(i, stamp) : 0;
              s.emit('draw-move', { whiteboardId, offsetX: stamp, offsetY: sequence });
            });
            deadline = nextDeadline(start, performance.now(), 1000 / P.sendHz);
          }
          tickTimer = setTimeout(tick, Math.max(1, Math.min(deadline, end) - performance.now()));
        };
        tick();
      });
      const elapsedMs = performance.now() - start, cpu = process.cpuUsage(cpu0);
      return { elapsedMs, cpuPct: +((cpu.user + cpu.system) / 10 / elapsedMs).toFixed(2) };
    };
    await sendFor(P.warmupSeconds, false);
    await sleep(250);
    const out = await measured(child, `draw-${C}`, async () => {
      const send = await sendFor(P.socketSeconds, true);
      const drainAt = performance.now();
      while (tracker.received < tracker.expected && performance.now() - drainAt < P.drainTimeoutSeconds * 1000) await sleep(10);
      tracker.finish();
      return { send, drainMs: performance.now() - drainAt };
    });
    const summary = tracker.summary(out.result.send.elapsedMs, out.result.drainMs);
    const generatorBound = out.result.send.cpuPct > 85;
    const targetRateMissed = summary.actualSendHzPerClient < P.sendHz * 0.9;
    return {
      name: 'whiteboard-draw-fanout', clientsInRoom: C, sendHzPerClient: P.sendHz, seconds: P.socketSeconds,
      ...summary, server: out.server, generatorCpuPct: out.result.send.cpuPct,
      generatorEventLoopLagMs: out.generatorEventLoopLagMs, generatorBound, targetRateMissed,
      capacityClaimValid: !generatorBound && !targetRateMissed && summary.missingDeliveries === 0 && summary.invalidDeliveries === 0,
    };
  } finally {
    clearTimeout(tickTimer); clients.forEach(s => s.disconnect()); await sleep(500);
  }
}

// ---------- main ----------
const gitSha = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: SERVER_DIR }).toString().trim(); } catch { return 'unknown'; } })();
function treeHash(dir, include = () => true) {
  const hash = createHash('sha256');
  const walk = folder => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'results') walk(file); }
      else if (include(file)) { hash.update(path.relative(dir, file).replaceAll('\\', '/')); hash.update(fs.readFileSync(file)); }
    }
  };
  walk(dir); return hash.digest('hex');
}
const source = {
  appSha256: treeHash(path.join(SERVER_DIR, 'src')),
  harnessSha256: treeHash(HERE, file => ['run.mjs', 'instrument.mjs', 'metrics.mjs', 'seed-roles.mjs', 'bench.env', 'docker-compose.bench.yml'].includes(path.basename(file))),
  lockSha256: createHash('sha256').update(fs.readFileSync(path.join(SERVER_DIR, 'package-lock.json'))).digest('hex'),
};
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
  if (phases.includes('http-health')) log(await httpPhase(child, 'http-health', '/health', null));
  if (phases.includes('http-authenticated-read')) log(await httpPhase(child, 'http-authenticated-read', '/workspace/all', state.cookie));
  if (phases.includes('join-storm')) log(await joinStorm(child, state));
  if (phases.includes('draw')) for (const c of P.socketLevels) { log(await drawLoad(child, state, c)); await sleep(1000); }

  const out = {
    label, commit: gitSha, workingTreeDirty: execSync('git status --porcelain', { cwd: SERVER_DIR }).toString().trim().length > 0,
    timestamp: new Date().toISOString(),
    machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: +(os.totalmem() / 2 ** 30).toFixed(1), node: process.version },
    schemaVersion: 2, source, profiling: env.BENCH_PROFILE === '1', phases,
    params: P, results,
  };
  fs.writeFileSync(resultFile, JSON.stringify(out, null, 2), { flag: 'wx' });
  console.log(`[bench] wrote ${resultFile}`);
} catch (e) {
  console.error('[bench] FAILED:', e);
  exitCode = 1;
} finally {
  child.kill('SIGTERM');
  setTimeout(() => process.exit(exitCode), 500);
}
