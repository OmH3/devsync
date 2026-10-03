# Server Services Guide (V2 Planning)

## Overview
This guide evaluates the core business logic layer (`server/src/services/`). The primary focus is transitioning from Mongoose/MongoDB to **PostgreSQL** via Go, and eliminating memory and architectural bottlenecks identified in the current stack.

---

## 1. Code Executor Service (`codeExecutor.service.js`)

### 🟢 The Good
- **Execution Tracking:** Creating a `CodeExecutionModel` to track `status`, `executionTime`, and `memoryUsage` is a robust feature for a code execution platform.
- **Error Handling:** Gracefully catches execution failures and updates the database record with the `exitCode` and `error` output.

### 🟠 The Bad
- **Excessive DB Queries:** To execute one piece of code, the service fetches the code editor, fetches the member role, fetches the member document, and then saves the execution document multiple times.
- **Synchronous Await Flow:** Awaiting multiple database validations sequentially increases the overall execution time.

### 🔴 The Worse
- **Security & Bottlenecks:** Depending on how `executeByLanguage` is implemented, running untrusted code on the main backend server (or even via local child processes) is a major security flaw and CPU bottleneck. It can crash the Node event loop if the execution hangs.

### 🛠️ What We Can Go For Instead (Golang + gRPC + Docker)
- **Architecture Shift (Isolated Execution):** Move execution entirely out of the backend process. The Go backend will spin up an isolated, ephemeral **Docker container** and communicate via gRPC.
- **Time Complexity:** Collapse the validation queries into a single **SQL JOIN** in Postgres to fetch the Editor, Member Role, and Workspace details in under $1ms$.

---

## 2. FileSystem Service (`filesystem.service.js`)

### 🟢 The Good
- **ACID Transactions:** Excellent use of `mongoose.startSession()` and `session.startTransaction()` for bulk operations like `duplicateFileSystemItemService` and `deleteFileSystemItemService` to prevent partial data corruption.

### 🟠 The Bad
- **In-Memory Tree Building:** `getFileSystemTreeService` fetches all items and uses a recursive Javascript function (`buildTree`) to construct the tree in memory. This is an $O(N)$ memory/CPU operation that will hang the server if a workspace has thousands of files.
- **Double Storage:** Maintaining both a `FileSystemModel` and a separate `CodeEditorModel` and trying to keep them in sync manually is prone to race conditions.

### 🔴 The Worse
- **Manual Cascades:** `deleteChildrenRecursively` implies the application layer is manually deleting child nodes, which is slow and error-prone.

### 🛠️ What We Can Go For Instead (PostgreSQL `ltree` & CTEs)
- **Database Optimization:** Mongoose is the wrong tool for hierarchical file systems. In Postgres, we will use the `ltree` extension or **Recursive CTEs** (Common Table Expressions) to fetch, move, or delete entire folder trees in a single database command.
- **Memory Optimization:** Ditch the in-memory Javascript `buildTree`. Let Postgres return the pre-structured json or flat list, and stream it directly to the client without holding it in Go's memory.
- **Model Unification:** Merge `FileSystemItem` and `CodeEditor` into a unified `Node` or `File` table. 

---

## 3. Workspace Service (`workspace.service.js`)

### 🟢 The Good
- **Complete Cleanup:** `deleteWorkspaceByIdService` explicitly cleans up dangling documents (Whiteboards, Docs, Code Editors, Members).

### 🟠 The Bad
- **Over-fetching:** `getAllWorkspacesUserIsMemberService` fetches complete membership documents into memory just to map out and return an array of `workspaceId`s.
- **Dynamic Roles as Documents:** Querying `RoleModel.findOne({ name: Roles.OWNER })` implies roles are stored as documents rather than static enums, requiring unnecessary database lookups.

### 🔴 The Worse
- **Application-Layer Cascading Deletes:** Deleting multiple collections manually (`DocModel.deleteMany`, `WhiteboardModel.deleteMany`, etc.) in the application layer takes time, locks the database longer, and is highly prone to network failures midway.

### 🛠️ What We Can Go For Instead (PostgreSQL Constraints)
- **Database Shift:** We will use Postgres Foreign Keys with `ON DELETE CASCADE`. When a workspace is deleted, the Postgres engine will instantly and safely wipe all related docs, editors, and members natively. The Go backend won't have to delete anything manually.
- **Time Complexity:** Change over-fetching to SQL projections (`SELECT workspace_id FROM members WHERE user_id = X`), ensuring we only transfer the exact bytes needed over the network.
