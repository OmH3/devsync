// Preloaded into the server process (node --import) to expose event-loop delay over IPC.
// Does not modify application code.
import { monitorEventLoopDelay } from 'node:perf_hooks';

const h = monitorEventLoopDelay({ resolution: 10 });
h.enable();

process.on('message', (m) => {
  if (m?.type === 'lag-reset') h.reset();
  if (m?.type === 'lag-get') {
    const ms = (ns) => +(ns / 1e6).toFixed(3);
    process.send({
      type: 'lag',
      mean: ms(h.mean),
      p50: ms(h.percentile(50)),
      p99: ms(h.percentile(99)),
      max: ms(h.max),
    });
    h.reset();
  }
});
