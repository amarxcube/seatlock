import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/env.js';

export const SYSTEM_QUEUE = 'system';
const HEARTBEAT = 'heartbeat';

/** Last time the heartbeat job ran; lets tests (and later, metrics) see the queue path working. */
@Injectable()
export class HeartbeatState {
  lastBeatAt: Date | null = null;
}

/** Registers the repeatable heartbeat job. Upserting is idempotent across worker restarts. */
@Injectable()
export class HeartbeatScheduler implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(SYSTEM_QUEUE) private readonly queue: Queue,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.upsertJobScheduler(
      HEARTBEAT,
      { every: this.config.WORKER_HEARTBEAT_MS },
      { name: HEARTBEAT, opts: { removeOnComplete: 10, removeOnFail: 50 } },
    );
  }
}

/** Proves the worker → BullMQ → Redis path end to end before real jobs arrive (Phase 1+). */
@Processor(SYSTEM_QUEUE)
export class SystemProcessor extends WorkerHost {
  private readonly logger = new Logger('Heartbeat');

  constructor(private readonly state: HeartbeatState) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== HEARTBEAT) return;
    this.state.lastBeatAt = new Date();
    this.logger.log({ jobId: job.id }, 'Worker heartbeat');
  }
}
