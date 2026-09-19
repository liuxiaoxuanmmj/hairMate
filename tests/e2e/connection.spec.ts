import { expect, test } from '@playwright/test';
import { startProcess } from '../../scripts/test-process.mjs';
import { verifyTestDatabase } from '../../scripts/test-database.mjs';

test('Expo user entry -> real HTTP -> PostgreSQL; outage and manual recovery; worker lifecycle', async ({ page }) => {
  const databaseUrl = await verifyTestDatabase();
  const environment = {
    PATH: process.env.PATH,
    APP_ENV: 'test', AI_MODE: 'fake', STORAGE_MODE: 'local',
    DATABASE_URL: databaseUrl, API_HOST: '127.0.0.1', API_PORT: '3107',
    API_ALLOWED_ORIGIN: 'http://127.0.0.1:3108', WORKER_INTERVAL_MS: '100',
  };
  let api = await startProcess('apps/api/dist/main.js', environment, 'listening');
  let worker: Awaited<ReturnType<typeof startProcess>> | undefined;
  try {
    worker = await startProcess('apps/worker/dist/main.js', environment, 'ready');
    await page.goto('/');
    await expect(page.getByText('HairMate', { exact: true })).toBeVisible();
    const firstRequest = page.waitForRequest((request) => request.url().endsWith('/health/ready'));
    await page.getByRole('button', { name: '连接服务' }).click();
    expect((await firstRequest).url()).toBe('http://127.0.0.1:3107/health/ready');
    await expect(page.getByText('服务已连接。', { exact: true })).toBeVisible();
    await api.stop();
    await page.getByRole('button', { name: '连接服务' }).click();
    await expect(page.getByText('暂时无法连接，请稍后重试。', { exact: true })).toBeVisible();
    api = await startProcess('apps/api/dist/main.js', environment, 'listening');
    await page.getByRole('button', { name: '重新连接' }).click();
    await expect(page.getByText('服务已连接。', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: '连接服务' })).toBeVisible();
    expect(worker.output).toContain('"operation":"ready"');
    expect(api.output + worker.output).not.toContain(databaseUrl);
  } finally {
    try { await api.stop(); } finally { await worker?.stop(); }
  }
  expect(worker?.output).toContain('"operation":"stopped"');
});
