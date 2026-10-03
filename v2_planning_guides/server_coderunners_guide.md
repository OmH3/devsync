# Server CodeRunners Guide (V2 Planning)

## Overview
This guide evaluates the `server/src/coderunners/scripts.runner.js` logic. This is the heart of the execution engine for the application. The current implementation poses the highest risk to both security and performance in the entire legacy stack.

---

## 1. Scripts Runner (`scripts.runner.js`)

### 🟢 The Good
- **Timeouts:** The `spawn` processes use a timeout (`EXECUTION_TIMEOUT = 30000`), which is essential to prevent infinite loops from hanging indefinitely.
- **Cleanup:** Uses a `finally` block to ensure `cleanupTempFiles` is always called, preventing disk exhaustion from temporary files.

### 🟠 The Bad
- **Heavy Disk I/O:** Every execution request writes files (`fs.writeFile`) to a physical directory (`TEMP_DIR`). If 1,000 users execute code simultaneously, the disk I/O will bottleneck the Node.js event loop.
- **Memory Inefficiency:** Appending output via `output += data.toString()` can cause memory spikes if a user script prints megabytes of data to stdout.

### 🔴 The Worse (CRITICAL)
- **Host Machine Execution (RCE Vulnerability):** The runner uses `child_process.spawn` to directly execute user-submitted code on the host server (`spawn("node")`, `spawn("python")`). A user could write `import os; os.system("rm -rf /")` or deploy a fork bomb, immediately destroying the server or extracting environment variables. 
- **Implicit Dependencies:** Requires the production server to have `Node`, `Python`, and `g++` globally installed and perfectly configured.

### 🛠️ What We Can Go For Instead (Golang & Docker API)
- **Strict Sandbox Isolation:** We will replace `child_process` with the **Go Docker SDK**. Instead of running code on the host, the Go backend will instantly spin up a minimal, ephemeral Docker container (e.g., `alpine-python`) for every request.
- **Resource Limits:** Docker allows us to enforce strict limits: Max 50MB RAM, 1 CPU core, and `--network none` (preventing users from making outbound HTTP requests from their code).
- **Time Complexity & I/O:** Instead of writing to the host disk ($O(N)$ I/O overhead), Go will stream the user's code directly into the Docker container's `stdin` or mount an in-memory `tmpfs` volume, bringing I/O latency close to $0ms$.
- **Buffer Limits:** Go's `io.LimitReader` will be used to enforce a strict cap on stdout (e.g., max 1MB of logs), preventing memory-exhaustion attacks.
