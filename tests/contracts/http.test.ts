import { afterEach, expect, test, vi } from 'vitest';
import { errorResponseSchema, healthHttpSchemas, readyResponseSchema } from '../../packages/contracts/src/index.js';
import { readConfig } from '../../packages/server/src/composition/config.js';
import { createApp } from '../../apps/api/src/app.js';
import { readFileSync } from 'node:fs';
import { createOpenApiDocument } from '../../scripts/openapi.js';

const cleanup: Array<() => Promise<unknown>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
function api(healthy = true) {
  const database = { check: vi.fn().mockResolvedValue(healthy), close: vi.fn().mockResolvedValue(undefined) };
  const app = createApp(readConfig({ DATABASE_URL: 'postgresql://hairmate_test@127.0.0.1/hairmate_test' }), database);
  cleanup.push(() => app.close());
  return { app, database };
}

test('static OpenAPI is generated from the same reviewed schemas', () => {
  expect(JSON.parse(readFileSync(new URL('../../openapi.json', import.meta.url), 'utf8'))).toEqual(createOpenApiDocument());
});

test('live is process-only; ready response validates against the shared strict contract', async () => {
  const { app, database } = api();
  expect((await app.inject('/health/live')).json()).toEqual({ status: 'ok' });
  expect(database.check).not.toHaveBeenCalled();
  const response = await app.inject('/health/ready');
  expect(response.statusCode).toBe(200);
  expect(readyResponseSchema.parse(response.json())).toEqual({ status: 'ready' });
  expect(response.headers['cache-control']).toBe('no-store');
  expect(healthHttpSchemas.ready).toMatchObject({ type: 'object', additionalProperties: false });
});

test('unavailable dependency returns a safe 503 and server-generated request ID', async () => {
  const { app } = api(false);
  const response = await app.inject({ url: '/health/ready', headers: { 'x-request-id': 'client-controlled' } });
  expect(response.statusCode).toBe(503);
  const body = errorResponseSchema.parse(response.json());
  expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
  expect(body.requestId).not.toBe('client-controlled');
  expect(response.body).not.toContain('postgres');
});

test('unknown inputs, unregistered routes and errors do not echo private content', async () => {
  const { app } = api();
  const bad = await app.inject('/health/ready?confirmed=true');
  expect(bad.statusCode).toBe(400);
  expect(errorResponseSchema.parse(bad.json()).error.code).toBe('VALIDATION_FAILED');
  const missing = await app.inject('/api/v1/generation-grants?private-marker=value');
  expect(missing.statusCode).toBe(404);
  expect(missing.body).not.toContain('private-marker');
});

test('unexpected implementation failures map to a generic error', async () => {
  const { app, database } = api();
  database.check.mockRejectedValueOnce(new Error('SQL or private upstream locator'));
  const response = await app.inject('/health/ready');
  expect(response.statusCode).toBe(500);
  expect(errorResponseSchema.parse(response.json()).error.code).toBe('INTERNAL_ERROR');
  expect(response.body).not.toContain('SQL');
});

test('CORS permits only the configured origin', async () => {
  const { app } = api();
  const allowed = await app.inject({ url: '/health/ready', headers: { origin: 'http://localhost:8081' } });
  expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:8081');
  const denied = await app.inject({ url: '/health/ready', headers: { origin: 'https://untrusted.example' } });
  expect(denied.headers['access-control-allow-origin']).not.toBe('https://untrusted.example');
});
