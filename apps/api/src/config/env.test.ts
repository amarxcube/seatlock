import { describe, expect, it } from 'vitest';
import { ConfigError, parseConfig } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5433/db',
  REDIS_URL: 'redis://localhost:6379',
  WEB_ORIGIN: 'http://localhost:5173',
};

describe('parseConfig (criterion 5)', () => {
  it('applies defaults to a minimal valid environment', () => {
    expect(parseConfig(valid)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      WORKER_HEARTBEAT_MS: 60_000,
    });
  });

  it('coerces numeric strings', () => {
    expect(parseConfig({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('lists every missing or invalid variable in one readable error', () => {
    const attempt = () => parseConfig({ REDIS_URL: 'http://not-redis', PORT: 'abc' });
    expect(attempt).toThrow(ConfigError);
    expect(attempt).toThrow(/DATABASE_URL/);
    expect(attempt).toThrow(/REDIS_URL: must be a redis:\/\/ or rediss:\/\/ URL/);
    expect(attempt).toThrow(/WEB_ORIGIN/);
    expect(attempt).toThrow(/PORT/);
  });

  it('rejects a non-postgres database URL', () => {
    expect(() => parseConfig({ ...valid, DATABASE_URL: 'mysql://u:p@h/db' })).toThrow(
      /DATABASE_URL: must be a postgres:\/\/ URL/,
    );
  });
});
