import { createServices, readConfig } from '@hairmate/server/composition';
import { runWorker } from './worker.js';

const log = (operation: string, level = 'info') => console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service: 'worker', operation }));

try {
  const config = readConfig(process.env);
  const { database } = createServices(config);
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try { await runWorker(database, config.WORKER_INTERVAL_MS, controller.signal, log); }
  finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
} catch {
  log('worker_failed', 'error');
  process.exitCode = 1;
}
