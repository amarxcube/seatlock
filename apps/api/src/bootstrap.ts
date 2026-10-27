import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { API_PREFIX } from '@seatlock/shared';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { ProblemDetailsFilter } from './common/problem.filter.js';
import { REQUEST_ID_HEADER } from './common/request-id.js';
import { ZodValidationPipe } from './common/zod-validation.pipe.js';
import type { AppConfig } from './config/env.js';
import { mountContractDocs } from './docs/contract.js';

/** Builds the HTTP app with every cross-cutting concern; shared by main.ts and the tests. */
export async function createApp(config: AppConfig): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: config.WEB_ORIGIN,
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER],
  });
  app.setGlobalPrefix(API_PREFIX.slice(1));
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableShutdownHooks();
  mountContractDocs(app);
  return app;
}
