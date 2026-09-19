import { spawnSync } from 'node:child_process';
import { verifyTestDatabase } from './test-database.mjs';

try {
  await verifyTestDatabase();
  const run = (args, extraEnvironment = {}) => {
    const result = spawnSync('pnpm', args, { stdio: 'inherit', env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1', EXPO_OFFLINE: '1', ...extraEnvironment } });
    if (result.error || result.status !== 0) throw new Error(`E2E prerequisite failed: pnpm ${args.join(' ')}`);
  };
  run(['exec', 'tsc', '-b', 'tsconfig.build.json']);
  run(['--filter', '@hairmate/mobile', 'exec', 'expo', 'export', '--platform', 'web', '--output-dir', '.expo/e2e-web', '--clear', '--max-workers', '2'], {
    EXPO_PUBLIC_API_URL: 'http://127.0.0.1:3107', DATABASE_URL: 'HAIRMATE_SERVER_ONLY_SENTINEL', AUTH_SECRET: 'HAIRMATE_SERVER_ONLY_SENTINEL',
  });
  run(['exec', 'playwright', 'test']);
} catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
