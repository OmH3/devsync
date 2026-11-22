# Implementation progress

## 22 November 2026

Branch: `perf/node-react-ux`. Never push or merge this work to `main`.

The existing uncommitted application and harness optimizations were preserved in
commit `f8471a2`. Original benchmark artifacts remain on disk; their SHA256 hashes
are recorded in `BASELINE_ARTIFACT_HASHES.json`. CPU profiles are ignored rather
than deleted. The implementation plan is committed with the checkpoint.

M00 stack separation removes 99 tracked Go/Next implementation, documentation,
and deployment files. The unused root tldraw dependency was removed after a
reference search. The C++ code-runner Dockerfile remains because it belongs to
the retained application's execution feature. Production deployment replacement
is still pending M12.

Checks completed:

- Real Docker MongoDB 7 replica set and Redis started and healthy.
- Benchmark accounting tests: 4 passed, 0 failed.
- Retained client installed with `npm ci` and production build passed.
- Initial main JS: 1004.32 kB uncompressed, 289.04 kB gzip.
- Existing client lint: 37 errors and 17 warnings, recorded separately.
- Existing client dependency audit: 24 advisories, recorded separately.

The first preserved-checkpoint benchmark completed against the real application
and database. HTTP returned no errors and all 100 concurrent room joins passed.
Dependency installation/build activity overlapped this exploratory run; do not
use it as a controlled capacity claim. Additional sequential runs are underway.

M01 remains in progress. No later milestone is complete yet. Full browser
journeys, final performance measurements, deployment packaging, and pushing the
completed branch remain outstanding.

## 22 November 2026 (later): frontend, UX and deployment slice

Branch `perf/node-react-ux`. Client-only and deployment changes; the server-side
M02-M04 work (env/logger/session files) that was already in the working tree is
**not** part of this commit and is still unverified.

Done:

- Route-level code splitting; editors and the Stream SDK load on demand; Stream
  only loads when `/api/capabilities` reports audio enabled and a key is configured.
  Login-path JS is about 112 kB gzip (previously a single 289 kB gzip bundle).
- One shared Socket.IO connection per tab with reference-counted workspace rooms
  and automatic room restore after reconnect (`client/src/realtime/sharedSocket.js`).
- Removed the debug overlay, `alert()` calls (replaced by accessible toasts) and the
  2-4 s browser-specific Google callback delay.
- Dashboard redesign: sidebar with workspace switcher, header with invite action,
  URL-addressable views (`?view=documents`), skeleton loading, mobile drawer,
  focus-visible styles, reduced-motion support. Light theme only for now.
- Same-origin API/WebSocket configuration (`client/src/config/env.js`, Vite dev proxy).
- Deployment: `docker-compose.prod.yml` (Caddy + Node + MongoDB replica set),
  `server/Dockerfile`, `deploy/`, `docs/DEPLOY_AWS_FREE_TIER.md`.

Verified: client production build succeeds; new files lint clean.
Not verified: Docker stack build/run (Docker unavailable in this session's sandbox),
browser journeys, cross-user realtime behaviour, post-change benchmarks.
