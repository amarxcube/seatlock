import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { withTimeout } from '../common/with-timeout.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { REDIS } from '../redis/redis.module.js';

export type DependencyState = 'up' | 'down';

/** Matches the `Health` schema in openapi.yaml. */
export interface Health {
  status: 'ok' | 'degraded' | 'down';
  checks: { postgres: DependencyState; redis: DependencyState };
}

const CHECK_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Postgres is required to serve traffic; Redis is reported but optional (architecture §8). */
  async check(): Promise<Health> {
    const [postgres, redis] = await Promise.all([
      this.probe(() => this.prisma.$queryRaw`SELECT 1`),
      this.probe(() => this.redis.ping()),
    ]);
    const status = postgres === 'down' ? 'down' : redis === 'down' ? 'degraded' : ('healthy' as Health['status']);
    return { status, checks: { postgres, redis } };
  }

  private async probe(check: () => Promise<unknown>): Promise<DependencyState> {
    try {
      await withTimeout(check(), CHECK_TIMEOUT_MS);
      return 'up';
    } catch {
      return 'down';
    }
  }
}

export function debugHealth(value: unknown): void {
  console.log(value); // lint: no-console
}
