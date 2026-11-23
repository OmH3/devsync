# Implementation progress

## 22 November 2026

Branch: `perf/node-react-ux`. Never push or merge this work to `main`.

The existing uncommitted application and harness optimizations were preserved in
commit `f8471a2`. Original benchmark artifacts remain on disk; their SHA256 hashes
are recorded in `BASELINE_ARTIFACT_HASHES.json`. CPU profiles are ignored rather
than deleted. The implementation plan is committed with the checkpoint.

M00 stack separation removes 99 tracked obsolete implementation implementation, documentation,
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

## 22 November 2026 (real-world multi-user Chrome E2E verification & fixes)

Tested against the live containerized production stack (`docker-compose.prod.yml`:
Caddy HTTPS + Node/Express + Socket.IO + MongoDB 7 replica set) using two isolated
headless Chrome instances (Alice and Bob) over CDP without VeilGate.

Bugs uncovered and fixed during E2E testing:

1. **Multi-tab / multi-workspace creation bug:** `createDocController`,
   `createWhiteboardController`, `createFileSystemItemController`, and
   `createCodeEditorController` ignored `req.body.workspaceId` (and Zod stripped it),
   falling back to `User.currentWorkspace` in MongoDB—so switching workspaces in the
   UI still created items in the user's original default workspace. Fixed schemas and
   controllers to honor the explicit `body.workspaceId` first.
2. **Socket `join-workspace` payload mismatch & `user-count` collision:**
   `workspace.handlers.js` expected a raw `workspaceId` string while several client
   components and reconnect logic sent `{ workspaceId }`, causing a CastError on
   `MemberModel.findOne`. In addition, `user-count` was emitted with the same event
   name by workspace, doc, whiteboard, and code rooms. Normalized `join-workspace` /
   `leave-workspace` to accept both shapes, emitted `workspace-user-count`, and
   replayed `workspace-joined` in `sharedSocket.js` when multiple components share a
   workspace room.
3. **Whiteboard collaboration & layout bugs:**
   - Removed the duplicate tool/color/width sidebar in `WhiteboardMain.jsx`.
   - `WhiteboardCanvas` now fetches fresh board data on mount, broadcasts completed
     elements (`whiteboard-draw` -> `whiteboard-element-added`) and `clear-canvas`
     events to peers, and reads the latest store snapshot when saving.
   - `WhiteboardList` now fetches the user's workspace role on mount so permissions
     are accurate before opening a board.
4. **UI/UX & lifecycle polish:**
   - Removed raw debug overlays from `DocumentEditor`, `CodeEditor`, and
     `EnhancedDrawingCanvas`; changed nested editors from `h-screen` to `h-full` /
     viewport-aware containers.
   - Restyled `RegisterForm.jsx` to match `LoginForm.jsx` and capability-gated the
     Google OAuth button; gated the Code Editor `Run` button on `capabilities.codeExecution`.
   - Restored direct `Members` and `Settings` actions in the `Dashboard` header and
     workspace overview; replaced broken empty icon labels and external
     `via.placeholder.com` avatar URLs.
   - Fixed an uncaught `TypeError: Cannot read properties of null (reading 'focus')`
     when `CreateDocumentModal` closed before its 100 ms focus timer fired.
   - Cleared workspace, document, whiteboard, code-editor, and filesystem stores on
     logout and auto-selected the first workspace on login.

All 9 multi-user Chrome E2E journeys (registration, workspace creation, invite join,
member role promotion to ADMIN with toast verification, live document sync & save,
live whiteboard drawing sync & persistence, live code editor file creation/sync/save
& capability gating, and logout store cleanup) passed with **0 page exceptions** and
**0 HTTP >= 400 errors**.

## 23 November 2026 branch publication

Published the current implementation snapshot on perf/node-react-ux. Removed obsolete architecture artifacts and documentation references. Production client build, 11 unit tests, and 2 real MongoDB/HTTP/Socket.IO integration tests passed immediately before publication. Backend environment validation, lifecycle, logging, and revocable-session work is included. The complete implementation plan remains unfinished; this publication does not claim completion of every milestone. Local secrets, cookie jars, dependencies, and CPU profiles are excluded. Existing commit history is retained.
