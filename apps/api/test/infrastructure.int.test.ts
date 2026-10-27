import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { HeartbeatState } from '../src/worker/heartbeat.js';
import { WorkerModule } from '../src/worker/worker.module.js';
import { testConfig } from './helpers/app.js';

describe('baseline migration (criterion 11)', () => {
  let prisma: PrismaService;
  beforeAll(() => {
    prisma = new PrismaService(testConfig());
  });
  afterAll(() => prisma.$disconnect());

  it('installs citext and the set_updated_at() trigger function', async () => {
    const [extension] = await prisma.$queryRaw<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'citext'`;
    const [fn] = await prisma.$queryRaw<{ proname: string }[]>`
      SELECT proname FROM pg_proc WHERE proname = 'set_updated_at'`;
    expect(extension?.extname).toBe('citext');
    expect(fn?.proname).toBe('set_updated_at');
  });
});

describe('worker heartbeat (criterion 7)', () => {
  let worker: INestApplicationContext;
  beforeAll(async () => {
    worker = await NestFactory.createApplicationContext(
      WorkerModule.forRoot(testConfig({ WORKER_HEARTBEAT_MS: '200' })),
      { logger: false },
    );
    await worker.init();
  });
  afterAll(() => worker.close());

  it('runs the repeatable heartbeat job through BullMQ and Redis', async () => {
    const state = worker.get(HeartbeatState);
    await expect.poll(() => state.lastBeatAt, { timeout: 10_000, interval: 100 }).not.toBeNull();
  });
});
