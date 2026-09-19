import { z } from 'zod';

const portSchema = z.coerce.number().int().min(0).max(65535);
const configSchema = z.object({
  APP_ENV: z.enum(['development', 'test']).default('development'),
  AI_MODE: z.literal('fake').default('fake'),
  STORAGE_MODE: z.literal('local').default('local'),
  DATABASE_URL: z.string().url(),
  API_HOST: z.enum(['127.0.0.1', '0.0.0.0']).default('127.0.0.1'),
  API_PORT: portSchema.default(3000),
  API_ALLOWED_ORIGIN: z.string().url().default('http://localhost:8081'),
  WORKER_INTERVAL_MS: z.coerce.number().int().min(100).max(60_000).default(5_000),
});

export function readConfig(environment: Readonly<Record<string, string | undefined>>) {
  const parsed = configSchema.safeParse(environment);
  if (!parsed.success) throw new Error('Invalid baseline configuration; check documented keys.');
  const database = new URL(parsed.data.DATABASE_URL);
  const origin = new URL(parsed.data.API_ALLOWED_ORIGIN);
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || database.pathname.length < 2
      || !['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    throw new Error('Invalid database URL or allowed origin.');
  }
  return Object.freeze(parsed.data);
}
export type AppConfig = ReturnType<typeof readConfig>;
