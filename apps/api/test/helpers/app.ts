import type { NestExpressApplication } from '@nestjs/platform-express';
import { inject } from 'vitest';
import { createApp } from '../../src/bootstrap.js';
import { type AppConfig, parseConfig } from '../../src/config/env.js';

/** Unreachable addresses, for testing behaviour when a dependency is down. */
export const DEAD_POSTGRES = 'postgresql://nobody:nothing@127.0.0.1:1/none';
export const DEAD_REDIS = 'redis://127.0.0.1:1';

export const WEB_ORIGIN = 'http://localhost:5173';

export function testConfig(overrides: Record<string, string> = {}): AppConfig {
  return parseConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'fatal',
    DATABASE_URL: inject('databaseUrl'),
    REDIS_URL: inject('redisUrl'),
    WEB_ORIGIN,
    ...overrides,
  });
}

/** Boots the real HTTP app (same wiring as main.ts) against the test containers. */
export async function startApp(
  overrides: Record<string, string> = {},
): Promise<NestExpressApplication> {
  const app = await createApp(testConfig(overrides));
  await app.init();
  return app;
}
