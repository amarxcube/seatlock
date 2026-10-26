import { Global, Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/env.js';

export const REDIS = Symbol('REDIS');

/**
 * A Redis client for optional concerns only (health reporting now; fan-out and rate limits later).
 * It fails fast instead of queueing commands, because booking must keep working without Redis.
 */
export function createRedis(url: string, logger = new Logger('Redis')): Redis {
  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 500, 5_000),
  });
  let available = true;
  redis.on('error', (error: Error) => {
    if (!available) return;
    available = false;
    logger.warn({ err: error }, 'Redis unavailable; continuing without it');
  });
  redis.on('ready', () => {
    if (!available) logger.log('Redis reconnected');
    available = true;
  });
  return redis;
}

/** Waits for the first connection attempt (up to `ms`) so health is accurate from the first request. */
export async function firstConnection(redis: Redis, ms = 2_000): Promise<void> {
  if (redis.status === 'ready') return;
  await new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      redis.off('ready', done);
      redis.off('error', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    redis.once('ready', done);
    redis.once('error', done);
  });
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [APP_CONFIG],
      useFactory: async (config: AppConfig) => {
        const redis = createRedis(config.REDIS_URL);
        await firstConnection(redis);
        return redis;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  onApplicationShutdown(): void {
    this.redis.disconnect();
  }
}
