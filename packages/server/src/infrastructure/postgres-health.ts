import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { HealthDependency } from './health-port.js';

export function createPostgresHealth(connectionString: string): HealthDependency {
  const pool = new pg.Pool({
    connectionString, max: 2, connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 5_000, query_timeout: 2_000, statement_timeout: 2_000,
    application_name: 'hairmate-baseline',
  });
  // Idle socket failures are reflected by the next check; never log the raw error.
  pool.on('error', () => { unavailable = true; });
  const db = drizzle(pool);
  let unavailable = false;
  let closed = false;
  return {
    async check() {
      if (closed) return false;
      try {
        const result = await db.execute(sql`select 1 as healthy`);
        unavailable = result.rows[0]?.['healthy'] !== 1;
      } catch { unavailable = true; }
      return !unavailable;
    },
    async close() {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
