import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { requestIdFor } from '../common/request-id.js';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/env.js';

/** JSON logs via pino; every HTTP log line carries the request ID (architecture §5.3). */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.LOG_LEVEL,
          genReqId: requestIdFor,
          // Logs written while handling a request carry `requestId` instead of the whole request.
          quietReqLogger: true,
          customAttributeKeys: { reqId: 'requestId' },
          serializers: {
            req: (req: { id: string; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
          // Never log credentials (CLAUDE.md, security).
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.token',
            ],
            censor: '[redacted]',
          },
          autoLogging: {
            ignore: (req) => req.url?.includes('/health/') ?? false,
          },
        },
      }),
    }),
  ],
})
export class LoggerModule {}
