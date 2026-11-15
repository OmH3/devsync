# DevSync benchmarks

Repeatable load tests for the Express + Socket.IO + MongoDB server. Same script before and after each
optimisation, so the before/after numbers are comparable.

## What it measures
| Phase | What it stresses |
|---|---|
| `http-health`, `http-authenticated-read` | Express overhead; session store + passport user lookup + Mongo query per request |
| `join-storm` | Socket auth (session + user query) and `join-whiteboard` (2 Mongo queries) with many clients at once |
| `whiteboard-draw-fanout` | Socket.IO relay of unthrottled `draw-move` events; delivered msgs/s, delivery latency, loss, CPU, event-loop lag |

Server CPU/RSS are sampled from the real server process; event-loop lag comes from a preloaded
`monitorEventLoopDelay` (`instrument.mjs`), so no app code is modified.

## Run it
```bash
cd server
npm install
docker compose -f bench/docker-compose.bench.yml up -d      # MongoDB (replica set) + Redis; wait ~15s
npm run bench -- baseline                                   # writes bench/results/baseline.json
# ...optimise...
npm run bench -- after-throttle
npm run bench:report -- baseline after-throttle > bench/results/REPORT.md
```
For clean numbers: close other apps, plug in the laptop, run 2–3 times and keep the median run.
Tune with env vars: `HTTP_SECONDS`, `HTTP_CONNECTIONS`, `SOCKET_LEVELS=5,10,20,40`, `SEND_HZ=60`, `SOCKET_SECONDS`, `JOIN_CLIENTS`.

## Caveats (state these honestly in the write-up)
- Load generator and server share one machine; the report flags runs where the generator exceeded 85% of a core.
- All sockets use one test user's session (server does not dedupe), so per-socket cost is realistic but auth is not user-diverse.
- Localhost has no network latency; numbers show server cost, not user-perceived latency.
