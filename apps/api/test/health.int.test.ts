import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEAD_POSTGRES, DEAD_REDIS, startApp } from './helpers/app.js';
import { expectContract } from './helpers/contract.js';

describe('health (criteria 2, 3)', () => {
  describe('with Postgres and Redis up', () => {
    let app: NestExpressApplication;
    beforeAll(async () => {
      app = await startApp();
    });
    afterAll(() => app.close());

    it('GET /health/ready → 200 ok', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', checks: { postgres: 'up', redis: 'up' } });
      expect(res.headers['cache-control']).toBe('no-store');
      expectContract(res, 'readiness');
    });

    it('GET /health/live → 200', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/live');
      expect(res.status).toBe(200);
      expectContract(res, 'liveness');
    });
  });

  describe('with Redis down', () => {
    let app: NestExpressApplication;
    beforeAll(async () => {
      app = await startApp({ REDIS_URL: DEAD_REDIS });
    });
    afterAll(() => app.close());

    it('stays ready (200) and reports Redis down: booking must not depend on Redis', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'degraded', checks: { postgres: 'up', redis: 'down' } });
      expectContract(res, 'readiness');
    });
  });

  describe('with Postgres down', () => {
    let app: NestExpressApplication;
    beforeAll(async () => {
      app = await startApp({ DATABASE_URL: DEAD_POSTGRES });
    });
    afterAll(() => app.close());

    it('is not ready (503) so the load balancer stops sending traffic', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: 'down', checks: { postgres: 'down', redis: 'up' } });
      expectContract(res, 'readiness');
    });

    it('is still live: the process itself is fine', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/live');
      expect(res.status).toBe(200);
    });
  });
});
