> Exploratory single run with local harness fixes. The 40-client load generator saturated; its throughput is not a reliable capacity measurement. See [RUN_NOTES.md](RUN_NOTES.md) for measurement limitations.

# DevSync benchmark report

**Machine:** Intel(R) Core(TM) Ultra 5 225H · 14 cores · 15.5 GB · Node v24.18.0 · win32/x64
**Commits:** baseline=5172bf7
**Params:** {"httpConnections":50,"httpSeconds":15,"socketLevels":[5,10,20,40],"sendHz":60,"socketSeconds":15,"joinClients":100}

## HTTP `/health` (no auth, light DB state check)

| Metric | baseline |
|---|---|
| Requests/sec | 4237 |
| Latency p50 (ms) | 10 |
| Latency p99 (ms) | 35 |
| Server CPU avg (%) | 23.2 |
| Event-loop lag p99 (ms) | 41.222 |

## HTTP authenticated read `/workspace/all` (session + user lookup + query)

| Metric | baseline |
|---|---|
| Requests/sec | 213 |
| Latency p50 (ms) | 226 |
| Latency p99 (ms) | 409 |
| Server CPU avg (%) | 28.7 |
| Event-loop lag p99 (ms) | 78.578 |

## Connect + join storm (100 concurrent clients)

| Metric | baseline |
|---|---|
| Total time to joined, p50 (ms) | 629 |
| Total time to joined, p95 (ms) | 890.6 |
| Failures | 0 |

## Whiteboard draw fan-out (1 room, 60 events/s per client)

### 5 clients in room

| Metric | baseline |
|---|---|
| Delivered msgs/sec | 1010 |
| Delivered ratio | 1 |
| Delivery latency p50 (ms) | 1 |
| Delivery latency p99 (ms) | 9 |
| Server CPU avg (%) | 2.7 |
| Event-loop lag p99 (ms) | 26.247 |
| Load generator CPU (%) | 9.2 |

### 10 clients in room

| Metric | baseline |
|---|---|
| Delivered msgs/sec | 4625 |
| Delivered ratio | 1 |
| Delivery latency p50 (ms) | 1.6 |
| Delivery latency p99 (ms) | 6.2 |
| Server CPU avg (%) | 3.9 |
| Event-loop lag p99 (ms) | 25.985 |
| Load generator CPU (%) | 15.9 |

### 20 clients in room

| Metric | baseline |
|---|---|
| Delivered msgs/sec | 19594 |
| Delivered ratio | 1 |
| Delivery latency p50 (ms) | 4 |
| Delivery latency p99 (ms) | 11.2 |
| Server CPU avg (%) | 10.9 |
| Event-loop lag p99 (ms) | 25.182 |
| Load generator CPU (%) | 42.8 |

### 40 clients in room

| Metric | baseline |
|---|---|
| Delivered msgs/sec | 95997 |
| Delivered ratio | 1 |
| Delivery latency p50 (ms) | >3000 |
| Delivery latency p99 (ms) | >3000 |
| Server CPU avg (%) | 25 |
| Event-loop lag p99 (ms) | 21407.728 |
| Load generator CPU (%) | 88.2 |

> ⚠️ Load generator was CPU-bound (>85%) at 40 clients; those numbers understate the server. Run the generator on a second machine for those levels.
