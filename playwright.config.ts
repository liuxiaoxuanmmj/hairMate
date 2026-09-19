import { defineConfig } from '@playwright/test';
import { requireTestDatabaseUrl } from './scripts/test-database.mjs';

requireTestDatabaseUrl();

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3108', headless: true, viewport: { width: 390, height: 844 } },
  webServer: { command: 'node scripts/serve-mobile.mjs', url: 'http://127.0.0.1:3108', reuseExistingServer: false, timeout: 15_000 },
});
