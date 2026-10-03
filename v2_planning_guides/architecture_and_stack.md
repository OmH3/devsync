# V2 Architecture & Tech Stack Proposal

## Core Philosophy
The V2 rewrite of DevSync aims to achieve **maximum concurrency, lowest latency, and absolute security isolation** without relying on managed third-party services. We will build, host, and control the entire stack.

## Tech Stack Decisions

### 1. Backend: Golang
- **Why?** Replaces Node.js. Go handles WebSockets and concurrency effortlessly with Goroutines, using $~2KB$ of memory per routine compared to Node's heavy OS-level threads for intensive tasks.
- **Framework:** `net/http` or `Fiber` for API routing. `gorilla/websocket` for real-time collaboration.

### 2. Frontend: Next.js (React)
- **Why?** Replaces standard React/Vite. Next.js Server Components will reduce the Javascript payload sent to the client.
- **State Management:** Shift from Redux to lightweight alternatives like Zustand or Jotai to prevent unnecessary re-renders.

### 3. Database: PostgreSQL
- **Why?** Replaces MongoDB. Hierarchical file systems (directories/files) and relational permissions (workspaces/members/roles) are mathematically proven to be faster and more stable in relational databases.
- **ORM/Query Builder:** `sqlc` or `GORM` in Go. `sqlc` is preferred for raw SQL performance ($O(1)$ mapping).

### 4. Caching & Pub/Sub: Redis
- **Why?** Replaces local state arrays and local `Socket.IO` instances. 
- **Usage:**
  - **Pub/Sub:** Allows multiple Go backend instances to broadcast code-sync events to each other instantly.
  - **Caching:** Stores Workspace Permissions and Roles in memory so we don't query Postgres on every single API request.

### 5. Execution Engine: Docker SDK (Self-Hosted)
- **Why?** Replaces `child_process.spawn`. Directly executing user code on the host is a severe security risk.
- **Implementation:** Go will interact directly with the local Docker daemon to spin up locked-down, ephemeral containers. 
- **Resource Constraints:** `max_memory=50MB`, `cpus=0.5`, `network=none`.

## Performance Mandates for V2
1. **$O(1)$ Authorization:** Role checks must never hit the database for authenticated sessions. They must be checked against Redis.
2. **Zero-Allocation Streams:** File uploads, downloads, and compilation streams must be piped directly without loading the entire payload into the server's RAM.
3. **Database Cascades:** No application-layer cascading deletes. Deleting a workspace will trigger native `ON DELETE CASCADE` in Postgres, reducing execution time from seconds to milliseconds.
