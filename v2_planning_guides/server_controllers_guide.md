# Server Controllers Guide (V2 Planning)

## Overview
This guide analyzes the `server/src/controllers/` directory from the legacy Node.js/Express stack and maps it to the new Golang/Fiber (or net/http) stack. It evaluates architectural decisions, performance bottlenecks, and proposes modern, high-performance alternatives.

---

## 1. Auth Controller (`auth.controller.js`)

### 🟢 The Good
- **Validation:** Strong use of schema validation (`zod`) before passing data to services.
- **Error Handling:** Standardized `asyncHandler` wrapper keeps the controller logic relatively clean.

### 🟠 The Bad
- **Callback Hell:** The `passport.authenticate` and `req.logIn` use deeply nested callbacks which makes the async flow harder to read.
- **Messy State:** Comments like `// STILL COULNDT DELETE THE SESSION COOKIE` indicate fragile session management directly tied to Express internals.

### 🔴 The Worse
- **Stateful Sessions:** Relying on memory-backed or disk-backed Express sessions limits horizontal scalability. 
- **Tight Coupling:** The authentication logic is tightly coupled with Express request/response lifecycle.

### 🛠️ What We Can Go For Instead (Golang & Next.js)
- **Architecture Shift:** Move away from Passport.js. In Go, implement a robust **stateless JWT** approach or a **Redis-backed session store**. Go’s standard `net/http` makes cookie management explicit and strongly typed.
- **Time Complexity & Performance:** Avoid hitting the database on every authenticated route. Cache session validation in Redis ($O(1)$ lookup).

---

## 2. Workspace Controller (`workspace.controller.js`)

### 🟢 The Good
- **Clear Boundaries:** Business logic is clearly delegated to the `workspace.service.js`.
- **Role Guarding:** The `roleGuard` utility enforces permissions cleanly.

### 🟠 The Bad
- **Redundant Queries:** Almost every controller method calls `getMemberRoleInWorkspace` before performing the action. If the workspace member role is already needed by the middleware, we are fetching the same role multiple times per request.

### 🔴 The Worse
- **Database Strain:** This approach means $O(N)$ database queries per single request lifecycle just for authorization checks, significantly slowing down TTFB (Time To First Byte).

### 🛠️ What We Can Go For Instead (Golang & Postgres)
- **Middleware Injection:** In Go, we will create a unified `WorkspaceMiddleware` that extracts the workspace ID, fetches the role *once*, and injects it into the request `context.Context`.
- **Memory Optimization:** Instead of loading full MongoDB Mongoose documents, we will use Postgres with `sqlc` to fetch only the integer role ID in a single sub-millisecond query.

---

## 3. Code Editor Controller (`codeeditor.controller.js`)

### 🟢 The Good
- **Real-Time Integration:** Socket.IO events are emitted immediately upon resource mutation (creation/updates).

### 🟠 The Bad
- **Global State Smell:** The `let io; export const setSocketIO...` pattern is a classic Node.js anti-pattern. It creates hidden global state, making unit testing almost impossible and leading to race conditions.
- **Manual Permission Blocks:** Massive blocks of repeated permission-checking logic (`if (!canEdit) return res.status...`) scatter authorization logic across business endpoints.

### 🔴 The Worse
- **Scaling Websockets:** Using a local Socket.IO instance means the backend cannot be horizontally scaled without introducing a Redis adapter, which adds overhead to Node's single thread.

### 🛠️ What We Can Go For Instead (Golang, Redis & Docker)
- **Dependency Injection:** In Go, we will use a `Controller` struct that receives dependencies (like the PubSub client or Database pool) upon initialization. No global variables.
- **Time Complexity:** Map permission checks into $O(1)$ memory/Redis lookups inside a specialized Go middleware.
- **Websockets & Redis Pub/Sub:** Ditch Socket.IO. We will use Go’s `gorilla/websocket` paired with **Redis Pub/Sub**. This allows infinite horizontal scaling of Go backend nodes with minimal memory overhead ($<2$ MB per Go instance vs Node's $100+$ MB).
- **Self-Hosted Code Runners:** We will replace `executeCodeService` with a Go-native implementation that spins up lightweight **Docker containers** via gRPC, avoiding HTTP overhead completely.
