import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { createLogger } from '../src/observability/logger.js';
import { safeSerializers } from '../src/observability/logger.js';
import pinoHttp from 'pino-http';
import { createServer } from 'node:http';

test('HTTP serializers and redaction omit credentials, bodies and raw URLs', () => {
  let output = '';
  const destination = new Writable({ write(chunk, encoding, done) { output += chunk; done(); } });
  const logger = createLogger({ LOG_LEVEL: 'info', NODE_ENV: 'test', RELEASE_SHA: 'test' }, destination);
  logger.info({
    req: { id: 'request', method: 'POST', url: '/?token=sentinel', headers: { cookie: 'sentinel' }, body: { content: 'sentinel' } },
    res: { statusCode: 400, headers: { 'set-cookie': 'sentinel' } },
    err: new Error('sentinel'), token: 'sentinel', password: 'sentinel',
  }, 'request.completed');
  assert.ok(output.includes('request.completed'));
  assert.ok(!output.includes('sentinel'));
});

test('real HTTP logger does not override the safe serializers', async () => {
  let output = '';
  const destination = new Writable({ write(chunk, encoding, done) { output += chunk; done(); } });
  const logger = createLogger({ LOG_LEVEL: 'info', NODE_ENV: 'test', RELEASE_SHA: 'test' }, destination);
  const logRequest = pinoHttp({ logger, serializers: safeSerializers, wrapSerializers: false });
  const server = createServer((req, res) => { logRequest(req, res); res.setHeader('Set-Cookie', 'sentinel'); res.end('ok'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await fetch(`http://127.0.0.1:${server.address().port}/?token=sentinel`, { headers: { cookie: 'sentinel', authorization: 'sentinel' } });
    assert.ok(output.includes('request completed'));
    assert.ok(!output.includes('sentinel'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});
