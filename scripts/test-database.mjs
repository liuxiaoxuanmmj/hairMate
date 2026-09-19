import pg from 'pg';

export function requireTestDatabaseUrl(environment = process.env) {
  if (environment.APP_ENV !== 'test' || (environment.AI_MODE ?? 'fake') !== 'fake' || (environment.STORAGE_MODE ?? 'local') !== 'local') throw new Error('Tests require APP_ENV=test, AI_MODE=fake and STORAGE_MODE=local.');
  if (!environment.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required; DATABASE_URL is never a fallback.');
  let url;
  try { url = new URL(environment.TEST_DATABASE_URL); } catch { throw new Error('Invalid TEST_DATABASE_URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', '[::1]'].includes(url.hostname)
      || !/^\/hairmate_test(?:_[a-z0-9_]+)?$/.test(url.pathname) || url.username !== 'hairmate_test' || url.search || url.hash) {
    throw new Error('TEST_DATABASE_URL must address an isolated local hairmate_test database and role, with no connection overrides.');
  }
  return url.toString();
}

export async function verifyTestDatabase(environment = process.env) {
  const connectionString = requireTestDatabaseUrl(environment);
  const expected = new URL(connectionString).pathname.slice(1);
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 2_000, query_timeout: 2_000, statement_timeout: 2_000 });
  try {
    await client.connect();
    const result = await client.query('select current_database() as database, current_user as role, version() as version');
    const row = result.rows[0];
    if (row?.database !== expected || row?.role !== 'hairmate_test' || !row?.version.startsWith('PostgreSQL ')) throw new Error('Isolation mismatch.');
    return connectionString;
  } catch { throw new Error('Isolated PostgreSQL unavailable or identity mismatch; no other database was attempted.'); }
  finally { await client.end(); }
}
