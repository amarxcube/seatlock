import { Controller, Get, Header, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { type Health, HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** operationId: liveness */
  @Get('live')
  @Header('Cache-Control', 'no-store')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** operationId: readiness — 503 when Postgres is unreachable, so the load balancer stops traffic. */
  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready(@Res({ passthrough: true }) res: Response): Promise<Health> {
    const health = await this.health.check();
    if (health.status === 'down') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return health;
  }
}
