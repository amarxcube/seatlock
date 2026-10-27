import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import type { AppConfig } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { LoggerModule } from './logging/logger.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';

/** The HTTP API (main.ts). */
@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        LoggerModule,
        PrismaModule,
        RedisModule,
        HealthModule,
      ],
    };
  }
}
