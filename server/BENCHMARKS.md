# DevSync Performance Benchmarks

Reproducible benchmark methodology, profiling evidence, and before/after results for the DevSync backend (`server/`).

## Environment & Configuration

- **Hardware:** Intel Core Ultra 5 225H (14 logical cores), 15.5 GB RAM (AC power)
- **OS / Runtime:** Windows 11 (`win32/x64`), Node.js `v24.18.0`
- **Backing Services:** Docker Compose (`bench/docker-compose.bench.yml`) running MongoDB 7 (`rs0` single-node replica set) and Redis 7 on localhost
- **Base Commit:** `5172bf7` (`perf/benchmarks`)
- **Workload Parameters:**
  - HTTP concurrency: `50` connections, `15s` duration (`2s` warmup)
  - Socket join storm: `100` concurrent clients connecting + joining a whiteboard room
  - Whiteboard draw fan-out: `5, 10, 20, 40` concurrent clients in 1 room, each emitting `draw-move` at `60 Hz` for `15s` (`2s` warmup, `5s` drain window)

---

## Step 1: Harness Measurement Fixes

Before collecting baseline medians, two measurement issues in the initial benchmark harness were fixed and unit-tested (`bench/metrics.mjs`, `bench/metrics.test.mjs`, `bench/instrument.mjs`):

1. **In-process CPU & memory sampling (`bench/instrument.mjs`):** Replaced `pidusage` (which spawned `wmic`/PowerShell subprocesses every 500 ms on Windows, distorting server/generator CPU and starving the event loop at 40 clients) with in-process `process.cpuUsage()` and `process.memoryUsage.rss()` via IPC.
2. **Exact delivery window & sequence tracking (`bench/metrics.mjs`):**
   - Separated messages delivered **during** the active send window (`receivedDuringSend`) from late messages arriving during the post-send drain window (`receivedDuringDrain`), dividing throughput by the actual elapsed send time (`sendElapsedMs`) rather than nominal seconds.
   - Tracked per-sender sequence numbers and per-receiver bitsets so duplicate deliveries cannot mask dropped messages.
   - Replaced catch-up burst timers with an absolute deadline scheduler (`nextDeadline`) and widened the latency histogram ceiling to 3,600s.

With the WMI subprocess overhead removed, the 40-client draw fan-out phase is **no longer generator-bound** (load generator CPU dropped from 88.2% with 21.4s event-loop lag to ~68–83% CPU and ~22ms p99 lag, achieving 100% delivery with sub-100ms p99 latency).

---

## Step 2: Profiling Evidence (`baseline-profile.json` + `.cpuprofile`)

A dedicated profiling run (`BENCH_PROFILE=1 node bench/run.mjs baseline-profile`) recorded V8 CPU profiles and Mongoose/MongoStore operation timings:

1. **HTTP Authenticated Read (`GET /api/workspace/all`):**
   - Every HTTP request executed **4 sequential MongoDB operations**:
     - `session-store:get` (avg `16.55 ms`)
     - `mongoose:User.findOne` in `passport.deserializeUser` (avg `16.72 ms`) — hydrated a full Mongoose document and called `user.toObject()` via `omitPassword()`
     - `mongoose:Member.find` in `getAllWorkspacesUserIsMemberService` (avg `33.59 ms`) — **unindexed collection scan** on `members` by `userId`, plus full Mongoose document hydration
     - `mongoose:Workspace.find` via `.populate("workspaceId")` (avg `16.72 ms`)
2. **Socket Connect + Join Storm (`100` clients):**
   - Each client triggered `session-store:get` (`50.69 ms` avg) and `User.findOne` (`34.42 ms` avg) on handshake, plus `Whiteboard.findOne` (`46.92 ms` avg — fetching the entire whiteboard document including `boardElements` and `collaborators` just to check `isActive` and `workspaceId`) and unindexed `Member.findOne({ userId, workspaceId })` (`43.26 ms` avg) on room join.
3. **Whiteboard Draw Fan-out (`40` clients, `2,400` inbound events/s → `93,600` outbound events/s):**
   - Zero database queries during drawing.
   - V8 CPU profile showed **64.8% of server CPU is spent in native kernel socket `writev`** (`node:internal/stream_base_commons`) and `14.9%` idle, confirming the Socket.IO in-memory broadcast path has minimal JS overhead.

---

## Step 3: Implemented Optimizations

### Optimization Pass 1: Compound Indexes, `.lean()`, and Field Projections (`after-lean`)
1. **Compound Indexes on `Member` ([Member.model.js](src/models/Member.model.js)):**
   - Added `memberSchema.index({ userId: 1, workspaceId: 1 })` and `memberSchema.index({ workspaceId: 1 })`.
2. **Lean Queries & Field Projections on Hot Read Paths:**
   - [workspace.service.js](src/services/workspace.service.js): Added `.lean()` to `MemberModel.find({ userId }).populate("workspaceId").select("-password")` in `getAllWorkspacesUserIsMemberService`.
   - [whiteboard.handlers.js](src/handlers/whiteboard.handlers.js): Projected `.select("workspaceId isActive").lean()` on `WhiteboardModel.findById` and `.select("_id").lean()` on `MemberModel.findOne` during `join-whiteboard` so joining a board does not load or hydrate `boardElements`.

### Optimization Pass 2: Stateless JWT Session Cookies (`after-jwt`)
1. **Eliminated Per-Request Session & User DB Queries ([jwt.js](src/utils/jwt.js), [isAuthenticated.middleware.js](src/middleware/isAuthenticated.middleware.js), [server.js](src/server.js)):**
   - Replaced `express-session` + `connect-mongo` + `passport.session()` with stateless `HS256` JWTs stored in the same `httpOnly` `session` cookie, using a pre-allocated `crypto.createSecretKey()` for fast in-memory verification.
   - Updated [auth.controller.js](src/controllers/auth.controller.js), [auth.routes.js](src/routes/auth.routes.js), and [workspace.controller.js](src/controllers/workspace.controller.js) to issue/refresh/clear the JWT cookie on login, Google OAuth callback, workspace create/delete, and logout.
   - Reduced per-request MongoDB round-trips on `/workspace/all` from **4 queries to 2** (`session-store:get` and `User.findOne` reduced from ~10,140 queries to **0**), and reduced Socket.IO handshake MongoDB queries from **200 queries (2 per client) to 0**.

---

## Step 4: Before vs. After Results (3-Run Medians on AC Power)

Three unprofiled runs were executed for each stage:
- **Baseline:** `baseline-r1`, `baseline-r2`, `baseline-r3`
- **Pass 1 (`after-lean`):** `after-lean-r1`, `after-lean-r2`, `after-lean-r3`
- **Pass 2 (`after-jwt`):** `after-jwt-r1`, `after-jwt-r2`, `after-jwt-r3`

### Summary Table (Median of 3 Runs, with Min–Max Range)

| Workload / Metric | Baseline Median (Range) | Pass 1: Lean + Index Median (Range) | Pass 2: Stateless JWT Median (Range) | Total Change (vs. Baseline) |
|---|---:|---:|---:|---:|
| **HTTP `/health`** | | | | |
| Requests/sec | 17,247 (14,050–19,335) | 21,004 (13,098–21,528) | **20,730** (19,206–30,334) | **+20.2%** |
| Latency p50 / p99 (ms) | 2 / 7 | 2 / 5 | **2 / 5** (p99: 2–5) | **0% / -28.6%** |
| **HTTP Auth Read (`/workspace/all`)** | | | | |
| Requests/sec | 707 (648–833) | 886 (719–906) | **1,279** (1,232–1,343) | **+80.9%** |
| Latency p50 (ms) | 70 (59–75) | 55 (54–68) | **36** (36–39) | **-48.6%** |
| Latency p99 (ms) | 94 (75–114) | 76 (68–93) | **66** (51–76) | **-29.8%** |
| DB queries per request | 4 (`session`, `User`, `Member`, `Workspace`) | 4 (`session`, `User`, `Member`, `Workspace`) | **2** (`Member`, `Workspace`) | **-50.0% queries** |
| **Socket Join Storm (100 clients)** | | | | |
| Total wall time (ms) | 341 (301–433) | 282 (275–380) | **315** (232–316) | **-7.6%** (best: 232 ms) |
| Socket connect p50 (ms) | 102.8 (96.9–134.4) | 90.5 (90.1–127.1) | **50.9** (45.7–55.1) | **-50.5%** |
| Socket connect p95 (ms) | 172.1 (163.3–228.1) | 160.6 (154.1–192.2) | **54.6** (46.6–60.7) | **-68.3%** |
| Total time to joined p50 (ms) | 211.7 (193.5–274.7) | 183.7 (175.7–237.2) | **183.6** (140.5–186.3) | **-13.3%** |
| Total time to joined p95 (ms) | 316.1 (281.3–404.0) | 264.6 (254.1–347.2) | **285.0** (205.2–289.6) | **-9.8%** |
| Failures | 0 | 0 | **0** | **0** |
| **Whiteboard Draw Fan-out (60 Hz/client)** | | | | |
| 5 clients: Delivered msg/s (p99 ms) | 1,198.7 (1.23 ms) | 1,199.0 (1.02 ms) | **1,198.8** (1.36 ms) | **100% delivered** |
| 10 clients: Delivered msg/s (p99 ms) | 5,378.7 (2.88 ms) | 5,374.4 (1.92 ms) | **5,385.2** (3.18 ms) | **100% delivered** |
| 20 clients: Delivered msg/s (p99 ms) | 22,694.3 (7.54 ms) | 22,650.2 (5.30 ms) | **22,748.6** (8.11 ms) | **100% delivered** |
| 40 clients: Delivered msg/s (p99 ms) | 92,940.9 (85.12 ms) | 93,164.5 (49.06 ms) | **93,196.2** (59.04 ms) | **100% delivered (-30.6% p99)** |

---

## Limitations & Methodology Notes

- **Single-machine co-location & power state:** Both the Node.js server, the load generator (`autocannon` / `socket.io-client`), and Dockerized MongoDB compete for CPU and kernel socket buffers on the same 14-core laptop. Always run on AC power (battery power throttles clock speeds by >40%).
- **Database scale:** The benchmark seeds a fresh user and workspace per run. The compound index on `Member({ userId: 1, workspaceId: 1 })` prevents O(N) collection scans as the `members` collection grows in production.
- **Reproducing:**
  ```powershell
  cd server
  docker compose -p devsync-benchmark -f bench/docker-compose.bench.yml up -d --wait --wait-timeout 120
  node --test bench/metrics.test.mjs
  node bench/run.mjs my-run
  node bench/report.mjs baseline-r3 after-jwt-r1
  ```
