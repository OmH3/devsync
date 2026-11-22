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
