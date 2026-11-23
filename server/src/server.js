import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { config } from './config/app.config.js';
import connectDatabase from './config/database.config.js';
import { createApplication } from './app.js';

export async function startServer() {
  await connectDatabase();
  const runtime = createApplication();
  await new Promise((resolve, reject) => {
    runtime.server.once('error', reject);
    runtime.server.listen(config.PORT, config.HOST, resolve);
  });
  let closing;
  runtime.close = () => {
    if (closing) return closing;
    runtime.app.locals.draining = true;
    closing = (async () => {
      const deadline = setTimeout(() => { console.error('Shutdown deadline exceeded'); process.exit(1); }, config.SHUTDOWN_TIMEOUT_MS);
      deadline.unref();
      try {
        await new Promise(resolve => runtime.io.close(resolve));
        await mongoose.disconnect();
      } finally { clearTimeout(deadline); }
    })();
    return closing;
  };
  return runtime;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const runtime = await startServer();
    console.info(`DevSync listening on port ${config.PORT}`);
    for (const signal of ['SIGTERM', 'SIGINT']) {
      process.once(signal, () => runtime.close().catch(() => { process.exitCode = 1; }));
    }
  } catch {
    console.error('Application startup failed; verify configuration and required dependencies');
    await mongoose.disconnect();
    process.exitCode = 1;
  }
}
