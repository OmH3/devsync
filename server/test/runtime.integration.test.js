import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

Object.assign(process.env, {
  NODE_ENV: 'test', HOST: '127.0.0.1', PORT: '18009',
  MONGO_URI: 'mongodb://127.0.0.1:27017/devsync_runtime_test?replicaSet=rs0',
  SESSION_SECRET: 'runtime-test-secret-with-at-least-48-characters-long',
  SESSION_EXPIRES_IN: '8h', SESSION_TTL_SECONDS: '28800',
  GOOGLE_AUTH_ENABLED: 'false', AUDIO_ENABLED: 'false', CODE_EXECUTION_ENABLED: 'false',
  COOKIE_SECURE: 'false', COOKIE_SAME_SITE: 'lax',
});

test('real app boots without integrations, serves API and closes cleanly', async () => {
  const { startServer } = await import('../src/server.js');
  assert.equal(mongoose.connection.readyState, 0, 'import must not connect to Mongo');
  const runtime = await startServer();
  const base = 'http://127.0.0.1:18009/api';
  try {
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
    assert.equal((await fetch(`${base}/health/ready`)).status, 200);
    assert.equal((await fetch(`${base}/workspace/all`)).status, 401);
    assert.equal((await fetch(`${base}/auth/google`)).status, 404);
    const { default: User } = await import('../src/models/User.model.js');
    const { default: Account } = await import('../src/models/Account.model.js');
    const { default: Session } = await import('../src/models/Session.model.js');
    const email = `runtime-${Date.now()}@devsync.test`;
    const user = await User.create({ email, name: 'Runtime test', password: 'runtime-test-password' });
    let socket;
    try {
      await Account.create({ userId: user._id, provider: 'EMAIL', providerId: email });
      const login = await fetch(`${base}/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'runtime-test-password' }),
      });
      assert.equal(login.status, 200);
      const cookie = login.headers.get('set-cookie').split(';')[0];
      assert.equal((await fetch(`${base}/user/current`, { headers: { cookie } })).status, 200);
      socket = io('http://127.0.0.1:18009', { extraHeaders: { cookie }, reconnection: false });
      await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
      const disconnected = new Promise(resolve => socket.once('disconnect', resolve));
      const logout = await fetch(`${base}/auth/logout`, { method: 'POST', headers: { cookie } });
      assert.equal(logout.status, 200);
      await disconnected;
      assert.equal((await fetch(`${base}/user/current`, { headers: { cookie } })).status, 401, 'old cookie replay must fail after logout');
      const malformed = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
      assert.equal(malformed.status, 400);
      const problem = await malformed.json();
      assert.equal(problem.error.code, 'INVALID_JSON');
      assert.ok(problem.requestId);
    } finally {
      socket?.close();
      await Session.deleteMany({ userId: user._id });
      await Account.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
    }
    runtime.app.locals.draining = true;
    assert.equal((await fetch(`${base}/health/ready`)).status, 503);
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
  } finally { await runtime.close(); }
  assert.equal(mongoose.connection.readyState, 0);
  assert.equal(runtime.server.listening, false);
});

test('unreachable Mongo prevents startup and exits nonzero without leaking URI', async () => {
  const child = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, MONGO_URI: 'mongodb://127.0.0.1:1/devsync_runtime_test', MONGO_SERVER_SELECTION_TIMEOUT_MS: '150' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  assert.equal(code, 1);
  assert.match(output, /startup failed/);
  assert.doesNotMatch(output, /mongodb:\/\//);
});
