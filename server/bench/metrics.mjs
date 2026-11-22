import { createHistogram } from 'node:perf_hooks';

// Unique sender sequences and per-receiver bits prevent duplicates concealing loss.
export class DeliveryTracker {
  constructor(clients) {
    this.clients = clients;
    this.senders = [-1]; this.timestamps = [0];
    this.seen = Array.from({ length: clients }, () => new Uint8Array(4096));
    this.latency = createHistogram({ lowest: 1, highest: 3_600_000_000, figures: 3 });
    this.during = 0; this.after = 0; this.duplicates = 0; this.invalid = 0; this.closed = false; this.finished = false;
  }
  sent(sender, timestampUs) {
    this.senders.push(sender); this.timestamps.push(timestampUs);
    return this.senders.length - 1;
  }
  receive(receiver, sequence, timestampUs, nowUs) {
    if (this.finished) return;
    if (sequence === 0) return;
    if (!Number.isInteger(sequence) || sequence < 1 || sequence >= this.senders.length ||
        this.senders[sequence] === receiver || this.timestamps[sequence] !== timestampUs || nowUs < timestampUs) {
      this.invalid++; return;
    }
    if (sequence >= this.seen[receiver].length) {
      const next = new Uint8Array(Math.max(sequence + 1, this.seen[receiver].length * 2));
      next.set(this.seen[receiver]); this.seen[receiver] = next;
    }
    if (this.seen[receiver][sequence]) { this.duplicates++; return; }
    this.seen[receiver][sequence] = 1;
    if (this.closed) this.after++; else this.during++;
    this.latency.record(Math.max(1, Math.round(nowUs - timestampUs)));
  }
  close() { this.closed = true; }
  finish() { this.finished = true; }
  get sentCount() { return this.senders.length - 1; }
  get expected() { return this.sentCount * (this.clients - 1); }
  get received() { return this.during + this.after; }
  summary(sendMs, drainMs) {
    if (!(sendMs > 0) || drainMs < 0) throw new Error('Invalid measurement duration');
    const rate = (n, ms) => +(n * 1000 / ms).toFixed(2);
    return {
      sendElapsedMs: +sendMs.toFixed(3), drainElapsedMs: +drainMs.toFixed(3),
      sent: this.sentCount, expectedDeliveries: this.expected,
      receivedDuringSend: this.during, receivedDuringDrain: this.after,
      missingDeliveries: this.expected - this.received, duplicateDeliveries: this.duplicates, invalidDeliveries: this.invalid,
      inboundMsgPerSec: rate(this.sentCount, sendMs), actualSendHzPerClient: rate(this.sentCount / this.clients, sendMs),
      deliveredMsgPerSec: rate(this.during, sendMs),
      deliveredIncludingDrainPerSec: rate(this.received, sendMs + drainMs),
      deliveredRatio: this.expected ? this.received / this.expected : null,
      latencyMs: Object.fromEntries([50, 95, 99, 100].map(p => [p === 100 ? 'max' : `p${p}`,
        this.received ? +(this.latency.percentile(p) / 1000).toFixed(3) : null])),
    };
  }
}

// Absolute deadlines skip missed ticks instead of replaying them in a catch-up burst.
export function nextDeadline(startMs, nowMs, periodMs) {
  return startMs + (Math.floor((nowMs - startMs) / periodMs) + 1) * periodMs;
}
