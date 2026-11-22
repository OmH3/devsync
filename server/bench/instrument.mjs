// Benchmark-only preload. CPU/RSS come from this process, not WMI subprocesses.
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { Session } from 'node:inspector/promises';
import fs from 'node:fs';

const h = monitorEventLoopDelay({ resolution: 10 });
h.enable();
let start, cpuStart, lastCpu, lastAt, memoryTimer, rssMax = 0, cpuMax = 0, samples = 0;
let profileSession;
let queryStats = new Map();
const profiling = process.env.BENCH_PROFILE === '1';
const add = (stats, name, ms, failed) => {
  const s = stats.get(name) || { count: 0, totalMs: 0, maxMs: 0, errors: 0 };
  s.count++; s.totalMs += ms; s.maxMs = Math.max(s.maxMs, ms); s.errors += Number(failed);
  stats.set(name, s);
};
if (profiling) {
  const { default: mongoose } = await import('mongoose');
  const original = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = async function (...args) {
    const stats = queryStats, at = performance.now(); let failed = false;
    try { return await original.apply(this, args); }
    catch (e) { failed = true; throw e; }
    finally { add(stats, `mongoose:${this.model.modelName}.${this.op}`, performance.now() - at, failed); }
  };
  const { default: MongoStore } = await import('connect-mongo');
  const get = MongoStore.prototype.get;
  MongoStore.prototype.get = function (sid, callback) {
    const stats = queryStats, at = performance.now();
    return get.call(this, sid, (err, session) => {
      add(stats, 'session-store:get', performance.now() - at, Boolean(err));
      callback(err, session);
    });
  };
}

function sample() {
  const at = performance.now(), cpu = process.cpuUsage();
  const ms = at - lastAt;
  if (ms > 0) cpuMax = Math.max(cpuMax, (cpu.user - lastCpu.user + cpu.system - lastCpu.system) / 10 / ms);
  lastCpu = cpu; lastAt = at;
  rssMax = Math.max(rssMax, process.memoryUsage.rss()); samples++;
}

process.on('message', async (m) => {
  try {
    if (m?.type === 'measure-start') {
      if (profiling) {
        profileSession = new Session(); profileSession.connect();
        await profileSession.post('Profiler.enable');
        await profileSession.post('Profiler.setSamplingInterval', { interval: 1000 });
        await profileSession.post('Profiler.start');
      }
      queryStats = new Map(); h.reset();
      start = lastAt = performance.now(); cpuStart = lastCpu = process.cpuUsage();
      rssMax = process.memoryUsage.rss(); cpuMax = 0; samples = 0;
      memoryTimer = setInterval(sample, 500);
      process.send({ id: m.id });
    }
    if (m?.type === 'measure-stop') {
      clearInterval(memoryTimer); sample();
      const wallMs = performance.now() - start, cpu = process.cpuUsage(cpuStart);
      const ms = ns => Number.isFinite(ns) ? +(ns / 1e6).toFixed(3) : null;
      const result = {
        resourceElapsedMs: +wallMs.toFixed(3), sampleCount: samples, sampleErrors: 0,
        cpuAvgPct: +((cpu.user + cpu.system) / 10 / wallMs).toFixed(2),
        cpuMaxPct: +cpuMax.toFixed(2), rssMaxMB: +(rssMax / 1048576).toFixed(2),
        eventLoopLagMs: { mean: ms(h.mean), p50: ms(h.percentile(50)), p99: ms(h.percentile(99)), max: ms(h.max) },
      };
      if (profiling) {
        result.operations = Object.fromEntries([...queryStats].map(([k, s]) => [k,
          { count: s.count, avgMs: +(s.totalMs / s.count).toFixed(3), maxMs: +s.maxMs.toFixed(3), errors: s.errors }]));
        const { profile } = await profileSession.post('Profiler.stop');
        fs.writeFileSync(m.profileFile, JSON.stringify(profile));
        profileSession.disconnect(); profileSession = null;
      }
      process.send({ id: m.id, result });
    }
  } catch (e) { process.send({ id: m.id, error: e.message }); }
});
