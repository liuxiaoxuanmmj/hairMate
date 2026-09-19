import { expect, test } from 'vitest';
import { readConfig } from '../../packages/server/src/composition/config.js';
import { requireTestDatabaseUrl } from '../../scripts/test-database.mjs';

const databaseUrl = 'postgresql://hairmate_test@127.0.0.1:55432/hairmate_test';

test('configuration defaults to immutable Fake/local and loopback', () => {
  const config = readConfig({ DATABASE_URL: databaseUrl });
  expect(config).toMatchObject({ APP_ENV: 'development', AI_MODE: 'fake', STORAGE_MODE: 'local', API_HOST: '127.0.0.1' });
  expect(Object.isFrozen(config)).toBe(true);
});

test.each([{ APP_ENV: 'production' }, { AI_MODE: 'live' }, { STORAGE_MODE: 'oss' }, { API_PORT: '-1' }, { API_PORT: '65536' }, { WORKER_INTERVAL_MS: '0' }, { DATABASE_URL: 'https://example.invalid/' }, { API_ALLOWED_ORIGIN: 'https://example.invalid/private' }])('rejects unsupported modes or invalid configuration: %j', (change) => {
  expect(() => readConfig({ DATABASE_URL: databaseUrl, ...change })).toThrow();
});

test('configuration errors never echo a connection string', () => {
  const marker = 'test-only-private-marker';
  expect(() => readConfig({ DATABASE_URL: marker })).toThrow('Invalid baseline configuration; check documented keys.');
});

test('test DB guard requires an explicit isolated URL', () => {
  expect(requireTestDatabaseUrl({ APP_ENV: 'test', TEST_DATABASE_URL: databaseUrl })).toBe(databaseUrl);
  expect(() => requireTestDatabaseUrl({ APP_ENV: 'test', DATABASE_URL: databaseUrl })).toThrow('TEST_DATABASE_URL is required');
});

test.each([
  { APP_ENV: 'production' }, { AI_MODE: 'live' }, { STORAGE_MODE: 'oss' },
  { TEST_DATABASE_URL: 'postgresql://hairmate_test@database.example.com/hairmate_test' },
  { TEST_DATABASE_URL: 'postgresql://hairmate_test@127.0.0.1/hairmate' },
  { TEST_DATABASE_URL: 'postgresql://postgres@127.0.0.1/hairmate_test' },
  { TEST_DATABASE_URL: `${databaseUrl}?host=database.example.com` },
  { TEST_DATABASE_URL: `${databaseUrl}?database=production` },
  { TEST_DATABASE_URL: 'postgresql://hairmate_test@127.0.0.1/hairmate_%74est' },
])('test DB guard rejects unsafe input: %j', (change) => {
  expect(() => requireTestDatabaseUrl({ APP_ENV: 'test', TEST_DATABASE_URL: databaseUrl, ...change })).toThrow();
});
