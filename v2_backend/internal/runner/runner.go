package runner

import (
	"bytes"
	"context"
	"os/exec"
	"time"
)

// RunResult formats the stdout and stderr cleanly for the frontend
type RunResult struct {
	Output string `json:"output"`
	Error  string `json:"error"`
}

// ExecutePython safely runs untrusted user code inside an ephemeral Docker container.
func ExecutePython(code string) RunResult {
	// 1. Set a strict 5-second maximum execution limit.
	// If the user writes `while True: pass`, this will forcefully kill the container.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 2. Construct the highly-restricted Docker command
	cmd := exec.CommandContext(ctx, "docker", "run",
		"--rm",           // Destroy container immediately after it exits
		"-i",             // Keep STDIN open so we can pipe the code in
		"--net", "none",  // Disable network (prevents DDoS and downloading malware)
		"--memory", "128m", // Strictly limit RAM to prevent memory bombs
		"--cpus", "0.5",    // Limit CPU to half a core
		"python:3.9-alpine", 
		"python", "-",    // Tell python to execute whatever it receives on STDIN
	)

	// 3. Pipe the user's raw code directly into STDIN
	cmd.Stdin = bytes.NewBufferString(code)

	// 4. Capture the Output and Errors
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// 5. Execute!
	err := cmd.Run()

	// 6. Handle Security Timeouts gracefully
	if ctx.Err() == context.DeadlineExceeded {
		return RunResult{
			Output: stdout.String(),
			Error:  "\n[System] Execution timed out (5s limit exceeded). Infinite loop detected?",
		}
	}

	// If there was a syntax error in python, err will not be nil, but stderr will contain the traceback
	if err != nil && stderr.Len() == 0 {
		stderr.WriteString(err.Error())
	}

	return RunResult{
		Output: stdout.String(),
		Error:  stderr.String(),
	}
}

// ExecuteCPP safely compiles and runs untrusted C++ code inside an ephemeral Docker container.
func ExecuteCPP(code string) RunResult {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second) // 10s limit for compilation + execution
	defer cancel()

	// Use gcc:latest docker image. Pipe code into g++, compile to /tmp/out, and then run it.
	cmd := exec.CommandContext(ctx, "docker", "run",
		"--rm",
		"-i",
		"--net", "none",
		"--memory", "256m",
		"--cpus", "0.5",
		"gcc:latest",
		"sh", "-c", "g++ -x c++ - -o /tmp/out && /tmp/out",
	)

	cmd.Stdin = bytes.NewBufferString(code)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	if ctx.Err() == context.DeadlineExceeded {
		return RunResult{
			Output: stdout.String(),
			Error:  "\n[System] Execution timed out (10s limit exceeded).",
		}
	}

	if err != nil && stderr.Len() == 0 {
		stderr.WriteString(err.Error())
	}

	return RunResult{
		Output: stdout.String(),
		Error:  stderr.String(),
	}
}

// ExecuteJava safely compiles and runs untrusted Java code inside an ephemeral Docker container.
func ExecuteJava(code string) RunResult {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", "run",
		"--rm",
		"-i",
		"--net", "none",
		"--memory", "256m",
		"--cpus", "0.5",
		"eclipse-temurin:17-alpine",
		"sh", "-c", "cat > /tmp/Main.java && java /tmp/Main.java",
	)

	cmd.Stdin = bytes.NewBufferString(code)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	if ctx.Err() == context.DeadlineExceeded {
		return RunResult{
			Output: stdout.String(),
			Error:  "\n[System] Execution timed out (10s limit exceeded).",
		}
	}

	if err != nil && stderr.Len() == 0 {
		stderr.WriteString(err.Error())
	}

	return RunResult{
		Output: stdout.String(),
		Error:  stderr.String(),
	}
}
