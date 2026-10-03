# Client Components & State Guide (V2 Planning)

## Overview
This guide evaluates the React client implementation (`client/src/`). The primary focus is transitioning to **Next.js**, replacing manual state management with robust libraries, and eliminating severe React rendering bottlenecks in the Code Editor and Whiteboard.

---

## 1. Code Editor Component (`CodeEditor.jsx`)

### 🟢 The Good
- **Rich Collaboration:** The component actively tracks cursors, user selections, and execution results across the network.
- **Debounced Saving:** Uses `debouncedSave` to batch autosaves, which prevents spamming the backend.

### 🟠 The Bad
- **`<textarea>` based editing:** The code editor literally uses an HTML `<textarea>` for writing code, and manually calculates line numbers (`updateLineNumbers`) to sync scrolling. This means zero syntax highlighting, zero auto-complete, and clunky indentations.

### 🔴 The Worse
- **React Re-render Death Spiral:** The component stores the code content and cursor positions in React state (`[code, setCode] = useState('')`). On every single keystroke, React re-evaluates and re-renders the *entire* 1000+ line component. For larger files, typing latency will become unbearable.
- **Race Conditions:** Syncing raw strings over WebSockets without Operational Transformation (OT) or CRDTs means if User A and User B type at the exact same millisecond, one user's code will silently overwrite the other's, corrupting the file.

### 🛠️ What We Can Go For Instead (Monaco & Yjs)
- **Editor Swap:** Replace `<textarea>` with **Monaco Editor** (the engine behind VS Code) or **CodeMirror 6**. These editors handle syntax highlighting and bypass the React render cycle for typing, guaranteeing sub-millisecond typing latency.
- **CRDT Collaboration:** We will replace manual socket string replacement with **Yjs** (a CRDT framework). Yjs natively binds to Monaco/CodeMirror and handles network conflicts mathematically, guaranteeing code is never lost or corrupted when multiple people type on the same line.

---

## 2. Global State (`workspaceStore.js`, `codeeditorStore.js`)

### 🟢 The Good
- **Zustand over Redux:** Using Zustand keeps the boilerplate low and uses `persist` middleware nicely for user-centric UI states.

### 🟠 The Bad
- **Bloated Stores:** The stores contain massive blocks of asynchronous `axios` fetch logic. Zustand is being treated as an API client rather than just a state container.

### 🔴 The Worse
- **Local Storage Bloat:** `codeeditorStore` is persisting executions and code content to `localStorage`. `localStorage` is limited to $~5MB$. A few large executions or a few heavy code files will completely crash the browser's storage quota.

### 🛠️ What We Can Go For Instead (React Query / TanStack Query)
- **Data Fetching:** We will rip all asynchronous API fetching logic out of Zustand and move it to **React Query (TanStack Query)**. React Query handles caching, background polling, loading states, and error handling seamlessly.
- **Slim State:** Zustand will be strictly reserved for synchronous, purely client-side UI states (e.g., `isDarkMode`, `activeSidebarTab`).

---

## 3. Dashboard Routing (`Dashboard.jsx`)

### 🟢 The Good
- **Logical Component Splits:** The UI is cleanly separated into reusable chunks (`WorkspaceList`, `CodeEditorMain`, etc.).

### 🟠 The Bad
- **Manual State Routing:** The dashboard uses `activeView` state to conditionally render the whiteboard, code editor, or documents. 

### 🔴 The Worse
- **Zero URL Shareability:** Because there are no actual routes, you cannot send a link to a specific code file or whiteboard to a colleague. Refreshing the page kicks you back to the overview.
- **Bloated JS Bundle:** Since it's one massive component, Webpack/Vite will load the dependencies for the Whiteboard, Code Editor, and Documents all at once on initial load, drastically increasing Time-To-Interactive (TTI).

### 🛠️ What We Can Go For Instead (Next.js App Router)
- **True Routing:** Using Next.js, we will create distinct routes: `/workspace/[id]/code/[fileId]` and `/workspace/[id]/whiteboard/[boardId]`.
- **Code Splitting:** Next.js automatically chunks bundles per route. If a user visits the dashboard, the heavy Monaco Editor and Canvas libraries won't even be downloaded until they explicitly navigate to the code or whiteboard routes.
