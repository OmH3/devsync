import test from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryTracker, nextDeadline } from './metrics.mjs';
test('late deliveries use separate timing; duplicates cannot conceal loss', () => {
  const t = new DeliveryTracker(3);
  const a = t.sent(0, 1000), b = t.sent(1, 2000);
  t.receive(1, a, 1000, 2000);
  t.receive(1, a, 1000, 2500);
  t.receive(0, a, 1000, 2500);
  t.close();
  t.receive(2, a, 1000, 4_501_000);
  t.receive(0, b, 2000, 4_502_000);
  const s = t.summary(2000, 3000);
  assert.equal(s.inboundMsgPerSec, 1);
  assert.equal(s.deliveredMsgPerSec, 0.5);
  assert.equal(s.deliveredIncludingDrainPerSec, 0.6);
  assert.equal(s.receivedDuringDrain, 2);
  assert.equal(s.deliveredRatio, 0.75);
  assert.equal(s.missingDeliveries, 1);
  assert.equal(s.duplicateDeliveries, 1);
  assert.equal(s.invalidDeliveries, 1);
  assert.ok(s.latencyMs.p99 >= 4500);
});
test('empty workloads have no fabricated latency or delivery ratio', () => {
  const s = new DeliveryTracker(2).summary(1000, 0);
  assert.equal(s.latencyMs.p50, null); assert.equal(s.deliveredRatio, null);
});
test('tracking grows without forgetting prior deliveries', () => {
  const t = new DeliveryTracker(2);
  for (let i = 1; i <= 5000; i++) t.sent(0, i);
  t.receive(1, 1, 1, 5001); t.receive(1, 5000, 5000, 5001); t.receive(1, 1, 1, 5002);
  assert.equal(t.received, 2); assert.equal(t.duplicates, 1);
});
test('scheduler skips missed deadlines without catch-up bursts', () => {
  assert.equal(nextDeadline(0, 0, 10), 10);
  assert.equal(nextDeadline(0, 35, 10), 40);
  assert.equal(nextDeadline(5, 45, 10), 55);
});
