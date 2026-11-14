import type { PoolConfig } from 'pg';

export function getCloudSqlPoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const parsedPort = env.SQL_PORT ? Number(env.SQL_PORT) : undefined;
  const port = parsedPort && Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : undefined;

  return {
    host: env.SQL_HOST,
    ...(port ? { port } : {}),
    user: env.SQL_USER,
    password: env.SQL_PASSWORD,
    database: env.SQL_DB_NAME,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
}
