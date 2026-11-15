// Usage: node bench/report.mjs <baseline-label> [after-label]  -> markdown to stdout
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'results');
const load = (l) => JSON.parse(fs.readFileSync(path.join(dir, `${l}.json`), 'utf8'));
const [a, b] = [process.argv[2] || 'baseline', process.argv[3]].map((l) => l && load(l));
const by = (r, key) => r.results.find((x) => key(x));
const delta = (x, y, lowerBetter) => {
  if (x == null || y == null || typeof x !== 'number' || typeof y !== 'number' || x === 0) return '';
  const p = ((y - x) / x) * 100; const good = lowerBetter ? p < 0 : p > 0;
  return ` (${p > 0 ? '+' : ''}${p.toFixed(0)}% ${good ? '✅' : '⚠️'})`;
};
const cell = (v, o, lower) => (b ? `${v ?? '-'} | ${o ?? '-'}${delta(v, o, lower)}` : `${v ?? '-'}`);
const hdr = (cols) => (b ? `| ${cols} | ${a.label} | ${b.label} |\n|---|---|---|` : `| ${cols} | ${a.label} |\n|---|---|`);
const row = (name, f, lower) => {
  const x = f(a); const y = b ? f(b) : undefined;
  return `| ${name} | ${cell(x, y, lower)} |`;
};

let md = `# DevSync benchmark report\n\n`;
md += `**Machine:** ${a.machine.cpu} · ${a.machine.cores} cores · ${a.machine.memGB} GB · Node ${a.machine.node} · ${a.machine.platform}/${a.machine.arch}\n`;
md += `**Commits:** ${a.label}=${a.commit}${b ? `, ${b.label}=${b.commit}` : ''}\n`;
md += `**Params:** ${JSON.stringify(a.params)}\n\n`;

for (const [title, name] of [['HTTP `/health` (no auth, light DB state check)', 'http-health'], ['HTTP authenticated read `/workspace/all` (session + user lookup + query)', 'http-authenticated-read']]) {
  md += `## ${title}\n\n${hdr('Metric')}\n`;
  md += row('Requests/sec', (r) => by(r, (x) => x.name === name)?.reqPerSec) + '\n';
  md += row('Latency p50 (ms)', (r) => by(r, (x) => x.name === name)?.latencyMs.p50, true) + '\n';
  md += row('Latency p99 (ms)', (r) => by(r, (x) => x.name === name)?.latencyMs.p99, true) + '\n';
  md += row('Server CPU avg (%)', (r) => by(r, (x) => x.name === name)?.server.cpuAvgPct, true) + '\n';
  md += row('Event-loop lag p99 (ms)', (r) => by(r, (x) => x.name === name)?.server.eventLoopLagMs.p99, true) + '\n\n';
}

md += `## Connect + join storm (${a.params.joinClients} concurrent clients)\n\n${hdr('Metric')}\n`;
const js = (f) => (r) => f(by(r, (x) => x.name === 'join-storm'));
md += row('Total time to joined, p50 (ms)', js((x) => x.totalMs.p50), true) + '\n';
md += row('Total time to joined, p95 (ms)', js((x) => x.totalMs.p95), true) + '\n';
md += row('Failures', js((x) => x.failures), true) + '\n\n';

md += `## Whiteboard draw fan-out (1 room, ${a.params.sendHz} events/s per client)\n\n`;
const levels = [...new Set(a.results.filter((x) => x.clientsInRoom).map((x) => x.clientsInRoom))];
for (const c of levels) {
  const f = (g) => (r) => { const x = by(r, (y) => y.clientsInRoom === c); return x ? g(x) : undefined; };
  md += `### ${c} clients in room\n\n${hdr('Metric')}\n`;
  md += row('Delivered msgs/sec', f((x) => x.deliveredMsgPerSec)) + '\n';
  md += row('Delivered ratio', f((x) => x.deliveredRatio)) + '\n';
  md += row('Delivery latency p50 (ms)', f((x) => x.latencyMs.p50), true) + '\n';
  md += row('Delivery latency p99 (ms)', f((x) => x.latencyMs.p99), true) + '\n';
  md += row('Server CPU avg (%)', f((x) => x.server.cpuAvgPct), true) + '\n';
  md += row('Event-loop lag p99 (ms)', f((x) => x.server.eventLoopLagMs.p99), true) + '\n';
  md += row('Load generator CPU (%)', f((x) => x.generatorCpuPct)) + '\n\n';
}
const bound = a.results.filter((x) => x.generatorBound).map((x) => x.clientsInRoom);
if (bound.length) md += `> ⚠️ Load generator was CPU-bound (>85%) at ${bound.join(', ')} clients; those numbers understate the server. Run the generator on a second machine for those levels.\n`;
process.stdout.write(md);
