import { BullModule } from '@nestjs/bullmq';
import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import type { AppConfig } from '../config/env.js';
import { LoggerModule } from '../logging/logger.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HeartbeatScheduler, HeartbeatState, SYSTEM_QUEUE, SystemProcessor } from './heartbeat.js';

/** The worker process (worker.ts): queue processors, and later the sweeper and outbox relay. */
@Module({})
export class WorkerModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: WorkerModule,
      imports: [
        ConfigModule.forRoot(config),
        LoggerModule,
        PrismaModule,
        BullModule.forRoot({ connection: { url: config.REDIS_URL } }),
        BullModule.registerQueue({ name: SYSTEM_QUEUE }),
      ],
      providers: [HeartbeatState, HeartbeatScheduler, SystemProcessor],
    };
  }
}
