import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { Wait } from 'testcontainers';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    redisUrl: string;
  }
}

const apiRoot = fileURLToPath(new URL('..', import.meta.url));

/** Starts real Postgres 16 and Redis 7 once for the integration suite, and applies migrations. */
export default async function setup(project: TestProject) {
  const [postgres, redis] = await Promise.all([
    // The default wait also probes the port from inside the container via `exec`, which hangs
    // on Podman for Windows; the image's pg_isready health check is a sufficient readiness signal.
    new PostgreSqlContainer('postgres:16.15-alpine')
      .withWaitStrategy(Wait.forHealthCheck())
      .start(),
    new RedisContainer('redis:7.4.11-alpine').start(),
  ]);
  const databaseUrl = postgres.getConnectionUri();

  // Applying the real migrations is itself a test: they must work on a fresh database.
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
    timeout: 60_000,
  });

  project.provide('databaseUrl', databaseUrl);
  project.provide('redisUrl', redis.getConnectionUrl());

  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}
