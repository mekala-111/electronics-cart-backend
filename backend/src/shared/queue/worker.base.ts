import { Logger } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { generateUuid } from '../../common/utils/uuid.util';
import { TransactionContext } from '../context/transaction-context';
import { QUEUE_NAMES } from './queue.constants';
import { createWorker } from './queue.factory';
import { QueueService } from './queue.service';

export type JobWithContext<T> = T & {
  __tx?: {
    correlationId?: string;
    requestId?: string;
    workflowId?: string;
    userId?: string;
    sessionId?: string;
    tenantId?: string;
  };
};

export abstract class BaseWorker<T = unknown> {
  protected readonly logger: Logger;
  private worker?: Worker;

  protected constructor(
    protected readonly queueName: string,
    protected readonly queueService: QueueService,
    protected readonly redisUrl: string,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  protected abstract process(job: Job<T>): Promise<void>;

  start(): Worker | undefined {
    if (
      process.env.DISABLE_WORKERS === 'true' ||
      process.env.DISABLE_WORKERS === '1'
    ) {
      this.logger.log(`workers disabled — skip ${this.queueName}`);
      return undefined;
    }

    this.worker = createWorker(this.queueName, this.redisUrl, async (job) =>
      this.handleJob(job as Job<T>),
    );

    this.worker.on('failed', (job: Job<T> | undefined, error: Error) => {
      void this.onFailed(job, error);
    });

    return this.worker;
  }

  async stop(): Promise<void> {
    await this.worker?.close();
  }

  private async handleJob(job: Job<T>): Promise<void> {
    const payload = job.data as JobWithContext<T>;
    const id = generateUuid();
    const ctx = TransactionContext.fromSnapshot(payload?.__tx, {
      correlationId: id,
      requestId: id,
    });

    await TransactionContext.runAsync(ctx, async () => {
      try {
        await this.process(job);
      } catch (error) {
        this.logger.error(
          `Job ${job.id} failed on attempt ${job.attemptsMade + 1} corr=${ctx.correlationId}`,
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    });
  }

  private async onFailed(job: Job<T> | undefined, error: Error): Promise<void> {
    if (!job) {
      return;
    }

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      return;
    }

    this.logger.warn(
      `Moving job ${job.id} to DLQ after ${job.attemptsMade} attempts`,
    );

    await this.queueService.enqueueDlq(`${this.queueName}:${job.name}`, {
      originalQueue: this.queueName,
      originalJobId: job.id,
      originalJobName: job.name,
      data: job.data,
      failedReason: error.message,
      failedAt: new Date().toISOString(),
      __tx: TransactionContext.snapshot(),
    });
  }
}

export { QUEUE_NAMES };
