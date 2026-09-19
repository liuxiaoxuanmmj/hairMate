import { createPostgresHealth } from '../infrastructure/postgres-health.js';
import type { AppConfig } from './config.js';

export { readConfig, type AppConfig } from './config.js';
export type { HealthDependency } from '../infrastructure/health-port.js';

export function createServices(config: AppConfig) {
  return Object.freeze({ database: createPostgresHealth(config.DATABASE_URL) });
}
