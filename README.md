# DevSync — Real-Time Collaborative Workspace Platform

DevSync is a real-time collaborative workspace built with **React 19 + Vite** and **Node.js + Express 5 + Socket.IO + MongoDB**. It brings rich documents, interactive whiteboards, a multi-file code editor, and Discord-style audio rooms into a Notion-inspired workspace with built-in **Black / Light** themes.

- **Implementation Plan**: [docs/NODE_REACT_IMPLEMENTATION_PLAN.md](docs/NODE_REACT_IMPLEMENTATION_PLAN.md)
- **AWS Free Tier Deployment Guide**: [docs/DEPLOY_AWS_FREE_TIER.md](docs/DEPLOY_AWS_FREE_TIER.md)
- **Benchmark Methodology & Results**: [server/BENCHMARKS.md](server/BENCHMARKS.md)

---

## ✨ Key Features

- 📝 **Rich Document Editor (TipTap)** — Real-time collaborative rich-text editing with headings, lists, blockquotes, code blocks, auto-save, and revision-conflict (`409`) protection.
- 🎨 **Interactive Whiteboard (Excalidraw)** — Real-time collaborative canvas for diagrams, shapes, and freehand sketching with backward compatibility for legacy canvas boards.
- 💻 **Collaborative Code Editor (Monaco)** — VS Code–powered editor supporting **JavaScript**, **Python**, and **C++**, with a hierarchical file explorer, VS Code–style drag-and-drop of files into folders, live peer cursors, auto-save, and optional code execution.
- 🎙️ **Team Lounge Audio Rooms (WebRTC)** — Discord-style microphone-only peer-to-peer voice rooms (up to 8 participants per workspace) with mute, deafen, and live participant indicators—no third-party voice SDK or API keys required.
- 🌗 **Black & Light Theme Toggle** — Notion-inspired warm neutral Light mode and high-contrast Black mode (`#191919` / `#202020`) synchronized across workspace views, Monaco (`vs-dark` / `vs`), and Excalidraw (`dark` / `light`).
- 🔐 **Role-Based Access Control** — Granular workspace permissions (`OWNER`, `ADMIN`, `MEMBER`) enforced on both REST endpoints and per-packet Socket.IO resource events.

---

## 🛠️ Tech Stack

### Frontend (`client/`)
- **React 19** + **Vite 7** + **Tailwind CSS 4**
- **TipTap** (`@tiptap/react`, `@tiptap/starter-kit`) for rich documents
- **Monaco Editor** (`@monaco-editor/react`, `monaco-editor`) with local web workers for code editing
- **Excalidraw** (`@excalidraw/excalidraw`) for whiteboards
- **Zustand 5** + **TanStack React Query 5** for state and server cache
- **Socket.IO Client 4.8** (single shared tab-wide connection with workspace room reference counting)
- **Native WebRTC** (`RTCPeerConnection`) for microphone-only audio rooms

### Backend (`server/`)
- **Node.js 22** + **Express 5**
- **MongoDB 7** + **Mongoose 8** (replica set transaction support for multi-collection operations)
- **Socket.IO 4.8** with per-packet resource authorization middleware
- **Zod** for strict environment and request schema validation
- **Pino** for structured JSON logging with automatic credential/cookie redaction

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js** `>= 18` (Node 22 LTS recommended)
- **MongoDB 7** (replica set recommended for multi-document transactions, e.g. `mongodb://127.0.0.1:27017/devsync?replicaSet=rs0`)

### 1. Clone & Install
```bash
git clone https://github.com/OmH3/devsync.git
cd devsync

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2. Configure Environment Variables
Copy the example environment file into `server/.env`:
```bash
cp .env.example server/.env
```
*(Optional)* For the frontend, no `.env` is required in development or same-origin production because Vite proxies `/api` and `/socket.io` to `http://localhost:8000` automatically. See `client/.env.example` if hosting the API on a separate origin.

#### Required vs. Optional Server Environment Variables (`server/.env`)

| Variable | Required? | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `MONGO_URI` | **Yes** | — | MongoDB connection string (`mongodb://...` or `mongodb+srv://...`) |
| `SESSION_SECRET` | **Yes** | — | Secret key (**minimum 32 characters**) used to sign session tokens |
| `PORT` | No | `8000` | HTTP/Socket.IO listen port |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin for the frontend |
| `AUDIO_ENABLED` | No | `true` | Enables native WebRTC voice rooms in the workspace sidebar |
| `CODE_EXECUTION_ENABLED` | No | `false` | Enables local code execution (`JavaScript`, `Python`, `C++`) in the Code Editor (must be `false` when `NODE_ENV=production`) |
| `GOOGLE_AUTH_ENABLED` | No | `false` | Enables Google Sign-In (requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` when `true`) |
| `PUBLIC_ORIGIN` | Prod only | — | Required when `NODE_ENV=production` (must be `https://...`) |

### 3. Seed Roles & Start Servers
```bash
# Seed OWNER / ADMIN / MEMBER role permissions (idempotent)
cd server
npm run seed

# Start backend on http://localhost:8000
npm run dev
```

In a second terminal:
```bash
# Start frontend on http://localhost:5173
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

Run the backend unit & security test suite (environment validation, log redaction, per-packet socket authorization, WebRTC voice signaling, and benchmark metrics):
```bash
cd server
npm test
```

Build the production frontend bundle:
```bash
cd client
npm run build
```

---

## ☁️ Production Deployment (Docker Compose & AWS Free Tier)

Production packaging is included in [`docker-compose.prod.yml`](docker-compose.prod.yml), [`server/Dockerfile`](server/Dockerfile), [`deploy/web.Dockerfile`](deploy/web.Dockerfile), and [`deploy/Caddyfile`](deploy/Caddyfile):

1. Copy [`.env.production.example`](.env.production.example) to `.env.production` and set `DOMAIN`, `PUBLIC_ORIGIN`, `FRONTEND_ORIGIN`, and a 32+ byte `SESSION_SECRET`.
2. Start the stack:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```
3. Initialize the MongoDB replica set and seed roles as documented in [`docs/DEPLOY_AWS_FREE_TIER.md`](docs/DEPLOY_AWS_FREE_TIER.md).

---

## 📜 License

Licensed under the [MIT License](LICENSE).
