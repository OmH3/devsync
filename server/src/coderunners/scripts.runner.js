import path from "path";
import { spawn } from "child_process";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid"; 
import { BadRequestException } from "../utils/app-error.js"; 
const EXECUTION_TIMEOUT = 30000;
const TEMP_DIR = "./temp_executions"; 

// Ensure temp directory exists
await fs.mkdir(TEMP_DIR, { recursive: true }); 

// ...existing code...
export const executeJavaScript = async (code, input, filename) => {
  const filepath = path.join(TEMP_DIR, `${filename}.js`);
  await fs.writeFile(filepath, code);

  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn("node", [filepath], {
      timeout: EXECUTION_TIMEOUT,
    });

    let output = "";
    let error = "";

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      error += data.toString();
    });

    child.on("close", (code) => {
      const executionTime = Date.now() - startTime;
      resolve({
        output: output.trim(),
        error: error.trim(),
        status: code === 0 ? "completed" : "failed",
        exitCode: code,
        executionTime,
      });
    });

    child.on("error", (err) => {
      resolve({
        output: "",
        error: err.message,
        status: "failed",
        exitCode: -1,
        executionTime: Date.now() - startTime,
      });
    });
  });
};

export const cleanupTempFiles = async (filename) => {
  try {
    const possibleFiles = [
      `${filename}.js`,
      `${filename}.py`,
      `${filename}.cpp`,
      filename, // executable
    ];

    for (const file of possibleFiles) {
      try {
        await fs.unlink(path.join(TEMP_DIR, file));
      } catch (err) {
        // File might not exist, ignore
      }
    }
  } catch (error) {
    console.error("Error cleaning up temp files:", error);
  }
};


export const executePython = async (code, input, filename) => {
  const filepath = path.join(TEMP_DIR, `${filename}.py`);
  await fs.writeFile(filepath, code);

  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn("python", [filepath], {
      timeout: EXECUTION_TIMEOUT,
    });

    let output = "";
    let error = "";

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      error += data.toString();
    });

    child.on("close", (code) => {
      const executionTime = Date.now() - startTime;
      resolve({
        output: output.trim(),
        error: error.trim(),
        status: code === 0 ? "completed" : "failed",
        exitCode: code,
        executionTime,
      });
    });

    child.on("error", (err) => {
      resolve({
        output: "",
        error: err.message,
        status: "failed",
        exitCode: -1,
        executionTime: Date.now() - startTime,
      });
    });
  });
};


export const executeCpp = async (code, input, filename) => {
  const sourceFile = path.join(TEMP_DIR, `${filename}.cpp`);
  const executableFile = path.join(TEMP_DIR, filename);
  
  await fs.writeFile(sourceFile, code);

  // Compile first
  return new Promise((resolve) => {
    const compileChild = spawn("g++", [sourceFile, "-o", executableFile], {
      timeout: EXECUTION_TIMEOUT,
    });

    let compileError = "";

    compileChild.stderr.on("data", (data) => {
      compileError += data.toString();
    });

    compileChild.on("close", (code) => {
      if (code !== 0) {
        resolve({
          output: "",
          error: `Compilation failed: ${compileError}`,
          status: "failed",
          exitCode: code,
          executionTime: 0,
        });
        return;
      }

      // Execute compiled program
      const startTime = Date.now();
      const execChild = spawn(executableFile, [], {
        timeout: EXECUTION_TIMEOUT,
      });

      let output = "";
      let error = "";

      if (input) {
        execChild.stdin.write(input);
        execChild.stdin.end();
      }

      execChild.stdout.on("data", (data) => {
        output += data.toString();
      });

      execChild.stderr.on("data", (data) => {
        error += data.toString();
      });

      execChild.on("close", (exitCode) => {
        const executionTime = Date.now() - startTime;
        resolve({
          output: output.trim(),
          error: error.trim(),
          status: exitCode === 0 ? "completed" : "failed",
          exitCode,
          executionTime,
        });
      });

      execChild.on("error", (err) => {
        resolve({
          output: "",
          error: err.message,
          status: "failed",
          exitCode: -1,
          executionTime: Date.now() - startTime,
        });
      });
    });
  });
};

export const executeByLanguage = async (language, code, input, executionId) => {
  const startTime = Date.now();
  const filename = `exec_${executionId}_${uuidv4()}`;

  try {
    switch (language) {
      case "javascript":
        return await executeJavaScript(code, input, filename);
      case "python":
        return await executePython(code, input, filename);
      case "cpp":
        return await executeCpp(code, input, filename);
      default:
        throw new BadRequestException(`Language ${language} is not supported for execution`);
    }
  } finally {
    // Cleanup temp files
    await cleanupTempFiles(filename);
  }
};