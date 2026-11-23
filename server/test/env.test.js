import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv } from '../src/config/env.js';

const base = { MONGO_URI: 'mongodb://localhost/devsync_test', SESSION_SECRET: 'a'.repeat(48) };
test('optional integrations need no credentials and booleans parse explicitly', () => {
  const config = parseEnv({ ...base, AUDIO_ENABLED: 'false' });
  assert.equal(config.AUDIO_ENABLED, false);
  assert.equal(config.GOOGLE_AUTH_ENABLED, false);
  assert.equal(config.SESSION_TTL_SECONDS, 28800);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.FRONTEND_ORIGINS));
});
test('invalid settings identify keys without leaking values', () => {
  assert.throws(() => parseEnv({ ...base, PORT: 'secret-sentinel' }), error => error.message.includes('PORT') && !error.message.includes('secret-sentinel'));
  assert.throws(() => parseEnv({ ...base, AUDIO_ENABLED: 'yes' }), /AUDIO_ENABLED/);
  assert.throws(() => parseEnv({ ...base, AUDIO_ENABLED: 'true' }), /STREAM_API_SECRET/);
});
test('production rejects insecure cookies and host execution', () => {
  const production = { ...base, NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://devsync.example' };
  assert.equal(parseEnv(production).COOKIE_SECURE, true);
  assert.throws(() => parseEnv({ ...production, COOKIE_SECURE: 'false' }), /COOKIE_SECURE/);
  assert.throws(() => parseEnv({ ...production, CODE_EXECUTION_ENABLED: 'true' }), /CODE_EXECUTION_ENABLED/);
});
test('legacy duration and origin aliases cannot silently conflict', () => {
  assert.equal(parseEnv({ ...base, SESSION_EXPIRES_IN: '1d' }).SESSION_TTL_SECONDS, 86400);
  assert.throws(() => parseEnv({ ...base, SESSION_EXPIRES_IN: '1d', SESSION_TTL_SECONDS: '3600' }), /SESSION_EXPIRES_IN/);
  assert.throws(() => parseEnv({ ...base, FRONTEND_ORIGIN: 'http://localhost:5173', FRONTEND_ORIGINS: 'https://example.test' }), /FRONTEND_ORIGIN/);
  assert.throws(() => parseEnv({ ...base, FRONTEND_ORIGINS: '*' }), /FRONTEND_ORIGINS/);
});
test('save timing bounds are coherent', () => {
  assert.throws(() => parseEnv({ ...base, SAVE_DEBOUNCE_MS: '5000', SAVE_MAX_WAIT_MS: '1000' }), /SAVE_MAX_WAIT_MS/);
});
