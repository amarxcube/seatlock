import type { NestExpressApplication } from '@nestjs/platform-express';
import { API_PREFIX } from '@seatlock/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WEB_ORIGIN, startApp } from './helpers/app.js';
import { appRoutes, contractRoutes, expectSchema } from './helpers/contract.js';

describe('HTTP conventions', () => {
  let app: NestExpressApplication;
  beforeAll(async () => {
    app = await startApp();
  });
  afterAll(() => app.close());

  describe('errors (criterion 4)', () => {
    it('an unknown route is a 404 problem+json echoing the request ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/nope?x=1')
        .set('X-Request-Id', 'demo-1');

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(res.headers['x-request-id']).toBe('demo-1');
      expect(res.body).toMatchObject({
        type: 'https://seatlock.dev/problems/not-found',
        status: 404,
        code: 'NOT_FOUND',
        instance: '/api/v1/nope',
        requestId: 'demo-1',
      });
      expectSchema(res.body, 'Problem');
    });

    it('malformed JSON is a 400 VALIDATION_FAILED problem', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/health/live')
        .set('Content-Type', 'application/json')
        .send('{"broken":');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expectSchema(res.body, 'ValidationProblem');
    });
  });

  describe('request IDs', () => {
    it('generates one when the client sends none', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/live');
      expect(res.headers['x-request-id']).toMatch(/^req_[0-9a-f-]{36}$/);
    });

    it('replaces an unsafe incoming value instead of echoing it', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('X-Request-Id', 'bad id\twith spaces');
      expect(res.headers['x-request-id']).toMatch(/^req_/);
    });
  });

  describe('CORS and security headers', () => {
    it('allows only the web origin', async () => {
      const allowed = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('Origin', WEB_ORIGIN);
      expect(allowed.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);

      const other = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('Origin', 'https://evil.example');
      expect(other.headers['access-control-allow-origin']).not.toBe('https://evil.example');
    });

    it('sets Helmet security headers', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/live');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('contract (criterion 10, ADR-0014)', () => {
    it('serves no route that the contract does not define', () => {
      const documented = contractRoutes();
      const undocumented = [...appRoutes(app, API_PREFIX)].filter((r) => !documented.has(r));
      expect(undocumented).toEqual([]);
    });

    it('serves the committed contract at /api/docs', async () => {
      const spec = await request(app.getHttpServer()).get('/api/docs/openapi.json');
      expect(spec.status).toBe(200);
      expect(spec.body.openapi).toBe('3.1.0');

      const ui = await request(app.getHttpServer()).get('/api/docs/');
      expect(ui.status).toBe(200);
      expect(ui.text).toContain('swagger-ui');
    });
  });
});
