import pino from 'pino';

export const safeSerializers = {
  req: req => ({ id: req.id, method: req.method }),
  res: res => ({ statusCode: res.statusCode }),
  err: err => ({ type: err?.name, code: typeof err?.code === 'string' ? err.code : undefined }),
};

/** Allowlisted serializers prevent payloads and credentials entering HTTP logs. */
export function createLogger(config, destination) {
  return pino({
    level: config.LOG_LEVEL,
    base: { service: 'devsync', environment: config.NODE_ENV, release: config.RELEASE_SHA },
    redact: { paths: ['password', 'token', 'secret', 'cookie', 'authorization', '*.password', '*.token', '*.secret', '*.cookie', '*.authorization'], censor: '[REDACTED]' },
    serializers: safeSerializers,
  }, destination);
}
