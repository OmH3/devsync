# Local baseline run

Completed 2026-11-16 on Windows, Node v24.18.0, Intel Core Ultra 5 225H, 14 logical cores, 15.5 GB RAM.
Source: `perf/benchmarks`, commit `5172bf799ef7b377a7f836b48d87586000c1bdfb`, with uncommitted harness fixes. Application source was unchanged.

## Results

- `baseline.json`: completed full default benchmark; one exploratory run, not a median of repeated runs.
- `BASELINE_REPORT.md`: generated summary.
- `smoke.json`: preliminary short run only; its CPU/RAM zeros were caused by inaccessible Windows process metrics and are not valid resource measurements.
- HTTP: health 4,237 requests/sec; authenticated read 213 requests/sec; neither phase reported HTTP errors, timeouts, or non-2xx responses.
- All 100 join clients succeeded.
- Draw delivery ratio was 1 at all tested levels, including the drain period. At 5–20 clients, actual send rate was approximately 50–52 events/sec/client rather than the requested 60.

## Measurement limits

The 40-client phase flagged the generator as saturated (88.2% of one CPU core). Delivery latency exceeded the histogram's 3,000 ms ceiling and server event-loop delay reached about 21.4 seconds. Generator and server share this laptop. Reported message rates divide counts by the configured 15 seconds rather than a measured elapsed window; delayed timers and drain-period deliveries can distort these rates under overload. Do not present the 40-client throughput as server capacity. Measure actual elapsed time and isolate the generator before using overloaded runs for optimization comparisons.

Join-storm CPU/RAM values are null: no process-metric sample completed during this short phase. Other full-baseline phases recorded resource samples without sample errors. The baseline ran outside the Codex sandbox because Windows process-metric collection requires WMI access unavailable inside it.

## Local harness fixes

- Added `bench/seed-roles.mjs`: updates or creates roles without changing existing role IDs, always disconnects MongoDB, and restricts its target to the local `devsync_bench` database. The application seeder otherwise left its connection open and stalled the harness.
- Added seeder timeout/error handling and explicit registration-error reporting.
- Record missing resource samples as null, with sample/error counts, rather than misleading zeros.
- Record whether the checkout has uncommitted changes.

## Repeat from PowerShell

Start Docker Desktop, then run from `server`:

```powershell
docker compose -p devsync-benchmark -f bench/docker-compose.bench.yml up -d --wait --wait-timeout 120
npm.cmd run bench -- baseline-2
node bench/report.mjs baseline-2
docker compose -p devsync-benchmark -f bench/docker-compose.bench.yml stop
```

Use a new label to preserve the existing baseline. Close unrelated workloads and repeat before drawing performance conclusions. MongoDB and Redis use the benchmark Compose project; stopping it preserves its data. No changes or results were committed or pushed.
