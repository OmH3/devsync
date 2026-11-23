# DevSync Node and React implementation plan

Prepared on 22 November 2026 for the Node.js and React application in `server/` and `client/`.

This is an implementation specification, not a record of completed changes. It defines what to change, where to change it, how to implement it, and how to prove that it works. Follow the milestones in order. Keep this file available in subsequent implementation sessions; update the execution ledger at the end after each completed milestone.

The intended result is a coherent collaboration product with measured performance improvements, reliable editing and persistence, consistent permissions, accessible UI, and a reproducible single-instance deployment. Keep JavaScript, React/Vite, Express, MongoDB, and Socket.IO. Add infrastructure only when a measured requirement justifies its operational cost.

## Scope and fixed decisions

| Area | Decision |
| --- | --- |
| Implementation branch | `perf/node-react-ux`, based on a preserved checkpoint of the local `perf/benchmarks` work |
| Frontend | React 19, Vite, Tailwind; preserve current major versions initially |
| Backend | Node.js ESM and Express 5; retain the current application stack |
| Language | JavaScript with JSDoc for important interfaces; no repository-wide TypeScript conversion |
| Database | MongoDB with a replica set for existing transactions; explicit indexes and migrations |
| HTTP data state | TanStack Query; existing dependency, currently underused |
| Local UI state | Zustand for small UI preferences; local component state for local interactions |
| Realtime transport | One shared Socket.IO connection per authenticated browser tab |
| Text collaboration | Yjs for document/code text, with a bounded Socket.IO transport adapter and server-owned persistence; introduce after authorization and transport foundations |
| Editor | CodeMirror 6 for code; use its text editing and Yjs binding in a prose-oriented configuration for existing plain-text documents |
| Whiteboard | Keep the existing canvas; batch previews and persist explicit versioned element operations |
| UI primitives | Native controls where suitable; Radix primitives for dialogs, menus, tabs, popovers, and tooltips; one icon library |
| Logging | Pino JSON logs, request correlation, explicit redaction; pretty printing only in development |
| Initial deployment | One Node application process, reverse proxy, and private MongoDB on AWS EC2, subject to account eligibility and resource measurements |
| Redis | Off by default; optional later milestone with an explicit measurement and scaling gate |
| Audio/video | Optional Stream integration; off in the strict cloud-only demonstration profile |
| Code execution | Off in public deployments until a separate isolated runner is implemented and tested |

Dockerfile.cpp belongs to the optional code execution feature.

### Required release scope

Milestones M00 through M12 below form the core release. M13 is conditional scaling work. A milestone being finished does not imply the whole project is finished. Do not call a release complete while required correctness tests, migrations, UI journeys, or benchmark evidence remain unresolved.

### Explicit exclusions

- No claim of one million requests per second or guaranteed speedup.
- No Kubernetes, managed Redis, service mesh, distributed tracing service, or paid observability dependency in the initial release.
- No public anonymous code runner, file execution service, or unrestricted guest writes.
- No rich-text/HTML document conversion in this work; existing documents use plain text. Preserve content exactly during migration.
- No promise of permanent zero-cost cloud hosting. The initial AWS recommendation is a conditional, time-limited free-plan demo.
- No fake dashboard statistics, invented activity, nonfunctional controls, or placeholder production features.

## Current repository evidence

These findings describe the inspected local checkout. Recheck them when starting implementation because the working tree can change.

| Finding | Evidence | Consequence |
| --- | --- | --- |
| Local branch is `perf/benchmarks`, HEAD `5172bf7`, with modified and untracked files | Git status; `server/BENCHMARKS.md`; `server/bench/results/` | Preserve local changes and results before branch cleanup |
| Query/JWT optimizations already exist locally | `Member.model.js`, `workspace.service.js`, `whiteboard.handlers.js`, `utils/jwt.js` | Audit and benchmark them; do not overwrite or count them as new work |
| Production Compose targets Go/Postgres | Root `docker-compose.prod.yml` | Replace it with an independently validated Node/Mongo deployment |
| HTTP server listens before Mongo connection completes | `server/src/server.js` | Separate bootstrap from app construction and gate readiness |
| Configuration reads are permissive and integrations initialize during imports | `config/app.config.js`, `config/passport.config.js`, `config/stream.config.js` | Validate once and initialize optional dependencies conditionally |
| Every `useSocket()` invocation constructs a connection | `client/src/hooks/useSocket.js`; callers in editor/audio components | Introduce one provider and resource-specific subscriptions |
| Document/whiteboard handlers authorize joins but several mutation relays do not recheck membership/edit access | `handlers/docs.handlers.js`, `handlers/whiteboard.handlers.js` | Centralize authorization for every event, including legacy aliases |
| Generic `user-count` events are not scoped in their payload | Same handlers | Include resource identity to prevent cross-view updates |
| Text editors already debounce saves at 1500 ms | `DocumentEditor.jsx`, `CodeEditor.jsx` | Improve ownership, sequencing, and recovery instead of adding another timer |
| Text updates broadcast whole content and client save notifications | `docs.handlers.js`; editor components | Define one authoritative collaboration/persistence contract |
| Auth persists user and authenticated state in localStorage | `store/authStore.js`, `hooks/useAuth.js` | Bootstrap against the server; storage is not authentication evidence |
| UI and socket code use broad Zustand subscriptions | `Dashboard.jsx`, stores and hooks | Separate server data, editor state, and UI preferences |
| Dashboard uses local active-view state and fixed editor heights | `pages/Dashboard.jsx` | Move navigation into URLs and use a viewport-aware app shell |
| App renders a debug audio overlay | `client/src/App.jsx` | Remove it; capability-gate audio loading |
| App uses alerts, confirmation dialogs, and extensive console logging | Components, controllers, handlers | Introduce shared feedback and structured operational logging |
| Code execution spawns host processes | `server/src/coderunners/scripts.runner.js` | Block public execution before deployment |
| Membership index is nonunique | `server/src/models/Member.model.js` | Audit duplicates before introducing unique membership constraints |
| Document service references error classes without imports | `server/src/services/docs.service.js` | Fix correctness defects while consolidating service boundaries |
| CodeEditor schema requires a file reference while creation can pass null | `CodeEditor.model.js`, `codeeditor.service.js` | Define and enforce one file/editor creation transaction |

The existing benchmark report records three-run authenticated-read medians of 707 requests/sec before and 1,279 after local changes. Treat these as recorded evidence awaiting reproduction, not a verified result of this plan. Older exploratory runs have different conditions and must not be merged into the comparison.

## Engineering standards for every milestone

### Boundaries and dependency direction

Use the existing routes/controllers/services/models structure. Introduce focused modules without renaming every file at once.

1. Routes register paths, validation, authentication, and controllers.
2. Controllers adapt HTTP requests/results. They do not implement database workflows, permissions, or socket persistence.
3. Socket handlers validate envelopes and call the same authorization/domain services as HTTP.
4. Services own business invariants, transactions, and persistence decisions.
5. Models define storage structure and indexes. Shared query functions belong next to the relevant service; do not create a generic repository wrapper around every Mongoose method.
6. Bootstrap creates dependencies and injects the logger, configuration, clock, and event publisher where needed. Avoid a dependency-injection framework.
7. React pages compose feature components. Feature hooks own data fetching/subscriptions. Shared UI components have no domain API calls.

Replace controller-level mutable `setSocketIO()` globals with a narrow injected domain publisher as those controllers are touched. Publish committed domain changes after database success. Do not broadcast an operation as saved before it is durable.

### DRY without unnecessary abstraction

- Share configuration parsing, authorization policy, API errors, query keys, socket envelopes, save state, dialog primitives, and presence lifecycle.
- Keep document, board, and file business rules explicit. Do not build a giant universal editor or CRUD generator.
- Extract a helper when two real call sites share the same behavior and failure contract. Similar-looking JSX alone is not enough.
- Keep one canonical event name, one API client, one auth bootstrap, one socket owner, and one persistence owner per resource.
- Delete obsolete paths after consumers migrate; do not keep two competing stores or protocols indefinitely.

### Code quality defaults

- Match the dominant local format while adding shared ESLint and Prettier configuration. Avoid unrelated formatting churn.
- Use named exports for new utilities/services; React components may retain existing default exports.
- Prefer descriptive names, early returns, small cohesive functions, and explicit units such as `flushIntervalMs` and `maxPayloadBytes`.
- Treat 250 lines per component and 60 lines per function as review prompts, not rigid rules. Split by responsibility, not line count alone.
- JSDoc public service inputs/results, realtime envelopes, configuration objects, and persistence state machines.
- Handle asynchronous failures; no empty catches, floating promises, or `catch` blocks returning false success.
- Never disable hook dependency rules to hide lifecycle bugs. Stabilize ownership, dependencies, and cleanup.
- Use supported library APIs appropriate to the installed version. Check compatibility before adding/upgrading packages; avoid unrelated major-version upgrades.
- Pin the selected Node LTS release in `.nvmrc`/`.node-version`, `engines`, CI, and Docker. Keep the existing runtime for baseline measurements, then record a runtime upgrade separately if needed.
- Use `npm ci` for reproducible installs. Keep one authoritative lockfile per current package boundary. Do not convert to npm workspaces in the optimization pass.
- Production functions must not contain benchmark bypasses. Use test fixtures and isolated benchmark configuration.

### Error and logging rules

Use stable machine codes and safe user messages. Internal exception details belong in server logs.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the highlighted fields.",
    "fields": [{ "path": "title", "message": "Enter a title." }]
  },
  "requestId": "server-generated-id"
}
```

Map invalid input to 400, unauthenticated to 401, authenticated but forbidden to 403, missing/inaccessible resource to the documented 404 policy, stale revision to 409, oversize payload to 413, rate limit to 429, and dependency outage to 503. Unexpected failures return 500 without stack traces. Restrict malformed-JSON handling to body-parser errors; not every JavaScript `SyntaxError` is bad client input.

Pino records should contain timestamp, level, service, environment, release SHA, event, requestId, route template, status, and duration where applicable. Add resource IDs only when operationally useful. Do not use raw URLs with secrets or high-cardinality resource IDs as metric labels.

- `info`: startup, shutdown, deployment version, completed requests, committed administrative changes.
- `warn`: rejected limits, recoverable dependency failures, repeated invalid events, persistence retries.
- `error`: unexpected request failure, exhausted persistence retry, startup failure.
- `debug`: sampled room lifecycle and development diagnostics, disabled in production.

Never log passwords, cookies, authorization headers, JWTs, OAuth codes/state, connection strings, document/code bodies, board payloads, full user objects, or Stream secrets. Use allowlisted serializers plus redaction as a second layer. Aggregate high-frequency socket counters; do not log every keystroke or pointer movement. Test redaction with sentinel secret strings. See [Pino redaction documentation](https://github.com/pinojs/pino/blob/main/docs/redaction.md).

### Tests and review discipline

Add tests around changed contracts and real failure modes. Do not add implementation-mirroring snapshots or trivial tests solely for coverage percentages. Use real MongoDB replica-set integration tests for authorization queries, atomic saves, indexes, and transactions. Unit tests may use small fakes for clocks, publishers, and timers. Do not benchmark a mock database.

Each milestone must state: behavior changed, files affected, commands run, observed results, migrations/rollback, and remaining limitations. Commit by behavior. Avoid combining dependency upgrades, schema changes, and a visual redesign in one opaque commit.

## Target repository layout

This is a destination map. Create directories only as a milestone needs them.

```text
client/
  src/
    app/                 providers, routes, query client, error boundaries
    config/              validated public configuration
    components/ui/       buttons, fields, dialogs, menus, feedback
    components/layout/   app shell, sidebar, header, workspace switcher
    features/
      auth/ workspaces/ documents/ code/ whiteboard/ members/ audio/
    lib/                 API client, error normalization, query keys
    realtime/            shared provider, transport adapter, subscriptions
    styles/              tokens and global foundations
    store/               UI preferences only after feature migrations
  e2e/
  .env.example
server/
  src/
    app.js               constructs HTTP application without listening
    server.js            startup and shutdown orchestration
    config/              validated environment and integration factories
    observability/       logger, request context, metrics
    middleware/
    routes/ controllers/ services/ models/ validation/
    auth/                session verification and authorization policy
    realtime/            envelopes, room registry, resource adapters
    persistence/         flush coordinator and bounded room lifecycle
  migrations/
  test/                  unit and integration suites
  bench/                 preserved and extended benchmark harness
  .env.example
shared/                  browser-safe contracts only, when shared consumers exist
deploy/                  proxy config, release scripts, backup/restore scripts
docs/                    implementation plan, contracts, operations, evidence
.github/workflows/       CI and optional explicit deployment workflow
docker-compose.dev.yml
docker-compose.prod.yml
```

Keep existing imports working during migration. Move one feature at a time and update all consumers in the same commit. `shared/` must never import server configuration, database code, or Node-only secret-bearing modules; use a local ESM package only if both packages actually need runtime schemas.

## Configuration contract

### Server environment

Create `server/src/config/env.js` using Zod. Parse once, freeze the resulting configuration, and fail startup with names of invalid settings without printing secret values. Only this module and approved startup tooling may read `process.env` directly. Use explicit string-to-boolean parsing; `Boolean("false")` is not acceptable.

| Variable | Initial default or requirement | Validation and purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, `production` |
| `HOST` / `PORT` | `0.0.0.0` / `8000` | Valid host and integer port |
| `BASE_PATH` | `/api` | Normalized leading slash, no trailing slash |
| `PUBLIC_ORIGIN` | Required in production | One externally visible HTTPS origin |
| `FRONTEND_ORIGINS` | `http://localhost:5173` locally | Explicit origin list; no wildcard with credentials |
| `TRUST_PROXY_HOPS` | `0` locally, `1` in documented proxy topology | Integer; application port must not bypass that proxy publicly |
| `MONGO_URI` | Required | Never logged; distinct development, test, benchmark, production databases |
| `MONGO_MAX_POOL_SIZE` | `10` | Positive bounded value; tune after measurement |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS` | `5000` | Bounded startup/failure wait |
| `SESSION_SECRET` | Required, generated random secret | At least 32 random bytes represented safely; reject placeholders |
| `SESSION_TTL_SECONDS` | `28800` | Eight-hour login session; cookie/JWT/database expiry agree |
| `AUTH_CACHE_TTL_MS` | `10000` | Single-process session lookup cache; local revocations invalidate immediately |
| `COOKIE_SECURE` | Derived from environment | Production true; local HTTP false; reject insecure production |
| `COOKIE_SAME_SITE` | `lax` | Default same-origin deployment; cross-site mode requires explicit CSRF design |
| `GOOGLE_AUTH_ENABLED` | `false` | Google credentials/callback URLs required only when true |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Conditional | Callback origin validated against deployment |
| `AUDIO_ENABLED` | `false` | Stream module not initialized when disabled |
| `STREAM_API_KEY`, `STREAM_API_SECRET` | Conditional | Required only when audio enabled; secret never sent to browser |
| `CODE_EXECUTION_ENABLED` | `false` | Cannot enable public host-process runner |
| `REDIS_ENABLED`, `REDIS_URL` | `false`, conditional | No Redis connection/import side effects when disabled |
| `LOG_LEVEL` | `info` | Known Pino level |
| `LOG_PRETTY` | `true` locally, `false` production | Development transport only |
| `RELEASE_SHA` | `dev` locally | CI-injected commit identifier |
| `HTTP_BODY_LIMIT_BYTES` | `1048576` | Coarse limit; individual schemas impose smaller limits |
| `SOCKET_MAX_PAYLOAD_BYTES` | `262144` | Coarse frame limit; most events limited to 64 KiB or less |
| `SAVE_DEBOUNCE_MS` / `SAVE_MAX_WAIT_MS` | `1500` / `5000` | Server flush schedule; max wait must exceed debounce |
| `SHUTDOWN_TIMEOUT_MS` | `15000` | Deadline for graceful shutdown |
| `ROOM_IDLE_TTL_MS` | `60000` | Evict clean idle rooms; never silently discard dirty state |
| `MAX_ACTIVE_ROOMS` | `100` | Initial demo admission ceiling; also enforce a measured byte budget |

Keep limits in one configuration object with units. Do not expose every internal constant as an environment variable. Add settings only for deployment-dependent behavior or a value actively being tuned. Reconcile/retire existing `SESSION_EXPIRES_IN`, `FRONTEND_ORIGIN`, and callback settings with a documented transition; conflicting old/new values must fail validation rather than silently win.

### Browser environment and capabilities

`client/src/config/env.js` is the only browser environment reader. Default API requests to relative `/api`, and Socket.IO to the current origin with `/socket.io`. Configure Vite dev proxy for both paths, including WebSocket proxying, to keep local cookie behavior close to production.

Allow `VITE_API_ORIGIN` only when a separate origin is needed. If using legacy `VITE_API_BASE_URL`, provide a temporary explicit alias and then remove it. Never append `/api` twice. Add `VITE_RELEASE_SHA` as public metadata. Keep feature capabilities server-owned at `GET /api/capabilities`, returning booleans and nonsecret limits. UI flags cannot authorize server operations.

All `VITE_*` values are public build output, not secrets. See [Vite environment documentation](https://vite.dev/guide/env-and-mode).

Commit `.env.example` files with placeholders and explanations. Ignore `.env` and `.env.*` except approved example templates. Never inspect or copy real secret values into this plan, logs, fixtures, screenshots, or commits.

## Milestone M00 Preserve the starting point and separate the stack

**Files:** Git working tree; root deployment/configuration files; `v2_*` paths; benchmark evidence; root package files.

**Steps**

1. Run `git status --short`, `git branch --show-current`, `git log -1`, and `git diff --stat`. Read any applicable `AGENTS.md` before changes.
2. Inventory tracked modifications and untracked benchmark artifacts. Record paths and hashes without including environment files or secrets. Preserve raw results under their existing names.
3. Create `perf/node-react-ux` from the current checkout, carrying the existing changes. If that branch already exists, inspect it and use it only if it is the intended continuation. Never force-reset or overwrite an existing branch.
4. Review and checkpoint the existing application/harness changes separately from new work. Stage explicit paths, not `git add .`. Keep large `.cpuprofile` files locally unless there is a deliberate artifact-storage decision; record checksums and location. Do not silently drop them.
5. Inventory obsolete implementation files, diagrams, scripts, and deployment configurations before removing them.
6. Remove only confirmed v2-exclusive files from this branch. On Windows, resolve each deletion target and verify it is beneath this repository before any recursive operation. Preserve the original branch/history.
7. Audit root `tldraw` dependency usage with `rg`. Keep it only if actually imported by the retained implementation; the current canvas does not justify a second whiteboard stack by itself.
8. Clean obsolete obsolete implementation ignore entries and documentation. Add an architecture scope statement to README and links to this plan and benchmark methodology.

**Acceptance:** Existing changes/results remain recoverable; branch contains no active obsolete implementation source, build instructions, dependencies, or deployment references; Node/React install/build still work. Documentation must describe only the retained application.

**Rollback:** Revert the cleanup commit on this branch; do not rewrite or delete original history.

## Milestone M01 Validate evidence and establish the baseline

**Files:** `server/bench/run.mjs`, `instrument.mjs`, `metrics.mjs`, `report.mjs`, `metrics.test.mjs`, benchmark docs; new browser measurement scripts.

**Steps**

1. Read all local harness changes, `RUN_NOTES.md`, and `BENCHMARKS.md`. Validate measured elapsed time, drain-window accounting, unique delivery tracking, CPU normalization, null metrics, and generator saturation handling.
2. Define three named comparison stages: original application plus a corrected harness; current preserved local optimizations; final implementation. Run the same corrected harness against each compatible stage. If the original stage cannot be reconstructed precisely, disclose that and compare the preserved checkpoint to the final implementation.
3. Run `node --test bench/metrics.test.mjs`. Add only missing tests for incorrect timing, duplicate deliveries, invalid events, saturation, and missing resource samples.
4. Add run metadata: application SHA, harness SHA/version, clean/dirty status, patch hash if dirty, Node/dependency versions, OS/CPU/RAM, power state, database version/index manifest, workload seed, transport, and enabled features.
5. Preserve existing labels. New run IDs must be unique. Store machine-readable JSON and a generated report with sample count and min/median/max; record p50/p95/p99, errors, throughput, CPU/RSS, event-loop delay, and DB queries/writes.
6. Reproduce the original 5/10/20/40-client draw and 100-client join workloads. Add diverse users and workspaces, warm and cold permission caches, read-only members, slow clients, reconnects, and autosave workloads.
7. Add larger seeded list datasets for index tests. Keep a small deterministic CI fixture and an explicitly selected larger local performance fixture. Never seed or clear a production database.
8. Record production-build browser measurements for login, workspace list, document, code editor, and board: transferred JS, chunks, LCP/INP/CLS where applicable, long tasks, React commits, and live drawing responsiveness.
9. Run at least three comparable unprofiled trials; keep all raw runs. Collect CPU profiles separately because profiling affects performance. Alternate baseline/final order where practical to reduce warming and thermal bias.

**Important protocol rule:** Keep the legacy relay test as a separately labeled microbenchmark. Once batching or CRDT changes the protocol, compare equivalent user actions, content size, delivered points, bytes, CPU, and final-state correctness. Fewer network messages is an intended outcome, not lower performance. A faster health endpoint is not proof of faster collaboration.

**Acceptance:** A reproducible preserved checkpoint report exists; invalid/saturated runs are flagged; no claims depend on mock databases, fabricated samples, or incompatible workloads.

**Rollback:** Harness changes do not modify app behavior. Keep older results and methodology versions.

## Milestone M02 Establish tooling and runtime boundaries

**Files:** Root/client/server package scripts and lint configuration; `server/src/app.js`, `server.js`; configuration files; `.env.example`; test helpers; CI workflow skeleton.

**Steps**

1. Add server ESLint, shared formatting defaults, root orchestration scripts, and consistent runtime declarations. Retain package-local lockfiles. Root scripts should delegate with `npm --prefix`, not shell-dependent `cd` chains.
2. Define commands listed in the verification section before documenting them as runnable. Replace the current failing placeholder server `test` script.
3. Implement the environment contract above. Allow local/test boots with Google and Stream disabled.
4. Extract `createApp({ config, logger, services })` without listening or connecting during import. Separate `createHttpServer`/Socket.IO wiring from domain code.
5. Bootstrap in order: parse config, construct logger, connect Mongo, verify required schema/index state, construct services, attach sockets, begin listening. Run migrations explicitly, not implicitly on every startup.
6. Provide `/api/health/live` for process liveness and `/api/health/ready` for required dependency readiness. Keep `/api/health` as a documented readiness alias for the harness until migrated. Avoid a fresh DB query on every liveness call.
7. On SIGTERM/SIGINT: become unready, stop new admissions, notify clients of restart, drain bounded writes, disconnect sockets, close HTTP and Mongo, flush logs, exit. Persistent failures must produce a nonzero exit, not an endless hang.
8. Make failed database startup reject through bootstrap rather than calling `process.exit()` inside a reusable database helper.

**Acceptance:** Importing app/services does not bind ports or connect integrations. Missing config fails clearly without secrets. Mongo outage prevents readiness. Start/stop tests leave no open handles. App boots without Stream/Google credentials when disabled.

## Milestone M03 Standardize API contracts and observability

**Files:** `observability/`, error middleware, async middleware, controllers, validators, client API client and error adapter.

**Steps**

1. Add Pino/Pino HTTP with allowlisted serializers and request IDs generated on the server. Return `X-Request-Id`; correlate domain failures without trusting arbitrary client IDs as log structure.
2. Add bounded request timeouts and route-specific Zod validation for body, path, and query. Construct update objects from parsed allowlisted fields; never pass raw request objects to Mongo.
3. Implement the error envelope and status mapping above. Add 404 handling, `headersSent` handling, and safe malformed JSON handling. Log unexpected errors once at the boundary.
4. Retain existing successful response shapes initially (`{ docs }`, `{ doc }`, etc.) and add metadata deliberately. Normalize errors in the client during the same commit. Do not rewrite every success response purely for style.
5. Replace user/content-bearing console statements. Aggregate socket events, rejected events, rooms, persistence queue size/age, save latency, DB operation duration, cache hits/misses, and event-loop delay.
6. Expose metrics only on a private interface or authenticated operational route. Avoid public user/workspace labels. No paid metrics service is required; structured logs plus protected metrics are sufficient initially.
7. Add HTTP security headers, explicit CORS allowlist, payload limits, and route-specific rate limits. Start with configurable production defaults: login 10 failed attempts per 15 minutes per IP and normalized account key, registration 5/hour/IP, general API 120/minute/user with an appropriate burst. Benchmark profiles use documented separate ceilings and never silently bypass authorization.

**Acceptance:** Redaction tests find no sentinel secrets; errors have request IDs; invalid IDs and malformed JSON cannot become 500s; production responses contain no stack/internal details; repeated socket traffic does not generate one log line per event.

## Milestone M04 Make authentication and authorization consistent

**Files:** `utils/jwt.js`, auth middleware/controllers/routes/services, Passport configuration, role permissions/guard, member/workspace services, all resource controllers and handlers; new `auth/` modules and session model.

### Session behavior

Keep the existing JWT cookie transport but replace the current wholly stateless behavior with a revocable server session identity. This is an intentional correctness tradeoff; remeasure it rather than hiding any extra work.

1. Mint JWTs using the existing maintained JWT library. Claims are `sub` (user ID), `sid` (random session ID), `iat`, `exp`, issuer, and audience. Do not embed workspace selection, role, or mutable profile data as authority.
2. Store a hashed session ID, user ID, expiry, and revocation state in Mongo. Add indexes for lookup, user session revocation, and expiry cleanup. Explicitly compare expiry during verification; Mongo TTL deletion is asynchronous.
3. Verify signature/algorithm/issuer/audience/expiry, then look up active session state through a bounded 10-second cache. Require the stored session user to match `sub`. Misses load only needed session/user-active fields. Do not return stale authorization on database errors. Cache invalidation increments a generation so an older in-flight lookup cannot refill a revoked entry after logout or permission changes.
4. Enforce one Node process in the initial deployment. Logout/account disable revokes the DB record(s), invalidates local cache entries, and disconnects affected sockets. Any future multi-process release must add cross-process invalidation first.
5. Reject inactive users during login and session verification. Recheck long-lived sockets on a bounded interval and at session expiry; a successful handshake must not authorize a socket forever.
6. Use `HttpOnly`, host-only cookies with `Path=/`, `Secure` in production, and `SameSite=Lax` under the same-origin deployment. Cookie max-age, JWT expiry, and database expiry use the same source value. Clear cookies with matching attributes.
7. Implement CSRF protection for cookie-authenticated state changes: require a session-bound signed CSRF token in a header plus an exact Origin check. Obtain the token from an authenticated bootstrap response; do not log it. Validate Origin on login/logout and other pre-auth state-changing routes. Allow GET only for side-effect-free endpoints except the designed OAuth exchange.
8. Validate WebSocket Origin using handshake admission checks. Browser CORS configuration alone is not WebSocket authorization. Bind socket admission to valid session and CSRF proof; define explicit test-client behavior rather than accepting missing Origin indiscriminately in production.
9. Add one-time OAuth state bound to the initiating browser. Use a supported Passport state store or a small tested server-side store with random state, hashed storage, short expiry, atomic consume, and callback validation. `session: false` does not eliminate OAuth CSRF requirements. Enforce trusted provider identity/email-linking rules; never link accounts solely from an unverified email.
10. Keep login failure messages generic and rate-limit failed attempts. Native asynchronous bcrypt is already used; remove `bcryptjs` only after verifying it has no retained consumers. Do not lower password cost to improve throughput.

Initial session duration is eight hours with explicit reauthentication after expiry. A rotating refresh-token system is out of scope. The UI warns when reauthentication is needed and preserves an in-memory draft until the user can export or retry; it does not silently discard edits.

### One permission policy

Create `authorization.service.js` with operations such as `authorizeWorkspace(actor, workspaceId, action)` and `authorizeResource(actor, kind, resourceId, action)`. Return a minimal immutable access context containing resource/workspace identity, membership ID, effective capabilities, and policy version. Controllers and socket handlers use that context; they do not reconstruct role logic.

The default policy resolves current inconsistencies as follows. Document the change and exercise it through a matrix of tests.

| Action | Owner | Admin | Member |
| --- | --- | --- | --- |
| View active workspace/resources | Yes | Yes | Yes |
| Create document, code file, board | Yes | Yes | No by default, matching current role permission constants |
| Edit resource | Yes | Yes | Only current resource creator or explicitly listed collaborator |
| Delete resource | Yes | Yes | Only current resource creator |
| Invite/remove members | Yes | Yes, excluding owner and privileged changes outside policy | No |
| Change roles / delete workspace | Owner only | No | No |
| Change own display preferences | Yes | Yes | Yes |

Membership is required even for a former creator. Resource ownership does not bypass removal from the workspace. Protect the sole owner from removal/demotion. Validate role names before lookup; an unknown role denies access rather than throwing a TypeError. Return `canView`, `canEdit`, `canDelete`, etc. as capabilities for the UI, but always enforce them again on the server.

Use minimal resource metadata for permission checks rather than fetching content and populated collaborator profiles first. Default membership caching is bounded and single-process, with 10-second maximum TTL and immediate invalidation after member/role/resource changes. Authorize mutations through the shared service immediately before execution. After a revocation is committed, invalidate cached access and evict affected room memberships before responding to the administrator. Tests must cover the next event after revocation. Already committed operations are not undone.

Create operations must take explicit workspace identity from validated input/path and authorize it. Do not use `User.currentWorkspace` or a JWT claim to determine where a two-tab user creates data. Current workspace is a navigation preference only.

**Acceptance tests:** Unauthenticated user, inactive user, expired/revoked token, copied old logout cookie, wrong OAuth state, missing/invalid CSRF, outsider resource ID, read-only member, collaborator, owner, admin, removed member with an open socket, wrong-workspace resource, and unknown role. Exercise both HTTP and Socket.IO. Unauthorized events must not broadcast, mutate state, or schedule persistence.

**Rollback:** Auth format changes require invalidating existing cookies and a documented login prompt. Do not fall back to accepting legacy tokens without revocation controls. Keep a stable checkpoint before rollout.

## Milestone M05 Optimize queries and introduce safe migrations

**Files:** Models; workspace/member/docs/codeeditor/whiteboard/filesystem services; list controllers; new migration scripts; integration tests.

### Queries and indexes

1. Inventory actual filters, projections, sort order, and populate calls. Record `explain('executionStats')` on representative seeded data before/after. Use selected fields and `.lean()` for read-only results; retain documents when methods, setters, hooks, or `.save()` are needed. See [Mongoose lean tradeoffs](https://mongoosejs.com/docs/tutorials/lean.html).
2. Keep the useful local membership index. Audit duplicate `{ userId, workspaceId }` pairs, report them, and define a deterministic reconciliation migration before adding a unique constraint. Do not silently choose a higher role while deduplicating.
3. Candidate list index for Docs, CodeEditor, and Whiteboard: `{ workspaceId: 1, isActive: 1, updatedAt: -1, _id: -1 }`. Retain only indexes justified by used queries and explain results; measure write overhead.
4. Candidate filesystem listing index: `{ workspaceId: 1, parentId: 1, isActive: 1, name: 1, _id: 1 }`. Define sibling-name uniqueness deliberately with case behavior and an active-only partial constraint if adopted.
5. Candidate execution-history index: `{ codeEditorId: 1, createdAt: -1, _id: -1 }`. Apply only if execution/history remains supported in that profile.
6. List responses return summaries, not document content, full board elements, or repeated populated objects. Use limit 20 by default and max 100. Cursor pagination follows the actual sort tuple, including `_id` for stable ties. Validate cursor shape, resource scope, and sort mode. Document that updated-at sorting can move items while paging; client deduplicates by ID and refreshes the first page on changes.
7. Remove duplicated permission/user lookups within one request by passing an access context. Do not cache whole mutable documents indiscriminately.
8. Use explicit field updates and validators. Add integer `revision` to mutable metadata and require `{ id, expectedRevision }` compare-and-set updates for rename/title/language/destructive metadata operations. Zero matched rows becomes 409 or authorized not-found after an appropriate recheck. See [Mongoose atomic updates](https://mongoosejs.com/docs/tutorials/findoneandupdate.html).
9. Make CodeEditor/FileSystem creation one transaction: validate parent belongs to workspace, create linked records with valid IDs, and commit together. Rename/move must prevent cycles and cross-workspace parents. Use IDs as identity, not path strings. Define whether path is derived or updated transactionally across descendants; prefer derived paths for display.
10. Keep plain-text content canonical in the eventual collaboration state; filesystem stores references/metadata, not another editable content copy.

### Migration workflow

Create `npm --prefix server run migrate -- --dry-run` and an explicit apply mode. Each migration has an ID, checksum, status record, idempotent behavior, and a targeted rollback or forward-repair procedure. Only one migrator runs at a time. Production `autoIndex` is off once the explicit migration workflow exists; readiness detects incompatible schema versions without creating indexes itself.

Sequence: backup and restore drill; duplicate/data audit; additive fields/indexes; application compatibility release; backfill; enforce constraints; remove obsolete writers. Report counts and errors without content/secrets. An interrupted migration resumes safely. Test with existing records lacking new fields.

**Acceptance:** Summary queries omit large content, pagination is bounded, duplicate membership creation is rejected by the DB, transactions leave no orphaned file/editor pair, cross-workspace moves fail, and explain evidence supports index choices. Record query reduction and storage/write costs rather than promising an arbitrary percentage.

## Milestone M06 Own connections and define the realtime protocol

**Files:** `client/src/hooks/useSocket.js`, all its consumers, new `realtime/SocketProvider.jsx` and resource hooks; server socket configuration, handlers, schemas, room registry.

### Browser connection lifecycle

1. Mount `SocketProvider` once under authenticated app providers. Connect only after server auth bootstrap succeeds; key lifetime to stable user/session identity, not the entire mutable user object.
2. `useSocket()` becomes a read-only context hook. Child components cannot construct, close, or globally clear the shared connection.
3. Resource hooks attach named listeners and remove exactly those listeners on cleanup. Never use `socket.off(event)` without the owned handler, because it can remove another feature's subscription.
4. Track desired subscriptions by resource key with reference counts. Two components using one resource join once; the last release leaves. A tab can join a workspace plus document/code/board rooms simultaneously.
5. Reconnect with bounded backoff and jitter. Reauthenticate, reauthorize rooms, resynchronize authoritative state, then enable writes. Do not assume restored transport implies current permissions.
6. On logout, disconnect, cancel queries, destroy editor documents, remove resource subscriptions, and clear account-specific caches/preferences. New login cannot see the previous user's cached data.
7. Retain polling fallback initially. Measure WebSocket-only as a separate deployment option after proxy/network compatibility tests; do not remove fallback as an unmeasured optimization.

### Event contract

Create one event catalog and schema set. Proposed canonical events:

| Event | Direction | Behavior |
| --- | --- | --- |
| `resource:join` / `resource:leave` | Client to server | Validated resource kind/ID; explicit acknowledgement |
| `resource:joined` | Server to client | Resource identity, protocol version, capabilities, state synchronization metadata |
| `presence:update` | Client to server | Throttled, volatile; position/selection only |
| `presence:changed` | Server to room | Resource identity and authenticated display identity |
| `collab:sync` | Both | Yjs state-vector/diff exchange for doc/code text |
| `collab:update` | Both | Bounded binary update; application acceptance acknowledgement |
| `resource:flush` | Client to server | Request durability through the caller's last accepted sequence |
| `resource:saved` | Server to room | Server instance epoch, persisted sequence/revision, timestamp |
| `board:preview` | Client to room through server | Batched transient points; replaceable preview |
| `board:mutate` | Client to server | Versioned durable element create/update/delete/clear operation |
| `resource:changed` | Server to room | Committed metadata/list change; invalidate targeted query keys |
| `access:revoked` | Server to client | Stop writes, leave room, show access loss |

Every envelope carries protocol version, resource kind/ID, and an operation ID where retryable. Server derives user identity; clients cannot choose `userId`, role, collaborator color authority, or destination room strings. Rooms are built from validated resource identity in one helper.

Acknowledgement shape:

```js
// Accepted in memory; this does not mean saved to MongoDB.
{ ok: true, operationId, serverEpoch, acceptedSequence }
// Rejected without broadcast or mutation.
{ ok: false, error: { code: 'FORBIDDEN', message: 'Editing access changed.' } }
```

Each handler follows: validate size/schema -> verify live session -> authorize resource/action -> check joined room -> apply limits -> execute domain action -> acknowledge -> publish appropriate event. Validate any legacy event using the same pipeline during transition. Legacy alias handlers must call the shared server handler; emitting an event to the client does not invoke a server listener.

### Limits, presence, and delivery

- Initial configurable per-socket budgets: presence 20/sec with burst 40; text updates 30/sec with burst 60; board previews 30/sec with burst 60; durable board operations 10/sec with burst 20. Also cap aggregate bytes/sec and per-user connection count so opening tabs cannot multiply limits without bound.
- Initial join limit: 20 joins/minute/socket and 10 subscribed resources/tab. Set a distinct benchmark profile when measuring large scenarios; report effective limits.
- Derive presence counts from room registry keyed by user and sockets. One user with two tabs appears as one collaborator with two connections; disconnecting one tab must not remove the remaining user's presence.
- Cleanup timers, room references, and presence on leave, disconnect, permission change, workspace deletion, and shutdown. Clean idle rooms can be evicted; dirty rooms follow persistence policy.
- Use volatile delivery only for reconstructible cursor/preview data. Text updates and committed board changes require retry/resync, not blind volatile delivery.
- Bound queues. Do not allow Socket.IO's disconnected buffer to grow with typing indefinitely: the editor retains its current local state and synchronizes a bounded state diff when authorized again.
- Socket.IO guarantees ordering but defaults to at-most-once arrival; reconnection alone does not replay all missed server changes. Implement synchronization explicitly. See [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/).

**Acceptance:** Multiple tool panels use one connection per tab; React StrictMode leaves one live connection after cleanup; duplicate listeners do not accumulate; outsider and read-only events are rejected; resource switches do not cross-update UI; reconnect performs state/permission resync; revoked users cannot continue editing; presence remains correct with two tabs and network interruption.

## Milestone M07 Implement convergent text editing and durable saves

**Files:** Document/code models and services; `DocumentEditor.jsx`, `CodeEditor.jsx`; new collaboration registry, transport adapter, persistence coordinator, and editor bindings.

### Why this milestone is separate

Debouncing whole-document replacements reduces writes but does not solve simultaneous edits. Implement convergence using Yjs shared text and an established CodeMirror binding rather than inventing text-merge algorithms. Keep titles, language, membership, and metadata outside the user-editable CRDT and update them with authorized versioned HTTP commands. Yjs shared types provide the collaborative data model; persistence and authorization remain application responsibilities. See [Yjs shared types](https://docs.yjs.dev/getting-started/working-with-shared-types).

### Model and migration

1. Add `collaborationVersion`, `collaborationState` (binary), `contentRevision`, and persisted timestamps to document/code records. Use separate `revision` for metadata so title changes do not conflict with unrelated text flushes.
2. Define exactly one `Y.Text` named `content`. Bind it to the editor. Store canonical binary state and derived plain-text content in the same atomic document write. Derived content remains useful for export/search; it is never an independent writer.
3. Migrate one resource atomically from existing text. Use a conditional update on missing collaborationVersion; if another initializer wins, discard the losing candidate and load the winner. Never initialize the same plaintext independently on each client because merging independently generated initial CRDT states can duplicate content.
4. Stop legacy REST content replacements for migrated records. Return a clear protocol-required error rather than silently converting full text into another edit stream. Existing read/export endpoints can use the derived projection.
5. Preserve a backup and plain-text export before migration. Disabling collaboration after migration must use a read-only compatibility mode or explicit conversion; do not run old content writers against CRDT state.

### Server room ownership

Create a single-flight loader keyed by resource kind/ID so concurrent joins share one load and one Y.Doc. Each room owns authorized subscribers, canonical Y.Doc, dirty generation, monotonically increasing accepted sequence, last persisted sequence, database content revision, debounce/max-wait timers, pending flush promise, and memory accounting.

Implement the Socket.IO adapter around the official Yjs sync/state-vector helpers appropriate to the locked Yjs release. Do not invent another binary format for CRDT updates. Use the [Yjs CodeMirror binding](https://github.com/yjs/y-codemirror.next) for editor transactions/cursors and inspect [the official protocol package](https://github.com/yjs/y-protocols) for compatible sync/awareness APIs; package names and major versions must be checked together before installation. The adapter owns join/auth, binary transport, reconnect, acceptance acknowledgements, and durability notifications. Awareness is ephemeral and must not be written to Mongo; bind permitted awareness identities to authenticated connections so a client cannot impersonate another collaborator.

Process mutations through a per-room serialization queue. Validate the binary envelope, encoded size, allowed shared structure, decoded text size, and resulting state budget. Use disposable candidate state to verify an untrusted update before adopting it; reject invalid state without corrupting the live room. Measure this validation cost. If CPU/memory caps are exceeded, reject/backpressure rather than silently bypassing validation. A library that merges updates does not make arbitrary updates safe.

Initial limits: 1 MiB plain text per resource, 64 KiB per normal update, 4 MiB persisted collaboration state, and a measured process-wide active-room memory budget. These are demo limits, not assertions about Yjs maximum capacity. Implement bounded chunked initial/diff synchronization when state exceeds a single-frame limit; validate chunk count, total size, transfer timeout, and digest before applying. Never base64 large state into ordinary JSON events when binary frames are supported.

### Persistence algorithm

1. On an authorized accepted text update, apply it, increment accepted sequence/generation, publish the update, and send an **accepted** acknowledgement. Schedule a trailing flush after 1500 ms and a maximum wait of 5000 ms from the first dirty update.
2. Only one Mongo write may be in flight per room. A flush captures binary state, derived text, captured generation/sequence, and expected contentRevision before awaiting the DB.
3. Perform a conditional atomic update matching resource ID, active state, collaborationVersion, and expected contentRevision. Set both projections, increment contentRevision, and set server save timestamp. A single-node replica set is not high availability; require journaling and acknowledged writes, and document that distinction.
4. On success, advance persisted sequence only to the captured sequence. If edits arrived during the write, the room remains dirty and another flush is scheduled. Never clear a new dirty generation because an older request completed.
5. Emit `resource:saved` with `serverEpoch`, persisted sequence, content revision, and timestamp only after DB success. The epoch is a random process-start identifier so sequence values cannot be confused across restarts.
6. On a compare-and-set conflict, stop normal writes, load current state, reconcile through the documented Yjs merge path, and retry with bounded attempts. A deleted resource or revoked user must not be resurrected. In a declared single-writer deployment, repeated conflicts indicate an invariant violation and require investigation.
7. On DB failure, retain bounded dirty state, show retrying status, and back off with jitter (1/2/4/8 seconds, cap 15). After the configured failure/age limit, stop accepting additional mutations and keep the current draft available for export. Never evict dirty state merely to admit another room.
8. Manual Save requests a flush through the caller's acknowledged sequence and resolves only when that sequence is persisted. If a flush is in progress that excludes newer edits, await the subsequent flush.
9. Leaving a room and graceful shutdown request a flush, but browser unload and SIGKILL are not reliable save mechanisms. Last completed save is the crash recovery boundary. Unsaved memory-only changes may be lost on process crash; the UI must distinguish this from Saved.
10. Restart loads the persisted state and starts a new epoch. Still-open clients perform state-vector synchronization and resubmit permitted local differences. Refreshing/closing before persistence may lose pending local work; do not advertise offline durability unless implemented separately.

### Client editor and save state

Create CodeMirror editor instances once per resource. Bind changes through the supported Yjs binding, track local transaction origins, preserve IME composition and selection, and destroy editor/Y.Doc/listeners/timers on release. Remote transactions must not emit another local update. Use Yjs-relative positions for collaborative text cursors rather than estimated pixel positions from line and column.

Save state machine:

```text
loading -> synced
local edit -> dirty -> syncing -> saving -> saved
network loss -> reconnecting -> resync -> saving -> saved
write failure -> retrying -> save failed
permission loss -> read only
session expiry -> sign in required
```

The labels map to actual acknowledgements. `synced` means peers/server memory accepted changes; `saved` means Mongo committed the relevant local changes and no newer local edits are pending. A late response for a previous resource cannot change the current resource's state. Show the last persisted timestamp, a retry action, and a plain-text export action on persistent failure. Do not show a toast on every automatic save.

During disconnected editing, cap retained local state, show Unsaved offline changes, and require fresh permission checks before uploading. On access loss, preserve a local export option for the user's unsaved work without continuing server reads/writes. Do not introduce automatic sensitive-document localStorage persistence. Any IndexedDB offline mode is a later explicit feature with account isolation and logout cleanup.

**Required tests:** Two/three clients typing at the same insertion point, concurrent delete/insert, undo affecting only local intended edits, Unicode/emoji/IME, duplicate updates, out-of-order updates, late join, server restart, disconnected local edits, permission revoke, stale manual save, edits arriving during a flush, Mongo outage, retry exhaustion, schema migration race, and a legacy client attempting a content overwrite. Compare final text/state convergence, not just event counts.

**Acceptance:** Clients converge without silently overwriting each other; Saved is only shown after persistence; one room owns one schedule; no writes happen for unchanged state; flushes are bounded and sequential; existing text migrates exactly once; a new viewer after restart sees the last durable version.

## Milestone M08 Optimize the canvas and board persistence

**Files:** `EnhancedDrawingCanvas.jsx`, `WhiteboardCanvas.jsx`, `WhiteboardMain.jsx`, whiteboard store/services/handlers/model; shared board validation and tests.

1. Trace which canvas implementation is active. Consolidate genuinely duplicate rendering logic only after feature parity is listed. Keep pen, shape, selection, pan/zoom, undo/redo, and export behaviors that currently work.
2. Store pointer samples and transient drawing state in refs/editor-owned objects. Render with requestAnimationFrame. React owns controls and coarse state, not every pointer move.
3. Use Pointer Events and pointer capture. Translate screen coordinates to board coordinates consistently with zoom, pan, device-pixel ratio, resizing, and scroll. Handle pointer cancellation and pen/touch input.
4. Preview locally immediately. Batch remote preview points every 33 ms or 64 points, whichever comes first. Include `strokeId`, ordered sequence, resource ID, and bounded point arrays. Use a maximum preview payload of 16 KiB. Do not send one full board per movement.
5. Cursor/pointer previews are volatile and expire. The final committed stroke includes all required geometry or bounded chunks, so a lost preview never produces a permanently broken drawing. Avoid both preview and final geometry rendering the same stroke twice.
6. Persist semantic operations with stable IDs: create element, update element fields, delete element, clear board. `board:mutate` carries operationId, board epoch, elementId, and expected elementRevision. Server authorizes and validates supported element types/finite coordinates/colors/size bounds.
7. Use element revisions for concurrent edits to one shape. Creates use unique element IDs and reject conflicting reuse. Different-element edits can proceed independently. Deletes retain bounded revision/tombstone information so stale updates cannot recreate deleted elements. Clear increments a board epoch; old-epoch operations fail and trigger resync.
8. Persist board state, element revision/tombstone metadata, and deduplication metadata together through the same single-room flush coordinator. Maintain a bounded recent-operation acknowledgement cache. After cache expiry, enforce idempotency through unique element IDs and revisions; a stale retry must return conflict/resync, not apply twice. Clear/delete operations must be idempotent at their epoch/revision.
9. When text/board edits share the flush coordinator, share scheduling and durability primitives only. Keep board mutation validation separate from Yjs text logic.
10. Start with documented limits: 5000 elements, 10000 points per stroke, 4 MiB encoded board snapshot, and bounded active-room bytes. Split long strokes deliberately. Reject or guide users at limits before Mongo's document limit is approached.
11. Undo/redo emits compensating operations for the current user's operations; it must not replace the entire board and erase another user's work. A conflicting undo explains that the element changed instead of silently overwriting it.
12. Only introduce spatial indexing, layered canvases, cached paths, or worker-based geometry if profiles show these are needed. OffscreenCanvas support must be checked before making it a requirement.

**Acceptance:** Remote previews stay responsive under the target workload; final geometry is correct when preview packets are dropped; concurrent independent strokes persist; slow clients do not grow unbounded buffers; revoked users cannot draw; reconnect loads the board and revisions correctly; coordinate tests cover zoom/DPR; exported output matches the visible durable board.

## Milestone M09 Consolidate frontend state and navigation

**Files:** `App.jsx`, `main.jsx`, `pages/Dashboard.jsx`, `hooks/useAuth.js`, `hooks/useWorkspace.js`, `utils/api.js`, service modules, stores, new app providers/routes/query keys.

### Ownership model

| State | Owner | Persistence |
| --- | --- | --- |
| Authenticated identity/capabilities | Auth bootstrap backed by server | Session cookie; no localStorage authority |
| Workspace/resource lists and metadata | TanStack Query | Memory; refetch/invalidate explicitly |
| Active workspace/resource | URL | Browser navigation/history |
| Live text and undo | Editor plus Yjs document | Server persistence described in M07 |
| Live board model/operations | Board controller | Server persistence described in M08 |
| Sidebar/theme/editor panel preferences | Small Zustand slices | Account-safe local preferences |
| Dialog state and unsent forms | Local React state | Memory |
| Presence and connection state | Realtime provider/resource hook | Ephemeral |

1. Bootstrap auth once at app startup through the existing current-user endpoint, normalized as `/api/auth/me` if needed. Loading, unauthenticated, authenticated, and unavailable are distinct states. A network outage is not proof that the user logged out.
2. Remove persisted `isAuthenticated` and stale role flags. Invalidate old `auth-storage` safely. Hydrated preferences must not start requests before auth is known.
3. Keep a single API client with relative base path, credentials, CSRF header, timeout, cancellation, and normalized errors. Remove redundant credential interceptors. Handle a 401 through auth state once, then disconnect sockets and cancel protected queries; avoid redirect loops and parallel logout storms.
4. Define query key factories including user scope where needed, workspace ID, resource kind, filters, sort, and page cursor. A workspace A request finishing after navigation to B must only update A's cache.
5. Configure metadata list `staleTime` initially at 30 seconds, inactive cache retention at 5 minutes, and bounded retries for transient reads only. Do not retry 400/401/403/404. Mutations do not retry by default; only explicitly idempotent commands may retry. Document defaults instead of relying on unexpected background refetches. See [TanStack Query defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).
6. Use targeted query invalidation after resource creation, rename, deletion, membership change, and committed socket metadata events. Coalesce bursts; do not refetch all workspaces on every keystroke or cursor update.
7. Migrate one feature's server data out of Zustand at a time and delete its obsolete fetch/storage actions. No intermediate release may have two authoritative writable copies of a resource list.
8. Use selectors for UI store subscriptions. Memoize only where React profiling shows avoidable work or a stable callback is needed for lifecycle correctness.
9. Add route and editor error boundaries. Preserve navigation and draft/export access when one editor fails. A failed lazy chunk shows Reload view with a clear explanation.

### Route map

```text
/login
/register
/google/callback
/workspaces
/w/:workspaceId/overview
/w/:workspaceId/documents
/w/:workspaceId/documents/:documentId
/w/:workspaceId/code
/w/:workspaceId/code/:editorId
/w/:workspaceId/boards
/w/:workspaceId/boards/:boardId
/w/:workspaceId/members
/w/:workspaceId/settings
```

Redirect legacy `/dashboard` to the last accessible workspace or `/workspaces`. Validate a stored last-workspace preference against current membership. Keep filter/search/sort state in query parameters when it should survive refresh/back navigation. Use relative safe return URLs after login; reject external/open redirects.

Deep-linked resource routes load required identity/metadata once, validate workspace/resource relationship, and show distinct loading, forbidden, missing, and retryable error states. Direct URLs and browser Back must work with production SPA fallback without capturing `/api` or `/socket.io` errors.

**Acceptance:** Refresh preserves the intended resource; two tabs can use different workspaces correctly; auth is checked once; old account data is cleared; workspace changes do not display stale responses; live edits are not overwritten by background metadata refetches; errors preserve useful navigation.

## Milestone M10 Build the UI system and redesign the user journeys

**Files:** Shared tokens/global styles; new UI and layout components; auth pages/forms; workspace/list/member/settings components; editor/board shells; audio entry points.

### Visual references and interpretation

- Use [Linear's interface redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) for clear hierarchy, aligned navigation, and restrained application chrome. Apply those principles to DevSync's actual workflows; do not copy branding or decorative screenshots.
- Use [Carbon loading patterns](https://www.carbondesignsystem.com/building-blocks/core/patterns/loading) for predictable skeletons and progressive content, and its [empty-state guidance](https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states) for useful next actions.
- Use [Radix accessibility behavior](https://www.radix-ui.com/primitives/docs/overview/accessibility) for keyboard interaction and focus management. Library primitives still require correct labels and application-level testing.

Design direction: a calm developer workspace with a neutral shell, indigo primary actions, clear content hierarchy, compact controls, and generous working space. Editors and boards receive most of the viewport. Every visual state must communicate a real product state.

### Design tokens

Create `styles/tokens.css` and Tailwind-compatible semantic tokens. Do not scatter raw color values through feature components. Initial values are candidates that must pass the contrast checks below.

| Token group | Light theme | Dark theme |
| --- | --- | --- |
| App background | `#F8FAFC` | `#0F172A` |
| Surface | `#FFFFFF` | `#111827` |
| Subtle surface | `#F1F5F9` | `#1E293B` |
| Primary text | `#0F172A` | `#F8FAFC` |
| Muted text | `#475569` | `#CBD5E1` |
| Decorative border | `#E2E8F0` | `#334155` |
| Interactive border | `#64748B` | `#94A3B8` |
| Primary action | `#4F46E5`, white label | `#4F46E5`, white label |
| Focus ring | `#4F46E5` with contrasting offset | `#A5B4FC` with contrasting offset |

Define success/warning/error foreground, background, and border tokens as tested combinations. Do not convey state through color alone. Destructive actions use explicit wording and confirmation where data removal is consequential.

Use a system sans-serif stack initially and a monospace stack for code. Avoid adding a remote font dependency to make the page look polished. Typography scale: 12 px metadata, 14 px controls, 16 px body, 20 px section titles, 24–28 px page titles; document reading size 16–18 px with 1.6 line height. Spacing scale: 4, 8, 12, 16, 24, 32, 48 px. Radii: 6 px controls, 10 px cards/panels, 14 px dialogs. Shadows are limited to overlays and genuinely elevated surfaces.

Respect system theme on first visit; persist an explicit user choice. Apply the theme before rendering to avoid flashes. Support reduced motion. Use short 120–180 ms transitions for feedback and disable unnecessary animation while editing/drawing.

### Shared component contract

Implement only primitives used by actual screens: Button, IconButton, TextField, Textarea, Select, Dialog, AlertDialog, DropdownMenu, Tabs, Tooltip, Badge, AvatarGroup, Skeleton, EmptyState, ErrorState, Toast, and StatusIndicator.

Each control must support keyboard focus, accessible name, loading/disabled/error states where applicable, predictable sizing, and both themes. A loading button preserves width and prevents duplicate submission. A disabled action with an important reason must have nearby explanatory text rather than an inaccessible tooltip alone. Toasts are for transient operation feedback; field errors stay next to fields. Use one toast host and one modal stacking strategy.

### Screen specifications

| Screen | Layout and interactions | Required states and checks |
| --- | --- | --- |
| Login/Register | Focused form, clear labels, password visibility, submit state, optional Google button from capabilities, small product introduction | Field errors, generic credential failure, unavailable server, keyboard submit, paste/password-manager support, safe return URL |
| Workspace picker | Page title, Create primary action, Join secondary action, searchable accessible cards/list with member/resource metadata only if real | First-use onboarding, empty search, loading skeleton, retry, no forced selection of an inaccessible previous workspace |
| Workspace overview | Recent accessible documents/boards/code files and clear actions; compact workspace description/member summary | Useful empty state; no invented activity graph/counts; Recent data derived from actual accessible records |
| Documents/Boards list | Header, Create action, search, sort, list/grid toggle if both useful, metadata rows/cards, overflow actions | Pagination, empty workspace vs no matches, per-row mutation state, deletion confirmation, read-only capability state |
| Document editor | Breadcrumb/title at top, collaborator avatars, saving/connectivity status, minimal toolbar, readable centered content with max width about 800 px | Loading, readonly, reconnecting, saving, failure/export, permission loss, long text, IME, selection preserved on remote changes |
| Code editor | Resizable file explorer, tabs for explicitly opened files, CodeMirror content, optional output panel, language and cursor status | Active file URL, dirty markers, keyboard tab navigation, execution-disabled explanation, resize persistence, no duplicate content state |
| Whiteboard | Full remaining viewport, floating or docked tool strip, zoom/pan controls, collaboration/save status, export action | Pointer/touch, zoom/DPR correctness, readonly, reconnect, selection visibility, keyboard actions and accessible selected-element properties |
| Members | Searchable member list, role labels, owner distinction, permitted role/remove actions, invite entry | Cannot remove sole owner; changing role updates capabilities; permission failure is explained without stale success |
| Settings | Group general, appearance, and membership-related settings; danger area separate | Dirty-form warning, save/cancel, backend validation, only supported settings shown |
| Audio | Compact optional entry and persistent call controls only when enabled | Permission denial, connecting, muted, disconnected, leave; no debug overlay or automatic microphone access |

### App shell and responsive behavior

1. Desktop at 1024 px and above: approximately 240 px sidebar, 56 px content header, content region using `minmax(0, 1fr)` and `min-height: 0` to prevent editor overflow. Sidebar contains workspace switcher, tool navigation, members/settings, account menu.
2. Tablet 768–1023 px: collapsible sidebar/drawer; editor toolbars wrap or use an overflow menu; keep the primary action visible.
3. Mobile below 768 px: accessible navigation drawer, stacked forms/lists, editor toolbar overflow, sheet-style secondary panels. Code/board canvases may scroll/pan internally; the entire page must not overflow horizontally.
4. Use `100dvh` appropriately with a fallback and safe-area padding. Remove fixed 600 px editor heights. On-screen keyboards must not hide critical save/error controls.
5. A command palette may be added for existing navigation/actions after the basic routes work. Search/action results must be real and permission-aware. Do not add a palette as a substitute for discoverable navigation.
6. Include breadcrumbs, clear selected navigation, meaningful page titles, and a consistent Create/Invite placement. Shortcuts should be visible in menus and avoid intercepting typing/composition or browser-reserved keys.

### Accessibility and UX acceptance

- Test 360, 768, 1024, and 1440 px widths, both themes, 200% zoom, reduced motion, and keyboard-only use.
- Normal text contrast at least 4.5:1; large text and essential control/focus boundaries at least 3:1. Decorative borders need not be the only means of identifying controls.
- Aim for 44 by 44 CSS px primary touch targets; compact desktop controls must still be operable and sufficiently separated.
- Provide a skip link, landmarks, heading hierarchy, visible focus, associated field descriptions/errors, and accessible names for icon buttons.
- Dialogs manage focus and restore it to the trigger; Escape behavior is consistent; destructive confirmations identify the actual resource.
- Announce connection/save failures politely, not every keystroke or cursor movement. Do not repeatedly announce autosave success.
- Whiteboard keyboard support includes tool selection, selected-element move/delete, zoom, and an accessible properties/list view. Do not claim that a purely visual canvas becomes fully accessible merely by adding an aria-label.
- No `alert()`/`confirm()` in application workflows, debug overlays, dead links, unreadable truncation without access to full names, or buttons that only log to console.
- Capture before/after screenshots with seeded nonprivate data. Verify all visible controls through a real journey, not only static appearance.

**Acceptance journeys:** Register/login -> create workspace -> invite/join with a second account -> open document -> concurrent edits and save -> open board -> draw together -> open code file -> reconnect -> change member permission -> verify read-only behavior -> sign out. Also run first-use, empty search, unavailable network, and forbidden direct-link journeys.

## Milestone M11 Reduce frontend cost and verify performance

**Files:** Route imports, feature entry points, Stream imports/CSS, Vite configuration, query configuration, editor/canvas rendering, benchmark/report scripts.

1. Lazy-load route-level document, board, code, and audio features with meaningful skeleton fallbacks. Load Stream SDK/CSS only when audio is enabled and requested. Ensure disabled integrations do not remain in initial chunks through indirect imports.
2. Keep core shell/auth styles small. Import individual icons and used primitives. Check bundler output for duplicate dependencies and accidental whole-library imports. Add manual chunks only when bundle evidence shows a benefit.
3. CodeMirror language packages load on demand. Reuse an editor instance across ordinary state updates; do not destroy/recreate it when collaborator presence changes.
4. Defer nonessential overview data until the main navigation is usable. Avoid serial requests when independent metadata can be fetched together.
5. Profile React commits while typing/drawing and fix the responsible subscriptions/props. Do not blanket-wrap every component in `memo` or every callback in `useCallback`.
6. Virtualize long lists only when representative data causes expensive rendering; pagination remains the default for server lists. Render only expanded filesystem branches.
7. Serve production static assets with content-hash caching and appropriate compression at the reverse proxy. HTML and deployment metadata must revalidate so old app shells do not reference removed chunks. Avoid enabling costly WebSocket compression without measuring CPU/memory effects.
8. Run final benchmarks using M01 methodology. Rerun when a substantive fix changes the measured path; do not keep testing unrelated suites after checks pass without a new concern.

### Performance objectives and release gates

Targets below are engineering objectives to validate, not already achieved claims. Freeze workload/hardware definitions before optimizing against them.

| Area | Objective or hard gate |
| --- | --- |
| Correctness | Zero unauthorized mutations; zero false Saved states; deterministic final-state convergence in required tests |
| Connections | One active shared socket per authenticated tab, excluding unrelated provider-managed media transports |
| Database writes | Zero writes for idle/unchanged rooms; bounded room-level flush frequency instead of per-client/per-keystroke writes; count changes under the same editing workload |
| Text wire volume | Updates proportional to edits rather than repeatedly sending the full file; measure bytes/action at 10 KiB, 100 KiB, and configured maximum file size |
| Board traffic | At most configured preview send cadence and bounded batches; final geometry identical despite dropped previews |
| Memory | Room/listener/timer counts return to baseline after churn; RSS stays within the documented process budget during a 30-minute soak |
| Initial JavaScript | Provisional target at most 250 KiB gzip for the unauthenticated entry and core shell; editor/media code excluded from initial load |
| Browser experience | Provisional LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 under a documented test profile; distinguish lab measurements from field percentiles |
| Drawing | Target local frame work below 16.7 ms at 60 Hz for the representative board, with remote latency tracked separately |
| API regression | Investigate repeatable >10% regression in p95 latency or throughput against the preserved checkpoint; accept only with documented correctness/security tradeoff |
| Collaboration | Report p95/p99 end-to-end update and durable-save latency at 5/10/20/40 clients, with error/loss/backlog and generator saturation |

Avoid claiming server capacity from a colocated saturated generator. Multi-host latency needs a sound measurement method: synchronized clocks with documented error or round-trip latency, not subtraction of unrelated monotonic clocks. Report outbound fan-out separately from inbound client actions.

**Acceptance:** Reproducible before/after report, bundle analysis, browser screenshots/traces, meaningful resource-use measurements, and an honest summary of wins/tradeoffs. No résumé percentage appears without raw comparable runs.

## Milestone M12 Package and verify the deployment

**Files:** Node/client Dockerfiles, `.dockerignore`, production/development Compose, proxy configuration, `.github/workflows/ci.yml`, deployment/backup scripts, operations documentation.

### Runtime topology

```text
Browser over HTTPS
    -> reverse proxy
        -> built React static files
        -> /api to the Node application
        -> /socket.io to the same Node application
Node application
    -> private MongoDB single-node replica set on a persistent volume
```

1. Build frontend and application artifacts in CI or on a development machine, not on a memory-constrained VM. Use multi-stage images, reproducible dependency installation, and non-root runtime users.
2. Serve Vite build output, not the Vite development server. Configure deep-link fallback only for frontend paths. Forward WebSocket upgrade headers and set proxy timeouts consistently with heartbeat settings.
3. Keep Mongo private with authentication, replica-set keyfile handling, persistent storage, and proper initialization. Do not reuse benchmark Compose as production configuration. Bind development/test Mongo ports to loopback.
4. The application runs as one process and one replica. No PM2 cluster/Node cluster/autoscaling until room ownership, cache invalidation, and persistence coordination have a multi-process design.
5. Expose only HTTPS/HTTP redirect publicly and tightly restrict administrative access. Keep app/Mongo/metrics ports private. Store production secrets outside the repository with restricted permissions; inject at runtime. Do not bake `.env` into an image or frontend bundle.
6. Configure HTTPS with a user-owned hostname and certificate automation where available. DNS/domain acquisition can cost money; do not assume a free custom domain. If using a free hostname, document that external dependency and OAuth/provider compatibility before selecting it. OAuth and secure cookies are release-blocking checks.
7. Add bounded Docker/application logs, health checks, restart policy, disk monitoring, and explicit resource limits. Measure total Node/Mongo/proxy memory before choosing an EC2 size. A tiny free eligible instance may be insufficient for the full workload.
8. Add encrypted backup/export and a restore script. Select storage/retention only after verifying its cost and capacity. Restore into an isolated database and verify representative records, permissions, and collaboration state.
9. Deployment sequence: build immutable release -> backup if schema changes -> run reviewed migrations -> stop/drain old process -> start new process -> readiness check -> smoke journeys -> rollback or complete. Accept a short documented reconnect period rather than running two unsynchronized writers for cosmetic zero downtime.
10. Keep the previous compatible application image and versioned static assets for rollback. Schema-changing releases need an explicit compatible rollback or forward-repair plan; reverting the container alone may be unsafe.

### CI requirements

On pull requests run deterministic lint/format checks, backend tests, real Mongo integration tests, client component tests, production build, and key browser journeys. Start a Mongo replica set in CI when transactions are tested. Isolate test data by run and ensure cleanup cannot target a non-test database.

Use least-privilege workflow permissions, pinned action revisions, and lockfile-based dependency caching. Do not expose deployment secrets to untrusted pull requests. A future AWS deployment workflow should use GitHub OIDC and a narrowly scoped AWS role rather than long-lived cloud keys.

Run full load benchmarks manually or on a controlled runner, not as noisy timing assertions on shared PR runners. CI can run bounded protocol/benchmark smoke tests and structural payload checks.

### Free demo constraints

For a new eligible AWS account, the Free plan currently lasts up to six months or until credits are exhausted. The plan closes unless upgraded; verify current terms and account-specific eligibility immediately before provisioning. See [AWS Free Tier](https://aws.amazon.com/free/) and [account plan documentation](https://docs.aws.amazon.com/us_en/awsaccountbilling/latest/aboutv2/free-tier-plans.html).

The deployment must inventory compute, disk, public IPv4, outbound transfer, image storage, logs, backups, DNS/domain, and optional integrations. Estimated cost is not a guarantee. Budget alerts are notifications, not hard caps. Keep the account on the eligible Free plan for its stated no-charge protection and export data before expiry. Do not upgrade automatically to a paid plan.

Strict AWS-only demo profile: Stream off, public execution off, no Atlas/Render/Vercel/Netlify/Cloudflare hosting dependencies. Google OAuth may remain an explicitly disclosed identity integration if desired; disable it if the requirement excludes any non-AWS external service. GitHub remains the source/CI service, not the deployed application runtime. Do not claim the entire product is AWS-only while undisclosed runtime services are required.

Code execution can remain available only in an explicitly trusted local development profile. A public runner is a separate design: isolated unprivileged workers, no app secrets/host filesystem/socket access, network denied by default, strict CPU/memory/process/output/time limits, concurrency quota, and a reviewed isolation boundary. Merely wrapping the current child process in the application container is insufficient.

**Acceptance:** Production-style local Compose passes auth/deep-link/reconnect/persistence smoke tests; restart preserves Saved work; backup restoration works; optional integrations can be absent; no secret appears in build output; cloud cost/eligibility checklist is concrete. Provisioning itself occurs only when requested; this milestone prepares the deployable artifacts and instructions.

## Milestone M13 Add Redis or multiple instances only when justified

This milestone is conditional and not required for the single-instance release.

**Entry condition:** A controlled benchmark identifies a specific shared-state/cache bottleneck or a real requirement to run multiple instances. Record the hypothesis, expected benefit, resource cost, and experiment before adding Redis.

1. If caching is justified, implement an explicit cache interface with bounded local and Redis implementations. Cache permission/session metadata only with revocation invalidation, TTL, stampede control, and measured hit/miss behavior. Redis is not the sole durable content store.
2. If multiple instances are required, add cross-process auth/access invalidation, presence aggregation, and an appropriate Socket.IO adapter. The adapter forwards broadcasts; it does not make room Y.Docs or Mongo flush ownership distributed.
3. Define one authoritative persistence owner per resource or adopt a proven distributed collaboration service design with leases/fencing. Do not allow two processes to overwrite full snapshots independently.
4. Verify current adapter support for connection-state recovery, transport affinity, and reconnect synchronization. Polling may require sticky routing. Test the chosen adapter/version rather than assuming all Redis adapters behave identically.
5. Test Redis outage, owner crash, lease handoff, duplicated events, stale permissions, split processing, and reconnection to another instance. Fail closed for authorization uncertainty; recover content from durable state.
6. Compare total resource cost and before/after behavior. Keep Redis disabled if the experiment does not justify the added operations and memory.

**Acceptance:** The specific measured problem improves without new data-loss or permission failures, and the documented deployment profile/cost changes reflect the added services.

## Verification commands and test ownership

The commands below are the required interface to implement in M02 and subsequent milestones. They are not all available in the current repository. Use `npm.cmd` on Windows if PowerShell execution policy blocks `npm.ps1`. Run from the repository root except where a working directory is shown explicitly.

| Command | Owner and purpose |
| --- | --- |
| `npm ci` | Install retained root tooling after root package cleanup |
| `npm --prefix server ci` | Reproducible backend dependencies |
| `npm --prefix client ci` | Reproducible frontend dependencies |
| `npm run lint` | Root wrapper for server/client lint and browser/server boundary checks |
| `npm run format:check` | Formatting validation without rewriting files |
| `npm --prefix server test` | Node test runner for focused unit/contract tests |
| `npm --prefix server run test:integration` | Real Mongo replica-set integration tests |
| `npm --prefix client run test:run` | Vitest/Testing Library behavior tests |
| `npm --prefix client run build` | Production Vite build |
| `npm --prefix client run test:e2e` | Playwright multi-user and navigation journeys |
| `npm --prefix client run test:a11y` | Automated axe checks plus documented manual keyboard checks |
| `npm --prefix server run migrate -- --dry-run` | Migration discovery, data audit, proposed changes |
| `npm --prefix server run migrate -- --apply` | Explicit application to the configured reviewed target |
| `npm run check` | Deterministic lint, format, unit tests, build; integration/E2E remain separately visible |
| `docker compose -f docker-compose.prod.yml config --quiet` | Compose structure validation without dumping interpolated secrets |
| `npm --prefix server run bench -- <unique-label>` | Reproducible HTTP/socket workloads |
| `npm --prefix server run bench:report -- <baseline-label> <after-label>` | Generated comparison for compatible runs |

Before installing a test library, verify compatibility with the retained Node/React/Vite versions and record it in the lockfile. Use Node's built-in test runner for backend units, Supertest for HTTP integration, Socket.IO client for protocol integration, Vitest/Testing Library for browser logic, and Playwright with axe for end-to-end/accessibility checks. Test imports must not start the production server accidentally.

Existing benchmark commands, from the `server` directory:

```powershell
docker compose -p devsync-benchmark -f bench/docker-compose.bench.yml up -d --wait --wait-timeout 120
node --test bench/metrics.test.mjs
npm.cmd run bench -- preserved-checkpoint-r1
npm.cmd run bench:report -- preserved-checkpoint-r1 final-r1
```

The report command requires both named results to exist. Use new labels for every run and never overwrite the old baseline. Stop benchmark containers when finished using the same Compose project; preserve volumes unless intentionally resetting the isolated benchmark fixture. Production and benchmark databases must never share a database name, volume, or credential.

### Required test matrix

| Area | Minimum meaningful cases | Primary milestone |
| --- | --- | --- |
| Environment | Missing secret, invalid integer/boolean, conflicting legacy keys, disabled integration without credentials, insecure production cookie rejected | M02 |
| Lifecycle | Mongo unavailable at startup, readiness failure after disconnect, graceful shutdown, flush timeout, imports without side effects | M02/M07 |
| Logging | Redaction sentinel, no content-bearing request serialization, one error log per failure, bounded socket logging | M03 |
| Authentication | Login/logout, disabled user, invalid/expired JWT, revoked cookie replay, OAuth state replay, CSRF, malicious Origin, socket expiry | M04 |
| Authorization | Role/collaborator matrix, outsider resource ID, removed creator, unknown role, last-owner protection, revocation with active socket | M04/M06 |
| Data integrity | Duplicate membership, migration rerun/interruption, conditional-update conflict, file/editor transaction rollback, filesystem cycle/cross-workspace move | M05 |
| Client transport | One shared connection, StrictMode cleanup, exact listener cleanup, reference-counted joins, reconnect reauth, account switch | M06 |
| Collaborative text | Concurrent inserts/deletes, duplicate/reordered updates, IME/Unicode, local undo, late join, restart/resync, oversize/malformed update | M07 |
| Saves | Idle no-write, debounce/max-wait, one in-flight flush, edits during write, old acknowledgements, persistent failure, no false Saved | M07 |
| Board | Dropped previews, stroke finalization, concurrent elements, same-element conflict, clear epoch, retry idempotency, undo conflict, DPR/zoom/touch | M08 |
| Navigation/state | Direct link refresh, Back, two workspaces/tabs, stale response, logout cache purge, deleted resource, network vs unauthenticated state | M09 |
| UI/accessibility | First use, empty search, field error, keyboard dialogs, visible focus, 200% zoom, four widths, both themes, accessible save/error feedback | M10 |
| Deployment | HTTPS cookies, OAuth callback, proxy upgrade, SPA/API separation, restart durability, restore drill, absent optional services | M12 |

Use two or three separate Playwright browser contexts for different users, not two tabs sharing one cookie jar when testing role separation. Use multiple tabs within one context separately to test shared-account presence and workspace independence.

Keep timing assertions out of ordinary functional tests unless deterministic fake timers apply. Realtime performance testing must include server errors, rejected operations, dropped transient data, queue sizes, and final-state checks so overload cannot look like a speedup.

## Suggested commit and review sequence

Each row is a reviewable change group, not a request to make all edits before testing. Split further if a row becomes difficult to review; preserve the milestone dependencies.

| Sequence | Change group | Must be true before proceeding |
| --- | --- | --- |
| 1 | Preserve local optimization/harness checkpoint | Existing changes and evidence recoverable |
| 2 | Remove obsolete implementation stack and clarify README | Retained app installs/builds; no active v2 deployment |
| 3 | Correct/validate benchmark provenance | Preserved checkpoint measurement reproducible |
| 4 | Tooling, environment validation, app/bootstrap split | Imports/startup/shutdown tests pass |
| 5 | Logging, safe errors, API validation | Redaction and failure-contract tests pass |
| 6 | Revocable sessions and centralized access policy | HTTP and socket authorization matrix passes |
| 7 | Query shapes, migrations, file/editor integrity | Real-DB data/index tests pass |
| 8 | Shared socket provider and event contracts | One connection/tab; listener and reauth tests pass |
| 9 | Text collaboration model and migration | Concurrent editing and initialization tests pass |
| 10 | Flush coordinator and truthful save UI | Persistence failures/races/restart tests pass |
| 11 | Board batching and versioned operations | Geometry/idempotency/conflict tests pass |
| 12 | Frontend query ownership and URL routes | Account/workspace isolation and navigation tests pass |
| 13 | Design tokens, primitives, shell and auth | Keyboard/theme/responsive foundation passes |
| 14 | Workspace/resource/editor/member/settings redesign | Full user journey and state matrix passes |
| 15 | Bundle/render optimization and final measurement | Comparable evidence and documented tradeoffs |
| 16 | Production packaging, CI, backup/restore, runbook | Deployable artifact and restore drill pass |

Create PR descriptions around final behavior, tests, migrations, and limits. Keep full performance reports linked rather than filling the PR body with raw benchmark output. Do not force-push over unrelated work or include private machine artifacts/secrets in a PR.

## Decision rules for implementation sessions

Use these defaults without reopening already settled architectural choices:

1. If an optimization changes permissions, durability, or user-visible semantics, implement the correctness contract and its regression tests first. Performance loss may be an acceptable documented tradeoff; never remove checks to recover a benchmark number.
2. If profiling does not identify a bottleneck, keep the simpler implementation. Do not add workers, Redis, binary codecs, compression, or another framework speculatively.
3. If a package API differs from this plan, inspect installed versions and official documentation, update the narrow implementation detail, and record the decision. Do not change the overall architecture silently.
4. If existing local work overlaps the task, inspect and preserve it, then adapt the task. Do not discard it or count it as newly produced evidence.
5. If a test fails, determine whether it is a regression, a preexisting failure, or an environment limitation. Record evidence; fix relevant defects. Do not suppress the test, invent success, or replace a real database with a mock to obtain performance claims.
6. If the current milestone is blocked by a credential/cloud account, continue independent local packaging, tests, and documentation. Actual external deployment waits for the required access and task authorization.
7. If a public demo feature depends on paid/external services or unsafe execution, keep the capability disabled and explain it in the UI/runbook. Do not hide a broken button.
8. If a schema or protocol change invalidates old clients, coordinate frontend/backend rollout, show reload/upgrade guidance, and document compatibility. Do not leave legacy write handlers bypassing the new policy.
9. If memory budgets are reached, reject new admission and preserve dirty resources. Do not choose unbounded queues or silent data loss.
10. If the UI is unclear, choose the design-system default and complete the functional state matrix before adding decoration.

### Integration details that must not be missed

- M04 introduces the server auth contract; M06 must add the minimal single frontend auth bootstrap needed by its socket provider. M09 then completes the broader auth/query-store migration. Do not wait until M09 to authenticate the shared connection correctly.
- M07 and M08 share flush scheduling primitives, but their domain state formats and mutation semantics remain separate.
- Board retries after a server restart must synchronize epochs/revisions first. Rebase a safe local operation explicitly or offer recovery/export; do not automatically replay a stale clear/delete against a new board state.
- A `resource:saved` event received before the client's matching acceptance acknowledgement must be retained/compared safely by epoch and sequence; event arrival timing must not leave the UI permanently dirty or falsely saved.
- A metadata update cannot overwrite the content projection, and a content flush cannot overwrite a concurrent title/language change. Use field-scoped updates and distinct revisions.
- Normal resource deletion stops new mutations, resolves or rejects pending flushes deterministically, removes room/cache state, and does not allow a delayed write to reactivate the resource.
- Development fixtures use generated test users and secrets, not production credentials or personal document data. Screenshots and reports use the same nonprivate fixtures.
- Large binary synchronization and exports must respect API/proxy limits consistently. An export endpoint is authorized and bounded; it is not an unprotected shortcut around resource permissions.
- Default process memory values are provisional until measured with Mongo and the proxy. Document configured limits and actual observed usage separately.

## Release checklist

- [ ] Node/React branch created and original/local work preserved.
- [ ] No active obsolete implementation source, dependencies, or deployment/configuration references remain in the branch.
- [ ] Environment examples, config validation, runtime versions, and package locks agree.
- [ ] App imports are side-effect free; startup/readiness/shutdown behave correctly.
- [ ] Structured logs are correlated, bounded, and free of secrets/user content.
- [ ] HTTP/socket authentication, CSRF/Origin checks, permissions, and revocation are consistent.
- [ ] Database indexes and migrations have evidence and rollback/repair procedures.
- [ ] One shared application socket per tab; room and listener cleanup proven.
- [ ] Text edits converge; board operations preserve final geometry and resolve conflicts explicitly.
- [ ] Saved means durable, with no stale acknowledgement or concurrent-save overwrite.
- [ ] Auth/query/editor/UI state have clear ownership and account isolation.
- [ ] Direct links, Back navigation, responsive layouts, themes, and accessibility journeys pass.
- [ ] Optional integrations are capability-gated with no broken visible controls.
- [ ] Public host-process code execution is disabled.
- [ ] Production builds, tests, CI, and dependency checks pass or documented blockers prevent release.
- [ ] Before/after benchmark data and browser evidence are reproducible and honestly scoped.
- [ ] Production Compose, HTTPS/proxy config, backup/restore, and release rollback are verified.
- [ ] Free-plan eligibility and all deployment cost components are checked before provisioning.
- [ ] README and operations/runbook describe the actual implemented behavior.

## Execution ledger

This ledger starts with all implementation milestones not started. The planning document itself is complete when reviewed; that does not mark any implementation task complete.

| Milestone | Status | Commit or evidence | Next action |
| --- | --- | --- | --- |
| M00 Preserve and separate | Complete | Checkpoint f8471a2; artifact hashes; real API benchmark and client build passed; see IMPLEMENTATION_PROGRESS.md | Keep original evidence and history |
| M01 Baseline | In progress | First real preserved-checkpoint run completed; lint/build/audit baseline captured | Finish controlled repeated runs and reporting |
| M02 Runtime/tooling | Not started | — | Follow M00/M01 |
| M03 API/logging | Not started | — | Follow M02 |
| M04 Authentication/access | Not started | — | Follow M03 |
| M05 Database | Not started | — | Follow M04 |
| M06 Realtime foundation | Not started | — | Follow M05 |
| M07 Collaborative text/saves | Not started | — | Follow M06 |
| M08 Whiteboard | Not started | — | Follow M07 |
| M09 Frontend state/routes | Not started | — | Follow M08 |
| M10 UI journeys | Not started | — | Follow M09 |
| M11 Final performance | Not started | — | Follow M10 |
| M12 Deployment artifacts | Not started | — | Follow M11 |
| M13 Redis/scaling | Conditional, not scheduled | — | Only enter if measurement/requirements justify it |

At the end of each implementation session, append a short record in the following format. Record facts, not anticipated results.

```text
Date and branch:
Milestone and completed step numbers:
Files changed:
Behavior now implemented:
Checks run and actual results:
Evidence paths and commits:
Schema/protocol/config changes:
Known failures or blockers:
Next exact step:
```

## Prompt for a future implementation session

```text
Implement the DevSync Node/React plan in
docs/NODE_REACT_IMPLEMENTATION_PLAN.md.

Read applicable AGENTS.md files, git status, and the execution ledger first.
Preserve the existing local optimizations and benchmark artifacts.
Start at the first incomplete required milestone and follow its ordered steps.
Keep the fixed stack and coding standards in the plan.
Use its file map, configuration contract, event/save semantics, and test matrix.
Do not treat a plan item or provisional performance target as already achieved.
Complete the current milestone's implementation and verification before marking it done.
Update the ledger with concrete evidence and the next exact step.
Continue through authorized work without routine confirmation questions.
Do not deploy cloud resources or enable paid/unsafe features without the relevant authorization.
```

## Completion deliverables

The implementation should leave a clean JavaScript-focused branch; coherent frontend/backend code; documented configuration and API/realtime contracts; migrations; meaningful automated tests; a UI verified across its real states; raw reproducible performance evidence and a generated comparison; production deployment artifacts; and an operations guide covering startup, secrets, monitoring, backups, restoration, rollback, and cost limitations.

Suggested future documentation files are `docs/ENGINEERING.md`, `docs/CONFIGURATION.md`, `docs/API_AND_REALTIME.md`, `docs/UI_GUIDELINES.md`, `docs/OPERATIONS.md`, and the existing `server/BENCHMARKS.md`. Create each when its behavior exists, and link it from README. Keep this plan as the implementation checklist rather than copying evolving contracts into multiple competing documents.



