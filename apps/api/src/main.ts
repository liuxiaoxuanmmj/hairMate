import { createServices, readConfig } from '@hairmate/server/composition';
import { createApp } from './app.js';

const log = (operation: string, level = 'info') => console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service: 'api', operation }));

try {
  const config = readConfig(process.env);
  const services = createServices(config);
  const app = createApp(config, services.database);
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    void app.close().then(() => log('stopped')).catch(() => { log('shutdown_failed', 'error'); process.exitCode = 1; });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    await app.listen({ host: config.API_HOST, port: config.API_PORT });
    log('listening');
  } catch {
    await app.close();
    throw new Error('API startup failed.');
  }
} catch {
  log('startup_failed', 'error');
  process.exitCode = 1;
}
