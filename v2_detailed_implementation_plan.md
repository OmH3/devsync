# DevSync V2 Detailed Implementation Plan

## Goal Description
Migrate DevSync from a legacy V1 stack (Node.js, MongoDB, Socket.io, React SPA) to a high-performance V2 architecture (Go, PostgreSQL, WebSockets/Yjs, WebRTC, Next.js). This rewrite resolves critical security flaws (RCE vulnerabilities via raw `child_process`), scalability bottlenecks (physical file mirroring, manual Socket.io string syncing), and infrastructure costs by targeting a strictly optimized $0/month deployment on the Oracle Cloud Always Free Tier.

## User Review Required
> [!IMPORTANT]  
> The V2 backend will enforce a hard limit of **50 files per workspace**, supporting **text/code only**. Binary uploads are strictly disabled to maintain database performance on the free tier.
> The V2 execution sandbox operates with strict limits (10s timeout, 128MB RAM, 0.5 CPU, `--network none`) per container.

## Open Questions
> [!NOTE]  
> All structural, architectural, and edge-case questions have been fully resolved during the preceding "Grill Me" sessions. There are no blocking open questions.

---

## Proposed Changes

### Database Architecture (PostgreSQL)
We will introduce a clean relational schema to support virtualized files, workspaces, and robust RBAC.

#### [NEW] `schema.sql`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    whiteboard_state JSONB DEFAULT '{}'::jsonb, -- Excalidraw state
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE workspace_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role workspace_role NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE virtual_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES virtual_files(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT DEFAULT '',
    is_directory BOOLEAN DEFAULT false,
    file_type VARCHAR(50) DEFAULT 'code', -- 'code' or 'tiptap'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Backend Core & API Gateway (Go)
The API gateway will handle authentication and serve as the entry point for WebSocket and WebRTC connections.

#### [NEW] `cmd/api/main.go`
* Initializes Gin router.
* Connects to PostgreSQL (pgx) and Redis.
* Mounts REST routes and WebSocket upgraders.

#### [NEW] `internal/api/middleware/auth.go`
* Validates short-lived JWT Access Tokens.
* Enforces RBAC permissions based on `workspace_members` table.

---

### Code Execution Service (Go Docker SDK)
Replaces the highly insecure `child_process.spawn` with isolated, ephemeral Docker containers using strict resource limits.

#### [NEW] `internal/runner/docker.go`
```go
// Snippet demonstrating the strict security constraints
func CreateExecutionContainer(ctx context.Context, cli *client.Client, image string, tempDir string) (string, error) {
    pidsLimit := int64(50) // Prevents C++ fork bombs
    
    resp, err := cli.ContainerCreate(ctx, &container.Config{
        Image:           image,
        NetworkDisabled: true, // No internet access
        Cmd:             []string{"sh", "-c", "timeout 10s run_script.sh"},
    }, &container.HostConfig{
        Resources: container.Resources{
            Memory:   134217728, // 128 MB RAM
            NanoCPUs: 500000000, // 0.5 CPU cores
            PidsLimit: &pidsLimit,
        },
        Binds: []string{tempDir + ":/app:ro"}, // Read-only mount of virtual files
    }, nil, nil, "")
    return resp.ID, err
}
```

---

### Real-Time Collaboration Hub (Yjs + WebSockets)
Replaces manual text diffing with deterministic CRDT merging.

#### [NEW] `internal/ws/hub.go`
* Maintains active `Y.Doc` instances in memory for active workspaces.
* Broadcasts awareness/presence updates (excluding mouse pointers to save bandwidth).
* Periodically flushes `Y.Doc` state back to the `virtual_files` content column in PostgreSQL.
* Forces client reset on reconnection if local edits drift (rejecting offline edits).

---

### Voice Room Service (Pion WebRTC SFU)
Implements a Selective Forwarding Unit for voice chat, eliminating P2P mesh overhead.

#### [NEW] `internal/webrtc/sfu.go`
```go
// Snippet demonstrating track routing
func (room *Room) AddTrack(track *webrtc.TrackRemote) {
    // Create a local track, copy packets from the remote track, and fan out to all other peers
    localTrack, _ := webrtc.NewTrackLocalStaticRTP(track.Codec().RTPCodecCapability, track.ID(), track.StreamID())
    room.Tracks[track.ID()] = localTrack
    
    for _, peer := range room.Peers {
        peer.Connection.AddTrack(localTrack)
    }
}
```
* Integrates strictly with Public STUN servers (no Coturn).
* Simple boolean mute state sync via `internal/ws/hub.go`.

---

### Frontend Integration (Next.js)
Frontend setup to bypass CORS and integrate with the Go backend seamlessly on the free tier.

#### [MODIFY] `next.config.js`
```javascript
// Proxies all /api traffic to the Go VPS to completely bypass CORS
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://<ORACLE_VPS_IP>:8080/api/:path*',
      },
    ]
  },
}
```

## Verification Plan

### Automated Tests
* Run `go test ./internal/ws` to verify Yjs CRDT binary flushing logic.
* Run `go test ./internal/runner` to verify Docker resource limits properly kill fork bombs and prevent outbound network access.

### Manual Verification
1. **Workspace Lifecycle**: Create a workspace, verify 100% blank initialization, and verify Postgres insertion.
2. **Execution Sandbox**: Run a Python script containing `while True: pass` and manually confirm it is killed exactly after 10 seconds.
3. **Collaboration Sync**: Open two browser tabs side-by-side. Type simultaneously on the exact same line of code and verify deterministic merge without overwriting.
4. **Offline Rejection**: Disconnect network in Tab A, type text, reconnect network, and verify the offline text is rejected and replaced by Tab B's source of truth.
5. **WebRTC Mute Sync**: Join a voice room in two tabs, toggle mute in Tab A, and verify the UI instantly updates in Tab B via WebSocket broadcast.
