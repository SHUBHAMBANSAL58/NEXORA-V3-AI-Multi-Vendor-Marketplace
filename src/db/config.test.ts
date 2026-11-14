import test from 'node:test';
import assert from 'node:assert/strict';
import { getCloudSqlPoolConfig } from './config.ts';

test('getCloudSqlPoolConfig builds Object Method pg.Pool config from SQL_* env vars', () => {
  const config = getCloudSqlPoolConfig({
    SQL_HOST: '/cloudsql/animated-bucksaw-sfx4d:asia-southeast1:ai-studio-ac49d09d',
    SQL_PORT: '5432',
    SQL_DB_NAME: 'nexora_db',
    SQL_USER: 'app_user',
    SQL_PASSWORD: 'app_password',
  });

  assert.equal(
    config.host,
    '/cloudsql/animated-bucksaw-sfx4d:asia-southeast1:ai-studio-ac49d09d'
  );
  assert.equal(config.port, 5432);
  assert.equal(config.database, 'nexora_db');
  assert.equal(config.user, 'app_user');
  assert.equal(config.password, 'app_password');
  assert.equal(config.max, 10);
  assert.equal(config.idleTimeoutMillis, 30000);
  assert.equal(config.connectionTimeoutMillis, 15000);
  assert.equal('connectionString' in config, false);
});

test('getCloudSqlPoolConfig omits port when SQL_PORT is unset or invalid', () => {
  const config = getCloudSqlPoolConfig({
    SQL_HOST: '127.0.0.1',
    SQL_PORT: 'invalid',
    SQL_DB_NAME: 'nexora_db',
    SQL_USER: 'app_user',
    SQL_PASSWORD: 'secret',
  });

  assert.equal(config.port, undefined);
  assert.equal(config.host, '127.0.0.1');
});
