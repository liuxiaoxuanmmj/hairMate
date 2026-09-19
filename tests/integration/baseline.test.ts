import { afterAll, beforeAll, expect, test } from 'vitest';
import { createServices, readConfig } from '../../packages/server/src/composition/index.js';
import { createApp } from '../../apps/api/src/app.js';
import { createApiClient } from '../../packages/api-client/src/index.js';
import { runWorker } from '../../apps/worker/src/worker.js';
import { verifyTestDatabase } from '../../scripts/test-database.mjs';

let databaseUrl: string;
const close: Array<() => Promise<unknown>> = [];
beforeAll(async () => { databaseUrl = await verifyTestDatabase(); });
afterAll(async () => { for (const cleanup of close.reverse()) await cleanup(); });

test('real PostgreSQL adapter checks the dependency and closes idempotently', async () => {
  const { database } = createServices(readConfig({ APP_ENV: 'test', DATABASE_URL: databaseUrl }));
  close.push(() => database.close());
  expect(await database.check()).toBe(true);
  await database.close();
  expect(await database.check()).toBe(false);
  await database.close();
});

test('real HTTP client -> Fastify -> Drizzle -> PostgreSQL readiness', async () => {
  const config = readConfig({ APP_ENV: 'test', DATABASE_URL: databaseUrl });
  const { database } = createServices(config);
  const app = createApp(config, database);
  close.push(() => app.close());
  const address = await app.listen({ host: '127.0.0.1', port: 0 });
  const client = createApiClient(address);
  expect(await client.checkReady()).toEqual({ status: 'ready' });
  await database.close();
  await expect(client.checkReady()).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  expect(await (await fetch(`${address}/health/live`)).json()).toEqual({ status: 'ok' });
});

test('worker startup validates the same real PostgreSQL dependency and shuts down', async () => {
  const { database } = createServices(readConfig({ APP_ENV: 'test', DATABASE_URL: databaseUrl }));
  const controller = new AbortController();
  const reports: string[] = [];
  await runWorker(database, 100, controller.signal, (operation) => { reports.push(operation); if (operation === 'ready') controller.abort(); });
  expect(reports).toEqual(['ready', 'stopped']);
  expect(await database.check()).toBe(false);
});

test('nonexistent isolated database is unavailable, never an implicit fallback', async () => {
  const url = new URL(databaseUrl);
  url.pathname = '/hairmate_test_absent_baseline';
  const { database } = createServices(readConfig({ APP_ENV: 'test', DATABASE_URL: url.toString() }));
  close.push(() => database.close());
  expect(await database.check()).toBe(false);
});
