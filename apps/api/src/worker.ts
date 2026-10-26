import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { loadConfigOrExit } from './config/env.js';
import { PrismaService } from './prisma/prisma.service.js';
import { WorkerModule } from './worker/worker.module.js';

const config = loadConfigOrExit();
const app = await NestFactory.createApplicationContext(WorkerModule.forRoot(config), {
  bufferLogs: true,
});
const logger = app.get(Logger);
app.useLogger(logger);
app.enableShutdownHooks();

await app.get(PrismaService).$queryRaw`SELECT 1`;
logger.log('Worker started: Postgres reachable, processing queues');
