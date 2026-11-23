import { z } from 'zod';

const boolean = (fallback) => z.enum(['true', 'false']).default(String(fallback)).transform(value => value === 'true');
const integer = (fallback, min, max) => z.coerce.number().int().min(min).max(max).default(fallback);
const optional = z.preprocess(value => value === '' ? undefined : value, z.string().optional());
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: integer(8000, 1, 65535),
  BASE_PATH: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).default('/api').transform(value => value.replace(/\/$/, '')),
  MONGO_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  MONGO_MAX_POOL_SIZE: integer(10, 1, 100),
  MONGO_SERVER_SELECTION_TIMEOUT_MS: integer(5000, 100, 60000),
  SESSION_SECRET: z.string().min(32),
  SESSION_TTL_SECONDS: integer(28800, 60, 604800),
  SESSION_EXPIRES_IN: optional,
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  FRONTEND_ORIGINS: optional,
  PUBLIC_ORIGIN: optional,
  TRUST_PROXY_HOPS: integer(0, 0, 5),
  COOKIE_SECURE: boolean(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  GOOGLE_AUTH_ENABLED: boolean(false),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  GOOGLE_CALLBACK_URL: optional,
  FRONTEND_GOOGLE_CALLBACK_URL: z.string().url().default('http://localhost:5173/google/callback'),
  AUDIO_ENABLED: boolean(false),
  STREAM_API_KEY: optional,
  STREAM_API_SECRET: optional,
  CODE_EXECUTION_ENABLED: boolean(false),
  REDIS_ENABLED: boolean(false),
  REDIS_URL: optional,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_PRETTY: boolean(false),
  RELEASE_SHA: z.string().default('dev'),
  HTTP_BODY_LIMIT_BYTES: integer(1048576, 1024, 4194304),
  SOCKET_MAX_PAYLOAD_BYTES: integer(262144, 1024, 4194304),
  SAVE_DEBOUNCE_MS: integer(1500, 100, 10000),
  SAVE_MAX_WAIT_MS: integer(5000, 200, 30000),
  SHUTDOWN_TIMEOUT_MS: integer(15000, 1000, 60000),
  ROOM_IDLE_TTL_MS: integer(60000, 1000, 300000),
  MAX_ACTIVE_ROOMS: integer(100, 1, 10000),
  AUTH_CACHE_TTL_MS: integer(10000, 0, 10000),
});

/** Parse explicit input without reading process.env or disclosing rejected values. */
export function parseEnv(input) {
  const result = schema.safeParse({ ...input, COOKIE_SECURE: input.COOKIE_SECURE ?? String(input.NODE_ENV === 'production') });
  if (!result.success) {
    throw new Error(`Invalid configuration: ${[...new Set(result.error.issues.map(issue => issue.path.join('.')))].join(', ')}`);
  }
  const value = result.data;
  const invalid = new Set();
  const requireKeys = keys => keys.forEach(key => { if (!value[key]) invalid.add(key); });
  if (value.GOOGLE_AUTH_ENABLED) requireKeys(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL']);
  if (value.AUDIO_ENABLED) requireKeys(['STREAM_API_KEY', 'STREAM_API_SECRET']);
  if (value.REDIS_ENABLED) requireKeys(['REDIS_URL']);
  if (value.SAVE_MAX_WAIT_MS <= value.SAVE_DEBOUNCE_MS) invalid.add('SAVE_MAX_WAIT_MS');
  if (value.COOKIE_SAME_SITE === 'none' && !value.COOKIE_SECURE) invalid.add('COOKIE_SECURE');
  if (value.NODE_ENV === 'production') {
    if (!value.COOKIE_SECURE) invalid.add('COOKIE_SECURE');
    if (value.CODE_EXECUTION_ENABLED) invalid.add('CODE_EXECUTION_ENABLED');
    if (value.LOG_PRETTY) invalid.add('LOG_PRETTY');
    if (!value.PUBLIC_ORIGIN?.startsWith('https://')) invalid.add('PUBLIC_ORIGIN');
    if (/placeholder|change[-_ ]?me|example|benchmark/i.test(value.SESSION_SECRET)) invalid.add('SESSION_SECRET');
  }
  const origins = (value.FRONTEND_ORIGINS ?? value.FRONTEND_ORIGIN).split(',').map(origin => origin.trim());
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) invalid.add('FRONTEND_ORIGINS');
    } catch { invalid.add('FRONTEND_ORIGINS'); }
  }
  if (input.FRONTEND_ORIGIN && input.FRONTEND_ORIGINS && !origins.includes(input.FRONTEND_ORIGIN)) invalid.add('FRONTEND_ORIGIN');
  if (value.GOOGLE_CALLBACK_URL && !z.string().url().safeParse(value.GOOGLE_CALLBACK_URL).success) invalid.add('GOOGLE_CALLBACK_URL');
  if (value.SESSION_EXPIRES_IN) {
    const match = /^(\d+)(s|m|h|d)$/.exec(value.SESSION_EXPIRES_IN);
    if (!match) invalid.add('SESSION_EXPIRES_IN');
    else {
      const seconds = Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]]);
      if (seconds < 60 || seconds > 604800 || (input.SESSION_TTL_SECONDS && seconds !== value.SESSION_TTL_SECONDS)) invalid.add('SESSION_EXPIRES_IN');
      else value.SESSION_TTL_SECONDS = seconds;
    }
  }
  if (invalid.size) throw new Error(`Invalid configuration: ${[...invalid].join(', ')}`);
  return Object.freeze({ ...value, FRONTEND_ORIGINS: Object.freeze(origins), SESSION_EXPIRES_IN: `${value.SESSION_TTL_SECONDS}s` });
}
